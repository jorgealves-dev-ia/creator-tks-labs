"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { HANDLE_MAX_LENGTH, slugifyHandle } from "@/lib/entities/handle";
import {
  createEmptyProductSheet,
  parseProductSheet,
  PRODUCT_INSTRUCTION_MAX_LENGTH,
  PRODUCT_MAX_PHOTOS,
  productSheetToJson,
} from "@/lib/products/schema";
import type { Product } from "@/lib/products/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Writes to a product: creating one, renaming it, its default instruction, its
 * photos, and putting it away.
 *
 * A product is a row of `entities` with `kind = 'product'`; its photos are rows
 * of `entity_images` pointing at ordinary `assets`. Two consequences worth
 * stating out loud, because they are the whole reason for reusing that table:
 *
 *   the photos are gallery images   Uploading a product photo puts it in "Minhas
 *                                   imagens" like any other. Removing it from
 *                                   the product removes the *link*, never the
 *                                   file — a photo used in fifty generations
 *                                   does not disappear because a product was
 *                                   reorganised.
 *
 *   a product is archived           Never deleted, exactly like a character.
 *                                   Generations that used it keep pointing at
 *                                   something that still exists.
 *
 * Every action re-checks the session: a Server Action is a public HTTP endpoint
 * and must never rely on the proxy having run.
 */

/** Postgres check_violation — here, the five-photo trigger of the migration. */
const CHECK_VIOLATION = "23514";

const displayNameSchema = z.string().trim().min(1).max(120);

async function requireSession() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  return { supabase, userId };
}

// ---------------------------------------------------------------------------
// Creating
// ---------------------------------------------------------------------------

export type CreateProductResult =
  | { ok: true; product: Product }
  | { ok: false; reason: "invalid" | "error" };

/**
 * `base`, `base-2`, `base-3`… trimmed so the suffix never pushes the handle past
 * what the database constraint accepts.
 */
function handleAttempt(base: string, attempt: number): string {
  if (attempt === 1) return base.slice(0, HANDLE_MAX_LENGTH);

  const suffix = `-${attempt}`;

  return `${base.slice(0, HANDLE_MAX_LENGTH - suffix.length).replace(/-+$/, "")}${suffix}`;
}

/**
 * Creates a product with a name and nothing else: no photos, no instruction.
 *
 * The handle is derived rather than asked for. Nothing types `@produto` in a
 * prompt today — the wire from the card does that job in v1 — so asking the user
 * to invent one would be asking for a decision that buys them nothing. It still
 * has to be unique across the whole namespace, because the day `@produto` exists
 * it is the same namespace the characters are in.
 */
export async function createProduct(input: unknown): Promise<CreateProductResult> {
  const parsed = displayNameSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase, userId } = await requireSession();

  // A name of pure punctuation or emoji slugifies to nothing, and a product is
  // still a product. "produto" is a handle nobody reads today.
  const base = slugifyHandle(parsed.data) || "produto";

  // One read to find what is taken, instead of insert-and-retry as a search
  // strategy. slugifyHandle emits only [a-z0-9-], so the prefix carries no LIKE
  // wildcard of its own.
  const { data: taken } = await supabase
    .from("entities")
    .select("handle")
    .eq("user_id", userId)
    .like("handle", `${base}%`);

  const used = new Set((taken ?? []).map((row) => row.handle));

  let attempt = 1;
  while (used.has(handleAttempt(base, attempt))) attempt += 1;

  const { data, error } = await supabase
    .from("entities")
    .insert({
      user_id: userId,
      kind: "product",
      // Null on purpose: a product belongs to the user, not to one project.
      project_id: null,
      handle: handleAttempt(base, attempt),
      display_name: parsed.data,
      sheet: productSheetToJson(createEmptyProductSheet()),
    })
    .select("id, handle, display_name, sheet")
    .single();

  // A unique violation can still happen here — another tab creating the same
  // name between the read above and this insert. Reported rather than looped
  // over: it is a race narrow enough that one more click, with the name
  // unchanged, is the whole fix.
  if (error || !data) {
    return { ok: false, reason: "error" };
  }

  return {
    ok: true,
    product: {
      id: data.id,
      handle: data.handle,
      displayName: data.display_name,
      instrucaoPadrao: parseProductSheet(data.sheet).instrucao_padrao,
      photos: [],
    },
  };
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

export type ProductWriteResult = { ok: true } | { ok: false; reason: "invalid" | "error" };

const renameSchema = z.object({
  productId: z.uuid(),
  displayName: displayNameSchema,
});

/**
 * Renames a product. The handle deliberately does not follow: it is an identity
 * other rows may already point at, and renaming a thing is not renaming what
 * points at it.
 */
export async function renameProduct(input: unknown): Promise<ProductWriteResult> {
  const parsed = renameSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase } = await requireSession();

  const { data, error } = await supabase
    .from("entities")
    .update({ display_name: parsed.data.displayName })
    .eq("id", parsed.data.productId)
    .eq("kind", "product")
    .select("id")
    .maybeSingle();

  return error || !data ? { ok: false, reason: "error" } : { ok: true };
}

const instructionSchema = z.object({
  productId: z.uuid(),
  instrucao: z.string().trim().max(PRODUCT_INSTRUCTION_MAX_LENGTH),
});

/**
 * The sentence every generation from this product starts with.
 *
 * Written whole rather than merged into the stored sheet, because the sheet has
 * exactly one field today. When the extraction of decision N4 adds more, this
 * turns into a read-modify-write — which is the moment to notice, not before.
 */
export async function setProductInstruction(input: unknown): Promise<ProductWriteResult> {
  const parsed = instructionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase } = await requireSession();

  const { data, error } = await supabase
    .from("entities")
    .update({ sheet: productSheetToJson({ instrucao_padrao: parsed.data.instrucao }) })
    .eq("id", parsed.data.productId)
    .eq("kind", "product")
    .select("id")
    .maybeSingle();

  return error || !data ? { ok: false, reason: "error" } : { ok: true };
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

const photoSchema = z.object({
  productId: z.uuid(),
  assetId: z.uuid(),
});

export type AttachPhotoResult =
  | { ok: true; sortOrder: number }
  | { ok: false; reason: "invalid" | "full" | "error" };

/**
 * Links an image the user already owns — freshly uploaded or picked out of the
 * gallery — to a product.
 *
 * The ceiling is checked here so the interface can say the number in words, and
 * again by the trigger of 20260810160000, which is the one that cannot be
 * forgotten. Both exist for the same reason: each photo occupies a reference
 * slot in every generation this product takes part in.
 */
export async function attachProductPhoto(input: unknown): Promise<AttachPhotoResult> {
  const parsed = photoSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase, userId } = await requireSession();

  const { data: existing } = await supabase
    .from("entity_images")
    .select("asset_id, sort_order")
    .eq("entity_id", parsed.data.productId);

  const photos = existing ?? [];

  if (photos.length >= PRODUCT_MAX_PHOTOS) {
    return { ok: false, reason: "full" };
  }

  // Already there: the same picture chosen twice is one photo, not two.
  if (photos.some((photo) => photo.asset_id === parsed.data.assetId)) {
    return { ok: false, reason: "invalid" };
  }

  const sortOrder = photos.reduce((highest, photo) => Math.max(highest, photo.sort_order), -1) + 1;

  const { error } = await supabase.from("entity_images").insert({
    entity_id: parsed.data.productId,
    asset_id: parsed.data.assetId,
    user_id: userId,
    role: "foto",
    sort_order: sortOrder,
  });

  if (error) {
    return { ok: false, reason: error.code === CHECK_VIOLATION ? "full" : "error" };
  }

  return { ok: true, sortOrder };
}

/**
 * Takes a photo off a product — the link only.
 *
 * The file stays in Storage and in the gallery, on purpose. A product photo is
 * an ordinary asset that other generations may already have used, and
 * reorganising a product is not a reason for an image to vanish from history.
 */
export async function detachProductPhoto(input: unknown): Promise<ProductWriteResult> {
  const parsed = photoSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase } = await requireSession();

  const { error } = await supabase
    .from("entity_images")
    .delete()
    .eq("entity_id", parsed.data.productId)
    .eq("asset_id", parsed.data.assetId);

  return error ? { ok: false, reason: "error" } : { ok: true };
}

// ---------------------------------------------------------------------------
// Putting it away
// ---------------------------------------------------------------------------

/**
 * Archives a product: it leaves the Arsenal and every list, and everything is
 * preserved — the row, the links, the photos in the gallery, and every
 * generation that ever used it.
 *
 * Archived rather than deleted for the reason spelled out for entities in
 * 20260807170000: history that points at a deleted row is history that cannot
 * answer what it was made of.
 */
export async function archiveProduct(input: unknown): Promise<ProductWriteResult> {
  const parsed = z.uuid().safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase } = await requireSession();

  const { data, error } = await supabase
    .from("entities")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .eq("kind", "product")
    .select("id")
    .maybeSingle();

  return error || !data ? { ok: false, reason: "error" } : { ok: true };
}
