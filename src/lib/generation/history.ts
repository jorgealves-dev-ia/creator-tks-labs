"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  structureSchema,
  type StoredPromptStructure,
} from "@/lib/generation/prompt-structure";
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

// ---------------------------------------------------------------------------
// O que este bloco produziu, e o que este projeto produziu (§4 da D1)
// ---------------------------------------------------------------------------

/**
 * Uma imagem gerada, como as duas telas novas precisam dela.
 *
 * A legenda é o próprio prompt do usuário (ver `galleryLabel` em
 * canvas-generate.ts): a galeria acha uma imagem pelo que foi pedido, não por
 * um nome que inventamos para ela.
 */
export type GenerationThumb = {
  generationId: string;
  assetId: string;
  url: string;
  label: string | null;
  createdAt: string;
};

/** Uma faixa de recentes é um lembrete, não um arquivo: quatro basta. */
const RECENT_LIMIT = 4;

/** Uma tela de galeria, com folga para rolar antes de pedir mais. */
const GALLERY_PAGE_SIZE = 24;

const recentSchema = z.object({
  projectId: z.uuid(),
  nodeId: z.string().min(1).max(200),
});

const projectGallerySchema = z.object({
  projectId: z.uuid(),
  /** created_at do último item já mostrado — o cursor do "carregar mais". */
  before: z.string().optional(),
});

export type ProjectGalleryPage = { items: GenerationThumb[]; hasMore: boolean };

/**
 * As imagens que **este bloco** produziu, mais recentes primeiro.
 *
 * Por `node_id` e não pelos ids salvos no grafo, e essa é a diferença que faz a
 * faixa valer: o node guarda só a última leva, então tudo que veio antes existia
 * apenas como cartão Resultado no canvas — e quem arrumou o canvas apagando
 * cartões perdeu o rastro de vista. O banco nunca perdeu.
 *
 * Só sucessos com imagem: uma falha tem sua explicação no bloco, no momento em
 * que aconteceu, e não é uma miniatura que se possa promover.
 */
export async function listNodeGenerations(input: unknown): Promise<GenerationThumb[]> {
  const parsed = recentSchema.safeParse(input);

  if (!parsed.success) return [];

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  // O RLS já limita ao dono; projeto e node são o recorte do produto.
  const { data: rows } = await supabase
    .from("generations")
    .select("id, created_at, result_asset_id")
    .eq("project_id", parsed.data.projectId)
    .eq("node_id", parsed.data.nodeId)
    .eq("status", "succeeded")
    .not("result_asset_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);

  return withSignedUrls(supabase, rows ?? []);
}

/**
 * Tudo que **este projeto** gerou — a Galeria do menu lateral.
 *
 * Filtrada por projeto desde o primeiro dia, de propósito: é o alicerce do
 * escopo por projeto da D2 e do painel futuro, e um filtro acrescentado depois
 * é um filtro que precisa ser adicionado em todas as telas que já existiam.
 *
 * Fica de fora o que não nasceu no canvas — as folhas canônicas, geradas no
 * editor da personagem, não têm `project_id`. É o recorte certo: elas são
 * identidade, não trabalho deste projeto, e continuam alcançáveis pelo seletor
 * de referências, que lista `assets` e não gerações.
 */
export async function listProjectGallery(input: unknown): Promise<ProjectGalleryPage> {
  const parsed = projectGallerySchema.safeParse(input);

  if (!parsed.success) return { items: [], hasMore: false };

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  // Uma linha a mais que a página, para responder "tem mais?" sem uma segunda
  // consulta de contagem.
  let query = supabase
    .from("generations")
    .select("id, created_at, result_asset_id")
    .eq("project_id", parsed.data.projectId)
    .eq("status", "succeeded")
    .not("result_asset_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(GALLERY_PAGE_SIZE + 1);

  if (parsed.data.before) {
    query = query.lt("created_at", parsed.data.before);
  }

  const { data: rows } = await query;

  if (!rows || rows.length === 0) return { items: [], hasMore: false };

  const hasMore = rows.length > GALLERY_PAGE_SIZE;

  return {
    items: await withSignedUrls(supabase, hasMore ? rows.slice(0, GALLERY_PAGE_SIZE) : rows),
    hasMore,
  };
}

/**
 * Os links assinados de uma leva de gerações, numa requisição só.
 *
 * A ordem das gerações é preservada: quem chamou já ordenou, e reordenar aqui
 * pelo que o Storage devolveu seria a tela discordando da consulta.
 */
async function withSignedUrls(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: readonly { id: string; created_at: string; result_asset_id: string | null }[],
): Promise<GenerationThumb[]> {
  const assetIds = rows
    .map((row) => row.result_asset_id)
    .filter((id): id is string => id !== null);

  if (assetIds.length === 0) return [];

  const { data: assets } = await supabase
    .from("assets")
    .select("id, storage_path, label")
    .in("id", assetIds);

  if (!assets || assets.length === 0) return [];

  const { data: signed } = await supabase.storage
    .from("assets")
    .createSignedUrls(
      assets.map((asset) => asset.storage_path),
      SIGNED_URL_TTL_SECONDS,
    );

  const urlByPath = new Map((signed ?? []).map((entry) => [entry.path, entry.signedUrl]));
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));

  return rows.flatMap((row) => {
    const asset = row.result_asset_id ? assetById.get(row.result_asset_id) : undefined;
    const url = asset ? urlByPath.get(asset.storage_path) : undefined;

    // Uma imagem que sumiu do Storage simplesmente não entra na faixa. Nada a
    // explicar: a miniatura existe para ser clicada, e essa não pode ser.
    if (!asset || !url) return [];

    return [
      {
        generationId: row.id,
        assetId: asset.id,
        url,
        label: asset.label,
        createdAt: row.created_at,
      },
    ];
  });
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
