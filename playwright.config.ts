// Playwright + IWER e2e (TEST_PLAN §4.5, T-107). How to run and what the fixtures are: tests/e2e/README.md.
//
// Dev server: plain `vite`, not `iwsdk dev up`. @iwsdk/vite-plugin-dev injects IWER (the WebXR emulator) into
// the page for any browser on localhost, so Playwright's own headless Chromium gets it. `iwsdk dev up` has no
// port option and starts a second, managed browser that these tests do not use; IWSDK_DEV_OPEN=false stops
// the plugin from opening that browser here too.
//
// WebGL: Playwright's default headless shell renders WebGL2 on SwiftShader (software, the same on every
// machine) with no extra flag. Checked on chromium 156 / macOS arm64: --use-angle=swiftshader,
// --enable-unsafe-swiftshader and --ignore-gpu-blocklist change nothing, so none is passed.
import { defineConfig, devices } from '@playwright/test';

// One IWSDK dev server per worktree and one per port: a second agent sets E2E_PORT.
const PORT = Number(process.env.E2E_PORT ?? 8081);
const BASE_URL = `https://localhost:${PORT}`;
// The production build under `vite preview`, for 04-built-page-policy.spec.ts (the dev page has no Content
// Security Policy). 1000 above the dev port, so agents on neighbouring E2E_PORTs do not meet.
const BUILT_PAGE_PORT = PORT + 1000;
export const BUILT_PAGE_URL = `https://localhost:${BUILT_PAGE_PORT}/`;
const SCENARIO_TIMEOUT_MS = 60_000; // each scenario ≤ 60 s (CODING_GUIDELINES §9)
const SERVER_START_LIMIT_MS = 120_000;

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'tests/e2e/__artifacts__',
  timeout: SCENARIO_TIMEOUT_MS,
  fullyParallel: false,
  workers: 1, // software rendering: a second worker would skew the timings
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true, // the dev server's certificate is self-signed
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Never reuse: a server already on a port may belong to another worktree and serve other code.
  webServer: [
    {
      command: `npx vite --port ${PORT} --strictPort`,
      env: { IWSDK_DEV_OPEN: 'false' },
      url: BASE_URL,
      ignoreHTTPSErrors: true,
      reuseExistingServer: false,
      timeout: SERVER_START_LIMIT_MS,
    },
    {
      // Build first: a preview of an old dist/ would test old code.
      command: `npx vite build && npx vite preview --port ${BUILT_PAGE_PORT} --strictPort`,
      env: { IWSDK_DEV_OPEN: 'false' },
      url: BUILT_PAGE_URL,
      ignoreHTTPSErrors: true,
      reuseExistingServer: false,
      timeout: SERVER_START_LIMIT_MS,
    },
  ],
});
