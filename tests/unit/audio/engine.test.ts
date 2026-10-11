// The engine on a fake AudioContext and a fake clock (TEST_PLAN TC-AUD-02, TC-AUD-04, TC-AUD-05, TC-PERF-09):
// scheduling inside the look-ahead window, no double scheduling, `syncPlants` diffing, the voice cap, the graph
// shape, the limiter chain, pan side and the context life cycle. Node has no Web Audio, so nothing is rendered
// here: level and pan are checked on the graph and by the laws the nodes follow.
import { GCProfiler } from 'node:v8';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Engine, type AudioEngine } from '../../../src/audio/AudioEngine.js';
import {
  CEILING_DBFS,
  LATE_DROP_S,
  LOOK_AHEAD_S,
  MIX_DB,
  PARAM_SMOOTH_S,
  REVERB_IR_MAX_S,
  REVERB_SEND,
  REVERB_SMALL_RT60_S,
  REVERB_SWAP_DELAY_S,
  START_DELAY_S,
  SUSPEND_FADE_S,
  TICK_MS,
  VOICE_CAP,
  WET_RETURN,
} from '../../../src/audio/config.js';
import { dbToGain } from '../../../src/audio/mapping.js';
import { Scheduler } from '../../../src/audio/Scheduler.js';
import { RINGS, STEPS } from '../../../src/garden/index.js';

import { FakeAudioContext, last, type FakeNode } from './fakeAudio.js';

import type { Plant, RoomSignature, VoiceType } from '../../../src/garden/index.js';

const BPM = 84;
const STEP_S = Scheduler.stepDurationFor(BPM);
const BAR_S = STEPS * STEP_S;
const TICK_S = TICK_MS / 1000;
/** Column-major. The bed centre 0.45 m ahead of the origin on a 0.74 m desk; +x = the user's right (D-029). */
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];
/** A level head at 1.20 m over the origin, looking down −z at the bed. */
const HEAD = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.2, 0, 1];
const WANDERER: RoomSignature = {
  keyRoot: 0,
  mode: 'majorPent',
  tempo: 84,
  reverbRt60: 0.9,
  reverbSize: 'medium',
  starterVoices: ['bell', 'pad', 'pluck'],
  paletteSeed: 0,
};
const HALL: RoomSignature = {
  ...WANDERER,
  keyRoot: -3,
  mode: 'susPent',
  reverbRt60: 2.0,
  reverbSize: 'large',
};

const plant = (
  id: string,
  voice: VoiceType,
  ring: number,
  step: number,
  over: Partial<Plant> = {},
): Plant => ({
  id,
  voice,
  cell: { ring, step },
  height: 1,
  hue: 0.5,
  plantedAt: 0,
  ...over,
});
/** One pluck on every step: one buffer source per note, so notes are easy to count. */
const sixteenPlucks = (): Plant[] =>
  Array.from({ length: STEPS }, (_, s) => plant(`p${s}`, 'pluck', s % RINGS, s));
/** Audio time of absolute step `i` when the engine was started at time 0. */
const stepTime = (i: number): number => START_DELAY_S + i * STEP_S;
const starts = (ctx: FakeAudioContext): number[] => ctx.of('bufferSource').map((n) => n.startedAt as number);
/** Notes built so far: a pluck is one buffer source, a pad one filter and three saws, a bell two sines. */
const notes = (ctx: FakeAudioContext): number =>
  ctx.count('bufferSource') + ctx.count('biquad') + (ctx.count('oscillator') - 3 * ctx.count('biquad')) / 2;
/** The fixed graph, found by its connections. */
function graph(
  ctx: FakeAudioContext,
): Record<'shaper' | 'compressor' | 'master' | 'convolver' | 'send' | 'wet', FakeNode> {
  const shaper = ctx.destination.inputs[0] as FakeNode;
  const compressor = shaper.inputs[0] as FakeNode;
  const convolver = ctx.of('convolver')[0] as FakeNode;
  return {
    shaper,
    compressor,
    master: compressor.inputs[0] as FakeNode,
    convolver,
    send: convolver.inputs[0] as FakeNode,
    wet: convolver.outputs[0] as FakeNode,
  };
}
/** The panner of the channel a note's source plays through: source → envelope → channel input → panner. */
const pannerOf = (source: FakeNode): FakeNode =>
  ((source.outputs[0] as FakeNode).outputs[0] as FakeNode).outputs[0] as FakeNode;

interface Rig {
  ctx: FakeAudioContext;
  engine: Engine;
  /** Advance the audio clock and the 25 ms interval together. */
  run: (seconds: number, eachTick?: () => void) => void;
  /** Move the audio clock on without a tick: a stalled or throttled main thread. */
  stall: (seconds: number) => void;
}

async function start(before?: (engine: Engine) => void, ctx = new FakeAudioContext()): Promise<Rig> {
  const engine = new Engine();
  engine.setTempo(BPM);
  before?.(engine);
  await engine.init(ctx.audio);
  let ticks = 0;
  return {
    ctx,
    engine,
    run: (seconds, eachTick) => {
      for (let n = Math.round(seconds / TICK_S); n > 0; n--) {
        ctx.currentTime = ++ticks * TICK_S;
        vi.advanceTimersByTime(TICK_MS);
        eachTick?.();
      }
    },
    stall: (seconds) => {
      ticks += Math.round(seconds / TICK_S);
    },
  };
}

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('graph shape (NFR-PERF-10, TC-PERF-09)', () => {
  it('init() builds 24 equal-power panners, 0 HRTF, exactly 1 convolver and one limiter stage', async () => {
    const { ctx } = await start();
    expect(ctx.count('panner')).toBe(VOICE_CAP);
    expect(ctx.of('panner').filter((p) => p.panningModel !== 'equalpower')).toEqual([]);
    expect(ctx.count('convolver')).toBe(1);
    expect(ctx.count('compressor')).toBe(1);
    expect(ctx.count('waveShaper')).toBe(1);
    expect(ctx.count('oscillator') + ctx.count('bufferSource') + ctx.count('biquad')).toBe(0);
  });

  it('everything reaches the output through the compressor and then the −1 dBFS ceiling: no way round it', async () => {
    const { ctx } = await start();
    const g = graph(ctx);
    expect(ctx.destination.inputs).toEqual([g.shaper]);
    expect(g.shaper.kind).toBe('waveShaper');
    expect(g.shaper.inputs).toEqual([g.compressor]);
    expect(g.compressor.kind).toBe('compressor');
    expect(g.compressor.inputs).toEqual([g.master]);
    // A wave-shaper clamps its input to the ends of its curve, so the curve's maximum is the output's maximum.
    const peak = (g.shaper.curve as Float32Array).reduce((max, v) => Math.max(max, Math.abs(v)), 0);
    expect(peak).toBeLessThan(dbToGain(CEILING_DBFS));
    // The 24 panners and the reverb return all feed the master gain.
    expect(g.master.inputs).toHaveLength(VOICE_CAP + 1);
    expect(g.master.inputs.filter((n) => n.kind === 'panner')).toHaveLength(VOICE_CAP);
    expect(g.master.inputs).toContain(g.wet);
    expect(g.send.inputs).toHaveLength(VOICE_CAP);
  });

  it('a full bed for 13 bars (1040 triggers): the fixed graph is never added to, and voices never pass 24', async () => {
    const { ctx, engine, run } = await start();
    const fixed = ctx.nodes.length;
    const bed: Plant[] = [];
    const voices: VoiceType[] = ['bell', 'pad', 'pluck'];
    for (let ring = 0; ring < RINGS; ring++) {
      for (let step = 0; step < STEPS; step++) {
        bed.push(plant(`${ring}-${step}`, voices[(ring + step) % 3] as VoiceType, ring, step));
      }
    }
    engine.setSignature(WANDERER);
    engine.syncPlants(bed, BED);
    let most = 0;
    run(13 * BAR_S, () => {
      most = Math.max(most, engine.stats.voices);
    });

    expect(notes(ctx)).toBeGreaterThanOrEqual(1000);
    expect(most).toBe(VOICE_CAP); // a full bed asks for more: stealing is its normal state
    expect(ctx.count('panner')).toBe(VOICE_CAP);
    expect(ctx.count('convolver')).toBe(1);
    expect(ctx.count('compressor')).toBe(1);
    expect(ctx.count('waveShaper')).toBe(1);
    const perNote = new Set(ctx.nodes.slice(fixed).map((n) => n.kind));
    expect([...perNote].sort()).toEqual(['biquad', 'bufferSource', 'gain', 'oscillator']);
    expect(ctx.strings).toBeLessThanOrEqual(RINGS * 4);
    // Stolen notes were faded, not cut: an envelope was held and glided to 0 over the steal fade.
    const held = ctx.of('gain').filter((n) => n.gain.last('hold') !== undefined);
    expect(held.length).toBeGreaterThan(100);
  });

  it('a second init() builds nothing', async () => {
    const { ctx, engine } = await start();
    const fixed = ctx.nodes.length;
    await engine.init(ctx.audio);
    expect(ctx.nodes).toHaveLength(fixed);
  });
});

describe('scheduling (FR-MUS-03, TC-AUD-02)', () => {
  it('every note lands between look-ahead − tick and look-ahead ahead of the clock, on its step', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants([plant('a', 'pluck', 2, 3)], BED);
    run(2 * BAR_S);
    const played = ctx.of('bufferSource');
    expect(played.map((n) => n.startedAt)).toEqual([stepTime(3), stepTime(19)]);
    for (const n of played) {
      const ahead = (n.startedAt as number) - n.scheduledAt;
      expect(ahead).toBeGreaterThan(LOOK_AHEAD_S - TICK_S - 1e-9);
      expect(ahead).toBeLessThanOrEqual(LOOK_AHEAD_S);
    }
  });

  it('no step is scheduled twice or missed, also when syncPlants runs on every tick', async () => {
    const { ctx, engine, run } = await start();
    const plants = sixteenPlucks();
    engine.syncPlants(plants, BED);
    run(3 * BAR_S, () => engine.syncPlants(plants, BED));
    const times = starts(ctx);
    expect(times.length).toBeGreaterThanOrEqual(3 * STEPS);
    times.forEach((t, i) => expect(t).toBeCloseTo(stepTime(i), 9));
    expect(last(times)).toBeLessThan(ctx.currentTime + LOOK_AHEAD_S);
    expect(stepTime(times.length)).toBeGreaterThanOrEqual(ctx.currentTime + LOOK_AHEAD_S); // the next one is not due
  });

  it('the tempo is the user setting: setTempo changes the spacing, clamped to 60–120, and a bad value is ignored', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants(sixteenPlucks(), BED);
    const spacing = (): number => {
      run(1);
      const times = starts(ctx);
      return (times[times.length - 1] as number) - (times[times.length - 2] as number);
    };
    expect(spacing()).toBeCloseTo(STEP_S, 9);
    engine.setTempo(96);
    expect(spacing()).toBeCloseTo(Scheduler.stepDurationFor(96), 9);
    engine.setTempo(Number.NaN);
    engine.setTempo(Number.POSITIVE_INFINITY);
    expect(spacing()).toBeCloseTo(Scheduler.stepDurationFor(96), 9);
    engine.setTempo(1000);
    expect(spacing()).toBeCloseTo(Scheduler.stepDurationFor(120), 9);
    engine.setTempo(1);
    expect(spacing()).toBeCloseTo(Scheduler.stepDurationFor(60), 9);
  });

  it('setSignature never changes the tempo (D-021)', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants(sixteenPlucks(), BED);
    engine.setSignature({ ...HALL, tempo: 96 });
    run(2);
    const times = starts(ctx);
    expect((times[5] as number) - (times[4] as number)).toBeCloseTo(STEP_S, 9);
  });

  it('after a stall the missed steps are skipped, not played in a burst', async () => {
    const { ctx, engine, run, stall } = await start();
    engine.syncPlants(sixteenPlucks(), BED);
    run(1);
    const before = starts(ctx).length;
    stall(5); // 28 steps pass with no tick
    run(TICK_S);
    const late = starts(ctx).slice(before);
    expect(late.length).toBeGreaterThanOrEqual(1);
    expect(late.length).toBeLessThanOrEqual(2);
    for (const t of late) expect(t).toBeGreaterThanOrEqual(ctx.currentTime - LATE_DROP_S);
    run(1); // and the tide carries on, on the same grid
    const k = Math.round((last(starts(ctx)) - START_DELAY_S) / STEP_S);
    expect(last(starts(ctx))).toBeCloseTo(stepTime(k), 9);
  });

  it('clock reads the audio clock: now, the step sounding and the bar phase', async () => {
    const { ctx, engine, run } = await start();
    expect(new Engine().clock.now()).toBe(0); // before init
    expect(new Engine().clock.stepIndex()).toBe(0);
    run(1);
    ctx.currentTime = stepTime(5) + STEP_S / 2;
    expect(engine.clock.now()).toBe(ctx.currentTime);
    expect(engine.clock.stepIndex()).toBe(5);
    expect(engine.clock.barPhase()).toBeCloseTo(5.5 / STEPS, 9);
  });
});

describe('the tick builds nothing but the notes it schedules', () => {
  it('an empty bed for a bar: no node, and no buffer after the impulse response made in init()', async () => {
    const { ctx, run } = await start();
    const fixed = ctx.nodes.length;
    run(BAR_S);
    expect(ctx.nodes).toHaveLength(fixed);
    expect(ctx.buffers).toHaveLength(1);
    expect(ctx.strings).toBe(0);
  });

  it('one pluck: two nodes per note (source and envelope), no string rendered in the tick', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants([plant('a', 'pluck', 0, 0)], BED);
    expect(ctx.strings).toBe(1); // rendered here, on sync
    const fixed = ctx.nodes.length;
    run(2 * BAR_S);
    expect(starts(ctx)).toHaveLength(3); // steps 0, 16 and 32
    expect(ctx.nodes.slice(fixed).map((n) => n.kind)).toEqual(Array(3).fill(['bufferSource', 'gain']).flat());
    expect(ctx.strings).toBe(1);
  });

  const ROUNDS = 1_000_000;
  /** Heap growth while `work` ran, in bytes per round; Infinity when a garbage collection made it unreadable. */
  const bytesPerRound = (work: () => void): number => {
    const profiler = new GCProfiler();
    profiler.start();
    const before = process.memoryUsage().heapUsed;
    work();
    const grown = process.memoryUsage().heapUsed - before;
    return profiler.stop()?.statistics.length === 0 ? grown / ROUNDS : Infinity;
  };

  it('the tick makes no object of its own: a million ticks over an empty bed grow the heap by under 4 bytes a tick', async () => {
    const { ctx, engine } = await start();
    const tickAll = (): void => {
      for (let i = 0; i < ROUNDS; i++) {
        ctx.currentTime += TICK_S; // steps come due: the scheduler loop and the step table are walked
        engine.tick();
      }
    };
    let kept: unknown = null;
    const allocateAll = (): void => {
      for (let i = 0; i < ROUNDS; i++) kept = { i };
    };
    tickAll(); // warm up: the JIT's own allocations happen here
    // The control shows the probe works: one small object per round reads as 16 bytes or more, or as a collection.
    expect(bytesPerRound(allocateAll)).toBeGreaterThanOrEqual(16);
    // Measured 2.24 bytes a tick at 84 BPM, 1.60 at 60 and 3.20 at 120: 16 bytes per scheduled step, which is V8
    // boxing the step's time as it is handed to the listener. No object, array or closure: the smallest of those
    // once a tick would read 16 or more. The least of three rounds, because a collection already due can hit one.
    expect(Math.min(bytesPerRound(tickAll), bytesPerRound(tickAll), bytesPerRound(tickAll))).toBeLessThan(4);
    expect(kept).toEqual({ i: ROUNDS - 1 });
  });

  it('the per-frame calls make no object: setListenerPose, and syncPlants when nothing changed', async () => {
    const { ctx, engine } = await start();
    const plants = sixteenPlucks();
    engine.syncPlants(plants, BED);
    const frameAll = (): void => {
      for (let i = 0; i < ROUNDS; i++) {
        engine.setListenerPose(HEAD);
        engine.syncPlants(plants, BED);
      }
    };
    frameAll(); // warm up
    expect(Math.min(bytesPerRound(frameAll), bytesPerRound(frameAll), bytesPerRound(frameAll))).toBeLessThan(
      1,
    );
    expect(ctx.listener.positionY.value).toBe(1.2);
    expect(ctx.strings).toBe(RINGS); // and nothing was rendered again
  });
});

describe('syncPlants: diff-based and idempotent (API_SPEC §1.2)', () => {
  it('the same plants again change nothing: no string is rendered twice', async () => {
    const { ctx, engine } = await start();
    const plants = [plant('a', 'pluck', 0, 0), plant('b', 'pluck', 1, 4, { hue: 0.9 })];
    engine.syncPlants(plants, BED);
    engine.syncPlants(plants, BED);
    engine.syncPlants([...plants], BED); // a new array holding the same plant objects
    expect(ctx.strings).toBe(2);
  });

  it('an added plant sounds from its next step; the others are left alone', async () => {
    const { ctx, engine, run } = await start();
    const a = plant('a', 'pluck', 0, 0);
    engine.syncPlants([a], BED);
    run(BAR_S / 2);
    engine.syncPlants([a, plant('b', 'pluck', 1, 12)], BED);
    run(BAR_S / 2);
    expect(starts(ctx)).toEqual([stepTime(0), stepTime(12), stepTime(16)]);
    expect(ctx.strings).toBe(2); // one for a, one for b: a was not rendered again
  });

  it('a removed plant plays no more, and what it was sounding is faded out', async () => {
    const { ctx, engine, run } = await start();
    const a = plant('a', 'pluck', 0, 0);
    const b = plant('b', 'pluck', 1, 2);
    engine.syncPlants([a, b], BED);
    run(STEP_S); // a has sounded, b is scheduled for step 2 or about to be
    const [envA] = ctx.of('bufferSource').map((n) => n.outputs[0] as FakeNode);
    engine.syncPlants([b], BED);
    expect(envA?.gain.last('hold')).toMatchObject({ time: ctx.currentTime });
    expect(envA?.gain.last('target')).toMatchObject({ value: 0, time: ctx.currentTime });
    run(2 * BAR_S);
    expect(starts(ctx)).toEqual([stepTime(0), stepTime(2), stepTime(18)]); // b only, once a bar
  });

  it('a changed plant (a new object with the same id) is re-tuned: new step, new pitch, new level', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants([plant('a', 'bell', 0, 0)], BED);
    run(STEP_S * 2);
    engine.syncPlants([plant('a', 'bell', 4, 8, { height: 0.5 })], BED);
    run(BAR_S);
    const carriers = ctx.of('oscillator').filter((_, i) => i % 2 === 0);
    expect(carriers.map((c) => c.startedAt)).toEqual([stepTime(0), stepTime(8)]);
    expect(carriers.map((c) => c.frequency.value)).toEqual([
      expect.closeTo(261.6256, 3), // ring 0 of C major pentatonic: C4
      expect.closeTo(440, 3), // ring 4: A4
    ]);
    const peaks = carriers.map((c) => (c.outputs[0] as FakeNode).gain.last('linear')?.value);
    expect(peaks[0]).toBeCloseTo(dbToGain(MIX_DB.bell), 9); // full height: the voice mix alone
    expect(peaks[1]).toBeCloseTo(dbToGain(MIX_DB.bell - 12), 9); // height 0.5 = −12 dB
  });

  it('plants synced before init() are kept and sound once the context exists', async () => {
    const { ctx, run } = await start((engine) => engine.syncPlants([plant('a', 'pluck', 0, 1)], BED));
    run(BAR_S);
    expect(starts(ctx)).toEqual([stepTime(1)]);
  });

  it('a plant whose cell is not on the bed is left out; the rest play and nothing throws', async () => {
    const { ctx, engine, run } = await start();
    const bad = [plant('x', 'pluck', 7, 0), plant('y', 'pluck', 0, 16), plant('z', 'pluck', 0.5, 3)];
    expect(() => engine.syncPlants([...bad, plant('a', 'pluck', 0, 1)], BED)).not.toThrow();
    run(BAR_S);
    expect(starts(ctx)).toEqual([stepTime(1)]);
  });

  it('a plant whose voice is not a voice is left out too; the plant beside it on the same step still plays', async () => {
    const { ctx, engine, run } = await start();
    const odd = [plant('x', 'kazoo' as VoiceType, 2, 1), plant('y', 'toString' as VoiceType, 3, 1)];
    expect(() => engine.syncPlants([...odd, plant('a', 'pluck', 0, 1)], BED)).not.toThrow();
    expect(() => run(BAR_S)).not.toThrow(); // a NaN pitch would throw in the tick, once a bar, for ever
    expect(starts(ctx)).toEqual([stepTime(1)]);
    expect(ctx.count('oscillator')).toBe(0);
  });

  it('pad and pluck have their own voices; a voice with no synth yet rings as a bell at its own octave', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants(
      [plant('pad', 'pad', 0, 0), plant('pluck', 'pluck', 0, 4), plant('bass', 'bass', 0, 8)],
      BED,
    );
    run(12 * STEP_S);
    const oscs = ctx.of('oscillator');
    expect(oscs.map((o) => o.type)).toEqual(['sawtooth', 'sawtooth', 'sawtooth', 'sine', 'sine']);
    expect(oscs[0]?.frequency.value).toBeCloseTo(130.8128, 3); // pad: C3
    expect(oscs[3]?.frequency.value).toBeCloseTo(65.4064, 3); // bass: C2
    expect(ctx.count('bufferSource')).toBe(1);
  });
});

describe('setSignature: re-tune in place (FR-ROOM-13)', () => {
  it('starts in C major pentatonic, the Wanderer tuning, and moves every plant to the new key and mode', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants([plant('a', 'bell', 0, 2), plant('b', 'bell', 2, 6)], BED);
    run(8 * STEP_S); // steps 2 and 6 of the first bar
    engine.setSignature(HALL);
    run(BAR_S); // steps 2 and 6 of the second
    const hz = ctx
      .of('oscillator')
      .filter((_, i) => i % 2 === 0)
      .map((c) => c.frequency.value);
    expect(hz).toEqual([
      expect.closeTo(261.6256, 3), // C4
      expect.closeTo(329.6276, 3), // E4
      expect.closeTo(220, 3), // A3: ring 0 of A sus pentatonic
      expect.closeTo(293.6648, 3), // D4: ring 2
    ]);
  });

  it('notes of the old key are faded out, and the same key again changes nothing', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants([plant('a', 'pluck', 0, 0)], BED);
    run(STEP_S);
    const env = ctx.of('bufferSource')[0]?.outputs[0] as FakeNode;
    engine.setSignature({ ...WANDERER });
    expect(env.gain.last('hold')).toBeUndefined();
    expect(ctx.strings).toBe(1);
    engine.setSignature(HALL);
    expect(env.gain.last('hold')).toMatchObject({ time: ctx.currentTime });
    expect(ctx.strings).toBe(2); // the string of the new key, rendered here and not in the tick
  });

  it('a signature with a mode or key that is not valid is ignored: the garden keeps its tuning', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants([plant('a', 'bell', 0, 0)], BED);
    engine.setSignature({ ...WANDERER, mode: 'dorianHex' as RoomSignature['mode'] });
    engine.setSignature({ ...WANDERER, keyRoot: Number.NaN as RoomSignature['keyRoot'] });
    run(STEP_S);
    expect(ctx.of('oscillator')[0]?.frequency.value).toBeCloseTo(261.6256, 3);
  });
});

describe('pan: a plant sounds at its world position (FR-MUS-06, TC-AUD-05)', () => {
  /** Right minus left in dB for a source seen from a level head looking down −z: the Web Audio equal-power law. */
  const panDb = (source: FakeNode, head: readonly number[]): number => {
    const panner = pannerOf(source);
    const dx = (panner.positionX.last('set')?.value as number) - (head[12] as number);
    const dz = (panner.positionZ.last('set')?.value as number) - (head[14] as number);
    const azimuth = (Math.atan2(dx, -dz) * 180) / Math.PI; // 0 = straight ahead, + = to the right
    const x = (Math.max(-90, Math.min(90, azimuth)) + 90) / 180;
    return 20 * Math.log10(Math.tan((x * Math.PI) / 2));
  };

  it('a plant on the right of the bed is to the right of the head, one on the left to the left, by 3 dB or more', async () => {
    const { ctx, engine, run } = await start();
    engine.setListenerPose(HEAD);
    // Outer ring: step 0 is at bed-local +x, the user's right; step 8 is on the left; step 4 is nearest the user.
    engine.syncPlants(
      [plant('right', 'pluck', 4, 0), plant('near', 'pluck', 4, 4), plant('left', 'pluck', 4, 8)],
      BED,
    );
    run(12 * STEP_S);
    const [right, near, left] = ctx.of('bufferSource') as [FakeNode, FakeNode, FakeNode];
    const panner = pannerOf(right);
    expect(panner.kind).toBe('panner');
    expect(panner.positionX.last('set')?.value).toBeCloseTo(0.3, 9);
    expect(panner.positionX.last('set')?.time).toBe(stepTime(0)); // moved when the note starts
    expect(panner.positionY.last('set')?.value).toBe(0.74);
    expect(panner.positionZ.last('set')?.value).toBeCloseTo(-0.45, 9);
    expect(panDb(right, HEAD)).toBeCloseTo(5.4, 1); // about 34° off centre (TEST_PLAN TC-AUD-05: computed)
    expect(panDb(right, HEAD)).toBeGreaterThanOrEqual(3);
    expect(panDb(left, HEAD)).toBeLessThanOrEqual(-3);
    expect(panDb(near, HEAD)).toBeCloseTo(0, 6);
    expect(pannerOf(near).positionZ.last('set')?.value).toBeCloseTo(-0.15, 9); // 0.30 m nearer than the centre
  });

  it('a new bed pose moves every plant, with the same plants', async () => {
    const { ctx, engine, run } = await start();
    const plants = [plant('a', 'pluck', 4, 0)];
    engine.syncPlants(plants, BED);
    run(12 * STEP_S);
    const turned = [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0.9, -0.45, 1]; // yawed 90° and moved 1 m to the right
    engine.syncPlants(plants, turned);
    run(BAR_S);
    const second = ctx.of('bufferSource')[1] as FakeNode;
    expect(pannerOf(second).positionX.last('set')?.value).toBeCloseTo(1, 9);
    expect(pannerOf(second).positionY.last('set')?.value).toBe(0.9);
    expect(pannerOf(second).positionZ.last('set')?.value).toBeCloseTo(-0.75, 9);
  });

  it('a bed pose with a value that is not finite is ignored: the plants keep their place', async () => {
    const { ctx, engine, run } = await start();
    const plants = [plant('a', 'pluck', 4, 0)];
    engine.syncPlants(plants, BED);
    engine.syncPlants(plants, [...BED.slice(0, 12), Number.NaN, 0, 0, 1]);
    run(BAR_S);
    expect(pannerOf(ctx.of('bufferSource')[0] as FakeNode).positionX.last('set')?.value).toBeCloseTo(0.3, 9);
  });

  it('setListenerPose puts the listener at the head', async () => {
    const { ctx, engine } = await start();
    engine.setListenerPose(HEAD);
    expect(ctx.listener.positionY.value).toBe(1.2);
    expect(ctx.listener.forwardZ.value).toBe(-1);
  });
});

describe('volume and reverb', () => {
  it('setVolume glides the master gain, clamped to 0..1; a value set before init() is used at init()', async () => {
    const { ctx, engine } = await start((e) => e.setVolume(0.3));
    const { master } = graph(ctx);
    expect(master.gain.value).toBe(0.3);
    engine.setVolume(0.5);
    expect(master.gain.last('target')).toMatchObject({ value: 0.5, time: 0, tau: PARAM_SMOOTH_S });
    engine.setVolume(7);
    expect(master.gain.last('target')?.value).toBe(1);
    engine.setVolume(-2);
    expect(master.gain.last('target')?.value).toBe(0);
    const events = master.gain.events.length;
    engine.setVolume(Number.NaN);
    expect(master.gain.events).toHaveLength(events);
  });

  it("the one reverb follows the signature's decay while 'auto': one RT60 long, stereo, never above 2.0 s", async () => {
    const { ctx, engine, run } = await start();
    const { convolver, wet } = graph(ctx);
    // No signature yet: the default 0.9 s, the Wanderer's, so the first notes are not dry.
    expect(convolver.buffer).toMatchObject({ numberOfChannels: 2, length: Math.floor(48000 * 0.9) });
    expect(convolver.buffer?.getChannelData(1).some((v) => v !== 0)).toBe(true);
    engine.setSignature(WANDERER); // the same decay: nothing is rendered again
    expect(ctx.buffers).toHaveLength(1);

    engine.setSignature({ ...WANDERER, reverbRt60: 5 });
    // A change is a swap: the return is muted first, and the new impulse response goes in a little later.
    expect(wet.gain.last('target')).toMatchObject({ value: 0 });
    expect(convolver.buffer?.length).toBe(Math.floor(48000 * 0.9));
    run(REVERB_SWAP_DELAY_S + TICK_S);
    expect(convolver.buffer?.length).toBe(48000 * REVERB_IR_MAX_S);
    expect(wet.gain.last('target')).toMatchObject({ value: WET_RETURN });
    expect(ctx.count('convolver')).toBe(1);
  });

  it("setReverb: 'small' is a fixed 0.6 s, 'off' mutes the send, 'auto' goes back to the signature", async () => {
    const { ctx, engine, run } = await start((e) => e.setSignature(HALL));
    const { convolver, send } = graph(ctx);
    expect(send.gain.value).toBe(REVERB_SEND);
    expect(convolver.buffer?.length).toBe(48000 * 2);

    engine.setReverb('small');
    run(REVERB_SWAP_DELAY_S + TICK_S);
    expect(REVERB_SMALL_RT60_S).toBe(0.6);
    expect(convolver.buffer?.length).toBe(Math.floor(48000 * 0.6));

    engine.setReverb('off');
    expect(send.gain.last('target')).toMatchObject({ value: 0 });
    const made = ctx.buffers.length;
    engine.setSignature({ ...HALL, reverbRt60: 1.2 }); // nothing is rendered for a reverb that is off
    expect(ctx.buffers).toHaveLength(made);

    engine.setReverb('auto');
    expect(send.gain.last('target')).toMatchObject({ value: REVERB_SEND });
    run(REVERB_SWAP_DELAY_S + TICK_S);
    expect(convolver.buffer?.length).toBe(Math.floor(48000 * 1.2));
  });

  it('a decay that is not above 0 is ignored: the reverb keeps the one it has', async () => {
    const { ctx, engine, run } = await start((e) => e.setSignature(WANDERER));
    const { convolver } = graph(ctx);
    engine.setSignature({ ...WANDERER, reverbRt60: Number.NaN });
    engine.setSignature({ ...WANDERER, reverbRt60: 0 });
    run(REVERB_SWAP_DELAY_S + TICK_S);
    expect(convolver.buffer?.length).toBe(Math.floor(48000 * 0.9));
    expect(ctx.buffers).toHaveLength(1);
  });
});

describe('the AudioContext (NFR-PERF-10, FR-SYS-05)', () => {
  it('init() with no argument creates the context and resumes it before it returns: inside the Enter gesture', async () => {
    const ctx = new FakeAudioContext();
    ctx.state = 'suspended';
    let created = 0;
    vi.stubGlobal('AudioContext', function AudioContext() {
      created++;
      return ctx;
    });
    const engine = new Engine();
    const done = engine.init();
    // Still in the same call stack as the click: nothing was awaited before these two.
    expect(created).toBe(1);
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    await done;
    expect(ctx.count('panner')).toBe(VOICE_CAP);
  });

  it('init() with a running context does not resume it; with a suspended one it does', async () => {
    const running = await start();
    expect(running.ctx.resume).not.toHaveBeenCalled();
    const suspended = new FakeAudioContext();
    suspended.state = 'suspended';
    await start(undefined, suspended);
    expect(suspended.resume).toHaveBeenCalledTimes(1);
  });

  it('init() rejects when the context cannot be created, and the engine stays safe to call', async () => {
    vi.stubGlobal('AudioContext', function AudioContext() {
      throw new Error('no audio device');
    });
    const engine = new Engine();
    await expect(engine.init()).rejects.toThrow('no audio device');
    expect(() => {
      engine.syncPlants([plant('a', 'bell', 0, 0)], BED);
      engine.setSignature(WANDERER);
      engine.setListenerPose(HEAD);
      engine.setReverb('small');
      engine.tick();
      engine.triggerStep(0, 0);
    }).not.toThrow();
    await expect(engine.suspend()).resolves.toBeUndefined();
    await expect(engine.resume()).resolves.toBeUndefined();
    expect(engine.stats.voices).toBe(0);
  });

  it('suspend() fades the master out, then stops the context and the tick; nothing is scheduled meanwhile', async () => {
    const { ctx, engine, run } = await start((e) => e.setVolume(0.8));
    engine.syncPlants(sixteenPlucks(), BED);
    run(1);
    const { master } = graph(ctx);
    const asked = ctx.currentTime;
    let resolved = false;
    const done = engine.suspend().then(() => {
      resolved = true;
    });
    expect(SUSPEND_FADE_S).toBeLessThanOrEqual(0.3); // FR-SYS-05: within 300 ms
    expect(master.gain.last('target')).toMatchObject({ value: 0, time: asked });
    expect(ctx.suspend).not.toHaveBeenCalled();

    run(SUSPEND_FADE_S - TICK_S); // the fade is still running: the context must not stop under it
    expect(ctx.suspend).not.toHaveBeenCalled();
    expect(resolved).toBe(false);
    run(2 * TICK_S);
    await done;
    expect(resolved).toBe(true);
    expect(ctx.suspend).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    const scheduled = starts(ctx).length;
    run(1);
    expect(starts(ctx)).toHaveLength(scheduled);
  });

  it('resume() restarts the context, fades back to the volume, and the tide carries on from the same audio time', async () => {
    const { ctx, engine, run } = await start((e) => e.setVolume(0.8));
    engine.syncPlants(sixteenPlucks(), BED);
    run(1);
    const done = engine.suspend();
    run(SUSPEND_FADE_S + TICK_S);
    await done;
    const { master } = graph(ctx);
    const frozen = ctx.currentTime; // a suspended context's clock stands still
    const before = starts(ctx).length;

    await engine.resume();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(master.gain.last('target')).toMatchObject({ value: 0.8, time: frozen, tau: PARAM_SMOOTH_S });
    expect(vi.getTimerCount()).toBe(1);
    run(1);
    const times = starts(ctx);
    expect(times.length).toBeGreaterThan(before);
    times.forEach((t, i) => expect(t).toBeCloseTo(stepTime(i), 9)); // no step lost, none doubled
  });

  it('resume() during the fade cancels the suspend; a second suspend() while one is pending is the same one', async () => {
    const { ctx, engine, run } = await start();
    const first = engine.suspend();
    expect(engine.suspend()).toBe(first);
    await engine.resume();
    await first;
    run(1);
    expect(ctx.suspend).not.toHaveBeenCalled();
    expect(graph(ctx).master.gain.last('target')).toMatchObject({ value: 1 });
    expect(vi.getTimerCount()).toBe(1);
  });

  it('suspend() rejects when the context refuses, so the caller can report it', async () => {
    const { ctx, engine, run } = await start();
    ctx.suspend.mockImplementationOnce(() => Promise.reject(new Error('closed')));
    const done = engine.suspend();
    run(SUSPEND_FADE_S + TICK_S);
    await expect(done).rejects.toThrow('closed');
  });

  it('suspend() on a context that never started (autoplay blocked) stops the tick at once: no fade to wait for', async () => {
    const blocked = new FakeAudioContext();
    blocked.state = 'suspended';
    blocked.resume.mockImplementation(() => Promise.resolve()); // allowed to ask, but the context stays suspended
    const { engine } = await start(undefined, blocked);
    expect(vi.getTimerCount()).toBe(1);
    await engine.suspend(); // its clock stands still: waiting for the end of a fade would never end
    expect(vi.getTimerCount()).toBe(0);
    expect(blocked.suspend).not.toHaveBeenCalled();
  });

  it('suspend() while a resume() is still waiting for the browser wins: the context ends suspended', async () => {
    const { ctx, engine, run } = await start();
    const suspended = engine.suspend();
    run(SUSPEND_FADE_S + TICK_S);
    await suspended;
    let browserStarts: () => void = () => undefined;
    ctx.resume.mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          browserStarts = () => {
            ctx.state = 'running';
            done();
          };
        }),
    );

    const resuming = engine.resume(); // the page is visible again, the browser has not started the context yet
    await engine.suspend(); // hidden again at once: nothing to fade, the context is not running
    browserStarts();
    await resuming;

    expect(ctx.suspend).toHaveBeenCalledTimes(2); // not left running with no tick, playing leftover tails
    expect(ctx.state).toBe('suspended');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('init() on an OfflineAudioContext (a render test) builds the graph, resumes nothing and starts no tick', async () => {
    const offline = new FakeAudioContext();
    offline.state = 'suspended'; // as before startRendering(): a real one rejects resume() here
    Object.defineProperty(offline, 'startRendering', { value: () => Promise.resolve() });
    const engine = new Engine();
    engine.setTempo(BPM);
    engine.syncPlants([plant('a', 'pluck', 0, 0)], BED);
    await engine.init(offline.audio);
    expect(offline.resume).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(offline.count('panner')).toBe(VOICE_CAP);
    engine.tick(); // the test drives the scheduler on the offline clock
    expect(starts(offline)).toEqual([stepTime(0)]);
  });
});

describe('what later tasks fill in', () => {
  it('chordTone, preview, ui and Listen mode are silent and safe to call until then', async () => {
    const { ctx, engine } = await start();
    const api: AudioEngine = engine; // the contract's signatures (API_SPEC §1.2)
    const fixed = ctx.nodes.length;
    expect(() => {
      api.chordTone(0, 1);
      api.preview(plant('a', 'bell', 0, 0));
      api.ui('tick');
      api.enterListen();
      api.exitListen();
    }).not.toThrow();
    expect(ctx.nodes).toHaveLength(fixed);
  });
});
