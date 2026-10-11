// TC-PER-01, TC-PER-02, TC-PER-04: the store over an in-memory Backend. Nothing here runs IndexedDB itself:
// the adapter in Store.ts (openIndexedDb) is run in a browser by tests/e2e/10-persistence.spec.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '../../../src/core/index.js';
import { cellCentre, snapToCell } from '../../../src/garden/index.js';
import { IDB_OPEN_TIMEOUT_MS } from '../../../src/persistence/config.js';
import { createStore, openStore, webStorageBackend } from '../../../src/persistence/Store.js';
import { plant } from '../garden/fixtures.js';

import { CORRUPT, memoryBackend, omit, savedGarden } from './fixtures.js';

const NOW = 1_760_200_000_000;

/** A Storage with only what webStorageBackend uses. */
function fakeStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'> & {
  items: Map<string, string>;
} {
  const items = new Map<string, string>();
  return {
    items,
    get length() {
      return items.size;
    },
    key: (i) => [...items.keys()][i] ?? null,
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => void items.set(k, v),
    removeItem: (k) => void items.delete(k),
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.spyOn(log, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('persistence/Store save and load (TC-PER-01)', () => {
  it('round-trips a state, settings.dwellMs and the anchor pair included, at key "state"', async () => {
    const backend = memoryBackend();
    const store = createStore([backend]);
    await store.save(savedGarden());
    expect([...backend.data.keys()]).toEqual(['state']);
    const loaded = await store.load();
    expect(loaded).toEqual(savedGarden());
    expect(loaded).toMatchObject({ anchorHandle: 'anchor-uuid', anchorLevel: 2 });
    expect(loaded?.settings.dwellMs).toBe(1200);
  });

  it('loads null and writes nothing when nothing was saved', async () => {
    const backend = memoryBackend();
    expect(await createStore([backend]).load()).toBeNull();
    expect(backend.data.size).toBe(0);
  });

  it('a later save replaces the earlier one', async () => {
    const store = createStore([memoryBackend()]);
    await store.save(savedGarden());
    await store.save(savedGarden({ plants: [plant('only', 3, 7)] }));
    expect((await store.load())?.plants).toEqual([plant('only', 3, 7)]);
  });

  it('refuses to write a state load would reject, and the last good save stays', async () => {
    const backend = memoryBackend();
    const store = createStore([backend]);
    await store.save(savedGarden());
    const poisoned = savedGarden({ plants: [plant('nan', 1, 1, { plantedAt: Number.NaN })] });
    await expect(store.save(poisoned)).rejects.toThrow();
    expect(await store.load()).toEqual(savedGarden());
  });

  it('writes only the schema: a key that is not part of it never reaches the disk (FR-ROOM-13)', async () => {
    const backend = memoryBackend();
    await createStore([backend]).save({ ...savedGarden(), signature: { keyRoot: 0 } } as never);
    expect(backend.data.get('state')).toEqual(savedGarden());
  });

  it('load returns the repaired state, never the stored value as it is (TC-PER-04)', async () => {
    const backend = memoryBackend();
    const stored = {
      ...savedGarden({ plants: [plant('n', 2, 3)] }),
      signature: { keyRoot: 0 }, // not part of the schema
      settings: { ...savedGarden().settings, dwellMs: 700 }, // not one of 600, 900, 1200
    };
    backend.data.set('state', omit(stored, 'anchorLevel')); // a handle with no level
    const loaded = await createStore([backend]).load();
    const repaired = savedGarden({
      plants: [plant('n', 2, 3)],
      settings: { ...savedGarden().settings, dwellMs: 900 },
    });
    expect(loaded).toEqual(omit(omit(repaired, 'anchorHandle'), 'anchorLevel'));
    expect(loaded).not.toHaveProperty('anchorHandle');
    expect(loaded).not.toHaveProperty('signature');
    // The backend handed out a plain copy of the cell; the loaded plant holds garden's shared one.
    expect(loaded?.plants[0]?.cell).toBe(snapToCell(cellCentre({ ring: 2, step: 3 }, { x: 0, y: 0 })));
  });
});

describe('persistence/Store corrupt data (TC-PER-02, TC-PER-04)', () => {
  it.each(CORRUPT)('%s: a backup, a new garden, no throw', async (_what, raw) => {
    const backend = memoryBackend();
    backend.data.set('state', raw);
    const store = createStore([backend]);
    await expect(store.load()).resolves.toBeNull();
    expect([...backend.data.keys()]).toEqual([`state.backup.${NOW}`]);
    expect(backend.data.get(`state.backup.${NOW}`)).toEqual(raw);
  });

  it('moves the corrupt state: a second load finds nothing and makes no second backup', async () => {
    const backend = memoryBackend();
    backend.data.set('state', { version: 7 });
    const store = createStore([backend]);
    await store.load();
    vi.setSystemTime(NOW + 1000);
    expect(await store.load()).toBeNull();
    expect([...backend.data.keys()]).toEqual([`state.backup.${NOW}`]);
  });

  it('keeps the latest 2 backups, by time and not by spelling', async () => {
    const backend = memoryBackend();
    const store = createStore([backend]);
    for (const at of [999, 1000, 20, 1001]) {
      vi.setSystemTime(at);
      backend.data.set('state', { corruptAt: at });
      await store.load();
    }
    expect([...backend.data.keys()].sort()).toEqual(['state.backup.1000', 'state.backup.1001']);
    expect(backend.data.get('state.backup.1001')).toEqual({ corruptAt: 1001 });
  });

  it('trims only its own backups: a key whose tail is not all digits is left alone', async () => {
    const backend = memoryBackend();
    const notOurs = ['other', 'state.backup.', 'state.backup. 7 ', 'state.backup.-5', 'state.backup.0x10'];
    notOurs.push('state.backup.1e3', 'state.backup.note');
    for (const key of notOurs) backend.data.set(key, 1);
    const store = createStore([backend]);
    for (const at of [1, 2, 3]) {
      vi.setSystemTime(at);
      backend.data.set('state', 'bad');
      await store.load();
    }
    expect([...backend.data.keys()].sort()).toEqual([...notOurs, 'state.backup.2', 'state.backup.3'].sort());
  });

  it('still returns null, and keeps the corrupt state where it is, when the backup cannot be written', async () => {
    const backend = memoryBackend();
    backend.data.set('state', { version: 7 });
    backend.failing.add('set');
    await expect(createStore([backend]).load()).resolves.toBeNull();
    expect(backend.data.get('state')).toEqual({ version: 7 });
  });

  it('returns null, with no throw, when the storage cannot be read', async () => {
    const backend = memoryBackend();
    backend.data.set('state', savedGarden());
    backend.failing.add('get');
    await expect(createStore([backend]).load()).resolves.toBeNull();
    expect(backend.data.get('state')).toEqual(savedGarden());
  });
});

describe('persistence/Store fallback storage (FR-PER-01, LLD §8)', () => {
  const older = savedGarden({ visits: 1 });
  const newer = savedGarden({ visits: 2 });

  it('writes to the fallback when the first storage refuses, and loads that newer copy', async () => {
    const [first, fallback] = [memoryBackend(), memoryBackend()];
    const store = createStore([first, fallback]);
    await store.save(older);
    expect(fallback.data.size).toBe(0);
    first.failing.add('set');
    await store.save(newer);
    expect(first.data.get('state')).toEqual(older);
    expect(fallback.data.get('state')).toEqual(newer);
    first.failing.clear();
    expect(await store.load()).toEqual(newer);
  });

  it('removes the fallback copy once the first storage takes a write again', async () => {
    const [first, fallback] = [memoryBackend(), memoryBackend()];
    fallback.data.set('state', older);
    const store = createStore([first, fallback]);
    await store.save(newer);
    expect(fallback.data.has('state')).toBe(false);
    expect(await store.load()).toEqual(newer);
  });

  it('backs up a corrupt fallback copy where it lies and loads the valid copy of the first storage', async () => {
    const [first, fallback] = [memoryBackend(), memoryBackend()];
    first.data.set('state', older);
    fallback.data.set('state', 'not a garden');
    expect(await createStore([first, fallback]).load()).toEqual(older);
    expect([...fallback.data.keys()]).toEqual([`state.backup.${NOW}`]);
    expect([...first.data.keys()]).toEqual(['state']);
  });

  it('backs up a corrupt copy of the first storage too, when the fallback holds the state', async () => {
    const [first, fallback] = [memoryBackend(), memoryBackend()];
    first.data.set('state', 'not a garden');
    fallback.data.set('state', newer);
    expect(await createStore([first, fallback]).load()).toEqual(newer);
    expect([...first.data.keys()]).toEqual([`state.backup.${NOW}`]);
    expect([...fallback.data.keys()]).toEqual(['state']);
  });

  it('never overwrites another garden without a backup: three sessions, the second without the first storage', async () => {
    const [first, fallback] = [memoryBackend(), memoryBackend()];
    const plants = Array.from({ length: 30 }, (_, i) => plant(`b${i}`, Math.floor(i / 16), i % 16));
    const grown = savedGarden({ createdAt: 1000, plants, seeds: [] });
    // Session A: the garden is saved in the first storage.
    await createStore([first, fallback]).save(grown);
    // Session B: the first storage does not open. Nothing is found, so a new garden starts, in the fallback.
    const sessionB = createStore([fallback]);
    expect(await sessionB.load()).toBeNull();
    const started = savedGarden({ createdAt: 2000, plants: [], visits: 1 });
    await sessionB.save(started);
    // Session C: both are back. The grown garden, the older one, loads (D-033); the one started in session B
    // is moved to a backup in its own storage before a save can remove it.
    const sessionC = createStore([first, fallback]);
    expect(await sessionC.load()).toEqual(grown);
    expect([...fallback.data.keys()]).toEqual([`state.backup.${NOW}`]);
    const tended = savedGarden({ createdAt: 1000, plants, seeds: [], visits: 4 });
    await sessionC.save(tended);
    // Nothing was dropped: one garden is the state, the other is in a backup.
    expect([...first.data.keys()]).toEqual(['state']);
    expect(first.data.get('state')).toEqual(tended);
    expect([...fallback.data.keys()]).toEqual([`state.backup.${NOW}`]);
    expect(fallback.data.get(`state.backup.${NOW}`)).toEqual(started);
  });

  it('of two gardens the older one loads wherever it lies, and the newer is backed up in its own storage', async () => {
    const [first, fallback] = [memoryBackend(), memoryBackend()];
    const older = savedGarden({ createdAt: 1000, plants: [plant('old', 1, 1)] });
    const younger = savedGarden({ createdAt: 2000, plants: [plant('new', 2, 2)] });
    first.data.set('state', younger);
    fallback.data.set('state', older);
    expect(await createStore([first, fallback]).load()).toEqual(older);
    expect([...first.data.keys()]).toEqual([`state.backup.${NOW}`]);
    expect(first.data.get(`state.backup.${NOW}`)).toEqual(younger);
    expect([...fallback.data.keys()]).toEqual(['state']);
  });

  it('of two copies of one garden returns the one with the later visit, and backs nothing up', async () => {
    // A fallback copy that could not be removed after the first storage took a later write.
    const [first, fallback] = [memoryBackend(), memoryBackend()];
    const current = savedGarden({ lastVisitAt: 6000, visits: 2 });
    first.data.set('state', current);
    fallback.data.set('state', savedGarden({ lastVisitAt: 5000, visits: 1 }));
    expect(await createStore([first, fallback]).load()).toEqual(current);
    expect([...first.data.keys(), ...fallback.data.keys()]).toEqual(['state', 'state']);
  });

  it('rejects a save that no storage took, and with no storage at all', async () => {
    const [first, fallback] = [memoryBackend(), memoryBackend()];
    first.failing.add('set');
    fallback.failing.add('set');
    await expect(createStore([first, fallback]).save(newer)).rejects.toThrow();
    await expect(createStore([]).save(newer)).rejects.toThrow();
    await expect(createStore([]).load()).resolves.toBeNull();
  });
});

describe('persistence/Store webStorageBackend (the localStorage fallback)', () => {
  it('round-trips a state as JSON under its own prefix', async () => {
    const storage = fakeStorage();
    const store = createStore([webStorageBackend(storage)]);
    await store.save(savedGarden());
    expect([...storage.items.keys()]).toEqual(['roomsong.garden.state']);
    expect(await store.load()).toEqual(savedGarden());
  });

  it('treats text that is not JSON as corrupt: the text is backed up, and other keys of the origin are left alone', async () => {
    const storage = fakeStorage();
    storage.items.set('roomsong.garden.state', '{"version":1,"plants":[{');
    storage.items.set('someone.else', 'kept');
    const backend = webStorageBackend(storage);
    await expect(createStore([backend]).load()).resolves.toBeNull();
    expect(await backend.keys()).toEqual([`state.backup.${NOW}`]);
    expect(await backend.get(`state.backup.${NOW}`)).toBe('{"version":1,"plants":[{');
    expect(storage.items.get('someone.else')).toBe('kept');
  });

  it('rejects, and does not throw, when the storage is full', async () => {
    const storage = fakeStorage();
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const saving = createStore([webStorageBackend(storage)]).save(savedGarden());
    await expect(saving).rejects.toThrow();
  });
});

describe('persistence/Store openStore', () => {
  it('uses localStorage when IndexedDB is missing', async () => {
    const storage = fakeStorage();
    vi.stubGlobal('indexedDB', undefined);
    vi.stubGlobal('localStorage', storage);
    const store = await openStore();
    await store.save(savedGarden());
    expect(storage.items.has('roomsong.garden.state')).toBe(true);
    expect(await store.load()).toEqual(savedGarden());
  });

  it('still opens with no storage at all: load gives null and save rejects', async () => {
    vi.stubGlobal('indexedDB', undefined);
    vi.stubGlobal('localStorage', undefined);
    const store = await openStore();
    await expect(store.load()).resolves.toBeNull();
    await expect(store.save(savedGarden())).rejects.toThrow();
  });

  it('opens on localStorage alone when IndexedDB does not answer in time, and closes a connection that comes late', async () => {
    vi.useFakeTimers(); // all timers, not the date alone
    vi.setSystemTime(NOW);
    const storage = fakeStorage();
    const request: { onsuccess?: () => void; result?: { close: () => void } } = {};
    vi.stubGlobal('indexedDB', { open: () => request });
    vi.stubGlobal('localStorage', storage);
    let isOpen = false;
    const opening = openStore().then((store) => {
      isOpen = true;
      return store;
    });
    await vi.advanceTimersByTimeAsync(IDB_OPEN_TIMEOUT_MS - 1);
    expect(isOpen).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(isOpen).toBe(true);
    await (await opening).save(savedGarden());
    expect(storage.items.has('roomsong.garden.state')).toBe(true);

    const close = vi.fn();
    request.result = { close };
    request.onsuccess?.();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
