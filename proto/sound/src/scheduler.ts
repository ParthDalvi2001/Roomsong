// Look-ahead scheduler (LLD §5.3, FR-MUS-03). Pure: the clock and the ticker are injected; no timers here.
// "Two clocks": a wall-clock tick (25 ms, owned by the caller) asks `tick()`, which schedules every step whose
// audio time falls before now + LOOK_AHEAD_S. Times are computed from an anchor (no accumulated += drift).
// Hot path (`tick`): no allocations; the listener receives primitives.
import { BEATS_PER_BAR, LOOK_AHEAD_S, SECONDS_PER_MINUTE, STEPS } from './config';

export interface Clock {
  /** Audio-clock seconds (AudioContext.currentTime). */
  now(): number;
}

export type StepListener = (step: number, time: number, bar: number) => void;

export class Scheduler {
  private stepDur: number;
  private running = false;
  /** Audio time of absolute step `anchorIndex`; re-based on every tempo change. */
  private anchorTime = 0;
  private anchorIndex = 0;
  /** Absolute index (bar × STEPS + step) of the next step to schedule. */
  private nextIndex = 0;

  constructor(
    private readonly clock: Clock,
    private readonly listener: StepListener,
    bpm: number,
  ) {
    this.stepDur = Scheduler.stepDurationFor(bpm);
  }

  /** Seconds per step at `bpm`: 4 beats and 16 steps per bar (FR-MUS-03). */
  static stepDurationFor(bpm: number): number {
    return (BEATS_PER_BAR * SECONDS_PER_MINUTE) / bpm / STEPS;
  }

  stepDurationS(): number {
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

  /** Change tempo: the next unscheduled step keeps its time; later steps use the new spacing. */
  setBpm(bpm: number): void {
    if (this.running) {
      this.anchorTime = this.timeOf(this.nextIndex);
      this.anchorIndex = this.nextIndex;
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
      this.listener(i % STEPS, t, Math.floor(i / STEPS));
      this.nextIndex = i + 1;
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

  private timeOf(index: number): number {
    return this.anchorTime + (index - this.anchorIndex) * this.stepDur;
  }

  private elapsedSteps(): number {
    if (!this.running) return 0;
    const e = this.anchorIndex + (this.clock.now() - this.anchorTime) / this.stepDur;
    return e < 0 ? 0 : e;
  }
}
