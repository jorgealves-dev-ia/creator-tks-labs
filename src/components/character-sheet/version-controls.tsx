"use client";

import { useState } from "react";

import type { VersionSummary } from "@/lib/entities/types";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The version selector and the banner that comes with looking at a frozen one.
 *
 * Editing or deleting a version is not offered anywhere here — the interface
 * does not even hint at it, and the database would refuse anyway (trigger 4.1).
 * Moving forward from an old version means loading it into the draft and saving
 * a *new* version from there, never rewriting the old one.
 */

const DRAFT_VALUE = "draft";

type VersionSelectorProps = {
  versions: VersionSummary[];
  activeVersionId: string | null;
  viewingVersionId: string | null;
  onSelect: (versionId: string | null) => void;
};

export function VersionSelector({
  versions,
  activeVersionId,
  viewingVersionId,
  onSelect,
}: VersionSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor="version-selector" className="sr-only">
        {t.characterSheet.versions.selectorLabel}
      </label>
      <select
        id="version-selector"
        value={viewingVersionId ?? DRAFT_VALUE}
        onChange={(event) =>
          onSelect(event.target.value === DRAFT_VALUE ? null : event.target.value)
        }
        className="max-w-56 rounded-lg border border-line bg-surface-raised px-2 py-1 text-xs
                   text-ink transition-colors hover:border-line-strong
                   focus:border-accent focus:outline-none"
      >
        <option value={DRAFT_VALUE}>{t.characterSheet.versions.draft}</option>
        {versions.map((version) => (
          <option key={version.id} value={version.id}>
            {describeVersion(version, version.id === activeVersionId)}
          </option>
        ))}
      </select>
    </div>
  );
}

function describeVersion(version: VersionSummary, isActive: boolean): string {
  const label = version.label ? ` — ${version.label}` : "";
  const date = new Date(version.createdAt).toLocaleDateString("pt-BR");
  const active = isActive ? ` ${t.characterSheet.versions.activeMark}` : "";

  return `${t.characterSheet.card.versionPrefix}${version.number}${label} · ${date}${active}`;
}

type VersionBannerProps = {
  versionNumber: number;
  isActive: boolean;
  busy: boolean;
  error: string | null;
  /** True when the draft holds edits that loading this version would overwrite. */
  needsLoadConfirmation: boolean;
  onActivate: () => void;
  onLoadIntoDraft: () => void;
  onBackToDraft: () => void;
};

/**
 * Shown while a frozen version is open — which, since 11/08/2026, is how the
 * editor opens. Everything below it is read-only, and the ways forward are
 * spelled out rather than implied.
 *
 * Three buttons that are easy to confuse, so the words do the separating:
 *
 *   **Editar** leaves the frozen version and shows the draft *as it already is*.
 *   Nothing is copied and nothing is lost — which is why it is safe enough to be
 *   the button a click on any field triggers.
 *
 *   **Carregar no rascunho** overwrites the draft with this version. That is the
 *   rollback path, and it is the only one of the three that can destroy work, so
 *   it asks first whenever there is work to destroy.
 *
 *   **Ativar esta versão** moves the pointer `@luna` resolves to. It touches no
 *   sheet at all.
 *
 * And when the draft holds changes nobody froze, the banner says so *here*,
 * beside the version being read — because the whole risk of opening on a frozen
 * version is somebody concluding that the draft they left half-finished last
 * week is gone.
 */
export function VersionBanner({
  versionNumber,
  isActive,
  busy,
  error,
  needsLoadConfirmation,
  onActivate,
  onLoadIntoDraft,
  onBackToDraft,
}: VersionBannerProps) {
  // Confirmation happens inline, in the same shape the project tabs already use
  // for deletion — never in a browser dialog that freezes the whole page.
  const [confirmingLoad, setConfirmingLoad] = useState(false);

  return (
    <div className="border-b border-warning/30 bg-warning/10 px-6 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-xs text-ink">
          {t.characterSheet.versions.readOnlyBannerPrefix}
          <strong className="font-medium">
            {t.characterSheet.card.versionPrefix}
            {versionNumber}
          </strong>
          {t.characterSheet.versions.readOnlyBannerSuffix}
        </p>

        {/* The draft nobody froze, announced instead of discovered. The shortcut
            is the same action as "Editar"; what earns it a badge of its own is
            that here it is news, not an offer. */}
        {needsLoadConfirmation ? (
          <button
            type="button"
            onClick={onBackToDraft}
            className="flex items-center gap-1.5 rounded-lg bg-warning/20 px-2 py-1 text-[11px]
                       font-medium text-warning transition-colors hover:bg-warning/30"
          >
            <span className="size-1.5 rounded-full bg-warning" aria-hidden />
            {t.characterSheet.versions.draftPendingBadge}
            <span className="font-normal underline underline-offset-2">
              {t.characterSheet.versions.openDraft}
            </span>
          </button>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* The primary way out, and the one a click on any field takes. */}
          <button
            type="button"
            onClick={onBackToDraft}
            title={t.characterSheet.versions.editHint}
            className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white
                       transition-colors hover:bg-accent-hover"
          >
            {t.characterSheet.versions.edit}
          </button>

          {isActive ? null : (
            <button
              type="button"
              disabled={busy}
              onClick={onActivate}
              className="rounded-lg border border-line bg-surface-raised px-2.5 py-1 text-xs
                         text-ink transition-colors hover:border-line-strong
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? t.characterSheet.versions.activating : t.characterSheet.versions.activate}
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (needsLoadConfirmation && !confirmingLoad) {
                setConfirmingLoad(true);
                return;
              }

              onLoadIntoDraft();
            }}
            className="rounded-lg border border-line bg-surface-raised px-2.5 py-1 text-xs
                       text-ink transition-colors hover:border-line-strong
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.characterSheet.versions.loadIntoDraft}
          </button>
        </div>
      </div>

      {confirmingLoad ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-xs text-ink">{t.characterSheet.versions.loadConfirm}</p>
          <button
            type="button"
            onClick={() => {
              setConfirmingLoad(false);
              onLoadIntoDraft();
            }}
            className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white
                       transition-colors hover:bg-accent-hover"
          >
            {t.characterSheet.versions.loadIntoDraft}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingLoad(false)}
            className="rounded-lg px-2 py-1 text-xs text-ink-muted transition-colors
                       hover:bg-surface-hover hover:text-ink"
          >
            {t.characterSheet.versions.saveModal.cancel}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-negative">{error}</p> : null}
    </div>
  );
}
