import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { storeThumbnail } from "./thumbnail";
import { thumbnailPath } from "./thumbnail-path";

/**
 * Dá miniatura ao acervo que nasceu antes de a miniatura existir.
 *
 * ---------------------------------------------------------------------------
 * O custo, dito antes de ser pago
 * ---------------------------------------------------------------------------
 *
 * Este é o único lugar de todo o mini-ciclo que **gasta** egress para
 * economizá-lo: cada original precisa ser baixado uma vez para ser
 * redimensionado. São ~73 MB no acervo medido — **menos de duas visitas à
 * galeria de hoje**, pagos uma vez para que as visitas seguintes custem 3%.
 *
 * ---------------------------------------------------------------------------
 * Idempotente, e é isso que a faz ser também a ferramenta de reparo
 * ---------------------------------------------------------------------------
 *
 * Uma assinatura em lote responde *"quais já têm miniatura?"* antes de baixar
 * qualquer coisa — `createSignedUrls` devolve `signedUrl: null` para o que não
 * existe, então a pergunta custa uma requisição para o acervo inteiro. Rodar de
 * novo pula tudo que já foi feito e refaz só o que falta.
 *
 * É por isso que ela **fica** depois do backfill: o requisito "miniatura que
 * falha não bloqueia geração paga" cria a possibilidade de um asset ficar sem
 * derivado, e esta função é o guarda-chuva. **Falha de derivado é clima; isto é
 * o conserto.**
 *
 * ---------------------------------------------------------------------------
 * Só acrescenta
 * ---------------------------------------------------------------------------
 *
 * Nunca escreve num caminho que não seja `<original>.thumb.webp`, e nunca lê um
 * asset que não seja do chamador — o RLS responde por isso, e nenhuma chave de
 * serviço entra aqui. O original não é tocado: é lido, e só.
 */

/** Um lote por vez, para caber no tempo da função com folga. */
const BATCH = 25;

export type BackfillReport = {
  ok: true;
  /** Assets de imagem examinados nesta chamada. */
  examined: number;
  /** Já tinham miniatura — pulados sem baixar nada. */
  skipped: number;
  /** Miniaturas criadas agora. */
  created: number;
  /** Não deu: original ilegível, download ou upload falhou. */
  failed: number;
  /** Bytes de original baixados para produzir as miniaturas desta chamada. */
  downloadedBytes: number;
  /** Ainda falta rodar de novo? */
  hasMore: boolean;
};

export async function backfillThumbnails(): Promise<BackfillReport | { ok: false }> {
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) return { ok: false };

  // Só imagem: um vídeo não tem miniatura por este caminho — ver a nota sobre o
  // pôster no plano. O RLS já limita ao dono.
  const { data: rows } = await supabase
    .from("assets")
    .select("id, storage_path")
    .eq("kind", "image")
    .order("created_at", { ascending: false });

  if (!rows || rows.length === 0) {
    return {
      ok: true,
      examined: 0,
      skipped: 0,
      created: 0,
      failed: 0,
      downloadedBytes: 0,
      hasMore: false,
    };
  }

  // Quem já tem miniatura, numa pergunta só. Sem isto, a segunda execução
  // baixaria o acervo inteiro para concluir que não havia nada a fazer — e o
  // reparo custaria o mesmo que o conserto original, toda vez.
  const { data: signed } = await supabase.storage
    .from("assets")
    .createSignedUrls(rows.map((row) => thumbnailPath(row.storage_path)), 60);

  const existing = new Set(
    (signed ?? []).filter((entry) => entry.signedUrl).map((entry) => entry.path),
  );

  const pending = rows.filter((row) => !existing.has(thumbnailPath(row.storage_path)));
  const batch = pending.slice(0, BATCH);

  let created = 0;
  let failed = 0;
  let downloadedBytes = 0;

  for (const row of batch) {
    const { data: blob } = await supabase.storage.from("assets").download(row.storage_path);

    if (!blob) {
      failed += 1;
      continue;
    }

    downloadedBytes += blob.size;

    const bytes = Buffer.from(await blob.arrayBuffer());
    const source = await storeThumbnail(supabase, row.storage_path, bytes);

    if (!source) {
      failed += 1;
      continue;
    }

    created += 1;

    // ---------------------------------------------------------------------
    // Por que as dimensões NÃO são gravadas aqui
    // ---------------------------------------------------------------------
    //
    // O `sharp` acabou de calculá-las, e a tentação era óbvia: 52 das 54 linhas
    // têm `width`/`height` nulos, e foi essa ausência que fez um `max()` sobre
    // quase-tudo-nulo produzir "960×960" num documento de plano.
    //
    // Mas `assets` **não tem política de UPDATE** — só SELECT, INSERT e DELETE.
    // Com RLS default-deny, um `update` daqui afeta zero linhas **e não
    // reclama**: o PostgREST responde sucesso, e a coluna continua vazia. Foi
    // exatamente o que aconteceu na primeira execução desta função.
    //
    // Isso não é um buraco a tapar: **uma linha de `assets` é o registro de um
    // arquivo que existe, e é escrita uma vez.** Criar a política para preencher
    // duas colunas trocaria uma imutabilidade deliberada por um dado cosmético.
    //
    // Nas imagens **novas** as dimensões entram no INSERT, onde não é preciso
    // política nenhuma — e é lá que elas estão sendo gravadas desde a Fase 1. As
    // linhas antigas ficam nulas, e isso está no backlog com este motivo.
  }

  return {
    ok: true,
    examined: rows.length,
    skipped: rows.length - pending.length,
    created,
    failed,
    downloadedBytes,
    hasMore: pending.length > batch.length,
  };
}
