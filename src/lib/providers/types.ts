/**
 * The adapter layer for AI providers (architecture decision 2, and decision E1
 * of docs/motor-extracao.md §3.4).
 *
 * No product code calls a model API directly. It calls this interface, and the
 * selected model decides which adapter answers. A new provider is therefore a new
 * file next to this one plus a catalogue row — never a change spread across the
 * application.
 *
 * `ExtractionProvider` is the first capability of that layer. Image and video
 * generation will add their own interfaces here, served by the same catalogue.
 */

/** What the engine was given to read: one photo, or text pasted from elsewhere. */
export type ExtractionInput =
  | { kind: "photo"; mimeType: string; base64: string }
  | { kind: "text"; text: string };

/**
 * One field as the model answered it, before any validation. `valor` is a raw
 * string here on purpose: the server checks it against the closed lists, and
 * anything the dictionary does not recognise becomes an empty field. The model
 * never gets to invent vocabulary.
 */
export type RawFieldAnswer = {
  valor: string | number | null;
  confianca: "alta" | "baixa";
  motivo?: string;
};

/**
 * The adapter's return value: the model's answer as a plain object keyed by our
 * field paths, plus what the call actually consumed.
 *
 * Token counts come from the provider's own usage report — never estimated — so
 * `real_cost_cents` can be computed from something true.
 */
export type ExtractionResult = {
  fields: Record<string, unknown>;
  usage: { inputTokens: number; outputTokens: number };
};

/** What the adapter needs to know about the model it is asked to drive. */
export type ExtractionModel = {
  /** The provider's official model identifier, from the catalogue. */
  slug: string;
};

/**
 * A provider able to read a photo or a block of text and answer the extraction
 * contract. One implementation today: AnthropicExtractionProvider.
 */
export type ExtractionProvider = {
  readonly slug: string;
  extract(request: {
    model: ExtractionModel;
    input: ExtractionInput;
    /**
     * The whole contract: the instructions, the exact closed lists, and the
     * shape the answer must have — all built from the dictionary.
     *
     * It is the prompt and not a machine-readable schema because the contract
     * is too large for Anthropic's structured outputs; the note at the top of
     * lib/extraction/prompt.ts records what was measured. An adapter for another
     * provider is free to translate it into whatever that provider supports —
     * the validation that actually enforces the vocabulary lives above this
     * layer either way.
     */
    systemPrompt: string;
  }): Promise<ExtractionResult>;
};

/**
 * Every way a provider call can fail that the interface must speak about. A
 * refusal by content policy is an *expected* error in this product (architecture
 * decision 7), not a bug, so it has its own kind.
 */
export type ProviderErrorKind = "not_configured" | "refused" | "invalid_answer" | "provider";

export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
    /**
     * The provider's own words about what went wrong, verbatim.
     *
     * This exists because of a real failure: the first version of the adapter
     * turned every API error into "the provider returned 400" and threw the body
     * away — and the body was the only thing that said *why*. A message we wrote
     * ourselves can only ever repeat what we already assumed.
     *
     * Never contains a credential: it is the response body, not the request.
     */
    readonly detail?: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
