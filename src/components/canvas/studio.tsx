"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useRef } from "react";

import { SheetEditor } from "@/components/character-sheet/sheet-editor";
import { Lightbox } from "@/components/nodes/lightbox";
import { PromptInspector } from "@/components/nodes/prompt-inspector";
import { ReferencePicker } from "@/components/nodes/reference-picker";
import { Button } from "@/components/ui/button";
import type { CanvasGraph } from "@/lib/canvas/graph";
import { useEntitiesStore } from "@/lib/entities/store";
import type { CharacterEntity } from "@/lib/entities/types";
import { t } from "@/lib/i18n/pt-BR";
import { createProject } from "@/lib/projects/actions";
import { useBalance } from "@/lib/sparks/balance-store";

import { FlowCanvas } from "./flow-canvas";
import { NodeSidebar } from "./node-sidebar";
import type { ProjectTabData } from "./project-tab";
import { StudioHeader } from "./studio-header";

type StudioProps = {
  projects: ProjectTabData[];
  activeProjectId: string | null;
  /** Passa direto para a barra de abas, que assina o canal de `projects`. */
  userId: string;
  graph: CanvasGraph;
  version: number;
  balanceCents: number;
  characters: CharacterEntity[];
  /** Quais delas trabalham no projeto aberto — `project_entities`. */
  linkedCharacterIds: string[];
};

export function Studio({
  projects,
  activeProjectId,
  userId,
  graph,
  version,
  balanceCents,
  characters,
  linkedCharacterIds,
}: StudioProps) {
  useSeedArsenal(characters, linkedCharacterIds, balanceCents);

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
          userId={userId}
        />

        {/* Rendered once, above everything: both the card and the sidebar open it. */}
        <SheetEditor />

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
 * Hands the server's Arsenal — the characters, their project links and the
 * balance — to the client stores.
 *
 * In an effect rather than during render on purpose: the stores are module-level
 * singletons, and on the server that module is shared by every request in the
 * process. Seeding while rendering would let one visitor's characters — or one
 * visitor's balance — end up in another visitor's page.
 *
 * ---------------------------------------------------------------------------
 * Três semeaduras, três tempos de vida — e o do meio era um bug esperando
 * ---------------------------------------------------------------------------
 *
 * A lista de personagens é do **usuário** e é semeada uma vez: trocar de aba
 * não muda quem ela conhece. Os **vínculos** são do projeto e são semeados a
 * cada troca. O saldo já se recomportava assim.
 *
 * Essa separação não é elegância — é o que faz a Etapa D2 funcionar. Trocar de
 * aba é um `<Link href="/?p=…">`: o Server Component roda de novo e manda
 * `props` novas, mas o `Studio` **não desmonta**, então um efeito com `[]` nunca
 * mais rodaria. Semear a lista inteira de novo aqui resolveria a lista e
 * quebraria outra coisa — `characters` carrega `draftStatus`, `revision` e
 * `lastSavedAt`, e o editor é um overlay que sobrevive à troca de aba. Quem
 * estivesse escrevendo perderia o rascunho no meio da frase.
 *
 * Semear só o conjunto de vínculos não tem esse custo, porque o conjunto não
 * carrega estado de ninguém: ele é uma resposta a "quem trabalha aqui".
 */
function useSeedArsenal(
  characters: CharacterEntity[],
  linkedCharacterIds: string[],
  balanceCents: number,
) {
  const initial = useRef({ characters });

  useEffect(() => {
    useEntitiesStore.getState().seed(initial.current.characters);
  }, []);

  // A dependência é o conteúdo, não o array: o servidor devolve uma lista nova a
  // cada render, e comparar por identidade re-semearia a cada tecla. Mesmo
  // truque de use-portraits, pelo mesmo motivo.
  const linkKey = linkedCharacterIds.join(",");

  useEffect(() => {
    useEntitiesStore.getState().seedLinks(linkKey === "" ? [] : linkKey.split(","));
  }, [linkKey]);

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
