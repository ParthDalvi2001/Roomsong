// TC-AUD-05 (ADR-002): each voice, the six-plant mix, a 96-trigger stress case and a 24-bell overload are rendered
// through the real engine chain in an OfflineAudioContext; peak must stay ≤ −1 dBFS and output must be non-silent.
// Only the overload needs the master limiter (FR-MUS-06): those bells sum to about +16 dBFS before it and still to
// +1.4 dBFS after the compressor alone, so the case fails whenever the −1 dBFS ceiling is bypassed. It cannot tell
// whether the compressor ahead of the ceiling works: the ceiling alone holds the same peak, only more distorted.
// Two more renders check that a plant on the right or left of the bed really lands on that side (stereo pan by step).
// Runs in any browser (no user gesture needed for OfflineAudioContext); Node has no Web Audio, so this is
// exercised from the page (`?selftest=1`) and headless by `node scripts/offline-check.mjs`.
import {
  CEILING_DBFS,
  RINGS,
  SELFTEST_PAN_MIN_DB,
  SELFTEST_PEAK_TOLERANCE_DB,
  SELFTEST_RENDER_S,
  SELFTEST_SAMPLE_RATE,
  SELFTEST_SILENCE_DBFS,
  SELFTEST_STEP_LEFT,
  SELFTEST_STEP_RIGHT,
  SELFTEST_TRIGGER_AT_S,
  STEPS,
  VOICE_CAP,
} from './config';
import { AudioEngine } from './engine';
import { FIXED_PLANTS } from './garden';
import { Scheduler } from './scheduler';
import { WANDERER, type Plant } from './types';

export interface RenderCheck {
  name: string;
  peakDbfs: number;
  rmsDbfs: number;
  /** Right-channel RMS minus left-channel RMS, in dB. */
  balanceDb: number;
  pass: boolean;
}

export interface SelfTestResult {
  checks: RenderCheck[];
  pass: boolean;
  sampleRate: number;
}

const solo = (voice: Plant['voice'], ring: number, step = 0): Plant[] => [
  { id: `solo-${voice}`, voice, cell: { ring, step }, height: 1, hue: 0.5, plantedAt: 0 },
];

const tall = (plants: readonly Plant[]): Plant[] => plants.map((p) => ({ ...p, height: 1 }));

/** A full pool of the loudest voice at full height, on 24 different cells so the load is on both channels. */
const bellsAtCap = (): Plant[] =>
  Array.from({ length: VOICE_CAP }, (_, i) => ({
    id: `bell-${i}`,
    voice: 'bell',
    cell: { ring: i % RINGS, step: i % STEPS },
    height: 1,
    hue: 0.5,
    plantedAt: 0,
  }));

/** How a case fires its plants: each on its own step, all of them on every step, or all of them in one instant. */
type Firing = 'sweep' | 'everyStep' | 'once';

function measure(buf: AudioBuffer): { peakDbfs: number; rmsDbfs: number; balanceDb: number } {
  let peak = 0;
  const energy = [0, 0];
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      const v = d[i] as number;
      const a = Math.abs(v);
      if (a > peak) peak = a;
      energy[ch] = (energy[ch] as number) + v * v;
    }
  }
  const [left, right] = energy as [number, number];
  const db = (x: number): number => (x > 0 ? 20 * Math.log10(x) : -Infinity);
  return {
    peakDbfs: db(peak),
    rmsDbfs: db(Math.sqrt((left + right) / (2 * buf.length))),
    balanceDb: left > 0 && right > 0 ? 10 * Math.log10(right / left) : 0,
  };
}

/** `side`: +1 = the render must lean right, −1 = left, 0 = no balance requirement. */
async function renderCase(
  name: string,
  plants: readonly Plant[],
  firing: Firing,
  side = 0,
): Promise<RenderCheck> {
  const ctx = new OfflineAudioContext(
    2,
    Math.floor(SELFTEST_SAMPLE_RATE * SELFTEST_RENDER_S),
    SELFTEST_SAMPLE_RATE,
  );
  const engine = new AudioEngine();
  await engine.init(ctx);
  engine.setSignature(WANDERER);
  engine.setVolume(1, true);
  engine.syncPlants(plants);
  const stepDur = Scheduler.stepDurationFor(WANDERER.tempo);
  const steps = firing === 'once' ? 1 : STEPS;
  for (let step = 0; step < steps; step++) {
    const t = SELFTEST_TRIGGER_AT_S + step * stepDur;
    if (firing === 'sweep') engine.triggerStep(step, t);
    else engine.triggerAllPlants(t);
  }
  const rendered = await ctx.startRendering();
  const { peakDbfs, rmsDbfs, balanceDb } = measure(rendered);
  const onItsSide = side === 0 || side * balanceDb >= SELFTEST_PAN_MIN_DB;
  const pass =
    peakDbfs <= CEILING_DBFS + SELFTEST_PEAK_TOLERANCE_DB && rmsDbfs > SELFTEST_SILENCE_DBFS && onItsSide;
  return { name, peakDbfs, rmsDbfs, balanceDb, pass };
}

export async function runSelfTest(): Promise<SelfTestResult> {
  const checks: RenderCheck[] = [];
  checks.push(await renderCase('bell solo (ring 4, height 1)', solo('bell', 4), 'sweep'));
  checks.push(await renderCase('pad solo (ring 0, height 1)', solo('pad', 0), 'sweep'));
  checks.push(await renderCase('pluck solo (ring 2, height 1)', solo('pluck', 2), 'sweep'));
  checks.push(
    await renderCase(
      'bell at step 4: leans right by 6 dB or more',
      solo('bell', 2, SELFTEST_STEP_RIGHT),
      'sweep',
      1,
    ),
  );
  checks.push(
    await renderCase(
      'bell at step 12: leans left by 6 dB or more',
      solo('bell', 2, SELFTEST_STEP_LEFT),
      'sweep',
      -1,
    ),
  );
  checks.push(await renderCase('six fixed plants, one bar, volume 1', FIXED_PLANTS, 'sweep'));
  checks.push(
    await renderCase(
      'stress: 6 plants × 16 steps (96 triggers, cap 24), volume 1',
      tall(FIXED_PLANTS),
      'everyStep',
    ),
  );
  checks.push(
    await renderCase(
      'overload: 24 full-height bells in one instant, volume 1 (about +16 dBFS before the limiter)',
      bellsAtCap(),
      'once',
    ),
  );
  return { checks, pass: checks.every((c) => c.pass), sampleRate: SELFTEST_SAMPLE_RATE };
}

export function formatSelfTest(r: SelfTestResult): string {
  const lines = r.checks.map(
    (c) =>
      `TC-AUD-05 ${c.pass ? 'PASS' : 'FAIL'}  peak ${c.peakDbfs.toFixed(2)} dBFS  rms ${c.rmsDbfs.toFixed(1)} dBFS  ` +
      `R-L ${c.balanceDb >= 0 ? '+' : ''}${c.balanceDb.toFixed(1)} dB  ${c.name}`,
  );
  lines.push(
    `TC-AUD-05 OVERALL: ${r.pass ? 'PASS' : 'FAIL'} (ceiling ${CEILING_DBFS} dBFS, ${r.sampleRate} Hz offline render)`,
  );
  return lines.join('\n');
}
