// TC-AUD-04 (FR-MUS-07, NFR-PERF-10): voice cap with oldest-quietest stealing: the note with the lowest level at the
// steal time goes; equally quiet notes go oldest first. Pure bookkeeping; the Web Audio fade lives in the voice.
import { describe, expect, it } from 'vitest';

import { VOICE_CAP } from '../src/config';
import { VoicePool, type PoolNote } from '../src/VoicePool';
import { ScheduledNote } from '../src/voices/note';

class Note implements PoolNote {
  stolenAt: number | null = null;
  constructor(
    public readonly startTime: number,
    public endTime: number,
    private readonly level: (t: number) => number = () => 1,
  ) {}
  levelAt(t: number): number {
    return this.level(t);
  }
  steal(at: number): void {
    this.stolenAt = at;
  }
}

describe('VoicePool', () => {
  it('cap is 24 (ADR-002 / FR-MUS-07)', () => {
    expect(VOICE_CAP).toBe(24);
    expect(new VoicePool(VOICE_CAP).cap).toBe(24);
  });

  it('admits up to the cap without stealing', () => {
    const pool = new VoicePool(4);
    const notes = [0, 1, 2, 3].map((i) => new Note(i, i + 10));
    notes.forEach((n) => pool.admit(n, n.startTime));
    expect(pool.active).toBe(4);
    expect(notes.every((n) => n.stolenAt === null)).toBe(true);
  });

  it('among equally loud notes, steals the oldest when the cap + 1 th note is admitted', () => {
    const pool = new VoicePool(4);
    const notes = [2, 0, 3, 1].map((i) => new Note(i, i + 10)); // insertion order ≠ age order
    notes.forEach((n) => pool.admit(n, 5));
    const fifth = new Note(6, 16);
    pool.admit(fifth, 6);
    expect(pool.active).toBe(4);
    const stolen = notes.filter((n) => n.stolenAt !== null);
    expect(stolen).toHaveLength(1);
    expect(stolen[0]?.startTime).toBe(0);
    expect(stolen[0]?.stolenAt).toBe(6);
  });

  it('steals the quietest note even when it is not the oldest', () => {
    const pool = new VoicePool(4);
    const levels = [0.5, 0.9, 0.1, 0.3];
    const notes = levels.map((level, i) => new Note(i, i + 10, () => level));
    notes.forEach((n) => pool.admit(n, 5));
    pool.admit(new Note(6, 16), 6);
    expect(notes.map((n) => n.stolenAt)).toEqual([null, null, 6, null]);
    expect(pool.active).toBe(4);
  });

  it('judges loudness at the steal time: a younger note that has already faded goes before an older drone', () => {
    const pool = new VoicePool(2);
    const drone = new Note(0, 20, () => 0.2);
    const faded = new Note(1, 20, (t) => Math.exp(-(t - 1))); // 1.0 at t = 1, about 0.007 at t = 6
    pool.admit(drone, 0);
    pool.admit(faded, 1);
    pool.admit(new Note(6, 20), 6);
    expect(faded.stolenAt).toBe(6);
    expect(drone.stolenAt).toBeNull();
  });

  it('frees notes whose endTime has passed before considering a steal', () => {
    const pool = new VoicePool(2);
    const a = new Note(0, 1);
    const b = new Note(0.5, 1.5);
    pool.admit(a, 0);
    pool.admit(b, 0.5);
    const c = new Note(1.2, 3);
    pool.admit(c, 1.2); // a expired at 1.0 → freed, no steal
    expect(a.stolenAt).toBeNull();
    expect(b.stolenAt).toBeNull();
    expect(pool.active).toBe(2);
  });

  it('prune(now) frees finished notes without stealing', () => {
    const pool = new VoicePool(3);
    const notes = [0, 1, 2].map((i) => new Note(i, i + 1));
    notes.forEach((n) => pool.admit(n, 0.5)); // all admitted before any has ended
    expect(pool.active).toBe(3);
    pool.prune(2.5); // notes ending at 1 and 2 are done; the one ending at 3 is not
    expect(pool.active).toBe(1);
    expect(notes.every((n) => n.stolenAt === null)).toBe(true);
  });

  it('clear() steals everything that is still sounding', () => {
    const pool = new VoicePool(3);
    const notes = [0, 1, 2].map((i) => new Note(i, i + 10));
    notes.forEach((n) => pool.admit(n, n.startTime));
    pool.clear(4);
    expect(pool.active).toBe(0);
    expect(notes.every((n) => n.stolenAt === 4)).toBe(true);
  });

  it('with the real cap, the 25th request steals exactly one note and keeps 24 active', () => {
    const pool = new VoicePool(VOICE_CAP);
    const notes: Note[] = [];
    for (let i = 0; i < 25; i++) {
      const n = new Note(i * 0.01, 100);
      notes.push(n);
      pool.admit(n, n.startTime);
    }
    expect(pool.active).toBe(24);
    expect(notes.filter((n) => n.stolenAt !== null)).toHaveLength(1);
    expect(notes[0]?.stolenAt).not.toBeNull();
  });
});

describe('ScheduledNote.levelAt (what the pool compares)', () => {
  it('is the peak through the attack and hold, then falls exponentially from the decay start', () => {
    const note = new ScheduledNote(0, 5, {} as GainNode, [], 0.5, 1, 0.25);
    expect(note.levelAt(0)).toBe(0.5);
    expect(note.levelAt(1)).toBe(0.5);
    expect(note.levelAt(1.25)).toBeCloseTo(0.5 / Math.E, 9);
    expect(note.levelAt(3)).toBeLessThan(0.001);
  });
});
