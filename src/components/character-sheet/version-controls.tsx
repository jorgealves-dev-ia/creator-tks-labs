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
 * Shown while a frozen version is open. Everything below it is read-only, and
 * the two ways forward are spelled out rather than implied.
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

        <div className="ml-auto flex shrink-0 items-center gap-2">
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

          <button
            type="button"
            onClick={onBackToDraft}
            className="rounded-lg px-2 py-1 text-xs text-ink-muted transition-colors
                       hover:bg-surface-hover hover:text-ink"
          >
            {t.characterSheet.versions.backToDraft}
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
