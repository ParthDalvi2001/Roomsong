// TC-ROOM-01 (the fallback chain, FR-ROOM-01) and TC-ROOM-02 (the reach clamp, FR-ROOM-03), plus the bed frame
// of D-029. Stub adapters and fake frames: nothing here shows what a headset or the emulator delivers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bus, flags, log } from '../../../src/core/index.js';
import { BED_OUTER } from '../../../src/garden/index.js';
import {
  BED_CENTRE_DEFAULT_M,
  BED_CENTRE_MAX_M,
  BED_CENTRE_MIN_M,
  BED_FAR_EDGE_MAX_M,
  FLOATING_DROP_M,
  HIT_TEST_TIMEOUT_MS,
  PLANE_LEVELS_TIMEOUT_MS,
} from '../../../src/room/config.js';
import { PlacementSolver } from '../../../src/room/PlacementSolver.js';
import { PlaneAdapter } from '../../../src/room/PlaneAdapter.js';
import { ROOMS } from '../../e2e/support/iwer';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

import { FakeXR, HEAD, headAt, NORMAL_DOWN, NORMAL_UP, poseOf, readRoom, sceneOf, yaw } from './fixtures.js';

import type { Flags, Mat4, Vec3 } from '../../../src/core/index.js';
import type { PlacementLevel } from '../../../src/garden/index.js';
import type { BedPlacement, RoomPlane } from '../../../src/room/types.js';

const FRAME_MS = 14;
const TOLERANCE_M = 1e-9;
const S = Math.SQRT1_2;

let levels: PlacementLevel[] = [];
let stopListening = (): void => {};
beforeEach(() => {
  levels = [];
  stopListening = bus.on('room:placementLevel', ({ level }) => levels.push(level));
  vi.spyOn(log, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  stopListening();
  vi.restoreAllMocks();
});

/** A fixture room's planes as the real PlaneAdapter reads them from a fake frame. */
function planesOf(room: (typeof ROOMS)[number]): RoomPlane[] {
  const xr = new FakeXR(sceneOf(readRoom(room)));
  const adapter = new PlaneAdapter();
  adapter.setFrame(xr.frame(), xr.space);
  return adapter.read();
}

/** A hand-made plane: `size` is its width along its own x and its depth along its own z. */
function surface(
  label: string,
  centre: readonly number[],
  size: readonly [number, number],
  orientation = NORMAL_DOWN,
): RoomPlane {
  return {
    id: `${label}@${centre.join()}`,
    label,
    pose: poseOf(centre, orientation),
    extents: { x: size[0], y: size[1] },
  };
}

const TABLE = surface('table', [0, 0.74, -0.5], [1.2, 0.8]);
const COUNTER = surface('other', [0, 0.92, -0.45], [2.4, 0.6]);

interface Setup {
  /** What plane detection reports; 'unsupported' = the session has none. */
  planes?: RoomPlane[] | 'unsupported';
  /** What the gaze ray hits; null = nothing; 'unsupported' = the session has no hit-test. */
  hit?: Vec3 | null | 'unsupported';
  flags?: Partial<Flags>;
}

/** A solver on stub adapters. `room` can be changed while a run is pending. */
function rig({ planes = 'unsupported', hit = 'unsupported', flags: forced = {} }: Setup = {}) {
  const room = { planes, hit };
  const solver = new PlacementSolver(
    {
      supported: () => room.planes !== 'unsupported',
      read: () => (room.planes === 'unsupported' ? [] : room.planes),
    },
    {
      supported: () => room.hit !== 'unsupported',
      hit: () => (room.hit === 'unsupported' ? null : room.hit),
    },
    { ...flags, ...forced },
  );
  return { solver, room };
}

/** One run to its end: frames half a second apart until every wait has expired, pinching on each if asked. */
function place(setup: Setup & { head?: Mat4; pinch?: boolean } = {}): Promise<BedPlacement> {
  const { solver } = rig(setup);
  const run = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
  for (let t = 0; t <= PLANE_LEVELS_TIMEOUT_MS + HIT_TEST_TIMEOUT_MS + 1000; t += 500) {
    if (setup.pinch) solver.confirm();
    solver.update(setup.head ?? HEAD, t);
  }
  return run;
}

/** Whether a promise has settled, after giving it every chance to. */
async function isSettled(promise: Promise<unknown>): Promise<boolean> {
  let settled = false;
  void promise.then(
    () => (settled = true),
    () => (settled = true),
  );
  for (let i = 0; i < 5; i++) await Promise.resolve();
  return settled;
}

const centreOf = (pose: Mat4): number[] => [pose[12]!, pose[13]!, pose[14]!];
/** The pose of a bed straight ahead of a user who looks down -z: no turn, the centre at (x, y, z). */
const unturnedAt = (x: number, y: number, z: number): number[] => poseOf([x, y, z]);

/** Equal to within a nanometre: the solver's sums and square roots are not exact to the last bit. */
function expectClose(actual: ArrayLike<number>, expected: readonly number[], note = ''): void {
  expect(actual.length, note).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) expect(actual[i], `${note} [${i}]`).toBeCloseTo(expected[i]!, 9);
}

/** How far, measured level, the bed centre is from the head. */
function centreDistanceM(pose: Mat4, head: Mat4): number {
  return Math.hypot(pose[12]! - head[12]!, pose[14]! - head[14]!);
}

/** FR-ROOM-03 and D-029 for one placement: in reach, level, +z at the head, +x to the user's right. */
function expectReachableAndFacing(pose: Mat4, head: Mat4, note: string): void {
  expect(Array.from(pose).every(Number.isFinite), note).toBe(true);
  const distM = centreDistanceM(pose, head);
  expect(distM, note).toBeGreaterThanOrEqual(BED_CENTRE_MIN_M - TOLERANCE_M);
  expect(distM, note).toBeLessThanOrEqual(BED_CENTRE_MAX_M + TOLERANCE_M);
  expect(distM + BED_OUTER, note).toBeLessThanOrEqual(BED_FAR_EDGE_MAX_M + TOLERANCE_M);
  // toUser: level, from the bed centre to the head. The user faces the bed, so their right is toBed x up.
  const toUser = [(head[12]! - pose[12]!) / distM, 0, (head[14]! - pose[14]!) / distM];
  const right = [toUser[2]!, 0, -toUser[0]!];
  const axes = [right, [0, 1, 0], toUser];
  for (let axis = 0; axis < 3; axis++) {
    for (let i = 0; i < 3; i++) expect(pose[axis * 4 + i], note).toBeCloseTo(axes[axis]![i]!, 9);
  }
  expect([pose[3], pose[7], pose[11], pose[15]], note).toEqual([0, 0, 0, 1]);
}

describe('PlacementSolver: the chain picks the first level that can place the bed (TC-ROOM-01)', () => {
  it('level 1 in every fixture room with a labelled table, on the table top', async () => {
    for (const [room, heightM] of [
      ['table', 0.74],
      ['tiny', 0.72],
      ['large', 0.75],
      ['no-walls', 0.74],
    ] as const) {
      const placement = await place({ planes: planesOf(room) });
      expect(placement.level, room).toBe(1);
      expect(placement.surfaceId, room).toBe('plane-0');
      expectClose(placement.pose, unturnedAt(0, heightM, -BED_CENTRE_DEFAULT_M), room);
    }
  });

  it('level 2 on the counter, which has no table label; level 4 in the room with no planes', async () => {
    const counter = await place({ planes: planesOf('counter') });
    expect(counter.level).toBe(2);
    expect(counter.surfaceId).toBe('plane-0');
    expectClose(counter.pose, unturnedAt(0, 0.92, -BED_CENTRE_DEFAULT_M));

    const none = await place({ planes: planesOf('none') });
    expect(none.level).toBe(4);
    expect(none.surfaceId).toBeUndefined();
  });

  it('a table wins over a counter whichever comes first, and `desk` is a table label too', async () => {
    expect((await place({ planes: [COUNTER, TABLE] })).surfaceId).toBe(TABLE.id);
    expect((await place({ planes: [TABLE, COUNTER] })).surfaceId).toBe(TABLE.id);
    const desk = surface('desk', [0, 0.74, -0.5], [1.2, 0.8]);
    expect(await place({ planes: [COUNTER, desk] })).toMatchObject({ level: 1, surfaceId: desk.id });
  });

  it('of two tables, the one under the default spot wins; of two under it, the first seen', async () => {
    const aside = surface('table', [0.6, 0.7, -0.45], [0.6, 0.6]); // in reach: its edge is 0.3 m to the side
    expect((await place({ planes: [aside] })).surfaceId).toBe(aside.id);
    expect((await place({ planes: [aside, TABLE] })).surfaceId).toBe(TABLE.id);
    expect((await place({ planes: [TABLE, aside] })).surfaceId).toBe(TABLE.id);
    // A tie: both are under the default spot, at different heights.
    const tray = surface('table', [0, 0.8, -0.45], [0.4, 0.4]);
    expect(await place({ planes: [TABLE, tray] })).toMatchObject({ surfaceId: TABLE.id });
    expect(await place({ planes: [tray, TABLE] })).toMatchObject({ surfaceId: tray.id });
  });

  it('a counter wins over the hit-test, the hit-test over floating, and floating is what is left', async () => {
    const hit = { x: 0, y: 0.6, z: -0.4 };
    expect((await place({ planes: [COUNTER], hit, pinch: true })).level).toBe(2);
    const onHit = await place({ planes: [], hit, pinch: true });
    expect(onHit.level).toBe(3);
    expect(onHit.surfaceId).toBeUndefined();
    expectClose(onHit.pose, unturnedAt(0, 0.6, -0.4));
    expect((await place({ planes: [], hit: null, pinch: true })).level).toBe(4);
    expect((await place()).level).toBe(4);
  });

  it('level 1 needs a level table, in front of the user and within reach (D-034)', async () => {
    const wallLabelledTable = surface('table', [0, 0.74, -0.5], [1.2, 0.8], [S, 0, 0, S]);
    const sideTableOutOfReach = surface('table', [0, 0.74, -1.2], [0.6, 0.6]); // its near edge is 0.9 m away
    const behind = surface('table', [0, 0.74, 0.5], [1.2, 0.8]); // its nearest point is 0.1 m behind the head
    for (const plane of [wallLabelledTable, sideTableOutOfReach, behind]) {
      expect((await place({ planes: [plane] })).level, plane.id).toBe(4);
    }
    // Turned round, the table behind is in front.
    expect((await place({ planes: [behind], head: headAt(0, 1.6, 0, 180) })).level).toBe(1);
  });

  it('reach is the surface point nearest the default spot: in at 0.74 m, out at 0.76 m, at either level', async () => {
    const tableFrom = (nearEdgeM: number, label: string) =>
      surface(label, [0, 0.74, -(nearEdgeM + 0.3)], [1, 0.6]);
    for (const label of ['table', 'other']) {
      const inReach = await place({ planes: [tableFrom(0.74, label)] });
      expect(inReach.level, label).toBe(label === 'table' ? 1 : 2);
      expectClose(centreOf(inReach.pose), [0, 0.74, -BED_CENTRE_MAX_M], label); // short of it: reach wins
      expect((await place({ planes: [tableFrom(0.76, label)] })).level, label).toBe(4);
    }
    // Measured level and from the head: the same table is out of reach from 2 cm farther back.
    const head = headAt(0, 1.6, 0.02);
    expect((await place({ planes: [tableFrom(0.74, 'table')], head })).level).toBe(4);
  });

  it('a big table counts from every seat, and so does a table the head is over (D-034)', async () => {
    // A 2.4 x 1.0 m dining table from its short end, the head 0.2 m back: its centre is 1.4 m away.
    const fromShortEnd = surface('table', [0, 0.74, -1.4], [1, 2.4]);
    // The same table from a corner seat on its long side: its centre is 1.26 m away.
    const fromCornerSeat = surface('table', [1.05, 0.74, -0.7], [2.4, 1]);
    for (const table of [fromShortEnd, fromCornerSeat]) {
      const placement = await place({ planes: [table] });
      expect(placement.level, table.id).toBe(1);
      expectClose(placement.pose, unturnedAt(0, 0.74, -BED_CENTRE_DEFAULT_M), table.id);
    }
    // The head over the centre of a 1.2 x 0.8 m table: it ends 0.40 m ahead, and the bed goes there.
    const under = await place({ planes: [surface('table', [0, 0.74, 0], [1.2, 0.8])] });
    expect(under.level).toBe(1);
    expectClose(under.pose, unturnedAt(0, 0.74, -0.4));
  });

  it('a plane less than 0.25 m below the eyes is not used, table or not', async () => {
    const seated = headAt(0, 1.2, 0);
    const highShelf = surface('table', [0, 1.5, -0.45], [1, 0.6]); // labelled a table, above seated eyes
    expect((await place({ planes: [highShelf], head: seated })).level).toBe(4);
    const counter = surface('other', [0, 1, -0.45], [1, 0.6]); // 0.20 m below seated eyes
    expect((await place({ planes: [counter], head: seated })).level).toBe(4);
    expect((await place({ planes: [counter], head: headAt(0, 1.3, 0) })).level).toBe(2);
    const labelled = surface('table', [0, 1, -0.45], [1, 0.6]);
    expect((await place({ planes: [labelled], head: seated })).level).toBe(4);
  });

  it('level 2 takes a level plane 0.5 to 1.1 m above the floor and nothing else', async () => {
    const at = (heightM: number) => surface('other', [0, heightM, -0.45], [1, 0.6]);
    expect((await place({ planes: [at(0.5)] })).level).toBe(2);
    expect((await place({ planes: [at(1.1)] })).level).toBe(2);
    expect((await place({ planes: [at(0.49)] })).level).toBe(4);
    expect((await place({ planes: [at(1.11)] })).level).toBe(4);
    // A low table is level 1 by its label; without the label it is too low.
    expect((await place({ planes: [surface('table', [0, 0.4, -0.45], [1, 0.6])] })).level).toBe(1);
  });
});

describe('PlacementSolver: the bed stays in seated reach (TC-ROOM-02)', () => {
  it('the default is 0.45 m forward, which puts the far edge exactly on the 0.75 m cap', async () => {
    expect(BED_CENTRE_DEFAULT_M + BED_OUTER).toBeCloseTo(BED_FAR_EDGE_MAX_M, 12);
    expect(BED_CENTRE_DEFAULT_M).toBe(BED_CENTRE_MAX_M);
    const { pose } = await place({ planes: [TABLE] });
    expectClose(pose, unturnedAt(0, 0.74, -0.45));
    expect(centreDistanceM(pose, HEAD) + BED_OUTER).toBeCloseTo(BED_FAR_EDGE_MAX_M, 9);
  });

  it('nearer only when the surface does not reach 0.45 m, and never below 0.35 m', async () => {
    const shelfTo = (farEdgeM: number, depthM: number) =>
      surface('other', [0, 0.8, -(farEdgeM - depthM / 2)], [1, depthM]);
    expectClose(centreOf((await place({ planes: [shelfTo(0.4, 0.3)] })).pose), [0, 0.8, -0.4]);
    expectClose(centreOf((await place({ planes: [shelfTo(0.2, 0.1)] })).pose), [0, 0.8, -0.35]);
    // Sitting over a narrow surface that ends 0.30 m ahead: the bed centre goes to the 0.35 m minimum.
    const under = surface('other', [0, 0.8, 0], [2, 0.5]);
    const head = headAt(0, 1.6, 0.05, 0, -30);
    expectClose(centreOf((await place({ planes: [under], head })).pose), [0, 0.8, 0.05 - BED_CENTRE_MIN_M]);
  });

  it('a surface that starts beyond 0.45 m gets the bed at 0.45 m, at its height', async () => {
    const away = surface('other', [0, 0.8, -0.9], [1, 0.6]); // near edge 0.6 m ahead
    expectClose(centreOf((await place({ planes: [away] })).pose), [0, 0.8, -0.45]);
  });

  it('re-centres on a large surface: the bed is in front of the user, not at the table centre', async () => {
    const head = headAt(-0.4, 1.2, 0, -20, -35); // the table centre is 1.17 m away
    const { pose, level } = await place({ planes: planesOf('large'), head });
    expect(level).toBe(1);
    // 0.45 m along the way the head faces, on the table top
    const turn = (20 * Math.PI) / 180;
    expectClose(centreOf(pose), [-0.4 + 0.45 * Math.sin(turn), 0.75, -0.45 * Math.cos(turn)]);
    expectReachableAndFacing(pose, head, 'large');
  });

  it('beside the table, the bed goes toward its nearest point and no farther than 0.45 m', async () => {
    const head = headAt(-0.9, 1.6, 0); // the table's left edge is at x = -0.6
    const { pose } = await place({ planes: [TABLE], head });
    expect(centreDistanceM(pose, head)).toBeCloseTo(BED_CENTRE_MAX_M, 9);
    // head -> the nearest point of the table to the default spot, (-0.6, -0.45)
    expect((pose[12]! - head[12]!) / (pose[14]! - head[14]!)).toBeCloseTo(0.3 / -0.45, 9);
  });

  it('a hit point is pulled along the head-to-point line into 0.35 to 0.45 m, at its own height', async () => {
    const far = await place({ planes: [], hit: { x: 0.3, y: 0.7, z: -1.2 }, pinch: true });
    const scale = BED_CENTRE_MAX_M / Math.hypot(0.3, 1.2);
    expectClose(centreOf(far.pose), [0.3 * scale, 0.7, -1.2 * scale]);
    const inside = await place({ planes: [], hit: { x: 0, y: 0.7, z: -0.4 }, pinch: true });
    expectClose(centreOf(inside.pose), [0, 0.7, -0.4]);
    const near = await place({ planes: [], hit: { x: 0, y: 0.7, z: -0.1 }, pinch: true });
    expectClose(centreOf(near.pose), [0, 0.7, -BED_CENTRE_MIN_M]);
    // Straight below the head there is no direction: the bed goes the way the head faces.
    const head = headAt(0, 1.6, 0, 90, -89);
    const below = await place({ planes: [], hit: { x: 0, y: 0.6, z: 0 }, pinch: true, head });
    expectClose(centreOf(below.pose), [-BED_CENTRE_MIN_M, 0.6, 0]);
  });

  it('forward ignores pitch: looking straight down gives the same bed as looking level', async () => {
    for (const planes of [[TABLE], []]) {
      const level = await place({ planes, head: headAt(0, 1.2, 0, 30, 0) });
      const down = await place({ planes, head: headAt(0, 1.2, 0, 30, -90) });
      expect(down.level).toBe(level.level);
      expectClose(down.pose, Array.from(level.pose), `${planes.length} planes`);
    }
    const onTable = await place({ planes: [TABLE], head: headAt(0, 1.2, 0, 0, -90) });
    expectClose(onTable.pose, unturnedAt(0, 0.74, -BED_CENTRE_DEFAULT_M));
  });

  it('head roll shifts the spot: forward is square to the right vector of the head (API_SPEC §1.3)', async () => {
    const [pitchDeg, rollDeg] = [-45, 20];
    const head = headAt(0, 1.2, 0, 0, pitchDeg, rollDeg);
    const { pose, level } = await place({ head });
    expect(level).toBe(4);
    // right = (cos r, sin r cos p, sin r sin p); forward = (right.z, -right.x), made unit length
    const [roll, pitch] = [(rollDeg * Math.PI) / 180, (pitchDeg * Math.PI) / 180];
    const length = Math.hypot(Math.cos(roll), Math.sin(roll) * Math.sin(pitch));
    const forward = [(Math.sin(roll) * Math.sin(pitch)) / length, -Math.cos(roll) / length];
    expectClose(centreOf(pose), [0.45 * forward[0]!, 1.2 - FLOATING_DROP_M, 0.45 * forward[1]!]);
    expect(pose[12]).toBeCloseTo(-0.112, 3); // 11 cm to the side of where the gaze points
    expectReachableAndFacing(pose, head, 'rolled');
  });

  it('level 4 floats 0.45 m forward and 0.25 m below eye height, whatever the pitch', async () => {
    expect(FLOATING_DROP_M).toBe(0.25);
    for (const pitchDeg of [-89, -40, 0, 60]) {
      const head = headAt(0.2, 1.15, 0.1, 90, pitchDeg);
      const placement = await place({ head });
      expect(placement.level, `${pitchDeg}`).toBe(4);
      expectClose(centreOf(placement.pose), [0.2 - BED_CENTRE_DEFAULT_M, 1.15 - 0.25, 0.1], `${pitchDeg}`);
    }
  });

  it('a plane with its normal flipped gives the same bed, and so does one turned on the table', async () => {
    // The second head is beside the table, where the bed is aimed at the table's edge.
    for (const head of [headAt(0.25, 1.3, 0.1, 15, -40), headAt(-0.9, 1.3, 0.1)]) {
      const table = (size: readonly [number, number], orientation: typeof NORMAL_UP) =>
        place({ planes: [surface('table', [0, 0.74, -0.5], size, orientation)], head });
      const expected = await table([1.2, 0.8], NORMAL_DOWN);
      expect(expected.level).toBe(1);
      expectClose((await table([1.2, 0.8], NORMAL_UP)).pose, Array.from(expected.pose), 'flipped');
      expectClose((await table([0.8, 1.2], yaw(90))).pose, Array.from(expected.pose), 'quarter turn');
    }
  });

  it('on a slightly tilted surface the bed stays level and its centre touches the surface', async () => {
    const tiltRad = (4 * Math.PI) / 180; // about x: the far side is higher
    const tilt = [Math.sin(tiltRad / 2), 0, 0, Math.cos(tiltRad / 2)] as const;
    const { pose, level } = await place({ planes: [surface('table', [0, 0.74, -0.5], [1.2, 0.8], tilt)] });
    expect(level).toBe(1);
    expectReachableAndFacing(pose, HEAD, 'tilted');
    expect(pose[13]).toBeCloseTo(0.74 - (pose[14]! + 0.5) * Math.tan(tiltRad), 3); // to half a millimetre
    expect(pose[13]).not.toBeCloseTo(0.74, 3);
  });

  it('a plane is level within 5 degrees of horizontal, whichever way it tilts and faces (D-034)', async () => {
    const tilted = (deg: number, axis: 0 | 2, facing: 1 | -1) => {
      const half = (deg * Math.PI) / 360;
      // about x or z; `facing` -1 turns the normal down as well
      const turn: [number, number, number, number] = [0, 0, 0, Math.cos(half)];
      turn[axis] = Math.sin(half);
      const flipped: [number, number, number, number] = [turn[3], turn[2], -turn[1], -turn[0]]; // turn * NORMAL_DOWN
      return surface('table', [0, 0.74, -0.5], [1.2, 0.8], facing === 1 ? turn : flipped);
    };
    for (const axis of [0, 2] as const) {
      for (const facing of [1, -1] as const) {
        const note = `axis ${axis} facing ${facing}`;
        expect((await place({ planes: [tilted(5, axis, facing)] })).level, note).toBe(1);
        expect((await place({ planes: [tilted(5.2, axis, facing)] })).level, note).toBe(4);
        expect((await place({ planes: [tilted(-5, axis, facing)] })).level, note).toBe(1);
        expect((await place({ planes: [tilted(-5.2, axis, facing)] })).level, note).toBe(4);
      }
    }
  });

  it('holds the clamp and the bed frame for every head pose, in every room, at every level', async () => {
    const rooms: [string, RoomPlane[]][] = [
      ...ROOMS.map((room): [string, RoomPlane[]] => [room, planesOf(room)]),
      ['turned table', [surface('table', [0.2, 0.7, -0.4], [1.4, 0.7], yaw(33))]],
      ['small tray', [surface('other', [0.1, 0.6, -0.2], [0.2, 0.15], NORMAL_UP)]],
    ];
    const hit = { x: 0.4, y: 0.55, z: -2 }; // usable from every head below: the lowest eyes are at 0.9 m
    let runs = 0;
    for (const [room, planes] of rooms) {
      for (const x of [-0.9, -0.2, 0, 0.6]) {
        for (const z of [-0.6, 0, 0.9]) {
          for (const yawDeg of [-170, -45, 0, 20, 90]) {
            for (const pitchDeg of [-89, -40, 25]) {
              const head = headAt(x, 1.2 + x / 3, z, yawDeg, pitchDeg);
              for (const forceLevel of [null, 2, 3, 4] as const) {
                const placement = await place({ planes, hit, pinch: true, head, flags: { forceLevel } });
                const note = `${room} head ${x},${z} yaw ${yawDeg} pitch ${pitchDeg} force ${forceLevel}`;
                expectReachableAndFacing(placement.pose, head, note);
                expect(placement.level, note).toBeGreaterThanOrEqual(forceLevel ?? 1);
                if (forceLevel !== null && forceLevel >= 3) expect(placement.level, note).toBe(forceLevel);
                runs++;
              }
            }
          }
        }
      }
    }
    expect(runs).toBe(rooms.length * 4 * 3 * 5 * 3 * 4); // every fixture room plus the two made here
  });
});

describe('PlacementSolver: waits, the level-3 pinch and the level events (FR-ROOM-01, LLD §5.5)', () => {
  it('waits for planes up to the timeout, and takes a table that turns up in time', async () => {
    const { solver, room } = rig({ planes: [] });
    const run = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    solver.update(HEAD, 1000);
    solver.update(HEAD, 1000 + PLANE_LEVELS_TIMEOUT_MS - FRAME_MS);
    expect(await isSettled(run)).toBe(false);
    room.planes = [TABLE];
    solver.update(HEAD, 1000 + PLANE_LEVELS_TIMEOUT_MS - 1);
    expect((await run).level).toBe(1);
    expect(levels).toEqual([1]);
  });

  it('with no plane in time and nothing else to try, floats at once and logs E_PLACEMENT_TIMEOUT', async () => {
    const { solver } = rig({ planes: [] });
    const run = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    solver.update(HEAD, 0);
    solver.update(HEAD, PLANE_LEVELS_TIMEOUT_MS - 1);
    expect(await isSettled(run)).toBe(false);
    solver.update(HEAD, PLANE_LEVELS_TIMEOUT_MS);
    expect((await run).level).toBe(4);
    expect(levels).toEqual([1, 4]);
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'E_PLACEMENT_TIMEOUT');
  });

  it('level 3 places on the pinch, where preview() showed the bed, not where the gaze has gone since', async () => {
    const { solver, room } = rig({ planes: [], hit: null });
    const run = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    solver.confirm(); // before level 3: not a confirm
    solver.update(HEAD, 0);
    solver.update(HEAD, PLANE_LEVELS_TIMEOUT_MS);
    expect(levels).toEqual([1, 3]);
    room.hit = { x: 0, y: 0.7, z: -0.4 };
    solver.update(HEAD, PLANE_LEVELS_TIMEOUT_MS + FRAME_MS); // a hit, and no pinch yet
    expect(await isSettled(run)).toBe(false);
    const shown = solver.preview();
    expect(shown?.level).toBe(3);
    expectClose(shown!.pose, unturnedAt(0, 0.7, -0.4));
    solver.confirm();
    room.hit = { x: 0.3, y: 0.9, z: -0.4 }; // the gaze moved on between the pinch and the next frame
    solver.update(HEAD, PLANE_LEVELS_TIMEOUT_MS + 2 * FRAME_MS);
    const placed = await run;
    expect(placed.level).toBe(3);
    expectClose(placed.pose, unturnedAt(0, 0.7, -0.4));
    expect(placed.pose).not.toBe(shown!.pose); // a copy: the preview's object is the solver's own
    expect(levels).toEqual([1, 3]);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('a pinch with the gaze on no usable spot places the floating bed at once: level 4, no wait, no warning (UX §9.2)', async () => {
    const eyeM = HEAD[13]!;
    for (const hit of [null, { x: 0, y: eyeM, z: -2.25 }, { x: 0, y: 0.2, z: -0.4 }]) {
      levels = [];
      const { solver } = rig({ hit });
      const run = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
      solver.update(HEAD, 0);
      expect(solver.preview()?.level).toBe(4);
      expect(await isSettled(run)).toBe(false);
      solver.confirm();
      solver.update(HEAD, FRAME_MS);
      const placed = await run;
      expect(placed.level).toBe(4);
      expectClose(placed.pose, unturnedAt(0, eyeM - FLOATING_DROP_M, -BED_CENTRE_DEFAULT_M));
      expect(levels).toEqual([3, 4]);
    }
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('preview() is the bed a confirm in this frame would give: one reused object, and null outside level 3', async () => {
    const eyeM = HEAD[13]!;
    const { solver, room } = rig({ planes: [], hit: null });
    expect(solver.preview()).toBeNull(); // no run
    const run = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    expect(solver.preview()).toBeNull();
    solver.update(HEAD, 0);
    expect(solver.preview()).toBeNull(); // levels 1 and 2 wait
    // Asked from inside the event that announces level 3: there is nothing to show yet, not the last run's bed.
    let atTheEvent: unknown = 'not asked';
    const stop = bus.on('room:placementLevel', () => (atTheEvent = solver.preview()));
    solver.update(HEAD, PLANE_LEVELS_TIMEOUT_MS);
    stop();
    expect(atTheEvent).toBeNull();
    const first = solver.preview();
    expect(first).toMatchObject({ level: 4 });
    expectClose(first!.pose, unturnedAt(0, eyeM - FLOATING_DROP_M, -BED_CENTRE_DEFAULT_M));
    expect(first).not.toHaveProperty('surfaceId');

    room.hit = { x: 0.3, y: 0.7, z: -1.2 }; // beyond reach: the same clamp as a placed bed (FR-ROOM-03)
    solver.update(HEAD, PLANE_LEVELS_TIMEOUT_MS + FRAME_MS);
    const second = solver.preview();
    expect(second).toBe(first);
    expect(second!.pose).toBe(first!.pose);
    expect(second!.level).toBe(3);
    expectReachableAndFacing(second!.pose, HEAD, 'the preview on a far hit');
    expect(second!.pose[13]).toBe(0.7);
    room.hit = { x: Number.NaN, y: 0.7, z: -0.4 }; // a hit that cannot be used: the floating bed again, whole
    solver.update(HEAD, PLANE_LEVELS_TIMEOUT_MS + 2 * FRAME_MS);
    expect(solver.preview()!.level).toBe(4);
    expectClose(solver.preview()!.pose, unturnedAt(0, eyeM - FLOATING_DROP_M, -BED_CENTRE_DEFAULT_M));

    solver.confirm();
    solver.update(HEAD, PLANE_LEVELS_TIMEOUT_MS + 3 * FRAME_MS);
    await run;
    expect(solver.preview()).toBeNull(); // placed
    void solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    solver.update(HEAD, 50_000);
    solver.update(HEAD, 50_000 + PLANE_LEVELS_TIMEOUT_MS);
    expect(solver.preview()).not.toBeNull();
    solver.cancel();
    expect(solver.preview()).toBeNull();
    // Level 4 has no preview: it places in its first frame.
    const floating = rig().solver;
    void floating.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    floating.update(HEAD, 0);
    expect(floating.preview()).toBeNull();
  });

  it('a frame of level 3 creates no objects: preview() is called in every one of them (LLD §3.4)', () => {
    const ROUNDS = 20_000;
    const hit = { x: 0.31, y: 0.71, z: -1.23 };
    const { solver } = rig({ hit });
    vi.restoreAllMocks(); // a spy records every call, which allocates
    void solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    const head = headAt(0.013, 1.587, 0.021, 7.3, -31.7);
    // The times exist before the loops (see tests/unit/hands/HandSystem.test.ts): all inside the 10 s wait.
    const TIMES: unknown[] = [null];
    for (let i = 1; i <= ROUNDS; i++) TIMES.push(i * 0.4689);
    let seen: unknown = null;
    const round = (): void => {
      for (let i = 1; i <= ROUNDS; i++) {
        solver.update(head, TIMES[i] as number);
        seen = solver.preview();
      }
    };
    // Until one round is clean: before V8 has optimised the frame, every fraction it works out is an object of
    // the interpreter's own (47 bytes a frame, seen with the whole suite running beside this test), and how
    // soon that ends depends on how busy the machine is. Code that creates an object never has a clean round.
    const costs: ReturnType<typeof heapCost>[] = [];
    const isClean = (): boolean => {
      const cost = heapCost(round);
      costs.push(cost);
      return cost.gcs === 0 && cost.grewBytes < PROBE_BYTES;
    };
    while (costs.length < 200 && !isClean());
    expect(costs.length, JSON.stringify(costs.slice(-5))).toBeLessThan(200);
    expect(seen).toMatchObject({ level: 3 }); // it did the work, and the wait had not run out
  }, 60_000);

  it('a spot higher than the floating bed would be is not usable: a pinch there gives the floating bed', async () => {
    const eyeM = HEAD[13]!;
    const wallAtEyeHeight = { x: 0, y: eyeM, z: -2.25 };
    const justTooHigh = { x: 0, y: eyeM - FLOATING_DROP_M + 0.05, z: -0.4 };
    const lowEnough = { x: 0, y: eyeM - FLOATING_DROP_M - 0.05, z: -0.4 };
    expect((await place({ hit: wallAtEyeHeight, pinch: true })).level).toBe(4);
    expect((await place({ hit: justTooHigh, pinch: true })).level).toBe(4);
    expect((await place({ hit: lowEnough, pinch: true })).level).toBe(3);
  });

  it('the floor, or anything lower than 0.5 m, is not usable: a pinch there gives the floating bed (D-034)', async () => {
    expect((await place({ hit: { x: 0, y: 0, z: -0.45 }, pinch: true })).level).toBe(4);
    expect((await place({ hit: { x: 0, y: 0.49, z: -0.4 }, pinch: true })).level).toBe(4);
    const lowTable = await place({ hit: { x: 0, y: 0.5, z: -0.4 }, pinch: true });
    expect(lowTable.level).toBe(3);
    expectClose(centreOf(lowTable.pose), [0, 0.5, -0.4]);
  });

  it('a level-3 wait that runs out 10 s after it began uses the spot the gaze is on then: level 3, no warning', async () => {
    const { solver, room } = rig({ hit: null });
    const run = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    solver.update(HEAD, 500);
    solver.update(HEAD, 500 + HIT_TEST_TIMEOUT_MS - 1);
    expect(await isSettled(run)).toBe(false);
    room.hit = { x: 0, y: 0.7, z: -0.4 }; // the gaze reaches the table in the wait's last frame
    solver.update(HEAD, 500 + HIT_TEST_TIMEOUT_MS);
    const placed = await run;
    expect(placed.level).toBe(3);
    expectClose(placed.pose, unturnedAt(0, 0.7, -0.4));
    expect(levels).toEqual([3]);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('a level-3 wait that runs out over no usable spot: the floating bed and E_PLACEMENT_TIMEOUT', async () => {
    const { solver, room } = rig({ hit: { x: 0, y: 0.7, z: -0.4 } });
    const run = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    solver.update(HEAD, 500);
    solver.update(HEAD, 500 + HIT_TEST_TIMEOUT_MS - 1);
    expect(await isSettled(run)).toBe(false);
    room.hit = { x: 0, y: HEAD[13]!, z: -2.25 }; // the gaze is on the far wall when the time is up
    // Level 3 is over when level 4 is announced: there is no preview to draw any more.
    let atLevel4: unknown = 'not asked';
    const stop = bus.on('room:placementLevel', () => (atLevel4 = solver.preview()));
    solver.update(HEAD, 500 + HIT_TEST_TIMEOUT_MS);
    stop();
    expect(atLevel4).toBeNull();
    expect((await run).level).toBe(4);
    expect(levels).toEqual([3, 4]);
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'E_PLACEMENT_TIMEOUT');
  });

  it('a hit-test that stops being available ends level 3 without the wait', async () => {
    const { solver, room } = rig({ hit: null });
    const run = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    solver.update(HEAD, 0);
    room.hit = 'unsupported';
    solver.update(HEAD, FRAME_MS);
    expect((await run).level).toBe(4);
  });

  it('emits each level it tries, in order, and no timeout is logged when nothing had to be waited for', async () => {
    const cases: [Setup & { pinch?: boolean }, PlacementLevel[]][] = [
      [{ planes: [TABLE] }, [1]],
      [{ planes: [COUNTER] }, [1, 2]],
      [{ planes: [], hit: { x: 0, y: 0.7, z: -0.4 }, pinch: true }, [1, 3]],
      [{}, [4]],
      [{ planes: [TABLE], flags: { forceLevel: 4 } }, [4]],
    ];
    for (const [setup, expected] of cases) {
      levels = [];
      await place(setup);
      expect(levels).toEqual(expected);
    }
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('forceLevel starts the chain at that level, and a forced level that cannot place still falls on', async () => {
    const hit = { x: 0, y: 0.7, z: -0.4 };
    const room = { planes: [TABLE], hit, pinch: true };
    expect((await place({ ...room, flags: { forceLevel: 1 } })).level).toBe(1);
    const forcedTo2 = await place({ ...room, flags: { forceLevel: 2 } });
    expect(forcedTo2).toMatchObject({ level: 2, surfaceId: TABLE.id });
    expect((await place({ ...room, flags: { forceLevel: 3 } })).level).toBe(3);
    expect((await place({ ...room, flags: { forceLevel: 4 } })).level).toBe(4);
    expect((await place({ planes: [], flags: { forceLevel: 2 } })).level).toBe(4);
    expect((await place({ planes: [TABLE], flags: { forceLevel: 3 } })).level).toBe(4);
  });

  it('cancel drops the run: its promise never settles and no level follows', async () => {
    const { solver, room } = rig({ planes: [] });
    const run = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    solver.update(HEAD, 0);
    solver.cancel();
    room.planes = [TABLE];
    solver.update(HEAD, FRAME_MS);
    solver.update(HEAD, 60_000);
    expect(await isSettled(run)).toBe(false);
    expect(levels).toEqual([1]);
  });

  it('a second run replaces the first and starts its own wait', async () => {
    const { solver, room } = rig({ planes: [] });
    const first = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    solver.update(HEAD, 0);
    const second = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    solver.update(HEAD, PLANE_LEVELS_TIMEOUT_MS); // the first run's wait would be over; the second began here
    expect(await isSettled(second)).toBe(false);
    room.planes = [TABLE];
    solver.update(HEAD, PLANE_LEVELS_TIMEOUT_MS + FRAME_MS);
    expect((await second).level).toBe(1);
    expect(await isSettled(first)).toBe(false);
    // Nothing is pending now: an update does nothing.
    solver.update(HEAD, 99_999);
    expect(levels).toEqual([1, 1]);
  });
});

describe('PlacementSolver: garbage in never gives a garbage bed', () => {
  it('skips a frame whose head pose is not finite, or lies on its side, and places on the next good one', async () => {
    const { solver } = rig({ planes: [TABLE] });
    const run = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
    const nan = [...HEAD];
    nan[12] = Number.NaN;
    const onItsSide = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 1.6, 0, 1]; // rolled 90 degrees: no level right
    for (const bad of [nan, onItsSide, [], new Array<number>(16).fill(Infinity)]) solver.update(bad, 0);
    expect(await isSettled(run)).toBe(false);
    expect(levels).toEqual([]);
    solver.update(HEAD, 99_999);
    expect((await run).level).toBe(1);
  });

  it('ignores planes and hits with numbers that are not finite, or with no size', async () => {
    type Loose = RoomPlane & { pose: number[] };
    const broken = (change: (plane: Loose) => void): RoomPlane => {
      const plane = { ...TABLE, pose: Array.from(TABLE.pose), extents: { ...TABLE.extents } };
      change(plane);
      return plane;
    };
    const planes = [
      broken((plane) => (plane.pose[13] = Number.NaN)),
      broken((plane) => (plane.pose[0] = Number.NaN)),
      broken((plane) => (plane.pose[5] = Infinity)),
      broken((plane) => (plane.pose.length = 3)),
      broken((plane) => (plane.extents.x = Number.NaN)),
      broken((plane) => (plane.extents.y = 0)),
      broken((plane) => (plane.extents.x = -1)),
    ];
    expect((await place({ planes })).level).toBe(4);
    expect((await place({ planes: [...planes, TABLE] })).surfaceId).toBe(TABLE.id);
    for (const hit of [
      { x: Number.NaN, y: 0.7, z: -0.4 },
      { x: 0, y: Infinity, z: -0.4 },
    ]) {
      expect((await place({ hit, pinch: true })).level).toBe(4);
    }
  });

  it('a timeout that is not finite counts as expired: no plane on the first frame, and the chain moves on', async () => {
    for (const timeoutMs of [Infinity, -Infinity, Number.NaN]) {
      const { solver } = rig({ planes: [] });
      const run = solver.run({ timeoutMs });
      solver.update(HEAD, 0);
      expect(await isSettled(run), `${timeoutMs}`).toBe(true);
      expect((await run).level).toBe(4);
    }
    // A plane that is there on the first frame is still taken.
    const { solver } = rig({ planes: [TABLE] });
    const run = solver.run({ timeoutMs: Infinity });
    solver.update(HEAD, 0);
    expect((await run).level).toBe(1);
  });

  it('a clock or a timeout that is not a number ends the wait instead of holding the bed back', async () => {
    for (const [timeoutMs, nowMs] of [
      [Number.NaN, 0],
      [PLANE_LEVELS_TIMEOUT_MS, Number.NaN],
      [-1, 0],
    ] as const) {
      const { solver } = rig({ planes: [], hit: null });
      const run = solver.run({ timeoutMs });
      solver.update(HEAD, nowMs);
      solver.update(HEAD, Number.NaN);
      expect((await run).level).toBe(4);
    }
  });
});
