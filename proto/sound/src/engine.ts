// AudioEngine (API_SPEC §1.2 subset for Phase 0): context + master chain + shared reverb + look-ahead scheduler +
// plant slots with diff-based syncPlants. Pure TypeScript + Web Audio; no DOM, no Three.js.
// Graph: voice → plant gain → equal-power stereo pan → sum bus → volume → limiter → −1 dBFS ceiling → analyser →
// destination; plant gain → send → the one ConvolverNode → wet return → sum bus. NFR-PERF-10 holds for the voice
// cap, the one convolver and the timing; the panners differ (one StereoPannerNode per plant, not 24 pooled
// PannerNodes) and are T-121/T-145 work.
// Hot path = tick(): scheduler → triggerStep → voice.trigger, then bookkeeping. A trigger builds one small node
// graph and one note record per note (at most 24 sound at once); nothing else creates nodes or allocates in the
// tick. CODING_GUIDELINES §5 allows node creation for voice triggers; pooling the voices is a T-121 decision.
import {
  ANALYSER_FFT,
  CEILING_CURVE_POINTS,
  CEILING_DBFS,
  CEILING_KNEE,
  DEFAULT_VOLUME,
  DISCONNECT_AFTER_S,
  IR_SEED,
  LIMITER_ATTACK_S,
  LIMITER_KNEE_DB,
  LIMITER_RATIO,
  LIMITER_RELEASE_S,
  LIMITER_THRESHOLD_DB,
  METER_SILENCE_DB,
  MIX_DB,
  MUTE_TAU_S,
  PARAM_SMOOTH_S,
  REVERB_SEND,
  REVERB_SWAP_DELAY_S,
  START_DELAY_S,
  STEPS,
  TICK_EMA,
  TICK_MS,
  VOICE_CAP,
  WET_RETURN,
} from './config';
import { dbToGain, panForStep, voiceParamsFor } from './mapping';
import { clampRt60, impulseLength, renderImpulseResponse } from './reverb';
import { Scheduler } from './scheduler';
import { hzForRing } from './theory';
import {
  WANDERER,
  type Plant,
  type RoomSignature,
  type Voice,
  type VoiceParams,
  type VoiceType,
} from './types';
import { VoicePool } from './VoicePool';
import { Bell } from './voices/Bell';
import { Pad } from './voices/Pad';
import { Pluck } from './voices/Pluck';

export interface EngineClock {
  now(): number;
  barPhase(): number;
  stepIndex(): number;
  barIndex(): number;
}

export interface EngineStats {
  /** Notes currently sounding (≤ VOICE_CAP). */
  voices: number;
  /** Main-thread cost of one scheduler tick in ms (exponential moving average). Audio-thread CPU is not observable. */
  cpuEstimate: number;
}

interface PlantSlot {
  plant: Plant;
  voice: Voice;
  out: GainNode;
  pan: StereoPannerNode;
  send: GainNode;
  params: VoiceParams;
}

interface PendingDisconnect {
  node: AudioNode;
  at: number;
}

interface Chain {
  ctx: BaseAudioContext;
  sumBus: GainNode;
  volume: GainNode;
  limiter: DynamicsCompressorNode;
  ceiling: WaveShaperNode;
  analyser: AnalyserNode;
  reverbIn: GainNode;
  convolver: ConvolverNode;
  wetReturn: GainNode;
  scheduler: Scheduler;
}

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

export class AudioEngine {
  readonly clock: EngineClock;
  readonly stats: EngineStats = { voices: 0, cpuEstimate: 0 };

  private chain: Chain | null = null;
  private readonly pool = new VoicePool(VOICE_CAP);
  private readonly slots = new Map<string, PlantSlot>();
  private readonly stepTable: PlantSlot[][] = [];
  private readonly pending: PendingDisconnect[] = [];
  /** Impulse responses by RT60 seconds; a signature's RT60 is quantised, so this stays a handful of buffers. */
  private readonly irs = new Map<number, AudioBuffer>();
  private pendingReverb: { ir: AudioBuffer; at: number } | null = null;
  /** RT60 the convolver holds or is about to hold; 0 = none yet. */
  private reverbRt60 = 0;
  private sig: RoomSignature = WANDERER;
  private tempoOverride: number | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly meterBuf = new Float32Array(ANALYSER_FFT);
  private tickMs = 0;
  private pluckSeed = 1;

  constructor() {
    for (let i = 0; i < STEPS; i++) this.stepTable.push([]);
    this.clock = {
      now: () => this.chain?.ctx.currentTime ?? 0,
      barPhase: () => this.chain?.scheduler.barPhase() ?? 0,
      stepIndex: () => this.chain?.scheduler.stepIndex() ?? 0,
      barIndex: () => this.chain?.scheduler.barIndex() ?? 0,
    };
  }

  /** Create (or adopt) the context and build the graph. Must be called from a user gesture for a live context. */
  async init(ctx?: BaseAudioContext): Promise<void> {
    if (this.chain) return;
    const c = ctx ?? new AudioContext({ latencyHint: 'interactive' });
    this.chain = this.buildChain(c);
    this.applyReverb(true);
    if (c instanceof AudioContext && c.state !== 'running') await c.resume();
  }

  start(): void {
    const chain = this.chain;
    if (!chain) return;
    chain.scheduler.start(START_DELAY_S);
    if (chain.ctx instanceof AudioContext && this.intervalId === null) {
      this.intervalId = setInterval(() => this.tick(), TICK_MS);
    }
  }

  stop(): void {
    const chain = this.chain;
    if (!chain) return;
    chain.scheduler.stop();
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.pool.clear(chain.ctx.currentTime);
    this.stats.voices = 0;
  }

  /** The 25 ms tick: schedule due steps, then cheap bookkeeping on the audio clock. */
  tick(): void {
    const chain = this.chain;
    if (!chain) return;
    const t0 = performance.now();
    chain.scheduler.tick();
    const now = chain.ctx.currentTime;
    this.pool.prune(now);
    this.applyPending(chain, now);
    this.stats.voices = this.pool.active;
    this.tickMs += (performance.now() - t0 - this.tickMs) * TICK_EMA;
    this.stats.cpuEstimate = this.tickMs;
  }

  setTempo(bpm: number): void {
    this.tempoOverride = bpm;
    this.chain?.scheduler.setBpm(bpm);
  }

  setVolume(v: number, immediate = false): void {
    const chain = this.chain;
    if (!chain) return;
    const now = chain.ctx.currentTime;
    if (immediate) chain.volume.gain.setValueAtTime(v, now);
    else chain.volume.gain.setTargetAtTime(v, now, PARAM_SMOOTH_S);
  }

  /**
   * Re-tune every plant in place (cells unchanged) and point the reverb at the room's RT60 (FR-ROOM-13, D-021).
   * Notes that are sounding or already scheduled were tuned to the old key, so they fade out (click-free steal)
   * and never ring over the new one.
   */
  setSignature(sig: RoomSignature): void {
    this.sig = sig;
    if (this.tempoOverride === null) this.chain?.scheduler.setBpm(sig.tempo);
    if (this.chain) this.pool.clear(this.chain.ctx.currentTime);
    this.applyReverb(false);
    for (const slot of this.slots.values()) this.retune(slot);
  }

  /** Idempotent, diff-based: creates, updates and fades out plant slots; rebuilds the step table. */
  syncPlants(plants: readonly Plant[]): void {
    const chain = this.chain;
    if (!chain) return;
    const seen = new Set<string>();
    for (let i = 0; i < plants.length; i++) {
      const p = plants[i] as Plant;
      seen.add(p.id);
      const slot = this.slots.get(p.id);
      if (!slot) {
        this.slots.set(p.id, this.createSlot(chain, p));
        continue;
      }
      if (slot.plant === p) continue;
      if (slot.plant.voice !== p.voice) {
        this.disposeSlot(chain, slot);
        this.slots.set(p.id, this.createSlot(chain, p));
        continue;
      }
      slot.plant = p;
      slot.pan.pan.setTargetAtTime(panForStep(p.cell.step), chain.ctx.currentTime, PARAM_SMOOTH_S);
      this.retune(slot);
    }
    for (const [id, slot] of this.slots) {
      if (seen.has(id)) continue;
      this.disposeSlot(chain, slot);
      this.slots.delete(id);
    }
    this.rebuildStepTable();
  }

  /** Scheduler listener: trigger every plant on `step` at audio time `time`. */
  triggerStep(step: number, time: number): void {
    const list = this.stepTable[step] as PlantSlot[];
    for (let i = 0; i < list.length; i++) {
      const s = list[i] as PlantSlot;
      s.voice.trigger(time, s.params);
    }
  }

  /** Stress helper for the offline self-test: every plant at once, regardless of step. */
  triggerAllPlants(time: number): void {
    for (const s of this.slots.values()) s.voice.trigger(time, s.params);
  }

  /** Peak of the last analyser window in dBFS, measured after the ceiling (what reaches the output). */
  peakDb(): number {
    const chain = this.chain;
    if (!chain) return METER_SILENCE_DB;
    chain.analyser.getFloatTimeDomainData(this.meterBuf);
    let peak = 0;
    for (let i = 0; i < this.meterBuf.length; i++) {
      const a = Math.abs(this.meterBuf[i] as number);
      if (a > peak) peak = a;
    }
    return peak > 0 ? Math.max(METER_SILENCE_DB, 20 * Math.log10(peak)) : METER_SILENCE_DB;
  }

  async resume(): Promise<void> {
    const c = this.chain?.ctx;
    if (c instanceof AudioContext && c.state !== 'running') await c.resume();
  }

  async dispose(): Promise<void> {
    this.stop();
    const c = this.chain?.ctx;
    this.chain = null;
    this.slots.clear();
    this.irs.clear();
    this.reverbRt60 = 0;
    if (c instanceof AudioContext) await c.close();
  }

  private buildChain(ctx: BaseAudioContext): Chain {
    const sumBus = ctx.createGain();
    const volume = ctx.createGain();
    volume.gain.value = DEFAULT_VOLUME;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = LIMITER_THRESHOLD_DB;
    limiter.knee.value = LIMITER_KNEE_DB;
    limiter.ratio.value = LIMITER_RATIO;
    limiter.attack.value = LIMITER_ATTACK_S;
    limiter.release.value = LIMITER_RELEASE_S;
    const ceiling = ctx.createWaveShaper();
    ceiling.curve = makeCeilingCurve();
    ceiling.oversample = 'none'; // sample-exact ceiling; the compressor ahead of it does the musical work
    const analyser = ctx.createAnalyser();
    analyser.fftSize = ANALYSER_FFT;
    sumBus.connect(volume).connect(limiter).connect(ceiling).connect(analyser).connect(ctx.destination);

    const reverbIn = ctx.createGain();
    const convolver = ctx.createConvolver();
    convolver.normalize = true;
    const wetReturn = ctx.createGain();
    wetReturn.gain.value = 0;
    reverbIn.connect(convolver).connect(wetReturn).connect(sumBus);

    const scheduler = new Scheduler(
      { now: () => ctx.currentTime },
      (step, time) => this.triggerStep(step, time),
      this.tempoOverride ?? this.sig.tempo,
    );
    return { ctx, sumBus, volume, limiter, ceiling, analyser, reverbIn, convolver, wetReturn, scheduler };
  }

  /** Stereo impulse response for `rt60` (already clamped): one RT60 long, at most 2.0 s. Never called from the tick. */
  private impulseResponse(ctx: BaseAudioContext, rt60: number): AudioBuffer {
    const cached = this.irs.get(rt60);
    if (cached) return cached;
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(2, impulseLength(sr, rt60), sr);
    for (let ch = 0; ch < 2; ch++) renderImpulseResponse(buf.getChannelData(ch), sr, rt60, IR_SEED + ch);
    this.irs.set(rt60, buf);
    return buf;
  }

  /** Point the one shared reverb at the signature's RT60. The decay is all a room changes; the send level is fixed. */
  private applyReverb(immediate: boolean): void {
    const chain = this.chain;
    if (!chain) return;
    const now = chain.ctx.currentTime;
    const rt60 = clampRt60(this.sig.reverbRt60);
    if (rt60 === this.reverbRt60) return;
    this.reverbRt60 = rt60;
    const ir = this.impulseResponse(chain.ctx, rt60);
    if (immediate) {
      chain.convolver.buffer = ir;
      chain.wetReturn.gain.setValueAtTime(WET_RETURN, now);
      this.pendingReverb = null;
      return;
    }
    // Swapping a ConvolverNode buffer resets its state; mute the return first and swap in a later tick.
    chain.wetReturn.gain.setTargetAtTime(0, now, MUTE_TAU_S);
    this.pendingReverb = { ir, at: now + REVERB_SWAP_DELAY_S };
  }

  private applyPending(chain: Chain, now: number): void {
    const pr = this.pendingReverb;
    if (pr !== null && now >= pr.at) {
      chain.convolver.buffer = pr.ir;
      chain.wetReturn.gain.setTargetAtTime(WET_RETURN, now, PARAM_SMOOTH_S);
      this.pendingReverb = null;
    }
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i] as PendingDisconnect;
      if (now < p.at) continue;
      p.node.disconnect();
      const last = this.pending.length - 1;
      this.pending[i] = this.pending[last] as PendingDisconnect;
      this.pending.pop();
    }
  }

  private createSlot(chain: Chain, plant: Plant): PlantSlot {
    const ctx = chain.ctx;
    const out = ctx.createGain();
    out.gain.value = dbToGain(MIX_DB[plant.voice]);
    // StereoPannerNode pans with the Web Audio equal-power law (MDN: StereoPannerNode). One per plant, made here on
    // plant sync, never in the tick. The send is taken before the pan so the reverb stays wide.
    const pan = ctx.createStereoPanner();
    pan.pan.value = panForStep(plant.cell.step);
    const send = ctx.createGain();
    send.gain.value = REVERB_SEND;
    out.connect(pan).connect(chain.sumBus);
    out.connect(send).connect(chain.reverbIn);
    const slot: PlantSlot = {
      plant,
      voice: this.makeVoice(ctx, plant.voice, out),
      out,
      pan,
      send,
      params: { hz: 0, gain: 0, release: 0, cutoffMul: 1, detune: 0 },
    };
    this.retune(slot);
    return slot;
  }

  /** Phase 0 has Bell, Pad and Pluck only (LLD §7); any other voice type would play as a bell until T-144. */
  private makeVoice(ctx: BaseAudioContext, type: VoiceType, out: GainNode): Voice {
    if (type === 'pad') return new Pad(ctx, out, this.pool);
    if (type === 'pluck') return new Pluck(ctx, out, this.pool, this.pluckSeed++);
    return new Bell(ctx, out, this.pool);
  }

  private retune(slot: PlantSlot): void {
    const hz = hzForRing(this.sig, slot.plant.cell.ring, slot.plant.voice);
    voiceParamsFor(slot.plant, hz, slot.params);
    slot.voice.prepare?.(slot.params);
  }

  private disposeSlot(chain: Chain, slot: PlantSlot): void {
    const now = chain.ctx.currentTime;
    slot.out.gain.setTargetAtTime(0, now, MUTE_TAU_S);
    slot.voice.dispose();
    this.pending.push({ node: slot.out, at: now + DISCONNECT_AFTER_S });
    this.pending.push({ node: slot.pan, at: now + DISCONNECT_AFTER_S });
    this.pending.push({ node: slot.send, at: now + DISCONNECT_AFTER_S });
  }

  private rebuildStepTable(): void {
    for (let i = 0; i < STEPS; i++) (this.stepTable[i] as PlantSlot[]).length = 0;
    for (const slot of this.slots.values()) {
      const step = slot.plant.cell.step;
      if (step >= 0 && step < STEPS) (this.stepTable[step] as PlantSlot[]).push(slot);
    }
  }
}
