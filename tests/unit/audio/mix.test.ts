// T-164 §2 (SOUND_PASS_T164.md): the app's voices against the mix table (UX §6: Bass +1, Pad and Choir −2, Pluck −1
// dB re the Bell), each rendered offline by offlineRender.ts. One Classic note, ring 2, middle hue, full height, no
// reverb, no panner, the first second; RMS, and K = the loudest 400 ms K-weighted (BS.1770). The stand-in reproduces
// T-144's browser figures for today's sound (Bass RMS +5.4, Pad −6.0, Choir −5.6, Pluck −16.1): the first test.
import { describe, expect, it } from 'vitest';

import { CEILING_DBFS } from '../../../src/audio/config.js';
import { createLimiter } from '../../../src/audio/limiter.js';
import { dbToGain } from '../../../src/audio/mapping.js';
import { APP_STYLE, STYLES, TODAY, type Recipe } from '../../../src/audio/styles.js';
import { hzForRing } from '../../../src/audio/theory.js';
import { Bass } from '../../../src/audio/voices/Bass.js';
import { Bell } from '../../../src/audio/voices/Bell.js';
import { Choir } from '../../../src/audio/voices/Choir.js';
import { Note } from '../../../src/audio/voices/note.js';
import { Pad } from '../../../src/audio/voices/Pad.js';
import { Pluck } from '../../../src/audio/voices/Pluck.js';
import { WANDERER } from '../../../src/garden/index.js';
import { integratedLufs } from '../../renders/measure.js';

import { asCtx, MiniContext } from './offlineRender.js';

const VOICES = { bell: Bell, bass: Bass, pad: Pad, choir: Choir, pluck: Pluck } as const;
type V = keyof typeof VOICES;
const ALL: readonly V[] = ['bell', 'bass', 'pad', 'choir', 'pluck'];
const SR = 48000;
const db = (x: number): number => 20 * Math.log10(x);
const peakOf = (a: Float32Array): number => a.reduce((m, x) => Math.max(m, Math.abs(x)), 0);

/** Each voice's note into `out`, all at time 0. */
function play(c: MiniContext, r: Recipe, voices: readonly V[], out: unknown): void {
  for (const v of voices) {
    const voice = new VOICES[v](asCtx(c), { note: new Note() }, r);
    const hz = hzForRing(WANDERER, 2, v);
    const p = {
      hz,
      gain: dbToGain(r.mixDb[v]),
      release: 2.5,
      cutoffMul: 1,
      detune: 0,
      timbre: 0,
      calm: false,
    };
    voice.trigger(0, p, out as AudioNode);
  }
}

interface Level {
  rms: number;
  k: number;
  peak: number;
}

function solo(v: V, r: Recipe): Level {
  const c = new MiniContext(SR);
  play(c, r, [v], c.destination);
  const y = c.render(1);
  let sum = 0;
  for (const x of y) sum += x * x;
  let k = -Infinity;
  for (let a = 0; a + 0.4 * SR <= y.length; a += 0.1 * SR) {
    k = Math.max(k, integratedLufs([y.subarray(a, a + 0.4 * SR)], SR));
  }
  return { rms: db(Math.sqrt(sum / y.length)), k, peak: db(peakOf(y)) };
}

/** Each voice re the Bell, dB. */
function offsets(r: Recipe): Record<V, Level> {
  const bell = solo('bell', r);
  const out = {} as Record<V, Level>;
  for (const v of ALL) {
    const m = solo(v, r);
    out[v] = { rms: m.rms - bell.rms, k: m.k - bell.k, peak: m.peak - bell.peak };
  }
  return out;
}

const round = (_: string, x: unknown): unknown => (typeof x === 'number' ? Math.round(x * 10) / 10 : x);

describe('T-164 the mix (§2), rendered offline', () => {
  it("the stand-in renders today's sound as T-144 measured it in Chromium, within 0.5 dB", () => {
    const o = offsets(TODAY);
    expect(Math.abs(o.bass.rms - 5.4)).toBeLessThan(0.5);
    expect(Math.abs(o.pad.rms + 6.0)).toBeLessThan(0.5);
    expect(Math.abs(o.choir.rms + 5.6)).toBeLessThan(0.5);
    expect(Math.abs(o.pluck.rms + 16.1)).toBeLessThan(0.5);
  });

  it("the app's Bass, Pad and Choir sit within ±1.5 dB of the table by RMS and by K", () => {
    const o = offsets(STYLES[APP_STYLE]);
    console.log('T-164 mix re Bell, dB:', JSON.stringify(o, round));
    for (const [v, target] of [
      ['bass', 1],
      ['pad', -2],
      ['choir', -2],
    ] as const) {
      expect(Math.abs(o[v].rms - target), `${v} rms`).toBeLessThanOrEqual(1.5);
      expect(Math.abs(o[v].k - target), `${v} K`).toBeLessThanOrEqual(1.5);
    }
  });

  it('five full-height voices struck together through the limiter stay under its ceiling', () => {
    const r = STYLES[APP_STYLE];
    const c = new MiniContext(SR);
    const lim = createLimiter(asCtx(c));
    // What Layers.ts glides the compressor to for the recipe.
    lim.input.threshold.value = r.limiterThresholdDb;
    lim.input.knee.value = r.limiterKneeDb;
    lim.input.ratio.value = r.limiterRatio;
    lim.input.attack.value = r.limiterAttackS;
    lim.input.release.value = r.limiterReleaseS;
    play(c, r, ALL, lim.input);
    const out = c.render(1.5, lim.output as unknown as { out(i: number): number });
    const dry = new MiniContext(SR);
    play(dry, r, ALL, dry.destination);
    const into = dry.render(1.5);
    console.log(
      `T-164 five voices: into the limiter ${db(peakOf(into)).toFixed(1)}, out ${db(peakOf(out)).toFixed(1)} dBFS`,
    );
    expect(db(peakOf(out))).toBeLessThan(CEILING_DBFS);
  });
});
