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

// ---------------------------------------------------------------------------
// Translation — the second capability of the adapter layer
// ---------------------------------------------------------------------------

/**
 * One sentence to translate, identified so the answer can be matched back to the
 * field it came from without relying on order.
 */
export type TranslationItem = { id: string; text: string };

export type TranslationResult = {
  /** Keyed by the id that was sent. A missing key means "could not translate". */
  translations: Record<string, string>;
  usage: { inputTokens: number; outputTokens: number };
};

/**
 * A provider able to turn the sheet's free text into short English phrases.
 *
 * This exists because of §3.3 of docs/geracao-canonica.md and nothing else: the
 * closed lists translate themselves through the dictionary, so the only
 * Portuguese that ever needs a model is what the user typed by hand. It is a
 * separate interface from ExtractionProvider because it is separate work — cheap,
 * uncharged, and run at save time rather than on demand.
 */
export type TranslationProvider = {
  readonly slug: string;
  translate(request: {
    model: { slug: string };
    items: readonly TranslationItem[];
  }): Promise<TranslationResult>;
};

// ---------------------------------------------------------------------------
// Image generation — the third capability
// ---------------------------------------------------------------------------

/** Raw image bytes, as they travel to and from a provider. */
export type ImagePayload = { mimeType: string; base64: string };

export type ImageGenerationInput = {
  /** The compiled prompt, already in English. Adapters never translate. */
  prompt: string;
  /**
   * Anchor images the result must stay faithful to.
   *
   * Decision G3: the complete sheet is generated from text alone, and every
   * separate view is then generated *with the sheet attached here* — anchor
   * first, everything else references the anchor.
   */
  references?: readonly ImagePayload[];
  /** "3:4" for the portrait sheet, "4:3" for the landscape one. */
  aspectRatio: string;
  /** "1K" | "2K" | "4K" — the vocabulary the providers themselves use. */
  imageSize: string;
};

export type ImageGenerationResult = {
  image: ImagePayload;
  /**
   * What the call consumed, as the provider reported it. Image models bill per
   * image *and* per token, so both halves are recorded and the real cost is
   * worked out in lib/ai/pricing.ts.
   */
  usage: { inputTokens: number; outputTokens: number };
};

/**
 * A provider able to generate one image from a prompt and optional references.
 *
 * One implementation in this phase: Google. OpenAI and xAI are already in the
 * catalogue and greyed out for want of a file next to this one — which is the
 * whole promise of the adapter layer, stated as a missing entry rather than as
 * a comment.
 */
export type ImageGenerationProvider = {
  readonly slug: string;
  generateImage(request: {
    model: { slug: string };
    input: ImageGenerationInput;
  }): Promise<ImageGenerationResult>;
};

// ---------------------------------------------------------------------------
// Video generation — the fourth capability, and the first asynchronous one
// ---------------------------------------------------------------------------

/**
 * What a video generation is asked for.
 *
 * The source image travels **inline**, as bytes, not as a URL. That is a
 * security decision and not a convenience: our Storage bucket is private, and
 * handing a provider a signed URL would publish, however briefly, a file that
 * belongs to a user. The adapter turns these bytes into whatever its provider
 * accepts — for fal, a base64 data URI.
 *
 * There is no aspect ratio here, and its absence is correct: in image-to-video
 * the proportion comes from the source image. Asking for one would be asking the
 * model to crop or letterbox something the user already framed.
 */
export type VideoGenerationInput = {
  /** The compiled prompt, already in English. Adapters never translate. */
  prompt: string;
  /** The still the motion starts from. */
  image: ImagePayload;
  /** Priced by the catalogue, never chosen by the adapter. */
  durationSeconds: number;
};

/**
 * The receipt of an enqueued job — everything needed to find it again.
 *
 * The URLs are carried rather than rebuilt, and that is the hard-won part.
 * Measured on 2026-08-13: fal's `requests/` path uses the **app base id**, not
 * the versioned endpoint, so the obvious URL is the wrong one. A reconciliation
 * that constructs its own address works everywhere except where it matters.
 */
export type VideoSubmission = {
  requestId: string;
  statusUrl: string | null;
  responseUrl: string | null;
  cancelUrl: string | null;
};

/**
 * What the provider says when asked about a job it was given.
 *
 * `unknown` is its own state and not an error: a provider that has forgotten a
 * request id (results expire) is telling us something different from a provider
 * that cannot be reached, and only one of the two justifies giving up on a job.
 */
export type VideoJobState =
  | { state: "pending" }
  | { state: "succeeded"; videoUrl: string }
  | { state: "failed"; detail: string; refused: boolean }
  | { state: "unknown" };

/**
 * A provider able to enqueue a video and be asked about it later.
 *
 * It is deliberately **not** shaped like `ImageGenerationProvider`. That one
 * returns the picture, because an image fits inside a request; this one returns
 * a *protocol number*, because a video does not. The whole of invariant 1 lives
 * in that difference.
 *
 * One implementation: fal. And the split inside it is the point — the queue,
 * the signature, the download and the reconciliation are generic to fal, while
 * the model is a line of configuration. Adding a second fal model must not
 * touch the engine.
 */
export type VideoGenerationProvider = {
  readonly slug: string;
  /** Enqueues and returns immediately. Never waits for the video. */
  submitVideo(request: {
    model: { slug: string };
    input: VideoGenerationInput;
    /** Where the provider should call back. Absolute, public, https. */
    webhookUrl: string;
  }): Promise<VideoSubmission>;
  /** Asks the provider's queue what became of a job — the reconciliation path. */
  checkVideo(request: {
    model: { slug: string };
    requestId: string;
    statusUrl: string | null;
    responseUrl: string | null;
  }): Promise<VideoJobState>;
  /**
   * Reads a delivered webhook body and says what it means.
   *
   * Separate from `checkVideo` because the two arrive by different roads and
   * only one of them can be trusted without asking: a webhook body is signed,
   * a poll answer is fetched. Same vocabulary out, so the code above cannot
   * tell them apart — which is exactly what lets one function serve both.
   */
  readWebhook(body: unknown): VideoJobState;
  /** Downloads the finished file before the provider's URL expires. */
  downloadVideo(videoUrl: string): Promise<VideoPayload>;
};

/** The finished file, on its way to our Storage. */
export type VideoPayload = {
  mimeType: string;
  bytes: Uint8Array;
};

/**
 * Every way a provider call can fail that the interface must speak about. A
 * refusal by content policy is an *expected* error in this product (architecture
 * decision 7), not a bug, so it has its own kind.
 *
 * `account` is the asynchronous era's addition: an aggregator locks the account
 * when its own balance drops below a minimum and starts rejecting calls. That is
 * neither a bad request nor a refusal of *this* content — it is nobody's fault
 * but ours, and the only sentence that helps says so.
 */
export type ProviderErrorKind =
  | "not_configured"
  | "refused"
  | "invalid_answer"
  | "provider"
  | "account";

/**
 * The provider's own sentence about a failure, not our summary of it.
 *
 * Lives here because every engine that calls a provider needs exactly this
 * string, and a second copy of it would be a second chance to throw the response
 * body away — which is the mistake that cost an afternoon of blind diagnosis on
 * 2026-08-08 and is the reason `detail` exists at all.
 *
 * Never contains a credential: it is the response body, never the request.
 */
export function providerErrorDetail(error: unknown): string {
  if (error instanceof ProviderError) {
    return `${error.message}: ${error.detail ?? "no detail"}`;
  }

  return error instanceof Error ? error.message : String(error);
}

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
