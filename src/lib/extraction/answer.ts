import { z } from "zod";

import { ALTURA_CM_MAX, ALTURA_CM_MIN } from "@/lib/character-sheet/dictionary";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import {
  EXTRACTABLE_MARKS,
  extractableFields,
  MAX_MARKS_PER_KIND,
  type ExtractableField,
} from "@/lib/extraction/contract";

/**
 * Validating the model's answer against the dictionary (spec §4.3, rule 1).
 *
 * This is the rule, not a formality: a value that is not a key of that field's
 * closed list is discarded and the field stays empty. The model does not get to
 * invent vocabulary — ever. The JSON schema already makes an invalid key unlikely;
 * this makes it impossible to store, which is the difference between a convenience
 * and a guarantee.
 *
 * Every field is parsed independently and falls back to "nothing said" on its own.
 * One malformed field must not cost the user the other twenty-two — they paid for
 * the whole call.
 */

/** What survived validation for one field: a value, or an honest absence. */
export type ValidatedAnswer = {
  valor: string | number | null;
  confianca: "alta" | "baixa";
  motivo: string;
};

export type ValidatedMarkItem = {
  values: Record<string, string | null>;
  freeText: Record<string, string>;
  confianca: "alta" | "baixa";
  motivo: string;
};

export type ValidatedExtraction = {
  fields: Map<string, ValidatedAnswer>;
  marks: Map<string, ValidatedMarkItem[]>;
};

/** The empty answer every unusable field collapses to. */
const NOTHING: ValidatedAnswer = { valor: null, confianca: "alta", motivo: "" };

const confiancaSchema = z.enum(["alta", "baixa"]).catch("baixa");

/**
 * A reason is only meaningful next to a low-confidence value, and the interface
 * shows it in a tooltip, so it is trimmed and bounded here rather than trusted.
 */
const motivoSchema = z
  .string()
  .transform((value) => value.trim().slice(0, 160))
  .catch("");

/** One field, validated against its own closed list. */
function answerSchema(field: ExtractableField) {
  const valor =
    field.kind === "number"
      ? z
          .number()
          .int()
          .min(field.min ?? ALTURA_CM_MIN)
          .max(field.max ?? ALTURA_CM_MAX)
          .nullable()
          .catch(null)
      : // The closed list itself, as a union of literals. An unknown key does not
        // throw: it becomes null, which is the field staying empty.
        z
          .string()
          .refine((value) => field.keys.includes(value))
          .nullable()
          .catch(null);

  return z
    .object({
      valor: valor as z.ZodType<string | number | null>,
      confianca: confiancaSchema,
      motivo: motivoSchema,
    })
    .catch(NOTHING);
}

function markItemSchema(mark: (typeof EXTRACTABLE_MARKS)[number]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, options] of Object.entries(mark.options)) {
    const keys = options.map((option) => option.key);

    shape[key] = z
      .string()
      .refine((value) => keys.includes(value))
      .nullable()
      .catch(null);
  }

  for (const key of mark.freeText) {
    shape[key] = z
      .string()
      .transform((value) => value.trim().slice(0, 200))
      .catch("");
  }

  shape.confianca = confiancaSchema;
  shape.motivo = motivoSchema;

  return z.object(shape);
}

/**
 * Reads the whole answer. Never throws: a completely unusable answer yields an
 * extraction where every field is empty, which the caller reports as "the model
 * saw nothing" instead of as a crash the user has to interpret.
 */
export function validateExtraction(
  sheet: CharacterSheet,
  raw: Record<string, unknown>,
): ValidatedExtraction {
  const fields = new Map<string, ValidatedAnswer>();

  for (const field of extractableFields(sheet)) {
    const parsed = answerSchema(field).safeParse(raw[field.id]);
    const answer = parsed.success ? parsed.data : NOTHING;

    // A reason on a confident answer is noise, and a low-confidence answer with
    // no value is just an empty field: both are normalised away here so nothing
    // downstream has to wonder.
    fields.set(field.id, {
      valor: answer.valor,
      confianca: answer.valor === null ? "alta" : answer.confianca,
      motivo: answer.valor !== null && answer.confianca === "baixa" ? answer.motivo : "",
    });
  }

  const marks = new Map<string, ValidatedMarkItem[]>();

  for (const mark of EXTRACTABLE_MARKS) {
    const parsed = z.array(markItemSchema(mark)).catch([]).safeParse(raw[mark.id]);
    const items: ValidatedMarkItem[] = [];

    for (const item of (parsed.success ? parsed.data : []).slice(0, MAX_MARKS_PER_KIND)) {
      const values: Record<string, string | null> = {};
      const freeText: Record<string, string> = {};

      for (const key of Object.keys(mark.options)) {
        values[key] = (item[key] as string | null) ?? null;
      }

      for (const key of mark.freeText) {
        freeText[key] = (item[key] as string) ?? "";
      }

      // An item whose every closed field came back empty describes nothing: a
      // tattoo with no position, size or style is not a tattoo, it is a rumour.
      if (Object.values(values).every((value) => value === null)) continue;

      const confianca = item.confianca as "alta" | "baixa";

      items.push({
        values,
        freeText,
        confianca,
        motivo: confianca === "baixa" ? (item.motivo as string) : "",
      });
    }

    marks.set(mark.id, items);
  }

  return { fields, marks };
}
