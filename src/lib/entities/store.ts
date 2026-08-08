import { create } from "zustand";

import type { CharacterSheet } from "@/lib/character-sheet/schema";
import type { CharacterEntity } from "@/lib/entities/types";

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

  seed: (characters: CharacterEntity[]) => void;
  addCharacter: (character: CharacterEntity) => void;
  /** Applies an edit to the draft. The mutator receives a private copy. */
  updateSheet: (id: string, mutate: (sheet: CharacterSheet) => void) => void;
  setDisplayName: (id: string, displayName: string) => void;
  setDraftStatus: (id: string, status: DraftStatus) => void;
  markDraftSaved: (id: string, revision: number) => void;
  openEditor: (id: string) => void;
  closeEditor: () => void;
};

function toRecord(character: CharacterEntity): CharacterRecord {
  return { ...character, draftStatus: "saved", revision: 0, lastSavedAt: null };
}

export const useEntitiesStore = create<EntitiesState>((set, get) => ({
  characters: {},
  order: [],
  editingId: null,
  seeded: false,

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

  openEditor: (editingId) => set({ editingId }),
  closeEditor: () => set({ editingId: null }),
}));
