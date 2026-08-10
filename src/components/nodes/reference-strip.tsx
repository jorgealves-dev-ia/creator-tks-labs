"use client";

import { useEffect, useState } from "react";

import { signAssetUrls } from "@/lib/assets/actions";
import { REFERENCE_KINDS, type ReferenceKind, type ReferenceOrigin } from "@/lib/generation/references";
import { t } from "@/lib/i18n/pt-BR";

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
 */

const copy = t.generation.references;

export type ReferenceEntry = {
  assetId: string;
  kind: ReferenceKind | null;
  instrucao: string;
  origem: ReferenceOrigin;
};

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
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
  const open = openIndex !== null ? references[openIndex] : undefined;

  function patch(index: number, changes: Partial<ReferenceEntry>) {
    onChange(references.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)));
  }

  function remove(index: number) {
    setOpenIndex(null);
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

      <div className="flex flex-wrap gap-1.5">
        {references.map((reference, index) => {
          const position = reserved + index + 1;
          const url = urls[reference.assetId];

          return (
            <div key={`${reference.assetId}-${index}`} className="group/ref relative">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                title={`${copy.imagePrefix} ${position}`}
                className={`nodrag relative block size-12 shrink-0 overflow-hidden rounded-md border
                            transition-colors disabled:opacity-50 ${
                              openIndex === index
                                ? "border-accent"
                                : "border-line hover:border-line-strong"
                            }`}
              >
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

                {reference.instrucao.trim() !== "" || reference.kind ? (
                  <span
                    aria-hidden
                    title={copy.hasDirective}
                    className="absolute bottom-0.5 right-0.5 size-1.5 rounded-full bg-accent"
                  />
                ) : null}
              </button>

              {/*
                The obvious way out.
                Removing an attached image used to live only behind the editor
                panel below — you had to open the thumbnail to find it. An image
                you can add with one click and only remove after a detour is an
                image that stays attached by accident.
                Visible on hover and on keyboard focus, never on touch-only
                hover alone: focus-within is what keeps it reachable by Tab.
              */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(index)}
                title={copy.remove}
                aria-label={`${copy.remove} — ${copy.imagePrefix} ${position}`}
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

      {open && openIndex !== null ? (
        <div className="mt-2 rounded-lg border border-line bg-surface p-2">
          <div className="mb-1.5 flex flex-wrap gap-1">
            {REFERENCE_KINDS.map((kind) => (
              <button
                key={kind.key}
                type="button"
                disabled={disabled}
                onClick={() =>
                  patch(openIndex, { kind: open.kind === kind.key ? null : kind.key })
                }
                className={`nodrag rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                  open.kind === kind.key
                    ? "border-accent bg-accent-soft text-ink"
                    : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                {kind.pt}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={open.instrucao}
            disabled={disabled}
            maxLength={400}
            placeholder={copy.instructionPlaceholder}
            onChange={(event) => patch(openIndex, { instrucao: event.target.value })}
            className="nodrag w-full rounded-md border border-line bg-surface-raised px-2 py-1
                       text-[11px] text-ink placeholder:text-ink-faint transition-colors
                       hover:border-line-strong focus:border-accent focus:outline-none
                       disabled:opacity-50"
          />

          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] text-ink-faint">{copy.instructionHint}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => remove(openIndex)}
              className="nodrag text-[10px] text-ink-faint transition-colors hover:text-negative
                         disabled:opacity-50"
            >
              {copy.remove}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
