// Music theory (LLD §5.2, FR-MUS-02): modes as semitone sets, ring → degree → MIDI → Hz. A ring is always a scale
// degree, so every note is in the scale by construction and nothing needs quantising here.
import { A4_HZ, MIDI_A4, MIDI_C4, SEMITONES_PER_OCTAVE } from './config';

import type { ModeId, RoomSignature, VoiceType } from './types';

/** Degrees in semitones from the key root, one per ring (D-025, PLAN_AMENDMENT §6.3). No semitone steps anywhere. */
export const MODES: Readonly<Record<ModeId, readonly number[]>> = {
  majorPent: [0, 2, 4, 7, 9],
  minorPent: [0, 3, 5, 7, 10],
  susPent: [0, 2, 5, 7, 10],
};

/** Base octave per voice as an offset from C4 (LLD §5.2: Bass C2, Pad/Choir C3, Pluck/Bell C4, Shimmer C5). */
export const VOICE_OCTAVE: Readonly<Record<VoiceType, number>> = {
  bass: -2,
  pad: -1,
  choir: -1,
  pluck: 0,
  bell: 0,
  shimmer: 1,
};

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Equal temperament, A4 = 440 Hz. */
export function midiToHz(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - MIDI_A4) / SEMITONES_PER_OCTAVE);
}

/**
 * Scale degree → MIDI note. Degrees outside 0..len−1 wrap by octaves (degree 5 of a pentatonic = degree 0 + 12),
 * never throw (TC-AUD-01). `root` is semitones from C; `octaveOffset` is whole octaves from C4.
 */
export function degreeToMidi(root: number, mode: ModeId, degree: number, octaveOffset = 0): number {
  const scale = MODES[mode];
  const n = scale.length;
  const octave = Math.floor(degree / n);
  const idx = degree - octave * n;
  return MIDI_C4 + root + (scale[idx] as number) + SEMITONES_PER_OCTAVE * (octave + octaveOffset);
}

/** True when `midi` belongs to the scale of `mode` rooted at `root`. */
export function isInScale(midi: number, root: number, mode: ModeId): boolean {
  const pc = mod(midi - root, SEMITONES_PER_OCTAVE);
  return MODES[mode].includes(pc);
}

/** Frequency a plant on `ring` sounds at for `voice` under `sig` (FR-MUS-02). */
export function hzForRing(sig: RoomSignature, ring: number, voice: VoiceType): number {
  return midiToHz(degreeToMidi(sig.keyRoot, sig.mode, ring, VOICE_OCTAVE[voice]));
}
