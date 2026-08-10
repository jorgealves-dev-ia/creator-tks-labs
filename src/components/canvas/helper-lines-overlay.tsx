"use client";

import { useStore } from "@xyflow/react";

import type { HelperLines } from "@/lib/canvas/helper-lines";

/**
 * The guide lines, drawn while a drag is aligned.
 *
 * A child of `<ReactFlow>` that draws in screen space: a guide has to run edge
 * to edge of the viewport, which in flow coordinates would have no finite
 * length. Subscribing to the transform keeps the lines glued to their flow
 * position while the viewport autopans near the border mid-drag.
 *
 * z-[5] sits above the node renderer (z-index 4) and ties with the panels
 * (z-index 5), which win by coming later in the DOM — so the guides cross the
 * nodes but never the controls.
 */
export function HelperLinesOverlay({ lines }: { lines: HelperLines }) {
  const transform = useStore((state) => state.transform);

  if (lines.horizontal === null && lines.vertical === null) return null;

  const [translateX, translateY, zoom] = transform;

  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 z-[5] size-full">
      {lines.vertical !== null ? (
        <line
          x1={lines.vertical * zoom + translateX}
          x2={lines.vertical * zoom + translateX}
          y1={0}
          y2="100%"
          stroke="var(--color-accent)"
          strokeOpacity={0.6}
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
      ) : null}

      {lines.horizontal !== null ? (
        <line
          x1={0}
          x2="100%"
          y1={lines.horizontal * zoom + translateY}
          y2={lines.horizontal * zoom + translateY}
          stroke="var(--color-accent)"
          strokeOpacity={0.6}
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
      ) : null}
    </svg>
  );
}
