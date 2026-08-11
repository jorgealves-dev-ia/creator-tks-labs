"use client";

import { useState } from "react";

import { t } from "@/lib/i18n/pt-BR";

/**
 * The two marks that identify a character wherever it appears — on the canvas
 * card, in the editor header and in the sidebar. Kept together so the card and
 * the editor can never drift into showing the same character differently.
 */

/**
 * The character's face: the complete sheet of the frozen version, over initials.
 *
 * **Over**, not instead of — and that is a fix, from 11/08/2026. The image used
 * to *replace* the initials the moment its signed URL arrived, which meant the
 * gap between "the link exists" and "the pixels exist" was drawn as an empty
 * box: an `<img>` with an empty alt renders as blank space while it downloads,
 * and blank space is exactly what nobody can interpret. In the 56px rail a
 * character became a hole between two portraits. The complete sheet is a 2.4 MB
 * photograph, so that gap is measured in seconds on the first load — and it is
 * permanent if the link ever 404s.
 *
 * Painting the initials underneath costs nothing and answers all three states
 * with no flag to keep in sync: no image at all, an image on its way, and an
 * image that failed. In every one of them a character still looks like herself
 * rather than like an item that went missing.
 *
 * Framed from the top (`object-top`) because a reference sheet is a column of
 * views and the head is at the top of it. And initials are not a placeholder
 * for a missing feature: a character with no frozen sheet genuinely has no face
 * to show, and initials say so without pretending otherwise.
 */
export function Portrait({
  name,
  src,
  className = "size-10",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  /**
   * A link that came back dead — which is a matter of *when*, not *if*: these
   * URLs are signed for an hour, and a canvas left open over lunch outlives
   * them. Chrome draws its own broken-image glyph over anything with a size, so
   * without this the fallback underneath would be showing through a little torn
   * picture. Taking the image out of the page hands the square back to the
   * initials, which is the honest thing to show when there is nothing to load.
   */
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);

  // The *link* that failed, not a "it failed" flag — so a different character,
  // or a freshly signed link for the same one, is a new attempt rather than the
  // old failure. A boolean would have needed an effect to clear it, and state
  // that an effect has to reset is state that renders wrong for one frame.
  const broken = brokenSrc === src;

  return (
    <span
      aria-hidden
      className={`relative flex ${className} shrink-0 items-center justify-center
                  overflow-hidden rounded-lg bg-accent-soft text-xs font-semibold text-ink-muted`}
    >
      {initialsOf(name)}

      {src && !broken ? (
        /* Short-lived signed URL for a private bucket. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setBrokenSrc(src)}
          className="absolute inset-0 size-full object-cover object-top"
        />
      ) : null}
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
