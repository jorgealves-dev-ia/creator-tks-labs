"use client";

import { useEffect } from "react";

import type { CatalogProvider } from "@/lib/ai/catalog-types";
import {
  ensureReadingCatalog,
  useReadingCatalog,
  type ReadingCatalogStatus,
} from "@/lib/product-reading/catalog-store";

/**
 * The models that can read a product photo, for the product card.
 *
 * Sibling of `useImageCatalog`, `useVideoCatalog` and `useTextCatalog`. The
 * fetching and the cache live in `lib/product-reading/catalog-store.ts`, because
 * the click's own code has to be able to ask again; this is only what a card
 * needs to mount: ask once, and read.
 */
export function useProductReadingCatalog(): {
  providers: CatalogProvider[];
  status: ReadingCatalogStatus;
} {
  const providers = useReadingCatalog((state) => state.providers);
  const status = useReadingCatalog((state) => state.status);

  useEffect(() => {
    void ensureReadingCatalog();
  }, []);

  return { providers, status };
}
