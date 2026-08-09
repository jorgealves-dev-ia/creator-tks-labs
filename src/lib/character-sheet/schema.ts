import { z } from "zod";

import {
  TODOS_SLOTS_CANONICOS,
  TRAJE_PADRAO_POR_GENERO,
  type GeneroApresentacao,
} from "@/lib/character-sheet/dictionary";
import type { Json } from "@/lib/supabase/database.types";

/**
 * The character sheet as stored in entities.sheet and in every entity_versions
 * row. Specification: docs/character-sheet.md §3 and §4.
 *
 * The schema validates *shape*, never taste. Option values are accepted as plain
 * strings instead of being checked against the dictionary, on purpose: a frozen
 * version must always parse, years later, whatever happened to the lists since.
 * The interface only ever offers valid options, and the compiler skips a value
 * it cannot find. See the immutability warning in dictionary.ts.
 *
 * Every field carries a default, so an entity whose sheet is still `{}` — the
 * column default — parses into a complete empty sheet.
 */

export const SHEET_SCHEMA_VERSION = 1;

/** §3 · The four states a DNA field can be in. Only two reach the prompt. */
export const ESTADOS = ["observado", "inferido", "confirmado", "vazio"] as const;
export type Estado = (typeof ESTADOS)[number];

/** Who filled the field in. */
export const ORIGENS = ["manual", "extracao"] as const;
export type Origem = (typeof ORIGENS)[number];

/** Compilation rule 2: only these two states enter a prompt. */
export function entersPrompt(estado: Estado): boolean {
  return estado === "observado" || estado === "confirmado";
}

/** The yellow ones — inferred by extraction, waiting for the user's eyes. */
export function needsConfirmation(estado: Estado): boolean {
  return estado === "inferido";
}

const estadoSchema = z.enum(ESTADOS).catch("vazio");
const origemSchema = z.enum(ORIGENS).catch("manual");

/**
 * Decision E3 of docs/motor-extracao.md: an inferred field carries a short
 * sentence saying why the extraction hesitated ("luz amarelada, cor dos olhos
 * incerta"), shown in the tooltip while the user reviews the yellow ones.
 *
 * Optional and defaulted so every sheet written before the extraction engine
 * existed still parses — an absent `motivo` simply means no reason was given.
 * Only `inferido` ever carries one: the moment a human confirms or edits the
 * field, the doubt stops being true and the reason is cleared.
 */
const MOTIVO_MAX_LENGTH = 160;

const motivoSchema = z.string().max(MOTIVO_MAX_LENGTH).catch("").default("");

/**
 * The English of one free-text field, cached at save time.
 *
 * §3.3 of docs/geracao-canonica.md: the compiler is a pure function and may not
 * call anything over the network, but the free-text fields are written in
 * Portuguese and have to reach the model in English. The way out is to translate
 * once, when the draft is saved, and store the result next to the text that
 * produced it — so the compiler only ever reads.
 *
 * Empty means "not translated yet", and it is emptied again the moment the
 * Portuguese changes (see syncTranslationCache in character-sheet/translation.ts).
 * A cache that outlived its source would be worse than no cache at all: it would
 * put last week's sentence into this week's image.
 */
const cachedEnglishSchema = z.string().catch("").default("");

/**
 * §3 · The field envelope of the visual DNA. `valor` holds an option key, or a
 * number for altura_cm. `detalhes` complements the option and never replaces it.
 */
const fieldSchema = z.object({
  valor: z.union([z.string(), z.number()]).nullable().default(null),
  detalhes: z.string().default(""),
  detalhes_en: cachedEnglishSchema,
  estado: estadoSchema.default("vazio"),
  origem: origemSchema.default("manual"),
  motivo: motivoSchema,
});

export type SheetField = z.infer<typeof fieldSchema>;

const emptyField = (): SheetField => ({
  valor: null,
  detalhes: "",
  detalhes_en: "",
  estado: "vazio",
  origem: "manual",
  motivo: "",
});

/** A field the user filled in by hand is confirmed on the spot — §4.1, regra viva. */
export const confirmedField = (valor: string | number): SheetField => ({
  valor,
  detalhes: "",
  detalhes_en: "",
  estado: "confirmado",
  origem: "manual",
  motivo: "",
});

/**
 * The living rule of §4.1: editing a field by hand turns it `confirmado` on the
 * spot, with no question asked. Clearing it turns it `vazio` — nobody decided
 * anything, so nothing should reach the prompt.
 *
 * Both editors go through here so the rule cannot be forgotten in one component
 * and remembered in another.
 */
export function withValue(field: SheetField, valor: string | number | null): SheetField {
  if (valor === null || valor === "") {
    return { ...field, valor: null, estado: "vazio", origem: "manual", motivo: "" };
  }

  return { ...field, valor, estado: "confirmado", origem: "manual", motivo: "" };
}

/**
 * Confirming an inferred field keeps its value and its origin: the extraction is
 * still what proposed it — what changed is that a human said yes. That is
 * exactly why `confirmado` exists as a state separate from `observado`.
 *
 * The reason for the doubt is dropped, though: it described a hesitation that no
 * longer exists. Keeping it would leave a confirmed field explaining why it was
 * once uncertain.
 */
export function confirmField<T extends { estado: Estado; motivo: string }>(field: T): T {
  return { ...field, estado: "confirmado", motivo: "" };
}

/**
 * `detalhes` complements the chosen option and never replaces it, so writing a
 * detail only confirms a field that already has a value. Detail on an empty
 * field stays empty — that is what stops a subjective adjective from sneaking
 * back in through the side door.
 *
 * It deliberately does not clear `detalhes_en`. Dropping a stale translation is
 * one rule with one home — syncTranslationCache() in character-sheet/translation.ts,
 * which every edit passes through — precisely so it cannot be remembered here and
 * forgotten in the marks editor.
 */
export function withDetails(field: SheetField, detalhes: string): SheetField {
  if (field.valor === null) {
    return { ...field, detalhes };
  }

  return { ...field, detalhes, estado: "confirmado", origem: "manual", motivo: "" };
}

/** Layers 2 and 3 carry no state: extraction never touches them. */
const plainChoiceSchema = z.object({
  valor: z.string().nullable().default(null),
  detalhes: z.string().default(""),
  detalhes_en: cachedEnglishSchema,
});

export type PlainChoice = z.infer<typeof plainChoiceSchema>;

const choice = (valor: string | null = null): PlainChoice => ({
  valor,
  detalhes: "",
  detalhes_en: "",
});

// ---------------------------------------------------------------------------
// Layer 1 — visual DNA
// ---------------------------------------------------------------------------

/** §3 · Marks carry the envelope on the whole item: a tattoo is seen, or it is not. */
const tatuagemSchema = z.object({
  posicao: z.string().nullable().default(null),
  tamanho: z.string().nullable().default(null),
  estilo: z.string().nullable().default(null),
  descricao: z.string().default(""),
  descricao_en: cachedEnglishSchema,
  estado: estadoSchema.default("confirmado"),
  origem: origemSchema.default("manual"),
  motivo: motivoSchema,
});

const piercingSchema = z.object({
  local: z.string().nullable().default(null),
  joia: z.string().nullable().default(null),
  detalhes: z.string().default(""),
  detalhes_en: cachedEnglishSchema,
  estado: estadoSchema.default("confirmado"),
  origem: origemSchema.default("manual"),
  motivo: motivoSchema,
});

const outraMarcaSchema = z.object({
  tipo: z.string().nullable().default(null),
  // Free text on both, and both reach the prompt — so both need a cache.
  posicao: z.string().default(""),
  posicao_en: cachedEnglishSchema,
  descricao: z.string().default(""),
  descricao_en: cachedEnglishSchema,
  estado: estadoSchema.default("confirmado"),
  origem: origemSchema.default("manual"),
  motivo: motivoSchema,
});

export type Tatuagem = z.infer<typeof tatuagemSchema>;
export type Piercing = z.infer<typeof piercingSchema>;
export type OutraMarca = z.infer<typeof outraMarcaSchema>;

const dnaVisualSchema = z.object({
  genero_apresentacao: fieldSchema.default(emptyField),
  idade_aparente: fieldSchema.default(emptyField),
  formato_rosto: fieldSchema.default(emptyField),

  olhos: z
    .object({
      cor: fieldSchema.default(emptyField),
      formato: fieldSchema.default(emptyField),
      espacamento: fieldSchema.default(emptyField),
    })
    .prefault({}),

  sobrancelhas: z
    .object({
      formato: fieldSchema.default(emptyField),
      espessura: fieldSchema.default(emptyField),
    })
    .prefault({}),

  nariz: fieldSchema.default(emptyField),
  labios: fieldSchema.default(emptyField),

  pele: z
    .object({
      tom: fieldSchema.default(emptyField),
      subtom: fieldSchema.default(emptyField),
      sardas: fieldSchema.default(emptyField),
    })
    .prefault({}),

  cabelo: z
    .object({
      cor: fieldSchema.default(emptyField),
      textura: fieldSchema.default(emptyField),
      comprimento: fieldSchema.default(emptyField),
      reparticao: fieldSchema.default(emptyField),
      franja: fieldSchema.default(emptyField),
      acabamento: fieldSchema.default(emptyField),
    })
    .prefault({}),

  corpo: z
    .object({
      altura_cm: fieldSchema.default(emptyField),
      silhueta: fieldSchema.default(emptyField),
      proporcoes: z
        .object({
          busto: fieldSchema.default(emptyField),
          cintura: fieldSchema.default(emptyField),
          quadril: fieldSchema.default(emptyField),
        })
        .prefault({}),
    })
    .prefault({}),

  marcas: z
    .object({
      tatuagens: z.array(tatuagemSchema).default([]),
      piercings: z.array(piercingSchema).default([]),
      outras: z.array(outraMarcaSchema).default([]),
    })
    .prefault({}),

  notas_gerais: z.string().default(""),
});

// ---------------------------------------------------------------------------
// Layer 2 — variable defaults
// ---------------------------------------------------------------------------

const restricaoSchema = z.object({
  tipo: z.string().default("nunca"),
  regra: z.string().default(""),
  regra_en: cachedEnglishSchema,
});

export type Restricao = z.infer<typeof restricaoSchema>;

const padroesVariaveisSchema = z.object({
  expressao: plainChoiceSchema.prefault({}),
  pose: plainChoiceSchema.prefault({}),
  traje_canonico: plainChoiceSchema.prefault({}),
  fundo_canonico: plainChoiceSchema.prefault({}),
  iluminacao: plainChoiceSchema.prefault({}),
  enquadramento: plainChoiceSchema.prefault({}),
  restricoes: z.array(restricaoSchema).default([]),
});

// ---------------------------------------------------------------------------
// Layer 3 — narrative. Never enters an image prompt (compilation rule 6).
// ---------------------------------------------------------------------------

const vozSchema = z.object({
  // provider and voice_id are configured in Phase 3 (video and speech); they are
  // kept in the shape so a sheet saved today stays readable then.
  provider: z.string().nullable().default(null),
  voice_id: z.string().nullable().default(null),
  idioma: z.string().default("pt-BR"),
  descricao: z.string().default(""),
});

const narrativaSchema = z.object({
  nome_completo: z.string().default(""),
  apelidos: z.array(z.string()).default([]),
  idade: z.number().nullable().default(null),
  data_nascimento: z.string().nullable().default(null),
  ocupacao: z.string().default(""),
  personalidade: z
    .object({
      qualidades: z.array(z.string()).default([]),
      defeitos: z.array(z.string()).default([]),
      tracos_marcantes: z.array(z.string()).default([]),
    })
    .prefault({}),
  objetivos: z.array(z.string()).default([]),
  medos: z.array(z.string()).default([]),
  relacoes: z.array(z.string()).default([]),
  estilo_de_fala: z.string().default(""),
  voz: vozSchema.prefault({}),
});

// ---------------------------------------------------------------------------
// Canonical images — asset ids only; the files live in entity_images
// ---------------------------------------------------------------------------

/**
 * The two sheet slots arrived with the canonical generation (decision G3) and
 * every sheet saved before that simply does not have them. Defaulting to null is
 * what makes that a non-event: an old draft and a frozen v1 both parse into a
 * character whose anchor has not been generated yet, which is exactly true.
 */
const imagensCanonicasSchema = z.object({
  folha_completa: z.string().nullable().default(null),
  folha_completa_horizontal: z.string().nullable().default(null),
  turnaround_frente: z.string().nullable().default(null),
  turnaround_tres_quartos: z.string().nullable().default(null),
  turnaround_perfil: z.string().nullable().default(null),
  turnaround_costas: z.string().nullable().default(null),
  folha_expressoes: z.string().nullable().default(null),
  paleta_cores: z.string().nullable().default(null),
});

// ---------------------------------------------------------------------------
// The whole sheet
// ---------------------------------------------------------------------------

export const characterSheetSchema = z.object({
  schema_version: z.int().positive().default(SHEET_SCHEMA_VERSION),
  dna_visual: dnaVisualSchema.prefault({}),
  padroes_variaveis: padroesVariaveisSchema.prefault({}),
  narrativa: narrativaSchema.prefault({}),
  imagens_canonicas: imagensCanonicasSchema.prefault({}),
});

export type CharacterSheet = z.infer<typeof characterSheetSchema>;
export type DnaVisual = CharacterSheet["dna_visual"];
export type PadroesVariaveis = CharacterSheet["padroes_variaveis"];
export type Narrativa = CharacterSheet["narrativa"];
export type ImagensCanonicas = CharacterSheet["imagens_canonicas"];

/**
 * A brand new sheet. Layer 2 arrives with sensible defaults already ticked —
 * §7 step 4 of the screen specification calls that step a "check and carry on",
 * not a form to fill. The DNA arrives honestly empty.
 */
export function createEmptySheet(genero?: GeneroApresentacao): CharacterSheet {
  const sheet = characterSheetSchema.parse({});

  sheet.padroes_variaveis.expressao = choice("sorriso_suave");
  sheet.padroes_variaveis.pose = choice("em_pe_frontal");
  sheet.padroes_variaveis.fundo_canonico = choice("cinza_claro");
  sheet.padroes_variaveis.iluminacao = choice("estudio_difusa");
  sheet.padroes_variaveis.enquadramento = choice("corpo_inteiro");
  sheet.padroes_variaveis.traje_canonico = choice(
    genero ? TRAJE_PADRAO_POR_GENERO[genero] : TRAJE_PADRAO_POR_GENERO.feminino,
  );

  if (genero) {
    sheet.dna_visual.genero_apresentacao = confirmedField(genero);
  }

  return sheet;
}

/**
 * Reads a sheet out of jsonb. Unreadable input yields an empty sheet rather than
 * throwing: the editor must always open, even on a sheet written by a future
 * version of the app.
 */
export function parseSheet(value: unknown): CharacterSheet {
  const parsed = characterSheetSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : createEmptySheet();
}

/**
 * Narrows a sheet to the plain JSON the column accepts. The schema already
 * proved every leaf is a JSON primitive; this only restates it for the types.
 */
export function sheetToJson(sheet: CharacterSheet): Json {
  return JSON.parse(JSON.stringify(sheet)) as Json;
}

/** The canonical image slots, in the order the interface shows them. */
export const CANONICAL_SLOT_KEYS = TODOS_SLOTS_CANONICOS.map((slot) => slot.key);
