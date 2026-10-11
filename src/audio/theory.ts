// Music theory (LLD §5.2, FR-MUS-02): ring → degree of the mode (MODE_DEGREES, garden/) → MIDI → Hz. A ring is
// always a scale degree, so every note is in the scale by construction and nothing needs quantising here.
import { MODE_DEGREES } from '../garden/index.js';

import { A4_HZ, MIDI_A4, MIDI_C4, SEMITONES_PER_OCTAVE } from './config.js';

import type { ModeId, RoomSignature, VoiceType } from '../garden/index.js';

/** Base octave per voice as an offset from C4 (LLD §5.2: Bass C2, Pad/Choir C3, Pluck/Bell C4, Shimmer C5). */
export const VOICE_OCTAVE: Readonly<Record<VoiceType, number>> = {
  bass: -2,
  pad: -1,
  choir: -1,
  pluck: 0,
  bell: 0,
  shimmer: 1,
};

/** Equal temperament, A4 = 440 Hz. */
export function midiToHz(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - MIDI_A4) / SEMITONES_PER_OCTAVE);
}

/**
 * Scale degree → MIDI note. Degrees outside 0..len−1 wrap by octaves (degree 5 of a pentatonic = degree 0 + 12),
 * never throw (TC-AUD-01). `root` is semitones from C; `octaveOffset` is whole octaves from C4.
 */
export function degreeToMidi(root: number, mode: ModeId, degree: number, octaveOffset = 0): number {
  const scale = MODE_DEGREES[mode];
  const n = scale.length;
  const octave = Math.floor(degree / n);
  const idx = degree - octave * n;
  return MIDI_C4 + root + (scale[idx] as number) + SEMITONES_PER_OCTAVE * (octave + octaveOffset);
}

/** Frequency a plant on `ring` sounds at for `voice` in the key and mode of `sig` (FR-MUS-02). */
export function hzForRing(
  sig: Pick<RoomSignature, 'keyRoot' | 'mode'>,
  ring: number,
  voice: VoiceType,
): number {
  return midiToHz(degreeToMidi(sig.keyRoot, sig.mode, ring, VOICE_OCTAVE[voice]));
}
