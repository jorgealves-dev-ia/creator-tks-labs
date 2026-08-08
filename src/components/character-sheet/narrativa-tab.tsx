"use client";

import { useId, useState, type ReactNode } from "react";

import type { SheetUpdater } from "@/components/character-sheet/field-row";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import { t } from "@/lib/i18n/pt-BR";

type NarrativaTabProps = {
  sheet: CharacterSheet;
  update: SheetUpdater;
};

/**
 * Layer 3 — the narrative. It feeds script, storyboard and voice, and never
 * enters an image prompt (compilation rule 6). Extraction never fills any of it.
 *
 * `voz.provider` and `voz.voice_id` are configured in Phase 3 and are therefore
 * absent from this screen on purpose; they stay in the stored shape so a sheet
 * saved today is still readable then.
 */
export function NarrativaTab({ sheet, update }: NarrativaTabProps) {
  const narrativa = sheet.narrativa;

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-1 text-sm font-medium text-ink">
          {t.characterSheet.groups.narrativaIdentidade}
        </h3>

        <Field label={t.characterSheet.narrativa.nomeCompleto}>
          {(id) => (
            <TextInput
              id={id}
              value={narrativa.nome_completo}
              placeholder={t.characterSheet.narrativa.nomeCompletoPlaceholder}
              onChange={(value) =>
                update((draft) => {
                  draft.narrativa.nome_completo = value;
                })
              }
            />
          )}
        </Field>

        <ListField
          label={t.characterSheet.narrativa.apelidos}
          placeholder={t.characterSheet.narrativa.apelidosPlaceholder}
          value={narrativa.apelidos}
          onChange={(list) =>
            update((draft) => {
              draft.narrativa.apelidos = list;
            })
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.characterSheet.narrativa.idade}>
            {(id) => (
              <input
                id={id}
                type="number"
                min={0}
                max={120}
                value={narrativa.idade ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  const parsed = raw === "" ? null : Number(raw);
                  update((draft) => {
                    draft.narrativa.idade =
                      parsed !== null && Number.isFinite(parsed) ? parsed : null;
                  });
                }}
                className={inputClass}
              />
            )}
          </Field>

          <Field label={t.characterSheet.narrativa.dataNascimento}>
            {(id) => (
              <input
                id={id}
                type="date"
                value={narrativa.data_nascimento ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  update((draft) => {
                    draft.narrativa.data_nascimento = value === "" ? null : value;
                  });
                }}
                className={inputClass}
              />
            )}
          </Field>
        </div>

        <Field label={t.characterSheet.narrativa.ocupacao}>
          {(id) => (
            <TextInput
              id={id}
              value={narrativa.ocupacao}
              placeholder={t.characterSheet.narrativa.ocupacaoPlaceholder}
              onChange={(value) =>
                update((draft) => {
                  draft.narrativa.ocupacao = value;
                })
              }
            />
          )}
        </Field>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-medium text-ink">
          {t.characterSheet.groups.narrativaPersonalidade}
        </h3>

        <ListField
          label={t.characterSheet.narrativa.qualidades}
          placeholder={t.characterSheet.narrativa.qualidadesPlaceholder}
          value={narrativa.personalidade.qualidades}
          onChange={(list) =>
            update((draft) => {
              draft.narrativa.personalidade.qualidades = list;
            })
          }
        />

        <ListField
          label={t.characterSheet.narrativa.defeitos}
          placeholder={t.characterSheet.narrativa.defeitosPlaceholder}
          value={narrativa.personalidade.defeitos}
          onChange={(list) =>
            update((draft) => {
              draft.narrativa.personalidade.defeitos = list;
            })
          }
        />

        <ListField
          label={t.characterSheet.narrativa.tracosMarcantes}
          placeholder={t.characterSheet.narrativa.tracosMarcantesPlaceholder}
          value={narrativa.personalidade.tracos_marcantes}
          onChange={(list) =>
            update((draft) => {
              draft.narrativa.personalidade.tracos_marcantes = list;
            })
          }
        />

        <ListField
          label={t.characterSheet.narrativa.objetivos}
          placeholder={t.characterSheet.narrativa.objetivosPlaceholder}
          value={narrativa.objetivos}
          onChange={(list) =>
            update((draft) => {
              draft.narrativa.objetivos = list;
            })
          }
        />

        <ListField
          label={t.characterSheet.narrativa.medos}
          placeholder={t.characterSheet.narrativa.medosPlaceholder}
          value={narrativa.medos}
          onChange={(list) =>
            update((draft) => {
              draft.narrativa.medos = list;
            })
          }
        />

        <ListField
          label={t.characterSheet.narrativa.relacoes}
          placeholder={t.characterSheet.narrativa.relacoesPlaceholder}
          value={narrativa.relacoes}
          onChange={(list) =>
            update((draft) => {
              draft.narrativa.relacoes = list;
            })
          }
        />
      </section>

      <section>
        <h3 className="mb-1 text-sm font-medium text-ink">
          {t.characterSheet.groups.narrativaVoz}
        </h3>

        <Field label={t.characterSheet.narrativa.estiloDeFala}>
          {(id) => (
            <TextInput
              id={id}
              value={narrativa.estilo_de_fala}
              placeholder={t.characterSheet.narrativa.estiloDeFalaPlaceholder}
              onChange={(value) =>
                update((draft) => {
                  draft.narrativa.estilo_de_fala = value;
                })
              }
            />
          )}
        </Field>

        <div className="grid grid-cols-[8rem_1fr] gap-3">
          <Field label={t.characterSheet.narrativa.vozIdioma}>
            {(id) => (
              <TextInput
                id={id}
                value={narrativa.voz.idioma}
                onChange={(value) =>
                  update((draft) => {
                    draft.narrativa.voz.idioma = value;
                  })
                }
              />
            )}
          </Field>

          <Field label={t.characterSheet.narrativa.vozDescricao}>
            {(id) => (
              <TextInput
                id={id}
                value={narrativa.voz.descricao}
                placeholder={t.characterSheet.narrativa.vozDescricaoPlaceholder}
                onChange={(value) =>
                  update((draft) => {
                    draft.narrativa.voz.descricao = value;
                  })
                }
              />
            )}
          </Field>
        </div>
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-faint focus:border-accent focus:outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();

  return (
    <div className="py-2">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-muted">
        {label}
        {hint ? <span className="ml-2 font-normal text-ink-faint">{hint}</span> : null}
      </label>
      {children(id)}
    </div>
  );
}

function TextInput({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    />
  );
}

/**
 * A list typed as one comma-separated line.
 *
 * The text the user is typing is held locally and the parsed list goes to the
 * store. Rendering the input straight from the store would delete the separator
 * the moment it was typed — "Ju, " parses to ["Ju"], which prints back as "Ju" —
 * and the field would fight the user mid-word.
 *
 * The editor is mounted per character, so there is no case where this input has
 * to catch up with a list that changed elsewhere.
 */
function ListField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string[];
  onChange: (list: string[]) => void;
}) {
  const [text, setText] = useState(() => joinList(value));

  return (
    <Field label={label} hint={t.characterSheet.narrativa.listHint}>
      {(id) => (
        <TextInput
          id={id}
          value={text}
          placeholder={placeholder}
          onChange={(next) => {
            setText(next);
            onChange(splitList(next));
          }}
        />
      )}
    </Field>
  );
}

function joinList(list: string[]): string {
  return list.join(", ");
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}
