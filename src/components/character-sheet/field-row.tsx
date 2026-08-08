"use client";

import { useId, useState, type ReactNode } from "react";

import { OptionSelect } from "@/components/character-sheet/option-select";
import { SkinTonePicker } from "@/components/character-sheet/skin-tone-picker";
import type { DnaField, PadraoField } from "@/lib/character-sheet/fields";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import { withDetails, withValue } from "@/lib/character-sheet/schema";
import { t } from "@/lib/i18n/pt-BR";

/** Applies an edit to the draft. The store hands the mutator a private copy. */
export type SheetUpdater = (mutate: (sheet: CharacterSheet) => void) => void;

type FieldShellProps = {
  controlId: string;
  label: string;
  detalhes: string;
  onDetailsChange: (value: string) => void;
  badge?: ReactNode;
  children: ReactNode;
};

/**
 * The anatomy of a field, in the order of spec §4.1: label, control, optional
 * free-text detail folded away behind "+ detalhes" so it never clutters, and the
 * state badge on the right.
 */
function FieldShell({
  controlId,
  label,
  detalhes,
  onDetailsChange,
  badge,
  children,
}: FieldShellProps) {
  // A detail already written is shown open — hiding it would hide information.
  const [showDetails, setShowDetails] = useState(detalhes !== "");
  const detailsId = `${controlId}-detalhes`;

  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={controlId} className="text-xs font-medium text-ink-muted">
          {label}
        </label>
        {badge}
      </div>

      {children}

      {showDetails ? (
        <div className="mt-2">
          <label htmlFor={detailsId} className="sr-only">
            {t.characterSheet.editor.details.label}
          </label>
          <input
            id={detailsId}
            type="text"
            value={detalhes}
            placeholder={t.characterSheet.editor.details.placeholder}
            onChange={(event) => onDetailsChange(event.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs
                       text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setShowDetails((open) => !open)}
        className="mt-1.5 text-[11px] text-ink-faint transition-colors hover:text-ink-muted"
      >
        {showDetails
          ? t.characterSheet.editor.details.hide
          : t.characterSheet.editor.details.show}
      </button>
    </div>
  );
}

type DnaFieldRowProps = {
  field: DnaField;
  sheet: CharacterSheet;
  update: SheetUpdater;
  badge?: ReactNode;
};

/** A field of layer 1 — the one that carries the state envelope. */
export function DnaFieldRow({ field, sheet, update, badge }: DnaFieldRowProps) {
  const reactId = useId();
  const controlId = `${reactId}-${field.id}`;
  const value = field.read(sheet);

  const setValue = (next: string | number | null) =>
    update((draft) => field.write(draft, withValue(field.read(draft), next)));

  const setDetails = (detalhes: string) =>
    update((draft) => field.write(draft, withDetails(field.read(draft), detalhes)));

  return (
    <FieldShell
      controlId={controlId}
      label={field.label}
      detalhes={value.detalhes}
      onDetailsChange={setDetails}
      badge={badge}
    >
      {field.kind === "swatch" ? (
        <SkinTonePicker id={controlId} value={value.valor} onChange={setValue} />
      ) : field.kind === "number" ? (
        <div className="flex items-center gap-2">
          <input
            id={controlId}
            type="number"
            inputMode="numeric"
            min={field.min}
            max={field.max}
            placeholder={field.placeholder}
            value={typeof value.valor === "number" ? value.valor : ""}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === "") return setValue(null);

              const parsed = Number(raw);
              if (Number.isFinite(parsed)) setValue(parsed);
            }}
            onBlur={(event) => {
              // Clamped only when the user is done typing: clamping mid-keystroke
              // would turn "1" into "140" before the "68" arrived.
              const raw = Number(event.target.value);
              if (!Number.isFinite(raw) || event.target.value === "") return;

              const min = field.min ?? raw;
              const max = field.max ?? raw;
              const clamped = Math.min(Math.max(Math.round(raw), min), max);

              if (clamped !== value.valor) setValue(clamped);
            }}
            className="w-28 rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm
                       text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          {field.suffix ? <span className="text-xs text-ink-faint">{field.suffix}</span> : null}
        </div>
      ) : (
        <OptionSelect
          id={controlId}
          value={value.valor}
          groups={field.groups(sheet)}
          onChange={setValue}
        />
      )}
    </FieldShell>
  );
}

type PadraoFieldRowProps = {
  field: PadraoField;
  sheet: CharacterSheet;
  update: SheetUpdater;
};

/**
 * A field of layer 2. No state badge: extraction never fills these in, so there
 * is nothing to be honest about — these are defaults the user picked.
 */
export function PadraoFieldRow({ field, sheet, update }: PadraoFieldRowProps) {
  const reactId = useId();
  const controlId = `${reactId}-${field.id}`;
  const value = field.read(sheet);

  return (
    <FieldShell
      controlId={controlId}
      label={field.label}
      detalhes={value.detalhes}
      onDetailsChange={(detalhes) =>
        update((draft) => field.write(draft, { ...field.read(draft), detalhes }))
      }
    >
      <OptionSelect
        id={controlId}
        value={value.valor}
        groups={field.groups(sheet)}
        onChange={(next) => update((draft) => field.write(draft, { ...field.read(draft), valor: next }))}
      />
    </FieldShell>
  );
}
