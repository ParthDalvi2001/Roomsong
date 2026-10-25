/// <reference types="webxr" />
// T-128e: save, restore and pause in the real app (LLD §3.5 e1 to e3, TC-E2E-06). The app's own store, saver and
// GardenSystem; the test plants through the bus with the events hands sends (16-seeds.spec.ts plants with the
// emulator's hands), and reads the save with a store of its own from the dev server's /src/persistence/index.ts.
// The state is read through `window.__roomsong.garden.state`: the first garden:changed of a page is over before a
// test can subscribe. Each test has its own browser context and so its own empty storage.
// Emulator results (E): desktop Chromium's IndexedDB. Nothing here says what the Quest Browser does with a
// headset taken off, a closed tab or a full disk (TC-DEV-05); the emulator keeps sending frames to a hidden
// session, a headset does not.
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom, WORLD_READY_MS, xrFrames } from './support/iwer';

import type { Cell, GardenState } from '../../src/garden/index';

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Persistence = typeof import('../../src/persistence/index');

interface Device {
  updateVisibilityState(state: XRVisibilityState): void;
}
interface Probe {
  /** The garden events of this page load, in order: `type` plus a detail. */
  heard: string[];
  /** Every caption key raised since the probe was made. */
  raised: string[];
  /**
   * The states IndexedDB was handed (`put` at key `state`), with the page time of each, and whether it was handed
   * in the task that emitted `xr:visibility { visible: false }` (a debounced write comes from a timer of its own).
   */
  puts: { state: GardenState; atMs: number; inHide: boolean }[];
  state(): GardenState;
  /** The plant targets on the bed: id and cell, from the app's own entities and state. */
  drawn(): { id: string; cell: Cell }[];
  triggers(): number;
  /** How many times a storage refused a write (the store logs each at warn). */
  refused(): number;
  /** Plants the next seed of the supply at `cell` the way hands would: palm up, a pinch on it, a carry. */
  plant(cell: Cell): void;
  /** What a store of the test's own loads now: the save on disk. */
  stored(): Promise<GardenState | null>;
}

const DB = 'roomsong';
const STORE = 'garden';
const SAVE_FAILED = 'E_SAVE_FAILED';
const CELLS: Cell[] = [
  { ring: 0, step: 3 },
  { ring: 4, step: 11 },
];

const device = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { IWER_DEVICE?: Device }).IWER_DEVICE) as Promise<
    JSHandle<Device>
  >;
const landing = (page: Page) => page.getByRole('main');

function watch(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

/** Listens in the page once the app is up (Enter usable), before Enter. */
async function probeSave(page: Page): Promise<JSHandle<Probe>> {
  await expect(landing(page).getByRole('button', { name: 'Enter the garden' })).toBeEnabled({
    timeout: WORLD_READY_MS,
  });
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const { Caption, Interactable } = await load<Components>('/src/core/components.ts');
    const { openStore } = await load<Persistence>('/src/persistence/index.ts');
    const { world, engine, garden } = window.__roomsong!;
    const heard: string[] = [];
    core.bus.on('room:signature', (e) => heard.push(`room:signature ${e.starterSeeds}`));
    core.bus.on('garden:grown', (e) => heard.push(`garden:grown ${e.deltas.length}`));
    core.bus.on('garden:seedArrived', () => heard.push('garden:seedArrived'));
    let isHiding = false;
    core.bus.on('xr:visibility', (e) => {
      heard.push(`xr:visibility ${e.visible}`);
      if (e.visible) return;
      // After the app's own handler (it subscribed first); the flush writes in this task's microtasks.
      isHiding = true;
      setTimeout(() => (isHiding = false), 0);
    });
    const raised: string[] = [];
    world.queryManager
      .registerQuery({ required: [Caption] })
      .subscribe('qualify', (entity) => raised.push(entity.getValue(Caption, 'key') ?? ''));
    const puts: Probe['puts'] = [];
    const store = IDBObjectStore.prototype;
    const { put } = store as { put: (this: IDBObjectStore, value: unknown, key?: IDBValidKey) => IDBRequest };
    store.put = function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (key === 'state')
        puts.push({
          state: structuredClone(value) as GardenState,
          atMs: performance.now(),
          inHide: isHiding,
        });
      return put.call(this, value, key) as IDBRequest<IDBValidKey>;
    };
    const targets = world.queryManager.registerQuery({ required: [Interactable] }).entities;
    const pos = { x: 0, y: 1, z: -0.4 };
    const probe: Probe = {
      heard,
      raised,
      puts,
      state: () => garden.state!,
      drawn: () =>
        [...targets]
          .filter((entity) => entity.getValue(Interactable, 'kind') === 'plant')
          .map((entity) => {
            const id = entity.getValue(Interactable, 'id') ?? '';
            return { id, cell: garden.state!.plants.find((p) => p.id === id)!.cell };
          }),
      triggers: () => engine.stats.triggers,
      refused: () => core.log.recent().filter((entry) => entry.msg === 'a storage refused a write').length,
      plant: (cell) => {
        core.bus.emit('gesture:palmUp', { type: 'gesture:palmUp', hand: 'left' });
        const target = { kind: 'seed' as const, id: garden.state!.seeds[0]!.id };
        core.bus.emit('gesture:pinchStart', { type: 'gesture:pinchStart', hand: 'right', target, pos });
        core.bus.emit('gesture:release', {
          type: 'gesture:release',
          hand: 'right',
          gesture: 'carry',
          target,
          pos,
          zone: 'bed',
          cell,
          dy: null,
        });
      },
      stored: async () => (await openStore()).load(),
    };
    return probe;
  });
}

/** Enters, and waits for the session's visit: the seeds are handed out from then on (API_SPEC §1.10 rule 8). */
async function enterAndVisit(page: Page, probe: JSHandle<Probe>, visits: number): Promise<void> {
  await enterXR(page);
  await page.waitForFunction(([p, visits]) => p.state().visits === visits, [probe, visits] as const, {
    timeout: 20_000,
  });
}

const plantsOf = (state: GardenState | null) =>
  (state?.plants ?? []).map(({ id, cell }) => ({ id, cell })).sort((a, b) => a.id.localeCompare(b.id));

test('e1 a reload brings the garden back: the same plants in the same cells, seeds and settings; drawn on the bed', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  let probe = await probeSave(page);
  // A box ticked on the landing page, with no session after it, is saved on its own.
  await landing(page).getByLabel('High contrast').check();
  await expect.poll(() => probe.evaluate(async (p) => (await p.stored())?.settings.highContrast)).toBe(true);
  await page.reload();
  await expect(landing(page).getByLabel('High contrast')).toBeChecked({ timeout: WORLD_READY_MS });

  probe = await probeSave(page);
  await enterAndVisit(page, probe, 1);
  await probe.evaluate((p, cells) => cells.forEach((cell) => p.plant(cell)), CELLS);
  const planted = await probe.evaluate((p) => p.state());
  expect(plantsOf(planted).map((p) => p.cell)).toEqual(expect.arrayContaining(CELLS));
  expect(planted.seeds).toHaveLength(1); // three starter seeds, two planted
  await expect.poll(() => probe.evaluate((p) => p.stored()).then(plantsOf)).toEqual(plantsOf(planted));

  await page.reload();
  probe = await probeSave(page);
  const back = await probe.evaluate((p) => p.state());
  expect(plantsOf(back)).toEqual(plantsOf(planted));
  expect(back.seeds).toEqual(planted.seeds);
  expect(back.settings).toEqual(planted.settings);
  expect(back.settings.highContrast).toBe(true);
  // The restored garden is drawn when the bed is placed: one plant target per plant, in its own cell.
  await enterAndVisit(page, probe, 2);
  expect(await probe.evaluate((p) => p.drawn().sort((a, b) => a.id.localeCompare(b.id)))).toEqual(
    plantsOf(planted),
  );
  // A second visit issues no starter seeds.
  expect(await probe.evaluate((p) => p.heard)).toContain('room:signature false');
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('e2 a pause flushes the save at once, and the return is one visit, saved, with the garden still playing', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  const probe = await probeSave(page);
  await enterAndVisit(page, probe, 1);
  // The visit's save and the new anchor's (IWER makes it at once): after both, nothing more is on its way.
  await expect
    .poll(() => probe.evaluate((p) => p.stored()).then((s) => [s?.visits, s?.anchorHandle !== undefined]))
    .toEqual([1, true]);
  const before = await probe.evaluate((p) => p.puts.length);
  const d = await device(page);

  // A plant, and the headset off in the same task (IWER tells the session in its next frame): the plant is
  // written by the hide itself, not 500 ms later by the debounce (SAVE_DEBOUNCE_MS).
  const plantedAtMs = await page.evaluate(
    ([p, d, cell]) => {
      p.plant(cell);
      d.updateVisibilityState('hidden');
      return performance.now();
    },
    [probe, d, CELLS[0]!] as const,
  );
  await expect.poll(() => probe.evaluate((p) => p.heard)).toContain('xr:visibility false');
  await expect.poll(() => probe.evaluate((p) => p.puts.length)).toBe(before + 1);
  const flushed = (await probe.evaluate((p) => p.puts))[before]!;
  console.log(
    `T-128e pause: written ${Math.round(flushed.atMs - plantedAtMs)} ms after the plant (emulator)`,
  );
  expect(flushed).toMatchObject({ inHide: true, state: { plants: [{ cell: CELLS[0] }] } });

  // Back: one more visit, saved like any change, and the tide plays on.
  await d.evaluate((d) => d.updateVisibilityState('visible'));
  await expect.poll(() => probe.evaluate((p) => p.stored()).then((s) => s?.visits)).toBe(2);
  expect((await probe.evaluate((p) => p.stored()))?.plants).toHaveLength(1);
  const triggers = await probe.evaluate((p) => p.triggers());
  await expect.poll(() => probe.evaluate((p) => p.triggers()), { timeout: 10_000 }).toBeGreaterThan(triggers);
  expect(await probe.evaluate((p) => p.raised)).not.toContain(SAVE_FAILED);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('e2 a change followed at once by closing the page is there when the page is opened again', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('none'));
  await probeSave(page);
  await landing(page).getByLabel('One hand').check();
  // Well inside the debounce. The IndexedDB write the hide starts goes with the page (Chromium drops it, even with
  // an explicit commit()); the synchronous write to the localStorage fallback at `pagehide` is what survives.
  await page.close();

  const next = await page.context().newPage();
  const nextErrors = watch(next);
  const nextOffHost = await openApp(next, readRoom('none'));
  const probe = await probeSave(next);
  expect((await probe.evaluate((p) => p.state())).settings.oneHand).toBe(true);
  await expect(landing(next).getByLabel('One hand')).toBeChecked();
  expect([...errors, ...nextErrors]).toEqual([]);
  expect([...offHost, ...nextOffHost]).toEqual([]);
});

/** Every key and value of database `roomsong`, store `garden`, read with IndexedDB calls of this file. */
const rawGarden = (page: Page): Promise<Record<string, unknown>> =>
  page.evaluate(
    ([db, store]) =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const open = indexedDB.open(db);
        open.onerror = () => reject(new Error(String(open.error)));
        open.onsuccess = () => {
          const objects = open.result.transaction(store).objectStore(store);
          const keys = objects.getAllKeys();
          const values = objects.getAll();
          values.onsuccess = () =>
            resolve(
              Object.fromEntries(keys.result.map((key, i) => [key as string, values.result[i] as unknown])),
            );
        };
      }),
    [DB, STORE] as const,
  );

for (const unreadable of ['corrupt', 'of a newer version'] as const) {
  test(`e2 a save that is ${unreadable}: a new garden with three starter seeds, the old one kept in a backup key, and no message`, async ({
    page,
  }) => {
    const errors = watch(page);
    const offHost = await openApp(page, readRoom('table'));
    await probeSave(page); // the app has opened the database once
    // Corrupt: a field of the wrong type. Newer: a whole garden this version cannot read (API_SPEC §4).
    const saved = await page.evaluate(
      ([db, store, isNewer]) =>
        new Promise<unknown>((resolve, reject) => {
          const value = isNewer
            ? { ...window.__roomsong!.garden.state!, version: 7 }
            : { version: 1, plants: 'not plants' };
          const open = indexedDB.open(db);
          open.onsuccess = () => {
            const t = open.result.transaction(store, 'readwrite');
            t.objectStore(store).put(value, 'state');
            t.oncomplete = () => resolve(value);
            t.onabort = () => reject(new Error(String(t.error)));
          };
          open.onerror = () => reject(new Error(String(open.error)));
        }),
      [DB, STORE, unreadable !== 'corrupt'] as const,
    );

    await page.reload();
    const probe = await probeSave(page);
    expect(await probe.evaluate((p) => p.state())).toMatchObject({ plants: [], seeds: [], visits: 0 });
    const backups = Object.entries(await rawGarden(page));
    expect(backups).toHaveLength(1);
    expect(backups[0]![0]).toMatch(/^state\.backup\.\d+$/);
    expect(backups[0]![1]).toEqual(saved);

    await enterAndVisit(page, probe, 1);
    expect(await probe.evaluate((p) => p.heard)).toContain('room:signature true');
    expect(await probe.evaluate((p) => p.state().seeds)).toHaveLength(3);
    await expect.poll(() => probe.evaluate((p) => p.stored()).then((s) => s?.seeds.length)).toBe(3);
    expect((await rawGarden(page))[backups[0]![0]]).toEqual(saved); // the new garden's save left it alone
    expect(await probe.evaluate((p) => p.raised)).not.toContain(SAVE_FAILED); // FR-PER-02: no message
    expect(errors).toEqual([]);
    expect(offHost).toEqual([]);
  });
}

test('e2 with storage refused the garden still plays, and "This garden cannot be saved" is raised once, in the session', async ({
  page,
}) => {
  // Before the page's own scripts: IndexedDB does not open, and localStorage refuses the garden's keys (the
  // emulator keeps keys of its own there).
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException('blocked by the test', 'SecurityError');
    };
    const storage = Storage.prototype;
    const { setItem } = storage as { setItem: (this: Storage, key: string, value: string) => void };
    storage.setItem = function (this: Storage, key: string, value: string) {
      if (key.startsWith('roomsong.garden.'))
        throw new DOMException('blocked by the test', 'QuotaExceededError');
      setItem.call(this, key, value);
    };
  });
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  const probe = await probeSave(page);
  const saveFailed = () =>
    probe.evaluate((p, key) => p.raised.filter((raised) => raised === key), SAVE_FAILED);
  // The first failure on the landing page, where no caption shows: it waits for the session.
  await landing(page).getByLabel('High contrast').check();
  await expect.poll(() => probe.evaluate((p) => p.refused())).toBe(1);
  expect(await saveFailed()).toEqual([]);
  await enterAndVisit(page, probe, 1); // the visit's save fails too
  expect(await saveFailed()).toEqual([SAVE_FAILED]);
  const refused = await probe.evaluate((p) => p.refused());
  await probe.evaluate((p, cell) => p.plant(cell), CELLS[0]!);
  expect(await probe.evaluate((p) => p.state().plants)).toHaveLength(1);
  await expect.poll(() => probe.evaluate((p) => p.refused())).toBeGreaterThan(refused); // the next write failed too
  await xrFrames(page, 2);
  expect(await saveFailed()).toEqual([SAVE_FAILED]);
  // The one error the app logs for it; nothing else went wrong.
  expect(errors.filter((line) => !line.includes(SAVE_FAILED))).toEqual([]);
  expect(offHost).toEqual([]);
});

test('e3 TC-E2E-06 a new day: a reload with fakeDay=+1 gives garden:grown and exactly one new seed', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  let probe = await probeSave(page);
  await enterAndVisit(page, probe, 1);
  await probe.evaluate((p, cells) => cells.forEach((cell) => p.plant(cell)), CELLS);
  await expect.poll(() => probe.evaluate((p) => p.stored()).then((s) => s?.plants.length)).toBe(2);

  await page.goto('/?flags=fakeDay=+1');
  probe = await probeSave(page);
  await enterAndVisit(page, probe, 2);
  const heard = await probe.evaluate((p) => p.heard);
  expect(heard.filter((type) => type.startsWith('garden:grown'))).toEqual(['garden:grown 2']);
  expect(heard.filter((type) => type === 'garden:seedArrived')).toHaveLength(1);
  expect(await probe.evaluate((p) => p.state().seeds)).toHaveLength(2); // the one left, and the day's
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
