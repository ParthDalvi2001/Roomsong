// The FoV guard (FR-UI-03, NFR-FOV-01): essential UI stays within FOV_HALF_H_DEG to each side and FOV_HALF_V_DEG up
// or down of the forward gaze. Pure and allocation-free: callable every frame.
import { FOV_HALF_H_DEG, FOV_HALF_V_DEG } from './config.js';

import type { Mat4, Vec3 } from '../core/index.js';

const RAD_PER_DEG = Math.PI / 180;
const TAN_HALF_H = Math.tan(FOV_HALF_H_DEG * RAD_PER_DEG);
const TAN_HALF_V = Math.tan(FOV_HALF_V_DEG * RAD_PER_DEG);

/** What is placed: a flat element facing the head. Metres. A point has half sizes of 0. */
export interface FovElement {
  /** How far ahead of the head it is drawn, measured along the gaze. */
  distanceM: number;
  halfWidthM: number;
  halfHeightM: number;
}

/** The edges of an element as angles from the forward gaze, in degrees: right and up are positive. */
export interface FovBounds {
  leftDeg: number;
  rightDeg: number;
  downDeg: number;
  upDeg: number;
}

/** Element `i`. Of a head matrix: columns are right (0-2), up (4-6), back (8-10) and position (12-14). */
const m = (matrix: Mat4, i: number): number => matrix[i] as number;

// `p` in the head's own axes: x to its right, y up, z ahead. A typed array, not three module variables: V8 puts
// every number written to a module variable on the heap (tests/unit/ui/Captions.test.ts measures it).
const LOCAL = new Float64Array(3);
function toHeadSpace(head: Mat4, p: Vec3): void {
  const dx = p.x - m(head, 12);
  const dy = p.y - m(head, 13);
  const dz = p.z - m(head, 14);
  LOCAL[0] = dx * m(head, 0) + dy * m(head, 1) + dz * m(head, 2);
  LOCAL[1] = dx * m(head, 4) + dy * m(head, 5) + dz * m(head, 6);
  // A head looks down -z. `0 -`, not a unary minus: a point at the head must give +0 (atan2(0, -0) is 180 degrees).
  LOCAL[2] = 0 - (dx * m(head, 8) + dy * m(head, 9) + dz * m(head, 10));
}

/**
 * Clamps `wanted` into the FoV box (FR-UI-03) and writes the result to `out` (which may be `wanted`): the point
 * `element.distanceM` ahead of the head in the direction of `wanted`, moved to the nearest edge when that direction
 * is outside the box. The box is smaller than 25 by 20 degrees by the element's half size, so its edges stay inside
 * too. A point beside or behind the head comes to the nearer side edge at its own elevation.
 * `head` is the head's world matrix (THREE.Matrix4.elements, no scale). Returns whether the direction had to change.
 * Creates no objects. Per frame, pass a THREE.Vector3 as `out`: V8 may box a number written to a plain object.
 * Every caller passes `wanted` and `out` with plain x, y, z fields, never an accessor object (an ArrayVec3, IWSDK's
 * SyncedVector3): one accessor shape at any call site makes V8 box the numbers at all of them (24 bytes a call in
 * Chromium with the panel open and a caption up, T-128d review).
 */
export function clampToFov(head: Mat4, wanted: Vec3, element: Readonly<FovElement>, out: Vec3): boolean {
  toHeadSpace(head, wanted);
  const localX = m(LOCAL, 0);
  const localY = m(LOCAL, 1);
  const localZ = m(LOCAL, 2);
  const d = element.distanceM;
  const limitX = Math.max(0, d * TAN_HALF_H - element.halfWidthM);
  const limitY = Math.max(0, d * TAN_HALF_V - element.halfHeightM);

  const yaw = Math.atan2(localX, localZ);
  const maxYaw = Math.atan2(limitX, d);
  const yawClamped = Math.min(maxYaw, Math.max(-maxYaw, yaw));
  const pitch = Math.atan2(localY, Math.sqrt(localX * localX + localZ * localZ));
  // On the plane `d` ahead. Straight up or down is a tangent of about 1e16: the clamp takes it.
  const x = d * Math.tan(yawClamped);
  const y = (d * Math.tan(pitch)) / Math.cos(yawClamped);
  const yClamped = Math.min(limitY, Math.max(-limitY, y));

  out.x = m(head, 12) + x * m(head, 0) + yClamped * m(head, 4) - d * m(head, 8);
  out.y = m(head, 13) + x * m(head, 1) + yClamped * m(head, 5) - d * m(head, 9);
  out.z = m(head, 14) + x * m(head, 2) + yClamped * m(head, 6) - d * m(head, 10);
  return yawClamped !== yaw || yClamped !== y;
}

/**
 * The self-report of TC-E2E-11: where the edges of an element centred on `centre` are, seen from `head`. Inside the
 * box means leftDeg >= -FOV_HALF_H_DEG, rightDeg <= FOV_HALF_H_DEG, downDeg >= -FOV_HALF_V_DEG, upDeg <= FOV_HALF_V_DEG.
 * Fills and returns `out`.
 */
export function fovBoundsDeg(head: Mat4, centre: Vec3, element: Readonly<FovElement>, out: FovBounds) {
  toHeadSpace(head, centre);
  const localX = m(LOCAL, 0);
  const localY = m(LOCAL, 1);
  const localZ = m(LOCAL, 2);
  out.leftDeg = Math.atan2(localX - element.halfWidthM, localZ) / RAD_PER_DEG;
  out.rightDeg = Math.atan2(localX + element.halfWidthM, localZ) / RAD_PER_DEG;
  out.downDeg = Math.atan2(localY - element.halfHeightM, localZ) / RAD_PER_DEG;
  out.upDeg = Math.atan2(localY + element.halfHeightM, localZ) / RAD_PER_DEG;
  return out;
}
