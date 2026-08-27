"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";

import { NodeHeader } from "@/components/nodes/node-header";
import { NodeIcon } from "@/components/nodes/node-icons";
import { signAssetUrls } from "@/lib/assets/actions";
import { useReferencePicker } from "@/lib/canvas/reference-picker-store";
import { useCanvasStore } from "@/lib/canvas/store";
import { t } from "@/lib/i18n/pt-BR";

/**
 * "Input de Pose/Ângulo" — a photograph used for where the camera is.
 *
 * **Registered as an experiment**, with the objection that kept it out of the
 * last cycle written down rather than forgotten: the camera-angle list and the
 * `pose` chip already cover the two ways of saying where the camera is, and a
 * third would be a third chance to contradict the other two.
 *
 * What it adds, if it adds anything, is the one thing neither of those can say.
 * The chip says "match the body position"; the selector names a category of
 * viewpoint. A photograph carries the *exact* point of view — camera height,
 * distance, tilt — as a fact rather than a word, and its clause spends itself
 * on that plus the prohibition that makes it usable: viewpoint only, not the
 * subject, the clothes or the background.
 *
 * Because it and the angle selector are the same axis, only one may speak: the
 * image wins and the selector stands down, recorded and said on screen. See
 * buildCanvasPrompt.
 *
 * Its exit criterion is in decisoes.md, and it is falsifiable.
 */

const copy = t.inputs.pose;

export type InputPoseNodeData = {
  assetId?: string | null;
  /** Optional sentence in Portuguese, translated at generation time. */
  instrucao?: string;
};

export type InputPoseNodeType = Node<InputPoseNodeData, "input-pose">;

export function InputPoseNode({ id, data, selected }: NodeProps<InputPoseNodeType>) {
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
      <NodeHeader nodeId={id} kind="input-pose" title={copy.title} removeHint={copy.remove} />

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
              <NodeIcon kind="input-pose" className="size-5" />
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
