// The wiring (LLD §3, API_SPEC §1.10): everything that needs the SDK. src/index.ts, the boot, loads this file
// with `import()` once the landing page is on screen. Where a spec says "src/index.ts wires, saves or emits",
// the code is here. It makes the one of each the page has (world, audio engine, flash guard) and registers the
// systems; nothing else makes one.
import { World, XRInputVisualAdapter, type Entity } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';

import { BeatRingSystem, GazeDwellSystem } from './access/index.js';
import { createAudioEngine, GardenAudioSystem, type AudioEngine } from './audio/index.js';
import { Caption } from './core/components.js';
import {
  bus,
  clock,
  DEFAULT_SETTINGS,
  flags,
  log,
  settings,
  type Settings,
  type StringKey,
} from './core/index.js';
import { GardenSystem, newGarden } from './garden/index.js';
import { HandSystem } from './hands/index.js';
import { OnboardingSystem } from './onboarding/index.js';
import { openStore, PersistenceSystem } from './persistence/index.js';
import {
  BedRenderSystem,
  FlashGuard,
  FOVEATION_MEDIUM,
  HaloSystem,
  PerfSystem,
  SeedSystem,
  TuningRippleSystem,
} from './render/index.js';
import { RoomSystem } from './room/index.js';
import { CaptionSystem, HintSystem, PanelSystem } from './ui/index.js';
import { PointerSource, shouldOpenWindow, WindowStage } from './window/index.js';

import type { Landing } from './ui/Landing.js';

// No input models (T-111, Golden Rules 8 and 9). IWSDK 1.0.1 downloads a hand or controller model from
// cdn.jsdelivr.net whenever an input source joins the session, and no project option turns that off.
// `createVisual` is the one place that loads them; "no visual" is what it already returns when a model fails
// to load, and tracking carries on without it. Passthrough shows the real hands. tests/e2e/01-enter-xr.spec.ts
// goes red if a request leaves localhost, with hands or with controllers.
XRInputVisualAdapter.createVisual = () => Promise.resolve(undefined);

/** How often the Enter request is looked at while it is pending. No requirement fixes it: a frame or two. */
const ENTER_POLL_MS = 50;
/** LLD §8: how long a system whose `update` threw is left out, in seconds of the frame time `update` is given. */
export const BREAKER_PAUSE_S = 1;
/**
 * LLD §3.3 B: an audio context that the browser has not started this long after `xr:sessionStart` counts as no
 * sound. A context the browser will not start rejects nothing, so only the time can tell.
 */
const AUDIO_START_GRACE_MS = 3000;
/** LLD §3.2: how long a caption the wiring raises itself stays up. */
const WIRING_CAPTION_MS = 5000;
/** The caption of a session with no sound (API_SPEC §1.10 rule 2). */
const NO_SOUND: StringKey = 'E_AUDIO_CONTEXT';
/** The caption of writes that fail (LLD §3.3 G, §8): "Saving unavailable". */
const SAVE_FAILED: StringKey = 'E_SAVE_FAILED';
const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

declare global {
  interface Window {
    /** For browser tests, with `Flags.dev` only (API_SPEC §1.10 rule 14). Nothing in src/ reads it. */
    __roomsong?: { world: World; engine: AudioEngine; garden: GardenSystem };
  }
}

/** As much of an ECS system as the circuit breaker touches. */
interface Breakable {
  update(delta: number, time: number): void;
}
/** A system class as `register` takes it: `createSystem` gives it `schema`, the keys its configData may have. */
interface SystemClass<Sys extends Breakable> {
  new (...args: never[]): Sys;
  readonly name: string;
  readonly schema: object;
}
/** As much of the world as `register` touches. IWSDK's World fits; a unit test passes a fake. */
export interface SystemHost {
  registerSystem(
    System: SystemClass<Breakable>,
    options: { priority: number; configData: Record<string, unknown> },
  ): unknown;
  getSystem(System: SystemClass<Breakable>): Breakable | undefined;
  getSystems(): Breakable[];
}

const withBreaker = new WeakSet<Breakable>();
const lastPriority = new WeakMap<SystemHost, number>();

/**
 * The circuit breaker of LLD §8 around one system's `update`: a throw is caught and logged, and that system's
 * updates are skipped for the next BREAKER_PAUSE_S. Nothing between a system's `update` and the browser's frame
 * callback catches a throw, and Three.js asks for the next frame only after that callback has returned: without
 * this, one throw in one `update` ends the frames for the rest of the page's life.
 * The pause is counted on the frame time, not by a page timer: a browser may let timers sleep while a session is
 * up, and the hand system must not stay out for that long. The system's own `stop()` and `play()` are left
 * alone, so a system someone paused on purpose stays paused.
 */
function addBreaker(system: Breakable, name: string): void {
  if (withBreaker.has(system)) return;
  withBreaker.add(system);
  const update = system.update.bind(system);
  let resumeAt = -Infinity; // frame time, seconds
  system.update = (delta, time) => {
    if (time < resumeAt) return;
    try {
      update(delta, time);
    } catch (error) {
      resumeAt = time + BREAKER_PAUSE_S;
      log.error('app', `${name}.update threw: skipped for ${BREAKER_PAUSE_S} s`, error);
    }
  };
}

/**
 * The one way to register a system (LLD §3.2): at `priority`, with its collaborators as `configData`, and with
 * the circuit breaker around its `update`. Returns the instance. It throws, at start-up, for a priority lower
 * than the previous call's (bus handlers run in registration order, so the order is part of the contract) and
 * for a `configData` key the system's schema lacks (elics would drop that key in silence).
 */
export function register<Sys extends Breakable>(
  world: SystemHost,
  System: SystemClass<Sys>,
  priority: number,
  configData: Record<string, unknown> = {},
): Sys {
  const previous = lastPriority.get(world) ?? -Infinity;
  if (priority < previous) {
    throw new Error(`${System.name}: priority ${priority} is registered after priority ${previous}`);
  }
  for (const key of Object.keys(configData)) {
    if (!(key in System.schema)) throw new Error(`${System.name}: its schema has no configData key "${key}"`);
  }
  lastPriority.set(world, priority);
  world.registerSystem(System, { priority, configData });
  const system = world.getSystem(System) as Sys;
  addBreaker(system, System.name);
  return system;
}

/**
 * After the last `register`: every other system of the world gets the same circuit breaker. IWSDK's own systems
 * freeze the session the same way, and iwsdk.config.json turns on some that Roomsong does not use (LLD §3.2).
 */
export function breakOtherSystems(world: SystemHost): void {
  for (const system of world.getSystems()) addBreaker(system, system.constructor.name);
}

/**
 * A caption the wiring raises itself, for WIRING_CAPTION_MS, on an entity of the raiser's own: a Caption added to
 * an entity that still has one does not qualify again, so the old one is taken back first.
 */
function raise(entity: Entity, key: StringKey): void {
  if (entity.hasComponent(Caption)) entity.removeComponent(Caption);
  entity.addComponent(Caption, { key, expiresAt: clock.now() + WIRING_CAPTION_MS });
}

/**
 * LLD §3.3 A4: the saved settings go live under what the visitor already changed on the page while the save
 * loaded (a live value that differs from the default), so a box ticked during the load is not unticked. Exported
 * for its unit test.
 */
export function restoreSettings(saved: Settings): void {
  const live = settings.get();
  const touched = SETTING_KEYS.filter((key) => live[key] !== DEFAULT_SETTINGS[key]);
  settings.set({ ...saved, ...Object.fromEntries(touched.map((key) => [key, live[key]])) });
}

/** As much of the page as the saver's handlers listen to: `window`. */
type SavePage = Pick<Window, 'addEventListener' | 'removeEventListener'> & {
  document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
};

/**
 * Saving, all of it (LLD §3.3 G; API_SPEC §1.10 rule 9). Every `garden:changed` and every `settings:changed` hands
 * the saver `garden.state` (not the event's payload) with the live settings in it; the saver is flushed on a
 * hidden session and at a session's end. When the page is hidden or goes (`pagehide`) it may be closing, and the
 * browser drops an IndexedDB write under way with it: the pending state is then also written at once
 * (`flushNow`). Called right after `garden.load()`, so the garden just loaded is not written back; live settings
 * that differ from `stored` (the saved ones, or the defaults when nothing loaded) are saved at once, so a box
 * ticked while the save loaded, or with no session after it, is kept. `tabs`: a newer tab of the garden says
 * "opened", and this one stops saving, or it would write its older garden over the one that tab loaded.
 * Exported for its unit test; returns what stops it.
 */
export function keepSaved(
  garden: Pick<GardenSystem, 'state'>,
  saver: Pick<PersistenceSystem, 'save' | 'flush' | 'flushNow'>,
  page: SavePage,
  stored: Readonly<Settings>,
  tabs: Pick<BroadcastChannel, 'postMessage' | 'addEventListener'> | null,
): () => void {
  let last = garden.state;
  const save = (): void => {
    if (last !== null) saver.save({ ...last, settings: settings.get() });
  };
  const flush = (): void => void saver.flush(); // it never rejects
  const leave = (): void => {
    saver.flushNow();
    flush();
  };
  const onVisibility = (): void => {
    if (page.document.visibilityState === 'hidden') leave();
  };
  page.document.addEventListener('visibilitychange', onVisibility);
  page.addEventListener('pagehide', leave);
  const offs = [
    bus.on('garden:changed', () => {
      last = garden.state;
      save();
    }),
    bus.on('settings:changed', save),
    bus.on('xr:visibility', ({ visible }) => {
      if (!visible) flush();
    }),
    bus.on('xr:sessionEnd', flush),
  ];
  const stop = (): void => {
    for (const off of offs) off();
    page.document.removeEventListener('visibilitychange', onVisibility);
    page.removeEventListener('pagehide', leave);
  };
  const onOpened = (): void => {
    log.warn('app', 'the garden was opened in another tab: this one saves no more');
    stop();
  };
  tabs?.addEventListener('message', onOpened, { once: true });
  tabs?.postMessage('opened');
  const live = settings.get();
  if (SETTING_KEYS.some((key) => stored[key] !== live[key])) save();
  return stop;
}

/**
 * "Saving unavailable" where it can be seen (LLD §3.3 G): raised at once in a session, else at the next
 * `xr:sessionStart`, because the landing page shows no caption. Exported for its unit test.
 */
export function inSession(raiseNow: () => void): { raise: () => void; stop: () => void } {
  let isOpen = false;
  let isOwed = false;
  const offs = [
    bus.on('xr:sessionStart', () => {
      isOpen = true;
      if (isOwed) raiseNow();
      isOwed = false;
    }),
    bus.on('xr:sessionEnd', () => {
      isOpen = false;
    }),
  ];
  return {
    raise: () => {
      if (isOpen) raiseNow();
      else isOwed = true;
    },
    stop: () => offs.forEach((off) => off()),
  };
}

/** What the Enter click tells the session's start about the sound (LLD §3.3 B). */
interface SoundState {
  /** True until an Enter click has called `engine.init()`, and again when that call rejected. */
  failed: boolean;
}

/** Inside the Enter click: makes the audio context and asks it to run. A rejection is a session with no sound. */
function startSound(engine: AudioEngine, sound: SoundState): void {
  sound.failed = false;
  engine.init().then(
    () => log.info('app', 'audio started'),
    (error: unknown) => {
      sound.failed = true;
      log.error('app', 'E_AUDIO_CONTEXT', error);
    },
  );
}

/**
 * The garden window's Enter click (FR-SYS-07, LLD §11): the sound as `enterSession` starts it, then the window
 * opens, which emits `xr:sessionStart` at once. Nothing can refuse it.
 */
function enterWindow(stage: WindowStage, engine: AudioEngine, sound: SoundState): Promise<boolean> {
  startSound(engine, sound);
  stage.enter();
  return Promise.resolve(true);
}

/**
 * The landing page's Enter click (FR-SYS-01; LLD §3.3 B). Two things in the click's own call stack, neither
 * awaited before the other: `engine.init()`, which makes the audio context and asks it to run, and `launchXR`,
 * which requests the session. Both need the user's gesture; the audio goes first because that order asks least
 * of the browser. Resolves true when a session started; when none did, the engine is suspended again, so no
 * context runs on a page without a session.
 * IWSDK 1.0.1 has no supported way to learn of a refusal: `launchXR` returns nothing and logs the rejection itself.
 * So the outcome is read from `World.sessionRequestPending`, which IWSDK's types mark `@internal`. package.json
 * pins the SDK exactly and the field is typed, so an upgrade that removes it fails the typecheck, not the user.
 */
function enterSession(world: World, engine: AudioEngine, sound: SoundState): Promise<boolean> {
  startSound(engine, sound);
  world.launchXR();
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (world.sessionRequestPending) return;
      clearInterval(timer);
      const entered = world.session !== undefined;
      if (!entered) engine.suspend().catch((error: unknown) => log.error('app', 'E_AUDIO_CONTEXT', error));
      resolve(entered);
    }, ENTER_POLL_MS);
  });
}

/**
 * Turns the session's own events into the three `xr:*` bus events (API_SPEC §1.10 rule 3) and raises "Sound
 * unavailable" for a session that has no sound (rule 2; the three ways are in LLD §3.3 B). The sound is judged on
 * the bus, so the garden window's own `xr:*` events get the same check. Exported for its unit test, which gives
 * it a fake session; returns what stops its bus listeners.
 */
export function followSession(
  world: World,
  engine: AudioEngine,
  landing: Landing,
  sound: SoundState,
): () => void {
  const xr = world.renderer.xr;
  const caption = world.createEntity();
  const raiseNoSound = (): void => raise(caption, NO_SOUND);
  // Three.js listens for the session's end before it announces its start, so a session that ends in between
  // gives an end with no start. An `xr:sessionEnd` is emitted only for a session whose start was emitted.
  let started = false;
  let grace: ReturnType<typeof setTimeout> | undefined;
  xr.addEventListener('sessionstart', () => {
    // From `xr.getSession()`: IWSDK sets `world.session` only after this event.
    const session = xr.getSession();
    let seen = true;
    started = true;
    landing.granted(session?.enabledFeatures);
    // The session's own event, not `world.visibilityState`: IWSDK copies that inside its render tick, and a
    // hidden session has none. Emitted on a change only; a blurred session counts as seen (FR-SYS-05).
    session?.addEventListener('visibilitychange', () => {
      const visible = session.visibilityState !== 'hidden';
      if (!started || visible === seen) return;
      seen = visible;
      bus.emit('xr:visibility', { visible });
    });
    bus.emit('xr:sessionStart', { visible: true });
    // A session can start unseen (the headset taken off while the permission prompt is up). No event fires for
    // that, so it is said here; the return then emits its `true` like any other.
    if (session?.visibilityState === 'hidden') {
      seen = false;
      bus.emit('xr:visibility', { visible: false });
    }
  });
  xr.addEventListener('sessionend', () => {
    if (!started) return;
    started = false;
    bus.emit('xr:sessionEnd', { visible: false });
  });
  let isOpen = false; // between an xr:sessionStart and its xr:sessionEnd, from either path
  const offStart = bus.on('xr:sessionStart', () => {
    if (isOpen && flags.dev) log.warn('app', 'xr:sessionStart again, with no xr:sessionEnd between');
    isOpen = true;
    if (sound.failed) {
      raiseNoSound(); // init() rejected, or no click came before this session (the dev plugin's native XR control)
      return;
    }
    // Where this session found the audio clock: 0 before the first context, and where the last session left it
    // after that. A clock that has not moved by the end of the grace is a context the browser did not start or
    // did not resume, and nothing rejects for that.
    const audioAt = engine.clock.now();
    grace = setTimeout(() => {
      if (engine.clock.now() === audioAt) raiseNoSound();
    }, AUDIO_START_GRACE_MS);
  });
  const offEnd = bus.on('xr:sessionEnd', () => {
    isOpen = false;
    clearTimeout(grace);
    // Taken back with its session: one raised in a session without sound must not show in the next one.
    if (caption.hasComponent(Caption)) caption.removeComponent(Caption);
  });
  return () => {
    offStart();
    offEnd();
  };
}

/**
 * Makes the world and its systems and gives the landing page its Enter (LLD §3.3 A3 to A9). It rejects when a
 * step throws (no WebGL, the scene file missing, a fault in the wiring): the boot then tells the page.
 */
export async function start(landing: Landing): Promise<void> {
  // `projectOptions` is iwsdk.config.json: an AR session with hands required, and `xr.offer: "none"`, so the
  // page's Enter click is the only way in (API_SPEC §1.10 rule 2). IWSDK's default would also offer the session
  // to the browser, and a session started from that offer never passes through the click that starts the sound.
  // A3: the world and the saved garden side by side. The store never rejects and settles within
  // IDB_OPEN_TIMEOUT_MS; its load gives null for nothing saved, unreadable storage or a corrupt save, which it
  // has moved to a backup key (API_SPEC §4). A4: the saved settings go live before any system reads them.
  const opening = openStore();
  const [world, store, saved] = await Promise.all([
    World.create(document.getElementById('scene-container') as HTMLDivElement, projectOptions),
    opening,
    opening.then((opened) => opened.load()),
  ]);
  if (saved !== null) restoreSettings(saved.settings);
  // T-165: IWSDK's AudioSystem hangs an AudioListener on the head that nothing plays through (the engine has its
  // own context and listener), and it schedules 9 ramps at each matrix update. The system keeps it, and with it
  // the context it resumes and suspends at each session start and end.
  for (const child of [...world.player.head.children])
    if (child.type === 'AudioListener') child.removeFromParent();
  // T-165: and its two hand rays, drawn every tracked frame at opacity 0. The app aims with its own targets and
  // takes the pinch from the session's select (hands/), so no ray of IWSDK's has anything to point at.
  for (const hand of ['left', 'right'] as const)
    world.input.xr.multiPointers[hand].toggleSubPointer('ray', false);
  const engine = createAudioEngine();
  const guard = new FlashGuard();
  // Before any system: it subscribes to the bus in its constructor, so its handlers run first (LLD §3.2).
  const garden = new GardenSystem();
  const xr = world.renderer.xr;
  // NFR-PERF-09. Set once: Three.js keeps the value and applies it at each session start. Its own default is 1,
  // the strongest.
  xr.setFoveation(FOVEATION_MEDIUM);
  // T-165: every shader program links in the session's first frame with a pose, when only passthrough shows, so
  // none stalls a frame later (the placement, the first caption, pull, removal or Listen). compile() walks hidden
  // meshes too and builds for the bound target, and three binds the XR layer (multiview on a Quest) only in a
  // frame with a pose. The garden window has no layer: it compiles at once.
  let stopWarmUp = (): void => {};
  bus.on('xr:sessionStart', () => {
    if (!xr.isPresenting) return void world.renderer.compile(world.scene, world.camera);
    stopWarmUp = world.onXRFrame(() => {
      if (world.renderer.getRenderTarget() === null) return;
      stopWarmUp();
      world.renderer.compile(world.scene, world.camera);
    });
  });
  bus.on('xr:sessionEnd', () => stopWarmUp()); // a session that ended before a frame with a pose

  // In ascending priority, with the numbers of API_SPEC §1.10, one line each. A system subscribes to the bus in
  // `init()`, so every system is registered before the first `xr:sessionStart` can be emitted.
  register(world, PerfSystem, -100, { guard, engine });
  // The room before the hands: it moves the bed before hands reads its pose, in the frame and on the bus.
  const room = register(world, RoomSystem, 10);
  const hands = register(world, HandSystem, 20);
  register(world, GazeDwellSystem, 25, { room, guard }); // gaze dwell and its reticle (T-160)
  register(world, BeatRingSystem, 26, { guard, engine, bed: room.bed.object3D }); // the beat ring (T-160)
  register(world, OnboardingSystem, 35); // T-150: the guided first minute
  register(world, GardenAudioSystem, 40, { engine });
  register(world, SeedSystem, 49, { guard });
  // Everything drawn on the bed is a child of the bed entity's Object3D (API_SPEC §1.10 rule 5).
  register(world, BedRenderSystem, 50, { guard, engine, bed: room.bed.object3D });
  register(world, HaloSystem, 52, { guard, engine, bed: room.bed.object3D }); // Listen mode (T-148)
  register(world, TuningRippleSystem, 55, { guard, engine, bed: room.bed.object3D });
  register(world, CaptionSystem, 60);
  register(world, HintSystem, 61, { bed: room.bed.object3D }); // T-150: its icons stand on the bed
  register(world, PanelSystem, 62, { garden, room });
  breakOtherSystems(world);
  if (flags.dev) window.__roomsong = { world, engine, garden };
  // A7: every system hears the first garden:changed, and before Enter is usable. A restored garden is drawn when
  // its bed is placed and sounds from room:signature on, like any other (LLD §3.3 J).
  garden.load(saved ?? newGarden(clock.now(), settings.get()));
  // A8: only now the save handlers, with the caption of failed writes on an entity of its own.
  const saveFailed = world.createEntity();
  const failed = inSession(() => raise(saveFailed, SAVE_FAILED));
  const tabs = 'BroadcastChannel' in window ? new BroadcastChannel('roomsong') : null;
  const saver = new PersistenceSystem(store, failed.raise);
  keepSaved(garden, saver, window, saved?.settings ?? DEFAULT_SETTINGS, tabs);

  const sound: SoundState = { failed: true };
  followSession(world, engine, landing, sound);
  // The garden window (FR-SYS-07, LLD §11): no immersive-ar, or the `window` flag. The same world and systems,
  // outside XR (IWSDK's render loop runs without a session); a fixed camera, and the pointer as the pinch.
  const stage = (await shouldOpenWindow(flags.window, navigator.xr))
    ? new WindowStage(world.camera, room.bed.object3D!) // a transform entity always has one
    : null;
  if (stage !== null) hands.useSource(new PointerSource(world.renderer.domElement, stage, hands.candidates));
  landing.ready(
    stage !== null ? () => enterWindow(stage, engine, sound) : () => enterSession(world, engine, sound),
    stage !== null,
  );
}
