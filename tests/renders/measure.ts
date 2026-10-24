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
 * The share of the energy above `hz` between `fromS` and `toS`, in dB (0 = all of it): the signal through a
 * 2nd-order Butterworth high-pass (RBJ cookbook biquad, Q = 1/√2) against the signal itself. The Listen sweep's
 * low-pass reach: the share above 4 kHz falls as the filter closes.
 */
export function shareAboveDb(
  channels: readonly Float32Array[],
  sampleRate: number,
  hz: number,
  fromS: number,
  toS: number,
): number {
  const w0 = (2 * Math.PI * hz) / sampleRate;
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
  const a0 = 1 + alpha;
  const b0 = (1 + Math.cos(w0)) / 2 / a0;
  const b1 = -(1 + Math.cos(w0)) / a0;
  const a1 = (-2 * Math.cos(w0)) / a0;
  const a2 = (1 - alpha) / a0;
  let total = 0;
  let above = 0;
  const lo = Math.round(fromS * sampleRate);
  for (const c of channels) {
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    const hi = Math.min(c.length, Math.round(toS * sampleRate));
    for (let i = lo; i < hi; i++) {
      const x0 = c[i] as number;
      const y0 = b0 * x0 + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
      total += x0 * x0;
      above += y0 * y0;
    }
  }
  return total > 0 ? 10 * Math.log10(above / total) : Number.NaN;
}

/** In-place iterative radix-2 FFT; `re.length` a power of two. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i] as number;
      re[i] = re[j] as number;
      re[j] = tr;
      const ti = im[i] as number;
      im[i] = im[j] as number;
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const wr = Math.cos((-2 * Math.PI) / len);
    const wi = Math.sin((-2 * Math.PI) / len);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const xr = (re[b] as number) * cr - (im[b] as number) * ci;
        const xi = (re[b] as number) * ci + (im[b] as number) * cr;
        re[b] = (re[a] as number) - xr;
        im[b] = (im[a] as number) - xi;
        re[a] = (re[a] as number) + xr;
        im[a] = (im[a] as number) + xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

/**
 * The spectral centroid of the mono sum between `fromS` and `toS`, in Hz: the magnitude-weighted mean frequency
 * of one Hann-windowed FFT over the whole window (zero-padded to a power of two). A brightness figure: the
 * Listen sweep's low-pass pulls it down. NaN when silent.
 */
export function spectralCentroidHz(
  channels: readonly Float32Array[],
  sampleRate: number,
  fromS: number,
  toS: number,
): number {
  const lo = Math.round(fromS * sampleRate);
  const hi = Math.min(channels[0]?.length ?? 0, Math.round(toS * sampleRate));
  const count = hi - lo;
  if (count <= 0) return Number.NaN;
  let n = 1;
  while (n < count) n <<= 1;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < count; i++) {
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (count - 1));
    let sum = 0;
    for (const c of channels) sum += c[lo + i] as number;
    re[i] = (hann * sum) / channels.length;
  }
  fft(re, im);
  let weighted = 0;
  let total = 0;
  for (let k = 0; k <= n / 2; k++) {
    const magnitude = Math.hypot(re[k] as number, im[k] as number);
    weighted += (k * sampleRate * magnitude) / n;
    total += magnitude;
  }
  return total > 0 ? weighted / total : Number.NaN;
}

/** From the first 10 ms window over −60 dBFS to the end of the last: a UI sound's start and length. NaN if none. */
export function activeSpanS(
  channels: readonly Float32Array[],
  sampleRate: number,
): { startS: number; endS: number } {
  const window = Math.round(SILENCE_WINDOW_S * sampleRate);
  const length = channels[0]?.length ?? 0;
  let startS = Number.NaN;
  let endS = Number.NaN;
  for (let start = 0; start + window <= length; start += window) {
    let sum = 0;
    for (const c of channels) for (let i = start; i < start + window; i++) sum += (c[i] as number) ** 2;
    if (db(Math.sqrt(sum / (window * channels.length))) < SILENCE_DBFS) continue;
    if (Number.isNaN(startS)) startS = start / sampleRate;
    endS = (start + window) / sampleRate;
  }
  return { startS, endS };
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
