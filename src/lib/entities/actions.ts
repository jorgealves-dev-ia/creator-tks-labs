"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  characterSheetSchema,
  createEmptySheet,
  parseSheet,
  sheetToJson,
} from "@/lib/character-sheet/schema";
import { HANDLE_PATTERN } from "@/lib/entities/handle";
import type { CharacterEntity } from "@/lib/entities/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Writes to a character: creating one, and saving its draft.
 *
 * Saving a *version* is not here — it is a single atomic step in the database
 * (function public.save_entity_version), because an INSERT plus a pointer UPDATE
 * done as two round trips could leave @handle pointing at the wrong snapshot.
 *
 * Every action re-checks the session. A Server Action is a public HTTP endpoint
 * and must never rely on the proxy having run.
 */

/** Postgres unique violation — here, a handle the user already used. */
const UNIQUE_VIOLATION = "23505";

const displayNameSchema = z.string().trim().min(1).max(120);
const handleSchema = z.string().trim().regex(HANDLE_PATTERN);

const createCharacterSchema = z.object({
  displayName: displayNameSchema,
  handle: handleSchema,
  genero: z.enum(["feminino", "masculino", "androgino"]).optional(),
});

const saveDraftSchema = z.object({
  entityId: z.uuid(),
  displayName: displayNameSchema,
  sheet: characterSheetSchema,
});

export type CreateCharacterResult =
  | { ok: true; character: CharacterEntity }
  | { ok: false; reason: "invalid" | "handle_taken" | "error" };

export type SaveDraftResult = { ok: true } | { ok: false; reason: "invalid" | "error" };

export type HandleCheckResult = { available: boolean };

async function requireSession() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  return { supabase, userId };
}

/**
 * Creates a character with an empty sheet: honest defaults on layer 2, an
 * untouched DNA, and no version at all. A character with no saved version
 * cannot be mentioned with @ yet — that is the point of "save as v1".
 */
export async function createCharacter(input: unknown): Promise<CreateCharacterResult> {
  const parsed = createCharacterSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase, userId } = await requireSession();
  const sheet = createEmptySheet(parsed.data.genero);

  const { data, error } = await supabase
    .from("entities")
    .insert({
      user_id: userId,
      kind: "character",
      // Null on purpose: a character belongs to the user, not to one project.
      project_id: null,
      handle: parsed.data.handle,
      display_name: parsed.data.displayName,
      sheet: sheetToJson(sheet),
    })
    .select("id, handle, display_name, sheet, cover_asset_id")
    .single();

  if (error) {
    return { ok: false, reason: error.code === UNIQUE_VIOLATION ? "handle_taken" : "error" };
  }

  return {
    ok: true,
    character: {
      id: data.id,
      handle: data.handle,
      displayName: data.display_name,
      sheet: parseSheet(data.sheet),
      activeVersion: null,
      coverAssetId: data.cover_asset_id,
    },
  };
}

/**
 * Saves the draft — the notebook that stays open. Called by the editor's
 * autosave, so it is deliberately cheap and has no side effects beyond the row:
 * no revalidation, no redirect, nothing that would yank the canvas around while
 * the user is typing.
 *
 * The display name rides along because the editor lets the user rename in place.
 */
export async function saveCharacterDraft(input: unknown): Promise<SaveDraftResult> {
  const parsed = saveDraftSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase } = await requireSession();

  const { data, error } = await supabase
    .from("entities")
    .update({
      sheet: sheetToJson(parsed.data.sheet),
      display_name: parsed.data.displayName,
    })
    .eq("id", parsed.data.entityId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "error" };
  }

  return { ok: true };
}

/**
 * Whether a handle is still free for this user. Advisory only — the real
 * guarantee is the unique constraint, and createCharacter reports the violation
 * if someone takes the handle between this check and the insert.
 */
export async function isHandleAvailable(input: unknown): Promise<HandleCheckResult> {
  const parsed = handleSchema.safeParse(input);

  if (!parsed.success) {
    return { available: false };
  }

  const { supabase, userId } = await requireSession();

  const { data } = await supabase
    .from("entities")
    .select("id")
    .eq("user_id", userId)
    .eq("handle", parsed.data)
    .maybeSingle();

  return { available: !data };
}
