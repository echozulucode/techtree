import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

// Concrete values for the automatic-camera scenarios of features/embedding.feature
// (initialFocus="auto", ADR-0009). Host page: the dev-harness `?embed=` mode.
const AUTO = '/?embed=engineering-platform&scheme=light&focus=auto';
const SCREENS: Record<string, { width: number; height: number }> = {
  phone: { width: 390, height: 844 },
  laptop: { width: 1440, height: 900 },
  'wide screen': { width: 2560, height: 1440 },
};
const ERA_HEADER = 44;
const MAX_EMPTY_BAND = 48;
const FRONTIER_ERA = 'standardization';
const EXTENTS: Record<string, 'fit' | 'focus'> = {
  'the whole tree': 'fit',
  'the era being worked on, close up': 'focus',
};

const view = (page: Page) => page.getByTestId('techtree-view');
const transform = (page: Page) =>
  page.locator('.react-flow__viewport').evaluate((el) => (el as HTMLElement).style.transform);

let zoomedTransform = '';

Given('the capability demo tree is embedded with the automatic camera on a {word}', async ({ page }, screen: string) => {
  await page.setViewportSize(SCREENS[screen]!);
  await page.goto(AUTO);
  await expect(view(page)).toHaveAttribute('data-camera', /fit|focus/);
});

// "wide screen" has a space: its own step text.
Given('the capability demo tree is embedded with the automatic camera on a wide screen', async ({ page }) => {
  await page.setViewportSize(SCREENS['wide screen']!);
  await page.goto(AUTO);
  await expect(view(page)).toHaveAttribute('data-camera', /fit|focus/);
});

Then('the branch titles and the era headings are in view', async ({ page }) => {
  const r = await page.evaluate((era) => {
    const flow = document.querySelector('.react-flow')!.getBoundingClientRect();
    const first = [...document.querySelectorAll<HTMLElement>('[data-testid="graph-lane"]')].sort(
      (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
    )[0]!;
    const label =
      document.querySelector<HTMLElement>(`[data-testid="lane-rail-label"][data-track-id="${first.dataset.trackId}"]`) ??
      first.querySelector<HTMLElement>('[data-testid="lane-label"]')!;
    const range = document.createRange();
    range.selectNodeContents(document.querySelector(`[data-testid="era-banners"] [data-band-id="${era}"]`)!);
    const within = (b: DOMRect) =>
      b.left >= flow.left - 0.5 && b.right <= flow.right + 0.5 && b.top >= flow.top - 0.5 && b.bottom <= flow.bottom + 0.5;
    return { label: within(label.getBoundingClientRect()), era: within(range.getBoundingClientRect()) };
  }, FRONTIER_ERA);
  expect(r).toEqual({ label: true, era: true });
});

Then('the first branch starts right under the era headings', async ({ page }) => {
  const top = await page.evaluate(() => {
    const flow = document.querySelector('.react-flow')!.getBoundingClientRect();
    const tops = [...document.querySelectorAll('[data-testid="graph-lane"]')].map((l) => l.getBoundingClientRect().top);
    return Math.min(...tops) - flow.top;
  });
  expect(top).toBeGreaterThanOrEqual(ERA_HEADER);
  expect(top - ERA_HEADER).toBeLessThanOrEqual(MAX_EMPTY_BAND);
});

Then('the map shows the whole tree', async ({ page }) => {
  await expect(view(page)).toHaveAttribute('data-camera', EXTENTS['the whole tree']!);
});

Then('the map shows the era being worked on, close up', async ({ page }) => {
  await expect(view(page)).toHaveAttribute('data-camera', EXTENTS['the era being worked on, close up']!);
});

When('the window grows before the reader touches the map', async ({ page }) => {
  await page.setViewportSize(SCREENS['wide screen']!);
});

When('the reader zooms the map and the window shrinks again', async ({ page }) => {
  const before = await transform(page);
  const flow = (await page.locator('.react-flow').boundingBox())!;
  await page.mouse.move(flow.x + flow.width / 2, flow.y + flow.height / 2);
  await page.mouse.wheel(0, -200);
  await expect.poll(() => transform(page)).not.toBe(before);
  zoomedTransform = await transform(page);
  await page.setViewportSize(SCREENS.laptop!);
  await page.waitForTimeout(300);
});

Then('the camera stays where the reader put it', async ({ page }) => {
  expect(await transform(page)).toBe(zoomedTransform);
});
