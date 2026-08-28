"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";

import { NodeHeader } from "@/components/nodes/node-header";
import { NodeIcon } from "@/components/nodes/node-icons";
import { signAssets } from "@/lib/assets/sign-batch";
import { useReferencePicker } from "@/lib/canvas/reference-picker-store";
import { useCanvasStore } from "@/lib/canvas/store";
import { t } from "@/lib/i18n/pt-BR";

/**
 * "Input de Produto" — a name, up to five photos, and one sentence.
 *
 * This is the product editor that used to be a dialog behind a sidebar list,
 * moved onto the canvas whole. Nothing was simplified on the way: the same
 * fields, the same ceiling, the same instruction. What changed is that it is no
 * longer a *registration* — there is no Arsenal row to create before you can
 * use it, no name to invent for a thing you will use once, and no list that
 * outlives the campaign. A product is rotativo, so it lives where the work is.
 *
 * Its photos arrive at a generating block **as a unit**, which is the whole
 * reason a product is one card instead of five loose images: the compiler says
 * "these are one object photographed from several angles" once, and insists on
 * fidelity once, instead of describing five products.
 */

const copy = t.inputs.product;

/**
 * Five, and now enforced here rather than by a trigger in the database.
 *
 * That is a real move and worth naming: a product used to be a row, and the row
 * had `enforce_product_image_limit` behind it. It is node state now, so the
 * ceiling is the field below plus the Zod schema on the generation route — still
 * the server, no longer the database. The number itself is unchanged and means
 * what it always meant: each photo occupies one of the model's reference slots,
 * which is what makes "4 de 6" true in the block.
 */
const MAX_PHOTOS = 5;

export type InputProductNodeData = {
  nome?: string;
  /** Its photos, in the order they will be numbered. */
  assetIds?: string[];
  instrucao?: string;
};

export type InputProductNodeType = Node<InputProductNodeData, "input-product">;

export function InputProductNode({ id, data, selected }: NodeProps<InputProductNodeType>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  const nome = data.nome ?? "";
  const assetIds = data.assetIds ?? [];
  const instrucao = data.instrucao ?? "";

  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = assetIds.join(",");

  useEffect(() => {
    const ids = key === "" ? [] : key.split(",");

    if (ids.length === 0) return;

    let cancelled = false;

    void signAssets(ids).then((signed) => {
      if (cancelled) return;

      const thumbs = Object.fromEntries(
        Object.entries(signed).map(([id, pair]) => [id, pair.thumb]),
      );

      setUrls((current) => ({ ...current, ...thumbs }));
    });

    return () => {
      cancelled = true;
    };
    // Keyed by the ids themselves: depending on the array would re-sign on every
    // keystroke in the name field above.
  }, [key]);

  /**
   * The guard, at the source.
   *
   * How much room the *tightest* block this card feeds has left. Null when it
   * feeds none, and then only the five-photo ceiling applies. A sixth photo that
   * would not fit is refused here, with the reason visible, rather than
   * discovered as a smaller strip or an API refusal after the money is at risk
   * — the same rule as every other ceiling in this product: said before.
   */
  const freeInBlocks = useCanvasStore((state) => state.freeForInput(id));

  const atCeiling = assetIds.length >= MAX_PHOTOS;
  const blockIsFull = freeInBlocks !== null && freeInBlocks < 1;
  const canAdd = !atCeiling && !blockIsFull;

  function openPicker() {
    const roomLeft = MAX_PHOTOS - assetIds.length;

    useReferencePicker.getState().open({
      key: `${id}-${assetIds.length}`,
      scope: "produto",
      // Whichever runs out first: this card's own five, or the room left in the
      // block it feeds.
      remaining: freeInBlocks === null ? roomLeft : Math.min(roomLeft, freeInBlocks),
      limit: MAX_PHOTOS,
      onConfirm: (picked) => {
        // Read fresh: the modal outlives the render that opened it.
        const node = useCanvasStore.getState().nodes.find((entry) => entry.id === id);
        const current = Array.isArray(node?.data.assetIds)
          ? (node.data.assetIds as string[])
          : [];

        const added = picked
          .map((image) => image.assetId)
          .filter((assetId) => !current.includes(assetId));

        if (added.length > 0) {
          updateNodeData(id, { assetIds: [...current, ...added].slice(0, MAX_PHOTOS) });
        }
      },
    });
  }

  function removePhoto(assetId: string) {
    updateNodeData(id, { assetIds: assetIds.filter((entry) => entry !== assetId) });
  }

  return (
    <div
      className={`group/node w-64 rounded-xl border bg-surface-raised shadow-lg shadow-black/30
                  transition-colors ${selected ? "border-accent" : "border-line"}`}
    >
      <NodeHeader
        nodeId={id}
        kind="input-product"
        title={nome.trim() === "" ? copy.title : nome}
        removeHint={copy.remove}
      />

      <div className="p-3">
        <label
          htmlFor={`product-name-${id}`}
          className="mb-1 block text-[11px] font-medium text-ink-muted"
        >
          {copy.nameLabel}
        </label>
        <input
          id={`product-name-${id}`}
          type="text"
          value={nome}
          maxLength={120}
          placeholder={copy.namePlaceholder}
          onChange={(event) => updateNodeData(id, { nome: event.target.value })}
          className={FIELD_CLASS}
        />

        <div className="mb-1 mt-3 flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-ink-muted">{copy.photosLabel}</span>
          <span className="text-[10px] text-ink-faint">
            {assetIds.length} {copy.photosOf} {MAX_PHOTOS}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {assetIds.map((assetId) => (
            <div key={assetId} className="group/photo relative">
              <span className="block size-12 overflow-hidden rounded-md border border-line">
                {urls[assetId] ? (
                  /* Short-lived signed URLs for a private bucket. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[assetId]} alt="" className="size-full object-cover" />
                ) : (
                  <span className="block size-full bg-canvas" />
                )}
              </span>

              <button
                type="button"
                onClick={() => removePhoto(assetId)}
                title={copy.removePhotoHint}
                aria-label={copy.removePhoto}
                className="nodrag absolute -right-1 -top-1 flex size-4 items-center justify-center
                           rounded-full border border-line bg-surface text-[9px] leading-none
                           text-ink-muted opacity-0 transition-opacity
                           hover:border-negative hover:text-negative
                           focus:opacity-100 group-hover/photo:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            type="button"
            disabled={!canAdd}
            onClick={openPicker}
            title={atCeiling ? copy.full : blockIsFull ? copy.blockFull : copy.addPhoto}
            aria-label={copy.addPhoto}
            className="nodrag flex size-12 shrink-0 items-center justify-center rounded-md border
                       border-dashed border-line text-ink-faint transition-colors
                       hover:border-line-strong hover:text-ink
                       disabled:cursor-not-allowed disabled:opacity-40"
          >
            {assetIds.length === 0 ? (
              <NodeIcon kind="input-product" className="size-4" />
            ) : (
              <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {/* The refusal, in words, exactly where the click would have been. */}
        <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">
          {atCeiling ? copy.full : blockIsFull ? copy.blockFull : copy.photosHint}
        </p>

        <label
          htmlFor={`product-instruction-${id}`}
          className="mb-1 mt-3 block text-[11px] font-medium text-ink-muted"
        >
          {copy.instructionLabel}
        </label>
        <input
          id={`product-instruction-${id}`}
          type="text"
          value={instrucao}
          maxLength={400}
          placeholder={copy.instructionPlaceholder}
          onChange={(event) => updateNodeData(id, { instrucao: event.target.value })}
          className={FIELD_CLASS}
        />

        {/* The cost of the wire, in the unit the generating block counts in —
            said here, before the wire is drawn, because a ceiling discovered
            after the click is not a ceiling. */}
        <p className="mt-1.5 text-[10px] leading-relaxed text-ink-faint">
          {assetIds.length === 0
            ? copy.emptyHint
            : `${copy.occupies} ${assetIds.length} ${
                assetIds.length === 1 ? copy.referenceSingular : copy.referencePlural
              }.`}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        title={copy.outputHandle}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />
    </div>
  );
}

const FIELD_CLASS =
  "nodrag w-full rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink " +
  "placeholder:text-ink-faint transition-colors hover:border-line-strong " +
  "focus:border-accent focus:outline-none";
