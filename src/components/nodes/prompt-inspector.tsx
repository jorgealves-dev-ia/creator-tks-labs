"use client";

import { useEffect, useState } from "react";

import {
  ANGULO_CAMERA,
  EXPRESSAO,
  ILUMINACAO,
  labelOf,
  type SheetOption,
} from "@/lib/character-sheet/dictionary";
import { usePromptInspector } from "@/lib/canvas/prompt-inspector-store";
import {
  anchorLabel,
  positionsLabel,
  referenceSourceLabel,
} from "@/lib/generation/reference-labels";
import { findReferenceKind } from "@/lib/generation/references";
import { loadGeneration, type GenerationRecord } from "@/lib/generation/history";
import { t } from "@/lib/i18n/pt-BR";

/**
 * "Ver prompt usado" — the stored recipe of one image, read back.
 *
 * This screen is what makes §6 rule 3 worth having written. The structure was
 * put into `prompt_compiled` so that "with what style and from which references
 * was this image born?" could be answered by field instead of by squinting at a
 * paragraph — and a field nothing ever reads is a field nobody can trust.
 *
 * Everything here comes from the stored row. Nothing is recompiled: recompiling
 * would answer who the character is *today*, which is a different question and
 * the exact one the stored prompt exists to avoid.
 */

const copy = t.generation.inspector;

/**
 * Widened to plain strings: `campo` comes from history, and a row written by a
 * future field must show its raw name rather than break the reader.
 */
const ADJUSTMENT_FIELD_LABELS: Record<string, string> = copy.adjustmentField;

const ADJUSTMENT_OPTIONS: Record<string, readonly SheetOption[]> = {
  angulo_camera: ANGULO_CAMERA,
  iluminacao: ILUMINACAO,
  expressao: EXPRESSAO,
};

/**
 * The chip, when it still has something of its own to say.
 *
 * A role already implies its chip — a Pose input is a pose — and a product's
 * chip is the word the source line just used. Repeating either turns a label
 * into a stutter: "Imagens 3 e 4 · Produto · Pijama · Produto".
 */
function extraChip(reference: { tipo: string | null; papel: string | null }): string | null {
  if (reference.papel !== null || reference.tipo === null || reference.tipo === "produto") {
    return null;
  }

  return findReferenceKind(reference.tipo)?.pt ?? reference.tipo;
}

/** The PT label of an adjustment's option — or the stored key, shown as itself. */
function adjustmentValue(adjustment: { campo: string; chave: string }): string {
  const options = ADJUSTMENT_OPTIONS[adjustment.campo];

  return options ? labelOf(options, adjustment.chave) : adjustment.chave;
}

export function PromptInspector() {
  const generationId = usePromptInspector((state) => state.generationId);

  if (!generationId) return null;

  return <InspectorDialog key={generationId} generationId={generationId} />;
}

function InspectorDialog({ generationId }: { generationId: string }) {
  const close = usePromptInspector((state) => state.close);
  const [record, setRecord] = useState<GenerationRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void loadGeneration(generationId).then((result) => {
      if (cancelled) return;

      setRecord(result);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [generationId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const structure = record?.structure ?? null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={copy.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {/* Wider than it was: the English clauses are long sentences, and a
          narrow column turned each of them into four ragged lines. */}
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between border-b border-line px-5 py-3">
          <div>
            <h2 className="text-sm font-medium text-ink">{copy.title}</h2>
            {record ? (
              <p className="mt-0.5 text-xs text-ink-faint">
                {record.model} · {record.sparksCharged} ⚡
                {record.aspectRatio ? ` · ${record.aspectRatio}` : ""}
                {record.sheetSource === "version" ? ` · ${copy.fromVersion}` : ""}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={close}
            aria-label={copy.close}
            className="rounded-lg px-2 py-1 text-xs text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!loaded ? (
            <p className="text-sm text-ink-faint">{copy.loading}</p>
          ) : !record ? (
            <p className="text-sm text-ink-muted">{copy.missing}</p>
          ) : (
            <div className="space-y-6">
              <Section title={copy.written}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {record.promptUserPt ?? copy.nothingWritten}
                </p>
              </Section>

              {structure ? (
                <>
                  <Section title={copy.style}>
                    <p className="text-sm leading-relaxed text-ink">
                      {structure.estilo.chave}
                      <span className="text-ink-faint">
                        {" · "}
                        {copy.styleOrigin[structure.estilo.origem]}
                      </span>
                    </p>
                  </Section>

                  <Section title={copy.character}>
                    {structure.personagem ? (
                      <p className="text-sm leading-relaxed text-ink">
                        @{structure.personagem.handle} v{structure.personagem.versao}
                        <span className="text-ink-faint">
                          {" · "}
                          {structure.personagem.folha_asset_id
                            ? copy.anchoredBySheet
                            : copy.textOnly}
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-ink-faint">{copy.noCharacter}</p>
                    )}
                  </Section>

                  <Section title={copy.director}>
                    <p className="text-sm leading-relaxed text-ink-muted">
                      {structure.regra_diretor === "prompt_dirige"
                        ? copy.directed
                        : copy.defaults}
                    </p>
                  </Section>

                  {structure.ajustes_cena.length > 0 ? (
                    <Section title={copy.sceneAdjustments}>
                      <ul className="space-y-2">
                        {/*
                          "Sorriso aberto → warm open smile".

                          The English used to sit on its own line under the
                          Portuguese with nothing between them, at 10px — so
                          copying the pair, or simply reading it quickly, gave
                          "Sorriso abertowarm open smile". An arrow costs one
                          character and says the thing the layout was only
                          implying: this became that.
                        */}
                        {structure.ajustes_cena.map((adjustment) => (
                          <li key={adjustment.campo} className="text-sm leading-relaxed">
                            <span className="text-ink-muted">
                              {ADJUSTMENT_FIELD_LABELS[adjustment.campo] ?? adjustment.campo}
                              {" · "}
                            </span>
                            <span className="text-ink">{adjustmentValue(adjustment)}</span>
                            <span className="text-ink-faint">{" → "}</span>
                            <span className="text-ink-muted">{adjustment.frase}</span>
                          </li>
                        ))}
                      </ul>
                    </Section>
                  ) : null}

                  {/*
                    The same name the switch wears on the canvas, and the same
                    labels the thumbnails wear — decision of 11/08/2026. The two
                    screens are one manual: a section called "Referências" here
                    and "Input Referências" out there is two names for the thing
                    somebody is trying to understand.

                    The anchor leads the list. It was never in `referencias` —
                    it lives in `personagem.folha_asset_id`, because it is not a
                    reference input — so this list used to begin at "Imagem 2"
                    with nothing accounting for the 1.
                  */}
                  {structure.personagem?.folha_asset_id || structure.referencias.length > 0 ? (
                    <Section title={t.generation.references.title}>
                      <ul className="space-y-2">
                        {structure.personagem?.folha_asset_id ? (
                          <li className="rounded-lg border border-dashed border-line-strong bg-surface-raised p-3">
                            <p className="text-xs font-medium text-ink">
                              {positionsLabel([1])}
                              <span className="text-ink-muted">
                                {" · "}
                                {anchorLabel(structure.personagem.handle)}
                              </span>
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                              {copy.anchorHint}
                            </p>
                          </li>
                        ) : null}

                        {/* A product occupied several slots and gave one
                            instruction, so it is read back as one block. Its
                            other photos are still in the stored structure — they
                            simply have nothing of their own to say. */}
                        {structure.referencias
                          .filter(
                            (reference) =>
                              reference.grupo === null ||
                              reference.grupo.ordens[0] === reference.ordem,
                          )
                          .map((reference) => {
                            const source = referenceSourceLabel({
                              papel: reference.papel,
                              kind: reference.tipo,
                              groupLabel: reference.grupo?.rotulo,
                              origem: reference.origem,
                            });
                            const chip = extraChip(reference);

                            return (
                              <li
                                key={reference.ordem}
                                className="rounded-lg border border-line bg-surface-raised p-3"
                              >
                                <p className="text-xs font-medium text-ink">
                                  {positionsLabel(
                                    reference.grupo && reference.grupo.ordens.length > 1
                                      ? reference.grupo.ordens
                                      : [reference.ordem],
                                  )}
                                  <span className="text-ink-muted">
                                    {" · "}
                                    {source.short}
                                    {source.name ? ` · ${source.name}` : ""}
                                    {chip ? ` · ${chip}` : ""}
                                  </span>
                                </p>

                                {reference.instrucao_pt ? (
                                  <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                                    “{reference.instrucao_pt}”
                                    <span className="text-ink-faint">
                                      {" → "}
                                      {reference.instrucao_en}
                                    </span>
                                  </p>
                                ) : null}

                                {[reference.papel_en, reference.unidade_en, reference.fidelidade_en]
                                  .filter((clause): clause is string => Boolean(clause))
                                  .map((clause) => (
                                    <p
                                      key={clause}
                                      className="mt-1.5 text-xs leading-relaxed text-ink-faint"
                                    >
                                      {clause}
                                    </p>
                                  ))}
                              </li>
                            );
                          })}
                      </ul>
                    </Section>
                  ) : null}

                  {/*
                    The mute, read back.
                    This is the whole reason the compiled record keeps the ids of
                    references it did not use: without this line, a generation
                    with four muted images and a generation with no images at all
                    would be the same document — and the second one cannot
                    explain why somebody attached four pictures and got a face
                    with none of them in it.
                  */}
                  {structure.angulo_em_pausa ? (
                    <Section title={copy.pausedAngle}>
                      <p className="text-sm leading-relaxed text-ink-muted">
                        {labelOf(ANGULO_CAMERA, structure.angulo_em_pausa)} · {copy.pausedAngleWhy}
                      </p>
                    </Section>
                  ) : null}

                  {structure.referencias_mudas ? (
                    <Section title={copy.mutedReferences}>
                      <p className="text-sm leading-relaxed text-ink-muted">
                        {structure.referencias_mudas.quantidade}{" "}
                        {structure.referencias_mudas.quantidade === 1
                          ? copy.mutedSingular
                          : copy.mutedPlural}
                      </p>
                    </Section>
                  ) : null}

                  {structure.restricoes.length > 0 ? (
                    <Section title={copy.restrictions}>
                      <ul className="list-inside list-disc space-y-1 text-sm text-ink-muted">
                        {structure.restricoes.map((restriction) => (
                          <li key={restriction}>{restriction}</li>
                        ))}
                      </ul>
                    </Section>
                  ) : null}
                </>
              ) : (
                <p className="text-xs leading-relaxed text-ink-faint">{copy.noStructure}</p>
              )}

              <Section title={copy.sent}>
                <p className="whitespace-pre-wrap rounded-lg border border-line bg-surface-raised p-3 text-xs leading-relaxed text-ink-muted">
                  {record.promptText || copy.noText}
                </p>
              </Section>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <button
            type="button"
            disabled={!record?.promptText}
            onClick={() => {
              if (!record) return;

              void navigator.clipboard.writeText(record.promptText).then(() => setCopied(true));
            }}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-muted
                       transition-colors hover:border-line-strong hover:text-ink
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? copy.copied : copy.copy}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
        {title}
      </h3>
      {children}
    </section>
  );
}
