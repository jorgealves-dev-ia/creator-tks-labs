import "server-only";

import { isProviderConfigured } from "@/lib/providers/keys";
import { findTranslationProvider } from "@/lib/providers/registry";
import { ProviderError, type TranslationItem } from "@/lib/providers/types";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Turning Portuguese into English, for the two places that need it.
 *
 * The sheet's free text needs it at save time (§3.3 of geracao-canonica.md); the
 * scene a user writes on a node, and the instruction they attach to a reference,
 * need it at generation time (§6 rule 2 of nodes-geracao.md). The *when* differs;
 * everything else — which model, which adapter, what a failure means — is the
 * same question, so it is asked in one place.
 *
 * Nothing here charges Sparks. It is a fraction of a cent per call and belongs to
 * the margin of the generations it makes possible.
 */

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type TranslateItemsResult =
  | { ok: true; translations: Record<string, string> }
  | { ok: false; reason: "not_configured" | "error" };

/**
 * A batch ceiling. Neither caller comes close — a sheet has a couple of dozen
 * free-text fields and a node has at most seven sentences — so this is not a
 * limit, it is the guarantee that a pathological input can never turn one save
 * into an expensive call.
 */
export const MAX_TRANSLATION_ITEMS = 40;

export async function translateItems(
  supabase: SupabaseServerClient,
  items: readonly TranslationItem[],
): Promise<TranslateItemsResult> {
  if (items.length === 0) {
    return { ok: true, translations: {} };
  }

  // The model is the catalogue's answer, exactly as it is for extraction: a row
  // carrying the `translation` capability, cheapest first by sort order. No price
  // column and no selector — this is plumbing, not a choice the user makes.
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
      items: items.slice(0, MAX_TRANSLATION_ITEMS),
    });

    return { ok: true, translations: answer.translations };
  } catch (error) {
    // Worth a line in the terminal during development, where someone is looking.
    // What each caller does about it differs: the sheet simply tries again on the
    // next save, while a generation stops — see lib/generation/canvas-actions.ts.
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
