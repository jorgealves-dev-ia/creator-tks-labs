import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type OnConnect,
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

/** The result → generator pair an edge represents, when it represents one. */
function chainedPair(
  nodes: readonly Node[],
  connection: { source?: string | null; target?: string | null },
): { result: Node; generator: Node; assetId: string } | null {
  const result = nodes.find((node) => node.id === connection.source);
  const generator = nodes.find((node) => node.id === connection.target);
  const assetId = result?.data.assetId;

  if (
    result?.type !== "result" ||
    generator?.type !== "generator" ||
    typeof assetId !== "string"
  ) {
    return null;
  }

  return { result, generator, assetId };
}

function attachReference(
  nodes: Node[],
  connection: { source?: string | null; target?: string | null },
): Node[] {
  const pair = chainedPair(nodes, connection);

  if (!pair) return nodes;

  const current = readReferences(pair.generator);

  // Wiring the same result twice is one reference, not two: the second wire is
  // a gesture the user has already made.
  if (current.some((reference) => reference.assetId === pair.assetId)) {
    return nodes;
  }

  const next: StoredReference = {
    assetId: pair.assetId,
    kind: null,
    instrucao: "",
    origem: "resultado",
  };

  return nodes.map((node) =>
    node.id === pair.generator.id
      ? { ...node, data: { ...node.data, references: [...current, next] } }
      : node,
  );
}

function detachReference(nodes: Node[], edge: Edge): Node[] {
  const pair = chainedPair(nodes, edge);

  if (!pair) return nodes;

  const current = readReferences(pair.generator);

  // Only the attachment this wire made. A picture chosen from the gallery that
  // happens to be the same file was a separate decision, and stays.
  const next = current.filter(
    (reference) =>
      !(reference.assetId === pair.assetId && reference.origem === "resultado"),
  );

  if (next.length === current.length) return nodes;

  return nodes.map((node) =>
    node.id === pair.generator.id
      ? { ...node, data: { ...node.data, references: next } }
      : node,
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

  loadWorkflow: (input: {
    projectId: string;
    nodes: Node[];
    edges: Edge[];
    version: number;
  }) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
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
   * "Usar como referência": a new generating block, to the right of this result,
   * already wired to it and already holding it as a reference. The drag anyone
   * could do by hand, as one click — which is what turns a pile of attempts into
   * a flow.
   */
  addChainedGenerator: (input: { resultNodeId: string }) => void;
  /** For edits React Flow reports outside node/edge changes, such as panning. */
  markDirty: () => void;
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

  loadWorkflow: ({ projectId, nodes, edges, version }) =>
    set({
      projectId,
      nodes,
      edges,
      version,
      saveStatus: "saved",
      saveFailure: null,
      revision: 0,
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

  onConnect: (connection) =>
    set((state) => ({
      // Wiring a result into a generating block *is* attaching a reference —
      // the drag is the gesture, the list in the node is the state. Two ways in
      // (the picker and the wire), one place where what is attached lives.
      nodes: attachReference(state.nodes, connection),
      edges: addEdge(connection, state.edges),
      revision: state.revision + 1,
      saveStatus: "dirty",
    })),

  updateNodeData: (id, patch) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...patch } } : node,
      ),
      revision: state.revision + 1,
      saveStatus: "dirty",
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

  markDirty: () =>
    set((state) => ({
      revision: state.revision + 1,
      saveStatus: "dirty",
    })),

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
