// The Devpost gallery shots (T-182 prep): `npm run gallery`, a Playwright run apart from the suite (tests/e2e
// never sees tests/tools). One worker, the dev server only, 1920 x 1080. As playwright.config.ts: one server
// per port, a second agent sets E2E_PORT.
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 8081);
const BASE_URL = `https://localhost:${PORT}`;
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  testDir: '.',
  testMatch: 'gallery.spec.ts',
  outputDir: `${ROOT}.tmp/gallery-artifacts`,
  timeout: 120_000, // the time-lapse shot waits for seven simulated days
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    cwd: ROOT,
    env: { IWSDK_DEV_OPEN: 'false' },
    url: BASE_URL,
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
