// The UI sounds of SOUND_PASS_T164.md §6 (tick, bump, confirm, removeRev, undoFwd) and the Listen sweep. Each
// sound: once, at the audio clock's now, its notes of the room chord on its voice at its level, by the UI-sound
// rules (P-025), and nothing made by the ticks after it. On the fake AudioContext: the notes the pool is asked for
// and the graph's automation are read, nothing is heard (09-audio renders the levels in a browser).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Engine } from '../../../src/audio/AudioEngine.js';
import {
  LISTEN_BREATH_BARS,
  LISTEN_BREATH_HIGH_HZ,
  LISTEN_BREATH_LOW_HZ,
  LISTEN_DIM_DB,
  LISTEN_GLIDE_IN_S,
  LISTEN_GLIDE_OUT_S,
  LISTEN_SEND_ADD,
  LISTEN_SEND_MAX,
  BAR_GLIDE_TAUS,
  MIX_DB,
  REVERB_SEND,
  TICK_MS,
} from '../../../src/audio/config.js';
import { dbToGain } from '../../../src/audio/mapping.js';
import { Scheduler } from '../../../src/audio/Scheduler.js';
import { STYLES } from '../../../src/audio/styles.js';
import { hzForRing } from '../../../src/audio/theory.js';
import { UI_SOUNDS, type UiSoundName } from '../../../src/audio/uiSounds.js';
import { chordDegrees, STEPS, WANDERER } from '../../../src/garden/index.js';

import { FakeAudioContext, type FakeNode } from './fakeAudio.js';
import { expectUiRules, watchPool } from './uiRules.js';

import type { RoomSignature } from '../../../src/garden/index.js';

const BPM = 84;
const BAR_S = STEPS * Scheduler.stepDurationFor(BPM);
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];
const MINOR: RoomSignature = { ...WANDERER, keyRoot: 4, mode: 'minorPent' };
const CLASS = { bell: 'Bell', pluck: 'Pluck', bass: 'Bass' } as const;

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function start() {
  const ctx = new FakeAudioContext();
  const engine = new Engine();
  engine.setTempo(BPM);
  await engine.init(ctx.audio);
  engine.syncPlants([], BED);
  let ticks = 0;
  const run = (seconds: number): void => {
    for (let n = Math.round((seconds * 1000) / TICK_MS); n > 0; n--) {
      ctx.currentTime = (++ticks * TICK_MS) / 1000;
      vi.advanceTimersByTime(TICK_MS);
    }
  };
  /** master → breath → dim → compressor; the reverb send feeds the convolver. */
  const compressor = ctx.of('compressor')[0] as FakeNode;
  const dim = compressor.inputs[0] as FakeNode;
  const breath = dim.inputs[0] as FakeNode;
  const send = (ctx.of('convolver')[0] as FakeNode).inputs[0] as FakeNode;
  return { ctx, engine, run, dim, breath, send };
}

describe('the UI sounds (SOUND_PASS_T164.md §6, P-025)', () => {
  for (const name of Object.keys(UI_SOUNDS) as UiSoundName[]) {
    const s = UI_SOUNDS[name];
    it(`ui('${name}'): ${s.notes.length} note(s) on ${s.voice} from now, in the room's chord, at ${s.db} dB, once; the ticks after it make nothing`, async () => {
      const { ctx, engine, run } = await start();
      engine.setSignature(MINOR);
      run(1); // the scheduler runs: its next step is up to 120 ms ahead of now
      const played = watchPool(engine);
      const fixed = ctx.nodes.length;
      const now = ctx.currentTime;
      engine.ui(name);
      expectUiRules(played, now, MINOR);
      expect(played).toHaveLength(s.notes.length);
      const chord = chordDegrees(MINOR.mode);
      played.forEach((n, i) => {
        const note = s.notes[i]!;
        expect(n.voice).toBe(CLASS[s.voice]);
        expect(n.time).toBeCloseTo(now + note.atS, 9);
        expect(n.p.hz).toBeCloseTo(hzForRing(MINOR, chord[note.tone], s.voice) * s.octave, 6);
        expect(n.p.gain).toBeCloseTo(dbToGain(MIX_DB[s.voice] + s.db), 9);
        expect(n.p.release).toBe(s.releaseS);
        expect(n.p.cutoffMul).toBe(s.cutoffMul);
        expect(n.p.detune).toBe(0);
        expect(n.at).toEqual([0, 0.74, -0.45]); // the bed's centre: 0.35–0.45 m ahead of a seated head
      });
      // Its notes' own nodes and no others; nothing more from a second of ticks on the empty bed.
      expect(ctx.nodes.length).toBeGreaterThan(fixed);
      const after = ctx.nodes.length;
      run(1);
      expect(ctx.nodes).toHaveLength(after);
      expect(played).toHaveLength(s.notes.length);
    });
  }

  it('in a style the levels follow its mix and still pass the rules', async () => {
    const { ctx, engine, run } = await start();
    engine.setStyle('C');
    run(1);
    const played = watchPool(engine);
    engine.ui('confirm');
    expectUiRules(played, ctx.currentTime, WANDERER, STYLES.C);
    expect(played[0]!.p.gain).toBeCloseTo(dbToGain(STYLES.C.mixDb.pluck + UI_SOUNDS.confirm.db), 9);
  });

  it('removeRev runs the chord down and undoFwd up, 50 ms apart; confirm arpeggiates up 40 ms apart', () => {
    expect(UI_SOUNDS.removeRev.notes.map((n) => n.tone)).toEqual([2, 1, 0]);
    expect(UI_SOUNDS.undoFwd.notes.map((n) => n.tone)).toEqual([0, 1, 2]);
    expect(UI_SOUNDS.undoFwd.notes.map((n) => n.atS)).toEqual([0, 0.05, 0.1]);
    expect(UI_SOUNDS.confirm.notes.map((n) => n.atS)).toEqual([0, 0.04, 0.08]);
    expect(UI_SOUNDS.tick.octave).toBe(2); // one octave above the Bell's root
  });

  it('before init() every sound does nothing and throws nothing', () => {
    const engine = new Engine();
    for (const name of Object.keys(UI_SOUNDS) as UiSoundName[]) expect(() => engine.ui(name)).not.toThrow();
  });
});

describe('the Listen sweep (SOUND_PASS_T164.md §6)', () => {
  const centre = Math.sqrt(LISTEN_BREATH_LOW_HZ * LISTEN_BREATH_HIGH_HZ);

  it('enterListen: the filter to its 0.8–4 kHz centre, the mix −3 dB, the send +0.07 capped at 0.35, all over 1.2 s; exit: back over 0.8 s', async () => {
    const { ctx, engine, dim, breath, send } = await start();
    ctx.currentTime = 5;
    engine.enterListen();
    const tauIn = LISTEN_GLIDE_IN_S / BAR_GLIDE_TAUS;
    expect(breath.frequency.last('target')).toMatchObject({ value: centre, time: 5, tau: tauIn });
    expect(dim.gain.last('target')).toMatchObject({ value: dbToGain(LISTEN_DIM_DB), time: 5, tau: tauIn });
    const sent = send.gain.last('target')!;
    expect(sent).toMatchObject({ time: 5, tau: tauIn });
    expect(sent.value).toBeCloseTo(Math.min(LISTEN_SEND_MAX, REVERB_SEND + LISTEN_SEND_ADD), 9);
    ctx.currentTime = 9;
    engine.exitListen();
    const tauOut = LISTEN_GLIDE_OUT_S / BAR_GLIDE_TAUS;
    expect(breath.frequency.last('target')).toMatchObject({
      value: ctx.sampleRate / 2,
      time: 9,
      tau: tauOut,
    });
    expect(dim.gain.last('target')).toMatchObject({ value: 1, time: 9, tau: tauOut });
    expect(send.gain.last('target')).toMatchObject({ value: REVERB_SEND, time: 9, tau: tauOut });
  });

  it("in Listen the bar lines breathe 0.8–4 kHz on a 16-bar sine in every style; after it, the style's own range", async () => {
    const { engine, run, breath } = await start();
    engine.setStyle('A'); // breathes 2.5–8 kHz on its own
    engine.enterListen();
    const seen: number[] = [];
    run(BAR_S * (LISTEN_BREATH_BARS + 1));
    for (const e of breath.frequency.events) if (e.type === 'target') seen.push(e.value);
    const inListen = seen.slice(1);
    expect(inListen.length).toBeGreaterThanOrEqual(LISTEN_BREATH_BARS);
    expect(Math.min(...inListen)).toBeCloseTo(LISTEN_BREATH_LOW_HZ, 3);
    expect(Math.max(...inListen)).toBeCloseTo(LISTEN_BREATH_HIGH_HZ, 3);
    engine.exitListen();
    run(BAR_S * 2);
    const after = breath.frequency.last('target')!.value;
    expect(after).toBeGreaterThanOrEqual(STYLES.A.breathLowHz);
    expect(after).toBeLessThanOrEqual(STYLES.A.breathHighHz);
  });

  it("with the reverb 'off' the send stays shut through Listen; a re-tune in Listen keeps the lifted send", async () => {
    const { ctx, engine, send } = await start();
    engine.setReverb('off');
    engine.enterListen();
    expect(send.gain.last('target')!.value).toBe(0);
    engine.setReverb('auto');
    expect(send.gain.last('target')!.value).toBeCloseTo(REVERB_SEND + LISTEN_SEND_ADD, 9);
    ctx.currentTime = 2;
    engine.setSignature(MINOR);
    expect(send.gain.last('target')!.value).toBeCloseTo(REVERB_SEND + LISTEN_SEND_ADD, 9);
  });

  it('mono stays mono through a Listen', async () => {
    const { ctx, engine } = await start();
    engine.setMono(true);
    engine.enterListen();
    engine.exitListen();
    const compressor = ctx.of('compressor')[0] as FakeNode;
    const master = ((compressor.inputs[0] as FakeNode).inputs[0] as FakeNode).inputs[0] as FakeNode;
    expect(master.channelCount).toBe(1);
  });
});
