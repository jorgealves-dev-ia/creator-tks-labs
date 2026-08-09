import "server-only";

import { ApiError, GoogleGenAI } from "@google/genai";

import { readProviderKey } from "@/lib/providers/keys";
import {
  ProviderError,
  type ImageGenerationProvider,
  type ImageGenerationResult,
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
      interaction = await ai.interactions.create({
        model: model.slug,
        input: contents,
        response_format: {
          type: "image",
          aspect_ratio: input.aspectRatio,
          image_size: input.imageSize,
        },
      });
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
 * Turns an SDK error into one of our four kinds, keeping Google's own
 * explanation alongside ours.
 *
 * Authentication is reported as a configuration problem because that is what it
 * almost always is — a key that is missing, wrong, revoked, or attached to a
 * project without billing, which is its own common case for image models since
 * none of them has a free tier.
 */
function toProviderError(error: unknown): ProviderError {
  // Verbatim, because a message we write ourselves can only repeat what we
  // already assumed. This is the response body, never the request, so it cannot
  // contain the key.
  const detail = error instanceof Error ? error.message : String(error);

  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return new ProviderError("not_configured", "the provider rejected the API key", detail);
    }

    if (isRefusal(detail)) {
      return new ProviderError("refused", "the provider declined to draw this", detail);
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
    return new ProviderError("refused", "the provider declined to draw this", detail);
  }

  return new ProviderError("provider", "the provider could not be reached", detail);
}

function isRefusal(message: string): boolean {
  const lowered = message.toLowerCase();
  return REFUSAL_MARKERS.some((marker) => lowered.includes(marker));
}
