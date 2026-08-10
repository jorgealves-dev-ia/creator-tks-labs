"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PromptField } from "@/components/nodes/prompt-field";
import { ReferenceStrip, type ReferenceEntry } from "@/components/nodes/reference-strip";
import { useImageCatalog } from "@/components/nodes/use-image-catalog";
import { defaultModelId, findModel, ModelSelect } from "@/components/ui/model-select";
import { signAssetUrls } from "@/lib/assets/actions";
import { ESTILO_RENDERIZACAO, estiloOption } from "@/lib/character-sheet/dictionary";
import { useReferencePicker } from "@/lib/canvas/reference-picker-store";
import { useCanvasStore } from "@/lib/canvas/store";
import { useEntitiesStore } from "@/lib/entities/store";
import {
  generateFromNode,
  type CanvasGenerationResult,
} from "@/lib/generation/canvas-actions";
import { findMentions, sceneWithoutMentions } from "@/lib/generation/mentions";
import {
  DEFAULT_PRESET_ID,
  FORMAT_PRESETS,
  findPreset,
  maxReferences,
} from "@/lib/generation/presets";
import { t } from "@/lib/i18n/pt-BR";

/**
 * "Gerar Imagem" — the block where the `@` is finally spent (decision N1).
 *
 * Everything the block knows lives in its own node data and is saved with the
 * graph, so a project reopened tomorrow still has the scene someone was writing,
 * the format they chose and the last image they got.
 *
 * What it deliberately does not do is decide anything the server must decide.
 * The prompt travels as text; which frozen version `@luna` names, what the
 * generation costs and whether it is affordable are all answered on the other
 * side. This component's job is to make the answer legible before the click.
 */

const copy = t.generation;

export type GeneratorNodeData = {
  prompt?: string;
  modelId?: string | null;
  presetId?: string;
  /** null (or absent) means "inherit the character's style" — rule 11. */
  estiloKey?: string | null;
  /** The images attached to this block, in the order they will be numbered. */
  references?: ReferenceEntry[];
  lastAssetId?: string | null;
  lastGenerationId?: string | null;
};

export type GeneratorNodeType = Node<GeneratorNodeData, "generator">;

export function GeneratorNode({ id, data, selected }: NodeProps<GeneratorNodeType>) {
  const router = useRouter();
  const providers = useImageCatalog();
  const projectId = useCanvasStore((state) => state.projectId);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const addResultNode = useCanvasStore((state) => state.addResultNode);
  const removeReference = useCanvasStore((state) => state.removeReference);
  const characters = useEntitiesStore((state) => state.characters);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  /**
   * The signed link, remembered next to the asset it belongs to. Keeping the pair
   * is what lets the preview go blank the instant the node points somewhere else,
   * instead of showing the previous image until a request comes back.
   */
  const [preview, setPreview] = useState<{ assetId: string; url: string } | null>(null);

  const prompt = data.prompt ?? "";
  const presetId = data.presetId ?? DEFAULT_PRESET_ID;
  const estiloKey = data.estiloKey ?? null;

  // Resolved rather than stored: writing a default into the node on mount would
  // mark the canvas dirty just for having been opened.
  const modelId = data.modelId ?? defaultModelId(providers);
  const model = findModel(providers, modelId);
  const preset = findPreset(presetId);

  const mentions = findMentions(prompt);
  const scene = sceneWithoutMentions(prompt, mentions);
  const mentioned = mentions[0]
    ? Object.values(characters).find((character) => character.handle === mentions[0].handle)
    : undefined;

  // What "inherit" resolves to right now, shown in the selector itself — a
  // default the user cannot see is a default the user cannot trust.
  const inheritedStyle = estiloOption(
    typeof mentioned?.activeVersion?.sheet.padroes_variaveis.estilo_renderizacao.valor === "string"
      ? mentioned.activeVersion.sheet.padroes_variaveis.estilo_renderizacao.valor
      : null,
  );

  const references = data.references ?? [];

  // The ceiling belongs to the model, and the character's own sheet occupies one
  // of its places — so the number the strip shows is the number the server will
  // enforce, said before the click instead of after it.
  const limit = model ? maxReferences(model.slug) : 1;
  const reserved =
    mentioned?.activeVersion?.sheet.imagens_canonicas.folha_completa ? 1 : 0;

  const lastAssetId = data.lastAssetId ?? null;
  const previewUrl = lastAssetId && preview?.assetId === lastAssetId ? preview.url : null;

  useEffect(() => {
    if (!lastAssetId) return;

    let cancelled = false;

    // A signed URL expires, so the node stores the id and asks for a link when it
    // mounts — never the other way round.
    void signAssetUrls([lastAssetId]).then((urls) => {
      const url = urls[lastAssetId];

      if (!cancelled && url) setPreview({ assetId: lastAssetId, url });
    });

    return () => {
      cancelled = true;
    };
  }, [lastAssetId]);

  function openPicker() {
    useReferencePicker.getState().open({
      nodeId: id,
      remaining: Math.max(0, limit - references.length - reserved),
      limit,
    });
  }

  async function handleGenerate() {
    setMessage(null);
    setNotice(null);

    if (!projectId) return;

    if (!modelId) {
      setMessage(copy.errors.noModel);
      return;
    }

    setBusy(true);

    const result = await generateFromNode({
      projectId,
      nodeId: id,
      prompt,
      modelId,
      presetId,
      estiloKey,
      references,
    });

    setBusy(false);

    if (!result.ok) {
      setMessage(failureMessage(result));
      return;
    }

    updateNodeData(id, {
      lastAssetId: result.assetId,
      lastGenerationId: result.generationId,
    });

    addResultNode({
      sourceNodeId: id,
      data: {
        assetId: result.assetId,
        generationId: result.generationId,
        handle: result.character?.handle ?? null,
        versionNumber: result.character?.versionNumber ?? null,
        aspectRatio: result.aspectRatio,
      },
    });

    setBalance(result.balanceSparks);
    setPreview({ assetId: result.assetId, url: result.url });

    // Both of these are honesty, not decoration: the proportion that was really
    // drawn, and an identity that had to travel as text alone.
    if (result.approximated && preset) {
      setNotice(
        `${copy.node.approximatedPrefix} ${preset.ratio} ${copy.node.approximatedMiddle} ${result.aspectRatio}.`,
      );
    } else if (result.character && !result.character.hasSheetImage) {
      setNotice(
        `${copy.node.noSheetImagePrefix} v${result.character.versionNumber} de @${result.character.handle} ${copy.node.noSheetImageSuffix}`,
      );
    }

    // The balance in the header belongs to the server-rendered page.
    router.refresh();
  }

  const emptyScene = scene === "";
  const nothingToDo = emptyScene && !mentions.length;

  return (
    <div
      className={`w-[23rem] rounded-xl border bg-surface-raised shadow-lg shadow-black/30
                  transition-colors ${selected ? "border-accent" : "border-line"}`}
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <p className="text-xs font-medium text-ink">{copy.node.title}</p>
        {model ? (
          <p className="text-[11px] text-ink-faint">
            {copy.node.costPrefix} <strong className="text-ink-muted">{model.sparks} ⚡</strong>
            {balance === null ? null : ` · ${copy.node.balancePrefix} ${balance} ⚡`}
          </p>
        ) : null}
      </div>

      <div className="p-3">
        <div
          className={`relative mb-3 flex items-center justify-center overflow-hidden rounded-lg
                      text-[11px] ${
                        previewUrl
                          ? "border border-line bg-canvas"
                          : "border border-dashed border-line text-ink-faint"
                      }`}
          style={{ aspectRatio: aspectRatioStyle(preset?.ratio) }}
        >
          {previewUrl ? (
            /* A plain img: these are short-lived signed URLs for a private
               bucket, so the optimiser has nothing it could cache. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={copy.node.resultAlt} className="size-full object-contain" />
          ) : (
            <span className="px-4 text-center leading-relaxed">{copy.node.emptyResult}</span>
          )}

          {busy ? (
            <span className="absolute inset-0 flex items-center justify-center bg-canvas/75 text-[11px] text-ink">
              {copy.node.generating}
            </span>
          ) : null}
        </div>

        <label htmlFor={`prompt-${id}`} className="mb-1 block text-[11px] font-medium text-ink-muted">
          {copy.node.promptLabel}
        </label>

        <PromptField
          id={`prompt-${id}`}
          value={prompt}
          disabled={busy}
          onChange={(value) => updateNodeData(id, { prompt: value })}
        />

        <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">
          {nothingToDo
            ? copy.node.emptyPromptAlone
            : emptyScene
              ? copy.node.emptyPromptWithCharacter
              : copy.node.promptHint}
        </p>

        <ReferenceStrip
          references={references}
          limit={limit}
          reserved={reserved}
          disabled={busy}
          onAdd={openPicker}
          onChange={(next) => updateNodeData(id, { references: next })}
          onRemove={(index) => removeReference({ nodeId: id, index })}
        />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label
              htmlFor={`model-${id}`}
              className="mb-1 block text-[11px] font-medium text-ink-muted"
            >
              {copy.node.modelLabel}
            </label>
            <ModelSelect
              id={`model-${id}`}
              providers={providers}
              value={modelId}
              disabled={busy}
              onChange={(value) => updateNodeData(id, { modelId: value })}
            />
          </div>

          <div>
            <label
              htmlFor={`format-${id}`}
              className="mb-1 block text-[11px] font-medium text-ink-muted"
            >
              {copy.node.formatLabel}
            </label>
            <select
              id={`format-${id}`}
              value={presetId}
              disabled={busy}
              onChange={(event) => updateNodeData(id, { presetId: event.target.value })}
              className={SELECT_CLASS}
            >
              {FORMAT_PRESETS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.pt} · {entry.ratio}
                </option>
              ))}
            </select>
          </div>

          <div>
            {/* Where the style comes from belongs to the label; what it is
                belongs to the value. Reading "Da personagem · Fotorrealista"
                inside the option asked one control to answer two questions, and
                made the inherited value look like a different style from the
                explicit one of the same name. */}
            <label
              htmlFor={`style-${id}`}
              className="mb-1 block truncate text-[11px] font-medium text-ink-muted"
            >
              {copy.node.styleLabel}
              <span className="font-normal text-ink-faint">
                {" · "}
                {estiloKey
                  ? copy.node.styleFromNode
                  : mentioned
                    ? copy.node.styleFromCharacter
                    : copy.node.styleFromDefault}
              </span>
            </label>
            <select
              id={`style-${id}`}
              value={estiloKey ?? ""}
              disabled={busy}
              onChange={(event) =>
                updateNodeData(id, { estiloKey: event.target.value === "" ? null : event.target.value })
              }
              className={SELECT_CLASS}
            >
              {/* Never an empty or "none" option: the node picks *which* style,
                  never whether there is one (compilation rule 11). */}
              <option value="">{inheritedStyle.pt}</option>
              {ESTILO_RENDERIZACAO.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.pt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          disabled={busy || nothingToDo || !modelId || !projectId}
          title={nothingToDo ? copy.node.emptyPromptAlone : undefined}
          onClick={() => void handleGenerate()}
          className="nodrag mt-3 h-9 w-full rounded-lg bg-accent text-xs font-medium text-canvas
                     transition-colors hover:bg-accent-hover disabled:cursor-not-allowed
                     disabled:bg-surface-hover disabled:text-ink-faint"
        >
          {busy ? copy.node.generating : copy.node.generate}
        </button>

        {busy ? (
          <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">
            {copy.node.generatingHint}
          </p>
        ) : null}

        {notice ? (
          <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">{notice}</p>
        ) : null}

        {message ? (
          <p className="mt-2 text-[10px] leading-relaxed text-warning">{message}</p>
        ) : null}
      </div>

      {/* Decision N1: the connector is always visible on the edge, and clicking
          it opens the right action rather than merely being a socket. It also
          accepts an edge from a Resultado — the same reference, arriving from
          the canvas instead of from the gallery. */}
      <Handle
        type="target"
        position={Position.Left}
        title={copy.node.inputHandle}
        onClick={openPicker}
        className="!size-2.5 !cursor-pointer !border-2 !border-canvas !bg-accent"
      />

      <Handle
        type="source"
        position={Position.Right}
        title={copy.node.outputHandle}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />
    </div>
  );
}

const SELECT_CLASS =
  "nodrag w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-ink " +
  "transition-colors hover:border-line-strong focus:border-accent focus:outline-none " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/** "4:5" → "4 / 5", so the empty frame already has the shape of what will fill it. */
function aspectRatioStyle(ratio: string | undefined): string {
  return ratio ? ratio.replace(":", " / ") : "1 / 1";
}

/** The sentence for each way a generation can fail, in the user's own terms. */
function failureMessage(result: Extract<CanvasGenerationResult, { ok: false }>): string {
  const errors = copy.errors;

  switch (result.reason) {
    case "insufficient_balance":
      return `${errors.insufficientPrefix} ${result.neededSparks ?? 0} ⚡ ${errors.insufficientMiddle} ${result.balanceSparks ?? 0} ⚡.`;
    case "not_configured":
      return errors.notConfigured;
    case "empty_request":
      return errors.emptyRequest;
    case "empty_character":
      return errors.emptyCharacter;
    case "unknown_handle":
      return `${errors.unknownHandlePrefix} @${result.handle ?? ""} ${errors.unknownHandleSuffix}`;
    case "no_version":
      return `${errors.noVersionPrefix} @${result.handle ?? ""} ${errors.noVersionSuffix}`;
    case "unknown_version":
      return `${errors.unknownVersionPrefix} @${result.handle ?? ""} ${errors.unknownVersionSuffix}`;
    case "multiple_characters":
      return errors.multipleCharacters;
    case "too_many_references":
      return `${errors.tooManyReferencesPrefix} ${result.limit ?? 0} ${errors.tooManyReferencesSuffix}`;
    case "missing_reference":
      return errors.missingReference;
    case "translation_failed":
      return errors.translationFailed;
    case "refused":
      return errors.refused;
    case "invalid":
      return errors.invalid;
    default:
      return errors.failed;
  }
}
