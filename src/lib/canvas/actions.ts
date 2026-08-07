"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { graphSchema, graphToJson } from "@/lib/canvas/graph";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SaveWorkflowResult =
  | { ok: true; version: number }
  | { ok: false; reason: "conflict" | "invalid" | "error" };

const saveWorkflowSchema = z.object({
  projectId: z.uuid(),
  version: z.int().positive(),
  graph: graphSchema,
});

/**
 * Persists the canvas graph.
 *
 * `version` gives optimistic concurrency: the UPDATE only matches while the
 * stored version is the one the browser loaded. If another tab saved first,
 * zero rows match and the caller is told it conflicted instead of silently
 * overwriting the other save. RLS restricts the row to its owner.
 */
export async function saveWorkflow(input: unknown): Promise<SaveWorkflowResult> {
  const parsed = saveWorkflowSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("workflows")
    .update({
      graph: graphToJson(parsed.data.graph),
      version: parsed.data.version + 1,
    })
    .eq("project_id", parsed.data.projectId)
    .eq("version", parsed.data.version)
    .select("version")
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "error" };
  }

  if (!data) {
    return { ok: false, reason: "conflict" };
  }

  return { ok: true, version: data.version };
}
