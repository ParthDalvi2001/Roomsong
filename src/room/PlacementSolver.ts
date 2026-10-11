// Where the bed goes (LLD §5.5): the fallback chain of FR-ROOM-01, the reach clamp of FR-ROOM-03 (D-020) and the
// bed frame of D-029. Plain code with no XR in it: the adapters read the room, RoomSystem (T-128) calls `update`
// every frame while a run is pending. Level 3 is a stub: the pinch confirms, but nothing draws a preview yet.
// Not seen on a headset: every number here was only ever run against the emulator's planes and hand-made ones.
import { bus, flags as pageFlags, log } from '../core/index.js';

import {
  BED_CENTRE_DEFAULT_M,
  BED_CENTRE_MAX_M,
  BED_CENTRE_MIN_M,
  BED_FAR_EDGE_MAX_M,
  EPSILON_M,
  FLOATING_DROP_M,
  HIT_TEST_TIMEOUT_MS,
  LEVEL_MIN_COS,
  SURFACE_MAX_HEIGHT_M,
  SURFACE_MIN_HEIGHT_M,
  TABLE_LABELS,
} from './config.js';

import type { BedPlacement, RoomPlane } from './types.js';
import type { Flags, Mat4, Vec3 } from '../core/index.js';
import type { PlacementLevel } from '../garden/index.js';

/** The head as placement reads it: where it is, and the level direction it faces (unit length). */
interface Head {
  x: number;
  y: number;
  z: number;
  fx: number;
  fz: number;
}

/**
 * Fills `out` from a head pose. Forward comes from the head's right vector, which pitch does not turn: a user
 * looking straight down at the table still faces somewhere. False, with nothing to use, for a pose that is not
 * finite or a head lying on its side.
 */
function readHead(pose: Mat4, out: Head): boolean {
  const rightX = pose[0]!;
  const rightZ = pose[2]!;
  const length = Math.sqrt(rightX * rightX + rightZ * rightZ);
  out.x = pose[12]!;
  out.y = pose[13]!;
  out.z = pose[14]!;
  out.fx = rightZ / length;
  out.fz = -rightX / length;
  return Number.isFinite(out.x + out.y + out.z + length) && length > EPSILON_M;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * The one way a bed pose is made, at every level. FR-ROOM-03: the centre is pulled along the head-to-point line
 * to 0.35..0.45 m from the head, measured level, and keeps the point's height. D-029: the bed is level, +z
 * points from its centre at the head and +x to the user's right. null when the numbers are not finite.
 */
function poseAt(head: Head, x: number, y: number, z: number): Mat4 | null {
  let ux = x - head.x;
  let uz = z - head.z;
  const distM = Math.sqrt(ux * ux + uz * uz);
  if (distM > EPSILON_M) {
    ux /= distM;
    uz /= distM;
  } else {
    // straight below (or above) the head there is no direction: use the way the head faces
    ux = head.fx;
    uz = head.fz;
  }
  const reachM = clamp(distM, BED_CENTRE_MIN_M, BED_CENTRE_MAX_M);
  const cx = head.x + reachM * ux;
  const cz = head.z + reachM * uz;
  // Columns: x = y cross z, y = up, z = -u (centre to head), then the centre. `0 - u` keeps -0 out of the pose.
  const pose = [0 - uz, 0, ux, 0, 0, 1, 0, 0, 0 - ux, 0, 0 - uz, 0, cx, y, cz, 1];
  return pose.every(Number.isFinite) ? pose : null;
}

/** Where a ray from `from` going `step` per metre leaves the slab -half..half. */
const exitM = (from: number, step: number, half: number): number =>
  step === 0 ? Infinity : (Math.sign(step) * half - from) / step;

interface Spot extends Vec3 {
  /** How far the default spot, 0.45 m ahead, is off this surface; 0 = on it. */
  missM: number;
}

/**
 * The point of `plane` to put the bed at, or null when the plane does not qualify for `level` (FR-ROOM-01,
 * D-034): it is level, it is a table (level 1) or 0.5..1.1 m high (level 2), it is at least 0.25 m below the
 * eyes, and it is within reach: its point nearest the default spot is in front of the user and at most 0.75 m
 * from the head, so part of the bed always rests on it. The bed goes from the head toward that point as far as
 * the surface goes, up to 0.45 m and not below 0.35 m (FR-ROOM-03); poseAt holds it to that range.
 * The sign of the plane's normal is never read (tests/e2e/README.md).
 * shortcut: the bed is aimed at that nearest point, so with the table to the user's side it can land a few cm
 * beside the table although the table has a point 0.45 m away; search the 0.45 m circle if the device rooms show
 * users sitting sideways to a table (T-129).
 */
function spotOn(head: Head, plane: RoomPlane, level: 1 | 2): Spot | null {
  const m = plane.pose;
  const [ax, az, nx, ny, nz, bx, bz] = [m[0]!, m[2]!, m[4]!, m[5]!, m[6]!, m[8]!, m[10]!];
  const [cx, cy, cz] = [m[12]!, m[13]!, m[14]!];
  const halfX = plane.extents.x / 2;
  const halfZ = plane.extents.y / 2;
  const isUsable = Number.isFinite(ax + az + nx + ny + nz + bx + bz + cx + cy + cz) && halfX > 0 && halfZ > 0;
  if (!isUsable || Math.abs(ny) < LEVEL_MIN_COS) return null;
  const isInBand = cy >= SURFACE_MIN_HEIGHT_M && cy <= SURFACE_MAX_HEIGHT_M;
  const fits = level === 1 ? TABLE_LABELS.includes(plane.label) : isInBand;
  // no bed higher than the floating one would be
  if (!fits || cy > head.y - FLOATING_DROP_M) return null;

  // From here on in the plane's own x-z, where the surface is the rectangle -half..half; h = the head, f = forward.
  // The slight skew of a plane that is not quite level is ignored (LEVEL_MIN_COS).
  const dx = cx - head.x;
  const dz = cz - head.z;
  const hx = -(dx * ax + dz * az);
  const hz = -(dx * bx + dz * bz);
  const fx = head.fx * ax + head.fz * az;
  const fz = head.fx * bx + head.fz * bz;
  const px = hx + BED_CENTRE_DEFAULT_M * fx;
  const pz = hz + BED_CENTRE_DEFAULT_M * fz;
  const qx = clamp(px, -halfX, halfX);
  const qz = clamp(pz, -halfZ, halfZ);
  const distM = Math.sqrt((qx - hx) * (qx - hx) + (qz - hz) * (qz - hz));
  const ux = (qx - hx) / distM;
  const uz = (qz - hz) / distM;
  // within reach; false also for a point straight below the head, which has no direction
  if (!(distM <= BED_FAR_EDGE_MAX_M && ux * fx + uz * fz > 0)) return null;
  const surfaceEndsM = Math.min(exitM(hx, ux, halfX), exitM(hz, uz, halfZ));
  const reachM = clamp(surfaceEndsM, BED_CENTRE_MIN_M, BED_CENTRE_MAX_M);
  // Back to the room: the offset from the plane's centre, and the surface's own height there.
  const ox = (hx + reachM * ux) * ax + (hz + reachM * uz) * bx;
  const oz = (hx + reachM * ux) * az + (hz + reachM * uz) * bz;
  return {
    x: cx + ox,
    y: cy - (nx * ox + nz * oz) / ny,
    z: cz + oz,
    missM: Math.sqrt((qx - px) * (qx - px) + (qz - pz) * (qz - pz)),
  };
}

/** Level 1 or 2: the qualifying plane nearest the default spot, the first seen on a tie; null when there is none. */
function placeOnPlanes(head: Head, planes: readonly RoomPlane[], level: 1 | 2): BedPlacement | null {
  let best: BedPlacement | null = null;
  let bestMissM = Infinity;
  for (let i = 0; i < planes.length; i++) {
    const plane = planes[i]!;
    const spot = spotOn(head, plane, level);
    const pose = spot !== null && spot.missM < bestMissM ? poseAt(head, spot.x, spot.y, spot.z) : null;
    if (spot === null || pose === null) continue;
    best = { pose, level, surfaceId: plane.id };
    bestMissM = spot.missM;
  }
  return best;
}

/** The part of PlaneAdapter and HitTestAdapter the chain uses; a test passes stubs. */
export interface PlaneSource {
  supported(): boolean;
  read(): readonly RoomPlane[];
}
export interface HitSource {
  supported(): boolean;
  hit(): Vec3 | null;
}

/**
 * The placement chain (API_SPEC §1.3): `run()` starts it, `update()` moves it on, and the promise resolves with
 * the bed of the first level that can place one: 1 a table plane, 2 a level plane 0.5..1.1 m high, 3 the point
 * the gaze hits when the user pinches (`confirm()`), at least 0.25 m below the eyes and 0.5 m above the floor,
 * 4 the floating bed, which always works (FR-ROOM-02).
 * `room:placementLevel` is emitted for each level tried; the last one of a run is the level of its bed.
 */
export class PlacementSolver {
  private resolve: ((placement: BedPlacement) => void) | null = null;
  private timeoutMs = 0;
  private level: PlacementLevel | null = null;
  /** When the current level began. */
  private sinceMs = 0;
  private isConfirmed = false;
  private readonly head: Head = { x: 0, y: 0, z: 0, fx: 0, fz: -1 };

  /** `flags.forceLevel` starts the chain at that level; a forced level that cannot place still falls on. */
  constructor(
    private readonly planes: PlaneSource,
    private readonly hits: HitSource,
    private readonly flags: Flags = pageFlags,
  ) {}

  /**
   * Starts a placement and drops one that was pending. `timeoutMs`: how long levels 1 and 2 together wait for
   * a plane (PLANE_LEVELS_TIMEOUT_MS); a value that is not finite counts as expired. The clock starts at the
   * first `update`. Never rejects. Not to be called from a `room:placementLevel` handler (API_SPEC §1.3).
   */
  run(opts: { timeoutMs: number }): Promise<BedPlacement> {
    this.cancel();
    this.timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 0;
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  /** Drops the pending run: its promise never settles. */
  cancel(): void {
    this.resolve = null;
    this.level = null;
    this.isConfirmed = false;
  }

  /** The pinch that confirms level 3. At any other level it means nothing. */
  confirm(): void {
    this.isConfirmed = this.level === 3;
  }

  /**
   * In every XR frame while a run is pending, after the adapters' `setFrame`. `headPose`: the head in the
   * reference space (the camera's `matrixWorld.elements`); `nowMs`: any clock that only goes forward.
   * shortcut: levels 1 and 2 read the planes anew on every frame of their wait (at most `timeoutMs`, once per
   * placement); cache per plane if the perf HUD shows it.
   */
  update(headPose: Mat4, nowMs: number): void {
    if (this.resolve === null) return;
    // A head pose that cannot be used places nothing: the run waits for a real one.
    if (!readHead(headPose, this.head)) return;
    if (this.level === null) this.enter(this.firstAvailable(this.flags.forceLevel ?? 1), nowMs);
    const placement = this.step(nowMs);
    if (placement === null) return;
    this.enter(placement.level, nowMs);
    const resolve = this.resolve; // read after the events: a handler may have cancelled the run
    this.cancel();
    resolve?.(placement);
  }

  /** The first level from `from` on that this session can try. Level 4 needs nothing. */
  private firstAvailable(from: PlacementLevel): PlacementLevel {
    if (from <= 2 && this.planes.supported()) return from;
    return from <= 3 && this.hits.supported() ? 3 : 4;
  }

  private enter(level: PlacementLevel, nowMs: number): void {
    if (level === this.level) return;
    this.level = level;
    this.sinceMs = nowMs;
    bus.emit('room:placementLevel', { level });
  }

  /** One frame of the current level: its bed, or null while it waits. A level that gives up hands over at once. */
  private step(nowMs: number): BedPlacement | null {
    if (this.level === 3) return this.stepHitTest(nowMs);
    const head = this.head;
    if (this.level === 4) {
      // FR-ROOM-01: 0.45 m forward of the head, 0.25 m below eye height
      const x = head.x + BED_CENTRE_DEFAULT_M * head.fx;
      const z = head.z + BED_CENTRE_DEFAULT_M * head.fz;
      const pose = poseAt(head, x, head.y - FLOATING_DROP_M, z);
      return pose && { pose, level: 4 };
    }
    const planes = this.planes.read();
    const onTable = this.level === 1 ? placeOnPlanes(head, planes, 1) : null;
    const placed = onTable ?? placeOnPlanes(head, planes, 2);
    // `<` is false for a clock that is not a number: the wait ends instead of holding the bed back
    if (placed !== null || nowMs - this.sinceMs < this.timeoutMs) return placed;
    return this.fallTo(this.firstAvailable(3), nowMs);
  }

  private stepHitTest(nowMs: number): BedPlacement | null {
    const point = this.isConfirmed ? this.hits.hit() : null;
    this.isConfirmed = false;
    // FR-ROOM-01 (D-034): a pinch while the gaze is on a wall at eye height, or on the floor, is no confirm. No bed
    // higher than the floating one would be, and none lower than a level-2 surface may be.
    const isInReach =
      point !== null && point.y <= this.head.y - FLOATING_DROP_M && point.y >= SURFACE_MIN_HEIGHT_M;
    const pose = isInReach ? poseAt(this.head, point.x, point.y, point.z) : null;
    if (pose) return { pose, level: 3 };
    if (this.hits.supported() && nowMs - this.sinceMs < HIT_TEST_TIMEOUT_MS) return null;
    return this.fallTo(4, nowMs);
  }

  /** A level waited and got nothing. Ending up at level 4 that way is E_PLACEMENT_TIMEOUT: expected, not fatal. */
  private fallTo(level: PlacementLevel, nowMs: number): BedPlacement | null {
    if (level === 4) log.warn('room', 'E_PLACEMENT_TIMEOUT');
    this.enter(level, nowMs);
    return this.step(nowMs);
  }
}
