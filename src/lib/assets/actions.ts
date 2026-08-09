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
