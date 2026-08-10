"use client";

import { useEffect, useState } from "react";

import { signAssetUrls } from "@/lib/assets/actions";
import { findReferenceKind, REFERENCE_KINDS, type ReferenceKind, type ReferenceOrigin } from "@/lib/generation/references";
import { t } from "@/lib/i18n/pt-BR";
import { useProductsStore } from "@/lib/products/store";

/**
 * The attached references of a generation block — decision N1.
 *
 * A strip of thumbnails with a "+", not a separate node: what a block is looking
 * at belongs to the block. Clicking a thumbnail opens the two things a reference
 * can carry — what it *is* (a chip) and what to do with it (a sentence in
 * Portuguese, translated at generation time).
 *
 * Each thumbnail wears the number it will have in the prompt. That number is not
 * decoration: the compiled instruction says "the product shown in reference
 * image 2", and being able to see which image is 2 is the difference between an
 * instruction you can trust and one you have to take on faith.
 *
 * A product's photos are shown as one framed group, with one ✕ and one sentence
 * — because that is what they are to the compiler too. What the count keeps
 * saying, though, is images: three photos are three of the model's six slots,
 * and a group that looked like one item would be the strip quietly disagreeing
 * with the bill.
 */

const copy = t.generation.references;

export type ReferenceEntry = {
  assetId: string;
  kind: ReferenceKind | null;
  instrucao: string;
  origem: ReferenceOrigin;
  /** Set when this image is one photo of a product wired into the block. */
  productId?: string | null;
};

/**
 * One thing the strip draws: a lone image, or a product's photos together.
 *
 * Built from the flat list rather than replacing it — the stored shape stays one
 * entry per image, because one entry per image is what the model receives and
 * what the ceiling counts.
 */
type Slot =
  | { kind: "single"; indexes: [number]; positions: [number] }
  | { kind: "product"; productId: string; indexes: number[]; positions: number[] };

function toSlots(references: readonly ReferenceEntry[], reserved: number): Slot[] {
  const slots: Slot[] = [];
  const byProduct = new Map<string, Extract<Slot, { kind: "product" }>>();

  references.forEach((reference, index) => {
    const position = reserved + index + 1;
    const productId = reference.productId ?? null;

    if (!productId) {
      slots.push({ kind: "single", indexes: [index], positions: [position] });
      return;
    }

    const existing = byProduct.get(productId);

    if (existing) {
      existing.indexes.push(index);
      existing.positions.push(position);
      return;
    }

    const slot: Extract<Slot, { kind: "product" }> = {
      kind: "product",
      productId,
      indexes: [index],
      positions: [position],
    };

    byProduct.set(productId, slot);
    slots.push(slot);
  });

  return slots;
}

type ReferenceStripProps = {
  references: readonly ReferenceEntry[];
  /** The model's ceiling for this generation, references and sheet together. */
  limit: number;
  /** 1 when a mentioned character brings its own sheet, which occupies a slot. */
  reserved: number;
  disabled: boolean;
  onChange: (next: ReferenceEntry[]) => void;
  onAdd: () => void;
  /** Removes by index, taking the wire with it when it came by wire. */
  onRemove: (index: number) => void;
};

export function ReferenceStrip({
  references,
  limit,
  reserved,
  disabled,
  onChange,
  onAdd,
  onRemove,
}: ReferenceStripProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const products = useProductsStore((state) => state.products);

  const assetIds = references.map((reference) => reference.assetId);
  const key = assetIds.join(",");

  useEffect(() => {
    if (assetIds.length === 0) return;

    let cancelled = false;

    void signAssetUrls(assetIds).then((signed) => {
      if (!cancelled) setUrls((current) => ({ ...current, ...signed }));
    });

    return () => {
      cancelled = true;
    };
    // Keyed by the ids themselves: re-signing on every render of the parent
    // would be a request per keystroke in the prompt above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const used = references.length + reserved;
  const full = used >= limit;

  const slots = toSlots(references, reserved);
  const open = openSlot !== null ? slots[openSlot] : undefined;
  // Every entry of a group carries the same sentence, so the first one speaks
  // for all of them — in the strip as in the compiler.
  const openEntry = open ? references[open.indexes[0]] : undefined;

  /** Applies a change to every image of a slot — one image, or a whole product. */
  function patch(indexes: readonly number[], changes: Partial<ReferenceEntry>) {
    const touched = new Set(indexes);

    onChange(references.map((entry, i) => (touched.has(i) ? { ...entry, ...changes } : entry)));
  }

  /** Removing any image of a product removes the product; the store enforces it. */
  function remove(index: number) {
    setOpenSlot(null);
    onRemove(index);
  }

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-ink-muted">{copy.title}</span>
        <span className="text-[10px] text-ink-faint">
          {used} {copy.ofPrefix} {limit}
          {reserved > 0 ? ` · ${copy.sheetCounts}` : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-1.5">
        {slots.map((slot, slotIndex) => {
          const entry = references[slot.indexes[0]];
          const selected = openSlot === slotIndex;

          if (!entry) return null;

          const thumbs = slot.indexes.map((index, offset) => (
            <Thumbnail
              key={`${references[index].assetId}-${index}`}
              url={urls[references[index].assetId]}
              position={slot.positions[offset]}
              marked={
                references[index].instrucao.trim() !== "" || references[index].kind !== null
              }
            />
          ));

          return (
            <div key={`${entry.assetId}-${slot.indexes[0]}`} className="group/ref relative">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setOpenSlot(selected ? null : slotIndex)}
                title={
                  slot.kind === "product"
                    ? `${copy.productPrefix} ${products[slot.productId]?.displayName ?? ""}`.trim()
                    : `${copy.imagePrefix} ${slot.positions[0]}`
                }
                className={`nodrag block rounded-md transition-colors disabled:opacity-50 ${
                  slot.kind === "product"
                    ? `border border-dashed p-1 ${
                        selected ? "border-accent" : "border-line hover:border-line-strong"
                      }`
                    : `border ${selected ? "border-accent" : "border-line hover:border-line-strong"}`
                }`}
              >
                {slot.kind === "product" ? (
                  <>
                    <span className="mb-1 block max-w-36 truncate px-0.5 text-left text-[9px] text-ink-faint">
                      {products[slot.productId]?.displayName ?? copy.productUnknown}
                    </span>
                    <span className="flex gap-1">{thumbs}</span>
                  </>
                ) : (
                  thumbs
                )}
              </button>

              {/*
                The obvious way out.
                Removing an attached image used to live only behind the editor
                panel below — you had to open the thumbnail to find it. An image
                you can add with one click and only remove after a detour is an
                image that stays attached by accident.
                Visible on hover and on keyboard focus, never on touch-only
                hover alone: focus-within is what keeps it reachable by Tab.
                One ✕ per slot, so a product leaves the way it arrived.
              */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(slot.indexes[0])}
                title={slot.kind === "product" ? copy.removeProduct : copy.remove}
                aria-label={
                  slot.kind === "product"
                    ? `${copy.removeProduct} — ${products[slot.productId]?.displayName ?? ""}`.trim()
                    : `${copy.remove} — ${copy.imagePrefix} ${slot.positions[0]}`
                }
                className="nodrag absolute -right-1 -top-1 flex size-4 items-center justify-center
                           rounded-full border border-line bg-surface text-[9px] leading-none
                           text-ink-muted opacity-0 transition-opacity
                           hover:border-negative hover:text-negative
                           focus:opacity-100 group-hover/ref:opacity-100
                           disabled:cursor-not-allowed"
              >
                ✕
              </button>
            </div>
          );
        })}

        <button
          type="button"
          disabled={disabled || full}
          onClick={onAdd}
          title={full ? `${copy.fullPrefix} ${limit} ${copy.fullSuffix}` : copy.add}
          aria-label={copy.add}
          className="nodrag flex size-12 shrink-0 items-center justify-center rounded-md border
                     border-dashed border-line text-ink-faint transition-colors
                     hover:border-line-strong hover:text-ink
                     disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && openEntry ? (
        <div className="mt-2 rounded-lg border border-line bg-surface p-2">
          {open.kind === "product" ? (
            /* A product's photos are products — the chip is not a question the
               block gets to ask again. Leaving it open would let one photo of a
               bikini be labelled "cenário" while the other two stayed "produto",
               and the compiled prompt would describe two different things. */
            <p className="mb-1.5 text-[10px] text-ink-faint">
              {copy.productFixedKind} {findReferenceKind("produto")?.pt}
            </p>
          ) : (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {REFERENCE_KINDS.map((kind) => (
                <button
                  key={kind.key}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    patch(open.indexes, {
                      kind: openEntry.kind === kind.key ? null : kind.key,
                    })
                  }
                  className={`nodrag rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                    openEntry.kind === kind.key
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {kind.pt}
                </button>
              ))}
            </div>
          )}

          <input
            type="text"
            value={openEntry.instrucao}
            disabled={disabled}
            maxLength={400}
            placeholder={copy.instructionPlaceholder}
            onChange={(event) => patch(open.indexes, { instrucao: event.target.value })}
            className="nodrag w-full rounded-md border border-line bg-surface-raised px-2 py-1
                       text-[11px] text-ink placeholder:text-ink-faint transition-colors
                       hover:border-line-strong focus:border-accent focus:outline-none
                       disabled:opacity-50"
          />

          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[10px] leading-relaxed text-ink-faint">
              {open.kind === "product" ? copy.productInstructionHint : copy.instructionHint}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => remove(open.indexes[0])}
              className="nodrag shrink-0 text-[10px] text-ink-faint transition-colors
                         hover:text-negative disabled:opacity-50"
            >
              {open.kind === "product" ? copy.removeProduct : copy.remove}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** One attached image, wearing the number it will have in the prompt. */
function Thumbnail({
  url,
  position,
  marked,
}: {
  url: string | undefined;
  position: number;
  marked: boolean;
}) {
  return (
    <span className="relative block size-12 shrink-0 overflow-hidden rounded">
      {url ? (
        /* Short-lived signed URLs for a private bucket. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span className="block size-full bg-canvas" />
      )}

      <span className="absolute left-0 top-0 rounded-br bg-canvas/85 px-1 text-[9px] font-medium text-ink">
        {position}
      </span>

      {marked ? (
        <span
          aria-hidden
          title={copy.hasDirective}
          className="absolute bottom-0.5 right-0.5 size-1.5 rounded-full bg-accent"
        />
      ) : null}
    </span>
  );
}
