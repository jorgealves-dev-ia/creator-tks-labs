"use client";

import { useEffect, useRef, useState } from "react";

import { DnaTab } from "@/components/character-sheet/dna-tab";
import { ExtractionPanel } from "@/components/character-sheet/extraction-panel";
import { Portrait } from "@/components/character-sheet/identity";
import { NarrativaTab } from "@/components/character-sheet/narrativa-tab";
import { PadroesTab } from "@/components/character-sheet/padroes-tab";
import { Button } from "@/components/ui/button";
import { GENERO_APRESENTACAO } from "@/lib/character-sheet/dictionary";
import { DNA_FIELDS } from "@/lib/character-sheet/fields";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import { entersPrompt } from "@/lib/character-sheet/schema";
import { createCharacter, isHandleAvailable, saveCharacterVersion } from "@/lib/entities/actions";
import { isValidHandle, slugifyHandle } from "@/lib/entities/handle";
import { useEntitiesStore } from "@/lib/entities/store";
import type { CharacterEntity } from "@/lib/entities/types";
import { useDraftAutosave } from "@/lib/entities/use-draft-autosave";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The guided creation of a character (U2): the first time is a flow in steps;
 * after that, the character opens straight into the free editor.
 *
 * The character is created for real at the end of step 1, and every step after
 * that edits its draft through the same store and the same autosave the editor
 * uses. That is what lets these steps reuse the editor's own tabs instead of
 * growing a second set of forms that could drift from them — and it means
 * closing the wizard halfway never loses what was typed: the character is simply
 * a draft, which is a legitimate state (§7, "Deixar como rascunho").
 *
 * Step 2, the reference photo, is marked "em breve" and leads to the manual
 * path. The extraction engine is the next session; its place in the flow is
 * already here so it lands without any rework of this screen.
 */

type WizardStep = "identidade" | "foto" | "dna" | "padroes" | "narrativa" | "resumo";

const STEPS: readonly { id: WizardStep; label: string }[] = [
  { id: "identidade", label: t.characterSheet.wizard.steps.identidade },
  { id: "foto", label: t.characterSheet.wizard.steps.foto },
  { id: "dna", label: t.characterSheet.wizard.steps.dna },
  { id: "padroes", label: t.characterSheet.wizard.steps.padroes },
  { id: "narrativa", label: t.characterSheet.wizard.steps.narrativa },
  { id: "resumo", label: t.characterSheet.wizard.steps.resumo },
];

type CharacterWizardProps = {
  onClose: () => void;
  /** Fired as soon as the character exists, so the canvas can show its card. */
  onCreated: (character: CharacterEntity) => void;
};

export function CharacterWizard({ onClose, onCreated }: CharacterWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [entityId, setEntityId] = useState<string | null>(null);

  const character = useEntitiesStore((state) =>
    entityId ? state.characters[entityId] : undefined,
  );
  const updateSheet = useEntitiesStore((state) => state.updateSheet);
  const addVersion = useEntitiesStore((state) => state.addVersion);
  // The extraction is applied on the server; the draft receives the whole sheet
  // back, exactly as loading a version into the draft does.
  const loadIntoDraft = useEntitiesStore((state) => state.loadIntoDraft);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const saveDraft = useDraftAutosave(entityId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const step = STEPS[stepIndex];
  const update = (mutate: (sheet: CharacterSheet) => void) => {
    if (entityId) updateSheet(entityId, mutate);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 m-auto h-[88vh] w-[min(900px,92vw)] overflow-hidden rounded-2xl
                 border border-line bg-surface p-0 text-ink shadow-2xl shadow-black/50
                 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-full flex-col">
        <header className="shrink-0 border-b border-line px-5 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-ink">
              {character ? character.displayName : t.characterSheet.newCharacter.title}
            </h2>
            <span className="text-xs text-ink-faint">
              {t.characterSheet.wizard.stepLabel} {stepIndex + 1} {t.characterSheet.wizard.of}{" "}
              {STEPS.length} · {step.label}
            </span>

            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={t.characterSheet.wizard.close}
              className="ml-auto flex size-7 items-center justify-center rounded-lg text-ink-muted
                         transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-2.5 flex gap-1">
            {STEPS.map((entry, index) => (
              <span
                key={entry.id}
                className={`h-1 flex-1 rounded-full ${
                  index <= stepIndex ? "bg-accent" : "bg-line"
                }`}
              />
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {step.id === "identidade" ? (
            <IdentityStep
              onCreated={(created) => {
                setEntityId(created.id);
                onCreated(created);
                setStepIndex(1);
              }}
            />
          ) : null}

          {step.id === "foto" && entityId ? (
            <PhotoStep
              entityId={entityId}
              flushDraft={() => saveDraft(entityId)}
              onExtracted={(extracted) => {
                loadIntoDraft(entityId, extracted);
                // Straight to the review: the yellows are the point of the
                // extraction, and the user should meet them immediately.
                setStepIndex(2);
              }}
              onManual={() => setStepIndex(2)}
            />
          ) : null}

          {step.id === "dna" && character ? (
            <>
              <p className="mb-4 text-xs leading-relaxed text-ink-faint">
                {t.characterSheet.wizard.dnaHint}
              </p>
              <DnaTab sheet={character.sheet} update={update} />
            </>
          ) : null}

          {step.id === "padroes" && character ? (
            <>
              <p className="mb-4 text-xs leading-relaxed text-ink-faint">
                {t.characterSheet.wizard.padroesHint}
              </p>
              <PadroesTab sheet={character.sheet} update={update} />
            </>
          ) : null}

          {step.id === "narrativa" && character ? (
            <>
              <p className="mb-4 text-xs leading-relaxed text-ink-faint">
                {t.characterSheet.wizard.narrativaHint}
              </p>
              <NarrativaTab sheet={character.sheet} update={update} />
            </>
          ) : null}

          {step.id === "resumo" && character ? (
            <SummaryStep
              displayName={character.displayName}
              handle={character.handle}
              sheet={character.sheet}
              onSaveV1={async (): Promise<string | null> => {
                if (!entityId) return t.characterSheet.wizard.resumo.saveFailed;

                // The snapshot is taken from the stored draft, so what the user
                // typed has to land before it can be photographed.
                const flushed = await saveDraft(entityId);
                if (!flushed) return t.characterSheet.errors.saveFailed;

                const result = await saveCharacterVersion({ entityId, label: "" });
                if (!result.ok) return t.characterSheet.wizard.resumo.saveFailed;

                addVersion(
                  entityId,
                  {
                    id: result.version.id,
                    number: result.version.number,
                    label: result.version.label,
                    createdAt: result.version.createdAt,
                  },
                  result.version.sheet,
                );

                dialogRef.current?.close();
                return null;
              }}
              onKeepDraft={() => dialogRef.current?.close()}
            />
          ) : null}
        </div>

        {step.id === "identidade" || step.id === "resumo" ? null : (
          <footer className="flex shrink-0 items-center justify-between border-t border-line px-5 py-3">
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-3"
              // Going back across the creation of the character is not offered:
              // the handle is settled the moment it exists.
              disabled={stepIndex <= 1}
              onClick={() => setStepIndex((current) => Math.max(1, current - 1))}
            >
              {t.characterSheet.wizard.back}
            </Button>

            <div className="flex items-center gap-2">
              {step.id === "narrativa" ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 px-3"
                  onClick={() => setStepIndex(STEPS.length - 1)}
                >
                  {t.characterSheet.wizard.skip}
                </Button>
              ) : null}

              {step.id === "foto" ? null : (
                <Button
                  type="button"
                  className="h-9 px-4"
                  onClick={() => setStepIndex((current) => Math.min(STEPS.length - 1, current + 1))}
                >
                  {t.characterSheet.wizard.next}
                </Button>
              )}
            </div>
          </footer>
        )}
      </div>
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — identity
// ---------------------------------------------------------------------------

type HandleState = "idle" | "checking" | "available" | "taken" | "invalid";

const HANDLE_CHECK_DELAY_MS = 400;

function IdentityStep({ onCreated }: { onCreated: (character: CharacterEntity) => void }) {
  const addCharacter = useEntitiesStore((state) => state.addCharacter);

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [genero, setGenero] = useState<string>("feminino");
  /** The last answer the server gave, tagged with the handle it was about. */
  const [checked, setChecked] = useState<{ handle: string; available: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Until the user edits the handle, it follows the name — "Júlia Andrade"
  // becomes "julia-andrade" while they type.
  const effectiveHandle = handleTouched ? handle : slugifyHandle(displayName);

  // Shape and emptiness are decided here, from the value itself — only the
  // question the server has to answer needs to be remembered.
  const shape = effectiveHandle === "" ? "empty" : isValidHandle(effectiveHandle) ? "ok" : "invalid";

  useEffect(() => {
    if (shape !== "ok") return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      const result = await isHandleAvailable(effectiveHandle);
      if (!cancelled) setChecked({ handle: effectiveHandle, available: result.available });
    }, HANDLE_CHECK_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [effectiveHandle, shape]);

  const handleState: HandleState =
    shape === "empty"
      ? "idle"
      : shape === "invalid"
        ? "invalid"
        : checked?.handle === effectiveHandle
          ? checked.available
            ? "available"
            : "taken"
          : "checking";

  const canSubmit = displayName.trim() !== "" && handleState === "available" && !submitting;

  async function submit() {
    setSubmitting(true);
    setError(null);

    const result = await createCharacter({
      displayName: displayName.trim(),
      handle: effectiveHandle,
      genero,
    });

    if (!result.ok) {
      setSubmitting(false);
      setError(
        result.reason === "handle_taken"
          ? t.characterSheet.errors.handleTaken
          : t.characterSheet.errors.createFailed,
      );
      return;
    }

    addCharacter(result.character);
    onCreated(result.character);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) void submit();
      }}
      className="mx-auto max-w-md"
    >
      <p className="text-xs text-ink-faint">{t.characterSheet.newCharacter.subtitle}</p>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="wizard-name" className="mb-1.5 block text-xs font-medium text-ink-muted">
            {t.characterSheet.newCharacter.nameLabel}
          </label>
          <input
            id="wizard-name"
            type="text"
            autoFocus
            value={displayName}
            placeholder={t.characterSheet.newCharacter.namePlaceholder}
            onChange={(event) => setDisplayName(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="wizard-handle" className="mb-1.5 block text-xs font-medium text-ink-muted">
            {t.characterSheet.newCharacter.handleLabel}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-faint">@</span>
            <input
              id="wizard-handle"
              type="text"
              value={effectiveHandle}
              onChange={(event) => {
                setHandleTouched(true);
                setHandle(event.target.value.toLowerCase());
              }}
              className={inputClass}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-ink-faint">
            {t.characterSheet.newCharacter.handleHint} <HandleStatus state={handleState} />
          </p>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-ink-muted">
            {t.characterSheet.newCharacter.generoLabel}
          </legend>
          <div className="flex gap-2">
            {GENERO_APRESENTACAO.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={genero === option.key}
                onClick={() => setGenero(option.key)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs transition-colors ${
                  genero === option.key
                    ? "border-accent bg-accent-soft text-ink"
                    : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                {option.pt}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {error ? <p className="mt-4 text-xs text-negative">{error}</p> : null}

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={!canSubmit} className="h-9 px-4">
          {submitting ? t.characterSheet.newCharacter.creating : t.characterSheet.wizard.next}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — the reference: a photo, or text pasted from another platform
// ---------------------------------------------------------------------------

/**
 * The extraction engine's first door (decision E4). The manual path stays one
 * click away and always will: an engine that cannot be skipped is a toll booth,
 * and plenty of characters are invented rather than observed.
 */
function PhotoStep({
  entityId,
  flushDraft,
  onExtracted,
  onManual,
}: {
  entityId: string;
  flushDraft: () => Promise<boolean>;
  onExtracted: (sheet: CharacterSheet) => void;
  onManual: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-2">
      <p className="text-center text-xs leading-relaxed text-ink-muted">
        {t.characterSheet.wizard.foto.body}
      </p>

      <ExtractionPanel
        entityId={entityId}
        flushDraft={flushDraft}
        onApplied={(sheet) => onExtracted(sheet)}
      />

      <div className="mt-2 text-center">
        <Button type="button" variant="ghost" className="h-9 px-4" onClick={onManual}>
          {t.characterSheet.wizard.foto.manual}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 6 — summary
// ---------------------------------------------------------------------------

function SummaryStep({
  displayName,
  handle,
  sheet,
  onSaveV1,
  onKeepDraft,
}: {
  displayName: string;
  handle: string;
  sheet: CharacterSheet;
  onSaveV1: () => Promise<string | null>;
  onKeepDraft: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only fields that would actually reach a generation are counted: a summary
  // that counted inferred or empty ones would flatter, not inform.
  const filled = DNA_FIELDS.filter((field) => entersPrompt(field.read(sheet).estado)).length;
  const hasNarrative =
    sheet.narrativa.nome_completo !== "" ||
    sheet.narrativa.ocupacao !== "" ||
    sheet.narrativa.idade !== null ||
    sheet.narrativa.personalidade.qualidades.length > 0;
  const images = Object.values(sheet.imagens_canonicas).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-md py-4">
      <div className="flex items-center gap-3">
        <Portrait name={displayName} className="size-12" />
        <div>
          <p className="text-sm font-medium text-ink">{displayName}</p>
          <p className="text-xs text-ink-faint">@{handle}</p>
        </div>
      </div>

      <ul className="mt-5 space-y-1.5 text-xs text-ink-muted">
        <li>
          {filled > 0
            ? `${filled}${t.characterSheet.wizard.resumo.dnaFilledSuffix}`
            : t.characterSheet.wizard.resumo.dnaEmpty}
        </li>
        <li>
          {hasNarrative
            ? t.characterSheet.wizard.resumo.narrativeFilled
            : t.characterSheet.wizard.resumo.narrativeEmpty}
        </li>
        <li>
          {images > 0
            ? `${images} ${t.characterSheet.editor.images.title.toLowerCase()}`
            : t.characterSheet.wizard.resumo.imagesEmpty}
        </li>
      </ul>

      {error ? <p className="mt-4 text-xs text-negative">{error}</p> : null}

      <div className="mt-6 space-y-2">
        <Button
          type="button"
          disabled={saving}
          className="h-9 w-full px-4"
          onClick={async () => {
            setSaving(true);
            setError(null);

            const failure = await onSaveV1();

            if (failure) {
              setSaving(false);
              setError(failure);
            }
          }}
        >
          {saving
            ? t.characterSheet.wizard.resumo.saving
            : t.characterSheet.wizard.resumo.saveV1}
        </Button>

        <Button type="button" variant="ghost" className="h-9 w-full px-4" onClick={onKeepDraft}>
          {t.characterSheet.wizard.resumo.keepDraft}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-ink-faint">
          {t.characterSheet.wizard.resumo.keepDraftHint}
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-faint focus:border-accent focus:outline-none";

function HandleStatus({ state }: { state: HandleState }) {
  if (state === "checking") {
    return <span className="text-ink-faint">· {t.characterSheet.newCharacter.handleChecking}</span>;
  }

  if (state === "available") {
    return <span className="text-positive">· {t.characterSheet.newCharacter.handleAvailable}</span>;
  }

  if (state === "taken") {
    return <span className="text-negative">· {t.characterSheet.newCharacter.handleTaken}</span>;
  }

  if (state === "invalid") {
    return <span className="text-negative">· {t.characterSheet.newCharacter.handleInvalid}</span>;
  }

  return null;
}
