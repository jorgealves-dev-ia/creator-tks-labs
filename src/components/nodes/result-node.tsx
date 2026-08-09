"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";

import { signAssetUrls } from "@/lib/assets/actions";
import { usePromptInspector } from "@/lib/canvas/prompt-inspector-store";
import { useCanvasStore } from "@/lib/canvas/store";
import { signAssetDownload } from "@/lib/generation/history";
import { t } from "@/lib/i18n/pt-BR";

/**
 * "Resultado" — a finished image, as a piece of the flow (§5).
 *
 * It stores an asset id and nothing else that could go stale: the link is signed
 * on mount, because a private bucket has no permanent address and a saved graph
 * must never carry a URL that expires tomorrow.
 *
 * Its output handle is what turns a canvas from a pile of attempts into a flow:
 * wired into a generating block, this image becomes that block's reference. And
 * "usar como referência" is that same wire as one click, for when there is no
 * block to wire it to yet.
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

export function ResultNode({ id, data, selected }: NodeProps<ResultNodeType>) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const addChainedGenerator = useCanvasStore((state) => state.addChainedGenerator);
  const inspect = usePromptInspector((state) => state.open);

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
      ) : (
        <div className="flex items-center justify-between gap-1 border-t border-line px-2 py-1.5">
          <button
            type="button"
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);

              const href = await signAssetDownload(assetId);

              setDownloading(false);

              // An ordinary anchor: the disposition is signed into the URL, so
              // the browser saves the file without the bytes passing through
              // this page at all.
              if (href) {
                const anchor = document.createElement("a");
                anchor.href = href;
                anchor.rel = "noopener";
                anchor.click();
              }
            }}
            className="nodrag rounded px-1.5 py-1 text-[10px] text-ink-faint transition-colors
                       hover:bg-surface-hover hover:text-ink disabled:opacity-50"
          >
            {downloading ? copy.downloading : copy.download}
          </button>

          <button
            type="button"
            title={copy.useAsReferenceHint}
            onClick={() => addChainedGenerator({ resultNodeId: id })}
            className="nodrag rounded px-1.5 py-1 text-[10px] text-ink-faint transition-colors
                       hover:bg-surface-hover hover:text-ink"
          >
            {copy.useAsReference}
          </button>

          <button
            type="button"
            disabled={!data.generationId}
            title={data.generationId ? undefined : copy.noGeneration}
            onClick={() => {
              if (data.generationId) inspect(data.generationId);
            }}
            className="nodrag rounded px-1.5 py-1 text-[10px] text-ink-faint transition-colors
                       hover:bg-surface-hover hover:text-ink
                       disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.seePrompt}
          </button>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        title={copy.inputHandle}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />

      {/* The wire that makes this image the input of the next block. */}
      <Handle
        type="source"
        position={Position.Right}
        title={copy.outputHandle}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />
    </div>
  );
}
