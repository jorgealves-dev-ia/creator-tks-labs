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
  setSaveStatus: (status: SaveStatus) => void;
  markSaved: (input: { version: number; revision: number }) => void;
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  projectId: null,
  nodes: [],
  edges: [],
  version: 1,
  saveStatus: "saved",
  revision: 0,

  loadWorkflow: ({ projectId, nodes, edges, version }) =>
    set({
      projectId,
      nodes,
      edges,
      version,
      saveStatus: "saved",
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

  setSaveStatus: (saveStatus) => set({ saveStatus }),

  markSaved: ({ version, revision }) => {
    // Only settle on "saved" if nothing changed while the save was in flight.
    const stillCurrent = get().revision === revision;

    set({
      version,
      saveStatus: stillCurrent ? "saved" : "dirty",
    });
  },
}));
