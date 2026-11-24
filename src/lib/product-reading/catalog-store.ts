"use client";

import { create } from "zustand";

import type { CatalogProvider } from "@/lib/ai/catalog-types";
import { listProductReadingProviders } from "@/lib/product-reading/actions";

/**
 * The models that can read a product photo, fetched once per page — Frente 1, F1.
 *
 * Fourth sibling of the image, video and text catalogues, with the same promise
 * cached at module level: several product cards on one canvas ask the same
 * question of a catalogue that does not change while somebody looks at it. Its
 * own cache for the reason the others give — a cache shared between capabilities
 * would keep one's answer under the other's key at the first slip.
 *
 * A store rather than a hook's state, for two things the siblings do not need:
 *
 *   the card has to tell      «Ler a foto» is a button that spends. "Still
 *   three silences apart      asking", "the trip failed" and "nobody can read
 *                             right now" are three different sentences under it,
 *                             and an empty list is all three at once.
 *
 *   the price can go stale    the button's number comes from here. When the
 *                             server refuses a click because the catalogue moved
 *                             (`price_changed`), the gesture asks again — and
 *                             every card on the canvas repaints with the new
 *                             figure, not only the one that was clicked.
 */

export type ReadingCatalogStatus = "loading" | "ready" | "failed";

type ReadingCatalogState = {
  providers: CatalogProvider[];
  status: ReadingCatalogStatus;
};

export const useReadingCatalog = create<ReadingCatalogState>()(() => ({
  providers: [],
  status: "loading",
}));

let inFlight: Promise<void> | null = null;

function ask(): Promise<void> {
  // What is on screen stays there while a new answer travels — a list that
  // blinked empty would turn the button off for a moment, for no reason. Only
  // "the trip failed" gives way, to "asking again".
  if (useReadingCatalog.getState().status === "failed") {
    useReadingCatalog.setState({ status: "loading" });
  }

  const trip = listProductReadingProviders().then(
    (providers) => {
      // A slower, older trip must not paint over a newer one.
      if (inFlight === trip) useReadingCatalog.setState({ providers, status: "ready" });
    },
    () => {
      if (inFlight !== trip) return;

      // A failed trip is not kept: holding a rejected promise would leave every
      // card that mounts afterwards with a button that can never turn on.
      inFlight = null;
      useReadingCatalog.setState({ status: "failed" });
    },
  );

  inFlight = trip;

  return trip;
}

/** Asks once. Every card calls this when it mounts; only the first one travels. */
export function ensureReadingCatalog(): Promise<void> {
  return inFlight ?? ask();
}

/** Asks again, whatever is held — after a refusal that says the catalogue moved, or a failed trip. */
export function refreshReadingCatalog(): Promise<void> {
  return ask();
}
