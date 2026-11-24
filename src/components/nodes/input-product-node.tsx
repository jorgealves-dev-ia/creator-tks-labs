"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type ClipboardEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { NodeHeader } from "@/components/nodes/node-header";
import { NodeIcon } from "@/components/nodes/node-icons";
import { useInputPicture } from "@/components/nodes/use-input-picture";
import { useProductReadingCatalog } from "@/components/nodes/use-product-reading-catalog";
import { ModelSelect } from "@/components/ui/model-select";
import { useReferencePicker } from "@/lib/canvas/reference-picker-store";
import { useCanvasStore } from "@/lib/canvas/store";
import { t } from "@/lib/i18n/pt-BR";
import {
  findAudienceTerms,
  removeAudienceTerm,
  type AudienceMatch,
} from "@/lib/product-reading/audience-terms";
import {
  refreshReadingCatalog,
  type ReadingCatalogStatus,
} from "@/lib/product-reading/catalog-store";
import { readingGate, readingModelFor, type ReadingGate } from "@/lib/product-reading/gate";
import { PRODUCT_DESCRIPTION_MAX, PRODUCT_NAME_MAX } from "@/lib/product-reading/limits";
import {
  checkLostReading,
  claimParkedReading,
  isWaiting,
  readProductCard,
  useProductReadings,
  type CardReading,
} from "@/lib/product-reading/read-card";
import { useBalance } from "@/lib/sparks/balance-store";

/**
 * "Input de Produto" — a name, up to five photos, and what the product IS.
 *
 * This is the product editor that used to be a dialog behind a sidebar list,
 * moved onto the canvas whole. Nothing was simplified on the way: the same
 * fields, the same ceiling. What changed is that it is no longer a
 * *registration* — there is no Arsenal row to create before you can use it, no
 * name to invent for a thing you will use once, and no list that outlives the
 * campaign. A product is rotativo, so it lives where the work is.
 *
 * Its photos arrive at a generating block **as a unit**, which is the whole
 * reason a product is one card instead of five loose images: the compiler says
 * "these are one object photographed from several angles" once, and insists on
 * fidelity once, instead of describing five products.
 *
 * ---------------------------------------------------------------------------
 * The product says what it is — Frente 1, F1 (02/10/2026)
 * ---------------------------------------------------------------------------
 *
 * A name is not a photo, and a photo is not a description: the model that draws
 * received a blouse and drew a dress (07/09). So the card now carries the
 * product's own words, and they arrive by three doors that never undo one
 * another — the keyboard, a pasted page, and «Ler a foto · N ⚡», which reads the
 * first photo and writes **only into what is empty** (invariant 11).
 *
 * The old «Instrução» IS the Descrição (owner's answer 9.1): the same key in the
 * card's data, a bigger box, a higher ceiling. A card made before today opens
 * with its text where it was, under the new name.
 *
 * The button is a gate that spends, so its anatomy follows the generating
 * block's: the button, and under it what it costs and what the wallet has —
 * said BEFORE the click. Everything it decides is decided by `readingGate`, a
 * pure function; this file only draws the answer.
 */

const copy = t.inputs.product;

/**
 * Five, and now enforced here rather than by a trigger in the database.
 *
 * That is a real move and worth naming: a product used to be a row, and the row
 * had `enforce_product_image_limit` behind it. It is node state now, so the
 * ceiling is the field below plus the Zod schema on the generation route — still
 * the server, no longer the database. The number itself is unchanged and means
 * what it always meant: each photo occupies one of the model's reference slots,
 * which is what makes "4 de 6" true in the block.
 */
const MAX_PHOTOS = 5;

export type InputProductNodeData = {
  nome?: string;
  /** Its photos, in the order they will be numbered. */
  assetIds?: string[];
  /**
   * The Descrição. The key is the one the «Instrução» always had: renaming it
   * would have emptied every card made before 02/10/2026.
   */
  instrucao?: string;
  /**
   * The reading model the card's selector was last put on. Absent means "the
   * product list's default", whatever the catalogue says that is today.
   */
  modelId?: string;
  /** The reading that wrote the Descrição, when one did — `extractions.id`. */
  readingId?: string;
};

export type InputProductNodeType = Node<InputProductNodeData, "input-product">;

export function InputProductNode({ id, data, selected }: NodeProps<InputProductNodeType>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  const nome = data.nome ?? "";
  const assetIds = data.assetIds ?? [];
  const descricao = data.instrucao ?? "";

  /**
   * The guard, at the source.
   *
   * How much room the *tightest* block this card feeds has left. Null when it
   * feeds none, and then only the five-photo ceiling applies. A sixth photo that
   * would not fit is refused here, with the reason visible, rather than
   * discovered as a smaller strip or an API refusal after the money is at risk
   * — the same rule as every other ceiling in this product: said before.
   */
  const freeInBlocks = useCanvasStore((state) => state.freeForInput(id));

  // ── The reading ──────────────────────────────────────────────────────────
  const { providers, status: catalogStatus } = useProductReadingCatalog();
  const balance = useBalance((state) => state.sparks);
  const reading = useProductReadings((state) => state.byCard[id]);

  // The selector's model: the one this card remembers, while it can still be
  // chosen; otherwise the product list's default — never Sonnet (answer 9.4).
  const model = readingModelFor(providers, data.modelId);

  // Waiting for an answer about a click: the reading itself, or whether it was
  // made. The photos stay as they are for as long as that lasts — the text that
  // arrives is about the photo that was first when the click happened.
  const waiting = isWaiting(reading);
  const isReading = reading?.phase === "reading";

  const gate = readingGate({
    lendo: waiting,
    fotos: assetIds.length,
    nome,
    descricao,
    modelo: model,
    saldo: balance,
  });

  // A reading that arrived while this card was off the canvas — another project
  // was open — is taken now. Nothing is asked of the server: it was already paid.
  useEffect(() => {
    claimParkedReading(id);
  }, [id]);

  // ── The audience warning ─────────────────────────────────────────────────
  // Deterministic, no call, 0 ⚡: a closed list read against what is in the two
  // fields, wherever the text came from.
  const nameTerms = useMemo(() => findAudienceTerms(nome), [nome]);
  const descriptionTerms = useMemo(() => findAudienceTerms(descricao), [descricao]);

  /**
   * One click removes one term. Never silently, never more than was clicked.
   *
   * Read fresh, and checked: the chip was drawn from the text of some render,
   * and the removal is by position. If what is at that position is no longer
   * what the chip says, the click does nothing.
   */
  function removeTerm(field: "nome" | "instrucao", match: AudienceMatch) {
    const node = useCanvasStore.getState().nodes.find((entry) => entry.id === id);
    const value = node?.data[field];
    const current = typeof value === "string" ? value : "";

    if (current.slice(match.start, match.end) !== match.text) return;

    updateNodeData(id, { [field]: removeAudienceTerm(current, match) });
  }

  // ── The description's ceiling, said out loud ─────────────────────────────
  // `maxLength` cuts a paste that does not fit, and says nothing. A marketplace
  // page is one of the three doors into this field, and it is longer than the
  // ceiling more often than not — so the cut is counted and shown.
  const [pasteCut, setPasteCut] = useState<number | null>(null);

  function handleDescriptionPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const field = event.currentTarget;
    // What the field will hold: a textarea keeps line breaks as one character.
    const pasted = event.clipboardData.getData("text").replace(/\r\n?/g, "\n");
    const kept = field.value.length - (field.selectionEnd - field.selectionStart);
    const overflow = kept + pasted.length - PRODUCT_DESCRIPTION_MAX;

    setPasteCut(overflow > 0 ? overflow : null);
  }

  function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    // The note is about the paste, so the paste's own change keeps it; any
    // other edit clears it. Asked of the event itself rather than remembered in
    // a flag: a paste into a field that is already full changes nothing, fires
    // no change — and a flag would then swallow the next real edit.
    const native = event.nativeEvent;
    const fromPaste = "inputType" in native && native.inputType === "insertFromPaste";

    if (!fromPaste) setPasteCut(null);

    updateNodeData(id, { instrucao: event.target.value });
  }

  // ── The photos ───────────────────────────────────────────────────────────
  const atCeiling = assetIds.length >= MAX_PHOTOS;
  const blockIsFull = freeInBlocks !== null && freeInBlocks < 1;
  const canAdd = !atCeiling && !blockIsFull && !waiting;

  function openPicker() {
    const roomLeft = MAX_PHOTOS - assetIds.length;

    useReferencePicker.getState().open({
      key: `${id}-${assetIds.length}`,
      scope: "produto",
      // Whichever runs out first: this card's own five, or the room left in the
      // block it feeds.
      remaining: freeInBlocks === null ? roomLeft : Math.min(roomLeft, freeInBlocks),
      limit: MAX_PHOTOS,
      onConfirm: (picked) => {
        // Read fresh: the modal outlives the render that opened it.
        const node = useCanvasStore.getState().nodes.find((entry) => entry.id === id);
        const current = Array.isArray(node?.data.assetIds)
          ? (node.data.assetIds as string[])
          : [];

        const added = picked
          .map((image) => image.assetId)
          .filter((assetId) => !current.includes(assetId));

        if (added.length > 0) {
          updateNodeData(id, { assetIds: [...current, ...added].slice(0, MAX_PHOTOS) });
        }
      },
    });
  }

  function removePhoto(assetId: string) {
    updateNodeData(id, { assetIds: assetIds.filter((entry) => entry !== assetId) });
  }

  return (
    <div
      className={`group/node w-64 rounded-xl border bg-surface-raised shadow-lg shadow-black/30
                  transition-colors ${selected ? "border-accent" : "border-line"}`}
    >
      <NodeHeader
        nodeId={id}
        kind="input-product"
        title={nome.trim() === "" ? copy.title : nome}
        removeHint={copy.remove}
      />

      <div className="p-3">
        <label
          htmlFor={`product-name-${id}`}
          className="mb-1 block text-[11px] font-medium text-ink-muted"
        >
          {copy.nameLabel}
        </label>
        <input
          id={`product-name-${id}`}
          type="text"
          value={nome}
          maxLength={PRODUCT_NAME_MAX}
          disabled={isReading}
          placeholder={copy.namePlaceholder}
          onChange={(event) => updateNodeData(id, { nome: event.target.value })}
          className={FIELD_CLASS}
        />

        <div className="mb-1 mt-3 flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-ink-muted">{copy.photosLabel}</span>
          <span className="text-[10px] text-ink-faint">
            {assetIds.length} {copy.photosOf} {MAX_PHOTOS}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {assetIds.map((assetId) => (
            <div key={assetId} className="group/photo relative">
              <ProductPhoto assetId={assetId} />

              <button
                type="button"
                disabled={waiting}
                onClick={() => removePhoto(assetId)}
                title={waiting ? copy.photosLocked : copy.removePhotoHint}
                aria-label={copy.removePhoto}
                className="nodrag absolute -right-1 -top-1 flex size-4 items-center justify-center
                           rounded-full border border-line bg-surface text-[9px] leading-none
                           text-ink-muted opacity-0 transition-opacity
                           hover:border-negative hover:text-negative
                           focus:opacity-100 group-hover/photo:opacity-100
                           disabled:cursor-not-allowed disabled:hover:border-line
                           disabled:hover:text-ink-muted"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            type="button"
            disabled={!canAdd}
            onClick={openPicker}
            title={
              waiting
                ? copy.photosLocked
                : atCeiling
                  ? copy.full
                  : blockIsFull
                    ? copy.blockFull
                    : copy.addPhoto
            }
            aria-label={copy.addPhoto}
            className="nodrag flex size-12 shrink-0 items-center justify-center rounded-md border
                       border-dashed border-line text-ink-faint transition-colors
                       hover:border-line-strong hover:text-ink
                       disabled:cursor-not-allowed disabled:opacity-40"
          >
            {assetIds.length === 0 ? (
              <NodeIcon kind="input-product" className="size-4" />
            ) : (
              <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {/* The refusal, in words, exactly where the click would have been. */}
        <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">
          {atCeiling ? copy.full : blockIsFull ? copy.blockFull : copy.photosHint}
        </p>

        <label
          htmlFor={`product-description-${id}`}
          className="mb-1 mt-3 block text-[11px] font-medium text-ink-muted"
        >
          {copy.descriptionLabel}
        </label>
        {/* `nowheel` beside `nodrag`: without it, scrolling a long description
            zooms the canvas — defect (a) of 07/09, which the scene dialog had. */}
        <textarea
          id={`product-description-${id}`}
          value={descricao}
          rows={5}
          maxLength={PRODUCT_DESCRIPTION_MAX}
          disabled={isReading}
          placeholder={copy.descriptionPlaceholder}
          onPaste={handleDescriptionPaste}
          onChange={handleDescriptionChange}
          className={`${FIELD_CLASS} nowheel block resize-none leading-relaxed`}
        />
        {/* The budget, under the box — quiet until the last tenth, which is the
            only stretch where knowing it changes what you write. */}
        <p
          aria-hidden
          className={`mt-1 text-right text-[10px] tabular-nums ${
            descricao.length > PRODUCT_DESCRIPTION_MAX * 0.9 ? "text-warning" : "text-ink-faint"
          }`}
        >
          {copy.descriptionCount(descricao.length, PRODUCT_DESCRIPTION_MAX)}
        </p>
        {pasteCut !== null ? (
          <p className="mt-1 text-[10px] leading-relaxed text-warning">
            {copy.descriptionCut(pasteCut)}
          </p>
        ) : null}

        {nameTerms.length + descriptionTerms.length > 0 ? (
          <div
            data-audience-warning
            className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5"
          >
            <p className="text-[11px] font-medium leading-tight text-warning">
              {copy.audience.title}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-ink-muted">
              {copy.audience.hint}
            </p>
            <AudienceTerms
              label={copy.audience.inName}
              field="nome"
              terms={nameTerms}
              disabled={isReading}
              onRemove={(match) => removeTerm("nome", match)}
            />
            <AudienceTerms
              label={copy.audience.inDescription}
              field="descricao"
              terms={descriptionTerms}
              disabled={isReading}
              onRemove={(match) => removeTerm("instrucao", match)}
            />
          </div>
        ) : null}

        <label
          htmlFor={`product-reading-model-${id}`}
          className="mb-1 mt-3 block text-[11px] font-medium text-ink-muted"
        >
          {copy.reading.modelLabel}
        </label>
        <div className="nodrag">
          <ModelSelect
            id={`product-reading-model-${id}`}
            providers={providers}
            value={model?.id ?? null}
            disabled={waiting}
            onChange={(next) => updateNodeData(id, { modelId: next })}
          />
        </div>

        {/* ── The button, and under it what it costs ───────────────────────
            The price is ON the button because it is the number R1 asks to be
            compared before the click: if it does not say what was expected,
            the click does not happen. Off, it still says the price — and the
            line under it says why it is off. */}
        <button
          type="button"
          disabled={!gate.pode}
          data-reading-gate={gate.pode ? "pode" : gate.motivo}
          onClick={() => void readProductCard({ nodeId: id, model })}
          className="nodrag mt-2 h-9 w-full rounded-lg bg-accent text-xs font-medium text-canvas
                     transition-colors hover:bg-accent-hover disabled:cursor-not-allowed
                     disabled:bg-surface-hover disabled:text-ink-faint"
        >
          {isReading ? copy.reading.buttonReading : copy.reading.button(gate.preco)}
        </button>

        <GateLine
          gate={gate}
          balance={balance}
          photos={assetIds.length}
          lost={reading?.phase === "lost"}
          catalogStatus={catalogStatus}
        />

        <Outcome nodeId={id} state={reading} balance={balance} />

        {/* The cost of the wire, in the unit the generating block counts in —
            said here, before the wire is drawn, because a ceiling discovered
            after the click is not a ceiling. */}
        <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">
          {assetIds.length === 0
            ? copy.emptyHint
            : `${copy.occupies} ${assetIds.length} ${
                assetIds.length === 1 ? copy.referenceSingular : copy.referencePlural
              }.`}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        title={copy.outputHandle}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />
    </div>
  );
}

/**
 * What the button says about itself, BEFORE the click: the cost and the balance
 * when it can be clicked, and the reason — one sentence each — when it cannot.
 *
 * In the present and the future tense only. What already happened to the last
 * click is `Outcome`, below it, in the past: two lines that never have to agree,
 * because they are not about the same moment.
 */
function GateLine({
  gate,
  balance,
  photos,
  lost,
  catalogStatus,
}: {
  gate: ReadingGate;
  balance: number | null;
  photos: number;
  lost: boolean;
  catalogStatus: ReadingCatalogStatus;
}) {
  const reading = copy.reading;

  if (gate.pode) {
    return (
      <>
        <p className="mt-1.5 text-center text-[11px] text-ink-faint">
          {reading.cost(gate.preco, balance)}
        </p>
        <p className="mt-0.5 text-center text-[10px] leading-relaxed text-ink-faint">
          {gate.plano.nome && gate.plano.descricao
            ? reading.willFillBoth
            : gate.plano.descricao
              ? reading.willFillDescription
              : reading.willFillName}
          {photos > 1 ? ` ${reading.firstPhoto}` : null}
        </p>
      </>
    );
  }

  if (gate.motivo === "sem_modelo") {
    if (catalogStatus === "failed") {
      return (
        <p className="mt-1.5 text-center text-[10px] leading-relaxed text-warning">
          {reading.catalogFailed}{" "}
          <button
            type="button"
            onClick={() => void refreshReadingCatalog()}
            className="nodrag underline underline-offset-2 transition-colors hover:text-ink"
          >
            {reading.catalogRetry}
          </button>
        </p>
      );
    }

    return (
      <p className="mt-1.5 text-center text-[10px] leading-relaxed text-ink-faint">
        {catalogStatus === "loading" ? reading.catalogLoading : reading.catalogNone}
      </p>
    );
  }

  if (gate.motivo === "sem_saldo") {
    return (
      <>
        <p className="mt-1.5 text-center text-[11px] leading-relaxed text-warning">
          {reading.offNoBalance(gate.faltam ?? 0)}
        </p>
        {gate.preco !== null ? (
          <p className="mt-0.5 text-center text-[10px] text-ink-faint">
            {reading.cost(gate.preco, balance)}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <p className="mt-1.5 text-center text-[10px] leading-relaxed text-ink-faint">
      {gate.motivo === "lendo"
        ? lost
          ? reading.offLost
          : reading.offReading
        : gate.motivo === "sem_foto"
          ? reading.offNoPhoto
          : reading.offNothingBlank}
    </p>
  );
}

/**
 * What happened to the last click on this card — and what happened to the
 * money, which is the half nobody may leave out.
 *
 * Every refusal ends in "Nada foi cobrado", and it is true of every one of them:
 * a refusal leaves no debit, and a failure is recorded as free. The one state
 * that does NOT say it is the lost answer — because there nobody knows, and this
 * card does not guess about money.
 */
function Outcome({
  nodeId,
  state,
  balance,
}: {
  nodeId: string;
  state: CardReading | undefined;
  balance: number | null;
}) {
  const reading = copy.reading;

  if (!state || state.phase === "reading") return null;

  if (state.phase === "done") {
    return (
      <div
        data-reading-outcome="done"
        className="mt-2 rounded-lg border border-line bg-surface px-2 py-1.5 text-center"
      >
        <p className="text-[11px] leading-relaxed text-ink-muted">
          {reading.done(state.charged, balance)}
        </p>
        <p className="text-[10px] leading-relaxed text-ink-faint">
          {reading.tally(state.plan.preenchidos, state.plan.preservados)}
        </p>
        {state.plan.preenchidos === 0 ? (
          <p className="mt-0.5 text-[10px] leading-relaxed text-warning">
            {reading.nothingWritten}
          </p>
        ) : null}
      </div>
    );
  }

  if (state.phase === "lost") {
    return (
      <div
        data-reading-outcome="lost"
        className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5"
      >
        <p className="text-[11px] leading-relaxed text-ink-muted">
          {state.checked === 0 ? reading.lostFirst : reading.lostAgain}
        </p>
        <button
          type="button"
          disabled={state.checking}
          onClick={() => void checkLostReading(nodeId)}
          className="nodrag mt-1.5 h-7 w-full rounded-md border border-line bg-surface text-[11px]
                     font-medium text-ink transition-colors hover:border-line-strong
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.checking ? reading.lostChecking : reading.lostCheck}
        </button>
      </div>
    );
  }

  if (state.phase === "never_made") {
    return (
      <p
        data-reading-outcome="never_made"
        className="mt-2 text-center text-[10px] leading-relaxed text-ink-muted"
      >
        {reading.neverMade}
      </p>
    );
  }

  const sentence =
    state.reason === "price_changed"
      ? reading.failurePriceChanged(state.neededSparks)
      : state.reason === "insufficient_balance"
        ? reading.failureNoBalance(state.neededSparks, state.balanceSparks)
        : reading.failures[state.reason];

  return (
    <p
      data-reading-outcome={state.reason}
      className="mt-2 text-center text-[10px] leading-relaxed text-warning"
    >
      {sentence} {reading.notCharged}
    </p>
  );
}

/**
 * The terms the audience warning found in one field, each a button that removes
 * itself from the text.
 *
 * The chip shows the words exactly as they are written in the field — "Tam: M",
 * not "tamanho" — because that is what the click will take out.
 */
function AudienceTerms({
  label,
  field,
  terms,
  disabled,
  onRemove,
}: {
  label: string;
  field: "nome" | "descricao";
  terms: AudienceMatch[];
  disabled: boolean;
  onRemove: (match: AudienceMatch) => void;
}) {
  if (terms.length === 0) return null;

  return (
    <div className="mt-1.5">
      <p className="text-[10px] text-ink-faint">{label}</p>
      <div className="mt-0.5 flex flex-wrap gap-1">
        {terms.map((match) => (
          <button
            key={`${match.start}-${match.end}`}
            type="button"
            disabled={disabled}
            data-audience-term={field}
            onClick={() => onRemove(match)}
            title={copy.audience.removeHint(match.text)}
            aria-label={copy.audience.removeHint(match.text)}
            className="nodrag inline-flex max-w-full items-center gap-1 rounded-full border
                       border-warning/50 bg-surface px-1.5 py-0.5 text-[10px] text-ink
                       transition-colors hover:border-negative hover:text-negative
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="truncate">{match.text}</span>
            <span aria-hidden className="text-[9px] leading-none">
              ✕
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * One photo of the product, in its tile.
 *
 * A component of its own so each photo asks for its own picture through the
 * hook the other input cards use (`use-input-picture.ts`) — the signed
 * thumbnail, or the file itself for a moment after it was sent from this
 * browser. Five tiles mounting together still make one trip: `signAssets`
 * gathers every request of the same tick. And a photo added later signs alone,
 * where the list used to be signed whole again on every change.
 *
 * `contain`, never `cover` (02/10/2026 — the fix the Input de Imagem got on
 * 01/10). A product photo is the thing the whole card exists to carry: cut to a
 * square, a dress showed its waist and a necklace its pendant. The provider
 * always received the whole file; only this tile was cutting. The tile stays a
 * square that does not change size, on the same dark ground the other cards'
 * frames use.
 */
function ProductPhoto({ assetId }: { assetId: string }) {
  const shown = useInputPicture(assetId);

  return (
    <span className="block size-12 overflow-hidden rounded-md border border-line bg-canvas">
      {shown ? (
        /* Short-lived signed URLs for a private bucket — or the file itself. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="" className="size-full object-contain" />
      ) : null}
    </span>
  );
}

const FIELD_CLASS =
  "nodrag w-full rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink " +
  "placeholder:text-ink-faint transition-colors hover:border-line-strong " +
  "focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";
