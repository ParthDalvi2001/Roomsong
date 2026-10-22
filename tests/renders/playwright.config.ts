// `npm run audio:renders` (T-173 part 2a): the render-and-measure tool runs apart from `npm run test:e2e`, with
// its own config: one dev server, no built page, and the minutes a 60 s offline render of the engine takes.
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 8081);
const BASE_URL = `https://localhost:${PORT}`;
const ROOT = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  testDir: '.',
  outputDir: '../../.tmp/renders/artifacts',
  timeout: 20 * 60_000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: BASE_URL, ignoreHTTPSErrors: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
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
