"use client";

import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useRef } from "react";

import { saveWorkflow } from "@/lib/canvas/actions";
import { gravacaoPerderiaArestas, useCanvasStore } from "@/lib/canvas/store";

const AUTOSAVE_DELAY_MS = 1200;

/**
 * The save in flight, if any — and whether another was asked for while it ran.
 *
 * Module scope, for the same reason the canvas store is: there is one canvas.
 * A ref would not do, because useSaveWorkflow is called from two components
 * (the autosave and the retry button), and each would get a guard of its own —
 * which is no guard at all.
 *
 * ---------------------------------------------------------------------------
 * Why this exists — the bug it closes, found on 2026-08-09
 * ---------------------------------------------------------------------------
 *
 * `version` gives optimistic concurrency: the UPDATE only matches while the
 * stored version is the one the browser holds. That protects against a second
 * *tab*. It did not protect against a second *save from the same tab*:
 *
 *   1. save A starts, sends version 41, and is slow (a remote database, right
 *      after a generation that just used the connection hard)
 *   2. an edit lands, so the canvas goes dirty again
 *   3. 1.2s later save B starts — and reads version 41, because A has not come
 *      back yet to raise it
 *   4. A lands, the row is now 42
 *   5. B lands and matches nothing → "conflict" → "Falha ao salvar"
 *
 * Nothing was ever lost: the next save carried the whole graph anyway, which is
 * why "Tentar de novo" always worked and why the stored graph was complete. But
 * the screen said something alarming and untrue about a canvas that was fine.
 *
 * Serialising the saves removes the race at its source. A conflict now means
 * what it was always supposed to mean: somebody else really is editing.
 */
let inFlight: Promise<void> | null = null;
let queued = false;

/**
 * The one place that writes the canvas to the database. Reads the live store
 * rather than props so it never persists a stale graph.
 *
 * Must be called inside a <ReactFlowProvider>.
 */
export function useSaveWorkflow() {
  const { getViewport } = useReactFlow();

  const write = useCallback(async () => {
    const store = useCanvasStore.getState();
    const projectId = store.projectId;

    if (!projectId) return;

    // ── A TRAVA DO GRAFO ──────────────────────────────────────────────────
    //
    // Antes de qualquer coisa, e antes de dizer "salvando": esta gravação
    // perderia vínculos que ninguém mandou remover?
    //
    // Nasceu do incidente de 04/09: o «Primeiros Testes» abriu com 27 nodes e
    // ZERO arestas, com 23 no banco. Um arrasto teria salvado o vazio por cima
    // — porque `"position"` marca o canvas como sujo e o autosave grava o que o
    // store tem.
    //
    // **Recusar custa zero.** O pior caso daqui é uma gravação adiada com um
    // aviso na tela; o pior caso sem isto é um projeto sem vínculos, e sem volta.
    if (
      gravacaoPerderiaArestas({
        carregadas: store.arestasCarregadas,
        atuais: store.edges.length,
        removeuNestaSessao: store.removeuArestaNestaSessao,
      })
    ) {
      store.setSaveStatus("recusado");
      return;
    }

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
      // A autorização para o grafo encolher. Sem ela, o servidor recusa uma
      // gravação com menos arestas do que a linha guardada tem.
      removeuAresta: store.removeuArestaNestaSessao,
    });

    // The user may have switched tabs while this was in flight. That canvas's
    // status and version are no longer ours to write.
    if (useCanvasStore.getState().projectId !== projectId) return;

    // A trava do servidor falou: o grafo encolheria sem ninguém ter mandado.
    // Nada foi escrito, e a tela passa a dizer o gesto que resolve.
    if (!result.ok && result.reason === "vinculos_ausentes") {
      useCanvasStore.getState().setSaveStatus("recusado");
      return;
    }

    if (result.ok) {
      useCanvasStore
        .getState()
        .markSaved({ version: result.version, revision: revisionAtStart });
    } else {
      useCanvasStore
        .getState()
        .setSaveFailed(result.reason === "conflict" ? "conflict" : "error");
    }
  }, [getViewport]);

  return useCallback(async () => {
    // Asked to save while one is running: remember it and let the runner do it
    // once the current write lands, with the version that write produced.
    if (inFlight) {
      queued = true;
      return inFlight;
    }

    inFlight = (async () => {
      try {
        await write();

        // Each pass reads the store fresh, so one extra pass covers everything
        // that arrived during the previous one. The loop ends the moment a pass
        // completes with nobody having asked again.
        while (queued) {
          queued = false;
          await write();
        }
      } finally {
        inFlight = null;
        queued = false;
      }
    })();

    return inFlight;
  }, [write]);
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
