// The page's stereo stand-in: step → StereoPannerNode pan. The plant → voice mappings (TC-AUD-03) moved to
// tests/unit/audio/mapping.test.ts with T-121.
import { describe, expect, it } from 'vitest';

import { PAN_WIDTH, STEPS } from '../src/config';
import { panForStep } from '../src/mapping';

describe('panForStep (stereo position from the step angle; step 0 is straight ahead, clockwise)', () => {
  it('is centred at steps 0 and 8, right at step 4 and left at step 12', () => {
    expect(panForStep(0)).toBeCloseTo(0, 9);
    expect(panForStep(8)).toBeCloseTo(0, 9);
    expect(panForStep(4)).toBeCloseTo(PAN_WIDTH, 9);
    expect(panForStep(12)).toBeCloseTo(-PAN_WIDTH, 9);
  });

  it('mirrors left and right and never leaves the StereoPannerNode range', () => {
    expect(PAN_WIDTH).toBeGreaterThan(0);
    expect(PAN_WIDTH).toBeLessThanOrEqual(1);
    for (let s = 0; s < STEPS; s++) {
      expect(panForStep(STEPS - s)).toBeCloseTo(-panForStep(s), 9);
      expect(Math.abs(panForStep(s))).toBeLessThanOrEqual(PAN_WIDTH + 1e-9);
    }
  });
});
