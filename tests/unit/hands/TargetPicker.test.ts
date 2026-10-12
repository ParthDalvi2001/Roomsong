// TC-HND-05 (FR-HND-04): the nearest target within the hit radius. TC-HND-08: the dead band of the hover memory,
// here on the two pure functions; `target:hover` and the cell a release commits are in GestureMachine.test.ts.
import { describe, expect, it } from 'vitest';

import { HIT_RADIUS_M, HOVER_DEAD_BAND_M, TARGET_VISIBLE_DIAMETER_M } from '../../../src/hands/config.js';
import { pickTarget, stickyCell, toBedLocal } from '../../../src/hands/TargetPicker.js';

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

describe('pickTarget with the hover memory (TC-HND-08, FR-HND-16)', () => {
  const targets = [plant('a', 0), plant('b', 0.047)];
  const A = targets[0]!.target;
  /** The hand on the line between the two, `closerM` nearer to b than to a. */
  const at = (closerM: number) => ({ x: (0.047 + closerM) / 2, y: 0, z: 0 });

  it('a candidate 0.4 cm closer does not take the hover; one 0.5 cm closer does', () => {
    expect(HOVER_DEAD_BAND_M).toBe(0.005);
    expect(pickTarget(at(0.004), targets, A)?.id).toBe('a');
    expect(pickTarget(at(0.005 + 1e-9), targets, A)?.id).toBe('b'); // 0.5 cm and a nanometre: no float tie
    expect(pickTarget(at(0.004), targets)?.id).toBe('b'); // with no memory the nearer one wins at once
    expect(pickTarget(at(0.004), [targets[1]!, targets[0]!], A)?.id).toBe('a'); // in any order
  });

  it('the kept target lasts to 4.5 cm, so a hand resting at the 4 cm edge does not flicker', () => {
    const alone = [plant('a', 0)];
    expect(pickTarget({ x: 0.044, y: 0, z: 0 }, alone, A)?.id).toBe('a');
    expect(pickTarget({ x: 0.044, y: 0, z: 0 }, alone)).toBeNull(); // not hovered before: 4 cm is the edge
    expect(pickTarget({ x: 0.046, y: 0, z: 0 }, alone, A)).toBeNull();
  });

  it('a memory of something that is no longer there changes nothing', () => {
    expect(pickTarget({ x: 0.02, y: 0, z: 0 }, targets, { kind: 'plant', id: 'gone' })?.id).toBe('a');
    expect(pickTarget({ x: 0.5, y: 0, z: 0 }, targets, A)).toBeNull();
  });

  it('the memory is of a kind and an id: a seed called a does not hold the hover for the plant called a', () => {
    // 0.4 cm nearer to b: the plant a would keep the hover if it were the remembered one (the first test).
    expect(pickTarget(at(0.004), targets, { kind: 'seed', id: 'a' })?.id).toBe('b');
    expect(pickTarget(at(0.004), targets, { kind: 'plant', id: 'a' })?.id).toBe('a');
  });
});

describe('stickyCell: the same memory between two cells (TC-HND-08)', () => {
  const RING_2_M = 0.21;
  const BORDER_RAD = Math.PI / 16; // between step 0 and step 1
  /** A point on ring 2, `metres` of arc past the border toward step 1. */
  const past = (metres: number) => {
    const rad = BORDER_RAD + metres / RING_2_M;
    return { x: RING_2_M * Math.cos(rad), y: RING_2_M * Math.sin(rad) };
  };
  const STEP_0: Cell = { ring: 2, step: 0 };
  const STEP_1: Cell = { ring: 2, step: 1 };

  it('with no memory it is snapToCell', () => {
    expect(stickyCell(past(0.001), null)).toEqual(STEP_1);
    expect(stickyCell(past(-0.001), null)).toEqual(STEP_0);
  });

  it('keeps the cell it had until the next one is 0.5 cm nearer, in both directions', () => {
    // 1 mm of arc past the border the two centres differ by 2 mm; 4 mm past, by 8 mm.
    expect(stickyCell(past(0.001), STEP_0)).toBe(STEP_0);
    expect(stickyCell(past(0.004), STEP_0)).toEqual(STEP_1);
    expect(stickyCell(past(-0.001), STEP_1)).toBe(STEP_1);
    expect(stickyCell(past(-0.004), STEP_1)).toEqual(STEP_0);
  });

  it('holds between two rings too, and lets go for a cell far away', () => {
    const between = { x: 0.12 + 1.5 * 0.045 + 0.001, y: 0 }; // 1 mm past the middle of rings 1 and 2
    expect(stickyCell(between, { ring: 1, step: 0 })).toEqual({ ring: 1, step: 0 });
    expect(stickyCell(between, null)).toEqual(STEP_0);
    expect(stickyCell({ x: -0.21, y: 0 }, STEP_0)).toEqual({ ring: 2, step: 8 }); // across the bed
  });

  it('is null off the bed whatever it had', () => {
    expect(stickyCell({ x: 0.5, y: 0 }, STEP_0)).toBeNull();
    expect(stickyCell({ x: 0.05, y: 0 }, STEP_0)).toBeNull();
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
