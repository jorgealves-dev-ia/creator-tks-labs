"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useRef } from "react";

import { SheetEditor } from "@/components/character-sheet/sheet-editor";
import { Lightbox } from "@/components/nodes/lightbox";
import { PromptInspector } from "@/components/nodes/prompt-inspector";
import { ReferencePicker } from "@/components/nodes/reference-picker";
import { ProductDialog } from "@/components/products/product-dialog";
import { Button } from "@/components/ui/button";
import type { CanvasGraph } from "@/lib/canvas/graph";
import { useEntitiesStore } from "@/lib/entities/store";
import type { CharacterEntity } from "@/lib/entities/types";
import { t } from "@/lib/i18n/pt-BR";
import { useProductsStore } from "@/lib/products/store";
import type { Product } from "@/lib/products/types";
import { createProject } from "@/lib/projects/actions";
import { useBalance } from "@/lib/sparks/balance-store";

import { FlowCanvas } from "./flow-canvas";
import { NodeSidebar } from "./node-sidebar";
import type { ProjectTabData } from "./project-tab";
import { StudioHeader } from "./studio-header";

type StudioProps = {
  projects: ProjectTabData[];
  activeProjectId: string | null;
  graph: CanvasGraph;
  version: number;
  balanceCents: number;
  characters: CharacterEntity[];
  products: Product[];
};

export function Studio({
  projects,
  activeProjectId,
  graph,
  version,
  balanceCents,
  characters,
  products,
}: StudioProps) {
  useSeedArsenal(characters, products, balanceCents);

  return (
    <ReactFlowProvider>
      <div className="relative h-dvh w-full overflow-hidden bg-canvas">
        {activeProjectId ? (
          <>
            <FlowCanvas
              // Remounting per project re-seeds the store and flushes the
              // previous canvas's pending save.
              key={activeProjectId}
              projectId={activeProjectId}
              graph={graph}
              version={version}
            />
            <NodeSidebar />
          </>
        ) : (
          <NoProjects />
        )}

        <StudioHeader
          projects={projects}
          activeProjectId={activeProjectId}
          balanceCents={balanceCents}
        />

        {/* Rendered once, above everything: both the card and the sidebar open it. */}
        <SheetEditor />
        <ProductDialog />

        {/* Also once, and for a harder reason: a modal inside a React Flow node
            sits inside a CSS transform, which would position it against the
            canvas and scale it with the zoom. */}
        <ReferencePicker />
        <PromptInspector />
        <Lightbox />
      </div>
    </ReactFlowProvider>
  );
}

/**
 * Hands the server's Arsenal — characters, products and the balance — to the
 * client stores, once.
 *
 * In an effect rather than during render on purpose: the stores are module-level
 * singletons, and on the server that module is shared by every request in the
 * process. Seeding while rendering would let one visitor's characters — or one
 * visitor's balance — end up in another visitor's page.
 */
function useSeedArsenal(
  characters: CharacterEntity[],
  products: Product[],
  balanceCents: number,
) {
  const initial = useRef({ characters, products });

  useEffect(() => {
    useEntitiesStore.getState().seed(initial.current.characters);
    useProductsStore.getState().seed(initial.current.products);
  }, []);

  // The balance re-seeds whenever the server sends a new one, unlike the two
  // lists above. That is what makes the optimistic subtraction after a batch
  // safe: the block takes the charges off immediately so the number moves when
  // the button is pressed, and the router.refresh() that follows brings the
  // wallet's own figure back over the top of it.
  useEffect(() => {
    useBalance.getState().seed(balanceCents);
  }, [balanceCents]);
}

function NoProjects() {
  return (
    <div className="flex size-full items-center justify-center">
      <div className="max-w-xs text-center">
        <p className="text-sm font-medium text-ink">
          {t.studio.noProjectsTitle}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
          {t.studio.noProjectsBody}
        </p>
        <form action={createProject} className="mt-5">
          <Button type="submit" className="h-9 px-4">
            {t.studio.newProject}
          </Button>
        </form>
      </div>
    </div>
  );
}
