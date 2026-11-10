/// <reference types="webxr" />
// T-193, D-080 (API_SPEC §1.9, §1.10 rule 8): a palm-up hands out the supply's next seed at once, every time; the
// Seeds page is a place the player goes to on purpose (the orb, the Garden tab, its Seeds button) to choose the kind
// of the next seed. Two hands: seed 1 comes as it is; with seed 2 on the palm the page picks the choir, so seed 2
// goes back to the supply and the next palm-up brings it as a choir; a reload keeps the kinds. One hand: a seed
// thrown off the bed is back in the supply; a pick, then palm up, brings it in the picked kind. The gaze alone in a
// room with no table: a dwell on a cell plants the next seed as it is; the orb, Garden and Seeds by dwell pick the
// hum; a look at a cell plants it. The press, look and palm helpers are those of 12-settings, 16-seeds, 24-one-hand
// and 25-gaze. The test emits nothing; it moves IWER's hands and head. Emulator results (E): whether a player finds
// the Seeds button and tells the swatches apart are headset checks (TEST_PLAN §4.6).

import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { HIT_RADIUS_M } from '../../src/hands/config';

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
const PALM_UP = { roll: 180, pitch: 0, yaw: 0 };
const LEFT_ROOT: Vec3 = { x: -0.2, y: 0.95, z: -0.3 };
const RIGHT_ROOT: Vec3 = { x: 0.2, y: 0.95, z: -0.3 }; // over the table, beside the bed, nothing within reach
const CELLS: Cell[] = [
  { ring: 2, step: 4 },
  { ring: 2, step: 3 },
  { ring: 2, step: 5 },
]; // the middle ring nearest the user; autoplant=1 takes ring 0, step 0
const GAZE_REST_MS = 1500;
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

const cellAt = (probe: JSHandle<Probe>, cell: Cell) => probe.evaluate((p, c) => p.cellAt(c), cell);
const kindOf = async (probe: JSHandle<Probe>, id: string) => {
  const plant = (await probe.evaluate((p) => p.plants())).find((each) => each.id === id);
  return plant === undefined ? null : { voice: plant.voice, family: plant.family };
};
const NEW_SWATCHES = ['seed:bowl', 'seed:chime', 'seed:flute', 'seed:reed', 'seed:hum'];
const OLD_SWATCHES = ['seed:bell', 'seed:pluck', 'seed:choir', 'seed:pad', 'seed:bass'];
const SEEDS_HEADER = ['lib:old', 'lib:new', 'close'];

/** D-080: the board from the orb, its Garden tab, then its Seeds button, each by a real pinch: the Seeds page shows. */
async function openSeedsPage(page: Page, probe: JSHandle<Probe>, press: (id: string) => Promise<void>) {
  await press('orb');
  await page.waitForFunction((p) => p.isOpen(), probe);
  await press('tab:garden');
  await press('seeds');
  await expect.poll(() => probe.evaluate((p) => p.ids().slice(0, 3))).toEqual(SEEDS_HEADER);
}

/** The orb rides the left hand while its back faces the head (12-settings): that palm turned down shows it. */
async function palmDownForOrb(
  page: Page,
  probe: JSHandle<Probe>,
  hands: Awaited<ReturnType<typeof emulated>>,
) {
  await hands.together([hands.transform('left', LEFT_ROOT, PALM_DOWN)]);
  await page.waitForFunction((p) => p.panelAt('orb') !== null, probe);
}

/**
 * The gaze on the settings orb until the board opens. The orb waits at its own place in the view box, held to the
 * box's edge while the head looks away (T-151): looked at there it goes back to its place, so the head follows it
 * until it stays put (25-gaze).
 */
async function gazeOpensBoard(page: Page, probe: JSHandle<Probe>) {
  for (let at = (await probe.evaluate((p) => p.panelAt('orb')))!, tries = 0; tries < 4; tries++) {
    await lookOn(page, at);
    await xrFrames(page, 3);
    const now = await probe.evaluate((p) => p.panelAt('orb'));
    if (now === null || distance(now, at) < 0.001) break;
    at = now;
  }
  await page.waitForFunction((p) => p.isOpen(), probe);
}

/** The gaze rests on a board control until `done` holds (the dwell of FR-HND-12). */
async function dwellOn(page: Page, probe: JSHandle<Probe>, id: string, done: (ids: string[]) => boolean) {
  const at = await probe.evaluate((p, id) => p.panelAt(id), id);
  expect(at, `${id} on show`).not.toBeNull();
  await lookOn(page, at!);
  await expect.poll(async () => done(await probe.evaluate((p) => p.ids())), { timeout: 10_000 }).toBe(true);
}

test('T-193 two hands: every palm-up brings a seed; the Seeds page, with a seed on the palm, sets its kind; a reload keeps it', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'), '/');
  const probe = await probeApp(page);
  await enterXR(page);
  await heard(probe, 'garden:seedArrived', { count: 3 });
  const hands = await emulated(page, probe);
  await hands.together([hands.transform('left', LEFT_ROOT, PALM_UP)]); // up from here on: a palm-up each 400 ms

  // Seed 1 comes to the palm as it is, and after the plant seed 2 does: no board, no ask (D-080).
  const first = await hands.carry(await cellAt(probe, CELLS[0]!), 1);
  const second = await heard(probe, 'garden:seedOut', { count: 2 });
  expect(await probe.evaluate((p) => p.isOpen())).toBe(false);

  // With seed 2 on the palm, the palm turned down shows the orb (12-settings); orb, Garden, Seeds. The page opens
  // on the New library, every kind on offer (hum too).
  await palmDownForOrb(page, probe, hands);
  await openSeedsPage(page, probe, (id) => hands.press(id));
  expect(await probe.evaluate((p) => p.ids())).toEqual([...SEEDS_HEADER, ...NEW_SWATCHES]);
  await page.screenshot({ path: '.tmp/t193-seeds-new.png' });
  await hands.press('lib:old');
  expect(await probe.evaluate((p) => p.ids())).toEqual([...SEEDS_HEADER, ...OLD_SWATCHES]);
  await hands.press('seed:choir');
  await page.waitForFunction((p) => !p.isOpen(), probe);
  // The pick took seed 2 back; the palm turned up again gets it as a choir.
  expect(await heard(probe, 'garden:seedBack', { id: second.id! })).toMatchObject({ reason: 'reset' });
  await hands.together([hands.transform('left', LEFT_ROOT, PALM_UP)]);
  expect(await heard(probe, 'garden:seedOut', { count: 3 })).toMatchObject({ id: second.id });
  const choir = await hands.carry(await cellAt(probe, CELLS[1]!), 3);
  expect(await kindOf(probe, choir)).toEqual({ voice: 'choir', family: null });

  // Seed 3 comes as it is; the page opens on the library last shown; New, then the large bowl.
  await heard(probe, 'garden:seedOut', { count: 4 });
  await palmDownForOrb(page, probe, hands);
  await openSeedsPage(page, probe, (id) => hands.press(id));
  expect(await probe.evaluate((p) => p.ids())).toContain('seed:choir');
  await hands.press('lib:new');
  await hands.press('seed:bowl');
  await page.waitForFunction((p) => !p.isOpen(), probe);
  await hands.together([hands.transform('left', LEFT_ROOT, PALM_UP)]);
  const bowl = await hands.carry(await cellAt(probe, CELLS[2]!), 5);
  expect(await kindOf(probe, bowl)).toEqual({ voice: 'bell', family: 'new' });
  expect(await kindOf(probe, first)).toMatchObject({ family: null }); // the first seed, never picked: Old

  // Reload: the same plants, each of its kind.
  const planted = await probe.evaluate((p) => p.plants());
  await page.reload();
  const again = await probeApp(page);
  expect(await again.evaluate((p) => p.plants())).toEqual(planted);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('T-193 one hand: palm up brings the seed at once; thrown off the bed it is back in the supply; picked, palm up brings it as a flute', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'), '/?access=onehand&flags=autoplant=1');
  const probe = await probeApp(page);
  await enterXR(page);
  await heard(probe, 'garden:seedArrived', { count: 3 });
  const hands = await emulated(page, probe);
  await hands.together([['set_connected', { device: 'hand-left', connected: false }]]);
  const restsOnPalm = (id: string) =>
    expect
      .poll(
        async () => {
          const [seed, palm] = await probe.evaluate((p) => [p.seed(), p.palm('right')] as const);
          return seed?.id === id ? distance(seed.at, palm) : Infinity;
        },
        { timeout: 20_000 },
      )
      .toBeLessThan(0.001);
  const pinchOffPalm = async (id: string) => {
    await restsOnPalm(id);
    await hands.together([hands.select(1)]);
    await heard(probe, 'gesture:pinchStart', { hand: 'right', id });
    await xrFrames(page, 12); // past the 100 ms hop to the pinch point
  };

  // One plant on the bed (autoplant=1): the right palm turned up gets the seed at once, and no board opens.
  await hands.together([hands.transform('right', RIGHT_ROOT, PALM_UP)]);
  const out = await heard(probe, 'garden:seedOut', { hand: 'right' });
  expect(await probe.evaluate((p) => p.isOpen())).toBe(false);

  // Thrown out: pinched off the palm, carried off the bed, let go on no cell. It is in the supply again.
  await pinchOffPalm(out.id!);
  const [inner, outer] = [
    await cellAt(probe, { ring: 0, step: 4 }),
    await cellAt(probe, { ring: 4, step: 4 }),
  ];
  const offBed = {
    x: outer.x + 1.5 * (outer.x - inner.x),
    y: outer.y,
    z: outer.z + 1.5 * (outer.z - inner.z),
  }; // about 0.5 m from the bed's centre, on the user's side: no cell
  await hands.together([hands.transform('right', hands.rootFor(offBed))]);
  await hands.settle();
  await hands.together([hands.select(0)]);
  expect(await heard(probe, 'garden:seedBack', { id: out.id! })).toMatchObject({ reason: 'offBed' });
  expect(await probe.evaluate((p) => p.plants().length)).toBe(1);

  // The Seeds page by the same hand picks the flute; palm up again brings that seed as a flute; planted.
  await openSeedsPage(page, probe, (id) => hands.press(id));
  await hands.press('seed:flute');
  await page.waitForFunction((p) => !p.isOpen(), probe);
  expect(await probe.evaluate((p) => p.next())).toEqual({ voice: 'choir', family: 'new' });
  await hands.together([hands.transform('right', RIGHT_ROOT, PALM_UP)]);
  expect(await heard(probe, 'garden:seedOut', { hand: 'right', count: 2 })).toMatchObject({ id: out.id });
  await pinchOffPalm(out.id!);
  const cell = await cellAt(probe, CELLS[0]!);
  await hands.together([hands.transform('right', hands.rootFor(cell))]);
  await hands.settle();
  await hands.together([hands.select(0)]);
  await heard(probe, 'planted', { id: out.id! });
  expect(await kindOf(probe, out.id!)).toEqual({ voice: 'choir', family: 'new' });
  expect((await probe.evaluate((p) => p.heard)).filter((e) => e.hand === 'left')).toEqual([]);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('T-193 gaze, no table: a dwell on a cell plants the seed as it is; orb, Garden and Seeds by dwell pick the hum; a look at a cell plants it', async ({
  page,
}) => {
  const errors = watch(page);
  // forceLevel=4: the floating bed a room with no table ends on, without its 40 s level-3 wait (D-074).
  const offHost = await openApp(page, readRoom('none'), '/?access=gaze&flags=autoplant=1,forceLevel=4');
  const probe = await probeApp(page);
  await enterXR(page);
  await togetherOn(page, [
    ['set_connected', { device: 'hand-left', connected: false }],
    ['set_connected', { device: 'hand-right', connected: false }],
  ]);
  await heard(probe, 'garden:seedArrived', { count: 3 });

  // A dwell on a free cell plants the next seed as it is: no board (D-080).
  await lookOn(page, await cellAt(probe, CELLS[0]!));
  const first = await heard(probe, 'planted');
  expect(await probe.evaluate((p) => p.isOpen())).toBe(false);
  expect(await kindOf(probe, first.id!)).toMatchObject({ family: null });

  // The orb, the Garden tab and the Seeds button by dwell; then a dwell on the hum's swatch picks it. The board
  // stays while the gaze rests there, and nothing is planted.
  await gazeOpensBoard(page, probe);
  await dwellOn(page, probe, 'tab:garden', (ids) => ids.includes('seeds'));
  await dwellOn(page, probe, 'seeds', (ids) => ids[0] === SEEDS_HEADER[0]);
  await lookOn(page, (await probe.evaluate((p) => p.panelAt('seed:hum')))!);
  await expect
    .poll(() => probe.evaluate((p) => p.next()), { timeout: 10_000 })
    .toEqual({ voice: 'bass', family: 'new' });
  await page.waitForTimeout(GAZE_REST_MS);
  expect(await probe.evaluate((p) => [p.isOpen(), p.plants().length])).toEqual([true, 2]);

  // A look at another cell: the board goes, and the dwell plants the hum there.
  await lookOn(page, await cellAt(probe, CELLS[1]!));
  const hum = await heard(probe, 'planted', { count: 2 });
  expect(await probe.evaluate((p) => p.isOpen())).toBe(false);
  expect(await kindOf(probe, hum.id!)).toEqual({ voice: 'bass', family: 'new' });
  expect((await probe.evaluate((p) => p.plants())).find((p) => p.id === hum.id)?.cell).toEqual(CELLS[1]);
  expect(await named(probe, 'gesture:pinchStart')).toEqual([]); // not one pinch
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
