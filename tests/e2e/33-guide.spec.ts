/// <reference types="webxr" />
// D-084 (API_SPEC v1.2.77): the guide on a brand-new garden shows "Skip guide"; a real pinch on it ends the guide
// quietly (step off, the button gone); New garden, held on the board, starts the guide again from the palm with the
// button back. The tour after Listen (orb, Seeds, Move) is covered by the unit tests of onboarding/ and ui/. The press
// and palm helpers are those of 32-seed-picker. The test emits nothing; it moves IWER's hands and head.

import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { HIT_RADIUS_M } from '../../src/hands/config';
import { NEW_GARDEN_HOLD_MS } from '../../src/ui/config';

import { enterXR, openApp, readRoom, xrFrames } from './support/iwer';

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Garden = typeof import('../../src/garden/index');
type Hands = typeof import('../../src/hands/index');
type RoomModule = typeof import('../../src/room/index');
type Ui = typeof import('../../src/ui/index');
type Hand = 'left' | 'right';
type Vec3 = { x: number; y: number; z: number };
type Cell = { ring: number; step: number };
type Kind = { voice: string; family: string | null };

interface Heard {
  name: string;
  hand: Hand | null;
  id: string | null;
  reason?: string;
}
interface Probe {
  heard: Heard[];
  isOpen(): boolean;
  /** The ids of the board's controls on show. */
  ids(): string[];
  /** A board control's target, while it is on show. */
  panelAt(id: string): Vec3 | null;
  /** The out seed's target, or null. */
  seed(): { id: string; at: Vec3 } | null;
  /** The supply's next seed, as the garden holds it. */
  next(): Kind | null;
  palm(hand: Hand): Vec3;
  atRest(): Promise<Vec3>;
  cellAt(cell: Cell): Vec3;
  plants(): ({ id: string; cell: Cell } & Kind)[];
}
interface DevPage {
  IWER_DEVICE: { remote: { dispatch(method: string, params?: object): Promise<unknown> } };
}

const PALM_DOWN = { roll: 0, pitch: 0, yaw: 0 };
const LEFT_ROOT: Vec3 = { x: -0.2, y: 0.95, z: -0.3 };
const RIGHT_ROOT: Vec3 = { x: 0.2, y: 0.95, z: -0.3 }; // over the table, beside the bed, nothing within reach
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** Listens on the app's bus and reads its objects; made before Enter, so the session's events are heard. */
async function probeApp(page: Page): Promise<JSHandle<Probe>> {
  const enter = page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
  await expect(enter).toBeEnabled({ timeout: 15_000 });
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const { Interactable } = await load<Components>('/src/core/components.ts');
    const gardenModule = await load<Garden>('/src/garden/index.ts');
    const hands = await load<Hands>('/src/hands/index.ts');
    const room = await load<RoomModule>('/src/room/index.ts');
    const ui = await load<Ui>('/src/ui/index.ts');
    const { world, garden } = window.__roomsong!;
    const bed = world.getSystem(room.RoomSystem)!.bed.object3D!;
    const panel = world.getSystem(ui.PanelSystem)!.panel;
    const heard: Heard[] = [];
    const note = (name: string, more: Partial<Heard> = {}) =>
      heard.push({ name, hand: null, id: null, ...more });
    core.bus.on('garden:seedArrived', (e) => note('garden:seedArrived', { id: e.seed.id }));
    core.bus.on('onboarding:step', (e) => note('step', { id: e.step }));
    core.bus.on('garden:seedBack', (e) => note('garden:seedBack', { id: e.seedId, reason: e.reason }));
    core.bus.on('garden:seedOut', (e) => note('garden:seedOut', { hand: e.hand, id: e.seed.id }));
    core.bus.on('gesture:pinchStart', (e) =>
      note('gesture:pinchStart', { hand: e.hand, id: e.target?.id ?? null }),
    );
    core.bus.on('garden:changed', (e) => {
      for (const id of e.diff.added) note('planted', { id });
    });
    const targets = world.queryManager.registerQuery({ required: [Interactable] }).entities;
    const states = world.queryManager.registerQuery({ required: [hands.HandState] }).entities;
    const stateOf = (hand: Hand) => [...states].find((e) => e.getValue(hands.HandState, 'hand') === hand)!;
    const vec = (view: ArrayLike<number>): Vec3 => ({ x: view[0]!, y: view[1]!, z: view[2]! });
    const kind = (s: { voice: string; family?: string }): Kind => ({
      voice: s.voice,
      family: s.family ?? null,
    });
    const probe: Probe = {
      heard,
      isOpen: () => panel.open,
      ids: () => panel.controls().map((c) => c.id),
      panelAt(id) {
        const control = [...targets].find(
          (e) => e.getValue(Interactable, 'kind') === 'panel' && e.getValue(Interactable, 'id') === id,
        );
        return control === undefined ? null : vec(control.getVectorView(Interactable, 'worldPos'));
      },
      seed() {
        const seed = [...targets].find((e) => e.getValue(Interactable, 'kind') === 'seed');
        if (seed === undefined) return null;
        return {
          id: seed.getValue(Interactable, 'id') ?? '',
          at: vec(seed.getVectorView(Interactable, 'worldPos')),
        };
      },
      next: () => {
        const seed = garden.state?.seeds[0];
        return seed === undefined ? null : kind(seed);
      },
      palm: (hand) => vec(stateOf(hand).getVectorView(hands.HandState, 'palmPos')),
      atRest: () =>
        new Promise((done, fail) => {
          let last: Vec3 | null = null;
          const look = () => {
            const session = world.renderer.xr.getSession();
            if (session === null) return fail(new Error('atRest needs a session'));
            const now = vec(stateOf('right').getVectorView(hands.HandState, 'pinchPos'));
            if (last !== null && Math.hypot(now.x - last.x, now.y - last.y, now.z - last.z) < 0.0002) {
              return done(now);
            }
            last = now;
            session.requestAnimationFrame(look);
          };
          look();
        }),
      cellAt(cell) {
        const c = gardenModule.cellCentre(cell, { x: 0, y: 0 });
        const e = bed.matrixWorld.elements; // bed-local (x, 0, y) into the world (D-029)
        return {
          x: e[0] * c.x + e[8] * c.y + e[12],
          y: e[1] * c.x + e[9] * c.y + e[13],
          z: e[2] * c.x + e[10] * c.y + e[14],
        };
      },
      plants: () => garden.state!.plants.map((p) => ({ id: p.id, cell: { ...p.cell }, ...kind(p) })),
    };
    return probe;
  });
}

/** Resolves with the `count`-th event of that name heard (for that hand and id, if given). */
async function heard(
  probe: JSHandle<Probe>,
  name: string,
  { hand, id, count = 1 }: { hand?: Hand; id?: string; count?: number } = {},
): Promise<Heard> {
  const handle = await probe.evaluateHandle(
    (p, [name, hand, id, count]) =>
      new Promise<Heard>((done) => {
        const look = () => {
          const found = p.heard.filter(
            (e) => e.name === name && (hand === null || e.hand === hand) && (id === null || e.id === id),
          );
          if (found.length >= count) done(found[count - 1]!);
          else setTimeout(look, 10);
        };
        look();
      }),
    [name, hand ?? null, id ?? null, count] as const,
  );
  return handle.jsonValue();
}
const named = (probe: JSHandle<Probe>, name: string) =>
  probe.evaluate((p, name) => p.heard.filter((e) => e.name === name), name);

/** IWER commands run in one frame: every command queued before a frame runs in that frame. */
const togetherOn = (page: Page, commands: [method: string, params: object][]) =>
  page.evaluate(async (commands) => {
    const { remote } = (window as unknown as DevPage).IWER_DEVICE;
    await Promise.all(commands.map(([method, params]) => remote.dispatch(method, params)));
  }, commands);
const lookOn = (page: Page, target: Vec3) => togetherOn(page, [['look_at', { device: 'headset', target }]]);

/**
 * The emulated right hand, measured palm down at RIGHT_ROOT over nothing: its pinch point open and closed, so that
 * a pinch closes on a target without moving it (12-settings: IWER's pinch point jumps 7.7 cm as it closes).
 */
async function emulated(page: Page, probe: JSHandle<Probe>) {
  const together = (commands: [method: string, params: object][]) => togetherOn(page, commands);
  const transform = (hand: Hand, position: Vec3, orientation = PALM_DOWN): [string, object] => [
    'set_transform',
    { device: `hand-${hand}`, position, orientation },
  ];
  const select = (value: 0 | 1): [string, object] => ['set_select_value', { device: 'hand-right', value }];
  const settle = async (): Promise<Vec3> => {
    await xrFrames(page, 2);
    return probe.evaluate((p) => p.atRest());
  };
  const from = (tip: Vec3): Vec3 => ({
    x: tip.x - RIGHT_ROOT.x,
    y: tip.y - RIGHT_ROOT.y,
    z: tip.z - RIGHT_ROOT.z,
  });
  await together([transform('right', RIGHT_ROOT)]);
  const open = from(await settle());
  await together([select(1)]);
  const closed = from(await settle());
  await together([select(0)]);
  await settle();
  const rootFor = (pos: Vec3, tip: Vec3): Vec3 => ({ x: pos.x - tip.x, y: pos.y - tip.y, z: pos.z - tip.z });
  const pinchAt = async (pos: Vec3): Promise<number> => {
    await together([transform('right', rootFor(pos, open))]);
    const tip = await settle();
    await together([transform('right', rootFor(pos, closed)), select(1)]);
    return distance(tip, pos);
  };
  const releaseAt = (pos: Vec3) => together([transform('right', rootFor(pos, open)), select(0)]);
  return {
    together,
    transform,
    select,
    settle,
    rootFor: (pos: Vec3) => rootFor(pos, closed),
    look: (target: Vec3) => lookOn(page, target),
    /** A real pinch of the right hand on a board control and its release, once the app has reported the start. */
    async press(id: string): Promise<void> {
      const at = await probe.evaluate((p, id) => p.panelAt(id), id);
      expect(at, `${id} on show`).not.toBeNull();
      const before = (await named(probe, 'gesture:pinchStart')).length;
      expect(await pinchAt(at!), `the hand on ${id}`).toBeLessThan(HIT_RADIUS_M / 4);
      const start = await heard(probe, 'gesture:pinchStart', { count: before + 1 });
      expect(start, `the pinch on ${id}`).toMatchObject({ hand: 'right', id });
      await releaseAt(at!);
      await xrFrames(page, 4);
    },
    /** A real pinch of the right hand held on a board control for `ms`, then let go there (New garden's hold). */
    async hold(id: string, ms: number): Promise<void> {
      const at = await probe.evaluate((p, id) => p.panelAt(id), id);
      expect(at, `${id} on show`).not.toBeNull();
      expect(await pinchAt(at!), `the hand on ${id}`).toBeLessThan(HIT_RADIUS_M / 4);
      await page.waitForTimeout(ms);
      await releaseAt(at!);
      await xrFrames(page, 4);
    },
    /** The `count`-th seed out, resting on the left palm: pinched by the right hand, carried to `to`, let go there. */
    async carry(to: Vec3, count: number): Promise<string> {
      const out = await heard(probe, 'garden:seedOut', { count });
      const resting = async () => {
        const [seed, palm] = await probe.evaluate((p) => [p.seed(), p.palm('left')] as const);
        return seed?.id === out.id ? { at: seed.at, gap: distance(seed.at, palm) } : null;
      };
      await expect
        .poll(async () => (await resting())?.gap ?? Infinity, { timeout: 20_000 })
        .toBeLessThan(0.001);
      expect(await pinchAt((await resting())!.at)).toBeLessThan(HIT_RADIUS_M / 4);
      await xrFrames(page, 12); // past the 100 ms hop to the pinch point
      await together([transform('right', rootFor(to, closed))]);
      await settle();
      await releaseAt(to);
      await heard(probe, 'planted', { id: out.id! });
      return out.id!;
    },
  };
}

test('D-084/D-087 the strict guide: the orb takes no pinch at the palm step; Skip ends the guide; New garden starts it again', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'), '/', { onboarding: true });
  const probe = await probeApp(page);
  await enterXR(page);
  await heard(probe, 'step', { id: 'palm' });
  const hands = await emulated(page, probe);

  // D-087: the strict guide holds the hands to its step: at the palm step the settings orb takes no pinch.
  await hands.together([hands.transform('left', LEFT_ROOT, PALM_DOWN)]);
  await page.waitForFunction((p) => p.panelAt('orb') !== null, probe);
  const orbAt = (await probe.evaluate((p) => p.panelAt('orb')))!;
  await hands.together([hands.transform('right', hands.rootFor(orbAt)), hands.select(1)]);
  await xrFrames(page, 10);
  await hands.together([hands.select(0)]);
  await xrFrames(page, 10);
  expect(await probe.evaluate((p) => p.isOpen())).toBe(false);
  expect((await named(probe, 'gesture:pinchStart')).every((e) => e.id === null)).toBe(true);

  // While the guide runs, "Skip guide" is on show; a pinch ends the guide, and the button goes.
  await page.waitForFunction((p) => p.panelAt('skipGuide') !== null, probe);
  await hands.press('skipGuide');
  await heard(probe, 'step', { id: 'off' });
  await page.waitForFunction((p) => p.panelAt('skipGuide') === null, probe);

  // New garden: the orb on the left hand turned palm down, the Garden tab, New garden held to its end.
  await hands.together([hands.transform('left', LEFT_ROOT, PALM_DOWN)]);
  await page.waitForFunction((p) => p.panelAt('orb') !== null, probe);
  await hands.press('orb');
  await page.waitForFunction((p) => p.isOpen(), probe);
  await hands.press('tab:garden');
  await hands.hold('newGarden', NEW_GARDEN_HOLD_MS + 300);

  // The guide starts again from the palm, with its Skip button.
  await heard(probe, 'step', { id: 'palm', count: 2 });
  await page.waitForFunction((p) => p.panelAt('skipGuide') !== null, probe);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
