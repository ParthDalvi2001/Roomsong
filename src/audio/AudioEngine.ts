// AudioEngine (API_SPEC §1.2, LLD §7.1): the context, the fixed graph, the look-ahead scheduler and the plants.
// Pure TypeScript + Web Audio: no DOM, no Three.js, and nothing from core/ at run time (AudioSystem.ts does the
// bus wiring), so it also loads in a bare page and renders in an OfflineAudioContext (tests/e2e/09-audio.spec.ts).
//
//   note (built per note by a Voice: single-use sources + envelope)
//      └─► channel[i] ─┬─► PannerNode[i] (equal-power) ────────────────────────────► master gain ─┐
//           i = 0..23  └─► bus ─┬─► send (one gain, one level) ─► ConvolverNode (×1) ─► wet return ──┤
//                               └─► tempo echo (T-164, Layers.ts) ────────────────────────────────┤
//              master gain ─► breathing low-pass (Layers.ts) ─► compressor ─► ceiling (−1 dBFS) ─► destination
//
// Everything in the diagram but the note is built once, in init(). Hot path = tick(): Scheduler → triggerStep →
// VoicePool.play → Voice.trigger. A trigger makes a note's own nodes (sources are single-use in Web Audio) and
// nothing else; a tick with nothing to render makes no object, array or closure (engine.test.ts measures the heap).
// The one costly work, rendering Pluck strings and the reverb's impulse response, is never done in the call that
// asks for it (setSignature, syncPlants, setReverb): the tick does a bounded slice of it (renderSlice, T-143).
// The call makes the buffers, empty; the tick only fills them, and puts no sample on the heap while it does.
import {
  cellCentre,
  chordDegrees,
  MODE_DEGREES,
  REVERB_RT60_DEFAULT_S,
  REVERB_RT60_MAX_S,
  RINGS,
  STEPS,
} from '../garden/index.js';

import {
  HEIGHT_RELEASE_S_MAX,
  IR_SAMPLES_PER_TICK,
  IR_SEED,
  LATE_DROP_S,
  MUTE_TAU_S,
  PARAM_SMOOTH_S,
  PLUCK_STRINGS_PER_TICK,
  REVERB_SMALL_RT60_S,
  REVERB_SWAP_DELAY_S,
  START_DELAY_S,
  SUSPEND_FADE_S,
  SUSPEND_FADE_TAUS,
  TEMPO_MAX_BPM,
  TEMPO_MIN_BPM,
  TICK_EMA,
  TICK_MS,
  WET_RETURN,
} from './config.js';
import { grooveSeed, Layers } from './Layers.js';
import { createLimiter } from './limiter.js';
import { dbToGain, voiceParamsFor } from './mapping.js';
import { impulseLength, impulseRenderer } from './Reverb.js';
import { Scheduler } from './Scheduler.js';
import { Spatializer } from './Spatializer.js';
import { STYLES, TODAY, type Recipe, type SoundStyle } from './styles.js';
import { hzForRing, VOICE_OCTAVE } from './theory.js';
import { VoicePool } from './VoicePool.js';
import { Bass } from './voices/Bass.js';
import { Bell } from './voices/Bell.js';
import { Choir } from './voices/Choir.js';
import { Pad } from './voices/Pad.js';
import { Pluck } from './voices/Pluck.js';

import type { Voice, VoiceParams } from './voices/note.js';
import type { Mat4 } from '../core/index.js';
import type { Cell, Plant, RoomSignature } from '../garden/index.js';

/** API_SPEC §1.2. */
export interface AudioEngine {
  /** Creates or resumes the AudioContext; must run inside the Enter gesture (NFR-PERF-10). Rejects if it cannot. */
  init(ctx?: AudioContext): Promise<void>;
  setTempo(bpm: number): void;
  setVolume(v: number): void;
  /** The one shared reverb: 'auto' follows the signature's reverbRt60, 'small' is a fixed 0.6 s, 'off' mutes the send. */
  setReverb(mode: 'auto' | 'small' | 'off'): void;
  /**
   * Re-tunes all plants in place (key, mode); the reverb decay follows it while 'auto'. Never the tempo (D-021).
   * It renders nothing itself: the tick does, a slice at a time. The same signature again does nothing.
   */
  setSignature(sig: RoomSignature): void;
  /** The listener is the user's head: called every frame with the viewer's world matrix. Allocation-free. */
  setListenerPose(head: Mat4): void;
  chordTone(note: 0 | 1 | 2, time: number): void;
  /** Idempotent and diff-based; plants sound at their world position, equal-power panned. */
  syncPlants(plants: readonly Plant[], bedPose: Mat4): void;
  preview(plant: Plant): void;
  ui(sound: 'tick' | 'confirm' | 'bump' | 'removeRev' | 'undoFwd' | 'placed' | 'goodnight'): void;
  enterListen(): void;
  exitListen(): void;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  /** Audio-clock based. */
  readonly clock: { now(): number; barPhase(): number; stepIndex(): number };
  /**
   * `voices` ≤ VOICE_CAP, always. `cpuEstimate`: main-thread ms of one scheduler tick, a moving average.
   * `triggers`: the notes the scheduler has started since init() (T-128d), for tests: `voices` is a sample.
   */
  readonly stats: { voices: number; cpuEstimate: number; triggers: number };
}

/** One plant as the tick needs it: everything worked out on sync, so a trigger computes nothing. */
interface PlantRecord {
  plant: Plant;
  voice: Voice;
  params: VoiceParams;
  /** grooveSeed(plant.id): its humanize draws (T-164). */
  seed: number;
  x: number;
  y: number;
  z: number;
}

/** The fixed graph: built once, in init(). */
interface Graph {
  ctx: AudioContext;
  master: GainNode;
  send: GainNode;
  convolver: ConvolverNode;
  wet: GainNode;
  space: Spatializer;
  pool: VoicePool;
  scheduler: Scheduler;
  layers: Layers;
  bell: Bell;
  pad: Pad;
  pluck: Pluck;
  bass: Bass;
  choir: Choir;
}

/** An impulse response on its way into the convolver: `step` renders a slice and returns true once `ir` is whole. */
interface ReverbResponse {
  ir: AudioBuffer;
  rt60: number;
  step: (samples: number) => boolean;
}

function onBed(cell: Cell): boolean {
  const { ring, step } = cell;
  return (
    Number.isInteger(ring) && Number.isInteger(step) && ring >= 0 && ring < RINGS && step >= 0 && step < STEPS
  );
}

export class Engine implements AudioEngine {
  readonly clock = {
    now: (): number => this.g?.ctx.currentTime ?? 0,
    barPhase: (): number => this.g?.scheduler.barPhase() ?? 0,
    stepIndex: (): number => this.g?.scheduler.stepIndex() ?? 0,
  };
  readonly stats = { voices: 0, cpuEstimate: 0, triggers: 0 };

  private g: Graph | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  /** Until setTempo: AudioSystem.ts applies the user's tempo, volume and reverb as soon as it makes the engine. */
  private bpm = TEMPO_MIN_BPM;
  private volume = 1;
  /** Until the first signature: C major pentatonic, the Wanderer tuning (FR-MUS-02). */
  private key: Pick<RoomSignature, 'keyRoot' | 'mode'> = { keyRoot: 0, mode: 'majorPent' };
  /** T-164: the sound style; null = today's sound. The recipe holds its values; the voices read them from it. */
  private style: SoundStyle | null = null;
  private readonly recipe: Recipe = { ...TODAY };

  private plants: readonly Plant[] = [];
  /** A copy of the last bed pose: the caller's matrix may change after the call. Starts as the identity. */
  private readonly bed = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  private readonly records = new Map<string, PlantRecord>();
  private readonly steps: PlantRecord[][] = Array.from({ length: STEPS }, () => []);
  private readonly centre = { x: 0, y: 0 };
  /** The ending chord's notes, one after the other (a voice reads its params in the trigger). */
  private readonly chord: VoiceParams = { hz: 0, gain: 0, release: 0, cutoffMul: 1, detune: 0 };

  private reverbMode: 'auto' | 'small' | 'off' = 'auto';
  /** Decay of the signature: the default until the first one, like the Wanderer tuning above. */
  private signatureRt60 = REVERB_RT60_DEFAULT_S;
  /** The decay asked for last: the one the convolver holds, or the one on its way to it. 0 = none yet. */
  private reverbRt60 = 0;
  /** The decay of the response the convolver holds; 0 = none yet. */
  private heldRt60 = 0;
  /** The response being rendered, a slice a tick. Null = none. */
  private rendering: ReverbResponse | null = null;
  /** The response that is whole and waits, the return muted for it, for the tick that swaps it in. Null = none. */
  private pending: ReverbResponse | null = null;
  /** Audio time from which that tick may swap: the mute of the return has faded by then. */
  private swapAt = 0;

  /** Audio time at which the tick suspends the context; Infinity = nobody asked. */
  private suspendAt = Infinity;
  private suspending: Promise<void> | null = null;
  private settleSuspend: ((result?: Promise<void>) => void) | null = null;
  private tickMs = 0;

  async init(ctx?: AudioContext): Promise<void> {
    // No await before the context is created and resumed: both happen in the call stack of the Enter gesture.
    // latencyHint stays at its default (LLD §7.1).
    const g = this.g ?? this.build(ctx ?? new AudioContext());
    // An OfflineAudioContext (a render test) has no gesture to wait for and no real time to tick on: it rejects
    // resume() before it renders, and the test calls tick() on the offline clock itself.
    if ('startRendering' in g.ctx) return;
    await this.resume();
  }

  setTempo(bpm: number): void {
    if (!Number.isFinite(bpm)) return; // a step of 0 or NaN seconds would never end the scheduler's loop
    this.bpm = Math.min(TEMPO_MAX_BPM, Math.max(TEMPO_MIN_BPM, bpm));
    this.g?.scheduler.setBpm(this.bpm);
  }

  setVolume(v: number): void {
    if (!Number.isFinite(v)) return;
    this.volume = Math.min(1, Math.max(0, v));
    const g = this.g;
    if (g !== null && this.suspendAt === Infinity) {
      g.master.gain.setTargetAtTime(this.volume, g.ctx.currentTime, PARAM_SMOOTH_S);
    }
  }

  setReverb(mode: 'auto' | 'small' | 'off'): void {
    this.reverbMode = mode;
    this.applyReverb();
  }

  setSignature(sig: RoomSignature): void {
    // A NaN pitch would make an oscillator throw in the tick, at every step.
    if (MODE_DEGREES[sig.mode] === undefined || !Number.isFinite(sig.keyRoot)) return;
    const retune = sig.keyRoot !== this.key.keyRoot || sig.mode !== this.key.mode;
    if (!retune && sig.reverbRt60 === this.signatureRt60) return; // the same signature again: nothing to do
    this.key = sig;
    this.signatureRt60 = sig.reverbRt60;
    this.applyReverb();
    const g = this.g;
    if (!retune || g === null) return;
    // Notes that sound or are scheduled were tuned to the old key: they fade out and never ring over the new one.
    g.pool.releaseAll(g.ctx.currentTime);
    // The strings of the old key go, with any that were still waiting to be rendered. The plants ask for those of
    // the new key and the tick renders them (renderSlice): nothing is rendered in this call.
    g.pluck.dispose();
    this.applyPlants();
  }

  setListenerPose(head: Mat4): void {
    this.g?.space.setListenerPose(head);
  }

  /**
   * T-164 (SOUND_PASS_T164.md §4): one of the three styles Parth chooses between by ear, or null for today's sound.
   * Not in the contract yet: the winner becomes the constants and this goes. The next notes play it; the strings and
   * the bass wave are made again (the tick renders the strings, as after a re-tune), and the plants re-tuned.
   */
  setStyle(style: SoundStyle | null): void {
    if (style === this.style) return;
    this.style = style;
    Object.assign(this.recipe, style === null ? TODAY : STYLES[style]);
    const g = this.g;
    if (g === null) return; // init() builds with the recipe
    g.bass = new Bass(g.ctx, g.pool.ref, this.recipe);
    g.pluck.dispose();
    g.layers.restyle(g.ctx.currentTime);
    this.applyReverb();
    this.applyPlants();
  }

  syncPlants(plants: readonly Plant[], bedPose: Mat4): void {
    // A pose with a value that is not finite is not taken: a NaN position makes a panner throw in the tick.
    let finite = true;
    for (let i = 0; i < 16; i++) finite &&= Number.isFinite(bedPose[i]);
    let moved = false;
    for (let i = 0; finite && i < 16; i++) {
      const v = bedPose[i] as number;
      if (this.bed[i] !== v) {
        this.bed[i] = v;
        moved = true;
      }
    }
    // Garden state is immutable, so the same array is the same plants: a call that changes nothing returns here.
    // A real change re-tunes every plant and allocates: the caller syncs on garden:changed and room:bedPlaced,
    // not every frame (API_SPEC §1.2).
    if (plants === this.plants && !moved) return;
    this.plants = plants; // also kept for init(): a garden restored before the Enter gesture must sound after it
    this.applyPlants();
  }

  // The next three wait for their tasks: silent and safe to call until then. Of ui(), only 'goodnight' is built.
  chordTone(): void {} // T-142; needs garden's chordDegrees (T-141)
  preview(): void {} // T-147
  ui(sound: Parameters<AudioEngine['ui']>[0]): void {
    if (sound === 'goodnight') this.goodnight(); // T-164 builds the others
  }

  /** T-148: the nearest plants come forward in the mix from their next note on (Spatializer.place). */
  enterListen(): void {
    if (this.g !== null) this.g.space.isFocused = true;
  }

  exitListen(): void {
    if (this.g !== null) this.g.space.isFocused = false;
  }

  /** FR-SYS-05: the master fades out, then the context stops. The tick does the stop, on the audio clock. */
  suspend(): Promise<void> {
    const g = this.g;
    if (g === null || this.timer === null) return Promise.resolve(); // not started, or suspended already
    if (g.ctx.state !== 'running') {
      // The context never started (autoplay blocked): its clock stands still, so a fade would never be over.
      clearInterval(this.timer);
      this.timer = null;
      return Promise.resolve();
    }
    if (this.suspending === null) {
      const now = g.ctx.currentTime;
      g.master.gain.setTargetAtTime(0, now, SUSPEND_FADE_S / SUSPEND_FADE_TAUS);
      this.suspendAt = now + SUSPEND_FADE_S;
      this.suspending = new Promise<void>((settle) => {
        this.settleSuspend = settle;
      });
    }
    return this.suspending;
  }

  /** Resumes the context, restarts the tick and fades the master back in. The audio clock stood still meanwhile. */
  async resume(): Promise<void> {
    const g = this.g;
    if (g === null) return; // a context is only ever created by init(), inside the gesture
    this.endSuspend();
    this.timer ??= setInterval(this.tick, TICK_MS);
    g.master.gain.setTargetAtTime(this.volume, g.ctx.currentTime, PARAM_SMOOTH_S);
    if (g.ctx.state === 'running') return;
    await g.ctx.resume();
    // A suspend() that came while the browser was still starting the context found nothing to fade and only
    // stopped the tick. It wins: without this the context would run on with no tick, playing leftover tails.
    if (this.timer === null) await g.ctx.suspend();
  }

  /** The 25 ms tick: one slice of render work, the steps that are due, then cheap bookkeeping on the audio clock. */
  readonly tick = (): void => {
    const g = this.g;
    if (g === null) return;
    const t0 = performance.now();
    // Before the scheduler: a string asked for since the last tick is then ready for the first note that needs it.
    this.renderSlice(g, IR_SAMPLES_PER_TICK);
    g.scheduler.tick();
    const now = g.ctx.currentTime;
    const pending = this.pending;
    if (pending !== null && now >= this.swapAt) {
      g.convolver.buffer = pending.ir;
      this.heldRt60 = pending.rt60;
      g.wet.gain.setTargetAtTime(WET_RETURN, now, PARAM_SMOOTH_S);
      this.pending = null;
    }
    if (now >= this.suspendAt) {
      if (this.timer !== null) clearInterval(this.timer);
      this.timer = null;
      this.endSuspend(g.ctx.suspend());
    }
    this.stats.voices = g.pool.active(now);
    this.tickMs += (performance.now() - t0 - this.tickMs) * TICK_EMA;
    this.stats.cpuEstimate = this.tickMs;
  };

  /** The scheduler's listener: every plant on `step` plays at audio time `time`, then the layers of the step. */
  triggerStep(step: number, time: number, bar = 0): void {
    const g = this.g;
    // A step found long after its time (a stalled tick, a throttled tab) is skipped: playing it and the ones
    // after it at once would be a burst.
    if (g === null || time < g.ctx.currentTime - LATE_DROP_S) return;
    const list = this.steps[step] as PlantRecord[];
    this.stats.triggers += list.length;
    const layers = g.layers;
    // The groove (T-164) moves and weights each note; with today's recipe it is the note as it is. A humanized
    // note may start before `time`: no note of this step is stolen for another of it (VoicePool.play's guard).
    const guard = time - this.recipe.humanizeS;
    for (let i = 0; i < list.length; i++) {
      const r = list[i] as PlantRecord;
      layers.groove(r, step, bar, time);
      g.pool.play(r.voice, layers.noteTime, layers.note, r.x, r.y, r.z, r, guard);
    }
    layers.step(step, time, bar, this.records.size);
  }

  private build(ctx: AudioContext): Graph {
    const master = ctx.createGain();
    master.gain.value = this.volume;
    const limiter = createLimiter(ctx);
    limiter.output.connect(ctx.destination);

    // One send gain on the bus, not one per channel: every channel has the same level (LLD §7.1), so the sum is
    // the same signal with 24 nodes fewer. The bus is that sum; the tempo echo's send takes from it too (T-164).
    const bus = ctx.createGain();
    const send = ctx.createGain();
    send.gain.value = this.recipe.reverbSend;
    const convolver = ctx.createConvolver();
    convolver.normalize = true;
    const wet = ctx.createGain();
    wet.gain.value = WET_RETURN;
    bus.connect(send).connect(convolver).connect(wet).connect(master);

    const space = new Spatializer(ctx, master, bus);
    const pool = new VoicePool(ctx, space);
    const scheduler = new Scheduler(
      { now: () => ctx.currentTime },
      (step, time, bar) => this.triggerStep(step, time, bar),
      this.bpm,
    );
    const r = this.recipe;
    const bell = new Bell(ctx, pool.ref, r);
    const choir = new Choir(ctx, pool.ref, r);
    // master → the breathing filter → the limiter; the echo returns into master (Layers.ts).
    const layers = new Layers({
      ctx,
      pool,
      scheduler,
      recipe: r,
      bell,
      choirPulse: choir.pulse,
      bus,
      master,
      compressor: limiter.input,
      bed: this.bed,
      key: () => this.key,
    });
    const g: Graph = {
      ctx,
      master,
      send,
      convolver,
      wet,
      space,
      pool,
      scheduler,
      layers,
      bell,
      pad: new Pad(ctx, pool.ref, r),
      pluck: new Pluck(ctx, pool.ref, r),
      bass: new Bass(ctx, pool.ref, r),
      choir,
    };
    this.g = g;
    if (this.style !== null) layers.restyle(ctx.currentTime);
    scheduler.start(START_DELAY_S);
    this.applyReverb();
    // init() runs in the Enter gesture, before any frame of the session, so both renderers run once here: the
    // first response whole, so the first notes are not dry, and one string to no buffer, so its loop is compiled
    // before a tick needs it (Pluck.warmUp). The strings of the plants wait for the tick.
    while (this.rendering !== null) this.renderSlice(g, Infinity);
    g.pluck.warmUp();
    this.applyPlants();
    return g;
  }

  /**
   * UX §3.5, PRD §3.4: the ending chord of a Listen that ran its 10 minutes. The room chord (garden's
   * chordDegrees, the chord the tuning ripple plays) on Pad, as a full-height pad plant sounds, from the bed's
   * centre, now. choice: the contract names the sound only; the garden plays on under it.
   */
  private goodnight(): void {
    const g = this.g;
    if (g === null) return;
    const p = this.chord;
    p.gain = dbToGain(this.recipe.mixDb.pad);
    p.release = HEIGHT_RELEASE_S_MAX;
    const b = this.bed;
    for (const ring of chordDegrees(this.key.mode)) {
      p.hz = hzForRing(this.key, ring, 'pad');
      g.pool.play(g.pad, g.ctx.currentTime, p, b[12] as number, b[13] as number, b[14] as number, null);
    }
  }

  /** Settle a pending suspend(): with the context's own promise when the fade is over, with nothing when cancelled. */
  private endSuspend(result?: Promise<void>): void {
    this.suspendAt = Infinity;
    this.suspending = null;
    const settle = this.settleSuspend;
    this.settleSuspend = null;
    settle?.(result);
  }

  /**
   * Point the one reverb at the decay in force. A new decay starts the render of its impulse response and renders
   * none of it: renderSlice does. The last decay asked for wins over whatever was on its way.
   */
  private applyReverb(): void {
    const g = this.g;
    if (g === null) return;
    const now = g.ctx.currentTime;
    const off = this.reverbMode === 'off';
    g.send.gain.setTargetAtTime(off ? 0 : this.recipe.reverbSend, now, PARAM_SMOOTH_S);
    g.layers.openEcho(!off, now); // 'off' is a dry sound: no tempo echo either (T-164)
    const rt60 = Math.min(
      this.reverbMode === 'small' ? REVERB_SMALL_RT60_S : this.signatureRt60,
      REVERB_RT60_MAX_S,
    );
    if (off || !(rt60 > 0) || rt60 === this.reverbRt60) return;
    this.reverbRt60 = rt60;
    // What was on its way is outdated. A response still being rendered is dropped. One that was whole and waited
    // for its swap never goes in: the return, muted for it, opens again on the response that is still in place.
    this.rendering = null;
    if (this.pending !== null) {
      this.pending = null;
      g.wet.gain.setTargetAtTime(WET_RETURN, now, PARAM_SMOOTH_S);
    }
    if (rt60 === this.heldRt60) return; // the convolver holds this response already: no render and no swap
    const sr = g.ctx.sampleRate;
    const ir = g.ctx.createBuffer(2, impulseLength(sr, rt60), sr);
    this.rendering = { ir, rt60, step: impulseRenderer(ir, rt60, IR_SEED) };
  }

  /**
   * One slice of the render work a re-tune, a new plant or a new decay left behind (T-143): up to
   * PLUCK_STRINGS_PER_TICK strings, or else, when no string is waiting, up to `samples` of the impulse response.
   * With nothing to render it costs two comparisons and allocates nothing.
   */
  private renderSlice(g: Graph, samples: number): void {
    if (g.pluck.render(PLUCK_STRINGS_PER_TICK)) return; // strings came first, and are all this tick renders
    const response = this.rendering;
    if (response === null || !response.step(samples)) return;
    this.rendering = null;
    if (this.heldRt60 === 0) {
      g.convolver.buffer = response.ir; // the convolver was silent until now: nothing to cut off
      this.heldRt60 = response.rt60;
      return;
    }
    // Swapping a ConvolverNode's buffer resets its state: mute the return first and swap in a later tick.
    const now = g.ctx.currentTime;
    g.wet.gain.setTargetAtTime(0, now, MUTE_TAU_S);
    this.pending = response;
    this.swapAt = now + REVERB_SWAP_DELAY_S;
  }

  /**
   * The diff against the records: a new plant gets one, a removed plant's notes fade out and its record goes, and
   * every plant is tuned to the key, the bed pose and its own cell, height and hue. Nothing in the graph is rebuilt.
   */
  private applyPlants(): void {
    const g = this.g;
    if (g === null) return;
    const seen = new Set<string>();
    for (const plant of this.plants) {
      // A cell off the bed has no step and no pitch; a voice that is not a VoiceType has no octave and no level.
      // Either would put a NaN in the tick, where an AudioParam throws at every bar: such a plant is left out.
      if (!onBed(plant.cell) || typeof VOICE_OCTAVE[plant.voice] !== 'number') continue;
      seen.add(plant.id);
      let record = this.records.get(plant.id);
      if (record === undefined) {
        record = {
          plant,
          voice: g.bell,
          params: { hz: 0, gain: 0, release: 0, cutoffMul: 1, detune: 0 },
          seed: grooveSeed(plant.id),
          x: 0,
          y: 0,
          z: 0,
        };
        this.records.set(plant.id, record);
      }
      record.plant = plant;
      this.tune(g, record);
    }
    for (const [id, record] of this.records) {
      if (seen.has(id)) continue;
      g.pool.release(record, g.ctx.currentTime); // no orphan note (FR-MUS-12)
      this.records.delete(id);
    }
    for (const list of this.steps) list.length = 0;
    for (const record of this.records.values())
      (this.steps[record.plant.cell.step] as PlantRecord[]).push(record);
  }

  /** Work out everything a trigger needs: voice, pitch, level, string and world position. */
  private tune(g: Graph, record: PlantRecord): void {
    const plant = record.plant;
    // Shimmer has no synth yet (Should S5): until then it rings as a bell, at its own octave.
    const own = plant.voice === 'shimmer' ? 'bell' : plant.voice;
    record.voice = g[own];
    const r = this.recipe;
    voiceParamsFor(plant, hzForRing(this.key, plant.cell.ring, plant.voice), record.params, r.heightFloorDb);
    record.params.gain *= dbToGain(r.mixDb[plant.voice]);
    if (record.voice === g.pluck) g.pluck.prepare(record.params);
    // The cell centre on the bed plane, through the bed's pose (column-major): bed-local (x, 0, z) → world.
    const { x, y: z } = cellCentre(plant.cell, this.centre);
    const b = this.bed;
    record.x = (b[0] as number) * x + (b[8] as number) * z + (b[12] as number);
    record.y = (b[1] as number) * x + (b[9] as number) * z + (b[13] as number);
    record.z = (b[2] as number) * x + (b[10] as number) * z + (b[14] as number);
  }
}
