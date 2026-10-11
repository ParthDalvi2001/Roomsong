// The local save of the garden (API_SPEC §1.5 and §4, FR-PER-01, FR-PER-02): IndexedDB, with localStorage as the
// fallback, both behind the four-call Backend below. Nothing here leaves the device (FR-PER-04).
import { clock, log } from '../core/index.js';

import {
  BACKUP_KEY_PREFIX,
  BACKUPS_KEPT,
  DB_NAME,
  DB_VERSION,
  IDB_OPEN_TIMEOUT_MS,
  STATE_KEY,
  STORE_NAME,
  WEB_STORAGE_PREFIX,
} from './config.js';
import { migrate } from './migrations.js';
import { validateState } from './schema.js';

import type { GardenState } from '../garden/index.js';

export interface Store {
  /**
   * The saved garden, validated and migrated: a new object with the schema's fields only. null: nothing saved,
   * the storage cannot be read, or the state is corrupt or of an unknown version (then it is moved to a backup
   * key). Never rejects.
   */
  load(): Promise<GardenState | null>;
  /**
   * Writes now; PersistenceSystem does the debounce. Rejects, writing nothing, for a state load() would refuse,
   * and rejects when no storage took the write.
   */
  save(state: GardenState): Promise<void>;
}

/** A key-value storage. A call rejects when it fails; `get` resolves undefined for a key that holds nothing. */
export interface Backend {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

/** A valid state as load() found it: where it lies and the stored value, should it have to be moved to a backup. */
interface Copy {
  state: GardenState;
  backend: Backend;
  raw: unknown;
}

const backupTime = (key: string): number => Number(key.slice(BACKUP_KEY_PREFIX.length));
// All digits after the prefix: Number() alone would also read '', ' 7 ', '0x10' and '1e3' as a time.
const isBackup = (key: string): boolean =>
  key.startsWith(BACKUP_KEY_PREFIX) && /^\d+$/.test(key.slice(BACKUP_KEY_PREFIX.length));

/**
 * A store over storages in order of preference: IndexedDB, then localStorage. A write goes to the first one
 * that takes it and removes the state from the ones after it, so a later storage holds a state only when a
 * write to an earlier one failed: its copy is then the newer one, and load reads from the last storage back.
 * Two storages that hold different gardens: the older garden is loaded, the newer is backed up (D-033).
 */
export function createStore(backends: readonly Backend[]): Store {
  /** Moves a stored value to `state.backup.<now>` in its own storage and keeps the latest 2 there (FR-PER-02). */
  async function backUp(backend: Backend, raw: unknown, why: string): Promise<void> {
    const key = BACKUP_KEY_PREFIX + String(clock.now());
    await backend.set(key, raw);
    await backend.delete(STATE_KEY); // moved, not copied: a second load does not back it up again
    const backups = (await backend.keys()).filter(isBackup).sort((a, b) => backupTime(b) - backupTime(a));
    for (const old of backups.slice(BACKUPS_KEPT)) await backend.delete(old);
    log.warn('persistence', `${why}: moved to ${key}`);
  }

  async function load(): Promise<GardenState | null> {
    let found: Copy | null = null;
    for (const backend of [...backends].reverse()) {
      try {
        const raw = await backend.get(STATE_KEY);
        if (raw === undefined) continue;
        const state = migrate(raw);
        if (state === null) {
          await backUp(backend, raw, 'a saved garden is corrupt');
          continue;
        }
        const copy: Copy = { state, backend, raw };
        if (found === null) found = copy;
        else if (state.createdAt === found.state.createdAt) {
          // One garden twice: the later visit is the newer copy (a fallback copy that could not be removed).
          if (state.lastVisitAt > found.state.lastVisitAt) found = copy;
        } else {
          // Two gardens: IndexedDB did not open for a whole session, and a second one was started. The older
          // one is the grown one and is returned (D-033). The next save would remove the newer one, so it is
          // moved to a backup in its own storage first: no garden is dropped without a backup.
          const newer = state.createdAt < found.state.createdAt ? found : copy;
          if (newer === found) found = copy;
          await backUp(newer.backend, newer.raw, 'a second, newer garden was found');
        }
      } catch (err) {
        log.warn('persistence', 'a storage could not be read or backed up', err);
      }
    }
    return found?.state ?? null;
  }

  async function save(state: GardenState): Promise<void> {
    // Never write what load would refuse: that would cost the whole garden at the next start, not one save.
    const valid = validateState(state);
    if (valid === null) throw new Error('the garden state is not valid; not saved');
    let isSaved = false;
    for (const backend of backends) {
      try {
        if (isSaved) await backend.delete(STATE_KEY);
        else await backend.set(STATE_KEY, valid);
        isSaved = true;
      } catch (err) {
        log.warn('persistence', 'a storage refused a write', err);
      }
    }
    if (!isSaved) throw new Error('no storage took the garden state');
  }

  return { load, save };
}

/** localStorage as a Backend: each value is JSON under `roomsong.garden.<key>`. */
export function webStorageBackend(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>,
): Backend {
  // What the storage throws (blocked, full) becomes a rejection: a throw inside a promise's executor rejects it.
  const attempt = <T>(call: () => T): Promise<T> => new Promise((resolve) => resolve(call()));
  return {
    get: (key) =>
      attempt(() => {
        const text = storage.getItem(WEB_STORAGE_PREFIX + key);
        if (text === null) return undefined;
        try {
          return JSON.parse(text) as unknown;
        } catch {
          return text; // not JSON: handed on as it is, so the store refuses it and backs it up
        }
      }),
    set: (key, value) => attempt(() => storage.setItem(WEB_STORAGE_PREFIX + key, JSON.stringify(value))),
    delete: (key) => attempt(() => storage.removeItem(WEB_STORAGE_PREFIX + key)),
    keys: () =>
      attempt(() => {
        const keys: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key?.startsWith(WEB_STORAGE_PREFIX)) keys.push(key.slice(WEB_STORAGE_PREFIX.length));
        }
        return keys;
      }),
  };
}

/** One transaction per call. It resolves when the transaction has completed, so a resolved `set` is committed. */
function inTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = run(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => resolve(request.result);
    // A failed request aborts its transaction, so this one handler sees a failed request and a failed commit.
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

/**
 * IndexedDB as a Backend. Rejects where IndexedDB is missing, blocked, cannot be opened or does not answer
 * within IDB_OPEN_TIMEOUT_MS: the start of the app must not wait for it. Run in a browser by
 * tests/e2e/10-persistence.spec.ts; the unit tests reach the timeout only.
 * shortcut: a write that never completes is not timed out, upgrade (abort the transaction on a timer) if a
 * device ever shows one.
 */
function openIndexedDb(): Promise<Backend> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    let isLate = false;
    const timer = setTimeout(() => {
      isLate = true;
      reject(new Error('IndexedDB did not open in time'));
    }, IDB_OPEN_TIMEOUT_MS);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE_NAME);
    open.onerror = () => {
      clearTimeout(timer);
      reject(open.error ?? new Error('IndexedDB could not be opened'));
    };
    open.onsuccess = () => {
      clearTimeout(timer);
      const db = open.result;
      if (isLate) {
        db.close(); // the store went on without it: nobody holds this connection
        return;
      }
      resolve({
        get: (key) => inTransaction<unknown>(db, 'readonly', (s) => s.get(key)),
        set: async (key, value) => void (await inTransaction(db, 'readwrite', (s) => s.put(value, key))),
        delete: (key) => inTransaction(db, 'readwrite', (s) => s.delete(key)),
        keys: async () =>
          (await inTransaction(db, 'readonly', (s) => s.getAllKeys())).filter((k) => typeof k === 'string'),
      });
    };
  });
}

/**
 * The app's store: IndexedDB first, localStorage as the fallback (FR-PER-01). Never rejects and settles within
 * IDB_OPEN_TIMEOUT_MS: with no storage at all it still opens, `load` gives null and `save` rejects, which
 * PersistenceSystem reports (E_SAVE_FAILED).
 */
export async function openStore(): Promise<Store> {
  const backends: Backend[] = [];
  try {
    backends.push(await openIndexedDb());
  } catch (err) {
    log.warn('persistence', 'IndexedDB is not available', err);
  }
  try {
    backends.push(webStorageBackend(localStorage)); // reading `localStorage` throws where storage is blocked
  } catch (err) {
    log.warn('persistence', 'localStorage is not available', err);
  }
  return createStore(backends);
}
