import type { Node, NodeChange } from "@xyflow/react";

/**
 * Alignment guides with snap — the React Flow helper-lines pattern, adapted to
 * this store.
 *
 * While a single node is dragged, its edges and centers are compared against
 * every other node's; the closest alignment per axis within the threshold
 * becomes a guide line, and the drag position is corrected onto it. The
 * correction never feeds back into the drag: React Flow recomputes each frame
 * from the pointer, so moving past the threshold releases the node on its own —
 * a magnet, not a lock.
 */

export type HelperLines = {
  /** Y of the horizontal guide, in flow coordinates. */
  horizontal: number | null;
  /** X of the vertical guide, in flow coordinates. */
  vertical: number | null;
};

/**
 * The one instance meaning "no guides". Handing back the same reference on
 * every quiet frame lets React bail out of re-rendering the overlay for the
 * whole of an ordinary drag.
 */
export const NO_LINES: HelperLines = { horizontal: null, vertical: null };

/**
 * The magnet's reach, in *screen* pixels. A threshold fixed in flow units would
 * be a needle nobody hits at minimum zoom and a trap nobody escapes at maximum;
 * dividing by the zoom keeps the feel identical wherever the user works.
 */
const SNAP_SCREEN_PX = 6;

type AxisMatch = {
  /** Where the guide draws, in flow coordinates. */
  line: number;
  /** Where the dragged node's origin goes for the pair to align exactly. */
  snap: number;
  distance: number;
};

export function applyHelperLines(
  changes: NodeChange[],
  nodes: readonly Node[],
  zoom: number,
): { changes: NodeChange[]; lines: HelperLines } {
  const [change] = changes;

  // Only a lone dragged node aligns to anything: a multi-selection has no one
  // box to compare, and every other kind of change — select, measure, the end
  // of a drag — must clear whatever guides were showing.
  if (
    changes.length !== 1 ||
    !change ||
    change.type !== "position" ||
    !change.dragging ||
    !change.position
  ) {
    return { changes, lines: NO_LINES };
  }

  const dragged = nodes.find((node) => node.id === change.id);
  const width = dragged?.measured?.width;
  const height = dragged?.measured?.height;

  // No literal fallbacks here: node heights vary with content, and a guide
  // drawn from a guessed center is a guide that lies. Unmeasured means none.
  if (width === undefined || height === undefined) {
    return { changes, lines: NO_LINES };
  }

  const threshold = SNAP_SCREEN_PX / zoom;

  const left = change.position.x;
  const right = left + width;
  const centerX = left + width / 2;
  const top = change.position.y;
  const bottom = top + height;
  const centerY = top + height / 2;

  let bestX: AxisMatch | null = null;
  let bestY: AxisMatch | null = null;

  for (const node of nodes) {
    if (node.id === change.id) continue;

    const nodeWidth = node.measured?.width;
    const nodeHeight = node.measured?.height;

    if (nodeWidth === undefined || nodeHeight === undefined) continue;

    const nodeLeft = node.position.x;
    const nodeRight = nodeLeft + nodeWidth;
    const nodeCenterX = nodeLeft + nodeWidth / 2;
    const nodeTop = node.position.y;
    const nodeBottom = nodeTop + nodeHeight;
    const nodeCenterY = nodeTop + nodeHeight / 2;

    // Edge to edge and center to center — the five comparisons per axis of the
    // original pattern.
    const xCandidates: AxisMatch[] = [
      { line: nodeLeft, snap: nodeLeft, distance: Math.abs(left - nodeLeft) },
      { line: nodeRight, snap: nodeRight - width, distance: Math.abs(right - nodeRight) },
      { line: nodeRight, snap: nodeRight, distance: Math.abs(left - nodeRight) },
      { line: nodeLeft, snap: nodeLeft - width, distance: Math.abs(right - nodeLeft) },
      { line: nodeCenterX, snap: nodeCenterX - width / 2, distance: Math.abs(centerX - nodeCenterX) },
    ];

    const yCandidates: AxisMatch[] = [
      { line: nodeTop, snap: nodeTop, distance: Math.abs(top - nodeTop) },
      { line: nodeBottom, snap: nodeBottom - height, distance: Math.abs(bottom - nodeBottom) },
      { line: nodeBottom, snap: nodeBottom, distance: Math.abs(top - nodeBottom) },
      { line: nodeTop, snap: nodeTop - height, distance: Math.abs(bottom - nodeTop) },
      { line: nodeCenterY, snap: nodeCenterY - height / 2, distance: Math.abs(centerY - nodeCenterY) },
    ];

    for (const candidate of xCandidates) {
      if (candidate.distance < threshold && (!bestX || candidate.distance < bestX.distance)) {
        bestX = candidate;
      }
    }

    for (const candidate of yCandidates) {
      if (candidate.distance < threshold && (!bestY || candidate.distance < bestY.distance)) {
        bestY = candidate;
      }
    }
  }

  if (!bestX && !bestY) {
    return { changes, lines: NO_LINES };
  }

  // A fresh change object: the one React Flow handed us is not ours to edit.
  const snapped: NodeChange = {
    ...change,
    position: {
      x: bestX ? bestX.snap : change.position.x,
      y: bestY ? bestY.snap : change.position.y,
    },
  };

  return {
    changes: [snapped],
    lines: { horizontal: bestY?.line ?? null, vertical: bestX?.line ?? null },
  };
}
