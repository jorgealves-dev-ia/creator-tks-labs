"use client";

import { useEffect, useState } from "react";

import { signAssetUrls } from "@/lib/assets/actions";
import { useProductsStore } from "@/lib/products/store";

/**
 * The first photo of every product that has one, by product id.
 *
 * Signed in one request for all of them at once, and re-signed only when the
 * *set of covers* changes — not when a name is typed in the editor. Same shape,
 * and same reasoning, as lib/entities/use-portraits.ts: the links expire in an
 * hour, which outlasts any session anyone spends on a canvas.
 */
export function useProductCovers(): Record<string, string> {
  const products = useProductsStore((state) => state.products);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const pairs = Object.values(products)
    .map((product) => [product.id, product.photos[0]?.assetId] as const)
    .filter((pair): pair is readonly [string, string] => pair[1] !== undefined);

  // The dependency is the content, not the object: the store hands back a new
  // record whenever anything about any product changes.
  const key = pairs.map(([id, assetId]) => `${id}:${assetId}`).join(",");

  useEffect(() => {
    if (pairs.length === 0) return;

    let cancelled = false;

    void signAssetUrls(pairs.map(([, assetId]) => assetId)).then((signed) => {
      if (cancelled) return;

      setUrls(
        Object.fromEntries(
          pairs
            .map(([id, assetId]) => [id, signed[assetId]] as const)
            .filter((entry): entry is readonly [string, string] => typeof entry[1] === "string"),
        ),
      );
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return urls;
}
