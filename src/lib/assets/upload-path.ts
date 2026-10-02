import { extensionFor, type UploadImageType } from "./image-bytes";

/**
 * Where an image someone sends lives in Storage — the rule that writes the path
 * and the rule that recognises it, side by side.
 *
 *   <owner>/references/<uuid>.<jpg|png|webp>
 *
 * The first folder segment is the owner: the convention the bucket policies of
 * 20260807140500 rely on. The file's own name never enters the path — a uuid,
 * and the extension the BYTES chose —, so a WebP called `blusa.jpg` lands as
 * `<uuid>.webp` and two files with the same name never collide.
 *
 * ---------------------------------------------------------------------------
 * Why the recogniser exists
 * ---------------------------------------------------------------------------
 *
 * Since 01/10/2026 an upload whose registration fails is deleted from Storage
 * (`discard-upload.ts`). A function that deletes needs a narrower door than one
 * that writes: it takes a path the browser NAMED, and it must only ever remove
 * what has the exact shape of an upload in progress — never a generated image,
 * a canonical sheet, a frame, or the thumbnail of something that is registered.
 * "Pode nomear, nunca alargar", applied to deletion.
 *
 * Pure on purpose, and not `server-only`: the browser builds the path and the
 * server checks it. One rule in two places is a rule that will drift.
 */

const UPLOAD_FOLDER = "references";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UPLOAD_FILE = new RegExp(`^${UUID}\\.(jpg|png|webp)$`);

/** The path of a new upload. `id` is a fresh uuid — passed in so the function stays pure. */
export function uploadPath(ownerId: string, id: string, type: UploadImageType): string {
  return `${ownerId}/${UPLOAD_FOLDER}/${id}.${extensionFor(type)}`;
}

/**
 * Whether `path` is exactly what `uploadPath` writes for this owner.
 *
 * Everything else answers false: another owner's folder, another folder of the
 * same owner, a nested path, a thumbnail (`….webp.thumb.webp`), a name that is
 * not a uuid.
 */
export function isUploadPath(ownerId: string, path: string): boolean {
  const prefix = `${ownerId}/${UPLOAD_FOLDER}/`;

  if (ownerId === "" || !path.startsWith(prefix)) return false;

  return UPLOAD_FILE.test(path.slice(prefix.length));
}
