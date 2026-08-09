"use client";

import { useCallback, useEffect, useRef } from "react";

import { applyTranslations, pendingTranslations } from "@/lib/character-sheet/translation";
import { saveCharacterDraft } from "@/lib/entities/actions";
import { useEntitiesStore } from "@/lib/entities/store";
import { translateDraftFreeText } from "@/lib/prompt/translate";

/**
 * The draft is the notebook that stays open: there is no "save draft" button,
 * only this. What takes intent is a *version*, never a draft — spec 3.2.
 */
const DRAFT_AUTOSAVE_DELAY_MS = 1000;

/**
 * The one place that writes a draft to the database. Reads the live store rather
 * than props, so it never persists a stale sheet.
 *
 * Returns whether the save landed, which is what lets "save as new version"
 * flush the pending draft first and refuse to photograph a notebook it could not
 * write.
 */
export function useSaveDraft() {
  return useCallback(async (entityId: string): Promise<boolean> => {
    const character = useEntitiesStore.getState().characters[entityId];

    if (!character) return false;

    const revisionAtStart = character.revision;
    useEntitiesStore.getState().setDraftStatus(entityId, "saving");

    const result = await saveCharacterDraft({
      entityId,
      displayName: character.displayName,
      sheet: character.sheet,
    });

    // The character may have been dropped from the store meanwhile.
    if (!useEntitiesStore.getState().characters[entityId]) return result.ok;

    if (result.ok) {
      useEntitiesStore.getState().markDraftSaved(entityId, revisionAtStart);

      // §3.3: the free text gets its English right after the draft lands, so the
      // compiler — which may not call anything — always finds a cache waiting.
      // Deliberately not awaited: nobody should watch a spinner for plumbing.
      void fillTranslationCache(entityId);
    } else {
      // Never silently discard what the user typed: the indicator turns into a
      // warning and the next edit schedules another attempt.
      useEntitiesStore.getState().setDraftStatus(entityId, "failed");
    }

    return result.ok;
  }, []);
}

/**
 * Entities whose translation call is already in flight. Two autosaves in quick
 * succession would otherwise pay for the same batch twice.
 */
const translating = new Set<string>();

/**
 * Fills the English cache of the free-text fields, then feeds the result back
 * into the draft as an ordinary edit — which turns it dirty, which makes the next
 * autosave persist the cache.
 *
 * The loop closes by itself: once every fragment has its English, there is
 * nothing pending, and this returns before making a call.
 */
async function fillTranslationCache(entityId: string): Promise<void> {
  if (translating.has(entityId)) return;

  const character = useEntitiesStore.getState().characters[entityId];

  if (!character || pendingTranslations(character.sheet).length === 0) return;

  translating.add(entityId);

  try {
    const result = await translateDraftFreeText(entityId);

    if (!result.ok || result.entries.length === 0) return;

    // applyTranslations drops anything whose Portuguese moved on while the call
    // was in flight, so typing during a translation can never be overwritten by
    // the English of a sentence that no longer exists.
    useEntitiesStore.getState().updateSheet(entityId, (sheet) => {
      applyTranslations(sheet, result.entries);
    });
  } finally {
    translating.delete(entityId);
  }
}

/**
 * Saves a moment after the user stops typing, and once more when the editor
 * closes. Call it exactly once, from the component that owns the editor.
 */
export function useDraftAutosave(entityId: string | null) {
  const save = useSaveDraft();
  const status = useEntitiesStore((state) =>
    entityId ? state.characters[entityId]?.draftStatus : undefined,
  );
  const revision = useEntitiesStore((state) =>
    entityId ? state.characters[entityId]?.revision : undefined,
  );

  useEffect(() => {
    if (!entityId || status !== "dirty") return;

    const timer = setTimeout(() => void save(entityId), DRAFT_AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [entityId, status, revision, save]);

  // Kept in a ref so the flush effect depends only on the id, and therefore runs
  // when the editor really closes rather than on every re-render.
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    if (!entityId) return;

    return () => {
      if (useEntitiesStore.getState().characters[entityId]?.draftStatus === "dirty") {
        void saveRef.current(entityId);
      }
    };
  }, [entityId]);

  return save;
}
