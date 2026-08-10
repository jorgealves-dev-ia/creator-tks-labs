"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";

import { NodeHeader } from "@/components/nodes/node-header";
import { NodeIcon } from "@/components/nodes/node-icons";
import { signAssetUrls } from "@/lib/assets/actions";
import { t } from "@/lib/i18n/pt-BR";
import { useProductsStore } from "@/lib/products/store";

/**
 * The product on the canvas: a card, and a wire.
 *
 * Like the character card, the node stores only the entity id — everything shown
 * here is read live from the store, so renaming a product or adding a fourth
 * photo updates every card of it at once and the saved graph never carries a
 * stale copy of what the product is.
 *
 * The line under the name is the whole reason this card exists rather than five
 * loose images: "3 fotos · ocupa 3 referências" is said *here*, before the wire
 * is drawn, because a ceiling discovered after the click is not a ceiling — it
 * is a surprise, and this one costs Sparks.
 */

const copy = t.products.card;

export type ProductNodeData = { entityId: string };
export type ProductNodeType = Node<ProductNodeData, "product">;

export function ProductNode({ id, data, selected }: NodeProps<ProductNodeType>) {
  const product = useProductsStore((state) => state.products[data.entityId]);
  const seeded = useProductsStore((state) => state.seeded);
  const openEditor = useProductsStore((state) => state.openEditor);

  const coverAssetId = product?.photos[0]?.assetId ?? null;
  const [cover, setCover] = useState<{ assetId: string; url: string } | null>(null);

  useEffect(() => {
    if (!coverAssetId) return;

    let cancelled = false;

    // The id is stored; the link is asked for on mount. A signed URL expires,
    // and a saved graph must never carry one (architecture decision 3).
    void signAssetUrls([coverAssetId]).then((urls) => {
      const url = urls[coverAssetId];

      if (!cancelled && url) setCover({ assetId: coverAssetId, url });
    });

    return () => {
      cancelled = true;
    };
  }, [coverAssetId]);

  if (!seeded) {
    // One frame while the store receives the server's list. Quiet on purpose:
    // "not loaded yet" must never look like "this product is gone".
    return <div className="h-[5.75rem] w-56 rounded-xl border border-line bg-surface-raised" />;
  }

  if (!product) {
    return (
      <div className="w-56 rounded-xl border border-dashed border-line bg-surface-raised p-3">
        <p className="text-xs font-medium text-ink-muted">{copy.missing}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{copy.missingHint}</p>
      </div>
    );
  }

  const count = product.photos.length;
  const coverUrl = coverAssetId && cover?.assetId === coverAssetId ? cover.url : null;

  return (
    <div
      onDoubleClick={() => openEditor(product.id)}
      title={copy.editHint}
      className={`group/node w-56 rounded-xl border bg-surface-raised shadow-lg shadow-black/30
                  transition-colors ${selected ? "border-accent" : "border-line"}`}
    >
      <NodeHeader
        nodeId={id}
        kind="product"
        title={product.displayName}
        removeHint={copy.remove}
      />

      <div className="flex items-center gap-2.5 p-3">
        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-canvas">
          {coverUrl ? (
            /* Short-lived signed URLs for a private bucket. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="size-full object-cover" />
          ) : (
            <NodeIcon kind="product" className="size-5 text-ink-faint" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          {count === 0 ? (
            <p className="truncate text-xs text-ink-faint">{copy.noPhotos}</p>
          ) : (
            <>
              <p className="truncate text-xs text-ink-muted">
                {count} {count === 1 ? copy.photoSingular : copy.photoPlural}
              </p>
              {/* The cost of the wire, in the unit the generating block counts in. */}
              <p className="truncate text-[11px] text-ink-faint">
                {copy.occupies} {count}{" "}
                {count === 1 ? copy.referenceSingular : copy.referencePlural}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={() => openEditor(product.id)}
          className="w-full rounded-lg py-1.5 text-xs font-medium text-ink-muted
                     transition-colors hover:bg-surface-hover hover:text-ink"
        >
          {copy.edit}
        </button>
      </div>

      {/* Wired into a generating block, this attaches every photo at once, as a
          unit. What the block does with them belongs to the generation phase. */}
      <Handle
        type="source"
        position={Position.Right}
        title={copy.outputHandle}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />
    </div>
  );
}
