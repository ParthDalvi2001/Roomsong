// FR-MUS-06 / TC-AUD-05 (pure part): the WaveShaper ceiling can never output ≥ −1 dBFS, is exactly linear below
// its knee (no distortion at normal levels), monotonic and odd-symmetric. A WaveShaperNode clamps its input to the
// ends of the curve, so the curve's own maximum is the most the stage can ever put out.
import { describe, expect, it } from 'vitest';

import { CEILING_DBFS, CEILING_KNEE } from '../../../src/audio/config.js';
import { makeCeilingCurve } from '../../../src/audio/limiter.js';
import { dbToGain } from '../../../src/audio/mapping.js';

describe('makeCeilingCurve', () => {
  const curve = makeCeilingCurve(4097);
  const ceiling = dbToGain(CEILING_DBFS);

  it('never reaches the −1 dBFS ceiling, even at full-scale input', () => {
    let max = 0;
    for (let i = 0; i < curve.length; i++) max = Math.max(max, Math.abs(curve[i] as number));
    expect(max).toBeLessThan(ceiling);
    expect(max).toBeGreaterThan(ceiling * 0.9); // but it does use most of the headroom
  });

  it('is linear below the knee', () => {
    const mid = (curve.length - 1) / 2;
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      if (Math.abs(x) <= CEILING_KNEE * ceiling) expect(curve[i]).toBeCloseTo(x, 6);
    }
    expect(curve[mid]).toBe(0);
  });

  it('is monotonic and odd-symmetric', () => {
    for (let i = 1; i < curve.length; i++) expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1] as number);
    for (let i = 0; i < curve.length; i++) {
      expect(curve[i]).toBeCloseTo(-(curve[curve.length - 1 - i] as number), 6);
    }
  });
});
