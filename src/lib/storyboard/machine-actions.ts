"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signWithThumbnails } from "@/lib/assets/signing";
import {
  estadoDaCena,
  estadoDoVideo,
  type MachineBoard,
  type MachineScene,
} from "@/lib/storyboard/machine-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * O que a Máquina lê — FRENTE STORYBOARD · CICLO 3 · Fase 1.
 *
 * ---------------------------------------------------------------------------
 * O trilho é ESPELHO, e um espelho não guarda nada
 * ---------------------------------------------------------------------------
 *
 * Este arquivo não escreve. Ele responde uma pergunta só — *em que pé está cada
 * cena deste roteiro?* — e responde **lendo**, porque o requisito 4 do ciclo diz
 * que o estado por cena persiste no banco e não em node state: sessões morrem, e
 * um lote de dez imagens não pode morrer com elas.
 *
 * A Máquina também não guarda o id do storyboard. Ela sabe qual roteiro rege
 * porque **a aresta diz** — o fio vem do node de Roteiro, e daí sai
 * `(project_id, node_id)`, que é a chave que a Fase 1 do Ciclo 2 criou
 * justamente para o bloco não precisar guardar id nenhum. Uma segunda cópia só
 * existiria para poder discordar da primeira.
 *
 * ---------------------------------------------------------------------------
 * O estado é DERIVADO, nunca gravado
 * ---------------------------------------------------------------------------
 *
 * Não existe coluna `estado` em lugar nenhum, e a ausência é a decisão. Um
 * rótulo gravado pode discordar do fato; aqui o estado é uma leitura de três
 * dados que já existem:
 *
 *   `imagem_aprovada_asset_id`   a única DECISÃO — e por isso a única coluna
 *   `generations` por `scene_id` todas as tentativas, inclusive as recusadas
 *   `transicao`                  se a cena tem imagem própria (D4)
 *
 * É a mesma doutrina do `derived_from_asset_id` e do `cenas_no_original`: **o
 * que identifica é o dado, nunca o rótulo.**
 */

const inputSchema = z.object({
  projectId: z.uuid(),
  /** O node do ROTEIRO, e não o da Máquina — é ele que acha o storyboard. */
  roteiroNodeId: z.string().min(1).max(200),
});

export async function loadMachineBoard(input: unknown): Promise<MachineBoard | null> {
  const parsed = inputSchema.safeParse(input);

  if (!parsed.success) return null;

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  // O RLS escopa ao dono; `(project_id, node_id)` é o recorte do produto. Um par
  // que não é seu simplesmente não encontra nada.
  const { data: board } = await supabase
    .from("storyboards")
    .select(
      "id, titulo, canal, formato, estilo, storyboard_scenes (id, ordem, acao, cenario, movimento, enquadramento, personagem_handle, produto, duracao_segundos, transicao, imagem_aprovada_asset_id)",
    )
    .eq("project_id", parsed.data.projectId)
    .eq("node_id", parsed.data.roteiroNodeId)
    .maybeSingle();

  if (!board) return null;

  const fichas = [...board.storyboard_scenes].sort((a, b) => a.ordem - b.ordem);

  if (fichas.length === 0) {
    return {
      storyboardId: board.id,
      titulo: board.titulo,
      canal: board.canal,
      formato: board.formato,
      estilo: board.estilo,
      personagemHandle: null,
      cenas: [],
    };
  }

  // -------------------------------------------------------------------------
  // As tentativas — TODAS, e é isso que a coluna `scene_id` comprou
  //
  // Uma consulta para as N cenas, e não uma por cena: a Fase 5 do Egress mediu
  // que o canvas sofria de VIAGENS e não de bytes, e um trilho de dez cenas
  // pedindo dez vezes seria a mesma doença nascendo de novo.
  // -------------------------------------------------------------------------
  const sceneIds = fichas.map((ficha) => ficha.id);

  const { data: tentativas } = await supabase
    .from("generations")
    .select("id, scene_id, media_kind, status, result_asset_id, error_message, created_at")
    .in("scene_id", sceneIds)
    .order("created_at", { ascending: false });

  const porCena = new Map<string, typeof tentativas>();

  for (const linha of tentativas ?? []) {
    if (!linha.scene_id) continue;

    const lista = porCena.get(linha.scene_id) ?? [];

    lista.push(linha);
    porCena.set(linha.scene_id, lista);
  }

  // -------------------------------------------------------------------------
  // As miniaturas, assinadas EM LOTE — uma viagem para o trilho inteiro
  // -------------------------------------------------------------------------
  const assetIds = new Set<string>();

  for (const ficha of fichas) {
    if (ficha.imagem_aprovada_asset_id) assetIds.add(ficha.imagem_aprovada_asset_id);

    const ultimaBoa = (porCena.get(ficha.id) ?? []).find(
      (linha) => linha.media_kind === "image" && linha.status === "succeeded" && linha.result_asset_id,
    );

    if (ultimaBoa?.result_asset_id) assetIds.add(ultimaBoa.result_asset_id);
  }

  const urlPorAsset = new Map<string, string>();

  if (assetIds.size > 0) {
    const { data: assets } = await supabase
      .from("assets")
      .select("id, storage_path")
      .in("id", [...assetIds]);

    const assinadas = await signWithThumbnails(
      supabase,
      (assets ?? []).map((asset) => asset.storage_path),
    );

    for (const asset of assets ?? []) {
      const par = assinadas.get(asset.storage_path);

      // O trilho desenha pequeno: miniatura. `thumb` nunca é nulo — sem
      // miniatura ele vem com o endereço do original (Egress, Fase 2).
      if (par) urlPorAsset.set(asset.id, par.thumb);
    }
  }

  const cenas: MachineScene[] = fichas.map((ficha, indice) => {
    const linhas = porCena.get(ficha.id) ?? [];
    const imagens = linhas.filter((linha) => linha.media_kind === "image");
    const videos = linhas.filter((linha) => linha.media_kind === "video");
    const ultimaImagem = imagens[0] ?? null;
    const boa = imagens.find((linha) => linha.status === "succeeded" && linha.result_asset_id);
    const continuacao = ficha.transicao === "continuacao";

    const assetVisivel = ficha.imagem_aprovada_asset_id ?? boa?.result_asset_id ?? null;

    return {
      id: ficha.id,
      ordem: ficha.ordem,
      acao: ficha.acao,
      cenario: ficha.cenario,
      movimento: ficha.movimento,
      enquadramento: ficha.enquadramento,
      personagemHandle: ficha.personagem_handle,
      produto: ficha.produto,
      duracaoSegundos: ficha.duracao_segundos,
      transicao: continuacao ? "continuacao" : "corte",
      estado: estadoDaCena({
        continuacao,
        aprovada: ficha.imagem_aprovada_asset_id !== null,
        temImagem: Boolean(boa),
        ultimaFalhou: ultimaImagem?.status === "failed",
      }),
      thumbUrl: assetVisivel ? (urlPorAsset.get(assetVisivel) ?? null) : null,
      tentativas: imagens.length,
      erro: ultimaImagem?.status === "failed" ? ultimaImagem.error_message : null,
      video: estadoDoVideo(videos[0]?.status ?? null),
      // A cena que ela emenda é sempre a anterior na ordem — a mesma leitura
      // que o Ciclo 1 fez do elo. Nula na cena 1, que o banco já impede de ser
      // continuação (`storyboard_scenes_primeira_nao_continua`).
      emendaDe: continuacao ? (fichas[indice - 1]?.ordem ?? null) : null,
    };
  });

  return {
    storyboardId: board.id,
    titulo: board.titulo,
    canal: board.canal,
    formato: board.formato,
    estilo: board.estilo,
    // O handle da história é o da primeira cena que menciona alguém: a ficha
    // guarda o handle por cena, e um roteiro de produto não menciona ninguém.
    personagemHandle: cenas.find((cena) => cena.personagemHandle)?.personagemHandle ?? null,
    cenas,
  };
}
