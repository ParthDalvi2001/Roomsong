// T-121, TC-AUD-05 (FR-MUS-06, NFR-PERF-10): a real render of the app's audio engine. Node has no Web Audio, so
// the unit tests prove the limiter by the shape of the graph and the pan by the panner's position; here Chromium
// renders the 24-panner graph in an OfflineAudioContext and the samples are measured. Nothing wires audio/ into
// the app before T-128, so the page loads the engine class from the dev server, as 05-hands.spec.ts does.
// The engine's own scheduler runs on the offline clock: the render is suspended every 25 ms of audio time, the
// engine ticks, and the render goes on. Emulator-page result (E): levels and channel balance in desktop
// Chromium. It says nothing about a headset, its speakers, latency or how any of it sounds.
// T-144 adds Bass and Choir: each rendered alone, the five voices' levels side by side, a mixed full bed, 24 notes
// of each new voice in one instant, and the share of a bass note above 120 Hz.
import { expect, test, type Page } from '@playwright/test';

import { CEILING_DBFS, TICK_MS, VOICE_CAP } from '../../src/audio/config';

import { openApp, readRoom } from './support/iwer';

type Voice = 'bell' | 'pad' | 'pluck' | 'bass' | 'choir';

interface Scene {
  /** Full-height plants, hue 0.5. */
  plants: { voice: Voice; ring: number; step: number }[];
  seconds: number;
  bpm: number;
  reverb: 'auto' | 'off';
  /** Trigger every step at this one audio time instead of running the scheduler. */
  allAtS?: number;
  /** Replace the compressor and the ceiling by plain gains: what the mix peaks at with no limiter. */
  bypassLimiter?: boolean;
  /** Key root of the major pentatonic, in semitones from C (−3 = A, the lowest key). Default: C. */
  keyRoot?: 0 | -3;
  /** Also measure the share of the energy above this frequency. */
  splitHz?: number;
}

interface Rendered {
  peakDbfs: number;
  rmsDbfs: number;
  /** Right-channel energy over left-channel energy, in dB. */
  rightMinusLeftDb: number;
  /** The most voices the engine reported at a tick. */
  maxVoices: number;
  /** Share of the energy above `splitHz`, 0..1; NaN when the scene did not ask. */
  aboveSplit: number;
  /** Main-thread milliseconds of one engine tick in this page: the mean and the worst. 0 with `allAtS`. */
  tickMeanMs: number;
  tickWorstMs: number;
}

const SAMPLE_RATE = 48000;
const SILENCE_DBFS = -60;
/** Float rounding allowance on the −1 dBFS bound. */
const PEAK_TOLERANCE_DB = 0.001;
/** TEST_PLAN TC-AUD-05: a plant 0.30 m to the side reads about 5.4 dB by the equal-power law; the bound is 3 dB. */
const PAN_MIN_DB = 3;
const CENTRED_DB = 0.5;
/** Column-major. The bed centre 0.45 m ahead of the origin on a 0.74 m desk; +x = the user's right (D-029). */
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];
/** A level head at 1.20 m over the origin, looking down −z at the bed. */
const HEAD = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.2, 0, 1];

/** Renders one scene in the page and measures it. */
function render(page: Page, scene: Scene): Promise<Rendered> {
  return page.evaluate(
    async ({ scene, sampleRate, tickS, bed, head }) => {
      const engineUrl = '/src/audio/AudioEngine.ts';
      const { Engine } = (await import(
        /* @vite-ignore */ engineUrl
      )) as typeof import('../../src/audio/AudioEngine');

      const ctx = new OfflineAudioContext(2, Math.floor(sampleRate * scene.seconds), sampleRate);
      if (scene.bypassLimiter) {
        const param = () => ({ value: 0 });
        ctx.createDynamicsCompressor = () =>
          Object.assign(ctx.createGain(), {
            threshold: param(),
            knee: param(),
            ratio: param(),
            attack: param(),
            release: param(),
          }) as unknown as DynamicsCompressorNode;
        ctx.createWaveShaper = () => ctx.createGain() as unknown as WaveShaperNode;
      }

      const engine = new Engine();
      engine.setTempo(scene.bpm);
      engine.setVolume(1);
      engine.setReverb(scene.reverb);
      if (scene.keyRoot !== undefined) {
        engine.setSignature({
          keyRoot: scene.keyRoot,
          mode: 'majorPent',
          tempo: scene.bpm,
          reverbRt60: 0.9,
          reverbSize: 'medium',
          starterVoices: ['bell', 'pad', 'pluck'],
          paletteSeed: 0,
        });
      }
      engine.syncPlants(
        scene.plants.map((p, i) => ({
          id: `p${i}`,
          voice: p.voice,
          cell: { ring: p.ring, step: p.step },
          height: 1,
          hue: 0.5,
          plantedAt: 0,
        })),
        bed,
      );
      await engine.init(ctx as unknown as AudioContext);
      engine.setListenerPose(head);

      let maxVoices = 0;
      let ticks = 0;
      let tickTotalMs = 0;
      let tickWorstMs = 0;
      const tick = () => {
        const t0 = performance.now();
        engine.tick();
        const ms = performance.now() - t0;
        ticks++;
        tickTotalMs += ms;
        tickWorstMs = Math.max(tickWorstMs, ms);
      };
      if (scene.allAtS !== undefined) {
        for (let step = 0; step < 16; step++) engine.triggerStep(step, scene.allAtS);
      } else {
        tick();
        for (let k = 1; k * tickS < scene.seconds; k++) {
          void ctx.suspend(k * tickS).then(() => {
            tick();
            maxVoices = Math.max(maxVoices, engine.stats.voices);
            void ctx.resume();
          });
        }
      }

      const buffer = await ctx.startRendering();
      let peak = 0;
      const energy = [0, 0];
      for (let channel = 0; channel < 2; channel++) {
        const samples = buffer.getChannelData(channel);
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          const v = samples[i] ?? 0;
          if (Math.abs(v) > peak) peak = Math.abs(v);
          sum += v * v;
        }
        energy[channel] = sum;
      }
      const [left = 0, right = 0] = energy;
      let aboveSplit = Number.NaN;
      if (scene.splitHz !== undefined) {
        // The energy in the DFT bins under the split, by Parseval: exact for this window, with no filter skirt
        // (the 2nd harmonic of a bass note can sit 10 Hz from the split). Each bin is one rotating phasor.
        const n = buffer.length;
        const bins = Math.floor((scene.splitHz * n) / sampleRate);
        let below = 0;
        for (let channel = 0; channel < 2; channel++) {
          const samples = buffer.getChannelData(channel);
          for (let k = 0; k <= bins; k++) {
            const stepCos = Math.cos((2 * Math.PI * k) / n);
            const stepSin = Math.sin((2 * Math.PI * k) / n);
            let cos = 1;
            let sin = 0;
            let re = 0;
            let im = 0;
            for (let i = 0; i < n; i++) {
              const v = samples[i] ?? 0;
              re += v * cos;
              im += v * sin;
              const next = cos * stepCos - sin * stepSin;
              sin = sin * stepCos + cos * stepSin;
              cos = next;
            }
            below += ((k === 0 ? 1 : 2) * (re * re + im * im)) / n; // a bin above 0 has a mirror image
          }
        }
        aboveSplit = 1 - below / (left + right);
      }
      const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
      return {
        peakDbfs: db(peak),
        rmsDbfs: db(Math.sqrt((left + right) / (2 * buffer.length))),
        rightMinusLeftDb: left > 0 && right > 0 ? 10 * Math.log10(right / left) : Number.NaN,
        maxVoices,
        aboveSplit,
        tickMeanMs: ticks > 0 ? tickTotalMs / ticks : 0,
        tickWorstMs,
      };
    },
    { scene, sampleRate: SAMPLE_RATE, tickS: TICK_MS / 1000, bed: BED, head: HEAD },
  );
}

const line = (name: string, r: Rendered, task = 'T-121') =>
  `${task} ${name}: peak ${r.peakDbfs.toFixed(2)} dBFS, rms ${r.rmsDbfs.toFixed(1)} dBFS, ` +
  `R-L ${r.rightMinusLeftDb.toFixed(2)} dB, voices ≤ ${r.maxVoices}` +
  (r.tickMeanMs > 0
    ? `, tick ${r.tickMeanMs.toFixed(3)} ms mean, ${r.tickWorstMs.toFixed(2)} ms worst`
    : '') +
  ' (desktop Chromium)';

/** Under the −1 dBFS ceiling and not silent. */
function expectBounded(r: Rendered): void {
  expect(r.peakDbfs).toBeLessThanOrEqual(CEILING_DBFS + PEAK_TOLERANCE_DB);
  expect(r.rmsDbfs).toBeGreaterThan(SILENCE_DBFS);
}

test('T-121 TC-AUD-05 the limiter holds −1 dBFS: a full bed at 120 BPM and 24 bells in one instant', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  const offHost = await openApp(page, readRoom('none'));

  // All 80 cells, the three voices in turn, every plant at full height, volume 1: stealing all the way.
  const voices: Voice[] = ['bell', 'pad', 'pluck'];
  const fullBed: Scene['plants'] = [];
  for (let ring = 0; ring < 5; ring++) {
    for (let step = 0; step < 16; step++) {
      fullBed.push({ voice: voices[(ring + step) % 3] ?? 'bell', ring, step });
    }
  }
  const bed = await render(page, { plants: fullBed, seconds: 4.5, bpm: 120, reverb: 'auto' });
  console.log(line('full bed, 80 plants, 120 BPM, two bars', bed));
  expectBounded(bed);
  expect(bed.maxVoices).toBe(VOICE_CAP); // it asks for more than 24, and never gets more

  // One bell on each of 24 cells, all triggered at the same audio time.
  const bells: Scene['plants'] = Array.from({ length: VOICE_CAP }, (_, i) => ({
    voice: 'bell',
    ring: i % 5,
    step: i % 16,
  }));
  const overload: Scene = { plants: bells, seconds: 3.5, bpm: 120, reverb: 'auto', allAtS: 0.05 };
  const limited = await render(page, overload);
  const raw = await render(page, { ...overload, bypassLimiter: true });
  console.log(line('24 bells in one instant', limited));
  console.log(line('the same with the limiter bypassed', raw));
  expectBounded(limited);
  expect(raw.peakDbfs).toBeGreaterThan(6); // the control: without the limiter this scene is far over full scale

  expect(pageErrors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('T-121 TC-AUD-05 pan by position: a plant on the right is louder on the right, one on the left on the left', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  const offHost = await openApp(page, readRoom('none'));

  // One plant on the outer ring, reverb off. Step 0 is at the user's right, 4 nearest, 8 on the left, 12 farthest
  // (D-029). Each of the three voices is rendered once, so each is also checked for level and for sound.
  const one = (voice: Voice, step: number): Scene => ({
    plants: [{ voice, ring: 4, step }],
    seconds: 2.5,
    bpm: 120,
    reverb: 'off',
  });
  const right = await render(page, one('bell', 0));
  const near = await render(page, one('pluck', 4));
  const left = await render(page, one('pad', 8));
  const far = await render(page, one('bell', 12));
  console.log(line('bell at step 0, the right', right));
  console.log(line('pluck at step 4, nearest', near));
  console.log(line('pad at step 8, the left', left));
  console.log(line('bell at step 12, farthest', far));

  for (const rendered of [right, near, left, far]) expectBounded(rendered);
  expect(right.rightMinusLeftDb).toBeGreaterThanOrEqual(PAN_MIN_DB);
  expect(left.rightMinusLeftDb).toBeLessThanOrEqual(-PAN_MIN_DB);
  expect(Math.abs(near.rightMinusLeftDb)).toBeLessThanOrEqual(CENTRED_DB);
  expect(Math.abs(far.rightMinusLeftDb)).toBeLessThanOrEqual(CENTRED_DB);

  expect(pageErrors).toEqual([]);
  expect(offHost).toEqual([]);
});

const ALL_VOICES: Voice[] = ['bell', 'pad', 'pluck', 'bass', 'choir'];
const NEW_VOICES: Voice[] = ['bass', 'choir'];
/** A headset speaker plays little under this (T-144; not measured on one). */
const SMALL_SPEAKER_HZ = 120;

test('T-144 TC-AUD-05 bass and choir render with sound, under the ceiling and on their side; the five voices solo', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  const offHost = await openApp(page, readRoom('none'));

  // The level of each voice alone, for the balance: one note from one trigger, full height, on the middle ring
  // at the step nearest the user, reverb off, measured over its first second.
  const solo = (voice: Voice, ring = 2): Scene => ({
    plants: [{ voice, ring, step: 4 }],
    seconds: 1.05,
    bpm: 120,
    reverb: 'off',
    allAtS: 0.05,
  });
  // The compressor's make-up gain and its curve are in the first figure; the second, with the limiter bypassed, is
  // the level the voice hands to it.
  for (const voice of ALL_VOICES) {
    const alone = await render(page, solo(voice));
    const raw = await render(page, { ...solo(voice), bypassLimiter: true });
    console.log(line(`${voice} solo, first second`, alone, 'T-144'));
    console.log(line(`${voice} solo, limiter bypassed`, raw, 'T-144'));
    expectBounded(alone);
    // Measured -17.0 to -9.8 dBFS (2026-10-12). Outside -20..-8 a recipe constant has moved: the mix is T-164's to change.
    expect(raw.peakDbfs, `${voice} solo, before the limiter`).toBeGreaterThan(-20);
    expect(raw.peakDbfs, `${voice} solo, before the limiter`).toBeLessThan(-8);
  }

  // Pan, as for the other voices: the outer ring, step 0 on the user's right and step 8 on the left.
  for (const voice of NEW_VOICES) {
    const side = (step: number): Scene => ({ ...solo(voice), plants: [{ voice, ring: 4, step }] });
    const right = await render(page, side(0));
    const left = await render(page, side(8));
    console.log(line(`${voice} at step 0, the right`, right, 'T-144'));
    console.log(line(`${voice} at step 8, the left`, left, 'T-144'));
    expectBounded(right);
    expectBounded(left);
    expect(right.rightMinusLeftDb).toBeGreaterThanOrEqual(PAN_MIN_DB);
    expect(left.rightMinusLeftDb).toBeLessThanOrEqual(-PAN_MIN_DB);
  }

  // Bass on a small speaker (LLD §7): how much of a note is above 120 Hz. The lowest note of the default key
  // (C2, 65 Hz: its 2nd harmonic is above the split) and the lowest note there is (A1, 55 Hz: only its 3rd is).
  // A bell (C4, 262 Hz) checks the measure itself: all of it is above.
  const split = (voice: Voice, keyRoot: 0 | -3): Scene => ({
    ...solo(voice, 0),
    seconds: 2,
    keyRoot,
    splitHz: SMALL_SPEAKER_HZ,
  });
  const bassC = await render(page, split('bass', 0));
  const bassA = await render(page, split('bass', -3));
  const bell = await render(page, split('bell', 0));
  const share = (r: Rendered) => `${(100 * r.aboveSplit).toFixed(1)} %`;
  console.log(
    `T-144 energy above ${SMALL_SPEAKER_HZ} Hz: bass C2 ${share(bassC)}, bass A1 ${share(bassA)}, ` +
      `bell C4 ${share(bell)} (desktop Chromium)`,
  );
  expect(bell.aboveSplit).toBeGreaterThan(0.99);
  expect(bassC.aboveSplit).toBeGreaterThan(0.4);
  expect(bassA.aboveSplit).toBeGreaterThan(0.1);

  expect(pageErrors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('T-144 TC-AUD-04 TC-AUD-05 the cap and the limiter hold with all five voices: a mixed full bed, 24 basses, 24 choirs', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  const offHost = await openApp(page, readRoom('none'));

  // All 80 cells: five rings, five voices, so every step plays one note of each. Full height, volume 1.
  const fullBed: Scene['plants'] = [];
  for (let ring = 0; ring < 5; ring++) {
    for (let step = 0; step < 16; step++) {
      fullBed.push({ voice: ALL_VOICES[(ring + step) % 5] ?? 'bell', ring, step });
    }
  }
  const bed = await render(page, { plants: fullBed, seconds: 4.5, bpm: 120, reverb: 'auto' });
  console.log(line('full bed of five voices, 80 plants, 120 BPM, two bars', bed, 'T-144'));
  expectBounded(bed);
  expect(bed.maxVoices).toBe(VOICE_CAP);

  // 24 notes of one new voice at the same audio time; the same with no limiter is the control.
  for (const voice of NEW_VOICES) {
    const many: Scene['plants'] = Array.from({ length: VOICE_CAP }, (_, i) => ({
      voice,
      ring: i % 5,
      step: i % 16,
    }));
    const overload: Scene = { plants: many, seconds: 1.5, bpm: 120, reverb: 'auto', allAtS: 0.05 };
    const limited = await render(page, overload);
    const raw = await render(page, { ...overload, bypassLimiter: true });
    console.log(line(`24 ${voice} notes in one instant`, limited, 'T-144'));
    console.log(line('the same with the limiter bypassed', raw, 'T-144'));
    expectBounded(limited);
    expect(raw.peakDbfs).toBeGreaterThan(0); // without the limiter this scene is over full scale
  }

  expect(pageErrors).toEqual([]);
  expect(offHost).toEqual([]);
});
