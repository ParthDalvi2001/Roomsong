// TC-AUD-01 (FR-MUS-02): ring 0..4 → scale degree 0..4, inner = low; 5 degrees = one pentatonic octave;
// every note in the mode's scale set; degree ≥ 5 wraps an octave instead of throwing. The three mode sets and
// their no-semitone property are tested where they live now: tests/unit/garden/config.test.ts.
import { describe, expect, it } from 'vitest';

import { VOICE_OCTAVE, degreeToMidi, hzForRing, midiToHz } from '../../../src/audio/theory.js';
import { MODE_DEGREES, type ModeId } from '../../../src/garden/index.js';

const MODE_IDS = Object.keys(MODE_DEGREES) as ModeId[];
const KEY_ROOTS = [-3, 0, 2, 4] as const;
/** The Wanderer tuning (FR-MUS-02): C major pentatonic. */
const WANDERER = { keyRoot: 0, mode: 'majorPent' } as const;

describe('midiToHz', () => {
  it('maps A4 (69) to 440 Hz and C4 (60) to 261.63 Hz', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 6);
    expect(midiToHz(60)).toBeCloseTo(261.6256, 3);
  });
});

describe('degreeToMidi', () => {
  it('Wanderer (C majorPent) rings 0..4 → C4 D4 E4 G4 A4', () => {
    expect([0, 1, 2, 3, 4].map((r) => degreeToMidi(0, 'majorPent', r))).toEqual([60, 62, 64, 67, 69]);
  });

  it('inner ring is lowest and pitch rises monotonically for every mode and key root', () => {
    for (const mode of MODE_IDS) {
      for (const root of KEY_ROOTS) {
        const midis = [0, 1, 2, 3, 4].map((r) => degreeToMidi(root, mode, r));
        for (let i = 1; i < midis.length; i++) {
          expect(midis[i]).toBeGreaterThan(midis[i - 1] as number);
        }
      }
    }
  });

  it('five rings span less than one octave (5 degrees = one pentatonic octave)', () => {
    for (const mode of MODE_IDS) {
      expect(degreeToMidi(0, mode, 4) - degreeToMidi(0, mode, 0)).toBeLessThan(12);
    }
  });

  it('every ring note is in the scale set of its mode, in every octave', () => {
    for (const mode of MODE_IDS) {
      for (const root of KEY_ROOTS) {
        for (let degree = -5; degree < 10; degree++) {
          const semitonesAboveRoot = degreeToMidi(root, mode, degree) - 60 - root;
          expect(MODE_DEGREES[mode]).toContain(((semitonesAboveRoot % 12) + 12) % 12);
        }
      }
    }
  });

  it('degree 5+ wraps an octave rather than throwing (pentatonic: degree 5 = degree 0 + 12)', () => {
    expect(degreeToMidi(0, 'majorPent', 5)).toBe(72);
    expect(degreeToMidi(0, 'majorPent', 9)).toBe(69 + 12);
    expect(degreeToMidi(0, 'majorPent', 10)).toBe(84);
    expect(degreeToMidi(0, 'minorPent', 5)).toBe(72);
    expect(degreeToMidi(0, 'susPent', 5)).toBe(72);
  });

  it('negative degrees wrap downward', () => {
    expect(degreeToMidi(0, 'majorPent', -1)).toBe(57); // A3
    expect(degreeToMidi(0, 'majorPent', -5)).toBe(48); // C3
  });

  it('applies key root and octave offset in semitones', () => {
    expect(degreeToMidi(2, 'majorPent', 0)).toBe(62); // D4
    expect(degreeToMidi(-3, 'majorPent', 0)).toBe(57); // A3
    expect(degreeToMidi(0, 'majorPent', 0, -1)).toBe(48); // C3
    expect(degreeToMidi(4, 'susPent', 2, 1)).toBe(60 + 4 + 5 + 12); // the fourth of E sus pentatonic, one octave up
  });

  it('returns an integer midi for integer inputs (no float drift)', () => {
    expect(Number.isInteger(degreeToMidi(2, 'minorPent', 7, -1))).toBe(true);
  });
});

describe('hzForRing (voice base octaves, LLD §5.2)', () => {
  it('bell/pluck start at C4, pad at C3, bass at C2, shimmer at C5', () => {
    expect(VOICE_OCTAVE.bell).toBe(0);
    expect(VOICE_OCTAVE.pluck).toBe(0);
    expect(VOICE_OCTAVE.pad).toBe(-1);
    expect(VOICE_OCTAVE.choir).toBe(-1);
    expect(VOICE_OCTAVE.bass).toBe(-2);
    expect(VOICE_OCTAVE.shimmer).toBe(1);
    expect(hzForRing(WANDERER, 0, 'bell')).toBeCloseTo(261.6256, 3);
    expect(hzForRing(WANDERER, 0, 'pad')).toBeCloseTo(130.8128, 3);
    expect(hzForRing(WANDERER, 4, 'pluck')).toBeCloseTo(440, 6);
  });

  it('re-tune: a new signature changes pitches while the ring stays the same', () => {
    // A sus pentatonic below C (A3 B3 D4 E4 G4) differs on every ring from C major pentatonic (C4 D4 E4 G4 A4).
    const hall = { keyRoot: -3, mode: 'susPent' } as const;
    for (let r = 0; r < 5; r++) {
      const a = hzForRing(WANDERER, r, 'bell');
      const b = hzForRing(hall, r, 'bell');
      expect(b).not.toBeCloseTo(a, 3);
    }
  });
});
