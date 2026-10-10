// One sounding note: its envelope gain plus the single-use sources that feed it. Reports its envelope level to the
// pool (oldest-quietest stealing) and implements the fade-and-stop on steal so no voice ever stops abruptly
// (no clicks, FR-MUS-07).
import { STEAL_FADE_S, STEAL_FADE_TAUS } from '../config';

import type { PoolNote } from '../VoicePool';

export class ScheduledNote implements PoolNote {
  /**
   * `peak` is the envelope's top level (linear); from `decayAt` it falls exponentially with time constant `tau`
   * seconds. The attack counts as full level, so a note that is still rising is never the first to be stolen.
   */
  constructor(
    readonly startTime: number,
    public endTime: number,
    private readonly env: GainNode,
    private readonly sources: readonly AudioScheduledSourceNode[],
    private readonly peak: number,
    private readonly decayAt: number,
    private readonly tau: number,
  ) {}

  levelAt(t: number): number {
    return t <= this.decayAt ? this.peak : this.peak * Math.exp(-(t - this.decayAt) / this.tau);
  }

  steal(at: number): void {
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
    for (let i = 0; i < this.sources.length; i++) (this.sources[i] as AudioScheduledSourceNode).stop(at);
    this.endTime = at;
  }
}
