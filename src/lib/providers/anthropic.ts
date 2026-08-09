import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { readProviderKey } from "@/lib/providers/keys";
import {
  ProviderError,
  type ExtractionProvider,
  type ExtractionResult,
  type TranslationProvider,
  type TranslationResult,
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

  async extract({ model, input, systemPrompt }): Promise<ExtractionResult> {
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
        // No structured-output schema: this contract is too big for the feature
        // (measured — see the note at the top of lib/extraction/prompt.ts). The
        // prompt asks for the shape and the Zod pass enforces the vocabulary,
        // which is where the specification always put the rule.
        ...(EFFORT_CAPABLE_MODELS.has(model.slug)
          ? { output_config: { effort: EXTRACTION_EFFORT } }
          : {}),
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

    const textBlocks = response.content.filter((block) => block.type === "text");

    // Every text block, joined — not the first one.
    //
    // A model is free to split its answer: a sentence of preamble in one block
    // and the JSON in the next, or a thinking block ahead of both. Reading only
    // the first text block found the preamble, threw the JSON away, and reported
    // the model's apology as the error. Joining costs nothing and cannot be
    // wrong; the brace scan below picks the object out of whatever arrives.
    const text = textBlocks.map((block) => block.text).join("\n");

    /** What went wrong, in facts rather than in the model's prose. */
    const diagnose = (problem: string) =>
      `${problem}; stop_reason=${response.stop_reason}, blocos_texto=${textBlocks.length}, ` +
      `tamanho=${text.length}` +
      (text ? ` (trecho: ${JSON.stringify(text.slice(0, 120))})` : "");

    if (response.stop_reason === "max_tokens") {
      throw new ProviderError(
        "invalid_answer",
        "the answer was cut off before it finished",
        diagnose("resposta truncada no limite de tokens"),
      );
    }

    if (!text) {
      throw new ProviderError(
        "invalid_answer",
        "the provider returned no text",
        diagnose("resposta sem nenhum bloco de texto"),
      );
    }

    // Without a schema pinning the output, a model can still decide to be
    // helpful — a code fence, a sentence of preamble. Reading from the first
    // brace to the last is what makes that harmless instead of fatal, and costs
    // nothing when the answer is already clean.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end <= start) {
      throw new ProviderError(
        "invalid_answer",
        "the provider did not return JSON",
        diagnose("resposta sem nenhum objeto JSON"),
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch {
      throw new ProviderError(
        "invalid_answer",
        "the provider did not return valid JSON",
        diagnose("objeto JSON presente mas malformado"),
      );
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
 * Below the extraction ceiling: a batch of short phrases is a small answer, and
 * this call runs behind an autosave that nobody is watching.
 */
const TRANSLATION_MAX_TOKENS = 2000;
const TRANSLATION_TIMEOUT_MS = 20_000;

/**
 * The contract for translating the sheet's free text (§3.3 of
 * docs/geracao-canonica.md).
 *
 * The instructions are narrow on purpose. This model is not being asked to write
 * a prompt — the dictionary already wrote 95% of it. It is being asked to carry
 * one hand-typed fragment across a language, keeping it a fragment: no added
 * subject, no invented adjective, no sentence built around it. Anything more
 * would be the model quietly editing the DNA.
 */
const TRANSLATION_SYSTEM_PROMPT = `You translate short Portuguese fragments into English for use inside an image-generation prompt.

Rules:
- Translate ONLY what is written. Never add, embellish, interpret or complete a fragment.
- Keep the grammatical shape of a fragment: no capital letter at the start, no full stop at the end, no subject invented to make a sentence.
- Keep it as short as the original. "pequena e discreta" is "small and discreet", not "it is a small and discreet mark".
- Physical description vocabulary. Never name, identify or characterise a person.
- If a fragment is already English, return it unchanged.

Answer with a strict JSON object mapping each id to its English string, and nothing else:
{"<id>": "<english>", ...}`;

export const anthropicTranslationProvider: TranslationProvider = {
  slug: PROVIDER_SLUG,

  async translate({ model, items }): Promise<TranslationResult> {
    const apiKey = readProviderKey("ANTHROPIC_API_KEY");

    if (!apiKey) {
      throw new ProviderError("not_configured", "ANTHROPIC_API_KEY is not set on the server");
    }

    const client = new Anthropic({
      apiKey,
      timeout: TRANSLATION_TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
    });

    let response: Anthropic.Message;

    try {
      response = await client.messages.create({
        model: model.slug,
        max_tokens: TRANSLATION_MAX_TOKENS,
        system: TRANSLATION_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: JSON.stringify(
              Object.fromEntries(items.map((item) => [item.id, item.text])),
            ),
          },
        ],
      });
    } catch (error) {
      throw toProviderError(error);
    }

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // A simpler read than the extraction's, and deliberately so: a translation
    // that does not arrive costs nothing and is retried on the next save, so
    // there is no paid failure here to diagnose in six months' time.
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
        "the provider did not return a JSON object of translations",
        text.slice(0, 200),
      );
    }

    // Only strings, only for ids that were actually sent. The answer is data from
    // outside, and a key we never asked about has no field to land in anyway.
    const requested = new Set(items.map((item) => item.id));
    const translations: Record<string, string> = {};

    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (requested.has(id) && typeof value === "string" && value.trim() !== "") {
        translations[id] = value.trim();
      }
    }

    return {
      translations,
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
 * Turns an SDK error into one of our four kinds, keeping the provider's own
 * explanation alongside ours.
 *
 * Authentication is reported as a configuration problem because that is what it
 * almost always is — a key that is missing, wrong or revoked — and the interface
 * can then say something useful instead of "error 401".
 */
function toProviderError(error: unknown): ProviderError {
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  ) {
    return new ProviderError(
      "not_configured",
      "the provider rejected the API key",
      detailOf(error),
    );
  }

  if (error instanceof Anthropic.APIError) {
    return new ProviderError(
      "provider",
      `the provider returned ${error.status ?? "an error"}`,
      detailOf(error),
    );
  }

  return new ProviderError(
    "provider",
    "the provider could not be reached",
    error instanceof Error ? error.message : String(error),
  );
}

/**
 * The sentence the API actually wrote. A 400 body looks like
 * `{"type":"error","error":{"type":"invalid_request_error","message":"..."}}`,
 * and that inner message is the whole diagnosis — which field, which rule.
 * Falls back to the serialised body, then to the SDK's own message.
 */
function detailOf(error: InstanceType<typeof Anthropic.APIError>): string {
  const body = error.error;

  if (body && typeof body === "object") {
    const inner = (body as { error?: { message?: unknown } }).error;

    if (inner && typeof inner.message === "string") {
      return inner.message;
    }

    try {
      return JSON.stringify(body);
    } catch {
      // Falls through to the SDK message below.
    }
  }

  return error.message;
}
