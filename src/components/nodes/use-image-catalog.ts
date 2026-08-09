"use client";

import { useEffect, useState } from "react";

import type { CatalogProvider } from "@/lib/ai/catalog-types";
import { listImageProviders } from "@/lib/generation/actions";

/**
 * The image models available to this user, fetched once per page.
 *
 * A canvas can hold a dozen generation blocks, and each of them needs the same
 * answer to the same question. The promise is cached at module scope so opening a
 * busy project asks the server once instead of a dozen times — the catalogue does
 * not change while someone is looking at it.
 *
 * Cleared on nothing, deliberately: a page reload is what picks up a newly
 * configured provider key, and a key is set on the server by hand anyway.
 */
let inFlight: Promise<CatalogProvider[]> | null = null;

export function useImageCatalog(): CatalogProvider[] {
  const [providers, setProviders] = useState<CatalogProvider[]>([]);

  useEffect(() => {
    inFlight ??= listImageProviders();

    let cancelled = false;

    void inFlight.then((loaded) => {
      if (!cancelled) setProviders(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return providers;
}
