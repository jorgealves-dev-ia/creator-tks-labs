import { DNA_FIELDS, PADRAO_FIELDS } from "@/lib/character-sheet/fields";
import type { CharacterSheet } from "@/lib/character-sheet/schema";

/**
 * The free-text fields of a sheet, and the one rule that keeps their cached
 * English honest.
 *
 * §3.3 of docs/geracao-canonica.md: the closed lists translate themselves — the
 * dictionary holds a fixed English phrase per option, copied verbatim. What does
 * not translate itself is what the user types: `detalhes`, the description of a
 * tattoo, a restriction. Those are written in Portuguese and have to reach the
 * image model in English.
 *
 * Translating at generation time would make the compiler impure and put a network
 * call on the path of every preview. So the translation happens once, when the
 * draft is saved, and lives next to the text that produced it. The compiler only
 * ever reads a cache.
 *
 * Which turns the whole problem into a single question: when does a cache stop
 * being true? Answer: the moment its Portuguese changes. That is
 * syncTranslationCache(), and it lives here — one rule, one home. Every edit in
 * the application passes through the store's updateSheet, which calls it, so the
 * rule cannot be honoured by the DNA tab and forgotten by the marks editor.
 *
 * `notas_gerais` is deliberately absent from this inventory: it never enters an
 * image prompt (decision D6), so there is nothing to translate it for.
 */

export type FreeTextSlot = {
  /**
   * Stable within one sheet — also the key the translator answers with. List
   * items carry their index, so `marcas.tatuagens.0.descricao` names exactly one
   * sentence.
   */
  readonly id: string;
  /** What the user wrote, in Portuguese. */
  readonly source: string;
  /** The cached English, or "" when there is none yet. */
  readonly cached: string;
  /** Writes English back into the sheet handed over — the caller owns the copy. */
  readonly write: (sheet: CharacterSheet, en: string) => void;
};

/**
 * Every free-text field of a sheet, in one flat list.
 *
 * Built from DNA_FIELDS and PADRAO_FIELDS rather than from a second hand-written
 * list of paths: a field added to the form is a field the translator finds, with
 * nothing to remember.
 */
export function freeTextSlots(sheet: CharacterSheet): FreeTextSlot[] {
  const slots: FreeTextSlot[] = [];

  for (const field of DNA_FIELDS) {
    const current = field.read(sheet);

    slots.push({
      id: `${field.id}.detalhes`,
      source: current.detalhes,
      cached: current.detalhes_en,
      write: (target, en) => {
        field.write(target, { ...field.read(target), detalhes_en: en });
      },
    });
  }

  sheet.dna_visual.marcas.tatuagens.forEach((item, index) => {
    slots.push({
      id: `marcas.tatuagens.${index}.descricao`,
      source: item.descricao,
      cached: item.descricao_en,
      write: (target, en) => {
        const entry = target.dna_visual.marcas.tatuagens[index];
        if (entry) entry.descricao_en = en;
      },
    });
  });

  sheet.dna_visual.marcas.piercings.forEach((item, index) => {
    slots.push({
      id: `marcas.piercings.${index}.detalhes`,
      source: item.detalhes,
      cached: item.detalhes_en,
      write: (target, en) => {
        const entry = target.dna_visual.marcas.piercings[index];
        if (entry) entry.detalhes_en = en;
      },
    });
  });

  sheet.dna_visual.marcas.outras.forEach((item, index) => {
    slots.push({
      id: `marcas.outras.${index}.posicao`,
      source: item.posicao,
      cached: item.posicao_en,
      write: (target, en) => {
        const entry = target.dna_visual.marcas.outras[index];
        if (entry) entry.posicao_en = en;
      },
    });

    slots.push({
      id: `marcas.outras.${index}.descricao`,
      source: item.descricao,
      cached: item.descricao_en,
      write: (target, en) => {
        const entry = target.dna_visual.marcas.outras[index];
        if (entry) entry.descricao_en = en;
      },
    });
  });

  for (const field of PADRAO_FIELDS) {
    const current = field.read(sheet);

    slots.push({
      id: `padroes.${field.id}.detalhes`,
      source: current.detalhes,
      cached: current.detalhes_en,
      write: (target, en) => {
        field.write(target, { ...field.read(target), detalhes_en: en });
      },
    });
  }

  sheet.padroes_variaveis.restricoes.forEach((item, index) => {
    slots.push({
      id: `restricoes.${index}.regra`,
      source: item.regra,
      cached: item.regra_en,
      write: (target, en) => {
        const entry = target.padroes_variaveis.restricoes[index];
        if (entry) entry.regra_en = en;
      },
    });
  });

  return slots;
}

/**
 * The slots that have something to say and no English to say it in. Empty means
 * the sheet is ready to compile; anything else is what the translator is about to
 * do and what the preview shows as "traduzindo…".
 */
export function pendingTranslations(sheet: CharacterSheet): FreeTextSlot[] {
  return freeTextSlots(sheet).filter(
    (slot) => slot.source.trim() !== "" && slot.cached.trim() === "",
  );
}

/**
 * Drops every cached translation whose Portuguese changed. Mutates `next`, which
 * is the private copy the store already made.
 *
 * Called on every edit. A list item removed from the middle shifts the ones after
 * it, so their ids now point at different sentences and their caches are dropped
 * — they are simply translated again on the next save. That is the deliberate
 * trade: a wasted fraction of a cent against the possibility of an image
 * generated from a sentence the user deleted.
 */
export function syncTranslationCache(previous: CharacterSheet, next: CharacterSheet): void {
  const before = new Map(freeTextSlots(previous).map((slot) => [slot.id, slot.source]));

  for (const slot of freeTextSlots(next)) {
    const previousSource = before.get(slot.id);

    if (previousSource !== undefined && previousSource !== slot.source && slot.cached !== "") {
      slot.write(next, "");
    }
  }
}

/**
 * Applies translations that came back from the server, keeping only the ones
 * still true: the user may have typed on while the call was in flight, and a
 * translation of a sentence that no longer exists must not land.
 *
 * `sources` is what was actually sent for translation, so the comparison is
 * against the text the English was made from — not against whatever is in the
 * sheet now.
 */
export function applyTranslations(
  sheet: CharacterSheet,
  entries: readonly { id: string; source: string; en: string }[],
): void {
  const bySlotId = new Map(freeTextSlots(sheet).map((slot) => [slot.id, slot]));

  for (const entry of entries) {
    const slot = bySlotId.get(entry.id);

    if (slot && slot.source === entry.source) {
      slot.write(sheet, entry.en);
    }
  }
}
