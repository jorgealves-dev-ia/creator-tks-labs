"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { parseSheet } from "@/lib/character-sheet/schema";
import { pendingTranslations } from "@/lib/character-sheet/translation";
import { MAX_TRANSLATION_ITEMS, translateItems } from "@/lib/prompt/translator";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Translating the sheet's free text — §3.3 of docs/geracao-canonica.md.
 *
 * Runs after an autosave lands, finds every hand-typed fragment that has no
 * English yet, and translates the lot in one cheap call.
 *
 * It deliberately does **not** write to the database. The draft has exactly one
 * writer — saveCharacterDraft, driven by the editor's autosave — and adding a
 * second one that writes a sheet it read a moment ago would race the user's
 * typing for the right to be the last word. So this returns what it translated,
 * the store applies it to the draft it already holds, and the next autosave
 * persists it. The cycle ends by itself: once the cache is filled there is
 * nothing left pending, so the next save translates nothing.
 *
 * Nothing here charges Sparks. The cost is a fraction of a cent per edit and
 * belongs to the margin of the generations this makes possible.
 */

/** What was translated, and the Portuguese it was translated from. */
export type TranslationEntry = { id: string; source: string; en: string };

export type TranslateDraftResult =
  | { ok: true; entries: TranslationEntry[] }
  | { ok: false; reason: "invalid" | "not_configured" | "error" };

export async function translateDraftFreeText(input: unknown): Promise<TranslateDraftResult> {
  const parsed = z.uuid().safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: entity } = await supabase
    .from("entities")
    .select("id, sheet")
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle();

  if (!entity) {
    return { ok: false, reason: "invalid" };
  }

  const pending = pendingTranslations(parseSheet(entity.sheet)).slice(0, MAX_TRANSLATION_ITEMS);

  if (pending.length === 0) {
    return { ok: true, entries: [] };
  }

  const answer = await translateItems(
    supabase,
    pending.map((slot) => ({ id: slot.id, text: slot.source })),
  );

  // Nothing is charged and nothing is lost: the fields stay untranslated, the
  // preview keeps saying so, and the next save tries again.
  if (!answer.ok) {
    return { ok: false, reason: answer.reason };
  }

  return {
    ok: true,
    entries: pending
      .map((slot) => ({
        id: slot.id,
        source: slot.source,
        en: answer.translations[slot.id] ?? "",
      }))
      .filter((entry) => entry.en !== ""),
  };
}
