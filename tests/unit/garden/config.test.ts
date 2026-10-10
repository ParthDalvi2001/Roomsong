import { describe, expect, it } from 'vitest';

import { BED_ANCHOR_INNER_M, BED_ANCHOR_OUTER_M } from '../../../src/core/config.js';
import {
  BED_INNER,
  BED_OUTER,
  NEW_PLANT_HEIGHT,
  PULL_RANGE_M,
  RINGS,
  STEPS,
  ZONE_INNER_MARGIN_M,
  ZONE_OUTER_MARGIN_M,
} from '../../../src/garden/config.js';
import { MODE_DEGREES } from '../../../src/garden/model.js';

import { garden } from './fixtures.js';

import type { GardenState } from '../../../src/garden/index.js';

describe('garden/config', () => {
  it('the bed is the FR-MUS-01 annulus: 0.12 to 0.30 m, 5 rings of 16 steps, 80 cells', () => {
    expect([BED_INNER, BED_OUTER, RINGS, STEPS]).toEqual([0.12, 0.3, 5, 16]);
    expect(RINGS * STEPS).toBe(80);
  });

  it("core's BedAnchor defaults are the same radii (core/ may not import garden/)", () => {
    expect(BED_ANCHOR_INNER_M).toBe(BED_INNER);
    expect(BED_ANCHOR_OUTER_M).toBe(BED_OUTER);
  });

  it('a saved state stores the radii as these constants (TC-GAR-08, TC-PER-04)', () => {
    // The two typed lines fail the typecheck if GardenState's literal types and the constants drift apart.
    const inner: GardenState['bedInner'] = BED_INNER;
    const outer: GardenState['bedOuter'] = BED_OUTER;
    expect(garden()).toMatchObject({ version: 1, bedInner: inner, bedOuter: outer });
    expect(garden()).not.toHaveProperty('bedRadius');
  });

  it('the zone margins put the off-bed limits at 0.09 m and 0.35 m (FR-HND-10, FR-HND-11)', () => {
    expect(BED_INNER - ZONE_INNER_MARGIN_M).toBeCloseTo(0.09, 12);
    expect(BED_OUTER + ZONE_OUTER_MARGIN_M).toBeCloseTo(0.35, 12);
  });

  it('a pull of 0.25 m covers the whole height range (FR-HND-08)', () => {
    expect(PULL_RANGE_M).toBe(0.25);
  });

  it('a new plant starts at height 0.55 (API_SPEC §1.1)', () => {
    expect(NEW_PLANT_HEIGHT).toBe(0.55);
  });
});

describe('garden/model MODE_DEGREES (D-025)', () => {
  it('has the three pentatonic sets, one degree per ring', () => {
    expect(MODE_DEGREES).toEqual({
      majorPent: [0, 2, 4, 7, 9],
      minorPent: [0, 3, 5, 7, 10],
      susPent: [0, 2, 5, 7, 10],
    });
    for (const degrees of Object.values(MODE_DEGREES)) expect(degrees).toHaveLength(RINGS);
  });

  it('no two degrees of a set are a semitone apart, the octave wrap included', () => {
    for (const degrees of Object.values(MODE_DEGREES)) {
      const gaps = degrees.map((d, i) => ((degrees[(i + 1) % RINGS] ?? 0) - d + 12) % 12);
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(2);
    }
  });

  it('cannot be changed by a caller', () => {
    expect(Object.isFrozen(MODE_DEGREES)).toBe(true);
    expect(Object.values(MODE_DEGREES).every((degrees) => Object.isFrozen(degrees))).toBe(true);
  });
});
