"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CanonicalImagesColumn } from "@/components/character-sheet/canonical-images-column";
import { DnaTab } from "@/components/character-sheet/dna-tab";
import { Portrait, VersionBadge } from "@/components/character-sheet/identity";
import { NarrativaTab } from "@/components/character-sheet/narrativa-tab";
import { PadroesTab } from "@/components/character-sheet/padroes-tab";
import { SaveVersionModal } from "@/components/character-sheet/save-version-modal";
import { VersionBanner, VersionSelector } from "@/components/character-sheet/version-controls";
import { isDraftDirty } from "@/lib/character-sheet/diff";
import { confirmPending, listPendingFields, nextPendingAfter } from "@/lib/character-sheet/pending";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import {
  activateCharacterVersion,
  getCharacterVersionSheet,
  listCharacterVersions,
  saveCharacterVersion,
} from "@/lib/entities/actions";
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
  const versions = useEntitiesStore((state) => state.versions[entityId]);
  const viewingVersionId = useEntitiesStore((state) => state.viewingVersionId);
  const viewingSheet = useEntitiesStore((state) => state.viewingSheet);

  const updateSheet = useEntitiesStore((state) => state.updateSheet);
  const setDisplayName = useEntitiesStore((state) => state.setDisplayName);
  const closeEditor = useEntitiesStore((state) => state.closeEditor);
  const setVersions = useEntitiesStore((state) => state.setVersions);
  const addVersion = useEntitiesStore((state) => state.addVersion);
  const setActiveVersion = useEntitiesStore((state) => state.setActiveVersion);
  const loadIntoDraft = useEntitiesStore((state) => state.loadIntoDraft);
  const viewVersion = useEntitiesStore((state) => state.viewVersion);
  const viewDraft = useEntitiesStore((state) => state.viewDraft);

  const [tab, setTab] = useState<TabId>("dna");
  /** The pending field the review last stopped at, so the next jump moves on. */
  const [reviewCursor, setReviewCursor] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [versionBusy, setVersionBusy] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Autosave lives here: the draft is written while the editor is open and
  // flushed once more when it closes.
  const saveDraft = useDraftAutosave(entityId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void listCharacterVersions(entityId).then((list) => {
      if (!cancelled) setVersions(entityId, list);
    });

    return () => {
      cancelled = true;
    };
  }, [entityId, setVersions]);

  const update = useCallback(
    (mutate: (sheet: CharacterSheet) => void) => updateSheet(entityId, mutate),
    [entityId, updateSheet],
  );

  /** Scrolls a field into view and puts the cursor in it, switching tab if needed. */
  const jumpTo = useCallback((fieldId: string) => {
    setTab("dna");
    setReviewCursor(fieldId);

    // One frame for the tab switch to render before the element can be found.
    requestAnimationFrame(() => {
      const row = panelRef.current?.querySelector<HTMLElement>(`[data-field-id="${fieldId}"]`);
      if (!row) return;

      row.scrollIntoView({ behavior: "smooth", block: "center" });
      row.querySelector<HTMLElement>("select, input, button")?.focus({ preventScroll: true });
    });
  }, []);

  if (!character) return null;

  const isViewingVersion = viewingVersionId !== null && viewingSheet !== null;
  const shownSheet = isViewingVersion ? viewingSheet : character.sheet;
  const versionList = versions ?? [];

  // The counter always speaks about the draft: a frozen version is not something
  // that can be confirmed any more.
  const pending = listPendingFields(character.sheet);
  const dirty = isDraftDirty(character.sheet, character.activeVersion?.sheet ?? null);
  const viewedVersion = versionList.find((version) => version.id === viewingVersionId);
  const activeTab = TABS.find((entry) => entry.id === tab) ?? TABS[0];

  function jumpToNextPending() {
    const next = nextPendingAfter(pending, reviewCursor);
    if (next) jumpTo(next.id);
  }

  /** Confirms one yellow field and moves straight on to the next (U3). */
  function handleConfirm(fieldId: string) {
    const next = nextPendingAfter(pending, fieldId);

    update((draft) => confirmPending(draft, fieldId));
    setReviewCursor(fieldId);

    if (next) jumpTo(next.id);
  }

  async function handleSelectVersion(versionId: string | null) {
    setVersionError(null);

    if (versionId === null) {
      viewDraft();
      return;
    }

    setVersionBusy(true);
    const result = await getCharacterVersionSheet(versionId);
    setVersionBusy(false);

    if (!result.ok) {
      setVersionError(t.characterSheet.versions.errors.loadFailed);
      return;
    }

    viewVersion(versionId, result.sheet);
  }

  async function handleActivate() {
    if (!viewingVersionId) return;

    setVersionBusy(true);
    setVersionError(null);

    const result = await activateCharacterVersion({ entityId, versionId: viewingVersionId });
    setVersionBusy(false);

    if (!result.ok) {
      setVersionError(t.characterSheet.versions.errors.activateFailed);
      return;
    }

    setActiveVersion(entityId, result.version);
  }

  function handleLoadIntoDraft() {
    if (!viewingSheet) return;

    loadIntoDraft(entityId, viewingSheet);
    setTab("dna");
  }

  /** Returns an error message for the modal, or null when the version was saved. */
  async function handleSaveVersion(label: string): Promise<string | null> {
    // The snapshot is taken from the stored draft, so the pending autosave has
    // to land first. If it cannot, no version is written — a frame of something
    // that was never in the notebook would be a lie.
    const flushed = await saveDraft(entityId);

    if (!flushed) return t.characterSheet.errors.saveFailed;

    const result = await saveCharacterVersion({ entityId, label });

    if (!result.ok) {
      if (result.reason === "unchanged") return t.characterSheet.versions.errors.unchanged;
      if (result.reason === "archived") return t.characterSheet.versions.errors.archived;
      if (result.reason === "not_found") return t.characterSheet.versions.errors.notFound;
      return t.characterSheet.versions.errors.failed;
    }

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

    setShowSaveModal(false);
    return null;
  }

  return (
    <>
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
                className="w-48 rounded-lg border border-transparent bg-transparent px-2 py-1
                           text-sm font-medium text-ink transition-colors
                           hover:border-line focus:border-accent focus:outline-none"
              />
              <p className="px-2 text-xs text-ink-faint">@{character.handle}</p>
            </div>

            <VersionBadge versionNumber={character.activeVersion?.number ?? null} />

            {/* A dropdown whose only entry is "Rascunho" says nothing the badge
                beside it has not already said. */}
            {versionList.length > 0 ? (
              <VersionSelector
                versions={versionList}
                activeVersionId={character.activeVersion?.id ?? null}
                viewingVersionId={viewingVersionId}
                onSelect={(versionId) => void handleSelectVersion(versionId)}
              />
            ) : null}

            <div className="ml-auto flex items-center gap-3">
              {isViewingVersion ? null : (
                <PendingCounter count={pending.length} onJump={() => jumpToNextPending()} />
              )}

              <AutosaveIndicator status={character.draftStatus} savedAt={character.lastSavedAt} />

              {isViewingVersion ? null : (
                <button
                  type="button"
                  disabled={!dirty}
                  onClick={() => setShowSaveModal(true)}
                  title={dirty ? undefined : disabledSaveHint(character.activeVersion?.number)}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white
                             transition-colors hover:bg-accent-hover
                             disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t.characterSheet.versions.save}
                </button>
              )}

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

          {isViewingVersion && viewedVersion ? (
            <VersionBanner
              versionNumber={viewedVersion.number}
              isActive={viewedVersion.id === character.activeVersion?.id}
              busy={versionBusy}
              error={versionError}
              needsLoadConfirmation={dirty}
              onActivate={() => void handleActivate()}
              onLoadIntoDraft={handleLoadIntoDraft}
              onBackToDraft={viewDraft}
            />
          ) : null}

          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-line px-6 pt-3">
                <nav
                  role="tablist"
                  aria-label={t.characterSheet.editor.title}
                  className="flex gap-1"
                >
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
                ref={panelRef}
                id={`panel-${tab}`}
                role="tabpanel"
                className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
              >
                {/* A frozen version is read-only, and a disabled fieldset is how
                    the platform says that to every control at once. */}
                <fieldset disabled={isViewingVersion} className="min-w-0">
                  {tab === "dna" ? (
                    <DnaTab sheet={shownSheet} update={update} onConfirm={handleConfirm} />
                  ) : null}
                  {tab === "padroes" ? <PadroesTab sheet={shownSheet} update={update} /> : null}
                  {tab === "narrativa" ? (
                    <NarrativaTab sheet={shownSheet} update={update} />
                  ) : null}
                </fieldset>
              </div>
            </div>

            <CanonicalImagesColumn sheet={shownSheet} />
          </div>
        </div>
      </dialog>

      {showSaveModal ? (
        <SaveVersionModal
          // Informative only, and read from the highest number that exists — not
          // from the active one, which may be an older version after a rollback.
          nextNumber={(versionList[0]?.number ?? 0) + 1}
          pendingCount={pending.length}
          onCancel={() => setShowSaveModal(false)}
          onConfirm={handleSaveVersion}
        />
      ) : null}
    </>
  );
}

function disabledSaveHint(activeNumber: number | undefined): string {
  if (activeNumber === undefined) return t.characterSheet.versions.saveDisabledNoChange;

  return `${t.characterSheet.versions.saveDisabledPrefix}${t.characterSheet.card.versionPrefix}${activeNumber}`;
}

/**
 * The count of fields still waiting for the user's eyes. It disappears at zero —
 * a counter reading "0 pending" is noise, not information.
 */
function PendingCounter({ count, onJump }: { count: number; onJump: () => void }) {
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={onJump}
      title={t.characterSheet.pending.jump}
      className="rounded-lg bg-warning/15 px-2 py-1 text-xs font-medium text-warning
                 transition-colors hover:bg-warning/25"
    >
      {count === 1
        ? t.characterSheet.pending.one
        : `${count}${t.characterSheet.pending.manySuffix}`}
    </button>
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
