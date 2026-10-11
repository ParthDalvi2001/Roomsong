// T-121, TC-AUD-05 (FR-MUS-06, NFR-PERF-10): a real render of the app's audio engine. Node has no Web Audio, so
// the unit tests prove the limiter by the shape of the graph and the pan by the panner's position; here Chromium
// renders the 24-panner graph in an OfflineAudioContext and the samples are measured. Nothing wires audio/ into
// the app before T-128, so the page loads the engine class from the dev server, as 05-hands.spec.ts does.
// The engine's own scheduler runs on the offline clock: the render is suspended every 25 ms of audio time, the
// engine ticks, and the render goes on. Emulator-page result (E): levels and channel balance in desktop
// Chromium. It says nothing about a headset, its speakers, latency or how any of it sounds.
import { expect, test, type Page } from '@playwright/test';

import { CEILING_DBFS, TICK_MS, VOICE_CAP } from '../../src/audio/config';

import { openApp, readRoom } from './support/iwer';

type Voice = 'bell' | 'pad' | 'pluck';

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
}

interface Rendered {
  peakDbfs: number;
  rmsDbfs: number;
  /** Right-channel energy over left-channel energy, in dB. */
  rightMinusLeftDb: number;
  /** The most voices the engine reported at a tick. */
  maxVoices: number;
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
      if (scene.allAtS !== undefined) {
        for (let step = 0; step < 16; step++) engine.triggerStep(step, scene.allAtS);
      } else {
        engine.tick();
        for (let k = 1; k * tickS < scene.seconds; k++) {
          void ctx.suspend(k * tickS).then(() => {
            engine.tick();
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
      const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
      return {
        peakDbfs: db(peak),
        rmsDbfs: db(Math.sqrt((left + right) / (2 * buffer.length))),
        rightMinusLeftDb: left > 0 && right > 0 ? 10 * Math.log10(right / left) : Number.NaN,
        maxVoices,
      };
    },
    { scene, sampleRate: SAMPLE_RATE, tickS: TICK_MS / 1000, bed: BED, head: HEAD },
  );
}

const line = (name: string, r: Rendered) =>
  `T-121 ${name}: peak ${r.peakDbfs.toFixed(2)} dBFS, rms ${r.rmsDbfs.toFixed(1)} dBFS, ` +
  `R-L ${r.rightMinusLeftDb.toFixed(2)} dB, voices ≤ ${r.maxVoices} (desktop Chromium)`;

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
