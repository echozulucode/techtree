import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

// Concrete values (which graph maps to which IR url, the minimum node count)
// live here in the step layer, not in the feature text — the features stay
// intent-focused. See features/README.md.
const MIN_NODES = 5;

Given('the {string} graph is open', async ({ page }, name: string) => {
  await page.goto(`/?ir=/ir/${name}.ir.json`);
  await expect(page.getByTestId('graph-node').first()).toBeVisible();
});

Then('I can see several nodes', async ({ page }) => {
  const count = await page.getByTestId('graph-node').count();
  expect(count).toBeGreaterThanOrEqual(MIN_NODES);
});

When('I select the node {string}', async ({ page }, id: string) => {
  await page.locator(`[data-testid="graph-node"][data-node-id="${id}"]`).click();
});

Then('the detail panel describes that node', async ({ page }) => {
  const panel = page.getByTestId('side-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-node-id', /.+/);
});
