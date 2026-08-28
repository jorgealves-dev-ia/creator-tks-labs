/**
 * Onde mora a miniatura de um arquivo — a regra inteira, em duas funções.
 *
 * ---------------------------------------------------------------------------
 * Caminho, não coluna
 * ---------------------------------------------------------------------------
 *
 * A miniatura de `p` é `p + ".thumb.webp"`. Não há coluna nova, não há
 * migration, não há política de bucket nova: as quatro políticas de
 * `storage.objects` casam por `storage.foldername(name)[1]` — o primeiro nível
 * de pasta, que é o UUID do dono —, e um caminho derivado do original continua
 * na mesma pasta. **A miniatura herda o dono do original pela forma do
 * caminho.**
 *
 * E há um segundo dividendo, que é o que dispensa a coluna: `createSignedUrls`
 * do Supabase responde **por caminho**, com `signedUrl: null` para o que não
 * existe. Então *"existe miniatura?"* é respondida na mesma viagem que já
 * assina — sem requisição extra, sem 404 no navegador, e sem um booleano no
 * banco que pudesse discordar do Storage.
 *
 * ---------------------------------------------------------------------------
 * Acrescenta a extensão, nunca substitui
 * ---------------------------------------------------------------------------
 *
 * `foto.jpg` → `foto.jpg.thumb.webp`, e não `foto.webp`. Substituir exigiria
 * cortar a extensão — um `parse` — e faria `foto.jpg` e `foto.png` disputarem o
 * mesmo caminho de miniatura. Acrescentar é função **pura e total**: qualquer
 * string entra, o resultado é único, e não existe caminho de original que
 * colida com um de miniatura (`isThumbnailPath` é a guarda que garante isso).
 *
 * Este arquivo não importa `server-only` de propósito: a regra é a mesma no
 * servidor que faz a miniatura da imagem gerada, no navegador que faz a da
 * imagem enviada, e nas telas que a leem. **Uma regra em dois lugares é uma
 * regra que vai divergir.**
 */

export const THUMBNAIL_SUFFIX = ".thumb.webp";

/**
 * Um ano, e aqui `immutable` é literalmente verdade.
 *
 * O caminho de um asset nosso carrega um UUID, e uma segunda geração é um
 * arquivo novo em outro caminho. **Nada neste bucket muda de conteúdo.** É o
 * caso de livro para um cache longo — e os poucos caminhos determinísticos que
 * existem (o último quadro de um vídeo, a miniatura de um original) são
 * reescritos com **os mesmos bytes**, calculados da mesma fonte.
 *
 * Mora aqui, ao lado da regra do caminho, porque é a mesma classe de coisa: uma
 * convenção de como os nossos arquivos são guardados, que **o servidor e o
 * navegador precisam conhecer igualmente** — os dois sobem arquivo.
 *
 * **Sozinho este header não faz nada**, e vale dizer para ninguém achar que
 * basta: cache indexa pela URL inteira, e a URL assinada muda a cada
 * assinatura. Ele só começa a valer junto do cache de URLs em `signing.ts`.
 */
export const IMMUTABLE_CACHE_CONTROL = "31536000";

/** O caminho da miniatura de um original. Pura, total, sem parsing. */
export function thumbnailPath(originalPath: string): string {
  return `${originalPath}${THUMBNAIL_SUFFIX}`;
}

/**
 * Se um caminho é de miniatura.
 *
 * A guarda que impede um original de nascer num caminho de derivado — o que
 * faria a miniatura dele sobrescrever... a miniatura de outra coisa. Custa uma
 * linha e fecha a única forma de o requisito "o original é intocável" ser
 * violado pela regra do caminho.
 */
export function isThumbnailPath(path: string): boolean {
  return path.endsWith(THUMBNAIL_SUFFIX);
}
