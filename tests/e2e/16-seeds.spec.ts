/// <reference types="webxr" />
// T-127, the seed on the hand (TC-E2E-03, the part that can be shown before T-128d): the app's own SeedSystem,
// HandSystem and CaptionSystem on IWER's emulated hands. No garden is made in the app yet (T-128d), so the test
// is the garden: it emits garden:changed, garden:seedOut and garden:seedBack itself, as GardenSystem would, and
// adds a stand-in bed (a BedAnchor, API_SPEC §1.10 rule 5). The rest is the app's: the left palm turned up asks
// again and again (the re-arm), the seed rests on that palm, the right hand's real pinch takes it (its target is
// SeedSystem's Interactable), it rides the pinch point to a cell and the release names it; then it is planted,
// sent back as over a full bed ("Garden is full"; a stand-in event, see below), and lost with the hand that
// carried it.
// Emulator result (E): it says nothing of a real hand: whether a seed reads as lying on a palm, whether it can be
// found and pinched, whether the orb is seen.
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { HIT_RADIUS_M, PALM_UP_HOLD_MS } from '../../src/hands/config';

import { enterXR, openApp, readRoom, xrFrames } from './support/iwer';

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Hands = typeof import('../../src/hands/index');
type Render = typeof import('../../src/render/index');
type Ui = typeof import('../../src/ui/index');
type Hand = 'left' | 'right';
type Vec3 = { x: number; y: number; z: number };
type Cell = { ring: number; step: number };

interface Heard {
  name: string;
  hand: Hand;
  id: string | null;
  gesture: string | null;
  cell: Cell | null;
  atMs: number;
}
interface Probe {
  heard: Heard[];
  samples: { draws: number; tris: number }[];
  captions: InstanceType<Ui['CaptionSystem']>;
  /** The seed's target as hands sees it, or null when no entity carries a seed Interactable. */
  seedTarget(): { id: string; radius: number; at: Vec3 } | null;
  /** A hand's state as HandSystem wrote it this frame. */
  hand(hand: Hand): { tracked: boolean; palmUp: number; palmPos: Vec3; pinchPos: Vec3 };
  /** What GardenSystem would emit: a garden with these seeds and plants. */
  garden(seeds: string[], plants: (Cell & { id: string })[], added: string[]): void;
  seedOut(id: string, hand: Hand): void;
  seedBack(id: string, reason: 'offBed' | 'full' | 'lost' | 'reset'): void;
  /** Resolves when the right hand's pinch point has stopped moving (it is filtered, FR-HND-03). */
  atRest(): Promise<Vec3>;
}
interface DevPage {
  FRAMEWORK_MCP_RUNTIME: { world: import('@iwsdk/core').World };
  IWER_DEVICE: { remote: { dispatch(method: string, params?: object): Promise<unknown> } };
}

const PALM_DOWN = { roll: 0, pitch: 0, yaw: 0 };
const PALM_UP = { roll: 180, pitch: 0, yaw: 0 }; // turned about its length (the palm-up hand path: roll -180)
const BED: Vec3 = { x: 0, y: 0.74, z: -0.45 }; // the stand-in bed: flat, 0.45 m ahead, on the table fixture
const LEFT_ROOT: Vec3 = { x: -0.2, y: 0.95, z: -0.3 };
const TARGET_CELL: Cell = { ring: 2, step: 4 }; // the step nearest the user
function cellPoint({ ring, step }: Cell): Vec3 {
  const radius = 0.12 + ring * 0.045;
  const rad = (step * Math.PI) / 8;
  return { x: BED.x + radius * Math.cos(rad), y: BED.y, z: BED.z + radius * Math.sin(rad) };
}
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** Listens on the app's own bus, adds the stand-in bed, and is the garden. */
function probeSeeds(page: Page): Promise<JSHandle<Probe>> {
  return page.evaluateHandle(async (bedAt) => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const { BedAnchor, Interactable } = await load<Components>('/src/core/components.ts');
    const hands = await load<Hands>('/src/hands/index.ts');
    const render = await load<Render>('/src/render/index.ts');
    const ui = await load<Ui>('/src/ui/index.ts');
    const { world } = (window as unknown as DevPage).FRAMEWORK_MCP_RUNTIME;
    if (!world.hasSystem(render.SeedSystem)) throw new Error('src/app.ts did not register SeedSystem');
    const captions = world.getSystem(ui.CaptionSystem)!;

    const heard: Heard[] = [];
    const note = (name: string, hand: Hand, more: Partial<Heard> = {}) =>
      heard.push({ name, hand, id: null, gesture: null, cell: null, ...more, atMs: core.clock.now() });
    core.bus.on('gesture:palmUp', (e) => note('gesture:palmUp', e.hand));
    core.bus.on('gesture:trackingLost', (e) => note('gesture:trackingLost', e.hand));
    core.bus.on('gesture:pinchStart', (e) =>
      note('gesture:pinchStart', e.hand, { id: e.target?.id ?? null }),
    );
    core.bus.on('gesture:release', (e) =>
      note('gesture:release', e.hand, {
        id: e.target?.id ?? null,
        gesture: e.gesture,
        cell: e.cell === null ? null : { ring: e.cell.ring, step: e.cell.step },
      }),
    );
    const samples: Probe['samples'] = [];
    core.bus.on('perf:sample', (s) => samples.push({ draws: s.draws, tris: s.tris }));

    const bed = world.createTransformEntity();
    bed.object3D!.position.set(bedAt.x, bedAt.y, bedAt.z);
    bed.object3D!.updateMatrixWorld(true);
    bed.addComponent(BedAnchor);

    const targets = world.queryManager.registerQuery({ required: [Interactable] }).entities;
    const states = world.queryManager.registerQuery({ required: [hands.HandState] }).entities;
    const stateOf = (hand: Hand) => [...states].find((e) => e.getValue(hands.HandState, 'hand') === hand)!;
    const vec = (view: ArrayLike<number>): Vec3 => ({ x: view[0]!, y: view[1]!, z: view[2]! });
    const seedOf = (id: string) => ({ id, voice: 'pad' as const, hue: 0.3, receivedAt: 0 });
    const probe: Probe = {
      heard,
      samples,
      captions,
      seedTarget() {
        const seed = [...targets].find((e) => e.getValue(Interactable, 'kind') === 'seed');
        if (seed === undefined) return null;
        return {
          id: seed.getValue(Interactable, 'id') ?? '',
          radius: seed.getValue(Interactable, 'radius') ?? 0,
          at: vec(seed.getVectorView(Interactable, 'worldPos')),
        };
      },
      hand(hand) {
        const state = stateOf(hand);
        return {
          tracked: state.getValue(hands.HandState, 'tracked') === true,
          palmUp: state.getVectorView(hands.HandState, 'palmNormal')[1]!,
          palmPos: vec(state.getVectorView(hands.HandState, 'palmPos')),
          pinchPos: vec(state.getVectorView(hands.HandState, 'pinchPos')),
        };
      },
      garden(seeds, plants, added) {
        const state = {
          version: 1 as const,
          bedInner: 0.12 as const,
          bedOuter: 0.3 as const,
          bedHeightOffset: 0,
          plants: plants.map(({ id, ring, step }) => ({
            id,
            voice: 'pad' as const,
            cell: { ring, step },
            height: 0.55,
            hue: 0.3,
            plantedAt: 0,
          })),
          seeds: seeds.map(seedOf),
          lastSeedDate: '2026-10-13',
          createdAt: 0,
          lastVisitAt: 0,
          visits: 1,
          codex: { discovered: [] },
          settings: core.settings.get(),
        };
        core.bus.emit('garden:changed', { state, diff: { added, removed: [], changed: [] } });
      },
      seedOut: (id, hand) => core.bus.emit('garden:seedOut', { seed: seedOf(id), hand }),
      seedBack: (seedId, reason) => core.bus.emit('garden:seedBack', { seedId, reason }),
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
    };
    return probe;
  }, BED);
}

/** Resolves when the page has heard `count` events of that name for that hand (and that id, if given). */
async function heard(probe: JSHandle<Probe>, name: string, hand: Hand, count = 1, id?: string) {
  const handle = await probe.evaluateHandle(
    (p, [name, hand, count, id]) =>
      new Promise<Heard>((done) => {
        const look = () => {
          const found = p.heard.filter(
            (e) => e.name === name && e.hand === hand && (id === undefined || e.id === id),
          );
          if (found.length >= count) done(found[count - 1]!);
          else requestAnimationFrame(look);
        };
        look();
      }),
    [name, hand, count, id] as const,
  );
  return handle.jsonValue();
}

/** The next `perf:sample`: the draw calls and triangles of one frame. */
const nextSample = (probe: JSHandle<Probe>) =>
  probe.evaluate(
    (p) =>
      new Promise<{ draws: number; tris: number }>((done) => {
        const had = p.samples.length;
        const look = () => {
          if (p.samples.length > had) done(p.samples[p.samples.length - 1]!);
          else requestAnimationFrame(look);
        };
        look();
      }),
  );

/** The emulated hands: where a root is put, and the right hand's pinch that does not move its pinch point. */
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
  // From the right hand's root to its pinch point, open and closed (it jumps 7.7 cm as it closes; 15-shaping).
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
    /** The emulated head looks down by `pitch` degrees: for the screenshots, at the table. */
    lookDown: (pitch: number) =>
      together([['set_transform', { device: 'headset', orientation: { yaw: 0, pitch: -pitch, roll: 0 } }]]),
    /** The open right hand comes to rest with its pinch point at `pos`, and closes there without moving it. */
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
    /** The right hand is taken out of tracking, or given back. */
    connectRight: (connected: boolean) => together([['set_connected', { device: 'hand-right', connected }]]),
  };
}

test('T-127 a seed rests on the palm, is pinched by the other hand, rides it to a cell; planted, full, lost', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  await enterXR(page);
  const probe = await probeSeeds(page);
  await xrFrames(page, 3);
  const hands = await emulatedHands(page, probe);

  // The left palm turned up and held: it asks for a seed every PALM_UP_HOLD_MS (the re-arm). No garden answers.
  await hands.putLeft(PALM_UP);
  const first = await heard(probe, 'gesture:palmUp', 'left');
  const third = await heard(probe, 'gesture:palmUp', 'left', 3);
  expect(await probe.evaluate((p) => p.hand('left').palmUp)).toBeGreaterThan(Math.cos((35 * Math.PI) / 180));
  // 2 ms of slack: the machine counts on the frame time in whole ms; the page notes the wall clock.
  expect(third.atMs - first.atMs).toBeGreaterThanOrEqual(2 * PALM_UP_HOLD_MS - 2);
  console.log(
    `T-127 the held palm asked again after ${(third.atMs - first.atMs) / 2} ms on average (emulator)`,
  );

  // The supply: three seeds in the orb, one draw call per view.
  const before = await nextSample(probe);
  await probe.evaluate((p) => p.garden(['s1', 's2', 's3'], [], []));
  const withOrb = await nextSample(probe);
  const views = withOrb.draws - before.draws;
  expect(views).toBeGreaterThan(0);
  expect(views).toBeLessThanOrEqual(2);
  expect(withOrb.tris - before.tris).toBe(views * 5 * 80); // five places of 80 triangles, the empty ones sized 0
  console.log(
    `T-127 orb: draws ${before.draws} -> ${withOrb.draws}, triangles ${before.tris} -> ${withOrb.tris} (emulator, perf:sample)`,
  );

  // Out on the left palm: a seed target with the hit radius, resting where the palm is.
  await probe.evaluate((p) => p.seedOut('s1', 'left'));
  await xrFrames(page, 30); // past the 300 ms glide
  const resting = await probe.evaluate((p) => ({ seed: p.seedTarget(), palm: p.hand('left').palmPos }));
  expect(resting.seed?.id).toBe('s1');
  expect(resting.seed!.radius).toBeCloseTo(HIT_RADIUS_M, 6); // a Float32 field
  expect(distance(resting.seed!.at, resting.palm)).toBeLessThan(0.001);
  await hands.lookDown(55); // the emulated head stands at 1.6 m: the table is 55 to 65 degrees below it
  await xrFrames(page, 3);
  await page.screenshot({ path: test.info().outputPath('seed-on-palm.png') });

  // The right hand's real pinch takes it: the app's HandSystem picks SeedSystem's target.
  const off = await hands.pinchAt(resting.seed!.at);
  expect(off, 'the open right hand at the seed').toBeLessThan(HIT_RADIUS_M / 4);
  expect(await heard(probe, 'gesture:pinchStart', 'right', 1, 's1')).toMatchObject({ id: 's1' });
  await xrFrames(page, 12); // past the 100 ms hop
  const taken = await probe.evaluate((p) => ({ seed: p.seedTarget()!.at, pinch: p.hand('right').pinchPos }));
  expect(distance(taken.seed, taken.pinch)).toBeLessThan(0.001);

  // Carried over a cell and let go: the release names the seed and the cell; the seed rode the pinch point.
  const over = cellPoint(TARGET_CELL);
  const carried = await hands.carryTo(over);
  const riding = await probe.evaluate((p) => p.seedTarget()!.at);
  expect(distance(riding, carried)).toBeLessThan(0.001);
  await page.screenshot({ path: test.info().outputPath('seed-carried.png') });
  await hands.releaseAt(over);
  expect(await heard(probe, 'gesture:release', 'right', 1, 's1')).toMatchObject({
    gesture: 'carry',
    cell: TARGET_CELL,
  });

  // The garden plants it: the seed and its target go; two wait in the orb.
  await probe.evaluate((p, cell) => p.garden(['s2', 's3'], [{ id: 's1', ...cell }], ['s1']), TARGET_CELL);
  await xrFrames(page, 2);
  expect(await probe.evaluate((p) => p.seedTarget())).toBeNull();

  // The next one, sent back as the garden does after a release over a full bed: back to the orb, and "Garden is
  // full" on screen. A stand-in: this bed holds one plant and no release comes first. The whole flow, with a
  // full bed and the app's own garden, is proven in T-128d.
  await probe.evaluate((p) => p.seedOut('s2', 'left'));
  await xrFrames(page, 3);
  expect(await probe.evaluate((p) => p.seedTarget()?.id)).toBe('s2');
  await probe.evaluate((p) => p.seedBack('s2', 'full'));
  await page.waitForFunction((p) => p.captions.shown === 'gardenFull', probe);
  expect(await probe.evaluate((p) => p.seedTarget())).toBeNull();

  // Out again, pinched by the right hand, which is then taken away: once its grace runs out (gesture:trackingLost)
  // the garden would send the seed back with 'lost', and the test does. A seed only resting on a palm has no
  // carrier, and the garden leaves it out (SeedSystem.test.ts).
  await probe.evaluate((p) => p.seedOut('s2', 'left'));
  // Aimed at the palm it glides to: the right hand takes longer to settle there than the 300 ms glide.
  const palm = await probe.evaluate((p) => p.hand('left').palmPos);
  expect(await hands.pinchAt(palm), 'the open right hand at the seed').toBeLessThan(HIT_RADIUS_M / 4);
  expect(await heard(probe, 'gesture:pinchStart', 'right', 1, 's2')).toMatchObject({ id: 's2' });
  await hands.connectRight(false);
  await heard(probe, 'gesture:trackingLost', 'right');
  await probe.evaluate((p) => p.seedBack('s2', 'lost'));
  await xrFrames(page, 1);
  expect(await probe.evaluate((p) => p.seedTarget())).toBeNull();
  await hands.connectRight(true);

  expect(errors).toEqual([]);
  expect(offHost).toEqual([]); // Golden Rule 9
});
