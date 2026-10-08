// @vitest-environment jsdom
// Initial camera for small screens (request 9): initialFocus / initialZoom /
// minZoom / fitViewOptions. jsdom stubs give the canvas 1200 × 800.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { TechTreeView } from '@echozedlabs/techtree-viewer';
import { SAU, demoState, ir } from './fixtures.js';
import { installReactFlowStubs } from './jsdom-stubs.js';

beforeAll(installReactFlowStubs);
afterEach(cleanup);

const W = 1200;
const H = 800;

async function viewport(): Promise<{ x: number; y: number; zoom: number }> {
  let vp = { x: 0, y: 0, zoom: 1 };
  await waitFor(() => {
    const t = (document.querySelector('.react-flow__viewport') as HTMLElement).style.transform;
    const m = /translate\(([-\d.e]+)px, ?([-\d.e]+)px\) scale\(([-\d.e]+)\)/.exec(t);
    expect(m).not.toBeNull();
    vp = { x: +m![1]!, y: +m![2]!, zoom: +m![3]! };
    expect(vp.zoom).not.toBe(1); // the initial fit has run
  });
  return vp;
}

/** Screen position of a node's centre under a viewport. */
function centreOnScreen(id: string, vp: { x: number; y: number; zoom: number }) {
  const n = ir.nodes.find((x) => x.id === id)!;
  return { x: vp.x + (n.position.x + n.size.width / 2) * vp.zoom, y: vp.y + (n.position.y + n.size.height / 2) * vp.zoom };
}

describe('initial camera', () => {
  it('default: the whole tree is fitted (small zoom for a 48-node tree)', async () => {
    render(<TechTreeView ir={ir} state={demoState.skills} />);
    const vp = await viewport();
    expect(vp.zoom).toBeLessThan(0.6);
  });

  it('initialFocus=<id> + initialZoom centres that node at that zoom', async () => {
    render(<TechTreeView ir={ir} state={demoState.skills} initialFocus={SAU} initialZoom={1.25} />);
    const vp = await viewport();
    expect(vp.zoom).toBeCloseTo(1.25, 5);
    const c = centreOnScreen(SAU, vp);
    expect(c.x).toBeCloseTo(W / 2, 0);
    expect(c.y).toBeCloseTo(H / 2, 0);
  });

  it('initialFocus="frontier" centres the leftmost node being worked on (default zoom 0.9)', async () => {
    render(<TechTreeView ir={ir} state={demoState.skills} initialFocus="frontier" />);
    const vp = await viewport();
    expect(vp.zoom).toBeCloseTo(0.9, 5);
    const investigating = ir.nodes
      .filter((n) => (demoState.skills[n.id] as { status?: string } | undefined)?.status === 'investigating')
      .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)[0]!;
    const c = centreOnScreen(investigating.id, vp);
    expect(c.x).toBeCloseTo(W / 2, 0);
    expect(c.y).toBeCloseTo(H / 2, 0);
  });

  it('fitViewOptions.minZoom keeps the initial fit readable; minZoom bounds the canvas', async () => {
    render(<TechTreeView ir={ir} state={demoState.skills} minZoom={0.3} fitViewOptions={{ minZoom: 0.5 }} />);
    const vp = await viewport();
    expect(vp.zoom).toBeCloseTo(0.5, 5);
  });

  it('initialFocus="auto": a 1200 × 800 canvas cannot fit the tree readably → frontier era at 0.8, lane titles and first lane under the era header', async () => {
    render(<TechTreeView ir={ir} state={demoState.skills} initialFocus="auto" />);
    const vp = await viewport();
    const root = document.querySelector('[data-testid="techtree-view"]') as HTMLElement;
    await waitFor(() => expect(root.dataset.camera).toBe('focus'));
    expect(root.dataset.cameraAnchor).toBe('tree');
    expect(Number(root.dataset.cameraFitZoom)).toBeLessThan(0.6);
    expect(vp.zoom).toBeCloseTo(0.8, 5);
    // tree left edge (lane-title gutter, 190 left of the first column at x 12) at 12 px; first lane (y 0) at 44 + 12 px
    expect(vp.x).toBeCloseTo(12 + (190 - 12) * 0.8, 5);
    expect(vp.y).toBeCloseTo(56, 5);
    expect(document.querySelector('.react-flow.tt-camera-pending')).toBeNull();
  });

  it('initialFocus="auto" with readableZoom={0.3} fits the whole tree, top-aligned', async () => {
    render(<TechTreeView ir={ir} state={demoState.skills} initialFocus="auto" readableZoom={0.3} />);
    const vp = await viewport();
    const root = document.querySelector('[data-testid="techtree-view"]') as HTMLElement;
    await waitFor(() => expect(root.dataset.camera).toBe('fit'));
    expect(vp.zoom).toBeCloseTo(Number(root.dataset.cameraFitZoom), 2);
    expect(vp.y).toBeCloseTo(56, 5);
  });

  it('initialZoom alone centres the whole tree at that zoom; unknown ids fall back to the fit', async () => {
    const { unmount } = render(<TechTreeView ir={ir} state={demoState.skills} initialZoom={0.75} />);
    expect((await viewport()).zoom).toBeCloseTo(0.75, 5);
    unmount();
    render(<TechTreeView ir={ir} state={demoState.skills} initialFocus="no-such-node" />);
    expect((await viewport()).zoom).toBeLessThan(0.6);
  });
});
