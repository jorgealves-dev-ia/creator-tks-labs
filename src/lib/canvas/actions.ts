"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { graphSchema, graphToJson, perderiaVinculos } from "@/lib/canvas/graph";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SaveWorkflowResult =
  | { ok: true; version: number }
  | { ok: false; reason: "conflict" | "invalid" | "error" | "vinculos_ausentes" };

const saveWorkflowSchema = z.object({
  projectId: z.uuid(),
  version: z.int().positive(),
  graph: graphSchema,
  /**
   * Alguém removeu aresta nesta sessão — pelo ✂, pelo Delete, ou apagando um
   * node. É a **autorização** para o grafo encolher.
   *
   * Vem do cliente e por isso não é confiável sozinha; ela não precisa ser. Ela
   * só destrava uma recusa: quem mentir aqui obtém o comportamento que já
   * existia antes desta trava, e quem não mandar nada é protegido por omissão.
   */
  removeuAresta: z.boolean().default(false),
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

  // ── A TRAVA DO GRAFO, DO LADO QUE SABE A VERDADE ─────────────────────────
  //
  // Nasceu do incidente de 04/09: o «Primeiros Testes» abriu com 27 nodes e
  // **zero arestas**, com 23 no banco. `"position"` marca o canvas como sujo, e
  // o autosave grava `edges: store.edges` — um arrasto teria salvado o vazio por
  // cima das 23, calado e sem desfazer.
  //
  // **Por que aqui e não só no cliente.** A primeira versão desta trava media
  // contra "quantas o `loadWorkflow` recebeu" — e essa régua é **cega
  // exatamente no caso do incidente**: se as arestas se perdem antes do
  // `loadWorkflow`, ele recebe zero, guarda zero, e conclui que o canvas sempre
  // teve zero. A única régua que não compartilha o defeito com o dado medido é a
  // **linha do banco**.
  //
  // Uma leitura a mais por gravação, e ela custa o que uma recusa vale: o pior
  // caso daqui é uma gravação adiada com aviso na tela; o pior caso sem isto é
  // um projeto sem vínculos.
  if (!parsed.data.removeuAresta) {
    const { data: atual } = await supabase
      .from("workflows")
      .select("graph")
      .eq("project_id", parsed.data.projectId)
      .maybeSingle();

    const guardadas = Array.isArray((atual?.graph as { edges?: unknown[] } | null)?.edges)
      ? ((atual!.graph as { edges: unknown[] }).edges.length)
      : 0;

    if (
      perderiaVinculos({
        guardadas,
        aGravar: parsed.data.graph.edges.length,
        removeuAresta: parsed.data.removeuAresta,
      })
    ) {
      return { ok: false, reason: "vinculos_ausentes" };
    }
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
