"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";
import { useEffect, useRef } from "react";

import type { CanvasGraph } from "@/lib/canvas/graph";
import { useCanvasStore } from "@/lib/canvas/store";
import { useWorkflowAutosave } from "@/lib/canvas/use-autosave";
import { t } from "@/lib/i18n/pt-BR";

type FlowCanvasProps = {
  projectId: string;
  graph: CanvasGraph;
  version: number;
};

/**
 * Mounted with `key={projectId}`, so switching tabs remounts it: the store is
 * re-seeded from the server and the autosave flush fires for the tab we left.
 */
export function FlowCanvas({ projectId, graph, version }: FlowCanvasProps) {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const onNodesChange = useCanvasStore((state) => state.onNodesChange);
  const onEdgesChange = useCanvasStore((state) => state.onEdgesChange);
  const onConnect = useCanvasStore((state) => state.onConnect);
  const loadedProjectId = useCanvasStore((state) => state.projectId);

  const initial = useRef({ projectId, graph, version });

  useEffect(() => {
    const seed = initial.current;

    useCanvasStore.getState().loadWorkflow({
      projectId: seed.projectId,
      nodes: seed.graph.nodes,
      edges: seed.graph.edges,
      version: seed.version,
    });
  }, []);

  useWorkflowAutosave();

  // One frame while the store catches up with the newly opened project.
  if (loadedProjectId !== projectId) {
    return <div className="size-full bg-canvas" />;
  }

  return (
    <div className="size-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        defaultViewport={graph.viewport}
        fitView={!graph.viewport}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: false }}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.5}
          color="#26262f"
        />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="!bottom-4 !right-4"
        />
        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          className="!bottom-4 !left-20 !rounded-lg !border !border-line !bg-surface"
          maskColor="rgba(10, 10, 14, 0.7)"
          nodeColor="#3a3a48"
        />
      </ReactFlow>

      {nodes.length === 0 ? <EmptyCanvasHint /> : null}
    </div>
  );
}

function EmptyCanvasHint() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="max-w-xs text-center">
        <p className="text-sm font-medium text-ink-muted">
          {t.studio.emptyStateTitle}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
          {t.studio.emptyStateBody}
        </p>
      </div>
    </div>
  );
}
