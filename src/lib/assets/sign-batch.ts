"use client";

import { signAssetUrls, type SignedAssetUrls } from "./actions";

/**
 * Uma viagem para todos os cards que montaram juntos.
 *
 * ---------------------------------------------------------------------------
 * A doença que isto cura, e por que ela não é a das Fases 1-3
 * ---------------------------------------------------------------------------
 *
 * A galeria sofria de **bytes**; o canvas sofre de **viagens**. Medido na Fase
 * 0.3: **66 Server Actions** numa carga de canvas, em fila perfeita (razão
 * 1,01), somando **13,17 s** antes de a última imagem começar a aparecer — e
 * cada chamada custando só 111 ms. Não é lentidão do servidor: é contagem de
 * idas.
 *
 * A Fase 2 provou que são doenças diferentes sem querer: cortou 97,92% dos
 * bytes e o canvas continuou em 15,24 s. **Por isso a prova desta fase é em
 * viagens, não em MB** — medir bytes aqui daria zero de melhora e estaria
 * certo.
 *
 * ---------------------------------------------------------------------------
 * Por que o tick basta, e por que não há janela de tempo
 * ---------------------------------------------------------------------------
 *
 * O React monta os nodes de um canvas **num commit só**, então os `useEffect`
 * de todos os cards rodam no mesmo bloco, antes de o microtask agendado pelo
 * primeiro deles chegar a vez. Não é preciso `setTimeout`, debounce nem janela.
 *
 * E não ter janela é a propriedade que importa: **zero atraso acrescentado.** O
 * lote parte no mesmo instante em que a primeira chamada partiria hoje. Um
 * coletor que espera 50 ms para juntar mais gente deixaria toda carga pequena
 * mais lenta para deixar a grande mais rápida.
 *
 * Se o React fatiar os efeitos em mais de uma tarefa, saem dois ou três lotes
 * em vez de um — **e nada quebra**: é menos ganho, nunca resultado errado.
 *
 * ---------------------------------------------------------------------------
 * O que este módulo deliberadamente NÃO faz
 * ---------------------------------------------------------------------------
 *
 * **Não guarda URL entre lotes.** O cache existe, e está no lugar certo: no
 * servidor, desde a Fase 3. Um segundo cache aqui guardaria a mesma string sem
 * saber quando o arquivo sumiu — e `forgetSignedUrls`, que é o que impede
 * moldura quebrada, não alcança o navegador de ninguém. **Dois caches para um
 * dado, e só um deles sabe esquecer.**
 */

/**
 * O mesmo teto do schema em `signAssetUrls`.
 *
 * Lá ele é validação Zod, então estourar não degrada — **rejeita**. Um canvas
 * grande precisa virar dois pedaços aqui, ou vira zero imagem lá.
 */
const MAX_IDS = 60;

type Waiter = {
  /** O que **este** chamador pediu — ele recebe só isso de volta. */
  ids: readonly string[];
  resolve: (urls: SignedAssetUrls) => void;
};

type Batch = {
  /** `Set` porque a folha da personagem aparece na faixa **e** no card de sheet. */
  ids: Set<string>;
  waiters: Waiter[];
};

let pending: Batch | null = null;

/**
 * Peça os ids que você precisa. O lote é problema deste módulo.
 *
 * A assinatura é a mesma de `signAssetUrls`, de propósito: nenhum componente
 * precisa aprender o que é lote, e a troca em cada card é uma linha.
 */
export function signAssets(ids: readonly string[]): Promise<SignedAssetUrls> {
  if (ids.length === 0) return Promise.resolve({});

  return new Promise((resolve) => {
    if (!pending) {
      pending = { ids: new Set(), waiters: [] };
      queueMicrotask(() => void flush());
    }

    for (const id of ids) pending.ids.add(id);
    pending.waiters.push({ ids, resolve });
  });
}

async function flush(): Promise<void> {
  const batch = pending;

  // Zerado **antes** do await: quem pedir durante a viagem começa um lote novo
  // em vez de entrar num que já partiu — e ficar esperando para sempre.
  pending = null;

  if (!batch) return;

  const all = [...batch.ids];
  const chunks: string[][] = [];

  for (let i = 0; i < all.length; i += MAX_IDS) chunks.push(all.slice(i, i + MAX_IDS));

  let signed: SignedAssetUrls = {};

  try {
    const pages = await Promise.all(chunks.map((chunk) => signAssetUrls(chunk)));

    signed = Object.assign({}, ...pages) as SignedAssetUrls;
  } catch {
    // Falha não pendura ninguém. Todo mundo recebe vazio — que é exatamente o
    // que cada chamador já sabe tratar hoje, porque é o que `signAssetUrls`
    // devolve para um id sem linha. Um lote que falhasse em silêncio deixaria
    // nove cards girando para sempre.
    signed = {};
  }

  for (const waiter of batch.waiters) {
    waiter.resolve(
      Object.fromEntries(
        waiter.ids.flatMap((id) => {
          const pair = signed[id];

          return pair ? [[id, pair] as const] : [];
        }),
      ),
    );
  }
}
