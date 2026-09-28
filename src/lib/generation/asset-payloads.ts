import "server-only";

import { sniffImageType } from "@/lib/assets/image-bytes";
import type { ImagePayload } from "@/lib/providers/types";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Stored images, as bytes a provider can read.
 *
 * Always loaded from Storage by id, never accepted from the browser: a reference
 * has to be the file the sheet or the node actually points at, and bytes that
 * arrived over the wire are only a claim about one. RLS on `assets` is what makes
 * the id safe to trust — a caller naming somebody else's asset simply finds
 * nothing.
 */

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function loadImagePayload(
  supabase: SupabaseServerClient,
  assetId: string,
): Promise<ImagePayload | null> {
  const { data: asset } = await supabase
    .from("assets")
    .select("storage_path, mime_type")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) return null;

  const { data: file } = await supabase.storage.from("assets").download(asset.storage_path);

  if (!file) return null;

  const bytes = Buffer.from(await file.arrayBuffer());

  return {
    // What the BYTES say, and the row only when they say nothing we know (F1a,
    // 27/09/2026). The row can be wrong: on 26/09, 6 uploads were WebP recorded
    // as `image/jpeg` — the blouse of the Frente A′ among them. Google tolerated
    // the wrong claim; Anthropic refused it with a 400. Reading the bytes here
    // sends every provider the truth, for those 6 and for any other, without
    // touching a row.
    mimeType: sniffImageType(bytes) ?? asset.mime_type,
    base64: bytes.toString("base64"),
  };
}

/**
 * Several of them, in the order given — which is the order they will be numbered
 * in the prompt, so it may not be reordered here.
 *
 * All or nothing: one missing file returns null rather than a shorter list,
 * because a shorter list would silently renumber every directive after the gap
 * and "the product in reference image 2" would point at the wrong picture.
 */
export async function loadImagePayloads(
  supabase: SupabaseServerClient,
  assetIds: readonly string[],
): Promise<ImagePayload[] | null> {
  const payloads: ImagePayload[] = [];

  for (const assetId of assetIds) {
    const payload = await loadImagePayload(supabase, assetId);

    if (!payload) return null;

    payloads.push(payload);
  }

  return payloads;
}
