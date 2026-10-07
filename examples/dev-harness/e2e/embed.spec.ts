import { test, expect } from '@playwright/test';

// The embeddable <TechTreeView> as a host mounts it (dev-harness `?embed=`), and
// the standalone SPA delegating the capability profile to the same component.
test.describe('embedded capability tree', () => {
  test('renders lanes, era headers and every capability', async ({ page }) => {
    await page.goto('/?embed=engineering-platform');
    await expect(page.getByTestId('graph-node').first()).toBeVisible();
    await expect(page.getByTestId('graph-node')).toHaveCount(48);
    await expect(page.getByTestId('graph-lane')).toHaveCount(8);
    await expect(page.getByTestId('era-banners').locator('[data-band-id]')).toHaveCount(6);
  });

  test('the SPA shows the capability IR through the embeddable view', async ({ page }) => {
    await page.goto('/?ir=/ir/engineering-platform.ir.json');
    await expect(page.getByTestId('techtree-view')).toHaveAttribute('data-profile', 'capability');
    await expect(page.getByTestId('graph-node').first()).toBeVisible();
  });
});
