import "server-only";

import { z } from "zod";

import type { VideoReconcileResult } from "@/lib/generation/video-contract";
import { completeVideoGeneration } from "@/lib/generation/video-complete";
import { findVideoProvider } from "@/lib/providers/registry";
import { providerErrorDetail } from "@/lib/providers/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Perguntar à fila da fal o que houve — a peça que garante que **nenhum node
 * fica "Gerando" para sempre**.
 *
 * ---------------------------------------------------------------------------
 * Por que ela existe mesmo com o webhook funcionando
 * ---------------------------------------------------------------------------
 *
 * Webhook se perde. A entrega pode bater num deploy no ar, num 500 nosso que
 * esgotou as 31 tentativas, numa janela em que a `FAL_WEBHOOK_URL` estava
 * errada. Nenhuma dessas é hipotética o bastante para deixar um trabalho pago
 * sem desfecho, e todas têm a mesma resposta: **perguntar**.
 *
 * ---------------------------------------------------------------------------
 * O teto de tempo, e a trava que impede o teto de mentir
 * ---------------------------------------------------------------------------
 *
 * Um trabalho parado há mais de quinze minutos é marcado como perdido — mas
 * **só se a fal também não souber dele**. A trava é a metade que importa: a fal
 * dizendo `IN_QUEUE` é a fal dizendo que o trabalho está vivo, e desistir de um
 * trabalho vivo é descartar um vídeo que ainda vai chegar (e que já vai ser
 * cobrado, porque o webhook completa mesmo depois).
 *
 * Só o par **velho + desconhecido** é conclusivo. Velho e vivo é paciência;
 * novo e desconhecido é a fal ainda não tendo registrado, o que acontece nos
 * primeiros segundos.
 */

/**
 * Quinze minutos. Um clipe de 5s no Kling leva de um a três; o teto é largo de
 * propósito, porque o custo de errar para cada lado não é o mesmo: esperar
 * demais irrita, desistir cedo joga fora um vídeo pago.
 */
const STALE_AFTER_MS = 15 * 60 * 1000;

const requestSchema = z.object({ generationId: z.uuid() });

export async function reconcileVideoGeneration(input: unknown): Promise<VideoReconcileResult> {
  const parsed = requestSchema.safeParse(input);

  if (!parsed.success) return { ok: false, reason: "invalid" };

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims?.sub) return { ok: false, reason: "unauthenticated" };

  /**
   * A posse é provada **aqui**, e é por isso que o resto pode usar a service
   * role sem abrir buraco: esta leitura passa pelo RLS, então o id de outra
   * pessoa simplesmente não encontra linha nenhuma. O que segue adiante já é
   * comprovadamente de quem pediu.
   */
  const { data: generation } = await supabase
    .from("generations")
    .select(
      "id, provider, model, status, params, created_at, started_at, provider_job_id, result_asset_id, sparks_charged, error_message",
    )
    .eq("id", parsed.data.generationId)
    .eq("media_kind", "video")
    .maybeSingle();

  if (!generation) return { ok: false, reason: "not_found" };

  if (generation.status === "succeeded") {
    return {
      ok: true,
      status: "succeeded",
      assetId: generation.result_asset_id ?? "",
      sparksCharged: generation.sparks_charged,
    };
  }

  if (generation.status === "failed" || generation.status === "canceled") {
    return { ok: true, status: "failed", detail: generation.error_message ?? "" };
  }

  const provider = findVideoProvider(generation.provider);

  if (!provider) return { ok: false, reason: "error" };

  const urls = (generation.params as { provider?: Record<string, unknown> } | null)?.provider ?? {};
  const startedAt = generation.started_at ?? generation.created_at;
  const ageMs = Date.now() - new Date(startedAt).getTime();

  // Sem protocolo, a fal não tem o que responder: ou o envio não chegou a sair,
  // ou morreu entre a chamada e o `attach`. Só o tempo decide.
  if (!generation.provider_job_id) {
    if (ageMs < STALE_AFTER_MS) return { ok: true, status: "pending" };

    return giveUp(generation.id, null, "o envio ao provedor não chegou a ser confirmado");
  }

  let state;

  try {
    state = await provider.checkVideo({
      model: { slug: generation.model },
      requestId: generation.provider_job_id,
      statusUrl: readUrl(urls, "status_url"),
      responseUrl: readUrl(urls, "response_url"),
    });
  } catch (error) {
    // O provedor fora do ar não é motivo para desistir de um trabalho: quem não
    // respondeu foi a rede, e a linha continua exatamente como estava. O
    // trabalho segue `running`, e a próxima pergunta tenta de novo.
    if (process.env.NODE_ENV !== "production") {
      console.error(`[video-reconcile] ${generation.id} — ${providerErrorDetail(error)}`);
    }

    return { ok: true, status: "pending" };
  }

  if (state.state === "pending") return { ok: true, status: "pending" };

  if (state.state === "unknown") {
    // **A trava.** Velho e desconhecido é conclusivo; qualquer outra combinação
    // é esperar.
    if (ageMs < STALE_AFTER_MS) return { ok: true, status: "pending" };

    return giveUp(
      generation.id,
      generation.provider_job_id,
      "o provedor não conhece mais este trabalho e ele passou do tempo",
    );
  }

  // Terminou — e daqui em diante é exatamente o mesmo caminho do webhook.
  const completion = await completeVideoGeneration({
    generationId: generation.id,
    providerJobId: generation.provider_job_id,
    outcome: state,
  });

  switch (completion.kind) {
    case "succeeded":
      return {
        ok: true,
        status: "succeeded",
        assetId: completion.assetId,
        sparksCharged: completion.sparksCharged,
      };
    case "failed":
      return { ok: true, status: "failed", detail: completion.detail };
    case "already":
      // O webhook ganhou a corrida entre a nossa pergunta e a nossa escrita.
      // Não é erro — é a idempotência fazendo o trabalho dela.
      return { ok: true, status: "pending" };
    case "not_found":
      return { ok: false, reason: "not_found" };
  }
}

/** Encerra um trabalho que ninguém mais reconhece. Grátis, como toda falha. */
async function giveUp(
  generationId: string,
  providerJobId: string | null,
  detail: string,
): Promise<VideoReconcileResult> {
  const completion = await completeVideoGeneration({
    generationId,
    providerJobId,
    outcome: { state: "failed", detail, refused: false },
  });

  if (completion.kind === "failed") {
    return { ok: true, status: "failed", detail: completion.detail };
  }

  if (completion.kind === "succeeded") {
    return {
      ok: true,
      status: "succeeded",
      assetId: completion.assetId,
      sparksCharged: completion.sparksCharged,
    };
  }

  return { ok: true, status: "failed", detail };
}

function readUrl(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];

  return typeof value === "string" && value !== "" ? value : null;
}
