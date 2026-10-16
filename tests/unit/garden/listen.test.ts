// Listen mode's state in GardenSystem (T-148; API_SPEC §1.10 "Listen mode", §1.4 the orb's press, §2 listen:*):
// entered by palms out or a press on the orb, left by the wake, by any pinch, by a pause, by the session's end,
// or by itself after 10 minutes (TC-E2E-05's timer part, on fake timers). The real bus, a fake clock.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as core from '../../../src/core/index.js';
import { LISTEN_MAX_MS } from '../../../src/garden/config.js';
import { GardenSystem } from '../../../src/garden/index.js';

import { garden, plant, seed } from './fixtures.js';

import type { EventMap, Hand } from '../../../src/core/index.js';
import type { MockInstance } from 'vitest';

type Release = EventMap['gesture:release'];
type Target = NonNullable<Release['target']>;
const ORB: Target = { kind: 'orb', id: 'listen' };
const T0 = Date.UTC(2026, 9, 15, 10);

let subscribed: MockInstance<typeof core.bus.on>;
beforeEach(() => {
  subscribed = vi.spyOn(core.bus, 'on');
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  // GardenSystem subscribes for the life of a page: every handler of the test comes off the bus again.
  for (const subscription of subscribed.mock.results) (subscription.value as () => void)();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/**
 * A garden with one plant, `a`, and what it said about Listen, the seeds and its plants. 'visited' (the default):
 * loaded and in a session with its visit applied; 'loaded': loaded, the room not found yet; 'none': not loaded.
 */
function setup(stage: 'none' | 'loaded' | 'visited' = 'visited') {
  const { bus } = core;
  const system = new GardenSystem(
    core.createClock(() => T0),
    core.flags,
  );
  const heard: string[] = [];
  bus.on('listen:enter', () => heard.push('enter'));
  bus.on('listen:exit', ({ timedOut }) => heard.push(timedOut ? 'exit timedOut' : 'exit'));
  bus.on('garden:seedOut', () => heard.push('seedOut'));
  if (stage !== 'none') {
    const plants = [plant('a', 2, 0)];
    system.load(
      garden(plants, [seed('s1'), seed('s2')], { lastSeedDate: '2026-10-15', lastVisitAt: T0 - 1000 }),
    );
  }
  bus.on('garden:changed', () => heard.push('changed'));
  bus.on('garden:removed', () => heard.push('removed'));
  const features = (): void => bus.emit('room:features', { features: { level: 4 }, surfaces: {} });
  if (stage === 'visited') {
    features();
    heard.length = 0; // the visit's own garden:changed
  }
  const release = (
    hand: Hand,
    gesture: Release['gesture'],
    target: Target | null,
    zone: Release['zone'] = 'inner',
    dy: number | null = null,
  ): void =>
    bus.emit('gesture:release', {
      type: 'gesture:release',
      hand,
      gesture,
      target,
      pos: { x: 0, y: 0, z: 0 },
      zone,
      cell: null,
      dy,
    });
  return {
    heard,
    features,
    palmsOut: () => bus.emit('gesture:palmsOut', { type: 'gesture:palmsOut' }),
    wake: () => bus.emit('gesture:wake', { type: 'gesture:wake' }),
    pinch: (hand: Hand, target: Target | null) =>
      bus.emit('gesture:pinchStart', { type: 'gesture:pinchStart', hand, target, pos: { x: 0, y: 0, z: 0 } }),
    release,
    /** A whole press of the orb: the pinch starts on it and is let go over it. */
    pressOrb: (hand: Hand) => {
      bus.emit('gesture:pinchStart', {
        type: 'gesture:pinchStart',
        hand,
        target: ORB,
        pos: { x: 0, y: 0, z: 0 },
      });
      release(hand, 'press', ORB);
    },
    palmUp: (hand: Hand) => bus.emit('gesture:palmUp', { type: 'gesture:palmUp', hand }),
    lost: (hand: Hand) => bus.emit('gesture:trackingLost', { type: 'gesture:trackingLost', hand }),
  };
}

describe('GardenSystem: Listen mode (T-148, FR-HND-06/07)', () => {
  it('palms out enters once; the wake leaves once, as a wake', () => {
    const s = setup();
    s.palmsOut();
    s.palmsOut();
    expect(s.heard).toEqual(['enter']);
    s.wake();
    s.wake();
    expect(s.heard).toEqual(['enter', 'exit']);
  });

  it('a press on the orb enters; any pinch leaves, and the release of that pinch on the orb does not enter again', () => {
    const s = setup();
    s.pressOrb('right');
    expect(s.heard).toEqual(['enter']);
    s.pressOrb('right'); // the orb toggles: its pinch is the wake, its release is swallowed
    expect(s.heard).toEqual(['enter', 'exit']);
    s.pressOrb('right'); // a press after that is an ordinary one
    expect(s.heard).toEqual(['enter', 'exit', 'enter']);
    s.pinch('left', null); // a pinch on nothing wakes too
    s.release('left', 'none', null);
    expect(s.heard).toEqual(['enter', 'exit', 'enter', 'exit']);
  });

  it('a press moved off the orb before its release enters nothing', () => {
    const s = setup();
    s.pinch('right', ORB);
    s.release('right', 'press', null);
    expect(s.heard).toEqual([]);
  });

  it('the waking hand lost before its release: its next press on the orb enters again', () => {
    const s = setup();
    s.palmsOut();
    s.pinch('right', ORB);
    s.lost('right'); // the grace ran out: no release comes for that pinch
    s.pressOrb('right');
    expect(s.heard).toEqual(['enter', 'exit', 'enter']);
  });

  it('ends by itself after exactly 10 minutes, as a timed-out exit; an exit before that cancels it', () => {
    expect(LISTEN_MAX_MS).toBe(600_000);
    const s = setup();
    s.palmsOut();
    vi.advanceTimersByTime(LISTEN_MAX_MS - 1);
    expect(s.heard).toEqual(['enter']);
    vi.advanceTimersByTime(1);
    expect(s.heard).toEqual(['enter', 'exit timedOut']);
    s.palmsOut();
    vi.advanceTimersByTime(LISTEN_MAX_MS / 2);
    s.wake();
    // A new Listen right after: the first one's 10 minutes do not end it; its own do.
    s.palmsOut();
    vi.advanceTimersByTime(LISTEN_MAX_MS - 1);
    expect(s.heard).toEqual(['enter', 'exit timedOut', 'enter', 'exit', 'enter']);
    vi.advanceTimersByTime(1);
    expect(s.heard).toEqual(['enter', 'exit timedOut', 'enter', 'exit', 'enter', 'exit timedOut']);
  });

  it('a pause and the end of the session leave Listen; the return from a pause does not enter it', () => {
    const s = setup();
    s.palmsOut();
    core.bus.emit('xr:visibility', { visible: false });
    core.bus.emit('xr:visibility', { visible: true });
    expect(s.heard).toEqual(['enter', 'exit', 'changed']); // the return's visit, and no Listen
    s.heard.length = 0;
    s.palmsOut();
    core.bus.emit('xr:sessionEnd', { visible: false });
    expect(s.heard).toEqual(['enter', 'exit']);
    vi.advanceTimersByTime(LISTEN_MAX_MS);
    expect(s.heard).toHaveLength(2);
  });

  it('in Listen a palm up hands out no seed; after the wake it does', () => {
    const s = setup();
    s.palmsOut();
    s.palmUp('left');
    expect(s.heard).toEqual(['enter']);
    s.wake();
    s.palmUp('left');
    expect(s.heard).toEqual(['enter', 'exit', 'seedOut']);
  });

  it('before load() there is no garden, and no Listen', () => {
    const s = setup('none');
    s.palmsOut();
    s.pressOrb('right');
    expect(s.heard).toEqual([]);
  });

  it("not before the session's visit: palms out while the room is still being found does nothing", () => {
    const s = setup('loaded');
    s.palmsOut();
    s.pressOrb('right');
    expect(s.heard).toEqual([]);
    s.features();
    s.heard.length = 0;
    s.palmsOut();
    expect(s.heard).toEqual(['enter']);
  });

  it('the pinch that wakes drags, removes and pulls nothing: the next pinch on the plant does', () => {
    const s = setup();
    const a: Target = { kind: 'plant', id: 'a' };
    s.palmsOut();
    s.pinch('right', a);
    s.release('right', 'drag', a, 'outer'); // dragged off the bed: would remove it
    s.palmsOut();
    s.pinch('left', a);
    s.release('left', 'pull', a, 'bed', 0.05); // pulled up: would make it taller
    expect(s.heard).toEqual(['enter', 'exit', 'enter', 'exit']);
    s.pinch('right', a);
    s.release('right', 'drag', a, 'outer');
    expect(s.heard).toEqual(['enter', 'exit', 'enter', 'exit', 'changed', 'removed']);
  });
});
