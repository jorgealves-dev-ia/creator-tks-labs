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

/**
 * Quem abre diz **o que** está abrindo.
 *
 * O overlay recebe um id de asset e nada mais, então sozinho ele não tem como
 * saber se aquilo se olha ou se assiste — e um `<img src="…mp4">` não falha com
 * erro, desenha o ícone de imagem quebrada. Perguntar ao servidor custaria uma
 * segunda viagem por um booleano; quem chamou **já sabe**, porque acabou de
 * desenhar a miniatura.
 *
 * O parâmetro é opcional e vale `false` por omissão: os quatro chamadores de
 * imagem continuam como estavam. O dia em que um cartão Resultado mostrar vídeo,
 * é aqui que ele precisa passar `isVideo` — e este parágrafo é o aviso.
 */
type LightboxState = {
  assetId: string | null;
  isVideo: boolean;
  open: (assetId: string, options?: { isVideo?: boolean }) => void;
  close: () => void;
};

export const useLightbox = create<LightboxState>((set) => ({
  assetId: null,
  isVideo: false,
  open: (assetId, options) => set({ assetId, isVideo: options?.isVideo ?? false }),
  close: () => set({ assetId: null, isVideo: false }),
}));

export function Lightbox() {
  const assetId = useLightbox((state) => state.assetId);
  const isVideo = useLightbox((state) => state.isVideo);

  if (!assetId) return null;

  return <LightboxView key={assetId} assetId={assetId} isVideo={isVideo} />;
}

function LightboxView({ assetId, isVideo }: { assetId: string; isVideo: boolean }) {
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
      aria-label={isVideo ? copy.videoTitle : copy.title}
      className="fixed inset-0 z-50 flex flex-col bg-canvas/95 backdrop-blur-sm"
      onClick={close}
    >
      <div className="flex shrink-0 items-center justify-between px-5 py-3">
        <p className="text-xs text-ink-faint">
          {isVideo ? copy.videoHint : zoomed ? copy.zoomedHint : copy.hint}
        </p>

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
        {url && isVideo ? (
          /*
            Vídeo não tem zoom, e a ausência é a decisão: ampliar existe para
            olhar de perto o que a miniatura não mostra, e num clipe o que a
            miniatura não mostra é o **movimento** — quem responde por isso é o
            play, não a lupa. Um clique que às vezes amplia e às vezes pausa
            seria o mesmo gesto com dois significados.

            `stopPropagation` porque o clique no fundo fecha o overlay, e sem
            ele arrastar a barra de progresso fecharia o vídeo no meio.
          */
          <video
            src={url}
            controls
            preload="metadata"
            aria-label={copy.videoTitle}
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full object-contain"
          />
        ) : url ? (
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
