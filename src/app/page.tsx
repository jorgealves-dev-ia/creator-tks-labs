import { redirect } from "next/navigation";

import { Studio } from "@/components/canvas/studio";
import { parseGraph, type CanvasGraph } from "@/lib/canvas/graph";
import { loadCharacters } from "@/lib/entities/queries";
import { loadProducts } from "@/lib/products/queries";
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
 */
export const maxDuration = 60;

export default async function StudioPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: claims } = await supabase.auth.getClaims();

  // The proxy already turns anonymous visitors away; this keeps the page from
  // ever rendering without a verified session if that ever changes.
  if (!claims?.claims) {
    redirect("/login");
  }

  const userId = claims.claims.sub;

  const [projectsResult, walletResult, characters, products] = await Promise.all([
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
    // Neither characters nor products are scoped to a project: the same
    // influencer, and the same product, can be placed on the canvas of any of them.
    loadCharacters(userId),
    loadProducts(userId),
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

  if (activeProject) {
    const { data: workflow } = await supabase
      .from("workflows")
      .select("graph, version")
      .eq("project_id", activeProject.id)
      .maybeSingle();

    if (workflow) {
      graph = parseGraph(workflow.graph);
      version = workflow.version;
    }
  }

  return (
    <Studio
      projects={projects}
      activeProjectId={activeProject?.id ?? null}
      graph={graph}
      version={version}
      balanceCents={walletResult.data?.balance_cents ?? 0}
      characters={characters}
      products={products}
    />
  );
}
