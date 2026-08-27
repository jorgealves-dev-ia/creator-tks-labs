"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";

import { NodeHeader } from "@/components/nodes/node-header";
import { NodeIcon } from "@/components/nodes/node-icons";
import { signAssetUrls } from "@/lib/assets/actions";
import { useReferencePicker } from "@/lib/canvas/reference-picker-store";
import { useCanvasStore } from "@/lib/canvas/store";
import { REFERENCE_KINDS, type ReferenceKind } from "@/lib/generation/references";
import { t } from "@/lib/i18n/pt-BR";

/**
 * "Input de Imagem" — one picture, and what it is for.
 *
 * The first citizen of the Inputs shelf, and the shape the other three follow:
 * the sidebar offers a *type*, the node holds the *content*, and a wire into a
 * generating block is what makes it count. Nothing is configured in the rail —
 * a rail that held images would be a second gallery, and the gallery already
 * exists.
 *
 * Why this exists at all, when the generating block can already attach an image
 * from the "+": because an attachment lives inside one block, and a picture you
 * want to try against three different prompts had to be attached three times.
 * On the canvas it is one card with three wires — and, more to the point, it is
 * a thing you can see. A reference buried in a strip inside a block is a
 * decision you have to remember; a card on the canvas is one you can look at.
 *
 * It stores an asset id and never a URL: a signed link expires, and a saved
 * graph must not carry one (architecture decision 3).
 */

const copy = t.inputs.image;

export type InputImageNodeData = {
  assetId?: string | null;
  /** What the image is for — the same closed list the strip's chips use. */
  kind?: ReferenceKind | null;
  /** Optional sentence in Portuguese, translated at generation time. */
  instrucao?: string;
};

export type InputImageNodeType = Node<InputImageNodeData, "input-image">;

export function InputImageNode({ id, data, selected }: NodeProps<InputImageNodeType>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  const assetId = data.assetId ?? null;
  const kind = data.kind ?? null;
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

    void signAssetUrls([assetId]).then((urls) => {
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
      <NodeHeader nodeId={id} kind="input-image" title={copy.title} removeHint={copy.remove} />

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
              <NodeIcon kind="input-image" className="size-5" />
              {assetId ? copy.loading : copy.choose}
            </span>
          )}
        </button>

        {/* The purpose, as the same closed list the strip offers — one
            vocabulary for "what is this picture for", wherever it is answered. */}
        <div className="mt-2 flex flex-wrap gap-1">
          {REFERENCE_KINDS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() =>
                updateNodeData(id, { kind: kind === option.key ? null : option.key })
              }
              className={`nodrag rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                kind === option.key
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              {option.pt}
            </button>
          ))}
        </div>

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
