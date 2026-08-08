"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useRef } from "react";

import { SheetEditor } from "@/components/character-sheet/sheet-editor";
import { Button } from "@/components/ui/button";
import type { CanvasGraph } from "@/lib/canvas/graph";
import { useEntitiesStore } from "@/lib/entities/store";
import type { CharacterEntity } from "@/lib/entities/types";
import { t } from "@/lib/i18n/pt-BR";
import { createProject } from "@/lib/projects/actions";

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
};

export function Studio({
  projects,
  activeProjectId,
  graph,
  version,
  balanceCents,
  characters,
}: StudioProps) {
  useSeedCharacters(characters);

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
      </div>
    </ReactFlowProvider>
  );
}

/**
 * Hands the server's character list to the client store, once.
 *
 * In an effect rather than during render on purpose: the store is a module-level
 * singleton, and on the server that module is shared by every request in the
 * process. Seeding it while rendering would let one visitor's characters end up
 * in another visitor's page.
 */
function useSeedCharacters(characters: CharacterEntity[]) {
  const initial = useRef(characters);

  useEffect(() => {
    useEntitiesStore.getState().seed(initial.current);
  }, []);
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
