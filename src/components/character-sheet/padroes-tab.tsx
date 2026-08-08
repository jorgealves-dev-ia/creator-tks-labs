"use client";

import { useId } from "react";

import { PadraoFieldRow, type SheetUpdater } from "@/components/character-sheet/field-row";
import { OptionSelect } from "@/components/character-sheet/option-select";
import { RESTRICAO_TIPO, singleGroup } from "@/lib/character-sheet/dictionary";
import { PADRAO_FIELDS } from "@/lib/character-sheet/fields";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import { t } from "@/lib/i18n/pt-BR";

type PadroesTabProps = {
  sheet: CharacterSheet;
  update: SheetUpdater;
};

/**
 * Layer 2 — the defaults. A generating node may override any of these
 * (compilation rule 4: node input beats sheet default), but the restrictions
 * below always apply, whatever the node asked for (rule 5).
 */
export function PadroesTab({ sheet, update }: PadroesTabProps) {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-1 text-sm font-medium text-ink">{t.characterSheet.groups.padroes}</h3>
        <div className="divide-y divide-line/60">
          {PADRAO_FIELDS.map((field) => (
            <PadraoFieldRow key={field.id} field={field} sheet={sheet} update={update} />
          ))}
        </div>
      </section>

      <RestrictionsEditor sheet={sheet} update={update} />
    </div>
  );
}

function RestrictionsEditor({ sheet, update }: PadroesTabProps) {
  const baseId = useId();
  const restricoes = sheet.padroes_variaveis.restricoes;

  return (
    <section>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-ink">{t.characterSheet.groups.restricoes}</h3>
        <button
          type="button"
          onClick={() =>
            update((draft) => {
              draft.padroes_variaveis.restricoes.push({ tipo: "nunca", regra: "" });
            })
          }
          className="rounded-lg border border-line px-2 py-1 text-[11px] text-ink-muted
                     transition-colors hover:border-line-strong hover:text-ink"
        >
          {t.characterSheet.restricoes.add}
        </button>
      </div>

      <p className="mb-3 text-xs text-ink-faint">{t.characterSheet.restricoes.hint}</p>

      {restricoes.length === 0 ? (
        <p className="text-xs text-ink-faint">{t.characterSheet.restricoes.empty}</p>
      ) : (
        <div className="space-y-2">
          {restricoes.map((restricao, index) => (
            <div
              key={`restricao-${index}`}
              className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3"
            >
              <div className="w-32 shrink-0">
                <label
                  htmlFor={`${baseId}-tipo-${index}`}
                  className="mb-1 block text-[11px] text-ink-faint"
                >
                  {t.characterSheet.restricoes.tipo}
                </label>
                <OptionSelect
                  id={`${baseId}-tipo-${index}`}
                  value={restricao.tipo}
                  groups={singleGroup(RESTRICAO_TIPO)}
                  onChange={(value) =>
                    update((draft) => {
                      draft.padroes_variaveis.restricoes[index].tipo = value ?? "nunca";
                    })
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`${baseId}-regra-${index}`}
                  className="mb-1 block text-[11px] text-ink-faint"
                >
                  {t.characterSheet.restricoes.regra}
                </label>
                <input
                  id={`${baseId}-regra-${index}`}
                  type="text"
                  value={restricao.regra}
                  placeholder={t.characterSheet.restricoes.regraPlaceholder}
                  onChange={(event) => {
                    const regra = event.target.value;
                    update((draft) => {
                      draft.padroes_variaveis.restricoes[index].regra = regra;
                    });
                  }}
                  className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2
                             text-sm text-ink placeholder:text-ink-faint
                             focus:border-accent focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  update((draft) => {
                    draft.padroes_variaveis.restricoes.splice(index, 1);
                  })
                }
                className="mt-6 text-[11px] text-ink-faint transition-colors hover:text-negative"
              >
                {t.characterSheet.restricoes.remove}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
