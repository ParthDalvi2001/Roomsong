// T-173 part 2a (P-023, P-026, P-027): the measures and the WAV writer of `npm run audio:renders`. Pure functions
// on sample arrays: they run in Node (tests/unit/renders/measure.test.ts checks them on a known sine) and in the
// page that renders the engine (renders.spec.ts imports this file from the dev server).

export interface Measures {
  peakDbfs: number;
  /** RMS of both channels together, in dBFS. */
  rmsDbfs: number;
  /** Integrated loudness, ITU-R BS.1770-4 (K-weighting, 400 ms blocks, −70 LUFS and −10 LU gates). */
  lufs: number;
  /** Right-channel energy over left-channel energy, in dB; NaN when one side is silent. */
  rightMinusLeftDb: number;
}

const db = (x: number): number => (x > 0 ? 20 * Math.log10(x) : -Infinity);

/** BS.1770-4 K-weighting, the coefficients the standard gives for 48 kHz: the shelf, then the RLB high-pass. */
const K_48K = [
  {
    b0: 1.53512485958697,
    b1: -2.69169618940638,
    b2: 1.19839281085285,
    a1: -1.69065929318241,
    a2: 0.73248077421585,
  },
  { b0: 1, b1: -2, b2: 1, a1: -1.99004745483398, a2: 0.99007225036621 },
];
const LUFS_OFFSET = -0.691;
const BLOCK_S = 0.4;
const HOP_S = 0.1;
const ABSOLUTE_GATE_LUFS = -70;
const RELATIVE_GATE_LU = -10;

function kWeighted(x: Float32Array): Float64Array {
  const y = Float64Array.from(x);
  for (const { b0, b1, b2, a1, a2 } of K_48K) {
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < y.length; i++) {
      const x0 = y[i] as number;
      const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
      y[i] = y0;
    }
  }
  return y;
}

// shortcut: the K-filter coefficients are the 48 kHz ones, every render here is 48 kHz; derive them when not.
export function integratedLufs(channels: readonly Float32Array[], sampleRate: number): number {
  if (sampleRate !== 48000) throw new Error('integratedLufs: 48 kHz only');
  const weighted = channels.map(kWeighted);
  const block = Math.round(BLOCK_S * sampleRate);
  const hop = Math.round(HOP_S * sampleRate);
  const loudness = (z: number) => LUFS_OFFSET + 10 * Math.log10(z);
  const mean = (zs: number[]) => zs.reduce((a, b) => a + b, 0) / zs.length;
  const blocks: number[] = []; // the sum over channels of each block's mean square
  for (let start = 0; start + block <= (weighted[0]?.length ?? 0); start += hop) {
    let sum = 0;
    for (const c of weighted) for (let i = start; i < start + block; i++) sum += (c[i] as number) ** 2;
    blocks.push(sum / block);
  }
  const heard = blocks.filter((z) => loudness(z) > ABSOLUTE_GATE_LUFS);
  if (heard.length === 0) return -Infinity;
  const gate = loudness(mean(heard)) + RELATIVE_GATE_LU;
  const gated = heard.filter((z) => loudness(z) > gate);
  return gated.length === 0 ? -Infinity : loudness(mean(gated));
}

export function measure(channels: readonly Float32Array[], sampleRate: number): Measures {
  let peak = 0;
  const energy = channels.map((samples) => {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i] as number;
      if (Math.abs(v) > peak) peak = Math.abs(v);
      sum += v * v;
    }
    return sum;
  });
  const [left = 0, right = 0] = energy;
  const length = (channels[0]?.length ?? 0) * channels.length;
  return {
    peakDbfs: db(peak),
    rmsDbfs: db(Math.sqrt(energy.reduce((a, b) => a + b, 0) / Math.max(1, length))),
    lufs: integratedLufs(channels, sampleRate),
    rightMinusLeftDb: left > 0 && right > 0 ? 10 * Math.log10(right / left) : Number.NaN,
  };
}

const SILENCE_WINDOW_S = 0.01;
const SILENCE_DBFS = -60;

/** The longest stretch, after the first sound from `fromS`, whose 10 ms windows all read under −60 dBFS. */
export function longestSilenceS(
  channels: readonly Float32Array[],
  sampleRate: number,
  fromS: number,
): number {
  const window = Math.round(SILENCE_WINDOW_S * sampleRate);
  const length = channels[0]?.length ?? 0;
  let heard = false;
  let run = 0;
  let longest = 0;
  for (let start = Math.round(fromS * sampleRate); start + window <= length; start += window) {
    let sum = 0;
    for (const c of channels) for (let i = start; i < start + window; i++) sum += (c[i] as number) ** 2;
    const silent = db(Math.sqrt(sum / (window * channels.length))) < SILENCE_DBFS;
    if (!silent) heard = true;
    run = silent && heard ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest * SILENCE_WINDOW_S;
}

/**
 * The largest click between `fromS` and `toS` (as tests/e2e/09-audio.spec.ts): the biggest sample-to-sample jump,
 * either channel, less the larger of the two jumps on each side of it. A step is one jump far above its
 * neighbours; a loud high note is not.
 */
export function worstClick(
  channels: readonly Float32Array[],
  sampleRate: number,
  fromS: number,
  toS: number,
): { jump: number; atS: number } {
  let worst = 0;
  let atS = Number.NaN;
  const lo = Math.max(3, Math.round(fromS * sampleRate));
  for (const samples of channels) {
    const hi = Math.min(samples.length - 2, Math.round(toS * sampleRate));
    const jump = (i: number) => Math.abs((samples[i] as number) - (samples[i - 1] as number));
    for (let i = lo; i < hi; i++) {
      const click = jump(i) - Math.max(jump(i - 2), jump(i - 1), jump(i + 1), jump(i + 2));
      if (click > worst) {
        worst = click;
        atS = i / sampleRate;
      }
    }
  }
  return { jump: worst, atS };
}

/** 16-bit PCM WAV, interleaved, clipped at ±1: the format every player and ABX tool takes. */
export function wavBytes(channels: readonly Float32Array[], sampleRate: number): Uint8Array {
  const frames = channels[0]?.length ?? 0;
  const blockAlign = channels.length * 2;
  const dataBytes = frames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const v = new DataView(buffer);
  const ascii = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, channels.length, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * blockAlign, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, 16, true);
  ascii(36, 'data');
  v.setUint32(40, dataBytes, true);
  let at = 44;
  for (let i = 0; i < frames; i++) {
    for (const c of channels) {
      v.setInt16(at, Math.round(Math.max(-1, Math.min(1, c[i] ?? 0)) * 32767), true);
      at += 2;
    }
  }
  return new Uint8Array(buffer);
}
