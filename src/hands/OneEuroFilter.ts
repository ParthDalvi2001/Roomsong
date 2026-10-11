// FR-HND-03, LLD §5.7. Moved here from the T-105 test page, which still runs on it (proto/pinch/).

const alpha = (cutoffHz: number, dtS: number) => 1 / (1 + 1 / (2 * Math.PI * cutoffHz * dtS));

/** FR-HND-03: the 1-euro filter (Casiez 2012) for one axis. The cutoff is min cutoff + beta x |speed|. */
export class OneEuroFilter {
  private raw = NaN; // NaN: no sample yet
  private value = 0;
  private rate = 0;

  constructor(
    private readonly minCutoffHz: number,
    private readonly beta: number,
    private readonly dCutoffHz: number,
  ) {}

  /** The input's rate of change in units per second, low-passed at the d-cutoff. 0 until the second sample. */
  get speed(): number {
    return this.rate;
  }

  /** The next sample passes through unfiltered (a lost hand was found again). */
  reset(): void {
    this.raw = NaN;
  }

  /** A sample that is not a finite number is ignored: the last value comes back and nothing is remembered. */
  filter(raw: number, dtS: number): number {
    if (!Number.isFinite(raw)) return this.value;
    if (Number.isNaN(this.raw)) {
      this.value = raw;
      this.rate = 0;
    } else if (dtS > 0) {
      this.rate += alpha(this.dCutoffHz, dtS) * ((raw - this.raw) / dtS - this.rate);
      this.value += alpha(this.minCutoffHz + this.beta * Math.abs(this.rate), dtS) * (raw - this.value);
    }
    this.raw = raw;
    return this.value;
  }
}
