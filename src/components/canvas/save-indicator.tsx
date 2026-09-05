"use client";

import { useCanvasStore } from "@/lib/canvas/store";
import { useSaveWorkflow } from "@/lib/canvas/use-autosave";
import { t } from "@/lib/i18n/pt-BR";

export function SaveIndicator() {
  const saveStatus = useCanvasStore((state) => state.saveStatus);
  const saveFailure = useCanvasStore((state) => state.saveFailure);
  const projectId = useCanvasStore((state) => state.projectId);
  const save = useSaveWorkflow();

  if (!projectId) return null;

  // A trava do grafo falou. Não é "erro" e não é "não salvo": é **recusa**, e a
  // frase precisa dizer o gesto que resolve — recarregar antes de editar.
  if (saveStatus === "recusado") {
    return (
      <span aria-live="polite" className="text-xs text-warning">
        {t.studio.save.vinculosAusentes}
      </span>
    );
  }

  if (saveStatus === "failed") {
    // Two failures, two sentences, and neither of them is "erro". What failed is
    // the *drawing* of the canvas — a generated image is already in Storage and
    // a debit is already in the ledger, and saying so is the difference between
    // a worrying message and an informative one.
    const conflict = saveFailure === "conflict";

    return (
      <div className="flex items-center gap-1.5 text-xs text-negative">
        <span>{conflict ? t.studio.save.conflict : t.studio.save.failed}</span>
        {conflict ? null : (
          <button
            type="button"
            onClick={() => void save()}
            className="underline underline-offset-2 hover:text-ink"
          >
            {t.studio.save.retry}
          </button>
        )}
      </div>
    );
  }

  const label = {
    saved: t.studio.save.saved,
    dirty: t.studio.save.unsaved,
    saving: t.studio.save.saving,
  }[saveStatus];

  return (
    <span
      aria-live="polite"
      className={`text-xs ${saveStatus === "saved" ? "text-ink-faint" : "text-ink-muted"}`}
    >
      {label}
    </span>
  );
}
