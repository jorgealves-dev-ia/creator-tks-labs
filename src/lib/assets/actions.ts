"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Short-lived links for stored images, by asset id.
 *
 * The bucket is private, so a file has no public address at all — which is the
 * point. A signed URL expires, and that is exactly why a node stores the asset id
 * and asks for a fresh link when it mounts: a saved canvas graph must never carry
 * a URL that will be dead tomorrow (architecture decision 3).
 *
 * RLS does the access control. An id belonging to somebody else simply produces
 * no row, so it can never produce a link.
 */

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** A canvas can hold a lot of results; one request should not sign a library. */
const MAX_IDS = 60;

/** One screenful of gallery, with room to scroll before asking for more. */
const GALLERY_PAGE_SIZE = 24;

const schema = z.array(z.uuid()).max(MAX_IDS);

export type SignedAssetUrls = Record<string, string>;

export async function signAssetUrls(input: unknown): Promise<SignedAssetUrls> {
  const parsed = schema.safeParse(input);

  if (!parsed.success || parsed.data.length === 0) {
    return {};
  }

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  const { data: assets } = await supabase
    .from("assets")
    .select("id, storage_path")
    .in("id", parsed.data);

  if (!assets || assets.length === 0) {
    return {};
  }

  const { data: signed } = await supabase.storage
    .from("assets")
    .createSignedUrls(
      assets.map((asset) => asset.storage_path),
      SIGNED_URL_TTL_SECONDS,
    );

  const urlByPath = new Map((signed ?? []).map((entry) => [entry.path, entry.signedUrl]));

  return Object.fromEntries(
    assets
      .map((asset) => [asset.id, urlByPath.get(asset.storage_path)] as const)
      .filter((entry): entry is readonly [string, string] => typeof entry[1] === "string"),
  );
}

// ---------------------------------------------------------------------------
// The gallery — "Minhas imagens" (§4)
// ---------------------------------------------------------------------------

/**
 * Everything the user has, generated or uploaded, newest first.
 *
 * An image used once stays available forever: upload a product once, use it in
 * a hundred generations. That sentence is the whole feature, and it only needs
 * a list — the assets table has been accumulating exactly this since Phase 0,
 * with nothing yet able to look at it.
 */
const gallerySchema = z.object({
  filter: z.enum(["todas", "geradas", "enviadas"]),
  query: z.string().max(80),
  /** created_at of the last item already shown — the cursor for "load more". */
  before: z.string().optional(),
});

export type GalleryItem = {
  assetId: string;
  url: string;
  label: string | null;
  source: "upload" | "generation";
  createdAt: string;
};

export type GalleryPage = { items: GalleryItem[]; hasMore: boolean };

/**
 * Strips what PostgREST's filter grammar would read as syntax, and what `ilike`
 * would read as a wildcard.
 *
 * Not a security boundary — the client library parameterises values — but a
 * correctness one: a search for "50% off" with the percent left in matches
 * everything, which looks like a bug in the search and is really a bug here.
 */
function sanitizeQuery(raw: string): string {
  return raw.replace(/[,()*\\%_."']/g, " ").trim();
}

export async function listGalleryAssets(input: unknown): Promise<GalleryPage> {
  const parsed = gallerySchema.safeParse(input);

  if (!parsed.success) {
    return { items: [], hasMore: false };
  }

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  // RLS already restricts this to the caller; ordering and paging are all this
  // has to add. One extra row is fetched to answer "is there more" without a
  // second count query.
  let query = supabase
    .from("assets")
    .select("id, storage_path, label, source, created_at")
    .eq("kind", "image")
    .order("created_at", { ascending: false })
    .limit(GALLERY_PAGE_SIZE + 1);

  if (parsed.data.filter !== "todas") {
    query = query.eq("source", parsed.data.filter === "geradas" ? "generation" : "upload");
  }

  if (parsed.data.before) {
    query = query.lt("created_at", parsed.data.before);
  }

  const term = sanitizeQuery(parsed.data.query);

  if (term !== "") {
    // The path is searched alongside the label so that assets from before
    // labels existed are still findable by what they are: a canonical image
    // carries its slot in the path, which is the only name it ever had.
    query = query.or(`label.ilike.%${term}%,storage_path.ilike.%${term}%`);
  }

  const { data: rows } = await query;

  if (!rows || rows.length === 0) {
    return { items: [], hasMore: false };
  }

  const hasMore = rows.length > GALLERY_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, GALLERY_PAGE_SIZE) : rows;

  const { data: signed } = await supabase.storage
    .from("assets")
    .createSignedUrls(
      page.map((row) => row.storage_path),
      SIGNED_URL_TTL_SECONDS,
    );

  const urlByPath = new Map((signed ?? []).map((entry) => [entry.path, entry.signedUrl]));

  return {
    items: page
      .map((row) => ({
        assetId: row.id,
        url: urlByPath.get(row.storage_path) ?? null,
        label: row.label,
        source: row.source,
        createdAt: row.created_at,
      }))
      .filter((item): item is GalleryItem => item.url !== null),
    hasMore,
  };
}

// ---------------------------------------------------------------------------
// Uploading a reference
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  storagePath: z.string().min(1),
  mimeType: z.string().regex(/^image\//),
  byteSize: z.int().positive().nullable(),
  width: z.int().positive().nullable(),
  height: z.int().positive().nullable(),
  label: z.string().max(200),
});

export type RegisterAssetResult =
  | { ok: true; item: GalleryItem }
  | { ok: false; reason: "invalid" | "error" };

/**
 * Registers a file the browser has just uploaded to Storage.
 *
 * The file goes from the browser straight to the bucket — sending it through
 * this server would double the traffic for no gain, and the bucket policies
 * already pin every user to their own folder. What happens here is the
 * bookkeeping: the assets row and the link to show it.
 *
 * The path is checked against the caller's own folder here as well as by the
 * Storage policy. The same rule stated twice is cheap, and a path is the one
 * thing a browser fully controls.
 */
export async function registerUploadedAsset(input: unknown): Promise<RegisterAssetResult> {
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  if (!parsed.data.storagePath.startsWith(`${userId}/`)) {
    return { ok: false, reason: "invalid" };
  }

  const { data: asset } = await supabase
    .from("assets")
    .insert({
      user_id: userId,
      kind: "image",
      source: "upload",
      storage_path: parsed.data.storagePath,
      mime_type: parsed.data.mimeType,
      byte_size: parsed.data.byteSize,
      width: parsed.data.width,
      height: parsed.data.height,
      label: parsed.data.label.trim() || null,
    })
    .select("id, label, source, created_at")
    .single();

  if (!asset) {
    return { ok: false, reason: "error" };
  }

  const { data: signed } = await supabase.storage
    .from("assets")
    .createSignedUrl(parsed.data.storagePath, SIGNED_URL_TTL_SECONDS);

  if (!signed) {
    return { ok: false, reason: "error" };
  }

  return {
    ok: true,
    item: {
      assetId: asset.id,
      url: signed.signedUrl,
      label: asset.label,
      source: asset.source,
      createdAt: asset.created_at,
    },
  };
}
