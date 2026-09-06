"use server";

import { z } from "zod";

import {
  pecasDaLinhagem,
  type LinhaDeLinhagem,
  type PecaDaLinhagem,
} from "@/lib/video/linhagem";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * "De que peças este filme é feito?" — a leitura que o cartão faz.
 *
 * ---------------------------------------------------------------------------
 * Lê o BANCO, e não o grafo
 * ---------------------------------------------------------------------------
 *
 * O cartão poderia ter guardado a linhagem no `data` do node quando o filme foi
 * montado. Não guarda, e a decisão é a mesma do dono em 04/09: **o asset é a
 * verdade e o cartão é a vista** — se os dois divergirem, quem manda é a linha
 * em `assets`. Uma cópia no grafo só existiria para poder discordar do banco no
 * dia em que uma peça fosse apagada, que é exatamente o dia que esta fase
 * atende.
 *
 * **E é o que faz os cartões ANTIGOS funcionarem.** O filme de 04/09 já está no
 * canvas do dono, salvo num grafo escrito antes desta fase existir. Se a
 * linhagem morasse no `data`, ele nunca a teria.
 *
 * ---------------------------------------------------------------------------
 * Silêncio para quem não é filme
 * ---------------------------------------------------------------------------
 *
 * Um clipe é um cartão de vídeo como qualquer outro e não tem linhagem: a
 * consulta volta vazia e a resposta é `null`, que o cartão lê como *"não
 * desenhe faixa nenhuma"*. Não é caso especial — é a ausência de linhas
 * dizendo o que ela é.
 *
 * O RLS escopa ao dono. Um filme que não é seu simplesmente não encontra nada.
 */

const entradaSchema = z.object({ assetId: z.uuid() });

export async function lerLinhagemDoFilme(input: unknown): Promise<PecaDaLinhagem[] | null> {
  const parsed = entradaSchema.safeParse(input);

  if (!parsed.success) return null;

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) return null;

  // O `!` com o nome da constraint é obrigatório: a tabela tem DUAS chaves
  // estrangeiras para `assets` — o filme e a peça —, e sem dizer qual delas o
  // PostgREST recusa a consulta por ambiguidade.
  const { data } = await supabase
    .from("asset_montage_parts")
    .select("ordem, part_asset_id, peca:assets!asset_montage_parts_part_asset_id_fkey (label)")
    .eq("montage_asset_id", parsed.data.assetId);

  if (!data || data.length === 0) return null;

  const linhas: LinhaDeLinhagem[] = data.map((linha) => ({
    ordem: linha.ordem,
    part_asset_id: linha.part_asset_id,
    rotulo: linha.peca?.label ?? null,
  }));

  return pecasDaLinhagem(linhas);
}
