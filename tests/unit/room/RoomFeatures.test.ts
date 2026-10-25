// FR-ROOM-10 and the extraction half of TC-SIG-03 (LLD §5.8): RoomFeatureExtractor turns planes and meshes into
// RoomFeatures. Fake frames and hand-made planes: nothing here shows which planes, labels or meshes a headset
// reports, or how noisy they are.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '../../../src/core/index.js';
import { roomSignature, WANDERER } from '../../../src/garden/index.js';
import { PLANE_LEVELS_TIMEOUT_MS } from '../../../src/room/config.js';
import { MeshAdapter } from '../../../src/room/MeshAdapter.js';
import { PlacementSolver } from '../../../src/room/PlacementSolver.js';
import { PlaneAdapter } from '../../../src/room/PlaneAdapter.js';
import { RoomFeatureExtractor } from '../../../src/room/RoomFeatures.js';

import { FakeXR, HEAD, headAt, poseOf, readRoom, sceneOf } from './fixtures.js';

import type { FakeScene } from './fixtures.js';
import type { Mat4 } from '../../../src/core/index.js';
import type { RoomFeatures, RoomSignature } from '../../../src/garden/index.js';
import type { BedPlacement, RoomMesh, RoomPlane } from '../../../src/room/types.js';
import type { Room } from '../../e2e/support/iwer';

beforeEach(() => {
  vi.spyOn(log, 'warn').mockImplementation(() => {}); // the chain logs E_PLACEMENT_TIMEOUT in the empty room
});
afterEach(() => vi.restoreAllMocks());

type Offset = readonly [x: number, z: number];

/** A pose turned `deg` to the left about the vertical through the origin, then moved level by `to`. */
function turned(pose: Mat4, deg: number, [tx, tz]: Offset = [0, 0]): number[] {
  const [cos, sin] = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  const out = Array.from(pose);
  for (const i of [0, 4, 8, 12]) {
    out[i] = cos * pose[i]! + sin * pose[i + 2]!;
    out[i + 2] = -sin * pose[i]! + cos * pose[i + 2]!;
  }
  out[12]! += tx;
  out[14]! += tz;
  return out;
}

/** A copy of a pose with one of its numbers replaced. */
const setAt = (pose: Mat4, index: number, value: number): number[] =>
  Array.from(pose, (v, i) => (i === index ? value : v));

/** A turn of `deg` about the x axis as a quaternion: it tips a level plane, or leans an upright one. */
function aboutX(deg: number): [number, number, number, number] {
  const half = (deg * Math.PI) / 360;
  return [Math.sin(half), 0, 0, Math.cos(half)];
}

/** The whole room turned and moved: the same room met with another heading, from another starting spot. */
function turnedScene(scene: FakeScene, deg: number, to: Offset = [0, 0]): FakeScene {
  return {
    planes: (scene.planes ?? []).map((plane) => ({ ...plane, pose: turned(plane.pose!, deg, to) })),
    meshes: (scene.meshes ?? []).map((mesh) => ({ ...mesh, pose: turned(mesh.pose!, deg, to) })),
  };
}

/** One session in a fake room: the real adapters and placement chain, then the extractor on the same planes. */
async function session(scene: FakeScene, head: Mat4 = HEAD) {
  const xr = new FakeXR(scene);
  const planeAdapter = new PlaneAdapter();
  const meshAdapter = new MeshAdapter();
  planeAdapter.setFrame(xr.frame(), xr.space);
  meshAdapter.setFrame(xr.frame(), xr.space);
  const solver = new PlacementSolver(planeAdapter, { supported: () => false, hit: () => null });
  const run = solver.run({ timeoutMs: PLANE_LEVELS_TIMEOUT_MS });
  for (let t = 0; t <= PLANE_LEVELS_TIMEOUT_MS; t += 500) solver.update(head, t);
  const placement = await run;
  const extractor = new RoomFeatureExtractor(planeAdapter, meshAdapter);
  return { planes: planeAdapter.read(), placement, extractor, features: extractor.extract(placement) };
}

/** Planes written as in a fixture file, as the PlaneAdapter reads them: ids plane-0, plane-1, ... in order. */
function planesOf(planes: Room['planes']): RoomPlane[] {
  const xr = new FakeXR(sceneOf({ description: '', planes }));
  const adapter = new PlaneAdapter();
  adapter.setFrame(xr.frame(), xr.space);
  return adapter.read();
}

/** The extractor on hand-made data, with no adapter in between. */
function extract(
  planes: readonly RoomPlane[],
  placement: BedPlacement,
  meshes: readonly RoomMesh[] = [],
): RoomFeatures {
  return new RoomFeatureExtractor({ read: () => planes }, { read: () => meshes }).extract(placement);
}

/** Exactly the expected fields (an unknown one is left out, never undefined), each equal to `digits` places. */
function expectFeatures(actual: RoomFeatures, expected: RoomFeatures, hint = '', digits = 9): void {
  expect(Object.keys(actual).sort(), hint).toEqual(Object.keys(expected).sort());
  for (const key of Object.keys(expected) as (keyof RoomFeatures)[]) {
    expect(actual[key], `${hint} ${key}`).toBeCloseTo(expected[key]!, digits);
  }
}

const without = (features: RoomFeatures, ...fields: (keyof RoomFeatures)[]): RoomFeatures =>
  Object.fromEntries(
    Object.entries(features).filter(([key]) => !fields.includes(key as keyof RoomFeatures)),
  ) as unknown as RoomFeatures;

// The three rooms worked by hand in LLD §5.8, as tests/unit/garden/signature.test.ts gives them to roomSignature.
// The kitchen's volume is 3.6 x 4.2 x 2.7 = 40.824; the documents print 40.82.
const DESK: RoomFeatures = {
  level: 1,
  tableHeight: 0.74,
  tableArea: 0.98,
  floorArea: 5.6,
  wallCount: 4,
  ceilingHeight: 2.4,
  largestWallWidth: 2.8,
  roomVolume: 13.44,
};
const KITCHEN: RoomFeatures = {
  level: 2,
  tableHeight: 0.92,
  tableArea: 1.92,
  floorArea: 15.12,
  wallCount: 4,
  ceilingHeight: 2.7,
  largestWallWidth: 4.2,
  roomVolume: 40.824,
};
const LIVING: RoomFeatures = {
  level: 1,
  tableHeight: 0.75,
  tableArea: 0.96,
  floorArea: 42,
  wallCount: 4,
  ceilingHeight: 3,
  largestWallWidth: 7,
  roomVolume: 126,
};
const SIGNATURE_ROOMS: {
  name: string;
  features: RoomFeatures;
  lldVolume: number;
  signature: RoomSignature;
}[] = [
  {
    name: 'sig-small-desk',
    features: DESK,
    lldVolume: 13.44,
    signature: {
      keyRoot: 4,
      mode: 'minorPent',
      tempo: 84,
      reverbRt60: 0.3,
      reverbSize: 'small',
      starterVoices: ['pluck', 'choir', 'bass'],
      paletteSeed: 0x0fe2778b,
    },
  },
  {
    name: 'sig-kitchen-counter',
    features: KITCHEN,
    lldVolume: 40.82,
    signature: {
      keyRoot: 2,
      mode: 'majorPent',
      tempo: 84,
      reverbRt60: 0.6,
      reverbSize: 'small',
      starterVoices: ['pad', 'pluck', 'bass'],
      paletteSeed: 0xccfb3565,
    },
  },
  {
    name: 'sig-living-table',
    features: LIVING,
    lldVolume: 126,
    signature: {
      keyRoot: -3,
      mode: 'susPent',
      tempo: 84,
      reverbRt60: 2.0,
      reverbSize: 'large',
      starterVoices: ['bell', 'pad', 'choir'],
      paletteSeed: 0xadd04cf6,
    },
  },
];

describe('the three signature rooms (TC-SIG-03, LLD §5.8)', () => {
  it.each(SIGNATURE_ROOMS)('$name: the features and the signature the LLD works by hand', async (room) => {
    const { features } = await session(sceneOf(readRoom(room.name)));
    expectFeatures(features, room.features);
    expect(features.roomVolume).toBeCloseTo(room.lldVolume, 2);
    expect(roomSignature(features)).toEqual(room.signature);
  });

  it.each(SIGNATURE_ROOMS)('$name: turned by 30 and 90 degrees, and met from another spot', async (room) => {
    const scene = sceneOf(readRoom(room.name));
    const straight = (await session(scene)).features;
    const cases: [deg: number, to: Offset][] = [
      [30, [0, 0]],
      [90, [0, 0]],
      [-137, [1.3, -0.7]],
    ];
    for (const [deg, to] of cases) {
      const { features } = await session(turnedScene(scene, deg, to), turned(HEAD, deg, to));
      expectFeatures(features, straight, `${deg} degrees`, 6);
      expect(roomSignature(features), `${deg} degrees`).toEqual(room.signature);
    }
  });

  it.each(SIGNATURE_ROOMS)('$name: the user in another seat at the same table', async (room) => {
    const seat = headAt(0.3, 1.25, 0.05, 15);
    const { features, placement } = await session(sceneOf(readRoom(room.name)), seat);
    expect(placement.pose).not.toEqual((await session(sceneOf(readRoom(room.name)))).placement.pose);
    expectFeatures(features, room.features);
  });

  it.each(SIGNATURE_ROOMS)(
    '$name: with no floor plane the floor is the rectangle around the walls, at any heading',
    async (room) => {
      const { description, planes } = readRoom(room.name);
      const scene = sceneOf({ description, planes: planes.filter((plane) => plane.label !== 'floor') });
      expectFeatures((await session(scene)).features, room.features, 'straight', 6);
      for (const deg of [30, 45]) {
        // the axis-aligned box of the 45 degree copy would be far larger: (width + depth)² / 2
        const { features } = await session(turnedScene(scene, deg), turned(HEAD, deg));
        expectFeatures(features, room.features, `${deg} degrees`, 6);
        expect(roomSignature(features), `${deg} degrees`).toEqual(room.signature);
      }
    },
  );
});

describe('a bed that comes back from an anchor (FR-ROOM-10: no placement chain, no `surfaceId`)', () => {
  it('gets the same features and surfaces where the counter starts beyond the bed centre', async () => {
    // The kitchen with its counter 0.40 m farther off: the near edge is 0.55 m ahead, and the bed centre stops
    // 0.45 m ahead (FR-ROOM-03), 0.10 m short of the counter it was placed on.
    const room = readRoom('sig-kitchen-counter');
    const [counter, ...others] = room.planes;
    const scene = sceneOf({ ...room, planes: [{ ...counter!, center: [0, 0.92, -0.85] }, ...others] });
    const { placement, extractor, features } = await session(scene);
    expect(placement).toMatchObject({ level: 2, surfaceId: 'plane-0' });
    expect(placement.pose[14]).toBeCloseTo(-0.45, 9);
    expectFeatures(features, KITCHEN);
    expect(roomSignature(features)).toEqual(SIGNATURE_ROOMS[1]!.signature);

    const placed = extractor.surfaces;
    expect(placed.table?.id).toBe('plane-0');
    expect(extractor.extract({ pose: placement.pose, level: placement.level })).toEqual(features);
    expect(extractor.surfaces).toEqual(placed);
  });
});

describe('the six rooms of the placement tests', () => {
  const TABLE_ROOM = { level: 1, tableHeight: 0.74, tableArea: 0.96, floorArea: 18 } as const;
  const EXPECTED: Record<string, RoomFeatures> = {
    table: { ...TABLE_ROOM, wallCount: 4, ceilingHeight: 2.5, largestWallWidth: 4.5, roomVolume: 45 },
    counter: {
      level: 2,
      tableHeight: 0.92,
      tableArea: 1.44,
      floorArea: 12,
      wallCount: 4,
      ceilingHeight: 2.4,
      largestWallWidth: 4,
      roomVolume: 28.8,
    },
    none: { level: 4 },
    tiny: {
      level: 1,
      tableHeight: 0.72,
      tableArea: 0.48,
      floorArea: 5,
      wallCount: 4,
      ceilingHeight: 2.2,
      largestWallWidth: 2.5,
      roomVolume: 11,
    },
    large: {
      level: 1,
      tableHeight: 0.75,
      tableArea: 4.8,
      floorArea: 42,
      wallCount: 4,
      ceilingHeight: 3,
      largestWallWidth: 7,
      roomVolume: 126,
    },
    // no walls, no ceiling and no mesh: nothing is made up for them
    'no-walls': TABLE_ROOM,
  };

  it.each(Object.keys(EXPECTED))('%s: every field measured or left out', async (name) => {
    const { features } = await session(sceneOf(readRoom(name)));
    expectFeatures(features, EXPECTED[name]!, name);
    expect(roomSignature(features) === WANDERER, name).toBe(name === 'none');
  });

  it('gives the ripple its surfaces: the bed surface, the nearest wall and the ceiling', async () => {
    const desk = await session(sceneOf(readRoom('sig-small-desk')));
    const [table, , ceiling, frontWall] = desk.planes;
    expect(desk.extractor.surfaces).toEqual({ table, nearestWall: frontWall, ceiling });
    const bare = await session(sceneOf(readRoom('no-walls')));
    expect(bare.extractor.surfaces).toEqual({ table: bare.planes[0] });
    expect((await session(sceneOf(readRoom('none')))).extractor.surfaces).toEqual({});

    // the surfaces are those of the last extract: none before the first, no table for a floating bed, and
    // nothing left over once the planes are gone
    let planes = desk.planes;
    const fresh = new RoomFeatureExtractor({ read: () => planes }, { read: () => [] });
    expect(fresh.surfaces).toEqual({});
    fresh.extract({ ...desk.placement, level: 4 });
    expect(fresh.surfaces).toEqual({ nearestWall: frontWall, ceiling });
    planes = [];
    expect(fresh.extract(desk.placement)).toEqual({ level: 1 });
    expect(fresh.surfaces).toEqual({});
  });
});

describe('what the extractor reads, and what it refuses', () => {
  // The small desk room by hand: plane-0 the desk, plane-1 the floor, plane-2 the ceiling, plane-3..6 the walls
  // (front, back, left, right).
  const ROOM = planesOf(readRoom('sig-small-desk').planes);
  const [TABLE, FLOOR, CEILING, FRONT, BACK, LEFT, RIGHT] = ROOM as [
    RoomPlane,
    RoomPlane,
    RoomPlane,
    RoomPlane,
    RoomPlane,
    RoomPlane,
    RoomPlane,
  ];
  const WALLS = [FRONT, BACK, LEFT, RIGHT];
  const BED: BedPlacement = { pose: poseOf([0, 0.74, -0.45]), level: 1, surfaceId: TABLE.id };
  const UNHINTED: BedPlacement = { pose: BED.pose, level: 1 };
  /** One more plane in the fixture's terms, with an id of its own. */
  const extra = (id: string, plane: Room['planes'][number]): RoomPlane => ({ ...planesOf([plane])[0]!, id });

  it('reads the hand-made room as the fixture', () => {
    expectFeatures(extract(ROOM, BED), DESK);
  });

  it('does not read the sign of a normal', () => {
    // each plane turned half round about its own z: the normal points the other way
    const flipped = ROOM.map((plane) => ({
      ...plane,
      pose: Array.from(plane.pose, (v, i) => (i < 8 ? -v : v)),
    }));
    expect(flipped[1]!.pose[5]).toBe(-FLOOR.pose[5]!);
    expectFeatures(extract(flipped, BED), DESK);
    expectFeatures(extract(flipped, UNHINTED), DESK);
  });

  it('does not care which of its own axes a plane calls x: a quarter turn in its own plane changes nothing', () => {
    // the emulator's walls have their own z upright; turned, it is their x, and the sizes swap with the axes
    const quarter = ROOM.map(({ pose: m, extents, ...rest }) => ({
      ...rest,
      pose: [
        ...[m[8]!, m[9]!, m[10]!, 0],
        ...[m[4]!, m[5]!, m[6]!, 0],
        ...[-m[0]!, -m[1]!, -m[2]!, 0],
        ...[m[12]!, m[13]!, m[14]!, 1],
      ],
      extents: { x: extents.y, y: extents.x },
    }));
    expect(Math.abs(quarter[3]!.pose[1]!)).toBeCloseTo(1, 12);
    expectFeatures(extract(quarter, BED), DESK);
    expectFeatures(extract(quarter, UNHINTED), DESK);
  });

  it('does not read a label: missing or wrong labels change nothing', () => {
    for (const label of ['', 'wall', 'floor', 'global mesh']) {
      const relabelled = ROOM.map((plane) => ({ ...plane, label }));
      expectFeatures(extract(relabelled, BED), DESK, label);
      expectFeatures(extract(relabelled, UNHINTED), DESK, label);
    }
  });

  it('a ceiling but no walls: no wall fields; and with no floor either, no area and no volume', () => {
    expectFeatures(extract([TABLE, FLOOR, CEILING], BED), without(DESK, 'wallCount', 'largestWallWidth'));
    expectFeatures(extract([TABLE, CEILING], BED), {
      level: 1,
      tableHeight: 0.74,
      tableArea: 0.98,
      ceilingHeight: 2.4,
    });
  });

  it('walls but no ceiling: no ceiling height and no volume', () => {
    const open = without(DESK, 'ceilingHeight', 'roomVolume');
    expectFeatures(extract([TABLE, FLOOR, ...WALLS], BED), open);
    expectFeatures(extract([TABLE, ...WALLS], BED), open, 'floor from the walls', 6);
  });

  it('a sloped ceiling is not a ceiling: its height stays unknown', () => {
    const tilt = (deg: number): RoomPlane => ({ ...CEILING, pose: poseOf([0, 2.4, 0.55], aboutX(deg)) });
    const open = without(DESK, 'ceilingHeight', 'roomVolume');
    expectFeatures(extract([TABLE, FLOOR, ...WALLS, tilt(20)], BED), open);
    expectFeatures(extract([TABLE, FLOOR, ...WALLS, tilt(6)], BED), open);
    expectFeatures(extract([TABLE, FLOOR, ...WALLS, tilt(4)], BED), DESK); // level within 5 degrees
  });

  it('the floor is the largest level plane at floor height, and the ceiling the highest one above 1.8 m', () => {
    // an L-shaped floor in two planes is read as its larger piece: 5.6 of 7.1 m2 (the known under-read)
    const annex = extra('annex', { label: 'floor', facing: '+y', center: [1.75, 0, 0], size: [1.5, 1] });
    expectFeatures(extract([annex, ...ROOM], BED), DESK);
    expectFeatures(extract([...ROOM, annex], BED), DESK);
    // a level plane 0.3 m up is no floor, however large; a shelf top at 1.9 m is below the real ceiling
    const stage = extra('stage', { label: 'floor', facing: '+y', center: [0, 0.3, 0], size: [9, 9] });
    const shelf = extra('shelf', { label: 'shelf', facing: '+y', center: [0.8, 1.9, 0], size: [0.4, 1] });
    expectFeatures(extract([stage, shelf, ...ROOM], BED), DESK);
    // nor is the floor of the storey below, 3 m down: without a floor plane of its own the room's floor is
    // read from its walls
    const below = extra('below', { label: 'floor', facing: '+y', center: [0, -3, 0], size: [9, 9] });
    expectFeatures(extract([below, ...ROOM], BED), DESK);
    expectFeatures(extract([below, TABLE, CEILING, ...WALLS], BED), DESK, 'floor from the walls', 6);
    // and a level plane at 1.7 m is not taken for a ceiling when there is none
    const low = extra('low', { label: 'ceiling', facing: '-y', center: [0, 1.7, 0.55], size: [2, 2.8] });
    expectFeatures(extract([TABLE, FLOOR, ...WALLS, low], BED), without(DESK, 'ceilingHeight', 'roomVolume'));
  });

  it('heights are measured from the floor plane when there is one', () => {
    const lift = (plane: RoomPlane): RoomPlane => ({
      ...plane,
      pose: setAt(plane.pose, 13, plane.pose[13]! + 0.1),
    });
    expectFeatures(extract(ROOM.map(lift), { ...BED, pose: poseOf([0, 0.84, -0.45]) }), DESK);

    // The 1.8 m of a ceiling as well. Floor 0.15 m up: a level plane at 1.9 m is 1.75 m above it, no ceiling.
    const raised = (plane: RoomPlane, y: number): RoomPlane => ({ ...plane, pose: setAt(plane.pose, 13, y) });
    expectFeatures(extract([TABLE, raised(FLOOR, 0.15), raised(CEILING, 1.9), ...WALLS], BED), {
      ...without(DESK, 'ceilingHeight', 'roomVolume'),
      tableHeight: 0.59,
    });
    // Floor 0.15 m down: a level plane at 1.7 m is 1.85 m above it, a ceiling.
    expectFeatures(extract([TABLE, raised(FLOOR, -0.15), raised(CEILING, 1.7), ...WALLS], BED), {
      ...DESK,
      tableHeight: 0.89,
      ceilingHeight: 1.85,
      roomVolume: 5.6 * 1.85,
    });
  });

  it('a wall is an upright plane at least 1.5 m tall; a plane on the line of another counts once', () => {
    const wall = (id: string, plane: Omit<Room['planes'][number], 'label'>): RoomPlane =>
      extra(id, { label: 'wall', ...plane });
    const counted = (...more: RoomPlane[]): RoomFeatures => extract([...ROOM, ...more], BED);
    // duplicates, a copy facing the other way 5 cm off, and a door set in the front wall
    expectFeatures(counted(...WALLS.map((plane) => ({ ...plane, id: `${plane.id}-again` }))), DESK);
    expectFeatures(counted(wall('twin', { facing: '-z', center: [0, 1.2, -0.8], size: [2, 2.4] })), DESK);
    expectFeatures(counted(wall('door', { facing: '+z', center: [0.4, 1, -0.85], size: [0.9, 2] })), DESK);
    // a window sill height plane and a 1.49 m screen are no walls; a 1.5 m partition in the room is one
    expectFeatures(counted(wall('low', { facing: '+z', center: [0, 0.745, 0.5], size: [5, 1.49] })), DESK);
    const partition = wall('partition', { facing: '+z', center: [0, 0.75, 0.5], size: [1, 1.5] });
    expectFeatures(counted(partition), { ...DESK, wallCount: 5 });
    // only planes that run the same way are one wall: a stub square to the front wall, with its centre on
    // that wall's line, is a wall of its own
    const stub = wall('stub', { facing: '+x', center: [0.3, 0.75, -0.85], size: [0.4, 1.5] });
    expectFeatures(counted(stub), { ...DESK, wallCount: 5 });
    // the known limit: a wardrobe front standing 0.6 m off the right wall is a fifth wall
    const wardrobe = wall('wardrobe', { facing: '-x', center: [0.4, 1, 1], size: [1.2, 2] });
    expectFeatures(counted(wardrobe), { ...DESK, wallCount: 5 });
    // a plane leaning 10 degrees is neither upright nor level: not counted at all
    const leaning = { ...BACK, id: 'leaning', pose: poseOf([0, 1.2, 0.5], aboutX(100)) };
    expectFeatures(counted(leaning), DESK);
  });

  it('the widest wall is one plane, never the span of several on a line', () => {
    const pieces = planesOf([
      { label: 'wall', facing: '+z', center: [-1.5, 1.2, -2], size: [2, 2.4] },
      { label: 'wall', facing: '+z', center: [1, 1.2, -2], size: [3, 2.4] },
    ]);
    expectFeatures(extract(pieces, { pose: BED.pose, level: 4 }), {
      level: 4,
      wallCount: 1,
      largestWallWidth: 3,
    });
  });

  it('the floor from the walls needs two walls that are not parallel', () => {
    const level4: BedPlacement = { pose: BED.pose, level: 4 };
    expect(extract([FRONT, BACK], level4)).toEqual({ level: 4, wallCount: 2, largestWallWidth: 2 });
    expect(extract([LEFT], level4)).toEqual({ level: 4, wallCount: 1, largestWallWidth: 2.8 });
    // two walls a hair wide are two points of the plan, on one line: rounding is not turned into an area
    const hair = (plane: RoomPlane): RoomPlane => ({ ...plane, extents: { x: 1e-9, y: plane.extents.y } });
    expect(extract([hair(FRONT), hair(LEFT)], level4)).toEqual({
      level: 4,
      wallCount: 2,
      largestWallWidth: 1e-9,
    });
    // one corner of the room is enough for its rectangle
    expectFeatures(extract([FRONT, LEFT], level4), {
      level: 4,
      wallCount: 2,
      largestWallWidth: 2.8,
      floorArea: 5.6,
    });
    // and with the ceiling the volume follows from it
    expectFeatures(extract([FRONT, LEFT, CEILING], level4), {
      level: 4,
      wallCount: 2,
      largestWallWidth: 2.8,
      floorArea: 5.6,
      ceilingHeight: 2.4,
      roomVolume: 13.44,
    });
  });

  describe('the bed surface', () => {
    const tableFields = (placement: BedPlacement, planes = ROOM): (number | undefined)[] => {
      const { tableHeight, tableArea } = extract(planes, placement);
      return [tableHeight, tableArea];
    };
    const KNOWN = [0.74, 1.4 * 0.7];
    const UNKNOWN = [undefined, undefined];
    const at = (x: number, y: number, z: number, more: Partial<BedPlacement> = {}): BedPlacement => ({
      pose: poseOf([x, y, z]),
      level: 1,
      ...more,
    });

    it('is the level plane nearest the bed centre on the floor plan, up to 0.30 m past its edge', () => {
      expect(tableFields(at(0, 0.74, -0.45))).toEqual(KNOWN);
      expect(tableFields(at(0.69, 0.78, -0.16))).toEqual(KNOWN);
      // past the edge by 1 cm, by 25 cm, and by 20 cm each way at a corner (28 cm): placement leaves the bed
      // centre short of a table that starts beyond its reach (FR-ROOM-03)
      expect(tableFields(at(0.71, 0.74, -0.45))).toEqual(KNOWN);
      expect(tableFields(at(0, 0.74, 0.1))).toEqual(KNOWN);
      expect(tableFields(at(0.9, 0.74, 0.05))).toEqual(KNOWN);
      // by 35 cm, and by 25 cm each way at a corner (35 cm): farther than a bed can overhang
      expect(tableFields(at(0, 0.74, 0.2))).toEqual(UNKNOWN);
      expect(tableFields(at(1.05, 0.74, -0.45))).toEqual(UNKNOWN);
      expect(tableFields(at(0.95, 0.74, 0.1))).toEqual(UNKNOWN);
    });

    it('passes within 5 cm of the bed centre in height', () => {
      expect(tableFields(at(0, 0.8, -0.45))).toEqual(UNKNOWN);
      expect(tableFields(at(0, 0.68, -0.45))).toEqual(UNKNOWN);
    });

    it('of several planes it is the nearest on the floor plan, then the nearest in height', () => {
      const tray = extra('tray', {
        label: 'other',
        facing: '+y',
        center: [0, 0.77, -0.45],
        size: [0.4, 0.3],
      });
      expect(tableFields(at(0, 0.76, -0.45), [...ROOM, tray])).toEqual([0.77, 0.4 * 0.3]);
      expect(tableFields(at(0, 0.75, -0.45), [tray, ...ROOM])).toEqual(KNOWN);
      // a stool under the bed centre wins over the desk 25 cm away, though the desk is nearer in height
      const stool = extra('stool', {
        label: 'other',
        facing: '+y',
        center: [0, 0.76, 0.2],
        size: [0.3, 0.3],
      });
      expect(tableFields(at(0, 0.74, 0.1), [...ROOM, stool])).toEqual([0.76, 0.3 * 0.3]);
      expect(tableFields(at(0, 0.74, 0.1), [stool, ...ROOM])).toEqual([0.76, 0.3 * 0.3]);
    });

    it('follows the slope of a surface that is not quite level', () => {
      const slope = Math.tan((4 * Math.PI) / 180);
      const tilted: RoomPlane = {
        id: 'tilted',
        label: '',
        pose: poseOf([0, 0.74, -0.5], aboutX(4)),
        extents: { x: 1.4, y: 1.4 },
      };
      // half a metre toward the user the surface is 3.5 cm lower than at its centre: a bed resting there is on
      // it (the point lies in the plane), and at that height on the far side it is 7 cm under it
      const [ny, nz] = [tilted.pose[5]!, tilted.pose[6]!];
      expect(ny * (-0.5 * slope) + nz * 0.5).toBeCloseTo(0, 12);
      expect(tableFields(at(0, 0.74 - 0.5 * slope, 0), [tilted, FLOOR])).toEqual([0.74, 1.4 * 1.4]);
      expect(tableFields(at(0, 0.74 - 0.5 * slope, -1), [tilted, FLOOR])).toEqual(UNKNOWN);
    });

    it('does not read `surfaceId`: the right one, a stale one and none give the same result', () => {
      // an anchor-restored bed has no id, and an id from another adapter names another plane
      for (const surfaceId of [TABLE.id, FRONT.id, FLOOR.id, 'plane-99']) {
        for (const bed of [at(0, 0.74, -0.45), at(0, 0.74, 0.1), at(0, 0.74, 0.2)]) {
          expect(extract(ROOM, { ...bed, surfaceId }), surfaceId).toEqual(extract(ROOM, bed));
        }
      }
    });

    it('a bed placed by hit-test or floating (levels 3 and 4) has no table, and keeps the room signature of the walls (D-060 item 14)', () => {
      for (const level of [3, 4] as const) {
        const features = extract(ROOM, { ...BED, level });
        expectFeatures(features, { ...without(DESK, 'tableHeight', 'tableArea'), level });
        expect(roomSignature(features)).not.toBe(WANDERER);
        expect(roomSignature(features)).toEqual(roomSignature({ ...features, level: 1 }));
      }
    });
  });

  describe('bad numbers', () => {
    const NAN = Number.NaN;
    const withPose = (plane: RoomPlane, index: number, value: number): RoomPlane => ({
      ...plane,
      id: 'bad',
      pose: setAt(plane.pose, index, value),
    });
    const sized = (plane: RoomPlane, x: number, y: number): RoomPlane => ({
      ...plane,
      id: 'bad',
      extents: { x, y },
    });
    const BAD: [string, RoomPlane][] = [
      ['a NaN position', withPose(FLOOR, 13, NAN)],
      ['a NaN axis', withPose(CEILING, 5, NAN)],
      ['an infinite axis', withPose(LEFT, 0, Infinity)],
      ['a floor 1000 km away', withPose(FLOOR, 14, 1e6)],
      ['a ceiling 1000 km up', withPose(CEILING, 13, 1e6)],
      ['a wall beyond the cap', withPose(LEFT, 12, -101)],
      ['a NaN size', sized(FLOOR, NAN, 5)],
      ['no width', sized(LEFT, 0, 2.4)],
      ['a negative size', sized(FLOOR, -9, -9)],
      ['an infinite floor', sized(FLOOR, Infinity, 5)],
      ['a floor 1 km wide', sized(FLOOR, 1000, 1000)],
      ['a wall 1 km wide', sized(LEFT, 1000, 2.4)],
      [
        'a pose three times too large',
        { ...FLOOR, id: 'bad', pose: Array.from(FLOOR.pose, (v, i) => (i < 12 ? 3 * v : v)) },
      ],
      ['a sheared pose', withPose(LEFT, 1, 0.5)],
      ['a pose of 12 numbers', { ...FLOOR, id: 'bad', pose: Array.from(FLOOR.pose).slice(0, 12) }],
      ['an empty pose', { ...CEILING, id: 'bad', pose: [] }],
    ];

    it.each(BAD)('%s: the plane is dropped, nothing throws, nothing is made up', (_, bad) => {
      expectFeatures(extract([bad, ...ROOM], BED), DESK);
      expectFeatures(extract([...ROOM, bad], BED), DESK);
      expect(extract([bad], { ...BED, surfaceId: 'bad' })).toEqual({ level: 1 });
    });

    it('a bed pose that is not finite: no bed surface, the room as measured', () => {
      const roomOnly = without(DESK, 'tableHeight', 'tableArea');
      expectFeatures(extract(ROOM, { ...BED, pose: setAt(BED.pose, 13, NAN) }), roomOnly);
      expectFeatures(extract(ROOM, { ...UNHINTED, pose: [] }), roomOnly);
      const extractor = new RoomFeatureExtractor({ read: () => ROOM }, { read: () => [] });
      extractor.extract({ ...UNHINTED, pose: Array.from(BED.pose, () => NAN) });
      expect(extractor.surfaces).toEqual({ ceiling: CEILING });
    });

    it('leaves what it was given as it was', () => {
      const before = structuredClone(ROOM);
      extract(ROOM, BED);
      expect(ROOM).toEqual(before);
      expect(BED).toEqual({ pose: poseOf([0, 0.74, -0.45]), level: 1, surfaceId: TABLE.id });
    });
  });

  describe('the room volume from the global mesh', () => {
    type Span = readonly [min: number, max: number];
    /** The corners of a box as a mesh; the extractor reads vertices only. */
    function box(xs: Span, ys: Span, zs: Span, more: number[] = []): RoomMesh {
      const vertices = [...more];
      for (const x of xs) for (const y of ys) for (const z of zs) vertices.push(x, y, z);
      return {
        label: 'global mesh',
        pose: poseOf([0, 0, 0]),
        vertices: new Float32Array(vertices),
        indices: new Uint32Array(),
      };
    }
    const SHELL = box([-1, 1], [0, 2.4], [-0.85, 1.95]);
    // No ceiling plane: the plane path has no volume to give.
    const OPEN = [TABLE, FLOOR, ...WALLS];
    const volume = (mesh: RoomMesh, planes = OPEN): number | undefined =>
      extract(planes, BED, [mesh]).roomVolume;

    it('is the same as from the planes of the same room, at any heading (mesh vertices are 32-bit)', () => {
      const fromPlanes = extract(ROOM, BED).roomVolume;
      expect(fromPlanes).toBeCloseTo(13.44, 9);
      expect(volume(SHELL)).toBeCloseTo(fromPlanes!, 5);
      expect(volume({ ...SHELL, pose: turned(SHELL.pose, 30, [1.3, -0.7]) })).toBeCloseTo(fromPlanes!, 5);
      expect(volume({ ...SHELL, pose: turned(SHELL.pose, 45) })).toBeCloseTo(fromPlanes!, 5);
      // points inside the room change nothing
      const furnished = box([-1, 1], [0, 2.4], [-0.85, 1.95], [0, 1, 0, 0.5, 2, 1, -0.9, 0.1, 1.9]);
      expect(volume(furnished)).toBeCloseTo(13.44, 5);
      expectFeatures(extract(OPEN, BED, [SHELL]), without(DESK, 'ceilingHeight'), '', 5);
    });

    it('is not used while the planes give a volume', () => {
      expect(volume(box([-5, 5], [0, 5], [-5, 5]), ROOM)).toBeCloseTo(13.44, 9);
    });

    it('is unknown for a mesh with a bad vertex, no height, no points, a bad pose or another label', () => {
      const cases: [string, RoomMesh][] = [
        ['a NaN vertex', box([-1, 1], [0, 2.4], [-0.85, 1.95], [0, Number.NaN, 0])],
        ['an infinite vertex', box([-1, 1], [0, 2.4], [-0.85, Infinity])],
        ['a vertex 1000 km away', box([-1, 1], [0, 2.4], [-0.85, 1e6])],
        ['a flat mesh', box([-1, 1], [0, 0], [-0.85, 1.95])],
        ['a mesh lower than any ceiling', box([-1, 1], [0, 1.7], [-0.85, 1.95])],
        ['a mesh on one line', box([-1, 1], [0, 2.4], [1, 1])],
        ['an empty mesh', { ...SHELL, vertices: new Float32Array() }],
        ['a pose that is not finite', { ...SHELL, pose: poseOf([0, Number.NaN, 0]) }],
        ['a pose that is not rigid', { ...SHELL, pose: setAt(SHELL.pose, 0, 2) }],
        ['a table mesh', { ...SHELL, label: 'table' }],
        ['a mesh with no label', { ...SHELL, label: '' }],
      ];
      for (const [name, mesh] of cases) expect(volume(mesh), name).toBeUndefined();
      // the fixture's own mesh lies flat on the floor
      const flat = readRoom('table').meshes![0]!;
      expect(volume({ ...SHELL, vertices: new Float32Array(flat.vertices) })).toBeUndefined();
    });

    /** A triangle of the floor plan, 2.4 m tall, as mesh vertices: [x, y, z] of each corner at the floor and on top. */
    const prism = (
      corners: [x: number, z: number][],
      vertex: (x: number, y: number, z: number) => number[],
    ) => ({
      ...SHELL,
      vertices: new Float32Array(corners.flatMap(([x, z]) => [...vertex(x, 0, z), ...vertex(x, 2.4, z)])),
    });
    // An obtuse triangle: the least rectangle (4 m2) lies along its long side alone; along the other two it is
    // 8 and 4.8 m2. With the third corner below the long side that side is the last edge of the hull, with it
    // above, the first.
    const LAST_EDGE: [number, number][] = [
      [0, 0],
      [1, -1],
      [4, 0],
    ];
    const FIRST_EDGE: [number, number][] = [
      [0, 0],
      [1, 1],
      [4, 0],
    ];

    it('takes the least rectangle over every edge of the hull, whichever edge it lies along', () => {
      expect(volume(prism(LAST_EDGE, (x, y, z) => [x, y, z]))).toBeCloseTo(4 * 2.4, 5);
      expect(volume(prism(FIRST_EDGE, (x, y, z) => [x, y, z]))).toBeCloseTo(4 * 2.4, 5);
    });

    it('applies the whole pose of the mesh: a mesh frame with z up', () => {
      // mesh (x, y, z) is room (x, z, -y), so a room point (x, y, z) is the mesh vertex (x, -z, y)
      const zUp = poseOf([0, 0, 0], aboutX(-90));
      const upright = prism(LAST_EDGE, (x, y, z) => [x, -z, y]);
      expect(volume({ ...upright, pose: zUp })).toBeCloseTo(4 * 2.4, 5);
      expect(volume({ ...upright, pose: turned(zUp, 30, [1.3, -0.7]) })).toBeCloseTo(4 * 2.4, 5);
      expect(volume({ ...box([-1, 1], [-1.95, 0.85], [0, 2.4]), pose: zUp })).toBeCloseTo(13.44, 5);
    });

    it('does not measure a hull of more than 1000 corners (HULL_MAX_CORNERS)', () => {
      const ring = (count: number): RoomMesh => {
        const vertices: number[] = [];
        for (let i = 0; i < count; i++) {
          const angle = (2 * Math.PI * i) / count;
          vertices.push(3 * Math.cos(angle), i % 2 ? 0 : 2.4, 3 * Math.sin(angle));
        }
        return { ...SHELL, vertices: new Float32Array(vertices) };
      };
      // a regular 1000-gon in a circle of 3 m: the rectangle along any edge is (6 cos(pi/1000))² m2
      expect(volume(ring(1000))).toBeCloseTo((6 * Math.cos(Math.PI / 1000)) ** 2 * 2.4, 3);
      expect(volume(ring(1001))).toBeUndefined();
    });

    // About 25 ms on the development Mac (2026-10-12; a room of planes alone takes under 0.05 ms). The bound is
    // a third of the budget, so a loaded machine does not fail it and a quadratic walk over the vertices does.
    it('takes a mesh of 50 000 vertices inside the 3 s budget of FR-ROOM-10', () => {
      let seed = 1;
      const next = (span: number): number => {
        seed = (seed * 16_807) % 2_147_483_647; // Lehmer: the same numbers on every run
        return (seed / 2_147_483_647) * span;
      };
      const inside: number[] = [];
      for (let i = 0; i < 50_000; i++) inside.push(next(2) - 1, next(2.4), next(2.8) - 0.85);
      const mesh = box([-1, 1], [0, 2.4], [-0.85, 1.95], inside);
      const startMs = performance.now();
      expect(volume({ ...mesh, pose: turned(mesh.pose, 30) })).toBeCloseTo(13.44, 4);
      expect(performance.now() - startMs).toBeLessThan(1000);
    });
  });
});
