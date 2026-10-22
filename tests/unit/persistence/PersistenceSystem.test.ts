// TC-PER-01 (the debounce half): many changes, one write; a flush on demand; a failed write loses nothing.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '../../../src/core/index.js';
import { SAVE_DEBOUNCE_MS } from '../../../src/persistence/config.js';
import { PersistenceSystem } from '../../../src/persistence/PersistenceSystem.js';

import { savedGarden } from './fixtures.js';

import type { GardenState } from '../../../src/garden/index.js';
import type { Store } from '../../../src/persistence/Store.js';

/** A store that records what it was asked to write. `gate` holds every write until it is released. */
function fakeStore(): Store & {
  written: GardenState[];
  writtenNow: GardenState[];
  started: number;
  fail: boolean;
  gate: Promise<void> | null;
} {
  const store = {
    written: [] as GardenState[],
    writtenNow: [] as GardenState[],
    started: 0,
    fail: false,
    gate: null as Promise<void> | null,
    load: () => Promise.resolve(null),
    backupKey: () => 'state.backup.0',
    async save(state: GardenState): Promise<void> {
      store.started++;
      if (store.gate !== null) await store.gate;
      if (store.fail) throw new Error('disk full');
      store.written.push(state);
    },
    saveNow: (state: GardenState) => store.writtenNow.push(state) > 0,
  };
  return store;
}
const visit = (visits: number): GardenState => savedGarden({ visits });

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('persistence/PersistenceSystem', () => {
  it('writes a burst of changes once, the last state, 500 ms after the first change (FR-PER-01)', async () => {
    const store = fakeStore();
    const system = new PersistenceSystem(store);
    expect(SAVE_DEBOUNCE_MS).toBe(500);
    for (let i = 1; i <= 20; i++) system.save(visit(i));
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS - 1);
    expect(store.written).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(store.written).toEqual([visit(20)]);
    await vi.advanceTimersByTimeAsync(10 * SAVE_DEBOUNCE_MS);
    expect(store.written).toHaveLength(1);
  });

  it('does not let a steady stream of changes put the write off: no change waits longer than 500 ms', async () => {
    const store = fakeStore();
    const system = new PersistenceSystem(store);
    for (let i = 1; i <= 20; i++) {
      system.save(visit(i)); // one change every 100 ms, for 2 s
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(store.written.map((s) => s.visits)).toEqual([5, 10, 15, 20]);
  });

  it('flush writes at once, and the timer that was running writes nothing more', async () => {
    const store = fakeStore();
    const system = new PersistenceSystem(store);
    system.save(visit(1));
    await system.flush();
    expect(store.written).toEqual([visit(1)]);
    await vi.advanceTimersByTimeAsync(10 * SAVE_DEBOUNCE_MS);
    expect(store.written).toHaveLength(1);
  });

  it('flush with nothing to save writes nothing', async () => {
    const store = fakeStore();
    await new PersistenceSystem(store).flush();
    expect(store.written).toEqual([]);
  });

  it('keeps the state when a write fails: no throw, E_SAVE_FAILED logged, and the next flush writes it', async () => {
    const error = vi.spyOn(log, 'error').mockImplementation(() => undefined);
    const store = fakeStore();
    const onSaveFailed = vi.fn();
    const system = new PersistenceSystem(store, onSaveFailed);
    store.fail = true;
    system.save(visit(7));
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect(store.written).toEqual([]);
    expect(error).toHaveBeenCalledWith('persistence', 'E_SAVE_FAILED', expect.any(Error));
    expect(onSaveFailed).toHaveBeenCalledTimes(1);
    await expect(system.flush()).resolves.toBeUndefined(); // still failing: no rejection

    store.fail = false;
    await system.flush();
    expect(store.written).toEqual([visit(7)]);
    await system.flush();
    expect(store.written).toHaveLength(1); // saved: nothing is pending any more
  });

  it('reports a run of failed writes once, and again only after a write has succeeded', async () => {
    const error = vi.spyOn(log, 'error').mockImplementation(() => undefined);
    const store = fakeStore();
    const onSaveFailed = vi.fn();
    const system = new PersistenceSystem(store, onSaveFailed);
    store.fail = true;
    for (let i = 1; i <= 20; i++) {
      system.save(visit(i)); // 10 s of steady changes over a storage that refuses every write
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    }
    expect(store.started).toBe(20);
    expect(onSaveFailed).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);

    store.fail = false;
    await system.flush();
    expect(store.written).toEqual([visit(20)]);
    store.fail = true;
    system.save(visit(21));
    await system.flush();
    expect(onSaveFailed).toHaveBeenCalledTimes(2);
  });

  it('goes on saving when onSaveFailed throws: the throw is logged and flush still never rejects', async () => {
    const error = vi.spyOn(log, 'error').mockImplementation(() => undefined);
    const store = fakeStore();
    const system = new PersistenceSystem(store, () => {
      throw new Error('no world to raise a caption in');
    });
    store.fail = true;
    system.save(visit(1));
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS); // the timer path: a rejection here would be unhandled
    expect(error).toHaveBeenCalledWith('persistence', 'onSaveFailed threw', expect.any(Error));

    store.fail = false;
    await expect(system.flush()).resolves.toBeUndefined();
    expect(store.written).toEqual([visit(1)]);
    system.save(visit(2));
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect(store.written).toEqual([visit(1), visit(2)]);
  });

  it('after a failed write the next change is written with the timer, without a flush', async () => {
    vi.spyOn(log, 'error').mockImplementation(() => undefined);
    const store = fakeStore();
    const system = new PersistenceSystem(store);
    store.fail = true;
    system.save(visit(1));
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    store.fail = false;
    system.save(visit(2));
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect(store.written).toEqual([visit(2)]);
  });

  it('a change made while a write is under way is written after it, never before and never lost', async () => {
    const store = fakeStore();
    const system = new PersistenceSystem(store);
    let release = (): void => undefined;
    store.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    system.save(visit(1));
    const first = system.flush();
    await vi.advanceTimersByTimeAsync(0); // the write of visit 1 is now held at the gate
    system.save(visit(2));
    const second = system.flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.started).toBe(1); // one write at a time: the second waits for the first
    expect(store.written).toEqual([]);
    release();
    await Promise.all([first, second]);
    expect(store.written).toEqual([visit(1), visit(2)]);
  });

  it('two flushes in a row write the newest state once', async () => {
    const store = fakeStore();
    const system = new PersistenceSystem(store);
    system.save(visit(1));
    const first = system.flush();
    system.save(visit(2));
    await Promise.all([first, system.flush()]);
    expect(store.written).toEqual([visit(2)]);
  });

  it('flushNow writes the pending state at once, synchronously, and leaves it pending for the flush', async () => {
    const store = fakeStore();
    const system = new PersistenceSystem(store);
    system.flushNow();
    expect(store.writtenNow).toEqual([]); // nothing pending: nothing written
    system.save(visit(1));
    system.flushNow();
    expect(store.writtenNow).toEqual([visit(1)]);
    await system.flush();
    expect(store.written).toEqual([visit(1)]);
    system.flushNow();
    expect(store.writtenNow).toHaveLength(1); // written to IndexedDB: nothing pending any more
  });
});

describe('persistence/PersistenceSystem: navigator.storage.persist() (T-174, D-057)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks once, after the first write that succeeded, without waiting for the answer; logs it once', async () => {
    const persist = vi.fn(() => new Promise<boolean>(() => {})); // a browser that never answers
    vi.stubGlobal('navigator', { storage: { persist } });
    const info = vi.spyOn(log, 'info');
    const store = fakeStore();
    const system = new PersistenceSystem(store);
    store.fail = true;
    vi.spyOn(log, 'error').mockImplementation(() => {});
    system.save(visit(1));
    await system.flush();
    expect(persist).not.toHaveBeenCalled(); // a failed write is no save
    store.fail = false;
    for (let i = 2; i <= 4; i++) {
      system.save(visit(i));
      await system.flush(); // resolves although persist() never does
    }
    expect(persist).toHaveBeenCalledTimes(1);
    expect(store.written).toEqual([visit(2), visit(3), visit(4)]);
    expect(info).not.toHaveBeenCalled(); // no answer, no line

    vi.stubGlobal('navigator', { storage: { persist: () => Promise.resolve(true) } });
    const answered = new PersistenceSystem(store);
    answered.save(visit(5));
    await answered.flush();
    await Promise.resolve();
    expect(info).toHaveBeenCalledExactlyOnceWith('persistence', 'storage.persist()', { granted: true });
  });

  it('takes a browser without it, or one whose persist() throws or rejects, as no and carries on saving', async () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const info = vi.spyOn(log, 'info').mockImplementation(() => {});
    for (const nav of [
      undefined,
      {},
      { storage: {} },
      {
        storage: {
          persist: () => {
            throw new Error('no');
          },
        },
      },
      { storage: { persist: () => Promise.reject(new Error('no')) } },
    ]) {
      vi.stubGlobal('navigator', nav);
      const store = fakeStore();
      const system = new PersistenceSystem(store);
      system.save(visit(1));
      await system.flush();
      system.save(visit(2));
      await system.flush();
      await Promise.resolve();
      expect(store.written).toEqual([visit(1), visit(2)]);
    }
    expect(info.mock.calls.length + warn.mock.calls.length).toBe(5); // one line each
  });
});
