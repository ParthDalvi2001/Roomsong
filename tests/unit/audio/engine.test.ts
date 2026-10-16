// The engine on a fake AudioContext and a fake clock (TEST_PLAN TC-AUD-02, TC-AUD-04, TC-AUD-05, TC-PERF-09):
// scheduling inside the look-ahead window, no double scheduling, `syncPlants` diffing, the voice cap, the graph
// shape, the limiter chain, pan side and the context life cycle. Node has no Web Audio, so nothing is rendered
// here: level and pan are checked on the graph and by the laws the nodes follow.
import { GCProfiler } from 'node:v8';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Engine, type AudioEngine } from '../../../src/audio/AudioEngine.js';
import {
  CEILING_DBFS,
  CENTS_PER_OCTAVE,
  IR_SAMPLES_PER_TICK,
  LATE_DROP_S,
  LOOK_AHEAD_S,
  MIX_DB,
  MUTE_TAU_S,
  PARAM_SMOOTH_S,
  PLUCK_DAMPING_BUCKETS,
  PLUCK_STRINGS_PER_TICK,
  REVERB_IR_MAX_S,
  REVERB_SEND,
  REVERB_SMALL_RT60_S,
  REVERB_SWAP_DELAY_S,
  START_DELAY_S,
  STEAL_FADE_S,
  SUSPEND_FADE_S,
  TICK_MS,
  VOICE_CAP,
  WET_RETURN,
} from '../../../src/audio/config.js';
import { renderKarplusStrong } from '../../../src/audio/karplus.js';
import { dbToGain, hueToDetuneCents } from '../../../src/audio/mapping.js';
import { Scheduler } from '../../../src/audio/Scheduler.js';
import { hzForRing } from '../../../src/audio/theory.js';
import { VoicePool } from '../../../src/audio/VoicePool.js';
import { REVERB_RT60_MAX_S, RINGS, STEPS, WANDERER } from '../../../src/garden/index.js';

import { FakeAudioContext, last, type FakeBuffer, type FakeNode, type FakeParam } from './fakeAudio.js';

import type { Plant, RoomSignature, VoiceType } from '../../../src/garden/index.js';

// The string renderer is watched, not replaced: a test can then ask at which pitch a buffer was rendered.
vi.mock('../../../src/audio/karplus.js', { spy: true });

const BPM = 84;
const STEP_S = Scheduler.stepDurationFor(BPM);
const BAR_S = STEPS * STEP_S;
const TICK_S = TICK_MS / 1000;
/** Column-major. The bed centre 0.45 m ahead of the origin on a 0.74 m desk; +x = the user's right (D-029). */
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];
/** A level head at 1.20 m over the origin, looking down −z at the bed. */
const HEAD = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.2, 0, 1];
/** The same head turned 90° to its left. */
const TURNED = [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1.2, 0, 1];
const HALL: RoomSignature = {
  ...WANDERER,
  keyRoot: -3,
  mode: 'susPent',
  reverbRt60: 2.0,
  reverbSize: 'large',
};
const DEN: RoomSignature = {
  ...WANDERER,
  keyRoot: 4,
  mode: 'minorPent',
  reverbRt60: 0.3,
  reverbSize: 'small',
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
/** 80 plucks, every ring in each of the four damping steps: the 20 strings a key can need (LLD §7). */
const pluckBed = (): Plant[] => {
  const bed: Plant[] = [];
  for (let ring = 0; ring < RINGS; ring++) {
    for (let step = 0; step < STEPS; step++) {
      const hue = ((step % PLUCK_DAMPING_BUCKETS) + 0.5) / PLUCK_DAMPING_BUCKETS;
      bed.push(plant(`${ring}-${step}`, 'pluck', ring, step, { hue }));
    }
  }
  return bed;
};
const KEY_STRINGS = RINGS * PLUCK_DAMPING_BUCKETS;
/** All 80 cells, five rings and five voices: every step plays one note of each. */
const fiveVoiceBed = (): Plant[] => {
  const voices: VoiceType[] = ['bell', 'pad', 'pluck', 'bass', 'choir'];
  const bed: Plant[] = [];
  for (let ring = 0; ring < RINGS; ring++) {
    for (let step = 0; step < STEPS; step++) {
      bed.push(plant(`${ring}-${step}`, voices[(ring + step) % 5] as VoiceType, ring, step));
    }
  }
  return bed;
};
/** Audio time of absolute step `i` when the engine was started at time 0. */
const stepTime = (i: number): number => START_DELAY_S + i * STEP_S;
/** The step of the bar, 0..15, that sounds at audio time `time`. */
const stepAt = (time: number): number => Math.round((time - START_DELAY_S) / STEP_S) % STEPS;
const starts = (ctx: FakeAudioContext): number[] => ctx.of('bufferSource').map((n) => n.startedAt as number);
/** The pitch a pluck is heard at: the pitch its buffer was rendered at × the rate the source plays it at. */
const heardHz = (source: FakeNode): number => {
  const data = source.buffer?.getChannelData(0);
  const render = vi.mocked(renderKarplusStrong).mock.calls.find((call) => call[0] === data);
  return (render?.[2] as number) * source.playbackRate.value;
};
/** The pitch a pluck plant has in a key: its ring's note, moved by the few cents its hue detunes it (FR-MUS-05). */
const pluckHz = (p: Plant, key: RoomSignature): number =>
  hzForRing(key, p.cell.ring, 'pluck') * Math.pow(2, hueToDetuneCents(p.hue) / CENTS_PER_OCTAVE);
/** Sorted, and rounded to a millionth of a hertz: two lists of pitches compare whatever their order. */
const pitches = (hz: number[]): number[] => hz.map((v) => Math.round(v * 1e6) / 1e6).sort((a, b) => a - b);
/** The impulse responses made so far: the buffers of two channels (a string's buffer has one). */
const responses = (ctx: FakeAudioContext): FakeBuffer[] =>
  ctx.buffers.filter((b) => b.numberOfChannels === 2);
/** Samples of a buffer rendered so far. A response is filled from its start and its noise is never exactly 0. */
const filled = (buffer: FakeBuffer): number => {
  let samples = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    let end = data.length;
    while (end > 0 && data[end - 1] === 0) end--;
    samples += end;
  }
  return samples;
};
/** Notes built so far: a pluck is one buffer source, a pad one filter and three saws, a bell two sines. */
const notes = (ctx: FakeAudioContext): number =>
  ctx.count('bufferSource') + ctx.count('biquad') + (ctx.count('oscillator') - 3 * ctx.count('biquad')) / 2;
/** The fixed graph's own filters: the breathing low-pass and the tempo echo's low-pass (T-164). */
const FIXED_BIQUADS = 2;
/** The fixed graph, found by its connections. */
function graph(
  ctx: FakeAudioContext,
): Record<
  'shaper' | 'compressor' | 'breath' | 'master' | 'convolver' | 'send' | 'bus' | 'wet' | 'echo',
  FakeNode
> {
  const shaper = ctx.destination.inputs[0] as FakeNode;
  const compressor = shaper.inputs[0] as FakeNode;
  const breath = compressor.inputs[0] as FakeNode;
  const convolver = ctx.of('convolver')[0] as FakeNode;
  const send = convolver.inputs[0] as FakeNode;
  const bus = send.inputs[0] as FakeNode;
  return {
    shaper,
    compressor,
    breath,
    master: breath.inputs[0] as FakeNode,
    convolver,
    send,
    bus,
    wet: convolver.outputs[0] as FakeNode,
    echo: bus.outputs[1] as FakeNode,
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
  vi.mocked(renderKarplusStrong).mockClear(); // its record holds every string a test rendered
});

describe('graph shape (NFR-PERF-10, TC-PERF-09)', () => {
  it('init() builds 24 equal-power panners, 0 HRTF, exactly 1 convolver and one limiter stage', async () => {
    const { ctx } = await start();
    expect(ctx.count('panner')).toBe(VOICE_CAP);
    expect(ctx.of('panner').filter((p) => p.panningModel !== 'equalpower')).toEqual([]);
    expect(ctx.count('convolver')).toBe(1);
    expect(ctx.count('compressor')).toBe(1);
    expect(ctx.count('waveShaper')).toBe(1);
    expect(ctx.count('delay')).toBe(1); // the tempo echo (T-164)
    expect(ctx.count('oscillator') + ctx.count('bufferSource')).toBe(0);
    expect(ctx.count('biquad')).toBe(FIXED_BIQUADS);
  });

  it('everything reaches the output through the compressor and then the −1 dBFS ceiling: no way round it', async () => {
    const { ctx } = await start();
    const g = graph(ctx);
    expect(ctx.destination.inputs).toEqual([g.shaper]);
    expect(g.shaper.kind).toBe('waveShaper');
    expect(g.shaper.inputs).toEqual([g.compressor]);
    expect(g.compressor.kind).toBe('compressor');
    // The breathing filter (T-164) sits between the master gain and the compressor; today it is wide open.
    expect(g.compressor.inputs).toEqual([g.breath]);
    expect(g.breath).toMatchObject({ kind: 'biquad', type: 'lowpass' });
    expect(g.breath.frequency.value).toBe(ctx.sampleRate / 2);
    expect(g.breath.inputs).toEqual([g.master]);
    // A wave-shaper clamps its input to the ends of its curve, so the curve's maximum is the output's maximum.
    const peak = (g.shaper.curve as Float32Array).reduce((max, v) => Math.max(max, Math.abs(v)), 0);
    expect(peak).toBeLessThan(dbToGain(CEILING_DBFS));
    // The 24 panners, the reverb return and the echo return all feed the master gain.
    expect(g.master.inputs).toHaveLength(VOICE_CAP + 2);
    expect(g.master.inputs.filter((n) => n.kind === 'panner')).toHaveLength(VOICE_CAP);
    expect(g.master.inputs).toContain(g.wet);
    // The bus sums the 24 channels before their pan and feeds the reverb send and the echo send, which is shut today.
    expect(g.bus.inputs).toHaveLength(VOICE_CAP);
    expect(g.send.inputs).toEqual([g.bus]);
    expect(g.bus.outputs).toEqual([g.send, g.echo]);
    expect(g.echo.gain.value).toBe(0);
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

  it('a full bed of all five voices for 13 bars: voices never pass 24, stolen notes fade, every source gets a stop', async () => {
    const { ctx, engine, run } = await start();
    const fixed = ctx.nodes.length;
    engine.syncPlants(fiveVoiceBed(), BED);
    let most = 0;
    run(13 * BAR_S, () => {
      most = Math.max(most, engine.stats.voices);
    });

    // A note has one envelope and it feeds a channel input: count the notes there, whatever their voice.
    const envelopes = ctx.of('panner').flatMap((p) => (p.inputs[0] as FakeNode).inputs);
    expect(envelopes.length).toBeGreaterThanOrEqual(1000);
    expect(most).toBe(VOICE_CAP);
    expect(ctx.count('panner')).toBe(VOICE_CAP);
    expect(ctx.count('convolver')).toBe(1);
    expect(ctx.count('compressor')).toBe(1);
    expect(ctx.count('waveShaper')).toBe(1);
    expect(ctx.waves).toHaveLength(2); // the bass wave and the choir pulse: made in init(), never in the tick
    const perNote = new Set(ctx.nodes.slice(fixed).map((n) => n.kind));
    expect([...perNote].sort()).toEqual(['biquad', 'bufferSource', 'gain', 'oscillator']);
    expect(envelopes.filter((n) => n.gain.last('hold') !== undefined).length).toBeGreaterThan(100);
    // No source is left to run on: each has its stop time, its own end or the end of a steal fade.
    const sources = [...ctx.of('oscillator'), ...ctx.of('bufferSource')];
    expect(sources.filter((s) => s.stoppedAt === null)).toHaveLength(0);
  });

  it('the same bed: a panner moves only when nothing sounds through it, so a stolen channel never jumps under a tail', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants(fiveVoiceBed(), BED);
    run(13 * BAR_S);

    /** The sources a note is heard from: every node upstream of its envelope that was started. */
    const upstream = (node: FakeNode): FakeNode[] => node.inputs.flatMap((n) => [n, ...upstream(n)]);
    const moved: number[] = [];
    const underATail: string[] = [];
    for (const panner of ctx.of('panner')) {
      const sources = upstream(panner).filter((n) => n.startedAt !== null);
      for (const { time } of panner.positionX.events) {
        moved.push(time);
        for (const s of sources) {
          const sounding = (s.startedAt as number) < time && (s.stoppedAt as number) > time;
          if (sounding) underATail.push(`${s.kind} ${s.startedAt}–${s.stoppedAt} under a move at ${time}`);
        }
      }
    }
    expect(moved.length).toBeGreaterThan(1000);
    expect(underATail).toEqual([]);
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

  it('stats.triggers counts the notes started since init(): one per plant on each step reached, none skipped late', async () => {
    const { engine, run, stall } = await start();
    expect(engine.stats.triggers).toBe(0);
    engine.syncPlants([plant('a', 'pluck', 2, 3), plant('b', 'bell', 0, 3), plant('c', 'pad', 4, 9)], BED);
    run(2 * BAR_S);
    expect(engine.stats.triggers).toBe(6); // three plants, two bars
    stall(BAR_S); // a stalled main thread: the steps it finds long after their time are skipped
    run(TICK_S);
    expect(engine.stats.triggers).toBe(6);
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

  it('one pluck: two nodes per note (source and envelope); its string is rendered once, by the tick after the sync', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants([plant('a', 'pluck', 0, 0)], BED);
    expect(ctx.strings).toBe(0); // asked for: a sync renders nothing (T-143)
    const fixed = ctx.nodes.length;
    run(2 * BAR_S);
    expect(starts(ctx)).toHaveLength(3); // steps 0, 16 and 32
    expect(ctx.nodes.slice(fixed).map((n) => n.kind)).toEqual(Array(3).fill(['bufferSource', 'gain']).flat());
    expect(ctx.strings).toBe(1);
    // The tick renders before it schedules, so even the first note plays its own string, as it was rendered.
    expect(ctx.of('bufferSource').map((n) => n.playbackRate.value)).toEqual([1, 1, 1]);
  });

  const ROUNDS = 1_000_000;
  /**
   * Heap growth while `work` ran, in bytes per round; Infinity when it is unreadable: a garbage collection ran, or
   * the heap shrank (it was swept meanwhile), which would otherwise read as the least of three rounds.
   */
  const bytesPerRound = (work: () => void, rounds = ROUNDS): number => {
    const profiler = new GCProfiler();
    profiler.start();
    const before = process.memoryUsage().heapUsed;
    work();
    const grown = process.memoryUsage().heapUsed - before;
    return profiler.stop()?.statistics.length === 0 && grown >= 0 ? grown / rounds : Infinity;
  };
  // Two more tries: on a loaded machine a collection hit all three rounds and both tests read Infinity
  // (2026-10-12). A real allocation fails every try.
  const LOADED = { retry: 2 };

  it(
    'the tick makes no object of its own: a million ticks over an empty bed grow the heap by under 4 bytes a tick',
    LOADED,
    async () => {
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
      expect(Math.min(bytesPerRound(tickAll), bytesPerRound(tickAll), bytesPerRound(tickAll))).toBeLessThan(
        4,
      );
      expect(kept).toEqual({ i: ROUNDS - 1 });
    },
  );

  it(
    'with a style, every layer on (T-164), the tick still makes no object: 8 plants, a million ticks, under 16 bytes a tick',
    LOADED,
    async () => {
      // A note's nodes are the fake's objects, not the tick's: here the pool takes each note and builds nothing.
      // Not vi.spyOn: a mock keeps every call's arguments, which is what this probe would measure.
      const play = Object.getOwnPropertyDescriptor(VoicePool.prototype, 'play') as PropertyDescriptor;
      let played = 0;
      VoicePool.prototype.play = (): boolean => {
        played++;
        return true;
      };
      try {
        const { ctx, engine } = await start((e) => e.setStyle('A'));
        // The fake keeps each parameter event as an object: the breathing filter's glide, once a bar, is counted.
        const breath = graph(ctx).breath.frequency;
        let glides = 0;
        breath.setTargetAtTime = (): FakeParam => {
          glides++;
          return breath;
        };
        const voices: VoiceType[] = ['bell', 'pad', 'pluck', 'bass', 'choir', 'bell', 'pluck', 'pad'];
        engine.syncPlants(
          voices.map((v, i) => plant(`s${i}`, v, i % RINGS, 2 * i, { height: 0.55 })),
          BED,
        );
        const tickAll = (): void => {
          for (let i = 0; i < ROUNDS; i++) {
            ctx.currentTime += TICK_S;
            engine.tick();
          }
        };
        tickAll(); // warm up, and every layer is in
        const before = played;
        // Measured 6.2 bytes a tick with this test alone and 10.6 after the rest of the file (2026-10-16): the
        // groove, the echo and the breathing filter alone stay under 4, as today's sound does; the rest is V8
        // boxing the numbers each layer note hands the pool (its time and the bed centre), 16 bytes each, more of
        // them once this stubbed call is no longer inlined. Per note, as a plant note's time is. No object, array
        // or closure: the smallest of those once a tick reads 16 or more.
        expect(Math.min(bytesPerRound(tickAll), bytesPerRound(tickAll), bytesPerRound(tickAll))).toBeLessThan(
          16,
        );
        // Plant notes, drone, kick and shaker: about 19 notes a bar; one glide a bar.
        const bars = (3 * ROUNDS * TICK_S) / BAR_S;
        expect((played - before) / bars).toBeGreaterThan(16);
        expect(glides).toBeGreaterThan(bars);
      } finally {
        Object.defineProperty(VoicePool.prototype, 'play', play);
      }
    },
  );

  it(
    'the per-frame calls make no object: setListenerPose, and syncPlants when nothing changed',
    LOADED,
    async () => {
      const { ctx, engine } = await start();
      // The fake keeps each parameter event as an object; what is measured here is the engine's own allocation.
      let glides = 0;
      for (const p of Object.values(ctx.listener)) {
        p.setTargetAtTime = (): FakeParam => {
          glides++;
          return p;
        };
      }
      const plants = sixteenPlucks();
      engine.syncPlants(plants, BED);
      for (let i = 0; i < RINGS; i++) engine.tick(); // more than enough ticks to render their five strings
      engine.setListenerPose(HEAD); // the first pose is set; every one after it glides
      const frameAll = (): void => {
        for (let i = 0; i < ROUNDS; i++) {
          ctx.currentTime += 0.014;
          engine.setListenerPose(i % 2 ? HEAD : TURNED);
          engine.syncPlants(plants, BED);
        }
      };
      frameAll(); // warm up
      expect(
        Math.min(bytesPerRound(frameAll), bytesPerRound(frameAll), bytesPerRound(frameAll)),
      ).toBeLessThan(1);
      expect(glides).toBe(4 * ROUNDS * 9); // nine glides a call: position, forward and up
      expect(ctx.strings).toBe(RINGS); // and nothing was rendered again
    },
  );

  it(
    'a tick that renders a slice of a response puts no sample on the heap: under 8 000 bytes for its 8 000 samples',
    LOADED,
    async () => {
      const { ctx, engine } = await start();
      const tick = (): void => {
        ctx.currentTime += TICK_S;
        engine.tick();
      };
      const SLICES = 20;
      /** A new response of 20 slices or more: the heap growth of 20 of its slices, in bytes a slice. */
      const slices = (reverbRt60: number): number => {
        engine.setSignature({ ...WANDERER, reverbRt60 });
        const bytes = bytesPerRound(() => {
          for (let i = 0; i < SLICES; i++) tick();
        }, SLICES);
        for (let i = 0; i < SLICES; i++) tick(); // the rest of it, and the swap
        return bytes;
      };
      slices(2.0); // warm up
      slices(1.6);
      // A number put on the heap for every sample reads as 128 000 bytes or more (measured 321 000 with the noise
      // generator as a closure, T-143 review), or as a collection. Measured without: 1 000 to 1 400 bytes a slice,
      // none of it growing with the samples. The same check for a string is in voices.test.ts, where no note plays.
      expect(Math.min(slices(2.0), slices(1.6), slices(2.0))).toBeLessThan(8000);
      expect(graph(ctx).convolver.buffer?.length).toBe(48000 * 2); // they were rendered, and the last one is in
    },
  );
});

describe('syncPlants: diff-based and idempotent (API_SPEC §1.2)', () => {
  it('the same plants again change nothing: no string is rendered twice', async () => {
    const { ctx, engine, run } = await start();
    const plants = [plant('a', 'pluck', 0, 0), plant('b', 'pluck', 1, 4, { hue: 0.9 })];
    engine.syncPlants(plants, BED);
    engine.syncPlants(plants, BED);
    engine.syncPlants([...plants], BED); // a new array holding the same plant objects
    run(1);
    engine.syncPlants([...plants], BED); // and once more, now that the strings are rendered
    run(1);
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

  it('pad, pluck, bass and choir have their own voices; shimmer has no synth yet and rings as a bell at its own octave', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants(
      [
        plant('pad', 'pad', 0, 0),
        plant('pluck', 'pluck', 0, 2),
        plant('bass', 'bass', 0, 4),
        plant('choir', 'choir', 0, 6),
        plant('shimmer', 'shimmer', 0, 8),
      ],
      BED,
    );
    run(12 * STEP_S);
    const oscs = ctx.of('oscillator');
    const hz = (type: string): number[] => oscs.filter((o) => o.type === type).map((o) => o.frequency.value);
    expect(hz('sawtooth')).toHaveLength(3); // the pad
    expect(hz('sawtooth')[0]).toBeCloseTo(130.8128, 3); // C3
    expect(ctx.count('bufferSource')).toBe(1); // the pluck
    // Bass and choir each play their own wave, in step order: C2, then C3.
    expect(hz('custom')).toHaveLength(2);
    expect(hz('custom')[0]).toBeCloseTo(65.4064, 3);
    expect(hz('custom')[1]).toBeCloseTo(130.8128, 3);
    // The pad's low-pass, the bass's, the choir's three formants; and the graph's breathing filter and echo low-pass.
    expect(ctx.count('biquad')).toBe(5 + FIXED_BIQUADS);
    // Sines: the choir's vibrato, then the shimmer's bell (carrier at C5 and its modulator).
    expect(hz('sine')).toHaveLength(3);
    expect(hz('sine')[1]).toBeCloseTo(523.2511, 3);
  });

  it('bass and choir play the note of their ring in the key and mode in force, at C2 and C3 (LLD §5.2)', async () => {
    const { ctx, engine, run } = await start((e) => e.setSignature(HALL)); // A sus pentatonic: A B D E G
    engine.syncPlants(
      Array.from({ length: 2 * RINGS }, (_, i) => plant(`p${i}`, i < RINGS ? 'bass' : 'choir', i % RINGS, i)),
      BED,
    );
    run(12 * STEP_S);
    const played = ctx
      .of('oscillator')
      .filter((o) => o.type === 'custom')
      .map((o) => o.frequency.value);
    const a1 = [55, 61.7354, 73.4162, 82.4069, 97.9989]; // A1 B1 D2 E2 G2
    expect(played).toHaveLength(2 * RINGS);
    a1.forEach((expected, ring) => {
      expect(played[ring]).toBeCloseTo(expected, 3);
      expect(played[RINGS + ring]).toBeCloseTo(2 * expected, 3);
    });
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
    expect(ctx.strings).toBe(1); // the string of the new key is asked for: the call renders nothing (T-143)
    run(TICK_S);
    expect(ctx.strings).toBe(2);
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

describe('a re-tune is spread over ticks, and the garden stays in tune meanwhile (LLD §7, NFR-PERF-05, T-143)', () => {
  /**
   * Every step with a pluck built since note `from` played each of its plants once, at the plant's pitch in `key`.
   * Returns those steps (0..15), in the order they sounded.
   */
  const expectInKey = (
    ctx: FakeAudioContext,
    from: number,
    plants: Plant[],
    key: RoomSignature,
  ): number[] => {
    const byTime = new Map<number, FakeNode[]>();
    for (const source of ctx.of('bufferSource').slice(from)) {
      const time = source.startedAt as number;
      byTime.set(time, [...(byTime.get(time) ?? []), source]);
    }
    for (const [time, sources] of byTime) {
      const onStep = plants.filter((p) => p.cell.step === stepAt(time));
      expect(pitches(sources.map(heardHz)), `step at ${time} s`).toEqual(
        pitches(onStep.map((p) => pluckHz(p, key))),
      );
    }
    return [...byTime.keys()].map(stepAt);
  };
  /** A note that plays another string than its own: its rate is more than the few cents a hue detunes it. */
  const isStandIn = (source: FakeNode): boolean => Math.abs(Math.log2(source.playbackRate.value)) > 0.01;

  it('the call renders nothing; each tick after it renders at most 2 strings or one slice of the response, never both', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants(pluckBed(), BED);
    run(1);
    expect(ctx.strings).toBe(KEY_STRINGS); // C major, rendered 2 a tick since the sync

    const made = ctx.buffers.length;
    engine.setSignature(HALL);
    const response = last(responses(ctx)); // made in the call, and still empty
    expect(response.length).toBe(48000 * 2);
    expect(filled(response)).toBe(0);
    expect(ctx.strings).toBe(KEY_STRINGS);
    // Every buffer is made in the call, empty: the response and the 20 strings of the new key. A tick makes none.
    expect(ctx.buffers).toHaveLength(made + 1 + KEY_STRINGS);

    const perTick: { strings: number; samples: number }[] = [];
    let strings = ctx.strings;
    let samples = 0;
    run(1, () => {
      perTick.push({ strings: ctx.strings - strings, samples: filled(response) - samples });
      strings = ctx.strings;
      samples = filled(response);
    });
    // The two sizes themselves: they were chosen by measurement (config.ts), and a larger one is a longer tick.
    expect(PLUCK_STRINGS_PER_TICK).toBe(2);
    expect(IR_SAMPLES_PER_TICK).toBe(8000);
    for (const tick of perTick) {
      expect(tick.strings).toBeLessThanOrEqual(PLUCK_STRINGS_PER_TICK);
      expect(tick.samples).toBeLessThanOrEqual(IR_SAMPLES_PER_TICK);
      expect(tick.strings === 0 || tick.samples === 0).toBe(true);
    }
    // All of it was done, the strings first: 10 ticks of strings, then 24 of the 2.0 s stereo response.
    expect(ctx.strings).toBe(2 * KEY_STRINGS);
    expect(filled(response)).toBe(2 * response.length);
    const work = perTick.map((t) => (t.strings > 0 ? 's' : t.samples > 0 ? 'r' : '-')).join('');
    const stringTicks = KEY_STRINGS / PLUCK_STRINGS_PER_TICK;
    const responseTicks = (2 * response.length) / IR_SAMPLES_PER_TICK;
    expect(work).toBe(('s'.repeat(stringTicks) + 'r'.repeat(responseTicks)).padEnd(perTick.length, '-'));
    expect(graph(ctx).convolver.buffer).toBe(response);
    expect(ctx.buffers).toHaveLength(made + 1 + KEY_STRINGS);
  });

  it('init() runs the string renderer once, to no buffer: its loop is compiled in the Enter gesture, not in a tick', async () => {
    const { ctx, engine, run } = await start();
    // The first string of a process is rendered by code that is not compiled yet: 4 to 5 ms in Node on a laptop,
    // against 0.3 ms for the next ones. A unit test cannot time that; it pins that the render happens here.
    expect(vi.mocked(renderKarplusStrong)).toHaveBeenCalledTimes(1);
    expect(ctx.strings).toBe(0);
    expect(ctx.buffers).toHaveLength(1); // the impulse response alone
    engine.syncPlants([plant('a', 'pluck', 0, 0)], BED);
    run(TICK_S);
    expect(vi.mocked(renderKarplusStrong)).toHaveBeenCalledTimes(2);
    expect(ctx.strings).toBe(1);
  });

  it('the tick renders before it schedules: a plant added between two ticks plays its own string on its first note', async () => {
    const { ctx, engine, run } = await start();
    const a = plant('a', 'pluck', 0, 0);
    engine.syncPlants([a], BED);
    // Up to the last tick before the one that schedules step 8: a's string is long rendered, and it has sounded.
    const before = Math.floor((stepTime(8) - LOOK_AHEAD_S) / TICK_S);
    run(before * TICK_S);
    engine.syncPlants([a, plant('b', 'pluck', 2, 8)], BED);
    run(TICK_S);
    const first = last(ctx.of('bufferSource'));
    expect(first.startedAt).toBe(stepTime(8));
    expect(first.buffer).toBe(last(ctx.buffers)); // b's string, rendered in this same tick
    expect(first.playbackRate.value).toBe(1); // and not a's string at another rate
  });

  it('from the call on every pluck is heard at its pitch in the new key, once a step; a string not rendered yet is stood in for by a ready one', async () => {
    const { ctx, engine, run } = await start();
    const bed = pluckBed();
    engine.syncPlants(bed, BED);
    run(BAR_S);
    const old = ctx.of('bufferSource');
    expect(expectInKey(ctx, 0, bed, WANDERER).length).toBeGreaterThanOrEqual(STEPS);

    const at = ctx.currentTime;
    engine.setSignature(HALL);
    run(BAR_S);
    // One step was inside the look-ahead at the call: its notes were dropped, and it is not played a second time.
    expect(expectInKey(ctx, old.length, bed, HALL).length).toBeGreaterThanOrEqual(STEPS - 1);

    // The first steps come before their strings: those notes play a ready string of the new key at another rate.
    const after = ctx.of('bufferSource').slice(old.length);
    const spread = (KEY_STRINGS / PLUCK_STRINGS_PER_TICK) * TICK_S;
    const standIns = after.filter(isStandIn);
    expect(standIns.length).toBeGreaterThan(0);
    for (const note of standIns) expect(note.startedAt).toBeLessThan(at + spread + LOOK_AHEAD_S);
    expect(ctx.strings).toBe(2 * KEY_STRINGS); // and no note rendered a string for itself

    // The old key ends without a click: a note that sounded is held and faded over the steal fade, and one that
    // was scheduled and had not started is dropped whole. A note that had already been stolen for a note of the
    // dropped step keeps the fade it had: it ends when that step would have begun, inside the look-ahead.
    for (const source of old) {
      const envelope = (source.outputs[0] as FakeNode).gain;
      expect(source.stoppedAt).toBeLessThan(at + LOOK_AHEAD_S);
      if ((source.startedAt as number) >= at) expect(envelope.value).toBe(0);
      else if (source.stoppedAt === at + STEAL_FADE_S) expect(envelope.last('hold')?.time).toBe(at);
    }
    expect(old.some((s) => (s.startedAt as number) >= at)).toBe(true); // there was a step inside the look-ahead
    expect(old.some((s) => s.stoppedAt === at + STEAL_FADE_S)).toBe(true); // and notes that were sounding
  });

  it('the same signature again does nothing: no note is faded, nothing is rendered and no parameter is touched', async () => {
    const { ctx, engine, run } = await start();
    engine.syncPlants(pluckBed(), BED);
    engine.setSignature(HALL);
    run(BAR_S);
    const state = (): number[] => [
      ctx.nodes.length,
      ctx.buffers.length,
      ctx.nodes.reduce((n, node) => n + node.gain.events.length, 0),
    ];
    const before = state();
    engine.setSignature({ ...HALL });
    expect(state()).toEqual(before);
    const response = graph(ctx).convolver.buffer;
    run(BAR_S);
    expect(ctx.strings).toBe(KEY_STRINGS); // C major was dropped before one of its strings was rendered
    expect(graph(ctx).convolver.buffer).toBe(response);
  });

  it('two signatures in a row: the second wins, and what the first still had to render is dropped', async () => {
    const { ctx, engine, run } = await start();
    const bed = pluckBed();
    engine.syncPlants(bed, BED);
    run(1);
    /** The pitch of every string rendered so far, in order. */
    const rendered = (): number[] => vi.mocked(renderKarplusStrong).mock.calls.map((call) => call[2]);
    const ringsOf = (key: RoomSignature): number[] =>
      pitches(Array.from({ length: RINGS }, (_, ring) => hzForRing(key, ring, 'pluck')));

    // The first is cut short in its strings: 6 of its 20 are rendered, its response not begun.
    engine.setSignature(HALL);
    const hallResponse = last(responses(ctx));
    run(3 * TICK_S);
    const strings = rendered().length;
    expect(ctx.strings).toBe(KEY_STRINGS + 3 * PLUCK_STRINGS_PER_TICK);
    const sources = ctx.count('bufferSource');
    engine.setSignature(DEN);
    run(BAR_S);
    expect(rendered().length - strings).toBe(KEY_STRINGS); // the 20 of the second key, not one more of the first
    expect(pitches([...new Set(rendered().slice(strings))])).toEqual(ringsOf(DEN));
    expect(filled(hallResponse)).toBe(0);
    expect(graph(ctx).convolver.buffer?.length).toBe(Math.floor(48000 * DEN.reverbRt60));
    expectInKey(ctx, sources, bed, DEN);

    // The next is cut short in its response: 2 of its 24 slices are rendered and it never reaches the convolver.
    engine.setSignature(HALL);
    const cut = last(responses(ctx));
    run((KEY_STRINGS / PLUCK_STRINGS_PER_TICK + 2) * TICK_S);
    expect(filled(cut)).toBe(2 * IR_SAMPLES_PER_TICK);
    engine.setSignature(WANDERER);
    run(BAR_S);
    expect(filled(cut)).toBe(2 * IR_SAMPLES_PER_TICK);
    expect(graph(ctx).convolver.buffer?.length).toBe(Math.floor(48000 * WANDERER.reverbRt60));
    expect(filled(graph(ctx).convolver.buffer as FakeBuffer)).toBe(
      2 * Math.floor(48000 * WANDERER.reverbRt60),
    );
  });

  it('plants added and removed while it is spread: the new one plays in the new key from its next step, the removed one never again', async () => {
    const { ctx, engine, run } = await start();
    const bed = pluckBed().filter((p) => p.cell.step !== 15); // step 15 is free
    engine.syncPlants(bed, BED);
    run(1);
    engine.setSignature(HALL);
    run(2 * TICK_S); // 4 of the 20 strings are rendered
    const sources = ctx.count('bufferSource');
    const changed = [...bed.filter((p) => p.id !== '0-0'), plant('new', 'pluck', 4, 15)];
    expect(() => engine.syncPlants(changed, BED)).not.toThrow();
    run(2 * BAR_S);

    // Step 0 plays its four other plants and step 15 its one new plant: expectInKey compares each step with `changed`.
    const heard = expectInKey(ctx, sources, changed, HALL);
    expect(heard.length).toBeGreaterThanOrEqual(2 * STEPS - 1);
    expect(heard).toContain(0);
    expect(heard).toContain(15);
    expect(ctx.strings).toBe(2 * KEY_STRINGS); // the new plant shares a string of its ring: none was added
  });

  it('before init() the last signature is the one the garden starts in: one response, made whole in init()', async () => {
    const bed = sixteenPlucks();
    const { ctx, run } = await start((engine) => {
      engine.syncPlants(bed, BED);
      engine.setSignature(HALL);
      engine.setSignature(DEN);
    });
    expect(responses(ctx)).toHaveLength(1);
    expect(graph(ctx).convolver.buffer?.length).toBe(Math.floor(48000 * DEN.reverbRt60));
    expect(filled(graph(ctx).convolver.buffer as FakeBuffer)).toBe(2 * Math.floor(48000 * DEN.reverbRt60));
    run(BAR_S);
    expect(expectInKey(ctx, 0, bed, DEN).length).toBeGreaterThanOrEqual(STEPS);
    expect(ctx.strings).toBe(RINGS);
  });

  it('while the context is suspended a re-tune waits: nothing is rendered until the tick runs again, then the garden plays the new key', async () => {
    const { ctx, engine, run } = await start();
    const bed = sixteenPlucks();
    engine.syncPlants(bed, BED);
    run(1);
    const suspended = engine.suspend();
    run(SUSPEND_FADE_S + TICK_S);
    await suspended;
    const sources = ctx.count('bufferSource');

    expect(() => engine.setSignature(HALL)).not.toThrow();
    expect(vi.getTimerCount()).toBe(0); // no tick: nothing can render
    expect(ctx.strings).toBe(RINGS);
    expect(filled(last(responses(ctx)))).toBe(0);

    await engine.resume();
    run(BAR_S);
    expect(ctx.strings).toBe(2 * RINGS);
    expect(expectInKey(ctx, sources, bed, HALL).length).toBeGreaterThanOrEqual(STEPS - 1);
    expect(graph(ctx).convolver.buffer?.length).toBe(48000 * 2);
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

  it('setListenerPose puts the listener at the head, then glides it after the head from the audio clock', async () => {
    const { ctx, engine } = await start();
    engine.setListenerPose(HEAD);
    expect(ctx.listener.positionY.value).toBe(1.2);
    expect(ctx.listener.forwardZ.value).toBe(-1);
    ctx.currentTime = 1;
    engine.setListenerPose(TURNED);
    expect(ctx.listener.forwardX.last('target')).toEqual({
      type: 'target',
      value: -1,
      time: 1,
      tau: PARAM_SMOOTH_S,
    });
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
    // The new response is rendered a slice a tick (T-143). Until it is whole the old one stays in, and open.
    const slices = (2 * 48000 * REVERB_IR_MAX_S) / IR_SAMPLES_PER_TICK;
    run((slices - 1) * TICK_S);
    expect(wet.gain.events).toEqual([]);
    expect(convolver.buffer?.length).toBe(Math.floor(48000 * 0.9));
    // The same mode again while it renders starts nothing over: the settings are re-applied on every change of one.
    engine.setReverb('auto');
    expect(ctx.buffers).toHaveLength(2);
    // Whole: a change is a swap. The return is muted first, and the new impulse response goes in a little later.
    run(TICK_S);
    expect(wet.gain.last('target')).toMatchObject({ value: 0, time: ctx.currentTime, tau: MUTE_TAU_S });
    expect(convolver.buffer?.length).toBe(Math.floor(48000 * 0.9));
    run(REVERB_SWAP_DELAY_S - TICK_S); // the mute has not faded yet: not before the swap delay is over
    expect(convolver.buffer?.length).toBe(Math.floor(48000 * 0.9));
    run(TICK_S);
    expect(convolver.buffer?.length).toBe(48000 * REVERB_IR_MAX_S);
    expect(filled(convolver.buffer as FakeBuffer)).toBe(2 * 48000 * REVERB_IR_MAX_S); // all of it, both channels
    expect(wet.gain.last('target')).toMatchObject({ value: WET_RETURN });
    run(1);
    expect(wet.gain.events).toHaveLength(2); // the mute and the opening, once each: a swap is done once
    expect(ctx.count('convolver')).toBe(1);
    // The decay itself was capped at garden's maximum, not only the buffer: 2.0 s is no change now.
    engine.setSignature({ ...WANDERER, reverbRt60: REVERB_RT60_MAX_S });
    expect(ctx.buffers).toHaveLength(2);
    // The longest decay a room can get fits the impulse-response budget (NFR-PERF-10): a longer one would be cut off.
    expect(REVERB_RT60_MAX_S).toBeLessThanOrEqual(REVERB_IR_MAX_S);
  });

  it("setReverb: 'small' is a fixed 0.6 s, 'off' mutes the send, 'auto' goes back to the signature", async () => {
    const { ctx, engine, run } = await start((e) => e.setSignature(HALL));
    const { convolver, send } = graph(ctx);
    expect(send.gain.value).toBe(REVERB_SEND);
    expect(convolver.buffer?.length).toBe(48000 * 2);

    engine.setReverb('small');
    run(1); // the slices of the render, then the swap
    expect(REVERB_SMALL_RT60_S).toBe(0.6);
    expect(convolver.buffer?.length).toBe(Math.floor(48000 * 0.6));

    engine.setReverb('off');
    expect(send.gain.last('target')).toMatchObject({ value: 0 });
    const made = ctx.buffers.length;
    engine.setSignature({ ...HALL, reverbRt60: 1.2 }); // nothing is rendered for a reverb that is off
    expect(ctx.buffers).toHaveLength(made);

    engine.setReverb('auto');
    expect(send.gain.last('target')).toMatchObject({ value: REVERB_SEND });
    run(1);
    expect(convolver.buffer?.length).toBe(Math.floor(48000 * 1.2));
  });

  it('a newer decay while a whole response waits for its swap: that response never goes in, and the return opens again', async () => {
    const { ctx, engine, run } = await start();
    const { convolver, wet } = graph(ctx);
    const held = convolver.buffer;
    engine.setSignature({ ...WANDERER, reverbRt60: 2.0 });
    run(((2 * 48000 * 2.0) / IR_SAMPLES_PER_TICK) * TICK_S); // whole: the return is muted and the swap waits
    run(TICK_S);
    engine.setReverb('small');
    // The response in the convolver is still the old one: the return opens on it again, at once.
    expect(wet.gain.last('target')).toMatchObject({ value: WET_RETURN, time: ctx.currentTime });
    run(REVERB_SWAP_DELAY_S + TICK_S); // past the time the outdated swap was due
    expect(convolver.buffer).toBe(held);
    run(1);
    expect(convolver.buffer?.length).toBe(Math.floor(48000 * REVERB_SMALL_RT60_S));
    // One swap in all, the small one's: muted for the 2.0 s one, opened again, muted, swapped and opened.
    expect(wet.gain.events.map((e) => e.value)).toEqual([0, WET_RETURN, 0, WET_RETURN]);
  });

  it('back to the decay the convolver holds before the other one is whole: nothing more is rendered, nothing is swapped', async () => {
    const { ctx, engine, run } = await start();
    const { convolver, wet } = graph(ctx);
    const held = convolver.buffer; // the default 0.9 s
    engine.setReverb('small');
    run(TICK_S);
    engine.setReverb('auto'); // a double tap in Settings
    expect(ctx.buffers).toHaveLength(2); // no third response: the one asked for is in the convolver
    run(1);
    expect(convolver.buffer).toBe(held);
    expect(wet.gain.events).toEqual([]); // no dropout
    expect(filled(last(responses(ctx)))).toBe(IR_SAMPLES_PER_TICK); // the small one was dropped where it stood
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
  it('preview, ui and Listen mode are silent and safe to call until then', async () => {
    const { ctx, engine } = await start();
    const api: AudioEngine = engine; // the contract's signatures (API_SPEC §1.2)
    const fixed = ctx.nodes.length;
    expect(() => {
      api.preview(plant('a', 'bell', 0, 0));
      api.ui('tick');
      api.enterListen();
      api.exitListen();
    }).not.toThrow();
    expect(ctx.nodes).toHaveLength(fixed);
  });
});
