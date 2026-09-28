/**
 * What an image file IS, read from its first bytes — never from its name, and
 * never from the type the browser reports.
 *
 * ---------------------------------------------------------------------------
 * Why the bytes, and not `file.type`
 * ---------------------------------------------------------------------------
 *
 * The browser's `file.type` comes from the file's EXTENSION. A marketplace photo
 * saved as `blusa.jpg` that is really WebP arrives as `image/jpeg`, and until
 * 27/09/2026 that claim went straight into Storage, into the path and into
 * `assets.mime_type`. Measured on 26/09: 6 of the 14 "JPEG" uploads were WebP,
 * and one of them — the blouse of the Frente A′ — was refused by Anthropic with
 * a 400 ("the image appears to be a image/webp image"). Google tolerated it;
 * the next provider may not.
 *
 * So the house reads the bytes, in three places, with this one module:
 *
 *   the browser   before sending — the type goes to Storage, the path and the row
 *   the server    before registering — it reads the head of the stored object
 *   the loader    before a provider — what it declares is what the bytes say
 *
 * Pure on purpose: no DOM, no Node, no network. It takes bytes and answers, so
 * the same function runs in the browser, on the server and in a harness.
 */

/**
 * The three formats a reference can be: the intersection of what the house's
 * two image providers accept. Anything else is refused before it is sent — with
 * a sentence naming what it is, when the bytes say.
 */
export const UPLOAD_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type UploadImageType = (typeof UPLOAD_IMAGE_TYPES)[number];

/** Enough for every signature below: the WebP marker ends at byte 12, the ISO-BMFF brand at 12. */
export const SNIFF_BYTES = 16;

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

/** The accepted type the bytes carry, or null when they carry none of the three. */
export function sniffImageType(bytes: Uint8Array): UploadImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 4) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return "image/webp";
  }

  return null;
}

/**
 * The name of a format the house does NOT take, when the bytes make it
 * recognisable — so the refusal can say "é GIF" instead of "não serve".
 *
 * Null when the bytes are nothing we know: then the sentence only says which
 * three formats go in.
 */
export function unsupportedImageFormat(bytes: Uint8Array): string | null {
  if (bytes.length >= 4 && ascii(bytes, 0, 4) === "GIF8") return "GIF";
  if (bytes.length >= 2 && ascii(bytes, 0, 2) === "BM") return "BMP";

  if (bytes.length >= 4) {
    const head = ascii(bytes, 0, 4);

    if (head === "II*\u0000" || head === "MM\u0000*") return "TIFF";
  }

  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);

    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return "HEIC";
    if (["avif", "avis"].includes(brand)) return "AVIF";
  }

  return null;
}

/**
 * The extension a path gets — from the TYPE, never from the name the file had.
 * `blusa.jpg` that is WebP lands as `<uuid>.webp`.
 */
export function extensionFor(type: UploadImageType): "jpg" | "png" | "webp" {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

/**
 * The server's verdict on a file already in Storage: does what the browser
 * declared match what the bytes say?
 *
 * `head` null means the head could not be read at all — that is not a
 * mismatch, it is a failure to check, and the caller refuses it as an error
 * rather than letting an unchecked type in. "Pode nomear, nunca alargar": the
 * browser may name the type; only the bytes may make it true.
 */
export function storedTypeVerdict(
  declared: UploadImageType,
  head: Uint8Array | null,
): { ok: true } | { ok: false; reason: "unreadable" | "type_mismatch"; actual: UploadImageType | null } {
  if (head === null) return { ok: false, reason: "unreadable", actual: null };

  const actual = sniffImageType(head);

  return actual === declared ? { ok: true } : { ok: false, reason: "type_mismatch", actual };
}
