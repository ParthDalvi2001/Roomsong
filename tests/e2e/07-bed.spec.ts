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
// T-119, everything on the bed at once, per eye: the glass and its markers 2, the five silhouettes 5, the whorls
// 1, the tide 1, and the HUD panel 1. A session draws both eyes: 20 (18 without the panel), which is over T-125's
// 15 and inside NFR-PERF-03's 60. UX §9.5 and §9.6 count the same meshes.
const EVERYTHING_PER_EYE = 2 + 5 + 1 + 1 + 1;
// T-163: in high contrast, one cream shell per silhouette (FR-UI-05); since T-165 drawn in its plants' own draw
// calls, so it adds none.
const OUTLINE_SHELLS = 0;
const DIM_DOME = 1; // BUG-008: high contrast dims the room with Listen's dome (FR-UI-05)
// BUG-008, per eye: the seed and its shell, the Listen orb and its shell, the undo petal and its shell.
const TARGETS_OUTLINED = 6;
const NFR_DRAW_CALLS = 60; // NFR-PERF-03
const TIDE_PASS_MARK = 3; // UX §9.4: crest to the shade's darkest point, as a luminance ratio

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
  __bed: {
    sample(): Sample | null;
    foveation(): number | null;
    pixelOf(ring: number, step: number): { x: number; y: number };
    holdTide(phase: number | null): void;
    play(kind: string): void;
    scriptMs(): number | null;
  };
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

function expectInBudget(sample: Sample, draws = DRAW_CALL_BUDGET): void {
  expect(sample.draws).toBeGreaterThan(0);
  expect(sample.draws).toBeLessThanOrEqual(draws);
  expect(sample.tris).toBeGreaterThan(0);
  expect(sample.tris).toBeLessThanOrEqual(TRIANGLE_BUDGET);
  expect(sample.maxFlashPerS).toBeLessThanOrEqual(3); // FR-UI-11
}

/** Enters an emulated AR session by the page's own button, hands selected; returns once the bed is in view. */
async function enterSession(page: Page): Promise<void> {
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
}

/** The largest `maxFlashPerS` of the perf samples of the next `durationMs`, in the plain view or in the session. */
async function flashPeaks(page: Page, inXr: boolean, durationMs: number): Promise<number[]> {
  const peaks: number[] = [];
  let sinceMs = await page.evaluate(() => performance.now());
  const untilMs = sinceMs + durationMs;
  while (sinceMs < untilMs) {
    const sample = await nextSample(page, inXr, sinceMs);
    peaks.push(sample.maxFlashPerS);
    sinceMs = sample.atMs;
  }
  return peaks;
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

  // The same bed in an emulated AR session (nothing on the page needs a hand or a controller).
  await enterSession(page);
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

/** Waits until the page has drawn `count` more frames. */
function frames(page: Page, count: number): Promise<void> {
  return page.evaluate(
    (count) =>
      new Promise<void>((done) => {
        const next = (left: number): void =>
          void requestAnimationFrame(() => (left > 1 ? next(left - 1) : done()));
        next(count);
      }),
    count,
  );
}

/** Moves the pointer onto a point of the bed (`ring` and `step` may lie between cells): a hand's hover on this page. */
async function pointAt(page: Page, ring: number, step: number): Promise<void> {
  const { x, y } = await page.evaluate(
    ([ring, step]) => (window as unknown as PageWindow).__bed.pixelOf(ring, step),
    [ring, step] as const,
  );
  await page.mouse.move(x, y);
}

/** The relative luminance (WCAG) of the canvas at a point of the bed, averaged over 3 by 3 pixels of a drawn frame. */
function luminanceAt(page: Page, ring: number, step: number): Promise<number> {
  return page.evaluate(
    ([ring, step]) =>
      new Promise<number>((done) => {
        requestAnimationFrame(() => {
          const canvas = document.querySelector('#view canvas') as HTMLCanvasElement;
          const { x, y } = (window as unknown as PageWindow).__bed.pixelOf(ring, step);
          const box = canvas.getBoundingClientRect();
          const scale = canvas.width / box.width;
          const copy = document.createElement('canvas');
          copy.width = copy.height = 3;
          const context = copy.getContext('2d')!;
          context.drawImage(canvas, (x - box.left) * scale - 1, (y - box.top) * scale - 1, 3, 3, 0, 0, 3, 3);
          const { data } = context.getImageData(0, 0, 3, 3);
          const linear = (channel: number): number => {
            const c = channel / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          };
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) {
            sum += 0.2126 * linear(data[i]!) + 0.7152 * linear(data[i + 1]!) + 0.0722 * linear(data[i + 2]!);
          }
          done(sum / (data.length / 4));
        });
      }),
    [ring, step] as const,
  );
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
  const peaks = await flashPeaks(page, true, 5800);
  console.log(`T-125 full bed, flash peaks over two bars ${JSON.stringify(peaks)} (emulator)`);
  expect(Math.max(...peaks)).toBeLessThanOrEqual(3);
  expect(Math.max(...peaks)).toBeGreaterThan(0); // the report is live: plants did flash
});

test('T-119 the tide shows on a dark table and on a white one: crest to shade at least 3 to 1', async ({
  page,
}) => {
  const errors = recordErrors(page);
  await openApp(page, readRoom('table'), '/proto/bed/');
  await page.locator('#garden').selectOption('empty'); // nothing stands between the eye and the glass
  // The crest held on step 4, the side nearest the eye. Half a step ahead of it the shade is darkest (UX §9.4).
  await page.evaluate(() => (window as unknown as PageWindow).__bed.holdTide(4 / 16));
  const BETWEEN_RINGS = 2.5; // no marker and no ring line there
  for (const table of ['dark', 'white'] as const) {
    await page.locator('#bright').setChecked(table === 'white');
    await nextSample(page, false, await page.evaluate(() => performance.now())); // the wedge has faded in
    const crest = await luminanceAt(page, BETWEEN_RINGS, 4);
    const shade = await luminanceAt(page, BETWEEN_RINGS, 4.5);
    const bedAway = await luminanceAt(page, BETWEEN_RINGS, 12);
    const ratio = (lighter: number, darker: number): number => (lighter + 0.05) / (darker + 0.05);
    console.log(
      `T-119 tide on a ${table} table: crest to shade ${ratio(crest, shade).toFixed(1)}, crest to the bed ` +
        `away from it ${ratio(crest, bedAway).toFixed(1)}, bed to shade ${ratio(bedAway, shade).toFixed(1)} ` +
        '(plain page, headless: the canvas blends encoded values)',
    );
    expect(ratio(crest, shade)).toBeGreaterThanOrEqual(TIDE_PASS_MARK);
    expect(shade).toBeLessThanOrEqual(bedAway); // the shade darkens, on any table
  }
  expect(errors).toEqual([]);
});

test('T-119 everything at once on a full bed: draw calls, triangles and the flash cap', async ({ page }) => {
  const errors = recordErrors(page);
  const offHost = await openApp(page, readRoom('table'), PAGE);
  // All five shapes on all 80 cells; the nearest plant dimmed as by a lost hand; the pointer a hovering hand.
  await page.locator('#garden').selectOption('everything');
  await page.locator('#glow').check();
  await page.locator('#tint').check();
  await page.locator('#week').click(); // a visit a week later: all 80 unfurl into blossoms on their next note
  // The hover flickers between two neighbouring plants for two bars, as fast as the page takes the pointer.
  let peaks: number[] = [];
  const watching = flashPeaks(page, false, 5800).then((found) => (peaks = found));
  for (let i = 0; peaks.length === 0; i++) await pointAt(page, 4, 3 + (i % 3) * 0.5);
  await watching;
  const plain = await nextSample(page, false, await page.evaluate(() => performance.now()));
  console.log(
    `T-119 everything, plain view ${JSON.stringify(plain)}, flash peaks ${JSON.stringify(peaks)} (headless)`,
  );
  expectInBudget(plain); // 9 for the bed, the plants and the tide; the HUD panel and the page's table make 11
  expect(plain.draws).toBe(EVERYTHING_PER_EYE + 1);
  expect(Math.max(...peaks)).toBeLessThanOrEqual(3);
  expect(Math.max(...peaks)).toBeGreaterThan(0);

  await enterSession(page);
  const inXr = await nextSample(page, true, await page.evaluate(() => performance.now()));
  const sessionPeaks = await flashPeaks(page, true, 5800);
  console.log(
    `T-119 everything, emulated session ${JSON.stringify(inXr)}, flash peaks ${JSON.stringify(sessionPeaks)} ` +
      '(IWER, both eyes)',
  );
  // Both eyes: 20 with the HUD panel, over T-125's 15 (see EVERYTHING_PER_EYE) and inside NFR-PERF-03.
  expectInBudget(inXr, NFR_DRAW_CALLS);
  expect(inXr.draws).toBe(2 * EVERYTHING_PER_EYE);
  expect(Math.max(...sessionPeaks)).toBeLessThanOrEqual(3);
  expect(offHost).toEqual([]);
  expect(errors).toEqual([]);
});

test('T-163, BUG-008 high contrast on a full bed with a seed, the orb and a petal: every outline and the dim, within the budgets', async ({
  page,
}) => {
  mkdirSync(SHOTS, { recursive: true });
  const errors = recordErrors(page); // a shell shader that does not compile is a console error
  const offHost = await openApp(page, readRoom('table'), PAGE);
  const dragOff = async (): Promise<void> => {
    await page.evaluate(() => (window as unknown as PageWindow).__bed.play('dragOff'));
    // Let go at 3.3 s on the script's clock; the burst (0.4 s) has landed, the petal waits its 5 s.
    await page.waitForFunction(() => ((window as unknown as PageWindow).__bed.scriptMs() ?? -1) >= 3900);
  };
  /** The seed-and-orb box, clicked from inside the page (as shapingPage's slow box: no wait for the page). */
  const targets = (isOn: boolean): Promise<void> =>
    page.evaluate((isOn) => {
      const box = document.querySelector('#targets') as HTMLInputElement;
      if (box.checked !== isOn) box.click();
    }, isOn);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.mouse.move(5, 5); // off the bed: the pointer hovers nothing
  await page.locator('#garden').selectOption('everything');
  await page.locator('#contrast').check();
  await page.locator('#week').click();

  // The picture: the plain view with everything outlined, the room behind dimmed.
  await targets(true);
  await dragOff();
  const style = await page.addStyleTag({ content: 'main { visibility: hidden; }' });
  await page.screenshot({ path: `${SHOTS}bug008-high-contrast.png` });
  await style.evaluate((node) => (node as Element).remove());
  await targets(false);
  await page.waitForFunction(() => (window as unknown as PageWindow).__bed.scriptMs() === null); // the petal gone

  await enterSession(page);
  // T-163's sample: the plants' shells, and now the dim.
  const plants = await nextSample(page, true, await page.evaluate(() => performance.now()));
  console.log(
    `T-163 high contrast, everything, emulated session ${JSON.stringify(plants)} (IWER, both eyes)`,
  );
  expectInBudget(plants, NFR_DRAW_CALLS);
  expect(plants.draws).toBe(2 * (EVERYTHING_PER_EYE + OUTLINE_SHELLS + DIM_DOME));
  // BUG-008: and a seed out, the Listen orb and an undo petal, each outlined.
  await targets(true);
  await dragOff();
  const all = await nextSample(page, true, await page.evaluate(() => performance.now()));
  console.log(
    `BUG-008 high contrast, everything and every target, emulated session ${JSON.stringify(all)} (IWER, both eyes)`,
  );
  expectInBudget(all, NFR_DRAW_CALLS);
  expect(all.draws).toBe(2 * (EVERYTHING_PER_EYE + OUTLINE_SHELLS + DIM_DOME + TARGETS_OUTLINED));
  expect(offHost).toEqual([]);
  expect(errors).toEqual([]);
});

test('T-119 the pictures for the look rating', async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  const errors = recordErrors(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openApp(page, readRoom('table'), '/proto/bed/');
  const hold = (phase: number | null): Promise<void> =>
    page.evaluate((phase) => (window as unknown as PageWindow).__bed.holdTide(phase), phase);
  // The seated view, the whole bed in it; the text panel is out of the pictures.
  const AWAY = [5, 5] as const; // a corner of the view, off the bed
  await page.mouse.move(...AWAY);
  /** Every fade and ease of the page is shorter than this (the tide's 300 ms is the longest). */
  const settle = async (): Promise<void> => {
    await page.waitForTimeout(450);
    await frames(page, 2);
  };
  const shot = async (name: string): Promise<void> => {
    await settle();
    const style = await page.addStyleTag({ content: 'main { visibility: hidden; }' });
    await page.screenshot({ path: `${SHOTS}t119-${name}.png` });
    await style.evaluate((node) => (node as Element).remove());
  };

  await hold(4.4 / 16); // the crest just past the plant nearest the eye
  await shot('tide-dark-table');
  await page.locator('#bright').check();
  await shot('tide-bright-table');
  await page.locator('#bright').uncheck();

  await hold(12 / 16); // the tide on the far side: the near plants at rest
  await pointAt(page, 4, 3); // a free cell: its marker is the cue
  await shot('hover-cue');
  await page.locator('#glow').check();
  await pointAt(page, 4, 4); // the reed nearest the eye glows
  await shot('hover-glow');
  await page.mouse.move(...AWAY);
  await page.locator('#glow').uncheck();
  await page.locator('#tint').check(); // the same reed, dimmed as by a lost hand
  await shot('tint');
  await page.locator('#tint').uncheck();

  await page.locator('#garden').selectOption('shapes');
  await shot('five-shapes');
  await page.locator('#contrast').check();
  await pointAt(page, 3, 4);
  await shot('high-contrast');
  await page.locator('#contrast').uncheck();
  await page.mouse.move(...AWAY);

  await page.locator('#garden').selectOption('growth');
  await shot('growth-stages');
  await hold(null);
  await page.locator('#week').click(); // every plant unfurls into blossoms on its next note
  await page.waitForTimeout(3500); // a bar and more at 84 BPM: every plant has had its note
  await hold(12 / 16);
  await shot('growth-a-week-later');

  expect(await coloursOnCanvas(page)).toBeGreaterThan(100);
  expect(errors).toEqual([]);
});

/**
 * T-147: the bed preview at the size of the look-rating pictures, with what a shaping test needs: play a script,
 * wait until it is `ms` in (the page's clock) or over, a picture of the bed, the next perf:sample (each kept),
 * and the slow-motion switch, clicked from inside the page (Playwright's own check() waits for the page, and
 * that took longer than the 0.2 s a script left before its release).
 */
async function shapingPage(page: Page) {
  mkdirSync(SHOTS, { recursive: true });
  const errors = recordErrors(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
  const offHost = await openApp(page, readRoom('table'), PAGE);
  await page.mouse.move(5, 5); // off the bed: the pointer hovers nothing
  const samples: Sample[] = [];
  const tools = {
    errors,
    offHost,
    samples,
    play: (kind: string): Promise<void> =>
      page.evaluate((kind) => (window as unknown as PageWindow).__bed.play(kind), kind),
    at: async (ms: number): Promise<void> => {
      await page.waitForFunction(
        (ms) => ((window as unknown as PageWindow).__bed.scriptMs() ?? -1) >= ms,
        ms,
      );
    },
    done: (): Promise<unknown> =>
      page.waitForFunction(() => (window as unknown as PageWindow).__bed.scriptMs() === null),
    shot: async (name: string): Promise<void> => {
      const style = await page.addStyleTag({ content: 'main { visibility: hidden; }' });
      await page.screenshot({ path: `${SHOTS}t147-${name}.png` });
      await style.evaluate((node) => (node as Element).remove());
    },
    sampleNow: async (): Promise<Sample> => {
      const sample = await nextSample(page, false, await page.evaluate(() => performance.now()));
      samples.push(sample);
      return sample;
    },
    slow: async (isOn: boolean): Promise<void> => {
      await page.evaluate((isOn) => {
        const box = document.querySelector('#slow') as HTMLInputElement;
        if (box.checked !== isOn) box.click();
      }, isOn);
    },
    /** Every sample within the budgets and the flash cap (FR-UI-11), nothing off the host, no error. */
    finish: (label: string): void => {
      console.log(`T-147 ${label}, plain view ${JSON.stringify(samples)} (headless, software rendering)`);
      for (const sample of samples) expectInBudget(sample);
      expect(offHost).toEqual([]);
      expect(errors).toEqual([]);
    },
  };
  return tools;
}

test('T-147 shaping: a pull with its ladder and a drag with its ghost, within the budgets and the cap', async ({
  page,
}) => {
  const { play, at, done, shot, sampleNow, finish } = await shapingPage(page);
  const idle = await sampleNow();
  // The pull: lifted, stretched, the ladder round it. The hand holds still from 1.3 s to 3.3 s on the script.
  await play('pull');
  await at(1400);
  expect((await sampleNow()).draws).toBe(idle.draws + 1); // the ladder: one draw call
  await shot('pull-ladder');
  await done();

  // A drag to a free cell: the plant under the hand, the ghost on the cell it would land on.
  await play('drag');
  await at(1400);
  expect((await sampleNow()).draws).toBe(idle.draws); // nothing more: the ghost is the cell's own marker
  await shot('drag-ghost');
  await done();
  await sampleNow();
  finish('a pull and a drag');
});

test('T-147 shaping: a drag off the bed with its burst and petal, and a lost hand, within the budgets', async ({
  page,
}) => {
  const { play, at, done, shot, sampleNow, slow, finish } = await shapingPage(page);
  const idle = await sampleNow();
  // A drag off the bed: the plant fades and the rim dims; let go at 3.3 s, it dissolves and the petals drift home.
  await play('dragOff');
  await at(1400);
  expect((await sampleNow()).draws).toBe(idle.draws + 1); // the rim: one draw call
  await shot('drag-off-rim');
  await at(3200);
  await slow(true); // ten times slower from before the release: the 400 ms of the burst take 4 s
  await at(3300 + 120);
  await shot('burst');
  await at(3300 + 300);
  await slow(false);
  // The petal: one draw call, shared with the burst; the sample garden has more plants of every voice, so no
  // silhouette's mesh went empty with the one removed.
  expect((await sampleNow()).draws).toBe(idle.draws + 1);
  await shot('petal'); // its 5 s go on under the next script

  // A hand lost in the middle of a drag: the plant waits where the hand left it, dimmed, then glides home.
  await play('lost');
  await at(1250);
  await slow(true);
  await at(1300 + 60); // lost at 1.3 s
  await shot('lost-tint');
  await slow(false);
  await done();
  await sampleNow();
  finish('a drag off the bed and a lost hand');
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
