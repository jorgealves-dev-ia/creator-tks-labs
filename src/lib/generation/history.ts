"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reading back what a generation was made of — the other half of §6 rule 3.
 *
 * Writing the structure into `prompt_compiled` only pays the debt if something
 * can read it. "With what style and from which references was this image born?"
 * is answered here, from the stored row, in the two languages it was written in.
 *
 * Nothing is recomputed. Recompiling the character sheet today would answer a
 * different question — who Luna is *now* — and the whole point of storing the
 * prompt was to be able to ask who she was then.
 */

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type GenerationRecord = {
  id: string;
  createdAt: string;
  model: string;
  provider: string;
  sparksCharged: number;
  /** Exactly what the user typed, mentions and all. */
  promptUserPt: string | null;
  /** Exactly what went to the API. */
  promptText: string;
  /** The blocks it was assembled from, when it came from a canvas node. */
  structure: StoredPromptStructure | null;
  aspectRatio: string | null;
  /** 'version' when a frozen snapshot was used — never 'draft' from a mention. */
  sheetSource: string | null;
};

/**
 * The stored shape, validated rather than cast: this is jsonb coming back out of
 * the database, which is a boundary like any other. A row written by an older
 * version of the compiler simply arrives without a structure, and the screen
 * shows the text it does have instead of failing.
 */
const structureSchema = z.object({
  estilo: z.object({
    chave: z.string(),
    frase: z.string(),
    reforco: z.string(),
    origem: z.enum(["node", "personagem", "padrao"]),
  }),
  personagem: z
    .object({
      handle: z.string(),
      versao: z.number(),
      entity_version_id: z.string(),
      folha_asset_id: z.string().nullable(),
    })
    .nullable(),
  identidade: z.array(z.string()).default([]),
  /**
   * Read as a list, accepted as either.
   *
   * Until 2026-08-09 this was a single sentence; it became a list when the
   * identity reinforcement was added beside it. Both shapes are in the database
   * and neither can be rewritten — a stored prompt is the record of a generation
   * that already happened. So the reader adapts to what was written, which is
   * the whole reason this schema is looser than the compiler's own types.
   */
  ancora: z
    .union([z.array(z.string()), z.string().transform((sentence) => [sentence])])
    .default([]),
  traje_canonico: z.string().nullable().default(null),
  cena_padrao: z.array(z.string()).default([]),
  cena_usuario: z.object({ pt: z.string(), en: z.string() }).nullable().default(null),
  referencias: z
    .array(
      z.object({
        ordem: z.number(),
        asset_id: z.string(),
        tipo: z.string().nullable().default(null),
        origem: z.string().default(""),
        instrucao_pt: z.string().default(""),
        instrucao_en: z.string().default(""),
        diretiva_en: z.string().default(""),
        /** Absent on every generation from before the fidelity clauses existed. */
        fidelidade_en: z.string().nullable().default(null),
      }),
    )
    .default([]),
  restricoes: z.array(z.string()).default([]),
  regra_diretor: z.enum(["prompt_dirige", "padroes_da_personagem"]),
});

/**
 * What a stored structure is, which is deliberately looser than what the
 * compiler produces today.
 *
 * `tipo` and `origem` are plain strings here rather than the unions of
 * references.ts, and that is the point: this is history. A generation from a
 * month ago may name a kind that has since been renamed or retired, and the
 * honest thing is to show what it said — the same reasoning that makes the
 * compiler tolerate a dictionary key it no longer recognises instead of
 * pretending the sheet is broken.
 */
export type StoredPromptStructure = z.infer<typeof structureSchema>;

/**
 * The text and the structure are read **separately**, and that is a bug fix.
 *
 * Reading them as one object meant an unrecognised structure took the text down
 * with it: the screen announced "sem texto registrado" while nine hundred
 * characters of prompt sat in the column. The text is a string and can always be
 * shown; the structure is best-effort by nature, because it is the shape that
 * evolves. Never let the fragile half hold the sturdy half hostage.
 */
const textSchema = z.object({ text: z.string() });
const compiledSchema = z.object({ structure: structureSchema });

const paramsSchema = z.object({ aspect_ratio: z.string().optional() });

export async function loadGeneration(input: unknown): Promise<GenerationRecord | null> {
  const parsed = z.uuid().safeParse(input);

  if (!parsed.success) return null;

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  // RLS scopes generations to their owner, so an id belonging to somebody else
  // simply finds nothing.
  const { data: row } = await supabase
    .from("generations")
    .select(
      "id, created_at, model, provider, sparks_charged, prompt_user_pt, prompt_compiled, params, sheet_source",
    )
    .eq("id", parsed.data)
    .maybeSingle();

  if (!row) return null;

  const text = textSchema.safeParse(row.prompt_compiled);
  const compiled = compiledSchema.safeParse(row.prompt_compiled);
  const params = paramsSchema.safeParse(row.params);

  return {
    id: row.id,
    createdAt: row.created_at,
    model: row.model,
    provider: row.provider,
    sparksCharged: row.sparks_charged,
    promptUserPt: row.prompt_user_pt,
    promptText: text.success ? text.data.text : "",
    structure: compiled.success ? compiled.data.structure : null,
    aspectRatio: params.success ? (params.data.aspect_ratio ?? null) : null,
    sheetSource: row.sheet_source,
  };
}

/**
 * A link that saves the file instead of opening it.
 *
 * Supabase signs the download disposition into the URL itself, so the browser
 * can be handed an ordinary anchor — no fetching the bytes into memory only to
 * hand them straight back to the browser.
 */
export async function signAssetDownload(input: unknown): Promise<string | null> {
  const parsed = z.uuid().safeParse(input);

  if (!parsed.success) return null;

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  const { data: asset } = await supabase
    .from("assets")
    .select("storage_path, mime_type, label")
    .eq("id", parsed.data)
    .maybeSingle();

  if (!asset) return null;

  const extension = asset.mime_type.includes("jpeg") ? "jpg" : "png";
  const name = (asset.label ?? "imagem")
    // A file name, not a caption: anything a file system would object to goes.
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .slice(0, 60);

  const { data: signed } = await supabase.storage
    .from("assets")
    .createSignedUrl(asset.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: `${name || "imagem"}.${extension}`,
    });

  return signed?.signedUrl ?? null;
}
