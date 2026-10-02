"use client";

import { ViewportPortal } from "@xyflow/react";

import { NodeIcon } from "@/components/nodes/node-icons";
import type { UploadPreview } from "@/lib/canvas/image-gesture";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The pictures of a paste or a drop, on the canvas before their cards exist —
 * 01/10/2026.
 *
 * Drawn inside React Flow's own viewport (`ViewportPortal`), so each one sits at
 * a point of the CANVAS and pans and zooms with it — the point where its card
 * will be born. It wears the card's outline on purpose: same width, same header
 * height, same frame, so that when the card takes over nothing moves and the
 * picture simply stays.
 *
 * It is not a node. It has no handle, no actions, nothing to click — and it is
 * never in the graph the autosave writes. The file is still on its way; until it
 * arrives there is no asset, and a card is a thing that holds one.
 */
export function UploadPreviews({ previews }: { previews: readonly UploadPreview[] }) {
  if (previews.length === 0) return null;

  return (
    <ViewportPortal>
      {previews.map((preview) => (
        <div
          key={preview.key}
          data-upload-preview
          className="pointer-events-none absolute left-0 top-0 w-56 rounded-xl border border-line
                     bg-surface-raised shadow-lg shadow-black/30"
          style={{ transform: `translate(${preview.position.x}px, ${preview.position.y}px)` }}
        >
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <NodeIcon kind="input-image" className="size-3.5 shrink-0 text-ink-faint" />

            <p className="min-w-0 flex-1 truncate text-xs font-medium text-ink">{t.inputs.image.title}</p>

            {/* `h-5` is the height of the card's action buttons: the header of the
                preview and the header of the card must be the same height, or the
                picture would jump when one replaces the other. */}
            <span className="flex h-5 shrink-0 items-center text-[10px] text-ink-faint">
              {t.generation.upload.previewSending}
            </span>
          </div>

          <div className="p-3">
            <div
              className="flex aspect-square w-full items-center justify-center overflow-hidden
                         rounded-lg border border-dashed border-line bg-canvas"
            >
              {/* An object URL of the file itself — nothing was fetched. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt="" className="size-full object-contain" />
            </div>
          </div>
        </div>
      ))}
    </ViewportPortal>
  );
}
