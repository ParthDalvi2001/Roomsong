/// <reference types="webxr" />
// TC-E2E-07 (gaze only, T-160; US-16, FR-HND-12, UX §9.2, §9.8): gaze mode on and no hand tracked at all, in the
// table room at level 3 (hit-test). The head alone places the bed (a dwell on the table; the level gaze on the
// wall places nothing), plants a seed (a dwell on a free cell), starts Listen (a dwell on the Listen orb) and wakes
// it (a dwell on the orb again), each after the default 900 ms, with not one pinch. The reticle shows throughout.
// The test emits nothing; it turns IWER's emulated head and reads the app's bus and objects.
// Emulator result (E): whether a real seated head holds under 8 deg/s while it means to, and whether a 1.2 cm
// cream dot is easy to see over a bright room, are headset questions (TC-DEV-06).
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { enterXR, openApp, readRoom, xrFrames } from './support/iwer';

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Garden = typeof import('../../src/garden/index');
type RoomModule = typeof import('../../src/room/index');
type Ui = typeof import('../../src/ui/index');
type Vec3 = { x: number; y: number; z: number };
type Cell = { ring: number; step: number };

interface Heard {
  name: string;
  atMs: number;
  kind?: string | null;
  gesture?: string;
  cell?: Cell | null;
  level?: number;
}
interface Probe {
  heard: Heard[];
  orbAt(): Vec3 | null;
  cellAt(cell: Cell): Vec3;
  plants(): Cell[];
  isDotShown(): boolean;
  dotAt(): Vec3;
  /** A settings panel control's (or its orb's) target, while it is on show. */
  panelAt(id: string): Vec3 | null;
  isPanelOpen(): boolean;
}
interface DevPage {
  IWER_DEVICE: { remote: { dispatch(method: string, params?: object): Promise<unknown> } };
}

const DWELL_MS = 900; // Settings.dwellMs by default (FR-HND-12)
const TABLE_CENTRE = { x: 0, y: 0.74, z: -0.5 }; // of the table room
const CELL: Cell = { ring: 2, step: 4 };

function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** Listens on the app's bus before Enter, with gaze mode switched on. */
async function probeGaze(page: Page): Promise<JSHandle<Probe>> {
  const enter = page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
  await expect(enter).toBeEnabled({ timeout: 15_000 });
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const { Interactable } = await load<Components>('/src/core/components.ts');
    const gardenModule = await load<Garden>('/src/garden/index.ts');
    const room = await load<RoomModule>('/src/room/index.ts');
    const ui = await load<Ui>('/src/ui/index.ts');
    const { world, garden } = window.__roomsong!;
    const panel = world.getSystem(ui.PanelSystem)!.panel;
    // The panel's Garden tab calls the app's garden (API_SPEC §1.9): its New garden is seen here.
    const newGarden = garden.newGarden.bind(garden);
    garden.newGarden = () => {
      note('newGarden');
      newGarden();
    };
    const roomSystem = world.getSystem(room.RoomSystem)!;
    const bed = roomSystem.bed.object3D!;
    // The gaze dwell's own select at level 3 (API_SPEC §1.10): told apart from the 10 s wait, which places too.
    const confirm = roomSystem.confirm.bind(roomSystem);
    roomSystem.confirm = () => {
      note('gaze:confirm');
      confirm();
    };
    core.settings.set({ gazeDwell: true });
    const heard: Heard[] = [];
    const note = (name: string, more: Partial<Heard> = {}) =>
      heard.push({ name, atMs: performance.now(), ...more });
    core.bus.on('room:placementLevel', (e) => note('room:placementLevel', { level: e.level }));
    core.bus.on('room:bedPlaced', (e) => note('room:bedPlaced', { level: e.placement.level }));
    core.bus.on('garden:seedArrived', () => note('garden:seedArrived'));
    core.bus.on('gesture:pinchStart', () => note('gesture:pinchStart'));
    core.bus.on('gesture:release', (e) =>
      note('gesture:release', {
        kind: e.target?.kind ?? null,
        gesture: e.gesture,
        cell: e.cell === null ? null : { ring: e.cell.ring, step: e.cell.step },
      }),
    );
    core.bus.on('gesture:wake', () => note('gesture:wake'));
    core.bus.on('listen:enter', () => note('listen:enter'));
    core.bus.on('listen:exit', () => note('listen:exit'));
    core.bus.on('garden:changed', (e) => {
      for (const id of e.diff.added) note('planted', { kind: id });
    });
    const targets = world.queryManager.registerQuery({ required: [Interactable] }).entities;
    const reticle = world.scene.getObjectByName('gaze-reticle')!;
    return {
      heard,
      orbAt() {
        const orb = [...targets].find((e) => e.getValue(Interactable, 'kind') === 'orb');
        if (orb === undefined) return null;
        const v = orb.getVectorView(Interactable, 'worldPos');
        return { x: v[0]!, y: v[1]!, z: v[2]! };
      },
      cellAt(cell) {
        const c = gardenModule.cellCentre(cell, { x: 0, y: 0 });
        const e = bed.matrixWorld.elements; // bed-local (x, 0, y) into the world (D-029)
        return {
          x: e[0] * c.x + e[8] * c.y + e[12],
          y: e[1] * c.x + e[9] * c.y + e[13],
          z: e[2] * c.x + e[10] * c.y + e[14],
        };
      },
      plants: () => garden.state!.plants.map((p) => ({ ...p.cell })),
      isDotShown: () => reticle.visible,
      dotAt: () => ({
        x: reticle.matrix.elements[12],
        y: reticle.matrix.elements[13],
        z: reticle.matrix.elements[14],
      }),
      panelAt(id) {
        const control = [...targets].find(
          (e) => e.getValue(Interactable, 'kind') === 'panel' && e.getValue(Interactable, 'id') === id,
        );
        if (control === undefined) return null;
        const v = control.getVectorView(Interactable, 'worldPos');
        return { x: v[0]!, y: v[1]!, z: v[2]! };
      },
      isPanelOpen: () => panel.open,
    } satisfies Probe;
  });
}

/** Resolves with the `count`-th event of that name. */
async function heard(probe: JSHandle<Probe>, name: string, count = 1): Promise<Heard> {
  const handle = await probe.evaluateHandle(
    (p, [name, count]) =>
      new Promise<Heard>((done) => {
        const look = () => {
          const found = p.heard.filter((e) => e.name === name);
          if (found.length >= count) done(found[count - 1]!);
          else setTimeout(look, 10);
        };
        look();
      }),
    [name, count] as const,
  );
  return handle.jsonValue();
}

test('TC-E2E-07, gaze only: place the bed, plant a seed, start and end Listen, with no hand and no pinch', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'), '/?flags=forceLevel=3');
  const probe = await probeGaze(page);
  await enterXR(page);
  const remote = (method: string, params: object) =>
    page.evaluate(
      ([method, params]) => (window as unknown as DevPage).IWER_DEVICE.remote.dispatch(method, params),
      [method, params] as const,
    );
  await remote('set_connected', { device: 'hand-left', connected: false });
  await remote('set_connected', { device: 'hand-right', connected: false });
  /** The head turns to `target`; resolves with the page time it did. */
  const lookAt = async (target: Vec3) => {
    await remote('look_at', { device: 'headset', target });
    return page.evaluate(() => performance.now());
  };

  // Level 3, the head level: its gaze meets the far wall, no usable spot: nothing to select, the dot on.
  const level = await heard(probe, 'room:placementLevel');
  await xrFrames(page, 3);
  expect(await probe.evaluate((p) => p.isDotShown())).toBe(true);
  // On the table: the dwell's own select places the bed there, at level 3, before the 10 s wait runs out.
  const onTable = await lookAt(TABLE_CENTRE);
  const confirmed = await heard(probe, 'gaze:confirm');
  const placed = await heard(probe, 'room:bedPlaced');
  expect(placed.level).toBe(3);
  expect(confirmed.atMs - onTable).toBeGreaterThanOrEqual(DWELL_MS - 50);
  expect(placed.atMs).toBeGreaterThanOrEqual(confirmed.atMs);
  expect(placed.atMs - level.atMs, 'placed by the dwell, not by the 10 s wait').toBeLessThan(10_000);
  await heard(probe, 'garden:seedArrived', 3);

  // A free cell: the next seed is planted there.
  const onCell = await lookAt(await probe.evaluate((p, c) => p.cellAt(c), CELL));
  const planted = await heard(probe, 'planted');
  expect(planted.atMs - onCell).toBeGreaterThanOrEqual(DWELL_MS - 50);
  expect(await probe.evaluate((p) => p.plants())).toEqual([CELL]);

  // The Listen orb: Listen starts; looked away from and back at, it wakes.
  const orb = (await probe.evaluate((p) => p.orbAt()))!;
  const onOrb = await lookAt(orb);
  const entered = await heard(probe, 'listen:enter');
  expect(entered.atMs - onOrb).toBeGreaterThanOrEqual(DWELL_MS - 50);
  await lookAt({ x: 0, y: 1.2, z: -2 });
  await xrFrames(page, 3);
  const backOnOrb = await lookAt(orb);
  const woke = await heard(probe, 'gesture:wake');
  expect(woke.atMs - backOnOrb, 'D-054: twice the dwell').toBeGreaterThanOrEqual(2 * DWELL_MS - 50);
  await heard(probe, 'listen:exit');

  // The settings panel by the gaze (UX §9.8): its own dwell opens it from its orb and picks the Garden tab; New
  // garden needs one look of the dwell and its 1.5 s hold; the scene's dwell selects none of it, and the dot lies on it.
  // The orb waits at its own place in the view box, held to the box's edge while the head looks away (T-151): looked
  // at there, it goes back to its place. So the head follows it until it stays put.
  for (let at = (await probe.evaluate((p) => p.panelAt('orb')))!, tries = 0; tries < 4; tries++) {
    await lookAt(at);
    await xrFrames(page, 3);
    const now = await probe.evaluate((p) => p.panelAt('orb'));
    if (now === null || Math.hypot(now.x - at.x, now.y - at.y, now.z - at.z) < 0.001) break;
    at = now;
  }
  await page.waitForFunction((p) => p.isPanelOpen(), probe);
  await page.waitForFunction((p) => p.panelAt('tab:garden') !== null, probe);
  await lookAt((await probe.evaluate((p) => p.panelAt('tab:garden')))!);
  await page.waitForFunction((p) => p.panelAt('newGarden') !== null, probe);
  const control = (await probe.evaluate((p) => p.panelAt('newGarden')))!;
  const onNewGarden = await lookAt(control);
  await page.waitForTimeout(DWELL_MS + 700); // the dwell alone, and the 0.4 s a jumping head reads as turning
  expect((await probe.evaluate((p) => p.heard)).some((e) => e.name === 'newGarden')).toBe(false);
  const dot = await probe.evaluate((p) => p.dotAt());
  expect(
    Math.hypot(dot.x - control.x, dot.y - control.y, dot.z - control.z),
    'the dot on the control',
  ).toBeLessThan(0.01);
  const fresh = await heard(probe, 'newGarden');
  expect(fresh.atMs - onNewGarden).toBeGreaterThanOrEqual(DWELL_MS + 1500 - 50);
  await expect.poll(() => probe.evaluate((p) => p.plants())).toEqual([]);
  expect((await probe.evaluate((p) => p.heard)).filter((e) => e.name === 'newGarden')).toHaveLength(1);

  const all = await probe.evaluate((p) => p.heard);
  expect(all.filter((e) => e.name === 'gesture:pinchStart')).toEqual([]); // not one pinch
  expect(all.filter((e) => e.name === 'gesture:release')).toMatchObject([
    { kind: 'seed', gesture: 'carry', cell: CELL },
    { kind: 'orb', gesture: 'press', cell: null },
  ]); // and no panel control among them
  expect(all.filter((e) => e.name === 'room:bedPlaced')).toHaveLength(1);
  console.log(
    `T-160 gaze only (emulator, table room, level 3): confirmed ${Math.round(confirmed.atMs - onTable)} ms, planted ` +
      `${Math.round(planted.atMs - onCell)} ms, Listen ${Math.round(entered.atMs - onOrb)} ms after each look`,
  );
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
