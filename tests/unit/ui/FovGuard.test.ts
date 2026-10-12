// FR-UI-03 / NFR-FOV-01: the FoV guard on poses worked by hand. Head matrices are written out column by column
// (right, up, back, position), the layout of THREE.Matrix4.elements, so no Three.js maths is trusted here.
import { describe, expect, it } from 'vitest';

import { FOV_HALF_H_DEG, FOV_HALF_V_DEG } from '../../../src/ui/config.js';
import { clampToFov, fovBoundsDeg, type FovBounds, type FovElement } from '../../../src/ui/FovGuard.js';

import type { Mat4, Vec3 } from '../../../src/core/index.js';

const rad = (deg: number) => (deg * Math.PI) / 180;
const TAN_H = Math.tan(rad(FOV_HALF_H_DEG)); // 0.4663
const TAN_V = Math.tan(rad(FOV_HALF_V_DEG)); // 0.3640

/** A head at `at`, looking down -z with +y up: the pose a seated user starts in. */
const upright = (at: Vec3): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, at.x, at.y, at.z, 1];
const HEAD = { x: 0, y: 1.2, z: 0 };
/** A point with no size, on the plane 1 m ahead: the numbers below are then tangents. */
const POINT: FovElement = { distanceM: 1, halfWidthM: 0, halfHeightM: 0 };
const bounds = (): FovBounds => ({ leftDeg: 0, rightDeg: 0, downDeg: 0, upDeg: 0 });

function clamp(head: Mat4, wanted: Vec3, element = POINT) {
  const out = { x: 0, y: 0, z: 0 };
  const moved = clampToFov(head, wanted, element, out);
  return { out, moved };
}
function expectAt(actual: Vec3, x: number, y: number, z: number) {
  expect(actual.x).toBeCloseTo(x, 9);
  expect(actual.y).toBeCloseTo(y, 9);
  expect(actual.z).toBeCloseTo(z, 9);
}

describe('clampToFov (FR-UI-03)', () => {
  it('the box is 25 degrees to each side and 20 up or down', () => {
    // Pinned: the cases below take their edges from these two constants, so a wider box would pass them all.
    expect(FOV_HALF_H_DEG).toBe(25);
    expect(FOV_HALF_V_DEG).toBe(20);
    expect(TAN_H).toBeCloseTo(0.46631, 5);
    expect(TAN_V).toBeCloseTo(0.36397, 5);
  });

  it('leaves a point inside the box where it is', () => {
    // 0.2 right and 0.1 up at 1 m: 11.3 and 5.7 degrees
    const { out, moved } = clamp(upright(HEAD), { x: 0.2, y: 1.3, z: -1 });
    expect(moved).toBe(false);
    expectAt(out, 0.2, 1.3, -1);
  });

  it('keeps the direction of an inside point and puts it at the asked distance', () => {
    // the same direction as above from twice as far: it comes back onto the 1 m plane
    const { out, moved } = clamp(upright(HEAD), { x: 0.4, y: 1.4, z: -2 });
    expect(moved).toBe(false);
    expectAt(out, 0.2, 1.3, -1);
  });

  it('clamps a point outside the box to its edge', () => {
    // 45 degrees to the right, level: the right edge, 25 degrees
    const right = clamp(upright(HEAD), { x: 1, y: 1.2, z: -1 });
    expect(right.moved).toBe(true);
    expectAt(right.out, TAN_H, 1.2, -1);
    // 45 degrees to the left
    expectAt(clamp(upright(HEAD), { x: -1, y: 1.2, z: -1 }).out, -TAN_H, 1.2, -1);
    // 45 degrees up and 45 down, straight ahead: the top and bottom edges, 20 degrees
    expectAt(clamp(upright(HEAD), { x: 0, y: 2.2, z: -1 }).out, 0, 1.2 + TAN_V, -1);
    expectAt(clamp(upright(HEAD), { x: 0, y: 0.2, z: -1 }).out, 0, 1.2 - TAN_V, -1);
    // beyond both: the corner
    expectAt(clamp(upright(HEAD), { x: 5, y: 9, z: -1 }).out, TAN_H, 1.2 + TAN_V, -1);
  });

  it('brings a point behind the head to the nearer side edge, at its own elevation', () => {
    // behind and to the left, level with the eyes
    const left = clamp(upright(HEAD), { x: -0.5, y: 1.2, z: 2 });
    expect(left.moved).toBe(true);
    expectAt(left.out, -TAN_H, 1.2, -1);
    // behind and to the right
    expectAt(clamp(upright(HEAD), { x: 0.5, y: 1.2, z: 2 }).out, TAN_H, 1.2, -1);
    // straight to the right and 10 degrees up: the right edge, and 10 degrees up as seen from there
    const side = clamp(upright(HEAD), { x: 1, y: 1.2 + Math.tan(rad(10)), z: 0 });
    expectAt(side.out, TAN_H, 1.2 + Math.tan(rad(10)) / Math.cos(rad(FOV_HALF_H_DEG)), -1);
  });

  it('puts a point at the head itself, or straight above it, somewhere in the box', () => {
    expectAt(clamp(upright(HEAD), HEAD).out, 0, 1.2, -1);
    expectAt(clamp(upright(HEAD), { x: 0, y: 5, z: 0 }).out, 0, 1.2 + TAN_V, -1);
  });

  it('follows a turned head: the box is around the gaze, not around the room', () => {
    // yawed 90 degrees to the left: right = -z, up = +y, back = +x, so the gaze is -x
    const yawedLeft: Mat4 = [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1.2, 0, 1];
    // a point straight down the room's -z is now 90 degrees to the right: the right edge
    const { out, moved } = clamp(yawedLeft, { x: 0, y: 1.2, z: -1 });
    expect(moved).toBe(true);
    expectAt(out, -1, 1.2, -TAN_H);
    // a point down the gaze stays
    expectAt(clamp(yawedLeft, { x: -1, y: 1.3, z: -0.2 }).out, -1, 1.3, -0.2);
  });

  it('follows a tilted head: the box rolls with it', () => {
    // rolled 90 degrees onto the right shoulder: right = -y, up = +x, back = +z, gaze still -z
    const rolled: Mat4 = [0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1.2, 0, 1];
    // 0.42 to the room's right is "up" for this head: inside 25 degrees sideways it would stay, but the
    // head's vertical limit is 20 degrees (0.364), so it is clamped
    const up = clamp(rolled, { x: 0.42, y: 1.2, z: -1 });
    expect(up.moved).toBe(true);
    expectAt(up.out, TAN_V, 1.2, -1);
    // 0.42 above the head in the room is the head's left: inside 25 degrees (0.466), so it stays
    const left = clamp(rolled, { x: 0, y: 1.62, z: -1 });
    expect(left.moved).toBe(false);
    expectAt(left.out, 0, 1.62, -1);
  });

  it('keeps the whole element inside, not only its centre', () => {
    // a 0.40 x 0.05 m caption at 0.6 m: the centre may go 0.6 * tan 25 - 0.2 = 0.0798 to the side
    const caption: FovElement = { distanceM: 0.6, halfWidthM: 0.2, halfHeightM: 0.025 };
    const { out } = clamp(upright(HEAD), { x: 3, y: 9, z: -0.6 }, caption);
    expectAt(out, 0.6 * TAN_H - 0.2, 1.2 + 0.6 * TAN_V - 0.025, -0.6);
    const edges = fovBoundsDeg(upright(HEAD), out, caption, bounds());
    expect(edges.rightDeg).toBeCloseTo(FOV_HALF_H_DEG, 9);
    expect(edges.upDeg).toBeCloseTo(FOV_HALF_V_DEG, 9);
  });

  it('centres an element that is wider than the box', () => {
    const wide: FovElement = { distanceM: 0.6, halfWidthM: 1, halfHeightM: 1 };
    expectAt(clamp(upright(HEAD), { x: 3, y: 9, z: -0.6 }, wide).out, 0, 1.2, -0.6);
  });

  it('may write into the vector it reads', () => {
    const p = { x: 1, y: 1.2, z: -1 };
    clampToFov(upright(HEAD), p, POINT, p);
    expectAt(p, TAN_H, 1.2, -1);
  });
});

describe('fovBoundsDeg: the self-report of TC-E2E-11', () => {
  it('reports the edges of an element as angles from the gaze', () => {
    const element: FovElement = { distanceM: 1, halfWidthM: 0.1, halfHeightM: 0.05 };
    // centre 0.2 right and 0.1 below the gaze, 1 m ahead
    const edges = fovBoundsDeg(upright(HEAD), { x: 0.2, y: 1.1, z: -1 }, element, bounds());
    expect(edges.leftDeg).toBeCloseTo(Math.atan(0.1) / rad(1), 9); // 5.71
    expect(edges.rightDeg).toBeCloseTo(Math.atan(0.3) / rad(1), 9); // 16.70
    expect(edges.downDeg).toBeCloseTo(-Math.atan(0.15) / rad(1), 9); // -8.53
    expect(edges.upDeg).toBeCloseTo(-Math.atan(0.05) / rad(1), 9); // -2.86
  });

  it('reports an element beside or behind the head as far outside the box', () => {
    const edges = fovBoundsDeg(upright(HEAD), { x: 1, y: 1.2, z: 1 }, POINT, bounds());
    expect(edges.rightDeg).toBeCloseTo(135, 9);
    expect(edges.rightDeg).toBeGreaterThan(FOV_HALF_H_DEG);
  });
});
