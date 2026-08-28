"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Node,
  type NodeTypes,
  type OnNodesChange,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { HelperLinesOverlay } from "@/components/canvas/helper-lines-overlay";
import { CharacterNode } from "@/components/nodes/character-node";
import { GeneratorNode } from "@/components/nodes/generator-node";
import { VideoGeneratorNode } from "@/components/nodes/video-generator-node";
import { InputImageNode } from "@/components/nodes/input-image-node";
import { InputProductNode } from "@/components/nodes/input-product-node";
import { InputPoseNode } from "@/components/nodes/input-pose-node";
import { InputSheetNode } from "@/components/nodes/input-sheet-node";
import { LegacyProductNode } from "@/components/nodes/legacy-product-node";
import { ResultNode } from "@/components/nodes/result-node";
import { MachineNode } from "@/components/nodes/machine-node";
import { StoryboardNode } from "@/components/nodes/storyboard-node";
import { useImageCatalog } from "@/components/nodes/use-image-catalog";
import { defaultModelId, findModel } from "@/components/ui/model-select";
import { NODE_TYPE_MIME } from "@/lib/canvas/drag";
import type { CanvasGraph } from "@/lib/canvas/graph";
import { applyHelperLines, NO_LINES, type HelperLines } from "@/lib/canvas/helper-lines";
import { useCanvasStore } from "@/lib/canvas/store";
import { useWorkflowAutosave } from "@/lib/canvas/use-autosave";
import { useEntitiesStore } from "@/lib/entities/store";
import {
  generatorCapacity,
  mentionedCharacter,
  sheetAnchorSlots,
} from "@/lib/generation/capacity";
import { useGenerationFeed } from "@/lib/generation/generation-feed";
import { t } from "@/lib/i18n/pt-BR";

/**
 * Defined at module scope: a fresh object on every render would make React Flow
 * remount every node.
 */
const nodeTypes: NodeTypes = {
  character: CharacterNode,
  product: LegacyProductNode,
  generator: GeneratorNode,
  "video-generator": VideoGeneratorNode,
  storyboard: StoryboardNode,
  machine: MachineNode,
  result: ResultNode,
  "input-image": InputImageNode,
  "input-product": InputProductNode,
  "input-pose": InputPoseNode,
  "input-sheet": InputSheetNode,
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
  const markDirty = useCanvasStore((state) => state.markDirty);
  const loadedProjectId = useCanvasStore((state) => state.projectId);

  const providers = useImageCatalog();
  const characters = useEntitiesStore((state) => state.characters);

  const { getZoom, screenToFlowPosition } = useReactFlow();
  const [helperLines, setHelperLines] = useState<HelperLines>(NO_LINES);

  /**
   * A type dragged off the Inputs shelf, dropped where the pointer let go.
   *
   * The rail also creates the same node on a plain click, which is the path
   * most people take. This one exists because dragging is what the gesture
   * *looks* like it should do, and a shelf that refuses the obvious gesture
   * teaches that the shelf is decoration.
   */
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      const type = event.dataTransfer.getData(NODE_TYPE_MIME);

      if (!type) return;

      event.preventDefault();

      useCanvasStore.getState().onNodesChange([
        {
          type: "add",
          item: {
            id: crypto.randomUUID(),
            type,
            position: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
            data: {},
          },
        },
      ]);
    },
    [screenToFlowPosition],
  );

  /**
   * How much room a block has left, taught to the store rather than handed to it.
   *
   * The answer needs the model catalogue and the Arsenal, neither of which the
   * graph contains — so it is computed here, where both are already loaded. It
   * became a registration instead of an argument because the wire stopped being
   * the only moment it matters: an input card that already feeds a block can
   * grow, and the room has to be checkable then too.
   *
   * Re-registered whenever either input changes, so the store never answers with
   * a catalogue from before the page finished loading.
   */
  useEffect(() => {
    useCanvasStore.getState().setCapacityResolver((generatorId) => {
      const target = useCanvasStore.getState().nodes.find((node) => node.id === generatorId);

      return freeSlots(target, providers, characters);
    });
  }, [providers, characters]);

  /**
   * A wire. Nothing has to be handed in with it any more: the graph knows what
   * every card contributes, and how much room the target has left is a question
   * the store asks the resolver above.
   */
  const handleConnect = useCallback((connection: Connection) => {
    useCanvasStore.getState().onConnect(connection);
  }, []);

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

  // Um canal para o projeto inteiro, aqui e não em cada bloco: seis geradores
  // abririam seis conexões para ouvir a mesma tabela com o mesmo filtro.
  useGenerationFeed(projectId);

  // One frame while the store catches up with the newly opened project.
  if (loadedProjectId !== projectId) {
    return <div className="size-full bg-canvas" />;
  }

  return (
    <div
      className="size-full"
      onDragOver={(event) => {
        // Without preventDefault the browser refuses the drop entirely — the
        // default for a dragover is "this is not a drop target".
        if (event.dataTransfer.types.includes(NODE_TYPE_MIME)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
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

/** How many more images a generating block can take. Zero for anything else. */
function freeSlots(
  target: Node | undefined,
  providers: ReturnType<typeof useImageCatalog>,
  characters: ReturnType<typeof useEntitiesStore.getState>["characters"],
): number {
  if (target?.type !== "generator") return 0;

  const prompt = typeof target.data.prompt === "string" ? target.data.prompt : "";
  const modelId =
    typeof target.data.modelId === "string" ? target.data.modelId : defaultModelId(providers);
  const references = Array.isArray(target.data.references) ? target.data.references : [];

  return generatorCapacity({
    modelSlug: findModel(providers, modelId)?.slug ?? null,
    referenceCount: references.length,
    reserved: sheetAnchorSlots(mentionedCharacter(prompt, characters)),
  }).free;
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
