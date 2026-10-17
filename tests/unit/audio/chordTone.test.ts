// The tuning ripple's chord tones (T-142b, LLD §5.8): AudioEngine.chordTone plays one note of the room chord on the
// audio clock, as a full-height plant of its voice in the style in force, through the shared voice pool; and the
// session's end drops a note still scheduled. On the fake AudioContext: nothing is rendered, the calls are read.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Engine } from '../../../src/audio/AudioEngine.js';
import { HEIGHT_RELEASE_S_MAX, MIX_DB, SUSPEND_FADE_S, TICK_MS } from '../../../src/audio/config.js';
import { dbToGain } from '../../../src/audio/mapping.js';
import { STYLES } from '../../../src/audio/styles.js';
import { hzForRing } from '../../../src/audio/theory.js';
import { WANDERER, type RoomSignature, type VoiceType } from '../../../src/garden/index.js';

import { FakeAudioContext } from './fakeAudio.js';
import { watchPool } from './uiRules.js';

/** Column-major: a bed 0.45 m ahead on a 0.74 m desk. */
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function start() {
  const ctx = new FakeAudioContext();
  const engine = new Engine();
  await engine.init(ctx.audio);
  engine.syncPlants([], BED);
  ctx.currentTime = 2;
  return { ctx, engine, played: watchPool(engine) };
}

const full = (voice: VoiceType, mixDb = MIX_DB) => ({
  gain: dbToGain(mixDb[voice]),
  release: HEIGHT_RELEASE_S_MAX,
  cutoffMul: 1,
  detune: 0,
});

describe('AudioEngine.chordTone (T-142b)', () => {
  it('0 the root on Pad, 1 the third on Bell, 2 the fifth on Pluck, each a full-height plant, at its time and place', async () => {
    const { engine, played } = await start();
    engine.chordTone(0, 2.3, { x: 0.1, y: 0.74, z: -0.5 });
    engine.chordTone(1, 3.5, { x: 0, y: 1.25, z: -2.25 });
    engine.chordTone(2, 4.7, { x: 0, y: 2.5, z: 0 });
    // The Wanderer tuning, C major: rings 0, 2 and 3.
    expect(played).toEqual([
      {
        voice: 'Pad',
        time: 2.3,
        p: { hz: hzForRing(WANDERER, 0, 'pad'), ...full('pad') },
        at: [0.1, 0.74, -0.5],
      },
      {
        voice: 'Bell',
        time: 3.5,
        p: { hz: hzForRing(WANDERER, 2, 'bell'), ...full('bell') },
        at: [0, 1.25, -2.25],
      },
      {
        voice: 'Pluck',
        time: 4.7,
        p: { hz: hzForRing(WANDERER, 3, 'pluck'), ...full('pluck') },
        at: [0, 2.5, 0],
      },
    ]);
  });

  it("a minor room's middle note is ring 1; with no place, or one that is not finite, the note rings at the bed", async () => {
    const { engine, played } = await start();
    const minor: RoomSignature = { ...WANDERER, keyRoot: 4, mode: 'minorPent' };
    engine.setSignature(minor);
    engine.chordTone(1, 3);
    engine.chordTone(1, 3, { x: Number.NaN, y: 1, z: 1 });
    expect(played.map((n) => [n.p.hz, n.at])).toEqual([
      [hzForRing(minor, 1, 'bell'), [0, 0.74, -0.45]],
      [hzForRing(minor, 1, 'bell'), [0, 0.74, -0.45]],
    ]);
  });

  it('a sound style in force sets each voice its own mix level (T-164)', async () => {
    const { engine, played } = await start();
    engine.setStyle('B');
    engine.chordTone(0, 3);
    engine.chordTone(2, 3);
    expect(played.map((n) => n.p.gain)).toEqual([
      full('pad', STYLES.B.mixDb).gain,
      full('pluck', STYLES.B.mixDb).gain,
    ]);
  });

  it('sounds nothing, and throws nothing, before init() or while the context is not running', async () => {
    expect(() => new Engine().chordTone(0, 1)).not.toThrow();
    const { ctx, engine, played } = await start();
    ctx.state = 'suspended';
    const made = ctx.nodes.length;
    engine.chordTone(0, 3);
    expect(played).toEqual([]);
    expect(ctx.nodes).toHaveLength(made);
  });

  it("the session's end drops a ripple note still scheduled: it never rings when the next session resumes", async () => {
    const { ctx, engine } = await start();
    const made = ctx.nodes.length;
    engine.chordTone(2, ctx.currentTime + 2.7);
    const pluck = ctx.nodes.slice(made).find((n) => n.kind === 'bufferSource')!;
    const done = engine.suspend();
    for (let n = Math.ceil((SUSPEND_FADE_S * 1000) / TICK_MS) + 1; n > 0; n--) {
      ctx.currentTime += TICK_MS / 1000;
      vi.advanceTimersByTime(TICK_MS);
    }
    await done;
    expect(ctx.suspend).toHaveBeenCalledTimes(1);
    expect(pluck.stoppedAt).toBeLessThanOrEqual(ctx.currentTime); // stopped before it started
    expect(engine.stats.voices).toBe(0);
  });
});
