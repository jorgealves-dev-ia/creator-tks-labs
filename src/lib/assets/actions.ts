"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Short-lived links for stored images, by asset id.
 *
 * The bucket is private, so a file has no public address at all — which is the
 * point. A signed URL expires, and that is exactly why a node stores the asset id
 * and asks for a fresh link when it mounts: a saved canvas graph must never carry
 * a URL that will be dead tomorrow (architecture decision 3).
 *
 * RLS does the access control. An id belonging to somebody else simply produces
 * no row, so it can never produce a link.
 */

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** A canvas can hold a lot of results; one request should not sign a library. */
const MAX_IDS = 60;

/** One screenful of gallery, with room to scroll before asking for more. */
const GALLERY_PAGE_SIZE = 24;

const schema = z.array(z.uuid()).max(MAX_IDS);

export type SignedAssetUrls = Record<string, string>;

export async function signAssetUrls(input: unknown): Promise<SignedAssetUrls> {
  const parsed = schema.safeParse(input);

  if (!parsed.success || parsed.data.length === 0) {
    return {};
  }

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  const { data: assets } = await supabase
    .from("assets")
    .select("id, storage_path")
    .in("id", parsed.data);

  if (!assets || assets.length === 0) {
    return {};
  }

  const { data: signed } = await supabase.storage
    .from("assets")
    .createSignedUrls(
      assets.map((asset) => asset.storage_path),
      SIGNED_URL_TTL_SECONDS,
    );

  const urlByPath = new Map((signed ?? []).map((entry) => [entry.path, entry.signedUrl]));

  return Object.fromEntries(
    assets
      .map((asset) => [asset.id, urlByPath.get(asset.storage_path)] as const)
      .filter((entry): entry is readonly [string, string] => typeof entry[1] === "string"),
  );
}

// ---------------------------------------------------------------------------
// The gallery — "Minhas imagens" (§4)
// ---------------------------------------------------------------------------

/**
 * Everything the user has, generated or uploaded, newest first.
 *
 * An image used once stays available forever: upload a product once, use it in
 * a hundred generations. That sentence is the whole feature, and it only needs
 * a list — the assets table has been accumulating exactly this since Phase 0,
 * with nothing yet able to look at it.
 */
const gallerySchema = z.object({
  filter: z.enum(["todas", "geradas", "enviadas"]),
  query: z.string().max(80),
  /** created_at of the last item already shown — the cursor for "load more". */
  before: z.string().optional(),
});

export type GalleryItem = {
  assetId: string;
  url: string;
  label: string | null;
  source: "upload" | "generation";
  createdAt: string;
  /**
   * De onde vieram os pixels, quando este arquivo foi calculado de outro nosso.
   *
   * É **isto** que identifica um quadro derivado na galeria, e não o `source` —
   * que continua dizendo apenas quem pôs o arquivo aqui. Foi a decisão da Fase
   * 1: acrescentar um valor ao enum faria o quadro cair fora dos três filtros e
   * sumir justamente de quem o procurasse em "geradas". **O dado identifica,
   * nunca o rótulo.**
   */
  derivedFromAssetId: string | null;
};

export type GalleryPage = { items: GalleryItem[]; hasMore: boolean };

/**
 * Strips what PostgREST's filter grammar would read as syntax, and what `ilike`
 * would read as a wildcard.
 *
 * Not a security boundary — the client library parameterises values — but a
 * correctness one: a search for "50% off" with the percent left in matches
 * everything, which looks like a bug in the search and is really a bug here.
 */
function sanitizeQuery(raw: string): string {
  return raw.replace(/[,()*\\%_."']/g, " ").trim();
}

export async function listGalleryAssets(input: unknown): Promise<GalleryPage> {
  const parsed = gallerySchema.safeParse(input);

  if (!parsed.success) {
    return { items: [], hasMore: false };
  }

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  // RLS already restricts this to the caller; ordering and paging are all this
  // has to add. One extra row is fetched to answer "is there more" without a
  // second count query.
  let query = supabase
    .from("assets")
    .select("id, storage_path, label, source, created_at, derived_from_asset_id")
    .eq("kind", "image")
    .order("created_at", { ascending: false })
    .limit(GALLERY_PAGE_SIZE + 1);

  if (parsed.data.filter !== "todas") {
    query = query.eq("source", parsed.data.filter === "geradas" ? "generation" : "upload");
  }

  if (parsed.data.before) {
    query = query.lt("created_at", parsed.data.before);
  }

  const term = sanitizeQuery(parsed.data.query);

  if (term !== "") {
    // The path is searched alongside the label so that assets from before
    // labels existed are still findable by what they are: a canonical image
    // carries its slot in the path, which is the only name it ever had.
    query = query.or(`label.ilike.%${term}%,storage_path.ilike.%${term}%`);
  }

  const { data: rows } = await query;

  if (!rows || rows.length === 0) {
    return { items: [], hasMore: false };
  }

  const hasMore = rows.length > GALLERY_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, GALLERY_PAGE_SIZE) : rows;

  const { data: signed } = await supabase.storage
    .from("assets")
    .createSignedUrls(
      page.map((row) => row.storage_path),
      SIGNED_URL_TTL_SECONDS,
    );

  const urlByPath = new Map((signed ?? []).map((entry) => [entry.path, entry.signedUrl]));

  return {
    items: page
      .map((row) => ({
        assetId: row.id,
        url: urlByPath.get(row.storage_path) ?? null,
        label: row.label,
        source: row.source,
        createdAt: row.created_at,
        derivedFromAssetId: row.derived_from_asset_id,
      }))
      .filter((item): item is GalleryItem => item.url !== null),
    hasMore,
  };
}

// ---------------------------------------------------------------------------
// Uploading a reference
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  storagePath: z.string().min(1),
  mimeType: z.string().regex(/^image\//),
  byteSize: z.int().positive().nullable(),
  width: z.int().positive().nullable(),
  height: z.int().positive().nullable(),
  label: z.string().max(200),
});

export type RegisterAssetResult =
  | { ok: true; item: GalleryItem }
  | { ok: false; reason: "invalid" | "error" };

/**
 * Registers a file the browser has just uploaded to Storage.
 *
 * The file goes from the browser straight to the bucket — sending it through
 * this server would double the traffic for no gain, and the bucket policies
 * already pin every user to their own folder. What happens here is the
 * bookkeeping: the assets row and the link to show it.
 *
 * The path is checked against the caller's own folder here as well as by the
 * Storage policy. The same rule stated twice is cheap, and a path is the one
 * thing a browser fully controls.
 */
export async function registerUploadedAsset(input: unknown): Promise<RegisterAssetResult> {
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  if (!parsed.data.storagePath.startsWith(`${userId}/`)) {
    return { ok: false, reason: "invalid" };
  }

  const { data: asset } = await supabase
    .from("assets")
    .insert({
      user_id: userId,
      kind: "image",
      source: "upload",
      storage_path: parsed.data.storagePath,
      mime_type: parsed.data.mimeType,
      byte_size: parsed.data.byteSize,
      width: parsed.data.width,
      height: parsed.data.height,
      label: parsed.data.label.trim() || null,
    })
    .select("id, label, source, created_at")
    .single();

  if (!asset) {
    return { ok: false, reason: "error" };
  }

  const { data: signed } = await supabase.storage
    .from("assets")
    .createSignedUrl(parsed.data.storagePath, SIGNED_URL_TTL_SECONDS);

  if (!signed) {
    return { ok: false, reason: "error" };
  }

  return {
    ok: true,
    item: {
      assetId: asset.id,
      url: signed.signedUrl,
      label: asset.label,
      source: asset.source,
      createdAt: asset.created_at,
      // Um arquivo que alguém acabou de enviar não veio de arquivo nenhum.
      derivedFromAssetId: null,
    },
  };
}

// ---------------------------------------------------------------------------
// O quadro derivado — Frente Storyboard · Ciclo 1 (O Elo)
// ---------------------------------------------------------------------------

const derivedFrameSchema = z.object({
  storagePath: z.string().min(1),
  /** O vídeo de onde os pixels vieram. Conferido aqui, nunca acreditado. */
  sourceAssetId: z.uuid(),
  /** Em que instante do vídeo. Cosmético para a segurança, essencial para o registro. */
  atMs: z.int().min(0),
  width: z.int().positive(),
  height: z.int().positive(),
  byteSize: z.int().positive(),
});

/**
 * O quadro que já foi lido deste vídeo, se já foi.
 *
 * Existe para o segundo clique não pagar o preço do primeiro. Sem esta consulta,
 * "Continuar deste vídeo" num vídeo que já foi continuado baixaria 4 MB,
 * decodificaria, subiria 1,2 MB ao Storage e concluiria que não havia nada a
 * fazer — e, pior, **exigiria aba visível para dizer isso**, porque a leitura
 * passa pelo decodificador. Uma frase que só informa não pode custar mais que a
 * ação que ela informa não ter acontecido.
 *
 * Uma consulta indexada (`assets_derived_from_asset_id_idx`) e escopada pelo RLS:
 * um vídeo de outra pessoa simplesmente não devolve linha.
 */
export async function findDerivedFrame(input: unknown): Promise<{ assetId: string } | null> {
  const parsed = z.uuid().safeParse(input);

  if (!parsed.success) return null;

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  const { data: frame } = await supabase
    .from("assets")
    .select("id")
    .eq("derived_from_asset_id", parsed.data)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return frame ? { assetId: frame.id } : null;
}

export type RegisterFrameResult =
  | { ok: true; assetId: string; url: string; label: string | null; created: boolean }
  | { ok: false; reason: "invalid" | "not_a_video" | "error" };

/**
 * Registra o quadro que o navegador acabou de subir, com a linhagem.
 *
 * ---------------------------------------------------------------------------
 * Nada disto é uma geração
 * ---------------------------------------------------------------------------
 *
 * Não há linha em `generations`, não há lançamento no ledger, não há Spark. Não
 * é economia: é o que a coisa é. **Quadro derivado é engenharia, não geração** —
 * não houve provedor, modelo nem preço, e `generations.provider`/`model` são
 * `NOT NULL` justamente porque uma geração sem eles não existe.
 *
 * ---------------------------------------------------------------------------
 * O que é conferido e o que é aceito
 * ---------------------------------------------------------------------------
 *
 * O navegador afirma três coisas: onde subiu o arquivo, de qual vídeo o quadro
 * saiu e em que instante. A divisão é a de 10/08/2026 — **pode nomear, nunca
 * pode alargar**:
 *
 *   conferido   o caminho está na pasta do chamador (e a política do bucket
 *               diz o mesmo, de novo); o asset de origem existe, é dele (RLS) e
 *               é `kind = 'video'`
 *   aceito      o instante, que é registro e não permissão
 *
 * O **rótulo não viaja do navegador**, e essa é a parte que vale dizer: ele é
 * montado aqui, a partir do `label` do vídeo lido pelo id. Registro de auditoria
 * que acredita no nome que o cliente mandou não é registro de auditoria — mesma
 * doutrina que faz o `@` ser resolvido no servidor.
 *
 * ---------------------------------------------------------------------------
 * Clicar duas vezes não cria dois quadros
 * ---------------------------------------------------------------------------
 *
 * O caminho é determinístico pelo id do vídeo (`<user>/frames/<video>-ultimo.png`),
 * então a segunda subida sobrescreve os mesmos bytes e esta função devolve o
 * asset que já existia, com `created: false`. É a mesma decisão que fez o vídeo
 * abandonar o `randomUUID()` no caminho do Storage: **execução dupla sobrescreve,
 * nunca duplica.**
 */
export async function registerDerivedFrame(input: unknown): Promise<RegisterFrameResult> {
  const parsed = derivedFrameSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  if (!parsed.data.storagePath.startsWith(`${userId}/`)) {
    return { ok: false, reason: "invalid" };
  }

  // O RLS já limita esta leitura ao dono, então "não achou" e "não é seu" são a
  // mesma resposta — que é a resposta certa para as duas.
  const { data: source } = await supabase
    .from("assets")
    .select("id, kind, label")
    .eq("id", parsed.data.sourceAssetId)
    .maybeSingle();

  if (!source) return { ok: false, reason: "invalid" };
  if (source.kind !== "video") return { ok: false, reason: "not_a_video" };

  const label = frameLabel(source.label);

  // O caminho já foi usado: o quadro existe, e clicar de novo não cria um irmão.
  const { data: existing } = await supabase
    .from("assets")
    .select("id, label, storage_path")
    .eq("storage_bucket", "assets")
    .eq("storage_path", parsed.data.storagePath)
    .maybeSingle();

  const row =
    existing ??
    (
      await supabase
        .from("assets")
        .insert({
          user_id: userId,
          kind: "image",
          // Foi o sistema que produziu este arquivo, não a pessoa. A pergunta
          // precisa — de onde vieram os pixels — é da coluna abaixo, e é ela que
          // identifica um derivado. O dado, nunca o rótulo.
          source: "generation",
          storage_path: parsed.data.storagePath,
          mime_type: "image/png",
          byte_size: parsed.data.byteSize,
          width: parsed.data.width,
          height: parsed.data.height,
          derived_from_asset_id: parsed.data.sourceAssetId,
          derived_from_ms: parsed.data.atMs,
          label,
        })
        .select("id, label, storage_path")
        .maybeSingle()
    ).data;

  if (!row) {
    // Duas abas clicando junto: a segunda perde no unique de (bucket, path).
    // A resposta certa não é erro — é devolver o quadro que a primeira criou.
    const { data: raced } = await supabase
      .from("assets")
      .select("id, label, storage_path")
      .eq("storage_bucket", "assets")
      .eq("storage_path", parsed.data.storagePath)
      .maybeSingle();

    if (!raced) return { ok: false, reason: "error" };

    return signFrame(supabase, raced, false);
  }

  return signFrame(supabase, row, existing === null);
}

async function signFrame(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  row: { id: string; label: string | null; storage_path: string },
  created: boolean,
): Promise<RegisterFrameResult> {
  const { data: signed } = await supabase.storage
    .from("assets")
    .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);

  if (!signed) return { ok: false, reason: "error" };

  return { ok: true, assetId: row.id, url: signed.signedUrl, label: row.label, created };
}

/**
 * O nome do quadro na galeria, montado do nome do vídeo.
 *
 * "Último quadro · ela vira para a câmera…" diz as duas coisas que alguém
 * procurando precisa: o que é, e de qual clipe saiu. A busca da galeria varre
 * `label`, então o prefixo também é como se encontram todos os quadros de uma
 * vez.
 */
function frameLabel(videoLabel: string | null): string {
  const prefix = "Último quadro";

  if (!videoLabel || videoLabel.trim() === "") return prefix;

  const flat = `${prefix} · ${videoLabel.trim().replace(/\s+/g, " ")}`;

  // O teto de 200 é constraint (`assets_label_length`): cortar aqui é o que
  // impede um prompt longo de derrubar a escrituração de um quadro que já está
  // no Storage.
  return flat.length > 200 ? `${flat.slice(0, 199)}…` : flat;
}
