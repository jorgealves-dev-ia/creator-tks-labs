import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { loadMachineBoard } from "@/lib/storyboard/machine-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cabeNoBucket, montarVideo, type RecusaDeMontagem } from "@/lib/video/montagem";

/**
 * «MONTAR O VÍDEO» — o gesto que faz a Máquina terminar em UM arquivo.
 *
 * A ordem dos passos está declarada no §4.1b do `docs/plano-video-final.md`, e
 * ela foi escrita **antes** deste arquivo por exigência do dono. Ela é:
 *
 *   1. sessão            quem é, e o roteiro é dele?
 *   2. cenas na ORDEM    `storyboard_scenes.ordem` — nunca `created_at`
 *   3. falta clipe?      recusa dizendo QUANTOS faltam, sem tocar no Storage
 *   4. `cabeNoBucket`    soma `assets.byte_size` — recusa com o número, sem baixar
 *   5. baixa             só agora os bytes saem do Storage
 *   6. `montarVideo`     a trava lê os ARQUIVOS e nomeia o clipe que destoa
 *   7. sobe + grava      o filme no Storage, e `record_montage` numa transação só
 *
 * **Os passos 3 e 4 são as duas recusas que custam zero** — nenhuma abre arquivo,
 * nenhuma gasta egress. Baixar 35 MB para depois concluir que não cabia em 50 MB
 * é pagar para descobrir o que o banco já sabia.
 *
 * ---------------------------------------------------------------------------
 * O dono não vem daqui, e isso é de propósito
 * ---------------------------------------------------------------------------
 *
 * Não existe `userId` no corpo do pedido nem nesta função. A sessão sai do
 * cookie, e o dono do filme é resolvido **dentro do banco**, por
 * `record_montage`, que faz `auth.uid()` — o mesmo desenho de
 * `record_generation`. Um `user_id` que chegasse pelo corpo seria um campo que o
 * cliente escolhe.
 *
 * ---------------------------------------------------------------------------
 * Zero dinheiro, e por escrito
 * ---------------------------------------------------------------------------
 *
 * Este caminho **não chama provedor, não cria linha em `generations` e não toca
 * o ledger**. Nenhum Spark sai. É a mesma natureza do quadro derivado do elo.
 */

const entradaSchema = z.object({
  projectId: z.string().uuid(),
  roteiroNodeId: z.string().min(1),
});

export type MontagemRecusada =
  | { ok: false; motivo: "entrada_invalida" }
  | { ok: false; motivo: "roteiro_nao_encontrado" }
  | { ok: false; motivo: "sem_cenas" }
  /** Ainda falta clipe. `faltam` é o número que a tela mostra. */
  | { ok: false; motivo: "faltam_clipes"; faltam: number; total: number }
  | { ok: false; motivo: "clipe_sumido"; posicao: number }
  | { ok: false; motivo: "download_falhou"; posicao: number }
  | { ok: false; motivo: "upload_falhou" }
  | { ok: false; motivo: "registro_falhou"; detalhe: string }
  /** A trava da montagem falou. O objeto inteiro vai para a tela traduzir. */
  | { ok: false; motivo: "recusa_da_montagem"; recusa: RecusaDeMontagem };

export type MontagemFeita = {
  ok: true;
  assetId: string;
  storagePath: string;
  bytes: number;
  largura: number;
  altura: number;
  fps: number;
  duracaoSegundos: number;
  quadros: number;
  cenas: number;
  ms: number;
};

export async function montarOStoryboard(
  input: unknown,
): Promise<MontagemFeita | MontagemRecusada> {
  const parsed = entradaSchema.safeParse(input);

  if (!parsed.success) return { ok: false, motivo: "entrada_invalida" };

  // 1 · A sessão. Sem ela não há dono, e sem dono não há filme.
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) redirect("/login");

  // 2 · As cenas, NA ORDEM. `loadMachineBoard` já devolve ordenado por `ordem` e
  //     já sabe qual é o clipe de cada cena — reusar é o que impede uma segunda
  //     maneira de responder "qual é o clipe desta cena", que envelheceria calada
  //     no primeiro dia em que alguém consertasse só uma. (É o mesmo argumento
  //     que tirou o elo de dentro do bloco Gerar Vídeo, em 15/08.)
  const board = await loadMachineBoard(parsed.data);

  if (!board) return { ok: false, motivo: "roteiro_nao_encontrado" };
  if (board.cenas.length === 0) return { ok: false, motivo: "sem_cenas" };

  // 3 · A recusa que custa zero: falta clipe? Diz QUANTOS, e não "não dá".
  const semClipe = board.cenas.filter((cena) => cena.videoAssetId === null).length;

  if (semClipe > 0) {
    return { ok: false, motivo: "faltam_clipes", faltam: semClipe, total: board.cenas.length };
  }

  const idsNaOrdem = board.cenas.map((cena) => cena.videoAssetId!);

  // 4 · A segunda recusa que custa zero: cabe no bucket? Só `byte_size`, e
  //     NENHUM byte de vídeo sai do Storage para responder isto.
  const { data: linhas } = await supabase
    .from("assets")
    .select("id, storage_path, byte_size")
    .in("id", idsNaOrdem);

  const porId = new Map((linhas ?? []).map((linha) => [linha.id, linha]));
  const faltando = idsNaOrdem.findIndex((id) => !porId.has(id));

  if (faltando >= 0) return { ok: false, motivo: "clipe_sumido", posicao: faltando + 1 };

  const coube = cabeNoBucket(idsNaOrdem.map((id) => porId.get(id)?.byte_size ?? 0));

  if (!coube.cabe) return { ok: false, motivo: "recusa_da_montagem", recusa: coube.recusa };

  // 5 · Agora sim, os bytes. Na ordem das cenas, um por um.
  const entradas = [];

  for (const [i, id] of idsNaOrdem.entries()) {
    const caminho = porId.get(id)!.storage_path;
    const { data: blob } = await supabase.storage.from("assets").download(caminho);

    if (!blob) return { ok: false, motivo: "download_falhou", posicao: i + 1 };

    entradas.push({
      rotulo: `cena ${board.cenas[i]!.ordem}`,
      arquivo: new Uint8Array(await blob.arrayBuffer()),
    });
  }

  // 6 · A montagem, com a trava que lê os ARQUIVOS.
  const montagem = await montarVideo(entradas);

  if (!montagem.ok) return { ok: false, motivo: "recusa_da_montagem", recusa: montagem.recusa };

  const filme = montagem.montado;

  // 7 · O Storage e o banco. O caminho segue a convenção dos clipes
  //     (`<dono>/video/<projeto>/...`), com id próprio: cada montagem é um filme
  //     novo, e sobrescrever apagaria o que a pessoa talvez já tenha postado.
  const userId = claims.claims.sub;
  const storagePath = `${userId}/video/${parsed.data.projectId}/filme-${crypto.randomUUID()}.mp4`;

  const { error: erroUpload } = await supabase.storage
    .from("assets")
    .upload(storagePath, filme.arquivo, { contentType: "video/mp4", upsert: false });

  if (erroUpload) return { ok: false, motivo: "upload_falhou" };

  // `record_montage` grava o asset E as N peças numa transação só — o PostgREST
  // não faz transação multi-tabela, e um filme órfão de linhagem é uma perda
  // calada: o arquivo existe, abre, toca, e ninguém descobre até perguntarem de
  // onde ele veio.
  const { data: assetRow, error: erroRegistro } = await supabase.rpc("record_montage", {
    // O projeto é obrigatório e não tem `default` — quem esquecer não compila.
    // É a única porta que os dois triggers de 04/09 não alcançam: o filme não
    // deriva de um asset só e não tem geração.
    p_project_id: parsed.data.projectId,
    p_storage_path: storagePath,
    p_byte_size: filme.arquivo.byteLength,
    p_width: filme.largura,
    p_height: filme.altura,
    p_duration_ms: Math.round(filme.duracaoSegundos * 1000),
    p_part_asset_ids: idsNaOrdem,
    p_label: `Filme · ${board.titulo}`,
  });

  if (erroRegistro || !assetRow) {
    // O arquivo subiu e a escrituração falhou: tirar o arquivo é o certo, senão
    // sobra um objeto no bucket que nenhuma linha conhece — e ele conta para o
    // teto de 50 MB do mesmo jeito.
    await supabase.storage.from("assets").remove([storagePath]);

    return { ok: false, motivo: "registro_falhou", detalhe: erroRegistro?.message ?? "sem linha" };
  }

  return {
    ok: true,
    assetId: assetRow.id,
    storagePath,
    bytes: filme.arquivo.byteLength,
    largura: filme.largura,
    altura: filme.altura,
    fps: filme.fps,
    duracaoSegundos: filme.duracaoSegundos,
    quadros: filme.quadros,
    cenas: board.cenas.length,
    ms: filme.ms,
  };
}
