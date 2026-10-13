// RoomSystem (T-128c; LLD §3.2, §3.3 C, D, H, L, §5.5; API_SPEC §1.3 "Placing the bed", §1.10 rules 4, 5, 12):
// the states idle, placing and placed, one test per sentence of the contract. Fake adapters, solver, anchor
// store and extractor, the real bus, and a bed entity on a real Object3D: no XR session and no ECS world. What
// the emulator's rooms do with the whole chain is tests/e2e/06-room.spec.ts.
import { Object3D } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BedAnchor, Caption } from '../../../src/core/components.js';
import { bus, clock, DEFAULT_SETTINGS, log, settings } from '../../../src/core/index.js';
import {
  ANCHOR_RESTORE_TIMEOUT_MS,
  BED_CENTRE_MAX_M,
  GHOST_EASE_MS,
  HIT_TEST_TIMEOUT_MS,
  PLANE_LEVELS_TIMEOUT_MS,
  RESTORE_REACH_SLACK_M,
} from '../../../src/room/config.js';
import { RoomSystem } from '../../../src/room/RoomSystem.js';
import { garden } from '../garden/fixtures.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

import { headAt } from './fixtures.js';

import type { EventMap, Mat4 } from '../../../src/core/index.js';
import type { GardenState, RoomFeatures } from '../../../src/garden/index.js';
import type { BedPlacement, RoomPlane, RoomSurfaces } from '../../../src/room/index.js';

/** As much of an ECS entity as RoomSystem uses. `fail` makes the next call of that name throw, once. */
class FakeEntity {
  readonly data = new Map<unknown, Record<string, unknown>>();
  readonly object3D = new Object3D();
  /** Every add and remove, in order. */
  readonly ops: string[] = [];
  fail: 'addComponent' | null = null;

  addComponent(component: unknown, values: Record<string, unknown> = {}): this {
    if (this.fail === 'addComponent') {
      this.fail = null;
      throw new Error('planted in addComponent');
    }
    this.ops.push('add');
    this.data.set(component, { ...values });
    return this;
  }
  removeComponent(component: unknown): this {
    this.ops.push('remove');
    this.data.delete(component);
    return this;
  }
  hasComponent(component: unknown): boolean {
    return this.data.has(component);
  }
  setValue(component: unknown, key: string, value: unknown): void {
    this.data.get(component)![key] = value;
  }
}

/** A level pose with no turn: +z at a user who looks down -z (D-029). */
const at = (x: number, y: number, z: number): number[] => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const EYE_M = 1.6;
const ON_TABLE: BedPlacement = { pose: at(0, 0.74, -0.45), level: 1, surfaceId: 'plane-0' };
const FLOATING: BedPlacement = { pose: at(0, EYE_M - 0.25, -0.45), level: 4 };
const FEATURES: RoomFeatures = { level: 1, tableHeight: 0.74, floorArea: 18, ceilingHeight: 2.5 };
const SURFACES: RoomSurfaces = {
  table: { id: 'plane-0', pose: at(0, 0.74, -0.5), extents: { x: 1.2, y: 0.8 } },
};
const A_PLANE: RoomPlane = {
  id: 'plane-0',
  label: 'table',
  pose: at(0, 0.74, -0.5),
  extents: { x: 1.2, y: 0.8 },
};
const HANDLE = '11111111-2222-4333-8444-555555555555';
/** Two clocks at the sizes they have in the app: core's wall clock (the caption) and IWSDK's frame time. */
const WALL_START_MS = 1_790_000_000_000;
const FRAME_START_S = 12_345.678;
const FRAME_MS = 14;

const stops: (() => void)[] = [];
afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  vi.restoreAllMocks();
  clock.setSource(() => Date.now());
  settings.set(DEFAULT_SETTINGS);
});

/** Lets every promise continuation that is due run: what happens between two frames. */
async function betweenFrames(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

type RoomEvent = 'room:placementLevel' | 'room:bedPlaced' | 'room:features' | 'room:anchored';
const ROOM_EVENTS: RoomEvent[] = ['room:placementLevel', 'room:bedPlaced', 'room:features', 'room:anchored'];

/** The system on a fake world, with every collaborator answered by the test. */
function rig() {
  let wallMs = WALL_START_MS;
  let timeS = FRAME_START_S;
  clock.setSource(() => wallMs);
  const xr = {
    frame: { name: 'the frame' } as unknown as XRFrame | null,
    space: new EventTarget() as unknown as XRReferenceSpace | null,
    isPresenting: true,
    getFrame: () => xr.frame,
    getReferenceSpace: () => xr.space,
  };
  const head = new Object3D();
  head.matrixWorld.makeTranslation(0, EYE_M, 0); // the emulator's head: at the origin, looking down -z
  const bed = new FakeEntity();
  const hint = new FakeEntity();
  const made: unknown[] = [];
  const world = {
    renderer: { xr },
    player: { head },
    camera: new Object3D(),
    createTransformEntity: (object: unknown, options: unknown) => {
      made.push([object, options]);
      return bed;
    },
    createEntity: () => hint,
  };
  const system = new RoomSystem(world as never, {} as never, 10);

  /** What the room gives; a test changes it between frames. */
  const room = {
    planes: [A_PLANE] as RoomPlane[] | 'unsupported',
    preview: null as BedPlacement | null,
    features: FEATURES as RoomFeatures | 'throws',
    anchorsSupported: true,
    createThrows: false,
  };
  /** Every call of a collaborator and every room event, in order. */
  const calls: string[] = [];
  const note = (name: string) => () => void calls.push(name);
  vi.spyOn(system.planes, 'setFrame').mockImplementation(note('planes.setFrame'));
  vi.spyOn(system.meshes, 'setFrame').mockImplementation(note('meshes.setFrame'));
  vi.spyOn(system.hits, 'setFrame').mockImplementation(note('hits.setFrame'));
  const setFrame = vi.spyOn(system.anchors, 'setFrame').mockImplementation(note('anchors.setFrame'));
  vi.spyOn(system.planes, 'supported').mockImplementation(() => room.planes !== 'unsupported');
  const readPlanes = vi
    .spyOn(system.planes, 'read')
    .mockImplementation(() => (room.planes === 'unsupported' ? [] : room.planes));

  const runs: { timeoutMs: number; resolve: (placement: BedPlacement) => void }[] = [];
  vi.spyOn(system.solver, 'run').mockImplementation(({ timeoutMs }) => {
    calls.push('solver.run');
    return new Promise((resolve) => runs.push({ timeoutMs, resolve }));
  });
  vi.spyOn(system.solver, 'cancel').mockImplementation(note('solver.cancel'));
  const solverUpdates: { head: number[]; nowMs: number }[] = [];
  vi.spyOn(system.solver, 'update').mockImplementation((headPose: Mat4, nowMs: number) => {
    calls.push('solver.update');
    solverUpdates.push({ head: Array.from(headPose), nowMs });
  });
  const confirm = vi.spyOn(system.solver, 'confirm').mockImplementation(note('solver.confirm'));
  vi.spyOn(system.solver, 'preview').mockImplementation(() => room.preview);

  const restores: { handle: string; timeoutMs: number; resolve: (pose: Mat4 | null) => void }[] = [];
  vi.spyOn(system.anchors, 'supported').mockImplementation(() => room.anchorsSupported);
  vi.spyOn(system.anchors, 'restore').mockImplementation((handle, timeoutMs) => {
    calls.push('anchors.restore');
    return new Promise((resolve) => restores.push({ handle, timeoutMs, resolve }));
  });
  const creates: { pose: number[]; resolve: (handle: string | null) => void }[] = [];
  vi.spyOn(system.anchors, 'create').mockImplementation((pose) => {
    calls.push('anchors.create');
    if (room.createThrows) throw new Error('planted in create');
    return new Promise((resolve) => creates.push({ pose: Array.from(pose), resolve }));
  });
  vi.spyOn(system.anchors, 'clear').mockImplementation(() => {
    calls.push('anchors.clear');
    return Promise.resolve();
  });
  const extract = vi.spyOn(system.extractor, 'extract').mockImplementation((placement) => {
    calls.push('extract');
    if (room.features === 'throws') throw new Error('planted in extract');
    return { ...room.features, level: placement.level };
  });
  system.extractor.surfaces = SURFACES;
  system.init();

  /** Each room event with its payload, and the bed as a handler of that event finds it. */
  const events: { type: RoomEvent; payload: unknown; bed: ReturnType<typeof bedNow> }[] = [];
  const bedNow = () => ({
    isPlaced: bed.hasComponent(BedAnchor),
    isShown: bed.object3D.visible,
    pose: bed.object3D.matrixWorld.toArray(),
    hasHint: hint.hasComponent(Caption),
  });
  for (const type of ROOM_EVENTS) {
    stops.push(
      bus.on(type, (payload) => {
        calls.push(type);
        events.push({ type, payload: { ...payload }, bed: bedNow() });
      }),
    );
  }
  stops.push(() => system.destroy());

  /** Time passes with no frame. */
  const sleep = (ms: number): void => {
    wallMs += ms;
    timeS += ms / 1000;
  };
  /** One frame, `afterMs` after the last. */
  const frame = (afterMs = FRAME_MS): void => {
    sleep(afterMs);
    system.update(afterMs / 1000, timeS);
  };
  const gardenChanged = (over: Partial<GardenState>): void =>
    bus.emit('garden:changed', {
      state: garden([], [], over),
      diff: { added: [], removed: [], changed: [] },
    });
  /** A session whose chain has placed `placement`: the frame of the placed step has run. */
  const place = async (placement: BedPlacement = ON_TABLE): Promise<void> => {
    bus.emit('xr:sessionStart', { visible: true });
    frame();
    runs[runs.length - 1]!.resolve(placement);
    await betweenFrames();
    frame();
  };
  return {
    system,
    xr,
    head,
    bed,
    hint,
    made,
    room,
    calls,
    events,
    runs,
    restores,
    creates,
    solverUpdates,
    setFrame,
    readPlanes,
    extract,
    confirm,
    sleep,
    frame,
    gardenChanged,
    place,
    bedNow,
    nowMs: () => timeS * 1000,
    wallMs: () => wallMs,
    types: () => events.map((event) => event.type),
    /** The calls and events since the last look. */
    take: () => calls.splice(0),
  };
}

const startSession = (): void => bus.emit('xr:sessionStart', { visible: true });
const endSession = (): void => bus.emit('xr:sessionEnd', { visible: false });
const SET_FRAMES = ['planes.setFrame', 'meshes.setFrame', 'hits.setFrame', 'anchors.setFrame'];

describe('RoomSystem: idle, and what every frame does', () => {
  it('makes the bed once: a persistent transform entity, hidden, with no BedAnchor', () => {
    const r = rig();
    expect(r.made).toEqual([[undefined, { persistent: true }]]); // not parented to the active level
    expect(r.system.bed).toBe(r.bed);
    expect(r.bedNow()).toMatchObject({ isPlaced: false, isShown: false, hasHint: false });
  });

  it('outside a session it places nothing; a frame it does get still goes to the adapters and the store', () => {
    const r = rig();
    r.frame();
    expect(r.take()).toEqual(SET_FRAMES);
    r.system.replace(); // FR-ROOM-05: nothing outside a session
    r.system.confirm();
    bus.emit('xr:visibility', { visible: true });
    bus.emit('gesture:pinchStart', { ...PINCH_ON_NOTHING });
    bus.emit('gesture:release', { ...RELEASE_ON_NOTHING });
    r.frame();
    expect(r.take()).toEqual(SET_FRAMES); // no ghost, so no pinch confirms
    expect(r.bedNow()).toMatchObject({ isPlaced: false, isShown: false });
  });

  it('each frame of a session: setFrame on the three adapters and the anchor store, with the frame and the space, first', async () => {
    const r = rig();
    startSession();
    r.take();
    r.frame();
    expect(r.take()).toEqual([...SET_FRAMES, 'solver.run', 'solver.update']);
    expect(r.setFrame).toHaveBeenLastCalledWith(r.xr.frame, r.xr.space);
    r.frame(); // placing
    expect(r.take()).toEqual([...SET_FRAMES, 'solver.update']);
    r.runs[0]!.resolve(ON_TABLE);
    await betweenFrames();
    r.frame(); // the placed step
    expect(r.take().slice(0, 4)).toEqual(SET_FRAMES);
    r.frame(); // placed
    expect(r.take()).toEqual(SET_FRAMES);
  });

  it('with no XR frame (the garden window) it reads none, and the chain still runs: the head is the camera then', () => {
    const r = rig();
    r.xr.frame = null;
    r.xr.isPresenting = false;
    startSession();
    r.frame();
    r.frame();
    expect(r.take()).toEqual(['solver.cancel', 'solver.run', 'solver.update', 'solver.update']);
    expect(r.solverUpdates[0]!.head).toEqual(at(0, 0, 0)); // the camera's matrixWorld, not the XR head's
    r.xr.frame = {} as XRFrame;
    r.xr.space = null; // a frame with no reference space yet is no frame to read
    r.frame();
    expect(r.take()).toEqual(['solver.update']);
  });
});

describe('RoomSystem: placing, the decision of the first update (LLD §3.2, §5.5)', () => {
  it('xr:sessionStart only hides the bed: neither the store nor the chain is asked before a frame has come', () => {
    const r = rig();
    startSession();
    expect(r.take()).toEqual(['solver.cancel']);
    expect(r.bedNow()).toMatchObject({ isPlaced: false, isShown: false });
  });

  it('no saved pair: the first update runs the chain with the 3 s of levels 1 and 2, once', () => {
    const r = rig();
    r.gardenChanged({}); // a garden that was never anchored
    startSession();
    r.frame();
    expect(r.take()).toEqual(['solver.cancel', ...SET_FRAMES, 'solver.run', 'solver.update']);
    expect(r.runs).toHaveLength(1);
    expect(r.runs[0]!.timeoutMs).toBe(PLANE_LEVELS_TIMEOUT_MS);
    r.frame();
    r.frame();
    expect(r.runs).toHaveLength(1);
    expect(r.restores).toEqual([]);
  });

  it('while the chain runs: solver.update with the head and the frame time in ms, after setFrame', () => {
    const r = rig();
    r.head.matrixWorld.makeTranslation(0.1, 1.2, -0.3);
    startSession();
    r.frame();
    r.frame(20);
    expect(r.solverUpdates.map((update) => update.head)).toEqual([at(0.1, 1.2, -0.3), at(0.1, 1.2, -0.3)]);
    expect(r.solverUpdates[1]!.nowMs).toBeCloseTo(FRAME_START_S * 1000 + FRAME_MS + 20, 6);
    expect(r.solverUpdates[1]!.nowMs - r.solverUpdates[0]!.nowMs).toBeCloseTo(20, 6);
  });

  it('a saved pair, from the latest garden:changed: the first update asks the store, with the 4 s, and not the chain', () => {
    const r = rig();
    r.gardenChanged({ anchorHandle: 'an-older-one', anchorLevel: 2 });
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
    startSession();
    r.frame();
    expect(r.take()).toEqual(['solver.cancel', ...SET_FRAMES, 'anchors.restore']);
    expect(r.restores).toHaveLength(1);
    expect(r.restores[0]).toMatchObject({ handle: HANDLE, timeoutMs: ANCHOR_RESTORE_TIMEOUT_MS });
    r.frame();
    r.frame();
    expect(r.take()).toEqual([...SET_FRAMES, ...SET_FRAMES]); // it waits: no chain, no second ask
  });

  it('the store is asked even when it says unsupported: it answers null at once, and then knows which anchor to delete', async () => {
    const r = rig();
    r.room.anchorsSupported = false;
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
    startSession();
    r.frame();
    expect(r.restores[0]?.handle).toBe(HANDLE);
    r.restores[0]!.resolve(null);
    await betweenFrames();
    r.frame();
    expect(r.runs).toHaveLength(1);
  });

  it('a pose in reach comes back: the bed is placed there at the saved level, restored, and the chain never runs', async () => {
    const r = rig();
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 2 });
    startSession();
    r.frame();
    const pose = at(0.1, 0.92, -0.4);
    r.restores[0]!.resolve(pose);
    await betweenFrames();
    expect(r.types()).toEqual([]); // the continuation only keeps the pose
    r.take();
    r.frame();
    expect(r.take()).toEqual([
      ...SET_FRAMES,
      'room:placementLevel',
      'room:bedPlaced',
      'extract',
      'room:features',
    ]);
    expect(r.events[0]!.payload).toEqual({ level: 2 });
    expect(r.events[1]!.payload).toEqual({ placement: { pose, level: 2 }, restored: true });
    expect(r.events[1]!.bed).toMatchObject({ isPlaced: true, isShown: true, pose });
    expect(r.bed.data.get(BedAnchor)).toEqual({ heightOffset: 0, source: 'surface' });
    expect(r.runs).toEqual([]);
    // Never in a restored session: no new anchor, so no room:anchored.
    r.frame();
    await betweenFrames();
    r.frame();
    expect(r.creates).toEqual([]);
    expect(r.types()).not.toContain('room:anchored');
  });

  it('the reach of D-041: head to bed centre at most 0.45 m + 0.10 m, measured level, and in front of the user', async () => {
    const reachM = BED_CENTRE_MAX_M + RESTORE_REACH_SLACK_M;
    expect(reachM).toBeCloseTo(0.55, 12);
    const cases: [string, number[], boolean][] = [
      ['at the edge of reach', at(0, 0.74, -reachM + 0.001), true],
      ['a centimetre past it', at(0, 0.74, -reachM - 0.01), false],
      ['lower, yet near on the floor plan: the distance is measured level', at(0.3, 0.55, -0.4), true],
      ['to the side, past reach', at(0.56, 0.74, -0.01), false],
      ['behind the user, however near', at(0, 0.74, 0.2), false],
      ['beside the user, not in front', at(0.3, 0.74, 0), false],
      // The heights the solver allows itself (FR-ROOM-01, D-034), 0.5 m above the floor up to 0.25 m below the
      // eyes, each with D-041's 0.10 m of slack.
      ['on the floor, however near', at(0, 0.1, -0.4), false],
      ['just under 0.4 m', at(0, 0.39, -0.4), false],
      ['at 0.4 m', at(0, 0.4, -0.4), true],
      ['0.25 m below the eyes: the floating bed', at(0, EYE_M - 0.25, -0.45), true],
      ['0.15 m below the eyes', at(0, EYE_M - 0.15, -0.45), true],
      ['less than 0.15 m below the eyes', at(0, EYE_M - 0.14, -0.45), false],
    ];
    for (const [name, pose, isKept] of cases) {
      const r = rig();
      r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
      startSession();
      r.frame();
      r.restores[0]!.resolve(pose);
      await betweenFrames();
      r.frame();
      expect(r.types().includes('room:bedPlaced'), name).toBe(isKept);
      expect(r.runs.length, name).toBe(isKept ? 0 : 1); // out of reach: placed again by the chain
      stops.splice(0).forEach((stop) => stop());
    }
  });

  it('a head pitched down at the table still faces it: in front is level, square to the head right vector', async () => {
    for (const pitchDeg of [-80, -90]) {
      const r = rig();
      r.head.matrixWorld.fromArray(headAt(0, EYE_M, 0, 0, pitchDeg));
      r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
      startSession();
      r.frame();
      r.restores[0]!.resolve(ON_TABLE.pose);
      await betweenFrames();
      r.frame();
      expect(r.types().includes('room:bedPlaced'), `pitch ${pitchDeg}`).toBe(true);
      expect(r.runs, `pitch ${pitchDeg}`).toEqual([]);
      stops.splice(0).forEach((stop) => stop());
    }
  });

  it('a floating bed restored with the eyes 3 cm lower than on the day it was placed is kept (D-041 slack)', async () => {
    const r = rig();
    r.head.matrixWorld.makeTranslation(0, EYE_M - 0.03, 0);
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 4 });
    startSession();
    r.frame();
    r.restores[0]!.resolve(FLOATING.pose); // placed 0.25 m below eyes at EYE_M
    await betweenFrames();
    r.frame();
    expect(r.events.find((event) => event.type === 'room:bedPlaced')?.payload).toEqual({
      placement: { pose: FLOATING.pose, level: 4 },
      restored: true,
    });
    expect(r.runs).toEqual([]);
  });

  it('a handle with no level is no pair (API_SPEC §4): the chain places the bed and the store is not asked', () => {
    const r = rig();
    r.gardenChanged({ anchorHandle: HANDLE }); // a state the save validator would never let through
    startSession();
    r.frame();
    expect(r.restores).toEqual([]);
    expect(r.runs).toHaveLength(1);
  });

  it('reach follows where the user sits and faces today: the same pose is kept from one chair and not from another', async () => {
    for (const [headX, yawRad, isKept] of [
      [0, 0, true],
      [0.8, 0, false], // sat down at another chair
      [0, Math.PI, false], // the bed is behind the user
    ] as const) {
      const r = rig();
      r.head.matrixWorld.makeRotationY(yawRad).setPosition(headX, EYE_M, 0);
      r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
      startSession();
      r.frame();
      r.restores[0]!.resolve(ON_TABLE.pose);
      await betweenFrames();
      r.frame();
      expect(r.types().includes('room:bedPlaced'), `head ${headX} yaw ${yawRad}`).toBe(isKept);
      stops.splice(0).forEach((stop) => stop());
    }
  });

  it('an out-of-reach bed and a null both run the chain, whose bed is not restored and gets a new anchor', async () => {
    for (const answer of [at(0, 0.74, -2), null]) {
      const r = rig();
      r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
      startSession();
      r.frame();
      r.restores[0]!.resolve(answer);
      await betweenFrames();
      r.take();
      r.frame();
      expect(r.take()).toEqual([...SET_FRAMES, 'solver.run', 'solver.update']);
      expect(r.bedNow()).toMatchObject({ isPlaced: false, isShown: false });
      r.runs[0]!.resolve(ON_TABLE);
      await betweenFrames();
      r.frame();
      expect(r.events.find((event) => event.type === 'room:bedPlaced')?.payload).toEqual({
        placement: ON_TABLE,
        restored: false,
      });
      expect(r.creates).toHaveLength(1);
      stops.splice(0).forEach((stop) => stop());
    }
  });

  it('a store that never answers: nothing is placed and no chain runs; the session end still clears up', async () => {
    const r = rig();
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
    startSession();
    for (let i = 0; i < 400; i++) r.frame(); // 5.6 s: the time-out is the store's own, not this system's
    expect(r.runs).toEqual([]);
    expect(r.types()).toEqual([]);
    endSession();
    r.restores[0]!.resolve(ON_TABLE.pose); // an answer for a session that is over
    await betweenFrames();
    r.frame();
    expect(r.types()).toEqual([]);
    expect(r.bedNow()).toMatchObject({ isPlaced: false, isShown: false });
  });

  it('a head pose that cannot be used yet: the answer waits for one, and the saved place is not given up for it', async () => {
    const r = rig();
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
    startSession();
    r.frame();
    r.restores[0]!.resolve(ON_TABLE.pose);
    await betweenFrames();
    r.head.matrixWorld.elements[12] = Number.NaN;
    r.frame();
    r.head.matrixWorld.set(0, 1, 0, 0, -1, 0, 0, 1.6, 0, 0, 1, 0, 0, 0, 0, 1); // on its side: no level forward
    r.frame();
    expect(r.runs).toEqual([]);
    expect(r.types()).toEqual([]);
    r.head.matrixWorld.makeTranslation(0, EYE_M, 0);
    r.frame();
    expect(r.types()).toEqual(['room:placementLevel', 'room:bedPlaced', 'room:features']);
  });

  it('a restored bed waits for planes before the room is read, for at most the 3 s since the session began', async () => {
    // The extractor cannot tell "no planes yet" from "no planes" (LLD §5.8), and bed and features are one frame.
    const r = rig();
    r.room.planes = [];
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
    startSession();
    r.frame();
    r.frame(1000);
    r.restores[0]!.resolve(ON_TABLE.pose);
    await betweenFrames();
    r.frame();
    r.frame(1000);
    expect(r.types()).toEqual([]);
    r.room.planes = [A_PLANE];
    r.frame();
    expect(r.types()).toEqual(['room:placementLevel', 'room:bedPlaced', 'room:features']);
    expect(r.runs).toEqual([]);

    // No plane ever: placed when the 3 s are over, counted from the session's first frame.
    const empty = rig();
    empty.room.planes = [];
    empty.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
    startSession();
    empty.frame();
    empty.restores[0]!.resolve(ON_TABLE.pose);
    await betweenFrames();
    empty.frame(PLANE_LEVELS_TIMEOUT_MS - FRAME_MS);
    expect(empty.types()).toEqual([]);
    empty.frame(2 * FRAME_MS);
    expect(empty.types()).toEqual(['room:placementLevel', 'room:bedPlaced', 'room:features']);

    // A session without plane detection has nothing to wait for; a bed placed by the chain never waits.
    const without = rig();
    without.room.planes = 'unsupported';
    without.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
    startSession();
    without.frame();
    without.restores[0]!.resolve(ON_TABLE.pose);
    await betweenFrames();
    without.frame();
    expect(without.types()).toEqual(['room:placementLevel', 'room:bedPlaced', 'room:features']);
    // A bed saved at level 3 or 4 is Wanderer whatever the room gives: it lands at once, with no wait.
    for (const anchorLevel of [3, 4] as const) {
      const off = rig();
      off.room.planes = [];
      off.gardenChanged({ anchorHandle: HANDLE, anchorLevel });
      startSession();
      off.frame();
      off.restores[0]!.resolve(ON_TABLE.pose);
      await betweenFrames();
      off.frame();
      expect(off.types(), `level ${anchorLevel}`).toEqual([
        'room:placementLevel',
        'room:bedPlaced',
        'room:features',
      ]);
      expect(off.readPlanes, `level ${anchorLevel}`).not.toHaveBeenCalled();
    }
    const chain = rig();
    chain.room.planes = [];
    await chain.place();
    expect(chain.types()).toEqual(['room:bedPlaced', 'room:features']);
    expect(chain.readPlanes).not.toHaveBeenCalled();
  });
});

describe('RoomSystem: the placed step (LLD §3.2 placed; API_SPEC §1.10 rules 4 and 5)', () => {
  it('runs in the update after the chain resolved, never in the continuation, and all of it in that one update, in order', async () => {
    const r = rig();
    startSession();
    r.frame();
    r.runs[0]!.resolve(ON_TABLE);
    await betweenFrames();
    r.take();
    expect(r.bedNow()).toMatchObject({ isPlaced: false, isShown: false }); // the continuation only kept it
    r.frame();
    expect(r.take()).toEqual([...SET_FRAMES, 'room:bedPlaced', 'extract', 'room:features', 'anchors.create']);
    const [placed, features] = r.events;
    // In the frame of the event the entity is at the placement's pose, shown, and carries BedAnchor.
    expect(placed!.payload).toEqual({ placement: ON_TABLE, restored: false });
    expect(placed!.bed).toEqual({ isPlaced: true, isShown: true, pose: ON_TABLE.pose, hasHint: false });
    expect(features!.payload).toEqual({ features: FEATURES, surfaces: SURFACES });
    expect(r.extract).toHaveBeenCalledExactlyOnceWith(ON_TABLE);
    expect(r.creates[0]!.pose).toEqual(ON_TABLE.pose);
    // The chain emitted its own room:placementLevel while it ran: the system adds none for it.
    expect(r.types()).not.toContain('room:placementLevel');
    for (let i = 0; i < 5; i++) r.frame();
    expect(r.take().filter((call) => !call.endsWith('.setFrame'))).toEqual([]); // once per placement
  });

  it.each([
    [1, 'table'],
    [2, 'surface'],
    [3, 'hittest'],
    [4, 'floating'],
  ] as const)(
    'BedAnchor of a level-%i bed: source %s, passed to addComponent with the offset',
    async (level, source) => {
      const r = rig();
      r.gardenChanged({ bedHeightOffset: 0.05 });
      await r.place({ pose: at(0, 0.8, -0.4), level });
      expect(r.bed.data.get(BedAnchor)).toEqual({ heightOffset: 0.05, source });
      expect(r.bed.ops).toEqual(['add']);
    },
  );

  it('the bed is drawn raised by bedHeightOffset; the placement, and the anchor made from it, are the surface', async () => {
    const r = rig();
    r.gardenChanged({ bedHeightOffset: 0.08 });
    await r.place();
    expect(r.events[0]!.bed.pose).toEqual(at(0, 0.74 + 0.08, -0.45));
    expect(r.events[0]!.payload).toEqual({ placement: ON_TABLE, restored: false });
    expect(r.creates[0]!.pose).toEqual(ON_TABLE.pose);
  });

  it('a changed bedHeightOffset while placed moves the bed at once; the same offset again, with an empty diff, does not', async () => {
    const r = rig();
    await r.place();
    const update = vi.spyOn(r.bed.object3D, 'updateMatrixWorld');
    r.gardenChanged({ bedHeightOffset: -0.1 });
    expect(r.bedNow().pose[13]).toBeCloseTo(0.64, 12); // read in the same call: the world matrix is current
    expect(update).toHaveBeenCalledExactlyOnceWith(true);
    expect(r.bed.data.get(BedAnchor)).toMatchObject({ heightOffset: -0.1 });
    r.gardenChanged({ bedHeightOffset: -0.1 }); // a visit, a plant: the offset is the same
    expect(update).toHaveBeenCalledTimes(1);
    r.gardenChanged({ bedHeightOffset: 0.02 });
    expect(r.bedNow().pose[13]).toBeCloseTo(0.76, 12);
    // Changed with no bed placed: kept for the next placement, nothing moved.
    endSession();
    r.gardenChanged({ bedHeightOffset: 0.1 });
    expect(update).toHaveBeenCalledTimes(2);
    await r.place();
    expect(r.bedNow().pose[13]).toBeCloseTo(0.84, 12);
  });

  it('room:anchored comes in the update after create() gave a handle, with the level of the bed; null emits nothing', async () => {
    const r = rig();
    await r.place({ pose: at(0, 0.9, -0.4), level: 2 });
    r.creates[0]!.resolve(HANDLE);
    await betweenFrames();
    expect(r.types()).toEqual(['room:bedPlaced', 'room:features']); // not from the continuation
    r.frame();
    expect(r.events[2]).toMatchObject({ type: 'room:anchored', payload: { handle: HANDLE, level: 2 } });
    r.frame();
    expect(r.types()).toHaveLength(3); // once

    const none = rig();
    await none.place();
    none.creates[0]!.resolve(null); // no anchor could be made: not an error
    await betweenFrames();
    none.frame();
    expect(none.types()).toEqual(['room:bedPlaced', 'room:features']);
  });

  it('room:features always follows room:bedPlaced: with only { level } when the room gives nothing', async () => {
    const r = rig();
    r.room.features = { level: 4 };
    r.system.extractor.surfaces = {};
    await r.place(FLOATING);
    expect(r.events[1]).toMatchObject({
      type: 'room:features',
      payload: { features: { level: 4 }, surfaces: {} },
    });
  });

  it('...when the extractor throws: the level alone, logged, in the same update; and when a handler of room:bedPlaced throws', async () => {
    const errors = vi.spyOn(log, 'error').mockImplementation(() => {});
    const r = rig();
    r.room.features = 'throws';
    stops.push(
      bus.on('room:bedPlaced', () => {
        throw new Error('planted in a handler');
      }),
    );
    await r.place({ pose: at(0, 0.9, -0.4), level: 2 });
    expect(r.types()).toEqual(['room:bedPlaced', 'room:features']);
    expect(r.events[1]!.payload).toEqual({ features: { level: 2 }, surfaces: {} });
    expect(errors.mock.calls.map((call) => `${call[0]} ${call[1]}`)).toEqual([
      'events a handler of room:bedPlaced threw',
      'room the room read threw: no features',
    ]);
    expect(r.creates).toHaveLength(1); // and the anchor is still made
  });

  it('a throw before the events, then the retry of the breaker: every event once, in order, nothing missing', async () => {
    const r = rig();
    startSession();
    r.frame();
    r.runs[0]!.resolve(ON_TABLE);
    await betweenFrames();
    r.bed.fail = 'addComponent';
    expect(() => r.frame()).toThrow('planted in addComponent'); // src/app.ts catches it and waits 1 s
    expect(r.types()).toEqual([]);
    r.take();
    r.frame(1000);
    expect(r.take()).toEqual([...SET_FRAMES, 'room:bedPlaced', 'extract', 'room:features', 'anchors.create']);
    expect(r.events[0]!.bed).toEqual({ isPlaced: true, isShown: true, pose: ON_TABLE.pose, hasHint: false });
    expect(r.bed.ops).toEqual(['add']);
    r.frame(1000);
    expect(r.types()).toEqual(['room:bedPlaced', 'room:features']);
  });

  it('a throw after the events, then the retry: no event is sent a second time, and the chain does not run again', async () => {
    const r = rig();
    r.room.createThrows = true; // the contract says it never does
    startSession();
    r.frame();
    r.runs[0]!.resolve(ON_TABLE);
    await betweenFrames();
    expect(() => r.frame()).toThrow('planted in create');
    expect(r.types()).toEqual(['room:bedPlaced', 'room:features']);
    r.take();
    for (let i = 0; i < 3; i++) r.frame(1000);
    expect(r.take().filter((call) => !call.endsWith('.setFrame'))).toEqual([]);
    expect(r.bedNow()).toMatchObject({ isPlaced: true, isShown: true });
  });
});

describe('RoomSystem: the end of a session, and the next one (LLD §3.3 H and I)', () => {
  it('session end while placed: the solver is cancelled, the bed hidden, BedAnchor off', async () => {
    const r = rig();
    await r.place();
    r.take();
    endSession();
    expect(r.take()).toEqual(['solver.cancel']);
    expect(r.bedNow()).toMatchObject({ isPlaced: false, isShown: false });
    expect(r.bed.ops).toEqual(['add', 'remove']);
    r.frame();
    expect(r.take()).toEqual(SET_FRAMES);
  });

  it('session end while placing: a bed that still arrives is dropped', async () => {
    const r = rig();
    startSession();
    r.frame();
    endSession();
    // The real solver never settles a cancelled run. Even if one did, nothing of an ended session is placed.
    r.runs[0]!.resolve(ON_TABLE);
    await betweenFrames();
    r.frame();
    r.frame();
    expect(r.types()).toEqual([]);
    expect(r.bedNow()).toMatchObject({ isPlaced: false, isShown: false });
    expect(r.bed.ops).toEqual([]);
  });

  it('session end between the chain and the placed step: the kept bed is dropped', async () => {
    const r = rig();
    startSession();
    r.frame();
    r.runs[0]!.resolve(ON_TABLE);
    await betweenFrames();
    endSession();
    r.frame();
    expect(r.types()).toEqual([]);
  });

  it('session end while create() is on its way: its handle is not announced, in that session or the next', async () => {
    const r = rig();
    await r.place();
    endSession();
    r.creates[0]!.resolve(HANDLE);
    await betweenFrames();
    r.frame();
    startSession();
    r.frame();
    r.frame();
    expect(r.types()).toEqual(['room:bedPlaced', 'room:features']);
  });

  it('a handle create() gave just before the session ended, or before Re-place, is never announced for the next bed', async () => {
    for (const end of [endSession, 'replace'] as const) {
      const r = rig();
      await r.place();
      r.creates[0]!.resolve(HANDLE);
      await betweenFrames(); // kept for the next frame, which does not come in this placement
      if (end === 'replace') r.system.replace();
      else {
        end();
        startSession();
      }
      r.frame();
      r.runs[1]!.resolve(FLOATING);
      await betweenFrames();
      r.frame();
      r.frame();
      expect(r.types(), String(end)).toEqual([
        'room:bedPlaced',
        'room:features',
        'room:bedPlaced',
        'room:features',
      ]);
      r.creates[1]!.resolve('the-new-handle');
      await betweenFrames();
      r.frame();
      expect(r.events[r.events.length - 1]!.payload, String(end)).toEqual({
        handle: 'the-new-handle',
        level: 4,
      });
      stops.splice(0).forEach((stop) => stop());
    }
  });

  it('a pose read again just before the session ended, or before Re-place, is never used for the next bed', async () => {
    const STALE = at(0.2, 0.74, -0.4);
    for (const end of ['session', 'replace'] as const) {
      const r = rig();
      r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
      startSession();
      r.frame();
      r.restores[0]!.resolve(ON_TABLE.pose);
      await betweenFrames();
      r.frame(); // placed, restored
      bus.emit('xr:visibility', { visible: true }); // a return from a pause: the pose is read again
      r.restores[1]!.resolve(STALE);
      await betweenFrames(); // kept for the next frame
      if (end === 'replace') {
        r.system.replace();
        r.frame();
        r.runs[0]!.resolve(ON_TABLE);
        await betweenFrames();
        r.frame();
        r.frame();
        expect(r.bedNow().pose, end).toEqual(ON_TABLE.pose); // the chain's bed stays where the chain put it
      } else {
        endSession();
        startSession();
        r.frame();
        r.frame();
        expect(r.restores, end).toHaveLength(3); // the next session asks the store anew
        expect(
          r.types().filter((type) => type === 'room:bedPlaced'),
          end,
        ).toHaveLength(1);
      }
      stops.splice(0).forEach((stop) => stop());
    }
  });

  it('a start answer kept for the next frame, then Re-place: the chain places the bed, and that answer moves nothing', async () => {
    const r = rig();
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
    startSession();
    r.frame();
    r.restores[0]!.resolve(at(0.2, 0.74, -0.4));
    await betweenFrames(); // kept, not yet judged
    r.system.replace();
    r.frame();
    r.runs[0]!.resolve(ON_TABLE);
    await betweenFrames();
    r.frame();
    r.frame();
    expect(r.events.find((event) => event.type === 'room:bedPlaced')?.payload).toEqual({
      placement: ON_TABLE,
      restored: false,
    });
    expect(r.bedNow().pose).toEqual(ON_TABLE.pose);
  });

  it('a second session in the same page places the bed again: by the chain, or from the pair the first one left', async () => {
    const r = rig();
    // The garden's part (GardenSystem): it drops the pair on a fresh bed and stores the new one. Its
    // garden:changed reaches this system from inside this system's own emits.
    stops.push(
      bus.on('room:bedPlaced', ({ restored }) => {
        if (!restored) r.gardenChanged({});
      }),
      bus.on('room:anchored', ({ handle, level }) =>
        r.gardenChanged({ anchorHandle: handle, anchorLevel: level }),
      ),
    );
    await r.place();
    endSession();
    await r.place(FLOATING); // no handle came in the first session: the chain again
    expect(r.runs).toHaveLength(2);
    expect(r.restores).toEqual([]);
    r.creates[1]!.resolve(HANDLE);
    await betweenFrames();
    r.frame();
    endSession();

    startSession();
    r.frame();
    expect(r.restores[0]).toMatchObject({ handle: HANDLE });
    r.restores[0]!.resolve(FLOATING.pose);
    await betweenFrames();
    r.frame();
    expect(r.events[r.events.length - 2]!.payload).toEqual({
      placement: { pose: FLOATING.pose, level: 4 },
      restored: true,
    });
    expect(r.runs).toHaveLength(2);
    expect(r.types()).toEqual([
      ...['room:bedPlaced', 'room:features'],
      ...['room:bedPlaced', 'room:features', 'room:anchored'],
      ...['room:placementLevel', 'room:bedPlaced', 'room:features'],
    ]);
  });
});

describe('RoomSystem: replace() (FR-ROOM-05; LLD §3.3 L)', () => {
  it('while placed: the anchor is cleared, the bed hidden and BedAnchor off; the chain runs, never a restore', async () => {
    const r = rig();
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 }); // a saved pair does not bring the old place back
    startSession();
    r.frame();
    r.restores[0]!.resolve(ON_TABLE.pose);
    await betweenFrames();
    r.frame();
    r.take();

    r.system.replace();
    expect(r.take()).toEqual(['anchors.clear', 'solver.cancel']);
    expect(r.bedNow()).toMatchObject({ isPlaced: false, isShown: false });
    r.frame();
    expect(r.take()).toEqual([...SET_FRAMES, 'solver.run', 'solver.update']);
    const moved: BedPlacement = { pose: at(0.2, 0.74, -0.4), level: 1 };
    r.runs[0]!.resolve(moved);
    await betweenFrames();
    r.frame();
    expect(r.take()).toEqual([...SET_FRAMES, 'room:bedPlaced', 'extract', 'room:features', 'anchors.create']);
    expect(r.events[r.events.length - 2]!.payload).toEqual({ placement: moved, restored: false });
    expect(r.bedNow()).toMatchObject({ isPlaced: true, isShown: true, pose: moved.pose });
    expect(r.restores).toHaveLength(1);
  });

  it('while placing: the chain takes over, and what the old restore or the old run still answers is dropped', async () => {
    const r = rig();
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
    startSession();
    r.frame();
    r.system.replace();
    r.restores[0]!.resolve(ON_TABLE.pose);
    await betweenFrames();
    r.frame();
    expect(r.types()).toEqual([]);
    expect(r.runs).toHaveLength(1);
    r.system.replace(); // again, while the chain runs
    r.runs[0]!.resolve(ON_TABLE);
    await betweenFrames();
    r.frame();
    expect(r.types()).toEqual([]);
    expect(r.runs).toHaveLength(2);
    r.runs[1]!.resolve(FLOATING);
    await betweenFrames();
    r.frame();
    expect(r.events[0]!.payload).toEqual({ placement: FLOATING, restored: false });
  });

  it('a create() that was on its way when the bed is placed again is not announced for the new bed', async () => {
    const r = rig();
    await r.place();
    r.system.replace();
    r.creates[0]!.resolve(HANDLE);
    await betweenFrames();
    r.frame();
    r.runs[1]!.resolve(FLOATING);
    await betweenFrames();
    r.frame();
    r.frame();
    expect(r.types()).not.toContain('room:anchored');
  });
});

/** A pinch in the air, let go: the machine's release of a pinch that started on nothing. */
const RELEASE_ON_NOTHING: EventMap['gesture:release'] = {
  type: 'gesture:release',
  hand: 'right',
  gesture: 'none',
  target: null,
  pos: { x: 0, y: 1, z: -0.3 },
  zone: 'outer',
  cell: null,
  dy: null,
};
/** The same pinch as it begins. */
const PINCH_ON_NOTHING: EventMap['gesture:pinchStart'] = {
  type: 'gesture:pinchStart',
  hand: 'right',
  target: null,
  pos: { x: 0, y: 1, z: -0.3 },
};
/** A whole pinch of `hand`: it begins, and it is let go with `release`'s changes. */
function pinch(hand: 'left' | 'right', release: Partial<EventMap['gesture:release']> = {}): void {
  bus.emit('gesture:pinchStart', { ...PINCH_ON_NOTHING, hand });
  bus.emit('gesture:release', { ...RELEASE_ON_NOTHING, hand, ...release });
}

describe('RoomSystem: level 3, the ghost and the confirm (UX §9.2; LLD §3.5 c2)', () => {
  const ON_SPOT: BedPlacement = { pose: at(0, 0.7, -0.4), level: 3 };

  it('while the solver has a preview the bed shows there as a ghost: visible, no BedAnchor, one hint for the 10 s', () => {
    const r = rig();
    startSession();
    r.frame();
    r.frame();
    expect(r.bedNow()).toMatchObject({ isShown: false, hasHint: false }); // levels 1 and 2: the room, nothing else
    r.room.preview = ON_SPOT;
    r.frame();
    r.bed.object3D.updateMatrixWorld(true); // the render does this for the ghost
    expect(r.bedNow()).toEqual({ isPlaced: false, isShown: true, pose: ON_SPOT.pose, hasHint: true });
    expect(r.hint.data.get(Caption)).toEqual({
      key: 'placeLook',
      expiresAt: r.wallMs() + HIT_TEST_TIMEOUT_MS,
    });
    for (let i = 0; i < 10; i++) r.frame();
    expect(r.hint.ops).toEqual(['add']); // raised once, not in every frame
    expect(r.types()).toEqual([]);
  });

  it('in gaze mode the hint is the one for a dwell', () => {
    settings.set({ gazeDwell: true });
    const r = rig();
    startSession();
    r.room.preview = ON_SPOT;
    r.frame();
    expect(r.hint.data.get(Caption)).toMatchObject({ key: 'placeLookGaze' });
  });

  it('the ghost follows the preview with a 100 ms ease, and rides at the bed height offset', () => {
    const r = rig();
    r.gardenChanged({ bedHeightOffset: 0.05 });
    startSession();
    r.room.preview = ON_SPOT;
    r.frame();
    const { position, quaternion } = r.bed.object3D;
    expect(position.toArray()).toEqual([0, 0.7 + 0.05, -0.4]); // the first frame puts it there
    // The gaze jumps 10 cm to the right and the bed would turn by 90 degrees.
    r.room.preview = { pose: [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0.1, 0.7, -0.4, 1], level: 3 };
    r.frame(GHOST_EASE_MS);
    expect(position.x).toBeCloseTo(0.1 * (1 - 1 / Math.E), 9); // one time constant: 63 % of the way
    expect(2 * Math.acos(quaternion.w)).toBeCloseTo((Math.PI / 2) * (1 - 1 / Math.E), 9);
    for (let i = 0; i < 100; i++) r.frame();
    expect(position.x).toBeCloseTo(0.1, 6);
    expect(position.y).toBeCloseTo(0.75, 6);
  });

  it('the placed step puts the bed at the placement exactly, takes the hint back and adds BedAnchor', async () => {
    const r = rig();
    startSession();
    r.frame();
    r.room.preview = ON_SPOT;
    r.frame();
    r.room.preview = null; // the solver resolved: it has no preview any more
    r.runs[0]!.resolve(ON_SPOT);
    await betweenFrames();
    expect(r.bedNow()).toMatchObject({ isPlaced: false, isShown: true, hasHint: true }); // no blink before it lands
    r.frame();
    expect(r.events[0]!.bed).toEqual({ isPlaced: true, isShown: true, pose: ON_SPOT.pose, hasHint: false });
    expect(r.bed.data.get(BedAnchor)).toMatchObject({ source: 'hittest' });
    expect(r.hint.ops).toEqual(['add', 'remove']);
  });

  it('a hint the caption system already took down is not removed a second time', async () => {
    const r = rig();
    startSession();
    r.room.preview = ON_SPOT;
    r.frame();
    r.hint.removeComponent(Caption); // CaptionSystem, at the hint's expiresAt
    r.runs[0]!.resolve(ON_SPOT);
    await betweenFrames();
    r.frame();
    expect(r.hint.ops).toEqual(['add', 'remove']);
  });

  it('the confirm by hand: a release of a pinch on nothing; a cancelled press and a release on a target confirm nothing', () => {
    const r = rig();
    startSession();
    r.frame();
    r.room.preview = ON_SPOT;
    r.frame(); // the ghost is up
    pinch('right');
    expect(r.confirm).toHaveBeenCalledTimes(1);
    pinch('left'); // either hand
    expect(r.confirm).toHaveBeenCalledTimes(2);
    pinch('right', { gesture: 'press' }); // a cancelled press: target null too
    pinch('right', { target: { kind: 'panel', id: 'replace' } });
    pinch('right', { gesture: 'carry' });
    bus.emit('gesture:release', { ...RELEASE_ON_NOTHING }); // a release with no pinch begun on the ghost
    expect(r.confirm).toHaveBeenCalledTimes(2);
  });

  it('a pinch begun before the ghost was up does not confirm when let go: the user had not aimed yet', () => {
    const r = rig();
    startSession();
    r.frame();
    bus.emit('gesture:pinchStart', { ...PINCH_ON_NOTHING }); // during the plane wait
    r.room.preview = FLOATING;
    r.frame(); // level 3 begins, the ghost is up
    bus.emit('gesture:release', { ...RELEASE_ON_NOTHING });
    expect(r.confirm).not.toHaveBeenCalled();
    // One begun on one ghost and let go on the next (a pause in between began the wait again) aimed at neither.
    bus.emit('gesture:pinchStart', { ...PINCH_ON_NOTHING });
    bus.emit('xr:visibility', { visible: true });
    r.frame();
    bus.emit('gesture:release', { ...RELEASE_ON_NOTHING });
    expect(r.confirm).not.toHaveBeenCalled();
    pinch('right'); // the next whole pinch on the ghost does
    expect(r.confirm).toHaveBeenCalledTimes(1);
  });

  it('confirm(), the gaze dwell: only while the preview is on a usable spot. A dwell never floats the bed', () => {
    const r = rig();
    startSession();
    r.frame();
    r.system.confirm(); // levels 1 and 2: no preview
    r.room.preview = { ...FLOATING };
    r.system.confirm(); // level 3 with the gaze on nothing usable: a confirm would float the bed
    expect(r.confirm).not.toHaveBeenCalled();
    r.room.preview = ON_SPOT;
    r.system.confirm();
    expect(r.confirm).toHaveBeenCalledTimes(1);
  });

  it('a pause while the chain runs: the chain starts again when the session is seen again, with nothing on screen', async () => {
    const r = rig();
    startSession();
    r.frame();
    r.room.preview = ON_SPOT;
    r.frame();
    r.take();
    bus.emit('xr:visibility', { visible: false });
    expect(r.take()).toEqual([]);
    r.room.preview = null;
    bus.emit('xr:visibility', { visible: true });
    expect(r.take()).toEqual(['solver.run']);
    expect(r.runs[1]!.timeoutMs).toBe(PLANE_LEVELS_TIMEOUT_MS);
    expect(r.bedNow()).toMatchObject({ isShown: false, hasHint: false });
    // The run that was dropped never settles; the new one's bed is placed once.
    r.runs[1]!.resolve(ON_SPOT);
    await betweenFrames();
    r.frame();
    expect(r.types()).toEqual(['room:bedPlaced', 'room:features']);
    // A second ghost in the same session raises the hint anew.
    r.system.replace();
    r.room.preview = ON_SPOT;
    r.frame();
    expect(r.hint.data.get(Caption)).toMatchObject({ expiresAt: r.wallMs() + HIT_TEST_TIMEOUT_MS });
  });

  it('a pause while a restore is on its way, or with the bed kept for the next frame, starts no chain', async () => {
    const r = rig();
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
    startSession();
    r.frame();
    bus.emit('xr:visibility', { visible: false });
    bus.emit('xr:visibility', { visible: true }); // the store pauses its own time-out
    expect(r.runs).toEqual([]);
    expect(r.restores).toHaveLength(1);

    const kept = rig();
    startSession();
    kept.frame();
    kept.runs[0]!.resolve(ON_TABLE);
    await betweenFrames();
    bus.emit('xr:visibility', { visible: true });
    kept.frame();
    expect(kept.runs).toHaveLength(1);
    expect(kept.types()).toEqual(['room:bedPlaced', 'room:features']);
  });

  it('a pause while a restored bed waits for planes: the 3 s start again, as the chain does', async () => {
    const r = rig();
    r.room.planes = [];
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
    startSession();
    r.frame();
    r.restores[0]!.resolve(ON_TABLE.pose);
    await betweenFrames();
    r.frame();
    bus.emit('xr:visibility', { visible: false });
    r.sleep(60_000); // no frame comes to a hidden session, and the frame time runs on
    bus.emit('xr:visibility', { visible: true });
    r.frame();
    r.frame(PLANE_LEVELS_TIMEOUT_MS - FRAME_MS);
    expect(r.types()).toEqual([]);
    r.frame(2 * FRAME_MS);
    expect(r.types()).toEqual(['room:placementLevel', 'room:bedPlaced', 'room:features']);
  });
});

describe('RoomSystem: a placed bed after a pause and after a recentre (LLD §3.2; T-162)', () => {
  it('asks the store for the same handle again and moves the bed entity to the pose that comes back', async () => {
    const r = rig();
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1, bedHeightOffset: 0.05 });
    startSession();
    r.frame();
    r.restores[0]!.resolve(ON_TABLE.pose);
    await betweenFrames();
    r.frame();
    r.take();

    bus.emit('xr:visibility', { visible: false });
    expect(r.restores).toHaveLength(1);
    bus.emit('xr:visibility', { visible: true });
    expect(r.restores[1]).toMatchObject({ handle: HANDLE, timeoutMs: ANCHOR_RESTORE_TIMEOUT_MS });
    r.restores[1]!.resolve(at(0.03, 0.74, -0.43));
    await betweenFrames();
    expect(r.bedNow().pose).toEqual(at(0, 0.74 + 0.05, -0.45)); // not from the continuation
    r.frame();
    expect(r.bedNow().pose).toEqual(at(0.03, 0.74 + 0.05, -0.43)); // moved, world matrix current, offset kept

    (r.xr.space as unknown as EventTarget).dispatchEvent(new Event('reset')); // the user recentred
    expect(r.restores).toHaveLength(3);
    r.restores[2]!.resolve(null); // the anchor is not there any more: the bed stays where it is
    await betweenFrames();
    r.frame();
    expect(r.bedNow()).toMatchObject({ isPlaced: true, isShown: true, pose: at(0.03, 0.74 + 0.05, -0.43) });
    // Only the entity moves: no event, no chain, no new anchor.
    expect(r.take().filter((call) => !call.endsWith('.setFrame'))).toEqual([
      'anchors.restore',
      'anchors.restore',
    ]);
  });

  it('asks nothing with no saved pair, and nothing while the bed is being placed', async () => {
    const r = rig();
    await r.place();
    bus.emit('xr:visibility', { visible: true });
    (r.xr.space as unknown as EventTarget).dispatchEvent(new Event('reset'));
    expect(r.restores).toEqual([]);

    const placing = rig();
    placing.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
    startSession();
    placing.frame();
    (placing.xr.space as unknown as EventTarget).dispatchEvent(new Event('reset'));
    expect(placing.restores).toHaveLength(1);
    expect(placing.runs).toEqual([]);
  });

  it('listens to each reference space once, and to the one of the next session', async () => {
    const r = rig();
    r.gardenChanged({ anchorHandle: HANDLE, anchorLevel: 1 });
    const first = r.xr.space as unknown as EventTarget;
    const listen = vi.spyOn(first, 'addEventListener');
    startSession();
    for (let i = 0; i < 5; i++) r.frame();
    expect(listen).toHaveBeenCalledTimes(1);
    r.restores[0]!.resolve(ON_TABLE.pose);
    await betweenFrames();
    r.frame();
    r.xr.space = new EventTarget() as unknown as XRReferenceSpace;
    r.frame();
    (r.xr.space as unknown as EventTarget).dispatchEvent(new Event('reset'));
    expect(r.restores).toHaveLength(2);
  });
});

describe('RoomSystem: a frame with the bed placed costs nothing', () => {
  it('update creates no objects, and takes far less than a frame may (NFR-PERF-05)', async () => {
    const ROUNDS = 50_000;
    const r = rig();
    await r.place();
    r.creates[0]!.resolve(HANDLE);
    await betweenFrames();
    r.frame();
    expect(r.types()).toEqual(['room:bedPlaced', 'room:features', 'room:anchored']);
    vi.restoreAllMocks(); // the spies record every call, which allocates: plain functions take their place
    const { planes, meshes, hits, anchors } = r.system;
    let setFrames = 0;
    planes.setFrame = meshes.setFrame = hits.setFrame = anchors.setFrame = () => void setFrames++;
    // Real-size times at 72 Hz that exist before the loops (see tests/unit/hands/HandSystem.test.ts).
    const TIMES: unknown[] = [null];
    for (let i = 1; i <= 7 * ROUNDS; i++) TIMES.push(FRAME_START_S + 1 + i * 0.013889);
    let frames = 0;
    const round = (): void => {
      for (let i = 0; i < ROUNDS; i++) r.system.update(0.013889, TIMES[++frames] as number);
    };
    round(); // warm up: the JIT's own allocations happen here
    round();
    const startedMs = performance.now();
    const costs = Array.from({ length: 5 }, () => heapCost(round));
    const msPerFrame = (performance.now() - startedMs) / (5 * ROUNDS);
    const clean = costs.filter((cost) => cost.gcs === 0 && cost.grewBytes < PROBE_BYTES);
    expect(clean.length, JSON.stringify(costs)).toBeGreaterThan(0);
    // 0.00015 to 0.00022 ms on a laptop (2026-10-13, three runs, on the fakes of this file, the probe's own time
    // included); 0.01 ms leaves room for a loaded machine. A frame's JavaScript may take 6 ms.
    expect(msPerFrame).toBeLessThan(0.01);
    expect(setFrames).toBe(4 * 7 * ROUNDS); // it did the work
    expect(r.bedNow()).toMatchObject({ isPlaced: true, isShown: true });
  }, 60_000);
});
