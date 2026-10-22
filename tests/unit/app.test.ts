// The wiring, src/app.ts (LLD §3.2, §3.3, §8; API_SPEC §1.10): the one way to register a system and its circuit
// breaker, on a fake world that registers as elics does; and the session's events and its "Sound unavailable"
// caption, on a fake session. What only a browser can show (a real session, the sound, the frames going on) is
// tests/e2e/14-boot-session.spec.ts.
import { readFileSync } from 'node:fs';

import { createSystem, Types } from '@iwsdk/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BREAKER_PAUSE_S,
  breakOtherSystems,
  followSession,
  inSession,
  keepSaved,
  register,
  restoreSettings,
} from '../../src/app.js';
import { bus, clock, DEFAULT_SETTINGS, log, settings } from '../../src/core/index.js';
import { TIME_LAPSE_DAY_MS } from '../../src/garden/config.js';
import { GardenSystem, stageFor } from '../../src/garden/index.js';
import { SAVE_DEBOUNCE_MS, STATE_KEY } from '../../src/persistence/config.js';
import { PersistenceSystem } from '../../src/persistence/index.js';
import { createStore } from '../../src/persistence/Store.js';

import { plant } from './garden/fixtures.js';
import { memoryBackend, savedGarden } from './persistence/fixtures.js';

import type { SystemHost } from '../../src/app.js';
import type { Settings } from '../../src/core/index.js';
import type { GardenState } from '../../src/garden/index.js';
import type { MockInstance } from 'vitest';

// src/app.ts imports the project file through the dev plugin's virtual module, which only Vite's plugin provides.
vi.mock('virtual:iwsdk-project', () => ({ default: {} }));

/** As much of a system as the fake world uses. */
interface FakeSystem {
  priority: number;
  isPaused: boolean;
  config: Record<string, { value: unknown }>;
  init(): void;
  update(delta: number, time: number): void;
}

/**
 * A world that registers and updates as elics does (node_modules/elics/lib/world.js): a `configData` entry goes
 * to `config.<key>.value` only when the schema has the key, then `init()` runs; the systems are kept in
 * ascending priority; `update` skips a stopped system and catches nothing.
 */
function fakeWorld() {
  const systems: FakeSystem[] = [];
  const world = {
    registerSystem(
      System: new (...args: never[]) => unknown,
      options: Parameters<Host['registerSystem']>[1],
    ) {
      const system = new System(world as never, {} as never, options.priority as never) as FakeSystem;
      for (const [key, value] of Object.entries(options.configData)) {
        if (key in system.config) (system.config[key] as { value: unknown }).value = value;
      }
      system.init();
      const at = systems.findIndex((each) => each.priority > system.priority);
      systems.splice(at === -1 ? systems.length : at, 0, system);
    },
    getSystem: (System: new (...args: never[]) => unknown) => systems.find((each) => each instanceof System),
    getSystems: () => systems,
    update(delta: number, time: number): void {
      for (const system of systems) if (!system.isPaused) system.update(delta, time);
    },
  };
  return world as typeof world & SystemHost;
}
type Host = SystemHost;

class Steady extends createSystem() {
  calls = 0;
  override update(): void {
    this.calls++;
  }
}
class Thrower extends createSystem() {
  calls = 0;
  failing = true;
  override update(): void {
    this.calls++;
    if (this.failing) throw new Error('planted');
  }
}
class Wants extends createSystem({}, { engine: { type: Types.Object, default: null } }) {
  got: unknown = 'init() has not run';
  override init(): void {
    this.got = this.config.engine.value;
  }
}

const FRAME_S = 0.01; // a second of frame time is exactly 100 frames
const WALL_START_MS = 1_790_000_000_000; // core's clock, at the size it has in the app

let errors: MockInstance<typeof console.error>;
let wallMs = WALL_START_MS;
const stops: (() => void)[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  wallMs = WALL_START_MS;
  clock.setSource(() => wallMs);
});
afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  clock.setSource(() => Date.now());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('one way in (API_SPEC §1.10 rule 2)', () => {
  it('iwsdk.config.json writes xr.offer "none" out: left out, IWSDK offers the session itself', () => {
    const config = JSON.parse(readFileSync(new URL('../../iwsdk.config.json', import.meta.url), 'utf8')) as {
      world: { xr: { offer?: string } };
    };
    expect(config.world.xr.offer).toBe('none');
  });
});

describe('the systems start() registers (API_SPEC §1.10, the priorities table)', () => {
  it('each at its number, in ascending order, and the bed renderer on the bed of the room system', () => {
    // Read from the source: `start()` needs a real World. `register` itself throws for a number out of order,
    // but not for a wrong one: the room at 30 would run, and hear the bus, after the hands that read its bed.
    const source = readFileSync(new URL('../../src/app.ts', import.meta.url), 'utf8');
    const lines = Array.from(source.matchAll(/register\(world, (\w+), (-?\d+)(?:, (\{[^}]*\}))?\)/g), (m) =>
      m.slice(1, 4).filter((part) => part !== undefined),
    );
    expect(lines).toEqual([
      ['PerfSystem', '-100', '{ guard, engine }'],
      ['RoomSystem', '10'],
      ['HandSystem', '20'],
      ['GazeDwellSystem', '25', '{ room, guard }'], // T-160
      ['BeatRingSystem', '26', '{ guard, engine, bed: room.bed.object3D }'], // T-160
      ['OnboardingSystem', '35'], // T-150
      ['GardenAudioSystem', '40', '{ engine }'], // T-128d
      ['SeedSystem', '49', '{ guard }'], // T-127
      ['BedRenderSystem', '50', '{ guard, engine, bed: room.bed.object3D }'],
      ['HaloSystem', '52', '{ guard, engine, bed: room.bed.object3D }'], // T-148
      ['VineSystem', '53', '{ guard, bed: room.bed.object3D }'], // T-149
      ['TuningRippleSystem', '55', '{ guard, engine, bed: room.bed.object3D }'], // T-142, T-142b
      ['CaptionSystem', '60'],
      ['HintSystem', '61', '{ bed: room.bed.object3D }'], // T-150
      ['PanelSystem', '62', '{ garden, room }'], // T-151, with the app's own garden and room (T-128d)
    ]);
    expect(source.indexOf('breakOtherSystems(world);')).toBeGreaterThan(
      source.lastIndexOf('register(world,'),
    );
  });

  it('the garden: made before the first system, loaded after the last and before the session is followed (A5, A7)', () => {
    // GardenSystem subscribes in its constructor, so its handlers run before every system's (LLD §3.2); load()
    // emits the first garden:changed, which every system must hear, and Enter must not be usable before it.
    const source = readFileSync(new URL('../../src/app.ts', import.meta.url), 'utf8');
    const at = (text: string): number => {
      const index = source.indexOf(text);
      expect(index, text).toBeGreaterThan(-1);
      return index;
    };
    expect(at('const garden = new GardenSystem();')).toBeLessThan(at('register(world,'));
    expect(at('garden.load(saved ?? newGarden(clock.now(), settings.get()));')).toBeGreaterThan(
      at('breakOtherSystems(world);'),
    );
    expect(at('garden.load(')).toBeLessThan(at('followSession(world,'));
    expect(at('garden.load(')).toBeLessThan(at('landing.ready('));
    // A3: the store loads beside World.create, not after it. A8: the save handlers come after the load, so the
    // garden just loaded is not written back, and before Enter is usable.
    expect(source).toMatch(/Promise\.all\(\[\s*World\.create\(.*\),\s*opening,\s*opening\.then\(/);
    expect(
      at('keepSaved(garden, saver, window, saved?.settings ?? DEFAULT_SETTINGS, tabs);'),
    ).toBeGreaterThan(at('garden.load('));
    expect(at('keepSaved(')).toBeLessThan(at('landing.ready('));
    expect(at('window.__roomsong = { world, engine, garden };')).toBeGreaterThan(0); // rule 14, dev only
  });
});

describe('register (LLD §3.2)', () => {
  it('returns the instance, registered at its priority, with its configData there when init() runs', () => {
    const world = fakeWorld();
    const engine = { name: 'the engine' };
    const system = register(world, Wants, 40, { engine });
    expect(system).toBeInstanceOf(Wants);
    expect(system.priority).toBe(40);
    expect(system.got).toBe(engine);
    expect(world.getSystems()).toEqual([system]);
  });

  it("throws for a priority lower than the previous call's, and registers nothing then", () => {
    const world = fakeWorld();
    register(world, Steady, 20);
    expect(() => register(world, Thrower, 10)).toThrow(
      'Thrower: priority 10 is registered after priority 20',
    );
    expect(world.getSystems()).toHaveLength(1);
    // The same number again is in order, and so is a higher one. The record is the world's own: another starts over.
    register(world, Thrower, 20);
    register(world, Wants, 60);
    expect(register(fakeWorld(), Steady, -100).priority).toBe(-100);
  });

  it('throws for a configData key the schema lacks: elics would drop it in silence', () => {
    const world = fakeWorld();
    expect(() => register(world, Wants, 40, { engine: 1, guard: 2 })).toThrow(
      'Wants: its schema has no configData key "guard"',
    );
    expect(() => register(world, Steady, 40, { engine: 1 })).toThrow('no configData key "engine"');
    expect(world.getSystems()).toEqual([]);
  });
});

describe('the circuit breaker (LLD §8; API_SPEC §1.10 rule 12)', () => {
  it('a throw in one update is caught and logged once; that system is skipped, the others never are', () => {
    const world = fakeWorld();
    const thrower = register(world, Thrower, 10);
    const steady = register(world, Steady, 20);

    expect(() => world.update(FRAME_S, 5)).not.toThrow();
    expect([thrower.calls, steady.calls]).toEqual([1, 1]);
    expect(errors).toHaveBeenCalledTimes(1);
    expect(errors.mock.calls[0]?.[0]).toBe(`[app] Thrower.update threw: skipped for ${BREAKER_PAUSE_S} s`);
    expect(String(errors.mock.calls[0]?.[1])).toBe('Error: planted');

    // The 99 frames inside the pause: skipped, with no log and no throw.
    for (let frame = 1; frame < 100; frame++) world.update(FRAME_S, 5 + frame * FRAME_S);
    expect([thrower.calls, steady.calls]).toEqual([1, 100]);
    expect(errors).toHaveBeenCalledTimes(1);
  });

  it('it runs again on the first frame a second of frame time later, with no page timer, and then runs on', () => {
    const world = fakeWorld();
    const thrower = register(world, Thrower, 10);
    world.update(FRAME_S, 5);
    thrower.failing = false;

    // A browser that lets timers sleep while a session is up: no timer ever fires, and the system is still back.
    world.update(FRAME_S, 5 + BREAKER_PAUSE_S - 0.001);
    expect(thrower.calls).toBe(1);
    world.update(FRAME_S, 5 + BREAKER_PAUSE_S);
    world.update(FRAME_S, 5 + BREAKER_PAUSE_S + FRAME_S);
    expect(thrower.calls).toBe(3);
    expect(errors).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a system that throws every time costs one log and one frame of its own a second, not the frames', () => {
    const world = fakeWorld();
    const thrower = register(world, Thrower, 10);
    const steady = register(world, Steady, 20);
    for (let frame = 0; frame < 300; frame++) world.update(FRAME_S, frame / 100);
    expect(steady.calls).toBe(300);
    expect(thrower.calls).toBe(3); // at 0 s, 1 s and 2 s: 297 of its 300 frames are skipped
    expect(errors).toHaveBeenCalledTimes(3);
  });

  it("leaves the system's own pause alone: one that was stopped on purpose stays stopped", () => {
    const world = fakeWorld();
    const thrower = register(world, Thrower, 10);
    world.update(FRAME_S, 5);
    expect(thrower.isPaused).toBe(false); // the breaker does not use stop()
    thrower.isPaused = true; // a developer pauses it with the debug tools
    vi.advanceTimersByTime(10_000);
    world.update(FRAME_S, 5 + 10 * BREAKER_PAUSE_S);
    expect(thrower.isPaused).toBe(true);
    expect(thrower.calls).toBe(1);
  });

  it('passes delta and time through, and keeps `this`', () => {
    const world = fakeWorld();
    const seen: unknown[] = [];
    class Reader extends createSystem() {
      override update(delta: number, time: number): void {
        seen.push(this, delta, time);
      }
    }
    const reader = register(world, Reader, 0);
    world.update(0.014, 12.5);
    expect(seen).toEqual([reader, 0.014, 12.5]);
  });
});

describe("breakOtherSystems: the systems that were not registered through register (IWSDK's own)", () => {
  it('gives each the same breaker, and none a second one', () => {
    const world = fakeWorld();
    world.registerSystem(Thrower, { priority: -4, configData: {} }); // as World.create registers IWSDK's own
    const steady = register(world, Steady, 20);
    /** The breaker is an `update` of the instance's own, in front of its class's. */
    const breaker = (): unknown => Object.getOwnPropertyDescriptor(steady, 'update')?.value;
    const first = breaker();
    expect(first).toBeTypeOf('function');
    expect(() => world.update(FRAME_S, 1)).toThrow('planted'); // elics catches nothing

    breakOtherSystems(world);
    expect(() => world.update(FRAME_S, 1)).not.toThrow();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(errors.mock.calls[0]?.[0]).toMatch(/^\[app\] Thrower\.update threw/);
    expect(breaker()).toBe(first);
    expect(steady.calls).toBe(1);

    // Called again (a later step registers more systems before it): still one breaker each, one log per throw.
    breakOtherSystems(world);
    world.update(FRAME_S, 1 + BREAKER_PAUSE_S);
    expect(errors).toHaveBeenCalledTimes(2);
  });
});

type Visibility = 'visible' | 'visible-blurred' | 'hidden';

/** As much of an XRSession as the wiring reads. */
class FakeSession {
  readonly enabledFeatures = ['hand-tracking', 'anchors'];
  private readonly handlers: (() => void)[] = [];
  constructor(public visibilityState: Visibility) {}
  addEventListener(_type: 'visibilitychange', handler: () => void): void {
    this.handlers.push(handler);
  }
  /** The browser changes the session's visibility and fires its event (it fires for blurred to visible too). */
  show(state: Visibility): void {
    this.visibilityState = state;
    this.handlers.forEach((handler) => handler());
  }
}

/**
 * `followSession` on fakes: Three's XR manager (its two events and the session it holds), the entity the caption
 * is raised on, an audio clock moved by hand, and the real bus.
 */
function sessionRig(soundFailed: boolean) {
  const handlers: Record<string, (() => void)[]> = {};
  const xr = {
    session: null as FakeSession | null,
    addEventListener: (type: string, handler: () => void) => void (handlers[type] ??= []).push(handler),
    getSession: () => xr.session,
  };
  /** What happened to the caption's entity, in order, and the Caption it carries now. */
  const ops: string[] = [];
  let caption: { key: string; expiresAt: number } | null = null;
  const entity = {
    hasComponent: () => caption !== null,
    addComponent(_component: unknown, values: { key: string; expiresAt: number }) {
      ops.push('add');
      caption = values;
    },
    removeComponent() {
      ops.push('remove');
      caption = null;
    },
  };
  const audio = { nowS: 0 };
  const landing = { ready: vi.fn(), granted: vi.fn(), failed: vi.fn() };
  const sound = { failed: soundFailed };
  const heard: string[] = [];
  for (const type of ['xr:sessionStart', 'xr:sessionEnd', 'xr:visibility'] as const)
    stops.push(bus.on(type, ({ visible }) => heard.push(`${type} ${visible}`)));
  stops.push(
    followSession(
      { renderer: { xr }, createEntity: () => entity } as never,
      { clock: { now: () => audio.nowS } } as never,
      landing,
      sound,
    ),
  );
  return {
    ops,
    audio,
    landing,
    sound,
    heard,
    caption: () => caption,
    /** Three announces a session. */
    begin(state: Visibility = 'visible'): FakeSession {
      xr.session = new FakeSession(state);
      handlers.sessionstart?.forEach((handler) => handler());
      return xr.session;
    },
    end: () => handlers.sessionend?.forEach((handler) => handler()),
  };
}
const AUDIO_START_GRACE_MS = 3000; // LLD §3.3 B, pinned here on purpose
const NO_SOUND = 'E_AUDIO_CONTEXT';

describe('the session on the bus (API_SPEC §1.10 rule 3)', () => {
  it('one start and one end for a session; an end with no start is not passed on, nor a second end', () => {
    const rig = sessionRig(false);
    rig.end(); // Three can report the end of a session whose start it never announced
    expect(rig.heard).toEqual([]);
    rig.begin();
    expect(rig.heard).toEqual(['xr:sessionStart true']);
    expect(rig.landing.granted).toHaveBeenCalledWith(['hand-tracking', 'anchors']);
    rig.end();
    rig.end();
    expect(rig.heard).toEqual(['xr:sessionStart true', 'xr:sessionEnd false']);
  });

  it('hidden and shown: xr:visibility on a change only, and a blurred session counts as seen', () => {
    const rig = sessionRig(false);
    const session = rig.begin();
    session.show('hidden');
    session.show('visible-blurred');
    session.show('visible');
    session.show('visible-blurred');
    expect(rig.heard).toEqual(['xr:sessionStart true', 'xr:visibility false', 'xr:visibility true']);
  });

  it("what was seen is the session's own: after one that ended hidden, the next starts seen", () => {
    const rig = sessionRig(false);
    const first = rig.begin();
    first.show('hidden');
    rig.end();
    first.show('visible'); // a late event of the session that is over: nothing
    const second = rig.begin();
    second.show('hidden');
    second.show('visible');
    expect(rig.heard).toEqual([
      'xr:sessionStart true',
      'xr:visibility false',
      'xr:sessionEnd false',
      'xr:sessionStart true',
      'xr:visibility false',
      'xr:visibility true',
    ]);
  });

  it('a session that starts hidden says so at once, and its return is told', () => {
    const rig = sessionRig(false);
    const session = rig.begin('hidden'); // the headset came off while the permission prompt was up
    expect(rig.heard).toEqual(['xr:sessionStart true', 'xr:visibility false']);
    session.show('visible');
    expect(rig.heard).toEqual(['xr:sessionStart true', 'xr:visibility false', 'xr:visibility true']);
  });
});

describe('"Sound unavailable" (API_SPEC §1.10 rule 2; LLD §3.3 B)', () => {
  it('no click before the session, or init() rejected: raised at the start, for 5 s, and once', () => {
    const rig = sessionRig(true);
    rig.begin();
    expect(rig.caption()).toEqual({ key: NO_SOUND, expiresAt: WALL_START_MS + 5000 });
    vi.advanceTimersByTime(2 * AUDIO_START_GRACE_MS);
    expect(rig.ops).toEqual(['add']);
  });

  it('an audio clock that has not started by the end of the grace: raised then, for 5 s, and not before', () => {
    const rig = sessionRig(false);
    rig.begin();
    wallMs += AUDIO_START_GRACE_MS;
    vi.advanceTimersByTime(AUDIO_START_GRACE_MS - 1);
    expect(rig.caption()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(rig.caption()).toEqual({ key: NO_SOUND, expiresAt: wallMs + 5000 });
  });

  it('a later session whose context does not resume: the clock stands where the last one left it', () => {
    const rig = sessionRig(false);
    rig.begin();
    rig.audio.nowS = 1.53; // the first session had sound
    vi.advanceTimersByTime(AUDIO_START_GRACE_MS);
    expect(rig.caption()).toBeNull();
    rig.end();

    rig.begin(); // Enter again; the browser leaves the context suspended, and nothing rejects
    vi.advanceTimersByTime(AUDIO_START_GRACE_MS);
    expect(rig.caption()?.key).toBe(NO_SOUND);
    rig.end();

    rig.begin(); // and a third, in which it does resume
    rig.audio.nowS = 1.9;
    vi.advanceTimersByTime(AUDIO_START_GRACE_MS);
    expect(rig.caption()).toBeNull();
  });

  it('a session that ends inside the grace takes its timer with it', () => {
    const rig = sessionRig(false);
    rig.begin();
    rig.end();
    vi.advanceTimersByTime(10 * AUDIO_START_GRACE_MS);
    expect(rig.ops).toEqual([]);
  });

  it('is taken back when its session ends, so it does not show in the next one', () => {
    const rig = sessionRig(true);
    rig.begin();
    rig.end(); // left inside the caption's 5 s
    expect(rig.caption()).toBeNull();
    expect(rig.ops).toEqual(['add', 'remove']);

    rig.sound.failed = false; // Enter again, with sound this time
    rig.begin();
    rig.audio.nowS = 0.4;
    vi.advanceTimersByTime(AUDIO_START_GRACE_MS);
    expect(rig.ops).toEqual(['add', 'remove']);
  });

  it("the garden window's own xr:* events (no XR session) get the same check, raised and taken back (T-114b)", () => {
    const rig = sessionRig(true);
    bus.emit('xr:sessionStart', { visible: true }); // WindowStage.enter()
    expect(rig.caption()?.key).toBe(NO_SOUND);
    bus.emit('xr:sessionEnd', { visible: false }); // its exit()
    expect(rig.ops).toEqual(['add', 'remove']);

    rig.sound.failed = false; // Enter again: the context starts, but its clock never moves
    bus.emit('xr:sessionStart', { visible: true });
    vi.advanceTimersByTime(AUDIO_START_GRACE_MS);
    expect(rig.caption()?.key).toBe(NO_SOUND);
    expect(rig.landing.granted).not.toHaveBeenCalled();
  });

  it('a raise on an entity that still carries one takes it back first, or the second would not be seen', () => {
    // Reachable only if a start is announced twice with no end between: the session's end takes the caption back.
    const rig = sessionRig(true);
    rig.begin();
    wallMs += 2000;
    rig.begin();
    expect(rig.ops).toEqual(['add', 'remove', 'add']);
    expect(rig.caption()).toEqual({ key: NO_SOUND, expiresAt: wallMs + 5000 });
  });

  it('a second xr:sessionStart with no end between is logged as a warning (dev); one after an end is not', () => {
    const warns = vi.spyOn(log, 'warn').mockImplementation(() => {});
    sessionRig(false);
    bus.emit('xr:sessionStart', { visible: true });
    bus.emit('xr:sessionEnd', { visible: false });
    bus.emit('xr:sessionStart', { visible: true });
    expect(warns).not.toHaveBeenCalled();
    bus.emit('xr:sessionStart', { visible: true }); // e.g. the window opened while a session ran
    expect(warns).toHaveBeenCalledOnce();
  });
});

/**
 * keepSaved on a garden whose state the test sets, a saver that records, a page that is shown, hidden or left,
 * and a channel to the other tabs. `stored`: the settings on disk (the defaults when nothing loaded).
 */
function saveRig(
  state: GardenState | null = savedGarden({ settings: settings.get() }),
  stored: Settings = state?.settings ?? DEFAULT_SETTINGS,
) {
  const garden = { saved: state };
  const saved: GardenState[] = [];
  const calls: string[] = [];
  const saver = {
    save: (s: GardenState) => void saved.push(s),
    flush: () => {
      calls.push('flush');
      return Promise.resolve();
    },
    flushNow: () => void calls.push('flushNow'),
  };
  const on = new Map<string, () => void>();
  const listeners = {
    addEventListener: (type: string, handler: () => void) => void on.set(type, handler),
    removeEventListener: (type: string) => void on.delete(type),
  };
  const page = { ...listeners, document: { ...listeners, visibilityState: 'visible' } };
  const tabs = { postMessage: vi.fn(), addEventListener: listeners.addEventListener };
  const stop = keepSaved(garden, saver, page as never, stored, tabs as never);
  stops.push(stop);
  return {
    garden,
    saved,
    calls,
    tabs,
    stop,
    show(state: DocumentVisibilityState) {
      page.document.visibilityState = state;
      on.get('visibilitychange')?.();
    },
    leave: () => on.get('pagehide')?.(),
    /** Another tab of the garden was opened. */
    opened: () => on.get('message')?.(),
  };
}

describe('saving (LLD §3.3 G; API_SPEC §1.10 rule 9)', () => {
  afterEach(() => settings.set(DEFAULT_SETTINGS));

  it("garden:changed saves garden.saved, not the event's payload, with the live settings in it", () => {
    settings.set({ tempo: 96 });
    const rig = saveRig(savedGarden({ settings: { ...DEFAULT_SETTINGS, tempo: 96 } }));
    expect(rig.saved).toEqual([]); // the garden just loaded is not written back
    const next = savedGarden({ visits: 4 });
    rig.garden.saved = next;
    bus.emit('garden:changed', {
      state: savedGarden({ visits: 99 }),
      diff: { added: [], removed: [], changed: [] },
    });
    expect(rig.saved).toEqual([{ ...next, settings: settings.get() }]);
    expect(rig.saved[0]?.settings.tempo).toBe(96);
  });

  it('settings:changed saves the last state seen with the new settings; GardenState.settings is never left behind', () => {
    const rig = saveRig(savedGarden({ settings: DEFAULT_SETTINGS }));
    settings.set({ oneHand: true });
    expect(rig.saved).toEqual([{ ...savedGarden({ settings: DEFAULT_SETTINGS }), settings: settings.get() }]);
    expect(rig.saved[0]?.settings.oneHand).toBe(true);
  });

  it('live settings that differ from the ones on disk are saved at once: also on a first launch, with nothing on disk', () => {
    settings.set({ highContrast: true });
    expect(saveRig(savedGarden({ settings: DEFAULT_SETTINGS })).saved).toHaveLength(1);
    expect(saveRig(savedGarden({ settings: settings.get() })).saved).toHaveLength(0);
    // Nothing loaded: the new garden was made with the live settings, and the disk has none of them.
    expect(saveRig(savedGarden({ settings: settings.get() }), DEFAULT_SETTINGS).saved).toHaveLength(1);
    settings.set({ highContrast: false });
    expect(saveRig(savedGarden({ settings: settings.get() }), DEFAULT_SETTINGS).saved).toHaveLength(0);
    expect(saveRig(null, DEFAULT_SETTINGS).saved).toHaveLength(0); // before load(): nothing to save
  });

  it('flushes on a hidden session and at session end; a hidden or departing page also writes at once, first', () => {
    const rig = saveRig();
    bus.emit('xr:visibility', { visible: true });
    rig.show('visible');
    expect(rig.calls).toEqual([]);
    bus.emit('xr:visibility', { visible: false });
    bus.emit('xr:sessionEnd', { visible: false });
    expect(rig.calls).toEqual(['flush', 'flush']);
    rig.show('hidden');
    rig.leave();
    expect(rig.calls).toEqual(['flush', 'flush', 'flushNow', 'flush', 'flushNow', 'flush']);
    rig.stop();
    bus.emit('xr:sessionEnd', { visible: false });
    rig.show('hidden');
    rig.leave();
    settings.set({ tempo: 100 });
    expect(rig.calls).toHaveLength(6);
    expect(rig.saved).toEqual([]);
  });

  it('says "opened" to the other tabs, and stops saving once a newer tab says it', () => {
    const rig = saveRig();
    expect(rig.tabs.postMessage).toHaveBeenCalledExactlyOnceWith('opened');
    vi.spyOn(log, 'warn').mockImplementation(() => {});
    rig.opened();
    settings.set({ tempo: 100 });
    bus.emit('garden:changed', { state: savedGarden(), diff: { added: [], removed: [], changed: [] } });
    rig.leave();
    expect(rig.saved).toEqual([]);
    expect(rig.calls).toEqual([]);
  });

  it('T-174: the demo is never written: the save stays byte for byte, and a setting changed inside it writes the real garden', async () => {
    const subscribed = vi.spyOn(bus, 'on'); // GardenSystem has no way off the bus: the test takes it off
    try {
      const planted = wallMs - 1000;
      const backend = memoryBackend();
      const writes = vi.spyOn(backend, 'set');
      const garden = new GardenSystem();
      garden.load(
        savedGarden({ plants: [plant('p1', 1, 2, { plantedAt: planted })], settings: settings.get() }),
      );
      const page = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
      const saver = new PersistenceSystem(createStore([backend]));
      keepSaved(
        garden,
        saver,
        { ...page, document: { ...page, visibilityState: 'visible' } },
        settings.get(),
        null,
      );
      bus.emit('room:features', { features: { level: 4 }, surfaces: {} }); // the session's visit, saved
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
      const before = JSON.stringify(backend.data.get(STATE_KEY));
      expect(writes).toHaveBeenCalledTimes(1);

      const real = garden.saved;

      garden.setTimeLapse(true);
      await vi.advanceTimersByTimeAsync(8 * TIME_LAPSE_DAY_MS);
      expect(stageFor(garden.state!.lastVisitAt - planted)).toBe(3); // the demo grew
      bus.emit('xr:sessionEnd', { visible: false }); // a flush
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
      expect(writes).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(backend.data.get(STATE_KEY))).toBe(before);
      // A setting changed inside the demo: one write, of the real garden with the new settings, never the demo's.
      settings.set({ tempo: 96 });
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
      expect(writes).toHaveBeenCalledTimes(2);
      expect(backend.data.get(STATE_KEY)).toEqual({ ...real, settings: { ...real!.settings, tempo: 96 } });
      const withTempo = JSON.stringify(backend.data.get(STATE_KEY));
      garden.newGarden(); // New garden inside the demo: the demo's garden goes, the real one does not
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
      expect(garden.state!.plants).toEqual([]);
      garden.setTimeLapse(false);
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
      expect(writes).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(backend.data.get(STATE_KEY))).toBe(withTempo);
      expect(garden.state).toBe(real); // the real garden is back
      expect(stageFor(garden.state!.lastVisitAt - planted)).toBe(0);
    } finally {
      for (const off of subscribed.mock.results) (off.value as () => void)();
    }
  });
});

describe('"Saving unavailable" where it can be seen (LLD §3.3 G)', () => {
  it('raised at once in a session; raised outside one, at the next xr:sessionStart, once', () => {
    const raiseNow = vi.fn();
    const caption = inSession(raiseNow);
    stops.push(caption.stop);
    caption.raise(); // on the landing page
    expect(raiseNow).not.toHaveBeenCalled();
    bus.emit('xr:sessionStart', { visible: true });
    expect(raiseNow).toHaveBeenCalledOnce();
    caption.raise();
    expect(raiseNow).toHaveBeenCalledTimes(2);
    bus.emit('xr:sessionEnd', { visible: false });
    bus.emit('xr:sessionStart', { visible: true });
    expect(raiseNow).toHaveBeenCalledTimes(2);
  });
});

describe('the saved settings go live under what the page changed (LLD §3.3 A4)', () => {
  afterEach(() => settings.set(DEFAULT_SETTINGS));

  it('a toggle changed on the page while the save loads is kept; every other setting is the saved one', () => {
    settings.set({ oneHand: true }); // ticked on the landing page during the load
    restoreSettings({ ...DEFAULT_SETTINGS, oneHand: false, tempo: 96, volume: 0.5 });
    expect(settings.get()).toEqual({ ...DEFAULT_SETTINGS, oneHand: true, tempo: 96, volume: 0.5 });
  });
});
