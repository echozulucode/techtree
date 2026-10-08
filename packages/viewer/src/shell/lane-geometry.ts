import type { IR } from '@echozedlabs/techtree-ir';

/** Horizontal room left of the first column for lane titles (canvas units). */
export const LANE_GUTTER = 190;
/** Lane background beyond the last column (canvas units). */
export const LANE_PAD_RIGHT = 40;
/** Offset of a lane title inside its lane (canvas units, LaneNode). */
export const LANE_LABEL_INSET = 12;
/** Height of the pinned era header row over the canvas (screen px, EraBanners). */
export const ERA_HEADER_HEIGHT = 44;

/**
 * Width of the pinned lane-label rail (screen px) for a canvas `width` px wide:
 * 24 % of the canvas, at least 96 and at most 168 px. The stylesheet uses the
 * same formula (`clamp(96px, 24%, 168px)` on `.tt-lane-rail`).
 */
export function laneRailWidth(containerWidth: number): number {
  return Math.min(168, Math.max(96, Math.round(containerWidth * 0.24)));
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** True when the IR carries swimlane geometry (`layout: { lanes: true }`). */
export function hasLanes(ir: IR): boolean {
  return ir.nodes.length > 0 && ir.tracks.some((t) => t.lane);
}

/** Horizontal extent of the node columns (canvas units), or null for an empty tree. */
function nodeSpan(ir: IR): { minX: number; maxX: number; minY: number; maxY: number } | null {
  if (ir.nodes.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of ir.nodes) {
    minX = Math.min(minX, n.position.x);
    maxX = Math.max(maxX, n.position.x + n.size.width);
    minY = Math.min(minY, n.position.y);
    maxY = Math.max(maxY, n.position.y + n.size.height);
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Left edge and width of the lane backgrounds (canvas units): from the label
 * gutter left of the first column to a little past the last one.
 */
export function laneSpan(ir: IR): { x: number; width: number } | null {
  const s = nodeSpan(ir);
  if (!s) return null;
  const x = s.minX - LANE_GUTTER;
  return { x, width: s.maxX - x + LANE_PAD_RIGHT };
}

/**
 * Everything the canvas draws, in canvas units: the nodes and, when the IR has
 * lanes, the lane backgrounds with their label gutter. This is what "the whole
 * tree" means for the initial camera.
 */
export function treeBounds(ir: IR): Rect | null {
  const s = nodeSpan(ir);
  if (!s) return null;
  let { minX, maxX, minY, maxY } = s;
  const lanes = laneSpan(ir);
  if (lanes && hasLanes(ir)) {
    minX = Math.min(minX, lanes.x);
    maxX = Math.max(maxX, lanes.x + lanes.width);
    for (const t of ir.tracks) {
      if (!t.lane) continue;
      minY = Math.min(minY, t.lane.y);
      maxY = Math.max(maxY, t.lane.y + t.lane.height);
    }
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Horizontal extent of one band (era column) from its nodes, canvas units. */
export function bandColumn(ir: IR, bandId: string | undefined): { left: number; right: number } | null {
  if (!bandId) return null;
  let left = Infinity;
  let right = -Infinity;
  for (const n of ir.nodes) {
    if (n.band !== bandId) continue;
    left = Math.min(left, n.position.x);
    right = Math.max(right, n.position.x + n.size.width);
  }
  return left === Infinity ? null : { left, right };
}
