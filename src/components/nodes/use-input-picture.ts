"use client";

import { useEffect, useState } from "react";

import { signAssets } from "@/lib/assets/sign-batch";
import { useLocalPreviews } from "@/lib/canvas/local-previews";

/**
 * The picture an input card shows for one asset — the signed thumbnail, or, for
 * a moment after the file left this very browser, the file itself.
 *
 * Written once for the four input cards (02/10/2026). The Input de Imagem had
 * it inline since 01/10; Pose, Character Sheet and the photos of a Produto were
 * given the same behaviour by the owner's decision, and "the same" is only true
 * while there is one copy of it.
 *
 * ---------------------------------------------------------------------------
 * The signed link, remembered next to the asset it belongs to
 * ---------------------------------------------------------------------------
 *
 * Keeping the pair rather than a lone string is what makes the frame go blank
 * the instant the card points somewhere else, instead of showing the previous
 * picture until a request comes back — and it derives the answer rather than
 * clearing it in an effect, which would be a second render telling the truth
 * after a first one told a lie.
 *
 * ---------------------------------------------------------------------------
 * The picture from the person's own machine
 * ---------------------------------------------------------------------------
 *
 * When the asset was sent a moment ago from this tab — pasted or dropped on the
 * canvas, or sent with the picker's «Enviar imagem» — the file is still in the
 * browser's hands (`local-previews.ts`). The card draws it at once instead of
 * reading «Carregando…» while a signed link is made and a thumbnail downloaded.
 * It is an object URL in this tab's memory — never in `data`, never saved.
 *
 * It steps down only when the real picture is ready to take its place: loaded
 * off-screen first, so the frame never goes blank between the two. If the real
 * one never loads, the preview stays until the store's own timer.
 */
export function useInputPicture(assetId: string | null): string | null {
  const [signed, setSigned] = useState<{ assetId: string; url: string } | null>(null);
  const url = assetId && signed?.assetId === assetId ? signed.url : null;

  const preview = useLocalPreviews((state) => (assetId ? (state.byAsset[assetId] ?? null) : null));

  useEffect(() => {
    if (!assetId) return;

    let cancelled = false;

    void signAssets([assetId]).then((urls) => {
      // O card desenha pequeno: miniatura. Ampliar é o Lightbox, que reassina.
      const link = urls[assetId]?.thumb;

      if (!cancelled && link) setSigned({ assetId, url: link });
    });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  useEffect(() => {
    if (!assetId || !preview || !url) return;

    const real = new Image();
    let cancelled = false;

    real.onload = () => {
      if (!cancelled) useLocalPreviews.getState().release(assetId);
    };
    real.src = url;

    return () => {
      cancelled = true;
    };
  }, [assetId, preview, url]);

  return preview ?? url;
}
