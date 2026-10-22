/// <reference types="webxr" />
// T-150, TC-E2E-03 timing (FR-UI-02, Golden Rule 4): the guided first minute in the app, walked by the emulator's
// hands as a first-time player follows it. After the ripple (room:tuned): "Open your hand, palm up" and the palm
// icon; a seed on the palm: "Pinch the seed, drop it here", the glowing cell and the ghost pinch looping over it;
// the first plant: its first note (first sound <= 20 s); two more seeds with no caption; then the hint ring round
// the newest plant with the pull icon (grow), after a pull the drag icon (move), the remove arrow on the rim during
// the drag; after the drag the gates are earned and the Listen step comes at once, "Show your palms to listen"
// (first loop <= 90 s). The same in the garden window, where a click is the pinch and the grow gate is skipped (a
// pointer cannot pull, so Listen waits for its 4-minute net there). The room with no table, timed (PROGRESS item 23 is open). A
// returning player's flag: no tutorial. The test emits nothing on the bus; it moves the hands or the mouse and reads.
// Emulator and desktop browser results only: hands at test speed, software rendering. Nothing here says whether a
// stranger understands the ghost hand (UAT-16), or how fast a real first minute is.
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { HIT_RADIUS_M } from '../../src/hands/config';
import { GUIDE_CELL } from '../../src/ui/config';

import { enterXR, openApp, readRoom, xrFrames } from './support/iwer';

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Garden = typeof import('../../src/garden/index');
type Hands = typeof import('../../src/hands/index');
type Onboarding = typeof import('../../src/onboarding/index');
type RoomModule = typeof import('../../src/room/index');
type Ui = typeof import('../../src/ui/index');
type Hand = 'left' | 'right';
type Vec3 = { x: number; y: number; z: number };
type Cell = { ring: number; step: number };

/** Hints.ts `Frame`: the atlas cell each element shows. */
const ICON = { pinchOpen: 0, pinchClosed: 1, pointer: 2, pointerClick: 3, palm: 4, pull: 6, drag: 7 };
const RING = 10;
const ARROW = 8;
const FIRST_SOUND_MS = 20_000; // FR-UI-02
const FIRST_LOOP_MS = 90_000; // Golden Rule 4
/**
 * The app's share of the first sound: all of it but the time from the plant step (a seed out) to the plant, which
 * is the emulated hand's carry (or the test's look at the ghost first). On this shared machine that carry took 2 s
 * on one run and 10 s on the next (software rendering, frame-bound hand moves), so the raw figure is logged, and
 * the 20 s of FR-UI-02 is held against the app's waits: the ripple, the palm-up, the glide and the tide.
 */
const appShareMs = (t: { firstSoundMs: number; plantStepMs: number; plantedMs: number }) =>
  t.firstSoundMs - (t.plantedMs - t.plantStepMs);
const PALM_DOWN = { roll: 0, pitch: 0, yaw: 0 };
const PALM_UP = { roll: 180, pitch: 0, yaw: 0 };
const LEFT_ROOT: Vec3 = { x: -0.2, y: 0.95, z: -0.3 };
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

interface Heard {
  name: string;
  id: string | null;
  step: string | null;
  gesture: string | null;
  atMs: number;
}
interface Probe {
  heard: Heard[];
  /** Each caption as it came on screen: its key and when. */
  captionLog: { key: string | null; atMs: number }[];
  enterAtMs: number;
  firstNoteAtMs: number;
  maxFlashPerS: number;
  maxDraws: number;
  step(): string;
  shows(): { icon: number; ring: number; arrow: number; hands: number[] };
  /** The caption on screen and its edges in degrees from the gaze (CaptionSystem's own read-out). */
  caption(): {
    key: string | null;
    fov: { leftDeg: number; rightDeg: number; downDeg: number; upDeg: number };
  };
  /** Where the hint ring and the icon stand, in world space. */
  ringAt(): Vec3;
  seedTarget(): { id: string; at: Vec3 } | null;
  plantTargets(): { id: string; at: Vec3 }[];
  hand(hand: Hand): { palmPos: Vec3; pinchPos: Vec3 };
  cellAt(cell: Cell): Vec3;
  plants(): { id: string; cell: Cell }[];
  atRest(): Promise<Vec3>;
  /** Where a cell's centre is on the page, in CSS pixels (the garden window). */
  cellOnPage(cell: Cell): { x: number; y: number };
}
interface DevPage {
  IWER_DEVICE: { remote: { dispatch(method: string, params?: object): Promise<unknown> } };
}

function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** Listens on the app's own bus and reads its objects. Made before Enter, so the session's events are heard. */
async function probeApp(page: Page): Promise<JSHandle<Probe>> {
  const enter = page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
  await expect(enter).toBeEnabled({ timeout: 15_000 });
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const { Interactable } = await load<Components>('/src/core/components.ts');
    const gardenModule = await load<Garden>('/src/garden/index.ts');
    const hands = await load<Hands>('/src/hands/index.ts');
    const onboarding = await load<Onboarding>('/src/onboarding/index.ts');
    const room = await load<RoomModule>('/src/room/index.ts');
    const ui = await load<Ui>('/src/ui/index.ts');
    const { world, engine, garden } = window.__roomsong!;
    const bed = world.getSystem(room.RoomSystem)!.bed.object3D!;
    const captions = world.getSystem(ui.CaptionSystem)!;
    const hints = world.getSystem(ui.HintSystem)!;
    const tutorial = world.getSystem(onboarding.OnboardingSystem)!;
    const heard: Heard[] = [];
    const note = (name: string, more: Partial<Heard> = {}) =>
      heard.push({ name, id: null, step: null, gesture: null, ...more, atMs: performance.now() });
    core.bus.on('onboarding:step', ({ step }) => note('step', { step }));
    core.bus.on('room:tuned', () => note('room:tuned'));
    core.bus.on('garden:seedOut', (e) => note('garden:seedOut', { id: e.seed.id }));
    core.bus.on('gesture:pinchStart', (e) => note('gesture:pinchStart', { id: e.target?.id ?? null }));
    core.bus.on('gesture:release', (e) =>
      note('gesture:release', { id: e.target?.id ?? null, gesture: e.gesture }),
    );
    core.bus.on('garden:changed', (e) => {
      for (const id of e.diff.added) note('planted', { id });
    });
    core.bus.on('perf:sample', (s) => {
      probe.maxFlashPerS = Math.max(probe.maxFlashPerS, s.maxFlashPerS);
      probe.maxDraws = Math.max(probe.maxDraws, s.draws);
    });
    document
      .querySelector('main button')
      ?.addEventListener('click', () => (probe.enterAtMs = performance.now()), { capture: true });
    const update = world.update.bind(world);
    world.update = (delta, time) => {
      update(delta, time);
      if (probe.firstNoteAtMs === 0 && engine.stats.triggers > 0) probe.firstNoteAtMs = performance.now();
      const key = captions.shown;
      if (key !== (probe.captionLog[probe.captionLog.length - 1]?.key ?? null))
        probe.captionLog.push({ key, atMs: performance.now() });
    };
    const targets = world.queryManager.registerQuery({ required: [Interactable] }).entities;
    const states = world.queryManager.registerQuery({ required: [hands.HandState] }).entities;
    const stateOf = (hand: Hand) => [...states].find((e) => e.getValue(hands.HandState, 'hand') === hand)!;
    const vec = (view: ArrayLike<number>): Vec3 => ({ x: view[0]!, y: view[1]!, z: view[2]! });
    const ofKind = (kind: string) => [...targets].filter((e) => e.getValue(Interactable, 'kind') === kind);
    const ring = bed.getObjectByName('hint-ring')!;
    const probe: Probe = {
      heard,
      captionLog: [],
      enterAtMs: 0,
      firstNoteAtMs: 0,
      maxFlashPerS: 0,
      maxDraws: 0,
      step: () => tutorial.step,
      shows: () => ({ ...hints.shows, hands: [...hints.shows.hands] }),
      caption: () => ({ key: captions.shown, fov: { ...captions.fov } }),
      ringAt: () => {
        const at = ring.getWorldPosition(ring.position.clone());
        return { x: at.x, y: at.y, z: at.z };
      },
      seedTarget() {
        const seed = ofKind('seed')[0];
        return seed === undefined
          ? null
          : {
              id: seed.getValue(Interactable, 'id') ?? '',
              at: vec(seed.getVectorView(Interactable, 'worldPos')),
            };
      },
      plantTargets: () =>
        ofKind('plant').map((e) => ({
          id: e.getValue(Interactable, 'id') ?? '',
          at: vec(e.getVectorView(Interactable, 'worldPos')),
        })),
      hand: (hand) => ({
        palmPos: vec(stateOf(hand).getVectorView(hands.HandState, 'palmPos')),
        pinchPos: vec(stateOf(hand).getVectorView(hands.HandState, 'pinchPos')),
      }),
      cellAt(cell) {
        const c = gardenModule.cellCentre(cell, { x: 0, y: 0 });
        const e = bed.matrixWorld.elements;
        return {
          x: e[0] * c.x + e[8] * c.y + e[12],
          y: e[1] * c.x + e[9] * c.y + e[13],
          z: e[2] * c.x + e[10] * c.y + e[14],
        };
      },
      plants: () => garden.state!.plants.map((p) => ({ id: p.id, cell: { ...p.cell } })),
      atRest: () =>
        new Promise((done, fail) => {
          let last: Vec3 | null = null;
          const look = () => {
            const session = world.renderer.xr.getSession();
            if (session === null) return fail(new Error('atRest needs a session'));
            const now = probe.hand('right').pinchPos;
            if (last !== null && Math.hypot(now.x - last.x, now.y - last.y, now.z - last.z) < 0.0002) {
              return done(now);
            }
            last = now;
            session.requestAnimationFrame(look);
          };
          look();
        }),
      cellOnPage: (cell) => {
        const c = gardenModule.cellCentre(cell, { x: 0, y: 0 }); // bed-local x and z (D-029)
        const ndc = bed.localToWorld(bed.position.clone().set(c.x, 0, c.y)).project(world.camera);
        const rect = world.renderer.domElement.getBoundingClientRect();
        return {
          x: rect.left + ((ndc.x + 1) / 2) * rect.width,
          y: rect.top + ((1 - ndc.y) / 2) * rect.height,
        };
      },
    };
    return probe;
  });
}

/** Resolves with the `count`-th event of that name (with that step or gesture, if given). */
async function heard(
  probe: JSHandle<Probe>,
  name: string,
  { step, gesture, count = 1 }: { step?: string; gesture?: string; count?: number } = {},
): Promise<Heard> {
  const handle = await probe.evaluateHandle(
    (p, [name, step, gesture, count]) =>
      new Promise<Heard>((done) => {
        const look = () => {
          const found = p.heard.filter(
            (e) =>
              e.name === name &&
              (step === null || e.step === step) &&
              (gesture === null || e.gesture === gesture),
          );
          if (found.length >= count) done(found[count - 1]!);
          else setTimeout(look, 10);
        };
        look();
      }),
    [name, step ?? null, gesture ?? null, count] as const,
  );
  return handle.jsonValue();
}
const stepAt = (probe: JSHandle<Probe>, step: string) => heard(probe, 'step', { step });

/** The emulated hands (16-seeds.spec.ts): the right hand's pinch that does not move its pinch point. */
async function emulatedHands(page: Page, probe: JSHandle<Probe>) {
  const together = (commands: [method: string, params: object][]) =>
    page.evaluate(async (commands) => {
      const { remote } = (window as unknown as DevPage).IWER_DEVICE;
      await Promise.all(commands.map(([method, params]) => remote.dispatch(method, params)));
    }, commands);
  const transform = (hand: Hand, position: Vec3, orientation = PALM_DOWN): [string, object] => [
    'set_transform',
    { device: `hand-${hand}`, position, orientation },
  ];
  const select = (value: 0 | 1): [string, object] => ['set_select_value', { device: 'hand-right', value }];
  const settle = async (): Promise<Vec3> => {
    await xrFrames(page, 2);
    return probe.evaluate((p) => p.atRest());
  };
  const root = { x: 0.3, y: 1.1, z: -0.25 };
  const from = (tip: Vec3): Vec3 => ({ x: tip.x - root.x, y: tip.y - root.y, z: tip.z - root.z });
  await together([transform('right', root)]);
  const open = from(await settle());
  await together([select(1)]);
  const closed = from(await settle());
  await together([select(0)]);
  await settle();
  const rootFor = (pos: Vec3, tip: Vec3): Vec3 => ({ x: pos.x - tip.x, y: pos.y - tip.y, z: pos.z - tip.z });
  return {
    putLeft: (orientation: typeof PALM_UP) => together([transform('left', LEFT_ROOT, orientation)]),
    lookDown: (pitch: number) =>
      together([['set_transform', { device: 'headset', orientation: { yaw: 0, pitch: -pitch, roll: 0 } }]]),
    async pinchAt(pos: Vec3): Promise<number> {
      await together([transform('right', rootFor(pos, open))]);
      const tip = await settle();
      await together([transform('right', rootFor(pos, closed)), select(1)]);
      return distance(tip, pos);
    },
    carryTo: async (pos: Vec3) => {
      await together([transform('right', rootFor(pos, closed))]);
      return settle();
    },
    releaseAt: (pos: Vec3) => together([transform('right', rootFor(pos, open)), select(0)]),
  };
}
type EmulatedHands = Awaited<ReturnType<typeof emulatedHands>>;

/** The `count`-th seed out on the left palm, pinched by the right hand, carried to `to` and let go there. */
async function carry(page: Page, probe: JSHandle<Probe>, hands: EmulatedHands, to: Vec3, count: number) {
  const out = await heard(probe, 'garden:seedOut', { count });
  const resting = async () => {
    const seed = await probe.evaluate((p) => p.seedTarget());
    const palm = await probe.evaluate((p) => p.hand('left').palmPos);
    return seed?.id === out.id ? { at: seed.at, gap: distance(seed.at, palm) } : null;
  };
  await expect.poll(async () => (await resting())?.gap ?? Infinity).toBeLessThan(0.001);
  expect(await hands.pinchAt((await resting())!.at)).toBeLessThan(HIT_RADIUS_M / 4);
  await xrFrames(page, 12); // past the 100 ms hop to the pinch point
  await hands.carryTo(to);
  await hands.releaseAt(to);
  await heard(probe, 'planted', { count });
}

/** Three cells of the middle ring nearest the user: the guide cell first, then its two neighbours. */
const nearCells: Cell[] = [GUIDE_CELL, { ring: 2, step: 3 }, { ring: 2, step: 5 }];

test('TC-E2E-03 the guided first minute: palm, plant on the glowing cell, grow, move; first sound and first loop timed', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'), '/', { onboarding: true });
  const probe = await probeApp(page);
  await enterXR(page);
  const hands = await emulatedHands(page, probe);
  await hands.lookDown(55); // the table is 55 to 65 degrees below the emulated head
  await hands.putLeft(PALM_DOWN);

  // Step 0 then 1: nothing of the tutorial before room:tuned; then "Open your hand, palm up" and the palm icon.
  const tuned = await heard(probe, 'room:tuned');
  await stepAt(probe, 'palm');
  // Said inside room:tuned's own dispatch: OnboardingSystem's handler runs before the probe's, which notes the event.
  const steps = await probe.evaluate((p) => p.heard.map((e) => (e.name === 'step' ? e.step : e.name)));
  expect(steps.indexOf('palm')).toBe(steps.indexOf('room:tuned') - 1);
  expect((await heard(probe, 'step', { step: 'tune' })).atMs).toBeLessThan(tuned.atMs);
  await page.waitForFunction((p) => p.caption().key === 'onboardPalm', probe);
  const atPalm = await probe.evaluate((p) => ({ shows: p.shows(), caption: p.caption() }));
  expect(atPalm.shows.icon).toBe(ICON.palm);
  // FR-UI-03: the caption inside the FoV box (it may ride an edge: the guard holds it there, to 1e-6 degrees).
  const EDGE = 1e-6;
  expect(atPalm.caption.fov.leftDeg).toBeGreaterThanOrEqual(-25 - EDGE);
  expect(atPalm.caption.fov.rightDeg).toBeLessThanOrEqual(25 + EDGE);
  expect(atPalm.caption.fov.downDeg).toBeGreaterThanOrEqual(-20 - EDGE);
  expect(atPalm.caption.fov.upDeg).toBeLessThanOrEqual(20 + EDGE);
  await xrFrames(page, 4); // the icon's 200 ms fade
  await page.screenshot({ path: '.tmp/t150-1-palm.png' });

  // Step 2: the palm turned up brings a seed; "Pinch the seed, drop it here", the glowing cell and the looping ghost pinch.
  await hands.putLeft(PALM_UP);
  await stepAt(probe, 'plant');
  await page.waitForFunction((p) => p.caption().key === 'onboardPlant', probe);
  const guideAt = await probe.evaluate((p, c) => p.cellAt(c), GUIDE_CELL);
  const ringAt = await probe.evaluate((p) => p.ringAt());
  expect(distance(ringAt, guideAt)).toBeLessThan(0.01); // the ring lies on the guide cell, 4 mm over the glass
  // One look, as a player gives it: the clock to the first sound is running (the loop itself: Hints.test.ts).
  expect([ICON.pinchOpen, ICON.pinchClosed]).toContain(await probe.evaluate((p) => p.shows().icon));
  expect(await probe.evaluate((p) => p.shows().ring)).toBe(RING);
  await page.screenshot({ path: '.tmp/t150-2-plant.png' });

  // The pinch gate: the seed planted on the glowing cell. The tide plays it: the first sound.
  await carry(page, probe, hands, guideAt, 1);
  await stepAt(probe, 'more');
  await expect.poll(() => probe.evaluate((p) => p.firstNoteAtMs), { timeout: 10_000 }).toBeGreaterThan(0);
  expect(await probe.evaluate((p) => [p.shows().icon, p.shows().ring])).toEqual([-1, -1]); // step 3: nothing

  // Two more seeds, no caption; at three plants the hint ring with the pull icon round the newest.
  await carry(page, probe, hands, await probe.evaluate((p, c) => p.cellAt(c), nearCells[1]!), 2);
  await carry(page, probe, hands, await probe.evaluate((p, c) => p.cellAt(c), nearCells[2]!), 3);
  await stepAt(probe, 'grow');
  const newest = (await probe.evaluate((p) => p.plants())).slice(-1)[0]!;
  expect(newest.cell).toEqual(nearCells[2]);
  const newestAt = await probe.evaluate((p, c) => p.cellAt(c), newest.cell);
  await xrFrames(page, 20);
  expect(await probe.evaluate((p) => [p.shows().icon, p.shows().ring])).toEqual([ICON.pull, RING]);
  expect(distance(await probe.evaluate((p) => p.ringAt()), newestAt)).toBeLessThan(0.01);
  await page.screenshot({ path: '.tmp/t150-3-grow.png' });

  // The grow gate: the newest plant pulled up 8 cm. Then the drag icon.
  const foot = (await probe.evaluate((p) => p.plantTargets())).find((t) => t.id === newest.id)!.at;
  expect(await hands.pinchAt(foot)).toBeLessThan(HIT_RADIUS_M / 4);
  await hands.carryTo({ ...foot, y: foot.y + 0.08 });
  await hands.releaseAt({ ...foot, y: foot.y + 0.08 });
  await heard(probe, 'gesture:release', { gesture: 'pull' });
  await stepAt(probe, 'move');
  await xrFrames(page, 20);
  expect(await probe.evaluate((p) => [p.shows().icon, p.shows().ring])).toEqual([ICON.drag, RING]);
  await page.screenshot({ path: '.tmp/t150-4-move.png' });

  // The move gate: the newest plant dragged along the bed to a free cell; the remove arrow shows during it.
  const to = await probe.evaluate((p) => p.cellAt({ ring: 3, step: 6 }));
  expect(await hands.pinchAt(foot)).toBeLessThan(HIT_RADIUS_M / 4);
  await hands.carryTo(to);
  await xrFrames(page, 20);
  expect(await probe.evaluate((p) => p.shows().arrow)).toBe(ARROW);
  await page.screenshot({ path: '.tmp/t150-5-drag.png' });
  await hands.releaseAt(to);
  await heard(probe, 'gesture:release', { gesture: 'drag' });
  // Both gates earned: the Listen step at once, "Show your palms to listen" (free is passed, not said).
  const free = await stepAt(probe, 'listen');
  await xrFrames(page, 5);

  const timing = await probe.evaluate((p, freeAtMs) => {
    const plant = p.heard.find((e) => e.name === 'step' && e.step === 'plant')!.atMs;
    return {
      tunedMs: p.heard.find((e) => e.name === 'room:tuned')!.atMs - p.enterAtMs,
      plantStepMs: plant - p.enterAtMs,
      pinchedMs: p.heard.find((e) => e.name === 'gesture:pinchStart' && e.id !== null)!.atMs - p.enterAtMs,
      plantedMs: p.heard.find((e) => e.name === 'planted')!.atMs - p.enterAtMs,
      firstSoundMs: p.firstNoteAtMs - p.enterAtMs,
      firstLoopMs: freeAtMs - p.enterAtMs,
      captions: p.captionLog.map((c) => c.key),
      maxFlashPerS: p.maxFlashPerS,
      maxDraws: p.maxDraws,
    };
  }, free.atMs);
  console.log(
    `T-150 first minute (emulator, table room, hands at test speed): Enter to room:tuned ${Math.round(timing.tunedMs)} ms, ` +
      `to the plant step ${Math.round(timing.plantStepMs)} ms, to the seed pinched ${Math.round(timing.pinchedMs)} ms, ` +
      `planted ${Math.round(timing.plantedMs)} ms, to the first sound ${Math.round(timing.firstSoundMs)} ms, ` +
      `to the gates done ${Math.round(timing.firstLoopMs)} ms; captions ${JSON.stringify(timing.captions)}; ` +
      `max draws ${timing.maxDraws}, max flashes ${timing.maxFlashPerS}/s; the app's share of the first sound ` +
      `${Math.round(appShareMs(timing))} ms`,
  );
  expect(appShareMs(timing)).toBeLessThanOrEqual(FIRST_SOUND_MS);
  expect(timing.firstLoopMs).toBeLessThanOrEqual(FIRST_LOOP_MS);
  // One caption at a time, each one of the tutorial's own after the ripple's, at most six words (FR-UI-01).
  expect(timing.captions.filter((key) => key?.startsWith('onboard'))).toEqual([
    'onboardPalm',
    'onboardPlant',
    'onboardListen',
  ]);
  expect(timing.maxFlashPerS).toBeLessThanOrEqual(3); // FR-UI-11
  expect(timing.maxDraws).toBeLessThanOrEqual(60); // NFR-PERF-03
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]); // Golden Rule 9
});

/** Opens the dev page as a desktop browser would see it (20-window.spec.ts): no emulator, nothing off-host. */
async function openPlain(page: Page): Promise<string[]> {
  const offHost: string[] = [];
  await page.route('**/@iwer-injection-runtime*', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: '' }),
  );
  await page.route(
    (url) => url.hostname !== 'localhost',
    (route) => {
      offHost.push(route.request().url());
      return route.abort();
    },
  );
  await page.goto('/');
  return offHost;
}

test('TC-E2E-14 the first minute in the garden window: a click on the glowing cell, then the move gate; timed', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const offHost = await openPlain(page);
  const probe = await probeApp(page);
  await page.getByRole('main').getByRole('button', { name: 'Enter the garden' }).click();

  // A pointer is always palm up: the seed is out before room:tuned, so the palm step is never taken.
  await stepAt(probe, 'plant');
  await page.waitForFunction((p) => p.caption().key === 'onboardPlantClick', probe);
  const ghost = new Set<number>();
  for (let i = 0; i < 12; i++) {
    ghost.add(await probe.evaluate((p) => p.shows().icon));
    await page.waitForTimeout(150);
  }
  expect([...ghost].sort()).toEqual([ICON.pointer, ICON.pointerClick]); // the ghost shows a click
  expect(await probe.evaluate((p) => p.shows().ring)).toBe(RING);
  await page.screenshot({ path: '.tmp/t150-6-window-plant.png' });

  // Three clicks on three cells plant the three seeds; the first one is on the glowing cell.
  const click = async (cell: Cell, count: number) => {
    await heard(probe, 'garden:seedOut', { count }); // the seed is on the pointer before the click (20-window)
    const at = await probe.evaluate((p, c) => p.cellOnPage(c), cell);
    await page.mouse.move(at.x, at.y, { steps: 5 });
    await page.mouse.click(at.x, at.y);
    await heard(probe, 'planted', { count });
    return at;
  };
  await click(GUIDE_CELL, 1);
  await expect.poll(() => probe.evaluate((p) => p.firstNoteAtMs), { timeout: 10_000 }).toBeGreaterThan(0);
  await click(nearCells[1]!, 2); // each next seed comes to the pointer by itself
  const newestAt = await click(nearCells[2]!, 3);
  // No grow gate here (a pointer cannot pull): from three plants straight to move.
  await stepAt(probe, 'move');
  expect(await probe.evaluate((p) => p.heard.some((e) => e.step === 'grow'))).toBe(false);
  await page.waitForTimeout(400);
  expect(await probe.evaluate((p) => [p.shows().icon, p.shows().ring])).toEqual([ICON.drag, RING]);
  await page.screenshot({ path: '.tmp/t150-7-window-move.png' });

  // The move gate: the newest plant dragged with the mouse to a free cell.
  const to = await probe.evaluate((p) => p.cellOnPage({ ring: 3, step: 2 }));
  await page.mouse.move(newestAt.x, newestAt.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
  await heard(probe, 'gesture:release', { gesture: 'drag' });
  const free = await stepAt(probe, 'free');
  const timing = await probe.evaluate(
    (p, freeAtMs) => ({
      plantStepMs: p.heard.find((e) => e.name === 'step' && e.step === 'plant')!.atMs - p.enterAtMs,
      plantedMs: p.heard.find((e) => e.name === 'planted')!.atMs - p.enterAtMs,
      firstSoundMs: p.firstNoteAtMs - p.enterAtMs,
      firstLoopMs: freeAtMs - p.enterAtMs,
      captions: p.captionLog.map((c) => c.key).filter((key) => key !== null),
    }),
    free.atMs,
  );
  console.log(
    `T-150 first minute in the garden window (desktop Chromium, mouse at test speed): Enter to the first sound ` +
      `${Math.round(timing.firstSoundMs)} ms (the app's share ${Math.round(appShareMs(timing))} ms), to the gates ` +
      `done ${Math.round(timing.firstLoopMs)} ms; captions ${JSON.stringify(timing.captions)}`,
  );
  expect(appShareMs(timing)).toBeLessThanOrEqual(FIRST_SOUND_MS);
  expect(timing.firstLoopMs).toBeLessThanOrEqual(FIRST_LOOP_MS);
  expect(timing.captions.filter((key) => key.startsWith('onboard'))).toEqual(['onboardPlantClick']);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('PROGRESS item 23, measured: the room with no table, no pinch for the bed: Enter to the palm step and the first sound', async ({
  page,
}) => {
  const errors = watch(page);
  await openApp(page, readRoom('none'), '/', { onboarding: true });
  const probe = await probeApp(page);
  await enterXR(page);
  // The level-3 wait runs out (no pinch, nothing under the gaze in this fixture), the bed-only ripple, then step 1.
  // The hands are measured only once the bed is down: their test pinch would confirm the bed at level 3.
  await stepAt(probe, 'tune');
  const hands = await emulatedHands(page, probe);
  await hands.putLeft(PALM_DOWN);
  await stepAt(probe, 'palm');
  await hands.putLeft(PALM_UP);
  await carry(page, probe, hands, await probe.evaluate((p, c) => p.cellAt(c), GUIDE_CELL), 1);
  await expect.poll(() => probe.evaluate((p) => p.firstNoteAtMs), { timeout: 10_000 }).toBeGreaterThan(0);
  const timing = await probe.evaluate((p) => ({
    tunedMs: p.heard.find((e) => e.name === 'room:tuned')!.atMs - p.enterAtMs,
    palmMs: p.heard.find((e) => e.step === 'palm')!.atMs - p.enterAtMs,
    firstSoundMs: p.firstNoteAtMs - p.enterAtMs,
  }));
  // Not asserted against FR-UI-02: whether 20 s binds in a room with no table is PROGRESS item 23, open.
  console.log(
    `T-150 room with no table (emulator, no bed pinch, hands at test speed): Enter to room:tuned ` +
      `${Math.round(timing.tunedMs)} ms, to the palm step ${Math.round(timing.palmMs)} ms, to the first sound ` +
      `${Math.round(timing.firstSoundMs)} ms (FR-UI-02 asks 20 000)`,
  );
  expect(errors).toEqual([]);
});

test('a returning player (the skipOnboarding flag, as openApp adds it): no tutorial step, no caption, no icon', async ({
  page,
}) => {
  const errors = watch(page);
  await openApp(page, readRoom('table'));
  const probe = await probeApp(page);
  await enterXR(page);
  await heard(probe, 'room:tuned');
  await xrFrames(page, 60);
  expect(await probe.evaluate((p) => [p.step(), p.heard.filter((e) => e.name === 'step').length])).toEqual([
    'off',
    0,
  ]);
  expect(await probe.evaluate((p) => p.shows())).toEqual({ icon: -1, ring: -1, arrow: -1, hands: [-1, -1] });
  expect(await probe.evaluate((p) => p.captionLog.map((c) => c.key))).not.toContain('onboardPalm');
  expect(errors).toEqual([]);
});
