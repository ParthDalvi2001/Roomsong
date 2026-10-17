// What the engine's voice pool is asked to play, and the rules a UI sound passes (P-025, config.ts
// UI_LEVEL_DB_RE_PLANT): a test watches the pool, calls ui(), and hands the notes it played to expectUiRules.
// T-164 §6 builds the UI sounds that are not built yet; each gets this check. On the fake AudioContext: the notes
// are read, not heard.
import { expect, vi } from 'vitest';

import { UI_LEVEL_DB_RE_PLANT } from '../../../src/audio/config.js';
import { dbToGain } from '../../../src/audio/mapping.js';
import { TODAY, type Recipe } from '../../../src/audio/styles.js';
import { hzForRing } from '../../../src/audio/theory.js';
import { chordDegrees } from '../../../src/garden/index.js';

import type { Engine } from '../../../src/audio/AudioEngine.js';
import type { VoicePool } from '../../../src/audio/VoicePool.js';
import type { VoiceParams } from '../../../src/audio/voices/note.js';
import type { RoomSignature, VoiceType } from '../../../src/garden/index.js';

export interface Played {
  /** The class of the note's voice: 'Pad', 'Bell'… */
  voice: string;
  time: number;
  p: VoiceParams;
  at: number[];
}

/** Each note the engine's pool is asked for: its voice's class, its time, its params as they were then, its place. */
export function watchPool(engine: Engine): Played[] {
  const played: Played[] = [];
  const pool = (engine as unknown as { g: { pool: VoicePool } }).g.pool;
  const play = pool.play.bind(pool);
  vi.spyOn(pool, 'play').mockImplementation((...args) => {
    const [voice, time, p, x, y, z] = args;
    played.push({ voice: voice.constructor.name, time, p: { ...p }, at: [x, y, z] });
    return play(...args);
  });
  return played;
}

/** The pitch class of a frequency, 0..11 semitones above C. */
const pitchClass = (hz: number): number => ((Math.round(69 + 12 * Math.log2(hz / 440)) % 12) + 12) % 12;

/**
 * The notes one ui() call played, called at audio time `now`: the first starts at `now`, none before it; each is a
 * tone of the room's chord; each note's gain is within UI_LEVEL_DB_RE_PLANT of a full-height plant of its voice in
 * `recipe`, in dB: a note against a note, not a loudness against the music.
 */
export function expectUiRules(
  notes: readonly Played[],
  now: number,
  key: Pick<RoomSignature, 'keyRoot' | 'mode'>,
  recipe: Readonly<Recipe> = TODAY,
): void {
  expect(notes.length).toBeGreaterThan(0);
  expect(Math.min(...notes.map((n) => n.time))).toBe(now);
  const chord = chordDegrees(key.mode).map((ring) => pitchClass(hzForRing(key, ring, 'bell')));
  for (const n of notes) {
    expect(chord).toContain(pitchClass(n.p.hz));
    const db = 20 * Math.log10(n.p.gain / dbToGain(recipe.mixDb[n.voice.toLowerCase() as VoiceType]));
    expect(db).toBeGreaterThanOrEqual(UI_LEVEL_DB_RE_PLANT[0]);
    expect(db).toBeLessThanOrEqual(UI_LEVEL_DB_RE_PLANT[1]);
  }
}
