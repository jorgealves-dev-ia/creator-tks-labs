"use client";

import { DnaFieldRow, type SheetUpdater } from "@/components/character-sheet/field-row";
import { MarksEditor } from "@/components/character-sheet/marks-editor";
import { DNA_GROUPS } from "@/lib/character-sheet/fields";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import { t } from "@/lib/i18n/pt-BR";

type DnaTabProps = {
  sheet: CharacterSheet;
  update: SheetUpdater;
  onConfirm?: (fieldId: string) => void;
};

/**
 * Layer 1 — the visual DNA. Immutable within a version and present in every
 * image generation; no node and no prompt may contradict it.
 */
export function DnaTab({ sheet, update, onConfirm }: DnaTabProps) {
  return (
    <div className="space-y-8">
      {DNA_GROUPS.map((group) => (
        <section key={group.id}>
          <h3 className="mb-1 text-sm font-medium text-ink">{group.title}</h3>
          <div className="divide-y divide-line/60">
            {group.fields.map((field) => (
              <DnaFieldRow
                key={field.id}
                field={field}
                sheet={sheet}
                update={update}
                onConfirm={onConfirm}
              />
            ))}
          </div>
        </section>
      ))}

      <section>
        <h3 className="mb-2 text-sm font-medium text-ink">{t.characterSheet.groups.marcas}</h3>
        <MarksEditor sheet={sheet} update={update} onConfirm={onConfirm} />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium text-ink">{t.characterSheet.groups.notas}</h3>
        <label htmlFor="notas-gerais" className="sr-only">
          {t.characterSheet.fields.notasGerais}
        </label>
        <textarea
          id="notas-gerais"
          rows={3}
          value={sheet.dna_visual.notas_gerais}
          placeholder={t.characterSheet.fields.notasPlaceholder}
          onChange={(event) =>
            update((draft) => {
              draft.dna_visual.notas_gerais = event.target.value;
            })
          }
          className="w-full resize-y rounded-lg border border-line bg-surface-raised px-3 py-2
                     text-sm text-ink placeholder:text-ink-faint
                     focus:border-accent focus:outline-none"
        />
      </section>
    </div>
  );
}
