"use client";

import { type Node, type NodeProps } from "@xyflow/react";

import { NodeHeader } from "@/components/nodes/node-header";
import { t } from "@/lib/i18n/pt-BR";

/**
 * A headstone for the Produto card of the Arsenal.
 *
 * The card type is gone — a product is an input node now, configured on the
 * canvas instead of registered in the rail. But a graph saved yesterday may
 * still contain one, and React Flow given an unknown node type draws nothing:
 * the card would vanish, its wire would dangle, and the only clue would be a
 * warning in a console nobody has open.
 *
 * So the type stays, emptied. It says what happened, points at where the
 * replacement lives, and offers the one action that makes sense. It reads
 * nothing — no store, no query, no photo — because the whole point of this
 * commit is that the machinery behind it no longer exists.
 *
 * Deletable in every sense: the day no saved graph contains one of these, this
 * file and its entry in `nodeTypes` go too.
 */

const copy = t.inputs.legacyProduct;

export type LegacyProductNodeType = Node<Record<string, unknown>, "product">;

export function LegacyProductNode({ id, selected }: NodeProps<LegacyProductNodeType>) {
  return (
    <div
      className={`group/node w-56 rounded-xl border border-dashed bg-surface-raised/60 shadow-lg
                  shadow-black/20 transition-colors ${selected ? "border-accent" : "border-line"}`}
    >
      <NodeHeader nodeId={id} kind="product" title={copy.title} removeHint={copy.remove} />

      <p className="p-3 text-[11px] leading-relaxed text-ink-faint">{copy.body}</p>
    </div>
  );
}
