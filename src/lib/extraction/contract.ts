import {
  MARCA_TIPO,
  PIERCING_JOIA,
  PIERCING_LOCAL,
  TATUAGEM_ESTILO,
  TATUAGEM_POSICAO,
  TATUAGEM_TAMANHO,
  type SheetOption,
} from "@/lib/character-sheet/dictionary";
import { DNA_FIELDS, type DnaField } from "@/lib/character-sheet/fields";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import { t } from "@/lib/i18n/pt-BR";

/**
 * What the extraction engine is allowed to fill in, and with which vocabulary.
 *
 * Built from DNA_FIELDS — the very same definition the editor renders — so the
 * prompt, the JSON schema, the validation and the form can never drift apart.
 * Adding a field to the sheet makes the engine aware of it with no change here,
 * which is the whole reason the form is data and not markup.
 *
 * Three things the engine never touches (spec §4.2):
 *   * genero_apresentacao — step 1 of the wizard decides it, and the engine does
 *     not even get told the question exists
 *   * every variable default (layer 2) — those are the user's preferences
 *   * the whole narrative (layer 3) — a face cannot reveal someone's fears
 */

/** Excluded by name rather than by omission, so the reason travels with the code. */
const NEVER_EXTRACTED = new Set(["genero_apresentacao"]);

export type ExtractableField = {
  /** Doubles as the JSON key in the model's answer and the sheet's field id. */
  readonly id: string;
  /** The label the user sees, given to the model so it knows what it is judging. */
  readonly label: string;
  readonly kind: "list" | "number";
  /** The closed list, flattened. Empty for a numeric field. */
  readonly keys: readonly string[];
  readonly min?: number;
  readonly max?: number;
  readonly field: DnaField;
};

/**
 * The extractable fields for one sheet.
 *
 * Sheet-dependent because one field's list is: the silhouette options follow the
 * presented gender, and offering a woman's silhouette list for a man would invite
 * exactly the kind of wrong answer the closed lists exist to prevent.
 */
export function extractableFields(sheet: CharacterSheet): readonly ExtractableField[] {
  return DNA_FIELDS.filter((field) => !NEVER_EXTRACTED.has(field.id)).map((field) => ({
    id: field.id,
    label: field.label,
    kind: field.kind === "number" ? "number" : "list",
    keys: field.groups(sheet).flatMap((group) => group.options.map((option) => option.key)),
    min: field.min,
    max: field.max,
    field,
  }));
}

/**
 * The list-valued marks. Each is only ever *appended to*, and only when its list
 * is still empty — the only sensible reading of "extraction never overwrites" for
 * a collection, since there is no per-item slot to be empty or full.
 */
export type ExtractableMark = {
  readonly id: "tatuagens" | "piercings" | "outras";
  readonly label: string;
  /** The closed sub-lists of one item, by the key it carries in the sheet. */
  readonly options: Readonly<Record<string, readonly SheetOption[]>>;
  /** Free-text keys of one item — described, never chosen from a list. */
  readonly freeText: readonly string[];
};

export const EXTRACTABLE_MARKS: readonly ExtractableMark[] = [
  {
    id: "tatuagens",
    label: t.characterSheet.marcas.tatuagensTitle,
    options: { posicao: TATUAGEM_POSICAO, tamanho: TATUAGEM_TAMANHO, estilo: TATUAGEM_ESTILO },
    freeText: ["descricao"],
  },
  {
    id: "piercings",
    label: t.characterSheet.marcas.piercingsTitle,
    options: { local: PIERCING_LOCAL, joia: PIERCING_JOIA },
    freeText: ["detalhes"],
  },
  {
    id: "outras",
    label: t.characterSheet.marcas.outrasTitle,
    options: { tipo: MARCA_TIPO },
    freeText: ["posicao", "descricao"],
  },
];

/** How many items of one kind the engine may propose. A face is not a gallery. */
export const MAX_MARKS_PER_KIND = 4;

/** Longest pasted text accepted, in characters — a bound on tokens, and on cost. */
export const MAX_SOURCE_TEXT_LENGTH = 20_000;

/** Image formats the Anthropic vision API accepts. */
export const ACCEPTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Anthropic's per-image ceiling for a base64 image. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
