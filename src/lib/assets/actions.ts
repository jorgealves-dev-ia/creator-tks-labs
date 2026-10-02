"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { discardUnregisteredUpload } from "./discard-upload";
import { extensionFor, storedTypeVerdict, UPLOAD_IMAGE_TYPES } from "./image-bytes";
import { signWithThumbnails, type SignedAsset } from "./signing";
import { readStoredHead } from "./stored-head";
import { isThumbnailPath } from "./thumbnail-path";

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


/** A canvas can hold a lot of results; one request should not sign a library. */
const MAX_IDS = 60;

/** One screenful of gallery, with room to scroll before asking for more. */
const GALLERY_PAGE_SIZE = 24;

const schema = z.array(z.uuid()).max(MAX_IDS);

/**
 * Os dois endereços de cada arquivo, por id de asset.
 *
 * **Grade, faixa e card leem `thumb`; clique, zoom e download leem `full`** — a
 * regra da faxina de egress, e o porquê de `thumb` nunca ser nulo está em
 * `signing.ts`.
 */
export type SignedAssetUrls = Record<string, SignedAsset>;

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

  const signed = await signWithThumbnails(
    supabase,
    assets.map((asset) => asset.storage_path),
  );

  return Object.fromEntries(
    assets.flatMap((asset) => {
      const pair = signed.get(asset.storage_path);

      return pair ? [[asset.id, pair] as const] : [];
    }),
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
  /**
   * Se o arquivo é vídeo — **obrigatório, e não opcional**.
   *
   * Era ausente, e a ausência custou o defeito de 28/08/2026: a Galeria do
   * projeto (o modal do estúdio) desenhava `<img src="…mp4">` e abria o clipe
   * como "Imagem ampliada" que nunca carregava, enquanto a `/galeria` mostrava
   * o mesmo arquivo certo. **Dois caminhos de exibição para um arquivo só.**
   *
   * A causa não estava em nenhuma das duas telas: estava aqui. O conversor que
   * traz um item da galeria para cá declarava um parâmetro sem `isVideo`, então
   * o campo era **derrubado no caminho** — em silêncio, com o TypeScript
   * satisfeito. Obrigatório, essa omissão deixa de compilar.
   */
  isVideo: boolean;
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

  // A grade desenha em ~173 px: o que viaja aqui é a miniatura. O original é
  // assunto de quem amplia, e o Lightbox reassina por id quando isso acontece.
  const signed = await signWithThumbnails(
    supabase,
    page.map((row) => row.storage_path),
  );

  return {
    items: page
      .map((row) => ({
        assetId: row.id,
        url: signed.get(row.storage_path)?.thumb ?? null,
        label: row.label,
        source: row.source,
        createdAt: row.created_at,
        derivedFromAssetId: row.derived_from_asset_id,
        // Esta consulta filtra `kind = 'image'`, então aqui é sempre falso — e
        // dizê-lo por extenso é melhor que deixá-lo implícito no filtro.
        isVideo: false,
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
  // The three formats a reference can be, and nothing wider. Until 27/09 this
  // was "anything starting with image/", taken on the browser's word.
  mimeType: z.enum(UPLOAD_IMAGE_TYPES),
  byteSize: z.int().positive().nullable(),
  width: z.int().positive().nullable(),
  height: z.int().positive().nullable(),
  label: z.string().max(200),
});

/** Only the path — what a refusal needs to find the upload it is refusing. */
const claimedPathSchema = z.object({ storagePath: z.string().min(1) });

type RegisterRefusal = "invalid" | "error" | "type_mismatch";

export type RegisterAssetResult =
  | { ok: true; item: GalleryItem }
  | { ok: false; reason: RegisterRefusal };

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
 *
 * ---------------------------------------------------------------------------
 * A refusal leaves nothing behind (01/10/2026)
 * ---------------------------------------------------------------------------
 *
 * The file and its thumbnail are already in the bucket when this is called.
 * Until now a refusal answered `ok: false` and left them there — two objects
 * with no row, which nothing on any screen could reach or delete. So the
 * contract is now the whole of it, in both directions:
 *
 *   ok: true    the row exists and the file is linked
 *   ok: false   no row, and no file — removed here, in the call that refused
 *
 * It is done HERE because this is the only place that knows whether a row was
 * written. The browser sees a failure; only the server knows which kind.
 */
export async function registerUploadedAsset(input: unknown): Promise<RegisterAssetResult> {
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  // Every refusal below leaves through here, and takes the upload with it. The
  // discard keeps its own guards — the shape of the path, the absence of a row,
  // the caller's own folder —, so calling it is safe from any line: a path this
  // function refuses for not being the caller's is refused there for the same
  // reason, and a path that IS registered is never touched.
  const refuse = async (reason: RegisterRefusal): Promise<RegisterAssetResult> => {
    const claimed = claimedPathSchema.safeParse(input);

    if (claimed.success) {
      await discardUnregisteredUpload(supabase, userId, claimed.data.storagePath);
    }

    return { ok: false, reason };
  };

  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    return refuse("invalid");
  }

  if (!parsed.data.storagePath.startsWith(`${userId}/`)) {
    return refuse("invalid");
  }

  // Um original jamais nasce num caminho de derivado. Sem esta linha, um envio
  // chamado `foto.jpg.thumb.webp` viraria a "miniatura" de `foto.jpg` — e a
  // grade mostraria uma imagem no lugar de outra. É a única forma de a regra do
  // caminho ser violada, e ela é fechada aqui, no mesmo lugar em que o caminho
  // vindo do navegador já é conferido.
  if (isThumbnailPath(parsed.data.storagePath)) {
    return refuse("invalid");
  }

  // The type, in the path as in the row: `<uuid>.webp` is a WebP. The path is
  // the one thing the browser fully controls, and a `.jpg` holding a WebP is
  // exactly the lie this function stopped accepting on 27/09.
  if (!parsed.data.storagePath.endsWith(`.${extensionFor(parsed.data.mimeType)}`)) {
    return refuse("invalid");
  }

  // And the bytes, which decide. The browser may NAME the type; only the file
  // already in Storage may make it true — "pode nomear, nunca alargar", the
  // division of 10/08 applied to a file. Sixteen bytes, read with a Range.
  const verdict = storedTypeVerdict(
    parsed.data.mimeType,
    await readStoredHead(supabase, parsed.data.storagePath),
  );

  if (!verdict.ok) {
    return refuse(verdict.reason === "type_mismatch" ? "type_mismatch" : "error");
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
    return refuse("error");
  }

  // O que volta daqui vai direto para a grade do seletor, em ~173 px: miniatura.
  const signed = await signWithThumbnails(supabase, [parsed.data.storagePath]);
  const pair = signed.get(parsed.data.storagePath);

  if (!pair) {
    // The row was written and the file will not sign: it is gone, or Storage
    // does not answer for it. This used to return `ok: false` and LEAVE the row
    // — the one refusal that said "failed" with an asset in the gallery. A row
    // whose file is missing is the failure that shows, as a broken frame; so
    // the row comes back out, and the refusal is whole like the others. Nothing
    // can cite an asset born a moment ago. If the row cannot be removed, the
    // discard finds it and keeps the file: no worse than before.
    await supabase.from("assets").delete().eq("id", asset.id);

    return refuse("error");
  }

  return {
    ok: true,
    item: {
      assetId: asset.id,
      url: pair.thumb,
      label: asset.label,
      source: asset.source,
      createdAt: asset.created_at,
      // Um arquivo que alguém acabou de enviar não veio de arquivo nenhum.
      derivedFromAssetId: null,
      isVideo: false,
    },
  };
}

/**
 * Removes an upload whose TRANSFER failed — before any registration was asked.
 *
 * "Failed" is what the browser saw. A response lost on the way back leaves the
 * object written in the bucket with nobody the wiser, and no registration will
 * ever come for it. The browser names the path; the checks that decide whether
 * anything is deleted are the same ones the registration's refusals go through
 * (`discard-upload.ts`): the exact shape of an upload, no row in `assets`, the
 * caller's own folder.
 */
export async function discardUpload(input: unknown): Promise<{ removed: number }> {
  const parsed = claimedPathSchema.safeParse(input);

  if (!parsed.success) {
    return { removed: 0 };
  }

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const outcome = await discardUnregisteredUpload(supabase, userId, parsed.data.storagePath);

  return { removed: outcome.discarded ? outcome.removed : 0 };
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
  const signed = await signWithThumbnails(supabase, [row.storage_path]);
  const pair = signed.get(row.storage_path);

  if (!pair) return { ok: false, reason: "error" };

  return { ok: true, assetId: row.id, url: pair.thumb, label: row.label, created };
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
