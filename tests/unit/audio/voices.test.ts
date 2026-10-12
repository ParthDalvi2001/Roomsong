// The five voices and the note record they fill (LLD §7, §7.1; API_SPEC §1.2 Voice). A voice builds a note's
// single-use sources and its envelope into the channel input it is handed, and nothing else.
import { GCProfiler } from 'node:v8';

import { describe, expect, it } from 'vitest';

import {
  BASS_ATTACK_S,
  BASS_CUTOFF_MUL,
  BASS_FILTER_Q,
  BASS_HOLD_MUL,
  BASS_PARTIALS,
  BASS_RELEASE_TAU_DIV,
  BASS_TAIL_TAUS,
  BELL_ATTACK_S,
  BELL_FM_RATIO,
  CHOIR_ATTACK_S,
  CHOIR_FORMANT_Q,
  CHOIR_FORMANTS_HZ,
  CHOIR_HOLD_MUL,
  CHOIR_PULSE_DUTY,
  CHOIR_PULSE_LEVEL,
  CHOIR_PULSE_PARTIALS,
  CHOIR_RELEASE_TAU_DIV,
  CHOIR_TAIL_TAUS,
  CHOIR_VIBRATO_CENTS,
  CHOIR_VIBRATO_HZ,
  HEIGHT_GAIN_DB_MIN,
  PAD_ATTACK_S,
  PAD_SAW_LEVEL,
  PLUCK_BUFFER_S,
  PLUCK_DAMPING_BUCKETS,
  STEAL_FADE_S,
  STEAL_FADE_TAUS,
} from '../../../src/audio/config.js';
import { dbToGain, heightToReleaseS, hueToCutoffMul, voiceParamsFor } from '../../../src/audio/mapping.js';
import { hzForRing } from '../../../src/audio/theory.js';
import { Bass, bassPartials } from '../../../src/audio/voices/Bass.js';
import { Bell } from '../../../src/audio/voices/Bell.js';
import { Choir, choirPartials } from '../../../src/audio/voices/Choir.js';
import { Note, type NoteRef, type Voice, type VoiceParams } from '../../../src/audio/voices/note.js';
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

  it('prepare() asks for a string and renders nothing; render() renders them oldest first, one per pitch and damping step', () => {
    const { ctx, ref, out } = setup();
    const pluck = new Pluck(ctx.audio, ref);
    pluck.prepare(params({ hz: 440, cutoffMul: hueToCutoffMul(0.3) }));
    pluck.prepare(params({ hz: 440, cutoffMul: hueToCutoffMul(0.3) })); // asked for already
    pluck.prepare(params({ hz: 440, cutoffMul: hueToCutoffMul(0.45) })); // the same step of four
    pluck.prepare(params({ hz: 440, cutoffMul: hueToCutoffMul(0.8) })); // another step
    pluck.prepare(params({ hz: 330, cutoffMul: hueToCutoffMul(0.3) })); // another pitch
    expect(ctx.strings).toBe(0);

    expect(pluck.render(2)).toBe(true);
    expect(ctx.strings).toBe(2);
    expect(pluck.render(2)).toBe(true); // the one that was left
    expect(ctx.strings).toBe(3);
    expect(pluck.render(2)).toBe(false); // none is waiting
    pluck.prepare(params({ hz: 330, cutoffMul: hueToCutoffMul(0.3) })); // rendered: not asked for again
    expect(pluck.render(2)).toBe(false);

    pluck.trigger(0, params({ hz: 330, cutoffMul: hueToCutoffMul(0.3) }), asNode(out));
    expect(ctx.strings).toBe(3);
    const src = ctx.of('bufferSource')[0] as FakeNode;
    expect(src.buffer).toBe(ctx.buffers[2]); // the last one asked for was the last one rendered
    expect(src.playbackRate.value).toBe(1);
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
    pluck.render(Infinity);
    expect(ctx.strings).toBe(RINGS * PLUCK_DAMPING_BUCKETS);
  });

  it('dispose() drops the strings and forgets the ones still asked for, so the next key renders only its own', () => {
    const { ctx, ref } = setup();
    const pluck = new Pluck(ctx.audio, ref);
    pluck.prepare(params());
    pluck.render(1);
    pluck.prepare(params({ hz: 330 }));
    pluck.dispose();
    expect(pluck.render(1)).toBe(false); // the 330 Hz string of the old key is never rendered
    pluck.prepare(params());
    pluck.render(1);
    expect(ctx.strings).toBe(2);
  });

  it('a brighter hue rings longer: the string of a higher damping step holds more energy late', () => {
    const { ctx, ref } = setup();
    const pluck = new Pluck(ctx.audio, ref);
    const late = (hue: number): number => {
      pluck.prepare(params({ cutoffMul: hueToCutoffMul(hue) }));
      pluck.render(1);
      const data = last(ctx.buffers).getChannelData(0);
      let energy = 0;
      for (let i = 24000; i < 48000; i++) energy += (data[i] as number) ** 2;
      return energy;
    };
    expect(late(0.9)).toBeGreaterThan(late(0.1));
  });

  it('a note whose string is not rendered yet plays the nearest ready one at its own pitch (LLD §7, T-143)', () => {
    const { ctx, ref, out } = setup();
    const pluck = new Pluck(ctx.audio, ref);
    const dark = hueToCutoffMul(0.1);
    const bright = hueToCutoffMul(0.9);
    const play = (hz: number, cutoffMul: number): FakeNode => {
      pluck.trigger(0, params({ hz, cutoffMul }), asNode(out));
      return last(ctx.of('bufferSource'));
    };
    // Rendered, in this order: 220 Hz dark, 330 Hz dark, 330 Hz bright.
    pluck.prepare(params({ hz: 220, cutoffMul: dark }));
    pluck.prepare(params({ hz: 330, cutoffMul: dark }));
    pluck.prepare(params({ hz: 330, cutoffMul: bright }));
    pluck.render(3);
    pluck.prepare(params({ hz: 270, cutoffMul: bright })); // asked for, and still waiting

    // Nearest in pitch is a ratio: 270 Hz is 50 Hz from 220 and 60 Hz from 330, but 330 is the smaller interval.
    // Of the two 330 Hz strings it takes the one of its own damping step.
    const high = play(270, bright);
    expect(high.buffer).toBe(ctx.buffers[2]);
    expect(high.playbackRate.value).toBeCloseTo(270 / 330, 12); // the buffer's pitch × the rate = the note's pitch
    expect(play(270, dark).buffer).toBe(ctx.buffers[1]);
    const low = play(240, bright); // no bright string near: the pitch decides before the damping step
    expect(low.buffer).toBe(ctx.buffers[0]);
    expect(low.playbackRate.value).toBeCloseTo(240 / 220, 12);
    expect(ctx.strings).toBe(3); // a trigger rendered nothing

    pluck.render(1); // its own string is ready: no more stand-in
    const own = play(270, bright);
    expect(own.buffer).toBe(ctx.buffers[3]);
    expect(own.playbackRate.value).toBe(1);
  });

  it('with no string ready at all a trigger renders its own on the spot, and its turn in the queue renders it no second time', () => {
    const { ctx, ref, out } = setup();
    const pluck = new Pluck(ctx.audio, ref);
    pluck.prepare(params({ hz: 330 }));
    pluck.trigger(0, params({ hz: 330 }), asNode(out));
    expect(ctx.strings).toBe(1);
    expect(ctx.of('bufferSource')[0]?.playbackRate.value).toBe(1);
    pluck.render(1);
    expect(ctx.strings).toBe(1);
  });

  // Two more tries, as for the heap tests of engine.test.ts: a collection already due can fall in every reading.
  it(
    'rendering a string makes no object: its buffer was made when it was asked for (NFR-PERF-08)',
    { retry: 2 },
    () => {
      const { ctx, ref } = setup();
      const pluck = new Pluck(ctx.audio, ref);
      const STRINGS = 20;
      /**
       * Twenty new strings, asked for and then rendered 2 at a time as the tick does: heap bytes a string. Low
       * strings (55 to 110 Hz), whose first period of noise is long: 440 to 870 samples.
       */
      const bytesAString = (set: number): number => {
        pluck.dispose();
        for (let i = 0; i < STRINGS; i++) pluck.prepare(params({ hz: 55 * 2 ** (i / STRINGS) + set }));
        const made = ctx.buffers.length;
        const profiler = new GCProfiler();
        profiler.start();
        const before = process.memoryUsage().heapUsed;
        for (let i = 0; i < STRINGS / 2; i++) pluck.render(2);
        const grown = process.memoryUsage().heapUsed - before;
        const collected = profiler.stop()?.statistics.length !== 0;
        expect(ctx.buffers).toHaveLength(made); // no buffer is made while rendering
        // A heap that shrank was swept meanwhile: as unreadable as one that was collected.
        return collected || grown < 0 ? Infinity : grown / STRINGS;
      };
      bytesAString(0); // warm up: the render loop is compiled here
      // Measured 250 to 365 bytes a string (2026-10-12), at these pitches and two octaves higher alike: the lists
      // of rendered strings growing, and the probe. With the noise from a generator called once per sample the
      // same strings read 4 700 to 6 000 bytes (the break check of the T-143 review fix).
      expect(Math.min(bytesAString(1), bytesAString(2), bytesAString(3))).toBeLessThan(1000);
      expect(ctx.strings).toBe(4 * STRINGS);
    },
  );

  it('a re-pitched string is stopped at the faded end of its buffer: later when it plays slower, sooner when faster', () => {
    const { ctx, ref, out } = setup();
    const pluck = new Pluck(ctx.audio, ref);
    pluck.prepare(params({ hz: 440 }));
    pluck.render(1);
    // Full height: the envelope (release 2.5 s) outlasts the 1.6 s buffer, so the buffer's end decides.
    const stopAt = (hz: number, detune = 0): number => {
      pluck.trigger(10, params({ hz, release: 2.5, detune }), asNode(out));
      expect(ref.note.endTime).toBe(last(ctx.of('bufferSource')).stoppedAt);
      return ref.note.endTime - 10;
    };
    expect(stopAt(440)).toBeCloseTo(PLUCK_BUFFER_S, 9);
    // An octave down the buffer plays at half speed: stopped at 1.6 s it would be cut in its middle, where the
    // string still sounds, and not at the fade that ends it.
    expect(stopAt(220)).toBeCloseTo(2 * PLUCK_BUFFER_S, 9);
    expect(stopAt(880)).toBeCloseTo(PLUCK_BUFFER_S / 2, 9);
    // The few cents of a hue count too: 8 cents flat is 7 ms more, the fade at the buffer's end among them.
    expect(stopAt(440, -8)).toBeCloseTo(PLUCK_BUFFER_S * 2 ** (8 / 1200), 9);
  });
});

describe('Bass (one oscillator on a soft-clipped sine + 2nd harmonic, through a low-pass)', () => {
  it('builds one oscillator on the bass wave, one low-pass and one envelope into `out`, and fills the note', () => {
    const { ctx, ref, out } = setup();
    const bass = new Bass(ctx.audio, ref);
    bass.trigger(1, params({ hz: 65, detune: 4, cutoffMul: 2 }), asNode(out));

    const osc = ctx.of('oscillator')[0] as FakeNode;
    const filter = ctx.of('biquad')[0] as FakeNode;
    const env = last(ctx.of('gain'));
    expect(ctx.nodes.map((n) => n.kind).sort()).toEqual(['biquad', 'gain', 'gain', 'oscillator']); // with `out`
    expect(osc.wave).toBe(ctx.waves[0]);
    expect(osc.frequency.value).toBe(65);
    expect(osc.detune.value).toBe(4);
    expect(filter.type).toBe('lowpass');
    expect(filter.frequency.value).toBeCloseTo(65 * BASS_CUTOFF_MUL * 2, 9);
    expect(filter.Q.value).toBe(BASS_FILTER_Q);
    expect(osc.outputs).toHaveLength(1);
    expect(osc.outputs[0]).toBe(filter);
    expect(filter.outputs[0]).toBe(env);
    expect(env.outputs[0]).toBe(out);
    expect(out.inputs).toHaveLength(1);
    expect(ctx.destination.inputs).toHaveLength(0); // only into the channel, so only through the limiter
    expect(osc.startedAt).toBe(1);
    expect(ref.note.startTime).toBe(1);
    expect(ref.note.endTime).toBe(osc.stoppedAt);

    bass.trigger(2, params(), asNode(out));
    expect(ctx.waves).toHaveLength(1); // the wave is made once, with the voice: a trigger makes nodes only
  });

  it('envelope: a 10 ms attack to the gain, a hold of release × 0.2, then a decay with τ = release / 25', () => {
    const { ctx, ref, out } = setup();
    new Bass(ctx.audio, ref).trigger(1, params({ gain: 0.5, release: 1 }), asNode(out));
    const releaseAt = 1 + BASS_ATTACK_S + BASS_HOLD_MUL;
    const tau = 1 / BASS_RELEASE_TAU_DIV;
    expect([BASS_ATTACK_S, BASS_HOLD_MUL, BASS_RELEASE_TAU_DIV]).toEqual([0.01, 0.2, 25]);
    expect(last(ctx.of('gain')).gain.events).toEqual([
      { type: 'set', value: 0, time: 1, tau: 0 },
      { type: 'linear', value: 0.5, time: 1 + BASS_ATTACK_S, tau: 0 },
      { type: 'target', value: 0, time: releaseAt, tau },
    ]);
    // What the pool compares: full level through the attack and the hold, then the same decay.
    expect(ref.note.levelAt(1)).toBe(0.5);
    expect(ref.note.levelAt(releaseAt)).toBe(0.5);
    expect(ref.note.levelAt(releaseAt + tau)).toBeCloseTo(0.5 / Math.E, 9);
    expect(ref.note.endTime).toBeCloseTo(releaseAt + BASS_TAIL_TAUS * tau, 9);
  });

  it('its length follows height (FR-MUS-05): about 0.6 s for a new plant (LLD §7), shorter below, longer above', () => {
    const { ctx, ref, out } = setup();
    const bass = new Bass(ctx.audio, ref);
    const lengthAt = (height: number): number => {
      bass.trigger(0, params({ release: heightToReleaseS(height) }), asNode(out));
      return ref.note.endTime;
    };
    const fresh = lengthAt(0.55); // the height a plant starts at (API_SPEC §1.1)
    expect(fresh).toBeGreaterThan(0.55);
    expect(fresh).toBeLessThan(0.7);
    expect(lengthAt(0)).toBeLessThan(fresh);
    expect(lengthAt(1)).toBeGreaterThan(fresh);
  });

  it('the wave can be heard on a small speaker: a strong 2nd harmonic and a 3rd, under a fundamental that leads', () => {
    const wave = bassPartials();
    const level = (k: number): number =>
      20 * Math.log10(Math.abs(wave[k] as number) / Math.abs(wave[1] as number));
    const energyFrom = (first: number): number => {
      let part = 0;
      let all = 0;
      for (let k = 1; k <= BASS_PARTIALS; k++) {
        const e = (wave[k] as number) ** 2;
        all += e;
        if (k >= first) part += e;
      }
      return part / all;
    };
    expect(wave).toHaveLength(BASS_PARTIALS + 1);
    expect(wave[0]).toBe(0);
    for (let k = 2; k <= BASS_PARTIALS; k++) expect(level(k), `harmonic ${k}`).toBeLessThan(0);
    expect(level(2)).toBeGreaterThan(-6);
    expect(level(3)).toBeGreaterThan(-18);
    expect(level(2)).toBeCloseTo(-2.5, 1);
    expect(level(3)).toBeCloseTo(-14.4, 1);
    expect(level(4)).toBeCloseTo(-8.0, 1);
    expect(wave[BASS_PARTIALS]).not.toBe(0);
    // A speaker that plays nothing under 120 Hz loses the fundamental of a bass note (55–147 Hz, LLD §7). What it
    // keeps: the 2nd harmonic and up, and for the one note whose 2nd harmonic is under 120 Hz too (A1, 55 Hz),
    // the 3rd and up.
    expect(energyFrom(2)).toBeGreaterThan(0.4);
    expect(energyFrom(3)).toBeGreaterThan(0.1);
  });

  it('the oscillator plays that wave: sine terms only, scaled to full level by the browser', () => {
    const { ctx, ref } = setup();
    new Bass(ctx.audio, ref);
    const wave = ctx.waves[0];
    expect(wave?.imag).toEqual(bassPartials());
    expect(wave?.real).toEqual(new Float32Array(BASS_PARTIALS + 1));
    expect(wave?.disableNormalization).toBe(false);
  });

  it('hue moves the low-pass one octave each way, and never under the 4th harmonic', () => {
    const { ctx, ref, out } = setup();
    const bass = new Bass(ctx.audio, ref);
    for (const hue of [0, 0.5, 1])
      bass.trigger(0, params({ hz: 55, cutoffMul: hueToCutoffMul(hue) }), asNode(out));
    const cutoffs = ctx.of('biquad').map((f) => f.frequency.value / 55);
    expect(cutoffs[0]).toBeCloseTo(BASS_CUTOFF_MUL / 2, 9);
    expect(cutoffs[1]).toBeCloseTo(BASS_CUTOFF_MUL, 9);
    expect(cutoffs[2]).toBeCloseTo(BASS_CUTOFF_MUL * 2, 9);
    expect(cutoffs[0]).toBeGreaterThanOrEqual(4);
  });

  it('a stolen bass is held at its level, faded over 20 ms and its source stopped when the fade ends', () => {
    const { ctx, ref, out } = setup();
    new Bass(ctx.audio, ref).trigger(1, params(), asNode(out));
    const env = last(ctx.of('gain'));

    ref.note.steal(1.1);

    expect(env.gain.last('hold')).toMatchObject({ time: 1.1 });
    expect(last(env.gain.events)).toMatchObject({ type: 'target', value: 0, time: 1.1 });
    expect(ctx.of('oscillator')[0]?.stoppedAt).toBeCloseTo(1.1 + STEAL_FADE_S, 9);
    expect(ref.note.endTime).toBeCloseTo(1.1 + STEAL_FADE_S, 9);
  });
});

describe('Choir (a pulse through three formant band-passes, with a slow vibrato)', () => {
  /** The oscillator that plays the pulse, and the one that moves its pitch. */
  const oscillators = (ctx: FakeAudioContext): { source: FakeNode; lfo: FakeNode } => ({
    source: ctx.of('oscillator').find((o) => o.wave !== null) as FakeNode,
    lfo: ctx.of('oscillator').find((o) => o.wave === null) as FakeNode,
  });

  it('builds the pulse oscillator, three band-passes, a vibrato pair and one envelope into `out`', () => {
    const { ctx, ref, out } = setup();
    const choir = new Choir(ctx.audio, ref);
    choir.trigger(1, params({ hz: 220, detune: -3 }), asNode(out));

    const { source, lfo } = oscillators(ctx);
    const formants = ctx.of('biquad');
    const env = out.inputs[0] as FakeNode;
    const depth = lfo.outputs[0] as FakeNode;
    expect(ctx.count('oscillator')).toBe(2);
    expect(ctx.count('gain')).toBe(3); // out (made by the test), the vibrato depth and the envelope
    expect(source.wave).toBe(ctx.waves[0]);
    expect(source.frequency.value).toBe(220);
    expect(source.detune.value).toBe(-3);
    expect(formants.map((f) => f.type)).toEqual(['bandpass', 'bandpass', 'bandpass']);
    expect(formants.map((f) => f.frequency.value)).toEqual([...CHOIR_FORMANTS_HZ]);
    expect(formants.map((f) => f.Q.value)).toEqual([CHOIR_FORMANT_Q, CHOIR_FORMANT_Q, CHOIR_FORMANT_Q]);
    // In parallel: each formant is fed by the pulse and feeds the envelope.
    for (const formant of formants) {
      expect(formant.inputs).toHaveLength(1);
      expect(formant.inputs[0]).toBe(source);
      expect(formant.outputs[0]).toBe(env);
    }
    expect(env.inputs).toHaveLength(3);
    expect(env.outputs[0]).toBe(out);
    expect(out.inputs).toHaveLength(1);
    expect(ctx.destination.inputs).toHaveLength(0); // only into the channel, so only through the limiter
    // The vibrato moves the pulse's pitch in cents, around the detune the hue gave it.
    expect(lfo.type).toBe('sine');
    expect(lfo.frequency.value).toBe(CHOIR_VIBRATO_HZ);
    expect(depth.gain.value).toBe(CHOIR_VIBRATO_CENTS);
    expect(depth.outputs[0]).toBe(source.detune);
    expect([source.startedAt, lfo.startedAt]).toEqual([1, 1]);
    expect([source.stoppedAt, lfo.stoppedAt]).toEqual([ref.note.endTime, ref.note.endTime]);
    expect(ref.note.startTime).toBe(1);

    choir.trigger(2, params(), asNode(out));
    expect(ctx.waves).toHaveLength(1); // the pulse is made once, with the voice
  });

  it('envelope: a 0.25 s swell to the gain, a hold of release × 0.5, then a decay with τ = release / 4', () => {
    const { ctx, ref, out } = setup();
    new Choir(ctx.audio, ref).trigger(1, params({ gain: 0.5, release: 1 }), asNode(out));
    const releaseAt = 1 + CHOIR_ATTACK_S + CHOIR_HOLD_MUL;
    const tau = 1 / CHOIR_RELEASE_TAU_DIV;
    expect([CHOIR_ATTACK_S, CHOIR_HOLD_MUL, CHOIR_RELEASE_TAU_DIV]).toEqual([0.25, 0.5, 4]);
    expect((out.inputs[0] as FakeNode).gain.events).toEqual([
      { type: 'set', value: 0, time: 1, tau: 0 },
      { type: 'linear', value: 0.5, time: 1 + CHOIR_ATTACK_S, tau: 0 },
      { type: 'target', value: 0, time: releaseAt, tau },
    ]);
    expect(ref.note.levelAt(1)).toBe(0.5); // the swell counts as full level
    expect(ref.note.levelAt(releaseAt)).toBe(0.5);
    expect(ref.note.levelAt(releaseAt + tau)).toBeCloseTo(0.5 / Math.E, 9);
    expect(ref.note.endTime).toBeCloseTo(releaseAt + CHOIR_TAIL_TAUS * tau, 9);
  });

  it('hue moves the three formants together, half an octave each way: the vowel changes, the pitch does not', () => {
    const { ctx, ref, out } = setup();
    const choir = new Choir(ctx.audio, ref);
    choir.trigger(0, params({ cutoffMul: hueToCutoffMul(0) }), asNode(out));
    choir.trigger(0, params({ cutoffMul: hueToCutoffMul(1) }), asNode(out));
    const centres = ctx.of('biquad').map((f) => f.frequency.value);
    CHOIR_FORMANTS_HZ.forEach((hz, i) => {
      expect(centres[i]).toBeCloseTo(hz * Math.SQRT1_2, 6);
      expect(centres[i + 3]).toBeCloseTo(hz * Math.SQRT2, 6);
    });
    expect(
      ctx
        .of('oscillator')
        .filter((o) => o.wave !== null)
        .map((o) => o.frequency.value),
    ).toEqual([440, 440]);
  });

  it('the pulse: every harmonic up to its first gap, and the gap is above the two formants that make the vowel', () => {
    const pulse = choirPartials();
    const gap = Math.round(1 / CHOIR_PULSE_DUTY);
    expect(pulse).toHaveLength(CHOIR_PULSE_PARTIALS + 1);
    expect(pulse[0]).toBe(0);
    for (let k = 1; k < gap; k++) expect(pulse[k], `harmonic ${k}`).toBeGreaterThan(0);
    expect(Math.abs(pulse[gap] as number)).toBeLessThan(1e-6);
    expect(pulse[1]).toBeCloseTo(
      ((2 * CHOIR_PULSE_LEVEL) / Math.PI) * Math.sin(Math.PI * CHOIR_PULSE_DUTY),
      6,
    );
    // The lowest choir note (A2, ring 0 in the key of A) with the brightest hue: its gap is still above F2.
    const lowest = hzForRing({ keyRoot: -3, mode: 'majorPent' }, 0, 'choir');
    expect(lowest).toBeCloseTo(110, 6);
    expect(gap * lowest).toBeGreaterThan((CHOIR_FORMANTS_HZ[1] as number) * Math.SQRT2);
    // And the partials reach the brightest F3 on that note.
    expect(CHOIR_PULSE_PARTIALS * lowest).toBeGreaterThan((CHOIR_FORMANTS_HZ[2] as number) * Math.SQRT2);
  });

  it('the oscillator plays that pulse: cosine terms only, at the level the code gave them', () => {
    const { ctx, ref } = setup();
    new Choir(ctx.audio, ref);
    const wave = ctx.waves[0];
    expect(wave?.real).toEqual(choirPartials());
    expect(wave?.imag).toEqual(new Float32Array(CHOIR_PULSE_PARTIALS + 1));
    expect(wave?.disableNormalization).toBe(true);
  });

  it('a stolen choir is held, faded over 20 ms, and both of its sources stop when the fade ends', () => {
    const { ctx, ref, out } = setup();
    new Choir(ctx.audio, ref).trigger(1, params(), asNode(out));
    const env = out.inputs[0] as FakeNode;

    ref.note.steal(1.1); // still in its swell

    expect(env.gain.last('hold')).toMatchObject({ time: 1.1 });
    expect(last(env.gain.events)).toMatchObject({ type: 'target', value: 0, time: 1.1 });
    expect(ctx.of('oscillator').map((o) => o.stoppedAt)).toEqual([1.12, 1.12]);
    expect(ref.note.endTime).toBeCloseTo(1.1 + STEAL_FADE_S, 9);
  });
});

describe('height → level and length, for each of the five voices (FR-MUS-05, TC-AUD-03)', () => {
  const makers: [string, (ctx: AudioContext, ref: NoteRef) => Voice][] = [
    ['bell', (ctx, ref) => new Bell(ctx, ref)],
    ['pad', (ctx, ref) => new Pad(ctx, ref)],
    ['pluck', (ctx, ref) => new Pluck(ctx, ref)],
    ['bass', (ctx, ref) => new Bass(ctx, ref)],
    ['choir', (ctx, ref) => new Choir(ctx, ref)],
  ];

  it.each(makers)(
    '%s: a taller plant is louder and never shorter; height 0 is 24 dB under height 1',
    (_, make) => {
      const { ctx, ref, out } = setup();
      const voice = make(ctx.audio, ref);
      const p = params();
      const noteAt = (height: number): { level: number; end: number } => {
        voiceParamsFor(
          { id: 'p', voice: 'bell', cell: { ring: 0, step: 0 }, height, hue: 0.5, plantedAt: 0 },
          220,
          p,
        );
        voice.trigger(0, p, asNode(out));
        return { level: ref.note.levelAt(0), end: ref.note.endTime };
      };
      const notes = [0, 0.25, 0.5, 0.75, 1].map(noteAt);
      const low = notes[0] as { level: number; end: number };
      let prev = low;
      for (const next of notes.slice(1)) {
        expect(next.level).toBeGreaterThan(prev.level);
        expect(next.end).toBeGreaterThanOrEqual(prev.end);
        prev = next;
      }
      expect(prev.end).toBeGreaterThan(low.end);
      expect(low.level / prev.level).toBeCloseTo(dbToGain(HEIGHT_GAIN_DB_MIN), 9);
    },
  );
});
