"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";

import { NodeHeader } from "@/components/nodes/node-header";
import { BOARD_HANDLE, findGoverningBoard, sceneHandleId, useCanvasStore } from "@/lib/canvas/store";
import { useGenerationTick } from "@/lib/generation/generation-feed";
import { t } from "@/lib/i18n/pt-BR";
import { loadMachineBoard } from "@/lib/storyboard/machine-actions";
import type { MachineBoard, MachineScene } from "@/lib/storyboard/machine-state";

const copy = t.machineNode;

/**
 * A Máquina de Storyboard — FRENTE STORYBOARD · CICLO 3 · Fase 1.
 *
 * ---------------------------------------------------------------------------
 * Ela é MAESTRO, e nesta fase ela ainda não rege nada
 * ---------------------------------------------------------------------------
 *
 * A Fase 1 entrega a fundação: o node, as entradas, o trilho espelho e uma saída
 * por cena. **Nenhum botão que gaste existe aqui** — os dois portões (imagem e
 * vídeo) chegam nas Fases 2 e 3, e um botão que aparece antes da função é uma
 * promessa que a tela não pode cumprir (regra da casa, 17/08/2026). Em vez de
 * desenhar um botão morto, a Máquina **diz** o que ainda não faz.
 *
 * Pelo mesmo motivo não há aqui seletor de modelo nem de qualidade: eles existem
 * para **precificar um lote**, e o lote é da Fase 2. Um seletor que configura
 * coisa nenhuma é a mesma promessa vazia com outra roupa.
 *
 * ---------------------------------------------------------------------------
 * A Máquina não guarda id nenhum — a aresta é o vínculo
 * ---------------------------------------------------------------------------
 *
 * Qual roteiro ela rege sai de `findGoverningBoard(edges, id)`: o fio que chega
 * na entrada «Roteiro» diz de qual node de Roteiro ler, e daí o servidor acha o
 * storyboard por `(project_id, node_id)`. Nada no `data`, nenhuma coluna nova, e
 * o vínculo sobrevive a um reload porque o grafo salvo já persiste
 * `sourceHandle` e `targetHandle`.
 *
 * O trilho, idem: **este componente não guarda ficha nenhuma**. Lê o banco na
 * montagem e relê quando o Realtime avisa que nasceu ou mudou geração — o mesmo
 * desenho do bloco de vídeo, e pela mesma razão: não existe segunda cópia para
 * discordar do banco no instante em que isso mais custaria.
 */

export type MachineData = {
  /** Nasce desligada — invariante 12, sem exceção para a Máquina. */
  referencesEnabled?: boolean;
};

export type MachineNodeType = Node<MachineData, "machine">;

export function MachineNode({ id, data, selected }: NodeProps<MachineNodeType>) {
  const projectId = useCanvasStore((state) => state.projectId);
  const edges = useCanvasStore((state) => state.edges);
  const notice = useCanvasStore((state) => state.notice);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  /**
   * O que foi lido, **e de qual roteiro** — os dois num estado só.
   *
   * Guardar o board sozinho deixaria o trilho do roteiro anterior na tela
   * durante o quadro em que alguém trocasse o fio: o `useEffect` só corre depois
   * do render, e nesse render `board` ainda seria o de antes. Com o `forNode`
   * junto, "isto é de outro roteiro" é uma comparação e não uma corrida — e o
   * `loading` deixa de ser estado para virar conta, que é o que tira o
   * `setState` síncrono de dentro do efeito.
   */
  const [lido, setLido] = useState<{ forNode: string; board: MachineBoard | null } | null>(null);

  const roteiroNodeId = findGoverningBoard(edges, id);
  const atual = lido?.forNode === roteiroNodeId ? lido : null;
  const board = atual?.board ?? null;
  const loading = roteiroNodeId !== null && atual === null;

  // O tick é do node de ROTEIRO e não da Máquina: as gerações de um lote nascem
  // com o `node_id` da Máquina, mas as fichas mudam pelo Roteiro — e é a
  // releitura que importa nos dois casos.
  const tickRoteiro = useGenerationTick(roteiroNodeId ?? "");
  const tickMaquina = useGenerationTick(id);

  const referencesEnabled = data.referencesEnabled === true;

  useEffect(() => {
    if (!projectId || !roteiroNodeId) return;

    let cancelado = false;

    void loadMachineBoard({ projectId, roteiroNodeId }).then((loaded) => {
      // Uma resposta que chega depois de o fio ter mudado é uma resposta sobre
      // outro roteiro. O `cancelado` a descarta antes de ela virar tela.
      if (!cancelado) setLido({ forNode: roteiroNodeId, board: loaded });
    });

    return () => {
      cancelado = true;
    };
    // `tick*` sobe quando nasce ou muda geração — que é exatamente quando a
    // resposta desta consulta pode ter mudado, e nunca antes.
  }, [projectId, roteiroNodeId, tickRoteiro, tickMaquina]);

  const recusa =
    notice?.nodeId === id && notice.reason === "board_taken"
      ? notice.lado === "roteiro"
        ? copy.roteiroJaRegido
        : copy.maquinaJaOcupada
      : null;

  const cenas = board?.cenas ?? [];

  return (
    <div
      /*
        HORIZONTAL, e a forma é a decisão (requisito 6 e o esboço do Jorge).
        As entradas em cima, o trilho no corpo, uma saída por cena embaixo — a
        silhueta deitada é o que a distingue de tudo o mais no canvas antes de
        qualquer texto ser legível.
      */
      className={`group/node w-[54rem] rounded-xl border bg-surface-raised shadow-lg
                  shadow-black/30 transition-colors
                  ${selected ? "border-accent" : "border-line"}`}
    >
      {/* ================================================================
          AS ENTRADAS, no topo
         ================================================================ */}
      <Handle
        type="target"
        id={BOARD_HANDLE}
        position={Position.Top}
        title={copy.entradaRoteiroHint}
        style={{ left: "18%" }}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />
      <Handle
        type="target"
        id="referencias"
        position={Position.Top}
        title={copy.entradaReferenciasHint}
        style={{ left: "50%" }}
        className="!size-2.5 !border-2 !border-canvas !bg-line-strong"
      />

      <NodeHeader nodeId={id} kind="machine" title={copy.title} removeHint={copy.remove} />

      <div className="space-y-3 p-3">
        {/* ── O roteiro regido, ou a falta dele ────────────────────────── */}
        {roteiroNodeId === null ? (
          <EmptyState titulo={copy.semRoteiro} hint={copy.semRoteiroHint} />
        ) : loading ? (
          <p className="py-6 text-center text-[11px] text-ink-faint">{copy.carregando}</p>
        ) : board === null || cenas.length === 0 ? (
          <EmptyState titulo={copy.semFichas} hint={copy.semFichasHint} />
        ) : (
          <>
            <div className="flex items-baseline gap-2 text-xs">
              <span className="truncate font-medium text-ink">«{board.titulo}»</span>
              <span className="shrink-0 text-[11px] text-ink-faint">
                {cenas.length} {cenas.length === 1 ? "cena" : "cenas"}
                {" · "}
                {t.storyboardNode.canais[board.canal] ?? board.canal}
                {board.personagemHandle ? ` · @${board.personagemHandle}` : ""}
              </span>
            </div>

            {/* ── A chave de inputs, nascendo desligada ────────────────── */}
            <label className="flex items-center gap-2 text-[11px]" title={copy.entradaReferenciasHint}>
              <input
                type="checkbox"
                checked={referencesEnabled}
                onChange={(event) =>
                  updateNodeData(id, { referencesEnabled: event.target.checked })
                }
                className="nodrag size-3.5 accent-[var(--accent)]"
              />
              <span className="font-medium text-ink-muted">{copy.inputsSwitch}</span>
              <span className="text-ink-faint">
                {referencesEnabled ? copy.inputsOn : copy.inputsOff}
              </span>
            </label>

            {/* ── O TRILHO ─────────────────────────────────────────────── */}
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                {copy.trilhoTitle}
              </p>
              {/*
                Rola na horizontal quando passa de seis cenas, e o node NÃO cresce:
                um card que muda de largura conforme o roteiro reembaralharia o
                canvas a cada geração.
              */}
              <div className="nodrag flex gap-2 overflow-x-auto pb-1">
                {cenas.map((cena) => (
                  <ColunaDaCena key={cena.id} cena={cena} />
                ))}
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-ink-faint">{copy.aindaNaoGera}</p>
          </>
        )}

        {recusa ? (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5 text-[11px] leading-relaxed text-ink-muted">
            {recusa}
          </p>
        ) : null}
      </div>

      {/* ================================================================
          AS SAÍDAS — uma por cena, embaixo
          Plugável em qualquer node existente: é o "cada ponto se conecta a um
          bloco" do esboço. O handle existe mesmo antes de haver imagem, porque
          ele é a topologia do node e não o estado dela.
         ================================================================ */}
      {cenas.map((cena, indice) => (
        <Handle
          key={cena.id}
          type="source"
          id={sceneHandleId(cena.ordem)}
          position={Position.Bottom}
          title={copy.cenaLabel(cena.ordem)}
          style={{ left: `${((indice + 0.5) / Math.max(cenas.length, 1)) * 100}%` }}
          className="!size-2 !border-2 !border-canvas !bg-accent"
        />
      ))}
    </div>
  );
}

function EmptyState({ titulo, hint }: { titulo: string; hint: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong px-3 py-5 text-center">
      <p className="text-xs font-medium text-ink-muted">{titulo}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{hint}</p>
    </div>
  );
}

/**
 * Uma coluna do trilho — e as duas formas dela são a D4 na tela.
 *
 * Cena de **corte** mostra miniatura, porque ela tem imagem própria. Cena de
 * **continuação** não tem, e em vez de uma moldura vazia (que prometeria uma
 * imagem que ninguém vai gerar) ela diz de qual cena emenda. Depois do vídeo, o
 * lugar da miniatura passa a mostrar o quadro do elo — que é o primeiro quadro
 * de verdade dela.
 */
function ColunaDaCena({ cena }: { cena: MachineScene }) {
  const continuacao = cena.transicao === "continuacao";

  return (
    <div className="w-[7.5rem] shrink-0 rounded-lg border border-line bg-surface p-1.5">
      <div className="mb-1 flex items-center justify-between text-[10px] text-ink-faint">
        <span className="font-medium text-ink-muted">{cena.ordem}</span>
        <span
          title={continuacao ? copy.transicaoContinuacao : copy.transicaoCorte}
          className="cursor-help"
        >
          {continuacao ? "⇥" : "✂"}
        </span>
      </div>

      <div className="flex aspect-square items-center justify-center overflow-hidden rounded border border-line bg-canvas">
        {cena.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cena.thumbUrl} alt="" className="size-full object-cover" />
        ) : continuacao && cena.emendaDe !== null ? (
          <span className="px-1 text-center text-[9px] leading-tight text-ink-faint">
            {copy.emendaDe(cena.emendaDe)}
          </span>
        ) : (
          <span className="px-1 text-center text-[9px] leading-tight text-ink-faint">
            {copy.semImagem}
          </span>
        )}
      </div>

      <p className="mt-1 truncate text-[10px] text-ink-muted" title={cena.acao}>
        {cena.acao}
      </p>

      <div className="mt-0.5 flex items-center justify-between text-[9px]">
        <span
          className={
            cena.estado === "aprovada"
              ? "text-positive"
              : cena.estado === "falhou"
                ? "text-warning"
                : "text-ink-faint"
          }
        >
          {copy.estados[cena.estado] ?? cena.estado}
        </span>
        <span className="text-ink-faint">{cena.duracaoSegundos}s</span>
      </div>

      {cena.video !== "nenhum" ? (
        <p className="mt-0.5 text-[9px] text-ink-faint">
          {cena.video === "pronto"
            ? copy.videoPronto
            : cena.video === "gerando"
              ? copy.videoGerando
              : copy.videoFalhou}
        </p>
      ) : null}
    </div>
  );
}
