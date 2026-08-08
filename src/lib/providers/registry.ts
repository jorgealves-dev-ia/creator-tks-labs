import "server-only";

import { anthropicExtractionProvider } from "@/lib/providers/anthropic";
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
