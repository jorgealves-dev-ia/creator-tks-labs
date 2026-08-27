"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { thumbnailPath } from "./thumbnail-path";

/**
 * A miniatura de um arquivo que a pessoa acabou de escolher — feita aqui, no
 * navegador.
 *
 * ---------------------------------------------------------------------------
 * Por que dois produtores, e por que este é um deles
 * ---------------------------------------------------------------------------
 *
 * A regra é uma só: **a miniatura nasce onde os bytes já estão.**
 *
 * A imagem **gerada** nasce no servidor, que já tem os bytes na mão para subir
 * o original — lá o produtor é o `sharp` (`thumbnail.ts`). A imagem **enviada**
 * vai do navegador direto para o bucket, sem passar pelo servidor, e é aqui que
 * os bytes estão.
 *
 * Um produtor só custaria um download em um dos dois casos: fazer a miniatura
 * da gerada no navegador exigiria baixar 1,8 MB que o servidor já tinha; fazer a
 * da enviada no servidor exigiria baixar do bucket o que o navegador acabou de
 * ler do disco. **Não é repetição — é a única divisão que não paga egress para
 * economizar egress.**
 *
 * ---------------------------------------------------------------------------
 * `createImageBitmap`, e não um `<img>`
 * ---------------------------------------------------------------------------
 *
 * Com `imageOrientation: "from-image"` ele aplica a rotação do EXIF na
 * decodificação. Uma foto de celular carrega a rotação nos metadados: sem isso a
 * miniatura de um retrato sai deitada — e, pior, as dimensões gravadas em
 * `assets` sairiam trocadas. É a mesma correção que o `autoOrient` faz do lado
 * do servidor, e os dois lados precisam concordar sobre o que é largura.
 *
 * O bitmap é fechado no `finally`: sem isso, dez envios seguidos deixam dez
 * bitmaps decodificados vivos na memória da aba.
 */

/** O mesmo teto do servidor. Ver a nota de 512 px em `thumbnail.ts`. */
const MAX_EDGE = 512;
const QUALITY = 0.72;
const CONTENT_TYPE = "image/webp";
const IMMUTABLE_CACHE_CONTROL = "31536000";

export type ClientThumbnail = {
  blob: Blob;
  /** O tamanho do **original**, já corrigido pela orientação EXIF. */
  source: { width: number; height: number };
};

export async function deriveThumbnailInBrowser(file: Blob): Promise<ClientThumbnail | null> {
  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const { width, height } = bitmap;

    if (!width || !height) return null;

    // `min(1, …)` é o `withoutEnlargement` do servidor: um original menor que a
    // caixa fica como está. Ampliar produziria uma "miniatura" mais pesada que
    // o arquivo que ela deveria substituir.
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");

    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");

    if (!context) return null;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob(resolve, CONTENT_TYPE, QUALITY);
      } catch {
        resolve(null);
      }
    });

    // Um navegador que não codifica WebP devolve PNG com o tipo trocado, e um
    // PNG de 512 px pode ser maior que o JPEG original. Conferir o tipo é o que
    // impede a "miniatura" de custar mais que a imagem que ela representa.
    if (!blob || blob.type !== CONTENT_TYPE) return null;

    return { blob, source: { width, height } };
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}

/**
 * Calcula e sobe a miniatura do arquivo que acabou de ir para o bucket.
 *
 * Devolve as dimensões do original quando deu certo — é o que quem chama grava
 * em `assets.width/height` — e `null` quando não deu. Nunca estoura: um envio
 * não pode falhar porque o derivado falhou.
 */
export async function storeThumbnailInBrowser(
  originalPath: string,
  file: Blob,
): Promise<{ width: number; height: number } | null> {
  const derived = await deriveThumbnailInBrowser(file);

  if (!derived) return null;

  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.storage
    .from("assets")
    .upload(thumbnailPath(originalPath), derived.blob, {
      contentType: CONTENT_TYPE,
      cacheControl: IMMUTABLE_CACHE_CONTROL,
      upsert: true,
    });

  return error ? null : derived.source;
}
