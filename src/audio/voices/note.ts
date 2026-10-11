// One note: its envelope gain plus the single-use sources that feed it (LLD §7.1). It reports its envelope level
// for oldest-quietest stealing and does the fade-and-stop, so no note ever stops abruptly (no clicks, FR-MUS-07).
// A record is reusable: the pool keeps one per voice channel and a voice fills it at each trigger, so a note
// allocates nothing besides its Web Audio nodes.
import { STEAL_FADE_S, STEAL_FADE_TAUS } from '../config.js';

/** API_SPEC §1.2. Internal to audio/. */
export interface VoiceParams {
  hz: number;
  /** Linear amplitude. */
  gain: number;
  /** Seconds, 0.2..2.5 (from height). */
  release: number;
  /** Filter cutoff multiplier 0.5..2 (from hue, ±1 octave). */
  cutoffMul: number;
  /** Cents, −8..+8 (from hue). */
  detune: number;
}

/** API_SPEC §1.2. Internal to audio/. `out` is the input of the voice channel the pool assigned (LLD §7.1). */
export interface Voice {
  trigger(time: number, p: VoiceParams, out: AudioNode): void;
  dispose(): void;
}

/** Where a voice writes the note it has just built. Its owner points `note` at a record before each trigger. */
export interface NoteRef {
  note: Note;
}

export class Note {
  startTime = 0;
  /** Silent from here on: the sources have stopped. 0 = never used. */
  endTime = 0;
  private env: GainNode | null = null;
  /** Three slots: the most sources a voice has (the Pad's saws). */
  private readonly sources: (AudioScheduledSourceNode | null)[] = [null, null, null];
  private count = 0;
  private peak = 0;
  private decayAt = 0;
  private tau = 1;

  /**
   * A voice calls this once per trigger, then `add` for each source. `peak` is the envelope's top level (linear);
   * from `decayAt` it falls exponentially with time constant `tau` seconds.
   */
  begin(startTime: number, endTime: number, env: GainNode, peak: number, decayAt: number, tau: number): void {
    this.startTime = startTime;
    this.endTime = endTime;
    this.env = env;
    this.peak = peak;
    this.decayAt = decayAt;
    this.tau = tau;
    for (let i = 0; i < this.count; i++) this.sources[i] = null;
    this.count = 0;
  }

  add(source: AudioScheduledSourceNode): void {
    this.sources[this.count++] = source;
  }

  /** The attack counts as full level, so a note that is still rising is never the first to be stolen. */
  levelAt(t: number): number {
    return t <= this.decayAt ? this.peak : this.peak * Math.exp(-(t - this.decayAt) / this.tau);
  }

  /** Silence the note from audio time `at`: dropped whole if it has not started, else held and faded. */
  steal(at: number): void {
    if (this.env === null || this.endTime <= at) return;
    const gain = this.env.gain;
    if (at <= this.startTime) {
      // Scheduled inside the look-ahead but not sounding yet: drop it whole. Nothing was heard, so nothing can click.
      gain.cancelScheduledValues(0);
      gain.value = 0;
      this.stop(at);
      return;
    }
    // Freeze the envelope at the value it has at `at`, then glide to silence. cancelScheduledValues alone would drop
    // a ramp that is still running and jump back to its start value (MDN: AudioParam.cancelAndHoldAtTime; Firefox
    // does not have it, so there a note stolen during its attack can tick).
    if (typeof gain.cancelAndHoldAtTime === 'function') gain.cancelAndHoldAtTime(at);
    else gain.cancelScheduledValues(at);
    gain.setTargetAtTime(0, at, STEAL_FADE_S / STEAL_FADE_TAUS);
    this.stop(at + STEAL_FADE_S);
  }

  private stop(at: number): void {
    for (let i = 0; i < this.count; i++) (this.sources[i] as AudioScheduledSourceNode).stop(at);
    this.endTime = at;
  }
}
