// The debounce in front of the store (FR-PER-01, HLD §4.3). A plain class, not an ECS system: it has no
// per-frame work. Its caller hands it each new state and calls flush() when the page is hidden or the session ends.
import { log } from '../core/index.js';

import { SAVE_DEBOUNCE_MS } from './config.js';

import type { Store } from './Store.js';
import type { GardenState } from '../garden/index.js';

export class PersistenceSystem {
  private pending: GardenState | null = null; // the newest state that is not on disk yet
  private timer: ReturnType<typeof setTimeout> | null = null;
  private writing: Promise<void> = Promise.resolve(); // the writes, one after the other
  private isFailing = false; // the last write failed: a run of failures is reported once

  /**
   * `onSaveFailed` runs when writes start to fail: once per run of failed writes, and again only after a write
   * has succeeded (LLD §8: the "Saving unavailable" caption). A throw from it is logged and changes nothing.
   */
  constructor(
    private readonly store: Store,
    private readonly onSaveFailed: () => void = () => undefined,
  ) {}

  /**
   * Takes the state to save. A burst of calls is one write, of the last state. The timer runs from the first
   * call and is not restarted by the next, so no change waits longer than SAVE_DEBOUNCE_MS for its write.
   */
  save(state: GardenState): void {
    this.pending = state;
    this.timer ??= setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
  }

  /**
   * Writes the pending state now, after any write that is still under way. Never rejects. A write that fails
   * keeps its state pending: the next flush(), or the timer of the next save(), tries again. The first failure
   * of a run is logged (E_SAVE_FAILED) and reported through `onSaveFailed`.
   */
  flush(): Promise<void> {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.writing = this.writing.then(() => this.write());
    return this.writing;
  }

  private async write(): Promise<void> {
    const state = this.pending;
    if (state === null) return;
    try {
      await this.store.save(state);
      if (this.pending === state) this.pending = null; // a change made during the write stays pending
      this.isFailing = false;
    } catch (err) {
      if (this.isFailing) return; // already reported: a caption or a log line per write would flood both
      this.isFailing = true;
      log.error('persistence', 'E_SAVE_FAILED', err);
      try {
        this.onSaveFailed();
      } catch (thrown) {
        log.error('persistence', 'onSaveFailed threw', thrown); // it must not stop the writes that follow
      }
    }
  }
}
