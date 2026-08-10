"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type NodeTypes,
  type OnNodesChange,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { HelperLinesOverlay } from "@/components/canvas/helper-lines-overlay";
import { CharacterNode } from "@/components/nodes/character-node";
import { GeneratorNode } from "@/components/nodes/generator-node";
import { ResultNode } from "@/components/nodes/result-node";
import type { CanvasGraph } from "@/lib/canvas/graph";
import { applyHelperLines, NO_LINES, type HelperLines } from "@/lib/canvas/helper-lines";
import { useCanvasStore } from "@/lib/canvas/store";
import { useWorkflowAutosave } from "@/lib/canvas/use-autosave";
import { t } from "@/lib/i18n/pt-BR";

/**
 * Defined at module scope: a fresh object on every render would make React Flow
 * remount every node.
 */
const nodeTypes: NodeTypes = {
  character: CharacterNode,
  generator: GeneratorNode,
  result: ResultNode,
};

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
  const markDirty = useCanvasStore((state) => state.markDirty);
  const loadedProjectId = useCanvasStore((state) => state.projectId);

  const { getZoom } = useReactFlow();
  const [helperLines, setHelperLines] = useState<HelperLines>(NO_LINES);

  // Guides live here, not in the store: they are view state of a drag in
  // progress, not part of the saved document — and the zoom that scales the
  // snap threshold only exists on this side. The store's own action still does
  // all the applying and dirty-marking.
  const handleNodesChange = useCallback<OnNodesChange>(
    (changes) => {
      const result = applyHelperLines(changes, useCanvasStore.getState().nodes, getZoom());

      setHelperLines((previous) =>
        previous.horizontal === result.lines.horizontal &&
        previous.vertical === result.lines.vertical
          ? previous
          : result.lines,
      );
      onNodesChange(result.changes);
    },
    [getZoom, onNodesChange],
  );

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
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={(event) => {
          // React Flow passes a null event for programmatic viewport changes
          // such as fitView on load. Only a real pan or zoom is an edit.
          if (event) markDirty();
        }}
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
        <HelperLinesOverlay lines={helperLines} />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="!bottom-4 !right-4"
        />
        <MiniMap
          // Sits beside the zoom controls on the right: the sidebar expands
          // over the bottom-left corner on hover and would cover it there.
          position="bottom-right"
          pannable
          zoomable
          className="!bottom-4 !right-16 !rounded-lg !border !border-line !bg-surface"
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
