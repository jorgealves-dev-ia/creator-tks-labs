"use client";

import { useEffect, useRef, useState } from "react";

import { signAssets } from "@/lib/assets/sign-batch";
import {
  anchorLabel,
  positionsLabel,
  referenceSourceTooltip,
} from "@/lib/generation/reference-labels";
import { findReferenceKind, REFERENCE_KINDS, type ReferenceKind, type ReferenceOrigin } from "@/lib/generation/references";
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
  /** Set when this image arrived with others that count as one thing. */
  groupId?: string | null;
  /** What to call the group. Rewritten by the store on every edit of the card. */
  groupLabel?: string;
  /** Which specialised input handed it over: "pose", "folha", or nothing. */
  papel?: string | null;
  /** The node type of the card it came from — what the tooltip names. */
  inputType?: string | null;
};

/**
 * The sheet a mentioned character brings with it: image 1, always, and not a
 * reference input at all.
 *
 * It is shown here because the strip is where somebody counts the images that
 * are about to be sent, and a strip whose first removable thumbnail is numbered
 * 2 owes an explanation for the 1. It is not removable, not editable and not
 * silenced by the switch — the mute has no opinion about the `@`.
 */
export type ReferenceAnchor = {
  assetId: string;
  handle: string;
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
  | { kind: "group"; groupId: string; indexes: number[]; positions: number[] };

function toSlots(references: readonly ReferenceEntry[], reserved: number): Slot[] {
  const slots: Slot[] = [];
  const byGroup = new Map<string, Extract<Slot, { kind: "group" }>>();

  references.forEach((reference, index) => {
    const position = reserved + index + 1;
    const groupId = reference.groupId ?? null;

    if (!groupId) {
      slots.push({ kind: "single", indexes: [index], positions: [position] });
      return;
    }

    const existing = byGroup.get(groupId);

    if (existing) {
      existing.indexes.push(index);
      existing.positions.push(position);
      return;
    }

    const slot: Extract<Slot, { kind: "group" }> = {
      kind: "group",
      groupId,
      indexes: [index],
      positions: [position],
    };

    byGroup.set(groupId, slot);
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
  /** That sheet, when there is one — drawn as image 1 and nothing else. */
  anchor: ReferenceAnchor | null;
  /**
   * Whether the attached images are heard at all.
   *
   * Off is the resting state, including the moment something is wired in — see
   * the switch below for why. Off is not the same as having nothing attached,
   * and that difference is the whole point of the switch existing.
   */
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onChange: (next: ReferenceEntry[]) => void;
  onAdd: () => void;
  /** Removes by index, taking the wire with it when it came by wire. */
  onRemove: (index: number) => void;
};

export function ReferenceStrip({
  references,
  limit,
  reserved,
  anchor,
  enabled,
  onEnabledChange,
  onChange,
  onAdd,
  onRemove,
}: ReferenceStripProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [openSlot, setOpenSlot] = useState<number | null>(null);

  /**
   * The nudge.
   *
   * Something was just attached to a block that is not listening to anything —
   * which is a perfectly reasonable thing to have done, and also a thing with
   * one obvious next step. A sweep of light across the switch and its label,
   * three times, says "here" without saying "wrong".
   *
   * Fires on anything arriving, not only on a wire: choosing an image from the
   * gallery lands the user in exactly the same place, and a hint that only
   * appeared for one of the two ways in would be a hint you cannot rely on.
   *
   * The ref starts at the mounted count, so reopening a project with references
   * already attached is silent. Nothing arrived; nothing happened.
   */
  const [shimmering, setShimmering] = useState(false);
  const previousCount = useRef(references.length);

  useEffect(() => {
    const grew = references.length > previousCount.current;

    previousCount.current = references.length;

    if (!grew || enabled) return;

    setShimmering(true);

    // Slightly past three passes of 1.15s, so the class is gone once the
    // animation has finished rather than while its last frame is drawing.
    const timer = window.setTimeout(() => setShimmering(false), 3600);

    return () => window.clearTimeout(timer);
  }, [references.length, enabled]);

  // The anchor is signed with the rest: it is one more private image this strip
  // has to draw, and one more entry in the key means a mention appearing or
  // disappearing re-signs exactly once.
  const assetIds = [
    ...(anchor ? [anchor.assetId] : []),
    ...references.map((reference) => reference.assetId),
  ];
  const key = assetIds.join(",");

  useEffect(() => {
    if (assetIds.length === 0) return;

    let cancelled = false;

    void signAssets(assetIds).then((signed) => {
      if (cancelled) return;

      // A faixa é espelho, em quadros de poucas dezenas de pixels. O que viaja
      // para o provedor não é isto: o servidor baixa o original por
      // `storage_path` na hora de gerar (`asset-payloads.ts`).
      const thumbs = Object.fromEntries(
        Object.entries(signed).map(([id, pair]) => [id, pair.thumb]),
      );

      setUrls((current) => ({ ...current, ...thumbs }));
    });

    return () => {
      cancelled = true;
    };
    // Keyed by the ids themselves: re-signing on every render of the parent
    // would be a request per keystroke in the prompt above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /**
   * What will actually travel, which is what the counter has to say.
   *
   * Muted references count for nothing here — and the sheet of a mentioned
   * character still counts for one, because it is not a reference input: it is
   * the anchor of the `@`, and the mute has no opinion about the `@`. Saying
   * "0 de 6" with an image on its way would be the strip lying in the one place
   * it exists to tell the truth.
   */
  const used = (enabled ? references.length : 0) + reserved;

  /**
   * The ceiling, on the other hand, counts everything that is attached —
   * muted or not. It has to: turning the switch back on must never produce a
   * block holding more images than the model accepts.
   */
  const full = references.length + reserved >= limit;

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
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          {/* The switch is always here, whether or not anything is attached.
              A control that appears when the first image arrives is a control
              nobody knows exists until they have already tripped over it. */}
          <span className="relative flex min-w-0 items-center gap-1.5 overflow-hidden rounded">
            <InputsSwitch
              on={enabled}
              onToggle={() => onEnabledChange(!enabled)}
            />

            <span className="truncate text-[11px] font-medium text-ink-muted">
              {copy.title}
              {!enabled && references.length > 0 ? (
                <span className="font-normal text-warning"> · {copy.muted}</span>
              ) : null}
            </span>

            {shimmering ? (
              <span
                aria-hidden
                className="animate-strip-shimmer pointer-events-none absolute inset-y-0 -left-8
                           w-8 bg-gradient-to-r from-transparent via-ink/25 to-transparent"
              />
            ) : null}
          </span>

          {/* Outside the sheen's wrapper, which clips its own overflow — a
              tooltip inside it would be cut off at the edge of the label. */}
          <HelpTip />
        </span>

        <span className="shrink-0 text-[10px] text-ink-faint">
          {used} {copy.ofPrefix} {limit}
          {reserved > 0 ? ` · ${copy.sheetCounts}` : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-1.5">
        {/*
          Image 1, when a mention brings one.

          Dashed and dimmed because it is not this block's to change: no ✕, no
          chip, no sentence. It is here to answer the question the numbers
          raise — why does the first thumbnail you can remove say "2"? — and to
          make "a folha conta uma" something you can see rather than a claim in
          a counter. The switch does not grey it either: muting silences the
          reference inputs, and the anchor of an `@` is not one of them.
        */}
        {anchor ? (
          <div
            title={anchorLabel(anchor.handle)}
            className="rounded-md border border-dashed border-line-strong p-px"
          >
            <Thumbnail url={urls[anchor.assetId]} position={1} marked={false} />
          </div>
        ) : null}

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
                onClick={() => setOpenSlot(selected ? null : slotIndex)}
                /*
                  Which card this came from, asked rather than assumed.
                  It used to read "grupo ⇒ produto", and every input card stamps
                  its node id as a group id — so a character sheet arrived
                  labelled "Produto:" with an empty name. The thumbnail now says
                  what is on the canvas a wire away from it.
                */
                title={`${positionsLabel(slot.positions)} · ${referenceSourceTooltip(entry)}`}
                /* The dashed frame says "these several images are one thing", so
                   it belongs to slots that hold several. Keyed off `kind ===
                   "group"` it appeared around every input card's single
                   picture, which said the same thing about one image — and
                   said it in the visual vocabulary of a product. */
                className={`nodrag block rounded-md transition-colors disabled:opacity-50 ${
                  slot.indexes.length > 1
                    ? `border border-dashed p-1 ${
                        selected ? "border-accent" : "border-line hover:border-line-strong"
                      }`
                    : `border ${selected ? "border-accent" : "border-line hover:border-line-strong"}`
                }`}
              >
                {/* Greyed, not hidden. A muted reference is still attached, and
                    an attachment you cannot see is one you will forget to turn
                    back on. */}
                <span className={enabled ? "block" : "block opacity-40 grayscale"}>
                  {/* The frame and the name are what say "these several images
                      are one thing". A group of one is not several images, so
                      it wears neither — an input handing over a single picture
                      should look like a single picture. */}
                  {slot.indexes.length > 1 ? (
                    <>
                      <span className="mb-1 block max-w-36 truncate px-0.5 text-left text-[9px] text-ink-faint">
                        {groupNameOf(references, slot) ?? copy.groupUnknown}
                      </span>
                      <span className="flex gap-1">{thumbs}</span>
                    </>
                  ) : (
                    thumbs
                  )}
                </span>
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
                onClick={() => remove(slot.indexes[0])}
                title={slot.indexes.length > 1 ? copy.removeGroup : copy.remove}
                aria-label={`${slot.indexes.length > 1 ? copy.removeGroup : copy.remove} — ${positionsLabel(
                  slot.positions,
                )} · ${referenceSourceTooltip(entry)}`}
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
          disabled={full}
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
          {open.kind === "group" ? (
            /* What arrived through a card is decided on that card — the chip
               included. Leaving it open here would let one photo of a bikini be
               labelled "cenário" while the other two stayed "produto", and the
               compiled prompt would describe two different things.
               What it says had to change, though: this line announced "Tipo
               fixo: Produto" for everything, so a character sheet handed over by
               its own card was introduced as a product. It now names the card
               and the chip that card actually pinned. */
            <p className="mb-1.5 text-[10px] text-ink-faint">
              {copy.fixedByCard} {referenceSourceTooltip(openEntry)}
              {findReferenceKind(openEntry.kind)
                ? ` · ${findReferenceKind(openEntry.kind)?.pt}`
                : ""}
            </p>
          ) : (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {REFERENCE_KINDS.map((kind) => (
                <button
                  key={kind.key}
                  type="button"
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
              {open.indexes.length > 1 ? copy.groupInstructionHint : copy.instructionHint}
            </span>
            <button
              type="button"
              onClick={() => remove(open.indexes[0])}
              className="nodrag shrink-0 text-[10px] text-ink-faint transition-colors
                         hover:text-negative disabled:opacity-50"
            >
              {open.indexes.length > 1 ? copy.removeGroup : copy.remove}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The switch that decides whether the attached images enter the generation.
 *
 * Reinstated on 10/08/2026 after being argued against and dropped, because the
 * case that won is a working one: to see what a character looks like *without*
 * four references pulling at her, the alternative was to detach all of them,
 * generate, and attach them again — losing the chips, the sentences and the
 * wires, to ask one question. A mute answers it in one click and gives
 * everything back in a second one.
 *
 * **It is born off, and stays off until someone turns it on** — including at
 * the moment something is wired in. Connecting never flips it. The base case of
 * this block is a generation with no references at all ("uma imagem de um
 * cachorro"); defaulting to on would treat the exception as the rule, and would
 * quietly put images into generations nobody asked to put them into.
 *
 * Rendered as a switch and not a checkbox because that is what it is: the state
 * it names is "these are being heard", and the thing it must never look like is
 * "delete these".
 */
function InputsSwitch({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={copy.switchHint}
      aria-label={copy.switchLabel}
      onClick={onToggle}
      className={`nodrag flex h-3.5 w-6 shrink-0 items-center rounded-full p-0.5
                  transition-colors disabled:cursor-not-allowed disabled:opacity-50
                  ${on ? "bg-accent" : "bg-surface-hover"}`}
    >
      <span
        className={`size-2.5 rounded-full bg-canvas transition-transform
                    ${on ? "translate-x-2.5" : "translate-x-0"}`}
      />
    </button>
  );
}

/**
 * The one sentence that explains the whole mechanism, on hover.
 *
 * A custom bubble rather than the native `title` this file uses everywhere else,
 * for one reason: `title` waits about a second, renders in the operating
 * system's font at the operating system's size, and truncates where it feels
 * like. That is fine for "Remover" and wrong for the only text in the block that
 * teaches somebody how the block works.
 *
 * Reachable by keyboard as well as pointer — `focus-within` on the wrapper is
 * what makes tabbing to the "?" show the same thing hovering does.
 */
function HelpTip() {
  return (
    <span className="group/help relative flex shrink-0">
      <button
        type="button"
        aria-label={copy.helpLabel}
        className="nodrag flex size-3.5 items-center justify-center rounded-full border
                   border-line text-[9px] leading-none text-ink-faint transition-colors
                   hover:border-line-strong hover:text-ink"
      >
        ?
      </button>

      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 w-56 -translate-x-1/2
                   rounded-lg border border-line bg-surface-raised p-2 text-[10px] leading-relaxed
                   text-ink-muted opacity-0 shadow-lg shadow-black/40 transition-opacity
                   group-hover/help:opacity-100 group-focus-within/help:opacity-100"
      >
        {copy.helpBody}
      </span>
    </span>
  );
}

/**
 * What to call a group, from the reference itself.
 *
 * Stored on the entry rather than looked up in a store, because the thing being
 * named is a card on this canvas and the store already rewrites the label on
 * every edit of that card — so a rename arrives in the same pass that carries
 * the photos. The fallback covers the product cards of the old Arsenal, whose
 * name still lives in their own store; it goes away with them.
 */
function groupNameOf(references: readonly ReferenceEntry[], slot: Slot): string | null {
  const label = references[slot.indexes[0]]?.groupLabel?.trim();

  return label ? label : null;
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
