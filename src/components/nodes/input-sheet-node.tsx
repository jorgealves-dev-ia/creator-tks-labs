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
 * "Input de Character Sheet" — a reference sheet handed in as an image.
 *
 * It **adds to** the `@`, never competes with it. A mention already attaches the
 * frozen version's own sheet as image 1 with its anchor clauses; this card is
 * for the second sheet — one generated later, one from another version, one that
 * shows an angle the canonical grid does not.
 *
 * The clause it carries is written to be true in both worlds: alone, it is the
 * identity of the call; beside a mention, it is one of several identity
 * references that are stated to be *the same person*. That second sentence is
 * the whole trick — it is what lets a model combine two sheets instead of
 * averaging two strangers.
 */

const copy = t.inputs.sheet;

export type InputSheetNodeData = {
  assetId?: string | null;
  /** Optional sentence in Portuguese, translated at generation time. */
  instrucao?: string;
};

export type InputSheetNodeType = Node<InputSheetNodeData, "input-sheet">;

export function InputSheetNode({ id, data, selected }: NodeProps<InputSheetNodeType>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  const assetId = data.assetId ?? null;
  const instrucao = data.instrucao ?? "";

  /**
   * The signed link, remembered next to the asset it belongs to.
   *
   * Keeping the pair rather than a lone string is what makes the frame go blank
   * the instant the card points somewhere else, instead of showing the previous
   * picture until a request comes back — and it derives the answer rather than
   * clearing it in an effect, which would be a second render telling the truth
   * after a first one told a lie.
   */
  const [signed, setSigned] = useState<{ assetId: string; url: string } | null>(null);
  const url = assetId && signed?.assetId === assetId ? signed.url : null;

  useEffect(() => {
    if (!assetId) return;

    let cancelled = false;

    void signAssets([assetId]).then((urls) => {
      // O card desenha pequeno: miniatura. Ampliar é o Lightbox, que reassina.
      const link = urls[assetId]?.thumb;

      if (!cancelled && link) setSigned({ assetId, url: link });
    });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  function choose() {
    useReferencePicker.getState().open({
      key: id,
      scope: "input",
      // One image, and the picker enforces it. Replacing rather than adding is
      // the whole gesture here: this node *is* one picture.
      remaining: 1,
      limit: 1,
      onConfirm: (picked) => {
        const image = picked[0];

        if (image) updateNodeData(id, { assetId: image.assetId });
      },
    });
  }

  return (
    <div
      className={`group/node w-56 rounded-xl border bg-surface-raised shadow-lg shadow-black/30
                  transition-colors ${selected ? "border-accent" : "border-line"}`}
    >
      <NodeHeader nodeId={id} kind="input-sheet" title={copy.title} removeHint={copy.remove} />

      <div className="p-3">
        <button
          type="button"
          onClick={choose}
          title={assetId ? copy.replace : copy.choose}
          className="nodrag flex aspect-square w-full items-center justify-center overflow-hidden
                     rounded-lg border border-dashed border-line bg-canvas text-[11px]
                     text-ink-faint transition-colors hover:border-line-strong hover:text-ink"
        >
          {url ? (
            /* Short-lived signed URLs for a private bucket. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1.5 px-3 text-center leading-relaxed">
              <NodeIcon kind="input-sheet" className="size-5" />
              {assetId ? copy.loading : copy.choose}
            </span>
          )}
        </button>

        <input
          type="text"
          value={instrucao}
          maxLength={400}
          placeholder={copy.instructionPlaceholder}
          onChange={(event) => updateNodeData(id, { instrucao: event.target.value })}
          className="nodrag mt-2 w-full rounded-md border border-line bg-surface px-2 py-1
                     text-[11px] text-ink placeholder:text-ink-faint transition-colors
                     hover:border-line-strong focus:border-accent focus:outline-none"
        />

        <p className="mt-1.5 text-[10px] leading-relaxed text-ink-faint">
          {assetId ? copy.hint : copy.emptyHint}
        </p>
      </div>

      {/* Only an output. An input is something you hand to a block; nothing is
          ever handed to it, which is why there is no socket on the left. */}
      <Handle
        type="source"
        position={Position.Right}
        title={copy.outputHandle}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />
    </div>
  );
}
