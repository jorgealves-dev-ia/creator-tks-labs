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

  /**
   * Quais personagens estão vinculadas ao **projeto aberto** — a linha de
   * `project_entities` vista pelo navegador (Etapa D2).
   *
   * ---------------------------------------------------------------------------
   * Por que é um conjunto à parte, e não um recorte da lista
   * ---------------------------------------------------------------------------
   *
   * A alternativa óbvia — carregar só as vinculadas — foi recusada por dois
   * motivos, e o segundo é o que decide.
   *
   * O primeiro é de estado: `characters` carrega `draftStatus`, `revision` e
   * `lastSavedAt`, e o editor é um overlay do estúdio que **não desmonta ao
   * trocar de aba**. Re-semear a lista inteira a cada troca jogaria fora o
   * rascunho de quem estava editando, no meio de uma frase.
   *
   * O segundo é de vocabulário: **a personagem é do usuário, o vínculo é do
   * projeto.** São duas coisas com dois tempos de vida, e o código diz isso ao
   * ter duas semeaduras — `characters` uma vez, `linkedIds` a cada projeto. Com
   * uma lista só, "não está aqui" seria indistinguível de "não existe", e é
   * justamente essa diferença que o cartão do canvas precisa saber dizer:
   * desvinculada tem conserto de um clique, sumida não tem.
   */
  linkedIds: Set<string>;

  /** The saved versions of each character, loaded when its editor opens. */
  versions: Record<string, VersionSummary[]>;
  /** The frozen version being looked at, or null while editing the draft. */
  viewingVersionId: string | null;
  /** The snapshot of that frozen version, shown read-only. */
  viewingSheet: CharacterSheet | null;

  seed: (characters: CharacterEntity[]) => void;
  /** Os vínculos do projeto aberto. Chamado de novo a cada troca de aba. */
  seedLinks: (ids: string[]) => void;
  /** Vincula ao projeto aberto — criar aqui, ou trazer da galeria. */
  link: (id: string) => void;
  /** Desvincula do projeto aberto. Leve e reversível: nada é apagado. */
  unlink: (id: string) => void;
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
  linkedIds: new Set(),
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

  seedLinks: (ids) => set({ linkedIds: new Set(ids) }),

  // Conjunto novo a cada mudança, nunca mutado no lugar: o Zustand compara por
  // identidade, e um Set mexido por dentro não redesenha lista nenhuma.
  link: (id) =>
    set((state) =>
      state.linkedIds.has(id) ? state : { linkedIds: new Set(state.linkedIds).add(id) },
    ),

  unlink: (id) =>
    set((state) => {
      if (!state.linkedIds.has(id)) return state;

      const linkedIds = new Set(state.linkedIds);
      linkedIds.delete(id);

      return { linkedIds };
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

  /**
   * Opening an editor starts on the **active frozen version**, read-only —
   * reversing the "always the notebook, never a frame on the wall" of spec §5
   * on 11/08/2026.
   *
   * The old rule optimised for the act of editing; the reversal optimises for
   * the question people actually arrive with, which is "who is she right now?".
   * And "right now" has exactly one answer: the version `@luna` resolves to.
   * Landing on the draft answered a different question — who she might become —
   * and answered it silently, so a draft nobody remembered leaving open looked
   * like the character herself.
   *
   * No fetch: the active snapshot already travelled with the character (see
   * loadCharacters), which is what makes this a change of one line rather than
   * a loading state.
   *
   * A character with no version has nothing frozen to show, so it opens on the
   * draft, as everything did before.
   */
  openEditor: (editingId) => {
    const active = get().characters[editingId]?.activeVersion ?? null;

    set({
      editingId,
      viewingVersionId: active?.id ?? null,
      viewingSheet: active?.sheet ?? null,
    });
  },
  closeEditor: () => set({ editingId: null, viewingVersionId: null, viewingSheet: null }),

  forget: (id) =>
    set((state) => {
      const characters = { ...state.characters };
      delete characters[id];

      // O vínculo sai junto. Arquivar é global — ela deixa **todos** os
      // projetos —, e a linha em project_entities continua no banco apontando
      // para uma personagem arquivada, o que é inofensivo e verdadeiro: se um
      // dia houver desarquivar, ela volta para as abas onde trabalhava. Aqui na
      // tela, porém, um vínculo para alguém que a lista não contém mais seria
      // um contador contando fantasma.
      const linkedIds = new Set(state.linkedIds);
      linkedIds.delete(id);

      return {
        characters,
        linkedIds,
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
