"use client";

import type { OptionGroup } from "@/lib/character-sheet/dictionary";
import { t } from "@/lib/i18n/pt-BR";

type OptionSelectProps = {
  id: string;
  value: string | number | null;
  groups: readonly OptionGroup[];
  onChange: (value: string | null) => void;
  "aria-describedby"?: string;
};

/**
 * A closed list, written well (U4). The fixed English phrase behind each option
 * never appears here — that is the compiler's business.
 */
export function OptionSelect({
  id,
  value,
  groups,
  onChange,
  "aria-describedby": describedBy,
}: OptionSelectProps) {
  const current = value === null ? "" : String(value);
  const isKnown = groups.some((group) => group.options.some((option) => option.key === current));

  return (
    <select
      id={id}
      value={current}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
      className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm
                 text-ink transition-colors hover:border-line-strong
                 focus:border-accent focus:outline-none"
    >
      <option value="">{t.characterSheet.editor.emptyOption}</option>

      {/* A value saved before an option changed still shows itself, never a
          blank field pretending nothing was ever chosen. */}
      {current !== "" && !isKnown ? <option value={current}>{current}</option> : null}

      {groups.map((group, index) =>
        group.pt ? (
          <optgroup key={group.pt} label={group.pt}>
            {group.options.map((option) => (
              <option key={option.key} value={option.key}>
                {option.pt}
              </option>
            ))}
          </optgroup>
        ) : (
          group.options.map((option) => (
            <option key={`${index}-${option.key}`} value={option.key}>
              {option.pt}
            </option>
          ))
        ),
      )}
    </select>
  );
}
