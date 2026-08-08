import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { readProviderKey } from "@/lib/providers/keys";
import {
  ProviderError,
  type ExtractionProvider,
  type ExtractionResult,
} from "@/lib/providers/types";

/**
 * The Anthropic adapter — the first implementation of ExtractionProvider.
 *
 * Everything specific to Anthropic lives here and only here: the SDK, the shape
 * of an image content block, how a refusal is reported, how usage is read. The
 * extraction engine above it knows none of that, which is what makes adding
 * OpenAI or Google a new file rather than a change to the engine.
 *
 * Model identifiers are not decided here. They come from ai_models.slug in the
 * catalogue, verified against Anthropic's official documentation when seeded.
 */

/** Which providers this file speaks for, matching ai_providers.slug. */
const PROVIDER_SLUG = "anthropic";

/**
 * Generous enough for the whole answer, tight enough to stay a cheap call.
 * On models with adaptive thinking this ceiling covers thinking *and* the answer,
 * so a truncated response shows up as stop_reason "max_tokens" rather than as
 * silently missing fields — which is why the caller treats that as an error.
 */
const MAX_TOKENS = 8000;

/**
 * Below the 60s ceiling of a Vercel function, so a slow call fails as our own
 * clear error instead of the platform killing the request mid-flight.
 * Milliseconds — the TypeScript SDK's unit.
 */
const REQUEST_TIMEOUT_MS = 50_000;

/**
 * One retry, not the SDK's default two. A vision call is paid work: retrying it
 * twice inside a 60s budget would burn the budget rather than save the request.
 */
const MAX_RETRIES = 1;

/**
 * Reading a face against closed lists is careful work, but it is not
 * open-ended reasoning: `medium` buys most of the accuracy for a fraction of the
 * thinking tokens the API's `high` default would spend. Deliberate cost decision
 * — extractions.real_cost_cents is what will tell us whether it was the right
 * one.
 *
 * Only models that accept the parameter are listed: sending `effort` to a model
 * without it is a 400. This is knowledge about Anthropic's API surface, which is
 * exactly what belongs in an adapter rather than in the catalogue.
 */
const EFFORT_CAPABLE_MODELS = new Set(["claude-opus-5", "claude-sonnet-5"]);
const EXTRACTION_EFFORT = "medium";

export const anthropicExtractionProvider: ExtractionProvider = {
  slug: PROVIDER_SLUG,

  async extract({ model, input, systemPrompt, jsonSchema }): Promise<ExtractionResult> {
    const apiKey = readProviderKey("ANTHROPIC_API_KEY");

    if (!apiKey) {
      throw new ProviderError("not_configured", "ANTHROPIC_API_KEY is not set on the server");
    }

    const client = new Anthropic({
      apiKey,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
    });

    // The photo rides as an image block before the instruction, which is the
    // order Anthropic recommends for vision. Pasted text is just text.
    const content: Anthropic.ContentBlockParam[] =
      input.kind === "photo"
        ? [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: input.mimeType as "image/jpeg" | "image/png" | "image/webp",
                data: input.base64,
              },
            },
            { type: "text", text: PHOTO_INSTRUCTION },
          ]
        : [{ type: "text", text: `${TEXT_INSTRUCTION}\n\n<entrada>\n${input.text}\n</entrada>` }];

    let response: Anthropic.Message;

    try {
      response = await client.messages.create({
        model: model.slug,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content }],
        // Structured outputs: the answer is constrained to the schema, so the
        // model cannot wrap it in prose or trail off into commentary. It does not
        // replace validation — the schema knows the field names, only our own Zod
        // pass knows the closed lists.
        output_config: {
          format: { type: "json_schema", schema: jsonSchema },
          ...(EFFORT_CAPABLE_MODELS.has(model.slug) ? { effort: EXTRACTION_EFFORT } : {}),
        },
      });
    } catch (error) {
      throw toProviderError(error);
    }

    // A safety refusal is an expected outcome in this product (architecture
    // decision 7), not a crash: it arrives as a normal 200 with this stop reason
    // and an empty or partial body, so it has to be checked before reading
    // content at all.
    if (response.stop_reason === "refusal") {
      throw new ProviderError("refused", "the provider declined to analyse this input");
    }

    if (response.stop_reason === "max_tokens") {
      throw new ProviderError("invalid_answer", "the answer was cut off before it finished");
    }

    const text = response.content.find((block) => block.type === "text")?.text;

    if (!text) {
      throw new ProviderError("invalid_answer", "the provider returned no text");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ProviderError("invalid_answer", "the provider did not return JSON");
    }

    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new ProviderError("invalid_answer", "the provider did not return a JSON object");
    }

    return {
      fields: parsed as Record<string, unknown>,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  },
};

/**
 * The per-source nudge. The rules that matter — physical attributes only, never
 * identify anyone, null for the unassessable — are in the system prompt, where
 * they apply to both sources; these two lines only say which kind of input
 * arrived.
 */
const PHOTO_INSTRUCTION =
  "Analise a foto acima e preencha o formulário conforme as regras do sistema.";

const TEXT_INSTRUCTION =
  "Mapeie a descrição de personagem abaixo para o formulário, conforme as regras " +
  "do sistema. A entrada pode estar em qualquer idioma e em qualquer formato " +
  "(JSON, lista, texto corrido).";

/**
 * Turns an SDK error into one of our four kinds. Authentication is reported as a
 * configuration problem because that is what it almost always is — a key that is
 * missing, wrong or revoked — and the interface can then say something useful
 * instead of "error 401".
 */
function toProviderError(error: unknown): ProviderError {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new ProviderError("not_configured", "the provider rejected the API key");
  }

  if (error instanceof Anthropic.APIError) {
    return new ProviderError("provider", `the provider returned ${error.status ?? "an error"}`);
  }

  return new ProviderError("provider", "the provider could not be reached");
}
