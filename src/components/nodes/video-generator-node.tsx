"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";

import { NodeHeader } from "@/components/nodes/node-header";
import { useVideoCatalog } from "@/components/nodes/use-video-catalog";
import { signAssetUrls } from "@/lib/assets/actions";
import { useCanvasStore } from "@/lib/canvas/store";
import { useGenerationTick } from "@/lib/generation/generation-feed";
import { listNodeVideos, type VideoJobRow } from "@/lib/generation/history";
import { findMentions } from "@/lib/generation/mentions";
import {
  reconcileVideo,
  requestVideoGeneration,
  type VideoGenerationFailure,
} from "@/lib/generation/video-contract";
import { t } from "@/lib/i18n/pt-BR";
import { useBalance } from "@/lib/sparks/balance-store";

const copy = t.videoNode;

/**
 * O bloco Gerar Vídeo — a estreia do assíncrono na tela.
 *
 * ---------------------------------------------------------------------------
 * O estado vivo deste bloco é o BANCO, e não um store no cliente
 * ---------------------------------------------------------------------------
 *
 * O bloco de imagem tem uma fila em `lib/generation/queue.ts`, e está certo: lá
 * a intenção de gerar quatro imagens **só existe no navegador** até cada
 * requisição sair. O banco não sabe o que foi pedido enquanto não é feito, então
 * alguém do lado de cá precisa lembrar.
 *
 * Aqui é o contrário, e a inversão é o ciclo inteiro: **a linha nasce antes de o
 * provedor ser chamado.** No primeiro milissegundo já existe um `queued` no
 * banco, com dono, projeto e node. Uma fila no cliente seria uma segunda cópia —
 * pior — de um estado que o banco guarda melhor: morreria na troca de aba, não
 * sobreviveria a um reload, e discordaria do banco no instante em que o webhook
 * chegasse com a aba fechada.
 *
 * Então este componente **não guarda trabalho nenhum**. Ele lê `listNodeVideos`,
 * e o Realtime lhe diz quando reler. É por isso que fechar a aba no meio de uma
 * geração e voltar depois mostra o vídeo pronto sem nada de especial acontecer:
 * não há o que recuperar, porque não havia o que perder.
 *
 * ---------------------------------------------------------------------------
 * A anatomia é a normativa da §3, com quatro ausências deliberadas
 * ---------------------------------------------------------------------------
 *
 * cabeçalho → configuração → imagem de partida → prompt → botão → custo e saldo
 * → resultado. **Sem quantidade, sem formato, sem qualidade e sem ajustes de
 * cena** — e nenhuma dessas é economia de trabalho:
 *
 *   quantidade   um clique, um vídeo. 210 ⚡ cada, e uma grade de dezesseis
 *                seria 3.360 ⚡ de intenção numa tela
 *   formato      em image-to-video a proporção vem da imagem de partida. Pedir
 *                uma seria mandar cortar o que o usuário já enquadrou
 *   qualidade    a resolução é propriedade do endpoint, não parâmetro da API
 *   ajustes      são vocabulário do compilador de personagem, e aqui a
 *                personagem entra pela imagem
 */

export type VideoGeneratorNodeData = {
  prompt?: string;
  modelId?: string | null;
  /** O still que será animado. Chega **por fio**, nunca por seletor interno. */
  sourceAssetId?: string | null;
  /** De qual card ele veio — para o bloco dizer a origem e o fio vivo achá-lo. */
  sourceNodeId?: string | null;
};

export type VideoGeneratorNodeType = Node<VideoGeneratorNodeData, "video-generator">;

/**
 * Quantos trabalhos vivos um bloco aceita ao mesmo tempo.
 *
 * Quatro, e não os dezesseis da grade de imagens: um vídeo custa 210 ⚡, então
 * dezesseis vivos seriam 3.360 ⚡ de intenção pendurada numa tela. O teto protege
 * o ritmo e a atenção de quem olha — o dinheiro quem protege é o banco.
 */
const MAX_LIVE_VIDEOS = 4;

/**
 * A partir de quando o botão de reconciliar aparece.
 *
 * Noventa segundos porque um clipe de 5s leva de 60 a 180: antes disso o botão
 * ofereceria ansiedade em vez de conserto, e uma tela que oferece conserto para
 * o que está funcionando ensina a desconfiar do que está normal.
 */
const RECONCILE_AFTER_SECONDS = 90;

function isLive(job: VideoJobRow): boolean {
  return job.status === "queued" || job.status === "running";
}

export function VideoGeneratorNode({ id, data, selected }: NodeProps<VideoGeneratorNodeType>) {
  const providers = useVideoCatalog();
  const projectId = useCanvasStore((state) => state.projectId);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const balance = useBalance((state) => state.sparks);
  const tick = useGenerationTick(id);

  const [jobs, setJobs] = useState<VideoJobRow[]>([]);
  /**
   * A URL assinada **junto do asset que ela assina**.
   *
   * Guardar só a string deixaria a imagem anterior na tela por um quadro depois
   * de o fio mudar de card — e num bloco cujo trabalho inteiro é "anime *esta*
   * imagem", mostrar a de antes é a pior meia-verdade possível. Chaveada, a URL
   * velha simplesmente não casa e nada é desenhado.
   */
  const [signedStill, setSignedStill] = useState<{ assetId: string; url: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  const prompt = data.prompt ?? "";
  const sourceAssetId = data.sourceAssetId ?? null;

  // -------------------------------------------------------------------------
  // O catálogo decide o modelo, a duração e o preço — nesta ordem
  // -------------------------------------------------------------------------
  const models = providers.filter((provider) => provider.status === "ready").flatMap((p) => p.models);
  const model = models.find((entry) => entry.id === data.modelId) ?? models.find((m) => m.isDefault) ?? models[0] ?? null;
  // A duração mais curta que o modelo vende. Uma só, na v1 — e é a **ausência**
  // de uma segunda linha no catálogo que trava os 5 segundos, não esta linha.
  const duration = model?.durations[0] ?? null;
  const price = duration?.sparks ?? 0;

  // -------------------------------------------------------------------------
  // Os trabalhos, lidos do banco — e relidos quando o Realtime avisa
  // -------------------------------------------------------------------------
  const reload = useCallback(() => {
    if (!projectId) return;

    void listNodeVideos({ projectId, nodeId: id }).then(setJobs);
  }, [projectId, id]);

  useEffect(() => {
    reload();
    // `tick` é a dependência que importa: ele sobe quando o banco avisa que
    // nasceu ou mudou uma geração deste node — que é exatamente quando a
    // resposta desta consulta pode ter mudado, e nunca antes.
  }, [reload, tick]);

  // -------------------------------------------------------------------------
  // O still conectado
  // -------------------------------------------------------------------------
  const stillUrl = signedStill?.assetId === sourceAssetId ? signedStill.url : null;

  useEffect(() => {
    if (!sourceAssetId) return;

    let cancelled = false;

    void signAssetUrls([sourceAssetId]).then((urls) => {
      const url = urls[sourceAssetId];

      if (!cancelled && url) setSignedStill({ assetId: sourceAssetId, url });
    });

    return () => {
      cancelled = true;
    };
  }, [sourceAssetId]);

  // -------------------------------------------------------------------------
  // O que o botão sabe antes do clique
  // -------------------------------------------------------------------------
  const live = jobs.filter(isLive);
  const hasMention = findMentions(prompt).length > 0;
  const queueFull = live.length >= MAX_LIVE_VIDEOS;
  // `null` é "a página ainda não semeou a carteira", não "zero". Bloquear nesse
  // instante seria recusar por um número que ainda não foi lido — e o servidor
  // confere o saldo de novo de qualquer jeito, na submissão.
  const noBalance = price > 0 && balance !== null && balance < price;

  const blocked =
    !model || !duration
      ? "no_model"
      : !sourceAssetId
        ? "no_still"
        : hasMention
          ? "mention"
          : queueFull
            ? "queue_full"
            : noBalance
              ? "balance"
              : null;

  async function generate() {
    if (!projectId || !model || !duration || !sourceAssetId || blocked || submitting) return;

    setSubmitting(true);
    setMessage(null);

    const result = await requestVideoGeneration({
      projectId,
      nodeId: id,
      prompt: prompt.trim(),
      modelId: model.id,
      sourceAssetId,
      durationSeconds: duration.seconds,
    });

    setSubmitting(false);

    if (!result.ok) {
      setMessage(copy.errors[result.reason as VideoGenerationFailure] ?? copy.errors.error);
      return;
    }

    // Nada foi cobrado ainda — o saldo só muda quando o vídeo existe, e quem
    // conta isso é o Realtime relendo a carteira. Reler a lista agora é o que
    // faz a caixinha "Na fila" aparecer no mesmo instante do clique.
    reload();
  }

  async function check(generationId: string) {
    setChecking(generationId);
    setMessage(null);

    const result = await reconcileVideo(generationId);

    setChecking(null);

    if (result.ok && result.status === "pending") setMessage(copy.stillPending);

    reload();
  }

  // A moldura mostra o vídeo pronto mais recente; os vivos falam pelas caixinhas.
  const featured = jobs.find((job) => job.status === "succeeded" && job.url);

  return (
    <div
      className={`group/node w-[42rem] rounded-xl border bg-surface-raised shadow-lg
                  shadow-black/30 transition-colors
                  ${selected ? "border-accent" : "border-line"}`}
    >
      <NodeHeader nodeId={id} kind="video-generator" title={copy.title} removeHint={copy.remove} />

      <div className="flex divide-x divide-line">
        {/* --------------------------------------------------------------
            A pergunta
           -------------------------------------------------------------- */}
        <div className="min-w-0 flex-1 space-y-3 p-3">
          <section className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
              {copy.configTitle}
            </p>

            <label className="block">
              <span className="mb-1 block text-[11px] text-ink-muted">{copy.modelLabel}</span>
              <select
                value={model?.id ?? ""}
                onChange={(event) => updateNodeData(id, { modelId: event.target.value })}
                className="nodrag w-full rounded-lg border border-line bg-surface px-1.5 py-1.5
                           text-xs text-ink focus:border-accent focus:outline-none"
              >
                {models.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.displayName} · {entry.durations[0]?.sparks ?? entry.sparks} ⚡
                  </option>
                ))}
              </select>
            </label>

            <div>
              <span className="mb-1 block text-[11px] text-ink-muted">{copy.durationLabel}</span>
              {/*
                Um valor, não um seletor — e não porque a tela decidiu: porque o
                catálogo vende uma duração só. No dia em que vender duas, isto
                vira um seletor sem migration de tela.
              */}
              <p
                title={copy.durationFixedHint}
                className="rounded-lg border border-line bg-surface px-1.5 py-1.5 text-xs text-ink"
              >
                {duration ? `${duration.seconds}s · ${duration.resolution}` : "—"}
              </p>
            </div>
          </section>

          {/* ----------------------------------------------------------
              A imagem de partida — espelho do fio, nunca porta de entrada
             ---------------------------------------------------------- */}
          <section className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
              {copy.stillTitle}
            </p>

            {sourceAssetId ? (
              <div className="flex items-center gap-2 rounded-lg border border-line bg-surface p-1.5">
                <span className="size-12 shrink-0 overflow-hidden rounded bg-canvas">
                  {stillUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={stillUrl} alt={copy.stillAlt} className="size-full object-cover" />
                  ) : null}
                </span>
                <p className="min-w-0 flex-1 truncate text-[11px] text-ink-muted">
                  {copy.stillFromPrefix} {data.sourceNodeId ? "card conectado" : "—"}
                </p>
              </div>
            ) : (
              <p
                title={copy.stillEmptyHint}
                className="rounded-lg border border-dashed border-line px-2 py-3 text-center
                           text-[11px] text-ink-faint"
              >
                {copy.stillEmpty}
              </p>
            )}
          </section>

          {/* ---------------------------------------------------------- */}
          <label className="block">
            <span className="mb-1 block text-[11px] text-ink-muted">{copy.promptLabel}</span>
            <textarea
              value={prompt}
              onChange={(event) => updateNodeData(id, { prompt: event.target.value })}
              placeholder={copy.promptPlaceholder}
              rows={3}
              maxLength={2000}
              className="nodrag w-full resize-none rounded-lg border border-line bg-surface px-2 py-1.5
                         text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
          </label>

          {/* A recusa da menção é dita aqui, antes do clique — e o botão trava
              junto. Descobrir depois seria descobrir com o vídeo já pago. */}
          {hasMention ? (
            <p className="rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5 text-[11px] text-ink">
              {copy.mentionRefused}
            </p>
          ) : null}

          <button
            type="button"
            onClick={generate}
            disabled={blocked !== null || submitting}
            className="nodrag h-9 w-full rounded-lg bg-accent text-xs font-medium text-canvas
                       transition-opacity hover:opacity-90 disabled:cursor-not-allowed
                       disabled:bg-surface disabled:text-ink-faint"
          >
            {copy.generate}
          </button>

          {/* Custo e saldo sob o botão, no futuro do indicativo — a anatomia da
              §3: um número no canto é rótulo, embaixo do botão é preço. */}
          <p className="text-center text-[11px] text-ink-muted">
            {copy.costWillPrefix} {price} ⚡ · {copy.balanceLabel}: {balance} ⚡
          </p>

          {blocked === "no_still" ? (
            <p className="text-center text-[11px] text-ink-faint">{copy.errors.no_source_image}</p>
          ) : null}
          {blocked === "queue_full" ? (
            <p className="text-center text-[11px] text-ink-faint">
              {MAX_LIVE_VIDEOS} vídeos já estão na fila deste bloco.
            </p>
          ) : null}
          {blocked === "balance" ? (
            <p className="text-center text-[11px] text-ink-faint">
              {copy.errors.insufficient_balance}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[11px] text-ink">
              {message}
            </p>
          ) : null}
        </div>

        {/* --------------------------------------------------------------
            A resposta
           -------------------------------------------------------------- */}
        <div className="w-[19rem] shrink-0 space-y-2 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            {copy.resultTitle}
          </p>

          {/* Moldura de tamanho fixo, como a de imagem e pelo mesmo motivo: uma
              moldura que muda de forma faz os controles da esquerda pularem sob
              o ponteiro por um motivo que não tem nada a ver com eles. */}
          <div className="flex aspect-square w-full items-center justify-center overflow-hidden
                          rounded-lg border border-line bg-canvas">
            {featured?.url ? (
              // `controls` e nada mais: sem autoplay, porque um canvas com três
              // blocos tocaria três vídeos de uma vez. `preload="metadata"` faz
              // o navegador desenhar o primeiro quadro sem baixar o arquivo.
              <video
                src={featured.url}
                controls
                preload="metadata"
                className="nodrag size-full object-contain"
              />
            ) : (
              <p className="px-3 text-center text-[11px] text-ink-faint">{copy.emptyResult}</p>
            )}
          </div>

          {/* As caixinhas: o visual do que está acontecendo, uma por trabalho. */}
          <ul className="space-y-1">
            {jobs.slice(0, MAX_LIVE_VIDEOS + 4).map((job) => (
              <li
                key={job.generationId}
                className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1"
              >
                <StatusDot status={job.status} />

                <span className="min-w-0 flex-1 truncate text-[11px] text-ink-muted">
                  {job.status === "succeeded"
                    ? `${job.durationSeconds ?? 5}s · ${job.sparksCharged} ⚡`
                    : job.status === "failed" || job.status === "canceled"
                      ? (job.errorMessage ?? copy.statusFailed)
                      : job.status === "queued"
                        ? copy.statusQueued
                        : copy.statusRunning}
                </span>

                {/* O botão que impede um node de ficar Gerando para sempre. Só
                    aparece quando a espera já saiu do normal — antes disso ele
                    ofereceria conserto para o que está funcionando. */}
                {isLive(job) && job.ageSeconds > RECONCILE_AFTER_SECONDS ? (
                  <button
                    type="button"
                    onClick={() => check(job.generationId)}
                    disabled={checking === job.generationId}
                    title={copy.checkNowHint}
                    className="nodrag shrink-0 rounded border border-line px-1.5 py-0.5
                               text-[10px] text-ink-muted hover:border-accent hover:text-ink
                               disabled:opacity-50"
                  >
                    {checking === job.generationId ? copy.checking : copy.checkNow}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          {live.length > 0 ? (
            <p className="text-[10px] text-ink-faint">{copy.generatingHint}</p>
          ) : null}
        </div>
      </div>

      {/* Só entrada. Nada consome vídeo ainda, e um conector que não liga a
          lugar nenhum é uma promessa que o canvas não pode cumprir. */}
      <Handle
        type="target"
        position={Position.Left}
        title={copy.stillEmptyHint}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />
    </div>
  );
}

/** Os quatro estados, em uma bolinha — a mesma gramática da aba do projeto. */
function StatusDot({ status }: { status: VideoJobRow["status"] }) {
  const tone =
    status === "succeeded"
      ? "bg-positive"
      : status === "failed" || status === "canceled"
        ? "bg-negative"
        : status === "running"
          ? "bg-warning animate-pulse"
          : "bg-ink-faint";

  return <span className={`size-1.5 shrink-0 rounded-full ${tone}`} aria-hidden />;
}
