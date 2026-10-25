/// <reference types="webxr" />
// TC-E2E-03, the first loop by the emulator's own hands (LLD §3.5 d3; T-127 and T-128d): all of it is the app's.
// RoomSystem places the bed on the `table` fixture, GardenSystem issues the three starter seeds at the visit,
// the left palm turned up is given a seed (the re-arm asks again while it stays up), SeedSystem draws it there
// with its target, the right hand's real pinch takes it, carries it over a cell and lets go; the garden plants it,
// BedRenderSystem draws it with its target, and GardenAudioSystem has the tide play it: its first note. After
// three plants the tide starts at least three notes in a bar. The edges: a release off the bed sends the seed
// home; one over a full bed (autoplant=80) says "Garden full. Remove a plant first."; a carrying hand lost past its grace sends it
// home. The test emits nothing; it moves the emulated hands and reads.
// Emulator result (E): it says nothing of a real hand: whether a seed reads as lying on a palm, whether it can be
// found and pinched, whether the orb is seen, how the first note sounds.
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { HIT_RADIUS_M, PALM_UP_HOLD_MS } from '../../src/hands/config';

import { enterXR, openApp, readRoom, xrFrames } from './support/iwer';

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Garden = typeof import('../../src/garden/index');
type Hands = typeof import('../../src/hands/index');
type RoomModule = typeof import('../../src/room/index');
type Ui = typeof import('../../src/ui/index');
type Hand = 'left' | 'right';
type Vec3 = { x: number; y: number; z: number };
type Cell = { ring: number; step: number };

interface Heard {
  name: string;
  hand: Hand | null;
  id: string | null;
  gesture: string | null;
  cell: Cell | null;
  reason: string | null;
  atMs: number;
}
interface Probe {
  heard: Heard[];
  captions: InstanceType<Ui['CaptionSystem']>;
  /** The page time of the Enter click, and of the first frame after which a note had been started. */
  enterAtMs: number;
  firstNoteAtMs: number;
  /** The seed's target as hands sees it, or null when no entity carries a seed Interactable. */
  seedTarget(): { id: string; radius: number; at: Vec3 } | null;
  /** The plant targets: id and where hands reads them. */
  plantTargets(): { id: string; at: Vec3 }[];
  /** A hand's state as HandSystem wrote it this frame. */
  hand(hand: Hand): { tracked: boolean; palmUp: number; palmPos: Vec3; pinchPos: Vec3 };
  /** A cell's centre on the placed bed, in world space. */
  cellAt(cell: Cell): Vec3;
  /** The garden as the app holds it. */
  plants(): { id: string; cell: Cell }[];
  seeds(): string[];
  triggers(): number;
  /** Resolves with `engine.stats.triggers` the next time the tide reaches `step`. */
  atStep(step: number): Promise<number>;
  /** Resolves when the right hand's pinch point has stopped moving (it is filtered, FR-HND-03). */
  atRest(): Promise<Vec3>;
}
interface DevPage {
  IWER_DEVICE: { remote: { dispatch(method: string, params?: object): Promise<unknown> } };
}

const PALM_DOWN = { roll: 0, pitch: 0, yaw: 0 };
const PALM_UP = { roll: 180, pitch: 0, yaw: 0 }; // turned about its length (the palm-up hand path: roll -180)
const LEFT_ROOT: Vec3 = { x: -0.2, y: 0.95, z: -0.3 };
const RING = 2; // the middle ring
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** Listens on the app's own bus and reads its objects. Made before Enter, so the session's events are heard. */
async function probeLoop(page: Page): Promise<JSHandle<Probe>> {
  const enter = page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
  await expect(enter).toBeEnabled({ timeout: 15_000 });
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const { Interactable } = await load<Components>('/src/core/components.ts');
    const gardenModule = await load<Garden>('/src/garden/index.ts');
    const hands = await load<Hands>('/src/hands/index.ts');
    const room = await load<RoomModule>('/src/room/index.ts');
    const ui = await load<Ui>('/src/ui/index.ts');
    const { world, engine, garden } = window.__roomsong!;
    const bed = world.getSystem(room.RoomSystem)!.bed.object3D!;
    const captions = world.getSystem(ui.CaptionSystem)!;

    const heard: Heard[] = [];
    const note = (name: string, more: Partial<Heard> = {}) =>
      heard.push({
        name,
        hand: null,
        id: null,
        gesture: null,
        cell: null,
        reason: null,
        ...more,
        atMs: performance.now(),
      });
    const copy = (cell: Cell | null) => (cell === null ? null : { ring: cell.ring, step: cell.step });
    core.bus.on('room:signature', () => note('room:signature'));
    core.bus.on('garden:seedArrived', (e) => note('garden:seedArrived', { id: e.seed.id }));
    core.bus.on('gesture:palmUp', (e) => note('gesture:palmUp', { hand: e.hand }));
    core.bus.on('gesture:trackingLost', (e) => note('gesture:trackingLost', { hand: e.hand }));
    core.bus.on('gesture:pinchStart', (e) =>
      note('gesture:pinchStart', { hand: e.hand, id: e.target?.id ?? null }),
    );
    core.bus.on('gesture:release', (e) =>
      note('gesture:release', {
        hand: e.hand,
        id: e.target?.id ?? null,
        gesture: e.gesture,
        cell: copy(e.cell),
      }),
    );
    core.bus.on('garden:seedOut', (e) => note('garden:seedOut', { hand: e.hand, id: e.seed.id }));
    core.bus.on('garden:seedBack', (e) => note('garden:seedBack', { id: e.seedId, reason: e.reason }));
    core.bus.on('garden:changed', (e) => {
      for (const id of e.diff.added) note('planted', { id });
    });
    const enterButton = document.querySelector('main button');
    enterButton?.addEventListener('click', () => (probe.enterAtMs = performance.now()), { capture: true });
    const update = world.update.bind(world);
    world.update = (delta, time) => {
      update(delta, time);
      if (probe.firstNoteAtMs === 0 && engine.stats.triggers > 0) probe.firstNoteAtMs = performance.now();
    };

    const targets = world.queryManager.registerQuery({ required: [Interactable] }).entities;
    const states = world.queryManager.registerQuery({ required: [hands.HandState] }).entities;
    const stateOf = (hand: Hand) => [...states].find((e) => e.getValue(hands.HandState, 'hand') === hand)!;
    const vec = (view: ArrayLike<number>): Vec3 => ({ x: view[0]!, y: view[1]!, z: view[2]! });
    const ofKind = (kind: string) => [...targets].filter((e) => e.getValue(Interactable, 'kind') === kind);
    const probe: Probe = {
      heard,
      captions,
      enterAtMs: 0,
      firstNoteAtMs: 0,
      seedTarget() {
        const seed = ofKind('seed')[0];
        if (seed === undefined) return null;
        return {
          id: seed.getValue(Interactable, 'id') ?? '',
          radius: seed.getValue(Interactable, 'radius') ?? 0,
          at: vec(seed.getVectorView(Interactable, 'worldPos')),
        };
      },
      plantTargets: () =>
        ofKind('plant').map((e) => ({
          id: e.getValue(Interactable, 'id') ?? '',
          at: vec(e.getVectorView(Interactable, 'worldPos')),
        })),
      hand(hand) {
        const state = stateOf(hand);
        return {
          tracked: state.getValue(hands.HandState, 'tracked') === true,
          palmUp: state.getVectorView(hands.HandState, 'palmNormal')[1]!,
          palmPos: vec(state.getVectorView(hands.HandState, 'palmPos')),
          pinchPos: vec(state.getVectorView(hands.HandState, 'pinchPos')),
        };
      },
      cellAt(cell) {
        // Bed-local (x, 0, y) into the world (D-029): the bed's matrix, column-major.
        const c = gardenModule.cellCentre(cell, { x: 0, y: 0 });
        const e = bed.matrixWorld.elements;
        return {
          x: e[0] * c.x + e[8] * c.y + e[12],
          y: e[1] * c.x + e[9] * c.y + e[13],
          z: e[2] * c.x + e[10] * c.y + e[14],
        };
      },
      plants: () => garden.state!.plants.map((p) => ({ id: p.id, cell: { ...p.cell } })),
      seeds: () => garden.state!.seeds.map((s) => s.id),
      triggers: () => engine.stats.triggers,
      atStep: (step) =>
        new Promise((done) => {
          let wasThere = engine.clock.stepIndex() === step;
          const timer = setInterval(() => {
            const isThere = engine.clock.stepIndex() === step;
            if (isThere && !wasThere) {
              clearInterval(timer);
              done(engine.stats.triggers);
            }
            wasThere = isThere;
          }, 5);
        }),
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
  });
}

/** Resolves when the page has heard `count` events of that name (for that hand and that id, if given). */
async function heard(
  probe: JSHandle<Probe>,
  name: string,
  { hand, id, count = 1 }: { hand?: Hand; id?: string; count?: number } = {},
): Promise<Heard> {
  const handle = await probe.evaluateHandle(
    (p, [name, hand, id, count]) =>
      new Promise<Heard>((done) => {
        const look = () => {
          const found = p.heard.filter(
            (e) => e.name === name && (hand === null || e.hand === hand) && (id === null || e.id === id),
          );
          if (found.length >= count) done(found[count - 1]!);
          else setTimeout(look, 10);
        };
        look();
      }),
    [name, hand ?? null, id ?? null, count] as const,
  );
  return handle.jsonValue();
}

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
  // Measured beside the bed, over nothing: a release there is a pinch on nothing.
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

type EmulatedHands = Awaited<ReturnType<typeof emulatedHands>>;

/** Where the out seed's target is and where the left palm is, or null while no seed is out. */
const seedAndPalm = (probe: JSHandle<Probe>) =>
  probe.evaluate((p) => {
    const seed = p.seedTarget();
    return seed === null
      ? null
      : { id: seed.id, radius: seed.radius, at: seed.at, palm: p.hand('left').palmPos };
  });

/**
 * The `count`-th seed out on the left palm: once it rests there (its 300 ms glide), the right hand pinches it,
 * carries it to `to` and lets go. Returns its id and the release the hands reported.
 */
async function carry(page: Page, probe: JSHandle<Probe>, hands: EmulatedHands, to: Vec3, count: number) {
  const out = await heard(probe, 'garden:seedOut', { hand: 'left', count });
  await expect
    .poll(async () => {
      const now = await seedAndPalm(probe);
      return now?.id === out.id ? distance(now.at, now.palm) : Infinity;
    })
    .toBeLessThan(0.001);
  const resting = (await seedAndPalm(probe))!;
  expect(resting.radius).toBeCloseTo(HIT_RADIUS_M, 6); // a Float32 field
  expect(await hands.pinchAt(resting.at), 'the open right hand at the seed').toBeLessThan(HIT_RADIUS_M / 4);
  await heard(probe, 'gesture:pinchStart', { hand: 'right', id: out.id! });
  await xrFrames(page, 12); // past the 100 ms hop to the pinch point
  const carried = await hands.carryTo(to);
  expect(distance((await seedAndPalm(probe))!.at, carried), 'the seed rides the pinch point').toBeLessThan(
    0.001,
  );
  await hands.releaseAt(to);
  const release = await heard(probe, 'gesture:release', { hand: 'right', id: out.id! });
  return { id: out.id!, release };
}

/** Three cells of the middle ring nearest the user (the head looks down -z): the easiest reach. */
async function nearCells(probe: JSHandle<Probe>): Promise<Cell[]> {
  const cells = Array.from({ length: 16 }, (_, step) => ({ ring: RING, step }));
  const at = await probe.evaluate((p, cells) => cells.map((cell) => p.cellAt(cell).z), cells);
  return cells
    .map((cell, i) => ({ cell, z: at[i]! }))
    .sort((a, b) => b.z - a.z)
    .slice(0, 3)
    .map(({ cell }) => cell);
}

test('TC-E2E-03: palm up, a seed, a pinch, a carry, a release over a cell: a plant, and its first note', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  const probe = await probeLoop(page);
  await enterXR(page);
  // The visit of a new garden issues the three starter seeds (the room is read in the frame the bed lands).
  await heard(probe, 'garden:seedArrived', { count: 3 });
  const hands = await emulatedHands(page, probe);

  // The left palm turned up and held: a seed comes to it, and the palm asks again every PALM_UP_HOLD_MS.
  await hands.putLeft(PALM_UP);
  const first = await heard(probe, 'gesture:palmUp', { hand: 'left' });
  const third = await heard(probe, 'gesture:palmUp', { hand: 'left', count: 3 });
  expect(await probe.evaluate((p) => p.hand('left').palmUp)).toBeGreaterThan(Math.cos((35 * Math.PI) / 180));
  expect(third.atMs - first.atMs).toBeGreaterThanOrEqual(2 * PALM_UP_HOLD_MS - 20); // page time, frame-bound
  await hands.lookDown(55); // the emulated head stands at 1.6 m: the table is 55 to 65 degrees below it
  await xrFrames(page, 30);
  await page.screenshot({ path: test.info().outputPath('seed-on-palm.png') });

  // The first seed, carried to the nearest cell of the middle ring: planted there, with its own target.
  const [cellA, cellB, cellC] = await nearCells(probe);
  const a = await carry(page, probe, hands, await probe.evaluate((p, c) => p.cellAt(c), cellA!), 1);
  expect(a.release).toMatchObject({ gesture: 'carry', cell: cellA });
  await heard(probe, 'planted', { id: a.id });
  expect(await probe.evaluate((p) => p.plants())).toEqual([{ id: a.id, cell: cellA }]);
  expect(await probe.evaluate((p) => p.seeds())).not.toContain(a.id);
  await expect.poll(() => probe.evaluate((p) => p.plantTargets().map((t) => t.id))).toEqual([a.id]);
  const target = (await probe.evaluate((p) => p.plantTargets()))[0]!;
  expect(distance(target.at, await probe.evaluate((p, c) => p.cellAt(c), cellA!))).toBeLessThan(1e-4);
  await page.screenshot({ path: test.info().outputPath('first-plant.png') });

  // Its first note: when the tide next reaches its step, at most a bar later.
  const before = await probe.evaluate((p) => p.triggers());
  await probe.evaluate((p, step) => p.atStep((step + 2) % 16), cellA!.step);
  expect(await probe.evaluate((p) => p.triggers())).toBeGreaterThan(before);
  const firstSound = await probe.evaluate((p) => p.firstNoteAtMs - p.enterAtMs);

  // Two more, from the palm still held up: then the tide starts at least three notes in every bar.
  const b = await carry(page, probe, hands, await probe.evaluate((p, c) => p.cellAt(c), cellB!), 2);
  await heard(probe, 'planted', { id: b.id });
  const c = await carry(page, probe, hands, await probe.evaluate((p, c) => p.cellAt(c), cellC!), 3);
  await heard(probe, 'planted', { id: c.id });
  expect((await probe.evaluate((p) => p.plants())).map((plant) => plant.cell)).toEqual([cellA, cellB, cellC]);
  const atBar = await probe.evaluate((p) => p.atStep(0));
  const nextBar = await probe.evaluate((p) => p.atStep(0));
  expect(nextBar - atBar).toBeGreaterThanOrEqual(3);
  console.log(
    `T-128d d3 TC-E2E-03 (emulator, table room, emulated hands at test speed): Enter to the first note of the ` +
      `first planted seed ${Math.round(firstSound)} ms; cells ${JSON.stringify([cellA, cellB, cellC])}; ` +
      `${nextBar - atBar} notes in a bar of three plants`,
  );
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]); // Golden Rule 9
});

test('TC-E2E-03, the edges: off the bed the seed goes home; over a full bed "Garden full. Remove a plant first."; a lost hand drops it', async ({
  page,
}) => {
  const errors = watch(page);
  await openApp(page, readRoom('table'), '/?flags=autoplant=80');
  const probe = await probeLoop(page);
  await enterXR(page);
  await heard(probe, 'garden:seedArrived', { count: 3 });
  const hands = await emulatedHands(page, probe);
  await hands.putLeft(PALM_UP);

  // Let go beside the bed: back to the supply (and a bump, engine.ui, which is silent until T-164).
  const beside = { x: 0.3, y: 1.0, z: -0.25 }; // where the hands were measured: over nothing
  const off = await carry(page, probe, hands, beside, 1);
  expect(off.release).toMatchObject({ gesture: 'carry', cell: null });
  expect(await heard(probe, 'garden:seedBack', { id: off.id })).toMatchObject({ reason: 'offBed' });
  // Home, and first in the supply again: the palm still held up is given that same seed once more.
  expect((await heard(probe, 'garden:seedOut', { hand: 'left', count: 2 })).id).toBe(off.id);
  expect(await probe.evaluate((p) => p.plants().length)).toBe(80); // nothing was planted

  // Over the bed, but every cell holds a plant: back home, and "Garden full. Remove a plant first." on screen.
  const over = await probe.evaluate((p, ring) => p.cellAt({ ring, step: 4 }), RING);
  const full = await carry(page, probe, hands, over, 2);
  expect(await heard(probe, 'garden:seedBack', { id: full.id, count: 2 })).toMatchObject({ reason: 'full' });
  await page.waitForFunction((p) => p.captions.shown === 'gardenFull', probe);

  // Pinched off the palm, and the carrying hand taken out of tracking: once its grace runs out, home.
  const out = await heard(probe, 'garden:seedOut', { hand: 'left', count: 3 });
  await expect
    .poll(async () => {
      const now = await seedAndPalm(probe);
      return now?.id === out.id ? distance(now.at, now.palm) : Infinity;
    })
    .toBeLessThan(0.001);
  expect(await hands.pinchAt((await seedAndPalm(probe))!.at)).toBeLessThan(HIT_RADIUS_M / 4);
  await heard(probe, 'gesture:pinchStart', { hand: 'right', id: out.id! });
  await hands.connectRight(false);
  await heard(probe, 'gesture:trackingLost', { hand: 'right' });
  expect(await heard(probe, 'garden:seedBack', { id: out.id!, count: 3 })).toMatchObject({ reason: 'lost' });
  await hands.connectRight(true);
  expect(await probe.evaluate((p) => p.plants().length)).toBe(80);
  expect(errors).toEqual([]);
});
