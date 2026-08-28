"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signWithThumbnails } from "@/lib/assets/signing";
import { buildSceneDirective } from "@/lib/storyboard/scene-prompt";
import {
  estaDesatualizada,
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
    .select(
      "id, scene_id, media_kind, status, result_asset_id, error_message, created_at, prompt_compiled, prompt_user_pt",
    )
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

    // Quantas recusas SEGUIDAS do mesmo texto — a contagem que faz o gesto
    // escalar de "repita" para "reescreva".
    //
    // Conta do topo para baixo e PARA no primeiro sucesso ou no primeiro texto
    // diferente: um ↻ com instrução é outro pedido, e a contagem recomeça. Sem
    // essa parada, uma cena que já passou uma vez carregaria para sempre as
    // recusas de antes.
    const recusadas = imagens.filter((linha) => linha.status === "failed");
    const textoDaUltimaFalha = recusadas[0]?.prompt_user_pt ?? null;
    let recusasSeguidas = 0;

    if (textoDaUltimaFalha !== null) {
      for (const linha of imagens) {
        if (linha.status !== "failed" || linha.prompt_user_pt !== textoDaUltimaFalha) break;
        recusasSeguidas += 1;
      }
    }

    // A ficha de hoje ainda é a que gerou a imagem APROVADA? (D3)
    //
    // Só a aprovada é comparada: uma imagem que ninguém aprovou não prometeu
    // nada, e acender o selo sobre ela seria avisar de uma divergência que não
    // interessa a ninguém ainda.
    //
    // A diretiva de agora é composta pela MESMA função pura que o servidor usou
    // ao gerar — uma segunda maneira de compor o texto seria uma segunda chance
    // de as duas discordarem sem nada ter mudado.
    const daAprovada = ficha.imagem_aprovada_asset_id
      ? imagens.find((linha) => linha.result_asset_id === ficha.imagem_aprovada_asset_id)
      : undefined;

    const diretivaAgora = buildSceneDirective({
      ordem: ficha.ordem,
      acao: ficha.acao,
      cenario: ficha.cenario,
      movimento: ficha.movimento,
      enquadramento: ficha.enquadramento,
      personagem: ficha.personagem_handle,
      produto: ficha.produto,
    }).prompt;

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
      recusasSeguidas,
      video: estadoDoVideo(videos[0]?.status ?? null),
      // A cena que ela emenda é sempre a anterior na ordem — a mesma leitura
      // que o Ciclo 1 fez do elo. Nula na cena 1, que o banco já impede de ser
      // continuação (`storyboard_scenes_primeira_nao_continua`).
      emendaDe: continuacao ? (fichas[indice - 1]?.ordem ?? null) : null,
      desatualizada: estaDesatualizada({
        diretivaAgora,
        diretivaDaGeracao: lerDiretiva(daAprovada?.prompt_compiled),
      }),
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


// ---------------------------------------------------------------------------
// A APROVAÇÃO — a única escrita deste arquivo, e a única DECISÃO do ciclo
// ---------------------------------------------------------------------------

const aprovarSchema = z.object({
  projectId: z.uuid(),
  roteiroNodeId: z.string().min(1).max(200),
  /** As cenas a aprovar, pela ordem. "Aprovar as N" manda todas de uma vez. */
  ordens: z.array(z.number().int().min(1).max(10)).min(1).max(10),
});

export type AprovarResult = { ok: true; aprovadas: number } | { ok: false; reason: string };

/**
 * Aprovar é apontar — e **quem escolhe o asset é o servidor**.
 *
 * O navegador diz *"aprove a cena 3"*, e nunca *"aprove o asset X para a cena
 * 3"*. A diferença não é estilo: é a divisão de 10/08 — pode nomear, nunca pode
 * alargar. Deixar o cliente nomear o asset abriria a porta para apontar um
 * arquivo que não é daquela cena, e a chave composta recusaria com uma mensagem
 * de constraint que ninguém consegue mostrar a alguém.
 *
 * O asset aprovado é **a última geração de imagem bem-sucedida daquela cena**,
 * lida aqui. É a imagem que o trilho está mostrando, então aprovar faz o que a
 * tela promete: confirma o que se está vendo.
 *
 * Idempotente por natureza: aprovar de novo aponta para o mesmo asset. E não
 * cobra nada — aprovar não é gerar, e as duas coisas moram a centímetros uma da
 * outra na tela.
 */
export async function aprovarCenas(input: unknown): Promise<AprovarResult> {
  const parsed = aprovarSchema.safeParse(input);

  if (!parsed.success) return { ok: false, reason: "invalid" };

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) return { ok: false, reason: "unauthenticated" };

  const { data: board } = await supabase
    .from("storyboards")
    .select("id, storyboard_scenes (id, ordem, transicao)")
    .eq("project_id", parsed.data.projectId)
    .eq("node_id", parsed.data.roteiroNodeId)
    .maybeSingle();

  if (!board) return { ok: false, reason: "not_found" };

  const alvo = board.storyboard_scenes.filter((cena) =>
    parsed.data.ordens.includes(cena.ordem),
  );

  if (alvo.length === 0) return { ok: false, reason: "not_found" };

  // Uma consulta para todas as cenas, e não uma por cena — a lição da Fase 5 do
  // Egress: o que custa no canvas é a contagem de idas ao servidor.
  const { data: geracoes } = await supabase
    .from("generations")
    .select("scene_id, result_asset_id, created_at")
    .in(
      "scene_id",
      alvo.map((cena) => cena.id),
    )
    .eq("media_kind", "image")
    .eq("status", "succeeded")
    .not("result_asset_id", "is", null)
    .order("created_at", { ascending: false });

  let aprovadas = 0;

  for (const cena of alvo) {
    // Cena de continuação não tem imagem própria (D4) — e aprovar uma coisa que
    // não existe seria a tela mentindo. A aprovação dela é herdada da cena que
    // ela emenda, e isso acontece na leitura, não numa escrita.
    if (cena.transicao === "continuacao") continue;

    const melhor = (geracoes ?? []).find((linha) => linha.scene_id === cena.id);

    if (!melhor?.result_asset_id) continue;

    const { error } = await supabase
      .from("storyboard_scenes")
      .update({ imagem_aprovada_asset_id: melhor.result_asset_id })
      .eq("id", cena.id)
      .eq("user_id", userId);

    if (!error) aprovadas += 1;
  }

  return { ok: true, aprovadas };
}

/**
 * A diretiva gravada numa geração, se ela souber responder.
 *
 * `unknown` porque é `jsonb` vindo do banco, e uma coluna livre é uma fronteira:
 * o Zod é a regra da casa nelas. Aqui a leitura é estreita o bastante para valer
 * a checagem manual — e o que ela **não** faz é o ponto: campo ausente devolve
 * `null`, e `null` significa "esta geração não sabe responder", nunca "mudou".
 * Toda geração anterior a esta fase cai aqui, e nenhuma delas acende selo.
 */
function lerDiretiva(compiled: unknown): string | null {
  if (typeof compiled !== "object" || compiled === null) return null;

  const structure = (compiled as { structure?: unknown }).structure;

  if (typeof structure !== "object" || structure === null) return null;

  const storyboard = (structure as { storyboard?: unknown }).storyboard;

  if (typeof storyboard !== "object" || storyboard === null) return null;

  const diretiva = (storyboard as { diretiva_pt?: unknown }).diretiva_pt;

  return typeof diretiva === "string" ? diretiva : null;
}
