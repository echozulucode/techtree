import { expect, test, type Page } from '@playwright/test';

// initialFocus="auto" (ADR-0009) in a real browser: at phone, laptop and wide
// screen sizes the first lane's title and the era header are on screen, and no
// empty band wider than 48 px sits between the era header and the first lane.
// The decision itself is unit-tested (viewer/src/camera.test.ts).
const AUTO = '/?embed=engineering-platform&scheme=light&focus=auto';
const ERA_HEADER = 44;
const MAX_EMPTY_BAND = 48;
const FRONTIER_ERA = 'standardization'; // Versioned APIs (leftmost investigating)

type Box = { x: number; y: number; width: number; height: number };
const inside = (b: Box, r: Box, slack = 0.5) =>
  b.x >= r.x - slack && b.y >= r.y - slack && b.x + b.width <= r.x + r.width + slack && b.y + b.height <= r.y + r.height + slack;

async function settled(page: Page): Promise<void> {
  await expect(page.getByTestId('techtree-view')).toHaveAttribute('data-camera', /fit|focus/);
  await expect(page.locator('.react-flow.tt-camera-pending')).toHaveCount(0);
}

/** Measurements of the initial camera, all in page px. */
async function measure(page: Page) {
  return page.evaluate(() => {
    const flow = document.querySelector('.react-flow')!.getBoundingClientRect();
    const lanes = [...document.querySelectorAll<HTMLElement>('[data-testid="graph-lane"]')].sort(
      (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
    );
    const first = lanes[0]!;
    const track = first.dataset.trackId!;
    const rail = document.querySelector<HTMLElement>(`[data-testid="lane-rail-label"][data-track-id="${track}"]`);
    const label = rail ?? first.querySelector<HTMLElement>('[data-testid="lane-label"]')!;
    const lb = label.getBoundingClientRect();
    const hit = document.elementFromPoint(lb.x + Math.min(lb.width / 2, 20), lb.y + lb.height / 2);
    const box = (r: DOMRect) => ({ x: r.x, y: r.y, width: r.width, height: r.height });
    // Era titles are centred in a box that reaches the next era: measure the text itself.
    const eras = [...document.querySelectorAll<HTMLElement>('[data-testid="era-banners"] [data-band-id]')].map((e) => {
      const range = document.createRange();
      range.selectNodeContents(e);
      return { id: e.dataset.bandId!, box: box(range.getBoundingClientRect()) };
    });
    const root = document.querySelector<HTMLElement>('[data-testid="techtree-view"]')!;
    return {
      mode: root.dataset.camera,
      anchor: root.dataset.cameraAnchor,
      fitZoom: Number(root.dataset.cameraFitZoom),
      flow: box(flow),
      track,
      labelSource: rail ? 'rail' : 'canvas',
      label: box(lb),
      // Titles ignore the pointer, so the hit is what lies under them: nothing that
      // paints above them may be there (nodes cover canvas titles; the zoom
      // controls and minimap cover both).
      labelVisible:
        hit !== null && hit.closest(rail ? '.react-flow__panel' : '[data-testid="graph-node"], .react-flow__panel') === null,
      firstLaneTop: first.getBoundingClientRect().top - flow.top,
      eras,
      transform: (document.querySelector('.react-flow__viewport') as HTMLElement).style.transform,
    };
  });
}

for (const vp of [
  { name: 'small phone', width: 360, height: 740, mode: 'focus', label: 'rail' },
  { name: 'phone', width: 390, height: 844, mode: 'focus', label: 'rail' },
  { name: 'laptop', width: 1440, height: 900, mode: 'focus', label: 'canvas' },
  { name: 'wide', width: 2560, height: 1440, mode: 'fit', label: 'canvas' },
] as const) {
  test(`auto camera ${vp.width}×${vp.height}: first lane title and era header in view, no empty band above the first lane`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(AUTO);
    await settled(page);
    const m = await measure(page);
    test.info().annotations.push({ type: 'camera', description: JSON.stringify({ ...m, eras: undefined }) });

    expect(m.mode).toBe(vp.mode);
    // first lane title: inside the canvas and not covered
    expect(m.labelSource).toBe(vp.label);
    expect(inside(m.label, m.flow), `lane title ${m.track} inside the canvas`).toBe(true);
    expect(m.labelVisible, `lane title ${m.track} is not covered`).toBe(true);
    // era header: the frontier's era title fully on screen
    const era = m.eras.find((e) => e.id === FRONTIER_ERA)!;
    expect(inside(era.box, m.flow), 'frontier era title inside the canvas').toBe(true);
    // the first lane starts right under the era header
    expect(m.firstLaneTop).toBeGreaterThanOrEqual(ERA_HEADER);
    expect(m.firstLaneTop - ERA_HEADER).toBeLessThanOrEqual(MAX_EMPTY_BAND);
  });
}

test('auto camera follows a resize until the reader moves the camera, then never again', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(AUTO);
  await settled(page);
  expect((await measure(page)).mode).toBe('focus');

  // resized before any interaction → recomputed (now the whole tree fits)
  await page.setViewportSize({ width: 2560, height: 1440 });
  await expect(page.getByTestId('techtree-view')).toHaveAttribute('data-camera', 'fit');
  const fitted = (await measure(page)).transform;

  // the reader zooms → later resizes leave the camera alone
  const flow = (await measure(page)).flow;
  await page.mouse.move(flow.x + flow.width / 2, flow.y + flow.height / 2);
  await page.mouse.wheel(0, -200);
  await expect.poll(async () => (await measure(page)).transform).not.toBe(fitted);
  const zoomed = (await measure(page)).transform;
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
  const after = await measure(page);
  expect(after.transform).toBe(zoomed);
  expect(after.mode).toBe('fit');
});

test('frontier and node-id cameras are unchanged by "auto"', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?embed=engineering-platform&scheme=light&focus=frontier&zoom=0.8');
  await expect(page.locator('.react-flow__viewport')).toHaveAttribute('style', /scale\(0\.8\)/);
  await expect(page.getByTestId('techtree-view')).not.toHaveAttribute('data-camera', /.+/);
});
