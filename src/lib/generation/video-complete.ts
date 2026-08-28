import "server-only";

import { IMMUTABLE_CACHE_CONTROL } from "@/lib/assets/thumbnail-path";
import { findVideoProvider } from "@/lib/providers/registry";
import { providerErrorDetail, type VideoJobState } from "@/lib/providers/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Concluir um vídeo — **um caminho, dois gatilhos**.
 *
 * O webhook chama isto quando a fal telefona; a reconciliação chama isto quando
 * alguém pergunta. Duas cópias divergiriam, e a segunda a divergir seria a que
 * ninguém testa — mesma razão pela qual a Galeria virou um *modo* do seletor de
 * referências em vez de uma segunda tela.
 *
 * ---------------------------------------------------------------------------
 * A ordem, e o que cada passo impede
 * ---------------------------------------------------------------------------
 *
 * 1. **portão de idempotência primeiro, antes de baixar nada.** A fal reentrega
 *    até 31 vezes; conferir o estado antes do download é o que impede a segunda
 *    entrega de gastar quarenta segundos de função para chegar num no-op.
 * 2. **download** — a invariante 3: URL de provedor expira, o asset nosso é a
 *    verdade.
 * 3. **Storage, em caminho determinístico pelo id da geração.**
 * 4. **asset por upsert**, casando no caminho.
 * 5. **cobrança**, que é a única escrita que mexe em dinheiro, e é atômica.
 *
 * ---------------------------------------------------------------------------
 * Por que o caminho no Storage é determinístico
 * ---------------------------------------------------------------------------
 *
 * `<user>/video/<projeto>/<generationId>.mp4` — e o `generationId` no nome é o
 * que torna o passo 4 possível.
 *
 * Com um `crypto.randomUUID()` no caminho, como faz a geração de imagem, duas
 * entregas simultâneas escreveriam **dois arquivos** e criariam **dois assets**
 * para o mesmo vídeo: o segundo passaria pelo unique de `(bucket, path)` sem
 * esbarrar em nada, porque os caminhos seriam diferentes. O vídeo apareceria
 * duas vezes na galeria e um dos dois arquivos ficaria órfão para sempre.
 *
 * Determinístico, a segunda entrega **sobrescreve o mesmo arquivo com os mesmos
 * bytes** e o upsert devolve o asset que já existia. Execução dupla sobrescreve,
 * nunca duplica. Na imagem isso não era necessário porque cada clique é uma
 * geração nova; aqui a mesma geração pode chegar trinta e uma vezes.
 */

/** O que a conclusão respondeu, para quem chamou saber o que dizer. */
export type VideoCompletion =
  | { kind: "succeeded"; assetId: string; sparksCharged: number }
  | { kind: "failed"; detail: string }
  /** A linha já era terminal quando chegamos — reentrega, e está tudo certo. */
  | { kind: "already"; status: string }
  /** Não há linha para concluir. Quem chama decide se retenta ou desiste. */
  | { kind: "not_found" };

export async function completeVideoGeneration(input: {
  generationId: string;
  /** Do corpo assinado do webhook, ou da linha, quando veio da reconciliação. */
  providerJobId: string | null;
  outcome: VideoJobState;
}): Promise<VideoCompletion> {
  const supabase = createSupabaseAdminClient();

  // 1. O portão. Antes de qualquer trabalho caro, e é o que faz reentrega
  //    custar uma consulta em vez de um download.
  const { data: generation } = await supabase
    .from("generations")
    .select("id, user_id, project_id, status, media_kind, model_id, params, provider_job_id")
    .eq("id", input.generationId)
    .eq("media_kind", "video")
    .maybeSingle();

  if (!generation) return { kind: "not_found" };

  if (
    generation.status === "succeeded" ||
    generation.status === "failed" ||
    generation.status === "canceled"
  ) {
    return { kind: "already", status: generation.status };
  }

  // Um retorno que não é desta linha não conclui coisa nenhuma. A função do
  // banco recusa o mesmo caso com VD006; conferir aqui é o que evita gastar o
  // download para receber a recusa depois.
  if (
    input.providerJobId &&
    generation.provider_job_id &&
    generation.provider_job_id !== input.providerJobId
  ) {
    return { kind: "not_found" };
  }

  // 2–5. Fracasso não baixa nada e não cobra nada.
  if (input.outcome.state !== "succeeded") {
    const detail =
      input.outcome.state === "failed"
        ? input.outcome.detail
        : `o provedor respondeu ${input.outcome.state}`;

    return finish(supabase, {
      generationId: generation.id,
      providerJobId: input.providerJobId,
      status: "failed",
      errorMessage: detail,
    });
  }

  const provider = findVideoProvider("fal");

  if (!provider) {
    return finish(supabase, {
      generationId: generation.id,
      providerJobId: input.providerJobId,
      status: "failed",
      errorMessage: "no video adapter for this provider",
    });
  }

  let video;

  try {
    video = await provider.downloadVideo(input.outcome.videoUrl);
  } catch (error) {
    // O vídeo existe do lado deles e não conseguimos trazer. Marcar como falha
    // é honesto e é **grátis** — e é melhor do que deixar `running` para sempre,
    // que é o único desfecho pior que uma falha.
    return finish(supabase, {
      generationId: generation.id,
      providerJobId: input.providerJobId,
      status: "failed",
      errorMessage: providerErrorDetail(error),
    });
  }

  const extension = video.mimeType.includes("webm") ? "webm" : "mp4";
  const folder = generation.project_id ?? "sem-projeto";
  const storagePath = `${generation.user_id}/video/${folder}/${generation.id}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(storagePath, video.bytes, {
      contentType: video.mimeType,
      cacheControl: IMMUTABLE_CACHE_CONTROL,
      // O que faz a segunda entrega sobrescrever em vez de falhar. Os bytes são
      // os mesmos: é o mesmo vídeo, do mesmo link, da mesma geração.
      upsert: true,
    });

  if (uploadError) {
    return finish(supabase, {
      generationId: generation.id,
      providerJobId: input.providerJobId,
      status: "failed",
      errorMessage: `storage upload failed: ${uploadError.message}`,
    });
  }

  const requestedSeconds = Number(
    (generation.params as { duration_seconds?: unknown } | null)?.duration_seconds ?? 0,
  );

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .upsert(
      {
        user_id: generation.user_id,
        kind: "video",
        source: "generation",
        storage_path: storagePath,
        mime_type: video.mimeType,
        byte_size: video.bytes.byteLength,
        // A duração **pedida**, não a medida: medir exigiria decodificar o
        // arquivo, e é a pedida que o catálogo cobrou. Se um dia as duas
        // divergirem, é o provedor que entregou outra coisa — e aí a diferença
        // é o dado que interessa, não o número.
        duration_ms: Number.isFinite(requestedSeconds) ? requestedSeconds * 1000 : null,
        label: videoLabel(generation.params),
      },
      // O casamento é pelo caminho, que é determinístico pelo id da geração —
      // é isto que transforma "duas entregas" em "um asset".
      { onConflict: "storage_bucket,storage_path" },
    )
    .select("id")
    .single();

  if (assetError || !asset) {
    return finish(supabase, {
      generationId: generation.id,
      providerJobId: input.providerJobId,
      status: "failed",
      errorMessage: `asset insert failed: ${assetError?.message ?? "no row"}`,
    });
  }

  return finish(supabase, {
    generationId: generation.id,
    providerJobId: input.providerJobId,
    status: "succeeded",
    resultAssetId: asset.id,
  });
}

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/**
 * A única escrita que mexe em dinheiro, e ela é do banco.
 *
 * `p_real_cost_cents` **não é passado**: a função lê o custo do catálogo, pelo
 * mesmo princípio que faz o preço não vir de quem chama. Quem chamasse com um
 * custo poderia chamar com zero, e a margem gravada deixaria de ser conferível.
 */
async function finish(
  supabase: Admin,
  input: {
    generationId: string;
    providerJobId: string | null;
    status: "succeeded" | "failed";
    resultAssetId?: string;
    errorMessage?: string;
  },
): Promise<VideoCompletion> {
  const { data, error } = await supabase.rpc("complete_video_generation", {
    p_generation_id: input.generationId,
    p_provider_job_id: input.providerJobId ?? "",
    p_status: input.status,
    p_result_asset_id: input.resultAssetId,
    p_error_message: input.errorMessage?.slice(0, 500),
  });

  if (error || !data) {
    // Nada foi cobrado se chegamos aqui — a função é uma transação só. Quem
    // chama devolve 5xx e a fal reentrega, que é o comportamento certo: a linha
    // continua não-terminal e a próxima entrega tenta de novo.
    throw new Error(`complete_video_generation failed: ${error?.message ?? "no row"}`);
  }

  if (data.status === "succeeded") {
    return { kind: "succeeded", assetId: data.result_asset_id ?? "", sparksCharged: data.sparks_charged };
  }

  return { kind: "failed", detail: data.error_message ?? "" };
}

/** O nome do vídeo na galeria: a frase do usuário, como nas imagens. */
function videoLabel(params: unknown): string {
  const written = (params as { prompt_pt?: unknown } | null)?.prompt_pt;

  if (typeof written === "string" && written.trim() !== "") {
    const flat = written.trim().replace(/\s+/g, " ");

    return flat.length > 120 ? `${flat.slice(0, 119)}…` : flat;
  }

  return "Vídeo no canvas";
}
