import "server-only";

import {
  downloadFile,
  looksRefused,
  readQueueStatus,
  submitToQueue,
} from "@/lib/providers/fal-queue";
import {
  ProviderError,
  type VideoGenerationProvider,
  type VideoJobState,
  type VideoPayload,
  type VideoSubmission,
} from "@/lib/providers/types";

/**
 * O adaptador da fal.ai — e a linha divisória que o adendo deste ciclo pediu.
 *
 * ---------------------------------------------------------------------------
 * O adaptador é do FORNECEDOR, não do modelo
 * ---------------------------------------------------------------------------
 *
 * Tudo que é mecânica — fila, assinatura, download, reconciliação — mora em
 * `fal-queue.ts` e não sabe o que é Kling. O que sobra aqui é o formato de
 * entrada e o formato de saída, e mesmo esses são **tabela**, não `if`.
 *
 * O critério de prova, escrito para poder ser cobrado: **acrescentar um segundo
 * modelo da fal é uma linha em `ai_models` mais, no máximo, uma entrada em
 * `ENDPOINT_OVERRIDES` — nunca uma mudança no motor.** Hoje esse mapa está
 * vazio, e isso não é falta de conteúdo: é a afirmação de que o contrato padrão
 * da fal para image-to-video cobre o Kling inteiro.
 *
 * O identificador do endpoint também não é decidido aqui. Ele vem de
 * `ai_models.slug`, que para a fal **é a própria rota** — o que faz o catálogo
 * carregar a rota do provedor sem precisar de coluna nova.
 */

/** Which provider this file speaks for, matching ai_providers.slug. */
const PROVIDER_SLUG = "fal";

/**
 * O contrato padrão da fal para image-to-video, conferido na documentação
 * oficial em 13/08/2026:
 *
 *   prompt          string   obrigatório
 *   image_url       string   obrigatório — aceita **data URI base64**
 *   duration        "5"|"10" string, não número
 *   negative_prompt string   default "blur, distort, and low quality"
 *   cfg_scale       float    default 0.5
 *
 * Não há `aspect_ratio`, e a ausência é correta: em image-to-video a proporção
 * vem da imagem de entrada. Pedir uma seria mandar o modelo cortar o que o
 * usuário já enquadrou.
 *
 * **`duration` é string.** Mandar o número 5 é o tipo de erro que passa no
 * TypeScript, passa no lint, e volta como 422 do provedor depois do clique.
 */
function defaultImageToVideoInput(input: {
  prompt: string;
  imageDataUri: string;
  durationSeconds: number;
}): Record<string, unknown> {
  return {
    prompt: input.prompt,
    image_url: input.imageDataUri,
    duration: String(input.durationSeconds),
  };
}

/**
 * Onde um endpoint da fal diverge do contrato padrão.
 *
 * **Vazio de propósito.** O Kling 2.1 standard usa o contrato acima inteiro, e
 * uma entrada aqui só existe quando um modelo novo pedir outra coisa. Um mapa
 * vazio com um tipo declarado é a diferença entre "isto é extensível" e "isto
 * seria extensível se alguém refatorasse".
 */
const ENDPOINT_OVERRIDES: Record<
  string,
  {
    buildInput?: (input: {
      prompt: string;
      imageDataUri: string;
      durationSeconds: number;
    }) => Record<string, unknown>;
    readVideoUrl?: (payload: unknown) => string | null;
  }
> = {};

export const falVideoProvider: VideoGenerationProvider = {
  slug: PROVIDER_SLUG,

  async submitVideo({ model, input, webhookUrl }): Promise<VideoSubmission> {
    const override = ENDPOINT_OVERRIDES[model.slug];
    const build = override?.buildInput ?? defaultImageToVideoInput;

    // A imagem viaja **dentro do corpo**, como data URI. É o que mantém o bucket
    // `assets` privado: entregar uma URL assinada publicaria, ainda que por uma
    // hora, um arquivo que é de um usuário. O custo é o inchaço de ~33% do
    // base64, que é conhecido e está registrado.
    const imageDataUri = `data:${input.image.mimeType};base64,${input.image.base64}`;

    return submitToQueue({
      endpoint: model.slug,
      input: build({
        prompt: input.prompt,
        imageDataUri,
        durationSeconds: input.durationSeconds,
      }),
      webhookUrl,
    });
  },

  async checkVideo({ model, statusUrl, responseUrl }): Promise<VideoJobState> {
    const status = await readQueueStatus({ statusUrl, responseUrl });

    switch (status.kind) {
      case "pending":
        return { state: "pending" };
      case "unknown":
        return { state: "unknown" };
      case "failed":
        return { state: "failed", detail: status.detail, refused: looksRefused(status.detail) };
      case "completed": {
        const videoUrl = readVideoUrl(model.slug, status.payload);

        if (videoUrl) return { state: "succeeded", videoUrl };

        // Concluído e sem vídeo é o formato documentado de uma recusa, e o mesmo
        // raciocínio do adaptador do Google: tratar "terminou vazio" como recusa
        // é o que permite a mensagem certa na tela em vez de "erro inesperado".
        const detail = describe(status.payload);

        return { state: "failed", detail, refused: looksRefused(detail) };
      }
    }
  },

  /**
   * Lê o corpo de um webhook já **verificado**.
   *
   * O formato, verbatim da documentação:
   *
   *   sucesso  { request_id, gateway_request_id, status: "OK",    payload: {…} }
   *   erro     { request_id, gateway_request_id, status: "ERROR", error, payload }
   *
   * Note que `status: "OK"` fala do *transporte*, não do resultado: uma entrega
   * OK sem vídeo dentro continua sendo uma geração que não produziu nada — daí
   * a leitura do payload valer mais do que a palavra.
   */
  readWebhook(body: unknown): VideoJobState {
    if (typeof body !== "object" || body === null) {
      return { state: "failed", detail: "webhook body was not an object", refused: false };
    }

    const envelope = body as { status?: unknown; error?: unknown; payload?: unknown };

    if (envelope.status === "ERROR") {
      const detail =
        typeof envelope.error === "string" && envelope.error !== ""
          ? envelope.error
          : describe(envelope.payload);

      return { state: "failed", detail, refused: looksRefused(detail) };
    }

    // O slug não é conhecido aqui: o webhook não diz de qual endpoint veio. O
    // leitor padrão serve, e um endpoint com formato próprio se declara em
    // ENDPOINT_OVERRIDES e é resolvido na reconciliação, que sabe o modelo.
    const videoUrl = readVideoUrl(null, envelope.payload);

    if (videoUrl) return { state: "succeeded", videoUrl };

    const detail = describe(envelope.payload);

    return { state: "failed", detail, refused: looksRefused(detail) };
  },

  async downloadVideo(videoUrl: string): Promise<VideoPayload> {
    return downloadFile(videoUrl);
  },
};

/**
 * Onde mora a URL do vídeo num payload da fal: `payload.video.url`.
 *
 * É o formato de saída padrão dos endpoints de vídeo deles, e um modelo que
 * divergir declara o seu leitor em ENDPOINT_OVERRIDES. Um `slug` nulo — o caso
 * do webhook, que não diz de onde veio — usa o padrão.
 */
function readVideoUrl(slug: string | null, payload: unknown): string | null {
  const override = slug ? ENDPOINT_OVERRIDES[slug]?.readVideoUrl : undefined;

  if (override) return override(payload);

  if (typeof payload !== "object" || payload === null) return null;

  const video = (payload as { video?: unknown }).video;

  if (typeof video !== "object" || video === null) return null;

  const url = (video as { url?: unknown }).url;

  return typeof url === "string" && url.startsWith("https://") ? url : null;
}

/** O que o provedor escreveu, verbatim e curto. Nunca contém credencial. */
function describe(payload: unknown): string {
  if (payload === null || payload === undefined) return "the provider returned no payload";

  const text = typeof payload === "string" ? payload : JSON.stringify(payload);

  return text.length > 400 ? `${text.slice(0, 399)}…` : text;
}

/** Exposto só para o harness de sabotagem. */
export const FAL_ADAPTER_INTERNALS = { readVideoUrl, looksRefused, defaultImageToVideoInput };

export { ProviderError };
