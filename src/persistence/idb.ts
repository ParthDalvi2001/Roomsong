// IndexedDB as a Backend of the store (API_SPEC §1.5, FR-PER-01). In its own file because only a browser can run
// it: node has no IndexedDB, so tests/e2e/10-persistence.spec.ts runs it and the unit coverage gate leaves this
// one file out by name (vitest.config.ts, NFR-MAINT-01).
import { DB_NAME, DB_VERSION, IDB_OPEN_TIMEOUT_MS, STORE_NAME } from './config.js';

import type { Backend } from './Store.js';

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
export function openIndexedDb(): Promise<Backend> {
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
