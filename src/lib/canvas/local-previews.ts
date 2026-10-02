"use client";

import { create } from "zustand";

/**
 * The picture someone just pasted, lent to its card from their own machine
 * while the real link is still being made — 01/10/2026.
 *
 * ---------------------------------------------------------------------------
 * The gap this fills
 * ---------------------------------------------------------------------------
 *
 * A pasted image is on the canvas the instant it is pasted, as a preview drawn
 * from the file itself (`image-gesture.ts`). When the upload ends, the preview
 * gives way to a real card — and a real card knows only an asset id: it asks
 * for a signed link and then downloads the thumbnail. For that half second the
 * frame would read «Carregando…»: picture, blank, picture again.
 *
 * So the gesture hands the card the object URL it was already showing, keyed by
 * the asset the file became. The card draws it at once and lets go when the real
 * picture has loaded.
 *
 * ---------------------------------------------------------------------------
 * Never part of the document
 * ---------------------------------------------------------------------------
 *
 * An object URL is the address of bytes in THIS tab's memory. It means nothing
 * tomorrow, or in another browser, and a saved graph must never carry one
 * (architecture decision 3). That is why this lives in a store of its own, and
 * not in the node's `data`, which the autosave writes: the card keeps holding an
 * asset id and nothing else.
 *
 * Every entry is released — by the card when the real picture is ready, or by
 * the timer below when no card ever comes to claim it (deleted in the meantime,
 * another project opened). Releasing revokes the URL: a 10 MB file is not kept
 * in memory for a picture nobody is looking at.
 */

/** Long enough for a signed link and a thumbnail on a slow line; short enough not to hoard. */
const UNCLAIMED_MS = 120_000;

/** The timer of each entry — kept so a release takes it down too, instead of leaving it to fire at nothing. */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

type LocalPreviewsState = {
  /** Object URLs of files this browser already holds, by the asset each became. */
  byAsset: Record<string, string>;
  offer: (assetId: string, url: string) => void;
  release: (assetId: string) => void;
};

export const useLocalPreviews = create<LocalPreviewsState>()((set, get) => ({
  byAsset: {},

  offer: (assetId, url) => {
    // An entry already there is let go first — its URL revoked, its timer
    // stopped —, so a second offer can neither leak the first nor be cut short
    // by it.
    get().release(assetId);

    set((state) => ({ byAsset: { ...state.byAsset, [assetId]: url } }));
    timers.set(
      assetId,
      setTimeout(() => get().release(assetId), UNCLAIMED_MS),
    );
  },

  release: (assetId) => {
    clearTimeout(timers.get(assetId));
    timers.delete(assetId);

    const url = get().byAsset[assetId];

    if (url === undefined) return;

    set((state) => {
      const rest = { ...state.byAsset };

      delete rest[assetId];

      return { byAsset: rest };
    });

    URL.revokeObjectURL(url);
  },
}));
