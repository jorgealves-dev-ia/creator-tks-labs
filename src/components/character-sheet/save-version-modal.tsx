"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/pt-BR";

type SaveVersionModalProps = {
  /** Informative only — the database is what numbers a version. */
  nextNumber: number;
  pendingCount: number;
  onCancel: () => void;
  /** Returns an error message, or null when the version was saved. */
  onConfirm: (label: string) => Promise<string | null>;
};

/**
 * The one moment in this screen that asks for intent (D1): a version is born
 * from a decision, never from a keystroke.
 *
 * Two warnings are always in front of the user before they commit: that a saved
 * version can never be edited or deleted, and — if any field is still inferred —
 * that those fields will stay out of the generations even inside the frozen
 * snapshot. Honesty does not stop at the frame.
 */
export function SaveVersionModal({
  nextNumber,
  pendingCount,
  onCancel,
  onConfirm,
}: SaveVersionModalProps) {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function submit() {
    setSaving(true);
    setError(null);

    const failure = await onConfirm(label.trim());

    if (failure) {
      setSaving(false);
      setError(failure);
      return;
    }

    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="fixed inset-0 m-auto w-[min(26rem,92vw)] rounded-2xl border border-line
                 bg-surface p-0 text-ink shadow-2xl shadow-black/50 backdrop:bg-black/70"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!saving) void submit();
        }}
        className="p-5"
      >
        <h2 className="text-sm font-medium text-ink">
          {t.characterSheet.versions.saveModal.title}
        </h2>

        <p className="mt-1 text-xs text-ink-faint">
          {t.characterSheet.versions.saveModal.numberPrefix}
          <strong className="font-medium text-ink-muted">
            {t.characterSheet.card.versionPrefix}
            {nextNumber}
          </strong>
          {t.characterSheet.versions.saveModal.numberSuffix}
        </p>

        <div className="mt-4">
          <label htmlFor="version-label" className="mb-1.5 block text-xs font-medium text-ink-muted">
            {t.characterSheet.versions.saveModal.labelField}
          </label>
          <input
            id="version-label"
            type="text"
            autoFocus
            maxLength={120}
            value={label}
            placeholder={t.characterSheet.versions.saveModal.labelPlaceholder}
            onChange={(event) => setLabel(event.target.value)}
            className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm
                       text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
        </div>

        <p className="mt-4 rounded-lg border border-line bg-surface-raised px-3 py-2 text-xs
                      leading-relaxed text-ink-muted">
          {t.characterSheet.versions.saveModal.permanent}
        </p>

        {pendingCount > 0 ? (
          <p className="mt-2 rounded-lg bg-warning/10 px-3 py-2 text-xs leading-relaxed text-warning">
            {pendingCount}
            {t.characterSheet.versions.saveModal.pendingWarningSuffix}
          </p>
        ) : null}

        {error ? <p className="mt-3 text-xs text-negative">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-9 px-3"
            onClick={() => dialogRef.current?.close()}
          >
            {t.characterSheet.versions.saveModal.cancel}
          </Button>
          <Button type="submit" disabled={saving} className="h-9 px-4">
            {saving
              ? t.characterSheet.versions.saveModal.saving
              : t.characterSheet.versions.saveModal.confirm}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
