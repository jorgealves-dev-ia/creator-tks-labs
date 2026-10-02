"use client";

import {
  discardUpload,
  registerUploadedAsset,
  type GalleryItem,
  type RegisterAssetResult,
} from "@/lib/assets/actions";
import {
  sniffImageType,
  SNIFF_BYTES,
  unsupportedImageFormat,
  type UploadImageType,
} from "@/lib/assets/image-bytes";
import { IMMUTABLE_CACHE_CONTROL } from "@/lib/assets/thumbnail-path";
import { storeThumbnailInBrowser } from "@/lib/assets/thumbnail-client";
import {
  REGISTER_CEILING_MS,
  SESSION_CEILING_MS,
  THUMBNAIL_CEILING_MS,
  transferCeilingMs,
  within,
  type Bounded,
} from "@/lib/assets/upload-ceilings";
import { uploadPath } from "@/lib/assets/upload-path";
import { t } from "@/lib/i18n/pt-BR";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * The one way an image gets from this browser into the gallery — F1a,
 * docs/plano-produto-diz.md.
 *
 * Three gestures use it and none has a path of its own: the «Enviar imagem»
 * button of the picker, pasting on the canvas (Ctrl+V) and dropping a file on
 * the canvas. Same Storage folder, same thumbnail, same registration, same
 * limits — so "10 MB" and "JPEG, PNG or WebP" cannot drift between them.
 *
 * Two steps, and the split is the point: `prepareImages` reads and checks every
 * file of a gesture BEFORE anything is sent, so a gesture that breaks a rule is
 * refused whole, with zero uploads; `uploadPreparedImage` then sends one file
 * that is already known to be good.
 */

/** The bucket allows 50 MB; a reference photo has no business being near that. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Images per gesture — the number a product card holds. Above it the whole
 * gesture is refused, with the number: never truncated in silence.
 */
export const MAX_IMAGES_PER_GESTURE = 5;

export type PreparedImage = {
  file: File;
  /** What the BYTES say — never `file.type`, which comes from the extension. */
  mimeType: UploadImageType;
};

export type GestureRefusal =
  | { reason: "empty" }
  | { reason: "too_many"; count: number }
  | { reason: "unsupported"; name: string; format: string | null }
  | { reason: "too_large"; name: string; bytes: number };

export type PreparedGesture = { ok: true; images: PreparedImage[] } | ({ ok: false } & GestureRefusal);

/**
 * Every file of one gesture, checked by its first bytes and its size.
 *
 * All or nothing: one bad file refuses the gesture, and nothing is sent. The
 * count is checked before a single byte is read — six files are refused for
 * being six, whatever they are.
 */
export async function prepareImages(files: readonly File[]): Promise<PreparedGesture> {
  if (files.length === 0) return { ok: false, reason: "empty" };

  if (files.length > MAX_IMAGES_PER_GESTURE) {
    return { ok: false, reason: "too_many", count: files.length };
  }

  const images: PreparedImage[] = [];

  for (const file of files) {
    const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
    const mimeType = sniffImageType(head);

    if (!mimeType) {
      return { ok: false, reason: "unsupported", name: file.name, format: unsupportedImageFormat(head) };
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return { ok: false, reason: "too_large", name: file.name, bytes: file.size };
    }

    images.push({ file, mimeType });
  }

  return { ok: true, images };
}

export type UploadOutcome =
  | { ok: true; item: GalleryItem }
  | { ok: false; reason: "not_signed_in" | "storage" | "register" | "type_mismatch" | "stalled" };

/**
 * Sends one prepared image: Storage, thumbnail, registration.
 *
 * `label` is decided by the caller, from how the file arrived — see
 * `upload-label.ts`. It is the gallery caption and nothing more.
 *
 * ---------------------------------------------------------------------------
 * A failure leaves nothing behind — and this function never throws (01/10/2026)
 * ---------------------------------------------------------------------------
 *
 * The file goes up BEFORE the registration is asked, so every failure after the
 * first byte has something to clean. Who cleans depends on who knows:
 *
 *   the transfer failed     this side asks the server to discard the path. What
 *                           failed is what the BROWSER saw — a response lost on
 *                           the way back leaves the object written.
 *   the server refused      the server already removed the file and the
 *                           thumbnail, in the call that refused. It is the only
 *                           one that knows no row was written.
 *   the call never answered nobody on this side knows whether the row exists,
 *                           and a row whose file is gone is worse than a file
 *                           with no row. Nothing is deleted on a guess — the
 *                           orphan sweep finds what stays.
 *
 * ---------------------------------------------------------------------------
 * And it always ends (01/10/2026)
 * ---------------------------------------------------------------------------
 *
 * Every step that waits on the network has a ceiling (`upload-ceilings.ts`), and
 * a step that passes it answers `stalled` — which the screen turns into a
 * sentence and a «Tentar de novo». The library gives no way to stop a request,
 * so a step that was given up on is still out there: what it may leave is
 * removed when it finally ends.
 */
export async function uploadPreparedImage(image: PreparedImage, label: string): Promise<UploadOutcome> {
  const supabase = createSupabaseBrowserClient();
  const session = await within(supabase.auth.getUser(), SESSION_CEILING_MS);

  if (session.timedOut) return { ok: false, reason: "stalled" };

  const userId = session.value.data.user?.id;

  if (!userId) return { ok: false, reason: "not_signed_in" };

  const storagePath = uploadPath(userId, crypto.randomUUID(), image.mimeType);

  // Re-wrapped, and this line is what makes the type in Storage true. The
  // client library sends a Blob as multipart, and the part carries the
  // BLOB'S OWN type — the `contentType` option is only read for bodies that are
  // not Blobs (@supabase/storage-js 2.112.2, `uploadOrUpdate`). A `File` has
  // the type the browser guessed from the extension, so without this the
  // object would still be stored as `image/jpeg`.
  const body = new Blob([image.file], { type: image.mimeType });

  const transfer = supabase.storage
    .from("assets")
    .upload(storagePath, body, { contentType: image.mimeType, cacheControl: IMMUTABLE_CACHE_CONTROL });

  const sent = await within(transfer, transferCeilingMs(image.file.size));

  if (sent.timedOut) {
    // No registration will ever be asked for this path. Whatever is there now
    // goes, and whatever the abandoned request writes later goes when it ends.
    void discardQuietly(storagePath);
    void settled(transfer).then(() => discardQuietly(storagePath));

    return { ok: false, reason: "stalled" };
  }

  if (sent.value.error) {
    await discardQuietly(storagePath);

    return { ok: false, reason: "storage" };
  }

  // A miniatura, do arquivo que já está na mão. Best-effort: se falhar — ou não
  // terminar a tempo —, o envio segue e a grade cai para o original.
  const thumbnail = storeThumbnailInBrowser(storagePath, image.file);
  const made = await within(thumbnail, THUMBNAIL_CEILING_MS);
  const source = made.timedOut ? null : made.value;

  const registration = registerUploadedAsset({
    storagePath,
    mimeType: image.mimeType,
    byteSize: image.file.size,
    width: source?.width ?? null,
    height: source?.height ?? null,
    label,
  });

  if (made.timedOut) {
    // The thumbnail that was given up on may still land. If the registration
    // succeeds, it is that asset's thumbnail and it stays — the discard finds
    // the row and does nothing. If it does not, it would be an orphan. Asked
    // only once BOTH have ended: a discard in between would find no row yet and
    // take the original from under the registration.
    void Promise.all([settled(thumbnail), settled(registration)]).then(() => discardQuietly(storagePath));
  }

  let registered: Bounded<RegisterAssetResult>;

  try {
    registered = await within(registration, REGISTER_CEILING_MS);
  } catch {
    return { ok: false, reason: "register" };
  }

  // Gave up waiting — and, as with a call that failed, without knowing whether
  // the row was written. Nothing is deleted on a guess.
  if (registered.timedOut) return { ok: false, reason: "stalled" };

  if (!registered.value.ok) {
    return { ok: false, reason: registered.value.reason === "type_mismatch" ? "type_mismatch" : "register" };
  }

  return { ok: true, item: registered.value.item };
}

/**
 * Asks the server to take a failed upload out of Storage.
 *
 * Quiet on purpose: a cleanup that throws would turn one failure into two, and
 * the transfer that just failed often means the network is what is broken. What
 * it cannot reach stays for the orphan sweep.
 */
async function discardQuietly(storagePath: string): Promise<void> {
  try {
    await discardUpload({ storagePath });
  } catch {
    // Left for the sweep.
  }
}

/** Resolves when `work` ends, however it ends. */
function settled(work: PromiseLike<unknown>): Promise<void> {
  return Promise.resolve(work).then(
    () => undefined,
    () => undefined,
  );
}

/**
 * Whether trying again can help: the network failed, not the file.
 *
 * A file whose bytes contradict its type fails the same way every time, and a
 * session that expired needs a login, not a retry.
 */
export function isRetryable(reason: Extract<UploadOutcome, { ok: false }>["reason"]): boolean {
  return reason === "stalled" || reason === "storage" || reason === "register";
}

// ---------------------------------------------------------------------------
// The sentences — one per refusal, the same for every gesture
// ---------------------------------------------------------------------------

const copy = t.generation.upload;

/** Why a gesture was refused, in words. Null for "nothing to do" (a gesture with no file). */
export function refusalMessage(refusal: GestureRefusal): string | null {
  switch (refusal.reason) {
    case "empty":
      return null;
    case "too_many":
      return copy.tooMany(refusal.count);
    case "unsupported":
      return copy.unsupported(refusal.name, refusal.format);
    case "too_large":
      return copy.tooLarge(refusal.name, (refusal.bytes / (1024 * 1024)).toFixed(1).replace(".", ","));
  }
}

/** Why one upload failed, in words. */
export function failureMessage(reason: Extract<UploadOutcome, { ok: false }>["reason"]): string {
  switch (reason) {
    case "not_signed_in":
      return copy.notSignedIn;
    case "type_mismatch":
      return copy.typeMismatch;
    case "storage":
    case "register":
      return copy.failed;
    case "stalled":
      return copy.stalled;
  }
}
