// T-125 in the emulator: the bed preview page (proto/bed/) draws the bed, the sample plants and the tide with
// the app's own renderers, as a plain page and in an emulated AR session, inside the draw-call budget, and asks
// for nothing off localhost. The numbers come from `perf:sample`, the read-out the perf HUD shows.
// Software rendering in a headless browser: this proves the page works and counts what it draws. It says
// nothing about frame rate or looks on a headset.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { BUILT_PAGE_URL } from '../../playwright.config';

import { openApp, readRoom, SESSION_ENTRY_LIMIT_MS, xrFrames } from './support/iwer';

const PAGE = '/proto/bed/?flags=perfHud'; // the HUD panel on: the worst case for the draw calls
const SHOTS = fileURLToPath(new URL('../../.tmp/', import.meta.url)); // git-ignored; the paths go in the report
const DRAW_CALL_BUDGET = 15; // T-125's own acceptance (NFR-PERF-03 allows 60)
const TRIANGLE_BUDGET = 150_000; // NFR-PERF-04

interface Sample {
  fps: number;
  draws: number;
  tris: number;
  jsMs: number;
  maxFlashPerS: number;
  inXr: boolean;
  atMs: number;
}
interface PageWindow {
  __bed: { sample(): Sample | null; foveation(): number | null };
  IWER_DEVICE: { primaryInputMode: string; activeSession?: object };
  policyViolations: string[];
}

function recordErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** A perf:sample taken in the plain view (`inXr` false) or in the session (true), after `sinceMs` on the page's clock. */
async function nextSample(page: Page, inXr: boolean, sinceMs = 0): Promise<Sample> {
  const handle = await page.waitForFunction(
    ([inXr, sinceMs]) => {
      const sample = (window as unknown as PageWindow).__bed.sample();
      return sample !== null && sample.inXr === inXr && sample.atMs > sinceMs ? sample : null;
    },
    [inXr, sinceMs] as const,
  );
  return (await handle.jsonValue())!;
}

/** How many different colours the canvas shows, read right after the page drew a frame. */
function coloursOnCanvas(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((done) => {
        // Asked for between two frames, this callback runs after the page's own in the next frame: the
        // drawing buffer still holds that frame.
        requestAnimationFrame(() => {
          const canvas = document.querySelector('#view canvas') as HTMLCanvasElement;
          const copy = document.createElement('canvas');
          copy.width = canvas.width;
          copy.height = canvas.height;
          const context = copy.getContext('2d')!;
          context.drawImage(canvas, 0, 0);
          const { data } = context.getImageData(0, 0, copy.width, copy.height);
          const colours = new Set<number>();
          for (let i = 0; i < data.length; i += 4) {
            colours.add((data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!);
          }
          done(colours.size);
        });
      }),
  );
}

function expectInBudget(sample: Sample): void {
  expect(sample.draws).toBeGreaterThan(0);
  expect(sample.draws).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
  expect(sample.tris).toBeGreaterThan(0);
  expect(sample.tris).toBeLessThanOrEqual(TRIANGLE_BUDGET);
  expect(sample.maxFlashPerS).toBeLessThanOrEqual(3); // FR-UI-11
}

/** Opens the page and checks the plain view, then the same bed in an emulated AR session. `shot` names screenshots. */
async function plainThenSession(page: Page, path: string, label: string, shot?: string): Promise<void> {
  const errors = recordErrors(page);
  const offHost = await openApp(page, readRoom('table'), path);

  // The plain page: no session, a seated view over a table.
  const plain = await nextSample(page, false);
  console.log(`T-125 ${label}, plain view ${JSON.stringify(plain)} (headless, software rendering)`);
  expectInBudget(plain);
  expect(await coloursOnCanvas(page)).toBeGreaterThan(100); // a drawn garden, not a blank or one-colour canvas
  if (shot) await page.screenshot({ path: `${SHOTS}${shot}-plain.png` });

  // The same bed in an emulated AR session, hands selected (nothing on the page needs a hand or a controller).
  await page.evaluate(() => {
    (window as unknown as PageWindow).IWER_DEVICE.primaryInputMode = 'hand';
  });
  await page.locator('#enter').click(); // the page's own button; the emulator's overlay has one of the same name
  await page.waitForFunction(
    () => (window as unknown as PageWindow).IWER_DEVICE.activeSession !== undefined,
    undefined,
    { timeout: SESSION_ENTRY_LIMIT_MS },
  );
  // The page seats the emulated head and points it at the bed, so everything is in view.
  await expect(page.locator('#status')).toContainText('in the headset');
  await xrFrames(page, 10);
  const inXr = await nextSample(page, true, await page.evaluate(() => performance.now()));
  console.log(
    `T-125 ${label}, emulated session ${JSON.stringify(inXr)} (IWER, both eyes, software rendering)`,
  );
  expectInBudget(inXr);
  // NFR-PERF-09: fixed foveation "medium" was asked of the session's layer.
  expect(await page.evaluate(() => (window as unknown as PageWindow).__bed.foveation())).toBeCloseTo(2 / 3);
  if (shot) await page.screenshot({ path: `${SHOTS}${shot}-emulator.png` });

  expect(offHost).toEqual([]); // Golden Rule 9: nothing was asked of another host
  expect(errors).toEqual([]);
}

test('T-125 the bed preview draws in a plain page and in the emulator, within 15 draw calls', async ({
  page,
}) => {
  mkdirSync(SHOTS, { recursive: true });
  await plainThenSession(page, PAGE, 'sample garden', 'bed');
});

test('T-125 a full bed of 80 plants stays within the budgets and under the flash cap', async ({ page }) => {
  await plainThenSession(page, `${PAGE},autoplant=80`, 'full bed');
  // FR-UI-11 over two more bars at 84 BPM (5.7 s), in the session: every plant flashes once a bar, and no
  // sample reports more than 3 changes for any of them. (TC-E2E-15 proper needs Listen mode: T-128.)
  const peaks: number[] = [];
  let sinceMs = await page.evaluate(() => performance.now());
  const untilMs = sinceMs + 5800;
  while (sinceMs < untilMs) {
    const sample = await nextSample(page, true, sinceMs);
    peaks.push(sample.maxFlashPerS);
    sinceMs = sample.atMs;
  }
  console.log(`T-125 full bed, flash peaks over two bars ${JSON.stringify(peaks)} (emulator)`);
  expect(Math.max(...peaks)).toBeLessThanOrEqual(3);
  expect(Math.max(...peaks)).toBeGreaterThan(0); // the report is live: plants did flash
});

test('T-125 the built bed preview loads under the Content Security Policy with no violation', async ({
  page,
}) => {
  const errors = recordErrors(page);
  await page.addInitScript(() => {
    const page = window as unknown as PageWindow;
    page.policyViolations = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      page.policyViolations.push(`${event.effectiveDirective} blocked ${event.blockedURI}`),
    );
  });
  await page.goto(`${BUILT_PAGE_URL}proto/bed/?dev=1&flags=perfHud`);
  const policy = await page.evaluate(
    () => document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') ?? '',
  );
  expect(policy).toContain("default-src 'self'"); // a page with no policy would pass everything below
  expectInBudget(await nextSample(page, false));
  expect(await coloursOnCanvas(page)).toBeGreaterThan(100);
  expect(await page.evaluate(() => (window as unknown as PageWindow).policyViolations)).toEqual([]);
  expect(errors).toEqual([]);
});
