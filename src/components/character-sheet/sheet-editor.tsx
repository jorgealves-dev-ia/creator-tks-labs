"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CanonicalImagesColumn } from "@/components/character-sheet/canonical-images-column";
import { DnaTab } from "@/components/character-sheet/dna-tab";
import { Portrait, VersionBadge } from "@/components/character-sheet/identity";
import { NarrativaTab } from "@/components/character-sheet/narrativa-tab";
import { PadroesTab } from "@/components/character-sheet/padroes-tab";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import { useEntitiesStore, type DraftStatus } from "@/lib/entities/store";
import { useDraftAutosave } from "@/lib/entities/use-draft-autosave";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The editor of a character: a near-fullscreen overlay, never twenty-five fields
 * crammed into a node (U1). Rendered once, at the studio level, because both the
 * canvas card and the sidebar open it.
 */
export function SheetEditor() {
  const editingId = useEntitiesStore((state) => state.editingId);

  // Keyed by character: opening a different one gets a fresh editor rather than
  // a reused one holding the previous character's tab and typing state.
  return editingId ? <SheetEditorDialog key={editingId} entityId={editingId} /> : null;
}

type TabId = "dna" | "padroes" | "narrativa";

const TABS: readonly { id: TabId; label: string; hint: string }[] = [
  {
    id: "dna",
    label: t.characterSheet.editor.tabs.dna,
    hint: t.characterSheet.editor.tabHints.dna,
  },
  {
    id: "padroes",
    label: t.characterSheet.editor.tabs.padroes,
    hint: t.characterSheet.editor.tabHints.padroes,
  },
  {
    id: "narrativa",
    label: t.characterSheet.editor.tabs.narrativa,
    hint: t.characterSheet.editor.tabHints.narrativa,
  },
];

function SheetEditorDialog({ entityId }: { entityId: string }) {
  const character = useEntitiesStore((state) => state.characters[entityId]);
  const updateSheet = useEntitiesStore((state) => state.updateSheet);
  const setDisplayName = useEntitiesStore((state) => state.setDisplayName);
  const closeEditor = useEntitiesStore((state) => state.closeEditor);

  const [tab, setTab] = useState<TabId>("dna");
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Autosave lives here: the draft is written while the editor is open and
  // flushed once more when it closes.
  useDraftAutosave(entityId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const update = useCallback(
    (mutate: (sheet: CharacterSheet) => void) => updateSheet(entityId, mutate),
    [entityId, updateSheet],
  );

  if (!character) return null;

  const activeTab = TABS.find((entry) => entry.id === tab) ?? TABS[0];

  return (
    <dialog
      ref={dialogRef}
      onClose={closeEditor}
      // A click that lands on the dialog element itself is a click on the
      // backdrop: the content below fills the box edge to edge.
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="fixed inset-0 m-auto h-[92vh] w-[min(1180px,94vw)] overflow-hidden rounded-2xl
                 border border-line bg-surface p-0 text-ink shadow-2xl shadow-black/50
                 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-full flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4">
          <Portrait name={character.displayName} />

          <div className="min-w-0">
            <label htmlFor="character-name" className="sr-only">
              {t.characterSheet.editor.nameLabel}
            </label>
            <input
              id="character-name"
              type="text"
              value={character.displayName}
              placeholder={t.characterSheet.editor.namePlaceholder}
              onChange={(event) => setDisplayName(entityId, event.target.value)}
              className="w-56 rounded-lg border border-transparent bg-transparent px-2 py-1
                         text-sm font-medium text-ink transition-colors
                         hover:border-line focus:border-accent focus:outline-none"
            />
            <p className="px-2 text-xs text-ink-faint">@{character.handle}</p>
          </div>

          <VersionBadge versionNumber={character.activeVersion?.number ?? null} />

          <div className="ml-auto flex items-center gap-3">
            <AutosaveIndicator status={character.draftStatus} savedAt={character.lastSavedAt} />

            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={t.characterSheet.editor.close}
              title={t.characterSheet.editor.close}
              className="flex size-8 items-center justify-center rounded-lg text-ink-muted
                         transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
                <path
                  d="M3 3l8 8M11 3l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-line px-6 pt-3">
              <nav role="tablist" aria-label={t.characterSheet.editor.title} className="flex gap-1">
                {TABS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    role="tab"
                    aria-selected={entry.id === tab}
                    aria-controls={`panel-${entry.id}`}
                    onClick={() => setTab(entry.id)}
                    className={`rounded-t-lg px-3 py-2 text-sm transition-colors ${
                      entry.id === tab
                        ? "border-b-2 border-accent font-medium text-ink"
                        : "border-b-2 border-transparent text-ink-muted hover:text-ink"
                    }`}
                  >
                    {entry.label}
                  </button>
                ))}
              </nav>
              <p className="px-1 py-2 text-xs text-ink-faint">{activeTab.hint}</p>
            </div>

            <div
              id={`panel-${tab}`}
              role="tabpanel"
              className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
            >
              {tab === "dna" ? <DnaTab sheet={character.sheet} update={update} /> : null}
              {tab === "padroes" ? <PadroesTab sheet={character.sheet} update={update} /> : null}
              {tab === "narrativa" ? (
                <NarrativaTab sheet={character.sheet} update={update} />
              ) : null}
            </div>
          </div>

          <CanonicalImagesColumn sheet={character.sheet} />
        </div>
      </div>
    </dialog>
  );
}

function AutosaveIndicator({
  status,
  savedAt,
}: {
  status: DraftStatus;
  savedAt: number | null;
}) {
  if (status === "failed") {
    return (
      <span className="text-xs text-negative">{t.characterSheet.editor.autosave.failed}</span>
    );
  }

  if (status === "saving") {
    return (
      <span className="text-xs text-ink-faint">{t.characterSheet.editor.autosave.saving}</span>
    );
  }

  if (status === "dirty") {
    return (
      <span className="text-xs text-ink-faint">{t.characterSheet.editor.autosave.pending}</span>
    );
  }

  if (savedAt === null) return null;

  return (
    <span className="text-xs text-ink-faint">
      {t.characterSheet.editor.autosave.savedAt}{" "}
      {new Date(savedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
