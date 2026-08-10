"use client";

import { useState } from "react";

import { NodeIcon, type NodeKind } from "@/components/nodes/node-icons";
import { useCanvasStore } from "@/lib/canvas/store";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The header every block on the canvas wears: icon, name, duplicate, remove.
 *
 * Before this existed, each card had invented its own top edge — the character
 * had a floating ✕ that meant "put away", the generating block had a title and
 * no actions at all, and the result had a caption. Three cards, three grammars,
 * and the two actions someone actually reaches for missing from two of them.
 *
 * The two rules the header enforces, so no card has to remember them:
 *
 *   removing never destroys   A card leaves the canvas; the character goes back
 *                             to the Arsenal, the image stays in the gallery.
 *                             The only thing a removal can truly lose is what
 *                             lives *in the graph* — a prompt somebody wrote —
 *                             and that is the one case that asks first.
 *
 *   duplicating copies the    A generating block is a recipe worth repeating.
 *   question, never the       Its results are not part of the recipe, so they
 *   answer                    never come along.
 */

const copy = t.canvasNode;

type NodeHeaderProps = {
  nodeId: string;
  kind: NodeKind;
  title: string;
  /** The right-hand slot: cost and balance, `@handle v2` — whatever the card says. */
  meta?: React.ReactNode;
  /** What the remove button promises, in this card's own words. */
  removeHint: string;
  /**
   * True when removing would lose something the graph cannot get back — a prompt
   * that was typed, references that were attached. Everything else removes on the
   * first click, because asking about a card that loses nothing trains people to
   * click "yes" without reading.
   */
  confirmRemove?: boolean;
  /** Replaces the plain removal, for the card that animates on its way out. */
  onRemove?: () => void;
  /** Set when duplicating this card would create nothing: the reason, shown. */
  duplicateDisabledReason?: string;
};

export function NodeHeader({
  nodeId,
  kind,
  title,
  meta,
  removeHint,
  confirmRemove = false,
  onRemove,
  duplicateDisabledReason,
}: NodeHeaderProps) {
  const [confirming, setConfirming] = useState(false);

  function remove() {
    if (onRemove) {
      onRemove();
      return;
    }

    useCanvasStore.getState().onNodesChange([{ type: "remove", id: nodeId }]);
  }

  return (
    <div className="flex items-center gap-2 border-b border-line px-3 py-2">
      <NodeIcon kind={kind} className="size-3.5 shrink-0 text-ink-faint" />

      <p className="min-w-0 flex-1 truncate text-xs font-medium text-ink">{title}</p>

      {confirming ? (
        /* The same shape the project tabs use for the same question — a row of
           two words in place of the actions, never a browser dialog. */
        <span className="flex shrink-0 items-center gap-1">
          <span className="text-[10px] text-ink-muted">{copy.removeConfirm}</span>
          <button
            type="button"
            onClick={remove}
            className="nodrag rounded px-1.5 py-0.5 text-[10px] text-negative
                       transition-colors hover:bg-negative/15"
          >
            {copy.yes}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            autoFocus
            className="nodrag rounded px-1.5 py-0.5 text-[10px] text-ink-muted
                       transition-colors hover:bg-surface-hover hover:text-ink"
          >
            {copy.no}
          </button>
        </span>
      ) : (
        <>
          {meta ? <span className="shrink-0">{meta}</span> : null}

          {/* Revealed by the card, not by the strip: someone looking for the
              actions hovers the block, not the two pixels they live in.
              focus-within is what keeps them reachable by Tab. */}
          <span
            className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity
                       focus-within:opacity-100 group-hover/node:opacity-100"
          >
            <button
              type="button"
              disabled={duplicateDisabledReason !== undefined}
              title={duplicateDisabledReason ?? copy.duplicate}
              aria-label={copy.duplicate}
              onClick={() => useCanvasStore.getState().duplicateNode(nodeId)}
              className={ACTION_CLASS}
            >
              <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
                <rect
                  x="1.5"
                  y="1.5"
                  width="8"
                  height="8"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  fill="none"
                />
                <path
                  d="M4.5 12.5h6a2 2 0 002-2v-6"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <button
              type="button"
              title={removeHint}
              aria-label={removeHint}
              onClick={() => (confirmRemove ? setConfirming(true) : remove())}
              className={`${ACTION_CLASS} hover:!text-negative`}
            >
              <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
                <path
                  d="M3.5 3.5l7 7M10.5 3.5l-7 7"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        </>
      )}
    </div>
  );
}

const ACTION_CLASS =
  "nodrag flex size-5 items-center justify-center rounded text-ink-faint transition-colors " +
  "hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed " +
  "disabled:hover:bg-transparent disabled:hover:text-ink-faint disabled:opacity-40";
