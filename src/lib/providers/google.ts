import "server-only";

import { ApiError, GoogleGenAI } from "@google/genai";

import { readProviderKey } from "@/lib/providers/keys";
import {
  ProviderError,
  type ExtractionProvider,
  type ExtractionResult,
  type ImageGenerationProvider,
  type ImageGenerationResult,
  type TextGenerationProvider,
  type TextGenerationResult,
} from "@/lib/providers/types";

/**
 * The Google adapter — the first implementation of ImageGenerationProvider.
 *
 * Everything specific to Google lives here and only here: the SDK, the shape of
 * an image content block, how a refusal arrives, how usage is reported. The
 * canonical generation above it knows none of that, which is what makes adding
 * OpenAI or xAI a new file rather than a change to the feature.
 *
 * Model identifiers are not decided here. They come from ai_models.slug in the
 * catalogue, verified against Google's official documentation when seeded.
 *
 * It uses the Interactions API through the official SDK (`ai.interactions`,
 * available from @google/genai 2.3.0). The older models.generateContent path
 * still exists but the documentation now points everything at Interactions, and
 * its response_format is the only place aspect ratio and image size can be
 * stated.
 */

/** Which provider this file speaks for, matching ai_providers.slug. */
const PROVIDER_SLUG = "google";

/**
 * Mirrors ai_providers.env_var_name for this provider, and matches the name
 * every official Google sample uses. The catalogue is what the *selector* reads
 * to decide whether to light the provider up; this is what the call itself
 * reads. Same convention as the Anthropic adapter.
 */
const API_KEY_ENV_VAR = "GEMINI_API_KEY";

/**
 * Below the 60s ceiling of a Vercel function, so a slow generation fails as our
 * own clear error instead of the platform killing the request mid-flight.
 * A 2K image takes tens of seconds, so this is a real ceiling, not a formality.
 */
const REQUEST_TIMEOUT_MS = 50_000;

/**
 * One attempt, no retries. A retried image generation is a *second image*
 * billed by Google — the SDK cannot know that the first one may have succeeded
 * on their side. The one retry this product does perform is the outfit fallback
 * of §5.22, which is a deliberate decision taken a layer above, with its own
 * record in the history and its own line on the screen.
 */
const NO_RETRIES = { attempts: 1 };

/**
 * "One attempt", in the only place the Interactions API listens to it.
 *
 * `NO_RETRIES` above configures the SDK's classic HTTP path — and
 * `ai.interactions.create`, which every adapter in this file uses, does not go
 * through it. The SDK builds a second client for that API, hands it the timeout
 * **and nothing else**, and every operation of that client carries its own
 * policy: up to FOUR more attempts, on 408, 409, 429, any 5xx and a dropped
 * connection, with waits of 0.5 s to 8 s. So until 02/10/2026 the sentence
 * above — "one attempt, no retries" — was true of the comment and false of the
 * calls: one click could be five requests to Google.
 *
 * The only door is the option PER CALL. Measured, not read (02/10/2026,
 * `@google/genai` 2.16.0, the real SDK against a fake `fetch`): HTTP 500, 503,
 * 429 and a dropped connection each made FIVE requests for one call; with this
 * option, ONE. 400, 403 and success make one request either way, and a success
 * answers the same with or without it. Every `interactions.create` in this file
 * passes it.
 */
const NO_INTERACTION_RETRIES = { maxRetries: 0 };

/**
 * Words that mean "I will not draw this". Google reports a policy refusal as a
 * perfectly normal error whose message is the only thing that distinguishes it
 * from a bad request — so the message is what gets read.
 *
 * Getting this wrong is not fatal in either direction: a refusal mistaken for a
 * provider error costs the user a retry, and a provider error mistaken for a
 * refusal costs one extra attempt with the compression outfit. Both are honest
 * on screen, which is why this is a heuristic rather than a promise.
 */
const REFUSAL_MARKERS = [
  "safety",
  "policy",
  "blocked",
  "prohibited",
  "content filter",
  "responsible ai",
  // Seen verbatim on 2026-08-09: "Image generation blocked due to safety
  // violations. Please modify your input and retry." The first two markers
  // already catch it; this one is here because the word is what the API chose
  // and the list is a record of what has actually been observed.
  "violation",
];

export const googleImageProvider: ImageGenerationProvider = {
  slug: PROVIDER_SLUG,

  async generateImage({ model, input }): Promise<ImageGenerationResult> {
    const apiKey = readProviderKey(API_KEY_ENV_VAR);

    if (!apiKey) {
      throw new ProviderError("not_configured", `${API_KEY_ENV_VAR} is not set on the server`);
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS, retryOptions: NO_RETRIES },
    });

    // References first, instruction last: the same ordering the extraction
    // adapter uses for a photo, and the one every vision API documents — the
    // model reads what it is looking at before it reads what to do with it.
    const contents = [
      ...(input.references ?? []).map((reference) => ({
        type: "image" as const,
        mime_type: reference.mimeType,
        data: reference.base64,
      })),
      { type: "text" as const, text: input.prompt },
    ];

    let interaction;

    try {
      interaction = await ai.interactions.create(
        {
          model: model.slug,
          input: contents,
          response_format: {
            type: "image",
            aspect_ratio: input.aspectRatio,
            image_size: input.imageSize,
          },
        },
        NO_INTERACTION_RETRIES,
      );
    } catch (error) {
      throw toProviderError(error);
    }

    const usage = {
      inputTokens: interaction.usage?.total_input_tokens ?? 0,
      outputTokens: interaction.usage?.total_output_tokens ?? 0,
    };

    const image = interaction.output_image;

    // A refused generation arrives as a successful call with no picture in it —
    // the documented shape of a safety block on this API. Treating "completed
    // but empty" as a refusal is what lets the outfit fallback of §5.22 fire on
    // the case it was written for, instead of only on an HTTP error.
    if (!image?.data) {
      const reported = (interaction.errors ?? [])
        .map((entry) => JSON.stringify(entry))
        .join("; ");

      throw new ProviderError(
        interaction.status === "failed" && reported !== "" ? "provider" : "refused",
        "the provider returned no image",
        `status=${interaction.status}${reported ? `, errors=${reported}` : ""}`,
      );
    }

    return {
      // The mime type is read back rather than assumed: the API is free to
      // answer in PNG or JPEG, and the file lands in Storage under whatever it
      // actually is.
      image: { mimeType: image.mime_type ?? "image/png", base64: image.data },
      usage,
    };
  },
};

/**
 * O adaptador de TEXTO — a quinta capacidade, e o segundo uso deste arquivo.
 *
 * Mesma casa, mesma chave, mesma tradução de erro. O que muda é uma linha:
 * `response_format` pede `text` com `mime_type: "application/json"` e o schema
 * junto, em vez de pedir uma imagem. É por isso que ele mora aqui e não num
 * arquivo próprio — separar seria duplicar `toProviderError`, que é a parte
 * que custou uma tarde de diagnóstico às cegas em 08/08.
 *
 * A forma da chamada não foi deduzida da documentação: é a que fez as 47
 * chamadas reais da Fase 0, copiada do probe que as fez.
 */
export const googleTextProvider: TextGenerationProvider = {
  slug: PROVIDER_SLUG,

  async generateText({ model, input }): Promise<TextGenerationResult> {
    const apiKey = readProviderKey(API_KEY_ENV_VAR);

    if (!apiKey) {
      throw new ProviderError("not_configured", `${API_KEY_ENV_VAR} is not set on the server`);
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS, retryOptions: NO_RETRIES },
    });

    let interaction;

    try {
      interaction = await ai.interactions.create(
        {
          model: model.slug,
          system_instruction: input.systemPrompt,
          input: [{ type: "text" as const, text: input.userPrompt }],
          // `type: "text"` com mime_type JSON é o structured output desta API —
          // não é o mesmo campo que o gerador de imagem usa para `aspect_ratio`,
          // e é a combinação que o probe da Fase 0 exercitou 47 vezes.
          response_format: {
            type: "text" as const,
            mime_type: "application/json",
            schema: input.schema,
          },
        },
        NO_INTERACTION_RETRIES,
      );
    } catch (error) {
      throw toProviderError(error);
    }

    const usage = {
      inputTokens: interaction.usage?.total_input_tokens ?? 0,
      outputTokens: interaction.usage?.total_output_tokens ?? 0,
    };

    const text = interaction.output_text;

    // Uma recusa de política chega como chamada bem-sucedida e vazia — a mesma
    // forma documentada que o gerador de imagem trata acima, e pela mesma razão
    // reconhecida aqui: sem isto, um roteiro recusado por conteúdo viraria
    // "erro inesperado" em vez da frase que diz o que refazer.
    //
    // E vale para texto tanto quanto para imagem: um roteiro pode pedir uma
    // cena que o provedor não escreve.
    if (!text || text.trim() === "") {
      const reported = (interaction.errors ?? []).map((entry) => JSON.stringify(entry)).join("; ");

      throw new ProviderError(
        interaction.status === "failed" && reported !== "" ? "provider" : "refused",
        "the provider returned no text",
        `status=${interaction.status}${reported ? `, errors=${reported}` : ""}`,
      );
    }

    // Devolvido cru, de propósito. Quem decide se isto pode ser gravado é o Zod
    // em lib/storyboard/contract.ts, acima da camada — um adaptador que já
    // parseasse seria um adaptador com opinião sobre o contrato.
    return { text, usage };
  },
};

/**
 * The sentence that travels with the photo. The contract itself is the system
 * prompt; this only says which kind of input arrived.
 *
 * It is, word for word, the sentence the Anthropic adapter sends with a photo
 * (`PHOTO_INSTRUCTION`, in anthropic.ts) — and that is not a coincidence to
 * tidy away: the F0 of the Frente 1 measured the two providers with the SAME
 * turn request, and a reading that differs from the measured one by a sentence
 * is a reading nobody measured. md5 `6cd53a1fe702a2efae2a284c9209cbef`, in the
 * plan (docs/plano-produto-diz.md) and checked by the F1 proofs on both files.
 */
const PHOTO_INSTRUCTION =
  "Analise a foto acima e preencha o formulário conforme as regras do sistema.";

/**
 * The READING adapter — a product photo becomes a JSON object, by the contract
 * that arrives as the system prompt. Frente 1 · F1.
 *
 * Same house, same key, same error translation, and **the exact shape of the
 * call the F0 made** on 27/09/2026 (round 5: two real readings, with this model,
 * the photo before the sentence, and this `response_format`). It was not deduced
 * from the documentation — the precedent is the text adapter right above.
 *
 * It implements `ExtractionProvider` and still **does not read characters**:
 * what each provider reads is decided by the registry (`registry.ts`), where
 * Google sits only in the product-reading map. The character contract, with its
 * closed lists, has never run on a Gemini — and it charges Sparks (the owner's
 * answer 9.3).
 *
 * Photo only. A product reading reads the first photo of the card; pasted text
 * goes through no model at all — the person pastes it straight into the field.
 *
 * **One attempt, no retry**, for the image generator's reason: the SDK cannot
 * know whether the first one was billed on their side. Said to the call itself
 * (`NO_INTERACTION_RETRIES`) — see that constant for why the client-wide
 * `NO_RETRIES` is not enough here.
 */
export const googleProductReadingProvider: ExtractionProvider = {
  slug: PROVIDER_SLUG,

  async extract({ model, input, systemPrompt, schema }): Promise<ExtractionResult> {
    const apiKey = readProviderKey(API_KEY_ENV_VAR);

    if (!apiKey) {
      throw new ProviderError("not_configured", `${API_KEY_ENV_VAR} is not set on the server`);
    }

    if (input.kind !== "photo") {
      throw new ProviderError("provider", "this adapter reads a photo, and was given text");
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS, retryOptions: NO_RETRIES },
    });

    let interaction;

    try {
      interaction = await ai.interactions.create(
        {
          model: model.slug,
          system_instruction: systemPrompt,
          // The photo before the sentence: the model reads what it is looking at
          // before it reads what to do with it — the image generator's ordering.
          input: [
            { type: "image" as const, mime_type: input.mimeType, data: input.base64 },
            { type: "text" as const, text: PHOTO_INSTRUCTION },
          ],
          response_format: {
            type: "text" as const,
            mime_type: "application/json",
            schema,
          },
        },
        NO_INTERACTION_RETRIES,
      );
    } catch (error) {
      throw toProviderError(error, "read this photo");
    }

    const usage = {
      inputTokens: interaction.usage?.total_input_tokens ?? 0,
      // Thinking is billed as output, and Google reports it APART. Measured in
      // the F0: 150 answer tokens came with 537 of thought — counting only the
      // first would record 1 cent where the invoice says 3.
      outputTokens:
        (interaction.usage?.total_output_tokens ?? 0) +
        (interaction.usage?.total_thought_tokens ?? 0),
    };

    const text = interaction.output_text;

    // A policy refusal arrives as a successful, empty call — the same shape the
    // two adapters above handle.
    if (!text || text.trim() === "") {
      const reported = (interaction.errors ?? []).map((entry) => JSON.stringify(entry)).join("; ");

      throw new ProviderError(
        interaction.status === "failed" && reported !== "" ? "provider" : "refused",
        "the provider returned no text",
        `status=${interaction.status}${reported ? `, errors=${reported}` : ""}`,
      );
    }

    // From the first `{` to the last `}`: the structured output returns a clean
    // object, and reading it this way costs nothing when it is already clean —
    // the Anthropic adapter's tolerance, so the two answers are read alike.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    let parsed: unknown = null;

    if (start !== -1 && end > start) {
      try {
        parsed = JSON.parse(text.slice(start, end + 1));
      } catch {
        parsed = null;
      }
    }

    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new ProviderError(
        "invalid_answer",
        "the provider did not return a JSON object",
        `tamanho=${text.length} (trecho: ${JSON.stringify(text.slice(0, 120))})`,
      );
    }

    // Returned as it came. Whether this is a reading is decided by the Zod above
    // the layer (lib/product-reading/contract.ts).
    return { fields: parsed as Record<string, unknown>, usage };
  },
};

/**
 * Turns an SDK error into one of our four kinds, keeping Google's own
 * explanation alongside ours.
 *
 * Authentication is reported as a configuration problem because that is what it
 * almost always is — a key that is missing, wrong, revoked, or attached to a
 * project without billing, which is its own common case for image models since
 * none of them has a free tier.
 *
 * `what` names the work that was refused, for the one sentence that mentions
 * it. It defaults to drawing — what this file did when the sentence was written
 * — so the image and text adapters record exactly what they always recorded.
 */
function toProviderError(error: unknown, what = "draw this"): ProviderError {
  // Verbatim, because a message we write ourselves can only repeat what we
  // already assumed. This is the response body, never the request, so it cannot
  // contain the key.
  const detail = error instanceof Error ? error.message : String(error);

  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return new ProviderError("not_configured", "the provider rejected the API key", detail);
    }

    if (isRefusal(detail)) {
      return new ProviderError("refused", `the provider declined to ${what}`, detail);
    }

    return new ProviderError("provider", `the provider returned ${error.status}`, detail);
  }

  // The refusal check is repeated outside the ApiError branch on purpose, and
  // it is not defensive programming — it is a bug fix with a receipt.
  //
  // On 2026-08-09 a real refusal from Nano Banana 2 was recorded as
  //   "the provider could not be reached: 400 Image generation blocked due to
  //    safety violations. Please modify your input and retry."
  //
  // The sentence says exactly what happened; the prefix is ours, and it is
  // wrong. The SDK had thrown something that was not an ApiError, so the check
  // above never ran and a content-policy refusal reached the screen dressed as
  // a network problem — which sends the user to look at their connection when
  // the fix was to rephrase a sentence.
  //
  // Reading what the provider wrote, rather than which class it was wrapped in,
  // is what makes the difference visible. Decision 7 of the architecture calls a
  // refusal an *expected* error; an expected error has to be recognisable.
  if (isRefusal(detail)) {
    return new ProviderError("refused", `the provider declined to ${what}`, detail);
  }

  return new ProviderError("provider", "the provider could not be reached", detail);
}

function isRefusal(message: string): boolean {
  const lowered = message.toLowerCase();
  return REFUSAL_MARKERS.some((marker) => lowered.includes(marker));
}
