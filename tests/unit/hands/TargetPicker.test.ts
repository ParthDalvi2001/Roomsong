// TC-HND-05 (FR-HND-04, FR-HND-16): the nearest target within the hit radius, and the cell a release would commit.
// The dead band and `target:hover` are TC-HND-08 (T-116).
import { describe, expect, it, vi } from 'vitest';

import { HIT_RADIUS_M, TARGET_VISIBLE_DIAMETER_M } from '../../../src/hands/config.js';
import { hoverCell, pickTarget, toBedLocal } from '../../../src/hands/TargetPicker.js';

import type { Cell } from '../../../src/garden/index.js';
import type { PickCandidate } from '../../../src/hands/TargetPicker.js';

const plant = (id: string, x: number, y = 0, z = 0): PickCandidate => ({
  target: { kind: 'plant', id },
  radius: HIT_RADIUS_M,
  pos: { x, y, z },
});

describe('pickTarget', () => {
  it('picks a target inside the 4.0 cm hit radius and none beyond it', () => {
    expect([HIT_RADIUS_M, TARGET_VISIBLE_DIAMETER_M]).toEqual([0.04, 0.025]);
    const targets = [plant('a', 0)];
    expect(pickTarget({ x: 0.039, y: 0, z: 0 }, targets)).toEqual({ kind: 'plant', id: 'a' });
    expect(pickTarget({ x: 0, y: 0.039, z: 0 }, targets)?.id).toBe('a'); // a sphere: height counts too
    expect(pickTarget({ x: 0.041, y: 0, z: 0 }, targets)).toBeNull();
    expect(pickTarget({ x: 0.03, y: 0.03, z: 0 }, targets)).toBeNull(); // 4.2 cm away on the diagonal
    expect(pickTarget({ x: 0, y: 0, z: 0 }, [])).toBeNull();
  });

  it('where hit spheres overlap the nearest wins: two inner-ring neighbours 4.7 cm apart', () => {
    const targets = [plant('a', 0), plant('b', 0.047)];
    expect(pickTarget({ x: 0.02, y: 0, z: 0 }, targets)?.id).toBe('a'); // 2.0 cm from a, 2.7 cm from b
    expect(pickTarget({ x: 0.027, y: 0, z: 0 }, targets)?.id).toBe('b'); // 2.7 cm from a, 2.0 cm from b
    expect(pickTarget({ x: 0.027, y: 0, z: 0 }, [targets[1]!, targets[0]!])?.id).toBe('b'); // in any order
  });

  it('uses the radius of each target and returns the ref of the one it picked', () => {
    const orb: PickCandidate = {
      target: { kind: 'orb', id: 'listen' },
      radius: 0.06,
      pos: { x: 0, y: 0, z: 0 },
    };
    expect(pickTarget({ x: 0.05, y: 0, z: 0 }, [orb])).toBe(orb.target);
    expect(pickTarget({ x: 0.05, y: 0, z: 0 }, [{ ...orb, radius: 0 }])).toBeNull(); // a radius nobody set
  });

  it('picks nothing for a position that is not a number', () => {
    expect(pickTarget({ x: NaN, y: 0, z: 0 }, [plant('a', 0)])).toBeNull();
  });
});

describe('toBedLocal', () => {
  it('gives the horizontal offset from the bed centre and drops the height', () => {
    const bedAt = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 0.74, -0.45, 1]; // no rotation, column-major
    const local = toBedLocal(bedAt, { x: 2.1, y: 0.9, z: -0.25 }, { x: 0, y: 0 });
    expect(local.x).toBeCloseTo(0.1, 9);
    expect(local.y).toBeCloseTo(0.2, 9); // Vec2.y is bed-local z (API_SPEC §1.0, Axes)
  });

  it('follows the rotation of the bed, and writes into the vector it was given', () => {
    // The bed turned a quarter turn about y: its x axis points along world -z, its z axis along world +x.
    const turned = [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 2, 0.74, -0.45, 1];
    const out = { x: 9, y: 9 };
    // Off both axes, so a matrix read by rows instead of columns shows: 0.1 m along world +x and 0.3 m along -z.
    expect(toBedLocal(turned, { x: 2.1, y: 0.74, z: -0.75 }, out)).toBe(out);
    expect(out.x).toBeCloseTo(0.3, 9);
    expect(out.y).toBeCloseTo(0.1, 9);
  });
});

describe('hoverCell, on the snapToCell of garden', () => {
  const ON_RING = { x: 0, y: 0.21 }; // 0.21 m toward the user: ring 2, step 4 (API_SPEC §1.0, Axes)
  const CELL: Cell = { ring: 2, step: 4 };

  it('is the snapped cell when it is free', () => {
    const nearestFreeCell = vi.fn((cell: Cell) => cell);
    expect(hoverCell(ON_RING, nearestFreeCell)).toEqual(CELL);
    expect(nearestFreeCell).toHaveBeenCalledWith(CELL);
  });

  it('is the nearest free cell when the snapped one is taken, not the snap itself', () => {
    expect(hoverCell(ON_RING, () => ({ ring: 3, step: 4 }))).toEqual({ ring: 3, step: 4 });
  });

  it('is null off the bed, in the hole and when the bed is full', () => {
    const nearestFreeCell = vi.fn(() => null);
    expect(hoverCell({ x: 0.5, y: 0 }, nearestFreeCell)).toBeNull();
    expect(hoverCell({ x: 0.05, y: 0 }, nearestFreeCell)).toBeNull();
    expect(nearestFreeCell).not.toHaveBeenCalled(); // not on the ring: nothing to resolve
    expect(hoverCell(ON_RING, nearestFreeCell)).toBeNull(); // on the ring, and full
  });
});
