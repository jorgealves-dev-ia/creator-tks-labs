"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GENERO_APRESENTACAO } from "@/lib/character-sheet/dictionary";
import { createCharacter, isHandleAvailable } from "@/lib/entities/actions";
import { isValidHandle, slugifyHandle } from "@/lib/entities/handle";
import { useEntitiesStore } from "@/lib/entities/store";
import type { CharacterEntity } from "@/lib/entities/types";
import { t } from "@/lib/i18n/pt-BR";

type NewCharacterDialogProps = {
  onClose: () => void;
  onCreated: (character: CharacterEntity) => void;
};

type HandleState = "idle" | "checking" | "available" | "taken" | "invalid";

const HANDLE_CHECK_DELAY_MS = 400;

/**
 * The first step of the guided creation (U2): name, @handle and presented
 * gender. That is all the database needs to exist as a character — everything
 * else is the editor's job.
 *
 * The remaining steps of the wizard (reference photo, DNA review, defaults,
 * narrative, save as v1) arrive in the last step of this screen's work.
 */
export function NewCharacterDialog({ onClose, onCreated }: NewCharacterDialogProps) {
  const addCharacter = useEntitiesStore((state) => state.addCharacter);

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [genero, setGenero] = useState<string>("feminino");
  /** The last answer the server gave, tagged with the handle it was about. */
  const [checked, setChecked] = useState<{ handle: string; available: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

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

  const canSubmit =
    displayName.trim() !== "" && handleState === "available" && !submitting;

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
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="fixed inset-0 m-auto w-[min(28rem,92vw)] rounded-2xl border border-line
                 bg-surface p-0 text-ink shadow-2xl shadow-black/50 backdrop:bg-black/70"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) void submit();
        }}
        className="p-5"
      >
        <h2 className="text-sm font-medium text-ink">{t.characterSheet.newCharacter.title}</h2>
        <p className="mt-1 text-xs text-ink-faint">{t.characterSheet.newCharacter.subtitle}</p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="new-character-name" className="mb-1.5 block text-xs font-medium text-ink-muted">
              {t.characterSheet.newCharacter.nameLabel}
            </label>
            <input
              id="new-character-name"
              type="text"
              autoFocus
              value={displayName}
              placeholder={t.characterSheet.newCharacter.namePlaceholder}
              onChange={(event) => setDisplayName(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="new-character-handle" className="mb-1.5 block text-xs font-medium text-ink-muted">
              {t.characterSheet.newCharacter.handleLabel}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-faint">@</span>
              <input
                id="new-character-handle"
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

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-9 px-3"
            onClick={() => dialogRef.current?.close()}
          >
            {t.characterSheet.newCharacter.cancel}
          </Button>
          <Button type="submit" disabled={!canSubmit} className="h-9 px-4">
            {submitting
              ? t.characterSheet.newCharacter.creating
              : t.characterSheet.newCharacter.create}
          </Button>
        </div>
      </form>
    </dialog>
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
