// TC-HND-02: the 1-euro filter on the pinch point (FR-HND-03, LLD §5.7). Built in T-105 for the pinch test page.
import { describe, expect, it } from 'vitest';

import { ONE_EURO_BETA, ONE_EURO_D_CUTOFF_HZ, ONE_EURO_MIN_CUTOFF_HZ } from '../../../src/hands/config.js';
import { OneEuroFilter } from '../../../src/hands/OneEuroFilter.js';

describe('OneEuroFilter', () => {
  const DT_S = 1 / 72;

  it('passes the first sample through, and again after a reset', () => {
    const filter = new OneEuroFilter(1, 0, 1);
    expect(filter.filter(0.3, DT_S)).toBe(0.3);
    expect(filter.filter(0.5, DT_S)).toBeLessThan(0.5);
    filter.reset();
    expect(filter.filter(0.5, DT_S)).toBe(0.5);
  });

  it('with beta 0 is a 1 Hz low-pass: 63% of a step after one time constant, steady at rest', () => {
    const filter = new OneEuroFilter(1, 0, 1);
    filter.filter(0, DT_S);
    let value = 0;
    const timeConstantS = 1 / (2 * Math.PI); // 0.16 s at 1 Hz
    for (let t = DT_S; t <= timeConstantS; t += DT_S) value = filter.filter(1, DT_S);
    expect(value).toBeGreaterThan(0.55);
    expect(value).toBeLessThan(0.7);
    for (let i = 0; i < 720; i++) value = filter.filter(1, DT_S);
    expect(value).toBeCloseTo(1, 6);
  });

  it('with the contract values cuts jitter around a still hand by at least 60% RMS at 72 Hz', () => {
    expect([ONE_EURO_MIN_CUTOFF_HZ, ONE_EURO_BETA, ONE_EURO_D_CUTOFF_HZ]).toEqual([1, 0, 1]);
    const filter = new OneEuroFilter(ONE_EURO_MIN_CUTOFF_HZ, ONE_EURO_BETA, ONE_EURO_D_CUTOFF_HZ);
    let seed = 12345; // a fixed linear congruential sequence: the same noise on every run
    const noise = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return (seed / 2 ** 32 - 0.5) * 0.004; // ±2 mm
    };
    let rawSquares = 0;
    let filteredSquares = 0;
    for (let i = 0; i < 720; i++) {
      const raw = noise();
      const filtered = filter.filter(raw, DT_S);
      if (i < 72) continue; // the first second settles from the pass-through sample
      rawSquares += raw * raw;
      filteredSquares += filtered * filtered;
    }
    expect(Math.sqrt(filteredSquares / rawSquares)).toBeLessThan(0.4);
  });

  it('with beta above 0 follows a moving hand more closely', () => {
    const lagAfterMove = (beta: number) => {
      const filter = new OneEuroFilter(1, beta, 1);
      let value = filter.filter(0, DT_S);
      for (let i = 1; i <= 36; i++) value = filter.filter(i * 0.2 * DT_S, DT_S); // 0.2 m/s for half a second
      return 36 * 0.2 * DT_S - value;
    };
    expect(lagAfterMove(0)).toBeGreaterThan(0.02); // about 3 cm (LLD 5.7)
    expect(lagAfterMove(20)).toBeLessThan(0.01);
  });

  it('keeps its value when no time has passed', () => {
    const filter = new OneEuroFilter(1, 0, 1);
    filter.filter(0.2, DT_S);
    expect(filter.filter(0.9, 0)).toBe(0.2);
  });

  it('ignores a sample that is not a finite number, and carries on with the next one', () => {
    const filter = new OneEuroFilter(1, 0, 1);
    filter.filter(0.2, DT_S);
    const before = filter.filter(0.21, DT_S);
    expect(filter.filter(Infinity, DT_S)).toBe(before);
    expect(filter.filter(NaN, DT_S)).toBe(before);
    const after = filter.filter(0.21, DT_S);
    expect(after).toBeGreaterThan(before); // still on its way to 0.21
    expect(after).toBeLessThan(0.21);
    expect(Number.isFinite(filter.speed)).toBe(true);
  });

  it('reports the speed of a steadily moving input, and 0 after a reset', () => {
    const filter = new OneEuroFilter(1, 0, 1);
    for (let i = 0; i < 720; i++) filter.filter(i * 0.2 * DT_S, DT_S); // 0.2 m/s for ten seconds
    expect(filter.speed).toBeCloseTo(0.2, 3);
    filter.reset();
    filter.filter(5, DT_S);
    expect(filter.speed).toBe(0);
  });
});
