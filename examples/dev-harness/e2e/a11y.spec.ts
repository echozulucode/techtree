import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Accessibility of the embedded view in a real browser (colour contrast and
// target size need layout): axe WCAG 2.2 A/AA + best practice on the dev-harness
// host page (`?embed=`: header, <main>, h1, view at headingLevel 2), in both
// schemes, desktop and phone widths, in the states that used to fail —
// drawer open, path highlight (dimmed nodes), pressed status chips, outline.
const EMBED = '/?embed=engineering-platform';
const NS = 'eng.platform/';
const SAU = `${NS}safe-automatic-update`;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

const node = (page: Page, id: string) => page.locator(`[data-testid="graph-node"][data-node-id="${id}"]`);

async function expectNoViolations(page: Page, label: string): Promise<void> {
  const res = await new AxeBuilder({ page })
    .options({
      runOnly: { type: 'tag', values: TAGS },
      // Deprecated in axe 4.11+ but still enforced by older axe versions hosts run.
      rules: { 'landmark-complementary-is-top-level': { enabled: true } },
    })
    .analyze();
  const summary = res.violations.map(
    (v) => `${v.id}: ${v.nodes.slice(0, 5).map((n) => `${n.target.join(' ')} — ${n.failureSummary?.split('\n')[1] ?? ''}`).join(' | ')}`,
  );
  expect(summary, label).toEqual([]);
}

for (const scheme of ['light', 'dark'] as const) {
  for (const vp of [
    { name: 'desktop', width: 1366, height: 900 },
    { name: 'phone', width: 390, height: 844 },
  ]) {
    test(`axe: ${scheme} ${vp.name} — map, drawer + path highlight, pressed chip, outline`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${EMBED}&scheme=${scheme}`);
      await expect(node(page, SAU)).toBeVisible();
      await expectNoViolations(page, 'map');

      await node(page, SAU).click();
      await expect(page.getByTestId('techtree-detail')).toHaveAttribute('data-node-id', SAU);
      await expect(page.locator('[data-testid="graph-node"][data-dim="true"]').first()).toBeAttached();
      await expectNoViolations(page, 'drawer + highlight');

      await page.keyboard.press('Escape');
      await expect(page.getByTestId('techtree-detail')).toHaveCount(0);
      await page.getByTestId('status-filter').getByRole('button', { name: /Operational/ }).click();
      await expect(page.getByTestId('status-filter').getByRole('button', { name: /Operational/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expectNoViolations(page, 'pressed status chip');

      await page.getByRole('button', { name: 'Outline' }).click();
      await expect(page.getByTestId('techtree-outline')).toBeVisible();
      await expectNoViolations(page, 'outline');
    });
  }
}

test('React Flow carries the host scheme class, never a bare "light" in dark mode', async ({ page }) => {
  await page.goto(`${EMBED}&scheme=dark`);
  await expect(node(page, SAU)).toBeVisible();
  await expect(page.locator('.react-flow')).toHaveClass(/\bdark\b/);
  await expect(page.locator('.react-flow')).not.toHaveClass(/\blight\b/);
});

test('focus follows the drawer: node → heading, drawer link → new heading, Escape closes', async ({ page }) => {
  await page.goto(`${EMBED}&scheme=light`);
  await node(page, SAU).click();
  const drawer = page.getByTestId('techtree-detail');
  await expect(drawer.getByRole('heading', { level: 2, name: 'Safe Automatic Update' })).toBeFocused();
  await drawer.getByTestId('detail-prerequisites').getByRole('button', { name: 'Rollback Support' }).click();
  await expect(drawer.getByRole('heading', { level: 2, name: 'Rollback Support' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
});

test('phone: initialFocus=frontier starts on a readable node instead of the whole tree', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${EMBED}&scheme=light`);
  await expect(node(page, SAU)).toBeVisible();
  const fitted = await node(page, SAU).boundingBox();

  await page.goto(`${EMBED}&scheme=light&focus=frontier&zoom=0.8`);
  const transform = page.locator('.react-flow__viewport');
  await expect(transform).toHaveAttribute('style', /scale\(0\.8\)/);
  const focused = await node(page, SAU).boundingBox();
  // Same node, ≥ 3× larger than in the fit-everything view.
  expect(focused!.width).toBeGreaterThan(fitted!.width * 3);
});
