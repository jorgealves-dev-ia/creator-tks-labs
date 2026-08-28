"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";

import { NodeHeader } from "@/components/nodes/node-header";
import { useImageCatalog } from "@/components/nodes/use-image-catalog";
import { defaultModelId, findModel, ModelSelect } from "@/components/ui/model-select";
import { BOARD_HANDLE, findGoverningBoard, sceneHandleId, useCanvasStore } from "@/lib/canvas/store";
import { useGenerationTick } from "@/lib/generation/generation-feed";
import { DEFAULT_IMAGE_SIZE } from "@/lib/generation/presets";
import { freeSlots, liveCount, useQueue } from "@/lib/generation/queue";
import { t } from "@/lib/i18n/pt-BR";
import { useBalance } from "@/lib/sparks/balance-store";
import { aprovarCenas, loadMachineBoard } from "@/lib/storyboard/machine-actions";
import {
  classificarFalha,
  gestoDaFalha,
  loteDeImagens,
  presetDoCanal,
  vereditoDoPortao,
  type MachineBoard,
  type MachineScene,
} from "@/lib/storyboard/machine-state";

const copy = t.machineNode;

/**
 * A Máquina de Storyboard — FRENTE STORYBOARD · CICLO 3.
 *
 * ---------------------------------------------------------------------------
 * Ela é MAESTRO, e o que ela rege já existia
 * ---------------------------------------------------------------------------
 *
 * Cada cena é uma geração **normal**: mesmo Route Handler, mesmo preço de
 * catálogo, mesma linha de extrato. O lote é uma **sequência de gerações
 * individuais**, nunca uma transação — é o que faz uma recusa de política ser
 * *uma cena para repetir* e não *um lote perdido*, e a recusa não-determinística
 * medida em 26/08 garante que isso vai acontecer.
 *
 * ---------------------------------------------------------------------------
 * Ela não guarda id nenhum, e não guarda ficha nenhuma
 * ---------------------------------------------------------------------------
 *
 * Qual roteiro ela rege sai da **aresta** (`findGoverningBoard`); o trilho sai do
 * **banco**, relido quando o Realtime avisa. Não existe segunda cópia para
 * discordar no instante em que isso mais custaria.
 *
 * ---------------------------------------------------------------------------
 * O portão, e o que ele promete
 * ---------------------------------------------------------------------------
 *
 * O total é **multiplicação do preço do catálogo**, na qualidade e no modelo
 * escolhidos — nunca uma constante. Ele conta **só o que vai gerar**: cenas de
 * corte sem imagem. Continuação não entra (D4), e o que já tem imagem não volta.
 *
 * E modelo e qualidade **nascem com o default do catálogo**, como o bloco Gerar
 * Imagem: é o que mantém o portão em **um** gesto. Um seletor vazio custaria dois
 * gestos a mais, e a Fase 4 não os recupera — ela remove montagem, e escolher
 * modelo não é montagem.
 */

export type MachineData = {
  /** Nasce desligada — invariante 12, sem exceção para a Máquina. */
  referencesEnabled?: boolean;
  modelId?: string;
  imageSize?: string;
};

export type MachineNodeType = Node<MachineData, "machine">;

export function MachineNode({ id, data, selected }: NodeProps<MachineNodeType>) {
  const projectId = useCanvasStore((state) => state.projectId);
  const edges = useCanvasStore((state) => state.edges);
  const notice = useCanvasStore((state) => state.notice);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const providers = useImageCatalog();
  const balance = useBalance((state) => state.sparks);
  const slots = useQueue((state) => state.byNode[id]);

  /**
   * O que foi lido, **e de qual roteiro** — os dois num estado só.
   *
   * Guardar o board sozinho deixaria o trilho do roteiro anterior na tela
   * durante o quadro em que alguém trocasse o fio. Com o `forNode` junto, "isto
   * é de outro roteiro" é uma comparação e não uma corrida — e o `loading` deixa
   * de ser estado para virar conta, que é o que tira o `setState` síncrono de
   * dentro do efeito.
   */
  const [lido, setLido] = useState<{ forNode: string; board: MachineBoard | null } | null>(null);
  /** Sobe quando um slot cai, para reler sem esperar a volta do Realtime. */
  const [recarga, setRecarga] = useState(0);
  /** Qual cena está com a caixa de instrução aberta, se alguma. */
  const [repetindo, setRepetindo] = useState<string | null>(null);
  const [instrucao, setInstrucao] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  const roteiroNodeId = findGoverningBoard(edges, id);
  const atual = lido?.forNode === roteiroNodeId ? lido : null;
  const board = atual?.board ?? null;
  const loading = roteiroNodeId !== null && atual === null;

  const tickRoteiro = useGenerationTick(roteiroNodeId ?? "");
  const tickMaquina = useGenerationTick(id);

  const referencesEnabled = data.referencesEnabled === true;

  // Resolvidos, nunca gravados na montagem: escrever um default no `data` ao
  // montar marcaria o canvas como sujo só por alguém ter aberto o projeto.
  const modelId = data.modelId ?? defaultModelId(providers);
  const model = findModel(providers, modelId);
  const imageSize = data.imageSize ?? DEFAULT_IMAGE_SIZE;
  const precoPorImagem = model?.sizes.find((entry) => entry.size === imageSize)?.sparks ?? null;

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
  }, [projectId, roteiroNodeId, tickRoteiro, tickMaquina, recarga]);

  const recusaDeFio =
    notice?.nodeId === id && notice.reason === "board_taken"
      ? notice.lado === "roteiro"
        ? copy.roteiroJaRegido
        : copy.maquinaJaOcupada
      : null;

  const cenas = board?.cenas ?? [];
  const lote = loteDeImagens(cenas);
  const veredito = vereditoDoPortao({ cenas, precoPorImagem, saldo: balance });
  const vivos = liveCount(slots);
  const aprovaveis = cenas.filter((cena) => cena.estado === "pronta");

  function pedirCena(cena: MachineScene, instrucaoPt: string | null) {
    // `modelId` nulo é "o catálogo ainda não respondeu", e não "sem modelo".
    // Pedir agora seria pedir sem saber o preço — e o portão acabou de anunciar
    // um número.
    if (!projectId || !board || !modelId) return;

    useQueue.getState().enqueue({
      nodeId: id,
      quantity: 1,
      tag: cena.id,
      onSettled: () => setRecarga((n) => n + 1),
      request: {
        projectId,
        nodeId: id,
        // O texto é o da ficha mais, quando houver, a instrução daquela
        // tentativa. O servidor recompõe a diretiva sozinho para o registro —
        // aqui é só o que o modelo lê.
        prompt: [promptDaCena(cena), instrucaoPt].filter(Boolean).join(" "),
        modelId,
        presetId: presetDoCanal(board.canal),
        imageSize,
        estiloKey: null,
        anguloKey: cena.enquadramento,
        iluminacaoKey: null,
        expressaoKey: null,
        references: [],
        referencesEnabled,
        scene: { id: cena.id, instrucaoPt },
      },
    });
  }

  function gerarLote() {
    setAviso(null);

    if (!veredito.pode) return;

    // Tudo ou nada: a capacidade é conferida ANTES de qualquer pedido sair.
    // Enfileirar metade seria a tela decidindo por quem clicou — e o portão
    // acabou de prometer um número.
    if (freeSlots(slots) < veredito.quantas) {
      setAviso(copy.portaoLoteCheio);
      return;
    }

    for (const cena of lote) pedirCena(cena, null);
  }

  function confirmarRepeticao(cena: MachineScene) {
    const texto = instrucao.trim();

    setRepetindo(null);
    setInstrucao("");
    setAviso(null);

    if (freeSlots(slots) < 1) {
      setAviso(copy.portaoLoteCheio);
      return;
    }

    pedirCena(cena, texto === "" ? null : texto);
  }

  function aprovar(ordens: number[]) {
    if (!projectId || !roteiroNodeId || ordens.length === 0) return;

    void aprovarCenas({ projectId, roteiroNodeId, ordens }).then(() => setRecarga((n) => n + 1));
  }

  const prontas = (slots ?? []).filter((slot) => slot.status === "ready").length;

  return (
    <div
      /*
        HORIZONTAL, e a forma é a decisão (requisito 6 e o esboço do Jorge).
        As entradas em cima, o trilho no corpo, uma saída por cena embaixo.
      */
      className={`group/node w-[54rem] rounded-xl border bg-surface-raised shadow-lg
                  shadow-black/30 transition-colors
                  ${selected ? "border-accent" : "border-line"}`}
    >
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

            {/* ── CONFIGURAÇÃO ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[12rem] flex-1">
                <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                  {copy.modelLabel}
                </span>
                <ModelSelect
                  id={`${id}-modelo`}
                  providers={providers}
                  value={modelId}
                  imageSize={imageSize}
                  onChange={(next) => updateNodeData(id, { modelId: next })}
                />
              </label>

              <label className="w-36">
                <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                  {copy.qualidadeLabel}
                </span>
                <select
                  value={imageSize}
                  onChange={(event) => updateNodeData(id, { imageSize: event.target.value })}
                  className="nodrag h-8 w-full rounded-lg border border-line bg-surface px-2
                             text-[11px] text-ink"
                >
                  {(model?.sizes ?? []).map((size) => (
                    <option key={size.size} value={size.size}>
                      {size.size} · {size.sparks} ⚡
                    </option>
                  ))}
                </select>
              </label>

              <p className="pb-1.5 text-[11px] text-ink-faint" title={copy.formatoHint}>
                {copy.formatoDoCanal(t.storyboardNode.canais[board.canal] ?? board.canal)}
              </p>
            </div>

            <label
              className="flex items-center gap-2 text-[11px]"
              title={copy.entradaReferenciasHint}
            >
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

            {/* ── O TRILHO ──────────────────────────────────────────────── */}
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                {copy.trilhoTitle}
              </p>
              <div className="nodrag flex gap-2 overflow-x-auto pb-1">
                {cenas.map((cena) => (
                  <ColunaDaCena
                    key={cena.id}
                    cena={cena}
                    gerando={(slots ?? []).some(
                      (slot) =>
                        slot.tag === cena.id &&
                        (slot.status === "queued" || slot.status === "running"),
                    )}
                    repetindo={repetindo === cena.id}
                    instrucao={instrucao}
                    onInstrucao={setInstrucao}
                    onAbrirRepetir={() => {
                      setRepetindo(cena.id);
                      setInstrucao("");
                    }}
                    onCancelarRepetir={() => setRepetindo(null)}
                    onConfirmarRepetir={() => confirmarRepeticao(cena)}
                    onAprovar={() => aprovar([cena.ordem])}
                  />
                ))}
              </div>
            </div>

            {/* ── OS PORTÕES: botão, e o custo colado embaixo dele ───────── */}
            <div className="flex flex-wrap items-start gap-3 border-t border-line pt-3">
              <div className="min-w-[16rem] flex-1">
                <button
                  type="button"
                  onClick={gerarLote}
                  disabled={!veredito.pode || vivos > 0}
                  className="nodrag h-9 w-full rounded-lg bg-accent text-xs font-medium text-canvas
                             transition-opacity hover:opacity-90 disabled:cursor-not-allowed
                             disabled:opacity-40"
                >
                  {vivos > 0
                    ? copy.portaoGerando(prontas, (slots ?? []).length)
                    : copy.portaoGerar(veredito.pode ? veredito.quantas : lote.length)}
                </button>

                {/* O custo fala a verdade multiplicada ANTES do clique. */}
                <p className="mt-1 text-[11px] text-ink-faint">
                  {veredito.pode && precoPorImagem !== null && balance !== null
                    ? copy.portaoCusto(veredito.quantas, precoPorImagem, veredito.total, balance)
                    : !veredito.pode && veredito.motivo === "sem_saldo"
                      ? `${copy.portaoSemSaldo(veredito.faltam)} ${copy.portaoSemSaldoHint}`
                      : !veredito.pode && veredito.motivo === "sem_preco"
                        ? copy.portaoSemPreco
                        : !veredito.pode && veredito.motivo === "sem_cenas"
                          ? cenas.some((cena) => cena.transicao === "corte")
                            ? copy.portaoSemCenas
                            : copy.portaoSemCenasVazio
                          : ""}
                </p>

                <p className="mt-0.5 text-[10px] text-ink-faint">{copy.contaSoCortes}</p>
              </div>

              <div className="min-w-[12rem]">
                <button
                  type="button"
                  onClick={() => aprovar(aprovaveis.map((cena) => cena.ordem))}
                  disabled={aprovaveis.length === 0}
                  className="nodrag h-9 w-full rounded-lg border border-line text-xs font-medium
                             text-ink transition-colors hover:border-line-strong
                             disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copy.aprovarTodas(aprovaveis.length)}
                </button>
                <p className="mt-1 text-[11px] text-ink-faint">{copy.aprovarSemCusto}</p>
              </div>
            </div>

            {aviso ? (
              <p className="rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5 text-[11px] leading-relaxed text-ink-muted">
                {aviso}
              </p>
            ) : null}

            <p className="text-[11px] leading-relaxed text-ink-faint">{copy.aindaNaoAnima}</p>
          </>
        )}

        {recusaDeFio ? (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5 text-[11px] leading-relaxed text-ink-muted">
            {recusaDeFio}
          </p>
        ) : null}
      </div>

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

/**
 * O texto que a ficha manda para o campo.
 *
 * Composto aqui igual ao da ponte do Ciclo 2 — a mesma ordem, pelo mesmo motivo
 * da invariante 13: a menção precisa ser **sujeito da frase**, senão o tradutor
 * inventa sujeito e gênero. O servidor recompõe esta mesma diretiva por conta
 * própria para o registro, com `buildSceneDirective`, e **é a dele que vale**.
 */
function promptDaCena(cena: MachineScene): string {
  const partes = [cena.acao, cena.cenario, cena.movimento]
    .map((parte) => parte.trim())
    .filter((parte) => parte !== "")
    .map((parte) => (/[.!?…]$/.test(parte) ? parte : `${parte}.`));

  const sujeito = cena.personagemHandle ? `@${cena.personagemHandle}` : null;
  const corpo = partes.join(" ");

  if (sujeito === null) return corpo;

  return corpo === "" ? sujeito : `${sujeito} ${corpo}`;
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
 * Cena de **corte** mostra miniatura e ganha ↻ e ✓, porque ela tem imagem
 * própria. Cena de **continuação** não tem, e em vez de uma moldura vazia (que
 * prometeria uma imagem que ninguém vai gerar) ela diz de qual cena emenda —
 * **e não ganha nenhum dos dois botões**, porque não há o que repetir nem o que
 * aprovar.
 */
function ColunaDaCena({
  cena,
  gerando,
  repetindo,
  instrucao,
  onInstrucao,
  onAbrirRepetir,
  onCancelarRepetir,
  onConfirmarRepetir,
  onAprovar,
}: {
  cena: MachineScene;
  gerando: boolean;
  repetindo: boolean;
  instrucao: string;
  onInstrucao: (texto: string) => void;
  onAbrirRepetir: () => void;
  onCancelarRepetir: () => void;
  onConfirmarRepetir: () => void;
  onAprovar: () => void;
}) {
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
        {gerando ? (
          <span className="text-[10px] text-ink-faint">⟳</span>
        ) : cena.thumbUrl ? (
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

      {/* Anotação, e não estado: a cena continua aprovada. */}
      {cena.desatualizada ? (
        <p className="mt-0.5 text-[9px] text-ink-muted" title={copy.desatualizadaHint}>
          {copy.desatualizada}
        </p>
      ) : null}

      {/*
        A falha diz O QUE FOI e O QUE FAZER — nunca só "recusada".
        O texto cru do provedor vai para o `title`, onde quem investiga o acha, e
        fora da frase principal, onde ele só assustaria.
      */}
      {cena.erro ? <Falha erro={cena.erro} recusasSeguidas={cena.recusasSeguidas} /> : null}

      {/* ── As ações da cena. Continuação não tem nenhuma. ────────────────── */}
      {continuacao ? null : repetindo ? (
        <div className="mt-1 space-y-1">
          <input
            value={instrucao}
            onChange={(event) => onInstrucao(event.target.value)}
            placeholder={copy.repetirInstrucaoPlaceholder}
            title={copy.repetirInstrucaoHint}
            className="nodrag w-full rounded border border-line bg-canvas px-1 py-0.5 text-[9px]
                       text-ink placeholder:text-ink-faint"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onConfirmarRepetir}
              className="nodrag flex-1 rounded bg-accent py-0.5 text-[9px] text-canvas"
            >
              {copy.repetirConfirmar}
            </button>
            <button
              type="button"
              onClick={onCancelarRepetir}
              className="nodrag rounded border border-line px-1 py-0.5 text-[9px] text-ink-muted"
            >
              {copy.repetirCancelar}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex gap-1">
          <button
            type="button"
            onClick={onAbrirRepetir}
            disabled={gerando}
            title={copy.repetir}
            className="nodrag flex-1 rounded border border-line py-0.5 text-[9px] text-ink-muted
                       transition-colors hover:border-line-strong disabled:opacity-40"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={onAprovar}
            disabled={cena.estado !== "pronta"}
            title={copy.aprovarCena}
            className="nodrag flex-1 rounded border border-line py-0.5 text-[9px] text-ink-muted
                       transition-colors hover:border-line-strong disabled:opacity-40"
          >
            ✓
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Por que a cena não saiu — uma frase, um gesto, e o cru no tooltip.
 *
 * A classificação é do `machine-state`, e é pura: ela roda fora do React e se
 * prova por tabela-verdade, inclusive contra a armadilha do `b-locked`.
 */
function Falha({ erro, recusasSeguidas }: { erro: string; recusasSeguidas: number }) {
  const tipo = classificarFalha(erro);
  const classe = copy.falhas[tipo] ?? copy.falhas.desconhecida;
  const gesto = copy.gestos[gestoDaFalha(tipo, recusasSeguidas)];

  return (
    <p
      className="mt-0.5 text-[9px] leading-tight text-warning"
      title={`${classe.frase} ${gesto}\n\n${copy.erroCru(erro)}`}
    >
      <span className="font-medium">{classe.selo}</span>
      <span className="block text-ink-faint">
        {recusasSeguidas >= 3 ? copy.recusouTresVezes : gesto}
      </span>
    </p>
  );
}
