/// <reference types="webxr" />
// T-146, the shaping gestures on IWER's emulated hand (FR-HND-08/10/15, the hands part of TC-E2E-16): the app's
// own HandSystem pinches a plant, and the pinch becomes a pull or a drag by where the hand goes. A plant pulled
// up is released as a `pull` with its travel; dragged along the bed it hovers a cell and is released as a `drag`
// with that cell; a hand taken away mid-drag is reverted after the grace with no release.
// The plant and the bed are stand-ins the test adds: an Interactable and a BedAnchor like the ones the wiring
// will attach (API_SPEC §1.10 rules 5 and 7). Nothing draws the plant or the garden here, and no garden holds it:
// what the garden does with these releases is tests/unit/hands/shaping.test.ts, and the whole flow with the app's
// own bed and plants is TC-E2E-04 (T-128d).
// The emulated hand: IWER's hand is rigid but for the pinch, and its pinch point jumps 7.7 cm when it closes or
// opens. The app filters the pinch point at 1 Hz (FR-HND-03), so that jump would drift it out of the 2 cm dead
// zone over the next half second and decide a pull or a drag nobody made. So the hand is moved by the jump in
// the very frame it closes or opens (both commands are queued before that frame, not one after the other as
// 12-settings.spec.ts does): the pinch point stays where it was, as a real one nearly does.
// Emulator result (E): it says nothing about a real hand: whether 2 cm is the right dead zone, whether a pull is
// taken for a drag, or how tracking is lost.
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { DRAG_DEAD_ZONE_M, HIT_RADIUS_M, TRACKING_GRACE_MS } from '../../src/hands/config';

import { enterXR, openApp, readRoom, xrFrames } from './support/iwer';

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Hands = typeof import('../../src/hands/index');
type Render = typeof import('../../src/render/index');
type Ui = typeof import('../../src/ui/index');
type Hand = 'left' | 'right';
type Vec3 = { x: number; y: number; z: number };
type Cell = { ring: number; step: number };

/** One event of hands/, as the page saw it. Fields an event does not have are null. */
interface Heard {
  name: string;
  hand: Hand;
  /** `hands:lost.held` or the `target` of a pinch start or a release: its id, or null. */
  id: string | null;
  gesture: string | null;
  zone: string | null;
  cell: Cell | null;
  dy: number | null;
  /** Core's wall clock, ms. */
  atMs: number;
}
interface Probe {
  heard: Heard[];
  /** The previews of the right hand: how many, and what the latest one said. */
  previews: { pulls: number; dy: number; drags: number; zone: string };
  /** The latest `target:hover` of the right hand. */
  hover: { id: string | null; cell: Cell | null };
  /** Resolves when the right hand's pinch point has stopped moving (it is filtered, FR-HND-03). */
  atRest(): Promise<Vec3>;
}
/** IWSDK 1.0.1 puts its dev runtime on the page in a dev build; the app's world is a field of it. */
interface DevPage {
  FRAMEWORK_MCP_RUNTIME: { world: import('@iwsdk/core').World };
  IWER_DEVICE: { remote: { dispatch(method: string, params?: object): Promise<unknown> } };
}

const PLANT_ID = 'plant-e2e';
const PALM_DOWN = { roll: 0, pitch: 0, yaw: 0 }; // an emulated hand's orientation, in degrees
// The stand-in bed lies flat, its centre 0.45 m ahead of the user at the fixture table's height.
const BED: Vec3 = { x: 0, y: 0.74, z: -0.45 };
/** The world point of a cell's centre on that bed (FR-MUS-01: rings from 0.12 m, 4.5 cm apart; 16 steps, D-029). */
function cellPoint({ ring, step }: Cell, upM = 0): Vec3 {
  const radius = 0.12 + ring * 0.045;
  const rad = (step * Math.PI) / 8;
  return { x: BED.x + radius * Math.cos(rad), y: BED.y + upM, z: BED.z + radius * Math.sin(rad) };
}
const HOME: Cell = { ring: 2, step: 0 }; // where the plant stands
const AWAY: Cell = { ring: 2, step: 2 }; // 16 cm along the ring
const PULL_M = 0.08;

/** Console errors and page errors from now on. */
function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** Listens to hands/ on the app's own bus, and adds the bed and the plant. */
function probeHands(page: Page): Promise<JSHandle<Probe>> {
  return page.evaluateHandle(
    async ([plantId, bedAt, plantAt, radius]) => {
      const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
      const core = await load<Core>('/src/core/index.ts');
      const { BedAnchor, Interactable } = await load<Components>('/src/core/components.ts');
      const hands = await load<Hands>('/src/hands/index.ts');
      const { world } = (window as unknown as DevPage).FRAMEWORK_MCP_RUNTIME;
      if (!world.hasSystem(hands.HandSystem)) throw new Error('src/app.ts did not register HandSystem');

      const heard: Heard[] = [];
      const none = { gesture: null, zone: null, cell: null, dy: null };
      const note = (name: string, hand: Hand, id: string | null, more: Partial<Heard> = {}) =>
        heard.push({ name, hand, id, ...none, ...more, atMs: core.clock.now() });
      core.bus.on('gesture:pinchStart', (e) => note('gesture:pinchStart', e.hand, e.target?.id ?? null));
      core.bus.on('gesture:release', (e) =>
        note('gesture:release', e.hand, e.target?.id ?? null, {
          gesture: e.gesture,
          zone: e.zone,
          cell: e.cell === null ? null : { ring: e.cell.ring, step: e.cell.step },
          dy: e.dy,
        }),
      );
      core.bus.on('hands:lost', (e) => note('hands:lost', e.hand, e.held?.id ?? null));
      core.bus.on('hands:found', (e) => note('hands:found', e.hand, null));
      core.bus.on('gesture:trackingLost', (e) => note('gesture:trackingLost', e.hand, null));
      const previews: Probe['previews'] = { pulls: 0, dy: 0, drags: 0, zone: '' };
      core.bus.on('gesture:pull', (e) => {
        if (e.hand !== 'right') return;
        previews.pulls++;
        previews.dy = e.dy;
      });
      core.bus.on('gesture:drag', (e) => {
        if (e.hand !== 'right') return;
        previews.drags++;
        previews.zone = e.zone;
      });
      const hover: Probe['hover'] = { id: null, cell: null };
      core.bus.on('target:hover', (e) => {
        if (e.hand !== 'right') return;
        hover.id = e.target?.id ?? null;
        hover.cell = e.cell === null ? null : { ring: e.cell.ring, step: e.cell.step };
      });

      // The bed: its pose is the entity's own transform, set before the component tells the hand system of it.
      const bed = world.createTransformEntity();
      bed.object3D!.position.set(bedAt.x, bedAt.y, bedAt.z);
      bed.object3D!.updateMatrixWorld(true);
      bed.addComponent(BedAnchor);
      // The plant's target: its foot at its cell centre, with the hit radius (API_SPEC §1.10 rule 7).
      const plant = world.createEntity().addComponent(Interactable, { kind: 'plant', id: plantId, radius });
      plant.getVectorView(Interactable, 'worldPos').set([plantAt.x, plantAt.y, plantAt.z]);

      // The right hand's state, as the hand system writes it every frame.
      const states = world.queryManager.registerQuery({ required: [hands.HandState] }).entities;
      const right = [...states].find((entity) => entity.getValue(hands.HandState, 'hand') === 'right');
      if (right === undefined) throw new Error('the hand system has no HandState for the right hand');
      const pinchPos = (): Vec3 | null => {
        if (right.getValue(hands.HandState, 'tracked') !== true) return null;
        const at = right.getVectorView(hands.HandState, 'pinchPos');
        return { x: at[0] ?? 0, y: at[1] ?? 0, z: at[2] ?? 0 };
      };
      const probe: Probe = {
        heard,
        previews,
        hover,
        atRest: () =>
          new Promise((done, fail) => {
            let last: Vec3 | null = null;
            const look = () => {
              const session = world.renderer.xr.getSession();
              if (session === null) return fail(new Error('atRest needs a session'));
              const now = pinchPos();
              const still =
                last !== null &&
                now !== null &&
                Math.hypot(now.x - last.x, now.y - last.y, now.z - last.z) < 0.0002;
              if (now !== null && still) return done(now);
              last = now;
              session.requestAnimationFrame(look);
            };
            look();
          }),
      };
      return probe;
    },
    [PLANT_ID, BED, cellPoint(HOME), HIT_RADIUS_M] as const,
  );
}

/**
 * Resolves when the page has heard `count` events of that name for the right hand that carry `id` (the plant's,
 * or null for the events that name nothing); returns the last of them.
 */
async function heard(
  probe: JSHandle<Probe>,
  name: string,
  count = 1,
  id: string | null = null,
): Promise<Heard> {
  const handle = await probe.evaluateHandle(
    (p, [name, count, id]) =>
      new Promise<Heard>((done) => {
        const look = () => {
          const found = p.heard.filter(
            (each) => each.name === name && each.hand === 'right' && each.id === id,
          );
          if (found.length >= count) done(found[count - 1]!);
          else requestAnimationFrame(look);
        };
        look();
      }),
    [name, count, id] as const,
  );
  return handle.jsonValue();
}
/** The same, for the pinch starts and the releases that name the plant. */
const heardOnPlant = (probe: JSHandle<Probe>, name: string, count = 1) => heard(probe, name, count, PLANT_ID);
/** What the right hand did to the plant so far: the names of its events that carry the plant's id. */
const onPlant = (probe: JSHandle<Probe>) =>
  probe.evaluate(
    (p, id) => p.heard.filter((each) => each.hand === 'right' && each.id === id).map((each) => each.name),
    PLANT_ID,
  );

/** The emulated right hand: where its pinch point is put, and a pinch that does not move it. */
async function rightHand(page: Page, probe: JSHandle<Probe>) {
  /** IWER's queue runs every command it holds in one frame: all of these reach the session together. */
  const together = (commands: [method: string, params: object][]) =>
    page.evaluate(async (commands) => {
      const { remote } = (window as unknown as DevPage).IWER_DEVICE;
      await Promise.all(commands.map(([method, params]) => remote.dispatch(method, params)));
    }, commands);
  const device = 'hand-right';
  const transform = (root: Vec3): [string, object] => [
    'set_transform',
    { device, position: root, orientation: PALM_DOWN },
  ];
  const select = (value: 0 | 1): [string, object] => ['set_select_value', { device, value }];
  const settle = async (): Promise<Vec3> => {
    await xrFrames(page, 2);
    return probe.evaluate((p) => p.atRest());
  };

  // From the hand's root to its pinch point, open and closed: measured once, on a pinch at nothing.
  const root = { x: 0.3, y: 1.1, z: -0.25 };
  const from = (tip: Vec3): Vec3 => ({ x: tip.x - root.x, y: tip.y - root.y, z: tip.z - root.z });
  await together([transform(root)]);
  const open = from(await settle());
  await together([select(1)]);
  const closed = from(await settle());
  await together([select(0)]);
  await settle();
  const jump = Math.hypot(closed.x - open.x, closed.y - open.y, closed.z - open.z);
  console.log(`T-146 the emulated hand's pinch point moves ${(jump * 100).toFixed(1)} cm when it closes`);
  const rootFor = (pos: Vec3, tip: Vec3): Vec3 => ({ x: pos.x - tip.x, y: pos.y - tip.y, z: pos.z - tip.z });

  return {
    /** The open hand comes to rest with its pinch point at `pos`, and closes there without moving it. */
    async pinchAt(pos: Vec3): Promise<void> {
      await together([transform(rootFor(pos, open))]);
      const tip = await settle();
      const off = Math.hypot(tip.x - pos.x, tip.y - pos.y, tip.z - pos.z);
      expect(off, 'the open hand on its target').toBeLessThan(DRAG_DEAD_ZONE_M / 4);
      await together([transform(rootFor(pos, closed)), select(1)]);
    },
    /** The closed hand carries its pinch point to `pos` and comes to rest there. */
    async carryTo(pos: Vec3): Promise<Vec3> {
      await together([transform(rootFor(pos, closed))]);
      return settle();
    },
    /** The hand opens with its pinch point staying at `pos`, where it rests. */
    releaseAt: (pos: Vec3) => together([transform(rootFor(pos, open)), select(0)]),
    connect: (connected: boolean) => together([['set_connected', { device, connected }]]),
    open: () => together([select(0)]),
  };
}

test('T-146 a pinched plant pulled up is released as a pull with its travel, and dragged along the bed as a drag with its cell', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  await enterXR(page);
  const probe = await probeHands(page);
  await xrFrames(page, 3);
  const hand = await rightHand(page, probe);
  const home = cellPoint(HOME);

  // The pull. The pinch starts on the plant, and nothing is decided while the hand rests there.
  await hand.pinchAt(home);
  await heardOnPlant(probe, 'gesture:pinchStart');
  await xrFrames(page, 10);
  expect(await probe.evaluate((p) => p.previews)).toMatchObject({ pulls: 0, drags: 0 }); // the dead zone holds
  const up = cellPoint(HOME, PULL_M);
  const pulledTo = await hand.carryTo(up);
  const pulling = await probe.evaluate((p) => ({ previews: { ...p.previews }, hover: { ...p.hover } }));
  expect(pulling.previews.pulls).toBeGreaterThan(0);
  expect(pulling.previews.drags).toBe(0);
  expect(pulling.previews.dy).toBeGreaterThan(PULL_M - 0.01);
  expect(pulling.hover).toEqual({ id: PLANT_ID, cell: null }); // 8 cm away, the pulled plant is still the hover
  await hand.releaseAt(up);
  const pull = await heardOnPlant(probe, 'gesture:release');
  expect(pull).toMatchObject({ gesture: 'pull', zone: 'bed', cell: null });
  expect(pull.dy).toBeGreaterThan(PULL_M - 0.01);
  expect(pull.dy).toBeLessThan(PULL_M + 0.01);
  const pulls = await probe.evaluate((p) => p.previews.pulls);
  console.log(
    `T-146 pull: the hand rose ${(100 * (pulledTo.y - home.y)).toFixed(2)} cm and was released with dy ` +
      `${(100 * (pull.dy ?? 0)).toFixed(2)} cm, after ${pulls} previews (emulator)`,
  );

  // The drag. No garden holds the plant, so it still stands on its cell for the hand system.
  await xrFrames(page, 12); // past the 130 ms lockout after a release (FR-HND-02)
  await hand.pinchAt(home);
  await heardOnPlant(probe, 'gesture:pinchStart', 2);
  await hand.carryTo(cellPoint(AWAY));
  const dragging = await probe.evaluate((p) => ({ previews: { ...p.previews }, hover: { ...p.hover } }));
  expect(dragging.previews.drags).toBeGreaterThan(0);
  expect(dragging.previews.pulls).toBe(pulls); // latched: not one pull since
  expect(dragging.previews.zone).toBe('bed');
  expect(dragging.hover).toEqual({ id: null, cell: AWAY }); // the cell a release would fill, before the release
  await hand.releaseAt(cellPoint(AWAY));
  const drag = await heardOnPlant(probe, 'gesture:release', 2);
  expect(drag).toMatchObject({ gesture: 'drag', zone: 'bed', cell: AWAY, dy: null });
  console.log(
    `T-146 drag: released over ring ${AWAY.ring}, step ${AWAY.step} after ${dragging.previews.drags} previews (emulator)`,
  );

  expect(await onPlant(probe)).toEqual([
    'gesture:pinchStart',
    'gesture:release',
    'gesture:pinchStart',
    'gesture:release',
  ]);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]); // Golden Rule 9
});

test('TC-E2E-16 (the hands part) a hand lost mid-drag: reverted after the grace with no release, and a new pinch works', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  await enterXR(page);
  const probe = await probeHands(page);
  await xrFrames(page, 3);
  const hand = await rightHand(page, probe);
  const home = cellPoint(HOME);

  await hand.pinchAt(home);
  await heardOnPlant(probe, 'gesture:pinchStart');
  await hand.carryTo(cellPoint(AWAY));
  expect(await probe.evaluate((p) => p.hover)).toEqual({ id: null, cell: AWAY });

  // The hand is taken away: hands:lost names the plant it drags.
  await hand.connect(false);
  const lost = await heardOnPlant(probe, 'hands:lost');
  // The grace runs out: reverted, the hover cleared, and nothing was released (so nothing was committed).
  const reverted = await heard(probe, 'gesture:trackingLost');
  // 2 ms of slack: the machine counts the grace on the frame time in whole ms; the page notes the wall clock.
  expect(reverted.atMs - lost.atMs).toBeGreaterThanOrEqual(TRACKING_GRACE_MS - 2);
  expect(await probe.evaluate((p) => p.hover)).toEqual({ id: null, cell: null });
  console.log(
    `T-146 hand removed mid-drag: gesture:trackingLost ${reverted.atMs - lost.atMs} ms after hands:lost (emulator; the grace is ${TRACKING_GRACE_MS} ms)`,
  );

  // The hand is back, still closed: hands:found, and that pinch is over. It opens: still no release.
  await hand.connect(true);
  await heard(probe, 'hands:found');
  await hand.open();
  await xrFrames(page, 12);
  expect(await onPlant(probe)).toEqual(['gesture:pinchStart', 'hands:lost']);

  // A new pinch on the plant works, and its release is the first the plant has had.
  await hand.pinchAt(home);
  await heardOnPlant(probe, 'gesture:pinchStart', 2);
  await xrFrames(page, 4);
  await hand.releaseAt(home);
  expect(await heardOnPlant(probe, 'gesture:release')).toMatchObject({ gesture: 'none' });
  expect(await onPlant(probe)).toEqual([
    'gesture:pinchStart',
    'hands:lost',
    'gesture:pinchStart',
    'gesture:release',
  ]);

  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

// The petal is not wired into the app yet (T-128d), so the test makes one itself, on the app's own world and
// renderer: this is the first time its shader meets a GPU. The counts are the app's own `perf:sample`.
test('T-146 the undo petal is drawn by the app renderer: its draw call while it is up, none after, no shader error', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  await enterXR(page);
  const stage = await page.evaluateHandle(async (bedAt) => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const render = await load<Render>('/src/render/index.ts');
    const { world } = (window as unknown as DevPage).FRAMEWORK_MCP_RUNTIME;
    const samples: { draws: number; tris: number }[] = [];
    core.bus.on('perf:sample', (sample) => samples.push({ draws: sample.draws, tris: sample.tris }));
    const bed = world.createTransformEntity();
    bed.object3D!.position.set(bedAt.x, bedAt.y, bedAt.z);
    // A guard of its own: the page's one is inside src/app.ts, and the flash count is the unit test's.
    const petals = new render.PetalRenderer(bed.object3D!, new render.FlashGuard());
    const session = world.renderer.xr.getSession();
    if (session === null) throw new Error('the petal test needs a session');
    const clock = { nowMs: 0 };
    const tick = (time: number): void => {
      clock.nowMs = time;
      petals.update(time); // what BedRenderSystem will do each frame
      session.requestAnimationFrame(tick);
    };
    session.requestAnimationFrame(tick);
    // The session's own tuning ripple and its captions (T-142; the app's garden tunes the room, T-128d) change
    // what is drawn in its first seconds: the counts are taken after them. Private: the ripple's quads.
    const ui = await load<Ui>('/src/ui/index.ts');
    const captions = world.getSystem(ui.CaptionSystem)!;
    const { ripple } = world.getSystem(render.TuningRippleSystem) as unknown as {
      ripple: { meshes: readonly { visible: boolean }[] };
    };
    const quiet = () => captions.shown === null && !ripple.meshes.some((mesh) => mesh.visible);
    // Every mesh drawn whenever it is visible: one near the edge of the emulated view (the Listen orb, T-148)
    // would drop in and out of the count between two samples.
    world.scene.traverse((object) => void (object.frustumCulled = false));
    return { samples, petals, clock, quiet };
  }, BED);
  await page.waitForFunction((s) => s.quiet(), stage, { timeout: 20_000 });
  /** The first `perf:sample` taken from now on: the draw calls and triangles of one frame. */
  const nextSample = () =>
    stage.evaluate(
      (s) =>
        new Promise<{ draws: number; tris: number }>((done) => {
          const had = s.samples.length;
          const look = () => {
            if (s.samples.length > had) done(s.samples[s.samples.length - 1]!);
            else requestAnimationFrame(look);
          };
          look();
        }),
    );

  const before = await nextSample();
  await stage.evaluate((s) =>
    s.petals.show('p', { cell: { ring: 2, step: 0 }, hue: 0.3 }, s.clock.nowMs + 4000),
  );
  const during = await nextSample();
  await page.waitForFunction((s) => !s.petals.has('p'), stage); // by its own time
  const after = await nextSample();
  console.log(
    `T-146 petal: draws ${before.draws} -> ${during.draws} -> ${after.draws}, ` +
      `triangles ${before.tris} -> ${during.tris} -> ${after.tris} (emulator, perf:sample)`,
  );
  // One draw call per view (the emulated session has two), each with the mesh's 80 instances of 12 triangles:
  // an instance is a cell, and one with no petal has no size.
  const draws = during.draws - before.draws;
  expect(draws).toBeGreaterThan(0);
  expect(draws).toBeLessThanOrEqual(2);
  expect(during.tris - before.tris).toBe(draws * 80 * 12);
  expect(after).toEqual(before); // a mesh with no petal is not drawn at all

  expect(errors).toEqual([]); // a shader that did not compile would be here
  expect(offHost).toEqual([]);
});
