// The judge video's emulator capture (T-153 prep): `npm run video:capture`, a Playwright run apart from the suite
// (tests/e2e never sees tests/tools). One worker, the dev server only, a 1920 x 1080 page recorded as WebM by
// Playwright's own recorder (video has no sound: the app's audio is dubbed from `npm run audio:renders`). As
// playwright.config.ts: one server per port, a second agent sets E2E_PORT.
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 8081);
const BASE_URL = `https://localhost:${PORT}`;
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SIZE = { width: 1920, height: 1080 };

export default defineConfig({
  testDir: '.',
  testMatch: 'video.spec.ts',
  outputDir: `${ROOT}.tmp/video-artifacts`,
  timeout: 10 * 60_000, // the take is under two minutes; software rendering at 1080p is slow
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    viewport: SIZE,
    video: { mode: 'on', size: SIZE },
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
