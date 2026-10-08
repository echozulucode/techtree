// initialFocus="auto" (ADR-0009): the fit-vs-focus decision is a pure function
// of the canvas size and the tree geometry, tested here without a DOM; the
// lane-title rail's visibility likewise. Browser coverage:
// examples/dev-harness/e2e/camera.spec.ts.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IR } from '@echozedlabs/techtree-ir';
import { AUTO_CAMERA_DEFAULTS, computeAutoCamera, type AutoCameraInput } from './shell/camera.js';
import { laneRailLabels } from './shell/LaneRail.js';
import { ERA_HEADER_HEIGHT, bandColumn, laneRailWidth, treeBounds } from './shell/lane-geometry.js';

const here = dirname(fileURLToPath(import.meta.url));
const ir = JSON.parse(
  readFileSync(join(here, '..', 'public', 'ir', 'engineering-platform.ir.json'), 'utf8'),
) as IR;

// Demo tree: 6 eras × 8 lanes. The frontier (leftmost investigating node) is
// Versioned APIs in era II (standardization).
const bounds = treeBounds(ir)!;
const frontier = ir.nodes.find((n) => n.id === 'eng.platform/versioned-apis')!;
const demo: Omit<AutoCameraInput, 'container'> = {
  bounds,
  focusColumn: bandColumn(ir, frontier.band),
  focusNode: { x: frontier.position.x, y: frontier.position.y, width: frontier.size.width, height: frontier.size.height },
  headerHeight: ERA_HEADER_HEIGHT,
  laneRail: true,
};
const PAD = AUTO_CAMERA_DEFAULTS.padding;
const TOP = ERA_HEADER_HEIGHT + PAD;

/** Screen rect of a canvas rect under a viewport. */
const onScreen = (r: { x: number; y: number; width: number; height: number }, v: { x: number; y: number; zoom: number }) => ({
  left: v.x + r.x * v.zoom,
  top: v.y + r.y * v.zoom,
  right: v.x + (r.x + r.width) * v.zoom,
  bottom: v.y + (r.y + r.height) * v.zoom,
});

describe('tree geometry', () => {
  it('the whole tree = nodes + lanes with their title gutter', () => {
    // nodes span x 12…3402, y 24…1624; lanes y 0…1648; gutter 190 left, 40 right
    expect(bounds).toEqual({ x: 12 - 190, y: 0, width: 3402 + 40 - (12 - 190), height: 1648 });
    expect(bandColumn(ir, 'standardization')).toEqual({ left: 612, right: 832 });
    expect(bandColumn(ir, 'no-such-band')).toBeNull();
  });

  it('rail width: 24 % of the canvas, 96…168 px', () => {
    expect(laneRailWidth(358)).toBe(96);
    expect(laneRailWidth(500)).toBe(120);
    expect(laneRailWidth(1344)).toBe(168);
  });
});

describe('computeAutoCamera: fit vs. focus by container size (demo tree)', () => {
  it('wide screen (2464 × 1100): the whole tree fits at ≥ 0.6 → fit, top-aligned under the era header, centred', () => {
    const d = computeAutoCamera({ ...demo, container: { width: 2464, height: 1100 } });
    expect(d.mode).toBe('fit');
    expect(d.fitZoom).toBeCloseTo(Math.min((2464 - 2 * PAD) / bounds.width, (1100 - TOP - PAD) / bounds.height), 6);
    expect(d.fitZoom).toBeGreaterThanOrEqual(0.6);
    expect(d.viewport.zoom).toBeCloseTo(d.fitZoom, 6);
    const tree = onScreen(bounds, d.viewport);
    expect(tree.top).toBeCloseTo(TOP, 6); // first lane right under the header: no empty band
    expect(tree.left).toBeGreaterThanOrEqual(PAD - 1e-6);
    expect(tree.right).toBeLessThanOrEqual(2464 - PAD + 1e-6);
    expect(tree.left).toBeCloseTo(2464 - tree.right, 6); // centred
    expect(tree.bottom).toBeLessThanOrEqual(1100 - PAD + 1e-6);
  });

  it('laptop (1344 × 686): fit would be ~0.37 → focus at 0.8, left edge at the lane titles, top at the first lane', () => {
    const d = computeAutoCamera({ ...demo, container: { width: 1344, height: 686 } });
    expect(d.mode).toBe('focus');
    expect(d.anchor).toBe('tree');
    expect(d.fitZoom).toBeLessThan(0.6);
    expect(d.viewport).toEqual({ x: PAD - bounds.x * 0.8, y: TOP, zoom: 0.8 });
    // the frontier's era column is fully on screen beside the titles
    const col = d.viewport.x + 832 * 0.8;
    expect(col).toBeLessThanOrEqual(1344 - PAD);
  });

  it('phone (358 × 700): the frontier column does not fit beside the titles → left-aligned at it, titles in the rail', () => {
    const d = computeAutoCamera({ ...demo, container: { width: 358, height: 700 } });
    expect(d.mode).toBe('focus');
    expect(d.anchor).toBe('column');
    expect(d.viewport.zoom).toBe(0.8);
    expect(d.viewport.y).toBe(TOP);
    // era II starts right of the 96 px rail
    expect(d.viewport.x + 612 * 0.8).toBeCloseTo(laneRailWidth(358) + PAD, 6);
    // and the rail is what the canvas shows for the lane titles
    expect(laneRailLabels(ir, d.viewport).length).toBeGreaterThan(0);
  });

  it('the threshold is readableZoom: exactly readable fits, just below focuses', () => {
    const W = 1000;
    const H = 2000;
    const fitZoom = (W - 2 * PAD) / bounds.width;
    expect(computeAutoCamera({ ...demo, container: { width: W, height: H }, readableZoom: fitZoom }).mode).toBe('fit');
    expect(computeAutoCamera({ ...demo, container: { width: W, height: H }, readableZoom: fitZoom + 1e-6 }).mode).toBe(
      'focus',
    );
    // a lower readableZoom turns the laptop case into a fit
    expect(computeAutoCamera({ ...demo, container: { width: 1344, height: 686 }, readableZoom: 0.3 }).mode).toBe('fit');
  });

  it('a small tree is fitted at most at its natural size (fitMaxZoom, default 1)', () => {
    const small = { x: 0, y: 0, width: 400, height: 200 };
    const d = computeAutoCamera({ ...demo, bounds: small, focusColumn: null, focusNode: null, container: { width: 1600, height: 900 } });
    expect(d.mode).toBe('fit');
    expect(d.fitZoom).toBeGreaterThan(1);
    expect(d.viewport.zoom).toBe(1);
    expect(d.viewport).toEqual({ x: (1600 - 400) / 2, y: TOP, zoom: 1 });
    expect(
      computeAutoCamera({ ...demo, bounds: small, fitMaxZoom: 1.5, container: { width: 1600, height: 900 } }).viewport.zoom,
    ).toBe(1.5);
  });

  it('focus zoom = initialZoom, clamped to the canvas zoom bounds', () => {
    const c = { width: 1344, height: 686 };
    expect(computeAutoCamera({ ...demo, container: c, focusZoom: 0.5 }).viewport.zoom).toBe(0.5);
    expect(computeAutoCamera({ ...demo, container: c, focusZoom: 0.5, minZoom: 0.7 }).viewport.zoom).toBe(0.7);
    expect(computeAutoCamera({ ...demo, container: c, focusZoom: 3, maxZoom: 2 }).viewport.zoom).toBe(2);
  });

  it('a frontier node below the fold moves the camera down just enough to show it', () => {
    const low = { x: 1682, y: 1384, width: 220, height: 88 }; // Device Identity, security lane
    const d = computeAutoCamera({
      ...demo,
      focusNode: low,
      focusColumn: bandColumn(ir, 'automation'),
      container: { width: 1344, height: 686 },
    });
    const node = onScreen(low, d.viewport);
    expect(node.bottom).toBeCloseTo(686 - PAD, 6);
    expect(node.top).toBeGreaterThanOrEqual(TOP);
  });

  it('a frontier in the last era never scrolls past the right edge of the tree', () => {
    const d = computeAutoCamera({
      ...demo,
      focusColumn: bandColumn(ir, 'intelligent'),
      focusNode: null,
      container: { width: 1344, height: 686 },
    });
    expect(d.anchor).toBe('column');
    expect(onScreen(bounds, d.viewport).right).toBeCloseTo(1344 - PAD, 6);
  });

  it('no lanes → no rail: the column starts at the padding', () => {
    const d = computeAutoCamera({ ...demo, laneRail: false, container: { width: 358, height: 700 } });
    expect(d.viewport.x + 612 * 0.8).toBeCloseTo(PAD, 6);
  });

  it('no frontier → left-aligned at the tree; no header → top padding only', () => {
    const d = computeAutoCamera({ ...demo, focusColumn: null, focusNode: null, headerHeight: 0, container: { width: 358, height: 700 } });
    expect(d).toMatchObject({ mode: 'focus', anchor: 'tree' });
    expect(d.viewport).toEqual({ x: PAD - bounds.x * 0.8, y: PAD, zoom: 0.8 });
  });

  it('an empty tree or an unmeasured canvas gives the identity viewport', () => {
    expect(computeAutoCamera({ ...demo, bounds: null, container: { width: 800, height: 600 } }).viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(computeAutoCamera({ ...demo, container: { width: 0, height: 0 } }).viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe('lane-title rail', () => {
  it('is empty while the lane titles on the canvas are on screen', () => {
    expect(laneRailLabels(ir, { x: PAD - bounds.x * 0.8, y: TOP, zoom: 0.8 })).toEqual([]);
  });

  it('pins every lane title once the gutter scrolls off, in lane order, under the era header', () => {
    const v = { x: -400, y: TOP, zoom: 0.8 };
    const labels = laneRailLabels(ir, v);
    const lanes = ir.tracks.filter((t) => t.lane).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    expect(labels.map((l) => l.trackId)).toEqual(lanes.map((t) => t.id));
    expect(labels[0]).toMatchObject({ trackId: lanes[0]!.id, title: lanes[0]!.title, top: TOP + 4 });
    for (const l of labels) expect(l.top).toBeGreaterThanOrEqual(ERA_HEADER_HEIGHT + 4);
  });

  it('a lane scrolled up under the header keeps its title below the header while there is room', () => {
    const first = ir.tracks.find((t) => t.lane?.y === 0)!; // 136 high
    const v = { x: -400, y: -60, zoom: 1 };
    const label = laneRailLabels(ir, v).find((l) => l.trackId === first.id)!;
    expect(label.top).toBe(ERA_HEADER_HEIGHT + 4);
    // scrolled further, the lane's remaining strip is too small → no label
    expect(laneRailLabels(ir, { x: -400, y: -110, zoom: 1 }).some((l) => l.trackId === first.id)).toBe(false);
  });

  it('a tree without lanes never shows the rail', () => {
    const plain: IR = { ...ir, tracks: ir.tracks.map(({ lane: _lane, ...t }) => t) };
    expect(laneRailLabels(plain, { x: -4000, y: 0, zoom: 1 })).toEqual([]);
  });
});
