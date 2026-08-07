"use client";

import { useCanvasStore } from "@/lib/canvas/store";
import { useSaveWorkflow } from "@/lib/canvas/use-autosave";
import { t } from "@/lib/i18n/pt-BR";

export function SaveIndicator() {
  const saveStatus = useCanvasStore((state) => state.saveStatus);
  const projectId = useCanvasStore((state) => state.projectId);
  const save = useSaveWorkflow();

  if (!projectId) return null;

  if (saveStatus === "failed") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-negative">
        <span>{t.studio.save.failed}</span>
        <button
          type="button"
          onClick={() => void save()}
          className="underline underline-offset-2 hover:text-ink"
        >
          {t.studio.save.retry}
        </button>
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
