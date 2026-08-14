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
  /**
   * Se o arquivo é um vídeo — e a grade precisa saber **antes** de desenhar.
   *
   * Nasceu em 13/08/2026, com o primeiro vídeo: um `<img src="…mp4">` não falha
   * com erro, ele desenha o ícone de imagem quebrada, que é indistinguível de um
   * link expirado. A galeria mostraria um acervo com buracos e a causa seria a
   * tag errada.
   */
  isVideo: boolean;
};

/**
 * Quantas imagens a coluna de resultados de um bloco pede ao banco.
 *
 * Eram quatro, quando a faixa era um lembrete sob a moldura. Passou a dezesseis
 * em 12/08/2026, quando a faixa virou **a grade** — a mesma caixinha que mostra
 * um trabalho esperando, um trabalho gerando e uma imagem pronta. Dezesseis é o
 * tamanho da grade, e a grade é o teto da fila: **o histórico nunca consome vaga
 * de trabalho vivo** — ele entra depois deles e transborda para o "Ver todas".
 *
 * Pedir mais do que a grade mostra seria pagar assinatura de link por imagem que
 * ninguém vê; pedir menos deixaria buracos numa grade que tem imagem para
 * preencher.
 */
const NODE_HISTORY_LIMIT = 16;

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
    .limit(NODE_HISTORY_LIMIT);

  return withSignedUrls(supabase, rows ?? []);
}

/**
 * Os vídeos deste bloco — **inclusive os que ainda não existem**.
 *
 * ---------------------------------------------------------------------------
 * Por que esta lista não se parece com a de imagens
 * ---------------------------------------------------------------------------
 *
 * `listNodeGenerations` devolve só sucessos, e está certa: no bloco de imagem, um
 * trabalho vivo mora na **fila do cliente**, porque a intenção de gerar quatro
 * imagens só existe no navegador até cada requisição sair. O banco não sabe o
 * que foi pedido enquanto não é feito.
 *
 * No vídeo é o contrário, e essa inversão é o ciclo inteiro: **a linha nasce
 * antes de o provedor ser chamado.** No primeiro milissegundo já existe um
 * `queued` no banco com dono, projeto e node. Uma fila no cliente seria uma
 * segunda cópia — pior — de um estado que o banco já guarda melhor: ela morreria
 * na troca de aba, não sobreviveria a um reload, e discordaria do banco no
 * instante em que o webhook chegasse com a aba fechada.
 *
 * Então o estado vivo do bloco de vídeo **é o banco**, e esta consulta é a
 * leitura dele. O Realtime avisa quando reler; nada é mantido em memória para
 * divergir.
 *
 * Por isso ela traz os quatro estados e não filtra por sucesso: uma caixinha
 * precisa saber desenhar "na fila", "gerando" e "falhou" — e uma falha, no
 * vídeo, é a explicação de por que não há nada para ver.
 */
export type VideoJobRow = {
  generationId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "canceled";
  /** Assinada, e só quando existe arquivo. */
  url: string | null;
  assetId: string | null;
  errorMessage: string | null;
  sparksCharged: number;
  durationSeconds: number | null;
  createdAt: string;
  /** Há quanto tempo o trabalho está em voo, para o botão de reconciliar. */
  ageSeconds: number;
};

export async function listNodeVideos(input: unknown): Promise<VideoJobRow[]> {
  const parsed = recentSchema.safeParse(input);

  if (!parsed.success) return [];

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  const { data: rows } = await supabase
    .from("generations")
    .select(
      "id, status, created_at, started_at, result_asset_id, error_message, sparks_charged, params",
    )
    .eq("project_id", parsed.data.projectId)
    .eq("node_id", parsed.data.nodeId)
    .eq("media_kind", "video")
    .order("created_at", { ascending: false })
    .limit(NODE_HISTORY_LIMIT);

  if (!rows || rows.length === 0) return [];

  // Uma assinatura só para todos os arquivos que existem. Trabalhos vivos não
  // têm arquivo, e pedir link para eles seria uma viagem por nada.
  const assetIds = rows
    .map((row) => row.result_asset_id)
    .filter((id): id is string => id !== null);

  const urlByAsset = new Map<string, string>();

  if (assetIds.length > 0) {
    const { data: assets } = await supabase
      .from("assets")
      .select("id, storage_path")
      .in("id", assetIds);

    const { data: signed } = await supabase.storage
      .from("assets")
      .createSignedUrls(
        (assets ?? []).map((asset) => asset.storage_path),
        SIGNED_URL_TTL_SECONDS,
      );

    const urlByPath = new Map((signed ?? []).map((entry) => [entry.path, entry.signedUrl]));

    for (const asset of assets ?? []) {
      const url = urlByPath.get(asset.storage_path);

      if (url) urlByAsset.set(asset.id, url);
    }
  }

  const now = Date.now();

  return rows.map((row) => {
    const duration = (row.params as { duration_seconds?: unknown } | null)?.duration_seconds;
    const since = row.started_at ?? row.created_at;

    return {
      generationId: row.id,
      status: row.status,
      url: row.result_asset_id ? (urlByAsset.get(row.result_asset_id) ?? null) : null,
      assetId: row.result_asset_id,
      errorMessage: row.error_message,
      sparksCharged: row.sparks_charged,
      durationSeconds: typeof duration === "number" ? duration : null,
      createdAt: row.created_at,
      ageSeconds: Math.max(0, Math.round((now - new Date(since).getTime()) / 1000)),
    };
  });
}

/**
 * O que falta para uma miniatura virar cartão Resultado — buscado **no clique**.
 *
 * A partir de 12/08/2026 a geração não nasce mais como cartão no canvas: ela
 * nasce na moldura, e o cartão passa a ser um ato deliberado ("Usar no fluxo").
 * O cartão precisa de duas coisas que a miniatura não carrega — a proporção, para
 * a caixa dele não deitar um 9:16 dentro de um quadrado, e a personagem, para a
 * legenda dizer `@luna v2`.
 *
 * **Sob demanda, e não por carregamento de faixa** (decisão do Jorge, 13/08/2026):
 * dezesseis miniaturas por bloco pagariam duas consultas cada para responder uma
 * pergunta que a esmagadora maioria delas nunca recebe. Um clique é raro; uma
 * montagem de canvas não é.
 *
 * Sempre consultado, mesmo para a imagem que acabou de sair e cujos dados o
 * navegador ainda tem na mão: um caminho só, e um que lê do registro gravado em
 * vez de uma lembrança do cliente. É a mesma doutrina que faz o nome do produto
 * ser resolvido no servidor.
 */
export type ResultCardData = {
  aspectRatio: string | null;
  handle: string | null;
  versionNumber: number | null;
};

const NO_CARD_DATA: ResultCardData = {
  aspectRatio: null,
  handle: null,
  versionNumber: null,
};

export async function loadResultCard(input: unknown): Promise<ResultCardData> {
  const parsed = z.uuid().safeParse(input);

  if (!parsed.success) return NO_CARD_DATA;

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  // O RLS já limita `generations` ao dono, então um id de outra pessoa
  // simplesmente não encontra linha — e o cartão nasce sem legenda, que é o
  // mesmo que nascer sem os dados.
  const { data: row } = await supabase
    .from("generations")
    .select("params, entity_id, entity_version_id")
    .eq("id", parsed.data)
    .maybeSingle();

  if (!row) return NO_CARD_DATA;

  const params = paramsSchema.safeParse(row.params);
  const aspectRatio = params.success ? (params.data.aspect_ratio ?? null) : null;

  // Sem personagem não há legenda a buscar, e as duas consultas seguintes não
  // acontecem. É o caso mais comum de todos: cena livre, sem `@`.
  if (!row.entity_id) return { ...NO_CARD_DATA, aspectRatio };

  const { data: entity } = await supabase
    .from("entities")
    .select("handle")
    .eq("id", row.entity_id)
    .maybeSingle();

  let versionNumber: number | null = null;

  if (row.entity_version_id) {
    const { data: version } = await supabase
      .from("entity_versions")
      .select("version_number")
      .eq("id", row.entity_version_id)
      .maybeSingle();

    versionNumber = version?.version_number ?? null;
  }

  return { aspectRatio, handle: entity?.handle ?? null, versionNumber };
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

// ---------------------------------------------------------------------------
// Tudo que o usuário já gerou — a Galeria geral do dashboard (Fase 2a)
// ---------------------------------------------------------------------------

/**
 * De onde uma imagem veio, para o selo do canto.
 *
 * **Três casos, e não dois** — e essa é a diferença que a Fase 1 tornou
 * necessária. Antes dela, "sem projeto" só podia significar folha canônica,
 * porque nenhum projeto com gerações jamais fora excluído. Agora a exclusão
 * existe, e o `ON DELETE SET NULL` de `generations_project_id_fkey` produz
 * gerações sem projeto que são **trabalho de canvas** — a regra ingênua
 * chamaria de "folha canônica" uma cena que a pessoa dirigiu.
 *
 * O que separa os dois é o `node_id`: a folha nasce no editor da personagem e
 * nunca teve node; a cena nasce num bloco do canvas e carrega o id dele. Medido
 * neste banco antes de virar código: as 3 folhas têm `project_id` **e**
 * `node_id` nulos; as 30 do canvas têm os dois preenchidos.
 */
export type GenerationOrigin =
  | { kind: "project"; name: string }
  | { kind: "canonical" }
  | { kind: "orphan" };

export type GalleryEntry = GenerationThumb & { origin: GenerationOrigin };

export type GeneralGalleryPage = { items: GalleryEntry[]; hasMore: boolean };

const generalGallerySchema = z.object({
  /** created_at do último item já mostrado — o cursor do "carregar mais". */
  before: z.string().optional(),
});

/**
 * Todas as imagens do usuário, de todos os projetos — a Galeria do dashboard.
 *
 * É `listProjectGallery` **sem o recorte**, e o que entra por causa disso são
 * justamente as folhas canônicas: elas não têm `project_id` e por isso não
 * aparecem em galeria de projeto nenhuma. O comentário daquela função registra
 * que ficam de fora "de propósito, porque são identidade e não trabalho deste
 * projeto" — e promete que continuam alcançáveis. **Este é o lugar onde essa
 * promessa é paga.**
 */
export async function listGeneralGallery(input: unknown): Promise<GeneralGalleryPage> {
  const parsed = generalGallerySchema.safeParse(input);

  if (!parsed.success) return { items: [], hasMore: false };

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  // Uma linha a mais que a página, para responder "tem mais?" sem uma segunda
  // consulta de contagem. Mesmo truque da galeria por projeto.
  let query = supabase
    .from("generations")
    .select("id, created_at, result_asset_id, project_id, node_id")
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
  const page = hasMore ? rows.slice(0, GALLERY_PAGE_SIZE) : rows;

  // Os nomes dos projetos numa consulta só, e não um embed: a casa resolve
  // cruzamento com uma segunda consulta e um Map (ver `loadCharacters`), o que
  // mantém o código legível sem depender de como o PostgREST nomeia a relação.
  const projectIds = [
    ...new Set(page.map((row) => row.project_id).filter((id): id is string => id !== null)),
  ];

  const projectNames = new Map<string, string>();

  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);

    for (const project of projects ?? []) {
      projectNames.set(project.id, project.name);
    }
  }

  const thumbs = await withSignedUrls(supabase, page);
  const originById = new Map(page.map((row) => [row.id, originOf(row, projectNames)]));

  return {
    items: thumbs.map((thumb) => ({
      ...thumb,
      // A miniatura só existe se a geração existe, então o selo sempre está lá;
      // o `??` é o que o tipo exige, não um caso que aconteça.
      origin: originById.get(thumb.generationId) ?? { kind: "orphan" },
    })),
    hasMore,
  };
}

/** A regra dos três casos, num lugar só. */
function originOf(
  row: { project_id: string | null; node_id: string | null },
  projectNames: ReadonlyMap<string, string>,
): GenerationOrigin {
  if (row.project_id !== null) {
    const name = projectNames.get(row.project_id);

    // Projeto que o RLS não devolveu não vira nome inventado: sem nome, a
    // imagem é órfã para efeito de selo, que é o que ela de fato é na tela.
    return name ? { kind: "project", name } : { kind: "orphan" };
  }

  return row.node_id === null ? { kind: "canonical" } : { kind: "orphan" };
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

  // `kind` vem do **asset**, não de `generations.media_kind`, e a diferença é de
  // autoridade: a pergunta é "que arquivo é este", e quem responde é o arquivo.
  // Ler da geração daria a mesma resposta hoje e sobreviveria mal ao dia em que
  // uma geração produzir mais de uma coisa.
  const { data: assets } = await supabase
    .from("assets")
    .select("id, storage_path, label, kind")
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
        isVideo: asset.kind === "video",
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
