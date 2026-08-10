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
   * Set when this image is one photo of a product wired into the block. Every
   * photo of the same product carries the same id, which is what lets the strip
   * show them as one thing and the compiler describe them as one object.
   *
   * The product's *name* is deliberately not stored: it would go stale the
   * moment somebody renamed the product, and both the strip and the server can
   * look it up by id.
   */
  productId?: string | null;
};

/**
 * What the canvas has to know about a product to wire it in.
 *
 * Handed to the store by the component that has the products at hand, rather
 * than read here: this file is the graph, and the graph has no business holding
 * a second copy of the Arsenal.
 */
export type ConnectedProduct = {
  id: string;
  /** Its photos, in order. Every one of them becomes a numbered reference. */
  assetIds: string[];
  /** The sentence the product starts every generation with; editable per block. */
  instrucao: string;
};

export type ConnectContext = {
  /** The product on the source end of the wire, when the source is a product card. */
  product: ConnectedProduct | null;
  /** How many more images the target block can accept right now. */
  free: number;
};

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
 * Two sources feed a generating block: a Resultado, which is one image, and a
 * Produto, which is all of its photos at once. Both are the same gesture — a
 * wire — and both end in the same list, which is why they are recognised here
 * together rather than in two places that could disagree about what a wire does.
 */
function wiredPair(
  nodes: readonly Node[],
  connection: { source?: string | null; target?: string | null },
): { source: Node; generator: Node } | null {
  const source = nodes.find((node) => node.id === connection.source);
  const generator = nodes.find((node) => node.id === connection.target);

  if (!source || generator?.type !== "generator") return null;
  if (source.type !== "result" && source.type !== "product") return null;

  return { source, generator };
}

/** The photos a wired product contributes, in the order they will be numbered. */
function productReferences(product: ConnectedProduct): StoredReference[] {
  return product.assetIds.map((assetId) => ({
    assetId,
    // A product's photos are products. The chip is not a question the block has
    // to ask again, and leaving it open would let one photo of a bikini be
    // labelled "cenário" while the other two stayed "produto".
    kind: "produto",
    instrucao: product.instrucao,
    origem: "produto",
    productId: product.id,
  }));
}

function detachReference(nodes: Node[], edge: Edge): Node[] {
  const pair = wiredPair(nodes, edge);

  if (!pair) return nodes;

  const current = readReferences(pair.generator);

  // Only what this wire attached. A picture chosen from the gallery that happens
  // to be the same file was a separate decision, and stays. A product leaves
  // whole, for the same reason it arrived whole.
  const next =
    pair.source.type === "product"
      ? current.filter((reference) => reference.productId !== pair.source.data.entityId)
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
  onConnect: (connection: Connection, context: ConnectContext) => void;
  /**
   * Edits a node's own stored state — the prompt someone is typing, the format
   * they picked, the references they attached.
   *
   * React Flow has no change type for this, and it is emphatically a change to
   * the saved graph, so it marks the canvas dirty itself. Without it, everything
   * a generation node knows would be lost on reload.
   */
  updateNodeData: (id: string, patch: Record<string, unknown>) => void;
  /** Drops a finished image on the canvas, wired to the block that made it. */
  addResultNode: (input: { sourceNodeId: string; data: Record<string, unknown> }) => void;
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

export const useCanvasStore = create<CanvasState>((set, get) => ({
  projectId: null,
  nodes: [],
  edges: [],
  version: 1,
  saveStatus: "saved",
  saveFailure: null,
  revision: 0,
  notice: null,

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

    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      revision: persisted ? state.revision + 1 : state.revision,
      saveStatus: persisted ? "dirty" : state.saveStatus,
    }));
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

  onConnect: (connection, context) =>
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

      if (!pair) return { ...connected, nodes: state.nodes };

      const current = readReferences(pair.generator);

      if (pair.source.type === "product") {
        const product = context.product;

        // No product to attach, or this one is already here: the wire is drawn
        // and nothing else happens. A second wire is a gesture already made.
        if (!product || current.some((reference) => reference.productId === product.id)) {
          return { ...connected, nodes: state.nodes };
        }

        // A product arrives whole or not at all. Half of a product is a front
        // view with no label — a reference that looks attached and cannot say
        // what the back of the garment looks like. Better refused, in words,
        // before the wire exists, than discovered as a bad image after paying.
        if (product.assetIds.length > context.free) {
          return {
            nodes: state.nodes,
            edges: state.edges,
            revision: state.revision,
            saveStatus: state.saveStatus,
            notice: {
              nodeId: pair.generator.id,
              reason: "product_over_limit" as const,
              needed: product.assetIds.length,
              free: context.free,
            },
          };
        }

        return {
          ...connected,
          nodes: withReferences(state.nodes, pair.generator.id, [
            ...current,
            ...productReferences(product),
          ]),
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
          { assetId, kind: null, instrucao: "", origem: "resultado" },
        ]),
      };
    }),

  updateNodeData: (id, patch) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...patch } } : node,
      ),
      revision: state.revision + 1,
      saveStatus: "dirty",
      // Any edit answers the refusal — a shorter prompt, a bigger model, one
      // reference fewer. Leaving it on screen would be nagging about a problem
      // the user just solved.
      notice: null,
    })),

  addResultNode: ({ sourceNodeId, data }) =>
    set((state) => {
      const source = state.nodes.find((node) => node.id === sourceNodeId);

      if (!source) return state;

      // Cascaded down and to the right of the block that made it, offset by how
      // many results that block already produced — so a second attempt lands
      // beside the first instead of on top of it, and the pair reads as a
      // sequence of tries rather than one image that changed.
      const siblings = state.nodes.filter(
        (node) => node.type === "result" && node.data.sourceNodeId === sourceNodeId,
      ).length;

      const width = source.measured?.width ?? source.width ?? 380;
      const id = crypto.randomUUID();

      return {
        nodes: [
          ...state.nodes,
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
            data: { ...data, sourceNodeId },
          },
        ],
        edges: [
          ...state.edges,
          { id: `${sourceNodeId}->${id}`, source: sourceNodeId, target: id },
        ],
        revision: state.revision + 1,
        saveStatus: "dirty",
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

      // The two ids that point at what this block *produced*. Carrying them over
      // would give the copy somebody else's image as its preview, and its "ver
      // prompt" would open a generation the copy never ran.
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
            { assetId, kind: null, instrucao: "", origem: "resultado" } satisfies StoredReference,
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

      const productId = removed.productId ?? null;

      // A product leaves the way it arrived: all of its photos, one gesture. The
      // strip only ever offers one ✕ for the group, and this is the rule behind
      // that button rather than a convenience of it.
      const next = productId
        ? current.filter((reference) => reference.productId !== productId)
        : current.filter((_, position) => position !== index);

      // The wire that brought it, if it came by wire. Identified by both ends
      // and by what it carried, so a different result — or a different product —
      // feeding the same block keeps its own connection.
      const edges = state.edges.filter((edge) => {
        if (edge.target !== nodeId) return true;

        const source = state.nodes.find((entry) => entry.id === edge.source);

        if (productId) {
          return !(source?.type === "product" && source.data.entityId === productId);
        }

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
