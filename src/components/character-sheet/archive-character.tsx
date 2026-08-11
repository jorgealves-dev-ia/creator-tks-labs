"use client";

import { useState } from "react";

import { archiveCharacter } from "@/lib/entities/actions";
import { useEntitiesStore } from "@/lib/entities/store";
import { t } from "@/lib/i18n/pt-BR";

/**
 * "Excluir personagem" — the strong confirmation, and why it is strong.
 *
 * Two panels rather than one button, because the word "excluir" makes anybody
 * assume the images go too, and they do not. A confirmation that only says
 * "tem certeza?" tests nerve; one that says **what you lose and what you keep**
 * tests understanding, which is the only thing worth testing before an action
 * the interface cannot undo.
 *
 * The half people underestimate is the mention: `@luna` stops resolving in new
 * generations the moment this runs. That is the sentence somebody needs *before*
 * clicking, not the discovery that a prompt they have been reusing for a month
 * has quietly stopped naming anybody.
 *
 * And the half people overestimate is the loss. Nothing already made goes
 * anywhere — the archive exists precisely so that history keeps pointing at
 * something that still exists. See `archiveCharacter` for the foreign keys that
 * make a real delete unthinkable.
 */

const copy = t.characterSheet.archive;

export function ArchiveCharacter({
  entityId,
  handle,
}: {
  entityId: string;
  handle: string;
}) {
  const forget = useEntitiesStore((state) => state.forget);

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function archive() {
    setBusy(true);
    setFailed(false);

    const result = await archiveCharacter(entityId);

    if (!result.ok) {
      setBusy(false);
      setFailed(true);
      return;
    }

    // The store closes the editor as part of forgetting her — an open dialog
    // editing a draft no list contains is a dialog editing nothing.
    forget(entityId);
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg px-2 py-1 text-[11px] text-ink-faint transition-colors
                   hover:bg-negative/10 hover:text-negative"
      >
        {copy.action}
      </button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label={copy.title}
      className="absolute right-4 top-14 z-20 w-80 rounded-xl border border-line
                 bg-surface-raised p-3 shadow-2xl shadow-black/50"
    >
      <p className="text-xs font-medium text-ink">{copy.title}</p>

      <div className="mt-2 rounded-lg border border-negative/40 bg-negative/5 p-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-negative">
          {copy.lostTitle}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
          {copy.lost.replace("{handle}", handle)}
        </p>
      </div>

      <div className="mt-1.5 rounded-lg border border-line bg-surface p-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
          {copy.keptTitle}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{copy.kept}</p>
      </div>

      <p className="mt-1.5 text-[10px] leading-relaxed text-ink-faint">{copy.irreversible}</p>

      {failed ? (
        <p className="mt-1.5 text-[10px] leading-relaxed text-warning">{copy.failed}</p>
      ) : null}

      <div className="mt-2.5 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming(false)}
          autoFocus
          className="rounded-lg px-2.5 py-1 text-[11px] text-ink-muted transition-colors
                     hover:bg-surface-hover hover:text-ink disabled:opacity-50"
        >
          {copy.cancel}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void archive()}
          className="rounded-lg bg-negative px-2.5 py-1 text-[11px] font-medium text-white
                     transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? copy.working : copy.confirm}
        </button>
      </div>
    </div>
  );
}
