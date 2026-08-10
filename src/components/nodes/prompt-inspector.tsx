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

/** "2, 3 e 4" — the slots one product occupied, read back in Portuguese. */
function listOrdens(ordens: readonly number[]): string {
  if (ordens.length <= 1) return String(ordens[0] ?? "");

  return `${ordens.slice(0, -1).join(", ")} ${copy.and} ${ordens[ordens.length - 1]}`;
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
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between border-b border-line px-5 py-3">
          <div>
            <h2 className="text-sm font-medium text-ink">{copy.title}</h2>
            {record ? (
              <p className="mt-0.5 text-[11px] text-ink-faint">
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
            <p className="text-xs text-ink-faint">{copy.loading}</p>
          ) : !record ? (
            <p className="text-xs text-ink-muted">{copy.missing}</p>
          ) : (
            <div className="space-y-5">
              <Section title={copy.written}>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink">
                  {record.promptUserPt ?? copy.nothingWritten}
                </p>
              </Section>

              {structure ? (
                <>
                  <Section title={copy.style}>
                    <p className="text-xs leading-relaxed text-ink">
                      {structure.estilo.chave}
                      <span className="text-ink-faint">
                        {" · "}
                        {copy.styleOrigin[structure.estilo.origem]}
                      </span>
                    </p>
                  </Section>

                  <Section title={copy.character}>
                    {structure.personagem ? (
                      <p className="text-xs leading-relaxed text-ink">
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
                    <p className="text-xs leading-relaxed text-ink-muted">
                      {structure.regra_diretor === "prompt_dirige"
                        ? copy.directed
                        : copy.defaults}
                    </p>
                  </Section>

                  {structure.ajustes_cena.length > 0 ? (
                    <Section title={copy.sceneAdjustments}>
                      <ul className="space-y-1.5">
                        {structure.ajustes_cena.map((adjustment) => (
                          <li key={adjustment.campo} className="text-xs leading-relaxed text-ink">
                            {ADJUSTMENT_FIELD_LABELS[adjustment.campo] ?? adjustment.campo}
                            <span className="text-ink-muted">
                              {" · "}
                              {adjustmentValue(adjustment)}
                            </span>
                            <span className="block text-[10px] leading-relaxed text-ink-faint">
                              {adjustment.frase}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Section>
                  ) : null}

                  {structure.referencias.length > 0 ? (
                    <Section title={copy.references}>
                      <ul className="space-y-2">
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
                          .map((reference) => (
                            <li
                              key={reference.ordem}
                              className="rounded-lg border border-line bg-surface-raised p-2"
                            >
                              <p className="text-[11px] font-medium text-ink">
                                {reference.grupo && reference.grupo.ordens.length > 1
                                  ? `${copy.imagesPrefix} ${listOrdens(reference.grupo.ordens)}`
                                  : `${copy.imagePrefix} ${reference.ordem}`}
                                {reference.tipo ? (
                                  <span className="text-ink-muted">
                                    {" · "}
                                    {findReferenceKind(reference.tipo)?.pt ?? reference.tipo}
                                  </span>
                                ) : null}
                                {reference.grupo?.produto_nome ? (
                                  <span className="text-ink-muted">
                                    {" · "}
                                    {reference.grupo.produto_nome}
                                  </span>
                                ) : null}
                              </p>

                              {reference.instrucao_pt ? (
                                <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                                  “{reference.instrucao_pt}”
                                  <span className="text-ink-faint">
                                    {" → "}
                                    {reference.instrucao_en}
                                  </span>
                                </p>
                              ) : null}

                              {reference.unidade_en ? (
                                <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">
                                  {reference.unidade_en}
                                </p>
                              ) : null}

                              {reference.fidelidade_en ? (
                                <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">
                                  {reference.fidelidade_en}
                                </p>
                              ) : null}
                            </li>
                          ))}
                      </ul>
                    </Section>
                  ) : null}

                  {structure.restricoes.length > 0 ? (
                    <Section title={copy.restrictions}>
                      <ul className="list-inside list-disc space-y-0.5 text-xs text-ink-muted">
                        {structure.restricoes.map((restriction) => (
                          <li key={restriction}>{restriction}</li>
                        ))}
                      </ul>
                    </Section>
                  ) : null}
                </>
              ) : (
                <p className="text-[11px] leading-relaxed text-ink-faint">{copy.noStructure}</p>
              )}

              <Section title={copy.sent}>
                <p className="whitespace-pre-wrap rounded-lg border border-line bg-surface-raised p-2.5 text-[11px] leading-relaxed text-ink-muted">
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
      <h3 className="mb-1 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
        {title}
      </h3>
      {children}
    </section>
  );
}
