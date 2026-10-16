// The wiring (LLD §3, API_SPEC §1.10): everything that needs the SDK. src/index.ts, the boot, loads this file
// with `import()` once the landing page is on screen. Where a spec says "src/index.ts wires, saves or emits",
// the code is here. It makes the one of each the page has (world, audio engine, flash guard) and registers the
// systems; nothing else makes one.
import { World, XRInputVisualAdapter } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';

import { createAudioEngine, GardenAudioSystem, type AudioEngine } from './audio/index.js';
import { Caption } from './core/components.js';
import { bus, clock, flags, log, settings, type StringKey } from './core/index.js';
import { GardenSystem, newGarden } from './garden/index.js';
import { HandSystem } from './hands/index.js';
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
import { CaptionSystem, PanelSystem } from './ui/index.js';

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

/** What the Enter click tells the session's start about the sound (LLD §3.3 B). */
interface SoundState {
  /** True until an Enter click has called `engine.init()`, and again when that call rejected. */
  failed: boolean;
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
  sound.failed = false;
  engine.init().then(
    () => log.info('app', 'audio started'),
    (error: unknown) => {
      sound.failed = true;
      log.error('app', 'E_AUDIO_CONTEXT', error);
    },
  );
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
 * unavailable" for a session that has no sound (rule 2; the three ways are in LLD §3.3 B). Exported for its
 * unit test, which gives it a fake session.
 */
export function followSession(world: World, engine: AudioEngine, landing: Landing, sound: SoundState): void {
  const xr = world.renderer.xr;
  // On an entity of its own: a Caption added to an entity that still has one does not qualify again.
  const caption = world.createEntity();
  const raiseNoSound = (): void => {
    if (caption.hasComponent(Caption)) caption.removeComponent(Caption);
    caption.addComponent(Caption, { key: NO_SOUND, expiresAt: clock.now() + WIRING_CAPTION_MS });
  };
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
  xr.addEventListener('sessionend', () => {
    if (!started) return;
    started = false;
    clearTimeout(grace);
    // Taken back with its session: one raised in a session without sound must not show in the next one.
    if (caption.hasComponent(Caption)) caption.removeComponent(Caption);
    bus.emit('xr:sessionEnd', { visible: false });
  });
}

/**
 * Makes the world and its systems and gives the landing page its Enter (LLD §3.3 A3 to A9). It rejects when a
 * step throws (no WebGL, the scene file missing, a fault in the wiring): the boot then tells the page.
 */
export async function start(landing: Landing): Promise<void> {
  // `projectOptions` is iwsdk.config.json: an AR session with hands required, and `xr.offer: "none"`, so the
  // page's Enter click is the only way in (API_SPEC §1.10 rule 2). IWSDK's default would also offer the session
  // to the browser, and a session started from that offer never passes through the click that starts the sound.
  const world = await World.create(
    document.getElementById('scene-container') as HTMLDivElement,
    projectOptions,
  );
  const engine = createAudioEngine();
  const guard = new FlashGuard();
  // Before any system: it subscribes to the bus in its constructor, so its handlers run first (LLD §3.2).
  const garden = new GardenSystem();
  const xr = world.renderer.xr;
  // NFR-PERF-09. Set once: Three.js keeps the value and applies it at each session start. Its own default is 1,
  // the strongest.
  xr.setFoveation(FOVEATION_MEDIUM);

  // In ascending priority, with the numbers of API_SPEC §1.10, one line each. A system subscribes to the bus in
  // `init()`, so every system is registered before the first `xr:sessionStart` can be emitted.
  register(world, PerfSystem, -100, { guard, engine });
  // The room before the hands: it moves the bed before hands reads its pose, in the frame and on the bus.
  const room = register(world, RoomSystem, 10);
  register(world, HandSystem, 20);
  register(world, GardenAudioSystem, 40, { engine });
  register(world, SeedSystem, 49, { guard });
  // Everything drawn on the bed is a child of the bed entity's Object3D (API_SPEC §1.10 rule 5).
  register(world, BedRenderSystem, 50, { guard, engine, bed: room.bed.object3D });
  register(world, HaloSystem, 52, { guard, engine, bed: room.bed.object3D }); // Listen mode (T-148)
  register(world, TuningRippleSystem, 55, { guard, bed: room.bed.object3D });
  register(world, CaptionSystem, 60);
  register(world, PanelSystem, 62, { garden, room });
  breakOtherSystems(world);
  if (flags.dev) window.__roomsong = { world, engine, garden };
  // A7: every system hears the first garden:changed, and before Enter is usable (the saved garden joins in T-128e).
  garden.load(newGarden(clock.now(), settings.get()));

  const sound: SoundState = { failed: true };
  followSession(world, engine, landing, sound);
  landing.ready(() => enterSession(world, engine, sound));
}
