import type { IR } from '@echozedlabs/techtree-ir';
import type { Viewport } from '../renderer.js';
import { ERA_HEADER_HEIGHT, LANE_LABEL_INSET, hasLanes, laneSpan } from './lane-geometry.js';

/** Approximate height of one rail label (two lines of 12 px text + padding). */
const LABEL_MIN_ROOM = 26;

export interface LaneRailLabel {
  trackId: string;
  title: string;
  color?: string;
  /** Screen y of the label's top edge inside the canvas. */
  top: number;
  /** Screen px left in the lane below `top` (the label clips to it). */
  room: number;
}

/**
 * Labels for the pinned lane-title rail under `viewport`, or [] when the
 * lane titles on the canvas are visible (their gutter is on screen) or the
 * tree has no lanes. Pure; exported for tests.
 */
export function laneRailLabels(ir: IR, viewport: Viewport, headerHeight = ERA_HEADER_HEIGHT): LaneRailLabel[] {
  const span = laneSpan(ir);
  if (!span || !hasLanes(ir)) return [];
  const { x, y, zoom } = viewport;
  // Titles on the canvas start LANE_LABEL_INSET into the lane: once that point
  // has scrolled off the left edge, the rail takes over.
  if ((span.x + LANE_LABEL_INSET) * zoom + x >= 0) return [];
  const out: LaneRailLabel[] = [];
  for (const t of [...ir.tracks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    if (!t.lane) continue;
    const laneTop = t.lane.y * zoom + y;
    const laneBottom = (t.lane.y + t.lane.height) * zoom + y;
    // Sticky within its lane: stays under the era header while the lane is on screen.
    const top = Math.max(laneTop + 4, headerHeight + 4);
    const room = laneBottom - top - 2;
    if (room < LABEL_MIN_ROOM) continue;
    out.push({ trackId: t.id, title: t.title ?? t.id, ...(t.color ? { color: t.color } : {}), top, room });
  }
  return out;
}

export interface LaneRailProps {
  ir: IR;
  viewport: Viewport;
}

/**
 * Lane titles pinned to the left edge of the canvas while the lane-title
 * gutter is scrolled off screen (the counterpart of the pinned era header).
 * Decorative duplicates of the canvas titles: hidden from assistive tech (the
 * outline view is the accessible structure).
 */
export function LaneRail({ ir, viewport }: LaneRailProps) {
  const labels = laneRailLabels(ir, viewport);
  if (labels.length === 0) return null;
  return (
    <div className="tt-lane-rail" data-testid="lane-rail" aria-hidden="true">
      {labels.map((l) => (
        <div
          key={l.trackId}
          className="tt-lane-rail-label"
          data-testid="lane-rail-label"
          data-track-id={l.trackId}
          style={{
            top: l.top,
            maxHeight: l.room,
            ...(l.color ? { borderLeftColor: l.color } : {}),
          }}
        >
          {l.title}
        </div>
      ))}
    </div>
  );
}
