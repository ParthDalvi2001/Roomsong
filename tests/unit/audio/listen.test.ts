// Listen mode's audio (T-148): the nearest plants come forward (a note's channel level by its distance from the
// head, set where its panner moves, so no sounding note is stepped), the ending chord of the 10-minute end, and
// the bus wiring of listen:*. On the fake AudioContext: nothing is rendered, the graph is read.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Engine } from '../../../src/audio/AudioEngine.js';
import { LISTEN_FOCUS_REF_M, MIX_DB, TICK_MS } from '../../../src/audio/config.js';
import * as audio from '../../../src/audio/index.js';
import { dbToGain } from '../../../src/audio/mapping.js';
import { Spatializer } from '../../../src/audio/Spatializer.js';
import { hzForRing } from '../../../src/audio/theory.js';
import { bus } from '../../../src/core/index.js';
import { WANDERER } from '../../../src/garden/index.js';

import { asNode, FakeAudioContext, type FakeNode } from './fakeAudio.js';

import type { Plant, RoomSignature } from '../../../src/garden/index.js';

/** Column-major: a level head at 1.20 m over the origin, and a bed 0.45 m ahead of it on a 0.74 m desk. */
const HEAD = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.2, 0, 1];
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Spatializer: the Listen focus (T-148)', () => {
  function setup() {
    const ctx = new FakeAudioContext();
    const space = new Spatializer(ctx.audio, asNode(ctx.createGain()), asNode(ctx.createGain()));
    space.setListenerPose(HEAD);
    const input = (i: number) => space.inputs[i] as unknown as FakeNode;
    return { space, input };
  }

  it('on before the first listener pose, nothing is lowered: there is no head to measure from yet', () => {
    const ctx = new FakeAudioContext();
    const space = new Spatializer(ctx.audio, asNode(ctx.createGain()), asNode(ctx.createGain()));
    space.isFocused = true;
    space.place(0, 0, 0.74, -0.75, 1); // 1.1 m from the floor's origin, where an unposed listener sits
    expect((space.inputs[0] as unknown as FakeNode).gain.events).toEqual([]);
    space.setListenerPose(HEAD);
    space.place(0, 0, 0.74, -0.75, 2);
    expect((space.inputs[0] as unknown as FakeNode).gain.events).toHaveLength(1);
  });

  it('off, every channel stays at full level wherever its note is', () => {
    const { space, input } = setup();
    space.place(0, 0, 0.74, -0.75, 1);
    expect(input(0).gain.events).toEqual([]);
  });

  it('on, a note beyond 0.62 m of the head is set to (0.62 m ÷ its distance)², where its panner moves; a nearer one is left at 1', () => {
    expect(LISTEN_FOCUS_REF_M).toBe(0.62);
    const { space, input } = setup();
    space.isFocused = true;
    space.place(1, 0, 1.2, -0.6, 1); // 0.60 m ahead of the head
    expect(input(1).gain.events).toEqual([]);
    space.place(2, 0, 1.2, -1.24, 2.5); // twice as far: a quarter
    expect(input(2).gain.events).toEqual([{ type: 'set', value: 0.25, time: 2.5, tau: 0 }]);
    // The far rim of a bed 0.45 m ahead on a 0.74 m desk: 0.88 m from the head, −6.1 dB.
    space.place(3, 0, 0.74, -0.75, 3);
    const far = input(3).gain.last('set')!;
    expect(far.value).toBeCloseTo((LISTEN_FOCUS_REF_M / Math.hypot(0.46, 0.75)) ** 2, 9);
    expect(20 * Math.log10(far.value)).toBeCloseTo(-6.1, 1);
  });

  it('a level is written only when it changes, and focus off puts the next note of each channel back at 1', () => {
    const { space, input } = setup();
    space.isFocused = true;
    space.place(4, 0, 1.2, -1.24, 1);
    space.place(4, 0, 1.2, -1.24, 2);
    expect(input(4).gain.events).toHaveLength(1);
    space.isFocused = false;
    space.place(4, 0, 1.2, -1.24, 3);
    expect(input(4).gain.events).toEqual([
      { type: 'set', value: 0.25, time: 1, tau: 0 },
      { type: 'set', value: 1, time: 3, tau: 0 },
    ]);
  });
});

describe('the engine in Listen mode (T-148)', () => {
  const plant = (id: string, ring: number, step: number): Plant => ({
    id,
    voice: 'pluck',
    cell: { ring, step },
    height: 1,
    hue: 0.5,
    plantedAt: 0,
  });

  async function start() {
    const ctx = new FakeAudioContext();
    const engine = new Engine();
    engine.setTempo(84);
    await engine.init(ctx.audio);
    engine.setListenerPose(HEAD);
    let ticks = 0;
    const run = (seconds: number): void => {
      for (let n = Math.round((seconds * 1000) / TICK_MS); n > 0; n--) {
        ctx.currentTime = (++ticks * TICK_MS) / 1000;
        vi.advanceTimersByTime(TICK_MS);
      }
    };
    /** The level each note was given: the channel input's level in force at the note's start. */
    const levels = () =>
      ctx.of('bufferSource').map((source) => {
        const input = (source.outputs[0] as FakeNode).outputs[0] as FakeNode;
        const set = input.gain.events.filter((e) => e.type === 'set' && e.time <= source.startedAt!);
        return { level: set.length === 0 ? 1 : set[set.length - 1]!.value };
      });
    return { ctx, engine, run, levels };
  }

  it('in Listen the far plant is quieter and the near one is not; after it both are back at full', async () => {
    const { engine, run, levels } = await start();
    // Step 4 is nearest the user (D-029): ring 4 there is 0.15 m ahead of the head; step 12 ring 4 is the far rim.
    engine.syncPlants([plant('near', 4, 4), plant('far', 4, 12)], BED);
    run(3); // a bar at 84 BPM is 2.86 s
    expect(levels().every((note) => note.level === 1)).toBe(true);
    const before = levels().length;
    engine.enterListen();
    run(3);
    const inListen = levels()
      .slice(before)
      .map((note) => note.level);
    expect(inListen).toHaveLength(2);
    expect(inListen).toContain(1); // the near one
    expect(Math.min(...inListen)).toBeCloseTo((LISTEN_FOCUS_REF_M / Math.hypot(0.46, 0.75)) ** 2, 6);
    const during = levels().length;
    engine.exitListen();
    run(3);
    expect(
      levels()
        .slice(during)
        .map((note) => note.level),
    ).toEqual([1, 1]);
  });

  it("ui('goodnight') plays the room chord on Pad from the bed's centre, now; the other ui sounds are still silent", async () => {
    const { ctx, engine } = await start();
    engine.syncPlants([], BED);
    ctx.currentTime = 5;
    const fixed = ctx.nodes.length; // the graph has two low-passes of its own (T-164)
    engine.ui('tick');
    expect(ctx.nodes).toHaveLength(fixed);
    engine.ui('goodnight');
    const filters = ctx.nodes.slice(fixed).filter((n) => n.kind === 'biquad'); // one low-pass per pad note
    expect(filters).toHaveLength(3);
    const saws = ctx.of('oscillator').filter((osc) => osc.type === 'sawtooth');
    const heard = [...new Set(saws.map((osc) => Math.round(osc.frequency.value * 100) / 100))];
    // The Wanderer tuning, C major: rings 0, 2 and 3 are C3, E3 and G3.
    const chord = [0, 2, 3].map((ring) => Math.round(hzForRing(WANDERER, ring, 'pad') * 100) / 100);
    expect(heard).toEqual(chord);
    expect(saws.every((osc) => osc.startedAt === 5)).toBe(true);
    // From the bed's centre, at a full-height pad plant's level.
    const panner = ((filters[0]!.outputs[0] as FakeNode).outputs[0] as FakeNode).outputs[0] as FakeNode;
    expect([panner.positionX, panner.positionY, panner.positionZ].map((p) => p.last('set')?.value)).toEqual([
      0, 0.74, -0.45,
    ]);
    const env = filters[0]!.outputs[0] as FakeNode;
    expect(Math.max(...env.gain.events.map((e) => e.value))).toBeLessThanOrEqual(dbToGain(MIX_DB.pad));
  });

  it('a minor room ends on its minor chord: rings 0, 1 and 3', async () => {
    const { ctx, engine } = await start();
    const minor: RoomSignature = { ...WANDERER, keyRoot: 4, mode: 'minorPent' };
    engine.setSignature(minor);
    engine.ui('goodnight');
    const saws = ctx.of('oscillator').filter((osc) => osc.type === 'sawtooth');
    const heard = [...new Set(saws.map((osc) => Math.round(osc.frequency.value * 100) / 100))];
    expect(heard).toEqual([0, 1, 3].map((ring) => Math.round(hzForRing(minor, ring, 'pad') * 100) / 100));
  });

  it('before init() all three do nothing and throw nothing', () => {
    const engine = new Engine();
    expect(() => {
      engine.enterListen();
      engine.ui('goodnight');
      engine.exitListen();
    }).not.toThrow();
  });
});

describe('listen:* on the bus reach the engine (API_SPEC §2)', () => {
  it('enter focuses; a wake unfocuses; the 10-minute end unfocuses and plays the ending chord', () => {
    const engine = audio.createAudioEngine();
    const enter = vi.spyOn(engine, 'enterListen');
    const exit = vi.spyOn(engine, 'exitListen');
    const ui = vi.spyOn(engine, 'ui');
    bus.emit('listen:enter', {});
    expect(enter).toHaveBeenCalledTimes(1);
    bus.emit('listen:exit', { timedOut: false });
    expect(exit).toHaveBeenCalledTimes(1);
    expect(ui).not.toHaveBeenCalled();
    bus.emit('listen:exit', { timedOut: true });
    expect(exit).toHaveBeenCalledTimes(2);
    expect(ui).toHaveBeenCalledExactlyOnceWith('goodnight');
  });
});
