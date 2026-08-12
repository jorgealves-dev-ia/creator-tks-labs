import { redirect } from "next/navigation";

import { Studio } from "@/components/canvas/studio";
import { parseGraph, type CanvasGraph } from "@/lib/canvas/graph";
import { loadCharacters, loadProjectCharacterIds } from "@/lib/entities/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const EMPTY_GRAPH: CanvasGraph = { nodes: [], edges: [] };

/**
 * Reading a photo takes a provider tens of seconds, and the extraction engine is
 * a Server Action of this page. Route segment config set on a page changes the
 * timeout of every Server Action used on it, so this is where the engine's budget
 * lives — the default ten seconds would cut a perfectly good analysis in half.
 *
 * Sixty seconds is the ceiling of the Vercel plan this project is on. The adapter
 * gives up at fifty (see lib/providers/anthropic.ts) so the failure is our own
 * clear message rather than the platform killing the request mid-flight.
 *
 * If generation later needs longer than this, the answer is not a bigger number:
 * it is the asynchronous pattern of architecture decision 1 — queue, webhook,
 * Realtime.
 *
 * ---------------------------------------------------------------------------
 * Esta linha viajou de `/` para cá em 12/08/2026, e viajar era obrigatório
 * ---------------------------------------------------------------------------
 *
 * O canvas mudou de rota para o dashboard assumir a porta da frente. Um teto de
 * tempo é **configuração de rota**: ele vale para a página onde está escrito, e
 * não para o componente que se mudou. Deixá-lo em `/` teria devolvido a extração
 * ao padrão de dez segundos — e o estrago só apareceria numa extração real, que
 * custa Sparks, morrendo no meio sem ninguém entender por quê.
 */
export const maxDuration = 60;

export default async function StudioPage(props: PageProps<"/studio">) {
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: claims } = await supabase.auth.getClaims();

  // The proxy already turns anonymous visitors away; this keeps the page from
  // ever rendering without a verified session if that ever changes.
  if (!claims?.claims) {
    redirect("/login");
  }

  const userId = claims.claims.sub;

  const [projectsResult, walletResult, characters] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("wallets")
      .select("balance_cents")
      .eq("user_id", userId)
      .maybeSingle(),
    // Todas as personagens do usuário, e não as deste projeto: a personagem é
    // dele, e o vínculo com o projeto vem logo abaixo, em separado.
    loadCharacters(userId),
  ]);

  const projects = projectsResult.data ?? [];

  // An unknown or missing ?p= falls back to the first tab rather than showing
  // an empty canvas the user cannot explain.
  const requested = searchParams.p;
  const requestedId = typeof requested === "string" ? requested : undefined;
  const activeProject =
    projects.find((project) => project.id === requestedId) ?? projects[0];

  let graph = EMPTY_GRAPH;
  let version = 1;
  // Projeto novo nasce sem vínculos — canvas limpo E lista limpa, que é a
  // origem da etapa inteira. Sem projeto aberto, não há vínculo a ter.
  let linkedCharacterIds: string[] = [];

  if (activeProject) {
    const [workflowResult, linkedIds] = await Promise.all([
      supabase
        .from("workflows")
        .select("graph, version")
        .eq("project_id", activeProject.id)
        .maybeSingle(),
      loadProjectCharacterIds(activeProject.id),
    ]);

    if (workflowResult.data) {
      graph = parseGraph(workflowResult.data.graph);
      version = workflowResult.data.version;
    }

    linkedCharacterIds = linkedIds;
  }

  return (
    <Studio
      projects={projects}
      activeProjectId={activeProject?.id ?? null}
      graph={graph}
      version={version}
      balanceCents={walletResult.data?.balance_cents ?? 0}
      characters={characters}
      linkedCharacterIds={linkedCharacterIds}
    />
  );
}
