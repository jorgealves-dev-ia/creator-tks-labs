"use client";

import { registerUploadedAsset, type GalleryItem } from "@/lib/assets/actions";
import {
  extensionFor,
  sniffImageType,
  SNIFF_BYTES,
  unsupportedImageFormat,
  type UploadImageType,
} from "@/lib/assets/image-bytes";
import { IMMUTABLE_CACHE_CONTROL } from "@/lib/assets/thumbnail-path";
import { storeThumbnailInBrowser } from "@/lib/assets/thumbnail-client";
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
  | { ok: false; reason: "not_signed_in" | "storage" | "register" | "type_mismatch" };

/**
 * Sends one prepared image: Storage, thumbnail, registration.
 *
 * `label` is decided by the caller, from how the file arrived — see
 * `upload-label.ts`. It is the gallery caption and nothing more.
 */
export async function uploadPreparedImage(image: PreparedImage, label: string): Promise<UploadOutcome> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) return { ok: false, reason: "not_signed_in" };

  // The first folder segment is the owner — the convention the bucket policies
  // of 20260807140500 rely on. The file's own name never enters the path: a
  // uuid, and the extension the BYTES chose. A WebP called `blusa.jpg` lands as
  // `<uuid>.webp`, and two files with the same name never collide.
  const storagePath = `${userId}/references/${crypto.randomUUID()}.${extensionFor(image.mimeType)}`;

  // Re-wrapped, and this line is what makes the type in Storage true. The
  // client library sends a Blob as multipart, and the part carries the
  // BLOB'S OWN type — the `contentType` option is only read for bodies that are
  // not Blobs (@supabase/storage-js 2.112.2, `uploadOrUpdate`). A `File` has
  // the type the browser guessed from the extension, so without this the
  // object would still be stored as `image/jpeg`.
  const body = new Blob([image.file], { type: image.mimeType });

  const { error } = await supabase.storage
    .from("assets")
    .upload(storagePath, body, { contentType: image.mimeType, cacheControl: IMMUTABLE_CACHE_CONTROL });

  if (error) return { ok: false, reason: "storage" };

  // A miniatura, do arquivo que já está na mão. Best-effort: se falhar, o
  // envio segue e a grade cai para o original.
  const source = await storeThumbnailInBrowser(storagePath, image.file);

  const result = await registerUploadedAsset({
    storagePath,
    mimeType: image.mimeType,
    byteSize: image.file.size,
    width: source?.width ?? null,
    height: source?.height ?? null,
    label,
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason === "type_mismatch" ? "type_mismatch" : "register" };
  }

  return { ok: true, item: result.item };
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
  }
}
