// TC-AUD-03 (FR-MUS-05): height → gain (−24..0 dB) and release (0.2..2.5 s); hue → cutoff ±1 octave,
// detune ±8 cents. Monotonic and clamped.
import { describe, expect, it } from 'vitest';

import { PAN_WIDTH, STEPS } from '../src/config';
import {
  dbToGain,
  heightToGainDb,
  heightToReleaseS,
  hueToCutoffMul,
  hueToDetuneCents,
  panForStep,
  voiceParamsFor,
} from '../src/mapping';

import type { Plant, VoiceParams } from '../src/types';

const xs = [-1, 0, 0.1, 0.25, 0.5, 0.75, 0.9, 1, 2];

function isNonDecreasing(f: (x: number) => number): boolean {
  for (let i = 1; i < xs.length; i++) {
    if (f(xs[i] as number) < f(xs[i - 1] as number)) return false;
  }
  return true;
}

describe('height mappings', () => {
  it('gain is −24 dB at height 0 and 0 dB at height 1, monotonic, clamped', () => {
    expect(heightToGainDb(0)).toBe(-24);
    expect(heightToGainDb(1)).toBe(0);
    expect(heightToGainDb(-5)).toBe(-24);
    expect(heightToGainDb(5)).toBe(0);
    expect(isNonDecreasing(heightToGainDb)).toBe(true);
  });

  it('release is 0.2 s at height 0 and 2.5 s at height 1, monotonic, clamped', () => {
    expect(heightToReleaseS(0)).toBeCloseTo(0.2, 9);
    expect(heightToReleaseS(1)).toBeCloseTo(2.5, 9);
    expect(heightToReleaseS(-1)).toBeCloseTo(0.2, 9);
    expect(heightToReleaseS(3)).toBeCloseTo(2.5, 9);
    expect(isNonDecreasing(heightToReleaseS)).toBe(true);
  });

  it('dbToGain converts decibels to linear amplitude', () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(-6.0206)).toBeCloseTo(0.5, 4);
    expect(dbToGain(-24)).toBeCloseTo(0.0631, 3);
  });
});

describe('hue mappings', () => {
  it('cutoff multiplier spans one octave down to one octave up, 1 at the middle', () => {
    expect(hueToCutoffMul(0)).toBeCloseTo(0.5, 9);
    expect(hueToCutoffMul(0.5)).toBeCloseTo(1, 9);
    expect(hueToCutoffMul(1)).toBeCloseTo(2, 9);
    expect(hueToCutoffMul(7)).toBeCloseTo(2, 9);
    expect(isNonDecreasing(hueToCutoffMul)).toBe(true);
  });

  it('detune spans −8..+8 cents, 0 at the middle', () => {
    expect(hueToDetuneCents(0)).toBe(-8);
    expect(hueToDetuneCents(0.5)).toBe(0);
    expect(hueToDetuneCents(1)).toBe(8);
    expect(hueToDetuneCents(-2)).toBe(-8);
    expect(isNonDecreasing(hueToDetuneCents)).toBe(true);
  });
});

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

describe('voiceParamsFor', () => {
  it('fills the provided VoiceParams in place (allocation-free) from plant + hz', () => {
    const plant: Plant = {
      id: 'p',
      voice: 'bell',
      cell: { ring: 2, step: 3 },
      height: 0.5,
      hue: 0.25,
      plantedAt: 0,
    };
    const out: VoiceParams = { hz: 0, gain: 0, release: 0, cutoffMul: 0, detune: 0 };
    const ret = voiceParamsFor(plant, 329.63, out);
    expect(ret).toBe(out);
    expect(out.hz).toBe(329.63);
    expect(out.gain).toBeCloseTo(dbToGain(-12), 9);
    expect(out.release).toBeCloseTo(1.35, 9);
    expect(out.cutoffMul).toBeCloseTo(Math.pow(2, -0.5), 9);
    expect(out.detune).toBe(-4);
  });
});
