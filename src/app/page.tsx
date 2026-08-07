import { redirect } from "next/navigation";

import { Studio } from "@/components/canvas/studio";
import { parseGraph, type CanvasGraph } from "@/lib/canvas/graph";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const EMPTY_GRAPH: CanvasGraph = { nodes: [], edges: [] };

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

  const [projectsResult, walletResult] = await Promise.all([
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
    />
  );
}
