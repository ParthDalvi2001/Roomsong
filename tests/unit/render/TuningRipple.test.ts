// The tuning ripple's drawing (FR-ROOM-12, LLD §5.8, UX §5): one quad per surface, each with its sweep, its
// afterglow and its showing and hiding through the flash cap (FR-UI-11). The rooms are the emulator's `table`
// room in world space (tests/fixtures/rooms/table.json): the bed 0.45 m ahead on the table, the front wall and
// the ceiling over it.
import { Color, Group, Matrix4, SRGBColorSpace, Vector3, type Mesh, type ShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { BED_OUTER } from '../../../src/garden/index.js';
import {
  BED_RIM_M,
  ICE,
  RIPPLE_AFTERGLOW_MS,
  RIPPLE_CREST_M,
  RIPPLE_GLOW_MS,
  RIPPLE_SWEEP_AT_MS,
  RIPPLE_SWEEP_MS,
} from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { TuningRipple, type RipplePlan } from '../../../src/render/TuningRipple.js';

import { changeTimes, mostInAnyClip, type Drawn } from './changes.js';

import type { SurfaceRef } from '../../../src/room/index.js';

type V = [number, number, number];
/** A pose from its three axes and its centre, column-major as Three.js and WebXR hold it. */
const pose = (x: V, y: V, z: V, at: V): number[] => [...x, 0, ...y, 0, ...z, 0, ...at, 1];
// The emulator's table top faces down: its normal's sign is not defined (room/types.ts).
const TABLE: SurfaceRef = {
  id: 'table',
  pose: pose([1, 0, 0], [0, -1, 0], [0, 0, -1], [0, 0.74, -0.5]),
  extents: { x: 1.2, y: 0.8 },
};
// The front wall faces the user: its normal is +z, so its own z axis points down.
const WALL: SurfaceRef = {
  id: 'wall',
  pose: pose([1, 0, 0], [0, 0, 1], [0, -1, 0], [0, 1.25, -2.25]),
  extents: { x: 4, y: 2.5 },
};
const CEILING: SurfaceRef = {
  id: 'ceiling',
  pose: pose([1, 0, 0], [0, -1, 0], [0, 0, -1], [0, 2.5, 0]),
  extents: { x: 4, y: 4.5 },
};
const BED = pose([1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0.74, -0.45]); // +z toward the user (D-029)
const T0_MS = 10_000;
const FRAME_MS = 10;

const plan = (over: Partial<RipplePlan> = {}): RipplePlan => ({
  surfaces: { table: TABLE, nearestWall: WALL, ceiling: CEILING },
  bedPose: BED,
  isWanderer: false,
  paletteSeed: 0x0fe2778b,
  isReducedMotion: false,
  ...over,
});

const uniforms = (mesh: Mesh) =>
  (mesh.material as ShaderMaterial).uniforms as Record<string, { value: unknown }>;
const place = (mesh: Mesh) => uniforms(mesh).uPlace!.value as Float32Array; // size x, size z, origin x, origin z
const sweep = (mesh: Mesh) => uniforms(mesh).uSweep!.value as Float32Array; // dir x, dir z, length, trail
const now = (mesh: Mesh) => uniforms(mesh).uNow!.value as Float32Array; // crest (m from the origin), brightness

/** A point of a quad's plane (its own x and z, in metres) in world space, through the quad's own matrix. */
function world(mesh: Mesh, x: number, z: number): Vector3 {
  const [sizeX, sizeZ] = place(mesh);
  return new Vector3(x / sizeX!, 0, z / sizeZ!).applyMatrix4(mesh.matrix);
}
const expectAt = (point: Vector3, [x, y, z]: V): void => {
  expect(point.x).toBeCloseTo(x, 6);
  expect(point.y).toBeCloseTo(y, 6);
  expect(point.z).toBeCloseTo(z, 6);
};

function rig(p: RipplePlan = plan(), guard = new FlashGuard()) {
  const parent = new Group();
  const ripple = new TuningRipple(parent, guard);
  const meshes = parent.children as Mesh[];
  /** Per quad, the brightness drawn at each frame (0 while hidden), from T0_MS. */
  const drawn: Drawn[][] = [[], [], []];
  let t = T0_MS;
  const frame = (): void => {
    ripple.update(t);
    meshes.forEach((mesh, i) => drawn[i]!.push({ t, value: mesh.visible ? now(mesh)[1]! : 0 }));
    t += FRAME_MS;
  };
  /** Frames up to `ms` after T0_MS. */
  const runTo = (ms: number): void => {
    while (t <= T0_MS + ms) frame();
  };
  ripple.start(p, T0_MS);
  /** When quad `i` was first and last drawn, in ms from the start; NaN if never. */
  const shownSpan = (i: number) => {
    const on = drawn[i]!.filter((d) => d.value > 0).map((d) => d.t - T0_MS);
    return on.length === 0 ? [NaN, NaN] : [on[0]!, on[on.length - 1]!];
  };
  return { parent, ripple, meshes, drawn, frame, runTo, shownSpan, guard, at: () => t };
}

describe('TuningRipple: one quad per surface (LLD §5.8: at most 3 draw calls, 100 triangles)', () => {
  it('draws three quads of two triangles on the parent, none of them before a ripple starts', () => {
    const parent = new Group();
    const ripple = new TuningRipple(parent, new FlashGuard());
    expect(parent.children).toHaveLength(3);
    const triangles = (parent.children as Mesh[]).reduce((sum, m) => sum + m.geometry.index!.count / 3, 0);
    expect(triangles).toBe(6);
    for (let t = 0; t < 5000; t += 100) ripple.update(t);
    expect(parent.children.every((mesh) => !mesh.visible)).toBe(true);
    ripple.dispose();
    expect(parent.children).toEqual([]);
  });
});

describe('TuningRipple: the timeline (FR-ROOM-12)', () => {
  it('table at 0.3 s, wall at 1.5 s, ceiling at 2.7 s: each drawn for its sweep and its 1 s afterglow', () => {
    const r = rig();
    r.runTo(5000);
    for (let i = 0; i < 3; i++) {
      const end = RIPPLE_SWEEP_AT_MS[i]! + RIPPLE_SWEEP_MS[i]! + RIPPLE_AFTERGLOW_MS;
      expect(r.shownSpan(i), `quad ${i}`).toEqual([RIPPLE_SWEEP_AT_MS[i], end - FRAME_MS]);
    }
  });

  it('a missing surface skips its sweep; the others keep their times', () => {
    const r = rig(plan({ surfaces: { nearestWall: WALL, ceiling: CEILING } }));
    r.runTo(5000);
    expect(r.shownSpan(0)).toEqual([NaN, NaN]);
    expect(r.shownSpan(1)[0]).toBe(RIPPLE_SWEEP_AT_MS[1]);
    expect(r.shownSpan(2)[0]).toBe(RIPPLE_SWEEP_AT_MS[2]);
  });

  it('Wanderer: one ripple on the bed at 0.3 s, as wide as the bed; none on the wall and ceiling it was given', () => {
    const r = rig(plan({ isWanderer: true, paletteSeed: 0 }));
    r.runTo(5000);
    expect(r.shownSpan(0)[0]).toBe(RIPPLE_SWEEP_AT_MS[0]);
    expect(r.shownSpan(1)).toEqual([NaN, NaN]);
    expect(r.shownSpan(2)).toEqual([NaN, NaN]);
    const bed = r.meshes[0]!;
    const radius = BED_OUTER + BED_RIM_M;
    expect(Array.from(place(bed))).toEqual([2 * radius, 2 * radius, 0, 0].map(Math.fround));
    expect(sweep(bed)[0]).toBe(0); // radial
    expect(sweep(bed)[1]).toBe(0);
    expect(sweep(bed)[2]).toBeCloseTo(radius, 6); // a disc: nothing past the bed's rim
    expectAt(world(bed, 0, 0), [0, 0.74, -0.45]);
  });

  it('a room that is not Wanderer but has no surface to sweep: one ripple on the bed only (UX §3.2)', () => {
    const r = rig(plan({ surfaces: {} }));
    r.runTo(5000);
    expect(r.shownSpan(0)[0]).toBe(RIPPLE_SWEEP_AT_MS[0]);
    expect(r.shownSpan(1)).toEqual([NaN, NaN]);
    expect(r.shownSpan(2)).toEqual([NaN, NaN]);
    expect(sweep(r.meshes[0]!)[2]).toBeCloseTo(BED_OUTER + BED_RIM_M, 6); // the bed's disc
    expectAt(world(r.meshes[0]!, 0, 0), [0, 0.74, -0.45]);
  });

  it('every quad is drawn wherever it lies: none is frustum-culled', () => {
    expect(rig().meshes.every((mesh) => !mesh.frustumCulled)).toBe(true);
  });

  it('stop(): what is lit is taken away through the guard, and no later sweep starts', () => {
    const r = rig();
    r.runTo(400);
    expect(r.meshes[0]!.visible).toBe(true);
    r.ripple.stop();
    r.runTo(5000);
    expect(r.shownSpan(0)[1]).toBe(400);
    expect(r.shownSpan(1)).toEqual([NaN, NaN]);
    expect(r.shownSpan(2)).toEqual([NaN, NaN]);
  });
});

describe('TuningRipple: where each crest runs (UX §5)', () => {
  it("the table: radial from the bed, out to the table's farthest corner in 0.6 s", () => {
    const r = rig();
    const table = r.meshes[0]!;
    expectAt(world(table, 0, 0), [0, 0.74, -0.5]); // the matrix is the table's
    r.runTo(RIPPLE_SWEEP_AT_MS[0] + RIPPLE_SWEEP_MS[0] / 2);
    const [, , originX, originZ] = place(table);
    // The origin is the bed's centre, in the table's own x and z.
    const origin = world(table, originX!, originZ!);
    expect(origin.x).toBeCloseTo(0, 6);
    expect(origin.z).toBeCloseTo(-0.45, 6);
    expect(sweep(table)[0]).toBe(0);
    expect(sweep(table)[1]).toBe(0);
    const farthest = Math.hypot(0.6, 0.4 + 0.05);
    expect(sweep(table)[2]).toBeCloseTo(farthest, 6);
    expect(now(table)[0]).toBeCloseTo(farthest / 2, 6); // halfway through the sweep, halfway out
  });

  it('the wall: up from its base, over its whole height in 1.0 s, whichever way its own axes point', () => {
    const r = rig();
    const wall = r.meshes[1]!;
    r.runTo(RIPPLE_SWEEP_AT_MS[1]);
    const [, , originX, originZ] = place(wall);
    const [dirX, dirZ, length] = sweep(wall);
    expect(world(wall, originX!, originZ!).y).toBeCloseTo(0, 6); // the base
    expect(world(wall, originX! + dirX! * length!, originZ! + dirZ! * length!).y).toBeCloseTo(2.5, 6); // the top
    r.runTo(RIPPLE_SWEEP_AT_MS[1] + RIPPLE_SWEEP_MS[1] / 4);
    expect(now(wall)[0]).toBeCloseTo(2.5 / 4, 6);
  });

  it('the ceiling: from straight above the bed across to the far edge ahead, in 0.8 s', () => {
    const r = rig();
    const ceiling = r.meshes[2]!;
    r.runTo(RIPPLE_SWEEP_AT_MS[2]);
    const [, , originX, originZ] = place(ceiling);
    const [dirX, dirZ, length] = sweep(ceiling);
    expectAt(world(ceiling, originX!, originZ!), [0, 2.5, -0.45]);
    const end = world(ceiling, originX! + dirX! * length!, originZ! + dirZ! * length!);
    expect(end.z).toBeCloseTo(-2.25, 6); // the edge over the front wall
  });

  it('the afterglow is the room tint: ICE turned by paletteSeed % 360 degrees; untinted in a Wanderer room', () => {
    const hsl = { h: 0, s: 0, l: 0 };
    const trail = (seed: number) => {
      const r = rig(plan({ paletteSeed: seed }));
      const value = uniforms(r.meshes[0]!).uTrail!.value as Color;
      return new Color().setRGB(value.r, value.g, value.b, SRGBColorSpace); // the uniform holds encoded values
    };
    const ice = new Color(ICE).getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
    trail(0).getHSL(hsl, SRGBColorSpace);
    expect(hsl.h).toBeCloseTo(ice.h, 4);
    expect(hsl.s).toBeCloseTo(ice.s, 4);
    trail(360 + 120).getHSL(hsl, SRGBColorSpace);
    expect(hsl.h).toBeCloseTo((ice.h + 1 / 3) % 1, 4);
    expect(hsl.l).toBeCloseTo(ice.l, 4);
  });
});

describe('TuningRipple: reduced motion and the flash cap (FR-UI-06, FR-UI-11)', () => {
  it('reduced motion: each surface glows for 0.4 s in the same order, and no crest moves', () => {
    const r = rig(plan({ isReducedMotion: true }));
    const fronts: number[] = [];
    while (r.at() <= T0_MS + 5000) {
      r.frame();
      if (r.meshes[1]!.visible) fronts.push(now(r.meshes[1]!)[0]!);
    }
    for (let i = 0; i < 3; i++) {
      const [from, to] = r.shownSpan(i);
      expect(from, `quad ${i}`).toBeGreaterThanOrEqual(RIPPLE_SWEEP_AT_MS[i]!);
      expect(to! - from!, `quad ${i}`).toBeLessThan(RIPPLE_GLOW_MS);
      expect(to! - from!, `quad ${i}`).toBeGreaterThan(RIPPLE_GLOW_MS - 3 * FRAME_MS);
      // It rises to full and falls again: a glow, not a step.
      const peak = Math.max(...r.drawn[i]!.map((d) => d.value));
      expect(peak).toBeGreaterThan(0.99);
    }
    // The whole wall is lit at once: its crest stands past the far edge, and does not move.
    expect(new Set(fronts).size).toBe(1);
    expect(fronts[0]).toBeCloseTo(sweep(r.meshes[1]!)[2]! + RIPPLE_CREST_M, 6);
  });

  it.each([false, true])('reduced motion %s: two changes per quad, one in and one out', (isReducedMotion) => {
    const guard = new FlashGuard();
    const r = rig(plan({ isReducedMotion }), guard);
    r.runTo(5000);
    expect(guard.takePeak()).toBe(isReducedMotion ? 2 : 1); // the glow's two fall inside one second
    for (let i = 0; i < 3; i++) expect(changeTimes(r.drawn[i]!), `quad ${i}`).toHaveLength(2);
  });

  it('a ripple started again and again (Re-place after Re-place) never passes 3 changes a second', () => {
    const guard = new FlashGuard();
    const r = rig(plan(), guard);
    for (let k = 0; k < 40; k++) {
      const until = r.at() + 37 + (k % 5) * 90 - T0_MS;
      r.runTo(until);
      r.ripple.start(plan({ isReducedMotion: k % 3 === 0 }), r.at() - 300 - (k % 4) * 400);
    }
    r.runTo(r.at() + 5000 - T0_MS);
    expect(guard.takePeak()).toBeLessThanOrEqual(3);
    for (let i = 0; i < 3; i++) expect(mostInAnyClip(r.drawn[i]!), `quad ${i}`).toBeLessThanOrEqual(3);
  });
});

describe('TuningRipple matrices', () => {
  it('a quad lies on its surface: its matrix is the pose, its x and z scaled to the extents', () => {
    const r = rig();
    const wall = r.meshes[1]!;
    const expected = new Matrix4().fromArray(WALL.pose).scale(new Vector3(4, 1, 2.5));
    expect(wall.matrix.elements.map((n) => Number(n.toFixed(9)))).toEqual(
      expected.elements.map((n) => Number(n.toFixed(9))),
    );
    expect(wall.matrixAutoUpdate).toBe(false);
  });
});
