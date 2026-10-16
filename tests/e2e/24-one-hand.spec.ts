/// <reference types="webxr" />
// TC-E2E-07 (one hand, T-160; US-15, FR-UI-09, UX §9.1, D-048): one-hand mode on and the left hand never seen. The
// right palm turned up is given a seed; with nothing at its fingertips the seed on its own palm is its hover, a pinch
// of that hand takes it, carries it over a free cell and lets go: a plant. The test emits nothing; it moves IWER's
// emulated right hand and reads the app's bus and objects.
// Emulator result (E): whether a stranger finds that a pinch in the air takes the seed off their own palm, and
// whether the platform sees a pinch made palm up, are headset questions (UAT-16, TC-DEV-06).
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { HIT_RADIUS_M } from '../../src/hands/config';

import { enterXR, openApp, readRoom, xrFrames } from './support/iwer';

type Core = typeof import('../../src/core/index');
type Components = typeof import('../../src/core/components');
type Garden = typeof import('../../src/garden/index');
type Hands = typeof import('../../src/hands/index');
type RoomModule = typeof import('../../src/room/index');
type Hand = 'left' | 'right';
type Vec3 = { x: number; y: number; z: number };
type Cell = { ring: number; step: number };

interface Heard {
  name: string;
  hand: Hand | null;
  id: string | null;
  gesture: string | null;
  cell: Cell | null;
}
interface Probe {
  heard: Heard[];
  /** The out seed's target as hands sees it, or null. */
  seed(): { id: string; at: Vec3 } | null;
  palm(hand: Hand): Vec3;
  pinchPos(hand: Hand): Vec3;
  tracked(hand: Hand): boolean;
  cellAt(cell: Cell): Vec3;
  plants(): { id: string; cell: Cell }[];
  height(id: string): number;
  atRest(): Promise<Vec3>;
}
interface DevPage {
  IWER_DEVICE: { remote: { dispatch(method: string, params?: object): Promise<unknown> } };
}

const PALM_DOWN = { roll: 0, pitch: 0, yaw: 0 };
const PALM_UP = { roll: 180, pitch: 0, yaw: 0 };
const RIGHT_ROOT: Vec3 = { x: 0.2, y: 0.95, z: -0.3 }; // over the table, beside the bed, nothing within reach
const CELL: Cell = { ring: 2, step: 4 }; // the middle ring, nearest the user
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/** Listens on the app's bus and reads its objects; made before Enter. One-hand mode is switched on here. */
async function probeLoop(page: Page): Promise<JSHandle<Probe>> {
  const enter = page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
  await expect(enter).toBeEnabled({ timeout: 15_000 });
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const { Interactable } = await load<Components>('/src/core/components.ts');
    const gardenModule = await load<Garden>('/src/garden/index.ts');
    const hands = await load<Hands>('/src/hands/index.ts');
    const room = await load<RoomModule>('/src/room/index.ts');
    const { world, garden } = window.__roomsong!;
    const bed = world.getSystem(room.RoomSystem)!.bed.object3D!;
    core.settings.set({ oneHand: true });
    const heard: Heard[] = [];
    const note = (name: string, more: Partial<Heard> = {}) =>
      heard.push({ name, hand: null, id: null, gesture: null, cell: null, ...more });
    const copy = (cell: Cell | null) => (cell === null ? null : { ring: cell.ring, step: cell.step });
    core.bus.on('garden:seedArrived', (e) => note('garden:seedArrived', { id: e.seed.id }));
    core.bus.on('garden:seedOut', (e) => note('garden:seedOut', { hand: e.hand, id: e.seed.id }));
    core.bus.on('target:hover', (e) => note('target:hover', { hand: e.hand, id: e.target?.id ?? null }));
    core.bus.on('gesture:pinchStart', (e) =>
      note('gesture:pinchStart', { hand: e.hand, id: e.target?.id ?? null }),
    );
    core.bus.on('gesture:release', (e) =>
      note('gesture:release', {
        hand: e.hand,
        id: e.target?.id ?? null,
        gesture: e.gesture,
        cell: copy(e.cell),
      }),
    );
    core.bus.on('garden:changed', (e) => {
      for (const id of e.diff.added) note('planted', { id });
    });
    const targets = world.queryManager.registerQuery({ required: [Interactable] }).entities;
    const states = world.queryManager.registerQuery({ required: [hands.HandState] }).entities;
    const stateOf = (hand: Hand) => [...states].find((e) => e.getValue(hands.HandState, 'hand') === hand)!;
    const vec = (view: ArrayLike<number>): Vec3 => ({ x: view[0]!, y: view[1]!, z: view[2]! });
    const probe: Probe = {
      heard,
      seed() {
        const seed = [...targets].find((e) => e.getValue(Interactable, 'kind') === 'seed');
        if (seed === undefined) return null;
        return {
          id: seed.getValue(Interactable, 'id') ?? '',
          at: vec(seed.getVectorView(Interactable, 'worldPos')),
        };
      },
      palm: (hand) => vec(stateOf(hand).getVectorView(hands.HandState, 'palmPos')),
      pinchPos: (hand) => vec(stateOf(hand).getVectorView(hands.HandState, 'pinchPos')),
      tracked: (hand) => stateOf(hand).getValue(hands.HandState, 'tracked') === true,
      cellAt(cell) {
        const c = gardenModule.cellCentre(cell, { x: 0, y: 0 });
        const e = bed.matrixWorld.elements; // bed-local (x, 0, y) into the world (D-029)
        return {
          x: e[0] * c.x + e[8] * c.y + e[12],
          y: e[1] * c.x + e[9] * c.y + e[13],
          z: e[2] * c.x + e[10] * c.y + e[14],
        };
      },
      plants: () => garden.state!.plants.map((p) => ({ id: p.id, cell: { ...p.cell } })),
      height: (id) => garden.state!.plants.find((p) => p.id === id)?.height ?? Number.NaN,
      atRest: () =>
        new Promise((done, fail) => {
          let last: Vec3 | null = null;
          const look = () => {
            const session = world.renderer.xr.getSession();
            if (session === null) return fail(new Error('atRest needs a session'));
            const now = probe.pinchPos('right');
            if (last !== null && distance(now, last) < 0.0002) return done(now);
            last = now;
            session.requestAnimationFrame(look);
          };
          const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
          look();
        }),
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

test('TC-E2E-07, one hand: palm up for a seed, the same hand pinches it off its palm, carries it to a cell: a plant', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  const probe = await probeLoop(page);
  await enterXR(page);
  await heard(probe, 'garden:seedArrived', { count: 3 });
  const together = (commands: [method: string, params: object][]) =>
    page.evaluate(async (commands) => {
      const { remote } = (window as unknown as DevPage).IWER_DEVICE;
      await Promise.all(commands.map(([method, params]) => remote.dispatch(method, params)));
    }, commands);
  const right = (position: Vec3, orientation = PALM_DOWN): [string, object] => [
    'set_transform',
    { device: 'hand-right', position, orientation },
  ];
  const select = (value: 0 | 1): [string, object] => ['set_select_value', { device: 'hand-right', value }];
  await together([['set_connected', { device: 'hand-left', connected: false }]]);
  // The open right hand's pinch point, palm down over nothing: measured before any seed is out.
  await together([right(RIGHT_ROOT)]);
  await xrFrames(page, 2);
  const open = await probe.evaluate((p) => p.atRest());

  // The right hand alone, palm up: the seed comes to that palm and rests there (its 300 ms glide).
  await together([right(RIGHT_ROOT, PALM_UP)]);
  const out = await heard(probe, 'garden:seedOut', { hand: 'right' });
  await expect
    .poll(
      async () => {
        const [seed, palm] = await probe.evaluate((p) => [p.seed(), p.palm('right')] as const);
        return seed?.id === out.id ? distance(seed.at, palm) : Infinity;
      },
      { timeout: 20_000 },
    ) // on a loaded laptop one read of the page took 5.9 s (the first run)
    .toBeLessThan(0.001);
  // Nothing is in reach of the fingertips, so the seed on this palm is the hand's hover (UX §9.1).
  const tips = await probe.evaluate((p) => p.pinchPos('right'));
  expect(distance(tips, (await probe.evaluate((p) => p.seed()))!.at)).toBeGreaterThan(HIT_RADIUS_M);
  await heard(probe, 'target:hover', { hand: 'right', id: out.id! });

  // The same hand pinches where it is: it takes the seed.
  await together([select(1)]);
  await heard(probe, 'gesture:pinchStart', { hand: 'right', id: out.id! });
  await xrFrames(page, 12); // past the 100 ms hop to the pinch point
  // Carried, palm down now, to a free cell: the right hand's closed pinch point is measured here, over nothing.
  const cell = await probe.evaluate((p, c) => p.cellAt(c), CELL);
  await together([right(RIGHT_ROOT)]);
  await xrFrames(page, 2);
  const closed = await probe.evaluate((p) => p.atRest());
  /** Where the root goes for the pinch point (`tip`, open or closed, as measured at RIGHT_ROOT) to be at `pos`. */
  const rootFor = (pos: Vec3, tip = closed): Vec3 => ({
    x: pos.x - (tip.x - RIGHT_ROOT.x),
    y: pos.y - (tip.y - RIGHT_ROOT.y),
    z: pos.z - (tip.z - RIGHT_ROOT.z),
  });
  await together([right(rootFor(cell))]);
  await xrFrames(page, 2);
  expect(distance(await probe.evaluate((p) => p.atRest()), cell)).toBeLessThan(0.01);
  await together([select(0)]);
  const release = await heard(probe, 'gesture:release', { hand: 'right', id: out.id! });
  expect(release).toMatchObject({ gesture: 'carry', cell: CELL });
  await heard(probe, 'planted', { id: out.id! });
  expect(await probe.evaluate((p) => p.plants())).toEqual([{ id: out.id, cell: CELL }]);

  // UX §9.1, the second case: with a plant within reach of the fingertips the pinch takes the plant, and the seed
  // waits on the palm. The next seed comes to the palm turned up; the hand turns down over the plant (its pinch
  // point on the plant's foot, the cell centre), closes there without moving it, pulls 5 cm up and opens.
  await together([right(RIGHT_ROOT, PALM_UP)]);
  const next = await heard(probe, 'garden:seedOut', { hand: 'right', count: 2 });
  await expect
    .poll(async () => (await probe.evaluate((p) => p.seed()))?.id, { timeout: 20_000 })
    .toBe(next.id);
  const before = await probe.evaluate((p, id) => p.height(id), out.id!);
  await together([right(rootFor(cell, open))]);
  await xrFrames(page, 2);
  expect(distance(await probe.evaluate((p) => p.atRest()), cell)).toBeLessThan(0.01);
  await together([right(rootFor(cell)), select(1)]);
  expect(await heard(probe, 'gesture:pinchStart', { hand: 'right', count: 2 })).toMatchObject({ id: out.id });
  const up = { ...cell, y: cell.y + 0.05 };
  await together([right(rootFor(up))]);
  await xrFrames(page, 2);
  await probe.evaluate((p) => p.atRest());
  await together([right(rootFor(up, open)), select(0)]);
  expect(await heard(probe, 'gesture:release', { hand: 'right', count: 2 })).toMatchObject({
    gesture: 'pull',
    id: out.id,
  });
  await expect.poll(() => probe.evaluate((p, id) => p.height(id), out.id!)).toBeGreaterThan(before);
  expect((await probe.evaluate((p) => p.seed()))?.id, 'the seed still out on the palm').toBe(next.id);

  // The left hand took no part: never tracked, in no event.
  expect(await probe.evaluate((p) => p.tracked('left'))).toBe(false);
  expect((await probe.evaluate((p) => p.heard)).filter((e) => e.hand === 'left')).toEqual([]);
  console.log(
    `T-160 one hand (emulator, table room): seed ${out.id} taken off its own palm, planted at ${JSON.stringify(CELL)}`,
  );
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
