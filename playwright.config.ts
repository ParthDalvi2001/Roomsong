// Playwright + IWER e2e (TEST_PLAN §4.5). T-107 adds the emulated-XR scenarios; until then one skipped spec.
import { defineConfig, devices } from '@playwright/test';

const PORT = 8081;
const BASE_URL = `https://localhost:${PORT}`;
const SCENARIO_TIMEOUT_MS = 60_000; // each scenario ≤ 60 s (CODING_GUIDELINES §9)

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'tests/e2e/__artifacts__',
  timeout: SCENARIO_TIMEOUT_MS,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
