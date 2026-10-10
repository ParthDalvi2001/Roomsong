// Three fixed room signatures for the "Next room" button (signature v1, D-021; PLAN_AMENDMENT §6.3).
// Only key root, mode and reverb decay differ: a bigger room is lower and rings longer. Tempo is not room-driven.
// Each is a valid RoomSignature so the real roomSignature() output (T-141) drops in unchanged.
import { WANDERER, type RoomSignature } from './types';

export interface SignaturePreset {
  name: string;
  blurb: string;
  signature: RoomSignature;
}

export const PRESETS: readonly SignaturePreset[] = [
  {
    name: 'Wanderer',
    blurb: 'unknown room · C major pentatonic · reverb 0.9 s',
    signature: WANDERER,
  },
  {
    name: 'Small room',
    blurb: 'E minor pentatonic · reverb 0.3 s',
    signature: {
      keyRoot: 4,
      mode: 'minorPent',
      tempo: 84,
      reverbRt60: 0.3,
      reverbSize: 'small',
      starterVoices: ['pluck', 'pad', 'bell'],
      paletteSeed: 1,
    },
  },
  {
    name: 'Hall',
    blurb: 'A (below C) suspended pentatonic · reverb 2.0 s',
    signature: {
      keyRoot: -3,
      mode: 'susPent',
      tempo: 84,
      reverbRt60: 2.0,
      reverbSize: 'large',
      starterVoices: ['bell', 'pad', 'pluck'],
      paletteSeed: 2,
    },
  },
];

export function nextPresetIndex(i: number): number {
  return (i + 1) % PRESETS.length;
}
