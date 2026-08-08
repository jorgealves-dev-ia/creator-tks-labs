import type { CharacterSheet } from "@/lib/character-sheet/schema";

/**
 * Serialises a value with its object keys sorted, at every depth.
 *
 * This is what makes the dirty check honest. Postgres `jsonb` does not preserve
 * key order — it stores keys in its own order — so a sheet that made a round
 * trip through the database comes back with its keys rearranged. Comparing raw
 * JSON.stringify output would then report "unsaved changes" on a draft nobody
 * touched. Sorting first compares content, which is what the user means.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    // Array order is meaningful (the order of tattoos, of nicknames) and is
    // preserved by jsonb, so it is never sorted — only recursed into.
    return value.map(sortDeep);
  }

  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;

    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = sortDeep(source[key]);
        return sorted;
      }, {});
  }

  return value;
}

/** Spec 5.4: the draft is dirty when it differs from the sheet of the active version. */
export function sheetsEqual(a: CharacterSheet, b: CharacterSheet): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

/**
 * Whether the draft has changes the active version does not carry. An entity
 * with no saved version is always dirty in the useful sense: there is a draft
 * and nothing has been framed yet.
 */
export function isDraftDirty(
  draft: CharacterSheet,
  activeVersionSheet: CharacterSheet | null,
): boolean {
  if (!activeVersionSheet) return true;
  return !sheetsEqual(draft, activeVersionSheet);
}
