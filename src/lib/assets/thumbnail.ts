import "server-only";

import sharp from "sharp";

import { IMMUTABLE_CACHE_CONTROL, thumbnailPath } from "./thumbnail-path";

/**
 * A miniatura — o derivado que existe para a tela não baixar o original.
 *
 * ---------------------------------------------------------------------------
 * O defeito que este arquivo conserta é de proporção, não de tamanho
 * ---------------------------------------------------------------------------
 *
 * Medido na Fase 0 do mini-ciclo de egress: a grade desenha cada imagem numa
 * caixa de **173 px**, e recebe arquivos de **1856×2304** e **2752×1536**. São
 * **56× mais pixels do que a tela usa** na média, e 143× no pior caso. Nenhum
 * arquivo é grande o bastante para chamar atenção sozinho — 1,84 MB de média —,
 * e é exatamente por isso que passou dois ciclos despercebido: **não havia um
 * culpado para achar numa lista ordenada por tamanho.**
 *
 * ---------------------------------------------------------------------------
 * O original é intocável, e isso é uma propriedade da forma
 * ---------------------------------------------------------------------------
 *
 * Nada aqui reescreve, recomprime ou substitui o que o provedor entregou. A
 * miniatura é um **arquivo a mais**, num caminho derivado do original, e o
 * download continua entregando o original byte a byte. Não é uma promessa que
 * alguém precise lembrar de cumprir: não existe neste módulo uma função capaz
 * de escrever no caminho do original.
 *
 * ---------------------------------------------------------------------------
 * Falha de derivado é clima
 * ---------------------------------------------------------------------------
 *
 * Toda função aqui devolve `null` em vez de estourar. Uma geração paga jamais
 * pode ser perdida porque um arquivo de 50 KB não pôde ser calculado — quem
 * chama segue em frente, a tela cai para o original, e o backfill idempotente
 * conserta depois. **O caminho triste da miniatura é o comportamento de hoje.**
 */

/**
 * 512 px de lado maior.
 *
 * O maior consumidor é a grade, medida em **173 px de largura numa tela de
 * DPR 1**. 512 cobre isso com folga, serve os cards maiores do canvas e aguenta
 * uma tela DPR 2 sem reamostrar para cima. *(O plano assumia DPR 2 e 175 px; a
 * Fase 0 mediu 1 e 173. A escolha não mudou — mas agora é medida, e não
 * suposta.)*
 */
const MAX_EDGE = 512;

/** WebP a 72: ~50 KB para o acervo medido, contra 1,84 MB de média do original. */
const QUALITY = 72;

export const THUMBNAIL_CONTENT_TYPE = "image/webp";

export type DerivedThumbnail = {
  /** Os bytes da miniatura, prontos para subir. */
  webp: Buffer;
  /** O tamanho da miniatura. */
  width: number;
  height: number;
  /**
   * O tamanho do **original**, já corrigido pela orientação EXIF.
   *
   * Sai de graça: o `sharp` precisa decodificar a imagem de qualquer forma para
   * redimensioná-la, e neste ponto as dimensões estão na mão. É o buraco que
   * fez o plano afirmar "960×960" lendo um `max()` sobre 51 de 52 linhas nulas
   * — dado que ninguém preencheu não vira fato por ser agregado.
   */
  source: { width: number; height: number };
};

/**
 * Calcula a miniatura a partir dos bytes do original.
 *
 * `autoOrient` porque uma foto de celular carrega a rotação no EXIF: sem isso a
 * miniatura de um retrato sai deitada.
 *
 * **E as dimensões saem de `meta.autoOrient`, não de `meta`** — a diferença foi
 * medida, não lida. Mesmo com `autoOrient: true` no construtor, `metadata()`
 * devolve as dimensões **como estão gravadas no arquivo**: num JPEG de 2000×1200
 * com `orientation: 6`, ele responde 2000×1200 enquanto a imagem é vista
 * 1200×2000. O `metadata().autoOrient` é que responde 1200×2000.
 *
 * A armadilha é que **a miniatura já saía certa** — a rotação é aplicada no
 * pipeline —, então nada na tela denunciaria o defeito: só a coluna `width`
 * ficaria com a largura e a altura trocadas, em silêncio, para sempre. Uma foto
 * de celular em pé teria sido gravada como paisagem.
 *
 * `failOn: "none"` porque um JPEG com o último bloco truncado ainda produz uma
 * miniatura perfeitamente boa, e recusar por causa disso seria transformar um
 * arquivo levemente imperfeito em ausência de miniatura.
 */
export async function deriveThumbnail(bytes: Buffer): Promise<DerivedThumbnail | null> {
  try {
    const image = sharp(bytes, { autoOrient: true, failOn: "none" });
    const meta = await image.metadata();

    // O `?? meta` é rede de segurança para uma versão do sharp que não traga o
    // campo: pior caso, volta-se ao comportamento antigo em vez de estourar.
    const seen = meta.autoOrient ?? meta;

    if (!seen.width || !seen.height) return null;

    const { data, info } = await image
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        // Uma imagem menor que a caixa fica como está. Ampliar um original
        // pequeno produziria uma "miniatura" mais pesada que ele.
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toBuffer({ resolveWithObject: true });

    return {
      webp: data,
      width: info.width,
      height: info.height,
      source: { width: seen.width, height: seen.height },
    };
  } catch {
    return null;
  }
}

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: Buffer,
        options?: { contentType?: string; cacheControl?: string; upsert?: boolean },
      ) => Promise<{ error: unknown }>;
    };
  };
};

/**
 * Calcula e sobe a miniatura do original que acabou de ser gravado.
 *
 * Devolve as dimensões do original quando conseguiu — é o que quem chama grava
 * em `assets.width/height` — e `null` quando não conseguiu. **Não distingue
 * "não decodificou" de "não subiu"**, de propósito: as duas têm a mesma
 * resposta do outro lado, que é seguir sem miniatura.
 *
 * `upsert` porque o caminho é determinístico: rodar duas vezes sobrescreve os
 * mesmos bytes em vez de falhar, que é o que permite ao backfill ser idempotente
 * e ao reparo ser só "rodar de novo".
 */
export async function storeThumbnail(
  supabase: StorageClient,
  originalPath: string,
  bytes: Buffer,
): Promise<{ width: number; height: number } | null> {
  const derived = await deriveThumbnail(bytes);

  if (!derived) return null;

  const { error } = await supabase.storage.from("assets").upload(thumbnailPath(originalPath), derived.webp, {
    contentType: THUMBNAIL_CONTENT_TYPE,
    cacheControl: IMMUTABLE_CACHE_CONTROL,
    upsert: true,
  });

  return error ? null : derived.source;
}
