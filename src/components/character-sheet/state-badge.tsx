"use client";

import type { Estado } from "@/lib/character-sheet/schema";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The badge that tells the truth about a field (spec §4.1).
 *
 * The colours are not decoration: green means the field reaches the generation,
 * yellow means it deliberately does not until the user says so, and the neutral
 * one means nobody ever filled it in. A user who glances at this screen must be
 * able to tell what the model will and will not be told.
 */

const STYLES: Record<Estado, { className: string; label: string; tooltip: string }> = {
  observado: {
    className: "bg-positive/15 text-positive",
    label: t.characterSheet.estados.observado.label,
    tooltip: t.characterSheet.estados.observado.tooltip,
  },
  inferido: {
    className: "bg-warning/15 text-warning",
    label: t.characterSheet.estados.inferido.label,
    tooltip: t.characterSheet.estados.inferido.tooltip,
  },
  confirmado: {
    className: "bg-positive/15 text-positive",
    label: t.characterSheet.estados.confirmado.label,
    tooltip: t.characterSheet.estados.confirmado.tooltip,
  },
  vazio: {
    className: "text-ink-faint",
    label: t.characterSheet.estados.vazio.label,
    tooltip: t.characterSheet.estados.vazio.tooltip,
  },
};

export function StateBadge({ estado }: { estado: Estado }) {
  const style = STYLES[estado];

  return (
    <span
      title={style.tooltip}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5
                  text-[11px] font-medium ${style.className}`}
    >
      <StateIcon estado={estado} />
      {style.label}
    </span>
  );
}

function StateIcon({ estado }: { estado: Estado }) {
  if (estado === "observado") {
    // An eye: extraction saw this one.
    return (
      <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
        <path
          d="M1 7s2.2-3.5 6-3.5S13 7 13 7s-2.2 3.5-6 3.5S1 7 1 7Z"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="none"
        />
        <circle cx="7" cy="7" r="1.6" fill="currentColor" />
      </svg>
    );
  }

  if (estado === "confirmado") {
    return (
      <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
        <path
          d="M2.5 7.5l3 3 6-7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  if (estado === "inferido") {
    return (
      <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
        <path
          d="M5 5a2 2 0 1 1 2.6 1.9c-.4.15-.6.5-.6.9v.4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="7" cy="10.6" r="0.8" fill="currentColor" />
      </svg>
    );
  }

  return null;
}

/**
 * The two inline buttons an inferred field carries (U3): confirm keeps the
 * value, edit sends the user to the control — where changing anything confirms
 * it anyway, by the living rule of §4.1.
 */
export function PendingActions({
  onConfirm,
  onEdit,
}: {
  onConfirm: () => void;
  onEdit: () => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onConfirm}
        className="rounded-md bg-positive/15 px-1.5 py-0.5 text-[11px] font-medium
                   text-positive transition-colors hover:bg-positive/25"
      >
        ✓ {t.characterSheet.estados.confirm}
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-md px-1.5 py-0.5 text-[11px] text-ink-muted
                   transition-colors hover:bg-surface-hover hover:text-ink"
      >
        {t.characterSheet.estados.edit}
      </button>
    </span>
  );
}
