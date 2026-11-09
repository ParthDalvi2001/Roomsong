// The calm voices (voices/calm.ts), a note's with `calm` (T-193: a New plant's, in every style): each plant's own
// tone is deterministic, inside its ranges, and differs from its neighbours'; the notes stay small (≤ 8 sources) and
// fill the note record the pool steals by.
import { describe, expect, it } from 'vitest';

import {
  BOWL_BEAT_HZ_U,
  BOWL_OCTAVE_MUL,
  BOWL_RATIO_SPREAD,
  BOWL_RATIOS,
  HUM_ATTACK_S,
  HUM_CENTS_U,
  HUM_FILTER_GAIN_DB,
  HUM_FILTER_Q,
  HUM_HARMONICS,
  HUM_LEVEL,
  HUM_SWEEP_MUL,
  HUM_SWEEP_S_U,
} from '../../../src/audio/config.js';
import { plantTimbre } from '../../../src/audio/mapping.js';
import { STYLES, TODAY } from '../../../src/audio/styles.js';
import { Bass } from '../../../src/audio/voices/Bass.js';
import { Bell } from '../../../src/audio/voices/Bell.js';
import { Choir } from '../../../src/audio/voices/Choir.js';
import { Note, type VoiceParams } from '../../../src/audio/voices/note.js';
import { Pad } from '../../../src/audio/voices/Pad.js';
import { Pluck } from '../../../src/audio/voices/Pluck.js';
import { RINGS, STEPS } from '../../../src/garden/index.js';

import { FakeAudioContext, asNode, type FakeNode, type ParamEvent } from './fakeAudio.js';

const B = STYLES.B;

function play(voice: 'bell' | 'pluck' | 'choir' | 'pad' | 'bass', timbre: number, calm = true): FakeNode[] {
  const ctx = new FakeAudioContext();
  const ref = { note: new Note() };
  const p: VoiceParams = { hz: 440, gain: 0.5, release: 1, cutoffMul: 1, detune: 0, timbre, calm };
  const make = { bell: Bell, pluck: Pluck, choir: Choir, pad: Pad, bass: Bass }[voice];
  new make(ctx.audio, ref, B).trigger(1, p, ctx.createGain() as unknown as AudioNode);
  expect(ref.note.endTime).toBeGreaterThan(1); // the pool can steal it
  return ctx.nodes.filter((n) => n.kind === 'oscillator' || n.kind === 'bufferSource');
}

describe('calm voices (`calm`: a New plant; the drone, ripple and goodnight of style B)', () => {
  it('only style B has them for the notes that are no plant’s; its percussion is the kick and its drone an octave down', () => {
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

  it('with `calm` false the same five voices, on style B’s recipe, play as built', () => {
    expect((['bell', 'pluck', 'choir', 'pad', 'bass'] as const).map((v) => play(v, 5, false).length)).toEqual(
      [2, 1, 2, 3, 1],
    );
  });
});

describe('the hum (a bass plant of the New library): a tanpura-like string', () => {
  const t1 = plantTimbre({ id: 'a', cell: { ring: 0, step: 0 } });
  const t2 = plantTimbre({ id: 'a', cell: { ring: 0, step: 1 } });
  const HZ = 65; // the Bass's octave: the pitch is the Bass's, playHum does not move it
  const oscs = (nodes: FakeNode[]): FakeNode[] => nodes.filter((n) => n.kind === 'oscillator');
  const filterOf = (nodes: FakeNode[]): FakeNode => nodes.find((n) => n.kind === 'biquad') as FakeNode;
  const sweepOf = (nodes: FakeNode[]): ParamEvent => filterOf(nodes).frequency.last('exp') as ParamEvent;

  /** Triggers `bass` at t = 1 with cutoffMul 2 and detune 3 and returns the nodes that one note made. */
  function hum(
    ctx: FakeAudioContext,
    bass: Bass,
    ref: { note: Note },
    timbre: number,
    release = 1,
  ): FakeNode[] {
    const out = ctx.createGain();
    const made = ctx.nodes.length;
    bass.trigger(1, { hz: HZ, gain: 0.5, release, cutoffMul: 2, detune: 3, timbre, calm: true }, asNode(out));
    expect(ref.note.endTime).toBeGreaterThan(1);
    const nodes = ctx.nodes.slice(made);
    expect((nodes.find((n) => n.kind === 'gain') as FakeNode).outputs).toEqual([out]);
    return nodes;
  }

  it('is 2 oscillators on one shared wave, 2..5 cents apart, a peaking filter that falls 14x to 4x√cutoffMul, an envelope: 4 nodes', () => {
    const ctx = new FakeAudioContext();
    const ref = { note: new Note() };
    const nodes = hum(ctx, new Bass(ctx.audio, ref, B), ref, t1);
    expect(nodes.map((n) => n.kind).sort()).toEqual(['biquad', 'gain', 'oscillator', 'oscillator']);
    const [o1, o2] = oscs(nodes) as [FakeNode, FakeNode];
    const filter = filterOf(nodes);
    const env = nodes.find((n) => n.kind === 'gain') as FakeNode;
    expect(o1.wave).not.toBeNull();
    expect(o2.wave).toBe(o1.wave);
    expect(o1.wave?.imag).toHaveLength(HUM_HARMONICS + 1);
    expect(o1.wave?.imag[HUM_HARMONICS]).toBeCloseTo(1 / HUM_HARMONICS, 6); // falling as 1/n (Float32)
    expect([o1.frequency.value, o2.frequency.value]).toEqual([HZ, HZ]);
    expect(o1.detune.value).toBe(3); // the plant's own detune, on both
    expect(o2.detune.value - 3).toBeGreaterThanOrEqual(HUM_CENTS_U[0]);
    expect(o2.detune.value - 3).toBeLessThanOrEqual(HUM_CENTS_U[1]);
    expect(filter.type).toBe('peaking');
    expect([filter.Q.value, filter.gain.value]).toEqual([HUM_FILTER_Q, HUM_FILTER_GAIN_DB]);
    expect(filter.frequency.last('set')).toMatchObject({ value: HZ * HUM_SWEEP_MUL[0], time: 1 });
    const sweep = sweepOf(nodes);
    expect(sweep.value).toBeCloseTo(HZ * HUM_SWEEP_MUL[1] * Math.SQRT2, 9);
    expect(sweep.time - 1).toBeGreaterThanOrEqual(HUM_SWEEP_S_U[0]);
    expect(sweep.time - 1).toBeLessThanOrEqual(HUM_SWEEP_S_U[1]);
    expect(filter.inputs).toEqual([o1, o2]);
    expect(filter.outputs).toEqual([env]);
    expect(env.gain.last('linear')).toMatchObject({ value: 0.5 * HUM_LEVEL, time: 1 + HUM_ATTACK_S });
    expect(env.gain.last('target')?.value).toBe(0);
  });

  it('two plants differ in detune and sweep time; no source lives past 4.5 s at the longest release; one wave a context', () => {
    const ctx = new FakeAudioContext();
    const ref = { note: new Note() };
    const bass = new Bass(ctx.audio, ref, B);
    const a = hum(ctx, bass, ref, t1, 2.5);
    const b = hum(ctx, bass, ref, t2, 2.5);
    expect((oscs(b)[1] as FakeNode).detune.value).not.toBe((oscs(a)[1] as FakeNode).detune.value);
    expect(sweepOf(b).time).not.toBe(sweepOf(a).time);
    for (const o of [...oscs(a), ...oscs(b)]) {
      expect(o.startedAt).toBe(1);
      expect((o.stoppedAt as number) - 1).toBeLessThanOrEqual(4.5);
    }
    expect(ref.note.endTime).toBe((oscs(b)[0] as FakeNode).stoppedAt);
    expect((oscs(b)[0] as FakeNode).wave).toBe((oscs(a)[0] as FakeNode).wave);
  });
});
