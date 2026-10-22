// VineRenderer (FR-ROOM-04, Could C4; T-149): the vine's length follows the garden's plant count, it grows over
// VINE_GROW_MS and shrinks the same way, it is hidden (count 0) with no plants, no wall or a wall too far, it
// lies on the wall from the bed's height up, and under reduced motion it fades instead of growing (FR-UI-06).
import { Group } from 'three';
import { describe, expect, it } from 'vitest';

import {
  PLANT_CAPACITY,
  PLANT_REST_BRIGHTNESS,
  VINE_FADE_MS,
  VINE_GROW_MS,
  VINE_SEGMENT_M,
  VINE_SEGMENTS,
  VINE_SWAY_M,
} from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { VineRenderer } from '../../../src/render/VineRenderer.js';

import type { Plant } from '../../../src/garden/index.js';
import type { SurfaceRef } from '../../../src/room/index.js';

const FRAME_MS = 10;
/** The bed on the table of the fixture rooms. */
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];
/** A wall facing +z (its own z axis points down), 4 m wide and 2.5 m high, `z` metres out. */
const wall = (z: number): SurfaceRef => ({
  id: 'w',
  pose: [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1.25, z, 1],
  extents: { x: 4, y: 2.5 },
});
const NEAR = wall(-1); // 0.55 m from the bed's centre
const FAR = wall(-2.25); // 1.8 m: past VINE_WALL_MAX_M

const plants = (count: number): Plant[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    voice: 'bell',
    cell: { ring: i % 5, step: i % 16 },
    height: 0.5,
    hue: i / Math.max(1, count),
    plantedAt: 0,
  }));

function rig() {
  const parent = new Group();
  const guard = new FlashGuard();
  const vine = new VineRenderer(parent, guard);
  let nowMs = 1000;
  const runFor = (ms: number): void => {
    for (const end = nowMs + ms; nowMs < end; nowMs += FRAME_MS) vine.update(nowMs);
  };
  const { mesh } = vine;
  return { vine, guard, mesh, runFor, parent };
}

describe('VineRenderer (T-149)', () => {
  it('is one instanced mesh, hidden at count 0 (rule 15), so with no plants', () => {
    const { vine, mesh, runFor, parent } = rig();
    expect(parent.children).toEqual([mesh]);
    expect(mesh.geometry.index!.count / 3).toBeLessThanOrEqual(12); // one piece; the vine ≤ 8k triangles
    expect(mesh.visible).toBe(false);
    vine.setWall(NEAR, BED);
    vine.setPlants([]);
    runFor(2 * VINE_GROW_MS);
    expect(mesh.count).toBe(0);
    expect(mesh.visible).toBe(false);
    expect(mesh.material.opacity).toBe(0);
  });

  it('its length follows the plant count, grown over VINE_GROW_MS, and shrinks the same way', () => {
    const { vine, mesh, runFor } = rig();
    vine.setWall(NEAR, BED);
    vine.setPlants(plants(PLANT_CAPACITY));
    runFor(VINE_GROW_MS / 6);
    expect(mesh.count).toBe(VINE_SEGMENTS / 6);
    expect(mesh.material.opacity).toBe(PLANT_REST_BRIGHTNESS);
    runFor(VINE_GROW_MS);
    expect(mesh.count).toBe(VINE_SEGMENTS);
    vine.setPlants(plants(PLANT_CAPACITY / 2));
    runFor(VINE_GROW_MS);
    expect(mesh.count).toBe(VINE_SEGMENTS / 2);
    vine.setPlants([]);
    runFor(VINE_GROW_MS);
    expect(mesh.count).toBe(0);
    expect(mesh.material.opacity).toBe(0);
  });

  it('draws nothing with no wall, a wall too far, or after the wall is taken away', () => {
    const { vine, mesh, runFor } = rig();
    vine.setPlants(plants(PLANT_CAPACITY));
    runFor(2 * VINE_GROW_MS);
    expect(mesh.count).toBe(0);
    vine.setWall(FAR, BED);
    runFor(2 * VINE_GROW_MS);
    expect(mesh.count).toBe(0);
    vine.setWall(NEAR, BED);
    runFor(2 * VINE_GROW_MS);
    expect(mesh.count).toBe(VINE_SEGMENTS);
    vine.setWall(undefined, BED);
    runFor(2 * VINE_GROW_MS);
    expect(mesh.count).toBe(0);
  });

  it('lies on the wall just in front of it, up from the height of the bed, swaying a little', () => {
    const { vine, mesh } = rig();
    vine.setWall(NEAR, BED);
    const m = mesh.instanceMatrix.array;
    for (let i = 0; i < VINE_SEGMENTS; i++) {
      const k = i * 16;
      expect(Math.abs(m[k + 12]!)).toBeLessThanOrEqual(VINE_SWAY_M + 1e-6);
      expect(m[k + 13]).toBeCloseTo(0.74 + (i + 0.5) * VINE_SEGMENT_M, 6);
      expect(m[k + 14]).toBeGreaterThan(-1); // toward the bed, off the wall
      expect(m[k + 14]).toBeLessThan(-0.98);
      // Its own y, the tube's axis, points mostly up; its own z is the wall's normal.
      expect(m[k + 5]).toBeGreaterThan(0.8);
      expect([m[k + 8], m[k + 9], m[k + 10]]).toEqual([0, 0, 1]);
    }
    // The pieces carry the plants' colours.
    vine.setPlants(plants(2));
    const colours = mesh.instanceColor!.array;
    expect(colours.slice(0, 3)).not.toEqual(colours.slice(3, 6));
    expect(colours.slice(0, 3)).toEqual(colours.slice(6, 9));
  });

  it('under reduced motion the whole length fades in over VINE_FADE_MS and out again, never growing', () => {
    const { vine, mesh, runFor, guard } = rig();
    vine.setReducedMotion(true);
    vine.setWall(NEAR, BED);
    vine.setPlants(plants(PLANT_CAPACITY));
    runFor(2 * FRAME_MS); // the first frame sets the clock: no step yet
    expect(mesh.count).toBe(VINE_SEGMENTS);
    expect(mesh.material.opacity).toBeLessThan(PLANT_REST_BRIGHTNESS / 4);
    runFor(VINE_FADE_MS);
    expect(mesh.material.opacity).toBeCloseTo(PLANT_REST_BRIGHTNESS, 6);
    vine.setPlants([]);
    runFor(VINE_FADE_MS / 2);
    expect(mesh.count).toBe(VINE_SEGMENTS); // still there, half faded
    expect(mesh.material.opacity).toBeLessThan(PLANT_REST_BRIGHTNESS);
    runFor(VINE_FADE_MS);
    expect(mesh.count).toBe(0);
    expect(guard.takePeak()).toBeLessThanOrEqual(2); // in and out: two changes (FR-UI-11)
  });
});
