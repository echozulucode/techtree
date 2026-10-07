import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

// Concrete values for features/capability_tree.feature and embedding.feature.
// The host page is the dev-harness `?embed=` mode (src/EmbedDemo.tsx), which
// mounts <TechTreeView> with the engineering-platform demo IR + demo state and
// withholds one "draft" link, like a host applying its visibility rules.
const EMBED = '/?embed=engineering-platform';
const NS = 'eng.platform/';
const UPDATE = `${NS}safe-automatic-update`;
const UPDATE_PREREQS = [`${NS}software-packaging`, `${NS}artifact-signing`, `${NS}rollback-support`];
const OFF_PATH = [`${NS}trusted-fleet-update`, `${NS}knowledge-graph`];
const CI = `${NS}continuous-integration`;
const RELEASE_MILESTONE = `${NS}push-button-release`;
const UPSTREAM_OF_CI = `${NS}version-control`;
const REPLAY = `${NS}recorded-data-replay`;
const WITHHELD_REF = 'example:can-decoder-from-dbc';
const ERA_COUNT = 6;
const BRANCH_COUNT = 8;
const NODE_COUNT = 48;

const scratch = new WeakMap<Page, Record<string, unknown>>();
function mem(page: Page): Record<string, unknown> {
  let m = scratch.get(page);
  if (!m) {
    m = {};
    scratch.set(page, m);
  }
  return m;
}

const node = (page: Page, id: string) => page.locator(`[data-testid="graph-node"][data-node-id="${id}"]`);
const drawer = (page: Page) => page.getByTestId('techtree-detail');

async function open(page: Page, scheme: 'light' | 'dark'): Promise<void> {
  await page.goto(`${EMBED}&scheme=${scheme}`);
  await expect(page.getByTestId('graph-node').first()).toBeVisible();
}

async function openCard(page: Page, id: string): Promise<void> {
  await node(page, id).click();
  await expect(drawer(page)).toHaveAttribute('data-node-id', id);
}

async function laneBoxes(page: Page): Promise<string> {
  const boxes = await page.getByTestId('graph-lane').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join(',');
    }),
  );
  return boxes.join('|');
}

async function rootLuminance(page: Page): Promise<number> {
  return page.getByTestId('techtree-view').evaluate((el) => {
    const m = getComputedStyle(el).backgroundColor.match(/\d+(\.\d+)?/g)!.map(Number);
    return (0.299 * m[0]! + 0.587 * m[1]! + 0.114 * m[2]!) / 255;
  });
}

// --- capability_tree --------------------------------------------------------

Given('the capability demo tree is embedded in a host page', async ({ page }) => {
  await open(page, 'light');
});

Then('the capabilities are arranged in era columns and branch lanes', async ({ page }) => {
  await expect(page.getByTestId('era-banners').locator('[data-band-id]')).toHaveCount(ERA_COUNT);
  await expect(page.getByTestId('graph-lane')).toHaveCount(BRANCH_COUNT);
});

Then('each capability shows its current maturity', async ({ page }) => {
  await expect(page.getByTestId('graph-node')).toHaveCount(NODE_COUNT);
  const statuses = await page.getByTestId('graph-node').evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-status') ?? ''),
  );
  expect(statuses.every((s) => s.length > 0)).toBe(true);
  await expect(node(page, UPDATE)).toHaveAttribute('data-status', 'investigating');
});

When('the reader highlights what the update capability needs', async ({ page }) => {
  await openCard(page, UPDATE);
  await drawer(page).getByRole('button', { name: 'Needs' }).click();
});

Then('its prerequisites across branches are emphasized', async ({ page }) => {
  for (const id of [UPDATE, ...UPDATE_PREREQS]) {
    await expect(node(page, id)).toHaveAttribute('data-dim', 'false');
  }
});

Then('capabilities off that path are dimmed', async ({ page }) => {
  for (const id of OFF_PATH) await expect(node(page, id)).toHaveAttribute('data-dim', 'true');
});

When('the reader highlights what continuous integration unlocks', async ({ page }) => {
  await openCard(page, CI);
  await drawer(page).getByRole('button', { name: 'Unlocks' }).click();
});

Then('the release milestone is emphasized as downstream', async ({ page }) => {
  await expect(node(page, RELEASE_MILESTONE)).toHaveAttribute('data-dim', 'false');
  await expect(node(page, UPSTREAM_OF_CI)).toHaveAttribute('data-dim', 'true');
});

When('the reader shows only operational capabilities', async ({ page }) => {
  mem(page).lanes = await laneBoxes(page);
  mem(page).eras = await page.getByTestId('era-banners').locator('[data-band-id]').count();
  await page.getByTestId('status-filter').locator('[data-status="operational"]').click();
});

Then('capabilities in other states are hidden', async ({ page }) => {
  await expect(node(page, UPDATE)).toBeHidden();
  const visible = page.locator('[data-testid="graph-node"]:visible');
  expect(await visible.count()).toBeGreaterThan(0);
  const statuses = await visible.evaluateAll((els) => els.map((e) => e.getAttribute('data-status')));
  expect(statuses.every((s) => s === 'operational')).toBe(true);
});

Then('the eras and branches stay in place', async ({ page }) => {
  expect(await laneBoxes(page)).toBe(mem(page).lanes);
  await expect(page.getByTestId('era-banners').locator('[data-band-id]')).toHaveCount(mem(page).eras as number);
});

When('the reader switches to the outline', async ({ page }) => {
  await page.getByRole('button', { name: 'Outline' }).click();
  await expect(page.getByTestId('techtree-outline')).toBeVisible();
});

Then('every capability is listed under its branch and era', async ({ page }) => {
  const entries = page.getByTestId('techtree-outline').locator('li[data-node-id]');
  await expect(entries).toHaveCount(NODE_COUNT);
  const placed = await entries.evaluateAll((els) =>
    els.every((e) => e.closest('[data-track-id]') !== null && e.closest('[data-band-id]') !== null),
  );
  expect(placed).toBe(true);
});

Then('its prerequisites and unlocks are listed as links', async ({ page }) => {
  const entry = page.getByTestId('techtree-outline').locator(`li[data-node-id="${UPDATE}"]`);
  await expect(entry).toContainText('Requires:');
  await expect(entry).toContainText('Unlocks:');
  await expect(entry.getByRole('button', { name: 'Rollback Support' })).toBeVisible();
});

When("the reader opens the update capability's card", async ({ page }) => {
  await openCard(page, UPDATE);
});

Then('the card shows its era, branch, current and target maturity', async ({ page }) => {
  const d = drawer(page);
  await expect(d.getByTestId('detail-era')).toContainText('Platformization');
  await expect(d.getByTestId('detail-branch')).toContainText('Deployment');
  await expect(d.getByTestId('detail-status')).toHaveAttribute('data-status', 'investigating');
  await expect(d.getByTestId('detail-target')).toContainText('Operational');
});

Then('it lists its prerequisites, unlocks, implementations and eureka goals', async ({ page }) => {
  const d = drawer(page);
  await expect(d.getByTestId('detail-prerequisites')).toContainText('Rollback Support');
  await expect(d.getByTestId('detail-unlocks')).toContainText('Trusted Fleet Update');
  await expect(d.getByTestId('detail-implementations')).toBeVisible();
  await expect(d.getByTestId('detail-eurekas').locator('li')).toHaveCount(2);
});

When("the reader opens the replay capability's card", async ({ page }) => {
  await openCard(page, REPLAY);
});

Then('the item the host withholds is not listed', async ({ page }) => {
  await expect(drawer(page).getByTestId('detail-links-demonstrates')).toBeVisible();
  await expect(drawer(page).locator(`[data-ref="${WITHHELD_REF}"]`)).toHaveCount(0);
});

Then('the demonstration count leaves it out', async ({ page }) => {
  const section = drawer(page).getByTestId('detail-links-demonstrates');
  await expect(section.getByTestId('host-link')).toHaveCount(1);
  await expect(section).toContainText('(1)');
});

// --- embedding --------------------------------------------------------------

Given('the capability demo tree is embedded in a dark host page', async ({ page }) => {
  await open(page, 'dark');
});

Then('the tree is drawn in dark colours', async ({ page }) => {
  expect(await rootLuminance(page)).toBeLessThan(0.35);
});

When('the host switches the page to light', async ({ page }) => {
  await open(page, 'light');
});

Then('the tree is drawn in light colours', async ({ page }) => {
  expect(await rootLuminance(page)).toBeGreaterThan(0.65);
});
