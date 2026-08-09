"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { parseSheet } from "@/lib/character-sheet/schema";
import { pendingTranslations } from "@/lib/character-sheet/translation";
import { isProviderConfigured } from "@/lib/providers/keys";
import { findTranslationProvider } from "@/lib/providers/registry";
import { ProviderError } from "@/lib/providers/types";
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

/**
 * A batch ceiling. A sheet has a couple of dozen free-text fields at most, so
 * this is not a real limit — it is the guarantee that a pathological sheet can
 * never turn one autosave into an expensive call.
 */
const MAX_ITEMS_PER_CALL = 40;

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

  const pending = pendingTranslations(parseSheet(entity.sheet)).slice(0, MAX_ITEMS_PER_CALL);

  if (pending.length === 0) {
    return { ok: true, entries: [] };
  }

  // The model is the catalogue's answer, exactly as it is for extraction: a row
  // carrying the `translation` capability, cheapest first by sort order. No
  // price column and no selector — this is plumbing, not a choice the user makes.
  const { data: models } = await supabase
    .from("ai_models")
    .select("slug, sort_order, ai_providers (slug, env_var_name, enabled)")
    .contains("capabilities", ["translation"])
    .eq("enabled", true)
    .order("sort_order");

  const usable = (models ?? []).find((model) => {
    const provider = model.ai_providers;

    return (
      provider &&
      provider.enabled &&
      findTranslationProvider(provider.slug) !== null &&
      isProviderConfigured(provider.env_var_name)
    );
  });

  const providerRow = usable?.ai_providers;
  const provider = providerRow ? findTranslationProvider(providerRow.slug) : null;

  if (!usable || !provider) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    const answer = await provider.translate({
      model: { slug: usable.slug },
      items: pending.map((slot) => ({ id: slot.id, text: slot.source })),
    });

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
  } catch (error) {
    // Nothing is charged and nothing is lost: the fields stay untranslated, the
    // preview keeps saying so, and the next save tries again. Worth a line in
    // the terminal during development, where someone is looking.
    if (process.env.NODE_ENV !== "production") {
      const detail =
        error instanceof ProviderError
          ? `${error.message}: ${error.detail ?? "no detail"}`
          : error instanceof Error
            ? error.message
            : String(error);

      console.error(`[translate] ${usable.slug} failed — ${detail}`);
    }

    return { ok: false, reason: "error" };
  }
}
