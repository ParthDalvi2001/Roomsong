/// <reference types="webxr" />
// TC-E2E-10 (NFR-PERF-07, NFR-PERF-08; TC-PERF-04; T-165): the heap in Chromium, where the unit tests' stubs are
// not. (1) An allocation profile: 20 s of Listen over 80 plants with both hands moving, every sampled byte grouped
// by the function that allocated it; a byte belongs to src/ when any frame of its stack is the app's own code (so
// a three.js call made by src/ is src/'s), else to the library whose frame allocated it, IWER and IWSDK apart.
// (2) The 5-minute soak at autoplant=40: the heap after a full collection grows by at most 5 %. Together they take
// about 8 minutes, over the 60 s a scenario may take in the suite (CODING_GUIDELINES §9), so they run apart:
// `npm run test:e2e:heap` (E2E_HEAP=1), one browser on the machine at a time.
// Emulator results (E): IWER's own per-frame garbage is in every number; the Quest's V8 and its GC are not.
import { expect, test, type CDPSession, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom } from './support/iwer';

const SOAK_MS = 5 * 60_000; // TC-E2E-10
const SOAK_WARM_UP_MS = 30_000; // the JIT, the shaders and the audio buffers settle first
const HEAP_GROWTH_MAX = 0.05; // NFR-PERF-07
const PROFILE_MS = 20_000;
const PROFILE_WARM_UP_MS = 8000; // the per-frame code runs a few hundred frames before it is sampled
const SAMPLING_INTERVAL_BYTES = 1024;
// Measured 2026-10-20 (develop 3726e50 + T-165 part B; 413 frames at about 20 fps): src/ 6.0 kB a frame, of
// which about 1.4 kB is audio's per-note sources and envelopes (by design, LLD §7) and most of the rest in
// functions the Node heap tests show creating nothing, likely boxed numbers (writePalm 180 B: about six 16-byte
// boxes a call; not looked into, T-165 follow-up); IWER
// 58.9 kB, three.js for IWSDK and IWER 7.3 kB, IWSDK 5.7 kB. Twice the src/ figure, as its per-frame share moves
// with the host's frame rate (about 1.4 kB of the 6 kB is audio per second, not per frame: at 10 fps the figure is
// about 7.4 kB): a regression of kilobytes a frame fails here, smaller ones in the Node heap tests.
const SRC_BYTES_PER_FRAME_MAX = 12_000;

test.skip(process.env.E2E_HEAP !== '1', 'TC-E2E-10 takes about 8 minutes: npm run test:e2e:heap');

type Core = typeof import('../../src/core/index');
type RoomModule = typeof import('../../src/room/index');
/** A node of CDP's sampling heap profile: a call frame, the bytes sampled there, its callees. */
interface ProfileNode {
  callFrame: { functionName: string; url: string; lineNumber: number };
  selfSize: number;
  children: ProfileNode[];
}
/** IWSDK 1.0.1 puts IWER's device on the page in a dev build. */
interface DevPage {
  IWER_DEVICE: { remote: { dispatch(method: string, params?: object): Promise<unknown> } };
}

/** Console errors and page errors from now on. */
function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** Opens the app in the table room, enters with hands and waits for the session's visit (the garden sounds). */
async function enterGarden(page: Page, autoplant: number): Promise<string[]> {
  const offHost = await openApp(page, readRoom('table'), `/?flags=autoplant=${autoplant}`);
  await page.waitForFunction(() => window.__roomsong !== undefined, undefined, { timeout: 15_000 });
  await enterXR(page);
  await page.waitForFunction(() => (window.__roomsong!.garden.state?.visits ?? 0) > 0, undefined, {
    timeout: 20_000,
  });
  return offHost;
}

/** From inside the page: both emulated hands, open and palm down, loop slowly over the bed (20 moves a second). */
const moveHands = (page: Page) =>
  page.evaluate(async () => {
    const url = '/src/room/index.ts';
    const room = (await import(/* @vite-ignore */ url)) as RoomModule;
    const { world } = window.__roomsong!;
    const bed = world.getSystem(room.RoomSystem)!.bed.object3D!.matrixWorld.elements;
    const [x, y, z] = [bed[12] ?? 0, bed[13] ?? 0, bed[14] ?? 0];
    const { remote } = (window as unknown as DevPage).IWER_DEVICE;
    const startedMs = performance.now();
    const orientation = { pitch: 0, yaw: 0, roll: 0 };
    window.setInterval(() => {
      const t = (performance.now() - startedMs) / 1000;
      for (const side of [-1, 1]) {
        void remote.dispatch('set_transform', {
          device: side < 0 ? 'hand-left' : 'hand-right',
          position: {
            x: x + side * (0.12 + 0.06 * Math.sin(t)),
            y: y + 0.12,
            z: z + 0.08 * Math.cos(0.8 * t),
          },
          orientation,
        });
      }
    }, 50);
  });

/** Resolves `ms` later on the page's clock: the soak's and the profile's length is what they measure. */
async function waitMs(page: Page, ms: number): Promise<void> {
  const endMs = (await page.evaluate(() => performance.now())) + ms;
  await page.waitForFunction((endMs) => performance.now() >= endMs, endMs, {
    timeout: ms + 30_000,
    polling: 500,
  });
}

const framesDrawn = (page: Page) => page.evaluate(() => window.__roomsong!.world.renderer.info.render.frame);

/** The heap in use after a full collection, in bytes (CDP Performance metrics). */
async function heapAfterGc(client: CDPSession): Promise<number> {
  await client.send('HeapProfiler.collectGarbage');
  const { metrics } = await client.send('Performance.getMetrics');
  const used = metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value;
  if (used === undefined) throw new Error('no JSHeapUsedSize metric');
  return used;
}

/** The library of a frame's script, by its URL on the dev server (Vite's pre-bundled deps). */
function library(url: string): string {
  if (url.includes('/src/')) return 'src';
  if (url.includes('iwer')) return 'IWER'; // @iwer-injection-runtime: the emulated WebXR platform
  if (/iwsdk|elics|pmndrs/.test(url)) return 'IWSDK';
  if (url.includes('/.vite/deps/chunk-')) return 'three'; // the chunk IWSDK and the app share: three.js
  return url === '' ? 'native' : 'other';
}

/** A frame as function and file. Not the line: the dev server reports lines of its transformed output. */
const where = ({ callFrame: { functionName, url } }: ProfileNode) =>
  `${functionName || '(anonymous)'} ${url.replace(/^.*\//, '').replace(/\?.*$/, '')}`;

/**
 * Sampled bytes by owner and function. The frame that allocated owns the bytes, by its library, with one
 * exception: three.js called from src/ allocates for src/. IWER (the platform here) and IWSDK keep their own,
 * whoever called them, and the circuit breaker in src/app.ts, which calls every system, IWSDK's too, hands on no
 * ownership.
 */
function byOwner(head: ProfileNode): Map<string, number> {
  const bytes = new Map<string, number>();
  const walk = (node: ProfileNode, caller: string | null): void => {
    const { url } = node.callFrame;
    const lib = library(url);
    const isApp = lib === 'src' && !url.includes('/src/app.ts');
    if (node.selfSize > 0) {
      const owner = lib === 'three' && caller !== null ? 'src' : lib;
      const key = `${owner} | ${where(node)}${owner !== lib ? ` from ${caller}` : ''}`;
      bytes.set(key, (bytes.get(key) ?? 0) + node.selfSize);
    }
    const next = isApp ? where(node) : lib === 'three' ? caller : null;
    for (const child of node.children) walk(child, next);
  };
  walk(head, null);
  return bytes;
}

test('TC-E2E-10 allocation profile: 20 s of Listen over 80 plants with the hands moving, bytes by owner', async ({
  page,
}) => {
  test.setTimeout(PROFILE_WARM_UP_MS + PROFILE_MS + 90_000);
  const errors = watch(page);
  const offHost = await enterGarden(page, 80);
  // FR-HND-06: palms out start Listen. The garden says so at once, and says it if Listen ends.
  const listen = await page.evaluateHandle(async () => {
    const url = '/src/core/index.ts';
    const core = (await import(/* @vite-ignore */ url)) as Core;
    const heard = { entered: false, exited: false };
    core.bus.on('listen:enter', () => void (heard.entered = true));
    core.bus.on('listen:exit', () => void (heard.exited = true));
    core.bus.emit('gesture:palmsOut', { type: 'gesture:palmsOut' });
    return heard;
  });
  await moveHands(page);
  await waitMs(page, PROFILE_WARM_UP_MS);
  const client = await page.context().newCDPSession(page);
  await client.send('HeapProfiler.enable');
  await client.send('HeapProfiler.startSampling', {
    samplingInterval: SAMPLING_INTERVAL_BYTES,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  });
  const framesBefore = await framesDrawn(page);
  await waitMs(page, PROFILE_MS);
  const frames = (await framesDrawn(page)) - framesBefore;
  const { profile } = await client.send('HeapProfiler.stopSampling');

  const bytes = byOwner(profile.head);
  const totals = new Map<string, number>();
  for (const [key, value] of bytes) {
    const owner = key.slice(0, key.indexOf(' |'));
    totals.set(owner, (totals.get(owner) ?? 0) + value);
  }
  const perFrame = (value: number) => (value / frames).toFixed(0);
  console.log(
    `T-165 TC-E2E-10 sampled allocation over ${frames} frames (emulator, B/frame): ` +
      [...totals]
        .sort((a, b) => b[1] - a[1])
        .map(([owner, value]) => `${owner} ${perFrame(value)}`)
        .join(', '),
  );
  const sorted = [...bytes].sort((a, b) => b[1] - a[1]);
  for (const [key, value] of sorted.slice(0, 15)) console.log(`  ${perFrame(value)} B/frame  ${key}`);
  const fromSrc = sorted.filter(([key]) => key.startsWith('src |'));
  for (const [key, value] of fromSrc.slice(0, 15)) console.log(`  ${perFrame(value)} B/frame  ${key}`);

  expect(await listen.jsonValue()).toEqual({ entered: true, exited: false }); // Listen throughout
  expect(frames).toBeGreaterThan(50);
  expect((totals.get('src') ?? 0) / frames).toBeLessThanOrEqual(SRC_BYTES_PER_FRAME_MAX);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('TC-E2E-10 soak: 5 minutes at autoplant=40 with the hands moving, the heap after a collection grows <= 5 %', async ({
  page,
}) => {
  test.setTimeout(SOAK_WARM_UP_MS + SOAK_MS + 120_000);
  const errors = watch(page);
  const offHost = await enterGarden(page, 40);
  await moveHands(page);
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');
  await waitMs(page, SOAK_WARM_UP_MS);
  const before = await heapAfterGc(client);
  const readings = [before];
  for (let minute = 1; minute <= SOAK_MS / 60_000; minute++) {
    await waitMs(page, 60_000);
    readings.push(await heapAfterGc(client));
  }
  const after = readings[readings.length - 1]!;
  const growth = (after - before) / before;
  console.log(
    `T-165 TC-E2E-10 soak (emulator, autoplant=40, hands moving): heap after a collection, MB per minute: ` +
      `${readings.map((bytes) => (bytes / 1e6).toFixed(2)).join(', ')}; growth ${(growth * 100).toFixed(2)} %`,
  );
  expect(growth).toBeLessThanOrEqual(HEAP_GROWTH_MAX);
  expect(await page.evaluate(() => window.__roomsong!.world.renderer.xr.isPresenting)).toBe(true);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
