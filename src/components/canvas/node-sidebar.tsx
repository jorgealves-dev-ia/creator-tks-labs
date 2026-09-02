"use client";

import { getViewportForBounds, useReactFlow, useStore } from "@xyflow/react";
import { useState } from "react";

import { CharacterPicker } from "@/components/character-sheet/character-picker";
import { CharacterWizard } from "@/components/character-sheet/character-wizard";
import { UnlinkCharacter } from "@/components/character-sheet/unlink-character";
import { Portrait, VersionBadge } from "@/components/character-sheet/identity";
import { NodeIcon, type NodeKind } from "@/components/nodes/node-icons";
import { NODE_TYPE_MIME } from "@/lib/canvas/drag";
import { useReferencePicker } from "@/lib/canvas/reference-picker-store";
import { useCanvasStore } from "@/lib/canvas/store";
import { useEntitiesStore } from "@/lib/entities/store";
import { useCharacterPortraits } from "@/lib/entities/use-portraits";
import { t } from "@/lib/i18n/pt-BR";

/**
 * Collapsed rail that widens when the pointer gets close. `focus-within` gives
 * keyboard users the same reach.
 *
 * Collapsed, a character is its portrait; expanded, it is a full row. That is
 * what makes the rail useful at 56px wide instead of merely present.
 */
export function NodeSidebar() {
  const { screenToFlowPosition, setCenter, getZoom } = useReactFlow();

  /**
   * O painel e os limites de zoom, lidos do próprio React Flow.
   *
   * Nunca copiados: o `minZoom`/`maxZoom` são props do `<ReactFlow>` e uma
   * segunda cópia aqui só existiria para poder discordar da primeira no dia em
   * que alguém mudasse uma delas.
   */
  const pane = useStore((state) => ({
    width: state.width,
    height: state.height,
    minZoom: state.minZoom,
    maxZoom: state.maxZoom,
  }));
  const characters = useEntitiesStore((state) => state.characters);
  const order = useEntitiesStore((state) => state.order);
  const linkedIds = useEntitiesStore((state) => state.linkedIds);
  const openEditor = useEntitiesStore((state) => state.openEditor);
  const nodes = useCanvasStore((state) => state.nodes);
  const projectId = useCanvasStore((state) => state.projectId);
  const portraits = useCharacterPortraits();

  const [creating, setCreating] = useState(false);
  const [picking, setPicking] = useState(false);
  /** Quem está no diálogo de desvincular, se alguém. */
  const [unlinking, setUnlinking] = useState<string | null>(null);

  /**
   * Quem trabalha **neste** projeto (Etapa D2).
   *
   * A ordem continua sendo a da lista do usuário, não a dos vínculos: a pessoa
   * aprendeu onde cada personagem fica no trilho, e reordenar por data de
   * vínculo mudaria esse mapa a cada vez que ela trouxesse alguém.
   */
  const visible = order.filter((id) => linkedIds.has(id));

  // Resolvida aqui e não guardada no estado: um objeto copiado para dentro do
  // useState envelheceria no primeiro rename, e o diálogo mostraria o nome
  // antigo de quem ele está prestes a tirar.
  const unlinkingCharacter = unlinking ? characters[unlinking] : undefined;

  const onCanvas = new Set(
    nodes
      .map((node) => node.data.entityId)
      .filter((entityId): entityId is string => typeof entityId === "string"),
  );

  /** Dropped where the user is looking, nudged so blocks added in a row do not
   *  land exactly on top of each other. */
  function dropPosition(nudgeStep: number) {
    const nudge = (nudgeStep % 5) * 28;

    return screenToFlowPosition({
      x: window.innerWidth / 2 + nudge,
      y: window.innerHeight / 2 + nudge,
    });
  }

  function addNode(type: string, data: Record<string, unknown>, nudgeStep: number) {
    useCanvasStore.getState().onNodesChange([
      {
        type: "add",
        item: {
          id: crypto.randomUUID(),
          type,
          position: dropPosition(nudgeStep),
          data,
        },
      },
    ]);
  }

  function addToCanvas(entityId: string) {
    addNode("character", { entityId }, onCanvas.size);
  }

  function addGenerator() {
    // The block starts empty on purpose: an empty prompt with no mention is the
    // one state the button explains rather than the one it hides.
    addNode("generator", {}, nodes.length);
  }

  /**
   * O bloco de vídeo nasce vazio pelo mesmo motivo — e com um a mais: ele nasce
   * **sem imagem**, que é o estado que o card explica ("conecte uma imagem") em
   * vez de esconder. Pré-conectar a alguma coisa seria escolher por quem clicou.
   */
  function addVideoGenerator() {
    addNode("video-generator", {}, nodes.length);
  }

  /**
   * O bloco de Roteiro nasce vazio pelo mesmo motivo dos outros dois — e os
   * defaults dele (canal, nº de cenas, modelo) são resolvidos **dentro** do
   * card, não semeados aqui. Gravar um canal no `data` no instante da criação
   * congelaria a escolha de hoje no grafo de quem nunca abriu o seletor, e um
   * default que virou dado salvo é um default que ninguém consegue mudar depois.
   */
  function addStoryboard() {
    addNode("storyboard", {}, nodes.length);
  }

  /**
   * A Máquina nasce vazia e SEM roteiro ligado, pelo mesmo motivo dos outros
   * três — e com um a mais: ela não escolhe qual roteiro reger. Quem escolhe é o
   * fio, e pré-ligar a Máquina ao primeiro Roteiro que houvesse no canvas seria
   * decidir por quem clicou.
   *
   * O template que já nasce com o par montado é a Fase 4, e é outro gesto.
   */
  function addMachine() {
    addNode("machine", {}, nodes.length);
  }

  /**
   * O template: Roteiro + Máquina, ligados e enquadrados, num clique.
   *
   * **O enquadramento é metade da entrega, e é medido.** A Fase 1 contou três
   * gestos de montagem — clicar na prateleira · **enquadrar** · arrastar o fio —
   * e o do meio não era um capricho: o Roteiro estava em `y = 1162` num viewport
   * de 675 px, e as duas pontas do fio não cabiam na tela juntas. Um template que
   * põe o par onde ninguém o vê remove dois gestos dos três.
   *
   * **`setCenter` e não `fitView`, e a razão é mecânica.** O `fitView` descobre
   * os limites a partir de `measured`, que só existe depois de o node ter sido
   * desenhado; pedido para dois nodes criados neste instante, ele os descarta,
   * cai num retângulo de área zero e manda a tela para a origem no zoom máximo.
   * Aqui os limites não precisam ser descobertos — o store acabou de escolher as
   * duas posições e conhece os dois tamanhos, e devolve a caixa pronta.
   *
   * **O zoom é derivado, nunca uma constante.** Quem calcula é o
   * `getViewportForBounds` do próprio React Flow — a mesma função que o `fitView`
   * usa por dentro, com os mesmos limites e o mesmo arredondamento —, alimentada
   * com a caixa do par em vez de com nodes medidos. O `Math.min` com o zoom atual
   * é a única diferença de comportamento: aproximar quem estava longe seria
   * mexer no enquadramento de quem não pediu.
   */
  function addStoryboardFlow() {
    const { bounds } = useCanvasStore.getState().addStoryboardMachine({
      center: screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }),
    });

    // 80px em cada lado, e a margem é SIMÉTRICA de propósito: o `setCenter`
    // centra o par no painel, então uma margem assimétrica teria o zoom
    // calculado por ela e a posição decidida por outra coisa — a folga extra que
    // se pedisse em cima reapareceria metade em cima e metade embaixo.
    //
    // 80 porque o painel ocupa a janela inteira e o cabeçalho (56px) e o trilho
    // recolhido (56px) ficam POR CIMA dele. Com 80 simétricos, o par nasce 24px
    // abaixo do cabeçalho em vez de encostado nele — medido: com uma margem
    // menor a folga do topo dava exatamente 56, e um card colado no cabeçalho lê
    // como um card cortado por ele.
    const { zoom: cabe } = getViewportForBounds(
      bounds,
      pane.width,
      pane.height,
      pane.minZoom,
      pane.maxZoom,
      "80px",
    );

    void setCenter(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, {
      zoom: Math.min(getZoom(), cabe),
      duration: 400,
    });
  }

  return (
    <>
      <aside
        aria-label={t.studio.sidebarTitle}
        className="rail group absolute bottom-3 left-3 top-20 z-10 flex w-14 flex-col
                   overflow-hidden rounded-xl border border-line bg-surface/70
                   shadow-lg shadow-black/30 backdrop-blur-xl
                   transition-[width] duration-200 ease-out
                   hover:w-64 focus-within:w-64"
      >
        <div className="flex h-14 shrink-0 items-center gap-3 px-4">
          <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-ink-muted" aria-hidden>
            <rect x="1.5" y="1.5" width="5" height="5" rx="1.5"
                  stroke="currentColor" strokeWidth="1.3" fill="none" />
            <rect x="9.5" y="1.5" width="5" height="5" rx="1.5"
                  stroke="currentColor" strokeWidth="1.3" fill="none" />
            <rect x="1.5" y="9.5" width="5" height="5" rx="1.5"
                  stroke="currentColor" strokeWidth="1.3" fill="none" />
            <rect x="9.5" y="9.5" width="5" height="5" rx="1.5"
                  stroke="currentColor" strokeWidth="1.3" fill="none" />
          </svg>
          <span className={revealed("text-sm font-medium text-ink")}>
            {t.studio.sidebarTitle}
          </span>
        </div>

        <div className="rail-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-2">
          <RailSection label={t.characterSheet.sidebar.title} first />

          {/* Dois vazios, dois problemas. Sem personagem nenhuma, o conserto é
              criar; com seis e um projeto novo, o conserto é trazer — e dizer
              "crie a primeira" para quem tem seis é a tela contradizendo o que
              a pessoa sabe que tem. */}
          {visible.length === 0 ? (
            <div className={onlyWhenOpen("px-4 py-1")}>
              <p className="text-xs leading-relaxed text-ink-faint">
                {order.length === 0
                  ? t.characterSheet.sidebar.empty
                  : t.characterSheet.sidebar.emptyInProject}
              </p>
              {order.length > 0 ? (
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
                  {t.characterSheet.sidebar.emptyInProjectHint}
                </p>
              ) : null}
            </div>
          ) : null}

          {visible.map((id) => {
            const character = characters[id];
            if (!character) return null;

            const isOnCanvas = onCanvas.has(id);

            return (
              <div key={id} className="flex items-center gap-3 px-3 py-1">
                <button
                  type="button"
                  onClick={() => openEditor(id)}
                  title={character.displayName}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left
                             transition-colors hover:bg-surface-hover"
                >
                  <Portrait
                    name={character.displayName}
                    src={portraits[character.id]}
                    className="size-8"
                  />

                  <span className={revealed("min-w-0 flex-1")}>
                    <span className="block truncate text-xs font-medium text-ink">
                      {character.displayName}
                    </span>
                    <span className="block truncate text-[11px] text-ink-faint">
                      @{character.handle}
                    </span>
                  </span>

                  <span className={revealed("")}>
                    <VersionBadge versionNumber={character.activeVersion?.number ?? null} />
                  </span>
                </button>

                <span className={revealed("flex shrink-0 items-center gap-1")}>
                  {isOnCanvas ? (
                    <span className="text-[11px] text-ink-faint">
                      {t.characterSheet.sidebar.onCanvas}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToCanvas(id)}
                      title={t.characterSheet.sidebar.addToCanvas}
                      aria-label={t.characterSheet.sidebar.addToCanvas}
                      className="flex size-6 items-center justify-center rounded-md border
                                 border-line text-ink-muted transition-colors
                                 hover:border-line-strong hover:text-ink"
                    >
                      <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
                        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6"
                              strokeLinecap="round" />
                      </svg>
                    </button>
                  )}

                  {/* Desvincular mora aqui, e não no editor, porque o editor é a
                      casa do arquivar. Duas ações com dois pesos não podem ter a
                      mesma vizinhança: quem procura "tirar daqui" olha para a
                      lista do projeto, não para a ficha da personagem. */}
                  <button
                    type="button"
                    onClick={() => setUnlinking(id)}
                    title={t.characterSheet.sidebar.unlink}
                    aria-label={`${t.characterSheet.sidebar.unlink}: ${character.displayName}`}
                    className="flex size-6 items-center justify-center rounded-md text-ink-faint
                               transition-colors hover:bg-surface-hover hover:text-ink"
                  >
                    <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
                      <path d="M2 7h10" stroke="currentColor" strokeWidth="1.6"
                            strokeLinecap="round" />
                    </svg>
                  </button>
                </span>
              </div>
            );
          })}

          <div className="px-3 pt-2">
            <button
              type="button"
              onClick={() => setCreating(true)}
              title={t.characterSheet.sidebar.newCharacter}
              className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left
                         transition-colors hover:bg-surface-hover"
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg
                           border border-dashed border-line-strong text-ink-muted"
              >
                <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6"
                        strokeLinecap="round" />
                </svg>
              </span>
              <span className={revealed("truncate text-xs font-medium text-ink-muted")}>
                {t.characterSheet.sidebar.newCharacter}
              </span>
            </button>

            {/* A outra metade do "de onde vem uma personagem": criar, ou trazer
                uma que já existe. Sem esta porta, um projeto novo só poderia
                receber gente nova — e a personagem voltaria a ser do projeto,
                que é exatamente o que esta etapa desfaz. */}
            <button
              type="button"
              onClick={() => setPicking(true)}
              title={t.characterSheet.sidebar.addExistingHint}
              className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left
                         transition-colors hover:bg-surface-hover"
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg
                           border border-dashed border-line-strong text-ink-muted"
              >
                <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                  <circle cx="6" cy="5.5" r="2.6" stroke="currentColor" strokeWidth="1.3"
                          fill="none" />
                  <path d="M1.6 13.4c0-2.4 2-4 4.4-4s4.4 1.6 4.4 4" stroke="currentColor"
                        strokeWidth="1.3" fill="none" strokeLinecap="round" />
                  <path d="M12.4 5.2v4M10.4 7.2h4" stroke="currentColor" strokeWidth="1.3"
                        strokeLinecap="round" />
                </svg>
              </span>
              <span className={revealed("truncate text-xs font-medium text-ink-muted")}>
                {t.characterSheet.sidebar.addExisting}
              </span>
            </button>
          </div>

          <RailSection label={t.inputs.sidebarTitle} />

          {/*
            A shelf of *types*, not of things.
            Nothing is configured here: no name, no images, no instruction. The
            rail offers a kind of card and the card holds everything else —
            which is the whole reversal of this cycle. A product is rotativo;
            keeping a permanent shelf of its photos meant registering something
            before you could use it, for the sake of a list nobody wanted.
          */}
          <div className="px-3">
            {INPUT_TYPES.map((type) => (
              <button
                key={type.kind}
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(NODE_TYPE_MIME, type.kind);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => addNode(type.kind, {}, nodes.length)}
                title={type.hint}
                className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left
                           transition-colors hover:bg-surface-hover"
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg
                             border border-line bg-surface text-ink-muted"
                >
                  <NodeIcon kind={type.kind} className="size-3.5" />
                </span>
                <span className={revealed("truncate text-xs font-medium text-ink")}>
                  {type.label}
                </span>
              </button>
            ))}
          </div>

          {/*
            A Galeria (§4b da D1).
            Fica com os Blocos e não com os Inputs porque não é uma coisa que se
            arrasta para o canvas: é uma janela para o que este projeto já
            produziu. Sem projeto aberto não há o que mostrar, e o item some em
            vez de abrir uma grade vazia.
          */}
          {projectId ? (
            <>
              <RailSection label={t.generation.gallery.sidebar} />

              <div className="px-3">
                <button
                  type="button"
                  onClick={() => useReferencePicker.getState().browse({ projectId })}
                  title={t.generation.gallery.sidebarHint}
                  className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left
                             transition-colors hover:bg-surface-hover"
                >
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg
                               border border-line bg-surface text-ink-muted"
                  >
                    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor"
                            strokeWidth="1.3" fill="none" />
                      <path d="M1.5 11l3.2-3.2 2.4 2.4 3-3 4.4 4.4" stroke="currentColor"
                            strokeWidth="1.3" fill="none" strokeLinecap="round"
                            strokeLinejoin="round" />
                      <circle cx="10.4" cy="6" r="1.1" fill="currentColor" />
                    </svg>
                  </span>
                  <span className={revealed("min-w-0 flex-1")}>
                    <span className="block truncate text-xs font-medium text-ink">
                      {t.generation.gallery.sidebar}
                    </span>
                    <span className="block truncate text-[11px] text-ink-faint">
                      {t.generation.gallery.sidebarHint}
                    </span>
                  </span>
                </button>
              </div>
            </>
          ) : null}

          {/*
            Os Fluxos vêm ANTES dos Blocos, e a ordem é a mensagem: o fluxo
            montado primeiro, as peças soltas depois.

            Um fluxo NÃO é um tipo de node — é um gesto que cria dois dos que já
            existem, ligados. Por isso o glifo é desenhado aqui e não em
            `node-icons.tsx`: aquele arquivo é indexado por `NodeKind`, a união
            dos tipos que o canvas sabe desenhar, e um "template" ali faria a
            união deixar de significar o que significa. A Galeria abriu esse
            caminho — item de trilho que não é node, com o seu SVG na mão.
          */}
          <RailSection label={t.studio.sidebarFlows} />

          <div className="px-3">
            <button
              type="button"
              onClick={addStoryboardFlow}
              title={t.studio.templateStoryboard.hint}
              className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left
                         transition-colors hover:bg-surface-hover"
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg
                           border border-line bg-accent-soft text-ink-muted"
              >
                {/* O par e o fio: em cima a moldura dividida do Roteiro, embaixo a
                    silhueta deitada da Máquina, e o traço que as liga. É
                    literalmente o que o clique faz — e a baixo zoom se distingue
                    dos dois itens de «Blocos» que ele combina, porque nenhum
                    deles tem duas formas empilhadas. */}
                <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                  <rect
                    x="3.25" y="1.5" width="9.5" height="5" rx="1.4"
                    stroke="currentColor" strokeWidth="1.3" fill="none"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.4 1.5v5" stroke="currentColor" strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 6.5v3" stroke="currentColor" strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <rect
                    x="1.5" y="9.5" width="13" height="5" rx="2.5"
                    stroke="currentColor" strokeWidth="1.3" fill="none"
                  />
                </svg>
              </span>
              <span className={revealed("min-w-0 flex-1")}>
                <span className="block truncate text-xs font-medium text-ink">
                  {t.studio.templateStoryboard.title}
                </span>
                <span className="block truncate text-[11px] text-ink-faint">
                  {t.studio.templateStoryboard.hint}
                </span>
              </span>
            </button>
          </div>

          <RailSection label={t.studio.sidebarBlocks} />

          <div className="px-3">
            <button
              type="button"
              onClick={addGenerator}
              title={t.generation.node.sidebarHint}
              className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left
                         transition-colors hover:bg-surface-hover"
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg
                           border border-line bg-accent-soft text-ink-muted"
              >
                {/* The same glyph the block wears on the canvas: the rail is
                    where you learn what to look for out there. */}
                <NodeIcon kind="generator" className="size-3.5" />
              </span>
              <span className={revealed("min-w-0 flex-1")}>
                <span className="block truncate text-xs font-medium text-ink">
                  {t.generation.node.title}
                </span>
                <span className="block truncate text-[11px] text-ink-faint">
                  {t.generation.node.sidebarHint}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={addVideoGenerator}
              title={t.videoNode.generatingHint}
              className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left
                         transition-colors hover:bg-surface-hover"
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg
                           border border-line bg-accent-soft text-ink-muted"
              >
                <NodeIcon kind="video-generator" className="size-3.5" />
              </span>
              <span className={revealed("min-w-0 flex-1")}>
                <span className="block truncate text-xs font-medium text-ink">
                  {t.videoNode.title}
                </span>
                <span className="block truncate text-[11px] text-ink-faint">
                  {t.videoNode.stillEmpty}
                </span>
              </span>
            </button>

            {/* O terceiro bloco da casa. Fica com os outros dois e não com os
                Inputs porque produz — e o glifo dele é a linha do trilho vista de
                longe, para ser achado a baixo zoom antes de qualquer texto ser
                legível, que é a razão de a prateleira e o card usarem o mesmo
                desenho. */}
            <button
              type="button"
              onClick={addStoryboard}
              title={t.storyboardNode.sidebarHint}
              className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left
                         transition-colors hover:bg-surface-hover"
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg
                           border border-line bg-accent-soft text-ink-muted"
              >
                <NodeIcon kind="storyboard" className="size-3.5" />
              </span>
              <span className={revealed("min-w-0 flex-1")}>
                <span className="block truncate text-xs font-medium text-ink">
                  {t.storyboardNode.title}
                </span>
                <span className="block truncate text-[11px] text-ink-faint">
                  {t.storyboardNode.sidebarHint}
                </span>
              </span>
            </button>

            {/* A quarta peça da prateleira. O glifo dela é deitado com soquetes —
                a única silhueta assim no canvas —, para ser achada a baixo zoom
                antes de qualquer texto ser legível. */}
            <button
              type="button"
              onClick={addMachine}
              title={t.machineNode.sidebarHint}
              className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left
                         transition-colors hover:bg-surface-hover"
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg
                           border border-line bg-accent-soft text-ink-muted"
              >
                <NodeIcon kind="machine" className="size-3.5" />
              </span>
              <span className={revealed("min-w-0 flex-1")}>
                <span className="block truncate text-xs font-medium text-ink">
                  {t.machineNode.title}
                </span>
                <span className="block truncate text-[11px] text-ink-faint">
                  {t.machineNode.sidebarHint}
                </span>
              </span>
            </button>
          </div>

          <p className={onlyWhenOpen("mt-3 px-4 text-[11px] leading-relaxed text-ink-faint")}>
            {t.studio.sidebarComingSoon}
          </p>
        </div>
      </aside>

      {creating ? (
        <CharacterWizard
          onClose={() => setCreating(false)}
          // Nasce vinculada ao projeto onde foi criada (item 1.3).
          projectId={projectId}
          // The card appears as soon as the character exists, not only at the
          // end: the wizard can be abandoned, and a draft character is a
          // legitimate state that must not be invisible.
          onCreated={(character) => addToCanvas(character.id)}
        />
      ) : null}

      {picking && projectId ? (
        <CharacterPicker projectId={projectId} onClose={() => setPicking(false)} />
      ) : null}

      {/* Fora do <aside>, de propósito: o trilho tem `overflow-hidden` para o
          seu próprio scroll, e um popover desenhado lá dentro seria cortado na
          borda de 56px. */}
      {unlinkingCharacter ? (
        <UnlinkCharacter
          entityId={unlinkingCharacter.id}
          handle={unlinkingCharacter.handle}
          onDone={() => setUnlinking(null)}
        />
      ) : null}
    </>
  );
}

/**
 * The Inputs shelf, as data.
 *
 * One entry per type, and adding the next three is three lines here plus a node
 * component — which is the point of the shelf being types rather than things.
 */
const INPUT_TYPES: readonly { kind: NodeKind; label: string; hint: string }[] = [
  {
    kind: "input-image",
    label: t.inputs.image.title,
    hint: t.inputs.sidebarHint,
  },
  {
    kind: "input-product",
    label: t.inputs.product.title,
    hint: t.inputs.sidebarHint,
  },
  {
    kind: "input-pose",
    label: t.inputs.pose.title,
    hint: t.inputs.sidebarHint,
  },
  {
    kind: "input-sheet",
    label: t.inputs.sheet.title,
    hint: t.inputs.sidebarHint,
  },
];

/**
 * Text that only exists once the rail is open. Kept in one place so every label
 * fades in together instead of each remembering its own set of classes.
 *
 * Only for text that sits **beside** something — a name next to a portrait, a
 * badge at the end of a row. It hides by opacity, so whatever it is applied to
 * keeps its size; on a line whose height comes from an icon that costs nothing,
 * and on a paragraph of its own it costs the paragraph's whole height. See
 * `onlyWhenOpen` and `RailSection` for the two cases where that matters.
 */
function revealed(className: string): string {
  return `${className} whitespace-nowrap opacity-0 transition-opacity duration-150
          group-hover:opacity-100 group-focus-within:opacity-100`;
}

/**
 * Block-level text that must take **no room at all** while the rail is shut.
 *
 * The difference from `revealed` is the whole of bug 1a. A paragraph faded to
 * zero opacity is still a paragraph: it keeps its height, and in a rail 56px
 * wide those invisible lines added up to a column of blank space between the
 * portraits and the input icons. A gap with no icon in it does not read as
 * "text you cannot see yet" — it reads as an item that is missing, which is
 * exactly what somebody who has just archived a character will conclude.
 *
 * `hidden` rather than a height animation on purpose: these two are a hint and
 * an empty state, and neither is worth making the icons below them slide.
 */
function onlyWhenOpen(className: string): string {
  return `${className} hidden group-hover:block group-focus-within:block`;
}

/**
 * The band that separates the sections of the rail — "Personagens", "Inputs",
 * "Blocos".
 *
 * The same height open or shut, which is the point: nothing below it moves when
 * the rail widens. What changes is what the band *is*. Open, it is the name of
 * the section; shut, it is a hairline — still a separator, still saying "a
 * different kind of thing starts here", in the 20 pixels a rail of icons can
 * afford. The title used to say it in both states and be invisible in one of
 * them, which is a gap doing the work of a divider without looking like one.
 */
function RailSection({ label, first = false }: { label: string; first?: boolean }) {
  return (
    <div className={`relative mb-1 flex h-5 items-center px-4 ${first ? "" : "mt-3"}`}>
      <span
        aria-hidden
        className="absolute inset-x-4 h-px bg-line transition-opacity duration-150
                   group-hover:opacity-0 group-focus-within:opacity-0"
      />

      {/* Above the hairline it replaces, so the two never overlap mid-fade. */}
      <span
        className={revealed(
          "relative text-[11px] font-medium uppercase tracking-wide text-ink-faint",
        )}
      >
        {label}
      </span>
    </div>
  );
}
