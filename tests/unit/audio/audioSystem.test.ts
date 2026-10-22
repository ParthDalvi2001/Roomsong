// The audio module's public surface and its bus wiring (API_SPEC §1.2, §2): the engine starts from the user's
// settings, follows `settings:changed`, and pauses and resumes with the session and the page (NFR-PERF-10,
// FR-SYS-05). One engine for the whole file: a subscription to the bus lasts as long as the page.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { START_DELAY_S, TEMPO_MAX_BPM, TEMPO_MIN_BPM } from '../../../src/audio/config.js';
import * as audio from '../../../src/audio/index.js';
import { Scheduler } from '../../../src/audio/Scheduler.js';
import * as coreConfig from '../../../src/core/config.js';
import { bus, DEFAULT_SETTINGS, log, settings } from '../../../src/core/index.js';

import { FakeAudioContext, type FakeNode } from './fakeAudio.js';

const ctx = new FakeAudioContext();
let engine: audio.AudioEngine;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  settings.set({ tempo: 120, volume: 0.6, reverb: 'off', mono: true });
  engine = audio.createAudioEngine();
  await engine.init(ctx.audio);
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => {
  settings.set(DEFAULT_SETTINGS);
  vi.useRealTimers();
});

/** compressor ← Listen dim ← breathing filter (T-164) ← master. */
const master = (): FakeNode =>
  (((ctx.of('compressor')[0] as FakeNode).inputs[0] as FakeNode).inputs[0] as FakeNode).inputs[0] as FakeNode;
const send = (): FakeNode => (ctx.of('convolver')[0] as FakeNode).inputs[0] as FakeNode;

describe('audio/index.ts', () => {
  it('exports the public surface, and nothing else', () => {
    expect(Object.keys(audio).sort()).toEqual(['GardenAudioSystem', 'VOICE_CAP', 'createAudioEngine']);
    expect(audio.VOICE_CAP).toBe(24);
  });

  it("audio's tempo bounds are core's: a copy, because audio/config.ts may not load core/ at run time", () => {
    expect(TEMPO_MIN_BPM).toBe(coreConfig.TEMPO_MIN_BPM);
    expect(TEMPO_MAX_BPM).toBe(coreConfig.TEMPO_MAX_BPM);
  });
});

describe('settings → engine', () => {
  it('a new engine starts from the settings in force: tempo, volume, reverb and mono', () => {
    expect(master().gain.value).toBe(0.6);
    expect(master().channelCount).toBe(1); // P-014
    expect(send().gain.last('target')).toMatchObject({ value: 0 }); // reverb 'off' mutes the send
    ctx.currentTime = START_DELAY_S + (16 * Scheduler.stepDurationFor(120)) / 2;
    expect(engine.clock.barPhase()).toBeCloseTo(0.5, 9); // half a bar at 120 BPM
    ctx.currentTime = 0;
  });

  it('settings:changed reaches the engine', () => {
    const setTempo = vi.spyOn(engine, 'setTempo');
    const setReverb = vi.spyOn(engine, 'setReverb');
    settings.set({ tempo: 72, volume: 0.25, reverb: 'small', mono: false });
    expect(setTempo).toHaveBeenLastCalledWith(72);
    expect(setReverb).toHaveBeenLastCalledWith('small');
    expect(master().gain.last('target')).toMatchObject({ value: 0.25 });
    expect(master().channelCount).toBe(2);
  });
});

describe('session and page visibility → engine', () => {
  it('resumes on session start and when the page or session becomes visible; suspends when hidden or ended', () => {
    const resume = vi.spyOn(engine, 'resume').mockResolvedValue();
    const suspend = vi.spyOn(engine, 'suspend').mockResolvedValue();
    bus.emit('xr:sessionStart', { visible: true });
    expect(resume).toHaveBeenCalledTimes(1);
    bus.emit('xr:visibility', { visible: false });
    expect(suspend).toHaveBeenCalledTimes(1);
    bus.emit('xr:visibility', { visible: true });
    expect(resume).toHaveBeenCalledTimes(2);
    bus.emit('xr:sessionEnd', { visible: false });
    expect(suspend).toHaveBeenCalledTimes(2);
  });

  it('a context that will not resume is logged as E_AUDIO_CONTEXT, and nothing is thrown at the emitter', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    ctx.state = 'suspended';
    ctx.resume.mockImplementationOnce(() => Promise.reject(new Error('not allowed')));
    expect(() => bus.emit('xr:visibility', { visible: true })).not.toThrow();
    await vi.waitFor(() => expect(log.recent().pop()).toMatchObject({ level: 'error', scope: 'audio' }));
    expect(log.recent().pop()?.msg).toBe('E_AUDIO_CONTEXT');
    ctx.state = 'running';
  });
});
