import { DNA_FIELDS } from "@/lib/character-sheet/fields";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import { confirmField, needsConfirmation } from "@/lib/character-sheet/schema";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The yellow fields — inferred by extraction, waiting for the user's eyes.
 *
 * They are what the header counter counts and what its one-click navigation
 * walks through (U3: confirmed one at a time, never a "confirm all" button).
 * Reviewing eight fields takes seconds, but each one passed through the user's
 * eyes — which is the whole point.
 *
 * Only layer 1 can hold pending fields: extraction never touches the defaults or
 * the narrative, so there is nothing there to be uncertain about.
 */

export type PendingField = {
  /** Matches the data-field-id in the DOM, so the counter can scroll to it. */
  id: string;
  label: string;
};

/** Marks live in arrays, so their ids carry the index: marcas.tatuagens.0 */
const MARK_LISTS = [
  { key: "tatuagens", label: t.characterSheet.marcas.tatuagensTitle },
  { key: "piercings", label: t.characterSheet.marcas.piercingsTitle },
  { key: "outras", label: t.characterSheet.marcas.outrasTitle },
] as const;

export function markFieldId(list: (typeof MARK_LISTS)[number]["key"], index: number): string {
  return `marcas.${list}.${index}`;
}

export function listPendingFields(sheet: CharacterSheet): PendingField[] {
  const pending: PendingField[] = [];

  for (const field of DNA_FIELDS) {
    if (needsConfirmation(field.read(sheet).estado)) {
      pending.push({ id: field.id, label: field.label });
    }
  }

  for (const list of MARK_LISTS) {
    sheet.dna_visual.marcas[list.key].forEach((item, index) => {
      if (needsConfirmation(item.estado)) {
        pending.push({ id: markFieldId(list.key, index), label: list.label });
      }
    });
  }

  return pending;
}

/**
 * Confirms one pending field, whatever kind it is. Mutates the draft copy the
 * store hands over, so the editor never has to know whether an id points at a
 * plain field or at an item inside a list.
 */
export function confirmPending(sheet: CharacterSheet, id: string): void {
  const field = DNA_FIELDS.find((candidate) => candidate.id === id);

  if (field) {
    field.write(sheet, confirmField(field.read(sheet)));
    return;
  }

  for (const list of MARK_LISTS) {
    const items = sheet.dna_visual.marcas[list.key];

    for (let index = 0; index < items.length; index += 1) {
      if (markFieldId(list.key, index) === id) {
        items[index] = confirmField(items[index]);
        return;
      }
    }
  }
}

/**
 * The next field to review after this one, wrapping around to the first. Called
 * before the confirmation is applied, so the field being confirmed is excluded
 * by hand rather than by waiting for the list to shrink.
 */
export function nextPendingAfter(
  pending: PendingField[],
  currentId: string | null,
): PendingField | null {
  const remaining = pending.filter((field) => field.id !== currentId);

  if (remaining.length === 0) return null;
  if (currentId === null) return remaining[0];

  const currentIndex = pending.findIndex((field) => field.id === currentId);
  const after = remaining.find(
    (field) => pending.findIndex((entry) => entry.id === field.id) > currentIndex,
  );

  return after ?? remaining[0];
}
