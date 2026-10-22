// Stillness opens the garden, the sound (P-016, T-173): the reverb send glides STILL_SEND_MUL wider and back, the
// gazed plant's notes are STILL_GAZE_DB louder, once and only while it is gazed, and the bus wiring. On the fake
// AudioContext: nothing is rendered, the graph is read.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Engine } from '../../../src/audio/AudioEngine.js';
import { REVERB_SEND, STILL_GAZE_DB, STILL_RAMP_TAU_S, STILL_SEND_MUL, TICK_MS } from '../../../src/audio/config.js';
import * as audio from '../../../src/audio/index.js';
import { bus } from '../../../src/core/index.js';

import { FakeAudioContext } from './fakeAudio.js';
import { watchPool } from './uiRules.js';

import type { Plant } from '../../../src/garden/index.js';

const HEAD = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.2, 0, 1];
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const plant = (id: string, step: number): Plant => ({
  id,
  voice: 'pluck',
  cell: { ring: 2, step },
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
  const played = watchPool(engine);
  /** The gain of each plant's first note from `from` on: 'a' sits at bed-local +x (step 0), 'b' at −x (step 8). */
  const peaks = (from = 0): number[] => {
    const since = played.slice(from);
    const first = (side: 1 | -1) => since.find((note) => Math.sign(note.at[0]!) === side)?.p.gain ?? Number.NaN;
    return [first(1), first(-1)];
  };
  const send = ctx.of('gain').find((node) => node.gain.value === REVERB_SEND)!;
  return { ctx, engine, run, played, peaks, send };
}

describe('the engine when the garden is open (P-016)', () => {
  it('the send glides to STILL_SEND_MUL of the recipe over STILL_RAMP_TAU_S, and back; the same state again writes nothing', async () => {
    const { engine, run, send } = await start();
    run(0.1);
    expect(send).toBeDefined();
    const before = send.gain.events.length;
    engine.setStillness(true, '');
    expect(send.gain.last('target')).toMatchObject({ value: REVERB_SEND * STILL_SEND_MUL, tau: STILL_RAMP_TAU_S });
    engine.setStillness(true, 'p1');
    expect(send.gain.events).toHaveLength(before + 1);
    engine.setStillness(false, '');
    expect(send.gain.last('target')).toMatchObject({ value: REVERB_SEND, tau: STILL_RAMP_TAU_S });
    expect(20 * Math.log10(STILL_SEND_MUL)).toBeCloseTo(1.9, 1);
  });

  it('the gazed plant plays STILL_GAZE_DB louder than its neighbour, once; off the gaze it is level again', async () => {
    const { engine, run, played, peaks } = await start();
    engine.syncPlants([plant('a', 0), plant('b', 8)], BED);
    run(3); // a bar at 84 BPM is 2.86 s
    const level = peaks();
    expect(level[0]).toBeCloseTo(level[1]!, 9);
    engine.setStillness(true, 'a');
    const was = played.length;
    run(3);
    const open = peaks(was);
    expect(20 * Math.log10(open[0]! / open[1]!)).toBeCloseTo(STILL_GAZE_DB, 6);
    engine.setStillness(true, '');
    const then = played.length;
    run(3);
    const back = peaks(then);
    expect(back[0]).toBeCloseTo(back[1]!, 9);
  });

  it('createAudioEngine follows stillness:changed', () => {
    const engine = audio.createAudioEngine();
    const spy = vi.spyOn(engine, 'setStillness');
    bus.emit('stillness:changed', { isOpen: true, plantId: 'x' });
    expect(spy).toHaveBeenCalledWith(true, 'x');
  });
});
