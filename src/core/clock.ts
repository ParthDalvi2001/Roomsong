// The one time source (LLD §1). Milliseconds since the epoch, so a time from it can be stored (Plant.plantedAt)
// and compared across sessions (growth, FR-MUS-09).
import { MS_PER_DAY } from './config.js';
import { flags } from './flags.js';

/** Returns milliseconds. */
export type TimeSource = () => number;

export interface Clock {
  /** Milliseconds: the source's time plus the clock's fixed offset. Allocation-free. */
  now(): number;
  /** Replaces the source: a test's fake, or audio/'s own once its context runs (it must stay on the same ms timeline). */
  setSource(source: TimeSource): void;
}

export function createClock(source: TimeSource, offsetMs = 0): Clock {
  return {
    now: () => source() + offsetMs,
    setSource: (next) => {
      source = next;
    },
  };
}

/** Wall time, moved by the `fakeDay` flag (LLD §9). `Date.now` is looked up on each call so fake timers reach it. */
export const clock: Clock = createClock(() => Date.now(), flags.fakeDay * MS_PER_DAY);
