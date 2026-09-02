import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { create } from "zustand";

import type { SceneDirective } from "@/lib/storyboard/scene-prompt";

export type SaveStatus = "saved" | "dirty" | "saving" | "failed";

/**
 * Why a save failed, because the two have different cures and only one of them
 * is the user's to apply.
 *
 * `conflict` means somebody else saved this project first — another tab. The
 * fix is to reload. `error` is everything else: a network that dropped, a server
 * that answered badly. The fix is to try again.
 */
export type SaveFailure = "conflict" | "error";

/**
 * Changes React Flow emits that actually alter the saved graph. Everything else
 * — measuring on mount, selecting, hovering — must not mark the canvas dirty,
 * otherwise simply opening a project would trigger a save.
 */
const PERSISTED_NODE_CHANGES = new Set(["add", "remove", "replace", "position"]);
const PERSISTED_EDGE_CHANGES = new Set(["add", "remove", "replace"]);

/**
 * A reference as a generating block stores it. Declared structurally rather than
 * imported from the node component: this file may not depend on a component, and
 * the shape is small enough that restating it is cheaper than the cycle.
 */
type StoredReference = {
  assetId: string;
  kind: string | null;
  instrucao: string;
  origem: string;
  /**
   * Set when this image arrived together with others that must be treated as
   * one thing. Every member of the group carries the same id, which is what
   * lets the strip show them as one card and the compiler describe them as one
   * object.
   *
   * Called `productId` until 10/08/2026, when a product's photos were the only
   * group there was. The grouping was never about products — it is about
   * several pictures of one subject — and naming it after its first user is how
   * the next user ends up with a second copy of it.
   */
  groupId?: string | null;
  /**
   * What to call the group, for the audit trail and the strip's frame.
   *
   * Stored rather than looked up because the thing it names is a card on this
   * canvas, and rewriting it is what `syncInputInto` already does on every edit
   * — so a rename reaches every block that holds it, in the same pass that
   * carries the photos. A copy that is rewritten is not a stale copy.
   */
  groupLabel?: string;
  /**
   * Which specialised input card handed this over, when being that card earns
   * an extra clause — "pose" or "folha". Null for everything else.
   */
  papel?: string | null;
  /**
   * The node type of the card that contributed it — "input-image",
   * "input-product", "input-pose", "input-sheet".
   *
   * Written for the interface, never for the model: it is what lets the strip
   * name the card a thumbnail came from instead of guessing. Guessing is what
   * it used to do, and it guessed "produto" for everything, because every input
   * stamps its node id as a group id and a group of one is still a group.
   *
   * Denormalised onto the reference for the same reason `groupLabel` is:
   * `syncInputInto` rewrites it on every edit, so it cannot go stale, and the
   * strip stays a component that renders what it is handed rather than one that
   * reaches into the graph. References saved before this field existed simply
   * have none, and reference-labels.ts reads them from `papel` and `kind`.
   */
  inputType?: string | null;
};

/**
 * How many more images a given generating block can accept.
 *
 * Registered by the canvas rather than computed here, because the answer needs
 * two things the graph does not contain: the model catalogue (a ceiling belongs
 * to a model) and the Arsenal (a mentioned character's sheet occupies a slot).
 * It used to be handed in as an argument at the moment of the wire; it is a
 * question the store can ask whenever it needs to now, which is the point.
 *
 * It became a question because a wire is no longer the only moment the ceiling
 * matters. An input card that already feeds a block can *grow*: a product goes
 * from three photos to five while the wire sits there. The room has to be
 * checkable at that moment too, and passing it in as an argument only works for
 * the moment somebody thought to pass it.
 */
export type CapacityResolver = (generatorId: string) => number;

/**
 * Why a wire was refused, for the block it was aimed at.
 *
 * Kept out of `nodes` on purpose: this is something that just happened, not part
 * of the document. Storing it in node data would mark the project dirty and save
 * a transient complaint into the workflow.
 */
export type CanvasNotice =
  | {
      nodeId: string;
      reason: "product_over_limit";
      /** How many slots the product needed, and how many there were. */
      needed: number;
      free: number;
    }
  /**
   * Um fio de ficha foi solto sobre um bloco cujo prompt **alguém escreveu**, e a
   * escrita está esperando resposta.
   *
   * A pendência mora aqui, com as recusas, e não no documento: enquanto ela
   * existe **a aresta ainda não existe**, e é isso que faz o *Cancelar* ser
   * gratuito — o canvas fica exatamente como estava, sem fio novo e sem um
   * caractere perdido. A emenda de 18/08/2026 pede confirmação com a perda
   * contada, e uma confirmação que já tivesse mudado o documento não seria uma.
   */
  | {
      nodeId: string;
      reason: "scene_overwrite";
      storyboardNodeId: string;
      ordem: number;
    }
  /**
   * Um roteiro e uma Máquina são **um para um**, e o segundo fio é recusado.
   *
   * Duas Máquinas sobre o mesmo storyboard disputariam o estado das mesmas
   * fichas — a mesma cena aprovada por uma e repetida pela outra, com o banco
   * dando razão a quem escreveu por último. E uma Máquina lendo dois roteiros
   * não saberia qual trilho desenhar.
   *
   * Recusa com frase, e não silêncio: um fio que se desenha e não faz nada é o
   * que o `onConnect` fazia com este par antes desta fase, e é a pior das três
   * respostas possíveis.
   */
  | {
      nodeId: string;
      reason: "board_taken";
      /** `roteiro` já regido por outra Máquina, ou `maquina` já regendo outro. */
      lado: "roteiro" | "maquina";
    };

/**
 * A spot near `candidate` that no node is already sitting on.
 *
 * Found on screen, not in review: "Usar como referência" placed its new block at
 * a fixed offset from the result, and when something was already there the new
 * block landed underneath it. The click did everything it promised and looked
 * like it had done nothing — the worst kind of bug, because the user's next move
 * is to click again.
 */
function freePosition(
  nodes: readonly Node[],
  candidate: { x: number; y: number },
): { x: number; y: number } {
  const OCCUPIED_WITHIN = 40;
  const STEP = 64;

  let position = candidate;

  // Bounded rather than `while (true)`: on a canvas dense enough for twenty
  // collisions in a row, one more perfect placement is not what is missing.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const taken = nodes.some(
      (node) =>
        Math.abs(node.position.x - position.x) < OCCUPIED_WITHIN &&
        Math.abs(node.position.y - position.y) < OCCUPIED_WITHIN,
    );

    if (!taken) return position;

    position = { x: position.x, y: position.y + STEP };
  }

  return position;
}

function readReferences(node: Node): StoredReference[] {
  return Array.isArray(node.data.references) ? (node.data.references as StoredReference[]) : [];
}

function withReferences(nodes: Node[], generatorId: string, references: StoredReference[]): Node[] {
  return nodes.map((node) =>
    node.id === generatorId ? { ...node, data: { ...node.data, references } } : node,
  );
}

/**
 * The two ends of a wire that means "attach something", when it means one.
 *
 * Two kinds of source feed a generating block: a Resultado, which is one image,
 * and an input card, which is everything it holds at once. Both are the same
 * gesture — a wire — and both end in the same list, which is why they are
 * recognised here together rather than in two places that could disagree about
 * what a wire does.
 */
function wiredPair(
  nodes: readonly Node[],
  connection: { source?: string | null; target?: string | null },
): { source: Node; generator: Node } | null {
  const source = nodes.find((node) => node.id === connection.source);
  const generator = nodes.find((node) => node.id === connection.target);

  if (!source || generator?.type !== "generator") return null;
  if (!ATTACHING_SOURCES.has(source.type ?? "")) return null;

  return { source, generator };
}

/**
 * The kinds of card whose wire into a generating block means "attach this".
 *
 * A set rather than a chain of comparisons because the list is about to grow by
 * two: the pose and sheet inputs are the same gesture with different cargo, and
 * a condition that has to be edited in four places to add a fourth is a
 * condition that will be edited in three.
 */
const ATTACHING_SOURCES = new Set([
  "result",
  "input-image",
  "input-product",
  "input-pose",
  "input-sheet",
]);

/**
 * What an input node contributes, read from its own stored state.
 *
 * Every image an input hands over carries `groupId = the input's node id`. For a
 * single picture that changes nothing about the prompt — a group of one reads
 * exactly as a lone image — and it buys the one thing matching by asset id
 * cannot: cutting *this* wire detaches *these* images, even when the same
 * picture arrived twice from two different cards.
 */
function inputReferences(node: Node): StoredReference[] {
  const instrucao = typeof node.data.instrucao === "string" ? node.data.instrucao : "";

  if (node.type === "input-product") {
    const assetIds = Array.isArray(node.data.assetIds)
      ? node.data.assetIds.filter((id): id is string => typeof id === "string")
      : [];

    const nome = typeof node.data.nome === "string" ? node.data.nome.trim() : "";

    // Every photo says "produto", and the chip is not a question the block gets
    // to ask again — otherwise one photo of a bikini could be labelled "cenário"
    // while the other two stayed "produto", and the compiled prompt would
    // describe two different things.
    return assetIds.map((assetId) => ({
      assetId,
      kind: "produto",
      instrucao,
      origem: "input",
      groupId: node.id,
      groupLabel: nome,
      inputType: node.type,
    }));
  }

  const assetId = node.data.assetId;

  if (typeof assetId !== "string") return [];

  // The specialised single-image inputs. Each pins the chip it implies — a pose
  // card is a pose, a sheet card is a sheet, and neither is a question the block
  // gets to ask again — and carries the role that earns it its own clause.
  if (node.type === "input-pose") {
    return [
      {
        assetId,
        kind: "pose",
        instrucao,
        origem: "input",
        groupId: node.id,
        papel: "pose",
        inputType: node.type,
      },
    ];
  }

  if (node.type === "input-sheet") {
    return [
      {
        assetId,
        kind: null,
        instrucao,
        origem: "input",
        groupId: node.id,
        papel: "folha",
        inputType: node.type,
      },
    ];
  }

  return [
    {
      assetId,
      kind: typeof node.data.kind === "string" ? node.data.kind : null,
      instrucao,
      origem: "input",
      groupId: node.id,
      inputType: node.type,
    },
  ];
}

/** The card types that hand images to a generating block from the canvas. */
const INPUT_SOURCES = new Set(["input-image", "input-product", "input-pose", "input-sheet"]);

/** Matches `w-56` on the input cards — used only to place one beside a block. */
const INPUT_NODE_WIDTH = 224;

/** Matches `w-[42rem]` on the video block — used only to place a card beside it. */
const VIDEO_NODE_WIDTH = 672;

/**
 * An input was edited; every block already holding it hears about it.
 *
 * Without this, the wire would be a photocopy: change the picture in the input
 * card and the block would keep generating with the old one, silently, having
 * been given a copy at the moment of connection. The card on the canvas and the
 * thumbnail in the strip have to be the same thing or the canvas is lying about
 * what it is going to do.
 *
 * The group is replaced **in place**, keeping the position it already occupied —
 * the numbers in the compiled prompt are positions in this list ("the product
 * shown in reference image 2"), and an edit that reshuffled them would silently
 * repoint every instruction after it.
 */
function syncInputInto(nodes: Node[], edges: readonly Edge[], input: Node): Node[] {
  const contributed = inputReferences(input);
  let next = nodes;

  for (const edge of edges) {
    if (edge.source !== input.id) continue;

    const generator = next.find((node) => node.id === edge.target);

    // O fio vivo alcança o bloco de vídeo também: trocar a foto do card troca o
    // still que vai ser animado. Sem isto, o card mostraria uma imagem e a
    // geração usaria outra — que é exatamente o "canvas que não é a verdade
    // sobre a geração" que a regra do fio vivo existe para impedir.
    if (generator?.type === VIDEO_TARGET) {
      next = next.map((node) =>
        node.id === generator.id
          ? {
              ...node,
              data: {
                ...node.data,
                sourceAssetId: contributed[0]?.assetId ?? null,
                sourceNodeId: contributed[0] ? input.id : null,
              },
            }
          : node,
      );

      continue;
    }

    if (generator?.type !== "generator") continue;

    const current = readReferences(generator);
    const first = current.findIndex((reference) => reference.groupId === input.id);

    // Wired but never attached — a connection drawn while the card was empty.
    // Now that it has something to give, this is where it gives it.
    if (first === -1) {
      if (contributed.length > 0) {
        next = withReferences(next, generator.id, [...current, ...contributed]);
      }

      continue;
    }

    const kept = current.filter((reference) => reference.groupId !== input.id);

    next = withReferences(next, generator.id, [
      ...kept.slice(0, first),
      ...contributed,
      ...kept.slice(first),
    ]);
  }

  return next;
}

/**
 * O bloco Gerar Vídeo recebe **um still**, não uma lista de referências.
 *
 * ---------------------------------------------------------------------------
 * Por que ele não reusa a máquina de referências
 * ---------------------------------------------------------------------------
 *
 * A lista de referências existe para responder "o que mais este bloco está
 * olhando" — e traz junto grupo, chip de papel, instrução por imagem, teto do
 * modelo e a chave que silencia. Nenhuma dessas perguntas existe aqui: o Kling
 * image-to-video recebe **uma** imagem, e ela não é uma referência entre outras,
 * é o primeiro quadro. Importar a máquina inteira daria ao bloco cinco controles
 * que não significam nada e um contador que sempre diria "1 de 1".
 *
 * A invariante 12 continua valendo, e é o que importa: **a imagem chega por
 * fio**, de um Input de Imagem ou de um Resultado. O que muda é onde ela é
 * guardada, não como ela entra.
 */
const VIDEO_TARGET = "video-generator";

/** As duas pontas de um fio que significa "anime esta imagem". */
function wiredStill(
  nodes: readonly Node[],
  connection: { source?: string | null; target?: string | null },
): { source: Node; block: Node; assetId: string } | null {
  const source = nodes.find((node) => node.id === connection.source);
  const block = nodes.find((node) => node.id === connection.target);

  if (!source || block?.type !== VIDEO_TARGET) return null;
  if (!ATTACHING_SOURCES.has(source.type ?? "")) return null;

  // A primeira imagem que o card oferece. Um Input de Produto com cinco fotos
  // entrega a primeira — e o bloco diz na tela qual foi, porque escolher em
  // silêncio seria animar uma foto que ninguém apontou.
  const contributed = inputReferences(source);
  const assetId =
    contributed[0]?.assetId ??
    (typeof source.data.assetId === "string" ? source.data.assetId : null);

  if (!assetId) return null;

  return { source, block, assetId };
}

function detachReference(nodes: Node[], edge: Edge): Node[] {
  // O fio do vídeo se desfaz limpando o still — a mesma regra do fio cortado
  // que leva a referência junto: gerar com uma imagem que a pessoa acabou de
  // ver-se desconectar é a única coisa que um canvas não pode fazer.
  const still = wiredStill(nodes, edge);

  if (still) {
    return nodes.map((node) =>
      node.id === still.block.id
        ? { ...node, data: { ...node.data, sourceAssetId: null, sourceNodeId: null } }
        : node,
    );
  }

  const pair = wiredPair(nodes, edge);

  if (!pair) return nodes;

  const current = readReferences(pair.generator);

  // Only what this wire attached. A picture chosen separately that happens to be
  // the same file was its own decision, and stays. A group leaves whole, for the
  // same reason it arrived whole.
  const next = INPUT_SOURCES.has(pair.source.type ?? "")
    ? current.filter((reference) => reference.groupId !== pair.source.id)
    : current.filter(
        (reference) =>
          !(reference.assetId === pair.source.data.assetId && reference.origem === "resultado"),
      );

  if (next.length === current.length) return nodes;

  return withReferences(nodes, pair.generator.id, next);
}

// ---------------------------------------------------------------------------
// A ponte do Roteiro — Ciclo 2 · Fase 4
// ---------------------------------------------------------------------------

/**
 * A corrente entre uma ficha e o bloco que ela rege **é a aresta**, e só ela.
 *
 * Não existe cópia no `data` do bloco, e a ausência é a decisão: o bloco de
 * vídeo guarda `sourceNodeId` porque precisa dizer *de qual card* veio o still
 * quando a mesma foto chega por dois caminhos, e aqui essa ambiguidade não
 * existe — a aresta já carrega as duas pontas **e** o número da cena, no
 * `sourceHandle` que o grafo salvo persiste.
 *
 * O dividendo aparece no corte: cortar o fio desfaz o vínculo inteiro porque não
 * sobrou nada em lugar nenhum para limpar, e o texto continua onde estava. Isso
 * **é** o "corte para assumir" — o prompt passa a ser de quem cortou, e nenhuma
 * linha de código precisou combinar isso com nenhuma outra.
 */
// ---------------------------------------------------------------------------
// A Máquina — Ciclo 3 · Fase 1
// ---------------------------------------------------------------------------

const MACHINE_TARGET = "machine";

/**
 * O handle por onde um roteiro INTEIRO entra na Máquina.
 *
 * Nomeado, e diferente dos `cena-N` do trilho, porque são gestos opostos: aquele
 * leva **uma** ficha a um bloco de imagem (a ponte da Fase 4), este entrega o
 * **roteiro todo** a quem vai reger as dez. Um handle só para os dois faria o
 * `onConnect` ter de adivinhar pela forma do alvo qual dos dois alguém quis.
 */
export const BOARD_HANDLE = "roteiro";

/**
 * De qual node de Roteiro esta Máquina lê — **pela aresta, e só por ela**.
 *
 * A Máquina não guarda id nenhum: o vínculo mora no documento salvo, que já
 * persiste `sourceHandle`, e sobrevive a um reload sem coluna nova. É a decisão
 * da Fase 4 do Ciclo 2 repetida onde ela vale de novo — *uma segunda cópia só
 * existiria para poder discordar da primeira*.
 *
 * Cortar o fio não apaga nada: as gerações continuam no banco ligadas às cenas,
 * e a Máquina apenas para de reger. Religar devolve o trilho inteiro, porque ele
 * nunca esteve nela.
 */
export function findGoverningBoard(
  edges: readonly Edge[],
  machineId: string,
): string | null {
  const edge = edges.find(
    (candidate) => candidate.target === machineId && candidate.targetHandle === BOARD_HANDLE,
  );

  return edge?.source ?? null;
}

/** As duas pontas de um fio que significa "reja este roteiro". */
function wiredBoard(
  nodes: readonly Node[],
  connection: { source?: string | null; target?: string | null; targetHandle?: string | null },
): { board: Node; machine: Node } | null {
  if (connection.targetHandle !== BOARD_HANDLE) return null;

  const board = nodes.find((node) => node.id === connection.source);
  const machine = nodes.find((node) => node.id === connection.target);

  if (board?.type !== SCENE_SOURCE || machine?.type !== MACHINE_TARGET) return null;

  return { board, machine };
}

const SCENE_HANDLE_PREFIX = "cena-";
const SCENE_SOURCE = "storyboard";
const GENERATOR_TARGET = "generator";

/** Matches `w-[46rem]` on the storyboard block — used only to place a block beside it. */
const STORYBOARD_NODE_WIDTH = 736;

/**
 * A altura do bloco de Roteiro, para pôr a Máquina **debaixo** dele.
 *
 * 554 é o card recém-criado e vazio — que é o estado exato no instante em que o
 * template roda —, e é também o **máximo** que ele alcança. Medido em 02/09/2026,
 * junto com a pergunta que ele responde: *"a Máquina não fica embaixo do Roteiro
 * depois que as fichas chegam?"*
 *
 * **Não fica, e o card ENCOLHE em vez de crescer.** A altura é a da coluna mais
 * alta, e quem dirige é sempre a coluna da pergunta, nunca o trilho de fichas:
 * vazio ela mede 491 contra 91 do trilho; com seis cenas, 481 contra 260 — os
 * 10 px de diferença são uma linha de dica que some depois que o roteiro existe.
 * Cada cena a mais custa 34 px ao trilho e ele não tem rolagem, mas precisaria de
 * **12** cenas para assumir a altura, e o teto do produto é **10**: projetado
 * para dez, o trilho dá 396 contra os 481 da pergunta.
 *
 * Então a folga abaixo só aumenta com o uso — de 72 px para 82 —, e nunca fecha.
 */
const STORYBOARD_NODE_HEIGHT = 554;

/** Matches `w-[54rem]` on the machine block — used only to centre the pair on screen. */
const MACHINE_NODE_WIDTH = 864;

/**
 * O quanto a Máquina anda para a direita para o fio sair **vertical**.
 *
 * A saída do roteiro inteiro fica embaixo do card e é centrada (736 / 2 = 368); a
 * entrada «Roteiro» da Máquina fica em cima e em `left: 18%` (0,18 × 864 = 155,5).
 * A diferença é o que alinha os dois handles na mesma vertical — sem ela o fio
 * sai torto e o par deixa de ler como uma coisa só, que é a metade do que este
 * template entrega.
 */
const MACHINE_HANDLE_OFFSET = 212;

/**
 * A Máquina recém-criada, **antes de qualquer ficha** — que é o estado dela no
 * instante em que o template roda. Só para enquadrar o par; ela cresce depois,
 * para baixo, onde não esbarra em nada.
 */
const MACHINE_NODE_HEIGHT = 143;

/** A folga entre os dois cards do par. A mesma da casa em todo lugar que empilha. */
const PAIR_GAP = 72;

/** O handle de saída da linha da cena N, no trilho de fichas. */
export function sceneHandleId(ordem: number): string {
  return `${SCENE_HANDLE_PREFIX}${ordem}`;
}

/** O caminho de volta: de que linha do trilho este fio saiu. */
export function sceneOrdemFromHandle(handleId: string | null | undefined): number | null {
  if (typeof handleId !== "string" || !handleId.startsWith(SCENE_HANDLE_PREFIX)) return null;

  const ordem = Number(handleId.slice(SCENE_HANDLE_PREFIX.length));

  return Number.isInteger(ordem) && ordem > 0 ? ordem : null;
}

/**
 * Qual cena rege este bloco, se alguma.
 *
 * Lido das arestas e de mais nada — que é o ponto de a corrente morar ali. O
 * `directive` vem nulo quando o fio aponta para uma cena que não está mais no
 * roteiro (alguém gerou por cima com menos cenas): estado real, e a tela diz
 * isso em vez de mostrar um número que não existe.
 */
export function findGoverningScene(
  edges: readonly Edge[],
  sceneSources: Readonly<Record<string, SceneDirective[]>>,
  generatorId: string,
): { storyboardNodeId: string; ordem: number; directive: SceneDirective | null } | null {
  for (const edge of edges) {
    if (edge.target !== generatorId) continue;

    const ordem = sceneOrdemFromHandle(edge.sourceHandle);

    if (ordem === null) continue;

    return {
      storyboardNodeId: edge.source,
      ordem,
      directive: sceneSources[edge.source]?.find((scene) => scene.ordem === ordem) ?? null,
    };
  }

  return null;
}

/** O bloco que esta cena já rege, se já rege algum. */
function governedBlock(
  nodes: readonly Node[],
  edges: readonly Edge[],
  storyboardNodeId: string,
  ordem: number,
): Node | undefined {
  const edge = edges.find(
    (entry) =>
      entry.source === storyboardNodeId && sceneOrdemFromHandle(entry.sourceHandle) === ordem,
  );

  if (!edge) return undefined;

  const block = nodes.find((node) => node.id === edge.target);

  return block?.type === GENERATOR_TARGET ? block : undefined;
}

/** O que a ficha manda para o bloco, e nada além disso. */
function directiveData(directive: SceneDirective): Record<string, unknown> {
  return { prompt: directive.prompt, anguloKey: directive.anguloKey };
}

function matchesDirective(block: Node, directive: SceneDirective): boolean {
  return (
    block.data.prompt === directive.prompt &&
    (block.data.anguloKey ?? null) === directive.anguloKey
  );
}

/**
 * As fichas mudaram; todo bloco que uma delas rege ouve.
 *
 * Irmã de `syncInputInto`, e pela mesma razão registrada lá: a regra é "o fio é
 * vivo", e uma regra que cada componente precisa lembrar de cumprir é uma regra
 * que um componente vai esquecer.
 *
 * **Com uma dureza que a irmã não precisa ter: devolve `null` quando nada
 * mudou.** Esta função roda a cada leitura do trilho — inclusive na montagem do
 * bloco —, e um `set` incondicional faria *abrir um projeto* marcá-lo como sujo
 * e disparar autosave. Um documento que se altera por ter sido aberto é um
 * documento em que não se pode confiar.
 */
function syncScenes(
  nodes: Node[],
  edges: readonly Edge[],
  storyboardNodeId: string,
  scenes: readonly SceneDirective[],
): Node[] | null {
  let next: Node[] = nodes;
  let changed = false;

  for (const edge of edges) {
    if (edge.source !== storyboardNodeId) continue;

    const ordem = sceneOrdemFromHandle(edge.sourceHandle);

    if (ordem === null) continue;

    const directive = scenes.find((scene) => scene.ordem === ordem);

    // O fio aponta para uma cena que não existe mais. O prompt fica como está:
    // apagá-lo seria destruir a única cópia de um texto por causa de uma ficha
    // que sumiu, e a tela já sabe dizer que a cena não está mais no roteiro.
    if (!directive) continue;

    const block = next.find((node) => node.id === edge.target);

    if (block?.type !== GENERATOR_TARGET || matchesDirective(block, directive)) continue;

    next = next.map((node) =>
      node.id === block.id ? { ...node, data: { ...node.data, ...directiveData(directive) } } : node,
    );
    changed = true;
  }

  return changed ? next : null;
}

/** As duas pontas de um fio que significa "esta cena dirige este bloco". */
function wiredScene(
  nodes: readonly Node[],
  sceneSources: Readonly<Record<string, SceneDirective[]>>,
  connection: { source?: string | null; target?: string | null; sourceHandle?: string | null },
): { source: Node; block: Node; ordem: number; directive: SceneDirective } | null {
  const source = nodes.find((node) => node.id === connection.source);
  const block = nodes.find((node) => node.id === connection.target);
  const ordem = sceneOrdemFromHandle(connection.sourceHandle);

  if (source?.type !== SCENE_SOURCE || block?.type !== GENERATOR_TARGET || ordem === null) {
    return null;
  }

  const directive = sceneSources[source.id]?.find((scene) => scene.ordem === ordem);

  return directive ? { source, block, ordem, directive } : null;
}

function sameDirectives(
  current: readonly SceneDirective[] | undefined,
  next: readonly SceneDirective[],
): boolean {
  return (
    current !== undefined &&
    current.length === next.length &&
    current.every(
      (scene, index) =>
        scene.ordem === next[index].ordem &&
        scene.prompt === next[index].prompt &&
        scene.anguloKey === next[index].anguloKey &&
        scene.produto === next[index].produto,
    )
  );
}

type CanvasState = {
  projectId: string | null;
  nodes: Node[];
  edges: Edge[];
  version: number;
  saveStatus: SaveStatus;
  /** Set only while saveStatus is "failed"; null the rest of the time. */
  saveFailure: SaveFailure | null;
  /** Bumped by every persisted change; lets a save detect edits made while it ran. */
  revision: number;
  /**
   * The last thing the canvas refused to do, and to whom. Never persisted — see
   * CanvasNotice. Cleared by the next edit, because an edit is the answer.
   */
  notice: CanvasNotice | null;
  /** How the store asks a block how much room it has left. See CapacityResolver. */
  capacityResolver: CapacityResolver;
  /**
   * As fichas de cada node de Roteiro, como o canvas as enxerga.
   *
   * Fora do documento salvo de propósito: as fichas moram em `storyboards` +
   * `storyboard_scenes`, achadas por `(project_id, node_id)`, e este dicionário é
   * só a cópia que o canvas precisa ter à mão para responder duas perguntas sem
   * ir ao banco — *"o que esta cena manda para o bloco?"* (o ▸ e o religar) e
   * *"esta cena tem produto?"* (o aviso). Publicado pelo próprio bloco de
   * Roteiro a cada leitura; zerado ao abrir outro projeto.
   */
  sceneSources: Record<string, SceneDirective[]>;

  loadWorkflow: (input: {
    projectId: string;
    nodes: Node[];
    edges: Edge[];
    version: number;
  }) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  /**
   * A wire, drawn.
   *
   * Takes more than React Flow's own `OnConnect` because a wire from a product
   * card is not just a line: it attaches every photo of that product at once,
   * and it has to be able to say no. The caller supplies what the graph cannot
   * know — which product this is, and how much room the block has left — and
   * this decides.
   */
  onConnect: (connection: Connection) => void;
  /**
   * Teaches the store how to ask for a block's remaining room. Called by the
   * canvas whenever the catalogue or the Arsenal changes, so the answer is
   * never stale.
   */
  setCapacityResolver: (resolve: CapacityResolver) => void;
  /**
   * The tightest room among the blocks this input card feeds, or null when it
   * feeds none.
   *
   * The tightest and not the average: a card handing five photos to two blocks
   * has to fit in **both**, and the one with less room is the one that decides.
   * Read by an input card to refuse a sixth photo *before* it is chosen — which
   * is where this product always puts a ceiling, because a ceiling discovered
   * afterwards is not a ceiling.
   */
  freeForInput: (inputNodeId: string) => number | null;
  /**
   * Edits a node's own stored state — the prompt someone is typing, the format
   * they picked, the references they attached.
   *
   * React Flow has no change type for this, and it is emphatically a change to
   * the saved graph, so it marks the canvas dirty itself. Without it, everything
   * a generation node knows would be lost on reload.
   */
  updateNodeData: (id: string, patch: Record<string, unknown>) => void;
  /**
   * "Usar no fluxo": põe uma imagem no canvas como cartão, ligada ao bloco que a
   * fez — **e nunca duas vezes a mesma**.
   *
   * Chamada por clique, não por geração *(13/08/2026, a inversão do cartão)*.
   * Antes, toda geração bem-sucedida caía aqui sozinha, e o canvas juntava um
   * cartão por tentativa: quatro cliques de quantidade 4 plantavam dezesseis
   * caixas que ninguém pediu, sobre um canvas que existe para desenhar o fluxo e
   * não para arquivar tentativas. O acervo nunca dependeu disso — ele mora no
   * banco, e a coluna de resultados do bloco lê de lá.
   *
   * A recusa a duplicar é a mesma regra que `duplicateNode` já aplica ao cartão
   * Resultado: dois cartões da mesma imagem seriam dois nomes para um arquivo só.
   * Quando já existe, ele é **destacado** em vez de recriado — e quem chamou
   * recebe o id para levar a tela até ele, porque um clique que faz a coisa certa
   * fora da vista é indistinguível de um clique que não fez nada.
   */
  attachResultCard: (input: {
    sourceNodeId: string;
    data: Record<string, unknown>;
  }) => { id: string; created: boolean } | null;
  /**
   * A new input card, to the left of a generating block and already wired to it.
   *
   * This is what the "+" in the reference strip does now. It used to attach an
   * image straight into the block, which made the strip a *door* as well as a
   * mirror — and a door that produced references no card on the canvas
   * accounted for. Every reference has a node now, without exception, so the
   * strip only ever reflects what is already out there.
   *
   * The id comes from the caller because the caller needs it: the next thing
   * that happens is the picker opening for this exact card.
   */
  addInputNode: (input: { id: string; type: string; generatorId: string }) => void;
  /**
   * "Continuar deste vídeo": o capítulo seguinte, pronto para dirigir.
   *
   * Põe no canvas **o par** — um Input de Imagem com o último quadro e um Gerar
   * Vídeo já ligado a ele —, à direita do bloco que produziu o clipe. É o
   * `addChainedGenerator` aplicado ao vídeo, e a frase dele é o argumento
   * inteiro: *o arrastar que qualquer um faria à mão, como um clique — que é o
   * que transforma uma pilha de tentativas num fluxo.*
   *
   * **Garante o par, nunca duplica o que já existe.** Três desfechos:
   *
   *   `both`   nada existia — nascem o card e o bloco
   *   `video`  o card já estava lá sem nada adiante (alguém apagou o bloco, ou
   *            o card veio de outro caminho) — nasce só o bloco que faltava
   *   `none`   o par inteiro já está de pé — os dois são destacados, e quem
   *            chamou recebe os ids para levar a tela até eles
   */
  addContinuation: (input: { videoNodeId: string; assetId: string }) => {
    inputId: string;
    videoId: string;
    created: "both" | "video" | "none";
  } | null;
  /**
   * As fichas deste node de Roteiro, publicadas no canvas — **e o fio vivo
   * correndo junto**.
   *
   * Um gesto só, e não dois, porque são a mesma notícia: as fichas mudaram. Quem
   * chama é o bloco de Roteiro, depois de cada leitura do banco — a montagem e
   * cada aviso do Realtime.
   *
   * Não marca o canvas como sujo quando nada mudou. Ver `syncScenes`.
   */
  publishScenes: (input: { storyboardNodeId: string; scenes: SceneDirective[] }) => void;
  /**
   * O ▸ da linha do trilho: esta cena, virando bloco.
   *
   * Põe um Gerar Imagem **à direita** do bloco de Roteiro, já preenchido com o
   * prompt e o ângulo da ficha, já ligado à linha dela, selecionado — o padrão do
   * `addContinuation`, aplicado a uma ficha em vez de a um último quadro.
   *
   * **Garante um bloco por cena, nunca dois.** Quando a cena já rege um, ele é
   * apenas **destacado** e quem chamou recebe o id para levar a tela até lá:
   * criar um segundo daria à mesma ficha dois donos, e a próxima edição dela
   * teria de escolher um.
   */
  addSceneBlock: (input: {
    storyboardNodeId: string;
    ordem: number;
  }) => { id: string; created: boolean } | null;
  /**
   * O template «Fluxo de Storyboard»: Roteiro + Máquina, conectados, num clique.
   *
   * **Não é um tipo novo de node** — são os dois blocos de sempre, com o fio que
   * qualquer um desenharia à mão. Duplicar, remover e religar continuam
   * funcionando porque não há nada de especial neles depois que nascem; o que o
   * template encurta é a **montagem**, que a Fase 1 mediu em três gestos
   * (clicar na prateleira · enquadrar · arrastar o fio).
   *
   * Um `set` só, de propósito: os dois nodes e a aresta sobem numa revisão
   * única, então o debounce do autosave grava **os três juntos** em vez de
   * disparar três vezes.
   *
   * Devolve os dois ids e a caixa que os contém, para quem chamou levar a tela
   * até lá — um clique que faz a coisa certa fora da vista parece um clique que
   * não fez nada.
   */
  addStoryboardMachine: (input: {
    /** Onde a pessoa está olhando, em coordenadas de fluxo. O par nasce centrado nisto. */
    center: { x: number; y: number };
  }) => {
    roteiroId: string;
    machineId: string;
    bounds: { x: number; y: number; width: number; height: number };
  };
  /**
   * "Assumir o prompt": o corte, pelo botão.
   *
   * Tira só a aresta. O texto fica onde está — e é isso que o gesto significa:
   * dali em diante o prompt é de quem cortou. Religar devolve o comando à ficha.
   */
  cutSceneWire: (input: { generatorId: string }) => void;
  /**
   * "Substituir": a resposta afirmativa à pergunta da emenda de 18/08/2026.
   *
   * Só aqui a aresta nasce e o prompt é reescrito. Enquanto a pergunta esteve na
   * tela, o documento não tinha mudado — então *Cancelar* é `clearNotice`, e não
   * um desfazer.
   */
  confirmSceneOverwrite: () => void;
  /**
   * A second copy of a block, beside the first.
   *
   * For a generating block this is the point of the whole action: prompt, model,
   * format, scene adjustments and attached references all come along, because
   * they are the question. What it produced is the answer, and answers are not
   * copied — the clone starts with no result and no wire to one.
   *
   * For a character or a product it duplicates only the card. The entity behind
   * it is one entity, and two cards pointing at it is a layout convenience, not
   * a second product.
   */
  duplicateNode: (id: string) => void;
  /**
   * "Usar como referência": a new generating block, to the right of this result,
   * already wired to it and already holding it as a reference. The drag anyone
   * could do by hand, as one click — which is what turns a pile of attempts into
   * a flow.
   */
  addChainedGenerator: (input: { resultNodeId: string }) => void;
  /**
   * Takes one attached image off a generating block — and, when that image
   * arrived through a wire, takes the wire with it.
   *
   * The pair has to be symmetric: cutting the wire already removed the
   * reference, so removing the reference has to remove the wire, or the canvas
   * ends up drawing a connection that no longer means anything.
   */
  removeReference: (input: { nodeId: string; index: number }) => void;
  /** For edits React Flow reports outside node/edge changes, such as panning. */
  markDirty: () => void;
  /** Puts away a refusal the user has read. */
  clearNotice: () => void;
  setSaveStatus: (status: SaveStatus) => void;
  setSaveFailed: (failure: SaveFailure) => void;
  markSaved: (input: { version: number; revision: number }) => void;
};

/**
 * Until the canvas registers the real one, nothing has room.
 *
 * Zero rather than a generous guess: the only moments this is still in place
 * are before the first render, and refusing an attachment that early is
 * recoverable in one click while allowing one that turns out not to fit is a
 * paid refusal from the provider.
 */
const NO_CAPACITY: CapacityResolver = () => 0;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  projectId: null,
  nodes: [],
  edges: [],
  version: 1,
  saveStatus: "saved",
  saveFailure: null,
  revision: 0,
  notice: null,
  // Deliberately outside everything loadWorkflow resets: this is how the store
  // asks a question, not part of the document it holds.
  capacityResolver: NO_CAPACITY,
  sceneSources: {},

  loadWorkflow: ({ projectId, nodes, edges, version }) =>
    set({
      projectId,
      nodes,
      edges,
      version,
      saveStatus: "saved",
      saveFailure: null,
      revision: 0,
      notice: null,
      // As fichas do projeto que ficou para trás não valem para este. Cada bloco
      // de Roteiro republica as suas na montagem, então zerar não perde nada —
      // e não zerar deixaria o canvas respondendo sobre cenas de outro projeto.
      sceneSources: {},
    }),

  onNodesChange: (changes) => {
    const persisted = changes.some((change) =>
      PERSISTED_NODE_CHANGES.has(change.type),
    );

    const removed = new Set(
      changes
        .filter((change) => change.type === "remove")
        .map((change) => change.id),
    );

    set((state) => {
      // A card that leaves takes its wires with it — and, with them, whatever
      // those wires had attached.
      //
      // React Flow only removes the node; edges pointing at nothing are simply
      // not drawn, so this was invisible and accumulated in the saved graph.
      // It stopped being invisible the moment inputs became cards people
      // delete: removing an input card while its images stayed in the block
      // would leave references nothing on the canvas accounts for — exactly
      // the state "every reference has a node" exists to make impossible.
      let nodes = state.nodes;
      let edges = state.edges;

      if (removed.size > 0) {
        const orphaned = edges.filter(
          (edge) => removed.has(edge.source) || removed.has(edge.target),
        );

        for (const edge of orphaned) {
          nodes = detachReference(nodes, edge);
        }

        edges = edges.filter((edge) => !orphaned.includes(edge));
      }

      return {
        nodes: applyNodeChanges(changes, nodes),
        edges,
        revision: persisted ? state.revision + 1 : state.revision,
        saveStatus: persisted ? "dirty" : state.saveStatus,
      };
    });
  },

  onEdgesChange: (changes) => {
    const persisted = changes.some((change) =>
      PERSISTED_EDGE_CHANGES.has(change.type),
    );

    set((state) => {
      // A cut wire has to take its reference with it. Leaving the attachment
      // behind would mean generating — and paying — with an image the user just
      // watched themselves disconnect.
      const removed = changes
        .filter((change) => change.type === "remove")
        .map((change) => state.edges.find((edge) => edge.id === change.id))
        .filter((edge): edge is Edge => edge !== undefined);

      let nodes = state.nodes;

      for (const edge of removed) {
        nodes = detachReference(nodes, edge);
      }

      return {
        nodes,
        edges: applyEdgeChanges(changes, state.edges),
        revision: persisted ? state.revision + 1 : state.revision,
        saveStatus: persisted ? "dirty" : state.saveStatus,
      };
    });
  },

  setCapacityResolver: (resolve) => set({ capacityResolver: resolve }),

  freeForInput: (inputNodeId) => {
    const state = get();

    const rooms = state.edges
      .filter((edge) => edge.source === inputNodeId)
      .map((edge) => state.nodes.find((node) => node.id === edge.target))
      .filter((node): node is Node => node?.type === "generator")
      .map((generator) => state.capacityResolver(generator.id));

    return rooms.length === 0 ? null : Math.min(...rooms);
  },

  onConnect: (connection) =>
    set((state) => {
      // Wiring something into a generating block *is* attaching a reference —
      // the drag is the gesture, the list in the node is the state. Two ways in
      // (the picker and the wire), one place where what is attached lives.
      const pair = wiredPair(state.nodes, connection);

      const connected = {
        edges: addEdge(connection, state.edges),
        revision: state.revision + 1,
        saveStatus: "dirty" as const,
        notice: null,
      };

      /*
        O fio que entrega um roteiro inteiro à Máquina — Ciclo 3 · Fase 1.

        Resolvido ANTES do fio de ficha porque os dois saem do mesmo node de
        Roteiro e só o `targetHandle` os distingue: perguntar pelo mais
        específico primeiro é a mesma ordem que o `wiredScene` já usa.
      */
      const board = wiredBoard(state.nodes, connection);

      if (board) {
        const recusa = { edges: state.edges, revision: state.revision, saveStatus: state.saveStatus };

        // Este roteiro já é regido por outra Máquina?
        const jaRegido = state.edges.some(
          (edge) =>
            edge.source === board.board.id &&
            edge.targetHandle === BOARD_HANDLE &&
            edge.target !== board.machine.id,
        );

        if (jaRegido) {
          return {
            ...recusa,
            nodes: state.nodes,
            notice: { nodeId: board.machine.id, reason: "board_taken" as const, lado: "roteiro" as const },
          };
        }

        // E esta Máquina já rege outro roteiro? Religar a mesma é legítimo — é o
        // gesto de reconectar o que se cortou —, então só um roteiro DIFERENTE
        // é recusa.
        const jaOcupada = state.edges.some(
          (edge) =>
            edge.target === board.machine.id &&
            edge.targetHandle === BOARD_HANDLE &&
            edge.source !== board.board.id,
        );

        if (jaOcupada) {
          return {
            ...recusa,
            nodes: state.nodes,
            notice: { nodeId: board.machine.id, reason: "board_taken" as const, lado: "maquina" as const },
          };
        }

        // Nada a escrever no `data`: a aresta É o vínculo, e a Máquina lê o
        // trilho do banco a partir dela.
        return { ...connected, nodes: state.nodes };
      }

      /*
        O fio de uma ficha — religar, que é devolver o comando à cena.

        Resolvido antes dos outros dois porque ele se identifica pelo
        `sourceHandle` e nenhum dos outros usa handle nomeado: perguntar primeiro
        é mais barato que descartar depois.

        **E é o único ramo que pode não fazer nada e não ser um erro.** Quando o
        bloco tem um prompt que alguém escreveu, a aresta não nasce aqui: nasce
        no *Substituir*, se ele vier. A emenda de 18/08/2026 pede a perda
        contada antes, e contar depois de ter substituído não é contar.
      */
      const scene = wiredScene(state.nodes, state.sceneSources, connection);

      if (scene) {
        const current = typeof scene.block.data.prompt === "string" ? scene.block.data.prompt : "";
        // Vazio não tem o que perder, e idêntico não muda um caractere. Perguntar
        // nos dois seria um diálogo sobre coisa nenhuma — e um diálogo que
        // aparece à toa é um diálogo que se aprende a fechar sem ler.
        const wouldLose = current.trim() !== "" && current !== scene.directive.prompt;

        if (wouldLose) {
          return {
            nodes: state.nodes,
            edges: state.edges,
            revision: state.revision,
            saveStatus: state.saveStatus,
            notice: {
              nodeId: scene.block.id,
              reason: "scene_overwrite" as const,
              storyboardNodeId: scene.source.id,
              ordem: scene.ordem,
            },
          };
        }

        return {
          ...connected,
          nodes: state.nodes.map((node) =>
            node.id === scene.block.id
              ? { ...node, data: { ...node.data, ...directiveData(scene.directive) } }
              : node,
          ),
        };
      }

      // O fio que anima uma imagem. Resolvido antes do de referências porque os
      // dois são o mesmo gesto com destinos diferentes, e só um deles casa.
      const still = wiredStill(state.nodes, connection);

      if (still) {
        return {
          ...connected,
          nodes: state.nodes.map((node) =>
            node.id === still.block.id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    sourceAssetId: still.assetId,
                    // Guardado para o bloco poder dizer de onde a imagem veio, e
                    // para o fio vivo saber qual card reescrever quando alguém o
                    // editar. Um id de asset sozinho não responde "de qual card?"
                    // quando a mesma foto chega por dois.
                    sourceNodeId: still.source.id,
                  },
                }
              : node,
          ),
        };
      }

      if (!pair) return { ...connected, nodes: state.nodes };

      const current = readReferences(pair.generator);
      // Asked at the moment of the wire, from the same function every other
      // caller asks — instead of being handed a number computed somewhere else
      // and possibly a render ago.
      const free = state.capacityResolver(pair.generator.id);

      if (INPUT_SOURCES.has(pair.source.type ?? "")) {
        const contributed = inputReferences(pair.source);

        // Nothing to hand over, or already handed over: the wire is drawn and
        // nothing else happens. A second wire is a gesture already made, and a
        // card with no image yet will deliver the moment it has one.
        if (
          contributed.length === 0 ||
          current.some((reference) => reference.groupId === pair.source.id)
        ) {
          return { ...connected, nodes: state.nodes };
        }

        // A group arrives whole or not at all. Half of a product is a front view
        // with no label — a reference that looks attached and cannot say what
        // the back of the garment looks like. Better refused, in words, before
        // the wire exists, than discovered as a bad image after paying.

        if (contributed.length > free) {
          return {
            nodes: state.nodes,
            edges: state.edges,
            revision: state.revision,
            saveStatus: state.saveStatus,
            notice: {
              nodeId: pair.generator.id,
              reason: "product_over_limit" as const,
              needed: contributed.length,
              free,
            },
          };
        }

        return {
          ...connected,
          nodes: withReferences(state.nodes, pair.generator.id, [...current, ...contributed]),
        };
      }

      const assetId = pair.source.data.assetId;

      if (
        typeof assetId !== "string" ||
        current.some((reference) => reference.assetId === assetId)
      ) {
        return { ...connected, nodes: state.nodes };
      }

      return {
        ...connected,
        nodes: withReferences(state.nodes, pair.generator.id, [
          ...current,
          { assetId, kind: null, instrucao: "", origem: "resultado", inputType: "result" },
        ]),
      };
    }),

  updateNodeData: (id, patch) =>
    set((state) => {
      let nodes = state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...patch } } : node,
      );

      // Editing an input is editing every block it feeds. Done here rather than
      // in the input card so it cannot be forgotten by the next input type: the
      // rule is "a wire is live", and a rule that each card has to remember is a
      // rule that one card will not.
      const edited = nodes.find((node) => node.id === id);

      if (edited && INPUT_SOURCES.has(edited.type ?? "")) {
        nodes = syncInputInto(nodes, state.edges, edited);
      }

      return {
        nodes,
        revision: state.revision + 1,
        saveStatus: "dirty",
        // Any edit answers the refusal — a shorter prompt, a bigger model, one
        // reference fewer. Leaving it on screen would be nagging about a problem
        // the user just solved.
        notice: null,
      };
    }),

  attachResultCard: ({ sourceNodeId, data }) => {
    const state = get();
    const source = state.nodes.find((node) => node.id === sourceNodeId);
    const assetId = typeof data.assetId === "string" ? data.assetId : null;

    if (!source || !assetId) return null;

    // Casada por asset e não por (asset, bloco): uma imagem é produzida por um
    // bloco só, e procurar pelos dois deixaria passar justamente o cartão que um
    // grafo antigo criou sozinho — que é o mesmo cartão, com a mesma imagem.
    const existing = state.nodes.find(
      (node) => node.type === "result" && node.data.assetId === assetId,
    );

    if (existing) {
      // Selecionar não é editar: a seleção é estado de vista, e marcar o canvas
      // como sujo por causa dela faria "olhar onde está o cartão" gravar o
      // projeto. É a mesma razão pela qual `select` fica fora de
      // PERSISTED_NODE_CHANGES.
      set({
        nodes: state.nodes.map((node) =>
          node.selected === (node.id === existing.id)
            ? node
            : { ...node, selected: node.id === existing.id },
        ),
      });

      return { id: existing.id, created: false };
    }

    // Cascaded down and to the right of the block that made it, offset by how
    // many results that block already produced — so a second attempt lands
    // beside the first instead of on top of it, and the pair reads as a
    // sequence of tries rather than one image that changed.
    const siblings = state.nodes.filter(
      (node) => node.type === "result" && node.data.sourceNodeId === sourceNodeId,
    ).length;

    const width = source.measured?.width ?? source.width ?? 380;
    const id = crypto.randomUUID();

    set({
      nodes: [
        ...state.nodes.map((node) => (node.selected ? { ...node, selected: false } : node)),
        {
          id,
          type: "result",
          // The sibling offset keeps a sequence of attempts readable as a
          // sequence; freePosition keeps it from landing on an unrelated block
          // that happens to be parked there.
          position: freePosition(state.nodes, {
            x: source.position.x + width + 72,
            y: source.position.y + siblings * 48,
          }),
          // Nasce selecionado: é o cartão que a pessoa acabou de pedir, e num
          // canvas com dez cartões o novo precisa se identificar sozinho.
          selected: true,
          data: { ...data, sourceNodeId },
        },
      ],
      edges: [
        ...state.edges,
        { id: `${sourceNodeId}->${id}`, source: sourceNodeId, target: id },
      ],
      revision: state.revision + 1,
      saveStatus: "dirty",
    });

    return { id, created: true };
  },

  addContinuation: ({ videoNodeId, assetId }) => {
    const state = get();
    const video = state.nodes.find((node) => node.id === videoNodeId);

    if (!video) return null;

    // O card do quadro, se ele já existe. Casado por asset e não por bloco: a
    // imagem é um arquivo só, e dois cards apontando para ela seriam dois nomes
    // para a mesma coisa — a regra que o `attachResultCard` já aplica.
    const card = state.nodes.find(
      (node) => node.type === "input-image" && node.data.assetId === assetId,
    );

    // E o bloco que ele já alimenta, se alimenta algum.
    const downstream = card
      ? state.nodes.find(
          (node) =>
            node.type === VIDEO_TARGET &&
            state.edges.some((edge) => edge.source === card.id && edge.target === node.id),
        )
      : undefined;

    // O par inteiro já está de pé: destacar é tudo que resta a fazer.
    //
    // Selecionar não marca o canvas como sujo — seleção é estado de vista, e
    // olhar onde uma coisa está não pode gravar o projeto.
    if (card && downstream) {
      const highlighted = new Set([card.id, downstream.id]);

      set({
        nodes: state.nodes.map((node) =>
          node.selected === highlighted.has(node.id)
            ? node
            : { ...node, selected: highlighted.has(node.id) },
        ),
      });

      return { inputId: card.id, videoId: downstream.id, created: "none" };
    }

    const videoWidth = video.measured?.width ?? video.width ?? VIDEO_NODE_WIDTH;

    // O card nasce **à direita** do bloco de vídeo, ao contrário do
    // `addInputNode`. Um input comum nasce à esquerda porque é desse lado que o
    // fio dele chega; este nasce à direita porque é o que veio **depois** — e
    // assim o canvas passa a ser lido na ordem em que a história é contada.
    const inputId = card?.id ?? crypto.randomUUID();
    const inputPosition =
      card?.position ??
      freePosition(state.nodes, {
        x: video.position.x + videoWidth + 72,
        y: video.position.y,
      });

    const nextNodes: Node[] = card
      ? [...state.nodes]
      : [
          ...state.nodes,
          {
            id: inputId,
            type: "input-image",
            position: inputPosition,
            data: { assetId, kind: null, instrucao: "" },
          },
        ];

    const chapterId = crypto.randomUUID();

    nextNodes.push({
      id: chapterId,
      type: VIDEO_TARGET,
      position: freePosition(nextNodes, {
        x: inputPosition.x + INPUT_NODE_WIDTH + 72,
        y: video.position.y,
      }),
      data: {
        // O modelo vem junto porque é a mesma história; o **prompt não**, porque
        // ele era a direção daquela cena e o próximo capítulo é outra. É a
        // doutrina do Duplicar — copia a pergunta, nunca a resposta — aplicada
        // a uma continuação em vez de a uma cópia.
        modelId: video.data.modelId ?? null,
        // Escrito à mão, e é a armadilha desta função: construir node e aresta
        // pelo store **não passa pelo `onConnect`**, então nada preencheria o
        // still sozinho. É o mesmo cuidado que faz `addChainedGenerator`
        // escrever as `references` explicitamente.
        sourceAssetId: assetId,
        sourceNodeId: inputId,
      },
    });

    set({
      // Nascem selecionados: são as duas peças que a pessoa acabou de pedir, e
      // num canvas com vinte cards as novas precisam se identificar sozinhas.
      nodes: nextNodes.map((node) => {
        const wanted = node.id === inputId || node.id === chapterId;

        return node.selected === wanted ? node : { ...node, selected: wanted };
      }),
      edges: [
        ...state.edges,
        { id: `${inputId}->${chapterId}`, source: inputId, target: chapterId },
      ],
      revision: state.revision + 1,
      saveStatus: "dirty",
      notice: null,
    });

    return { inputId, videoId: chapterId, created: card ? "video" : "both" };
  },

  addInputNode: ({ id, type, generatorId }) =>
    set((state) => {
      const generator = state.nodes.find((node) => node.id === generatorId);

      if (!generator) return state;

      return {
        nodes: [
          ...state.nodes,
          {
            id,
            type,
            // To the left, because that is the side its wire arrives on. A card
            // that fed a block from the right would be drawing a line backwards
            // across the one it feeds.
            position: freePosition(state.nodes, {
              x: generator.position.x - INPUT_NODE_WIDTH - 72,
              y: generator.position.y,
            }),
            data: {},
          },
        ],
        edges: [...state.edges, { id: `${id}->${generatorId}`, source: id, target: generatorId }],
        revision: state.revision + 1,
        saveStatus: "dirty",
        notice: null,
      };
    }),

  publishScenes: ({ storyboardNodeId, scenes }) =>
    set((state) => {
      const known = sameDirectives(state.sceneSources[storyboardNodeId], scenes);
      const nodes = syncScenes(state.nodes, state.edges, storyboardNodeId, scenes);

      // Nada mudou nem no dicionário nem nos blocos: sair sem tocar em `revision`
      // é o que impede que abrir um projeto o marque como sujo.
      if (known && !nodes) return state;

      return {
        sceneSources: known
          ? state.sceneSources
          : { ...state.sceneSources, [storyboardNodeId]: scenes },
        ...(nodes
          ? { nodes, revision: state.revision + 1, saveStatus: "dirty" as const }
          : {}),
      };
    }),

  addSceneBlock: ({ storyboardNodeId, ordem }) => {
    const state = get();
    const board = state.nodes.find((node) => node.id === storyboardNodeId);
    const directive = state.sceneSources[storyboardNodeId]?.find((scene) => scene.ordem === ordem);

    if (!board || !directive) return null;

    const existing = governedBlock(state.nodes, state.edges, storyboardNodeId, ordem);

    // Já está de pé: destacar é tudo que resta a fazer. Selecionar não marca o
    // canvas como sujo — seleção é estado de vista, e olhar onde uma coisa está
    // não pode gravar o projeto.
    if (existing) {
      set({
        nodes: state.nodes.map((node) =>
          node.selected === (node.id === existing.id)
            ? node
            : { ...node, selected: node.id === existing.id },
        ),
      });

      return { id: existing.id, created: false };
    }

    const width = board.measured?.width ?? board.width ?? STORYBOARD_NODE_WIDTH;
    const id = crypto.randomUUID();

    set({
      nodes: [
        ...state.nodes.map((node) => (node.selected ? { ...node, selected: false } : node)),
        {
          id,
          type: GENERATOR_TARGET,
          // Escalonado pela ordem da cena, como `attachResultCard` faz com as
          // tentativas: a cena 5 nasce mais abaixo que a 1, e três blocos de um
          // mesmo roteiro leem como a sequência que são em vez de uma pilha.
          position: freePosition(state.nodes, {
            x: board.position.x + width + 72,
            y: board.position.y + (ordem - 1) * 56,
          }),
          // Nasce selecionado: é o bloco que a pessoa acabou de pedir, e num
          // canvas com vinte cards o novo precisa se identificar sozinho.
          selected: true,
          data: directiveData(directive),
        },
      ],
      edges: [
        ...state.edges,
        {
          id: `${storyboardNodeId}-${sceneHandleId(ordem)}->${id}`,
          source: storyboardNodeId,
          sourceHandle: sceneHandleId(ordem),
          target: id,
        },
      ],
      revision: state.revision + 1,
      saveStatus: "dirty",
      notice: null,
    });

    return { id, created: true };
  },

  addStoryboardMachine: ({ center }) => {
    const state = get();

    const largura = MACHINE_HANDLE_OFFSET + MACHINE_NODE_WIDTH;
    const altura = STORYBOARD_NODE_HEIGHT + PAIR_GAP + MACHINE_NODE_HEIGHT;

    // O par nasce **centrado** em onde a pessoa está olhando, e não com o canto
    // ali: são 1.076 × 769, e largar o canto no meio da tela jogaria a Máquina
    // inteira para fora dela pela direita e por baixo.
    const roteiro = freePosition(state.nodes, {
      x: Math.round(center.x - largura / 2),
      y: Math.round(center.y - altura / 2),
    });

    const roteiroId = crypto.randomUUID();
    const machineId = crypto.randomUUID();

    set({
      nodes: [
        ...state.nodes.map((node) => (node.selected ? { ...node, selected: false } : node)),
        {
          id: roteiroId,
          type: SCENE_SOURCE,
          position: roteiro,
          // Nascem os dois selecionados: são as duas peças que a pessoa acabou de
          // pedir, e num canvas com vinte cards as novas precisam se identificar.
          selected: true,
          // Vazios, como quando nascem pela prateleira. Os defaults do Roteiro
          // (canal, nº de cenas, modelo) são resolvidos DENTRO do card — semear
          // um canal aqui congelaria a escolha de hoje no grafo de quem nunca
          // abriu o seletor.
          data: {},
        },
        {
          id: machineId,
          type: MACHINE_TARGET,
          position: {
            x: roteiro.x + MACHINE_HANDLE_OFFSET,
            y: roteiro.y + STORYBOARD_NODE_HEIGHT + PAIR_GAP,
          },
          selected: true,
          data: {},
        },
      ],
      edges: [
        ...state.edges,
        {
          id: `${roteiroId}-${BOARD_HANDLE}->${machineId}`,
          source: roteiroId,
          // **Os dois handles, e o que decide é o de baixo.** `findGoverningBoard`
          // lê só o `targetHandle`; escrever apenas o `sourceHandle` daria um fio
          // que se desenha e não rege nada. O `sourceHandle` vai junto para esta
          // aresta ficar indistinguível de uma arrastada à mão — construir aresta
          // pelo store **não passa pelo `onConnect`**, então o que ele preencheria
          // sozinho tem de ser escrito aqui.
          sourceHandle: BOARD_HANDLE,
          target: machineId,
          targetHandle: BOARD_HANDLE,
        },
      ],
      revision: state.revision + 1,
      saveStatus: "dirty",
      notice: null,
    });

    return {
      roteiroId,
      machineId,
      bounds: { x: roteiro.x, y: roteiro.y, width: largura, height: altura },
    };
  },

  cutSceneWire: ({ generatorId }) =>
    set((state) => {
      const edges = state.edges.filter(
        (edge) =>
          !(edge.target === generatorId && sceneOrdemFromHandle(edge.sourceHandle) !== null),
      );

      if (edges.length === state.edges.length) return state;

      // Só a aresta. O `data.prompt` não é tocado — o texto passa a ser de quem
      // cortou, que é a definição inteira do gesto.
      return {
        edges,
        revision: state.revision + 1,
        saveStatus: "dirty",
        notice: null,
      };
    }),

  confirmSceneOverwrite: () =>
    set((state) => {
      const pending = state.notice;

      if (pending?.reason !== "scene_overwrite") return state;

      const directive = state.sceneSources[pending.storyboardNodeId]?.find(
        (scene) => scene.ordem === pending.ordem,
      );

      // A ficha sumiu enquanto a pergunta estava na tela (alguém gerou o roteiro
      // por cima). Sem ficha não há o que escrever, e escrever a aresta sozinha
      // deixaria um fio regendo o nada.
      if (!directive) return { ...state, notice: null };

      return {
        nodes: state.nodes.map((node) =>
          node.id === pending.nodeId
            ? { ...node, data: { ...node.data, ...directiveData(directive) } }
            : node,
        ),
        edges: [
          ...state.edges,
          {
            id: `${pending.storyboardNodeId}-${sceneHandleId(pending.ordem)}->${pending.nodeId}`,
            source: pending.storyboardNodeId,
            sourceHandle: sceneHandleId(pending.ordem),
            target: pending.nodeId,
          },
        ],
        revision: state.revision + 1,
        saveStatus: "dirty",
        notice: null,
      };
    }),

  duplicateNode: (id) =>
    set((state) => {
      const source = state.nodes.find((node) => node.id === id);

      // A result has nothing to duplicate: the image is already in the gallery,
      // and a second card of it would be a second name for one file. The header
      // says so with a disabled button; this is the same rule, stated where it
      // cannot be bypassed.
      if (!source || source.type === "result") return state;

      const width = source.measured?.width ?? source.width ?? 280;
      const cloneId = crypto.randomUUID();

      const data = structuredClone(source.data);

      // Everything that points at what this block *produced*. Carrying any of it
      // over would give the copy somebody else's images as its result, and its
      // "ver prompt" would open a generation the copy never ran. Both the plural
      // fields and the singular ones an older graph may still carry.
      delete data.lastAssetIds;
      delete data.lastGenerationIds;
      delete data.lastAssetId;
      delete data.lastGenerationId;

      return {
        nodes: [
          ...state.nodes,
          {
            id: cloneId,
            type: source.type,
            // Beside the original, never on top of it: a clone that lands under
            // the block it came from looks exactly like a click that did nothing.
            position: freePosition(state.nodes, {
              x: source.position.x + width + 40,
              y: source.position.y,
            }),
            data,
          },
        ],
        // The wires that *feed* this block come along, because the references
        // they attached did. Leaving them behind would give the copy a reference
        // with no wire — the asymmetry that attachReference and detachReference
        // exist to prevent. Outgoing wires lead to results, which do not come.
        edges: [
          ...state.edges,
          ...state.edges
            .filter((edge) => edge.target === id)
            .map((edge) => ({ ...edge, id: `${edge.source}->${cloneId}`, target: cloneId })),
        ],
        revision: state.revision + 1,
        saveStatus: "dirty",
      };
    }),

  addChainedGenerator: ({ resultNodeId }) =>
    set((state) => {
      const result = state.nodes.find((node) => node.id === resultNodeId);
      const assetId = result?.data.assetId;

      if (!result || typeof assetId !== "string") return state;

      const width = result.measured?.width ?? result.width ?? 256;
      const id = crypto.randomUUID();

      const generator: Node = {
        id,
        type: "generator",
        position: freePosition(state.nodes, {
          x: result.position.x + width + 72,
          y: result.position.y,
        }),
        data: {
          references: [
            {
              assetId,
              kind: null,
              instrucao: "",
              origem: "resultado",
              inputType: "result",
            } satisfies StoredReference,
          ],
        },
      };

      return {
        nodes: [...state.nodes, generator],
        edges: [
          ...state.edges,
          { id: `${resultNodeId}->${id}`, source: resultNodeId, target: id },
        ],
        revision: state.revision + 1,
        saveStatus: "dirty",
      };
    }),

  removeReference: ({ nodeId, index }) =>
    set((state) => {
      const node = state.nodes.find((entry) => entry.id === nodeId);

      if (!node) return state;

      const current = readReferences(node);
      const removed = current[index];

      if (!removed) return state;

      const groupId = removed.groupId ?? null;

      // A group leaves the way it arrived: all of its images, one gesture. The
      // strip only ever offers one ✕ for the group, and this is the rule behind
      // that button rather than a convenience of it.
      const next = groupId
        ? current.filter((reference) => reference.groupId !== groupId)
        : current.filter((_, position) => position !== index);

      // The wire that brought it, if it came by wire. Identified by both ends
      // and by what it carried, so a different result — or a different product —
      // feeding the same block keeps its own connection.
      const edges = state.edges.filter((edge) => {
        if (edge.target !== nodeId) return true;

        const source = state.nodes.find((entry) => entry.id === edge.source);

        // A group id is the id of the input card that handed it over, so the
        // wire to cut is the one whose source is that card.
        if (groupId) return source?.id !== groupId;

        return !(
          removed.origem === "resultado" &&
          source?.type === "result" &&
          source.data.assetId === removed.assetId
        );
      });

      return {
        nodes: withReferences(state.nodes, nodeId, next),
        edges,
        revision: state.revision + 1,
        saveStatus: "dirty",
        notice: null,
      };
    }),

  markDirty: () =>
    set((state) => ({
      revision: state.revision + 1,
      saveStatus: "dirty",
    })),

  clearNotice: () => set({ notice: null }),

  // Any status other than "failed" leaves no failure behind to explain.
  setSaveStatus: (saveStatus) =>
    set({ saveStatus, saveFailure: saveStatus === "failed" ? get().saveFailure : null }),

  setSaveFailed: (saveFailure) => set({ saveStatus: "failed", saveFailure }),

  markSaved: ({ version, revision }) => {
    // Only settle on "saved" if nothing changed while the save was in flight.
    const stillCurrent = get().revision === revision;

    set({
      version,
      saveStatus: stillCurrent ? "saved" : "dirty",
      saveFailure: null,
    });
  },
}));
