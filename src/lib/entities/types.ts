import type { CharacterSheet } from "@/lib/character-sheet/schema";

/**
 * A character as the interface knows it. Shared by server and browser code, so
 * it holds no Supabase client type and no server-only import.
 *
 * The vocabulary here is the product's, not the database's: the row is an
 * "entity" in SQL, but everything the user sees calls it a character.
 */

/** The frozen snapshot @handle currently resolves to. */
export type ActiveVersion = {
  id: string;
  /** The version number the database assigned: 1, 2, 3… */
  number: number;
  /** Carried along so the dirty check needs no extra round trip. */
  sheet: CharacterSheet;
};

export type CharacterEntity = {
  id: string;
  handle: string;
  displayName: string;
  /** The living draft — entities.sheet. */
  sheet: CharacterSheet;
  activeVersion: ActiveVersion | null;
  coverAssetId: string | null;
};
