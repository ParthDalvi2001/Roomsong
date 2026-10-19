// Look-ahead scheduler (LLD §5.3, FR-MUS-03). Pure: the clock and the ticker are injected; no timers here.
// "Two clocks": a wall-clock tick (25 ms, owned by the caller) asks `tick()`, which schedules every step whose
// audio time falls before now + LOOK_AHEAD_S. Times are computed from an anchor (no accumulated += drift).
// Hot path (`tick`): no allocations; the listener receives primitives.
import { STEPS } from '../garden/index.js';

import { BEATS_PER_BAR, LOOK_AHEAD_S, SECONDS_PER_MINUTE } from './config.js';

export interface Clock {
  /** Audio-clock seconds (AudioContext.currentTime). */
  now(): number;
}

export type StepListener = (step: number, time: number, bar: number) => void;

export class Scheduler {
  private stepDur: number;
  /** The step duration that was in force up to `anchorTime`: the tide phase before the anchor ran at it. */
  private stepDurBefore: number;
  private running = false;
  /** Audio time of absolute step `anchorIndex`; re-based on a tempo change. */
  private anchorTime = 0;
  private anchorIndex = 0;
  /** Absolute index (bar × STEPS + step) of the next step to schedule. */
  private nextIndex = 0;

  constructor(
    private readonly clock: Clock,
    private readonly listener: StepListener,
    bpm: number,
  ) {
    this.stepDur = this.stepDurBefore = Scheduler.stepDurationFor(bpm);
  }

  /** Seconds per step at `bpm`: 4 beats and 16 steps per bar (FR-MUS-03). */
  static stepDurationFor(bpm: number): number {
    return (BEATS_PER_BAR * SECONDS_PER_MINUTE) / bpm / STEPS;
  }

  /** Seconds per step at the tempo in force (the groove and the tempo echo of T-164 are measured in steps). */
  get stepS(): number {
    return this.stepDur;
  }

  /** Begin at step 0, bar 0, `startDelayS` after the current clock time. */
  start(startDelayS: number): void {
    this.anchorTime = this.clock.now() + startDelayS;
    this.anchorIndex = 0;
    this.nextIndex = 0;
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  /** Change tempo: the next unscheduled step keeps its time; later steps use the new spacing. The phase does not jump. */
  setBpm(bpm: number): void {
    // Re-anchor on the next unscheduled step. When no step was scheduled since the last change (a slider sends
    // many), that step is the anchor already, and the duration before it is still the one from before that change.
    if (this.running && this.nextIndex !== this.anchorIndex) {
      this.anchorTime = this.timeOf(this.nextIndex);
      this.anchorIndex = this.nextIndex;
      this.stepDurBefore = this.stepDur;
    }
    this.stepDur = Scheduler.stepDurationFor(bpm);
  }

  /** Call from a 25 ms interval. Emits every step due before now + lookAhead, including late ones. */
  tick(): void {
    if (!this.running) return;
    const horizon = this.clock.now() + LOOK_AHEAD_S;
    let t = this.timeOf(this.nextIndex);
    while (t < horizon) {
      const i = this.nextIndex;
      // Counted before the listener runs: a listener that throws loses its step, not the clock (it would otherwise
      // be handed the same step on every tick from then on).
      this.nextIndex = i + 1;
      // The bar as an integer (| 0), not Math.floor: a float handed to a listener the engine could not inline
      // was put on the heap, 16 bytes a step (measured under coverage, T-143). Exact up to 2^31 bars.
      this.listener(i % STEPS, t, (i / STEPS) | 0);
      t = this.timeOf(this.nextIndex);
    }
  }

  /** 0..1 position within the current bar, derived from the audio clock (tide render phase). */
  barPhase(): number {
    const e = this.elapsedSteps();
    return (e % STEPS) / STEPS;
  }

  /** Step currently sounding, 0..15, derived from the audio clock. */
  stepIndex(): number {
    return Math.floor(this.elapsedSteps()) % STEPS;
  }

  barIndex(): number {
    return Math.floor(this.elapsedSteps() / STEPS);
  }

  /** The absolute index (bar × STEPS + step) of the next time `step` comes that is not scheduled yet (P-012). */
  nextIndexOf(step: number): number {
    return this.nextIndex + ((((step - this.nextIndex) % STEPS) + STEPS) % STEPS);
  }

  /** Audio time of the absolute step `index`, at the tempo in force. */
  timeOf(index: number): number {
    return this.anchorTime + (index - this.anchorIndex) * this.stepDur;
  }

  private elapsedSteps(): number {
    if (!this.running) return 0;
    const dt = this.clock.now() - this.anchorTime;
    const e = this.anchorIndex + dt / (dt < 0 ? this.stepDurBefore : this.stepDur);
    return e < 0 ? 0 : e;
  }
}
