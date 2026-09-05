import type { Edge, Node, Viewport } from "@xyflow/react";
import { z } from "zod";

import type { Json } from "@/lib/supabase/database.types";

/**
 * The canvas graph as stored in workflows.graph.
 *
 * Both directions cross a trust boundary — the browser sends the graph to a
 * Server Action, and the database returns free-form jsonb — so both are
 * validated here rather than cast.
 */

const positionSchema = z.object({ x: z.number(), y: z.number() });

const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

/**
 * Only the properties worth persisting are kept; React Flow recomputes layout
 * state (measured sizes, selection) on load, and dropping it keeps the stored
 * graph small and stable.
 */
const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().optional(),
  position: positionSchema,
  data: z.record(z.string(), z.unknown()).default({}),
  parentId: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullish(),
  targetHandle: z.string().nullish(),
  type: z.string().optional(),
  label: z.string().optional(),
});

export const graphSchema = z.object({
  nodes: z.array(nodeSchema).default([]),
  edges: z.array(edgeSchema).default([]),
  viewport: viewportSchema.optional(),
});

export type CanvasGraph = {
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
};

/** Reads a graph out of the database. An unreadable graph yields an empty canvas. */
export function parseGraph(value: unknown): CanvasGraph {
  const parsed = graphSchema.safeParse(value ?? {});

  if (!parsed.success) {
    return { nodes: [], edges: [] };
  }

  return {
    nodes: parsed.data.nodes,
    edges: parsed.data.edges,
    viewport: parsed.data.viewport,
  };
}

/**
 * Narrows a canvas graph to the plain JSON the database column accepts. The
 * schema above already proved every field is a JSON primitive, so this only
 * restates that fact for the type system.
 */
export function graphToJson(graph: z.infer<typeof graphSchema>): Json {
  return JSON.parse(JSON.stringify(graph)) as Json;
}

/**
 * A TRAVA DO GRAFO — a regra, separada de quem a aplica.
 *
 * Mora aqui, e não dentro da Server Action, pela mesma razão que tirou o
 * `vereditoDoFilme` de dentro do JSX: **uma regra embutida no chamador só se
 * testa tendo o chamador inteiro de pé** — e o chamador aqui é uma Server Action
 * que exige sessão e banco. A regra é uma comparação de dois números e um
 * booleano; ela merece ser exercitada como tal.
 *
 * **A pergunta:** esta gravação encolheria o grafo sem ninguém ter mandado?
 *
 * `guardadas` vem da **linha do banco**, e essa escolha é o conserto de um erro
 * meu: a primeira versão comparava contra "quantas o `loadWorkflow` recebeu", e
 * essa régua é **cega exatamente no caso do incidente** — se as arestas se perdem
 * antes do load, ele recebe zero, guarda zero, e conclui que o canvas sempre teve
 * zero. A régua não pode compartilhar o defeito com o dado medido.
 *
 * `removeuAresta` é a autorização, e ela cobre as três portas legítimas de
 * encolhimento: o ✂ do fio de cena, o Delete de aresta, e **apagar um node**, que
 * leva os fios dele sem gerar evento de aresta nenhum. Sem essa exceção a trava
 * transformaria "apagar" em "não dá para apagar".
 */
export function perderiaVinculos(input: {
  /** Quantas arestas a linha do banco tem agora. */
  guardadas: number;
  /** Quantas a gravação traz. */
  aGravar: number;
  /** Alguém removeu aresta nesta sessão. */
  removeuAresta: boolean;
}): boolean {
  if (input.removeuAresta) return false;

  return input.guardadas > input.aGravar;
}
