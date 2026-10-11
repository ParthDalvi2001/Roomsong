// Master limiter (FR-MUS-06, LLD §7.1): a compressor does the level control and a wave-shaper after it is the
// ceiling. A compressor alone cannot hold a ceiling: it adds make-up gain and overshoots during its attack.
import {
  CEILING_CURVE_POINTS,
  CEILING_DBFS,
  CEILING_KNEE,
  LIMITER_ATTACK_S,
  LIMITER_KNEE_DB,
  LIMITER_RATIO,
  LIMITER_RELEASE_S,
  LIMITER_THRESHOLD_DB,
} from './config.js';
import { dbToGain } from './mapping.js';

/** Soft ceiling at −1 dBFS: linear below the knee, tanh approach above; never reaches the ceiling (FR-MUS-06). */
export function makeCeilingCurve(points = CEILING_CURVE_POINTS): Float32Array<ArrayBuffer> {
  const c = dbToGain(CEILING_DBFS);
  const k = CEILING_KNEE * c;
  const curve = new Float32Array(new ArrayBuffer(points * Float32Array.BYTES_PER_ELEMENT));
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= k ? a : k + (c - k) * Math.tanh((a - k) / (c - k));
    curve[i] = x < 0 ? -y : y;
  }
  return curve;
}

/** The two nodes, connected. The mix goes into `input`; `output` is the last node before the destination. */
export function createLimiter(ctx: BaseAudioContext): {
  input: DynamicsCompressorNode;
  output: WaveShaperNode;
} {
  const input = ctx.createDynamicsCompressor();
  input.threshold.value = LIMITER_THRESHOLD_DB;
  input.knee.value = LIMITER_KNEE_DB;
  input.ratio.value = LIMITER_RATIO;
  input.attack.value = LIMITER_ATTACK_S;
  input.release.value = LIMITER_RELEASE_S;
  const output = ctx.createWaveShaper();
  output.curve = makeCeilingCurve();
  output.oversample = 'none'; // sample-exact ceiling; the compressor ahead of it does the musical work
  input.connect(output);
  return { input, output };
}
