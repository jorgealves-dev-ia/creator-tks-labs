"use client";

import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useRef } from "react";

import { saveWorkflow } from "@/lib/canvas/actions";
import { useCanvasStore } from "@/lib/canvas/store";

const AUTOSAVE_DELAY_MS = 1200;

/**
 * The one place that writes the canvas to the database. Reads the live store
 * rather than props so it never persists a stale graph.
 *
 * Must be called inside a <ReactFlowProvider>.
 */
export function useSaveWorkflow() {
  const { getViewport } = useReactFlow();

  return useCallback(async () => {
    const store = useCanvasStore.getState();
    const projectId = store.projectId;

    if (!projectId) return;

    const revisionAtStart = store.revision;
    store.setSaveStatus("saving");

    const result = await saveWorkflow({
      projectId,
      version: store.version,
      graph: {
        nodes: store.nodes,
        edges: store.edges,
        viewport: getViewport(),
      },
    });

    // The user may have switched tabs while this was in flight. That canvas's
    // status and version are no longer ours to write.
    if (useCanvasStore.getState().projectId !== projectId) return;

    if (result.ok) {
      useCanvasStore
        .getState()
        .markSaved({ version: result.version, revision: revisionAtStart });
    } else {
      useCanvasStore.getState().setSaveStatus("failed");
    }
  }, [getViewport]);
}

/**
 * Saves a moment after the user stops editing, and once more when the canvas
 * unmounts — switching project tabs must not drop the last edit.
 *
 * Call this exactly once, from the component that owns the canvas.
 */
export function useWorkflowAutosave() {
  const save = useSaveWorkflow();
  const saveStatus = useCanvasStore((state) => state.saveStatus);
  const revision = useCanvasStore((state) => state.revision);

  useEffect(() => {
    if (saveStatus !== "dirty") return;

    const timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [saveStatus, revision, save]);

  // Kept in a ref so the flush effect below depends on nothing and therefore
  // runs only on real unmount, not on every re-render.
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    return () => {
      if (useCanvasStore.getState().saveStatus === "dirty") {
        void saveRef.current();
      }
    };
  }, []);
}
