"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";

import { signAssetUrls } from "@/lib/assets/actions";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The image, big.
 *
 * A 2K generation shown inside a 256px node cannot be judged — and judging it is
 * the entire point of having generated it. Until this existed, the only way to
 * actually look at a result was to download the file and open it elsewhere,
 * which takes the user out of the studio to do the one thing the studio is for.
 *
 * Lives above the canvas, like the other overlays, because a React Flow node
 * sits inside a CSS transform and a `fixed` child of one is positioned against
 * the canvas and scaled with the zoom.
 */

const copy = t.generation.lightbox;

type LightboxState = {
  assetId: string | null;
  open: (assetId: string) => void;
  close: () => void;
};

export const useLightbox = create<LightboxState>((set) => ({
  assetId: null,
  open: (assetId) => set({ assetId }),
  close: () => set({ assetId: null }),
}));

export function Lightbox() {
  const assetId = useLightbox((state) => state.assetId);

  if (!assetId) return null;

  return <LightboxView key={assetId} assetId={assetId} />;
}

function LightboxView({ assetId }: { assetId: string }) {
  const close = useLightbox((state) => state.close);
  const [url, setUrl] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void signAssetUrls([assetId]).then((signed) => {
      if (!cancelled) setUrl(signed[assetId] ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={copy.title}
      className="fixed inset-0 z-50 flex flex-col bg-canvas/95 backdrop-blur-sm"
      onClick={close}
    >
      <div className="flex shrink-0 items-center justify-between px-5 py-3">
        <p className="text-xs text-ink-faint">{zoomed ? copy.zoomedHint : copy.hint}</p>

        <button
          type="button"
          onClick={close}
          aria-label={copy.close}
          className="rounded-lg px-2 py-1 text-xs text-ink-muted transition-colors
                     hover:bg-surface-hover hover:text-ink"
        >
          ✕
        </button>
      </div>

      <div
        className={`min-h-0 flex-1 ${zoomed ? "overflow-auto" : "flex items-center justify-center"} px-5 pb-5`}
        onClick={(event) => {
          // Clicking the image toggles zoom; clicking the space around it closes.
          // Stopping propagation only on the image is what keeps both true.
          if (event.target === event.currentTarget) close();
        }}
      >
        {url ? (
          /* Short-lived signed URL for a private bucket. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={copy.title}
            onClick={(event) => {
              event.stopPropagation();
              setZoomed((current) => !current);
            }}
            className={
              zoomed
                ? "max-w-none cursor-zoom-out"
                : "max-h-full max-w-full cursor-zoom-in object-contain"
            }
          />
        ) : (
          <p className="text-xs text-ink-faint">{copy.loading}</p>
        )}
      </div>
    </div>
  );
}
