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
