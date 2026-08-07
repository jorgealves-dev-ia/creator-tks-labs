"use client";

import { ReactFlowProvider } from "@xyflow/react";

import { Button } from "@/components/ui/button";
import type { CanvasGraph } from "@/lib/canvas/graph";
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
};

export function Studio({
  projects,
  activeProjectId,
  graph,
  version,
  balanceCents,
}: StudioProps) {
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
      </div>
    </ReactFlowProvider>
  );
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
