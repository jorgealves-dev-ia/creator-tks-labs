import "server-only";

import sharp from "sharp";

import { sniffImageType, type UploadImageType } from "@/lib/assets/image-bytes";

/**
 * The photo as a reading provider can take it — Frente 1, F1.
 *
 * ---------------------------------------------------------------------------
 * The type comes from the BYTES, never from the row
 * ---------------------------------------------------------------------------
 *
 * Found by the F0 itself: the blouse of the Frente A′ is WebP recorded as
 * `image/jpeg`, and Anthropic checks — "the image was specified using the
 * image/jpeg media type, but the image appears to be a image/webp image", a 400
 * before any text. Marketplace photos arrive like that all the time. The envio
 * reads the bytes since the F1a; this does too, for every photo sent before it.
 *
 * ---------------------------------------------------------------------------
 * Untouched, unless a provider would refuse it
 * ---------------------------------------------------------------------------
 *
 * A photo within the limits travels exactly as it is stored — the same bytes the
 * F0 measured with. Only one beyond them is reduced, because the alternative is
 * a reading that fails after the click for a reason the person cannot see.
 *
 * The limits are the tightest of the providers in the product list, read in
 * Anthropic's vision documentation on 02/10/2026 (the plan said "5 MB, to be
 * checked on the day"; the day's answer is different):
 *
 *   10 MB per image, BASE64-ENCODED   → 7 MB of file leaves room: base64 grows
 *                                       a file by a third, and 7 MB becomes 9,3
 *   8000 × 8000 px                    → above it the API refuses the image
 *
 * The envio accepts files up to 10 MB, so the first limit is reachable: a photo
 * between 7 and 10 MB is a photo a phone takes.
 */

/** Above this, base64 would pass Anthropic's 10 MB per image. */
export const READING_MAX_PHOTO_BYTES = 7 * 1024 * 1024;

/** Anthropic's maximum for either side of an image. */
export const READING_MAX_PHOTO_SIDE = 8000;

/**
 * What an oversized photo is reduced to: the long edge the high-resolution
 * models read natively. Beyond it the provider would downscale the image
 * itself, so nothing a model could see is lost here.
 */
const REDUCED_LONG_EDGE = 2576;

/** High enough that texture and print survive; the file ends in the hundreds of kB. */
const REDUCED_QUALITY = 90;

export type ReadingPhoto = {
  /** What the bytes say. */
  mimeType: UploadImageType;
  base64: string;
  /** True when the photo was too large to send as stored, and was reduced. */
  reduced: boolean;
};

/**
 * The photo, ready to send — or null when it cannot be read at all.
 *
 * Null means: not JPEG, PNG or WebP by its bytes, or too large AND impossible to
 * reduce. The caller refuses before any provider is called, and nothing is
 * charged.
 */
export async function photoForReading(bytes: Buffer): Promise<ReadingPhoto | null> {
  const mimeType = sniffImageType(bytes);

  if (!mimeType) return null;

  const asStored: ReadingPhoto = { mimeType, base64: bytes.toString("base64"), reduced: false };

  let side: number | null = null;

  try {
    const meta = await sharp(bytes, { failOn: "none" }).metadata();

    side = Math.max(meta.width ?? 0, meta.height ?? 0);
  } catch {
    // The header would not parse here. That is not a verdict on the file: a
    // provider may still read it, and a photo within the size limit goes as it
    // is. Only a photo that ALSO needs reducing has nowhere to go.
    side = null;
  }

  const tooHeavy = bytes.byteLength > READING_MAX_PHOTO_BYTES;
  const tooLong = side !== null && side > READING_MAX_PHOTO_SIDE;

  if (!tooHeavy && !tooLong) return asStored;

  try {
    // `autoOrient` because a phone photo carries its rotation in EXIF, and the
    // re-encoded file would lose the tag: without this, a portrait would be
    // sent lying on its side.
    const reduced = await sharp(bytes, { autoOrient: true, failOn: "none" })
      .resize({
        width: REDUCED_LONG_EDGE,
        height: REDUCED_LONG_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      // WebP keeps transparency — a product cut out on no background stays
      // cut out — and both providers take it.
      .webp({ quality: REDUCED_QUALITY })
      .toBuffer();

    if (reduced.byteLength > READING_MAX_PHOTO_BYTES) return null;

    return { mimeType: "image/webp", base64: reduced.toString("base64"), reduced: true };
  } catch {
    return null;
  }
}
