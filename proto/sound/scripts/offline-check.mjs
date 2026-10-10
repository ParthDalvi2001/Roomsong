// TC-AUD-05 headless (ADR-002) plus a short live smoke check of the page.
// Serves dist/ with vite preview, opens /?selftest=1 in headless Chromium, prints the page's offline-render lines
// (each voice, the mix, the stress case, the limiter overload: peak <= -1 dBFS and non-silent; left/right pan), then presses Play, waits
// for the audio clock to run, visits every room, changes the tempo and reads the output meter.
// Exit code 0 = everything passed. Needs `npm run build` first and the root project's Playwright
// (`npm install` at the repository root); falls back to the installed Google Chrome.
// Usage: node scripts/offline-check.mjs
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import { preview } from 'vite';

const PORT = 4174; // not 4173, so a running `npm run preview` is left alone
const RENDER_TIMEOUT_MS = 60_000;
const CLOCK_TIMEOUT_MS = 15_000;
const LISTEN_MS = 4_000;
const CEILING_DBFS = -1; // same value as src/config.ts, which a .mjs script cannot import

const server = await preview({
  root: fileURLToPath(new URL('..', import.meta.url)),
  logLevel: 'silent',
  preview: { port: PORT, host: '127.0.0.1' },
});
const origin = server.resolvedUrls?.local[0] ?? `http://127.0.0.1:${PORT}/`;
const failures = [];
let browser;

try {
  browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage();
  const foreign = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(origin)) foreign.push(r.url());
  });
  page.on('pageerror', (e) => failures.push(`page error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') failures.push(`console error: ${m.text()}`);
  });

  // 1. Offline renders (TC-AUD-05).
  await page.goto(`${origin}?selftest=1`);
  await page.locator('#selftest', { hasText: /OVERALL|ERROR/ }).waitFor({ timeout: RENDER_TIMEOUT_MS });
  const report = (await page.textContent('#selftest')) ?? '';
  console.log(report);
  if (!report.includes('OVERALL: PASS')) failures.push('TC-AUD-05 did not pass');

  // 2. Live smoke: Play inside a click, every room, a tempo change, then Stop. The meter is read after the limiter.
  await page.goto(origin);
  await page.click('#play');
  // A headless browser can take a few seconds to open its audio output; the status line counts audio-clock seconds.
  await page.locator('#status', { hasText: /· [1-9]\d* s ·/ }).waitFor({ timeout: CLOCK_TIMEOUT_MS });
  const rooms = [];
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(LISTEN_MS);
    rooms.push(`${await page.textContent('#preset-name')}: ${await page.textContent('#status')}`);
    await page.click('#next');
  }
  await page.selectOption('#tempo', '96');
  await page.waitForTimeout(LISTEN_MS);
  rooms.push(`${await page.textContent('#preset-name')}: ${await page.textContent('#status')}`);
  const peakText = (await page.textContent('#peak-hold')) ?? '';
  await page.click('#stop');
  const peak = Number.parseFloat(peakText.replace('−', '-'));
  console.log(`LIVE  ${rooms.join('\nLIVE  ')}`);
  console.log(`LIVE  peak hold ${peakText} over ${(4 * LISTEN_MS) / 1000} s (ceiling ${CEILING_DBFS} dBFS)`);
  if (!Number.isFinite(peak)) failures.push('live output was silent');
  else if (peak > CEILING_DBFS) failures.push(`live peak ${peak} dBFS is above the ceiling`);

  console.log(
    `NET   requests to other hosts: ${foreign.length}${foreign.length ? ` (${foreign.join(', ')})` : ''}`,
  );
  if (foreign.length > 0) failures.push('the page made a request to another host');
} catch (e) {
  failures.push(e instanceof Error ? e.message : String(e));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

for (const f of failures) console.error(`FAIL  ${f}`);
console.log(failures.length === 0 ? 'offline-check: PASS' : 'offline-check: FAIL');
process.exit(failures.length === 0 ? 0 : 1);
