"use client";

import { t } from "@/lib/i18n/pt-BR";

/**
 * The two marks that identify a character wherever it appears — on the canvas
 * card, in the editor header and in the sidebar. Kept together so the card and
 * the editor can never drift into showing the same character differently.
 */

/** Initials until the character has a canonical front portrait. */
export function Portrait({ name, className = "size-10" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex ${className} shrink-0 items-center justify-center rounded-lg
                  bg-accent-soft text-xs font-semibold text-ink-muted`}
    >
      {initialsOf(name)}
    </span>
  );
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Which snapshot @handle resolves to. No version yet means the character exists
 * only as a draft and cannot be mentioned at all — so the badge says so, in a
 * soft warning tone rather than a quiet grey.
 */
export function VersionBadge({ versionNumber }: { versionNumber: number | null }) {
  const isDraftOnly = versionNumber === null;

  return (
    <span
      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
        isDraftOnly
          ? "bg-warning/15 text-warning"
          : "border border-line bg-surface-raised text-ink-muted"
      }`}
    >
      {isDraftOnly
        ? t.characterSheet.card.draftBadge
        : `${t.characterSheet.card.versionPrefix}${versionNumber}`}
    </span>
  );
}

/** The pulsing dot of spec §2: the draft holds edits no version carries yet. */
export function DirtyDot() {
  return (
    <span
      title={t.characterSheet.card.dirtyTooltip}
      aria-label={t.characterSheet.card.dirtyTooltip}
      className="relative flex size-2 shrink-0"
    >
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-warning" />
    </span>
  );
}
