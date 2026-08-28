"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  TODOS_SLOTS_CANONICOS,
  type ImagemCanonicaSlot,
} from "@/lib/character-sheet/dictionary";
import { signWithThumbnails } from "@/lib/assets/signing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The canonical images of a character: the real anchor of the identity.
 *
 * The file itself is uploaded straight from the browser to Storage — sending it
 * through this server would double the traffic for no gain, and the bucket
 * policies already restrict every user to their own folder. What happens here is
 * the bookkeeping the database needs: the assets row, the entity_images link and
 * the signed URL to show it.
 *
 * The id written into the sheet is the asset_id, per §2 of character-sheet.md.
 */

/** Postgres restrict_violation — here, the trigger protecting a frozen version. */
const RESTRICT_VIOLATION = "23001";


const SLOT_KEYS: readonly ImagemCanonicaSlot[] = TODOS_SLOTS_CANONICOS.map((slot) => slot.key);

/**
 * Zod proves the field is a string; this proves it is one of the six slots and
 * narrows the type at the same time, without restating the list where it could
 * drift from the dictionary.
 */
function toSlot(value: string): ImagemCanonicaSlot | undefined {
  return SLOT_KEYS.find((key) => key === value);
}

export type CanonicalImage = { assetId: string; url: string };

export type AttachImageResult =
  | { ok: true; image: CanonicalImage }
  | { ok: false; reason: "invalid" | "error" };

export type RemoveImageResult =
  /** `kept` means a frozen version cites the file, so it stays in Storage. */
  | { ok: true; kept: boolean }
  | { ok: false; reason: "invalid" | "error" };

async function requireSession() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  return { supabase, userId };
}

const attachSchema = z.object({
  entityId: z.uuid(),
  slot: z.string().min(1),
  storagePath: z.string().min(1),
  mimeType: z.string().regex(/^image\//),
  byteSize: z.int().positive().nullable(),
  width: z.int().positive().nullable(),
  height: z.int().positive().nullable(),
});

/**
 * Registers a file the browser has just uploaded. The path is checked against
 * the caller's own folder here as well as by the Storage policy: the same rule
 * stated twice is cheap, and a path is the one thing a browser fully controls.
 */
export async function attachCanonicalImage(input: unknown): Promise<AttachImageResult> {
  const parsed = attachSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const slot = toSlot(parsed.data.slot);

  if (!slot) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase, userId } = await requireSession();

  if (!parsed.data.storagePath.startsWith(`${userId}/`)) {
    return { ok: false, reason: "invalid" };
  }

  const { data: asset, error: assetError } = await supabase
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
    })
    .select("id")
    .single();

  if (assetError || !asset) {
    return { ok: false, reason: "error" };
  }

  const { error: linkError } = await supabase.from("entity_images").insert({
    entity_id: parsed.data.entityId,
    asset_id: asset.id,
    user_id: userId,
    role: slot,
    sort_order: SLOT_KEYS.indexOf(slot),
  });

  if (linkError) {
    return { ok: false, reason: "error" };
  }

  const signed = await signWithThumbnails(supabase, [parsed.data.storagePath]);
  const pair = signed.get(parsed.data.storagePath);

  if (!pair) {
    return { ok: false, reason: "error" };
  }

  return { ok: true, image: { assetId: asset.id, url: pair.thumb } };
}

/**
 * Short-lived links for everything attached to this character. The bucket is
 * private, so a stored file has no public address at all — which is the point.
 */
export async function loadCanonicalImageUrls(input: unknown): Promise<CanonicalImage[]> {
  const parsed = z.uuid().safeParse(input);

  if (!parsed.success) return [];

  const { supabase } = await requireSession();

  const { data: rows } = await supabase
    .from("entity_images")
    .select("asset_id, assets (storage_path)")
    .eq("entity_id", parsed.data);

  const paths = (rows ?? [])
    .map((row) => ({ assetId: row.asset_id, path: row.assets?.storage_path }))
    .filter((row): row is { assetId: string; path: string } => Boolean(row.path));

  if (paths.length === 0) return [];

  // A coluna do editor mostra estas o tempo todo, em quadro pequeno: miniatura.
  // Ampliar é assunto do Lightbox, que reassina por id.
  const signed = await signWithThumbnails(supabase, paths.map((row) => row.path));

  return paths
    .map((row) => ({ assetId: row.assetId, url: signed.get(row.path)?.thumb ?? null }))
    .filter((image): image is CanonicalImage => image.url !== null);
}

const removeSchema = z.object({
  entityId: z.uuid(),
  assetId: z.uuid(),
});

/**
 * Takes an image out of a slot for good.
 *
 * Rather than working out in advance whether some frozen version depends on the
 * file, the delete is simply attempted: the trigger of spec 4.3 is the authority
 * on that question, and asking it directly can never drift from what it actually
 * enforces. A refusal is not a failure here — it means the file is load-bearing,
 * and the interface says so in plain words instead of showing a database error.
 *
 * Clearing the slot in the sheet is a separate, always-allowed edit: the draft
 * is meant to change, and a version keeps its own copy of the ids either way.
 */
export async function removeCanonicalImage(input: unknown): Promise<RemoveImageResult> {
  const parsed = removeSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase } = await requireSession();

  const { data: asset } = await supabase
    .from("assets")
    .select("storage_path")
    .eq("id", parsed.data.assetId)
    .maybeSingle();

  if (!asset) {
    // Already gone; nothing left to do and nothing to apologise for.
    return { ok: true, kept: false };
  }

  // Deleting the asset cascades into entity_images, which is where the
  // protection trigger lives — one statement, one authority.
  const { error } = await supabase.from("assets").delete().eq("id", parsed.data.assetId);

  if (error) {
    if (error.code === RESTRICT_VIOLATION) {
      return { ok: true, kept: true };
    }

    return { ok: false, reason: "error" };
  }

  await supabase.storage.from("assets").remove([asset.storage_path]);

  return { ok: true, kept: false };
}
