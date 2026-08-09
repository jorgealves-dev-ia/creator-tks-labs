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

    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      revision: persisted ? state.revision + 1 : state.revision,
      saveStatus: persisted ? "dirty" : state.saveStatus,
    }));
  },

  onConnect: (connection) =>
    set((state) => ({
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
            position: {
              x: source.position.x + width + 72,
              y: source.position.y + siblings * 48,
            },
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
