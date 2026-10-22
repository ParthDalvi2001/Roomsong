/// <reference types="webxr" />
// T-128c: room and bed in the real app (LLD §3.5 c1 and c2; the placement half of TC-E2E-02). The page's own
// Enter starts a session; RoomSystem places the bed in the emulator's room, or brings it back from its anchor,
// reads the room once and says both on the bus. The events are read from the app's own bus (the dev server's
// /src/core/index.ts), the bed from `window.__roomsong.world`.
// The app's own GardenSystem answers `room:features` (T-128d). A saved anchor pair comes back from the app's own
// save on the next page load (T-128e).
// Emulator results (E). IWER's planes are not a real room, its hit-test meets only the fixture's planes, and it
// restores every anchor it knows in the next frame: this says nothing about a headset (T-129).
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import {
  enterXR,
  openApp,
  playHandPath,
  readHandPath,
  readRoom,
  WORLD_READY_MS,
  xrFrames,
} from './support/iwer';

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type RoomModule = typeof import('../../src/room/index');
type Ui = typeof import('../../src/ui/index');
type PerfSample = import('../../src/core/index').EventMap['perf:sample'];

/** The part of IWER's XRDevice this spec uses (iwer 2.5.0). */
interface Device {
  activeSession?: XRSession;
  /** Queued until the session's next frame, which then fires the session's `visibilitychange`. */
  updateVisibilityState(state: XRVisibilityState): void;
  remote: { dispatch(method: string, params?: object): Promise<unknown> };
}

/** The bed as the page has it at one moment. */
interface BedNow {
  /** The bed's entity carries BedAnchor. */
  isPlaced: boolean;
  source: string | null;
  isShown: boolean;
  /** The 80 cell markers are drawn: false for the ghost. */
  hasMarkers: boolean;
  /** `bed.object3D.matrixWorld`, column-major. */
  pose: number[];
}
type Heard = { type: string; payload: Record<string, unknown>; frame: number; atMs: number; bed: BedNow };

/** What a test holds in the page. */
interface RoomProbe {
  room: InstanceType<RoomModule['RoomSystem']>;
  /** Every `room:*` and `xr:*` event since the probe was made, with the frame it came in and the bed then. */
  heard: Heard[];
  /** BedAnchor added to or taken off an entity, and Caption likewise, with the frame. */
  anchorLog: { on: boolean; frame: number }[];
  captionLog: { key: string | null; frame: number }[];
  /** `renderer.info.render.calls` of every frame, by frame number. */
  draws: number[];
  /** The height of the bed as drawn, by frame number. */
  bedY: number[];
  /** Of every frame in which `room:bedPlaced` came: all systems' updates, and updates plus render. */
  placedFrames: { frame: number; updateMs: number; scriptMs: number }[];
  /** `RoomSystem.update` since `reset`: how many, and their time together. */
  cost: { frames: number; ms: number };
  samples: (PerfSample & { frame: number })[];
  frame(): number;
  bed(): BedNow;
  /** How many entities carry BedAnchor. */
  anchored(): number;
  /** The key of the caption on screen. */
  shown(): string | null;
  eyes(): number;
  log(): string[];
  /** The confirm by hand, as hands/ sends it for a pinch on nothing, its start and its release (LLD §3.5 c2). */
  release(): void;
}

const device = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { IWER_DEVICE?: Device }).IWER_DEVICE) as Promise<
    JSHandle<Device>
  >;

/** Console errors and page errors from now on. */
function watch(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

/** Waits for the world, then listens in the page. Made before Enter: placement starts with the session's first frame. */
async function watchRoom(page: Page): Promise<JSHandle<RoomProbe>> {
  const enter = page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
  await expect(enter).toBeEnabled({ timeout: WORLD_READY_MS });
  return page.evaluateHandle(async () => {
    const load = (url: string): Promise<unknown> => import(/* @vite-ignore */ url);
    const core = (await load('/src/core/index.ts')) as Core;
    const { BedAnchor, Caption } = (await load('/src/core/components.ts')) as Components;
    const room = (await load('/src/room/index.ts')) as RoomModule;
    const ui = (await load('/src/ui/index.ts')) as Ui;
    const { world } = window.__roomsong!;
    const system = world.getSystem(room.RoomSystem)!;
    const captions = world.getSystem(ui.CaptionSystem)!;
    const object = system.bed.object3D!;
    let frame = 0;
    let startedMs = 0;
    let updateMs = 0;
    const bed = (): BedNow => ({
      isPlaced: system.bed.hasComponent(BedAnchor),
      source: system.bed.hasComponent(BedAnchor) ? system.bed.getValue(BedAnchor, 'source') : null,
      isShown: object.visible,
      // The first instanced mesh on the bed is BedRenderer's markers; the plants' come after it.
      hasMarkers: object.getObjectByName('bed-markers')?.visible === true,
      pose: Array.from(object.matrixWorld.elements),
    });
    const heard: Heard[] = [];
    for (const type of [
      'xr:sessionStart',
      'xr:sessionEnd',
      'xr:visibility',
      'room:placementLevel',
      'room:bedPlaced',
      'room:features',
      'room:anchored',
    ] as const) {
      core.bus.on(type, (payload) =>
        heard.push({
          type,
          payload: JSON.parse(JSON.stringify(payload)) as Record<string, unknown>,
          frame,
          atMs: performance.now(),
          bed: bed(),
        }),
      );
    }
    const anchors = world.queryManager.registerQuery({ required: [BedAnchor] });
    const anchorLog: RoomProbe['anchorLog'] = [];
    anchors.subscribe('qualify', () => anchorLog.push({ on: true, frame }));
    anchors.subscribe('disqualify', () => anchorLog.push({ on: false, frame }));
    const raised = world.queryManager.registerQuery({ required: [Caption] });
    const captionLog: RoomProbe['captionLog'] = [];
    raised.subscribe('qualify', (entity) => captionLog.push({ key: entity.getValue(Caption, 'key'), frame }));
    raised.subscribe('disqualify', () => captionLog.push({ key: null, frame }));
    // With the frame it was taken on: what is drawn changes from frame to frame (the garden, the ripple).
    const samples: RoomProbe['samples'] = [];
    core.bus.on('perf:sample', (sample) => samples.push({ ...sample, frame }));

    // A frame: IWSDK's loop calls world.update, then renders, and the scene's onAfterRender ends the render.
    const update = world.update.bind(world);
    world.update = (delta, time) => {
      frame++;
      startedMs = performance.now();
      update(delta, time);
      updateMs = performance.now() - startedMs;
    };
    const draws: number[] = [];
    const bedY: number[] = [];
    const placedFrames: RoomProbe['placedFrames'] = [];
    const after = world.scene.onAfterRender.bind(world.scene);
    world.scene.onAfterRender = (...args) => {
      after(...args);
      draws[frame] = world.renderer.info.render.calls;
      bedY[frame] = object.matrixWorld.elements[13]!;
      const last = heard[heard.length - 1];
      const isPlacedFrame = heard.some((event) => event.type === 'room:bedPlaced' && event.frame === frame);
      if (last !== undefined && isPlacedFrame && placedFrames[placedFrames.length - 1]?.frame !== frame) {
        placedFrames.push({ frame, updateMs, scriptMs: performance.now() - startedMs });
      }
    };
    const cost = { frames: 0, ms: 0 };
    const roomUpdate = system.update.bind(system);
    system.update = (delta, time) => {
      const from = performance.now();
      roomUpdate(delta, time);
      cost.ms += performance.now() - from;
      cost.frames++;
    };

    const probe: RoomProbe = {
      room: system,
      heard,
      anchorLog,
      captionLog,
      draws,
      bedY,
      placedFrames,
      cost,
      samples,
      frame: () => frame,
      bed,
      anchored: () => anchors.entities.size,
      shown: () => captions.shown,
      eyes: () => world.renderer.xr.getCamera().cameras.length,
      log: () => core.log.recent().map((entry) => `${entry.level} ${entry.scope} ${entry.msg}`),
      release: () => {
        const pos = { x: 0.1, y: 1, z: -0.3 };
        // Begun while the ghost is up: a pinch begun before it does not confirm (T-128c review).
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
    return probe;
  });
}

/** Resolves once the page has heard `count` events of `type`. */
const heardOf = (page: Page, probe: JSHandle<RoomProbe>, type: string, count = 1, timeout = 20_000) =>
  page.waitForFunction(
    ([p, type, count]) => p.heard.filter((event) => event.type === type).length >= count,
    [probe, type, count] as const,
    { timeout },
  );
const heard = (probe: JSHandle<RoomProbe>) => probe.evaluate((p) => p.heard);
const roomEvents = (events: Heard[]) => events.filter((event) => event.type.startsWith('room:'));
const typesOf = (events: Heard[]) => roomEvents(events).map((event) => event.type);
const levelsOf = (events: Heard[]) =>
  events.filter((event) => event.type === 'room:placementLevel').map((event) => event.payload.level);
const only = (events: Heard[], type: string): Heard => {
  const found = events.filter((event) => event.type === type);
  expect(found, type).toHaveLength(1);
  return found[0]!;
};
type Placed = { placement: { pose: number[]; level: number; surfaceId?: string }; restored: boolean };
const placedOf = (event: Heard) => event.payload as unknown as Placed;

/** Equal to within `tolerance`: the bed's entity keeps its position in 32-bit floats, a pose has 64. */
function expectPose(actual: number[], expected: number[], tolerance = 1e-6, note = ''): void {
  expect(actual, note).toHaveLength(16);
  for (let i = 0; i < 16; i++) {
    expect(
      Math.abs(actual[i]! - expected[i]!),
      `${note} [${i}]: ${actual[i]} vs ${expected[i]}`,
    ).toBeLessThan(tolerance);
  }
}

/** A bed straight ahead of the emulator's head (0, 1.6, 0; looking down -z): no turn, 0.45 m forward. */
const aheadAt = (heightM: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, heightM, -0.45, 1];
const EYE_HEIGHT_M = 1.6;
const FLOATING_M = EYE_HEIGHT_M - 0.25; // FR-ROOM-01 level 4
const TABLE_CENTRE = { x: 0, y: 0.74, z: -0.5 }; // of the table room
// The requirement's numbers, spelled out on purpose (room/config.ts holds the module's constants).
const PLANE_WAIT_MS = 3000;
const HIT_WAIT_MS = 10_000;
/** LLD §3.3 D: the one frame of a placement may take this much script time. */
const PLACED_FRAME_BUDGET_MS = 50;

interface Case {
  room: 'table' | 'counter';
  flags?: string;
  levels: number[];
  level: number;
  heightM: number;
  source: string;
  /** A plane the bed is on: the room's own features are known. */
  features?: { tableHeight: number; floorArea: number; ceilingHeight: number };
}
const CASES: Case[] = [
  // The chain as it runs for a user.
  {
    room: 'table',
    levels: [1],
    level: 1,
    heightM: 0.74,
    source: 'table',
    features: { tableHeight: 0.74, floorArea: 18, ceilingHeight: 2.5 },
  },
  {
    room: 'counter',
    levels: [1, 2],
    level: 2,
    heightM: 0.92,
    source: 'surface',
    features: { tableHeight: 0.92, floorArea: 12, ceilingHeight: 2.4 },
  },
  // LLD §3.5 c1: forceLevel=1, 2 and 4 each give room:bedPlaced with that level, then room:features.
  { room: 'table', flags: 'forceLevel=1', levels: [1], level: 1, heightM: 0.74, source: 'table' },
  { room: 'table', flags: 'forceLevel=2', levels: [2], level: 2, heightM: 0.74, source: 'surface' },
  { room: 'table', flags: 'forceLevel=4', levels: [4], level: 4, heightM: FLOATING_M, source: 'floating' },
];

for (const { room, flags, levels, level, heightM, source, features } of CASES) {
  const title = flags === undefined ? `the ${room} room` : `the ${room} room with ${flags}`;
  test(`T-128c c1 ${title}: the app places the bed at level ${level} and reads the room in the same frame`, async ({
    page,
  }) => {
    const errors = watch(page);
    const offHost = await openApp(page, readRoom(room), flags === undefined ? '/' : `/?flags=${flags}`);
    const probe = await watchRoom(page);
    await enterXR(page);
    await heardOf(page, probe, 'room:anchored');
    const events = await heard(probe);

    // The order of API_SPEC §1.10 rule 4, and nothing twice.
    expect(events[0]?.type).toBe('xr:sessionStart');
    expect(typesOf(events)).toEqual([
      ...levels.map(() => 'room:placementLevel'),
      'room:bedPlaced',
      'room:features',
      'room:anchored',
    ]);
    expect(levelsOf(events)).toEqual(levels);
    const placed = only(events, 'room:bedPlaced');
    const read = only(events, 'room:features');
    const { placement, restored } = placedOf(placed);
    expect(restored).toBe(false);
    expect(placement.level).toBe(level);
    expect(typeof placement.surfaceId === 'string').toBe(level <= 2);
    // On the fixture's surface, in front of the head: the reference space and the world space are one.
    expectPose(placement.pose, aheadAt(heightM), 1e-6, 'the placement');
    // In the frame of the event: the entity is at the placement's pose, shown, with BedAnchor and its markers.
    expectPose(placed.bed.pose, placement.pose, 1e-6, 'the bed entity at room:bedPlaced');
    expect(placed.bed).toMatchObject({ isPlaced: true, source, isShown: true, hasMarkers: true });
    // One update: the bed and the room read share a frame, the one after the chain resolved.
    expect(read.frame).toBe(placed.frame);
    const lastLevel = events.filter((event) => event.type === 'room:placementLevel').pop()!;
    expect(placed.frame).toBe(lastLevel.frame + 1);
    expect(lastLevel.bed).toMatchObject({ isPlaced: false, isShown: false });
    expect((read.payload.features as { level: number }).level).toBe(level);
    if (features !== undefined) {
      const got = read.payload.features as Record<string, number>;
      for (const [name, value] of Object.entries(features)) expect(got[name], name).toBeCloseTo(value, 3);
      expect(got.wallCount).toBe(4);
      expect(read.payload.surfaces).toHaveProperty('table');
      expect(read.payload.surfaces).toHaveProperty('ceiling');
    }
    // The new anchor comes later, holding nothing up, with the level of the bed.
    const anchored = only(events, 'room:anchored');
    expect(anchored.frame).toBeGreaterThan(placed.frame);
    expect(anchored.payload).toMatchObject({ level });
    expect(anchored.payload.handle).toMatch(/^[0-9a-f-]{36}$/);

    // The bed's draw calls, in each eye: the glass with its ring lines and the markers, plus the Listen orb in the
    // centre hole (T-148) when it is in view: a small mesh, culled when the bed lies on a table below the view.
    await page.waitForFunction((p) => p.samples.length >= 2, probe);
    const numbers = await probe.evaluate((p, frame) => {
      const sample = p.samples[p.samples.length - 1]!;
      p.cost.frames = p.cost.ms = 0;
      return {
        eyes: p.eyes(),
        before: p.draws[frame - 1],
        after: p.draws[frame],
        sample,
        now: p.draws[sample.frame],
      };
    }, placed.frame);
    // At least the bed's two in each eye: since T-128d the same frame also brings what the visit puts on the bed
    // (the starter seeds' orb, the tide fading in), the Listen orb (T-148) and the tuning ripple, by frame timing.
    expect(numbers.after! - numbers.before!).toBeGreaterThanOrEqual(2 * numbers.eyes);
    expect(placed.bed).toMatchObject({ isShown: true, hasMarkers: true });
    expect(numbers.sample.draws).toBe(numbers.now); // perf:sample reports the count of the frame it was taken on
    // Through the page's guard, inside the cap (FR-UI-11). The markers' fade-in at the placement is one change;
    // since T-128d the tide's fade-in and the tuning ripple's sweeps come in the same seconds.
    const flashes = await probe.evaluate((p) => p.samples.map((sample) => sample.maxFlashPerS));
    expect(Math.max(...flashes)).toBeLessThanOrEqual(3);

    // The numbers: the placed frame, and RoomSystem.update once the bed is placed.
    await xrFrames(page, 200);
    const cost = await probe.evaluate((p) => ({ placed: p.placedFrames, ...p.cost }));
    expect(cost.placed).toHaveLength(1);
    expect(cost.placed[0]!.updateMs).toBeLessThan(PLACED_FRAME_BUDGET_MS);
    const perFrameMs = cost.ms / cost.frames;
    console.log(
      `T-128c ${title}: placed frame ${cost.placed[0]!.updateMs.toFixed(2)} ms of updates, ` +
        `${cost.placed[0]!.scriptMs.toFixed(2)} ms with its render (software); RoomSystem.update while placed ` +
        `${perFrameMs.toFixed(4)} ms a frame over ${cost.frames} frames; draws ${numbers.before} -> ` +
        `${numbers.after} in ${numbers.eyes} eyes (emulator)`,
    );
    expect(perFrameMs).toBeLessThan(0.5);

    if (flags === undefined && room === 'table') {
      // Re-place (FR-ROOM-05): BedAnchor comes off, the chain runs again, and the room is read again.
      // Read in the same call: with a table in sight the bed is back two frames later.
      const taken = await probe.evaluate((p) => {
        p.room.replace();
        return p.bed();
      });
      expect(taken).toMatchObject({ isPlaced: false, isShown: false });
      await heardOf(page, probe, 'room:features', 2);
      const again = roomEvents(await heard(probe)).slice(4);
      expect(again.map((event) => event.type).slice(0, 3)).toEqual([
        'room:placementLevel',
        'room:bedPlaced',
        'room:features',
      ]);
      expect(placedOf(again[1]!)).toMatchObject({ restored: false, placement: { level: 1 } });
      expect(again[2]!.frame).toBe(again[1]!.frame);
      expect((await probe.evaluate((p) => p.anchorLog)).map((entry) => entry.on)).toEqual([
        true,
        false,
        true,
      ]);
    }

    // After the session no entity carries BedAnchor, and the bed is not drawn.
    await (await device(page)).evaluate((d) => d.activeSession?.end());
    await heardOf(page, probe, 'xr:sessionEnd');
    expect(await probe.evaluate((p) => ({ anchored: p.anchored(), bed: p.bed() }))).toMatchObject({
      anchored: 0,
      bed: { isPlaced: false, isShown: false },
    });
    // The markers fade out through the guard, in the frames the page goes on drawing without a session.
    await page.waitForFunction((p) => !p.bed().hasMarkers, probe);
    expect(errors).toEqual([]);
    expect(offHost).toEqual([]);
  });
}

test('T-128c c2 level 3: the ghost and its caption, a dwell that floats nothing, and a pinch on the table', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'), '/?flags=forceLevel=3');
  const probe = await watchRoom(page);
  // The beat ring off (on by default, FR-UI-07), so the flash check below sees the ghost and the markers alone: its
  // ticks rise and fall as the tide's crest passes, 2 changes a second, under the cap (BUG-009). That rate is checked
  // by tests/unit/access/BeatRing.test.ts, "a full bed at 120 BPM: no tick changes brightness more than 3 times a
  // second (FR-UI-11)".
  await page.evaluate(async () => {
    const url = '/src/core/index.ts';
    const core = (await import(/* @vite-ignore */ url)) as Core;
    core.settings.set({ beatRing: false });
  });
  await enterXR(page);
  await heardOf(page, probe, 'room:placementLevel');
  // Few frames from here to the pinch: under software rendering 10 s of level 3 is not many, and a wait that runs
  // out over the table also gives level 3, which would make the pinch a no-op the test could not tell apart.
  await xrFrames(page, 5);

  // A level gaze meets the far wall at eye height: no usable spot, so the ghost is the floating bed.
  const start = only(await heard(probe), 'room:placementLevel');
  expect(start.payload).toEqual({ level: 3 });
  const floating = await probe.evaluate((p) => ({ bed: p.bed(), shown: p.shown(), captions: p.captionLog }));
  expect(floating.bed).toMatchObject({ isPlaced: false, isShown: true, hasMarkers: false });
  expectPose(floating.bed.pose, aheadAt(FLOATING_M), 1e-6, 'the ghost with the gaze on the wall');
  // The caption is up from room:placementLevel { level: 3 }, in that very frame.
  expect(floating.captions).toEqual([{ key: 'placeLook', frame: start.frame }]);
  expect(floating.shown).toBe('placeLook');

  // The gaze dwell's way in: over no usable spot it places nothing. A dwell never floats the bed.
  await probe.evaluate((p) => p.room.confirm());
  await xrFrames(page, 5);
  expect(typesOf(await heard(probe))).toEqual(['room:placementLevel']);

  // The head turns down to the table: the ghost follows, with its ease, onto the table top.
  await (
    await device(page)
  ).evaluate((d, target) => d.remote.dispatch('look_at', { device: 'headset', target }), TABLE_CENTRE);
  await page.waitForFunction((p) => Math.abs(p.bed().pose[13]! - 0.74) < 1e-4, probe); // settled on the table
  // At least one frame drew it between the two places: an ease, not a jump. Read per frame, so a slow emulator
  // frame (software rendering) changes how many such frames there are, not whether there is one.
  const between = await probe.evaluate(
    (p, low) => p.bedY.filter((y) => y > low && y < 1.35 - 1e-3).length,
    0.74 + 1e-3,
  );
  expect(between).toBeGreaterThan(0);
  const ghost = await probe.evaluate((p) => p.bed());
  expect(ghost).toMatchObject({ isPlaced: false, isShown: true, hasMarkers: false });
  expectPose(ghost.pose, aheadAt(0.74), 1e-4, 'the ghost with the gaze on the table');

  // The confirm by hand, as hands/ sends it. The bed lands where the ghost is: level 3.
  const pinchedAt = await probe.evaluate((p) => {
    p.release();
    return p.frame();
  });
  await heardOf(page, probe, 'room:features');
  const events = await heard(probe);
  expect(typesOf(events).slice(0, 3)).toEqual(['room:placementLevel', 'room:bedPlaced', 'room:features']);
  const placed = only(events, 'room:bedPlaced');
  // Placed by the pinch: after it, and before the 10 s of level 3 could have run out.
  expect(placed.frame - pinchedAt).toBeGreaterThanOrEqual(1);
  expect(placed.frame - pinchedAt).toBeLessThanOrEqual(2); // the solver's frame, then the placed step
  expect(placed.atMs - start.atMs).toBeLessThan(HIT_WAIT_MS);
  expect(placedOf(placed)).toMatchObject({ restored: false, placement: { level: 3 } });
  expect(placedOf(placed).placement.surfaceId).toBeUndefined();
  expectPose(placedOf(placed).placement.pose, ghost.pose, 1e-4, 'the placed pose is where the ghost was');
  expect(placed.bed).toMatchObject({ isPlaced: true, source: 'hittest', isShown: true, hasMarkers: true });
  expect((only(events, 'room:features').payload.features as { level: number }).level).toBe(3);
  // The caption goes with room:bedPlaced, and nothing blinked on the way.
  const captions = await probe.evaluate((p) => p.captionLog);
  expect(captions).toEqual([
    { key: 'placeLook', frame: start.frame },
    { key: null, frame: placed.frame },
  ]);
  await page.waitForFunction((p) => p.shown() === null, probe);
  await page.waitForFunction((p) => p.samples.length >= 2, probe);
  const samples = await probe.evaluate((p) => p.samples);
  // The ghost and the caption are levels: the one change is the markers' fade-in at the placement (UX §9.2).
  expect(Math.max(...samples.map((sample) => sample.maxFlashPerS))).toBeLessThanOrEqual(1);
  console.log(
    `T-128c level 3: ghost ${ghost.pose
      .slice(12, 15)
      .map((n) => n.toFixed(4))
      .join()} placed ` +
      `${placedOf(placed)
        .placement.pose.slice(12, 15)
        .map((n) => n.toFixed(4))
        .join()}, ` +
      `${placed.frame - pinchedAt} frames after the pinch (emulator)`,
  );
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('T-128c c2 level 3: a pinch with the gaze on nothing usable floats the bed in that frame', async ({
  page,
}) => {
  const errors = watch(page);
  await openApp(page, readRoom('table'), '/?flags=forceLevel=3');
  const probe = await watchRoom(page);
  await enterXR(page);
  await heardOf(page, probe, 'room:placementLevel');
  await xrFrames(page, 10);
  const pinchedAt = await probe.evaluate((p) => {
    p.release();
    return { frame: p.frame(), atMs: performance.now() };
  });
  await heardOf(page, probe, 'room:features');
  const events = await heard(probe);
  expect(levelsOf(events)).toEqual([3, 4]);
  const placed = only(events, 'room:bedPlaced');
  expect(placedOf(placed)).toMatchObject({ restored: false, placement: { level: 4 } });
  expectPose(placedOf(placed).placement.pose, aheadAt(FLOATING_M), 1e-6, 'the floating bed');
  expect(placed.bed).toMatchObject({ isPlaced: true, source: 'floating', hasMarkers: true });
  expect(placed.frame - pinchedAt.frame).toBeLessThanOrEqual(2);
  expect(placed.atMs - pinchedAt.atMs).toBeLessThan(1000); // at once, not when the 10 s are over
  // The user chose it: no wait ran out, so nothing is logged as a time-out.
  expect(await probe.evaluate((p) => p.log())).not.toContain('warn room E_PLACEMENT_TIMEOUT');
  expect(errors).toEqual([]);
});

test('T-128c c2 level 3: a hide and a show start the wait again, and with no pinch the bed lands where the ghost is', async ({
  page,
}) => {
  const errors = watch(page);
  await openApp(page, readRoom('table'), '/?flags=forceLevel=3');
  const probe = await watchRoom(page);
  const d = await device(page);
  await enterXR(page);
  await heardOf(page, probe, 'room:placementLevel');
  await d.evaluate((d, target) => d.remote.dispatch('look_at', { device: 'headset', target }), TABLE_CENTRE);
  await xrFrames(page, 60);

  await d.evaluate((d) => d.updateVisibilityState('hidden'));
  await heardOf(page, probe, 'xr:visibility');
  await d.evaluate((d) => d.updateVisibilityState('visible'));
  await heardOf(page, probe, 'xr:visibility', 2);
  await heardOf(page, probe, 'room:placementLevel', 2);
  await xrFrames(page, 5);
  const restarted = await probe.evaluate((p) => ({ heard: p.heard, captions: p.captionLog, bed: p.bed() }));
  expect(levelsOf(restarted.heard)).toEqual([3, 3]); // the chain began again
  // The hint was taken back with the old run and raised anew for the new wait; the ghost is back.
  expect(restarted.captions.map((entry) => entry.key)).toEqual(['placeLook', null, 'placeLook']);
  expect(restarted.bed).toMatchObject({ isPlaced: false, isShown: true, hasMarkers: false });

  // No pinch: the wait runs its full 10 s from the show, and the bed lands on the table the gaze is on.
  await heardOf(page, probe, 'room:features', 1, HIT_WAIT_MS + 8000);
  const events = await heard(probe);
  const shownAgain = events.filter((event) => event.type === 'xr:visibility')[1]!;
  const secondStart = events.filter((event) => event.type === 'room:placementLevel')[1]!;
  const placed = only(events, 'room:bedPlaced');
  expect(shownAgain.payload).toEqual({ visible: true });
  expect(placed.atMs - secondStart.atMs).toBeGreaterThanOrEqual(HIT_WAIT_MS - 100);
  expect(placed.atMs - secondStart.atMs).toBeLessThan(HIT_WAIT_MS + 3000);
  expect(levelsOf(events)).toEqual([3, 3]); // a time-out over a usable spot uses it: no level 4
  expect(placedOf(placed)).toMatchObject({ restored: false, placement: { level: 3 } });
  expectPose(placedOf(placed).placement.pose, aheadAt(0.74), 1e-4, 'on the table');
  expect(await probe.evaluate((p) => p.log())).not.toContain('warn room E_PLACEMENT_TIMEOUT');
  expect(errors).toEqual([]);
});

test('T-128c the none room: the ghost after the 3 s for a plane, then an emulated pinch places the floating bed', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('none'));
  const probe = await watchRoom(page);
  await enterXR(page);
  await heardOf(page, probe, 'room:placementLevel', 2);
  await xrFrames(page, 10);
  const before = await probe.evaluate((p) => ({ heard: p.heard, bed: p.bed(), shown: p.shown() }));
  expect(levelsOf(before.heard)).toEqual([1, 3]);
  const [first, third] = before.heard.filter((event) => event.type === 'room:placementLevel');
  expect(third!.atMs - first!.atMs).toBeGreaterThanOrEqual(PLANE_WAIT_MS - 100);
  expect(first!.bed).toMatchObject({ isPlaced: false, isShown: false }); // levels 1 and 2: the room, nothing else
  // Nothing to hit in this room: the ghost is the floating bed.
  expect(before.bed).toMatchObject({ isPlaced: false, isShown: true, hasMarkers: false });
  expectPose(before.bed.pose, aheadAt(FLOATING_M), 1e-6, 'the ghost');
  expect(before.shown).toBe('placeLook');

  // A real pinch of the emulated right hand, in the air: HandSystem sends the release on nothing.
  const trace = await playHandPath(page, readHandPath('pinch'));
  expect(trace.events.map((event) => event.type)).toEqual(['selectstart', 'selectend']);
  await heardOf(page, probe, 'room:features');
  const events = await heard(probe);
  expect(levelsOf(events)).toEqual([1, 3, 4]);
  const placed = only(events, 'room:bedPlaced');
  expect(placedOf(placed)).toMatchObject({ restored: false, placement: { level: 4 } });
  expectPose(placedOf(placed).placement.pose, before.bed.pose, 1e-6, 'where the ghost was');
  expect(placed.bed).toMatchObject({ isPlaced: true, source: 'floating', isShown: true, hasMarkers: true });
  expect(placed.atMs - third!.atMs).toBeLessThan(HIT_WAIT_MS - 1000); // the pinch, not the time-out
  // room:features always follows, with the level alone in a room that gives nothing.
  const read = only(events, 'room:features');
  expect(read.frame).toBe(placed.frame);
  expect(read.payload).toEqual({ features: { level: 4 }, surfaces: {} });
  // Glass, then glass and markers: one draw call and two, in each eye, on top of what else is drawn.
  const draws = await probe.evaluate(
    (p, at) => ({
      eyes: p.eyes(),
      ghost: [p.draws[at.ghost - 1], p.draws[at.ghost]],
      placed: [p.draws[at.placed - 1], p.draws[at.placed]],
    }),
    { ghost: third!.frame, placed: placed.frame },
  );
  console.log(`T-128c none: draw calls ${JSON.stringify(draws)} (emulator; the hint is a draw call too)`);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('T-128c the none room with no pinch: the bed floats when the 3 s and the 10 s are over', async ({
  page,
}) => {
  const errors = watch(page);
  await openApp(page, readRoom('none'));
  const probe = await watchRoom(page);
  await enterXR(page);
  await heardOf(page, probe, 'room:features', 1, PLANE_WAIT_MS + HIT_WAIT_MS + 10_000);
  const events = await heard(probe);
  expect(levelsOf(events)).toEqual([1, 3, 4]);
  const placed = only(events, 'room:bedPlaced');
  const waitedMs = placed.atMs - events[0]!.atMs;
  console.log(`T-128c none, no pinch: placed ${Math.round(waitedMs)} ms after xr:sessionStart (emulator)`);
  expect(waitedMs).toBeGreaterThanOrEqual(PLANE_WAIT_MS + HIT_WAIT_MS - 100);
  expect(placedOf(placed)).toMatchObject({ restored: false, placement: { level: 4 } });
  expectPose(placedOf(placed).placement.pose, aheadAt(FLOATING_M), 1e-6, 'the floating bed');
  expect(placed.bed).toMatchObject({ isPlaced: true, source: 'floating', isShown: true, hasMarkers: true });
  // A floating bed is a complete garden: logged at warn, and nothing tells the user.
  expect(await probe.evaluate((p) => p.log())).toContain('warn room E_PLACEMENT_TIMEOUT');
  await page.waitForFunction((p) => p.shown() === null, probe);
  expect(errors).toEqual([]);
});

test('T-128c anchors: a second visit brings the bed back at the same pose, and with noAnchors it is placed again', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  const first = await watchRoom(page);
  await enterXR(page);
  await heardOf(page, first, 'room:anchored');
  const made = await heard(first);
  const saved = only(made, 'room:anchored').payload as { handle: string; level: 1 };
  const pose = placedOf(only(made, 'room:bedPlaced')).placement.pose;

  // The next visit: the garden keeps the pair and saves it like any change; once it is written, the page is loaded
  // again, and the saved garden brings the pair back before Enter.
  const savedHandle = () =>
    page.evaluate(async (url) => {
      const { openStore } = (await import(
        /* @vite-ignore */ url
      )) as typeof import('../../src/persistence/index');
      return (await (await openStore()).load())?.anchorHandle;
    }, '/src/persistence/index.ts');
  await expect.poll(savedHandle).toBe(saved.handle);
  await page.reload();
  const second = await watchRoom(page);
  await enterXR(page);
  await heardOf(page, second, 'room:features');
  await xrFrames(page, 30);
  const back = await heard(second);
  // The chain did not run: one level, said by RoomSystem, and no new anchor.
  expect(typesOf(back)).toEqual(['room:placementLevel', 'room:bedPlaced', 'room:features']);
  expect(levelsOf(back)).toEqual([1]);
  const restored = only(back, 'room:bedPlaced');
  expect(placedOf(restored)).toMatchObject({ restored: true, placement: { level: 1 } });
  expect(placedOf(restored).placement.surfaceId).toBeUndefined();
  expectPose(placedOf(restored).placement.pose, pose, 1e-4, 'the pose of the first visit');
  expect(restored.bed).toMatchObject({ isPlaced: true, source: 'table', isShown: true, hasMarkers: true });
  expectPose(restored.bed.pose, pose, 1e-4, 'the bed entity');
  // A bed restored at level 1 gets its room back: the same features as on the day it was placed.
  const read = only(back, 'room:features');
  expect(read.frame).toBe(restored.frame);
  expect(read.payload.features).toEqual(only(made, 'room:features').payload.features);
  console.log(
    `T-128c restore: room:bedPlaced ${Math.round(restored.atMs - back[0]!.atMs)} ms and ` +
      `${restored.frame - back[0]!.frame} frames after xr:sessionStart (emulator: the anchor is there at once)`,
  );

  // With noAnchors the store answers null: the chain places the bed, and no anchor is announced.
  await page.goto('/?flags=noAnchors');
  const flagged = await watchRoom(page);
  await enterXR(page);
  await heardOf(page, flagged, 'room:features');
  await xrFrames(page, 30);
  const again = await heard(flagged);
  expect(typesOf(again)).toEqual(['room:placementLevel', 'room:bedPlaced', 'room:features']);
  expect(placedOf(only(again, 'room:bedPlaced'))).toMatchObject({ restored: false, placement: { level: 1 } });
  expect(typeof placedOf(only(again, 'room:bedPlaced')).placement.surfaceId).toBe('string'); // the chain's own
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

// T-149 (FR-ROOM-04, Could C4): in the counter room the wall ahead is 0.3 m from the bed, so a full garden
// (autoplant=80) grows the vine up it: one instanced mesh, one draw call per eye, ≤ 8k triangles. The table room's
// nearest wall is 1.8 m off (past VINE_WALL_MAX_M), so the cases above draw none.
test('T-149 the counter room with autoplant=80: the vine grows up the wall ahead, one draw call per eye', async ({
  page,
}, testInfo) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('counter'), '/?flags=autoplant=80');
  const probe = await watchRoom(page);
  await enterXR(page);
  await heardOf(page, probe, 'room:features');
  const vine = await page.evaluateHandle(() => {
    const { world } = window.__roomsong!;
    const mesh = world.scene.getObjectByName('vine') as import('three').InstancedMesh<
      import('three').BufferGeometry,
      import('three').MeshBasicMaterial
    >;
    // Its draws in each frame, from the start of that frame's render (as the halo test counts the tide's).
    let draws = 0;
    world.scene.onBeforeRender = () => {
      mesh.userData.draws = draws;
      draws = 0;
    };
    mesh.onBeforeRender = () => draws++;
    return mesh;
  });
  // The whole length in VINE_GROW_MS (6 s) of frame time; the emulator's frames are slowed.
  await page.waitForFunction((mesh) => mesh.count === 48, vine, { timeout: 40_000 });
  await xrFrames(page, 3);
  const drawn = await vine.evaluate((mesh) => ({
    draws: mesh.userData.draws as number,
    tris: (mesh.geometry.index!.count / 3) * mesh.count,
    opacity: mesh.material.opacity,
    visible: mesh.visible,
    // The lowest and highest pieces: up the wall at z = -0.75 from the worktop's height (0.92 m).
    foot: Array.from(mesh.instanceMatrix.array.slice(12, 15)),
    top: Array.from(mesh.instanceMatrix.array.slice(47 * 16 + 12, 47 * 16 + 15)),
  }));
  const eyes = await probe.evaluate((p) => p.eyes());
  expect(drawn.visible).toBe(true);
  expect(drawn.draws).toBe(eyes);
  expect(drawn.tris).toBe(576); // 48 pieces of 12
  expect(drawn.opacity).toBeCloseTo(0.7, 3);
  expect(drawn.foot[1]).toBeCloseTo(0.92 + 0.0125, 3);
  expect(drawn.top[1]).toBeCloseTo(0.92 + 1.2 - 0.0125, 3);
  expect(drawn.foot[2]).toBeGreaterThan(-0.75);
  expect(drawn.foot[2]).toBeLessThan(-0.73);
  await page.screenshot({ path: testInfo.outputPath('vine-counter.png') });
  console.log(`T-149 vine: ${drawn.draws} draws and ${drawn.tris} triangles in ${eyes} eyes (emulator)`);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
