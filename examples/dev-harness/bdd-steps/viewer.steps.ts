import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

// Concrete values live in the step layer, keeping the feature text intent-focused.
// In the ai-delivery graph, the starting node has no prerequisites and the
// dependent node requires only the starting node.
const STARTING_NODE = 'ai.adopted-ai-tooling';
const DEPENDENT_NODE = 'ai.faster-iteration';
const DEFAULT_THEME = 'civ-iv';
const ALT_THEME = 'minimal-dark';

// Per-scenario scratch (each scenario gets its own page, so this is isolated).
const scratch = new WeakMap<Page, Record<string, unknown>>();
function mem(page: Page): Record<string, unknown> {
  let m = scratch.get(page);
  if (!m) {
    m = {};
    scratch.set(page, m);
  }
  return m;
}

function node(page: Page, id: string) {
  return page.locator(`[data-testid="graph-node"][data-node-id="${id}"]`);
}

// Select the (centered, frontier) starting node and confirm its panel is open.
async function openStartingNode(page: Page): Promise<void> {
  await node(page, STARTING_NODE).click();
  await expect(page.getByTestId('side-panel')).toHaveAttribute('data-node-id', STARTING_NODE);
}

async function panelAction(page: Page, label: string): Promise<void> {
  await page.getByTestId('side-panel').getByRole('button', { name: label }).click();
}

// --- Status overlay --------------------------------------------------------

Then('the starting node is shown as available', async ({ page }) => {
  await expect(node(page, STARTING_NODE)).toHaveAttribute('data-status', 'available');
});

Then('a node with unmet prerequisites is shown as locked', async ({ page }) => {
  await expect(node(page, DEPENDENT_NODE)).toHaveAttribute('data-status', 'locked');
});

When('the learner marks the starting node achieved', async ({ page }) => {
  await openStartingNode(page);
  await panelAction(page, 'Mark achieved');
});

Then('a node that depended on it becomes available', async ({ page }) => {
  await expect(node(page, DEPENDENT_NODE)).toHaveAttribute('data-status', 'available');
});

When('the learner marks the starting node in progress', async ({ page }) => {
  await openStartingNode(page);
  await panelAction(page, 'Mark in progress');
});

Then('the starting node is shown as in progress', async ({ page }) => {
  await expect(page.getByTestId('side-panel')).toHaveAttribute('data-status', 'in_progress');
});

// --- Theming ---------------------------------------------------------------

Then('the graph is shown in its default theme', async ({ page }) => {
  await expect(page.getByTestId('theme-select')).toHaveValue(DEFAULT_THEME);
});

Given("the reader has opened a node's detail", async ({ page }) => {
  await openStartingNode(page);
});

When('the reader switches to another theme', async ({ page }) => {
  const root = page.getByTestId('viewer-root');
  mem(page).bgBefore = await root.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.getByTestId('theme-select').selectOption(ALT_THEME);
});

Then('the graph is repainted in the chosen theme', async ({ page }) => {
  await expect(page.getByTestId('theme-select')).toHaveValue(ALT_THEME);
  const root = page.getByTestId('viewer-root');
  await expect
    .poll(() => root.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(mem(page).bgBefore);
});

Then("that node's detail is still open", async ({ page }) => {
  await expect(page.getByTestId('side-panel')).toBeVisible();
  await expect(page.getByTestId('side-panel')).toHaveAttribute('data-node-id', STARTING_NODE);
});

// --- Progress persistence --------------------------------------------------

Given('the learner has marked the starting node achieved', async ({ page }) => {
  await openStartingNode(page);
  await panelAction(page, 'Mark achieved');
  await expect(node(page, STARTING_NODE)).toHaveAttribute('data-status', 'achieved');
});

When('the learner reopens the graph', async ({ page }) => {
  await page.reload();
  await expect(node(page, STARTING_NODE)).toBeVisible();
});

Then('the starting node is still achieved', async ({ page }) => {
  await expect(node(page, STARTING_NODE)).toHaveAttribute('data-status', 'achieved');
});

When('the learner exports their progress', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'save state' }).click(),
  ]);
  mem(page).downloadName = download.suggestedFilename();
});

Then('a progress file for this graph is produced', async ({ page }) => {
  expect(String(mem(page).downloadName)).toContain('ai-delivery');
});

When('the learner imports progress from a different graph', async ({ page }) => {
  const messages: string[] = [];
  page.on('dialog', (d) => {
    messages.push(d.message());
    void d.accept();
  });
  mem(page).dialogs = messages;
  const foreign = JSON.stringify({
    schema_version: 1,
    user_id: 'local',
    tree_id: 'some-other-graph',
    skills: {},
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: 'other.state.json',
    mimeType: 'application/json',
    buffer: Buffer.from(foreign),
  });
});

Then('the import is refused', async ({ page }) => {
  await expect.poll(() => (mem(page).dialogs as string[]).length).toBeGreaterThan(0);
  expect((mem(page).dialogs as string[]).join(' ')).toMatch(/tree|graph/i);
});
