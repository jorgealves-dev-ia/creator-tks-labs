import type { ReferenceKind, ReferenceOrigin } from "@/lib/generation/references";

/**
 * What a generating block asks for, what it gets back, and how it asks.
 *
 * ---------------------------------------------------------------------------
 * Why this is a route and not a Server Action
 * ---------------------------------------------------------------------------
 *
 * It was a Server Action until the quantity stepper arrived, and it worked. What
 * it could not do is happen four times at once.
 *
 * Next's own documentation is explicit about it: do not rely on Promise.all to
 * parallelise Server Actions from the client. They are dispatched through
 * React's rendering lifecycle, which serialises them — four calls to a
 * thirty-second generation would take two minutes, one after the other, while
 * each of them sat waiting for a turn. That is a property of the client
 * dispatcher, not of the work, and the fix is to stop using that dispatcher: a
 * Route Handler is an ordinary HTTP endpoint, and four fetches are four
 * requests.
 *
 * Nothing about the security posture changes. A Server Action is a public
 * endpoint too — the session is re-checked, the body is parsed by the same Zod
 * schema, and RLS scopes every read exactly as before. What changes is only that
 * the browser can now ask four times without waiting in line, which is what
 * "quantidade 3" has to mean if it is going to mean anything.
 */

/** One image attached to the block, as the browser knows it. */
export type CanvasReferencePayload = {
  assetId: string;
  kind: ReferenceKind | null;
  instrucao: string;
  origem: ReferenceOrigin;
  /**
   * Set when this image is one of several that arrived together and must be
   * treated as one thing — same id on every member of the group.
   *
   * Called `productId` until 10/08/2026, because a product's photos were the
   * only group that existed. They are about to stop being: an input node holding
   * five photos is the same mechanism, and a mechanism named after its first
   * user is a mechanism that gets copied instead of reused.
   */
  groupId?: string | null;
  /**
   * What the group is called, for the audit trail only.
   *
   * The browser may **name** a group; it may never **widen** one. The name is
   * cosmetic — it appears in the stored record and never in the text the model
   * reads — while the two things that have to be trustworthy are checked here:
   * how many slots the group occupies, against the model's ceiling, and whether
   * the images belong to this user at all, which RLS answers when they are
   * loaded from Storage.
   *
   * It travels because there is nothing left to ask. A group used to be a row in
   * `entities` whose name the server looked up; it is a card on the canvas now,
   * and a card has no row.
   */
  groupLabel?: string;
  /** Which specialised input handed it over: "pose", "folha", or nothing. */
  papel?: string | null;
};

/**
 * One generation's worth of request — one image.
 *
 * There is deliberately no `quantity` here. Four images are four requests, each
 * with its own charge, its own row and its own way of failing; a count in the
 * body would make the server responsible for a partial failure it has no way to
 * report as one answer.
 */
export type CanvasGenerationRequest = {
  projectId: string;
  nodeId: string;
  prompt: string;
  modelId: string;
  presetId: string;
  imageSize: string;
  estiloKey: string | null;
  anguloKey: string | null;
  iluminacaoKey: string | null;
  expressaoKey: string | null;
  references: CanvasReferencePayload[];
  /**
   * Whether the attached images enter this generation.
   *
   * They travel in the body either way — they have to, because the record of
   * this generation must be able to say that four images were attached and none
   * of them was used. What the server does when this is false is refuse to
   * compile them, which is a different thing from never having heard of them.
   */
  referencesEnabled: boolean;
};

export type CanvasGenerationFailure =
  | "invalid"
  | "unauthenticated"
  | "not_configured"
  | "insufficient_balance"
  | "empty_request"
  | "empty_character"
  | "unknown_handle"
  | "no_version"
  | "unknown_version"
  | "multiple_characters"
  | "unsupported_size"
  | "too_many_references"
  | "missing_reference"
  | "translation_failed"
  | "refused"
  | "error";

export type CanvasGenerationResult =
  | {
      ok: true;
      generationId: string;
      assetId: string;
      url: string;
      sparksCharged: number;
      balanceSparks: number;
      /** What the API was actually asked for — shown next to the preset label. */
      aspectRatio: string;
      /** True when the model had no exact match for the channel's proportion. */
      approximated: boolean;
      character: {
        handle: string;
        versionNumber: number;
        /** False when that version was saved before it had a complete sheet. */
        hasSheetImage: boolean;
      } | null;
    }
  | {
      ok: false;
      reason: CanvasGenerationFailure;
      /** The handle that could not be resolved, so the message can name it. */
      handle?: string;
      versionNumber?: number;
      neededSparks?: number;
      balanceSparks?: number;
      limit?: number;
    };

export const CANVAS_GENERATE_ENDPOINT = "/api/generations/canvas";

/**
 * One image, asked for over HTTP.
 *
 * Never throws: a network that dropped and a provider that refused are the same
 * kind of event to the block that called this — something to say in a sentence
 * next to the slot that failed, not an exception to unwind through four
 * concurrent callers.
 */
export async function requestGeneration(
  request: CanvasGenerationRequest,
): Promise<CanvasGenerationResult> {
  try {
    const response = await fetch(CANVAS_GENERATE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });

    // 401 is the proxy answering for an expired session — a real case in a tab
    // left open, and one with a specific fix that only a specific word can give.
    if (!response.ok) {
      return { ok: false, reason: response.status === 401 ? "unauthenticated" : "error" };
    }

    return (await response.json()) as CanvasGenerationResult;
  } catch {
    return { ok: false, reason: "error" };
  }
}
