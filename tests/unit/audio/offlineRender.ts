// T-164: a small sample-by-sample stand-in for an OfflineAudioContext, so a unit test can hear a voice in Node (it
// has no Web Audio). It runs the nodes the voices and the limiter use, by the Web Audio spec's formulas: oscillators
// (band-limited wavetables; a PeriodicWave scaled to a peak of 1 unless disableNormalization), gains, biquads
// (lowpass and highpass Q in dB, bandpass Q plain), buffer sources, the wave-shaper (no oversampling) and AudioParam
// automation (set, linear, exponential, target) plus audio-rate inputs. MDN: OfflineAudioContext, AudioParam,
// BiquadFilterNode, PeriodicWave, WaveShaperNode.
// shortcut: the compressor is a static soft-knee curve with a peak detector and Chromium's make-up formula
// (pow(1/gain at 0 dBFS, 0.6)), not Chromium's kernel; levels before it are exact, its reduction is approximate.
// Upgrade to the browser render (npm run audio:renders) for a reduction figure that matters.

type Event = { type: 'set' | 'linear' | 'exp' | 'target'; value: number; time: number; tau: number };

class Param {
  readonly events: Event[] = [];
  readonly inputs: Node[] = [];
  constructor(public value: number) {}
  setValueAtTime(value: number, time: number): this {
    return this.add({ type: 'set', value, time, tau: 0 });
  }
  linearRampToValueAtTime(value: number, time: number): this {
    return this.add({ type: 'linear', value, time, tau: 0 });
  }
  exponentialRampToValueAtTime(value: number, time: number): this {
    return this.add({ type: 'exp', value, time, tau: 0 });
  }
  setTargetAtTime(value: number, time: number, tau: number): this {
    return this.add({ type: 'target', value, time, tau });
  }
  private add(e: Event): this {
    this.events.push(e);
    this.events.sort((a, b) => a.time - b.time); // stable: equal times keep their call order
    return this;
  }
  at(t: number, i: number): number {
    let v = this.value;
    let from = 0; // where the current segment starts
    let target: Event | null = null;
    const now = (x: number): number =>
      target === null ? v : target.value + (v - target.value) * Math.exp(-(x - target.time) / target.tau);
    for (const e of this.events) {
      if (e.type === 'linear' || e.type === 'exp') {
        if (t < e.time) {
          const v0 = now(from);
          const u = (t - from) / (e.time - from);
          v = e.type === 'linear' ? v0 + (e.value - v0) * u : v0 * Math.pow(e.value / v0, u);
          target = null;
          return v + this.sum(i);
        }
        v = e.value;
        target = null;
        from = e.time;
      } else {
        if (e.time > t) break;
        if (e.type === 'set') {
          v = e.value;
          target = null;
        } else {
          v = now(e.time);
          target = e;
        }
        from = e.time;
      }
    }
    return now(t) + this.sum(i);
  }
  private sum(i: number): number {
    let s = 0;
    for (const n of this.inputs) s += n.out(i);
    return s;
  }
}

abstract class Node {
  readonly inputs: Node[] = [];
  private last = -1;
  private cached = 0;
  constructor(protected readonly ctx: MiniContext) {}
  connect<T>(dest: T): T {
    if (dest instanceof Param) dest.inputs.push(this);
    else (dest as unknown as Node).inputs.push(this);
    return dest;
  }
  disconnect(): void {}
  out(i: number): number {
    if (i !== this.last) {
      this.last = i;
      this.cached = this.compute(i, i / this.ctx.sampleRate);
    }
    return this.cached;
  }
  protected input(i: number): number {
    let s = 0;
    for (const n of this.inputs) s += n.out(i);
    return s;
  }
  protected abstract compute(i: number, t: number): number;
}

class Gain extends Node {
  readonly gain = new Param(1);
  protected compute(i: number, t: number): number {
    return this.input(i) * this.gain.at(t, i);
  }
}

class Biquad extends Node {
  type: 'lowpass' | 'highpass' | 'bandpass' = 'lowpass';
  readonly frequency = new Param(350);
  readonly Q = new Param(1);
  readonly gain = new Param(0);
  readonly detune = new Param(0);
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;
  protected compute(i: number, t: number): number {
    const sr = this.ctx.sampleRate;
    const f0 = Math.min(this.frequency.at(t, i) * Math.pow(2, this.detune.at(t, i) / 1200), sr / 2);
    const w0 = (2 * Math.PI * f0) / sr;
    const cos = Math.cos(w0);
    const q = this.Q.at(t, i);
    const alpha =
      this.type === 'bandpass' ? Math.sin(w0) / (2 * q) : Math.sin(w0) / (2 * Math.pow(10, q / 20));
    let b0: number, b1: number, b2: number;
    if (this.type === 'lowpass') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
    else if (this.type === 'highpass') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
    else [b0, b1, b2] = [alpha, 0, -alpha];
    const a0 = 1 + alpha;
    const x = this.input(i);
    const y = (b0 * x + b1 * this.x1 + b2 * this.x2 + 2 * cos * this.y1 - (1 - alpha) * this.y2) / a0;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

class Wave {
  constructor(
    readonly real: Float32Array,
    readonly imag: Float32Array,
    readonly normalize: boolean,
  ) {}
}

const TABLE = 4096;

abstract class Source extends Node {
  protected startAt = Infinity;
  protected stopAt = Infinity;
  start(when = 0): void {
    this.startAt = when;
  }
  stop(when = 0): void {
    this.stopAt = when;
  }
  protected compute(i: number, t: number): number {
    return t < this.startAt || t >= this.stopAt ? 0 : this.play(i, t);
  }
  protected abstract play(i: number, t: number): number;
}

class Oscillator extends Source {
  type: 'sine' | 'sawtooth' | 'square' | 'triangle' | 'custom' = 'sine';
  readonly frequency = new Param(440);
  readonly detune = new Param(0);
  private wave: Wave | null = null;
  private table: Float64Array | null = null;
  private phase = 0;
  setPeriodicWave(w: PeriodicWave): void {
    this.wave = w as unknown as Wave;
    this.type = 'custom';
  }
  /** One cycle with the partials under Nyquist at the note's starting pitch. */
  private build(hz: number): Float64Array {
    const kMax = Math.max(1, Math.floor(this.ctx.sampleRate / 2 / Math.max(hz, 1)));
    const t = new Float64Array(TABLE);
    for (let k = 1; k <= kMax; k++) {
      let a = 0;
      let b = 0;
      if (this.wave !== null) {
        a = this.wave.real[k] ?? 0;
        b = this.wave.imag[k] ?? 0;
      } else if (this.type === 'sawtooth') b = (2 / (Math.PI * k)) * (k % 2 === 1 ? 1 : -1);
      else if (this.type === 'square') b = k % 2 === 1 ? 4 / (Math.PI * k) : 0;
      else if (this.type === 'triangle')
        b = k % 2 === 1 ? (8 / (Math.PI * k) ** 2) * ((k - 1) % 4 === 0 ? 1 : -1) : 0;
      if (a === 0 && b === 0) continue;
      for (let n = 0; n < TABLE; n++) {
        const th = (2 * Math.PI * k * n) / TABLE;
        t[n] = (t[n] as number) + a * Math.cos(th) + b * Math.sin(th);
      }
    }
    if (this.wave === null || this.wave.normalize) {
      let peak = 0;
      for (const x of t) peak = Math.max(peak, Math.abs(x));
      if (peak > 0) for (let n = 0; n < TABLE; n++) t[n] = (t[n] as number) / peak;
    }
    return t;
  }
  protected play(i: number, t: number): number {
    const hz = this.frequency.at(t, i) * Math.pow(2, this.detune.at(t, i) / 1200);
    let y: number;
    if (this.type === 'sine') y = Math.sin(2 * Math.PI * this.phase);
    else {
      this.table ??= this.build(hz);
      const p = this.phase * TABLE;
      const n = Math.floor(p);
      const f = p - n;
      y = (this.table[n % TABLE] as number) * (1 - f) + (this.table[(n + 1) % TABLE] as number) * f;
    }
    this.phase += hz / this.ctx.sampleRate;
    this.phase -= Math.floor(this.phase);
    return y;
  }
}

class Buffer {
  private readonly data: Float32Array;
  constructor(
    readonly length: number,
    readonly sampleRate: number,
  ) {
    this.data = new Float32Array(length);
  }
  getChannelData(): Float32Array {
    return this.data;
  }
}

class BufferSource extends Source {
  buffer: Buffer | null = null;
  readonly playbackRate = new Param(1);
  private pos = 0;
  protected play(i: number, t: number): number {
    const d = this.buffer?.getChannelData();
    if (d === undefined || this.pos >= d.length - 1) return 0;
    const n = Math.floor(this.pos);
    const f = this.pos - n;
    this.pos += this.playbackRate.at(t, i);
    return (d[n] as number) * (1 - f) + (d[n + 1] as number) * f;
  }
}

class Shaper extends Node {
  curve: Float32Array | null = null;
  oversample = 'none';
  protected compute(i: number): number {
    const x = this.input(i);
    const c = this.curve;
    if (c === null) return x;
    const v = ((c.length - 1) / 2) * (Math.max(-1, Math.min(1, x)) + 1);
    const n = Math.min(Math.floor(v), c.length - 2);
    const f = v - n;
    return (c[n] as number) * (1 - f) + (c[n + 1] as number) * f;
  }
}

class Compressor extends Node {
  readonly threshold = new Param(-24);
  readonly knee = new Param(30);
  readonly ratio = new Param(12);
  readonly attack = new Param(0.003);
  readonly release = new Param(0.25);
  private env = 0;
  /** dB in → dB out of the static curve: a quadratic knee centred on threshold + knee/2. */
  private curveDb(x: number): number {
    const T = this.threshold.value;
    const K = this.knee.value;
    const R = this.ratio.value;
    const lo = T;
    const hi = T + K;
    if (x <= lo) return x;
    if (x >= hi) return T + K / 2 + (x - hi) / R + K / (2 * R);
    return x + ((1 / R - 1) * (x - lo) ** 2) / (2 * K);
  }
  protected compute(i: number): number {
    const x = this.input(i);
    const sr = this.ctx.sampleRate;
    const a = Math.abs(x);
    const tau = a > this.env ? this.attack.value : this.release.value;
    this.env += (a - this.env) * (1 - Math.exp(-1 / (tau * sr)));
    const inDb = this.env > 1e-9 ? 20 * Math.log10(this.env) : -180;
    const makeup = Math.pow(1 / Math.pow(10, this.curveDb(0) / 20), 0.6);
    return x * Math.pow(10, (this.curveDb(inDb) - inDb) / 20) * makeup;
  }
}

class Destination extends Node {
  protected compute(i: number): number {
    return this.input(i);
  }
}

export class MiniContext {
  readonly currentTime = 0;
  readonly destination: Destination;
  constructor(readonly sampleRate = 48000) {
    this.destination = new Destination(this);
  }
  createGain(): Gain {
    return new Gain(this);
  }
  createBiquadFilter(): Biquad {
    return new Biquad(this);
  }
  createOscillator(): Oscillator {
    return new Oscillator(this);
  }
  createBufferSource(): BufferSource {
    return new BufferSource(this);
  }
  createBuffer(_channels: number, length: number, sampleRate: number): Buffer {
    return new Buffer(length, sampleRate);
  }
  createPeriodicWave(real: Float32Array, imag: Float32Array, o?: { disableNormalization?: boolean }): Wave {
    return new Wave(real, imag, o?.disableNormalization !== true);
  }
  createWaveShaper(): Shaper {
    return new Shaper(this);
  }
  createDynamicsCompressor(): Compressor {
    return new Compressor(this);
  }
  /** Pull `seconds` of what reaches `node` (the destination by default). */
  render(seconds: number, node: { out(i: number): number } = this.destination): Float32Array {
    const y = new Float32Array(Math.round(seconds * this.sampleRate));
    for (let i = 0; i < y.length; i++) y[i] = node.out(i);
    return y;
  }
}

/** The context as the code under test types it. */
export const asCtx = (c: MiniContext): BaseAudioContext => c as unknown as BaseAudioContext;
