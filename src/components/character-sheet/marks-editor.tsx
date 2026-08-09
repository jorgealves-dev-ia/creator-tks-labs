"use client";

import { useId, useRef, type ReactNode } from "react";

import type { SheetUpdater } from "@/components/character-sheet/field-row";
import { OptionSelect } from "@/components/character-sheet/option-select";
import { PendingActions, StateBadge } from "@/components/character-sheet/state-badge";
import {
  MARCA_TIPO,
  PIERCING_JOIA,
  PIERCING_LOCAL,
  singleGroup,
  TATUAGEM_ESTILO,
  TATUAGEM_POSICAO,
  TATUAGEM_TAMANHO,
} from "@/lib/character-sheet/dictionary";
import { markFieldId } from "@/lib/character-sheet/pending";
import type { CharacterSheet, Estado } from "@/lib/character-sheet/schema";
import { needsConfirmation } from "@/lib/character-sheet/schema";
import { t } from "@/lib/i18n/pt-BR";

/**
 * Tattoos, piercings and other marks. §3 of the sheet specification: the state
 * envelope sits on the whole item, not on each of its parts — a tattoo is either
 * seen or it is not.
 */

type MarksEditorProps = {
  sheet: CharacterSheet;
  update: SheetUpdater;
  onConfirm?: (fieldId: string) => void;
};

export function MarksEditor({ sheet, update, onConfirm }: MarksEditorProps) {
  const marcas = sheet.dna_visual.marcas;

  return (
    <div className="space-y-6">
      <MarkList
        title={t.characterSheet.marcas.tatuagensTitle}
        addLabel={t.characterSheet.marcas.tatuagemAdd}
        isEmpty={marcas.tatuagens.length === 0}
        onAdd={() =>
          update((draft) => {
            draft.dna_visual.marcas.tatuagens.push({
              posicao: null,
              tamanho: null,
              estilo: null,
              descricao: "",
              descricao_en: "",
              estado: "confirmado",
              origem: "manual",
              motivo: "",
            });
          })
        }
      >
        {marcas.tatuagens.map((tatuagem, index) => (
          <MarkCard
            key={`tatuagem-${index}`}
            fieldId={markFieldId("tatuagens", index)}
            estado={tatuagem.estado}
            motivo={tatuagem.motivo}
            onConfirm={onConfirm}
            onRemove={() =>
              update((draft) => {
                draft.dna_visual.marcas.tatuagens.splice(index, 1);
              })
            }
          >
            <Cell label={t.characterSheet.marcas.tatuagemPosicao}>
              {(id) => (
                <OptionSelect
                  id={id}
                  value={tatuagem.posicao}
                  groups={singleGroup(TATUAGEM_POSICAO)}
                  onChange={(value) =>
                    update((draft) => {
                      draft.dna_visual.marcas.tatuagens[index].posicao = value;
                    })
                  }
                />
              )}
            </Cell>

            <Cell label={t.characterSheet.marcas.tatuagemTamanho}>
              {(id) => (
                <OptionSelect
                  id={id}
                  value={tatuagem.tamanho}
                  groups={singleGroup(TATUAGEM_TAMANHO)}
                  onChange={(value) =>
                    update((draft) => {
                      draft.dna_visual.marcas.tatuagens[index].tamanho = value;
                    })
                  }
                />
              )}
            </Cell>

            <Cell label={t.characterSheet.marcas.tatuagemEstilo}>
              {(id) => (
                <OptionSelect
                  id={id}
                  value={tatuagem.estilo}
                  groups={singleGroup(TATUAGEM_ESTILO)}
                  onChange={(value) =>
                    update((draft) => {
                      draft.dna_visual.marcas.tatuagens[index].estilo = value;
                    })
                  }
                />
              )}
            </Cell>

            <Cell label={t.characterSheet.marcas.tatuagemDescricao} wide>
              {(id) => (
                <TextInput
                  id={id}
                  value={tatuagem.descricao}
                  placeholder={t.characterSheet.marcas.tatuagemDescricaoPlaceholder}
                  onChange={(value) =>
                    update((draft) => {
                      draft.dna_visual.marcas.tatuagens[index].descricao = value;
                    })
                  }
                />
              )}
            </Cell>
          </MarkCard>
        ))}
      </MarkList>

      <MarkList
        title={t.characterSheet.marcas.piercingsTitle}
        addLabel={t.characterSheet.marcas.piercingAdd}
        isEmpty={marcas.piercings.length === 0}
        onAdd={() =>
          update((draft) => {
            draft.dna_visual.marcas.piercings.push({
              local: null,
              joia: null,
              detalhes: "",
              detalhes_en: "",
              estado: "confirmado",
              origem: "manual",
              motivo: "",
            });
          })
        }
      >
        {marcas.piercings.map((piercing, index) => (
          <MarkCard
            key={`piercing-${index}`}
            fieldId={markFieldId("piercings", index)}
            estado={piercing.estado}
            motivo={piercing.motivo}
            onConfirm={onConfirm}
            onRemove={() =>
              update((draft) => {
                draft.dna_visual.marcas.piercings.splice(index, 1);
              })
            }
          >
            <Cell label={t.characterSheet.marcas.piercingLocal}>
              {(id) => (
                <OptionSelect
                  id={id}
                  value={piercing.local}
                  groups={singleGroup(PIERCING_LOCAL)}
                  onChange={(value) =>
                    update((draft) => {
                      draft.dna_visual.marcas.piercings[index].local = value;
                    })
                  }
                />
              )}
            </Cell>

            <Cell label={t.characterSheet.marcas.piercingJoia}>
              {(id) => (
                <OptionSelect
                  id={id}
                  value={piercing.joia}
                  groups={singleGroup(PIERCING_JOIA)}
                  onChange={(value) =>
                    update((draft) => {
                      draft.dna_visual.marcas.piercings[index].joia = value;
                    })
                  }
                />
              )}
            </Cell>

            <Cell label={t.characterSheet.marcas.piercingDetalhes} wide>
              {(id) => (
                <TextInput
                  id={id}
                  value={piercing.detalhes}
                  placeholder={t.characterSheet.marcas.piercingDetalhesPlaceholder}
                  onChange={(value) =>
                    update((draft) => {
                      draft.dna_visual.marcas.piercings[index].detalhes = value;
                    })
                  }
                />
              )}
            </Cell>
          </MarkCard>
        ))}
      </MarkList>

      <MarkList
        title={t.characterSheet.marcas.outrasTitle}
        addLabel={t.characterSheet.marcas.outraAdd}
        isEmpty={marcas.outras.length === 0}
        onAdd={() =>
          update((draft) => {
            draft.dna_visual.marcas.outras.push({
              tipo: null,
              posicao: "",
              posicao_en: "",
              descricao: "",
              descricao_en: "",
              estado: "confirmado",
              origem: "manual",
              motivo: "",
            });
          })
        }
      >
        {marcas.outras.map((outra, index) => (
          <MarkCard
            key={`outra-${index}`}
            fieldId={markFieldId("outras", index)}
            estado={outra.estado}
            motivo={outra.motivo}
            onConfirm={onConfirm}
            onRemove={() =>
              update((draft) => {
                draft.dna_visual.marcas.outras.splice(index, 1);
              })
            }
          >
            <Cell label={t.characterSheet.marcas.outraTipo}>
              {(id) => (
                <OptionSelect
                  id={id}
                  value={outra.tipo}
                  groups={singleGroup(MARCA_TIPO)}
                  onChange={(value) =>
                    update((draft) => {
                      draft.dna_visual.marcas.outras[index].tipo = value;
                    })
                  }
                />
              )}
            </Cell>

            <Cell label={t.characterSheet.marcas.outraPosicao}>
              {(id) => (
                <TextInput
                  id={id}
                  value={outra.posicao}
                  placeholder={t.characterSheet.marcas.outraPosicaoPlaceholder}
                  onChange={(value) =>
                    update((draft) => {
                      draft.dna_visual.marcas.outras[index].posicao = value;
                    })
                  }
                />
              )}
            </Cell>

            <Cell label={t.characterSheet.marcas.outraDescricao} wide>
              {(id) => (
                <TextInput
                  id={id}
                  value={outra.descricao}
                  placeholder={t.characterSheet.marcas.outraDescricaoPlaceholder}
                  onChange={(value) =>
                    update((draft) => {
                      draft.dna_visual.marcas.outras[index].descricao = value;
                    })
                  }
                />
              )}
            </Cell>
          </MarkCard>
        ))}
      </MarkList>
    </div>
  );
}

type MarkListProps = {
  title: string;
  addLabel: string;
  isEmpty: boolean;
  onAdd: () => void;
  children: ReactNode;
};

function MarkList({ title, addLabel, isEmpty, onAdd, children }: MarkListProps) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-medium text-ink-muted">{title}</h4>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-line px-2 py-1 text-[11px] text-ink-muted
                     transition-colors hover:border-line-strong hover:text-ink"
        >
          {addLabel}
        </button>
      </div>

      {isEmpty ? (
        <p className="text-xs text-ink-faint">{t.characterSheet.marcas.empty}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

/**
 * One mark. The state envelope sits here, on the whole item, which is why the
 * badge lives on the card and not on each of its four little fields.
 */
function MarkCard({
  fieldId,
  estado,
  motivo,
  onConfirm,
  onRemove,
  children,
}: {
  fieldId: string;
  estado: Estado;
  motivo?: string;
  onConfirm?: (fieldId: string) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isPending = needsConfirmation(estado);

  return (
    <div
      ref={cardRef}
      data-field-id={fieldId}
      className="scroll-mt-6 rounded-xl border border-line bg-surface p-3"
    >
      <div className="mb-2 flex items-center justify-end gap-1">
        {/* Same reasoning as a DNA field: the badge carries the reason for the
            doubt, so it stays visible next to the review actions. */}
        <StateBadge estado={estado} motivo={motivo} />

        {isPending && onConfirm ? (
          <PendingActions
            onConfirm={() => onConfirm(fieldId)}
            onEdit={() =>
              cardRef.current?.querySelector<HTMLElement>("select, input, button")?.focus()
            }
          />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">{children}</div>

      <button
        type="button"
        onClick={onRemove}
        className="mt-2 text-[11px] text-ink-faint transition-colors hover:text-negative"
      >
        {t.characterSheet.marcas.remove}
      </button>
    </div>
  );
}

function Cell({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: (id: string) => ReactNode;
}) {
  const id = useId();

  return (
    <div className={wide ? "col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1 block text-[11px] text-ink-faint">
        {label}
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
      className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm
                 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
    />
  );
}
