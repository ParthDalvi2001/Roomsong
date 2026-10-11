// T-122, TC-PER-01 and TC-PER-02 in a real browser (FR-PER-01, FR-PER-02). Node has no IndexedDB and no
// localStorage, so the unit tests run the store over an in-memory stand-in; here Chromium's own storage is used,
// which is the path every real save takes. Nothing wires persistence/ into the app before T-128, so the page
// loads the module from the dev server, as 09-audio.spec.ts does. Each test has its own browser context and so
// its own empty storage. The database is read and written back with IndexedDB calls of this file, which share
// no code with the adapter under test. Emulator-page result (E): desktop Chromium. It says nothing about the
// Quest Browser, a full disk, eviction or a database that hangs.
// Not here: the flush on `visibilitychange`. That is wiring in src/index.ts and comes with T-128.
import { expect, test, type Page } from '@playwright/test';

import { openApp, readRoom } from './support/iwer';

import type { GardenState } from '../../src/garden/index';

type Persistence = typeof import('../../src/persistence/index');

const MODULE_URL = '/src/persistence/index.ts';
/** API_SPEC §4, spelled out: the contract's names, not the module's constants. */
const DB = 'roomsong';
const STORE = 'garden';
const WEB_STORAGE_KEY = 'roomsong.garden.state';

const SETTINGS: GardenState['settings'] = {
  tempo: 84,
  volume: 0.5,
  reverb: 'auto',
  oneHand: false,
  gazeDwell: false,
  dwellMs: 1200,
  highContrast: false,
  reducedMotion: false,
  beatRing: true,
  dominantHand: 'right',
  hintsEnabled: true,
};

/** A valid saved garden with `plantCount` plants in cells 0, 1, 2…; `visits` tells two saves of it apart. */
function garden(visits: number, plantCount: number): GardenState {
  return {
    version: 1,
    bedInner: 0.12,
    bedOuter: 0.3,
    bedHeightOffset: 0.05,
    plants: Array.from({ length: plantCount }, (_, i) => ({
      id: `plant-${i}`,
      voice: 'bell',
      cell: { ring: Math.floor(i / 16), step: i % 16 },
      height: 0.5,
      hue: 0.25,
      plantedAt: 1000 + i,
    })),
    seeds: [{ id: 'seed-1', voice: 'pad', hue: 0.4, receivedAt: 500 }],
    lastSeedDate: '2026-10-11',
    createdAt: 1,
    lastVisitAt: 2,
    visits,
    codex: { discovered: ['bell'] },
    anchorHandle: 'anchor-uuid',
    anchorLevel: 2,
    settings: SETTINGS,
  };
}

/** In the page: the app's store, opened anew, saves `state`. A save that rejects fails the test. */
function save(page: Page, state: GardenState): Promise<void> {
  return page.evaluate(
    async ([url, state]) => {
      const { openStore } = (await import(/* @vite-ignore */ url)) as Persistence;
      await (await openStore()).save(state);
    },
    [MODULE_URL, state] as const,
  );
}

/** In the page: the app's store, opened anew, loads. */
function load(page: Page): Promise<GardenState | null> {
  return page.evaluate(async (url) => {
    const { openStore } = (await import(/* @vite-ignore */ url)) as Persistence;
    return (await openStore()).load();
  }, MODULE_URL);
}

/** In the page: IndexedDB refuses to open, as where site storage is blocked; then the store saves `state`. */
function saveWithIndexedDbBlocked(page: Page, state: GardenState): Promise<void> {
  return page.evaluate(
    async ([url, state]) => {
      IDBFactory.prototype.open = () => {
        throw new DOMException('blocked by the test', 'SecurityError');
      };
      const { openStore } = (await import(/* @vite-ignore */ url)) as Persistence;
      await (await openStore()).save(state);
    },
    [MODULE_URL, state] as const,
  );
}

/** Every key and value of database `roomsong`, store `garden`. Call it after the store has opened once. */
function rawGarden(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    ([dbName, storeName]) =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const open = indexedDB.open(dbName);
        open.onerror = () => reject(new Error(`database ${dbName} did not open: ${String(open.error)}`));
        open.onsuccess = () => {
          const db = open.result;
          try {
            const store = db.transaction(storeName, 'readonly').objectStore(storeName);
            const keys = store.getAllKeys();
            const values = store.getAll();
            values.onsuccess = () => {
              db.close();
              // The store's keys are strings (API_SPEC §4).
              const entries = keys.result.map((key, i) => [key as string, values.result[i] as unknown]);
              resolve(Object.fromEntries(entries) as Record<string, unknown>);
            };
          } catch (cause) {
            db.close();
            reject(new Error(`database ${dbName} has no store ${storeName}: ${String(cause)}`));
          }
        };
      }),
    [DB, STORE] as const,
  );
}

/** Puts `value` at `key` in database `roomsong`, store `garden`: how a test plants a corrupt state. */
function rawPut(page: Page, key: string, value: unknown): Promise<void> {
  return page.evaluate(
    ([dbName, storeName, key, value]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(dbName);
        open.onerror = () => reject(new Error(`database ${dbName} did not open: ${String(open.error)}`));
        open.onsuccess = () => {
          const db = open.result;
          const transaction = db.transaction(storeName, 'readwrite');
          transaction.objectStore(storeName).put(value, key);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onabort = () => reject(new Error(`put aborted: ${String(transaction.error)}`));
        };
      }),
    [DB, STORE, key, value] as const,
  );
}

/** The app's own keys in localStorage (the emulator keeps keys of its own there). */
const webStorageKeys = (page: Page): Promise<string[]> =>
  page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('roomsong.')));

/** A second page of the same browser context: the same storage, a new page load. */
async function nextPage(page: Page, pageErrors: string[]): Promise<{ page: Page; offHost: string[] }> {
  const next = await page.context().newPage();
  next.on('pageerror', (error) => pageErrors.push(String(error)));
  return { page: next, offHost: await openApp(next, readRoom('none')) };
}

test('T-122 TC-PER-01 a full bed saved in one page loads in the next, from IndexedDB roomsong / garden / state', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  const offHost = await openApp(page, readRoom('none'));
  const fullBed = garden(3, 80);

  expect(await load(page)).toBeNull(); // a first run: nothing saved
  await save(page, fullBed);
  const stored = await rawGarden(page);
  expect(Object.keys(stored)).toEqual(['state']);
  expect(stored.state).toEqual(fullBed);
  expect(await webStorageKeys(page)).toEqual([]); // IndexedDB took the write: no copy in localStorage

  const second = await nextPage(page, pageErrors);
  expect(await load(second.page)).toEqual(fullBed);

  expect(pageErrors).toEqual([]);
  expect([...offHost, ...second.offHost]).toEqual([]);
});

test('T-122 TC-PER-02 a corrupt state loads as null and is moved to state.backup.<ms>; the latest 2 are kept', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  const offHost = await openApp(page, readRoom('none'));

  await save(page, garden(1, 2));
  const started = Date.now();
  const stamps: number[] = [];
  for (const corrupt of [{ version: 7 }, { version: 1, plants: 'x' }, 'not a garden']) {
    // The backup key is the time in ms: wait for the clock to pass the last one, so that no two share a key.
    await page.waitForFunction((last) => Date.now() > last, stamps[stamps.length - 1] ?? 0);
    await rawPut(page, 'state', corrupt);
    expect(await load(page)).toBeNull();

    const stored = await rawGarden(page);
    expect(Object.keys(stored)).not.toContain('state'); // moved, not copied
    const backups = Object.keys(stored).sort();
    expect(backups.every((key) => /^state\.backup\.\d+$/.test(key))).toBe(true);
    const newest = backups[backups.length - 1] ?? '';
    expect(stored[newest]).toEqual(corrupt);
    stamps.push(Number(newest.slice('state.backup.'.length)));
    expect(backups).toHaveLength(Math.min(stamps.length, 2));
  }
  expect(stamps[0]).toBeGreaterThanOrEqual(started - 1000); // a time of this run, on the page's clock
  const kept = Object.keys(await rawGarden(page)).sort();
  expect(kept).toEqual([`state.backup.${stamps[1]}`, `state.backup.${stamps[2]}`]);

  expect(pageErrors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('T-122 FR-PER-01 with IndexedDB blocked the save lands in localStorage; the next good save removes that copy', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  const offHost = await openApp(page, readRoom('none'));

  await save(page, garden(1, 3)); // in IndexedDB
  await saveWithIndexedDbBlocked(page, garden(2, 3));
  expect(await webStorageKeys(page)).toEqual([WEB_STORAGE_KEY]);
  const text = await page.evaluate((key) => localStorage.getItem(key), WEB_STORAGE_KEY);
  expect(JSON.parse(text ?? 'null')).toEqual(garden(2, 3));

  // A new page: IndexedDB opens again. It still holds visit 1; the localStorage copy is the newer one.
  const second = await nextPage(page, pageErrors);
  expect((await rawGarden(second.page)).state).toEqual(garden(1, 3));
  expect(await load(second.page)).toEqual(garden(2, 3));
  await save(second.page, garden(3, 3));
  expect((await rawGarden(second.page)).state).toEqual(garden(3, 3));
  expect(await webStorageKeys(second.page)).toEqual([]);
  expect(await load(second.page)).toEqual(garden(3, 3));

  expect(pageErrors).toEqual([]);
  expect([...offHost, ...second.offHost]).toEqual([]);
});
