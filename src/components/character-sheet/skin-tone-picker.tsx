"use client";

import { PELE_TOM } from "@/lib/character-sheet/dictionary";
import { t } from "@/lib/i18n/pt-BR";

type SkinTonePickerProps = {
  id: string;
  value: string | number | null;
  onChange: (value: string | null) => void;
};

/**
 * The one visual picker of v1 (U4): the nine tones as clickable swatches, with
 * the name of the selected one underneath.
 *
 * The hex is only paint. What gets stored is the option key, so the swatches can
 * be tuned by eye later without touching a single saved sheet.
 */
export function SkinTonePicker({ id, value, onChange }: SkinTonePickerProps) {
  const current = value === null ? "" : String(value);
  const selected = PELE_TOM.find((tone) => tone.key === current);

  return (
    <div id={id}>
      <div role="radiogroup" aria-label={t.characterSheet.fields.peleTom} className="flex gap-1.5">
        {PELE_TOM.map((tone) => {
          const isSelected = tone.key === current;

          return (
            <button
              key={tone.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={tone.pt}
              title={tone.pt}
              // Clicking the selected tone clears it: a tone chosen by mistake
              // must be undoable without a separate "clear" control.
              onClick={() => onChange(isSelected ? null : tone.key)}
              style={{ backgroundColor: tone.hex }}
              className={`size-7 rounded-full transition-transform hover:scale-110
                          ${
                            isSelected
                              ? "ring-2 ring-accent ring-offset-2 ring-offset-surface"
                              : "ring-1 ring-line"
                          }`}
            />
          );
        })}
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        {selected ? selected.pt : t.characterSheet.editor.emptyOption}
      </p>
    </div>
  );
}
