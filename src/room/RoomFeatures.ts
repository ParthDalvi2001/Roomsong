// The room as the few numbers the room signature needs (LLD §5.8, FR-ROOM-10): floor area, ceiling height, room
// volume, the walls, and the height and area of the bed surface. Runs once per session, off the frame loop.
// A plane is told apart by its pose and its size alone: no label is read, and no sign of a normal
// (tests/e2e/README.md). What cannot be measured is left out of the result; nothing is estimated.
// Not seen on a headset: which planes and meshes a Quest reports, and how noisy they are, is unverified.
import {
  BED_CENTRE_MAX_M,
  BED_FAR_EDGE_MAX_M,
  BED_SURFACE_MAX_GAP_M,
  CEILING_MIN_HEIGHT_M,
  EPSILON_M,
  FLOOR_MAX_OFFSET_M,
  GLOBAL_MESH_LABEL,
  HULL_MAX_CORNERS,
  LEVEL_MIN_COS,
  RIGID_TOLERANCE,
  ROOM_MAX_M,
  WALL_LINE_TOLERANCE_M,
  WALL_MIN_HEIGHT_M,
} from './config.js';

import type { BedPlacement, RoomMesh, RoomPlane, RoomSurfaces } from './types.js';
import type { Mat4 } from '../core/index.js';
import type { RoomFeatures } from '../garden/index.js';

/** A point of the floor plan. */
type Point = readonly [x: number, z: number];

/** An upright plane at least WALL_MIN_HEIGHT_M tall, as the floor plan shows it: a line through (x, z). */
interface Wall {
  plane: RoomPlane;
  widthM: number;
  /** The unit normal on the floor plan; which of the two is not defined. */
  nx: number;
  nz: number;
  x: number;
  z: number;
}

/** A pose of 16 numbers whose axes are unit length and square to each other, within ROOM_MAX_M of the origin. */
export function isRigid(m: Mat4): boolean {
  if (m.length !== 16) return false;
  for (let i = 0; i < 3; i++) {
    const a = 4 * i;
    const b = 4 * ((i + 1) % 3);
    const lengthSq = m[a]! * m[a]! + m[a + 1]! * m[a + 1]! + m[a + 2]! * m[a + 2]!;
    const dot = m[a]! * m[b]! + m[a + 1]! * m[b + 1]! + m[a + 2]! * m[b + 2]!;
    // `<=` is false for a NaN: an axis that is not finite fails here too
    if (!(Math.abs(lengthSq - 1) <= RIGID_TOLERANCE && Math.abs(dot) <= RIGID_TOLERANCE)) return false;
  }
  return Math.max(Math.abs(m[12]!), Math.abs(m[13]!), Math.abs(m[14]!)) <= ROOM_MAX_M;
}

/** False for a plane with a number that is not finite, a pose that is not rigid, or a size no room has. */
const isUsable = ({ pose, extents }: RoomPlane): boolean =>
  isRigid(pose) && extents.x > 0 && extents.y > 0 && extents.x <= ROOM_MAX_M && extents.y <= ROOM_MAX_M;

/** Level to within 5 degrees, either way up: the rule placement uses (LEVEL_MIN_COS). */
const isLevel = (plane: RoomPlane): boolean => Math.abs(plane.pose[5]!) >= LEVEL_MIN_COS;

const areaM2 = (plane: RoomPlane): number => plane.extents.x * plane.extents.y;

/** The item with the highest score, the first on a tie; a score that is not a number does not qualify. */
function best<T>(items: readonly T[], score: (item: T) => number): T | undefined {
  let winner: T | undefined;
  let highest = -Infinity;
  for (const item of items) {
    const value = score(item);
    if (value > highest) {
      winner = item;
      highest = value;
    }
  }
  return winner;
}

/** The plane as a wall, or null: its normal is within 5 degrees of level and it stands WALL_MIN_HEIGHT_M tall. */
function wallOf(plane: RoomPlane): Wall | null {
  const m = plane.pose;
  const levelPart = Math.hypot(m[4]!, m[6]!);
  if (levelPart < LEVEL_MIN_COS) return null;
  // Of the plane's own x and z, the one that points up more carries the height; the other is the width.
  const isZUp = Math.abs(m[9]!) > Math.abs(m[1]!);
  const heightM = isZUp ? plane.extents.y : plane.extents.x;
  if (heightM < WALL_MIN_HEIGHT_M) return null;
  const widthM = isZUp ? plane.extents.x : plane.extents.y;
  return { plane, widthM, nx: m[4]! / levelPart, nz: m[6]! / levelPart, x: m[12]!, z: m[14]! };
}

/** Whether two walls run the same way on the floor plan, to within 5 degrees. */
const isParallel = (a: Wall, b: Wall): boolean => Math.abs(a.nx * b.nx + a.nz * b.nz) >= LEVEL_MIN_COS;

/**
 * The walls with each line of the floor plan counted once, widest first: a door set in a wall, or a wall
 * reported twice, is not another wall.
 * shortcut: a wardrobe front or a partition standing off the wall is tall, upright and on a line of its own, so
 * it counts as a wall; tell furniture from walls if the device rooms show the count moving (T-129).
 */
function onePerLine(walls: readonly Wall[]): Wall[] {
  const lines: Wall[] = [];
  for (const wall of [...walls].sort((a, b) => b.widthM - a.widthM)) {
    const isOnALine = lines.some(
      (line) =>
        isParallel(line, wall) &&
        Math.abs(line.nx * (wall.x - line.x) + line.nz * (wall.z - line.z)) <= WALL_LINE_TOLERANCE_M,
    );
    if (!isOnALine) lines.push(wall);
  }
  return lines;
}

/** The two ends of a wall on the floor plan. */
const endsOf = ({ x, z, nx, nz, widthM }: Wall): Point[] => [
  [x - (nz * widthM) / 2, z + (nx * widthM) / 2],
  [x + (nz * widthM) / 2, z - (nx * widthM) / 2],
];

/** How far the floor-plan point (x, z) is from a wall: off its line, and past its ends. */
function gapToWallM(wall: Wall, x: number, z: number): number {
  const dx = x - wall.x;
  const dz = z - wall.z;
  const pastEndM = Math.max(0, Math.abs(wall.nx * dz - wall.nz * dx) - wall.widthM / 2);
  return Math.hypot(wall.nx * dx + wall.nz * dz, pastEndM);
}

/** Above 0 when the way from o to a to b turns left. */
const turn = (o: Point, a: Point, b: Point): number =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** The corners of the convex hull of the points (Andrew's monotone chain). */
function hullOf(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const hull: Point[] = [];
  for (const chain of [sorted, [...sorted].reverse()]) {
    const start = hull.length;
    for (const point of chain) {
      while (hull.length >= start + 2 && turn(hull[hull.length - 2]!, hull[hull.length - 1]!, point) <= 0) {
        hull.pop();
      }
      hull.push(point);
    }
    hull.pop(); // the last point of one chain is the first of the other
  }
  return hull;
}

/**
 * The footprint rectangle of LLD §5.8: the area of the smallest rectangle around the points at any angle, the
 * least over the rectangles that lie along an edge of their convex hull. NaN for points on one line. It is not
 * the box along the axes of the reference space, which grows as the room turns against them (FR-ROOM-10).
 * shortcut: every hull edge is tried against every hull corner, so a hull of more than HULL_MAX_CORNERS is not
 * measured (NaN: the volume stays unknown); use the rotating-calipers walk if a device mesh has that many (T-129).
 */
function footprintM2(points: readonly Point[]): number {
  const hull = hullOf(points);
  if (hull.length < 3 || hull.length > HULL_MAX_CORNERS) return NaN;
  let least = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const [ax, az] = hull[i]!;
    const [bx, bz] = hull[(i + 1) % hull.length]!;
    const edgeM = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / edgeM;
    const uz = (bz - az) / edgeM;
    let minAlong = 0;
    let maxAlong = 0;
    let across = 0;
    for (const [px, pz] of hull) {
      const along = (px - ax) * ux + (pz - az) * uz;
      minAlong = Math.min(minAlong, along);
      maxAlong = Math.max(maxAlong, along);
      across = Math.max(across, Math.abs((pz - az) * ux - (px - ax) * uz));
    }
    if (across <= EPSILON_M) return NaN; // a sliver left by rounding is still one line
    least = Math.min(least, (maxAlong - minAlong) * across);
  }
  return least;
}

/**
 * The room volume from the mesh of the whole room: its footprint rectangle times its vertical extent (LLD
 * §5.8). NaN when there is no such mesh, when its pose or one vertex is not finite or lies beyond ROOM_MAX_M,
 * and when it stands lower than the lowest ceiling the planes may give: a flat floor mesh has no volume.
 */
function meshVolumeM3(meshes: readonly RoomMesh[]): number {
  const mesh = meshes.find(({ label }) => label === GLOBAL_MESH_LABEL);
  if (mesh === undefined || !isRigid(mesh.pose)) return NaN;
  const { pose: m, vertices } = mesh;
  const points: Point[] = [];
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    const vx = vertices[i]!;
    const vy = vertices[i + 1]!;
    const vz = vertices[i + 2]!;
    const x = m[0]! * vx + m[4]! * vy + m[8]! * vz + m[12]!;
    const y = m[1]! * vx + m[5]! * vy + m[9]! * vz + m[13]!;
    const z = m[2]! * vx + m[6]! * vy + m[10]! * vz + m[14]!;
    // `<=` is false for a NaN as well
    if (!(Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) <= ROOM_MAX_M)) return NaN;
    points.push([x, z]);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return maxY - minY >= CEILING_MIN_HEIGHT_M ? footprintM2(points) * (maxY - minY) : NaN;
}

/** The height of a level plane's surface at the floor-plan point (x, z). */
function surfaceY(plane: RoomPlane, x: number, z: number): number {
  const m = plane.pose;
  return m[13]! - (m[4]! * (x - m[12]!) + m[6]! * (z - m[14]!)) / m[5]!;
}

/** How far the floor-plan point (x, z) lies off the rectangle of a level plane; 0 when the plane is under it. */
function offEdgeM(plane: RoomPlane, x: number, z: number): number {
  const m = plane.pose;
  const dx = x - m[12]!;
  const dy = surfaceY(plane, x, z) - m[13]!;
  const dz = z - m[14]!;
  const pastX = Math.abs(dx * m[0]! + dy * m[1]! + dz * m[2]!) - plane.extents.x / 2;
  const pastZ = Math.abs(dx * m[8]! + dy * m[9]! + dz * m[10]!) - plane.extents.y / 2;
  return Math.hypot(Math.max(0, pastX), Math.max(0, pastZ));
}

/**
 * The plane the bed rests on, at placement levels 1 and 2 only (LLD §5.8): of the level planes that pass within
 * 5 cm of the bed centre in height, the nearest to it on the floor plan, then the nearest in height. The centre
 * may be past the plane's edge by the bed's overhang, the far edge less the centre (0.30 m, FR-ROOM-03):
 * placement leaves it that far short of a table that starts beyond its reach (D-034).
 * `placement.surfaceId` is not read: a bed restored from an anchor has none and must get the same surface.
 */
function bedSurfaceOf(planes: readonly RoomPlane[], { pose, level }: BedPlacement): RoomPlane | undefined {
  if (level !== 1 && level !== 2) return undefined;
  let surface: RoomPlane | undefined;
  let leastOffM = Infinity;
  let leastGapM = Infinity;
  for (const plane of planes) {
    if (!isLevel(plane)) continue;
    const offM = offEdgeM(plane, pose[12]!, pose[14]!);
    const gapM = Math.abs(surfaceY(plane, pose[12]!, pose[14]!) - pose[13]!);
    // every `<=` and `<` is false for a NaN: a bed pose that is not finite has no surface
    const isInReach = offM <= BED_FAR_EDGE_MAX_M - BED_CENTRE_MAX_M && gapM <= BED_SURFACE_MAX_GAP_M;
    if (isInReach && (offM < leastOffM || (offM === leastOffM && gapM < leastGapM))) {
      surface = plane;
      leastOffM = offM;
      leastGapM = gapM;
    }
  }
  return surface;
}

/** A measurement is kept only when it is finite and above 0 (LLD §5.8): an unknown field is left out. */
function put(features: RoomFeatures, field: Exclude<keyof RoomFeatures, 'level'>, value: number): void {
  if (Number.isFinite(value) && value > 0) features[field] = value;
}

/** Planes and meshes to `RoomFeatures` (API_SPEC §1.3, FR-ROOM-10). The caller emits `room:features`. */
export class RoomFeatureExtractor {
  /**
   * For the tuning ripple (FR-ROOM-12): the surfaces the last `extract` found; none before the first. The ceiling
   * and the nearest wall are given at every placement level: a Wanderer session is told by its signature in
   * TuningRipple, not by missing surfaces.
   */
  surfaces: RoomSurfaces = {};

  /** The room adapters, or anything else with a `read()`. */
  constructor(
    private readonly planes: { read(): readonly RoomPlane[] },
    private readonly meshes: { read(): readonly RoomMesh[] },
  ) {}

  /**
   * The features of the room around this bed, from this frame's planes and meshes: call it inside an XR frame,
   * after the adapters' `setFrame`. Heights are in metres above the floor plane, or above y = 0 (the floor of
   * the local-floor space) when there is none. A room with no planes gives `{ level }` alone. Never throws.
   * shortcut: the floor is its largest plane, and a plane is the rectangle around its polygon (PlaneAdapter), so
   * an L-shaped floor is under-read in several planes and over-read in one; sum the polygons if a headset
   * reports such floors (T-129).
   */
  extract(placement: BedPlacement): RoomFeatures {
    const planes = this.planes.read().filter(isUsable);
    const y = (plane: RoomPlane): number => plane.pose[13]!;
    const floor = best(planes, (p) => (isLevel(p) && Math.abs(y(p)) <= FLOOR_MAX_OFFSET_M ? areaM2(p) : NaN));
    const floorY = floor ? y(floor) : 0;
    // The highest: a shelf top or a door top above 1.8 m is below the ceiling. A sloped ceiling is not level.
    const ceiling = best(planes, (p) => (isLevel(p) && y(p) - floorY >= CEILING_MIN_HEIGHT_M ? y(p) : NaN));
    const table = bedSurfaceOf(planes, placement);
    const uprights = planes.flatMap((plane) => wallOf(plane) ?? []);
    const walls = onePerLine(uprights);
    const widest = walls[0];
    // LLD §5.8: without a floor plane, the rectangle around the walls, which takes two that are not parallel.
    const hasCorner = widest !== undefined && walls.some((wall) => !isParallel(wall, widest));
    const floorAreaM2 = floor ? areaM2(floor) : hasCorner ? footprintM2(uprights.flatMap(endsOf)) : NaN;
    const ceilingHeightM = ceiling ? y(ceiling) - floorY : NaN;
    const planeVolumeM3 = floorAreaM2 * ceilingHeightM;

    const features: RoomFeatures = { level: placement.level };
    put(features, 'tableHeight', table ? y(table) - floorY : NaN);
    put(features, 'tableArea', table ? areaM2(table) : NaN);
    put(features, 'floorArea', floorAreaM2);
    put(features, 'wallCount', walls.length);
    put(features, 'ceilingHeight', ceilingHeightM);
    put(features, 'largestWallWidth', widest ? widest.widthM : NaN);
    put(features, 'roomVolume', planeVolumeM3 > 0 ? planeVolumeM3 : meshVolumeM3(this.meshes.read()));

    const nearest = best(walls, (wall) => -gapToWallM(wall, placement.pose[12]!, placement.pose[14]!));
    this.surfaces = {};
    if (table) this.surfaces.table = table;
    if (nearest) this.surfaces.nearestWall = nearest.plane;
    if (ceiling) this.surfaces.ceiling = ceiling;
    return features;
  }
}
