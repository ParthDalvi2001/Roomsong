// The UI sounds (SOUND_PASS_T164.md §6, P-025): each a few notes of the room's chord on one plant voice, played by
// the engine through the pool at the audio clock's now, from the bed's centre (0.35–0.45 m ahead of a seated head,
// CLAUDE.md rule 2: full level, centred). A table only: nothing is made here. 'placed' and 'goodnight' are their own.
import type { VoiceType } from '../garden/index.js';

export interface UiNote {
  /** Its tone of the room chord (chordDegrees): 0 the root, 1 the third or fourth, 2 the fifth. */
  tone: 0 | 1 | 2;
  /** Its start after the sound's first note, in seconds. */
  atS: number;
}

export interface UiSoundSpec {
  voice: Extract<VoiceType, 'bell' | 'pluck' | 'bass'>;
  notes: readonly UiNote[];
  /** × the voice's own pitch of the tone: 2 = one octave up. */
  octave: number;
  releaseS: number;
  /** The voice's hue input: 0.5 its darkest, 1 plain. */
  cutoffMul: number;
  /** dB against a full-height plant of the voice, within UI_LEVEL_DB_RE_PLANT (config.ts). */
  db: number;
}

export type UiSoundName = 'tick' | 'confirm' | 'bump' | 'removeRev' | 'undoFwd';

const UP: readonly UiNote[] = [
  { tone: 0, atS: 0 },
  { tone: 1, atS: 0.05 },
  { tone: 2, atS: 0.1 },
];
const DOWN: readonly UiNote[] = [
  { tone: 2, atS: 0 },
  { tone: 1, atS: 0.05 },
  { tone: 0, atS: 0.1 },
];

export const UI_SOUNDS: Readonly<Record<UiSoundName, UiSoundSpec>> = {
  /** A panel press: the root one octave above the Bell's, short and mellow. */
  // shortcut: −10 dB, not §6's −12: the P-025 floor (UI_LEVEL_DB_RE_PLANT); widen the floor if Parth wants it quieter.
  tick: { voice: 'bell', notes: [{ tone: 0, atS: 0 }], octave: 2, releaseS: 0.06, cutoffMul: 0.5, db: -10 },
  /** A seed let go off the bed (garden:seedBack): the root in the Bass octave, darkest. */
  bump: { voice: 'bass', notes: [{ tone: 0, atS: 0 }], octave: 1, releaseS: 0.12, cutoffMul: 0.5, db: -8 },
  /** The bed placed or confirmed: the chord arpeggiated up on Pluck, 40 ms apart. */
  confirm: {
    voice: 'pluck',
    notes: [
      { tone: 0, atS: 0 },
      { tone: 1, atS: 0.04 },
      { tone: 2, atS: 0.08 },
    ],
    octave: 1,
    releaseS: 0.6,
    cutoffMul: 1,
    db: -6,
  },
  /** A plant removed: the chord down on Bell, 50 ms apart; an undo, the same up. */
  removeRev: { voice: 'bell', notes: DOWN, octave: 1, releaseS: 0.3, cutoffMul: 1, db: -10 },
  undoFwd: { voice: 'bell', notes: UP, octave: 1, releaseS: 0.3, cutoffMul: 1, db: -10 },
};
