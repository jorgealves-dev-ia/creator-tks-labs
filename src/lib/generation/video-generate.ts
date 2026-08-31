import "server-only";

import { z } from "zod";

import { loadImagePayloads } from "@/lib/generation/asset-payloads";
import {
  FAL_WEBHOOK_PATH,
  type VideoGenerationFailure,
  type VideoGenerationResult,
} from "@/lib/generation/video-contract";
import { completeVideoGeneration } from "@/lib/generation/video-complete";
import { findMentions } from "@/lib/generation/mentions";
import { buildSceneMotion } from "@/lib/storyboard/scene-prompt";
import { translateItems } from "@/lib/prompt/translator";
import { isProviderConfigured } from "@/lib/providers/keys";
import { findVideoProvider } from "@/lib/providers/registry";
import { ProviderError, providerErrorDetail } from "@/lib/providers/types";
import { CENTS_PER_SPARK } from "@/lib/sparks";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Enfileirar um vídeo — docs/nodes-geracao.md, frente de vídeo.
 *
 * ---------------------------------------------------------------------------
 * A ordem das operações é a especificação de segurança, de novo
 * ---------------------------------------------------------------------------
 *
 * O motor de extração deixou a regra escrita em 08/08/2026 e ela vale aqui com
 * uma diferença: **a cobrança não está nesta função.** O que esta faz é dizer
 * não cedo e barato, e registrar antes de chamar.
 *
 *   1. endereço de retorno    antes de tudo. Sem ele o trabalho seria aceito,
 *                             geraria, cobraria **nós**, e ninguém aqui saberia
 *   2. catálogo e adaptador   um modelo que não sabemos precificar não roda
 *   3. a menção recusada      antes do saldo, antes do provedor: zero Spark
 *   4. a imagem carregada     RLS responde de quem ela é
 *   5. tradução               antes de qualquer coisa cara
 *   6. linha `queued` gravada **antes** da chamada — a foto registrada antes da
 *                             chamada, do motor de extração, aplicada ao vídeo
 *   7. a chamada
 *   8. o protocolo anexado
 *
 * O passo 6 antes do 7 é a decisão que importa. A ordem inversa trocaria uma
 * linha órfã (barata, e que o teto de tempo limpa) por **um vídeo pago que o
 * nosso sistema não sabe que existe** — a fal geraria, cobraria, e o webhook
 * chegaria falando de um trabalho sem dono.
 */

const requestSchema = z.object({
  projectId: z.uuid(),
  nodeId: z.string().min(1).max(200),
  prompt: z.string().max(2000),
  modelId: z.uuid(),
  sourceAssetId: z.uuid(),
  durationSeconds: z.number().int().positive().max(600),
  /** A ficha de cena, quando o pedido vem da Máquina de Storyboard. */
  scene: z.object({ id: z.uuid() }).nullish(),
});

/**
 * O que dizer ao modelo quando o usuário não dirigiu nada.
 *
 * O Kling exige `prompt` — mandar string vazia é 422. Então existe uma frase, e
 * como existe, ela é **registrada** em `prompt_compiled.structure` com a origem
 * marcada: quem lê a auditoria daqui a seis meses precisa saber que o sistema
 * falou, e o que ele falou.
 *
 * Ela é deliberadamente a menor direção possível — animar o que está lá, sem
 * inventar cena. A invariante 13 proíbe o sistema de injetar cena quando o
 * usuário dirigiu; aqui ninguém dirigiu, e o mínimo para a API aceitar não é
 * cena, é a instrução de não mudar nada.
 */
const DEFAULT_MOTION_EN =
  "Animate this image with natural, subtle motion, keeping the subject, framing and scene unchanged.";

export async function runVideoSubmission(input: unknown): Promise<VideoGenerationResult> {
  const parsed = requestSchema.safeParse(input);

  if (!parsed.success) return fail("invalid");

  const request = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) return fail("unauthenticated");

  // 1. O endereço de retorno. Primeiro de todos, e é o cinto de segurança do
  //    ciclo: em desenvolvimento a variável fica ausente de propósito, e a
  //    recusa aqui é o que impede um trabalho de sair sem ter para onde voltar.
  const webhookBase = process.env.FAL_WEBHOOK_URL;

  if (!webhookBase || webhookBase.trim() === "") return fail("webhook_not_configured");

  // 1b. E ela precisa apontar para o **nosso endpoint**, não só existir.
  //
  //     A trava de presença nasceu em 13/08 para impedir o pior desfecho: um
  //     vídeo aceito, gerado, cobrado — e sem retorno. Em 28/08 esse desfecho
  //     aconteceu assim mesmo, com a variável **presente e apontando para a raiz
  //     do túnel**: quatro clipes pagos, zero entregas, quatro reconciliações à
  //     mão quinze minutos depois.
  //
  //     `new URL` também é o que impede um valor sem esquema de derrubar a rota
  //     com um 500 — aqui a recusa é nomeada, e barata.
  if (!apontaParaOWebhook(webhookBase)) return fail("webhook_url_invalid");

  // 2. O modelo, do catálogo. O browser só nomeia um id.
  const { data: model } = await supabase
    .from("ai_models")
    .select(
      "id, slug, enabled, capabilities, ai_providers (slug, env_var_name, enabled), ai_model_video_prices (duration_seconds, resolution, sparks, sort_order)",
    )
    .eq("id", request.modelId)
    .maybeSingle();

  const providerRow = model?.ai_providers;

  if (
    !model ||
    !providerRow ||
    !model.enabled ||
    !providerRow.enabled ||
    !model.capabilities.includes("video_gen")
  ) {
    return fail("invalid");
  }

  const provider = findVideoProvider(providerRow.slug);

  if (!provider || !isProviderConfigured(providerRow.env_var_name)) {
    return fail("not_configured");
  }

  // 2b. O preço **desta duração**, do catálogo — e com ele a resolução, que no
  //     Kling não é parâmetro da API: é propriedade do endpoint. Enquanto um
  //     modelo tiver uma linha só por duração, quem escolhe é o catálogo; no dia
  //     em que houver duas, o node ganha um seletor e o pedido passa a nomeá-la.
  const priced = (model.ai_model_video_prices ?? [])
    .filter((price) => price.duration_seconds === request.durationSeconds)
    .sort((a, b) => a.sort_order - b.sort_order);

  const price = priced[0];

  if (!price) return fail("unsupported_duration");

  // 3. A menção. Recusada aqui, que é antes do saldo, antes da tradução e antes
  //    do provedor — **zero Spark, e não "quase zero"**.
  if (findMentions(request.prompt).length > 0) return fail("mention_not_supported");

  // 3b. A ficha de cena, quando há uma — Ciclo 3 · Fase 3.
  //
  //     Lida aqui, antes de qualquer coisa cara, pelo mesmo motivo de tudo o
  //     mais nesta ordem: uma cena que não é de quem pediu tem de custar zero.
  //     O `submit_video_generation` confere de novo (VD008) e é ele a fechadura;
  //     esta leitura existe para a recusa ter frase, e para a PROCEDÊNCIA ser
  //     recomposta da ficha em vez de aceita do navegador.
  //
  //     `buildSceneMotion` é a mesma função pura que a Máquina usou para compor
  //     o texto — chamada aqui pela razão de sempre: uma segunda maneira de
  //     compor seria uma segunda chance de as duas discordarem.
  let sceneProvenance: { ordem: number; movimento_pt: string } | null = null;

  if (request.scene) {
    const { data: ficha } = await supabase
      .from("storyboard_scenes")
      .select("ordem, acao, movimento, storyboards!inner (project_id)")
      .eq("id", request.scene.id)
      .eq("user_id", userId)
      .eq("storyboards.project_id", request.projectId)
      .maybeSingle();

    if (!ficha) return fail("unknown_scene");

    sceneProvenance = {
      ordem: ficha.ordem,
      movimento_pt: buildSceneMotion({ acao: ficha.acao, movimento: ficha.movimento }),
    };
  }

  // 4. A imagem de partida. RLS responde de quem ela é: um id de outra pessoa
  //    simplesmente não carrega.
  const payloads = await loadImagePayloads(supabase, [request.sourceAssetId]);

  if (!payloads || payloads.length === 0) return fail("missing_reference");

  const sourceImage = payloads[0];

  // 5. Português entra, inglês sai — antes de um Spark estar em risco.
  const scenePt = request.prompt.trim();
  let sceneEn = DEFAULT_MOTION_EN;

  if (scenePt !== "") {
    const translation = await translateItems(supabase, [{ id: "cena", text: scenePt }]);

    if (!translation.ok) return fail("translation_failed");

    const translated = (translation.translations.cena ?? "").trim();

    // Uma frase que foi e não voltou não é coisa para remendar: o usuário
    // pagaria o preço cheio por um vídeo sem o que ele pediu.
    if (translated === "") return fail("translation_failed");

    sceneEn = translated;
  }

  const promptCompiled = {
    text: sceneEn,
    structure: {
      cena_pt: scenePt,
      cena_en: sceneEn,
      // Marcado, porque a frase padrão é o sistema falando. Um registro que não
      // distingue "o usuário não escreveu nada" de "o usuário escreveu isto" é
      // um registro que envelhece em falso.
      cena_origem: scenePt === "" ? ("padrao" as const) : ("usuario" as const),
      fonte_asset_id: request.sourceAssetId,
      duracao_segundos: request.durationSeconds,
      resolucao: price.resolution,
      endpoint: model.slug,
      // A auditoria bilíngue da invariante 13 ganha a procedência da ficha
      // quando o pedido vem da Máquina: qual cena, e o que a ficha dizia ao
      // gerar. Ausente num vídeo comum, e ausente é honesto — não havia ficha.
      ...(sceneProvenance ? { storyboard: sceneProvenance } : {}),
    },
  };

  // 6. A linha, antes da chamada. Ela também confere saldo, projeto e preço —
  //    e **não cobra nada**.
  const { data: generation, error: submitError } = await supabase.rpc(
    "submit_video_generation",
    {
      p_model_id: model.id,
      p_project_id: request.projectId,
      p_node_id: request.nodeId,
      p_duration_seconds: request.durationSeconds,
      p_resolution: price.resolution,
      p_prompt_user_pt: scenePt === "" ? undefined : scenePt,
      p_prompt_compiled: promptCompiled,
      p_params: {
        source_asset_id: request.sourceAssetId,
        prompt_pt: scenePt,
      },
      p_summary: {
        duracao_segundos: request.durationSeconds,
        resolucao: price.resolution,
        cena_origem: promptCompiled.structure.cena_origem,
      },
      p_scene_id: request.scene?.id ?? undefined,
    },
  );

  if (submitError || !generation) {
    return fail(SUBMIT_ERROR_CODES[submitError?.code ?? ""] ?? "error");
  }

  // 7. A chamada. O id da geração viaja na URL de retorno, o que fecha a corrida
  //    entre o webhook e o passo 8: a fal não precisa que o protocolo já esteja
  //    gravado para nós sabermos de quem é a entrega.
  const webhookUrl = buildWebhookUrl(webhookBase, generation.id);

  let submission;

  try {
    submission = await provider.submitVideo({
      model: { slug: model.slug },
      input: {
        prompt: sceneEn,
        image: sourceImage,
        durationSeconds: request.durationSeconds,
      },
      webhookUrl,
    });
  } catch (error) {
    // A linha existe e o trabalho não saiu. Marcá-la como falha aqui é o que
    // impede um node de nascer preso em "Na fila" — e é grátis, porque falha
    // nunca cobra.
    await completeVideoGeneration({
      generationId: generation.id,
      providerJobId: null,
      outcome: { state: "failed", detail: providerErrorDetail(error), refused: false },
    }).catch(() => undefined);

    const kind = error instanceof ProviderError ? error.kind : "provider";

    return {
      ok: false,
      reason:
        kind === "not_configured"
          ? "not_configured"
          : kind === "account"
            ? "provider_account"
            : kind === "refused"
              ? "refused"
              : "error",
      detail: providerErrorDetail(error),
    };
  }

  // 8. O protocolo e as URLs, guardadas como vieram.
  const { error: attachError } = await supabase.rpc("attach_video_job", {
    p_generation_id: generation.id,
    p_provider_job_id: submission.requestId,
    p_provider_urls: {
      status_url: submission.statusUrl,
      response_url: submission.responseUrl,
      cancel_url: submission.cancelUrl,
    },
  });

  // VD005 aqui não é falha: significa que o webhook chegou **primeiro** e a linha
  // já é terminal — ele carrega o id da geração na URL e não depende deste
  // protocolo. O trabalho deu certo; só chegou fora de ordem.
  if (attachError && attachError.code !== "VD005") {
    return fail("error");
  }

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance_cents")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    ok: true,
    generationId: generation.id,
    providerJobId: submission.requestId,
    // O que **será** cobrado. Nada foi cobrado ainda, e a tela repete depois do
    // clique exatamente o número que disse antes dele.
    sparksToCharge: price.sparks,
    balanceSparks: Math.floor((wallet?.balance_cents ?? 0) / CENTS_PER_SPARK),
  };
}

/** Códigos de recusa de submit_video_generation — ver a migration. */
const SUBMIT_ERROR_CODES: Record<string, VideoGenerationFailure> = {
  VD001: "insufficient_balance",
  VD002: "invalid",
  VD003: "invalid",
  VD004: "unsupported_duration",
  VD008: "unknown_scene",
};

/**
 * A URL de retorno desta geração.
 *
 * A base vem do ambiente e já traz o bypass da Vercel como query param; o que se
 * acrescenta é `g`, o id da geração. Montado com `URL` e não com concatenação
 * justamente porque a base **tem** query string: um `?` a mais transformaria o
 * bypass em parte do valor de `g` e a Vercel recusaria a entrega.
 *
 * O `g` é untrusted por natureza — a assinatura cobre corpo e cabeçalhos, não a
 * URL. Ele é usado só como chave de busca, e nada acontece sem assinatura
 * válida: o pior que um `g` adulterado faz é apontar para uma linha que não
 * casa com o `request_id` do corpo assinado, e o webhook recusa.
 */
/**
 * A URL de retorno é a nossa? — a trava de FORMA, irmã da de presença.
 *
 * Compara só o **caminho**, e de propósito: o host muda a cada túnel novo, e a
 * query carrega o segredo do Protection Bypass da Vercel em produção. O que não
 * pode variar é para onde ela aponta dentro do app.
 */
function apontaParaOWebhook(base: string): boolean {
  try {
    return new URL(base).pathname.replace(/\/+$/, "") === FAL_WEBHOOK_PATH;
  } catch {
    // Nem URL absoluta é. `buildWebhookUrl` lançaria adiante, e um 500 na rota
    // de submissão diria muito menos do que esta recusa nomeada.
    return false;
  }
}

function buildWebhookUrl(base: string, generationId: string): string {
  const url = new URL(base);

  url.searchParams.set("g", generationId);

  return url.toString();
}

function fail(reason: VideoGenerationFailure): VideoGenerationResult {
  return { ok: false, reason };
}

/**
 * A URL de retorno **responde**? — a segunda metade da trava, 29/08/2026.
 *
 * ---------------------------------------------------------------------------
 * Por que a trava de forma não bastou, pela segunda vez
 * ---------------------------------------------------------------------------
 *
 * 13/08 conferia **presença**, e em 28/08 uma variável presente e **errada**
 * custou quatro clipes pagos sem retorno. O conserto foi conferir **forma** — e
 * em 29/08, na primeira sonda da sessão seguinte, a forma passou: a linha de
 * ontem tinha sobrevivido no `.env.local` apontando para um túnel **morto**.
 * `pathname` perfeito, DNS sem resolver, `HTTP 000` em 8 ms.
 *
 * "Presente e morta" é o terceiro modo de falhar do mesmo endereço, e os três
 * têm o mesmo desfecho: o trabalho sai, gera, cobra, e ninguém aqui sabe.
 *
 * ---------------------------------------------------------------------------
 * Uma ida à rede POR CLIQUE, e não por submissão
 * ---------------------------------------------------------------------------
 *
 * Conferir vida em toda submissão poria uma volta pela internet dentro de cada
 * cena de um lote de dez. O portão é onde o dinheiro é autorizado, e é lá que a
 * pergunta cabe: **uma ida, antes do primeiro Spark**, ~700 ms medidos.
 *
 * ---------------------------------------------------------------------------
 * Só 401 e 405 são vida
 * ---------------------------------------------------------------------------
 *
 * São as duas respostas do **nosso** endpoint: 405 porque a rota só atende POST,
 * 401 porque a fechadura recusa quem não assina. Qualquer outra coisa —
 * 502 e 530 de um túnel cujo processo caiu, 404, ou um 200 de página genérica —
 * é alguém respondendo que **não é o webhook**, e aceitar isso reproduziria o
 * estrago com um verniz de verificação.
 */
const WEBHOOK_ALIVE_TIMEOUT_MS = 5000;

export type WebhookAliveResult =
  | { vivo: true }
  | { vivo: false; motivo: "nao_configurado" | "forma_invalida" | "sem_resposta"; status?: number };

export async function webhookResponde(): Promise<WebhookAliveResult> {
  const base = process.env.FAL_WEBHOOK_URL;

  if (!base || base.trim() === "") return { vivo: false, motivo: "nao_configurado" };
  if (!apontaParaOWebhook(base)) return { vivo: false, motivo: "forma_invalida" };

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), WEBHOOK_ALIVE_TIMEOUT_MS);

  try {
    const resposta = await fetch(base, {
      method: "GET",
      signal: controle.signal,
      cache: "no-store",
    });

    if (resposta.status === 401 || resposta.status === 405) return { vivo: true };

    return { vivo: false, motivo: "sem_resposta", status: resposta.status };
  } catch {
    // DNS que não resolve, conexão recusada, ou os 5 segundos estourados. Para
    // quem clicou os três são a mesma frase: o endereço de retorno não responde.
    return { vivo: false, motivo: "sem_resposta" };
  } finally {
    clearTimeout(relogio);
  }
}
