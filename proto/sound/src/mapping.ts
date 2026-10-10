// Plant → voice parameter mappings (FR-MUS-05): monotonic, clamped, allocation-free.
import {
  HEIGHT_GAIN_DB_MAX,
  HEIGHT_GAIN_DB_MIN,
  HEIGHT_RELEASE_S_MAX,
  HEIGHT_RELEASE_S_MIN,
  HUE_CUTOFF_OCTAVES,
  HUE_DETUNE_CENTS,
  PAN_WIDTH,
  STEPS,
} from './config';

import type { Plant, VoiceParams } from './types';

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

/** Height 0..1 → −24..0 dB. */
export function heightToGainDb(height: number): number {
  return HEIGHT_GAIN_DB_MIN + (HEIGHT_GAIN_DB_MAX - HEIGHT_GAIN_DB_MIN) * clamp01(height);
}

/** Height 0..1 → 0.2..2.5 s release (sustain). */
export function heightToReleaseS(height: number): number {
  return HEIGHT_RELEASE_S_MIN + (HEIGHT_RELEASE_S_MAX - HEIGHT_RELEASE_S_MIN) * clamp01(height);
}

/** Hue 0..1 → cutoff multiplier 2^−1..2^+1 (±1 octave). */
export function hueToCutoffMul(hue: number): number {
  return Math.pow(2, HUE_CUTOFF_OCTAVES * (2 * clamp01(hue) - 1));
}

/** Hue 0..1 → −8..+8 cents. */
export function hueToDetuneCents(hue: number): number {
  return HUE_DETUNE_CENTS * (2 * clamp01(hue) - 1);
}

/** Step 0..15 → stereo pan. Step 0 is straight ahead (far side of the bed), clockwise from above: step 4 is right. */
export function panForStep(step: number): number {
  return PAN_WIDTH * Math.sin((2 * Math.PI * step) / STEPS);
}

/** Fill `out` from the plant and its frequency; returns `out` (no allocation). */
export function voiceParamsFor(plant: Plant, hz: number, out: VoiceParams): VoiceParams {
  out.hz = hz;
  out.gain = dbToGain(heightToGainDb(plant.height));
  out.release = heightToReleaseS(plant.height);
  out.cutoffMul = hueToCutoffMul(plant.hue);
  out.detune = hueToDetuneCents(plant.hue);
  return out;
}
