"use client";

import { useLightbox } from "@/components/nodes/lightbox";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The right-hand column of a generating block: what came out.
 *
 * Two properties, and both are decisions rather than styling.
 *
 * **The frame never changes size.** It is a square, whatever proportion was
 * generated, and the image fits inside it. A frame that took the shape of the
 * chosen preset made the whole node grow and shrink when somebody switched from
 * Stories to Feed — the controls on the left would jump under the pointer for a
 * reason that had nothing to do with them. A fixed frame costs some empty space
 * beside a 9:16; a frame that resizes costs the layout its stability, which is
 * worth more.
 *
 * **It is built for four from the start.** The quantity stepper arrives in the
 * next step, and a panel that only knew how to draw one image would have to be
 * redrawn to learn the others. One image fills the square; two split it down the
 * middle; three or four fall into the 2×2. The outer square is the same in all
 * four cases, so the node never changes height because of how many images were
 * asked for — and each cell carries its own state, because each image is its own
 * request, its own charge and its own way of failing.
 */

const copy = t.generation.node;

/**
 * One image's worth of the panel.
 *
 * `pending` is a request in flight, `done` is an image (with `url` null only
 * while its signed link is being fetched), and `failed` carries the sentence
 * that explains it — supplied by the caller, since the reasons a generation can
 * fail already have their words in the block above.
 */
export type ResultSlot =
  | { status: "pending" }
  | { status: "done"; assetId: string; url: string | null }
  | { status: "failed"; message: string };

/**
 * Static class names, because Tailwind reads the source rather than the running
 * program: a template string built from a count compiles to no CSS at all.
 */
const GRID_CLASS: Record<number, string> = {
  1: "grid-cols-1 grid-rows-1",
  2: "grid-cols-2 grid-rows-1",
  3: "grid-cols-2 grid-rows-2",
  4: "grid-cols-2 grid-rows-2",
};

export function ResultPanel({ slots }: { slots: readonly ResultSlot[] }) {
  const openLightbox = useLightbox((state) => state.open);

  if (slots.length === 0) {
    return (
      <div
        className="flex aspect-square w-full items-center justify-center rounded-lg border
                   border-dashed border-line px-4 text-center text-[11px] leading-relaxed
                   text-ink-faint"
      >
        {copy.emptyResult}
      </div>
    );
  }

  return (
    <div
      className={`grid aspect-square w-full gap-1 overflow-hidden rounded-lg border
                  border-line bg-canvas p-1 ${GRID_CLASS[Math.min(slots.length, 4)]}`}
    >
      {slots.slice(0, 4).map((slot, index) => (
        <Slot key={index} slot={slot} onOpen={openLightbox} />
      ))}
    </div>
  );
}

function Slot({
  slot,
  onOpen,
}: {
  slot: ResultSlot;
  onOpen: (assetId: string) => void;
}) {
  if (slot.status === "pending") {
    return (
      <div className="flex size-full items-center justify-center rounded bg-surface/60">
        <span className="text-[10px] text-ink-muted">{copy.generating}</span>
      </div>
    );
  }

  if (slot.status === "failed") {
    return (
      <div className="flex size-full items-center justify-center rounded bg-surface/60 px-2">
        <span className="text-center text-[10px] leading-tight text-warning">
          {slot.message}
        </span>
      </div>
    );
  }

  if (!slot.url) {
    // The asset exists; its signed link has not come back yet. Deliberately
    // blank rather than a second "Gerando…": the work is done, and saying
    // otherwise would restart a clock that already stopped.
    return <div className="size-full rounded bg-surface/60" />;
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(slot.assetId)}
      title={t.generation.lightbox.openHint}
      className="nodrag size-full overflow-hidden rounded"
    >
      {/* A plain img: short-lived signed URLs for a private bucket, so the
          optimiser has nothing it could cache. `contain` is what lets one fixed
          square hold a portrait, a landscape and a square without cropping any
          of them. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slot.url} alt={copy.resultAlt} className="size-full object-contain" />
    </button>
  );
}
