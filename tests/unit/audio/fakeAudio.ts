// A recording stand-in for the Web Audio API: Node has none. It keeps what the code under test asked for (nodes
// made, connections, parameter events, start and stop times) and renders nothing. Like the real API it throws on a
// value that is not finite, on a second start() and on a stop() before start(), so those mistakes fail a test.
import { vi } from 'vitest';

export interface ParamEvent {
  type: 'set' | 'linear' | 'exp' | 'target' | 'cancel' | 'hold';
  value: number;
  time: number;
  tau: number;
}

function finite(...values: number[]): void {
  for (const v of values) {
    if (!Number.isFinite(v)) throw new TypeError(`The provided float value is non-finite: ${v}`);
  }
}

export class FakeParam {
  readonly events: ParamEvent[] = [];
  automationRate: AutomationRate = 'a-rate';
  private current: number;

  constructor(value = 0) {
    this.current = value;
  }

  get value(): number {
    return this.current;
  }
  set value(v: number) {
    // Checked in place, with no call that takes a rest array: a heap probe writes these a million times.
    if (!Number.isFinite(v)) throw new TypeError(`The provided float value is non-finite: ${v}`);
    this.current = v;
  }

  setValueAtTime(value: number, time: number): this {
    return this.record('set', value, time);
  }
  linearRampToValueAtTime(value: number, time: number): this {
    return this.record('linear', value, time);
  }
  exponentialRampToValueAtTime(value: number, time: number): this {
    return this.record('exp', value, time);
  }
  setTargetAtTime(value: number, time: number, tau: number): this {
    return this.record('target', value, time, tau);
  }
  cancelScheduledValues(time: number): this {
    return this.record('cancel', 0, time);
  }
  cancelAndHoldAtTime(time: number): this {
    return this.record('hold', 0, time);
  }

  /** The last event of a kind, or undefined. */
  last(type: ParamEvent['type']): ParamEvent | undefined {
    return this.events.filter((e) => e.type === type).pop();
  }

  private record(type: ParamEvent['type'], value: number, time: number, tau = 0): this {
    finite(value, time, tau);
    this.events.push({ type, value, time, tau });
    return this;
  }
}

export type NodeKind =
  | 'gain'
  | 'oscillator'
  | 'biquad'
  | 'bufferSource'
  | 'panner'
  | 'convolver'
  | 'compressor'
  | 'waveShaper'
  | 'destination';

export class FakeNode {
  readonly inputs: FakeNode[] = [];
  readonly outputs: (FakeNode | FakeParam)[] = [];
  // Parameters and fields; a node has the ones of its kind.
  readonly gain = new FakeParam(1);
  readonly frequency = new FakeParam(440);
  readonly detune = new FakeParam(0);
  readonly Q = new FakeParam(1);
  readonly playbackRate = new FakeParam(1);
  readonly positionX = new FakeParam(0);
  readonly positionY = new FakeParam(0);
  readonly positionZ = new FakeParam(0);
  readonly orientationX = new FakeParam(1);
  readonly orientationY = new FakeParam(0);
  readonly orientationZ = new FakeParam(0);
  readonly threshold = new FakeParam(-24);
  readonly knee = new FakeParam(30);
  readonly ratio = new FakeParam(12);
  readonly attack = new FakeParam(0.003);
  readonly release = new FakeParam(0.25);
  type = '';
  panningModel = 'equalpower';
  distanceModel = 'inverse';
  refDistance = 1;
  rolloffFactor = 1;
  normalize = true;
  oversample = 'none';
  curve: Float32Array | null = null;
  buffer: FakeBuffer | null = null;
  /** The wave given to setPeriodicWave(), or null. */
  wave: FakeWave | null = null;
  /** Audio time passed to start() and stop(); `scheduledAt` is the context time when start() was called. */
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  scheduledAt = 0;

  constructor(
    readonly kind: NodeKind,
    private readonly ctx: FakeAudioContext,
  ) {}

  connect<T extends FakeNode | FakeParam>(dest: T): T {
    this.outputs.push(dest);
    if (dest instanceof FakeNode) dest.inputs.push(this);
    return dest;
  }

  start(time = 0): void {
    finite(time);
    if (this.startedAt !== null) throw new Error('InvalidStateError: cannot call start more than once');
    this.startedAt = time;
    this.scheduledAt = this.ctx.currentTime;
  }

  stop(time = 0): void {
    finite(time);
    if (this.startedAt === null) throw new Error('InvalidStateError: cannot call stop without calling start');
    this.stoppedAt = time;
  }

  /** As the real oscillator: its type reads 'custom' from then on (MDN: OscillatorNode.setPeriodicWave). */
  setPeriodicWave(wave: FakeWave): void {
    this.wave = wave;
    this.type = 'custom';
  }
}

/** What createPeriodicWave() was asked for: the cosine and sine terms, and whether the browser may rescale them. */
export interface FakeWave {
  real: Float32Array;
  imag: Float32Array;
  disableNormalization: boolean;
}

export interface FakeBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

export class FakeAudioContext {
  currentTime = 0;
  sampleRate = 48000;
  state: 'suspended' | 'running' = 'running';
  readonly destination = new FakeNode('destination', this);
  readonly listener = {
    positionX: new FakeParam(0),
    positionY: new FakeParam(0),
    positionZ: new FakeParam(0),
    forwardX: new FakeParam(0),
    forwardY: new FakeParam(0),
    forwardZ: new FakeParam(-1),
    upX: new FakeParam(0),
    upY: new FakeParam(1),
    upZ: new FakeParam(0),
  };
  /** Every node, every buffer and every periodic wave made, in order. */
  readonly nodes: FakeNode[] = [];
  readonly buffers: FakeBuffer[] = [];
  readonly waves: FakeWave[] = [];
  readonly resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  readonly suspend = vi.fn(() => {
    this.state = 'suspended';
    return Promise.resolve();
  });

  createGain = (): FakeNode => this.make('gain');
  createOscillator = (): FakeNode => this.make('oscillator');
  createBiquadFilter = (): FakeNode => this.make('biquad');
  createBufferSource = (): FakeNode => this.make('bufferSource');
  createPanner = (): FakeNode => this.make('panner');
  createConvolver = (): FakeNode => this.make('convolver');
  createDynamicsCompressor = (): FakeNode => this.make('compressor');
  createWaveShaper = (): FakeNode => this.make('waveShaper');

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): FakeBuffer {
    if (!(length > 0)) throw new Error('NotSupportedError: the number of frames must be above 0');
    const channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
    const buffer: FakeBuffer = {
      numberOfChannels,
      length,
      sampleRate,
      getChannelData: (ch) => channels[ch] as Float32Array,
    };
    this.buffers.push(buffer);
    return buffer;
  }

  /** As the real API (MDN: BaseAudioContext.createPeriodicWave): two arrays of one length, at least 2 long. */
  createPeriodicWave(
    real: Float32Array,
    imag: Float32Array,
    constraints?: { disableNormalization?: boolean },
  ): FakeWave {
    if (real.length !== imag.length || real.length < 2) throw new Error('IndexSizeError: real and imag');
    const wave: FakeWave = { real, imag, disableNormalization: constraints?.disableNormalization ?? false };
    this.waves.push(wave);
    return wave;
  }

  /**
   * The rendered Pluck strings: the one-channel buffers that hold sound. The reverb impulse responses have two
   * channels, and a string's buffer is made empty when the string is asked for and filled when it is rendered.
   */
  get strings(): number {
    const rendered = (b: FakeBuffer): boolean => b.getChannelData(0).some((v) => v !== 0);
    return this.buffers.filter((b) => b.numberOfChannels === 1 && rendered(b)).length;
  }

  of(kind: NodeKind): FakeNode[] {
    return this.nodes.filter((n) => n.kind === kind);
  }

  count(kind: NodeKind): number {
    return this.of(kind).length;
  }

  /** The context as the type the code under test asks for. */
  get audio(): AudioContext {
    return this as unknown as AudioContext;
  }

  private make(kind: NodeKind): FakeNode {
    const node = new FakeNode(kind, this);
    this.nodes.push(node);
    return node;
  }
}

/** The last element; the project compiles for ES2020, which has no Array.prototype.at. */
export function last<T>(items: readonly T[]): T {
  return items[items.length - 1] as T;
}

/** A fake node as the Web Audio type the code under test asks for. */
export function asNode<T extends AudioNode>(node: FakeNode): T {
  return node as unknown as T;
}
