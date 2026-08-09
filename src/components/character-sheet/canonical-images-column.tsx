"use client";

import { useEffect, useRef, useState } from "react";

import type { SheetUpdater } from "@/components/character-sheet/field-row";
import { defaultModelId, findModel, ModelSelect } from "@/components/ui/model-select";
import type { CatalogProvider } from "@/lib/ai/catalog-types";
import {
  FOLHA_SLOTS,
  IMAGENS_CANONICAS_SLOTS,
  type ImagemCanonicaSlot,
} from "@/lib/character-sheet/dictionary";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import { pendingTranslations } from "@/lib/character-sheet/translation";
import {
  attachCanonicalImage,
  loadCanonicalImageUrls,
  removeCanonicalImage,
} from "@/lib/entities/image-actions";
import {
  generateCanonicalImage,
  listImageProviders,
  type GenerateCanonicalResult,
} from "@/lib/generation/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n/pt-BR";

/** The bucket allows 50 MB; a reference photo has no business being near that. */
const MAX_BYTES = 10 * 1024 * 1024;

const copy = t.characterSheet.editor.images;

type CanonicalImagesColumnProps = {
  entityId: string;
  sheet: CharacterSheet;
  update: SheetUpdater;
  /** A frozen version is being viewed: its images are as immutable as its text. */
  readOnly: boolean;
  /**
   * Flushes the pending autosave. The generator compiles the *stored* draft, so
   * whatever was typed in the last second has to land first — the same reason
   * extraction and "save as new version" flush before acting.
   */
  flushDraft?: () => Promise<boolean>;
};

/**
 * The canonical images — the real anchor of the identity. Always visible, on all
 * three tabs, because they belong to the whole character rather than to a layer.
 *
 * The complete sheet sits at the top and alone (decision G3): it is not the first
 * of seven images, it is the one the other six are generated *from*. The layout
 * says that before any text has to.
 *
 * Two ways to fill a slot, side by side: upload a file, or generate one. The
 * bookkeeping is identical either way — Storage, assets, entity_images, and the
 * id into the sheet — which is why generation could be added here without the
 * upload path changing at all.
 */
export function CanonicalImagesColumn({
  entityId,
  sheet,
  update,
  readOnly,
  flushDraft,
}: CanonicalImagesColumnProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<"upload" | "remove" | "generate">("upload");
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [providers, setProviders] = useState<CatalogProvider[]>([]);
  const [modelId, setModelId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadCanonicalImageUrls(entityId).then((images) => {
      if (cancelled) return;

      setUrls(Object.fromEntries(images.map((image) => [image.assetId, image.url])));
    });

    return () => {
      cancelled = true;
    };
  }, [entityId]);

  useEffect(() => {
    if (readOnly) return;

    let cancelled = false;

    void listImageProviders().then((loaded) => {
      if (cancelled) return;

      setProviders(loaded);
      setModelId(defaultModelId(loaded));
    });

    return () => {
      cancelled = true;
    };
  }, [readOnly]);

  const model = findModel(providers, modelId);
  const hasAnchor = sheet.imagens_canonicas.folha_completa !== null;

  /**
   * The server refuses to compile a sheet whose free text has no English yet
   * (§3.3). Checking it here too turns that refusal into a disabled button with
   * a reason, one second before it would have become an error after a click.
   */
  const awaitingTranslation = pendingTranslations(sheet).length > 0;

  async function handleUpload(slot: ImagemCanonicaSlot, file: File) {
    setMessage(null);
    setNotice(null);

    if (!file.type.startsWith("image/")) {
      setMessage(copy.notAnImage);
      return;
    }

    if (file.size > MAX_BYTES) {
      setMessage(copy.tooLarge);
      return;
    }

    setBusySlot(slot);
    setBusyKind("upload");

    const supabase = createSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      setBusySlot(null);
      setMessage(copy.uploadFailed);
      return;
    }

    // The first folder segment is the owner — the convention the bucket
    // policies of 20260807140500 rely on.
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const storagePath = `${userId}/entities/${entityId}/${slot}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      setBusySlot(null);
      setMessage(copy.uploadFailed);
      return;
    }

    const size = await readDimensions(file);

    const result = await attachCanonicalImage({
      entityId,
      slot,
      storagePath,
      mimeType: file.type,
      byteSize: file.size,
      width: size?.width ?? null,
      height: size?.height ?? null,
    });

    setBusySlot(null);

    if (!result.ok) {
      setMessage(copy.uploadFailed);
      return;
    }

    setUrls((current) => ({ ...current, [result.image.assetId]: result.image.url }));

    // The sheet only ever holds the id; the file lives in entity_images.
    update((draft) => {
      draft.imagens_canonicas[slot] = result.image.assetId;
    });
  }

  async function handleGenerate(slot: ImagemCanonicaSlot) {
    setMessage(null);
    setNotice(null);

    if (!modelId) {
      setMessage(copy.generateErrors.noModel);
      return;
    }

    // The engine reads the stored draft, so the last keystroke has to land — and
    // its translation with it, which is what the server checks for next.
    if (flushDraft) {
      const flushed = await flushDraft();

      if (!flushed) {
        setMessage(t.characterSheet.errors.saveFailed);
        return;
      }
    }

    setBusySlot(slot);
    setBusyKind("generate");

    const result = await generateCanonicalImage({ entityId, slot, modelId });

    setBusySlot(null);

    if (!result.ok) {
      setMessage(generateMessage(result));
      return;
    }

    setUrls((current) => ({ ...current, [result.assetId]: result.url }));
    setBalance(result.balanceSparks);

    update((draft) => {
      draft.imagens_canonicas[slot] = result.assetId;
    });

    // Compilation rule 10: a fallback is recorded and shown, never silent.
    if (result.usedFallbackOutfit) {
      setNotice(copy.fallbackUsed);
    }
  }

  async function handleRemove(slot: ImagemCanonicaSlot, assetId: string) {
    setMessage(null);
    setNotice(null);
    setBusySlot(slot);
    setBusyKind("remove");

    const result = await removeCanonicalImage({ entityId, assetId });

    setBusySlot(null);

    if (!result.ok) {
      setMessage(copy.removeFailed);
      return;
    }

    // Clearing the slot always happens: the draft is meant to change. Whether
    // the file itself survived is the database's call, and it is said plainly.
    update((draft) => {
      draft.imagens_canonicas[slot] = null;
    });

    if (result.kept) {
      setNotice(copy.keptByVersion);
    }
  }

  const slotProps = (slot: ImagemCanonicaSlot) => ({
    slot,
    url: slotUrl(sheet, urls, slot),
    assetId: sheet.imagens_canonicas[slot],
    busy: busySlot === slot,
    busyKind,
    readOnly,
    canGenerate: modelId !== null,
    onUpload: (file: File) => void handleUpload(slot, file),
    onGenerate: () => void handleGenerate(slot),
    onRemove: (assetId: string) => void handleRemove(slot, assetId),
  });

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-line bg-surface/60">
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-sm font-medium text-ink">{copy.title}</h3>
        <p className="mt-0.5 text-xs text-ink-faint">{copy.subtitle}</p>
      </div>

      {readOnly ? null : (
        <div className="border-b border-line px-4 py-3">
          <label
            htmlFor="canonical-model"
            className="mb-1.5 block text-[11px] font-medium text-ink-muted"
          >
            {copy.modelLabel}
          </label>
          <ModelSelect
            id="canonical-model"
            providers={providers}
            value={modelId}
            onChange={setModelId}
            disabled={busySlot !== null}
          />

          {model ? (
            <p className="mt-2 text-[11px] text-ink-muted">
              {copy.costPrefix} <strong className="text-ink">{model.sparks} ⚡</strong>
              {balance === null ? null : (
                <span className="text-ink-faint">
                  {" "}
                  · {copy.balancePrefix} {balance} ⚡
                </span>
              )}
            </p>
          ) : (
            <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
              {copy.generateErrors.noModel}
            </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <section>
          <h4 className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            {copy.anchorTitle}
          </h4>
          <p className="mt-0.5 mb-2 text-[11px] leading-relaxed text-ink-faint">
            {copy.anchorHint}
          </p>

          <ImageSlot
            {...slotProps("folha_completa")}
            label={FOLHA_SLOTS[0].pt}
            generateBlockedReason={
              awaitingTranslation ? copy.generateErrors.translating : undefined
            }
            prominent
          />

          <div className="mt-3">
            <ImageSlot
              {...slotProps("folha_completa_horizontal")}
              label={FOLHA_SLOTS[1].pt}
              generateBlockedReason={
                awaitingTranslation ? copy.generateErrors.translating : undefined
              }
              landscape
            />
          </div>
        </section>

        <section className="mt-6">
          <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            {copy.viewsTitle}
          </h4>

          {!hasAnchor && !readOnly ? (
            <p className="mb-2 rounded-lg bg-warning/10 px-2 py-1.5 text-[11px] leading-relaxed text-warning">
              {copy.needsSheet}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {IMAGENS_CANONICAS_SLOTS.map((entry) => (
              <ImageSlot
                key={entry.key}
                {...slotProps(entry.key)}
                label={entry.pt}
                // Decision G3, said as a reason rather than as a dead button.
                generateBlockedReason={
                  !hasAnchor
                    ? copy.needsSheet
                    : awaitingTranslation
                      ? copy.generateErrors.translating
                      : undefined
                }
              />
            ))}
          </div>
        </section>

        {readOnly ? null : (
          <p className="mt-5 text-[11px] leading-relaxed text-ink-faint">{copy.flow}</p>
        )}
      </div>

      {readOnly ? (
        <p className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-ink-faint">
          {copy.readOnly}
        </p>
      ) : null}

      {busySlot !== null && busyKind === "generate" ? (
        <p className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-ink-muted">
          {copy.generatingHint}
        </p>
      ) : null}

      {notice ? (
        <p className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-ink-muted">
          {notice}
        </p>
      ) : null}

      {message ? (
        <p className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-warning">
          {message}
        </p>
      ) : null}
    </aside>
  );
}

function slotUrl(
  sheet: CharacterSheet,
  urls: Record<string, string>,
  slot: ImagemCanonicaSlot,
): string | null {
  const assetId = sheet.imagens_canonicas[slot];
  return assetId ? (urls[assetId] ?? null) : null;
}

/** The sentence for each way a generation can fail, in the user's own terms. */
function generateMessage(result: Extract<GenerateCanonicalResult, { ok: false }>): string {
  const errors = copy.generateErrors;

  switch (result.reason) {
    case "insufficient_balance":
      return `${errors.insufficientPrefix} ${result.neededSparks ?? 0} ⚡ ${errors.insufficientMiddle} ${result.balanceSparks ?? 0} ⚡.`;
    case "not_configured":
      return errors.notConfigured;
    case "needs_sheet":
      return errors.needsSheet;
    case "translating":
      return errors.translating;
    case "empty_sheet":
      return errors.emptySheet;
    case "refused":
      return errors.refused;
    case "invalid":
      return errors.invalid;
    default:
      return errors.failed;
  }
}

type ImageSlotProps = {
  slot: string;
  label: string;
  url: string | null;
  assetId: string | null;
  busy: boolean;
  busyKind: "upload" | "remove" | "generate";
  readOnly: boolean;
  canGenerate: boolean;
  /** Present when generating is impossible, and says why (never a mute button). */
  generateBlockedReason?: string;
  /** The anchor: shown large, because it is what everything else references. */
  prominent?: boolean;
  landscape?: boolean;
  onUpload: (file: File) => void;
  onGenerate: () => void;
  onRemove: (assetId: string) => void;
};

function ImageSlot({
  slot,
  label,
  url,
  assetId,
  busy,
  busyKind,
  readOnly,
  canGenerate,
  generateBlockedReason,
  prominent,
  landscape,
  onUpload,
  onGenerate,
  onRemove,
}: ImageSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const aspect = landscape ? "aspect-[4/3]" : "aspect-[3/4]";
  const generateDisabled = busy || !canGenerate || generateBlockedReason !== undefined;

  return (
    <div>
      <div
        className={`relative flex ${aspect} items-center justify-center overflow-hidden
                    rounded-lg text-[11px] ${
                      assetId
                        ? "border border-line bg-surface-raised text-ink-muted"
                        : "border border-dashed border-line text-ink-faint"
                    } ${prominent && !assetId ? "border-accent/40" : ""}`}
      >
        {url ? (
          /* A plain img on purpose: these are short-lived signed URLs for a
             private bucket, so the image optimiser has nothing it could cache or
             rewrite, and pointing it at per-user URLs would only add cost. */
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="size-full object-cover" />
        ) : (
          <span>{busy ? busyLabel(busyKind) : copy.emptySlot}</span>
        )}

        {url && busy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-canvas/70 text-[11px] text-ink">
            {busyLabel(busyKind)}
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-center text-[11px] text-ink-muted">{label}</p>

      {readOnly ? null : (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
          <input
            ref={inputRef}
            id={`slot-${slot}`}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              // Cleared so choosing the same file twice still fires a change.
              event.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={generateDisabled}
            title={generateBlockedReason}
            onClick={onGenerate}
            className="text-[11px] font-medium text-accent transition-colors hover:text-accent-hover
                       disabled:cursor-not-allowed disabled:text-ink-faint disabled:opacity-60"
          >
            {assetId ? copy.regenerate : copy.generate}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="text-[11px] text-ink-faint transition-colors hover:text-ink
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assetId ? copy.replace : copy.upload}
          </button>

          {assetId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(assetId)}
              className="text-[11px] text-ink-faint transition-colors hover:text-negative
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copy.remove}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function busyLabel(kind: "upload" | "remove" | "generate"): string {
  if (kind === "generate") return copy.generating;
  return kind === "remove" ? copy.removing : copy.uploading;
}

/**
 * The stored dimensions come from the file itself. Best effort: a format the
 * browser cannot decode simply leaves the columns null rather than failing an
 * upload over metadata.
 */
async function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}
