import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

// Concrete values for features/accessibility.feature. Host page: the
// dev-harness `?embed=` mode (header, <main>, h1, view at headingLevel 2).
const EMBED = '/?embed=engineering-platform';
const NS = 'eng.platform/';
const UPDATE = `${NS}safe-automatic-update`;
const UPDATE_TITLE = 'Safe Automatic Update';
const PREREQ_TITLE = 'Rollback Support';
const PAGE_TITLE_LEVEL = 1;
const AUDIT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const PHONE = { width: 390, height: 844 };
const READABLE_ZOOM = 0.8;
const FRONTIER_STATES = ['in_progress', 'investigating', 'available'];

const node = (page: Page, id: string) => page.locator(`[data-testid="graph-node"][data-node-id="${id}"]`);
const card = (page: Page) => page.getByTestId('techtree-detail');

Given('a host page embeds the demo tree in the {word} scheme', async ({ page }, scheme: string) => {
  await page.goto(`${EMBED}&scheme=${scheme}`);
  await expect(node(page, UPDATE)).toBeVisible();
});

Given('a host page embeds the demo tree on a phone, starting at the frontier', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto(`${EMBED}&scheme=light&focus=frontier&zoom=${READABLE_ZOOM}`);
  await expect(page.getByTestId('graph-node').first()).toBeAttached();
});

When('the reader opens a capability', async ({ page }) => {
  await node(page, UPDATE).click();
  await expect(card(page)).toHaveAttribute('data-node-id', UPDATE);
});

When('the reader opens a capability and highlights its path', async ({ page }) => {
  await node(page, UPDATE).click();
  await card(page).getByRole('button', { name: 'Needs' }).click();
  await expect(page.locator('[data-testid="graph-node"][data-dim="true"]').first()).toBeAttached();
});

When('the reader opens one of its prerequisites from the card', async ({ page }) => {
  await card(page).getByTestId('detail-prerequisites').getByRole('button', { name: PREREQ_TITLE }).click();
});

When('the reader presses Escape', async ({ page }) => {
  await page.keyboard.press('Escape');
});

Then('the page has no accessibility violations', async ({ page }) => {
  const res = await new AxeBuilder({ page })
    .options({
      runOnly: { type: 'tag', values: AUDIT_TAGS },
      rules: { 'landmark-complementary-is-top-level': { enabled: true } },
    })
    .analyze();
  expect(res.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});

Then('the card is a labelled region headed one level below the page title', async ({ page }) => {
  const region = page.getByRole('region', { name: `${UPDATE_TITLE} details` });
  await expect(region).toBeVisible();
  await expect(page.getByRole('heading', { level: PAGE_TITLE_LEVEL })).toBeVisible();
  await expect(region.getByRole('heading', { level: PAGE_TITLE_LEVEL + 1, name: UPDATE_TITLE })).toBeVisible();
  await expect(page.locator('aside')).toHaveCount(0);
});

Then("keyboard focus is on the card's heading", async ({ page }) => {
  await expect(card(page).getByRole('heading', { name: UPDATE_TITLE })).toBeFocused();
});

Then("keyboard focus is on the new card's heading", async ({ page }) => {
  await expect(card(page).getByRole('heading', { name: PREREQ_TITLE })).toBeFocused();
});

Then('the card closes', async ({ page }) => {
  await expect(card(page)).toHaveCount(0);
});

Then('a capability that is being worked on or ready to start is centred at a readable zoom', async ({ page }) => {
  await expect(page.locator('.react-flow__viewport')).toHaveAttribute('style', new RegExp(`scale\\(${READABLE_ZOOM}\\)`));
  const status = await page.locator('.react-flow').evaluate((flow) => {
    const r = flow.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return hit?.closest('[data-testid="graph-node"]')?.getAttribute('data-status') ?? null;
  });
  expect(FRONTIER_STATES).toContain(status);
});
