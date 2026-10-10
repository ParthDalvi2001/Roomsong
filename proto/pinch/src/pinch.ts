// Pinch detection for the T-105 test page: pure, no XR types. The production hand code is T-124.
import { PINCH_DEBOUNCE_FRAMES, PINCH_ENTER_M, PINCH_LOCKOUT_MS, PINCH_RELEASE_M } from './config.js';

/** FR-HND-02: pinch start and end from the thumb-tip to index-tip distance of one hand. */
export class PinchMachine {
  private pinching = false;
  /** Consecutive frames that ask for the other state. */
  private streak = 0;
  private releasedAt = -Infinity;

  /** One tracked frame: the gap in metres and the time in ms. Returns the edge this frame confirms, if any. */
  update(gapM: number, nowMs: number): 'start' | 'end' | null {
    const flip = this.pinching
      ? gapM > PINCH_RELEASE_M
      : gapM < PINCH_ENTER_M && nowMs - this.releasedAt >= PINCH_LOCKOUT_MS;
    this.streak = flip ? this.streak + 1 : 0;
    if (this.streak < PINCH_DEBOUNCE_FRAMES) return null;
    this.streak = 0;
    this.pinching = !this.pinching;
    if (this.pinching) return 'start';
    this.releasedAt = nowMs;
    return 'end';
  }

  /** The hand lost tracking: frames either side of the loss are not consecutive. A held pinch stays held. */
  lost(): void {
    this.streak = 0;
  }
}

const alpha = (cutoffHz: number, dtS: number) => 1 / (1 + 1 / (2 * Math.PI * cutoffHz * dtS));

/** FR-HND-03: the 1-euro filter (Casiez 2012) for one axis. The cutoff is min cutoff + beta x |speed|. */
export class OneEuro {
  private raw = NaN; // NaN: no sample yet
  private value = 0;
  private speed = 0;

  constructor(
    private readonly minCutoffHz: number,
    private readonly beta: number,
    private readonly dCutoffHz: number,
  ) {}

  /** The next sample passes through unfiltered (a lost hand was found again). */
  reset(): void {
    this.raw = NaN;
  }

  filter(raw: number, dtS: number): number {
    if (Number.isNaN(this.raw)) {
      this.value = raw;
      this.speed = 0;
    } else if (dtS > 0) {
      this.speed += alpha(this.dCutoffHz, dtS) * ((raw - this.raw) / dtS - this.speed);
      this.value += alpha(this.minCutoffHz + this.beta * Math.abs(this.speed), dtS) * (raw - this.value);
    }
    this.raw = raw;
    return this.value;
  }
}
