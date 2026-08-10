"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { signAssetUrls } from "@/lib/assets/actions";
import { useReferencePicker, type PickedImage } from "@/lib/canvas/reference-picker-store";
import { t } from "@/lib/i18n/pt-BR";
import {
  archiveProduct,
  attachProductPhoto,
  createProduct,
  detachProductPhoto,
  renameProduct,
  setProductInstruction,
} from "@/lib/products/actions";
import { PRODUCT_INSTRUCTION_MAX_LENGTH, PRODUCT_MAX_PHOTOS } from "@/lib/products/schema";
import { useProductsStore } from "@/lib/products/store";
import type { ProductPhoto } from "@/lib/products/types";

/**
 * Creating and editing a product: a name, up to five photos, one sentence.
 *
 * A plain overlay rather than a native `<dialog>`, and that is load-bearing: a
 * modal opened with showModal() renders in the browser's top layer, above every
 * `position: fixed` element on the page — including the image picker this screen
 * opens to add photos. The picker would end up *behind* the dialog that asked
 * for it.
 *
 * Creation and editing are one component in two states, keyed by the product id,
 * so creating one flows straight into editing it — the same shape the character
 * wizard uses, and for the same reason: a product that exists is a product whose
 * photos can be attached to something.
 */

const copy = t.products.dialog;

export function ProductDialog() {
  const editing = useProductsStore((state) => state.editing);

  if (!editing) return null;

  // Keyed by the product, so "create" → "edit" remounts into the editor with
  // fresh fields instead of carrying the creation form's state along.
  return editing.productId === null ? (
    <Shell label={copy.newTitle}>
      <CreateForm />
    </Shell>
  ) : (
    <Shell key={editing.productId} label={t.products.sidebar.title}>
      <Editor productId={editing.productId} />
    </Shell>
  );
}

function Shell({ label, children }: { label: string; children: React.ReactNode }) {
  const close = useProductsStore((state) => state.closeEditor);
  const pickerOpen = useReferencePicker((state) => state.key !== null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // While the picker is up it owns Escape; closing this dialog underneath it
      // would leave a modal with nothing behind it.
      if (event.key === "Escape" && !pickerOpen) close();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, pickerOpen]);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={label}
      className="fixed inset-0 z-40 flex items-center justify-center bg-canvas/80 p-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/50">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creating
// ---------------------------------------------------------------------------

function CreateForm() {
  const addProduct = useProductsStore((state) => state.addProduct);
  const openEditor = useProductsStore((state) => state.openEditor);
  const close = useProductsStore((state) => state.closeEditor);

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    const displayName = name.trim();

    if (displayName === "" || busy) return;

    setBusy(true);
    setMessage(null);

    const result = await createProduct(displayName);

    setBusy(false);

    if (!result.ok) {
      setMessage(copy.createFailed);
      return;
    }

    addProduct(result.product);
    // The product exists now, so the same dialog becomes its editor — where the
    // photos, which need something to hang on, can finally be attached.
    openEditor(result.product.id);
  }

  return (
    <>
      <Header title={copy.newTitle} subtitle={copy.newSubtitle} />

      <div className="px-5 py-4">
        <label htmlFor="product-name" className="mb-1 block text-[11px] font-medium text-ink-muted">
          {copy.nameLabel}
        </label>
        <input
          id="product-name"
          type="text"
          value={name}
          autoFocus
          maxLength={120}
          placeholder={copy.namePlaceholder}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
          className={INPUT_CLASS}
        />

        {message ? <p className="mt-2 text-[11px] text-warning">{message}</p> : null}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
        <button
          type="button"
          onClick={close}
          className="rounded-lg px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
        >
          {copy.cancel}
        </button>
        <button
          type="button"
          disabled={busy || name.trim() === ""}
          onClick={() => void submit()}
          className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-canvas
                     transition-colors hover:bg-accent-hover
                     disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-ink-faint"
        >
          {busy ? copy.creating : copy.create}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

function Editor({ productId }: { productId: string }) {
  const product = useProductsStore((state) => state.products[productId]);
  const setDisplayName = useProductsStore((state) => state.setDisplayName);
  const setInstruction = useProductsStore((state) => state.setInstruction);
  const setPhotos = useProductsStore((state) => state.setPhotos);
  const forget = useProductsStore((state) => state.forget);
  const close = useProductsStore((state) => state.closeEditor);

  const [message, setMessage] = useState<string | null>(null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  const name = useCommittedField(product?.displayName ?? "", (value) => {
    // An empty name is not a rename, it is a slip. The last good one stands.
    if (value === "") return;

    setDisplayName(productId, value);
    void renameProduct({ productId, displayName: value });
  });

  const instruction = useCommittedField(product?.instrucaoPadrao ?? "", (value) => {
    setInstruction(productId, value);
    void setProductInstruction({ productId, instrucao: value });
  });

  const photos = product?.photos ?? [];
  const urls = usePhotoUrls(photos);

  if (!product) return null;

  function openPicker() {
    useReferencePicker.getState().open({
      key: `product:${productId}`,
      scope: "produto",
      remaining: Math.max(0, PRODUCT_MAX_PHOTOS - photos.length),
      limit: PRODUCT_MAX_PHOTOS,
      onConfirm: (picked) => void addPhotos(picked),
    });
  }

  async function addPhotos(picked: PickedImage[]) {
    setMessage(null);

    const added: ProductPhoto[] = [];

    // One at a time: the ceiling is counted in the database, and firing five
    // inserts at once would race that count against itself.
    for (const image of picked) {
      const result = await attachProductPhoto({ productId, assetId: image.assetId });

      if (result.ok) {
        added.push({ assetId: image.assetId, sortOrder: result.sortOrder });
        continue;
      }

      if (result.reason === "full") {
        setMessage(copy.full);
        break;
      }

      setMessage(copy.photoFailed);
    }

    if (added.length === 0) return;

    // Read fresh: the modal outlives the render that opened it.
    const current = useProductsStore.getState().products[productId]?.photos ?? [];

    setPhotos(productId, [...current, ...added]);
  }

  async function removePhoto(assetId: string) {
    setMessage(null);

    const result = await detachProductPhoto({ productId, assetId });

    if (!result.ok) {
      setMessage(copy.photoFailed);
      return;
    }

    const current = useProductsStore.getState().products[productId]?.photos ?? [];

    setPhotos(
      productId,
      current.filter((photo) => photo.assetId !== assetId),
    );
  }

  async function archive() {
    const result = await archiveProduct(productId);

    if (!result.ok) {
      setMessage(copy.archiveFailed);
      return;
    }

    forget(productId);
    close();
  }

  return (
    <>
      <Header title={product.displayName} subtitle={`@${product.handle}`} />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <label
            htmlFor="product-name"
            className="mb-1 block text-[11px] font-medium text-ink-muted"
          >
            {copy.nameLabel}
          </label>
          <input
            id="product-name"
            type="text"
            value={name.value}
            maxLength={120}
            placeholder={copy.namePlaceholder}
            onChange={(event) => name.setValue(event.target.value)}
            onBlur={name.commit}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-[11px] font-medium text-ink-muted">{copy.photosLabel}</span>
            <span className="text-[10px] text-ink-faint">
              {photos.length} {copy.photosOf} {PRODUCT_MAX_PHOTOS}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {photos.map((photo) => (
              <div key={photo.assetId} className="group/photo relative">
                <span className="block size-16 overflow-hidden rounded-md border border-line">
                  {urls[photo.assetId] ? (
                    /* Short-lived signed URLs for a private bucket. */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls[photo.assetId]} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="block size-full bg-canvas" />
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => void removePhoto(photo.assetId)}
                  title={copy.removePhotoHint}
                  aria-label={copy.removePhoto}
                  className="absolute -right-1 -top-1 flex size-4 items-center justify-center
                             rounded-full border border-line bg-surface text-[9px] leading-none
                             text-ink-muted opacity-0 transition-opacity
                             hover:border-negative hover:text-negative
                             focus:opacity-100 group-hover/photo:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              type="button"
              disabled={photos.length >= PRODUCT_MAX_PHOTOS}
              onClick={openPicker}
              title={photos.length >= PRODUCT_MAX_PHOTOS ? copy.full : copy.addPhoto}
              aria-label={copy.addPhoto}
              className="flex size-16 shrink-0 items-center justify-center rounded-md border
                         border-dashed border-line text-ink-faint transition-colors
                         hover:border-line-strong hover:text-ink
                         disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
                <path
                  d="M7 2v10M2 7h10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">{copy.photosHint}</p>
        </div>

        <div>
          <label
            htmlFor="product-instruction"
            className="mb-1 block text-[11px] font-medium text-ink-muted"
          >
            {copy.instructionLabel}
          </label>
          <input
            id="product-instruction"
            type="text"
            value={instruction.value}
            maxLength={PRODUCT_INSTRUCTION_MAX_LENGTH}
            placeholder={copy.instructionPlaceholder}
            onChange={(event) => instruction.setValue(event.target.value)}
            onBlur={instruction.commit}
            className={INPUT_CLASS}
          />
          <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">{copy.instructionHint}</p>
        </div>

        {message ? <p className="text-[11px] leading-relaxed text-warning">{message}</p> : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        {confirmingArchive ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-[11px] text-ink-muted">{copy.archiveConfirm}</span>
            <button
              type="button"
              onClick={() => void archive()}
              className="shrink-0 rounded px-2 py-1 text-[11px] text-negative
                         transition-colors hover:bg-negative/15"
            >
              {copy.yes}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingArchive(false)}
              className="shrink-0 rounded px-2 py-1 text-[11px] text-ink-muted
                         transition-colors hover:bg-surface-hover hover:text-ink"
            >
              {copy.no}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingArchive(true)}
            title={copy.archiveHint}
            className="rounded-lg px-2 py-1.5 text-[11px] text-ink-faint transition-colors
                       hover:text-negative"
          >
            {copy.archive}
          </button>
        )}

        <button
          type="button"
          onClick={close}
          className="shrink-0 rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-canvas
                     transition-colors hover:bg-accent-hover"
        >
          {copy.done}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  const close = useProductsStore((state) => state.closeEditor);

  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-medium text-ink">{title}</h2>
        <p className="mt-0.5 truncate text-[11px] text-ink-faint">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={close}
        aria-label={copy.close}
        className="shrink-0 rounded-lg px-2 py-1 text-xs text-ink-faint transition-colors
                   hover:bg-surface-hover hover:text-ink"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * A field that saves when it loses focus — and again if the dialog closes while
 * it still has it.
 *
 * The second half is not belt-and-braces: Escape closes this dialog without
 * moving focus, so without the unmount flush the last sentence someone typed
 * would be the one sentence that never got saved.
 */
function useCommittedField(initial: string, persist: (value: string) => void) {
  const [value, setValue] = useState(initial);

  const saved = useRef(initial.trim());
  /** What committing would do right now — refreshed after every render. */
  const commitRef = useRef(() => {});

  useEffect(() => {
    commitRef.current = () => {
      const next = value.trim();

      if (next === saved.current) return;

      saved.current = next;
      persist(next);
    };
  });

  useEffect(() => () => commitRef.current(), []);

  return { value, setValue, commit: useCallback(() => commitRef.current(), []) };
}

/** Short-lived links for the product's photos, re-signed only when the set changes. */
function usePhotoUrls(photos: readonly ProductPhoto[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});

  const key = photos.map((photo) => photo.assetId).join(",");

  useEffect(() => {
    const ids = key === "" ? [] : key.split(",");

    if (ids.length === 0) return;

    let cancelled = false;

    void signAssetUrls(ids).then((signed) => {
      if (!cancelled) setUrls((current) => ({ ...current, ...signed }));
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return urls;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-xs text-ink " +
  "placeholder:text-ink-faint transition-colors hover:border-line-strong " +
  "focus:border-accent focus:outline-none";
