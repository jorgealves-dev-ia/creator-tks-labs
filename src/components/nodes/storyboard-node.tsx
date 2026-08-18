"use client";

import { type Node, type NodeProps } from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";

import { NodeHeader } from "@/components/nodes/node-header";
import { StoryboardSceneDialog } from "@/components/nodes/storyboard-scene-dialog";
import { useTextCatalog } from "@/components/nodes/use-text-catalog";
import { useCanvasStore } from "@/lib/canvas/store";
import { useEntitiesStore } from "@/lib/entities/store";
import { useGenerationTick } from "@/lib/generation/generation-feed";
import { t } from "@/lib/i18n/pt-BR";
import { useBalance } from "@/lib/sparks/balance-store";
import {
  listCtas,
  loadNodeStoryboard,
  type CtaOption,
  type NodeStoryboard,
  type SceneRow,
} from "@/lib/storyboard/actions";
import { CANAL_KEYS, TETO_CENAS, type Canal } from "@/lib/storyboard/contract";
import {
  requestStoryboard,
  type StoryboardGenerationFailure,
} from "@/lib/storyboard/generation-contract";

const copy = t.storyboardNode;

/**
 * O bloco de Roteiro — FRENTE STORYBOARD · CICLO 2 · Fase 3.
 *
 * ---------------------------------------------------------------------------
 * O node guarda a PERGUNTA; o banco guarda a RESPOSTA
 * ---------------------------------------------------------------------------
 *
 * A ideia, o canal, o `@`, o produto e o modelo moram no `data` do node — o
 * autosave do canvas já cuida deles. As fichas moram em `storyboards` +
 * `storyboard_scenes`, achadas por `(project_id, node_id)`, e **este componente
 * não guarda ficha nenhuma**: ele lê o banco na montagem e relê quando o
 * Realtime avisa que nasceu geração deste node. Mesmo desenho do bloco de vídeo,
 * pela mesma razão — não existe segunda cópia para discordar do banco no instante
 * em que isso mais custaria.
 *
 * Dois presentes que essa separação dá de graça:
 *
 *   duplicar   copia a pergunta e não a resposta, sem uma linha de código: o
 *              clone tem outro `node_id`, então o trilho dele nasce vazio — que é
 *              exatamente o comportamento certo para um bloco que é uma receita.
 *   recarregar  a página no meio de nada perde nada. Não havia o que perder.
 *
 * ---------------------------------------------------------------------------
 * A anatomia é a normativa da §3, com duas ausências deliberadas
 * ---------------------------------------------------------------------------
 *
 * cabeçalho → configuração → o que se escreve → botão → **custo e saldo** →
 * resultado, em duas colunas. As duas ausências:
 *
 *   sem chave de inputs   um roteiro não recebe imagem. A chave que silencia
 *                         referências não teria o que silenciar.
 *   sem conector          o fio nasce na Fase 4, junto com a ponte que o usa.
 *                         Um conector que não liga a lugar nenhum é uma promessa
 *                         que o canvas não pode cumprir — a mesma regra que
 *                         mantém o ▸ fora da linha compacta até a Fase 4.
 *
 * ---------------------------------------------------------------------------
 * Toda recusa possível é dita ANTES do clique
 * ---------------------------------------------------------------------------
 *
 * A ordem de guardas aqui é a do motor, um degrau acima: o `@` que não trabalha
 * neste projeto, a personagem sem versão salva, o texto vazio e o saldo curto são
 * recusados **sem requisição nenhuma sair**. Não é otimização — é a diferença
 * entre uma recusa que custa zero e uma que custa uma viagem: descobrir depois é
 * descobrir com a coisa já em andamento.
 */

export type StoryboardNodeData = {
  /** `ideia` escreve do zero; `colar` estrutura um roteiro pronto. */
  modo?: "ideia" | "colar";
  ideia?: string;
  texto?: string;
  canal?: string;
  cenas?: number;
  modelId?: string | null;
  /** O handle, **sem** o `@`. Nulo é legítimo: roteiro de produto. */
  personagem?: string | null;
  produto?: string | null;
};

export type StoryboardNodeType = Node<StoryboardNodeData, "storyboard">;

/**
 * Cada ficha vira um clipe de 5 segundos — o `duracao_segundos` que a receita
 * fixa e o catálogo de vídeo vende. É a constante que transforma "quantas cenas"
 * em "quantos segundos", que é a pergunta que a pessoa realmente está fazendo.
 */
const SEGUNDOS_POR_CENA = 5;

/**
 * Onde o aviso de ritmo acende.
 *
 * Da heurística de 15/08/2026: ~4 cenas por bloco de 15 s. Acima de ~45 s um
 * vertical perde ritmo, e o aviso existe para ser lido **antes de gastar** — um
 * roteiro de 50 s descoberto depois de pago é um roteiro que se refaz por 15 ⚡.
 *
 * Aviso e não trava: quem dirige pode ter razão para querer 50 s, e a régua é
 * heurística, não lei. Uma trava aqui seria a tela discordando de quem paga.
 */
const RITMO_LIMITE_SEGUNDOS = 45;

export function StoryboardNode({ id, data, selected }: NodeProps<StoryboardNodeType>) {
  const providers = useTextCatalog();
  const projectId = useCanvasStore((state) => state.projectId);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const balance = useBalance((state) => state.sparks);
  const tick = useGenerationTick(id);

  const characters = useEntitiesStore((state) => state.characters);
  const order = useEntitiesStore((state) => state.order);
  const linkedIds = useEntitiesStore((state) => state.linkedIds);
  const seeded = useEntitiesStore((state) => state.seeded);

  const [board, setBoard] = useState<NodeStoryboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [ctas, setCtas] = useState<CtaOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** Qual ficha está aberta no overlay, pela ordem dela. */
  const [openScene, setOpenScene] = useState<number | null>(null);

  // -------------------------------------------------------------------------
  // A pergunta, lida do node com os defaults aplicados aqui e não gravados
  // -------------------------------------------------------------------------
  const modo = data.modo === "colar" ? "colar" : "ideia";
  const canal = isCanal(data.canal) ? data.canal : CANAL_KEYS[0];
  const cenas = clamp(data.cenas ?? 6, 1, TETO_CENAS);
  const ideia = data.ideia ?? "";
  const texto = data.texto ?? "";
  const produto = data.produto ?? "";
  const handle = data.personagem ?? null;

  // -------------------------------------------------------------------------
  // O catálogo decide o modelo e o preço de cada trabalho — nesta ordem
  // -------------------------------------------------------------------------
  const models = providers
    .filter((provider) => provider.status === "ready")
    .flatMap((provider) => provider.models);
  const model =
    models.find((entry) => entry.id === data.modelId) ??
    models.find((entry) => entry.isDefault) ??
    models[0] ??
    null;

  const job = modo === "colar" ? "estruturar" : "roteiro";
  const price = model?.jobs.find((entry) => entry.jobKind === job)?.sparks ?? null;
  const cenaPrice = model?.jobs.find((entry) => entry.jobKind === "cena")?.sparks ?? null;

  // -------------------------------------------------------------------------
  // A `@`, conferida contra o projeto ANTES do clique
  //
  // As três recusas do motor, ditas aqui de graça. A do meio é a que existe de
  // verdade no dia a dia: uma aba aberta desde antes de um desvincular guarda o
  // handle e mandaria um pedido idêntico a um clique legítimo.
  // -------------------------------------------------------------------------
  const linkedCharacters = order
    .map((entityId) => characters[entityId])
    .filter((character) => character !== undefined && linkedIds.has(character.id));

  const chosen = handle
    ? (Object.values(characters).find((character) => character.handle === handle) ?? null)
    : null;

  // `seeded` guarda contra a mentira de um quadro: enquanto o Arsenal não chegou,
  // "não encontrei essa personagem" seria falso — e um aviso falso ensina a
  // ignorar o verdadeiro.
  const personagemProblema: "unknown_handle" | "not_linked" | "no_version" | null =
    !handle || !seeded
      ? null
      : !chosen
        ? "unknown_handle"
        : !linkedIds.has(chosen.id)
          ? "not_linked"
          : !chosen.activeVersion
            ? "no_version"
            : null;

  // -------------------------------------------------------------------------
  // O ritmo, contado antes de gastar
  // -------------------------------------------------------------------------
  const duracaoTotal = cenas * SEGUNDOS_POR_CENA;
  const ritmoAlto = modo === "ideia" && duracaoTotal > RITMO_LIMITE_SEGUNDOS;

  // -------------------------------------------------------------------------
  // O que o botão sabe antes do clique
  // -------------------------------------------------------------------------
  const pedido = (modo === "colar" ? texto : ideia).trim();
  // `null` é "a página ainda não semeou a carteira", não "zero": recusar nesse
  // instante seria recusar por um número que ainda não foi lido.
  const noBalance = price !== null && balance !== null && balance < price;

  const blocked: StoryboardGenerationFailure | "no_model" | null =
    !projectId || !model
      ? "no_model"
      : (personagemProblema ??
        (pedido === ""
          ? "empty_request"
          : price === null
            ? "unsupported_job"
            : noBalance
              ? "insufficient_balance"
              : null));

  // -------------------------------------------------------------------------
  // As fichas, lidas do banco — e relidas quando o banco avisa
  // -------------------------------------------------------------------------
  const reload = useCallback(() => {
    if (!projectId) return;

    void loadNodeStoryboard({ projectId, nodeId: id }).then((loaded) => {
      setBoard(loaded);
      setLoading(false);
    });
  }, [projectId, id]);

  useEffect(() => {
    reload();
    // `tick` sobe quando nasce ou muda uma geração deste node — que é exatamente
    // quando a resposta desta consulta pode ter mudado, e nunca antes.
  }, [reload, tick]);

  /**
   * A biblioteca de CTA do canal **do roteiro gravado**, não do seletor.
   *
   * A diferença aparece no minuto em que alguém troca o canal na configuração
   * sem gerar de novo: as fichas continuam sendo de TikTok Shop, e um dropdown
   * oferecendo CTAs de Shopee sugeriria que a ficha mudou de canal — que é
   * precisamente o que não aconteceu.
   */
  const canalDoTrilho = board?.canal ?? canal;

  useEffect(() => {
    let cancelled = false;

    void listCtas(canalDoTrilho).then((loaded) => {
      if (!cancelled) setCtas(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [canalDoTrilho]);

  const fichasEditadas = board?.cenas.filter((cena) => cena.editedAt !== null).length ?? 0;

  async function generate() {
    if (!projectId || !model || blocked || submitting) return;

    setSubmitting(true);
    setMessage(null);

    const personagem = handle ? { handle } : null;
    const produtoLimpo = produto.trim() === "" ? null : produto.trim();

    const result = await requestStoryboard(
      modo === "colar"
        ? {
            job: "estruturar",
            projectId,
            nodeId: id,
            texto: texto.trim(),
            canal,
            modelId: model.id,
            personagem,
            produto: produtoLimpo,
          }
        : {
            job: "roteiro",
            projectId,
            nodeId: id,
            ideia: ideia.trim(),
            canal,
            modelId: model.id,
            cenas,
            personagem,
            produto: produtoLimpo,
          },
    );

    setSubmitting(false);

    if (!result.ok) {
      setMessage(copy.errors[result.reason] ?? copy.errors.error);
      return;
    }

    useBalance.getState().spend(result.sparksCharged);
    reload();
  }

  const scene = board?.cenas.find((cena) => cena.ordem === openScene) ?? null;

  return (
    <div
      /*
        46rem, e não os 42 dos blocos de imagem e vídeo.

        Os 4rem a mais vão inteiros para a coluna da direita, e são medidos: a
        linha compacta carrega seis campos (nº, ação, duração, glifo, selo, ✎)
        contra a caixinha de um resultado, que carrega dois. Em 19rem sobrariam
        ~130px para o início da ação — dezoito caracteres, que é menos do que
        uma ação dirigida leva para dizer o que dirige, e um trilho de dez linhas
        truncadas na terceira palavra é um trilho que não se lê.

        A coluna da esquerda fica em ~23rem contra os ~26 do bloco de imagem, e
        cabe: aqui não há preset de formato, que é o campo que aperta lá.
      */
      className={`group/node w-[46rem] rounded-xl border bg-surface-raised shadow-lg
                  shadow-black/30 transition-colors
                  ${selected ? "border-accent" : "border-line"}`}
    >
      <NodeHeader nodeId={id} kind="storyboard" title={copy.title} removeHint={copy.remove} />

      <div className="flex gap-3 p-3">
        {/* ================================================================
            A PERGUNTA
           ================================================================ */}
        <div className="min-w-0 flex-1 space-y-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            {copy.configTitle}
          </p>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink-muted">
              {copy.modelLabel}
            </span>
            <select
              value={model?.id ?? ""}
              onChange={(event) => updateNodeData(id, { modelId: event.target.value })}
              className={SELECT_CLASS}
            >
              {models.length === 0 ? <option value="">—</option> : null}
              {models.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.displayName}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                {copy.canalLabel}
              </span>
              <select
                value={canal}
                onChange={(event) => updateNodeData(id, { canal: event.target.value })}
                className={SELECT_CLASS}
              >
                {CANAL_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {copy.canais[key] ?? key}
                  </option>
                ))}
              </select>
            </label>

            {/*
              O stepper, travado em 10.

              `type="number"` com `max` NÃO impede digitar 11 — ele só reprova na
              validação de formulário, e aqui não há formulário. Quem trava é o
              `clamp` na escrita: o teto do banco dito na tela, e não descoberto
              como recusa do servidor depois de a pessoa ter escrito o número.

              Só existe no modo "ideia": ao colar um roteiro, quantas cenas o
              texto tem é o modelo que conta.
            */}
            {modo === "ideia" ? (
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                  {copy.cenasLabel}
                </span>
                <input
                  type="number"
                  min={1}
                  max={TETO_CENAS}
                  value={cenas}
                  title={copy.cenasTetoHint}
                  onChange={(event) =>
                    updateNodeData(id, { cenas: clamp(Number(event.target.value), 1, TETO_CENAS) })
                  }
                  className={`nodrag ${SELECT_CLASS}`}
                />
              </label>
            ) : (
              <div>
                <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                  {copy.cenasLabel}
                </span>
                <p className="rounded-lg border border-dashed border-line px-1.5 py-1.5 text-[11px] leading-tight text-ink-faint">
                  {copy.colarHint}
                </p>
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                {copy.personagemLabel}
              </span>
              <select
                value={handle ?? ""}
                onChange={(event) =>
                  updateNodeData(id, { personagem: event.target.value || null })
                }
                className={SELECT_CLASS}
              >
                <option value="">{copy.personagemNenhuma}</option>
                {/* Só quem trabalha neste projeto (Etapa D2). Um handle que ficou
                    no node depois de um desvincular continua sendo mostrado como
                    opção selecionada e é recusado pelo aviso abaixo — some da
                    lista, não da memória. */}
                {linkedCharacters.map((character) => (
                  <option key={character.id} value={character.handle}>
                    @{character.handle}
                  </option>
                ))}
                {handle && !linkedCharacters.some((c) => c.handle === handle) ? (
                  <option value={handle}>@{handle}</option>
                ) : null}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                {copy.produtoLabel}
              </span>
              <input
                value={produto}
                onChange={(event) => updateNodeData(id, { produto: event.target.value })}
                placeholder={copy.produtoPlaceholder}
                maxLength={200}
                title={copy.produtoHint}
                className={`nodrag ${SELECT_CLASS}`}
              />
            </label>
          </div>

          {linkedCharacters.length === 0 && seeded ? (
            <p className="text-[10px] leading-relaxed text-ink-faint">{copy.personagemVazia}</p>
          ) : null}

          {/* A recusa da `@`, dita antes do clique e sem requisição nenhuma ter
              saído: o banco fica intocado, e o botão trava junto. */}
          {personagemProblema ? (
            <p className="rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5 text-[11px] leading-relaxed text-ink">
              {copy.errors[personagemProblema]}
            </p>
          ) : null}

          {/* ── Os dois modos ────────────────────────────────────────────── */}
          <div className="flex gap-1 rounded-lg border border-line bg-surface p-0.5">
            {(["ideia", "colar"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => updateNodeData(id, { modo: option })}
                className={`nodrag flex-1 rounded-md px-2 py-1 text-[11px] transition-colors ${
                  modo === option
                    ? "bg-accent-soft font-medium text-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {option === "ideia" ? copy.modoIdeia : copy.modoColar}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink-muted">
              {modo === "colar" ? copy.textoLabel : copy.ideiaLabel}
            </span>
            <textarea
              value={modo === "colar" ? texto : ideia}
              onChange={(event) =>
                updateNodeData(
                  id,
                  modo === "colar" ? { texto: event.target.value } : { ideia: event.target.value },
                )
              }
              placeholder={modo === "colar" ? copy.textoPlaceholder : copy.ideiaPlaceholder}
              rows={modo === "colar" ? 6 : 3}
              maxLength={modo === "colar" ? 20000 : 4000}
              className="nodrag w-full resize-none rounded-lg border border-line bg-surface px-2 py-1.5
                         text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
          </label>

          {/* ── O botão, e logo abaixo o que ele custa ────────────────────── */}
          <button
            type="button"
            onClick={generate}
            disabled={blocked !== null || submitting}
            className="nodrag h-9 w-full rounded-lg bg-accent text-xs font-medium text-canvas
                       transition-colors hover:bg-accent-hover disabled:cursor-not-allowed
                       disabled:bg-surface-hover disabled:text-ink-faint"
          >
            {submitting
              ? copy.working
              : modo === "colar"
                ? copy.generateEstruturar
                : copy.generate}
          </button>

          {/* Custo e saldo sob o botão, no futuro do indicativo — a anatomia da
              §3: um número no canto é rótulo; embaixo do botão é preço. */}
          {price !== null ? (
            <p className="text-center text-[11px] text-ink-faint">
              {copy.costWillPrefix}{" "}
              <strong className="font-medium text-ink-muted">{price} ⚡</strong>
              {balance === null ? null : (
                <>
                  {" · "}
                  {copy.balanceLabel}: {balance.toLocaleString("pt-BR")} ⚡
                </>
              )}
            </p>
          ) : null}

          {/* O aviso de ritmo: antes de gastar, que é a única hora em que vale. */}
          {ritmoAlto ? (
            <p className="text-center text-[10px] leading-relaxed text-warning">
              {copy.ritmoAviso(duracaoTotal)}
            </p>
          ) : modo === "ideia" ? (
            <p className="text-center text-[10px] text-ink-faint">
              {copy.duracaoTotal(duracaoTotal)}
            </p>
          ) : null}

          {/* Gerar por cima apaga as fichas que estão lá. Dito antes, e com o
              número de fichas que passaram por mão humana — que é a informação
              que muda a decisão. */}
          {board ? (
            <p className="text-center text-[10px] leading-relaxed text-ink-faint">
              {copy.replaceWarning}
              {fichasEditadas > 0 ? ` ${copy.replaceWarningEdited(fichasEditadas)}` : null}
            </p>
          ) : null}

          {blocked !== null && blocked !== "no_model" && blocked !== personagemProblema ? (
            <p className="text-center text-[10px] leading-relaxed text-ink-faint">
              {copy.errors[blocked as StoryboardGenerationFailure] ?? copy.errors.error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[11px] leading-relaxed text-warning">
              {message}
            </p>
          ) : null}
        </div>

        {/* ================================================================
            A RESPOSTA — o trilho de fichas
           ================================================================ */}
        <div className="w-[21rem] shrink-0 space-y-2 border-l border-line pl-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            {copy.trilhoTitle}
          </p>

          {board ? (
            <div className="space-y-1.5">
              <div>
                <p className="truncate text-xs font-medium text-ink" title={board.historia.titulo}>
                  {board.historia.titulo}
                </p>
                <p className="truncate text-[10px] text-ink-faint">
                  {board.historia.formato} · {board.historia.estilo} · {board.historia.genero} ·{" "}
                  {copy.duracaoTotal(
                    board.cenas.reduce((total, cena) => total + cena.duracao_segundos, 0),
                  )}
                </p>
              </div>

              {/*
                O AVISO DE CONDENSAÇÃO — pela CONTA, nunca pela frase.

                `board.condensou` é `cenas_no_original > total`, calculado onde a
                coluna é lida. `historia.ajuste` só aparece **depois** desse
                booleano, como ilustração de um fato já estabelecido pelo número.

                É o defeito medido na Fase 0 barrado na última camada em que ele
                ainda podia passar: o modelo declarou "Condensado de 6 para 6
                cenas" sobre um roteiro intacto, e uma tela que confiasse na prosa
                mostraria aquela frase. Mesma doutrina do quadro derivado: o que
                identifica é o dado, nunca o rótulo.
              */}
              {board.condensou ? (
                <p className="rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5 text-[10px] leading-relaxed text-ink">
                  {copy.condensou(board.historia.cenas_no_original ?? 0, board.cenas.length)}
                  {board.historia.ajuste ? ` ${board.historia.ajuste}` : null}
                </p>
              ) : null}

              <ul className="space-y-1">
                {board.cenas.map((cena) => (
                  <SceneRowItem
                    key={cena.ordem}
                    cena={cena}
                    onOpen={() => setOpenScene(cena.ordem)}
                  />
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-line px-2 py-6 text-center text-[11px] leading-relaxed text-ink-faint">
              {loading ? copy.trilhoLoading : copy.trilhoEmpty}
            </p>
          )}
        </div>
      </div>

      {/* Sem `<Handle>`: a ponte é a Fase 4, e o conector nasce com ela. */}

      {scene && board && projectId ? (
        <StoryboardSceneDialog
          scene={scene}
          total={board.cenas.length}
          historia={board.historia}
          canal={board.canal}
          ctas={ctas}
          projectId={projectId}
          nodeId={id}
          modelId={model?.id ?? null}
          cenaPrice={cenaPrice}
          onClose={() => setOpenScene(null)}
          onChanged={reload}
        />
      ) : null}
    </div>
  );
}

/**
 * Uma ficha, na linha compacta: `nº · início da ação · duração · ✂/⇥ · selo · ✎`.
 *
 * Seis campos e **uma** ação. O que não está aqui é tão deliberado quanto o que
 * está:
 *
 *   sem "Regerar"   é o único gesto pago do trilho, a 5 ⚡. Dez botões de gastar
 *                   numa lista de dez linhas fazem da rolagem um campo minado, e
 *                   o gesto que custa dinheiro fica mais fácil que o que só olha.
 *                   Ele mora no overlay, onde custa um passo a mais — e esse
 *                   passo é a deliberação.
 *   sem ▸           a ponte para o bloco de imagem é a Fase 4. Botão sem função
 *                   não entra na tela: um glifo que aparece antes de fazer alguma
 *                   coisa ensina que os botões daqui às vezes não fazem nada.
 */
function SceneRowItem({ cena, onOpen }: { cena: SceneRow; onOpen: () => void }) {
  const continua = cena.transicao === "continuacao";

  return (
    <li className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-1.5 py-1">
      <span className="w-3 shrink-0 text-center text-[10px] tabular-nums text-ink-faint">
        {cena.ordem}
      </span>

      <span className="min-w-0 flex-1 truncate text-[11px] text-ink-muted" title={cena.acao}>
        {cena.acao}
      </span>

      <span className="shrink-0 text-[10px] tabular-nums text-ink-faint">
        {cena.duracao_segundos}s
      </span>

      {/* O glifo da transição — a informação que decide se dois clipes emendam,
          e por isso na linha e não escondida no overlay. */}
      <span
        aria-label={continua ? copy.transicaoContinuacao : copy.transicaoCorte}
        title={continua ? copy.transicaoContinuacao : copy.transicaoCorte}
        className={`shrink-0 text-[11px] ${continua ? "text-accent" : "text-ink-faint"}`}
      >
        {continua ? "⇥" : "✂"}
      </span>

      <span
        className={`shrink-0 rounded px-1 py-px text-[9px] ${
          cena.status === "aprovada"
            ? "bg-positive/15 text-positive"
            : "bg-surface-hover text-ink-faint"
        }`}
      >
        {cena.status === "aprovada" ? copy.statusAprovada : copy.statusRascunho}
      </span>

      <button
        type="button"
        onClick={onOpen}
        title={copy.editarFicha}
        aria-label={`${copy.editarFicha} ${cena.ordem}`}
        className="nodrag flex size-5 shrink-0 items-center justify-center rounded text-ink-faint
                   transition-colors hover:bg-surface-hover hover:text-ink"
      >
        <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
          <path
            d="M9.4 2.2l2.4 2.4-6.6 6.6-3 .6.6-3 6.6-6.6z"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </li>
  );
}

function isCanal(value: unknown): value is Canal {
  return typeof value === "string" && (CANAL_KEYS as readonly string[]).includes(value);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.min(max, Math.max(min, Math.round(value)));
}

const SELECT_CLASS =
  "nodrag w-full rounded-lg border border-line bg-surface px-1.5 py-1.5 text-xs text-ink " +
  "placeholder:text-ink-faint focus:border-accent focus:outline-none";
