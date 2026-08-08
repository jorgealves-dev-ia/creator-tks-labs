"use client";

import { useEffect, useRef, useState } from "react";

import type { SheetUpdater } from "@/components/character-sheet/field-row";
import {
  IMAGENS_CANONICAS_SLOTS,
  type ImagemCanonicaSlot,
} from "@/lib/character-sheet/dictionary";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import {
  attachCanonicalImage,
  loadCanonicalImageUrls,
  removeCanonicalImage,
} from "@/lib/entities/image-actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n/pt-BR";

/** The bucket allows 50 MB; a reference photo has no business being near that. */
const MAX_BYTES = 10 * 1024 * 1024;

type CanonicalImagesColumnProps = {
  entityId: string;
  sheet: CharacterSheet;
  update: SheetUpdater;
  /** A frozen version is being viewed: its images are as immutable as its text. */
  readOnly: boolean;
};

/**
 * The canonical images — the real anchor of the identity. Always visible, on all
 * three tabs, because they belong to the whole character rather than to a layer.
 *
 * Uploading is manual for now; generating the turnaround is the next
 * conversation. The file goes straight from the browser to Storage, which the
 * bucket policies already restrict to the user's own folder, and only the
 * bookkeeping goes through a server action.
 */
export function CanonicalImagesColumn({
  entityId,
  sheet,
  update,
  readOnly,
}: CanonicalImagesColumnProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  async function handleUpload(slot: ImagemCanonicaSlot, file: File) {
    setMessage(null);

    if (!file.type.startsWith("image/")) {
      setMessage(t.characterSheet.editor.images.notAnImage);
      return;
    }

    if (file.size > MAX_BYTES) {
      setMessage(t.characterSheet.editor.images.tooLarge);
      return;
    }

    setBusySlot(slot);

    const supabase = createSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      setBusySlot(null);
      setMessage(t.characterSheet.editor.images.uploadFailed);
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
      setMessage(t.characterSheet.editor.images.uploadFailed);
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
      setMessage(t.characterSheet.editor.images.uploadFailed);
      return;
    }

    setUrls((current) => ({ ...current, [result.image.assetId]: result.image.url }));

    // The sheet only ever holds the id; the file lives in entity_images.
    update((draft) => {
      draft.imagens_canonicas[slot] = result.image.assetId;
    });
  }

  async function handleRemove(slot: ImagemCanonicaSlot, assetId: string) {
    setMessage(null);
    setBusySlot(slot);

    const result = await removeCanonicalImage({ entityId, assetId });

    setBusySlot(null);

    if (!result.ok) {
      setMessage(t.characterSheet.editor.images.removeFailed);
      return;
    }

    // Clearing the slot always happens: the draft is meant to change. Whether
    // the file itself survived is the database's call, and it is said plainly.
    update((draft) => {
      draft.imagens_canonicas[slot] = null;
    });

    if (result.kept) {
      setMessage(t.characterSheet.editor.images.keptByVersion);
    }
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-line bg-surface/60">
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-sm font-medium text-ink">{t.characterSheet.editor.images.title}</h3>
        <p className="mt-0.5 text-xs text-ink-faint">{t.characterSheet.editor.images.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 overflow-y-auto p-4">
        {IMAGENS_CANONICAS_SLOTS.map((slot) => (
          <ImageSlot
            key={slot.key}
            slot={slot.key}
            label={slot.pt}
            url={slotUrl(sheet, urls, slot.key)}
            assetId={sheet.imagens_canonicas[slot.key]}
            busy={busySlot === slot.key}
            readOnly={readOnly}
            onUpload={(file) => void handleUpload(slot.key, file)}
            onRemove={(assetId) => void handleRemove(slot.key, assetId)}
          />
        ))}
      </div>

      {readOnly ? (
        <p className="mt-auto border-t border-line px-4 py-3 text-[11px] leading-relaxed text-ink-faint">
          {t.characterSheet.editor.images.readOnly}
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

type ImageSlotProps = {
  slot: string;
  label: string;
  url: string | null;
  assetId: string | null;
  busy: boolean;
  readOnly: boolean;
  onUpload: (file: File) => void;
  onRemove: (assetId: string) => void;
};

function ImageSlot({
  slot,
  label,
  url,
  assetId,
  busy,
  readOnly,
  onUpload,
  onRemove,
}: ImageSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div
        className={`relative flex aspect-[3/4] items-center justify-center overflow-hidden
                    rounded-lg text-[11px] ${
                      assetId
                        ? "border border-line bg-surface-raised text-ink-muted"
                        : "border border-dashed border-line text-ink-faint"
                    }`}
      >
        {url ? (
          /* A plain img on purpose: these are short-lived signed URLs for a
             private bucket, so the image optimiser has nothing it could cache or
             rewrite, and pointing it at per-user URLs would only add cost. */
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="size-full object-cover" />
        ) : (
          <span>{busy ? t.characterSheet.editor.images.uploading : t.characterSheet.editor.images.emptySlot}</span>
        )}

        {url && busy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-canvas/70 text-[11px] text-ink">
            {t.characterSheet.editor.images.removing}
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-center text-[11px] text-ink-muted">{label}</p>

      {readOnly ? null : (
        <div className="mt-1 flex items-center justify-center gap-2">
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
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="text-[11px] text-ink-faint transition-colors hover:text-ink
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assetId ? t.characterSheet.editor.images.replace : t.characterSheet.editor.images.upload}
          </button>

          {assetId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(assetId)}
              className="text-[11px] text-ink-faint transition-colors hover:text-negative
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.characterSheet.editor.images.remove}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
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
