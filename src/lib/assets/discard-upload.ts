import "server-only";

import type { createSupabaseServerClient } from "@/lib/supabase/server";

import { forgetSignedUrls } from "./signing";
import { thumbnailPath } from "./thumbnail-path";
import { isUploadPath } from "./upload-path";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type DiscardOutcome =
  | { discarded: true; removed: number }
  | { discarded: false; reason: "not_an_upload" | "registered" | "unknown" | "storage" };

/**
 * Takes out of Storage an upload that never became an asset — the file and its
 * thumbnail, in one gesture.
 *
 * ---------------------------------------------------------------------------
 * The debt this pays (27/09/2026 → 01/10/2026)
 * ---------------------------------------------------------------------------
 *
 * The browser sends the file and the thumbnail BEFORE it asks for the
 * registration. Until now nothing removed them when the registration was
 * refused — a type that the bytes contradicted, a head that could not be read,
 * a database error —, and the two objects stayed in the bucket with no row in
 * `assets`: invisible, unreachable from any screen, and paid for. The orphan of
 * 27/09 was born exactly so. The owner's decision that night: the cleanup is
 * part of the failure, and it does not wait for a delete button.
 *
 * ---------------------------------------------------------------------------
 * It only deletes what it KNOWS is not registered
 * ---------------------------------------------------------------------------
 *
 * Three checks, in this order, and each one is a reason to do nothing:
 *
 *   the shape   only `<owner>/references/<uuid>.<ext>` — what the upload writes.
 *               A generated image, a frame, a canonical sheet or a thumbnail
 *               named here is left alone, whoever asks.
 *   the row     a path with a row in `assets` is an asset, not a leftover. And
 *               "could not ask" is not "no row": on a doubt, nothing is deleted.
 *   the owner   the removal runs with the CALLER'S session, so the bucket policy
 *               (`assets_objects_delete_own`) is the last word on whose file it is.
 *
 * The opposite failure — a row whose file is gone — is the one that shows on
 * screen as a broken picture, so every doubt resolves towards keeping the file.
 * What that leaves behind (a tab closed between the upload and the registration,
 * a call that never answered) is the orphan sweep's job: `npm run sweep:orphans`.
 */
export async function discardUnregisteredUpload(
  supabase: SupabaseServerClient,
  ownerId: string,
  storagePath: string,
): Promise<DiscardOutcome> {
  if (!isUploadPath(ownerId, storagePath)) {
    return { discarded: false, reason: "not_an_upload" };
  }

  const { data: row, error: lookupError } = await supabase
    .from("assets")
    .select("id")
    .eq("storage_bucket", "assets")
    .eq("storage_path", storagePath)
    .limit(1)
    .maybeSingle();

  if (lookupError) return { discarded: false, reason: "unknown" };
  if (row) return { discarded: false, reason: "registered" };

  const paths = [storagePath, thumbnailPath(storagePath)];
  const { data: removed, error: removeError } = await supabase.storage.from("assets").remove(paths);

  // Whatever happened to the files, a link to them must not outlive this call.
  forgetSignedUrls(paths);

  if (removeError) return { discarded: false, reason: "storage" };

  return { discarded: true, removed: removed?.length ?? 0 };
}
