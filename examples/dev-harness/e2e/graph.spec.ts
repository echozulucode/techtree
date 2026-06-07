import { test, expect } from '@playwright/test';

// Drives the dev-harness against the bundled ai-delivery IR (the delivery
// profile), which is deterministic and small. Proves the viewer renders an
// arbitrary profile's graph and that node selection works.
const DELIVERY = '/?ir=/ir/ai-delivery.ir.json';

test.describe('graph navigation', () => {
  test('renders the delivery graph nodes', async ({ page }) => {
    await page.goto(DELIVERY);
    const nodes = page.getByTestId('graph-node');
    await expect(nodes.first()).toBeVisible();
    expect(await nodes.count()).toBeGreaterThanOrEqual(8);
  });

  test('selecting a node opens its detail panel', async ({ page }) => {
    await page.goto(DELIVERY);
    const node = page.locator('[data-testid="graph-node"][data-node-id="ai.adopted-ai-tooling"]');
    await expect(node).toBeVisible();
    await node.click();
    const panel = page.getByTestId('side-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-node-id', 'ai.adopted-ai-tooling');
    await expect(panel).toContainText('Adopted AI-assisted development');
  });

  test('the bundled skill tree also renders', async ({ page }) => {
    await page.goto('/?ir=/ir/personal-learning.ir.json');
    await expect(page.getByTestId('graph-node').first()).toBeVisible();
    expect(await page.getByTestId('graph-node').count()).toBeGreaterThanOrEqual(10);
  });
});
