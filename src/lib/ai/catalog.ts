import "server-only";

import type {
  Capability,
  CatalogProvider,
  ProviderStatus,
} from "@/lib/ai/catalog-types";
import { extractionProviderStatus, imageProviderStatus } from "@/lib/providers/registry";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reading the catalogue for one capability.
 *
 * Extraction and image generation ask the same question of the same two tables
 * and differ in exactly three details: which capability to filter on, which
 * price column holds the answer, and which registry knows whether an adapter
 * exists. Those three live in one table below rather than in two copies of this
 * query — because a copy that got one of them wrong would not fail loudly, it
 * would quietly offer a model at the other capability's price.
 *
 * Decision E5 holds throughout: the status is computed here, on the server, and
 * what travels to the browser is the word "ready" — never a key, and not even
 * the name of the variable that holds one.
 */

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** The three things that differ between capabilities, in one place. */
const CAPABILITY_READERS: Record<
  Capability,
  {
    /** The value stored in ai_models.capabilities. */
    flag: string;
    /** Which column prices it. */
    price: (model: { extraction_sparks: number | null; image_sparks: number | null }) => number | null;
    status: (slug: string, envVarName: string) => ProviderStatus;
  }
> = {
  extraction: {
    flag: "extraction",
    price: (model) => model.extraction_sparks,
    status: extractionProviderStatus,
  },
  image_gen: {
    flag: "image_gen",
    price: (model) => model.image_sparks,
    status: imageProviderStatus,
  },
};

export async function loadCatalog(
  supabase: SupabaseServerClient,
  capability: Capability,
): Promise<CatalogProvider[]> {
  const reader = CAPABILITY_READERS[capability];

  // One literal string, not a concatenation: the Supabase client infers the
  // shape of the result from the text of the select, and a built-up string is
  // opaque to it — which costs the types of every column it names.
  const { data } = await supabase
    .from("ai_providers")
    .select(
      "slug, display_name, enabled, env_var_name, sort_order, ai_models (id, slug, display_name, extraction_sparks, image_sparks, is_default, enabled, capabilities, sort_order)",
    )
    .eq("enabled", true)
    .order("sort_order");

  return (data ?? [])
    .map((provider) => ({
      slug: provider.slug,
      displayName: provider.display_name,
      status: reader.status(provider.slug, provider.env_var_name),
      models: (provider.ai_models ?? [])
        .filter((model) => model.enabled && model.capabilities.includes(reader.flag))
        // A model with the capability but no price is a catalogue row that the
        // charging function could not price. The database constraint makes that
        // impossible; this filter is what keeps it impossible if the constraint
        // is ever relaxed.
        .filter((model) => reader.price(model) !== null)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((model) => ({
          id: model.id,
          slug: model.slug,
          displayName: model.display_name,
          sparks: reader.price(model) ?? 0,
          isDefault: model.is_default,
        })),
    }))
    .filter((provider) => provider.models.length > 0);
}
