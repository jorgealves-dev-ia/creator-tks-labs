import { create } from "zustand";

import type { CharacterSheet } from "@/lib/character-sheet/schema";
import { syncTranslationCache } from "@/lib/character-sheet/translation";
import type { ActiveVersion, CharacterEntity, VersionSummary } from "@/lib/entities/types";

/** Same vocabulary the canvas uses for its own autosave. */
export type DraftStatus = "saved" | "dirty" | "saving" | "failed";

export type CharacterRecord = CharacterEntity & {
  draftStatus: DraftStatus;
  /** Bumped by every edit; lets a save detect edits made while it was in flight. */
  revision: number;
  /** Epoch millis of the last successful draft save, for "rascunho salvo às 14:32". */
  lastSavedAt: number | null;
};

type EntitiesState = {
  characters: Record<string, CharacterRecord>;
  /** Display order, kept separate so the record can be looked up by id. */
  order: string[];
  /** The character whose editor overlay is open, if any. */
  editingId: string | null;
  /**
   * False until the server list has been handed over. Seeding happens in an
   * effect — never during render, which on the server would leak one visitor's
   * characters into another's request — so a card must be able to tell "not
   * loaded yet" from "this character no longer exists".
   */
  seeded: boolean;

  /** The saved versions of each character, loaded when its editor opens. */
  versions: Record<string, VersionSummary[]>;
  /** The frozen version being looked at, or null while editing the draft. */
  viewingVersionId: string | null;
  /** The snapshot of that frozen version, shown read-only. */
  viewingSheet: CharacterSheet | null;

  seed: (characters: CharacterEntity[]) => void;
  addCharacter: (character: CharacterEntity) => void;
  /** Applies an edit to the draft. The mutator receives a private copy. */
  updateSheet: (id: string, mutate: (sheet: CharacterSheet) => void) => void;
  setDisplayName: (id: string, displayName: string) => void;
  setDraftStatus: (id: string, status: DraftStatus) => void;
  markDraftSaved: (id: string, revision: number) => void;
  openEditor: (id: string) => void;
  closeEditor: () => void;
  /**
   * Takes an archived character out of the lists. The row itself is preserved,
   * along with every generation, version and image that ever pointed at it —
   * see archiveCharacter for the measurement behind that.
   */
  forget: (id: string) => void;

  setVersions: (id: string, versions: VersionSummary[]) => void;
  /** After saving: the new snapshot is added to the list and becomes active. */
  addVersion: (id: string, summary: VersionSummary, sheet: CharacterSheet) => void;
  /** Rollback: the pointer moves, nothing is rewritten. */
  setActiveVersion: (id: string, version: ActiveVersion) => void;
  /** Replaces the draft with a frozen snapshot, which autosave then persists. */
  loadIntoDraft: (id: string, sheet: CharacterSheet) => void;
  viewVersion: (versionId: string, sheet: CharacterSheet) => void;
  viewDraft: () => void;
};

function toRecord(character: CharacterEntity): CharacterRecord {
  return { ...character, draftStatus: "saved", revision: 0, lastSavedAt: null };
}

export const useEntitiesStore = create<EntitiesState>((set, get) => ({
  characters: {},
  order: [],
  editingId: null,
  seeded: false,
  versions: {},
  viewingVersionId: null,
  viewingSheet: null,

  seed: (characters) =>
    set({
      characters: Object.fromEntries(
        characters.map((character) => [character.id, toRecord(character)]),
      ),
      order: characters.map((character) => character.id),
      seeded: true,
    }),

  addCharacter: (character) =>
    set((state) => ({
      characters: { ...state.characters, [character.id]: toRecord(character) },
      order: state.order.includes(character.id) ? state.order : [...state.order, character.id],
    })),

  updateSheet: (id, mutate) => {
    const current = get().characters[id];
    if (!current) return;

    // Cloned before mutating so the field writers in fields.ts can be plain
    // assignments without ever touching the object React is rendering.
    const sheet = structuredClone(current.sheet);
    mutate(sheet);

    // Every edit in the application funnels through here, which is exactly why
    // the cached-English rule lives on this line and nowhere else: change the
    // Portuguese, lose the translation. A component cannot forget a rule it
    // never has to remember.
    syncTranslationCache(current.sheet, sheet);

    set((state) => ({
      characters: {
        ...state.characters,
        [id]: {
          ...current,
          sheet,
          revision: current.revision + 1,
          draftStatus: "dirty",
        },
      },
    }));
  },

  setDisplayName: (id, displayName) =>
    set((state) => {
      const current = state.characters[id];
      if (!current) return state;

      return {
        characters: {
          ...state.characters,
          [id]: {
            ...current,
            displayName,
            revision: current.revision + 1,
            draftStatus: "dirty",
          },
        },
      };
    }),

  setDraftStatus: (id, draftStatus) =>
    set((state) => {
      const current = state.characters[id];
      if (!current) return state;

      return { characters: { ...state.characters, [id]: { ...current, draftStatus } } };
    }),

  markDraftSaved: (id, revision) =>
    set((state) => {
      const current = state.characters[id];
      if (!current) return state;

      // Only settle on "saved" if nothing changed while the save was running.
      const stillCurrent = current.revision === revision;

      return {
        characters: {
          ...state.characters,
          [id]: {
            ...current,
            draftStatus: stillCurrent ? "saved" : "dirty",
            lastSavedAt: Date.now(),
          },
        },
      };
    }),

  // Opening an editor always starts on the draft — the notebook, not a frame on
  // the wall (spec §5).
  openEditor: (editingId) => set({ editingId, viewingVersionId: null, viewingSheet: null }),
  closeEditor: () => set({ editingId: null, viewingVersionId: null, viewingSheet: null }),

  forget: (id) =>
    set((state) => {
      const characters = { ...state.characters };
      delete characters[id];

      return {
        characters,
        order: state.order.filter((entry) => entry !== id),
        // The editor was open on her; leaving it open would leave a dialog
        // editing a draft that no list contains any more.
        editingId: state.editingId === id ? null : state.editingId,
        viewingVersionId: state.editingId === id ? null : state.viewingVersionId,
        viewingSheet: state.editingId === id ? null : state.viewingSheet,
      };
    }),

  setVersions: (id, list) =>
    set((state) => ({ versions: { ...state.versions, [id]: list } })),

  addVersion: (id, summary, sheet) =>
    set((state) => {
      const character = state.characters[id];
      if (!character) return state;

      return {
        // Newest first, matching how the dropdown reads.
        versions: { ...state.versions, [id]: [summary, ...(state.versions[id] ?? [])] },
        characters: {
          ...state.characters,
          [id]: {
            ...character,
            activeVersion: { id: summary.id, number: summary.number, sheet },
          },
        },
      };
    }),

  setActiveVersion: (id, version) =>
    set((state) => {
      const character = state.characters[id];
      if (!character) return state;

      return {
        characters: { ...state.characters, [id]: { ...character, activeVersion: version } },
      };
    }),

  loadIntoDraft: (id, sheet) =>
    set((state) => {
      const character = state.characters[id];
      if (!character) return state;

      return {
        characters: {
          ...state.characters,
          [id]: {
            ...character,
            sheet: structuredClone(sheet),
            revision: character.revision + 1,
            draftStatus: "dirty",
          },
        },
        viewingVersionId: null,
        viewingSheet: null,
      };
    }),

  viewVersion: (viewingVersionId, viewingSheet) => set({ viewingVersionId, viewingSheet }),
  viewDraft: () => set({ viewingVersionId: null, viewingSheet: null }),
}));
