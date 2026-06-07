import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Executable BDD: bddgen turns features/*.feature into Playwright tests that run
// through the step definitions in bdd-steps/ against the dev-harness.
const testDir = defineBddConfig({
  featuresRoot: '../../features',
  features: ['../../features/**/*.feature'],
  steps: ['bdd-steps/**/*.ts'],
  tags: 'not @manual',
});

const externalServer = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } },
    },
  ],
  webServer: externalServer
    ? undefined
    : {
        command: 'pnpm dev -- --host 127.0.0.1 --port 5173',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
