"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NodeHeader } from "@/components/nodes/node-header";
import { PromptField } from "@/components/nodes/prompt-field";
import { ReferenceStrip, type ReferenceEntry } from "@/components/nodes/reference-strip";
import { ResultPanel, type ResultSlot } from "@/components/nodes/result-panel";
import { useImageCatalog } from "@/components/nodes/use-image-catalog";
import { defaultModelId, findModel, ModelSelect } from "@/components/ui/model-select";
import { signAssetUrls } from "@/lib/assets/actions";
import {
  ANGULO_CAMERA,
  ESTILO_RENDERIZACAO,
  estiloOption,
  EXPRESSAO,
  ILUMINACAO,
} from "@/lib/character-sheet/dictionary";
import { useReferencePicker } from "@/lib/canvas/reference-picker-store";
import { useCanvasStore } from "@/lib/canvas/store";
import { useEntitiesStore } from "@/lib/entities/store";
import {
  generateFromNode,
  type CanvasGenerationResult,
} from "@/lib/generation/canvas-actions";
import {
  generatorCapacity,
  mentionedCharacter,
  sheetAnchorSlots,
} from "@/lib/generation/capacity";
import { findMentions, sceneWithoutMentions } from "@/lib/generation/mentions";
import {
  DEFAULT_IMAGE_SIZE,
  DEFAULT_PRESET_ID,
  FORMAT_PRESETS,
  IMAGE_SIZES,
  findPreset,
} from "@/lib/generation/presets";
import { t } from "@/lib/i18n/pt-BR";
import { useBalance } from "@/lib/sparks/balance-store";

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
  /** "1K" · "2K" · "4K". Absent means the default, which is 2K. */
  imageSize?: string;
  /** null (or absent) means "inherit the character's style" — rule 11. */
  estiloKey?: string | null;
  /**
   * The scene adjustments (§5.27 and §6 rule 4). Null or absent means Auto —
   * the prompt and the character decide, exactly as before these existed.
   */
  anguloKey?: string | null;
  iluminacaoKey?: string | null;
  expressaoKey?: string | null;
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
  // A wire the canvas refused, aimed at this block. Ephemeral by construction —
  // it lives outside the saved graph, and the next edit clears it.
  const refusedWire = useCanvasStore((state) => (state.notice?.nodeId === id ? state.notice : null));

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Seeded by the page, not by this block: the price under the button has to be
  // able to say the balance before anything has been generated.
  const balance = useBalance((state) => state.sparks);
  /**
   * The signed link, remembered next to the asset it belongs to. Keeping the pair
   * is what lets the preview go blank the instant the node points somewhere else,
   * instead of showing the previous image until a request comes back.
   */
  const [preview, setPreview] = useState<{ assetId: string; url: string } | null>(null);

  const prompt = data.prompt ?? "";
  const presetId = data.presetId ?? DEFAULT_PRESET_ID;
  const imageSize = data.imageSize ?? DEFAULT_IMAGE_SIZE;
  const estiloKey = data.estiloKey ?? null;
  const anguloKey = data.anguloKey ?? null;
  const iluminacaoKey = data.iluminacaoKey ?? null;
  const expressaoKey = data.expressaoKey ?? null;

  const activeAdjustments = [anguloKey, iluminacaoKey, expressaoKey].filter(
    (key) => key !== null,
  ).length;

  // Initial state only: a block reopened with a saved adjustment shows it
  // without a click, the same way a field with details already open does.
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(activeAdjustments > 0);

  // Resolved rather than stored: writing a default into the node on mount would
  // mark the canvas dirty just for having been opened.
  const modelId = data.modelId ?? defaultModelId(providers);
  const model = findModel(providers, modelId);
  const preset = findPreset(presetId);

  /**
   * What this resolution costs on this model — and whether the model sells it
   * at all.
   *
   * Both answers come from the catalogue rather than from a table in here, for
   * the same reason the price of a model does: a number the browser knows on its
   * own is a number that can disagree with the bill. When the model does not
   * sell the chosen size, there is deliberately no fallback price: the block
   * says so and refuses to generate, because the alternative is quoting one
   * price and being charged another.
   */
  const sizePrice = model?.sizes.find((entry) => entry.size === imageSize) ?? null;
  const sizeOffered = sizePrice !== null;

  const mentions = findMentions(prompt);
  const scene = sceneWithoutMentions(prompt, mentions);
  const mentioned = mentionedCharacter(prompt, characters);

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
  // enforce, said before the click instead of after it. Computed by the same
  // function the wire from a product card consults, so the two can never
  // disagree about how much room is left.
  const capacity = generatorCapacity({
    modelSlug: model?.slug ?? null,
    referenceCount: references.length,
    reserved: sheetAnchorSlots(mentioned),
  });

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
      key: id,
      scope: "geracao",
      remaining: capacity.free,
      limit: capacity.limit,
      onConfirm: (picked) => {
        // Read fresh rather than closing over `references`: the modal outlives
        // the render that opened it, and a wire connected meanwhile is a
        // reference this block already has.
        const node = useCanvasStore.getState().nodes.find((entry) => entry.id === id);
        const current = Array.isArray(node?.data.references)
          ? (node.data.references as ReferenceEntry[])
          : [];

        updateNodeData(id, {
          references: [
            ...current,
            ...picked.map(
              (image): ReferenceEntry => ({
                assetId: image.assetId,
                kind: null,
                instrucao: "",
                origem: image.source === "upload" ? "upload" : "galeria",
              }),
            ),
          ],
        });
      },
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
      imageSize,
      estiloKey,
      anguloKey,
      iluminacaoKey,
      expressaoKey,
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

    // The figure the charge itself returned — what the ledger just projected onto
    // the wallet, not a second opinion about it.
    useBalance.getState().set(result.balanceSparks);
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

  /**
   * What the right-hand panel draws. One slot today; the quantity stepper of the
   * next step turns this into up to four, and the panel already knows how to lay
   * them out.
   */
  const slots: ResultSlot[] = busy
    ? [{ status: "pending" }]
    : lastAssetId
      ? [{ status: "done", assetId: lastAssetId, url: previewUrl }]
      : [];

  return (
    <div
      className={`group/node w-[38rem] rounded-xl border bg-surface-raised shadow-lg
                  shadow-black/30 transition-colors
                  ${selected ? "border-accent" : "border-line"}`}
    >
      <NodeHeader
        nodeId={id}
        kind="generator"
        title={copy.node.title}
        removeHint={copy.node.remove}
      />

      {/*
        Two columns: the question on the left, the answer on the right.

        The left column is the anatomy of the block, in order — configuration,
        then what it is looking at, then what it is being told, then the button,
        then the price. It reads the way the decision is actually made. The old
        single column opened with an empty frame where the image would eventually
        be (the *answer* first, the question underneath it) and kept the price in
        the top corner, three centimetres from the button that spends it.

        Stacking all of that vertically made the card taller than the screen: to
        read the controls you scrolled, and to see the whole card you zoomed out
        far enough that you could no longer read them. Putting the result beside
        the controls instead of below them is what keeps the block a single
        glance — which is the only reason a canvas beats a form.
      */}
      <div className="flex gap-3 p-3">
        <div className="min-w-0 flex-1">
          {/* ── Configuração ─────────────────────────────────────────────── */}
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            {copy.node.configTitle}
          </p>

          <div className="grid grid-cols-2 gap-2">
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

            <div>
              <label
                htmlFor={`quality-${id}`}
                className="mb-1 block text-[11px] font-medium text-ink-muted"
              >
                {copy.node.qualityLabel}
              </label>
              <select
                id={`quality-${id}`}
                value={imageSize}
                disabled={busy}
                onChange={(event) => updateNodeData(id, { imageSize: event.target.value })}
                className={SELECT_CLASS}
              >
                {/* Every resolution the product knows, always — the ones this
                    model does not sell stay on the list, greyed, saying why.
                    An option that is merely absent teaches nobody anything.
                    The price is in the label because resolution is the one
                    setting here whose whole point is what it costs. */}
                {IMAGE_SIZES.map((size) => {
                  const price = model?.sizes.find((entry) => entry.size === size) ?? null;

                  return (
                    <option key={size} value={size} disabled={price === null}>
                      {size} ·{" "}
                      {price ? `${price.sparks} ⚡` : copy.node.qualityUnavailable}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Rule 4 of §6, exercised. Unlike the style selector, "Auto" here is a
              plain word on purpose: showing the inherited value would be honest
              only in "padrões" mode — in a directed scene the sheet's default
              does not enter at all, so a label promising it would lie half the
              time. */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setAdjustmentsOpen((current) => !current)}
              aria-expanded={adjustmentsOpen}
              className="nodrag flex items-center gap-1.5 text-[11px] font-medium text-ink-muted
                         transition-colors hover:text-ink"
            >
              <svg
                viewBox="0 0 10 10"
                className={`size-2.5 transition-transform ${adjustmentsOpen ? "rotate-90" : ""}`}
                aria-hidden
              >
                <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {copy.node.sceneAdjustments}
              <span className="font-normal text-ink-faint">
                {" · "}
                {!adjustmentsOpen && activeAdjustments > 0
                  ? `${activeAdjustments} ${copy.node.sceneAdjustmentsCountSuffix}`
                  : copy.node.sceneAdjustmentsOptional}
              </span>
            </button>

            {adjustmentsOpen ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label
                    htmlFor={`angle-${id}`}
                    className="mb-1 block text-[11px] font-medium text-ink-muted"
                  >
                    {copy.node.cameraAngleLabel}
                  </label>
                  <select
                    id={`angle-${id}`}
                    value={anguloKey ?? ""}
                    disabled={busy}
                    onChange={(event) =>
                      updateNodeData(id, {
                        anguloKey: event.target.value === "" ? null : event.target.value,
                      })
                    }
                    className={SELECT_CLASS}
                  >
                    <option value="">{copy.node.adjustmentAuto}</option>
                    {ANGULO_CAMERA.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.pt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`lighting-${id}`}
                    className="mb-1 block text-[11px] font-medium text-ink-muted"
                  >
                    {copy.node.lightingLabel}
                  </label>
                  <select
                    id={`lighting-${id}`}
                    value={iluminacaoKey ?? ""}
                    disabled={busy}
                    onChange={(event) =>
                      updateNodeData(id, {
                        iluminacaoKey: event.target.value === "" ? null : event.target.value,
                      })
                    }
                    className={SELECT_CLASS}
                  >
                    <option value="">{copy.node.adjustmentAuto}</option>
                    {ILUMINACAO.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.pt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`expression-${id}`}
                    className="mb-1 block text-[11px] font-medium text-ink-muted"
                  >
                    {copy.node.expressionLabel}
                  </label>
                  <select
                    id={`expression-${id}`}
                    value={expressaoKey ?? ""}
                    disabled={busy}
                    onChange={(event) =>
                      updateNodeData(id, {
                        expressaoKey: event.target.value === "" ? null : event.target.value,
                      })
                    }
                    className={SELECT_CLASS}
                  >
                    <option value="">{copy.node.adjustmentAuto}</option>
                    {EXPRESSAO.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.pt}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="col-span-2 text-[10px] leading-relaxed text-ink-faint">
                  {copy.node.sceneAdjustmentsHint}
                </p>
              </div>
            ) : null}
          </div>

          {/* ── Referências ──────────────────────────────────────────────── */}
          <ReferenceStrip
            references={references}
            limit={capacity.limit}
            reserved={capacity.reserved}
            disabled={busy}
            onAdd={openPicker}
            onChange={(next) => updateNodeData(id, { references: next })}
            onRemove={(index) => removeReference({ nodeId: id, index })}
          />

          {/* The ceiling, said where the wire was aimed and before anything was
              spent — which is the only moment at which a ceiling is a ceiling.
              Beside the strip it refused to fill, not at the foot of the card. */}
          {refusedWire ? (
            <p className="mt-1.5 text-[10px] leading-relaxed text-warning">
              {copy.errors.productOverLimitPrefix} {refusedWire.needed}{" "}
              {copy.errors.productOverLimitMiddle} {refusedWire.free}.{" "}
              {copy.errors.productOverLimitSuffix}
            </p>
          ) : null}

          {/* ── Prompt principal ─────────────────────────────────────────── */}
          <label
            htmlFor={`prompt-${id}`}
            className="mb-1 mt-3 block text-[11px] font-medium text-ink-muted"
          >
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

          {/* ── O botão, e logo abaixo o que ele custa ───────────────────── */}
          <button
            type="button"
            disabled={busy || nothingToDo || !modelId || !projectId || !sizeOffered}
            title={nothingToDo ? copy.node.emptyPromptAlone : undefined}
            onClick={() => void handleGenerate()}
            className="nodrag mt-3 h-9 w-full rounded-lg bg-accent text-xs font-medium text-canvas
                       transition-colors hover:bg-accent-hover disabled:cursor-not-allowed
                       disabled:bg-surface-hover disabled:text-ink-faint"
          >
            {busy ? copy.node.generating : copy.node.generate}
          </button>

          {/* Under the button, in the future tense, with the balance beside it.
              Both halves are needed to answer the only question anyone asks here:
              can I afford this one? */}
          {model ? (
            sizePrice ? (
              <p className="mt-1.5 text-center text-[11px] text-ink-faint">
                {copy.node.costWillPrefix}{" "}
                <strong className="font-medium text-ink-muted">{sizePrice.sparks} ⚡</strong>
                {balance === null ? null : (
                  <>
                    {" · "}
                    {copy.node.balanceLabel}: {balance.toLocaleString("pt-BR")} ⚡
                  </>
                )}
              </p>
            ) : (
              /* No price, so no price is shown. Falling back to the model's base
                 figure would quote one number and charge another. */
              <p className="mt-1.5 text-center text-[11px] leading-relaxed text-warning">
                {copy.errors.unsupportedSize}
              </p>
            )
          ) : null}

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

        {/* ── O que saiu ───────────────────────────────────────────────── */}
        <div className="w-56 shrink-0">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            {copy.node.resultTitle}
          </p>

          <ResultPanel slots={slots} />
        </div>
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
    case "unsupported_size":
      return errors.unsupportedSize;
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
