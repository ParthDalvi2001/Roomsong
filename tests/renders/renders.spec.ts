// T-173 part 2a: `npm run audio:renders`, the render-and-measure tool of P-023, P-026 and P-027 (D-057). Chromium
// renders the app's audio engine in an OfflineAudioContext, as tests/e2e/09-audio.spec.ts does (the engine ticks
// on the offline clock at every 25 ms of audio time), and writes 48 kHz WAVs and the numbers to .tmp/renders/
// (git-ignored). Desktop Chromium: the numbers say what the mix is, not how it sounds on a headset.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { CEILING_DBFS, LATE_DROP_S, TICK_MS, VOICE_CAP } from '../../src/audio/config';
import { roomSignature, WANDERER } from '../../src/garden/signature';

import type { Measures } from './measure';
import type { SoundStyle } from '../../src/audio/styles';
import type { RoomSignature } from '../../src/garden/model';

type Voice = 'bell' | 'pad' | 'pluck' | 'bass' | 'choir';
/** T-164's styles A, B, C to choose between by ear; null = today's sound (Engine.setStyle). */
type Style = SoundStyle | null;
type UiSound = 'tick' | 'bump' | 'confirm' | 'removeRev' | 'undoFwd';

interface Scene {
  plants: { voice: Voice; ring: number; step: number }[];
  seconds: number;
  signature: RoomSignature;
  style?: Style;
  /** One UI sound at UI_AT_S, in whatever bed `plants` is. */
  ui?: UiSound;
  /** enterListen() and exitListen() at these audio times (the Listen sweep, SOUND_PASS §6). */
  listen?: { enterAtS: number; exitAtS: number };
  /** The panners lead nowhere: what is rendered is the reverb's return alone (as 09-audio.spec.ts). */
  wetOnly?: boolean;
  volume?: number;
  /** No tick from atS for ms: a stalled main thread. */
  stall?: { atS: number; ms: number };
  /** No scheduler: every step but stealStep in one burst at atS, then stealStep at stealAtS (a 25th note). */
  burst?: { atS: number; stealStep: number; stealAtS: number };
}

interface Numbers extends Measures {
  /** Notes started; how many of them after their time, the worst by how much, and how many skipped (LATE_DROP_S). */
  triggers: number;
  late: number;
  maxLateMs: number;
  dropped: number;
  longestSilenceS: number;
  /** The worst click, in dBFS, in the half second after the stall or the 0.1 s around the steal; the bed's RMS before it. */
  clickDbfs: number;
  clickAtS: number;
  bedBeforeDbfs: number;
  /** The most voices the engine reported at a tick; 0 with `burst`, which has no tick. */
  maxVoices: number;
  /** The first and the last sound over −60 dBFS (10 ms windows): a UI sound's start and end. NaN when silent. */
  soundStartS: number;
  soundEndS: number;
  renderMsPerS: number;
  /** With `listen`: the mix before, inside and after Listen, and the entry's deepest 50 ms dip. */
  listen?: ListenNumbers;
}

interface Band {
  rmsDbfs: number;
  /** The share of the energy above 4 kHz, in dB (0 = all of it): the sweep's low-pass closing. */
  above4kDb: number;
}

interface ListenNumbers {
  /** The 3 s before enterListen, the 3 s before exitListen, the last 3 s. */
  before: Band;
  inside: Band;
  after: Band;
  /** The deepest 50 ms window in the 2 s after enterListen against the deepest in the 2 s before, in dB: a pump or a dip. */
  entryMinDb: number;
}

const OUT = fileURLToPath(new URL('../../.tmp/renders/', import.meta.url));
const STYLES_MD = join(OUT, 'STYLES.md');
/** STYLE=A|B|C|null narrows P-023 to one style; the other groups take it, else today's sound. */
const STYLE_ENV = process.env.STYLE;
const STYLES: Style[] =
  STYLE_ENV === 'A' || STYLE_ENV === 'B' || STYLE_ENV === 'C'
    ? [STYLE_ENV]
    : STYLE_ENV === undefined
      ? [null, 'A', 'B', 'C']
      : [null];
const ONE_STYLE: Style = STYLES.length === 1 ? (STYLES[0] ?? null) : null;
const styleName = (style: Style): string => style ?? 'today';
/** Not on a tick's render quantum: a second suspend on one quantum throws. */
const UI_AT_S = 0.51;
/** SOUND_PASS_T164 §6: each UI sound's level against a new plant of its voice, and its release. */
const UI_TARGETS: Record<UiSound, string> = {
  tick: 'Bell −12 dB, 0.06 s',
  bump: 'Bass −8 dB, 0.12 s',
  confirm: 'Pluck −6 dB, 0.6 s, three notes 40 ms apart',
  removeRev: 'Bell −10 dB, 0.3 s, three notes 50 ms apart',
  undoFwd: 'Bell −10 dB, 0.3 s, three notes 50 ms apart',
};
const SAMPLE_RATE = 48000;
const PEAK_TOLERANCE_DB = 0.001;
const SILENCE_DBFS = -60;
/** As 09-audio.spec.ts: the bed 0.45 m ahead on a 0.74 m desk; a level head at 1.20 m looking down at it. */
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];
const HEAD = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.2, 0, 1];
/** The reference bed: two plants of each of the five voices, full height, hue 0.5. */
const FIVE_VOICES: Scene['plants'] = [
  { voice: 'bass', ring: 0, step: 0 },
  { voice: 'bass', ring: 0, step: 8 },
  { voice: 'pad', ring: 1, step: 0 },
  { voice: 'pad', ring: 2, step: 4 },
  { voice: 'choir', ring: 1, step: 6 },
  { voice: 'choir', ring: 2, step: 12 },
  { voice: 'pluck', ring: 3, step: 2 },
  { voice: 'pluck', ring: 4, step: 10 },
  { voice: 'bell', ring: 3, step: 8 },
  { voice: 'bell', ring: 4, step: 14 },
];
/** Three rooms through the real signature: E minorPent 0.3 s, D majorPent 0.9 s, A susPent 2.0 s. */
const ROOMS: Record<string, RoomSignature> = {
  wanderer: WANDERER,
  small: roomSignature({ level: 1, floorArea: 6, ceilingHeight: 2.4, roomVolume: 14.4, tableHeight: 0.74 }),
  medium: roomSignature({ level: 1, floorArea: 12, ceilingHeight: 2.7, roomVolume: 32, tableHeight: 0.74 }),
  large: roomSignature({ level: 1, floorArea: 40, ceilingHeight: 3.2, roomVolume: 128, tableHeight: 0.74 }),
};

function render(page: Page, scene: Scene): Promise<Numbers & { wav: string }> {
  return page.evaluate(
    async ({ scene, sampleRate, tickS, lateDropS, uiAtS, bed, head }) => {
      // The dev server serves and transforms both; a variable keeps eslint's resolver off the page-side paths.
      const engineUrl = '/src/audio/AudioEngine.ts';
      const measureUrl = '/tests/renders/measure.ts';
      const { Engine } = (await import(
        /* @vite-ignore */ engineUrl
      )) as typeof import('../../src/audio/AudioEngine');
      const M = (await import(/* @vite-ignore */ measureUrl)) as typeof import('./measure');

      const ctx = new OfflineAudioContext(2, Math.floor(sampleRate * scene.seconds), sampleRate);
      if (scene.wetOnly) {
        const createPanner = ctx.createPanner.bind(ctx);
        ctx.createPanner = () => Object.assign(createPanner(), { connect: (to: AudioNode) => to });
      }
      const engine = new Engine();
      engine.setTempo(scene.signature.tempo);
      engine.setVolume(scene.volume ?? 1);
      engine.setReverb('auto');
      engine.setSignature(scene.signature); // before init(): the response renders whole
      if (scene.style !== undefined) engine.setStyle(scene.style);
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

      let late = 0;
      let maxLateMs = 0;
      let dropped = 0;
      let maxVoices = 0;
      const trigger = engine.triggerStep.bind(engine);
      engine.triggerStep = (step, time, bar) => {
        const lateS = ctx.currentTime - time;
        if (lateS > lateDropS) dropped++;
        else if (lateS > 0) late++;
        maxLateMs = Math.max(maxLateMs, lateS * 1000);
        trigger(step, time, bar);
      };
      const tick = () => {
        engine.tick();
        maxVoices = Math.max(maxVoices, engine.stats.voices);
      };
      const { stall, burst } = scene;
      const stalled = (t: number) => stall !== undefined && t > stall.atS && t < stall.atS + stall.ms / 1000;
      if (burst === undefined) {
        tick();
        for (let k = 1; k * tickS < scene.seconds; k++) {
          if (stalled(k * tickS)) continue;
          void ctx.suspend(k * tickS).then(() => {
            tick();
            void ctx.resume();
          });
        }
        const ui = scene.ui;
        if (ui !== undefined) {
          void ctx.suspend(uiAtS).then(() => {
            // Engine.uiNotes plays nothing unless the context is 'running' (a real one with autoplay blocked would
            // stack sounds up); an offline context reads 'suspended' here, so the instance says 'running' for the call.
            Object.defineProperty(ctx, 'state', { value: 'running', configurable: true });
            engine.ui(ui);
            delete (ctx as { state?: unknown }).state;
            void ctx.resume();
          });
        }
        const listen = scene.listen;
        if (listen !== undefined) {
          void ctx.suspend(listen.enterAtS).then(() => {
            engine.enterListen();
            void ctx.resume();
          });
          void ctx.suspend(listen.exitAtS).then(() => {
            engine.exitListen();
            void ctx.resume();
          });
        }
      } else {
        for (let step = 0; step < 16; step++)
          if (step !== burst.stealStep) engine.triggerStep(step, burst.atS);
        void ctx.suspend(burst.stealAtS - 0.1).then(() => {
          engine.triggerStep(burst.stealStep, burst.stealAtS);
          maxVoices = engine.stats.voices;
          void ctx.resume();
        });
      }

      const r0 = performance.now();
      const buffer = await ctx.startRendering();
      const renderMsPerS = (performance.now() - r0) / scene.seconds;
      const ch = [buffer.getChannelData(0), buffer.getChannelData(1)];
      const eventAt = burst?.stealAtS ?? stall?.atS ?? Number.NaN;
      const window = burst === undefined ? [eventAt, eventAt + 0.5] : [eventAt - 0.05, eventAt + 0.05];
      const click = M.worstClick(ch, sampleRate, window[0] ?? 0, window[1] ?? 0);
      const slice = (from: number, to: number) =>
        ch.map((c) => c.subarray(Math.round(from * sampleRate), Math.round(to * sampleRate)));
      const bytes = M.wavBytes(ch, sampleRate);
      let ascii = '';
      for (let i = 0; i < bytes.length; i += 0x8000)
        ascii += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
      const span = M.activeSpanS(ch, sampleRate);
      const band = (from: number, to: number): Band => ({
        rmsDbfs: M.measure(slice(from, to), sampleRate).rmsDbfs,
        above4kDb: M.shareAboveDb(ch, sampleRate, 4000, from, to),
      });
      let listenNumbers: ListenNumbers | undefined;
      if (scene.listen !== undefined) {
        const { enterAtS: on, exitAtS: off } = scene.listen;
        // The bed has quiet 50 ms windows between notes anyway: the deepest after the entry against the deepest before.
        const deepestDb = (from: number, to: number): number => {
          let min = Infinity;
          for (let t = from; t + 0.05 <= to; t += 0.05) min = Math.min(min, band(t, t + 0.05).rmsDbfs);
          return min;
        };
        listenNumbers = {
          before: band(on - 3, on),
          inside: band(off - 3, off),
          after: band(scene.seconds - 3, scene.seconds),
          entryMinDb: deepestDb(on, on + 2) - deepestDb(on - 2, on),
        };
      }
      return {
        ...(listenNumbers === undefined ? {} : { listen: listenNumbers }),
        ...M.measure(ch, sampleRate),
        triggers: engine.stats.triggers,
        late,
        maxLateMs,
        dropped,
        longestSilenceS: M.longestSilenceS(ch, sampleRate, 0),
        clickDbfs: db(click.jump),
        clickAtS: click.atS,
        bedBeforeDbfs: Number.isNaN(eventAt)
          ? Number.NaN
          : M.measure(slice(eventAt - 0.15, eventAt - 0.05), sampleRate).rmsDbfs,
        maxVoices,
        soundStartS: span.startS,
        soundEndS: span.endS,
        renderMsPerS,
        wav: btoa(ascii),
      };
    },
    {
      scene,
      sampleRate: SAMPLE_RATE,
      tickS: TICK_MS / 1000,
      lateDropS: LATE_DROP_S,
      uiAtS: UI_AT_S,
      bed: BED,
      head: HEAD,
    },
  );
}

/** Renders, writes `<name>.wav`, prints the line and returns the numbers. */
async function renderTo(page: Page, name: string, scene: Scene): Promise<Numbers> {
  const { wav, ...numbers } = await render(page, scene);
  writeFileSync(join(OUT, `${name}.wav`), Buffer.from(wav, 'base64'));
  console.log(
    `${name}: ${numbers.lufs.toFixed(1)} LUFS, peak ${numbers.peakDbfs.toFixed(2)} dBFS, rms ${numbers.rmsDbfs.toFixed(1)} dBFS, ` +
      `R-L ${numbers.rightMinusLeftDb.toFixed(2)} dB, ${numbers.triggers} notes, voices ≤ ${numbers.maxVoices}, ` +
      `${numbers.renderMsPerS.toFixed(0)} ms/s`,
  );
  return numbers;
}

function writeJson(name: string, value: unknown): void {
  writeFileSync(join(OUT, name), JSON.stringify(value, null, 2));
}

/** STYLES.md is one `## ` section per group, each rewritten by its own test: a `-g` run leaves the others as they were. */
function writeSection(title: string, body: string[]): void {
  const head = '# Renders (T-173 part 2a, desktop Chromium; today = style null)';
  const old = existsSync(STYLES_MD) ? readFileSync(STYLES_MD, 'utf8') : '';
  const kept = old
    .split(/\n(?=## )/)
    .slice(1) // whatever the head was
    .map((s) => s.trimEnd())
    .filter((s) => !s.startsWith(`## ${title}`));
  const section = [`## ${title}`, '', ...body].join('\n');
  writeFileSync(STYLES_MD, `${[head, ...kept, section].join('\n\n')}\n`);
}

/** Under the −1 dBFS ceiling and not silent. */
function expectBounded(r: Numbers): void {
  expect(r.peakDbfs).toBeLessThanOrEqual(CEILING_DBFS + PEAK_TOLERANCE_DB);
  expect(r.rmsDbfs).toBeGreaterThan(SILENCE_DBFS);
  expect(r.maxVoices).toBeLessThanOrEqual(VOICE_CAP);
}

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));
test.beforeEach(({ page }) => page.goto('/proto/styles/'));

test('P-023 five-voice reference renders: each style in the Wanderer and three rooms, 60 s; the Bass against the Bell', async ({
  page,
}) => {
  const results: Record<string, { signature: RoomSignature; bassMinusBellLu: number } & Numbers> = {};
  const rows: string[] = [];
  for (const style of STYLES) {
    for (const [room, signature] of Object.entries(ROOMS)) {
      const name = `${styleName(style)}-${room}`;
      const r = await renderTo(page, `p023-${name}`, { plants: FIVE_VOICES, seconds: 60, signature, style });
      expectBounded(r);
      // The two voices solo in their own cells, 10 s each: P-023 says the Bass is about 5 dB above the Bell.
      const solo = async (voice: Voice): Promise<number> =>
        (
          await render(page, {
            plants: FIVE_VOICES.filter((p) => p.voice === voice),
            seconds: 10,
            signature,
            style,
          })
        ).lufs;
      const bassMinusBellLu = (await solo('bass')) - (await solo('bell'));
      console.log(`  bass − bell ${bassMinusBellLu.toFixed(1)} LU (solos)`);
      results[name] = { signature, bassMinusBellLu, ...r };
      rows.push(
        `| ${styleName(style)} | ${room} | ${r.lufs.toFixed(1)} | ${r.peakDbfs.toFixed(2)} | ` +
          `${r.rightMinusLeftDb.toFixed(2)} | ${bassMinusBellLu.toFixed(1)} |`,
      );
    }
  }
  writeJson('p023.json', results);
  writeSection('Styles × rooms', [
    `${new Date().toISOString().slice(0, 10)}; the five-voice bed, 60 s; Bass − Bell from each voice solo, 10 s.`,
    '',
    '| Style | Room | LUFS | Peak dBFS | R−L dB | Bass − Bell LU (solos) |',
    '|---|---|---|---|---|---|',
    ...rows,
  ]);
});

test('UI sounds in an empty bed: the peak and the length of each (SOUND_PASS_T164 §6)', async ({ page }) => {
  const results: Record<string, Numbers> = {};
  const rows: string[] = [];
  for (const ui of ['tick', 'bump', 'confirm', 'removeRev', 'undoFwd'] as const) {
    const r = await renderTo(page, `ui-${ui}`, {
      plants: [],
      seconds: 3,
      signature: WANDERER,
      style: ONE_STYLE,
      ui,
    });
    expect(r.peakDbfs).toBeLessThanOrEqual(CEILING_DBFS + PEAK_TOLERANCE_DB);
    expect(r.peakDbfs).toBeGreaterThan(SILENCE_DBFS); // the sound exists (T-164 built it)
    results[ui] = r;
    const length = r.soundEndS - r.soundStartS;
    rows.push(`| ${ui} | ${r.peakDbfs.toFixed(1)} | ${length.toFixed(2)} | ${UI_TARGETS[ui]} |`);
    console.log(`UI ${rows[rows.length - 1]}`);
  }
  writeJson('ui.json', results);
  writeSection('UI sounds', [
    `Style ${styleName(ONE_STYLE)}; ui() at ${UI_AT_S} s in an empty bed. Length: first to last 10 ms window over −60 dBFS, so it holds the reverb tail.`,
    '',
    '| Sound | Peak dBFS | Length s | §6 (level vs a new plant of its voice, release) |',
    '|---|---|---|---|',
    ...rows,
  ]);
});

test('Listen sweep: enterListen at 5 s, exitListen at 15 s, 20 s (SOUND_PASS_T164 §6)', async ({ page }) => {
  const scene: Scene = {
    plants: FIVE_VOICES,
    seconds: 20,
    signature: WANDERER,
    style: ONE_STYLE,
    listen: { enterAtS: 5.01, exitAtS: 15.01 }, // off a tick's render quantum, as UI_AT_S
  };
  const mix = await renderTo(page, 'listen-sweep', scene);
  expectBounded(mix);
  const wet = await render(page, { ...scene, wetOnly: true });
  const l = mix.listen as ListenNumbers;
  const w = wet.listen as ListenNumbers;
  const f = (x: number) => x.toFixed(1);
  const lines = [
    `- mix RMS before / inside / after: ${f(l.before.rmsDbfs)} / ${f(l.inside.rmsDbfs)} / ${f(l.after.rmsDbfs)} dBFS ` +
      `(inside − before ${f(l.inside.rmsDbfs - l.before.rmsDbfs)} dB; §6: −3 dB plus what the low-pass takes)`,
    `- share above 4 kHz before / inside / after: ${f(l.before.above4kDb)} / ${f(l.inside.above4kDb)} / ${f(l.after.above4kDb)} dB`,
    `- reverb return alone (panners cut) before / inside: ${f(w.before.rmsDbfs)} / ${f(w.inside.rmsDbfs)} dBFS ` +
      `(${f(w.inside.rmsDbfs - w.before.rmsDbfs)} dB; the send 0.28 → 0.35 is +1.9 dB before the dim and the low-pass)`,
    `- entry: deepest 50 ms window in the 2 s after enterListen ${f(l.entryMinDb)} dB against the deepest in the 2 s before (a smooth −3 dB dim reads about −3)`,
  ];
  for (const line of lines) console.log(`Listen ${line}`);
  writeJson('listen.json', { mix, wet: { ...wet, wav: undefined } });
  writeSection('Listen sweep', [
    `Style ${styleName(ONE_STYLE)}; the five-voice bed; windows [2,5), [12,15), [17,20) s. The sweep closes over 16 bars (46 s at 84 BPM): 10 s in Listen shows its start.`,
    '',
    ...lines,
  ]);
});

test('P-026 same key and seed, only the reverb changing: blind ABX pairs 1.2 vs 1.6 s and 1.6 vs 2.0 s, 30 s', async ({
  page,
}) => {
  const rendered = new Map<number, Numbers & { wav: string }>();
  for (const reverbRt60 of [1.2, 1.6, 2.0]) {
    const r = await render(page, {
      plants: FIVE_VOICES,
      seconds: 30,
      signature: { ...WANDERER, reverbRt60 },
      style: ONE_STYLE,
    });
    expectBounded(r);
    rendered.set(reverbRt60, r);
    console.log(`P-026 rt60 ${reverbRt60} s: ${r.lufs.toFixed(1)} LUFS, peak ${r.peakDbfs.toFixed(2)} dBFS`);
  }
  // Which decay is X and which is Y is drawn here and kept in abx-key.json only: read it after the test.
  const key: Record<string, { X: number; Y: number }> = {};
  const pairs = [
    [1.2, 1.6],
    [1.6, 2.0],
  ];
  pairs.forEach(([a = 0, b = 0], i) => {
    const sides = Math.random() < 0.5 ? { X: b, Y: a } : { X: a, Y: b };
    for (const [side, rt60] of Object.entries(sides)) {
      writeFileSync(
        join(OUT, `abx-${i + 1}-${side}.wav`),
        Buffer.from(rendered.get(rt60)?.wav ?? '', 'base64'),
      );
    }
    key[`abx-${i + 1}`] = sides;
  });
  writeJson('abx-key.json', key);
  writeJson(
    'p026.json',
    Object.fromEntries([...rendered].map(([rt60, r]) => [rt60, { ...r, wav: undefined }])),
  );
});

test('P-027 stress: main-thread stalls of 50/95/120/200 ms, and a steal in a near-silent bed', async ({
  page,
}) => {
  const style = ONE_STYLE;
  const base = await renderTo(page, 'p027-base', {
    plants: FIVE_VOICES,
    seconds: 10,
    signature: WANDERER,
    style,
  });
  const results: Record<string, Numbers> = { base };
  const lines: string[] = [];
  for (const ms of [50, 95, 120, 200]) {
    const r = await renderTo(page, `p027-stall-${ms}`, {
      plants: FIVE_VOICES,
      seconds: 10,
      signature: WANDERER,
      style,
      stall: { atS: 4, ms },
    });
    expectBounded(r);
    lines.push(
      `- stall ${ms} ms: ${r.late} late (worst ${r.maxLateMs.toFixed(1)} ms), ${r.dropped} dropped, ` +
        `${base.triggers - r.triggers} notes fewer than without, longest silence ${r.longestSilenceS.toFixed(2)} s ` +
        `(without: ${base.longestSilenceS.toFixed(2)} s), worst click after it ${r.clickDbfs.toFixed(1)} dBFS`,
    );
    console.log(`P-027 ${lines[lines.length - 1]}`);
    results[`stall${ms}`] = r;
  }
  // 24 pads sound at 1 s; a 25th at 1.6 s steals the oldest-quietest (STEAL_FADE_S, STEAL_FADE_TAUS: e⁻⁴ left).
  const pads: Scene['plants'] = Array.from({ length: VOICE_CAP }, (_, i) => ({
    voice: 'pad',
    ring: i % 5,
    step: i % 15,
  }));
  pads.push({ voice: 'pad', ring: 2, step: 15 });
  const steal = await renderTo(page, 'p027-steal', {
    plants: pads,
    seconds: 4,
    signature: WANDERER,
    style,
    volume: 0.1,
    burst: { atS: 1, stealStep: 15, stealAtS: 1.6 },
  });
  expectBounded(steal);
  expect(steal.triggers).toBe(VOICE_CAP + 1);
  const residualDb = steal.clickDbfs - steal.bedBeforeDbfs;
  lines.push(
    `- steal: bed ${steal.bedBeforeDbfs.toFixed(1)} dBFS rms before, worst click ${steal.clickDbfs.toFixed(1)} dBFS ` +
      `at ${steal.clickAtS.toFixed(3)} s: residual ${residualDb.toFixed(1)} dB below the bed`,
  );
  console.log(`P-027 ${lines[lines.length - 1]}`);
  results.steal = { ...steal, residualDb } as Numbers;
  writeJson('p027.json', results);
  writeSection('Stress', [
    `Style ${styleName(style)}; stalls at 4 s in the five-voice bed, 10 s; the steal at volume 0.1.`,
    '',
    ...lines,
  ]);
});
