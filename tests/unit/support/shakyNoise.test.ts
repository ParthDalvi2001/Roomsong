// The shaky-hands noise model (tests/e2e/support/shaky-noise.ts): a seed gives the same hand every time, and the
// drops stay inside what the headset recording measured.
import { describe, expect, it } from 'vitest';

import { TRACKING_GRACE_MS } from '../../../src/hands/config';
import {
  closeShiftM,
  Drops,
  PALM_UP_BAND,
  palmReading,
  shake,
  UNDER_GRACE_GAP_MS,
} from '../../e2e/support/shaky-noise';

describe('shaky-noise', () => {
  it('repeats itself from a seed, and another seed gives another hand', () => {
    const run = (seed: number) => {
      const drops = new Drops(seed);
      return Array.from({ length: 20 }, () => [drops.spellMs(), drops.gapMs()]);
    };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
  });

  it('keeps every burst spell under the 400 ms palm hold, and an under-grace gap under the grace', () => {
    const burst = new Drops(1);
    const held = new Drops(1, UNDER_GRACE_GAP_MS);
    for (let i = 0; i < 2000; i++) {
      expect(burst.spellMs()).toBeLessThanOrEqual(300);
      expect(burst.gapMs()).toBeLessThanOrEqual(290);
      expect(held.gapMs()).toBeLessThan(TRACKING_GRACE_MS);
    }
  });

  it('draws the recorded close shift at its percentiles, and a palm reading inside its band', () => {
    expect(closeShiftM(0.5)).toBeCloseTo(0.0081, 6);
    expect(closeShiftM(0.9)).toBeCloseTo(0.0252, 6);
    for (let t = 0; t < 10_000; t += 37) {
      const reading = palmReading(3, PALM_UP_BAND, t);
      expect(reading).toBeGreaterThanOrEqual(PALM_UP_BAND[0]);
      expect(reading).toBeLessThanOrEqual(PALM_UP_BAND[1]);
    }
  });

  it('shakes a hand by less than a centimetre a side, the same at the same time', () => {
    const at = shake(5);
    const out = { x: 0, y: 0, z: 0 };
    let most = 0;
    for (let t = 0; t < 10_000; t += 11) {
      at(t, out);
      most = Math.max(most, Math.abs(out.x), Math.abs(out.y), Math.abs(out.z));
    }
    expect(most).toBeLessThan(0.01);
    const again = { x: 0, y: 0, z: 0 };
    shake(5)(4321, again);
    at(4321, out);
    expect(again).toEqual(out);
  });
});
