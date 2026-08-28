import "server-only";

import { thumbnailPath } from "./thumbnail-path";

/**
 * Assinar original e miniatura juntos — e devolver **a mesma URL** enquanto ela
 * valer.
 *
 * ---------------------------------------------------------------------------
 * Por que os dois endereços sempre, e nunca só um
 * ---------------------------------------------------------------------------
 *
 * A regra da faxina: **grade, faixa e card leem `thumb`; clique, zoom e download
 * leem `full`.** Quem chama escolhe na hora de desenhar, sem uma segunda ida ao
 * servidor — e sem que a existência da miniatura vire uma pergunta que cada tela
 * tenha que fazer por conta própria.
 *
 * Custa zero a mais: `createSignedUrls` aceita uma lista e responde **por
 * caminho**, com `signedUrl: null` para o que não existe. Dobrar a lista dobra
 * bytes de JSON, não requisições — e é isso que dispensa a coluna
 * `has_thumbnail` que teria sido a alternativa. **O Storage é a autoridade sobre
 * o que está no Storage**, e um booleano no banco só poderia discordar dele.
 *
 * `thumb` nunca é nulo: sem miniatura, vem o endereço do **original**. O
 * requisito "miniatura que falha não bloqueia nada" é assim uma propriedade da
 * **forma da resposta**, e não um `if` que cinco telas precisam lembrar.
 *
 * ---------------------------------------------------------------------------
 * A URL estável — e por que ela e o `cacheControl` são uma coisa só
 * ---------------------------------------------------------------------------
 *
 * Medido na Fase 0: **24 de 24 URLs mudaram entre duas visitas**. O token é um
 * JWT com `{url, scope, iat, exp}`, e o `iat` é o relógio do servidor no
 * instante da assinatura — duas assinaturas em segundos diferentes produzem
 * strings diferentes.
 *
 * E cache — o do navegador e o do CDN na frente do Storage — indexa pela **URL
 * inteira, query incluída**. URL nova a cada visita significa chave nova a cada
 * visita: não é o cache falhando, é **o cache nunca sendo consultado**. Era isso
 * o "cached egress em 5%".
 *
 * Por isso o `cacheControl` de um ano e este cache chegam **juntos**. Sozinho, o
 * header seria correto, bem-intencionado e completamente inerte.
 *
 * ---------------------------------------------------------------------------
 * Só o acerto é guardado, nunca a ausência
 * ---------------------------------------------------------------------------
 *
 * Uma miniatura que ainda não existe **não** vira entrada negativa. Se virasse,
 * um arquivo consertado pelo backfill continuaria "sem miniatura" por dias, e o
 * reparo não repararia nada visível.
 *
 * Não guardar a ausência também não custa: o caminho que falta simplesmente
 * entra na lista da chamada que já vai acontecer. E enquanto ele falta, `thumb`
 * aponta para o `full` — que **está** no cache e portanto **é estável**. A
 * imagem acerta o cache do navegador de qualquer jeito.
 */

export type SignedAsset = {
  /** O original. O zoom abre este, o download entrega este. */
  full: string;
  /** A miniatura — ou o original, quando ela ainda não existe. */
  thumb: string;
};

/**
 * Sete dias.
 *
 * O teto do Storage é bem maior, mas validade não é o que se maximiza aqui: uma
 * URL que vive uma semana já atravessa qualquer sessão de trabalho, e um link
 * que vazasse de um print teria uma semana de vida em vez de um ano.
 *
 * O que a validade longa compra não é conveniência — é **a chance de o cache
 * ser consultado**. Com uma hora, a URL de ontem já morreu antes de a segunda
 * visita acontecer.
 */
const TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Reusar até 80% da vida gasta.
 *
 * Quem receber a URL mais velha ainda terá **1,4 dia** antes de ela expirar —
 * folga suficiente para uma aba esquecida aberta. Devolver uma URL a ponto de
 * morrer seria trocar egress por imagem quebrada.
 */
const REUSE_FRACTION = 0.8;

/**
 * Teto do mapa, para uma instância de vida longa não crescer sem fim.
 *
 * O acervo medido tem 113 objetos; 2.000 é folga de mais de uma ordem de
 * grandeza e ainda assim um limite. Ao estourar, a entrada mais antiga sai —
 * e sair do cache não é erro, é voltar ao comportamento de antes desta fase.
 */
const MAX_ENTRIES = 2000;

type Entry = { url: string; reuseUntil: number };

/**
 * O cache, em memória do módulo.
 *
 * Escolha registrada em `docs/decisoes.md`: **o pior caso deste desenho é o
 * comportamento de hoje.** Instância fria devolve URL nova — que é exatamente o
 * que acontecia antes —, então ele não pode piorar nada. A alternativa era uma
 * tabela, e ela entra depois se a medição em produção decepcionar.
 *
 * **Advertência que vale mais que o código:** em `localhost` o processo é um só
 * e está sempre quente, então o acerto medido lá é 100%. **A medição de
 * desenvolvimento mente a favor.** Quem confirma é a produção.
 */
const cache = new Map<string, Entry>();

function readFresh(path: string, now: number): string | null {
  const entry = cache.get(path);

  if (!entry) return null;

  if (entry.reuseUntil <= now) {
    cache.delete(path);
    return null;
  }

  return entry.url;
}

function remember(path: string, url: string, now: number): void {
  if (cache.size >= MAX_ENTRIES) {
    // `Map` itera na ordem de inserção: a primeira chave é a mais antiga.
    const oldest = cache.keys().next();

    if (!oldest.done) cache.delete(oldest.value);
  }

  cache.set(path, { url, reuseUntil: now + TTL_SECONDS * REUSE_FRACTION * 1000 });
}

/**
 * Esquece caminhos que deixaram de existir.
 *
 * Sem isto, um arquivo apagado continuaria produzindo URL por dias, e a tela
 * mostraria uma moldura quebrada em vez de cair no estado vazio — que é o
 * comportamento honesto e o que a assinatura sem cache dava de graça, ao não
 * assinar o que não existe.
 *
 * Chamado nos mesmos pontos que removem do Storage: a limpeza de uma geração
 * que não pôde ser cobrada.
 */
export function forgetSignedUrls(paths: readonly string[]): void {
  for (const path of paths) cache.delete(path);
}

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrls: (
        paths: string[],
        expiresIn: number,
      ) => Promise<{ data: { path?: string | null; signedUrl: string | null }[] | null }>;
    };
  };
};

/**
 * Devolve, por caminho de original, o par assinado.
 *
 * Um caminho cujo **original** não assinou simplesmente não entra no mapa: o
 * arquivo sumiu do Storage, e uma tela não tem o que fazer com ele. É a mesma
 * decisão que a faixa de resultados já tomava — *"uma imagem que sumiu não entra
 * na faixa; a miniatura existe para ser clicada, e essa não pode ser."*
 */
export async function signWithThumbnails(
  supabase: StorageClient,
  paths: readonly string[],
): Promise<Map<string, SignedAsset>> {
  if (paths.length === 0) return new Map();

  const now = Date.now();
  const byPath = new Map<string, string>();
  const missing: string[] = [];

  // O que já está no cache não vai para a rede — e, mais importante que a
  // requisição poupada, volta com **a mesma string de antes**, que é o que
  // permite ao navegador reconhecer a imagem que ele já tem.
  for (const path of paths) {
    const thumb = thumbnailPath(path);
    const cachedFull = readFresh(path, now);
    const cachedThumb = readFresh(thumb, now);

    if (cachedFull) byPath.set(path, cachedFull);
    else missing.push(path);

    // A ausência de miniatura nunca é guardada, então um caminho sem entrada é
    // perguntado de novo — de graça, dentro da chamada que já vai acontecer.
    if (cachedThumb) byPath.set(thumb, cachedThumb);
    else missing.push(thumb);
  }

  if (missing.length > 0) {
    const { data } = await supabase.storage.from("assets").createSignedUrls(missing, TTL_SECONDS);

    for (const entry of data ?? []) {
      if (!entry.path || typeof entry.signedUrl !== "string") continue;

      byPath.set(entry.path, entry.signedUrl);
      remember(entry.path, entry.signedUrl, now);
    }
  }

  const result = new Map<string, SignedAsset>();

  for (const path of paths) {
    const full = byPath.get(path);

    if (!full) continue;

    result.set(path, { full, thumb: byPath.get(thumbnailPath(path)) ?? full });
  }

  return result;
}
