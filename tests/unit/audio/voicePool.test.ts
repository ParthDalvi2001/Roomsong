// TC-AUD-04 (FR-MUS-07, NFR-PERF-10, LLD §7.1): 24 voice channels, one pooled equal-power panner each. A request
// that finds no free channel steals the oldest-quietest note: the lowest envelope level at the steal time, the
// oldest on a tie; a note of the same instant is never stolen; the stolen note has faded when the new one starts.
// TC-PERF-09: the listener follows the head.
import { describe, expect, it } from 'vitest';

import {
  PAN_REF_DISTANCE_M,
  PAN_ROLLOFF,
  STEAL_FADE_S,
  STEAL_FADE_TAUS,
  VOICE_CAP,
} from '../../../src/audio/config.js';
import { Spatializer } from '../../../src/audio/Spatializer.js';
import { VoicePool } from '../../../src/audio/VoicePool.js';
import { Bass } from '../../../src/audio/voices/Bass.js';
import { Bell } from '../../../src/audio/voices/Bell.js';
import { Choir } from '../../../src/audio/voices/Choir.js';
import { Pad } from '../../../src/audio/voices/Pad.js';
import { Pluck } from '../../../src/audio/voices/Pluck.js';

import { FakeAudioContext, asNode, type FakeNode } from './fakeAudio.js';

import type { NoteRef, Voice, VoiceParams } from '../../../src/audio/voices/note.js';

/** A voice with a chosen envelope: `gain` is the peak, `release` the seconds it holds before decaying (τ = 1 s). */
class TestVoice implements Voice {
  readonly envs: FakeNode[] = [];
  readonly sources: FakeNode[] = [];
  readonly outs: AudioNode[] = [];
  constructor(
    private readonly ctx: FakeAudioContext,
    private readonly ref: NoteRef,
    private readonly lengthS = 100,
  ) {}
  trigger(time: number, p: VoiceParams, out: AudioNode): void {
    const env = this.ctx.createGain();
    const src = this.ctx.createOscillator();
    src.connect(env).connect(out as unknown as FakeNode);
    src.start(time);
    src.stop(time + this.lengthS);
    this.ref.note.begin(time, time + this.lengthS, asNode<GainNode>(env), p.gain, time + p.release, 1);
    this.ref.note.add(asNode<OscillatorNode>(src));
    this.envs.push(env);
    this.sources.push(src);
    this.outs.push(out);
  }
  dispose(): void {}
}

const note = (gain = 1, release = 1000): VoiceParams => ({ hz: 440, gain, release, cutoffMul: 1, detune: 0 });

function setup(lengthS?: number): {
  ctx: FakeAudioContext;
  space: Spatializer;
  pool: VoicePool;
  voice: TestVoice;
  dry: FakeNode;
  send: FakeNode;
  play: (time: number, p?: VoiceParams, owner?: object | null) => boolean;
} {
  const ctx = new FakeAudioContext();
  const dry = ctx.createGain();
  const send = ctx.createGain();
  const space = new Spatializer(ctx.audio, asNode(dry), asNode(send));
  const pool = new VoicePool(ctx.audio, space);
  const voice = new TestVoice(ctx, pool.ref, lengthS);
  const play = (time: number, p = note(), owner: object | null = null): boolean =>
    pool.play(voice, time, p, 0, 0, 0, owner);
  return { ctx, space, pool, voice, dry, send, play };
}

/** Index of the notes (in play order) that were held and faded, or cancelled whole. */
const stolen = (voice: TestVoice): number[] =>
  voice.envs.flatMap((env, i) =>
    env.gain.events.some((e) => e.type === 'hold' || e.type === 'cancel') ? [i] : [],
  );

describe('Spatializer: the 24 pooled channel strips (NFR-PERF-10)', () => {
  it('builds 24 equal-power panners with the table-scale distance curve, and no HRTF', () => {
    const { ctx, space, dry, send } = setup();
    const panners = ctx.of('panner');
    expect(VOICE_CAP).toBe(24);
    expect(panners).toHaveLength(24);
    expect(space.inputs).toHaveLength(24);
    expect(panners.every((p) => p.panningModel === 'equalpower')).toBe(true);
    expect(panners.every((p) => p.distanceModel === 'inverse')).toBe(true);
    expect(
      panners.every((p) => p.refDistance === PAN_REF_DISTANCE_M && p.rolloffFactor === PAN_ROLLOFF),
    ).toBe(true);
    // Each channel input feeds its own panner (→ dry bus) and the shared send bus, taken before the pan.
    space.inputs.forEach((input, i) => {
      expect((input as unknown as FakeNode).outputs).toEqual([panners[i], send]);
      expect(panners[i]?.outputs).toEqual([dry]);
    });
    expect(send.inputs).toHaveLength(24);
  });

  it('the distance curve: gain 1 up to 40 cm from the head, −6 dB at 80 cm (inverse model, MDN PannerNode)', () => {
    const { ctx } = setup();
    const { refDistance: ref, rolloffFactor: k } = ctx.of('panner')[0] as FakeNode;
    const gain = (d: number): number => ref / (ref + k * (Math.max(d, ref) - ref));
    expect(gain(0.2)).toBe(1);
    expect(gain(0.4)).toBe(1);
    expect(20 * Math.log10(gain(0.8))).toBeCloseTo(-6.02, 2);
  });

  it('place() moves one channel at an audio time, without touching the others', () => {
    const { ctx, space } = setup();
    space.place(3, 0.3, 0.74, -0.45, 2.5);
    const [p2, p3] = ctx.of('panner').slice(2, 4) as [FakeNode, FakeNode];
    expect(p3.positionX.events).toEqual([{ type: 'set', value: 0.3, time: 2.5, tau: 0 }]);
    expect(p3.positionY.last('set')).toMatchObject({ value: 0.74, time: 2.5 });
    expect(p3.positionZ.last('set')).toMatchObject({ value: -0.45, time: 2.5 });
    expect(p2.positionX.events).toEqual([]);
  });

  it('the listener follows the head: position = translation, forward = −Z axis, up = Y axis of the matrix', () => {
    const { ctx, space } = setup();
    // Column-major, as THREE.Matrix4.elements: a head at (0.1, 1.2, 0.3), turned 90° to its left (yaw +90°).
    const head = [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0.1, 1.2, 0.3, 1];
    space.setListenerPose(head);
    const l = ctx.listener;
    expect([l.positionX.value, l.positionY.value, l.positionZ.value]).toEqual([0.1, 1.2, 0.3]);
    expect([l.forwardX.value, l.forwardY.value, l.forwardZ.value]).toEqual([-1, -0, -0]);
    expect([l.upX.value, l.upY.value, l.upZ.value]).toEqual([0, 1, 0]);
    expect(l.positionX.events).toEqual([]); // written as values: nothing piles up in a timeline at 72 calls a second
  });

  it('a matrix with a value that is not finite is ignored: the listener keeps its pose and nothing throws', () => {
    const { ctx, space } = setup();
    const head = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, Number.NaN, 1.2, 0, 1];
    expect(() => space.setListenerPose(head)).not.toThrow();
    expect(ctx.listener.positionY.value).toBe(0);
  });

  it('a browser whose listener has no AudioParams (Firefox) gets setPosition and setOrientation', () => {
    const ctx = new FakeAudioContext();
    const calls: number[][] = [];
    const listener = {
      setPosition: (...v: number[]) => calls.push(v),
      setOrientation: (...v: number[]) => calls.push(v),
    };
    Object.defineProperty(ctx, 'listener', { value: listener });
    const space = new Spatializer(ctx.audio, asNode(ctx.createGain()), asNode(ctx.createGain()));
    space.setListenerPose([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.2, 0, 1]);
    expect(calls).toEqual([
      [0, 1.2, 0],
      [-0, -0, -1, 0, 1, 0],
    ]);
  });
});

describe('VoicePool: 24 channels', () => {
  it('24 notes take 24 different channels, each moved to its position when the note starts', () => {
    const { ctx, space, pool, voice } = setup();
    for (let i = 0; i < 24; i++) expect(pool.play(voice, 1, note(), i, 0.74, -0.45, null)).toBe(true);
    expect(new Set(voice.outs).size).toBe(24);
    expect(voice.outs.every((out) => space.inputs.includes(out as GainNode))).toBe(true);
    expect(ctx.of('panner').map((p) => p.positionX.last('set'))).toEqual(
      Array.from({ length: 24 }, (_, i) => ({ type: 'set', value: i, time: 1, tau: 0 })),
    );
    expect(pool.active(1)).toBe(24);
    expect(stolen(voice)).toEqual([]);
  });

  it('a channel whose note has ended by the new start is reused without a steal', () => {
    const { voice, play, ctx } = setup(0.5);
    for (let i = 0; i < 24; i++) play(1); // all end at 1.5
    ctx.currentTime = 1.4; // still sounding now, silent by 1.5
    expect(play(1.5)).toBe(true);
    expect(stolen(voice)).toEqual([]);
    expect(voice.sources[24]?.startedAt).toBe(1.5);
  });

  it('never more than 24 at once: the 25th request steals exactly one note', () => {
    const { pool, voice, play } = setup();
    for (let i = 0; i < 24; i++) play(i * 0.01);
    expect(play(1)).toBe(true);
    expect(stolen(voice)).toHaveLength(1);
    expect(pool.active(1)).toBe(24);
  });
});

describe('VoicePool: oldest-quietest stealing', () => {
  it('24 equal notes: the oldest goes, whatever order they were played in', () => {
    const { voice, play } = setup();
    const starts = Array.from({ length: 24 }, (_, i) => ((i + 7) % 24) * 0.01); // the oldest is played 18th
    starts.forEach((t) => play(t));
    play(1);
    expect(stolen(voice)).toEqual([starts.indexOf(0)]);
  });

  it('one quieter, younger note: that one goes', () => {
    const { voice, play } = setup();
    for (let i = 0; i < 24; i++) play(i * 0.01, note(i === 20 ? 0.1 : 0.9));
    play(1);
    expect(stolen(voice)).toEqual([20]);
  });

  it('judges the level at the steal time: a younger note that has decayed goes before an older drone', () => {
    const { voice, play } = setup();
    play(0, note(0.2)); // the drone: holds 0.2
    for (let i = 1; i < 23; i++) play(0.1, note(0.9));
    play(0.5, note(1, 0.1)); // louder at first, decays from 0.6 with τ = 1 s: about 0.01 at t = 5
    play(5);
    expect(stolen(voice)).toEqual([23]);
  });

  it('a note still in its attack counts at its peak, so it is not stolen first', () => {
    const { voice, play } = setup();
    for (let i = 0; i < 23; i++) play(0, note(0.3));
    play(0.99, note(1)); // just started when the steal is judged at t = 1: its real envelope is near 0
    play(1);
    expect(stolen(voice)).toEqual([0]);
  });

  it('a note of the same instant is never stolen: an older note goes instead', () => {
    const { voice, play } = setup();
    play(0, note(1)); // older and louder than the rest
    for (let i = 0; i < 23; i++) play(1, note(0.1));
    expect(play(1, note(0.1))).toBe(true);
    expect(stolen(voice)).toEqual([0]);
  });

  it('when every channel holds a note of that instant, the new note is not played', () => {
    const { ctx, voice, play } = setup();
    for (let i = 0; i < 24; i++) play(1);
    const nodes = ctx.nodes.length;
    expect(play(1)).toBe(false);
    expect(stolen(voice)).toEqual([]);
    expect(ctx.nodes).toHaveLength(nodes); // nothing was built for it
  });
});

describe('VoicePool: the fade ends when the new note starts', () => {
  it('the steal fade is 20 ms (FR-MUS-07)', () => {
    expect(STEAL_FADE_S).toBe(0.02);
  });

  it('a scheduler note keeps its time: the stolen note is held 20 ms before it and stops as it starts', () => {
    const { ctx, voice, play } = setup();
    for (let i = 0; i < 24; i++) play(i * 0.01);
    ctx.currentTime = 0.9;
    play(1); // 100 ms ahead of the clock, as from the look-ahead scheduler
    const env = voice.envs[0] as FakeNode;
    expect(env.gain.last('hold')).toMatchObject({ time: 1 - STEAL_FADE_S });
    expect(env.gain.last('target')).toMatchObject({
      value: 0,
      time: 1 - STEAL_FADE_S,
      tau: STEAL_FADE_S / STEAL_FADE_TAUS,
    });
    expect(voice.sources[0]?.stoppedAt).toBeCloseTo(1, 9);
    expect(voice.sources[24]?.startedAt).toBe(1);
    expect(voice.outs[24]).toBe(voice.outs[0]); // the same channel, silent again when it is reused
    const panner = (voice.outs[0] as unknown as FakeNode).outputs[0] as FakeNode;
    expect(panner.positionX.last('set')).toMatchObject({ time: 1 }); // and its panner moves only then
  });

  it('an immediate sound that has to steal starts 20 ms late, after the fade', () => {
    const { ctx, voice, play } = setup();
    for (let i = 0; i < 24; i++) play(i * 0.01);
    ctx.currentTime = 2;
    play(2);
    expect(voice.envs[0]?.gain.last('hold')).toMatchObject({ time: 2 });
    expect(voice.sources[0]?.stoppedAt).toBeCloseTo(2 + STEAL_FADE_S, 9);
    expect(voice.sources[24]?.startedAt).toBeCloseTo(2 + STEAL_FADE_S, 9);
  });

  it('a stolen note that would only start during the fade is cancelled whole, never heard', () => {
    const { ctx, voice, play } = setup();
    play(0.99, note(0.1)); // the quietest; starts 10 ms before the new note, inside its 20 ms fade
    for (let i = 0; i < 23; i++) play(0.5, note(0.9));
    ctx.currentTime = 0.9;
    play(1);
    const env = voice.envs[0] as FakeNode;
    expect(env.gain.last('hold')).toBeUndefined();
    expect(env.gain.events.slice(-1)).toMatchObject([{ type: 'cancel', time: 0 }]);
    expect(env.gain.value).toBe(0);
    expect(voice.sources[0]?.stoppedAt).toBeCloseTo(0.98, 9); // before its own start at 0.99
  });
});

describe('VoicePool with the five real voices: the cap and the order hold in a mixed bed (T-144)', () => {
  /** 24 notes at time 0, the five voices in turn (a bass is every 5th, from the 4th), one gain and release. */
  function mixedBed(): {
    ctx: FakeAudioContext;
    pool: VoicePool;
    bell: (time: number) => boolean;
    stolen: () => number[];
  } {
    const ctx = new FakeAudioContext();
    const space = new Spatializer(ctx.audio, asNode(ctx.createGain()), asNode(ctx.createGain()));
    const pool = new VoicePool(ctx.audio, space);
    const voices: Voice[] = [
      new Bell(ctx.audio, pool.ref),
      new Pad(ctx.audio, pool.ref),
      new Pluck(ctx.audio, pool.ref),
      new Bass(ctx.audio, pool.ref),
      new Choir(ctx.audio, pool.ref),
    ];
    const p = note(0.5, 1);
    for (let i = 0; i < VOICE_CAP; i++) pool.play(voices[i % 5] as Voice, 0, p, 0, 0, 0, null);
    const inputs = space.inputs as unknown as FakeNode[];
    return {
      ctx,
      pool,
      bell: (time) => pool.play(voices[0] as Voice, time, p, 0, 0, 0, null),
      // One envelope per note, in play order: the gains that feed a channel input.
      stolen: () =>
        ctx
          .of('gain')
          .filter((g) => inputs.includes(g.outputs[0] as FakeNode))
          .flatMap((env, i) =>
            env.gain.events.some((e) => e.type === 'hold' || e.type === 'cancel') ? [i] : [],
          ),
    };
  }

  it('each voice is judged by its own envelope: at 0.3 s the basses are in their release, so they go first, then a bell', () => {
    const { ctx, pool, bell, stolen } = mixedBed();
    expect(pool.active(0.3)).toBe(VOICE_CAP);
    ctx.currentTime = 0.2;

    expect(bell(0.3)).toBe(true);
    expect(stolen()).toEqual([3]); // the first bass: 0.05 against a bell's 0.11, a pad's 0.2, a pluck's 0.45, a choir's 0.5
    for (let i = 0; i < 4; i++) bell(0.3);
    expect(stolen()).toEqual([3, 8, 13, 18, 23]); // the five basses, and never a note of the same instant
    bell(0.3);
    expect(stolen()).toEqual([0, 3, 8, 13, 18, 23]); // then the quietest that is left: the first bell
    expect(pool.active(0.3)).toBe(VOICE_CAP);

    // The stolen bass was held 20 ms ahead and its source stops as the new note starts.
    const bass = ctx.of('oscillator').find((o) => o.type === 'custom') as FakeNode;
    const env = (bass.outputs[0] as FakeNode).outputs[0] as FakeNode;
    expect(env.gain.last('hold')).toMatchObject({ time: 0.3 - STEAL_FADE_S });
    expect(bass.stoppedAt).toBeCloseTo(0.3, 9);
  });

  it('a short voice gives its channel back: at 0.5 s the basses have ended, and five new notes steal nothing', () => {
    const { ctx, pool, bell, stolen } = mixedBed();
    ctx.currentTime = 0.4;
    expect(pool.active(0.5)).toBe(VOICE_CAP - 5);
    for (let i = 0; i < 5; i++) expect(bell(0.5)).toBe(true);
    expect(stolen()).toEqual([]);
    expect(pool.active(0.5)).toBe(VOICE_CAP);
    bell(0.5);
    expect(stolen()).toEqual([0]); // full again: the first bell is the quietest by now
  });
});

describe('VoicePool: releasing notes', () => {
  it('release(owner) fades only the notes of that owner; releaseAll() fades the rest', () => {
    const { pool, voice, play } = setup();
    const a = {};
    const b = {};
    play(0, note(), a);
    play(0, note(), b);
    play(0, note(), a);
    pool.release(a, 1);
    expect(stolen(voice)).toEqual([0, 2]);
    expect(pool.active(1 + STEAL_FADE_S)).toBe(1);
    pool.releaseAll(2);
    expect(stolen(voice)).toEqual([0, 1, 2]);
    expect(pool.active(2 + STEAL_FADE_S)).toBe(0);
  });
});
