// The three Phase-0 voices and the note record they fill (LLD §7, §7.1; API_SPEC §1.2 Voice). A voice builds a
// note's single-use sources and its envelope into the channel input it is handed, and nothing else.
import { describe, expect, it } from 'vitest';

import {
  BELL_ATTACK_S,
  BELL_FM_RATIO,
  PAD_ATTACK_S,
  PAD_SAW_LEVEL,
  PLUCK_BUFFER_S,
  PLUCK_DAMPING_BUCKETS,
  STEAL_FADE_S,
  STEAL_FADE_TAUS,
} from '../../../src/audio/config.js';
import { hueToCutoffMul } from '../../../src/audio/mapping.js';
import { hzForRing } from '../../../src/audio/theory.js';
import { Bell } from '../../../src/audio/voices/Bell.js';
import { Note, type NoteRef, type VoiceParams } from '../../../src/audio/voices/note.js';
import { Pad } from '../../../src/audio/voices/Pad.js';
import { Pluck } from '../../../src/audio/voices/Pluck.js';
import { RINGS } from '../../../src/garden/index.js';

import { FakeAudioContext, asNode, last, type FakeNode } from './fakeAudio.js';

const params = (over: Partial<VoiceParams> = {}): VoiceParams => ({
  hz: 440,
  gain: 0.5,
  release: 1,
  cutoffMul: 1,
  detune: 0,
  ...over,
});

function setup(): { ctx: FakeAudioContext; ref: NoteRef; out: FakeNode } {
  const ctx = new FakeAudioContext();
  return { ctx, ref: { note: new Note() }, out: ctx.createGain() };
}

describe('Note (what the pool compares and steals)', () => {
  it('level is the peak through the attack and hold, then falls exponentially from the decay start', () => {
    const note = new Note();
    note.begin(0, 5, asNode<GainNode>(new FakeAudioContext().createGain()), 0.5, 1, 0.25);
    expect(note.levelAt(0)).toBe(0.5);
    expect(note.levelAt(1)).toBe(0.5);
    expect(note.levelAt(1.25)).toBeCloseTo(0.5 / Math.E, 9);
    expect(note.levelAt(3)).toBeLessThan(0.001);
  });

  it('a note that has not started is cancelled whole: envelope cleared to 0, sources stopped before they start', () => {
    const { ctx, ref, out } = setup();
    new Bell(ctx.audio, ref).trigger(2, params(), asNode(out));
    const [carrier, mod] = ctx.of('oscillator') as [FakeNode, FakeNode];
    const env = last(ctx.of('gain'));

    ref.note.steal(1.5);

    expect(last(env.gain.events)).toMatchObject({ type: 'cancel', time: 0 });
    expect(env.gain.value).toBe(0);
    expect(env.gain.last('hold')).toBeUndefined();
    expect([carrier.stoppedAt, mod.stoppedAt]).toEqual([1.5, 1.5]);
    expect(ref.note.endTime).toBe(1.5);
  });

  it('a sounding note is held at its level, faded over 20 ms and stopped when the fade ends', () => {
    const { ctx, ref, out } = setup();
    new Bell(ctx.audio, ref).trigger(2, params(), asNode(out));
    const carrier = ctx.of('oscillator')[0] as FakeNode;
    const env = last(ctx.of('gain'));

    ref.note.steal(2.3);

    expect(env.gain.last('hold')).toMatchObject({ time: 2.3 });
    expect(last(env.gain.events)).toMatchObject({
      type: 'target',
      value: 0,
      time: 2.3,
      tau: STEAL_FADE_S / STEAL_FADE_TAUS,
    });
    expect(carrier.stoppedAt).toBeCloseTo(2.3 + STEAL_FADE_S, 9);
    expect(ref.note.endTime).toBeCloseTo(2.3 + STEAL_FADE_S, 9);
  });

  it('a browser without cancelAndHoldAtTime (Firefox) cancels from the steal time, then fades the same way', () => {
    const { ctx, ref, out } = setup();
    new Bell(ctx.audio, ref).trigger(2, params(), asNode(out));
    const carrier = ctx.of('oscillator')[0] as FakeNode;
    const env = last(ctx.of('gain'));
    Object.defineProperty(env.gain, 'cancelAndHoldAtTime', { value: undefined });

    expect(() => ref.note.steal(2.3)).not.toThrow();

    expect(env.gain.last('hold')).toBeUndefined();
    expect(env.gain.events.slice(-2)).toMatchObject([
      { type: 'cancel', time: 2.3 },
      { type: 'target', value: 0, time: 2.3, tau: STEAL_FADE_S / STEAL_FADE_TAUS },
    ]);
    expect(carrier.stoppedAt).toBeCloseTo(2.3 + STEAL_FADE_S, 9);
  });

  it('stealing a note that has already ended, or a record never used, does nothing', () => {
    const { ctx, ref, out } = setup();
    expect(() => ref.note.steal(1)).not.toThrow();
    new Bell(ctx.audio, ref).trigger(0, params(), asNode(out));
    const end = ref.note.endTime;
    const env = last(ctx.of('gain'));
    const before = env.gain.events.length;
    ref.note.steal(end + 1);
    expect(env.gain.events).toHaveLength(before);
    expect(ref.note.endTime).toBe(end);
  });
});

describe('Bell (2-operator FM)', () => {
  it('builds two sine oscillators, an index gain and an envelope into `out`, and fills the note', () => {
    const { ctx, ref, out } = setup();
    new Bell(ctx.audio, ref).trigger(1, params({ hz: 330, detune: 4 }), asNode(out));

    const [carrier, mod] = ctx.of('oscillator') as [FakeNode, FakeNode];
    expect(ctx.count('oscillator')).toBe(2);
    expect(ctx.count('gain')).toBe(3); // out (made by the test), the FM index and the envelope
    expect([carrier.type, mod.type]).toEqual(['sine', 'sine']);
    expect(carrier.frequency.value).toBe(330);
    expect(carrier.detune.value).toBe(4);
    expect(mod.frequency.value).toBeCloseTo(330 * BELL_FM_RATIO, 9);
    expect(out.inputs).toHaveLength(1);
    expect([carrier.startedAt, mod.startedAt]).toEqual([1, 1]);
    expect(ref.note.startTime).toBe(1);
    expect(ref.note.endTime).toBe(carrier.stoppedAt);
    expect(ref.note.levelAt(1)).toBe(0.5);
    expect(ref.note.levelAt(1 + BELL_ATTACK_S)).toBe(0.5); // the attack counts as full level
  });
});

describe('Pad (three detuned saws through a low-pass)', () => {
  it('builds three sawtooths, one filter and one envelope into `out`', () => {
    const { ctx, ref, out } = setup();
    new Pad(ctx.audio, ref).trigger(1, params({ hz: 130 }), asNode(out));

    const oscs = ctx.of('oscillator');
    expect(oscs.map((o) => o.type)).toEqual(['sawtooth', 'sawtooth', 'sawtooth']);
    expect(oscs.map((o) => o.detune.value)).toEqual([-7, 0, 7]);
    expect(ctx.count('biquad')).toBe(1);
    expect(out.inputs).toHaveLength(1);
    expect(oscs.every((o) => o.startedAt === 1 && o.stoppedAt === ref.note.endTime)).toBe(true);
    expect(ref.note.levelAt(1 + PAD_ATTACK_S)).toBeCloseTo(0.5 * PAD_SAW_LEVEL, 9);
  });

  it('a stolen pad stops all three of its sources', () => {
    const { ctx, ref, out } = setup();
    new Pad(ctx.audio, ref).trigger(1, params(), asNode(out));
    ref.note.steal(1.2);
    expect(ctx.of('oscillator').map((o) => o.stoppedAt)).toEqual([1.22, 1.22, 1.22]);
  });
});

describe('Pluck (Karplus-Strong strings, cached per pitch and damping step)', () => {
  it('a trigger plays a rendered string through one buffer source and one envelope', () => {
    const { ctx, ref, out } = setup();
    new Pluck(ctx.audio, ref).trigger(1, params({ detune: 8 }), asNode(out));

    const src = ctx.of('bufferSource')[0] as FakeNode;
    expect(ctx.count('bufferSource')).toBe(1);
    expect(src.buffer?.length).toBe(Math.floor(48000 * PLUCK_BUFFER_S));
    expect(src.buffer?.getChannelData(0).some((v) => v !== 0)).toBe(true); // the string was rendered
    expect(src.playbackRate.value).toBeCloseTo(Math.pow(2, 8 / 1200), 9);
    expect(src.startedAt).toBe(1);
    expect(out.inputs).toHaveLength(1);
    expect(ref.note.endTime).toBe(src.stoppedAt);
  });

  it('renders a string once per pitch and damping step, and a trigger after prepare() renders nothing', () => {
    const { ctx, ref, out } = setup();
    const pluck = new Pluck(ctx.audio, ref);
    const a = pluck.prepare(params({ hz: 440, cutoffMul: hueToCutoffMul(0.3) }));
    expect(pluck.prepare(params({ hz: 440, cutoffMul: hueToCutoffMul(0.3) }))).toBe(a);
    expect(pluck.prepare(params({ hz: 440, cutoffMul: hueToCutoffMul(0.45) }))).toBe(a); // same step of four
    expect(ctx.strings).toBe(1);

    expect(pluck.prepare(params({ hz: 440, cutoffMul: hueToCutoffMul(0.8) }))).not.toBe(a); // another step
    expect(pluck.prepare(params({ hz: 330, cutoffMul: hueToCutoffMul(0.3) }))).not.toBe(a); // another pitch
    expect(ctx.strings).toBe(3);

    pluck.trigger(0, params({ hz: 330, cutoffMul: hueToCutoffMul(0.3) }), asNode(out));
    expect(ctx.strings).toBe(3);
  });

  it('a full bed of plucks in one key needs at most 5 pitches × 4 damping steps = 20 strings (LLD §7)', () => {
    const { ctx, ref } = setup();
    const pluck = new Pluck(ctx.audio, ref);
    const key = { keyRoot: 0, mode: 'majorPent' } as const;
    for (let ring = 0; ring < RINGS; ring++) {
      for (let i = 0; i <= 100; i++) {
        pluck.prepare(params({ hz: hzForRing(key, ring, 'pluck'), cutoffMul: hueToCutoffMul(i / 100) }));
      }
    }
    expect(ctx.strings).toBe(RINGS * PLUCK_DAMPING_BUCKETS);
  });

  it('dispose() drops the cache, so the next key renders its own strings', () => {
    const { ctx, ref } = setup();
    const pluck = new Pluck(ctx.audio, ref);
    pluck.prepare(params());
    pluck.dispose();
    pluck.prepare(params());
    expect(ctx.strings).toBe(2);
  });

  it('a brighter hue rings longer: the string of a higher damping step holds more energy late', () => {
    const { ctx, ref } = setup();
    const pluck = new Pluck(ctx.audio, ref);
    const late = (hue: number): number => {
      const data = pluck.prepare(params({ cutoffMul: hueToCutoffMul(hue) })).getChannelData(0);
      let energy = 0;
      for (let i = 24000; i < 48000; i++) energy += (data[i] as number) ** 2;
      return energy;
    };
    expect(late(0.9)).toBeGreaterThan(late(0.1));
  });
});
