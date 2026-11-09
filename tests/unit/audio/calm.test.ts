// Style B's calm voices (voices/calm.ts): each plant's own tone is deterministic, inside its ranges, and differs
// from its neighbours'; the notes stay small (≤ 8 sources) and fill the note record the pool steals by.
import { describe, expect, it } from 'vitest';

import {
  BOWL_BEAT_HZ_U,
  BOWL_OCTAVE_MUL,
  BOWL_RATIO_SPREAD,
  BOWL_RATIOS,
} from '../../../src/audio/config.js';
import { plantTimbre } from '../../../src/audio/mapping.js';
import { STYLES, TODAY } from '../../../src/audio/styles.js';
import { Bell } from '../../../src/audio/voices/Bell.js';
import { Choir } from '../../../src/audio/voices/Choir.js';
import { Note, type VoiceParams } from '../../../src/audio/voices/note.js';
import { Pad } from '../../../src/audio/voices/Pad.js';
import { Pluck } from '../../../src/audio/voices/Pluck.js';
import { RINGS, STEPS } from '../../../src/garden/index.js';

import { FakeAudioContext, type FakeNode } from './fakeAudio.js';

const B = STYLES.B;

function play(voice: 'bell' | 'pluck' | 'choir' | 'pad', timbre: number): FakeNode[] {
  const ctx = new FakeAudioContext();
  const ref = { note: new Note() };
  const p: VoiceParams = { hz: 440, gain: 0.5, release: 1, cutoffMul: 1, detune: 0, timbre };
  const make = { bell: Bell, pluck: Pluck, choir: Choir, pad: Pad }[voice];
  new make(ctx.audio, ref, B).trigger(1, p, ctx.createGain() as unknown as AudioNode);
  expect(ref.note.endTime).toBeGreaterThan(1); // the pool can steal it
  return ctx.nodes.filter((n) => n.kind === 'oscillator' || n.kind === 'bufferSource');
}

describe('calm voices (style B)', () => {
  it('only style B has them; its percussion is the kick and its drone an octave down', () => {
    expect([TODAY.calmVoices, STYLES.A.calmVoices, B.calmVoices, STYLES.C.calmVoices]).toEqual([
      false,
      false,
      true,
      false,
    ]);
    expect(B.perc.every((h) => h.kind === 'kick')).toBe(true);
    expect(B.droneOctave).toBe(-1);
  });

  it("a plant's timbre is its own: the same plant and cell the same, every other cell or plant another", () => {
    const seen = new Set<number>();
    for (const id of ['a', 'b', 'plant-17']) {
      for (let ring = 0; ring < RINGS; ring++) {
        for (let step = 0; step < STEPS; step++) {
          const t = plantTimbre({ id, cell: { ring, step } });
          expect(t).toBe(plantTimbre({ id, cell: { ring, step } }));
          expect(Number.isInteger(t) && t >= 0 && t < 2 ** 30).toBe(true);
          seen.add(t);
        }
      }
    }
    expect(seen.size).toBe(3 * RINGS * STEPS);
  });

  it('a bowl is 7 sines: its modes inside their ranges, the same for one timbre and different for two', () => {
    const t1 = plantTimbre({ id: 'a', cell: { ring: 0, step: 0 } });
    const t2 = plantTimbre({ id: 'a', cell: { ring: 0, step: 1 } });
    const hz = (nodes: FakeNode[]): number[] => nodes.map((n) => n.frequency.value);
    const one = play('bell', t1);
    expect(one).toHaveLength(7);
    expect(hz(play('bell', t1))).toEqual(hz(one));
    expect(hz(play('bell', t2))).not.toEqual(hz(one));
    const f0 = 440 * BOWL_OCTAVE_MUL;
    const [lo, hi] = BOWL_BEAT_HZ_U;
    const beat = (one[1] as FakeNode).frequency.value - (one[0] as FakeNode).frequency.value;
    expect(beat).toBeGreaterThanOrEqual(lo - 1e-9);
    expect(beat).toBeLessThanOrEqual(hi + 1e-9);
    const mode2 = ((one[2] as FakeNode).frequency.value + (one[3] as FakeNode).frequency.value) / 2;
    expect(Math.abs(mode2 / f0 / (BOWL_RATIOS[0] as number) - 1)).toBeLessThanOrEqual(
      BOWL_RATIO_SPREAD + 1e-9,
    );
  });

  it('the small bowl, the bansuri and the shruti box stay at or under 8 sources a note', () => {
    expect(play('pluck', 5)).toHaveLength(7);
    expect(play('choir', 5)).toHaveLength(3);
    expect(play('pad', 5)).toHaveLength(4);
  });
});
