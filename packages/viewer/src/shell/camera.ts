import type { Viewport } from '../renderer.js';
import { laneRailWidth, type Rect } from './lane-geometry.js';

/** Defaults of `initialFocus="auto"`. */
export const AUTO_CAMERA_DEFAULTS = {
  /** Fit the whole tree only when that zoom is at least this readable. */
  readableZoom: 0.6,
  /** Zoom of the focused (not fitted) camera. */
  focusZoom: 0.8,
  /** A fitted small tree is never blown up beyond its natural size. */
  fitMaxZoom: 1,
  /** Screen px between the tree and the canvas edges (below the era header at the top). */
  padding: 12,
} as const;

export interface AutoCameraInput {
  /** Canvas size in screen px. */
  container: { width: number; height: number };
  /** Everything the canvas draws (nodes + lanes with their label gutter), canvas units. */
  bounds: Rect | null;
  /** Era column of the frontier node, canvas units (null: no frontier). */
  focusColumn: { left: number; right: number } | null;
  /** The frontier node, canvas units — kept on screen vertically. */
  focusNode: Rect | null;
  readableZoom?: number;
  focusZoom?: number;
  /** Zoom bounds of the canvas. */
  minZoom?: number;
  maxZoom?: number;
  /** Upper bound for the fitted zoom (default 1). */
  fitMaxZoom?: number;
  /** Height of the pinned era header row over the canvas (0 when none). */
  headerHeight?: number;
  /**
   * The tree has lanes whose titles sit in a gutter left of the first column;
   * when the camera starts right of that gutter, the titles are shown in a
   * pinned rail of `laneRailWidth(container.width)` px and the focused column
   * starts right of it.
   */
  laneRail?: boolean;
  padding?: number;
}

export interface AutoCameraDecision {
  /** 'fit' = the whole tree; 'focus' = the frontier's era at `focusZoom`. */
  mode: 'fit' | 'focus';
  /** Zoom that fits the whole tree in the container (before any cap). */
  fitZoom: number;
  /**
   * Focus mode: 'tree' = left edge at the tree (lane titles on the canvas, the
   * frontier column fits beside them); 'column' = left edge at the frontier's
   * era column (lane titles in the rail). Fit mode: 'tree'.
   */
  anchor: 'tree' | 'column';
  viewport: Viewport;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * The `initialFocus="auto"` camera, as a pure function of the canvas size and
 * the tree geometry (see ADR-0009):
 *
 * - **fit** when the whole tree fits at a readable zoom (`fitZoom ≥
 *   readableZoom`): centred horizontally, top-aligned under the era header,
 *   zoom capped at `fitMaxZoom`;
 * - else **focus** at `focusZoom`, top-aligned under the era header (moved down
 *   only as far as needed to show the frontier node), left-aligned at the tree
 *   so the lane titles show — or, when the frontier's era column would not fit
 *   beside them, left-aligned at that column with the titles in the rail.
 */
export function computeAutoCamera(input: AutoCameraInput): AutoCameraDecision {
  const { container, bounds } = input;
  const readableZoom = input.readableZoom ?? AUTO_CAMERA_DEFAULTS.readableZoom;
  const minZoom = input.minZoom ?? 0.04;
  const maxZoom = input.maxZoom ?? 2;
  const pad = input.padding ?? AUTO_CAMERA_DEFAULTS.padding;
  const header = input.headerHeight ?? 0;
  const W = container.width;
  const H = container.height;
  if (!bounds || bounds.width <= 0 || bounds.height <= 0 || W <= 0 || H <= 0) {
    return { mode: 'fit', fitZoom: 1, anchor: 'tree', viewport: { x: 0, y: 0, zoom: 1 } };
  }
  const top = header + pad;

  const fitZoom = Math.min((W - 2 * pad) / bounds.width, (H - top - pad) / bounds.height);
  if (fitZoom >= readableZoom) {
    const zoom = clamp(Math.min(fitZoom, input.fitMaxZoom ?? AUTO_CAMERA_DEFAULTS.fitMaxZoom), minZoom, maxZoom);
    return {
      mode: 'fit',
      fitZoom,
      anchor: 'tree',
      viewport: { x: (W - bounds.width * zoom) / 2 - bounds.x * zoom, y: top - bounds.y * zoom, zoom },
    };
  }

  const zoom = clamp(input.focusZoom ?? AUTO_CAMERA_DEFAULTS.focusZoom, minZoom, maxZoom);

  // Vertical: the first lane right under the era header, unless the frontier
  // node would then be below the fold.
  let y = top - bounds.y * zoom;
  const node = input.focusNode;
  if (node) {
    const fold = H - pad - (node.y + node.height) * zoom;
    y = Math.max(top - node.y * zoom, Math.min(y, fold));
  }

  // Horizontal: the tree's left edge (lane titles) when the frontier column
  // fits beside it; else that column, right of the lane-title rail.
  const treeLeft = pad - bounds.x * zoom;
  const col = input.focusColumn;
  if (!col || treeLeft + col.right * zoom <= W - pad) {
    return { mode: 'focus', fitZoom, anchor: 'tree', viewport: { x: treeLeft, y, zoom } };
  }
  const rail = input.laneRail ? laneRailWidth(W) : 0;
  let x = rail + pad - col.left * zoom;
  // Never scroll past the tree's right edge, never left of its left edge.
  x = Math.max(x, W - pad - (bounds.x + bounds.width) * zoom);
  x = Math.min(x, treeLeft);
  return { mode: 'focus', fitZoom, anchor: x < treeLeft ? 'column' : 'tree', viewport: { x, y, zoom } };
}
