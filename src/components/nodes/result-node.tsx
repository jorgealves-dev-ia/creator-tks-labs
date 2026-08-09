"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";

import { signAssetUrls } from "@/lib/assets/actions";
import { t } from "@/lib/i18n/pt-BR";

/**
 * "Resultado" — a finished image, as a piece of the flow (§5).
 *
 * It stores an asset id and nothing else that could go stale: the link is signed
 * on mount, because a private bucket has no permanent address and a saved graph
 * must never carry a URL that expires tomorrow.
 *
 * The actions the specification gives it — download, use as reference, see the
 * prompt it was born from — and the output handle that makes it the input of
 * another block arrive with the chaining step. What exists here is the piece
 * itself: proof that a generation produced something, sitting on the canvas
 * connected to the block that produced it.
 */

const copy = t.generation.result;

export type ResultNodeData = {
  assetId: string;
  generationId?: string | null;
  /** Which character was in it, for the caption. Null when there was no `@`. */
  handle?: string | null;
  versionNumber?: number | null;
  aspectRatio?: string | null;
  /** The block that made it — how a second attempt knows to sit below the first. */
  sourceNodeId?: string;
};

export type ResultNodeType = Node<ResultNodeData, "result">;

export function ResultNode({ data, selected }: NodeProps<ResultNodeType>) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const assetId = data.assetId;

  useEffect(() => {
    let cancelled = false;

    void signAssetUrls([assetId]).then((urls) => {
      if (cancelled) return;

      setUrl(urls[assetId] ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return (
    <div
      className={`w-64 rounded-xl border bg-surface-raised shadow-lg shadow-black/30
                  transition-colors ${selected ? "border-accent" : "border-line"}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="truncate text-xs font-medium text-ink">{copy.title}</p>
        {data.handle ? (
          <p className="shrink-0 text-[11px] text-ink-faint">
            @{data.handle}
            {data.versionNumber ? ` v${data.versionNumber}` : ""}
          </p>
        ) : null}
      </div>

      <div
        className="relative flex items-center justify-center overflow-hidden bg-canvas
                   text-[11px] text-ink-faint"
        style={{ aspectRatio: (data.aspectRatio ?? "1:1").replace(":", " / ") }}
      >
        {url ? (
          /* A plain img: short-lived signed URLs for a private bucket. */
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={copy.alt} className="size-full object-contain" />
        ) : (
          <span className="px-4 text-center leading-relaxed">
            {loading ? copy.loading : copy.missing}
          </span>
        )}
      </div>

      {!loading && !url ? (
        <p className="border-t border-line px-3 py-2 text-[10px] leading-relaxed text-ink-faint">
          {copy.missingHint}
        </p>
      ) : null}

      <Handle
        type="target"
        position={Position.Left}
        title={copy.inputHandle}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />
    </div>
  );
}
