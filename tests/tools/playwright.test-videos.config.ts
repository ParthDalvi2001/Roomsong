// `npm run test:videos` (tests/tools/test-videos.ts): the shaky-hands spec once more, recorded, on the dev server alone.
// Not part of `npm run test:e2e`, whose config records nothing. As playwright.video.config.ts: a second agent sets
// E2E_PORT. With SHAKY_VIDEO unset it runs the same spec with no recording: quicker than the suite's config, which
// builds the site first, for putting a bug back and seeing its scene fail.
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 8081);
const BASE_URL = `https://localhost:${PORT}`;
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SIZE = { width: 1280, height: 720 };
const IS_VIDEO = process.env.SHAKY_VIDEO === '1';

export default defineConfig({
  testDir: '../e2e',
  testMatch: '30-shaky-hands.spec.ts',
  outputDir: `${ROOT}.tmp/test-videos-artifacts`,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: `${ROOT}.tmp/test-videos-artifacts/results.json` }]],
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    viewport: SIZE,
    video: IS_VIDEO ? { mode: 'on', size: SIZE } : 'off',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: SIZE } }],
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
