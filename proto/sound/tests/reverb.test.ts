// The page's reverb decay clamp (FR-ROOM-06). The impulse response tests moved to tests/unit/audio/reverb.test.ts
// with T-121.
import { describe, expect, it } from 'vitest';

import { impulseLength } from '../../../src/audio/Reverb';
import { REVERB_RT60_MAX_S, REVERB_RT60_MIN_S } from '../src/config';
import { clampRt60 } from '../src/reverb';

describe('reverb sizing', () => {
  it('clamps RT60 to 0.3–2.0 s and treats a bad value as the shortest room', () => {
    expect(REVERB_RT60_MIN_S).toBe(0.3);
    expect(REVERB_RT60_MAX_S).toBe(2);
    expect(clampRt60(0.9)).toBe(0.9);
    expect(clampRt60(0.05)).toBe(0.3);
    expect(clampRt60(7)).toBe(2);
    expect(clampRt60(Number.NaN)).toBe(0.3);
  });

  it('the page never asks for an impulse response outside the clamp: a bad decay gets the shortest one', () => {
    expect(impulseLength(48000, clampRt60(0))).toBe(Math.floor(48000 * 0.3));
  });
});
