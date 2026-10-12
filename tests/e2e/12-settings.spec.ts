/// <reference types="webxr" />
// T-151: the settings panel in the emulator (UX §3.6; FR-UI-03/04/05/10, FR-HND-12). Nothing registers PanelSystem
// in src/index.ts before T-128, so the test registers it on the app's own world (IWSDK's dev-build hook), as
// 08-landing.spec.ts does for captions, at the priority and with the `garden` and `room` of API_SPEC §1.10 (stand-ins
// that note each call). Everything else is the app's own: its HandSystem on IWER's emulated hands reports the
// pinches, the orb rides the emulated left hand, and in the gaze test the emulated head is the input.
// Emulator results (E): they say nothing about a headset, about comfort, or about how the panel looks.
import { expect, test, type JSHandle, type Page } from '@playwright/test';

import { openApp, readRoom, SESSION_ENTRY_LIMIT_MS, xrFrames } from './support/iwer';

const WORLD_READY_MS = 15_000; // the Enter button waits for the world; software rendering takes a few seconds
const HOLD_LIMIT_MS = 10_000; // the 1.5 s hold, the dwells and a hand coming to rest, with room for a slow host
const HIT_RADIUS_M = 0.04; // FR-HND-04, pinned here on purpose
const PALM_DOWN = { roll: 0, pitch: 0, yaw: 0 }; // an emulated hand's orientation, in degrees

/** The part of IWER's XRDevice this spec uses (iwer 2.5.0). */
interface Device {
  primaryInputMode: 'controller' | 'hand';
  activeSession?: XRSession;
  remote: { dispatch(method: string, params?: object): Promise<unknown> };
}
type Core = typeof import('../../src/core/index');
type Ui = typeof import('../../src/ui/index');
type Hands = typeof import('../../src/hands/index');
type Garden = typeof import('../../src/garden/index');
type Audio = typeof import('../../src/audio/index');
type Settings = ReturnType<Core['settings']['get']>;
type PanelSystem = InstanceType<Ui['PanelSystem']>;
type Hand = 'left' | 'right';
type Vec3 = { x: number; y: number; z: number };
type Entity = import('@iwsdk/core').Entity;
/** IWSDK 1.0.1 puts its dev runtime on the page in a dev build; the app's world is a field of it. */
interface DevPage {
  FRAMEWORK_MCP_RUNTIME: { world: import('@iwsdk/core').World };
}
interface Target {
  id: string;
  kind: string;
  radius: number;
  pos: Vec3;
}
/** What the test holds in the page. */
interface Probe {
  system: PanelSystem;
  info: { render: { calls: number; triangles: number } };
  /** Draw calls of a frame before the panel's system was registered. */
  bare: number;
  board: { visible: boolean; material: { map: { version: number } } };
  orb: { visible: boolean };
  ring: { visible: boolean };
  fill: { visible: boolean; geometry: { drawRange: { count: number } } };
  /** The head's world matrix, 16 numbers. */
  head(): number[];
  settings(): Settings;
  set(patch: Partial<Settings>): void;
  /** The audio engine made by audio's own factory: its tempo and volume as it holds them. */
  engine: { bpm: number; volume: number };
  /** Every call the panel made on the stand-in garden and room, and every pinch the hand system reported. */
  heard: { type: string; payload: unknown }[];
  /** The panel's Interactables: the targets the hand system can pick now. */
  targets(): Target[];
  /** Where the hand system has a hand's pinch point (its HandState), or null while it is not tracked. */
  pinchPos(hand: Hand): Vec3 | null;
  /** Resolves when that hand's pinch point has stopped moving (its position is filtered, FR-HND-03). */
  atRest(hand: Hand): Promise<Vec3>;
  words(): string[];
}

const device = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { IWER_DEVICE?: Device }).IWER_DEVICE) as Promise<
    JSHandle<Device>
  >;

/** Console errors and page errors from now on. */
function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

/** Presses the page's own Enter button with hands selected, and waits for the session's first frames. */
async function enter(page: Page): Promise<JSHandle<Device>> {
  const d = await device(page);
  await d.evaluate((d) => {
    d.primaryInputMode = 'hand';
  });
  const enterButton = page.getByRole('main').getByRole('button', { name: 'Enter the garden' });
  await enterButton.click({ timeout: WORLD_READY_MS });
  await page.waitForFunction((d) => d.activeSession !== undefined, d, { timeout: SESSION_ENTRY_LIMIT_MS });
  await xrFrames(page, 5);
  return d;
}

/** Registers PanelSystem on the app's world and returns the probe. */
function probePanel(page: Page): Promise<JSHandle<Probe>> {
  return page.evaluateHandle(async () => {
    const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;
    const core = await load<Core>('/src/core/index.ts');
    const ui = await load<Ui>('/src/ui/index.ts');
    const hands = await load<Hands>('/src/hands/index.ts');
    const garden = await load<Garden>('/src/garden/index.ts');
    const audio = await load<Audio>('/src/audio/index.ts');
    const { world } = (window as unknown as DevPage).FRAMEWORK_MCP_RUNTIME;
    if (!world.hasSystem(hands.HandSystem)) throw new Error('src/index.ts did not register HandSystem');
    const bare = world.renderer.info.render.calls;
    const heard: Probe['heard'] = [];
    for (const type of ['gesture:pinchStart', 'gesture:release'] as const)
      core.bus.on(type, (event) =>
        heard.push({ type, payload: { hand: event.hand, id: event.target?.id ?? null } }),
      );

    // Stand-ins for the app's GardenSystem and RoomSystem (API_SPEC §1.10; to build, T-128): they note each call.
    // The garden also does what the real one will: the reducer, then `garden:changed`.
    let state = garden.newGarden(core.clock.now(), core.settings.get());
    const standInGarden = {
      newGarden: () => heard.push({ type: 'garden.newGarden', payload: null }),
      setBedHeightOffset(metres: number) {
        heard.push({ type: 'garden.setBedHeightOffset', payload: metres });
        state = garden.setBedHeightOffset(state, metres);
        core.bus.emit('garden:changed', { state, diff: { added: [], removed: [], changed: [] } });
      },
    };
    const standInRoom = { replace: () => heard.push({ type: 'room.replace', payload: null }) };
    const configData = { garden: standInGarden, room: standInRoom };
    world.registerSystem(ui.PanelSystem, { priority: 62, configData });
    const system = world.getSystem(ui.PanelSystem) as PanelSystem;
    // Two private fields: the system's target entities (the hand system finds them with its own query on
    // Interactable) and the HandState entity it keeps for each hand.
    const { entities, palms } = system as unknown as {
      entities: Entity[];
      palms: Record<Hand, { entity: Entity } | null>;
    };
    const named = (name: string) => world.scene.getObjectByName(name) as unknown;
    const point = (at: ArrayLike<number>): Vec3 => ({ x: at[0] ?? 0, y: at[1] ?? 0, z: at[2] ?? 0 });

    const pinchPos = (hand: Hand): Vec3 | null => {
      const entity = palms[hand]?.entity;
      if (entity === undefined || entity.getValue(hands.HandState, 'tracked') !== true) return null;
      return point(entity.getVectorView(hands.HandState, 'pinchPos'));
    };
    const probe: Probe = {
      system,
      info: world.renderer.info,
      bare,
      board: named('settings-panel') as Probe['board'],
      orb: named('settings-orb') as Probe['orb'],
      ring: named('settings-cue') as Probe['ring'],
      fill: named('settings-fill') as Probe['fill'],
      head: () => [...world.player.head.matrixWorld.elements],
      settings: () => ({ ...core.settings.get() }),
      set: (patch) => core.settings.set(patch),
      // `bpm` and `volume` are private fields of audio's engine: read, never written.
      engine: audio.createAudioEngine() as unknown as Probe['engine'],
      heard,
      targets: () =>
        entities
          .filter((entity) => entity.hasComponent(core.Interactable))
          .map((entity) => ({
            id: entity.getValue(core.Interactable, 'id') ?? '',
            kind: entity.getValue(core.Interactable, 'kind') ?? '',
            radius: entity.getValue(core.Interactable, 'radius') ?? 0,
            pos: point(entity.getVectorView(core.Interactable, 'worldPos')),
          })),
      pinchPos,
      atRest: (hand) =>
        new Promise((done, fail) => {
          let last: Vec3 | null = null;
          const look = () => {
            const session = world.renderer.xr.getSession();
            if (session === null) return fail(new Error('atRest needs a session'));
            const now = pinchPos(hand);
            const still =
              last !== null &&
              now !== null &&
              Math.hypot(now.x - last.x, now.y - last.y, now.z - last.z) < 0.0002;
            if (now !== null && still) return done(now);
            last = now;
            session.requestAnimationFrame(look);
          };
          look();
        }),
      words: () => system.panel.texts().map((text) => text.text),
    };
    return probe;
  });
}

const ids = (probe: JSHandle<Probe>) => probe.evaluate((p) => p.targets().map((target) => target.id));
const draws = (probe: JSHandle<Probe>) => probe.evaluate((p) => p.info.render.calls);
const uploads = (probe: JSHandle<Probe>) => probe.evaluate((p) => p.board.material.map.version);
const events = (probe: JSHandle<Probe>, type: string) =>
  probe.evaluate((p, type) => p.heard.filter((e) => e.type === type).map((e) => e.payload), type);

/** The emulated hands of one page: where they are put, their pinch, and a press on a panel target. */
function hands(page: Page, d: JSHandle<Device>, probe: JSHandle<Probe>) {
  const dispatch = (method: string, params: object) =>
    d.evaluate((d, [method, params]) => d.remote.dispatch(method, params), [method, params] as const);
  /** Puts a hand's root at `position`, palm down (`roll` 0) or turned about its length, and lets it come to rest. */
  const put = async (hand: Hand, position: Vec3, roll = 0): Promise<Vec3> => {
    const orientation = { ...PALM_DOWN, roll };
    await dispatch('set_transform', { device: `hand-${hand}`, position, orientation });
    await xrFrames(page, 2);
    return probe.evaluate((p, hand) => p.atRest(hand), hand);
  };
  const select = (hand: Hand, value: 0 | 1) =>
    dispatch('set_select_value', { device: `hand-${hand}`, value });
  /**
   * From the root of the right hand to its pinch point, open and closed. IWER's hand is rigid but for the pinch,
   * and its pinch point jumps when it closes (7.7 cm, measured below): a real hand that comes to a target has
   * its fingers nearly together already. So the hand comes to rest with its open pinch point on the target, and
   * in the frame it closes it is moved by that jump: the pinch point stays where it was, as a real one would.
   * Measured once, on a pinch at nothing.
   */
  let reach: { open: Vec3; closed: Vec3 } | null = null;
  const measureReach = async () => {
    const root = { x: 0.3, y: 1.1, z: -0.25 };
    const from = (tip: Vec3): Vec3 => ({ x: tip.x - root.x, y: tip.y - root.y, z: tip.z - root.z });
    const open = from(await put('right', root));
    await select('right', 1);
    await xrFrames(page, 2);
    const closed = from(await probe.evaluate((p) => p.atRest('right')));
    await select('right', 0);
    await xrFrames(page, 2);
    await probe.evaluate((p) => p.atRest('right'));
    const jump = Math.hypot(closed.x - open.x, closed.y - open.y, closed.z - open.z);
    console.log(`T-151 the emulated hand's pinch point moves ${(jump * 100).toFixed(1)} cm when it closes`);
    return { open, closed };
  };
  const rootFor = (pos: Vec3, tip: Vec3): Vec3 => ({ x: pos.x - tip.x, y: pos.y - tip.y, z: pos.z - tip.z });
  const find = async (id: string): Promise<Vec3> => {
    const target = (await probe.evaluate((p) => p.targets())).find((each) => each.id === id);
    if (target === undefined) throw new Error(`no target ${id}`);
    return target.pos;
  };
  /** The right hand comes to rest with its pinch point on a target and closes on it. */
  const pinch = async (id: string): Promise<void> => {
    reach ??= await measureReach();
    const pos = await find(id);
    const tip = await put('right', rootFor(pos, reach.open));
    const off = Math.hypot(tip.x - pos.x, tip.y - pos.y, tip.z - pos.z);
    expect(off, `the hand on ${id}`).toBeLessThan(HIT_RADIUS_M / 4);
    // The move that takes up the jump, and the pinch, in one frame.
    const turn = { device: 'hand-right', position: rootFor(pos, reach.closed), orientation: PALM_DOWN };
    await d.evaluate(async (d, turn) => {
      await d.remote.dispatch('set_transform', turn);
      await d.remote.dispatch('set_select_value', { device: turn.device, value: 1 });
    }, turn);
  };
  /** A real pinch on a target and its release. The app's hand system reports both. */
  const press = async (id: string): Promise<void> => {
    await pinch(id);
    await xrFrames(page, 4);
    await select('right', 0);
    await xrFrames(page, 4);
  };
  return { put, select, pinch, press };
}

test('settings panel: by real pinches the orb opens it, each tab shows, a control on each tab acts, it closes', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('table'));
  const d = await enter(page);
  const probe = await probePanel(page);
  const { put, select, pinch, press } = hands(page, d, probe);
  const head = await probe.evaluate((p) => p.head());
  const below = (right: number, down: number, ahead: number): Vec3 => ({
    x: head[12]! + right,
    y: head[13]! - down,
    z: head[14]! - ahead,
  });

  // The orb rides the hand that is not the dominant one, and shows only while the back of that hand faces the
  // head: palm up, the pose that asks for a seed, it is not there and cannot be picked.
  await put('left', below(-0.2, 0.35, 0.35), 180);
  await xrFrames(page, 3);
  expect(await probe.evaluate((p) => [p.orb.visible, p.board.visible])).toEqual([false, false]);
  expect(await ids(probe)).toEqual([]);
  await put('left', below(-0.2, 0.35, 0.35), 0);
  await xrFrames(page, 3);
  expect(await probe.evaluate((p) => p.orb.visible)).toBe(true);
  expect(await ids(probe)).toEqual(['orb']);

  // A pinch on the orb opens the panel on the Sound tab, inside the view box, 0.55 m ahead.
  await press('orb');
  // What the app's hand system reported: after the one pinch at nothing that measured the hand, a press on the orb.
  expect(await events(probe, 'gesture:release')).toEqual([
    { hand: 'right', id: null },
    { hand: 'right', id: 'orb' },
  ]);
  expect(await probe.evaluate((p) => [p.system.panel.open, p.system.panel.tab, p.board.visible])).toEqual([
    true,
    'sound',
    true,
  ]);
  const fov = await probe.evaluate((p) => ({ ...p.system.fov }));
  const EDGE = 0.05; // degrees: the emulator's poses are 32-bit floats
  expect(fov.leftDeg).toBeGreaterThanOrEqual(-25 - EDGE);
  expect(fov.rightDeg).toBeLessThanOrEqual(25 + EDGE);
  expect(fov.downDeg).toBeGreaterThanOrEqual(-20 - EDGE);
  expect(fov.upDeg).toBeLessThanOrEqual(20 + EDGE);
  expect(fov.rightDeg - fov.leftDeg).toBeCloseTo(40, 0); // 0.40 m wide at 0.55 m
  const header = ['tab:sound', 'tab:access', 'tab:garden', 'close'];
  const sound = ['tempo:-', 'tempo:+', 'volume:-', 'volume:+', 'reverb:auto', 'reverb:small', 'reverb:off'];
  expect(await ids(probe)).toEqual(['orb', ...header, ...sound]);
  for (const target of await probe.evaluate((p) => p.targets())) {
    expect(target.kind).toBe('panel');
    expect(target.radius).toBeCloseTo(HIT_RADIUS_M, 6);
  }
  await page.screenshot({ path: '.tmp/settings-sound.png' });

  // Sound: one pinch on Tempo + is 4 BPM in core's settings, and the audio engine follows.
  expect(await probe.evaluate((p) => [p.settings().tempo, p.engine.bpm])).toEqual([84, 84]);
  const drawnBefore = await uploads(probe);
  await press('tempo:+');
  expect(await probe.evaluate((p) => [p.settings().tempo, p.engine.bpm])).toEqual([88, 88]);
  expect(await probe.evaluate((p) => p.words())).toContain('88 BPM');
  expect(await uploads(probe)).toBe(drawnBefore + 1); // drawn again once, for the change
  await press('volume:-');
  expect(await probe.evaluate((p) => [p.settings().volume, p.engine.volume])).toEqual([0.7, 0.7]);
  // Idle: the canvas is not drawn again, frame after frame.
  const idle = await uploads(probe);
  await xrFrames(page, 10);
  expect(await uploads(probe)).toBe(idle);

  // Access: the tab shows its switches, and High contrast changes core's settings and the panel's look.
  await press('tab:access');
  const switches = ['oneHand', 'gazeDwell', 'highContrast', 'reducedMotion', 'beatRing'];
  expect(await ids(probe)).toEqual(['orb', ...header, ...switches, 'hand:left', 'hand:right']);
  await page.screenshot({ path: '.tmp/settings-access.png' });
  await press('highContrast');
  expect((await probe.evaluate((p) => p.settings())).highContrast).toBe(true);
  await page.screenshot({ path: '.tmp/settings-access-high-contrast.png' });
  await press('highContrast');
  expect((await probe.evaluate((p) => p.settings())).highContrast).toBe(false);

  // Garden: the tab asks, it does not act. A bed-height step is a call on the garden; its answer shows on the panel.
  await press('tab:garden');
  expect(await ids(probe)).toEqual(['orb', ...header, 'height:-', 'height:+', 'replaceBed', 'newGarden']);
  await press('height:+');
  expect(await events(probe, 'garden.setBedHeightOffset')).toEqual([0.02]);
  await xrFrames(page, 2);
  const gardenWords = await probe.evaluate((p) => p.words());
  expect(gardenWords).toEqual(expect.arrayContaining(['+2 cm', 'Day 1, Seeds 0, Key C major']));
  await page.screenshot({ path: '.tmp/settings-garden.png' });

  // New garden: a short pinch does nothing; a pinch held to the end and let go on the control asks once. The ring
  // round it fills meanwhile (UX §8).
  await press('newGarden');
  expect(await events(probe, 'garden.newGarden')).toEqual([]);
  await pinch('newGarden');
  const holdLimit = { timeout: HOLD_LIMIT_MS };
  await page.waitForFunction((p) => (p.system.panel.fill[0] as number) > 0.5, probe, holdLimit);
  expect(await probe.evaluate((p) => [p.ring.visible, p.fill.visible])).toEqual([true, true]);
  expect(await probe.evaluate((p) => p.fill.geometry.drawRange.count)).toBeGreaterThan(0);
  await page.screenshot({ path: '.tmp/settings-hold-ring.png' });
  await page.waitForFunction((p) => p.system.panel.fill[0] === 1, probe, { timeout: HOLD_LIMIT_MS });
  expect(await events(probe, 'garden.newGarden')).toEqual([]); // nothing before the release (FR-HND-16)
  await select('right', 0);
  await xrFrames(page, 4);
  expect(await events(probe, 'garden.newGarden')).toHaveLength(1);
  expect(await probe.evaluate((p) => p.fill.visible)).toBe(false);

  // Close shuts it: nothing of it is drawn or can be picked. The orb opens it again, and the orb shuts it too.
  await press('close');
  expect(await probe.evaluate((p) => [p.system.panel.open, p.board.visible])).toEqual([false, false]);
  expect(await ids(probe)).toEqual(['orb']);
  await press('orb');
  expect(await probe.evaluate((p) => [p.system.panel.open, p.system.panel.tab])).toEqual([true, 'garden']);
  await press('orb');
  expect(await probe.evaluate((p) => p.system.panel.open)).toBe(false);

  // Re-place bed says so and closes the panel.
  await press('orb');
  await press('replaceBed');
  expect(await events(probe, 'room.replace')).toHaveLength(1);
  expect(await probe.evaluate((p) => p.system.panel.open)).toBe(false);

  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});

test('settings panel: what it costs to draw and to run (NFR-PERF-03, NFR-PERF-05, CODING_GUIDELINES §5)', async ({
  page,
}) => {
  const errors = watch(page);
  await openApp(page, readRoom('table'));
  const d = await enter(page);
  const probe = await probePanel(page);
  const { put, select, pinch, press } = hands(page, d, probe);
  const head = await probe.evaluate((p) => p.head());
  const leftAt = { x: head[12]! - 0.2, y: head[13]! - 0.35, z: head[14]! - 0.35 };

  // Draw calls per frame, for both eyes.
  await put('left', leftAt, 180); // palm up: no orb
  await xrFrames(page, 3);
  const bare = await draws(probe);
  expect(bare).toBe(await probe.evaluate((p) => p.bare)); // the system draws nothing while nothing shows
  await put('left', leftAt, 0);
  await xrFrames(page, 3);
  const withOrb = await draws(probe);
  await press('orb');
  await put('right', { x: head[12]! + 0.3, y: head[13]! - 0.4, z: head[14]! - 0.2 }); // away from the panel
  await xrFrames(page, 3);
  const open = await draws(probe);
  await press('tab:garden');
  await pinch('newGarden');
  await page.waitForFunction((p) => p.fill.visible, probe, { timeout: HOLD_LIMIT_MS });
  const holding = await draws(probe);
  await put('right', { x: head[12]! + 0.3, y: head[13]! - 0.4, z: head[14]! - 0.2 }); // moved off: cancelled
  await select('right', 0);
  await xrFrames(page, 4);
  expect(await events(probe, 'garden.newGarden')).toEqual([]);
  console.log(
    `T-151 draw calls per frame, both eyes (emulator): ${bare} without the panel, ${withOrb} with the orb, ` +
      `${open} with the panel open, ${holding} during a hold (the ring and its fill)`,
  );
  expect(withOrb - bare).toBe(2);
  expect(open - withOrb).toBe(2);
  expect(holding - open).toBe(4);

  // What the system's own update costs with the panel open and idle (NFR-PERF-05: 6 ms for the whole frame).
  // Printed, not asserted: on this host the number says more about the other jobs running than about the code.
  expect(await probe.evaluate((p) => [p.system.panel.open, p.board.visible, p.orb.visible])).toEqual([
    true,
    true,
    true,
  ]);
  const microseconds = await probe.evaluate((p) => {
    const ROUNDS = 5000;
    const started = performance.now();
    for (let i = 0; i < ROUNDS; i++) p.system.update(0.0139);
    return ((performance.now() - started) * 1000) / ROUNDS;
  });
  console.log(`T-151 PanelSystem.update, panel open and idle: ${microseconds.toFixed(1)} us (emulator host)`);

  // And what it puts on the heap: the browser's own allocation sampler over 200,000 more idle updates, the orb
  // riding the hand and the panel open, counting every sampled byte allocated in ui/ code or in anything ui/ code
  // called, collected or not. One heap number per update would be 2.4 MB (12 bytes each). The first batch lets the
  // compiler settle; the control shows that the sampler does see ui/ code allocate. Before the orb, the ring and
  // the fill had their matrices written directly this read 19 MB: 96 bytes an update.
  const client = await page.context().newCDPSession(page);
  const sampledInUi = async (run: (p: Probe) => void) => {
    await client.send('HeapProfiler.startSampling', {
      samplingInterval: 256,
      includeObjectsCollectedByMajorGC: true,
      includeObjectsCollectedByMinorGC: true,
    });
    await probe.evaluate(run);
    const { profile } = await client.send('HeapProfiler.stopSampling');
    type Node = typeof profile.head;
    const bytes = (node: Node, inUi: boolean): number => {
      const here = inUi || node.callFrame.url.includes('/src/ui/');
      return node.children.reduce((sum, child) => sum + bytes(child, here), here ? node.selfSize : 0);
    };
    return bytes(profile.head, false);
  };
  const UPDATES = 200_000;
  const batch = (p: Probe) => {
    for (let i = 0; i < 200_000; i++) p.system.update(0.0139);
  };
  const settling = await sampledInUi(batch);
  const idleBytes = Math.min(await sampledInUi(batch), await sampledInUi(batch));
  const controlBytes = await sampledInUi((p) => {
    for (let i = 0; i < 2000; i++) p.system.panel.controls(); // a new array each call, by design
  });
  console.log(
    `T-151 sampled allocation in ui/ over ${UPDATES} idle updates: ${idleBytes} bytes (first batch, while the ` +
      `compiler settles: ${settling}); control, 2000 lists of controls: ${controlBytes} bytes (emulator page)`,
  );
  expect(controlBytes).toBeGreaterThan(100_000);
  expect(idleBytes / UPDATES).toBeLessThan(1);
  expect(errors).toEqual([]);
});

test('settings panel: the gaze alone opens it, changes a setting and closes it, with no pinch (FR-HND-12)', async ({
  page,
}) => {
  const errors = watch(page);
  const offHost = await openApp(page, readRoom('none'));
  const d = await enter(page);
  const probe = await probePanel(page);
  await probe.evaluate((p) => p.set({ gazeDwell: true, dwellMs: 600 }));
  await xrFrames(page, 3);

  // With the gaze alone the orb cannot ride a hand: it waits in the view box, to the left for a right-handed user.
  expect(await probe.evaluate((p) => p.orb.visible)).toBe(true);
  expect(await ids(probe)).toEqual(['orb']);

  /** Turns the emulated head to look straight at a point of the room, and waits a few frames. */
  const lookAt = async (point: Vec3) => {
    const head = await probe.evaluate((p) => p.head());
    const [dx, dy, dz] = [point.x - head[12]!, point.y - head[13]!, point.z - head[14]!];
    const deg = (rad: number) => (rad * 180) / Math.PI;
    const yaw = deg(Math.atan2(-dx, -dz));
    const pitch = deg(Math.atan2(dy, Math.hypot(dx, dz)));
    const turn = { device: 'headset', orientation: { yaw, pitch, roll: 0 } };
    await d.evaluate((d, turn) => d.remote.dispatch('set_transform', turn), turn);
    await xrFrames(page, 3);
    // How far off the gaze line the point is now, in metres: the aim itself is checked, not assumed.
    const m = await probe.evaluate((p) => p.head());
    const [x, y, z] = [point.x - m[12]!, point.y - m[13]!, point.z - m[14]!];
    const ahead = -(x * m[8]! + y * m[9]! + z * m[10]!);
    return Math.sqrt(Math.max(0, x * x + y * y + z * z - ahead * ahead));
  };
  const target = async (id: string) => {
    const found = (await probe.evaluate((p) => p.targets())).find((candidate) => candidate.id === id);
    expect(found, id).toBeDefined();
    return found!.pos;
  };

  // A look at the orb, held for the dwell time, opens the panel; the orb steps aside while it is open.
  expect(await lookAt(await target('orb'))).toBeLessThan(HIT_RADIUS_M / 2);
  await page.waitForFunction((p) => p.system.panel.open, probe, { timeout: HOLD_LIMIT_MS });
  await xrFrames(page, 2);
  expect(await probe.evaluate((p) => [p.board.visible, p.orb.visible])).toEqual([true, false]);
  const fov = await probe.evaluate((p) => ({ ...p.system.fov }));
  expect(fov.upDeg).toBeLessThanOrEqual(20.05); // opened while the head looked down and aside: still in the box
  expect(fov.leftDeg).toBeGreaterThanOrEqual(-25.05);

  // The gaze still rests where the orb was, on the open panel. Whatever lies there is not selected by that look.
  const opened = await probe.evaluate((p) => p.settings());
  await xrFrames(page, 60); // well over the 600 ms dwell at any frame rate the emulator reaches
  expect(await probe.evaluate((p) => p.settings())).toEqual(opened);
  expect(await probe.evaluate((p) => [p.system.panel.open, p.system.panel.tab])).toEqual([true, 'sound']);

  // A look at Tempo + is 4 BPM, once, however long the look lasts.
  expect(await lookAt(await target('tempo:+'))).toBeLessThan(HIT_RADIUS_M / 2);
  await page.waitForFunction((p) => p.settings().tempo === 88, probe, { timeout: HOLD_LIMIT_MS });
  await page.waitForFunction((p) => !p.fill.visible, probe);
  await xrFrames(page, 20);
  expect((await probe.evaluate((p) => p.settings())).tempo).toBe(88);

  // The Access tab by gaze: the hold times show there in this mode, and the gaze switch is out of the gaze's reach.
  await lookAt(await target('tab:access'));
  await page.waitForFunction((p) => p.system.panel.tab === 'access', probe, { timeout: HOLD_LIMIT_MS });
  await xrFrames(page, 2);
  expect(await ids(probe)).toEqual(expect.arrayContaining(['dwell:600', 'dwell:900', 'dwell:1200']));
  await page.screenshot({ path: '.tmp/settings-access-gaze.png' });
  await lookAt(await target('gazeDwell'));
  await xrFrames(page, 60);
  expect((await probe.evaluate((p) => p.settings())).gazeDwell).toBe(true);
  expect(await probe.evaluate((p) => p.ring.visible)).toBe(false);
  await lookAt(await target('dwell:900'));
  await page.waitForFunction((p) => p.settings().dwellMs === 900, probe, { timeout: HOLD_LIMIT_MS });

  // A look at Close shuts the panel, and the orb is back.
  await lookAt(await target('close'));
  await page.waitForFunction((p) => !p.system.panel.open, probe, { timeout: HOLD_LIMIT_MS });
  await xrFrames(page, 2);
  expect(await probe.evaluate((p) => [p.board.visible, p.orb.visible])).toEqual([false, true]);

  // No pinch was reported at any point: the gaze did all of it.
  expect(await events(probe, 'gesture:pinchStart')).toEqual([]);
  expect(await events(probe, 'gesture:release')).toEqual([]);
  expect(errors).toEqual([]);
  expect(offHost).toEqual([]);
});
