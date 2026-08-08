import type { CharacterSheet, Estado, SheetField } from "@/lib/character-sheet/schema";
import { EXTRACTABLE_MARKS, extractableFields } from "@/lib/extraction/contract";
import type { ValidatedExtraction } from "@/lib/extraction/answer";

/**
 * Applying an extraction to the draft — decision E4, the one rule the engine can
 * never bend: it only ever fills a field that is empty.
 *
 * A field the user typed, confirmed, or that a previous extraction observed is
 * skipped and counted as preserved. That is what makes running the engine a second
 * time safe, and what makes the button in the editor safe to press on a character
 * that is already half filled in: nothing you decided can be undone by a machine.
 *
 * The whole thing is a pure function of (sheet, answer) -> (sheet, tally). The
 * server applies it and hands both back; nothing here touches the database, so the
 * rule is testable by reading it.
 */

/** The placard of spec §4.4, counted over the fields the engine may touch. */
export type ExtractionSummary = {
  observados: number;
  inferidos: number;
  vazios: number;
  preservados: number;
  /** How many mark items were added, across the three kinds. */
  marcas: number;
};

export type AppliedExtraction = {
  sheet: CharacterSheet;
  summary: ExtractionSummary;
};

/** `vazio` is the whole test: any other state means somebody already decided. */
function isEmpty(field: SheetField): boolean {
  return field.estado === "vazio";
}

/** Rule 2 of §4.3: high confidence was seen, low confidence was deduced. */
function estadoFor(confianca: "alta" | "baixa"): Estado {
  return confianca === "alta" ? "observado" : "inferido";
}

export function applyExtraction(
  sheet: CharacterSheet,
  extraction: ValidatedExtraction,
): AppliedExtraction {
  // A private copy: the caller's sheet is never mutated, so a failure halfway
  // through can never leave a half-extracted draft behind.
  const next: CharacterSheet = structuredClone(sheet);

  const summary: ExtractionSummary = {
    observados: 0,
    inferidos: 0,
    vazios: 0,
    preservados: 0,
    marcas: 0,
  };

  for (const field of extractableFields(next)) {
    const current = field.field.read(next);

    if (!isEmpty(current)) {
      summary.preservados += 1;
      continue;
    }

    const answer = extraction.fields.get(field.id);

    if (!answer || answer.valor === null) {
      summary.vazios += 1;
      continue;
    }

    const estado = estadoFor(answer.confianca);

    field.field.write(next, {
      valor: answer.valor,
      // The extraction fills the value; free-text detail stays the user's to write.
      detalhes: current.detalhes,
      estado,
      origem: "extracao",
      motivo: answer.motivo,
    });

    if (estado === "observado") summary.observados += 1;
    else summary.inferidos += 1;
  }

  applyMarks(next, extraction, summary);

  return { sheet: next, summary };
}

/**
 * Marks are lists, so "only fills what is empty" can only mean one thing: a kind
 * whose list already has an item is left completely alone. There is no per-item
 * slot to be empty, and merging into a list the user curated would be exactly the
 * overwrite E4 forbids.
 */
function applyMarks(
  sheet: CharacterSheet,
  extraction: ValidatedExtraction,
  summary: ExtractionSummary,
): void {
  for (const mark of EXTRACTABLE_MARKS) {
    const items = extraction.marks.get(mark.id) ?? [];

    if (items.length === 0) continue;

    if (mark.id === "tatuagens") {
      if (sheet.dna_visual.marcas.tatuagens.length > 0) continue;

      sheet.dna_visual.marcas.tatuagens = items.map((item) => ({
        posicao: item.values.posicao ?? null,
        tamanho: item.values.tamanho ?? null,
        estilo: item.values.estilo ?? null,
        descricao: item.freeText.descricao ?? "",
        estado: estadoFor(item.confianca),
        origem: "extracao",
        motivo: item.motivo,
      }));

      summary.marcas += items.length;
      continue;
    }

    if (mark.id === "piercings") {
      if (sheet.dna_visual.marcas.piercings.length > 0) continue;

      sheet.dna_visual.marcas.piercings = items.map((item) => ({
        local: item.values.local ?? null,
        joia: item.values.joia ?? null,
        detalhes: item.freeText.detalhes ?? "",
        estado: estadoFor(item.confianca),
        origem: "extracao",
        motivo: item.motivo,
      }));

      summary.marcas += items.length;
      continue;
    }

    if (sheet.dna_visual.marcas.outras.length > 0) continue;

    sheet.dna_visual.marcas.outras = items.map((item) => ({
      tipo: item.values.tipo ?? null,
      posicao: item.freeText.posicao ?? "",
      descricao: item.freeText.descricao ?? "",
      estado: estadoFor(item.confianca),
      origem: "extracao",
      motivo: item.motivo,
    }));

    summary.marcas += items.length;
  }
}

/** The tally as the jsonb column stores it — flat, so SQL can read it later. */
export function summaryToJson(summary: ExtractionSummary): Record<string, number> {
  return { ...summary };
}
