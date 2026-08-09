import "server-only";

import { anthropicExtractionProvider } from "@/lib/providers/anthropic";
import { isProviderConfigured } from "@/lib/providers/keys";
import type { ExtractionProvider } from "@/lib/providers/types";

/**
 * Which adapter answers for which provider slug.
 *
 * This map is the whole of the "new provider = new file" promise (architecture
 * decision 2): the engine looks a provider up here and gets an interface, so it
 * never learns any provider's name. A slug in the catalogue with no entry here is
 * simply a provider whose adapter has not been written yet — the selector already
 * greys it out for lack of a key, so it can never be reached.
 */
const EXTRACTION_PROVIDERS: Record<string, ExtractionProvider> = {
  [anthropicExtractionProvider.slug]: anthropicExtractionProvider,
};

export function findExtractionProvider(slug: string): ExtractionProvider | null {
  return EXTRACTION_PROVIDERS[slug] ?? null;
}

/** Whether an adapter exists at all — the second half of "usable" after the key. */
export function hasExtractionAdapter(slug: string): boolean {
  return slug in EXTRACTION_PROVIDERS;
}

/** Why a provider is or is not usable. See ProviderStatus in extraction/actions. */
export type ProviderStatus = "ready" | "missing_key" | "no_adapter";

/**
 * Usable means **both**: an adapter here and a key on the server. The two fail
 * for different reasons and the interface has to say which, so this returns a
 * reason rather than a boolean — a provider whose key the user has already set
 * must never be told to set it.
 *
 * The adapter is checked first: with no adapter, whether a key exists is beside
 * the point.
 *
 * Lives next to the registry because the registry owns half the answer, and
 * because putting it here lets it be exercised directly instead of through a
 * server action that needs a session.
 */
export function extractionProviderStatus(slug: string, envVarName: string): ProviderStatus {
  if (!hasExtractionAdapter(slug)) return "no_adapter";

  return isProviderConfigured(envVarName) ? "ready" : "missing_key";
}
