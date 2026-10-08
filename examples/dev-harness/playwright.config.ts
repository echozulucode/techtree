import { defineConfig, devices } from '@playwright/test';

// Hand-written e2e specs in ./e2e drive the dev-harness (the viewer mounted as a
// host app would mount it). Setting BASE_URL points at an already-running server.
const externalServer = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    // A preinstalled Chromium (e.g. offline CI images) instead of Playwright's download.
    ...(process.env.PW_CHROMIUM_EXECUTABLE
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_EXECUTABLE } }
      : {}),
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
