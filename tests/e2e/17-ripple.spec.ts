// T-142, the tuning ripple's visual and caption half (FR-ROOM-12, LLD §5.8; TC-E2E-13 in part): in the emulator's
// `table` room RoomSystem places the bed and emits room:features for real, and the app's GardenSystem answers
// with room:signature (API_SPEC §1.10 rule 4, T-128d). The sweeps, the captions and room:tuned are the app's
// own. In the `none` room the signature is Wanderer: one ripple on the
// bed, no surface swept, no caption.
// The times are asserted on the app's own frame clock, the one the ripple runs on: each step must come in the
// first frame at or after its time. The page's own clock is only logged: on a loaded machine a software-rendered
// frame takes up to 1.4 s (measured), which says nothing about the ripple.
// Emulator results (E): software rendering in a headless browser. Whether the sweep reads on a real table, wall
// and ceiling through passthrough, and whether the ceiling sweep is seen from a seat, are headset checks.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom, WORLD_READY_MS } from './support/iwer';

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Render = typeof import('../../src/render/index');
type Ui = typeof import('../../src/ui/index');

// LLD §5.8 and UX §5, pinned here on purpose (render/config.ts): when each sweep starts, how long it and its
// afterglow are lit, and room:tuned.
const SWEEP_AT_MS = [300, 1500, 2700];
const LIT_MS = [600 + 1000, 1000 + 1000, 800 + 1000];
const TUNED_MS = 4000;
const CAPTION_MIN_MS = 1200;
const SHOT = fileURLToPath(new URL('../../.tmp/t142-ripple-wall.png', import.meta.url));

/** A caption on screen from `atMs` on (null: none). */
type Shown = { shown: string | null; atMs: number };
/** One frame of the app, after TuningRippleSystem's update: its frame time and which quads are lit. */
type AppFrame = { ms: number; lit: boolean[] };
interface RippleProbe {
  // On the app's frame clock (ms, as TuningRippleSystem takes it).
  /** The frame the ripple started in, and the count of app frames at it and at room:features. */
  startMs: number;
  startFrame: number;
  featuresFrame: number;
  appFrames: AppFrame[];
  raised: { key: string; ms: number }[];
  tunedMs: number[];
  levels: number[];
  // Logged only.
  /** performance.now() at room:features, and per frame of the page: the time and the caption on screen. */
  featuresAtMs: number;
  frames: Shown[];
  /** Each change of the caption the queue shows, on the queue's own clock (core's): CAPTION_MIN_MS counts there. */
  queued: Shown[];
  samples: { draws: number; tris: number; maxFlashPerS: number; isRippleDrawn: boolean }[];
  /** A pinch begun and released on nothing, as HandSystem sends it: the level-3 confirm. */
  confirm(): void;
}
type RippleData = Omit<RippleProbe, 'confirm'>;

/** Console errors and page errors from now on. */
function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** Listens on the app's own bus and world. Made before the session, so it hears the placement. */
async function probeRipple(page: Page): Promise<JSHandle<RippleProbe>> {
  await expect(page.getByRole('button', { name: 'Enter the garden' })).toBeEnabled({
    timeout: WORLD_READY_MS,
  });
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const { Caption } = await load<Components>('/src/core/components.ts');
    const render = await load<Render>('/src/render/index.ts');
    const ui = await load<Ui>('/src/ui/index.ts');
    const { world } = window.__roomsong!;
    const captions = world.getSystem(ui.CaptionSystem)!;
    // The system, its ripple and the ripple's quads: wrapped to be watched, passed through unchanged. A quad counts
    // as lit when it is drawn above brightness 0: in the frame a ripple starts one is drawn once, dark.
    type Quad = { visible: boolean; material: { uniforms: { uNow: { value: Float32Array } } } };
    type Ripple = { meshes: Quad[]; start(plan: unknown, nowMs: number): void };
    const system = world.getSystem(render.TuningRippleSystem)!;
    const ripple = (system as unknown as { ripple: Ripple }).ripple;
    const lit = (): boolean[] =>
      ripple.meshes.map((m) => m.visible && m.material.uniforms.uNow.value[1]! > 0);
    const probe: RippleProbe = {
      startMs: NaN,
      startFrame: NaN,
      featuresFrame: NaN,
      appFrames: [],
      raised: [],
      tunedMs: [],
      levels: [],
      featuresAtMs: NaN,
      frames: [],
      queued: [],
      samples: [],
      confirm: () => {
        const pos = { x: 0.1, y: 1, z: -0.3 };
        core.bus.emit('gesture:pinchStart', { type: 'gesture:pinchStart', hand: 'right', target: null, pos });
        core.bus.emit('gesture:release', {
          type: 'gesture:release',
          hand: 'right',
          gesture: 'none',
          target: null,
          pos,
          zone: 'outer',
          cell: null,
          dy: null,
        });
      },
    };
    let frameMs = NaN;
    const update = system.update.bind(system);
    system.update = (delta, time) => {
      frameMs = Math.round(time * 1000);
      update(delta, time);
      probe.appFrames.push({ ms: frameMs, lit: lit() });
    };
    const start = ripple.start.bind(ripple);
    ripple.start = (plan, nowMs) => {
      probe.startMs = nowMs;
      probe.startFrame = probe.appFrames.length; // this frame's entry is pushed after the update
      start(plan, nowMs);
    };
    core.bus.on('room:placementLevel', ({ level }) => probe.levels.push(level));
    // RoomSystem (priority 10) emits it, before TuningRippleSystem's update in the same frame; the app's
    // GardenSystem answers it with room:signature (T-128d).
    core.bus.on('room:features', () => {
      probe.featuresFrame = probe.appFrames.length;
      probe.featuresAtMs = performance.now();
    });
    core.bus.on('room:tuned', () => probe.tunedMs.push(frameMs));
    world.queryManager
      .registerQuery({ required: [Caption] })
      .subscribe('qualify', (entity) =>
        probe.raised.push({ key: entity.getValue(Caption, 'key') ?? '', ms: frameMs }),
      );
    core.bus.on('perf:sample', ({ draws, tris, maxFlashPerS }) =>
      probe.samples.push({ draws, tris, maxFlashPerS, isRippleDrawn: lit().some(Boolean) }),
    );
    // The queue's own view, read where it is decided: what `current(now)` hands CaptionSystem each frame.
    const queue = (captions as unknown as { queue: { current(now: number): string | null } }).queue;
    const current = queue.current.bind(queue);
    queue.current = (now) => {
      const key = current(now);
      if (key !== (probe.queued[probe.queued.length - 1]?.shown ?? null))
        probe.queued.push({ shown: key, atMs: now });
      return key;
    };
    const look = (): void => {
      probe.frames.push({ atMs: performance.now(), shown: captions.shown });
      requestAnimationFrame(look);
    };
    look();
    return probe;
  });
}

/** Resolves once room:tuned was heard, and the last afterglow is over. */
async function tuned(page: Page, probe: JSHandle<RippleProbe>): Promise<RippleData> {
  await page.waitForFunction((p) => p.tunedMs.length > 0, probe, { timeout: 30_000 });
  await page.waitForFunction((p) => p.appFrames[p.appFrames.length - 1]!.ms > p.startMs + 5000, probe);
  return probe.evaluate((p) => JSON.parse(JSON.stringify(p)) as RippleData); // the data, without `confirm`
}

/** The frame time (from the ripple's start) of the first app frame at or after `dueMs`: where a step must happen. */
function due(p: RippleData, dueMs: number): number {
  return p.appFrames.find((f) => f.ms >= p.startMs + dueMs)!.ms - p.startMs;
}

/** Asserts that quad `i` is lit in exactly the app frames from its sweep's start to its afterglow's end. */
function expectLitOnTime(p: RippleData, i: number): void {
  const from = p.startMs + SWEEP_AT_MS[i]!;
  const to = from + LIT_MS[i]!;
  const inside = p.appFrames.filter((f) => f.ms >= from && f.ms < to);
  expect(inside.length, `quad ${i}`).toBeGreaterThan(0);
  expect(
    inside.every((f) => f.lit[i]),
    `quad ${i} lit on time`,
  ).toBe(true);
  expect(
    p.appFrames.some((f) => (f.ms < from || f.ms >= to) && f.lit[i]),
    `quad ${i} lit out of time`,
  ).toBe(false);
}

/** Each ripple caption's time on screen: from the first entry that shows it to the first that does not. */
function onScreen(series: Shown[]): { key: string; forMs: number }[] {
  const spans: { key: string; forMs: number }[] = [];
  let from: { key: string; atMs: number } | null = null;
  for (const { shown, atMs } of series) {
    if (from !== null && shown !== from.key) {
      spans.push({ key: from.key, forMs: Math.round(atMs - from.atMs) });
      from = null;
    }
    if (from === null && shown !== null) from = { key: shown, atMs };
  }
  return spans.filter((span) => span.key.startsWith('ripple'));
}

test('T-142 the table room: sweeps at 0.3, 1.5 and 2.7 s, one caption each, room:tuned at 4.0 s', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  const probe = await probeRipple(page);
  await enterXR(page);
  // The wall sweep, for the record: 1.8 s after room:features on the ripple's clock.
  await page.waitForFunction((p) => p.appFrames[p.appFrames.length - 1]!.ms > p.startMs + 1800, probe, {
    timeout: 20_000,
  });
  mkdirSync(fileURLToPath(new URL('../../.tmp/', import.meta.url)), { recursive: true });
  await page.screenshot({ path: SHOT });
  const p = await tuned(page, probe);

  const ripple = p.raised.filter((c) => c.key.startsWith('ripple'));
  const spans = onScreen(p.queued);
  const pageFrames = p.frames.filter((f) => f.atMs >= p.featuresAtMs);
  const gaps = pageFrames.slice(1).map((f, i) => f.atMs - pageFrames[i]!.atMs);
  console.log(
    `T-142 table room (emulator), from the ripple's start on the app's frame clock: quads first lit at ` +
      `${JSON.stringify([0, 1, 2].map((i) => p.appFrames.find((f) => f.lit[i])!.ms - p.startMs))} ms; captions ` +
      `${JSON.stringify(ripple.map((c) => [c.key, c.ms - p.startMs]))}; room:tuned ${p.tunedMs[0]! - p.startMs} ms; ` +
      `${p.appFrames.length} app frames. Captions shown by the queue ${JSON.stringify(spans)}, seen in the page's ` +
      `frames ${JSON.stringify(onScreen(pageFrames))}; longest page frame ${Math.round(Math.max(...gaps))} ms. ` +
      `perf:sample with a quad lit ${JSON.stringify(p.samples.filter((s) => s.isRippleDrawn))}, without ` +
      `${JSON.stringify(p.samples.filter((s) => !s.isRippleDrawn))}; screenshot ${SHOT}`,
  );

  expect(p.levels).toEqual([1]);
  expect(p.startFrame).toBe(p.featuresFrame); // started in the frame of room:features
  for (let i = 0; i < 3; i++) expectLitOnTime(p, i);
  expect(ripple.map((c) => c.key)).toEqual(['rippleTableSeeds', 'rippleWalls', 'rippleCeiling']);
  ripple.forEach((c, i) => expect(c.ms - p.startMs, c.key).toBe(due(p, SWEEP_AT_MS[i]!)));
  expect(spans.map((s) => s.key)).toEqual(['rippleTableSeeds', 'rippleWalls', 'rippleCeiling']);
  for (const span of spans) expect(span.forMs, span.key).toBeGreaterThanOrEqual(CAPTION_MIN_MS);
  expect(p.tunedMs.map((ms) => ms - p.startMs)).toEqual([due(p, TUNED_MS)]);
  expect(p.samples.some((s) => s.isRippleDrawn)).toBe(true);
  for (const sample of p.samples) {
    expect(sample.draws).toBeLessThanOrEqual(60);
    expect(sample.maxFlashPerS).toBeLessThanOrEqual(3);
  }
  expect(errors).toEqual([]); // a shader that did not compile would be here
  expect(offHost).toEqual([]);
});

test('T-142 the none room: Wanderer, one ripple on the bed, no surface swept, no caption, room:tuned at 4.0 s', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('none'));
  const probe = await probeRipple(page);
  await enterXR(page);
  await page.waitForFunction((p) => p.levels.includes(3), probe, { timeout: 20_000 }); // the ghost is up
  await probe.evaluate((p) => p.confirm());
  const p = await tuned(page, probe);

  console.log(
    `T-142 none room (emulator): bed ripple first lit at ` +
      `${p.appFrames.find((f) => f.lit[0])!.ms - p.startMs} ms; room:tuned ${p.tunedMs[0]! - p.startMs} ms`,
  );
  expect(p.levels).toEqual([1, 3, 4]);
  expect(p.startFrame).toBe(p.featuresFrame);
  expectLitOnTime(p, 0); // the bed's ripple, on the table's time
  expect(p.appFrames.some((f) => f.lit[1] || f.lit[2])).toBe(false); // no wall, no ceiling
  expect(p.raised.filter((c) => c.key.startsWith('ripple'))).toEqual([]);
  expect(p.tunedMs.map((ms) => ms - p.startMs)).toEqual([due(p, TUNED_MS)]);
  for (const sample of p.samples) expect(sample.maxFlashPerS).toBeLessThanOrEqual(3);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
