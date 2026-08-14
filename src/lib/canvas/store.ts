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
export type CanvasNotice = {
  nodeId: string;
  reason: "product_over_limit";
  /** How many slots the product needed, and how many there were. */
  needed: number;
  free: number;
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
