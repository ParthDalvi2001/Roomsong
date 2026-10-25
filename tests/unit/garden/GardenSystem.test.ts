// GardenSystem, the one owner of the garden's state (T-128b): proof b1 of LLD §3.5 and one test per rule of
// API_SPEC §1.10 and LLD §3.2. A fake clock and the real bus, no browser. GardenSystem subscribes for the life of
// a page and has no way to unsubscribe, so the tests watch `bus.on` and take every handler off again themselves.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as core from '../../../src/core/index.js';
import { RESTORE_WINDOW_MS, TIME_LAPSE_DAY_MS } from '../../../src/garden/config.js';
import * as lib from '../../../src/garden/index.js';
import { validateState } from '../../../src/persistence/schema.js';

import { fullBedExcept, garden, plant, seed } from './fixtures.js';

import type { EventMap, Flags, Hand } from '../../../src/core/index.js';
import type {
  Cell,
  GardenState,
  Plant,
  PlacementLevel,
  RoomFeatures,
  Seed,
} from '../../../src/garden/index.js';
import type { MockInstance } from 'vitest';

const DAY_MS = 86_400_000;
const IST = -330; // minutes, as Date.prototype.getTimezoneOffset reports India
const T0 = Date.UTC(2026, 9, 12, 10); // 15:30 on 2026-10-12 in India
const TODAY = '2026-10-12';
// A room that is not the Wanderer's, and whose starter voices are not the Wanderer's either.
const ROOM: RoomFeatures = {
  level: 1,
  floorArea: 6,
  ceilingHeight: 2.4,
  roomVolume: 14.4,
  tableHeight: 0.74,
};
const NO_DIFF = { added: [], removed: [], changed: [] };
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
// Everything GardenSystem emits (API_SPEC §2).
const EMITTED = [
  'room:signature',
  'garden:changed',
  'garden:grown',
  'garden:seedArrived',
  'garden:seedOut',
  'garden:seedBack',
  'garden:removed',
] as const;
type Name = (typeof EMITTED)[number];
type Release = EventMap['gesture:release'];
type Target = NonNullable<Release['target']>;

const seedRef = (id: string): Target => ({ kind: 'seed', id });
const plantRef = (id: string): Target => ({ kind: 'plant', id });
const undoRef = (id: string): Target => ({ kind: 'undo', id });
const cell = (ring: number, step: number): Cell => ({ ring, step });
const last = <T>(list: readonly T[]): T | undefined => list[list.length - 1];

/** A saved garden that had today's seed and whose plants are full-grown: a visit at T0 only counts itself. */
function saved(plants: Plant[] = [], seeds: Seed[] = [], over: Partial<GardenState> = {}): GardenState {
  return garden(plants, seeds, { lastSeedDate: TODAY, lastVisitAt: T0 - 1000, ...over });
}

/** A holder with a clock the test moves; `seen` is what it emitted, in order. */
function setup(appFlags: Partial<Flags> | 'defaults' = {}) {
  const { bus } = core;
  const time = { now: T0 };
  // The zone is asked for the visit's own instant (API_SPEC §1.1, applyVisit); any other Date gets no zone.
  vi.spyOn(Date.prototype, 'getTimezoneOffset').mockImplementation(function (this: Date) {
    return this.getTime() === time.now ? IST : Number.NaN;
  });
  const system =
    appFlags === 'defaults'
      ? new lib.GardenSystem()
      : new lib.GardenSystem(
          core.createClock(() => time.now),
          { ...core.flags, ...appFlags },
        );
  const seen: [Name, EventMap[Name]][] = [];
  for (const name of EMITTED) bus.on(name, (payload) => seen.push([name, payload]));
  // One object per hand for every release, as the gesture machines have it (API_SPEC §1.4): a handler copies
  // what it keeps.
  const releaseOf = (hand: Hand): Release => ({
    type: 'gesture:release',
    hand,
    gesture: 'none',
    target: null,
    pos: { x: 0, y: 0, z: 0 },
    zone: 'inner',
    cell: null,
    dy: null,
  });
  const releases = { left: releaseOf('left'), right: releaseOf('right') };
  return {
    core,
    lib,
    bus,
    time,
    system,
    seen,
    names: (): Name[] => seen.map(([name]) => name),
    clear: (): void => void (seen.length = 0),
    /** The payload of event number `index`, which must be a `name`. */
    at<K extends Name>(index: number, name: K): EventMap[K] {
      const entry = seen[index];
      if (entry?.[0] !== name) throw new Error(`event ${index} is ${entry?.[0]}, not ${name}`);
      return entry[1] as EventMap[K];
    },
    state(): GardenState {
      if (system.state === null) throw new Error('the garden is not loaded');
      return system.state;
    },
    features: (features: RoomFeatures = { level: 4 }) =>
      bus.emit('room:features', { features, surfaces: {} }),
    visible: (visible: boolean) => bus.emit('xr:visibility', { visible }),
    sessionEnd: () => bus.emit('xr:sessionEnd', { visible: false }),
    bedPlaced: (restored: boolean) =>
      bus.emit('room:bedPlaced', { placement: { pose: IDENTITY, level: 1 }, restored }),
    anchored: (handle: string, level: PlacementLevel) => bus.emit('room:anchored', { handle, level }),
    palmUp: (hand: Hand) => bus.emit('gesture:palmUp', { type: 'gesture:palmUp', hand }),
    pinch: (hand: Hand, target: Target | null) =>
      bus.emit('gesture:pinchStart', { type: 'gesture:pinchStart', hand, target, pos: releases[hand].pos }),
    lost: (hand: Hand) => bus.emit('gesture:trackingLost', { type: 'gesture:trackingLost', hand }),
    release(
      hand: Hand,
      gesture: Release['gesture'],
      target: Target | null,
      zone: Release['zone'],
      onCell: Cell | null = null,
      dy: number | null = null,
    ): void {
      bus.emit('gesture:release', Object.assign(releases[hand], { gesture, target, zone, cell: onCell, dy }));
    },
  };
}

/** A holder with `state` loaded and this session's visit applied (a floating bed: the Wanderer). */
function inSession(state: GardenState) {
  const s = setup();
  s.system.load(state);
  s.features();
  s.clear();
  return s;
}

/** In a session, with seed `s1` on the left palm and pinched by the right hand. */
function carrying(plants: Plant[] = []) {
  const s = inSession(saved(plants, [seed('s1'), seed('s2', 'bell')]));
  s.palmUp('left');
  s.pinch('right', seedRef('s1'));
  s.clear();
  return s;
}

let subscribed: MockInstance<typeof core.bus.on>;
beforeEach(() => {
  subscribed = vi.spyOn(core.bus, 'on');
});
afterEach(() => {
  // Every handler of this test comes off the bus: the holder's own, the recorder's and the test's.
  for (const subscription of subscribed.mock.results) (subscription.value as () => void)();
  core.settings.set(core.DEFAULT_SETTINGS);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('garden/GardenSystem: load (API_SPEC §1.10)', () => {
  it('has no state before load; load emits one garden:changed with every plant id in diff.added', () => {
    const s = setup();
    expect(s.system.state).toBeNull();
    const state = saved([plant('a', 0, 0), plant('b', 1, 3)], [seed('s1')]);
    s.system.load(state);
    expect(s.system.state).toBe(state);
    expect(s.seen).toEqual([
      ['garden:changed', { state, diff: { added: ['a', 'b'], removed: [], changed: [] } }],
    ]);
    expect(s.at(0, 'garden:changed').state).toBe(state);
  });

  it('takes core’s clock and flags when it is given none', () => {
    vi.spyOn(Date, 'now').mockReturnValue(T0);
    const s = setup('defaults');
    s.system.load(s.lib.newGarden(s.core.clock.now(), s.core.settings.get()));
    s.features();
    expect(s.state()).toMatchObject({ plants: [], lastVisitAt: T0, visits: 1 });
  });

  it('refuses a second load: the garden it holds stays, nothing is emitted, and the log says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const s = setup();
    const state = saved([plant('a', 0, 0)]);
    s.system.load(state);
    s.clear();
    s.system.load(saved([plant('b', 1, 1)]));
    expect(s.system.state).toBe(state);
    expect(s.seen).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    expect(last(s.core.log.recent())).toMatchObject({ level: 'warn', scope: 'garden' });
  });

  it('does nothing before load: no call and no event changes or emits anything, and no handler throws', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const s = setup();
    s.system.newGarden();
    s.system.setBedHeightOffset(0.05);
    s.features(ROOM);
    s.visible(true);
    s.bedPlaced(false);
    s.anchored('h1', 1);
    s.palmUp('left');
    s.pinch('right', seedRef('s1'));
    s.release('right', 'carry', seedRef('s1'), 'bed', cell(0, 0));
    s.release('right', 'drag', plantRef('a'), 'outer');
    s.release('right', 'pull', plantRef('a'), 'bed', null, 0.1);
    s.release('right', 'press', undoRef('a'), 'bed');
    s.lost('right');
    s.sessionEnd();
    expect(s.seen).toEqual([]);
    expect(s.system.state).toBeNull();
    expect(error).not.toHaveBeenCalled(); // the bus logs a handler that throws

    // Nothing of it was kept: the first room:features after load is a session's first.
    s.system.load(s.lib.newGarden(T0, s.core.settings.get()));
    s.clear();
    s.features();
    expect(s.names()).toEqual([
      'room:signature',
      'garden:changed',
      'garden:seedArrived',
      'garden:seedArrived',
      'garden:seedArrived',
    ]);
  });
});

describe('garden/GardenSystem: the autoplant flag (LLD §3.2, API_SPEC §3)', () => {
  it('autoplant=3 plants three seeds of its own before the first garden:changed (b1)', () => {
    const s = setup({ autoplant: 3 });
    s.system.load(s.lib.newGarden(T0, s.core.settings.get()));
    expect(s.state().plants).toEqual([
      { id: 'auto-0', voice: 'bell', cell: cell(0, 0), height: 0.55, hue: 0, plantedAt: T0 },
      { id: 'auto-1', voice: 'pad', cell: cell(0, 7), height: 0.55, hue: 1 / 3, plantedAt: T0 },
      { id: 'auto-2', voice: 'pluck', cell: cell(0, 14), height: 0.55, hue: 2 / 3, plantedAt: T0 },
    ]);
    expect(s.state().seeds).toEqual([]);
    expect(s.seen).toEqual([
      [
        'garden:changed',
        { state: s.state(), diff: { added: ['auto-0', 'auto-1', 'auto-2'], removed: [], changed: [] } },
      ],
    ]);
  });

  it('starts at cell number flags.seed and steps by 7, round the 80 cells', () => {
    const s = setup({ autoplant: 3, seed: 75 });
    s.system.load(s.lib.newGarden(T0, s.core.settings.get()));
    expect(s.state().plants.map((p) => p.cell)).toEqual([cell(4, 11), cell(0, 2), cell(0, 9)]);
  });

  it('autoplant=80 fills the bed: no cell twice, the five Must voices in turn', () => {
    const s = setup({ autoplant: 80 });
    s.system.load(s.lib.newGarden(T0, s.core.settings.get()));
    const plants = s.state().plants;
    expect(new Set(plants.map((p) => p.cell.ring * 16 + p.cell.step)).size).toBe(80);
    expect(plants.slice(3, 7).map((p) => p.voice)).toEqual(['bass', 'choir', 'bell', 'pad']);
  });

  it('plants only into an empty garden, so a reload adds no more; and nothing without the flag', () => {
    const withPlant = saved([plant('a', 0, 0)]);
    const flagged = setup({ autoplant: 3 });
    flagged.system.load(withPlant);
    expect(flagged.system.state).toBe(withPlant);

    const empty = saved();
    const plain = setup({ autoplant: 0 });
    plain.system.load(empty);
    expect(plain.system.state).toBe(empty);
  });
});

describe('garden/GardenSystem: the time an autoplanted plant gets', () => {
  it('is the later of the clock and the last visit, as for a carried seed', () => {
    const s = setup({ autoplant: 1 });
    s.system.load(saved([], [], { lastVisitAt: T0 + DAY_MS })); // the last visit is ahead of the clock
    expect(s.state().plants[0]?.plantedAt).toBe(T0 + DAY_MS);
  });

  it('is the last visit when the clock is not finite: no NaN reaches the save', () => {
    const s = setup({ autoplant: 1 });
    s.time.now = Number.NaN;
    s.system.load(saved());
    expect(s.state().plants[0]?.plantedAt).toBe(T0 - 1000);
  });
});

describe('garden/GardenSystem: the signature, then the visit (API_SPEC §1.10 rule 4)', () => {
  it('room:features on a new garden: room:signature, garden:changed, then three starter seeds (b1)', () => {
    const s = setup();
    const fresh = s.lib.newGarden(T0, s.core.settings.get());
    s.system.load(fresh);
    s.clear();
    s.features(ROOM);
    const signature = s.lib.roomSignature(ROOM);
    const state = s.state();
    expect(signature).not.toBe(s.lib.WANDERER);
    expect(state).toEqual(s.lib.applyVisit(fresh, T0, signature, IST).state);
    expect(state.seeds.map((x) => x.id)).toEqual([
      `seed-${TODAY}-${T0}-0`,
      `seed-${TODAY}-${T0}-1`,
      `seed-${TODAY}-${T0}-2`,
    ]);
    expect(state.seeds.map((x) => x.voice)).toEqual(signature.starterVoices);
    expect(s.seen).toEqual([
      ['room:signature', { signature, starterSeeds: true }],
      ['garden:changed', { state, diff: NO_DIFF }],
      ['garden:seedArrived', { seed: state.seeds[0] }],
      ['garden:seedArrived', { seed: state.seeds[1] }],
      ['garden:seedArrived', { seed: state.seeds[2] }],
    ]);
  });

  it('asks the platform for the zone of the visit’s own instant: the seeds carry the local date', () => {
    const s = setup();
    s.time.now = Date.UTC(2026, 9, 12, 20); // 01:30 on the 13th in India
    s.system.load(s.lib.newGarden(s.time.now, s.core.settings.get()));
    s.features();
    expect(s.state().seeds.map((x) => x.id)).toEqual([
      `seed-2026-10-13-${Date.UTC(2026, 9, 12, 20)}-0`,
      `seed-2026-10-13-${Date.UTC(2026, 9, 12, 20)}-1`,
      `seed-2026-10-13-${Date.UTC(2026, 9, 12, 20)}-2`,
    ]);
  });

  it('with the forceSignature flag the signature is WANDERER itself, whatever the room (b1)', () => {
    const s = setup({ forceSignature: 'wanderer' });
    s.system.load(s.lib.newGarden(T0, s.core.settings.get()));
    s.clear();
    s.features(ROOM);
    expect(s.lib.roomSignature(ROOM).starterVoices).not.toEqual(s.lib.WANDERER.starterVoices);
    expect(s.at(0, 'room:signature')).toEqual({ signature: s.lib.WANDERER, starterSeeds: true });
    expect(s.at(0, 'room:signature').signature).toBe(s.lib.WANDERER);
    expect(s.state().seeds.map((x) => x.voice)).toEqual(['bell', 'pad', 'pluck']);
  });

  it('a restored garden: no starter seeds; garden:grown when plants grew, then the day’s seed', () => {
    const s = setup();
    const young = plant('young', 0, 0, { plantedAt: T0 - DAY_MS - 500 }); // one day old during this visit
    s.system.load(saved([young, plant('old', 1, 1)], [], { lastSeedDate: '2026-10-11' }));
    s.clear();
    s.features();
    const state = s.state();
    expect(state.visits).toBe(2);
    expect(state.seeds).toMatchObject([{ id: `seed-${TODAY}`, voice: 'bass', receivedAt: T0 }]);
    expect(s.seen).toEqual([
      ['room:signature', { signature: s.lib.WANDERER, starterSeeds: false }],
      ['garden:changed', { state, diff: NO_DIFF }],
      ['garden:grown', { deltas: [{ plantId: 'young', from: 0, to: 1 }] }],
      ['garden:seedArrived', { seed: state.seeds[0] }],
    ]);
  });

  it('a later room:features of the same session (Re-place) only emits the signature again', () => {
    const s = setup();
    s.system.load(s.lib.newGarden(T0, s.core.settings.get()));
    s.features();
    const state = s.state();
    s.clear();
    s.features(ROOM);
    expect(s.seen).toEqual([
      ['room:signature', { signature: s.lib.roomSignature(ROOM), starterSeeds: false }],
    ]);
    expect(s.system.state).toBe(state);

    s.system.newGarden(); // and it is the session's signature from here on: a new garden gets its voices
    expect(s.state().seeds.map((x) => x.voice)).toEqual(s.lib.roomSignature(ROOM).starterVoices);
  });

  it('a visit that is refused is logged at warn; no seed is handed out until one is applied', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const s = setup();
    const state = saved([], [seed('s1')]);
    s.system.load(state);
    s.clear();
    s.time.now = Number.NaN; // a clock that is not usable
    s.features();
    s.palmUp('left');
    expect(s.seen).toEqual([['room:signature', { signature: s.lib.WANDERER, starterSeeds: false }]]);
    expect(s.system.state).toBe(state);
    expect(warn).toHaveBeenCalledOnce();
    expect(last(s.core.log.recent())).toMatchObject({ level: 'warn', scope: 'garden' });

    s.time.now = T0;
    s.visible(true); // the return from a pause tries again
    s.palmUp('left');
    expect(s.names()).toEqual(['room:signature', 'garden:changed', 'garden:seedOut']);
  });

  it('after a refused visit a Re-place hands out no seed; the next return from a pause tries the visit again', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const s = setup();
    s.system.load(saved([], [seed('s1')]));
    s.time.now = Number.NaN;
    s.features(); // the session's first: its visit is refused
    s.time.now = T0; // the clock is usable again
    s.clear();
    s.bedPlaced(false); // Re-place: the signature again, and no visit
    s.features();
    s.palmUp('left');
    expect(s.names()).toEqual(['room:signature']);

    s.visible(true);
    s.palmUp('left');
    expect(s.names()).toEqual(['room:signature', 'garden:changed', 'garden:seedOut']);
  });

  it('xr:visibility true is the return from a pause: the same visit again, and a new day brings its seed (b1)', () => {
    const s = setup();
    s.system.load(s.lib.newGarden(T0, s.core.settings.get()));
    s.clear();
    s.visible(true); // before the session's first signature: nothing
    expect(s.seen).toEqual([]);
    s.features();
    s.clear();

    s.visible(false);
    expect(s.seen).toEqual([]);
    s.visible(true); // the same day: a visit, and none of the starter seeds again
    expect(s.seen).toEqual([['garden:changed', { state: s.state(), diff: NO_DIFF }]]);
    expect(s.state().visits).toBe(2);
    expect(s.state().seeds).toHaveLength(3);

    s.clear();
    s.time.now = T0 + DAY_MS;
    s.visible(true);
    expect(s.names()).toEqual(['garden:changed', 'garden:seedArrived']);
    expect(s.state()).toMatchObject({ visits: 3, lastVisitAt: T0 + DAY_MS, lastSeedDate: '2026-10-13' });
    expect(last(s.state().seeds)?.id).toBe('seed-2026-10-13');
  });

  it('a visit after the clock went backwards counts itself and nothing else: no growth, no seed', () => {
    const s = inSession(saved([plant('a', 0, 0, { plantedAt: T0 - DAY_MS + 500 })]));
    s.time.now = T0 - 2 * DAY_MS;
    s.visible(true);
    expect(s.seen).toEqual([['garden:changed', { state: s.state(), diff: NO_DIFF }]]);
    expect(s.state()).toMatchObject({ visits: 3, lastVisitAt: T0, lastSeedDate: TODAY, seeds: [] });
  });

  it('two sessions in one page life: the second has its own signature and visit, and no starter seeds', () => {
    const s = setup();
    s.system.load(s.lib.newGarden(T0, s.core.settings.get()));
    s.features(ROOM);
    s.sessionEnd();
    s.clear();

    // Between the sessions the signature is forgotten: no visit, and no seed to a hand.
    s.visible(true);
    s.palmUp('left');
    expect(s.seen).toEqual([]);

    s.features(); // the second session, the same day, on a floating bed
    expect(s.seen).toEqual([
      ['room:signature', { signature: s.lib.WANDERER, starterSeeds: false }],
      ['garden:changed', { state: s.state(), diff: NO_DIFF }],
    ]);
    expect(s.state().visits).toBe(2);
    expect(s.state().seeds).toHaveLength(3);
    s.palmUp('left');
    expect(last(s.names())).toBe('garden:seedOut');

    s.sessionEnd();
    s.clear();
    s.time.now = T0 + DAY_MS; // the third, a day later
    s.features();
    expect(s.names()).toEqual(['room:signature', 'garden:changed', 'garden:seedArrived']);
    expect(s.state().visits).toBe(3);
  });
});

describe('garden/GardenSystem: the saved anchor pair (API_SPEC §2)', () => {
  it('room:bedPlaced with restored false drops a saved pair; restored true keeps it', () => {
    const s = setup();
    const state = saved([], [], { anchorHandle: 'h1', anchorLevel: 2 });
    s.system.load(state);
    s.clear();
    s.bedPlaced(true);
    expect(s.seen).toEqual([]);
    expect(s.system.state).toBe(state);

    s.bedPlaced(false);
    expect(s.seen).toEqual([['garden:changed', { state: s.state(), diff: NO_DIFF }]]);
    expect(s.state()).not.toHaveProperty('anchorHandle');
    expect(s.state()).not.toHaveProperty('anchorLevel');

    s.bedPlaced(false); // no pair left: a call that changes nothing emits nothing (rule 6)
    expect(s.seen).toHaveLength(1);
  });

  it('room:anchored stores the pair', () => {
    const s = setup();
    s.system.load(saved());
    s.clear();
    s.anchored('h2', 1);
    expect(s.seen).toEqual([['garden:changed', { state: s.state(), diff: NO_DIFF }]]);
    expect(s.state()).toMatchObject({ anchorHandle: 'h2', anchorLevel: 1 });
    s.anchored('h2', 1);
    expect(s.seen).toHaveLength(1);
  });
});

describe('garden/GardenSystem: a seed out and back (API_SPEC §1.10 rule 8)', () => {
  it('palm up after the visit puts the first seed of the supply on that hand; the state does not change (b1)', () => {
    const s = setup();
    const state = saved([], [seed('s1'), seed('s2', 'bell')]);
    s.system.load(state);
    s.clear();
    s.palmUp('left'); // no seed is handed out before the session's visit
    expect(s.seen).toEqual([]);

    s.features();
    const visited = s.state();
    s.clear();
    s.palmUp('left');
    expect(s.seen).toEqual([['garden:seedOut', { seed: visited.seeds[0], hand: 'left' }]]);
    expect(visited.seeds[0]?.id).toBe('s1');
    expect(s.system.state).toBe(visited);

    s.palmUp('right'); // at most one seed is out
    s.palmUp('left');
    expect(s.seen).toHaveLength(1);
  });

  it('palm up with an empty supply hands out nothing', () => {
    const s = inSession(saved());
    s.palmUp('left');
    expect(s.seen).toEqual([]);
  });

  it('a carry released on a cell plants the seed: garden:changed with its id in added (b1)', () => {
    const s = carrying();
    s.time.now = T0 + 60_000;
    s.release('right', 'carry', seedRef('s1'), 'bed', cell(2, 5));
    const state = s.state();
    expect(s.seen).toEqual([
      ['garden:changed', { state, diff: { added: ['s1'], removed: [], changed: [] } }],
    ]);
    expect(state.plants).toEqual([
      { id: 's1', voice: 'pad', cell: cell(2, 5), height: 0.55, hue: 0.4, plantedAt: T0 + 60_000 },
    ]);
    expect(state.seeds.map((x) => x.id)).toEqual(['s2']);

    s.palmUp('right'); // no seed is out afterwards: the next one comes
    expect(last(s.seen)).toEqual(['garden:seedOut', { seed: state.seeds[0], hand: 'right' }]);
  });

  it('plants with the later of the clock and the last visit, so a plant is never younger than nothing', () => {
    const s = carrying();
    s.time.now = T0 - 5000; // the clock was set back after the visit
    s.release('right', 'carry', seedRef('s1'), 'bed', cell(2, 5));
    expect(s.state().plants[0]?.plantedAt).toBe(T0);
    expect(s.state().lastVisitAt).toBe(T0);
  });

  it('plants at the last visit when the clock is not finite: no NaN reaches the save', () => {
    const s = carrying();
    s.time.now = Number.NaN;
    s.release('right', 'carry', seedRef('s1'), 'bed', cell(2, 5));
    expect(s.state().plants[0]?.plantedAt).toBe(T0);
  });

  it.each(['outer', 'inner'] as const)(
    'a carry released off the bed (zone %s) sends the seed back with reason offBed (b1)',
    (zone) => {
      const s = carrying();
      const state = s.state();
      s.release('right', 'carry', seedRef('s1'), zone);
      expect(s.seen).toEqual([['garden:seedBack', { seedId: 's1', reason: 'offBed' }]]);
      expect(s.system.state).toBe(state);

      s.palmUp('left'); // it is in the supply again, and the first to come out
      expect(last(s.seen)).toEqual(['garden:seedOut', { seed: state.seeds[0], hand: 'left' }]);
    },
  );

  it('a carry released over a full bed sends the seed back with reason full (b1)', () => {
    const s = carrying(fullBedExcept());
    const state = s.state();
    s.release('right', 'carry', seedRef('s1'), 'bed');
    expect(s.seen).toEqual([['garden:seedBack', { seedId: 's1', reason: 'full' }]]);
    expect(s.system.state).toBe(state);
  });

  it('a carry the reducer refuses sends the seed back too: full over the bed', () => {
    const s = carrying([plant('a', 0, 0)]);
    s.release('right', 'carry', seedRef('s1'), 'bed', cell(0, 0)); // taken since the hover
    expect(s.seen).toEqual([['garden:seedBack', { seedId: 's1', reason: 'full' }]]);
    expect(s.state().plants.map((p) => p.id)).toEqual(['a']);
  });

  it('a carry of a seed that is not the one out does nothing, and the one out stays out', () => {
    const s = inSession(saved([], [seed('s1'), seed('s2', 'bell')]));
    const state = s.state();
    s.release('right', 'carry', seedRef('s1'), 'bed', cell(0, 0)); // no seed is out
    expect(s.seen).toEqual([]);

    s.palmUp('left');
    s.clear();
    s.release('right', 'carry', seedRef('s2'), 'bed', cell(0, 0)); // s1 is out, not s2
    s.palmUp('right');
    expect(s.seen).toEqual([]);
    expect(s.system.state).toBe(state);

    s.release('right', 'carry', seedRef('s1'), 'bed', cell(0, 0));
    expect(s.state().plants.map((p) => p.id)).toEqual(['s1']);
  });

  it('gesture:trackingLost of the hand that carried the seed sends it back with reason lost', () => {
    const s = inSession(saved([plant('a', 0, 0)], [seed('s1')]));
    s.palmUp('left');
    s.clear();
    s.lost('left'); // it rests on this palm: nobody carries it
    s.pinch('right', plantRef('a'));
    s.lost('right'); // this hand held a plant
    expect(s.seen).toEqual([]);

    s.pinch('right', seedRef('s1'));
    s.lost('left');
    expect(s.seen).toEqual([]);
    s.lost('right');
    expect(s.seen).toEqual([['garden:seedBack', { seedId: 's1', reason: 'lost' }]]);

    s.lost('right'); // once
    s.palmUp('left'); // out again, and not carried by anyone yet
    s.lost('right');
    expect(s.names()).toEqual(['garden:seedBack', 'garden:seedOut']);
  });

  it('only a pinch on the seed makes a carrier: one on an undo petal with the seed’s id does not', () => {
    const s = inSession(saved([], [seed('s1')]));
    s.palmUp('left');
    s.clear();
    s.pinch('right', undoRef('s1'));
    s.lost('right');
    expect(s.seen).toEqual([]);
  });

  it('two hands on one seed: the hand of the latest pinch is the carrier, and only its loss sends it back', () => {
    const s = carrying(); // on the left palm, pinched by the right hand
    s.pinch('left', seedRef('s1'));
    s.lost('right');
    expect(s.seen).toEqual([]);
    s.lost('left');
    expect(s.seen).toEqual([['garden:seedBack', { seedId: 's1', reason: 'lost' }]]);
  });

  it('xr:sessionEnd sends a seed that is out back with reason reset (b1)', () => {
    const s = carrying();
    s.sessionEnd();
    expect(s.seen).toEqual([['garden:seedBack', { seedId: 's1', reason: 'reset' }]]);
    s.sessionEnd(); // none is out now
    expect(s.seen).toHaveLength(1);
  });
});

describe('garden/GardenSystem: the release table (API_SPEC §1.4)', () => {
  const bed = (): Plant[] => [plant('a', 0, 0), plant('b', 1, 1)];

  it('a drag released on a free cell of the bed moves the plant: its id in changed', () => {
    const s = inSession(saved(bed()));
    s.release('left', 'drag', plantRef('a'), 'bed', cell(3, 3));
    expect(s.seen).toEqual([
      ['garden:changed', { state: s.state(), diff: { added: [], removed: [], changed: ['a'] } }],
    ]);
    expect(s.state().plants.map((p) => p.cell)).toEqual([cell(3, 3), cell(1, 1)]);
  });

  it('a drag commits nothing on its own cell, on a taken cell, with no cell, or in the inner zone', () => {
    const s = inSession(saved(bed()));
    const state = s.state();
    s.release('left', 'drag', plantRef('a'), 'bed', cell(0, 0));
    s.release('left', 'drag', plantRef('a'), 'bed', cell(1, 1));
    s.release('left', 'drag', plantRef('a'), 'bed');
    s.release('left', 'drag', plantRef('a'), 'inner');
    s.release('left', 'drag', plantRef('a'), 'inner', cell(3, 3));
    expect(s.seen).toEqual([]);
    expect(s.system.state).toBe(state);
  });

  it('a drag released in the outer zone removes the plant: garden:removed, good for UNDO_LIFE_MS (b1)', () => {
    const s = inSession(saved(bed()));
    const a = s.state().plants[0];
    s.time.now = T0 + 123;
    s.release('left', 'drag', plantRef('a'), 'outer');
    expect(s.lib.UNDO_LIFE_MS).toBe(5000);
    expect(s.seen).toEqual([
      ['garden:changed', { state: s.state(), diff: { added: [], removed: ['a'], changed: [] } }],
      ['garden:removed', { plantId: 'a', undoToken: { plant: a }, expiresAt: T0 + 123 + 5000 }],
    ]);
    expect(s.state().plants.map((p) => p.id)).toEqual(['b']);
  });

  it('a pull sets the height to heightAfterPull of its travel: its id in changed', () => {
    const s = inSession(saved(bed()));
    s.release('left', 'pull', plantRef('a'), 'bed', null, 0.05);
    expect(s.seen).toEqual([
      ['garden:changed', { state: s.state(), diff: { added: [], removed: [], changed: ['a'] } }],
    ]);
    expect(s.state().plants[0]?.height).toBe(s.lib.heightAfterPull(0.5, 0.05));
    expect(s.state().plants[0]?.height).toBeCloseTo(0.7, 12);

    s.clear();
    s.release('left', 'pull', plantRef('a'), 'bed', null, 0); // no travel: nothing changes, nothing is emitted
    s.release('left', 'pull', plantRef('a'), 'bed'); // a pull with no travel at all
    expect(s.seen).toEqual([]);
  });

  it.each([
    [4999, true],
    [5000, true],
    [5001, false],
  ])(
    'undo %i ms after the removal: the plant is back = %s (TC-GAR-03, the expiry half; b1)',
    (afterMs, isBack) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval'] });
      const s = inSession(saved(bed()));
      const a = s.state().plants[0];
      s.release('left', 'drag', plantRef('a'), 'outer');
      s.clear();
      expect(vi.getTimerCount()).toBe(0); // no timer: the life is checked when the undo is asked for

      s.time.now = T0 + afterMs;
      s.release('right', 'press', undoRef('a'), 'bed');
      if (isBack) {
        expect(s.seen).toEqual([
          ['garden:changed', { state: s.state(), diff: { added: ['a'], removed: [], changed: [] } }],
        ]);
        expect(s.state().plants).toEqual([plant('b', 1, 1), a]);
      } else {
        expect(s.seen).toEqual([]);
        expect(s.state().plants.map((p) => p.id)).toEqual(['b']);
      }
    },
  );

  it('the token is dropped either way: one that ran out cannot be used when the clock goes back', () => {
    const s = inSession(saved(bed()));
    s.release('left', 'drag', plantRef('a'), 'outer');
    s.clear();
    s.time.now = T0 + 5001;
    s.release('right', 'press', undoRef('a'), 'bed');
    s.time.now = T0 + 1;
    s.release('right', 'press', undoRef('a'), 'bed');
    expect(s.seen).toEqual([]);
  });

  it('a token that is alive when the session ends is left to run out (LLD §3.3 H)', () => {
    const s = inSession(saved(bed()));
    s.release('left', 'drag', plantRef('a'), 'outer');
    s.sessionEnd();
    s.clear();
    s.time.now = T0 + 4000;
    s.release('right', 'press', undoRef('a'), 'bed');
    expect(s.names()).toEqual(['garden:changed']);
    expect(s.state().plants.map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('a token that ran out is swept at the next removal; one that is alive is kept', () => {
    const s = inSession(saved([...bed(), plant('c', 2, 2)]));
    s.release('left', 'drag', plantRef('a'), 'outer');
    s.time.now = T0 + 4000;
    s.release('left', 'drag', plantRef('b'), 'outer'); // a's token is alive: kept
    s.time.now = T0 + 6000;
    s.release('left', 'drag', plantRef('c'), 'outer'); // a's ran out: swept. b's lives until 9000
    s.clear();

    s.time.now = T0 + 1000; // the clock goes back into a's life: it is gone all the same
    s.release('right', 'press', undoRef('a'), 'bed');
    expect(s.seen).toEqual([]);
    s.release('right', 'press', undoRef('b'), 'bed');
    s.release('right', 'press', undoRef('c'), 'bed');
    expect(s.state().plants.map((p) => p.id)).toEqual(['b', 'c']);
  });

  it.each([
    [5000, true],
    [5001, false],
  ])('the sweep agrees with the press: a removal %i ms later keeps the token = %s', (afterMs, isKept) => {
    const s = inSession(saved(bed()));
    s.release('left', 'drag', plantRef('a'), 'outer'); // good until T0 + 5000
    s.time.now = T0 + afterMs;
    s.release('left', 'drag', plantRef('b'), 'outer'); // the sweep
    s.clear();
    s.time.now = T0 + 5000; // the last instant at which a press brings the plant back
    s.release('right', 'press', undoRef('a'), 'bed');
    expect(s.names()).toEqual(isKept ? ['garden:changed'] : []);
  });

  it('a removal while the clock is not finite gives a token that still dies: it counts from the last visit', () => {
    const s = inSession(saved(bed()));
    s.time.now = Number.NaN;
    s.release('left', 'drag', plantRef('a'), 'outer');
    expect(s.at(1, 'garden:removed').expiresAt).toBe(T0 + 5000);
    s.clear();
    s.time.now = T0 + 5001;
    s.release('right', 'press', undoRef('a'), 'bed');
    expect(s.seen).toEqual([]);
  });

  it('an undo petal reacts to a press only: a drag, pull, carry or none release on it does nothing', () => {
    const s = inSession(saved(bed()));
    s.release('left', 'drag', plantRef('a'), 'outer');
    s.clear();
    s.release('right', 'drag', undoRef('a'), 'bed', cell(3, 3));
    s.release('right', 'drag', undoRef('a'), 'outer');
    s.release('right', 'pull', undoRef('a'), 'bed', null, 0.1);
    s.release('right', 'carry', undoRef('a'), 'bed', cell(3, 3));
    s.release('right', 'none', undoRef('a'), 'bed');
    expect(s.seen).toEqual([]);
    s.release('right', 'press', undoRef('a'), 'bed'); // and none of them used the token up
    expect(s.names()).toEqual(['garden:changed']);
  });

  it('a press acts on the undo petal only: an orb, a panel control and a cancelled press do nothing', () => {
    const s = inSession(saved(bed()));
    s.release('left', 'drag', plantRef('a'), 'outer');
    s.clear();
    s.release('right', 'press', { kind: 'orb', id: 'a' }, 'bed');
    s.release('right', 'press', { kind: 'panel', id: 'a' }, 'bed');
    s.release('right', 'press', null, 'bed');
    s.release('right', 'press', undoRef('nobody'), 'bed');
    expect(s.seen).toEqual([]);
    s.release('right', 'press', undoRef('a'), 'bed'); // and none of them used the token up
    expect(s.names()).toEqual(['garden:changed']);
  });

  it('reads the gesture and never infers it from the zone or the target: kind none commits nothing', () => {
    const s = inSession(saved(bed(), [seed('s1')]));
    s.palmUp('left');
    s.clear();
    s.release('right', 'none', seedRef('s1'), 'bed', cell(3, 3));
    s.release('left', 'none', plantRef('a'), 'outer');
    s.release('left', 'none', plantRef('a'), 'bed', cell(3, 3), 0.1);
    s.release('left', 'none', null, 'bed');
    expect(s.seen).toEqual([]);
  });

  it('a release for a plant that no longer exists commits nothing and emits nothing', () => {
    const s = inSession(saved(bed()));
    const state = s.state();
    s.release('left', 'drag', plantRef('gone'), 'bed', cell(3, 3));
    s.release('left', 'drag', plantRef('gone'), 'outer');
    s.release('left', 'pull', plantRef('gone'), 'bed', null, 0.1);
    s.release('left', 'press', undoRef('gone'), 'bed');
    expect(s.seen).toEqual([]);
    expect(s.system.state).toBe(state);
  });
});

describe('garden/GardenSystem: newGarden and setBedHeightOffset (FR-PER-03, FR-UI-10)', () => {
  it('BUG-006: New garden twice on one day gives starter seeds of their own ids each time, and the save takes them', () => {
    const s = setup();
    s.system.load(s.lib.newGarden(T0, s.core.settings.get()));
    s.features();
    const ids = () => s.state().seeds.map((x) => x.id);
    const first = ids();
    s.time.now = T0 + 1000;
    s.system.newGarden();
    const second = ids();
    s.time.now = T0 + 2000;
    s.system.newGarden();
    const third = ids();
    expect(new Set([...first, ...second, ...third]).size).toBe(9);
    expect(third).toEqual([0, 1, 2].map((i) => `seed-${TODAY}-${T0 + 2000}-${i}`));
    expect(validateState(s.state())).toEqual(s.state());
  });

  it('New garden with a seed out and an undo pending: the seed goes back, the token is dropped, three starter seeds come (b1)', () => {
    const s = setup();
    s.system.load(
      saved([plant('a', 0, 0), plant('b', 1, 1)], [seed('s1')], {
        anchorHandle: 'h1',
        anchorLevel: 2,
        bedHeightOffset: 0.05,
      }),
    );
    s.features(ROOM);
    s.palmUp('left');
    s.pinch('right', seedRef('s1'));
    s.release('left', 'drag', plantRef('a'), 'outer');
    s.core.settings.set({ volume: 0.3 });
    s.clear();
    s.time.now = T0 + 1000;

    s.system.newGarden();
    const state = s.state();
    const made: GardenState = {
      ...s.lib.newGarden(T0 + 1000, s.core.settings.get()),
      bedHeightOffset: 0.05, // the bed stays where it is,
      anchorHandle: 'h1', // and so does its anchor pair
      anchorLevel: 2,
    };
    expect(s.seen).toEqual([
      ['garden:seedBack', { seedId: 's1', reason: 'reset' }],
      ['garden:changed', { state: made, diff: { added: [], removed: ['b'], changed: [] } }],
      ['garden:changed', { state, diff: NO_DIFF }],
      ['garden:seedArrived', { seed: state.seeds[0] }],
      ['garden:seedArrived', { seed: state.seeds[1] }],
      ['garden:seedArrived', { seed: state.seeds[2] }],
    ]);
    expect(state).toEqual(s.lib.applyVisit(made, T0 + 1000, s.lib.roomSignature(ROOM), IST).state);
    expect(state.seeds.map((x) => x.voice)).toEqual(s.lib.roomSignature(ROOM).starterVoices);
    expect(state.settings).toBe(s.core.settings.get()); // the live settings
    expect(state.settings.volume).toBe(0.3);

    s.clear();
    s.release('right', 'press', undoRef('a'), 'bed'); // no petal brings a plant of the old garden into the new one
    s.lost('right'); // and the hand that carried the old seed has nothing to lose
    expect(s.seen).toEqual([]);
    expect(s.state().plants).toEqual([]);
  });

  it('a release of the seed that was out before New garden plants nothing, though the new supply has that id', () => {
    const s = setup();
    s.system.load(s.lib.newGarden(T0, s.core.settings.get()));
    s.features();
    s.palmUp('left');
    s.pinch('right', seedRef(`seed-${TODAY}-${T0}-0`));
    s.system.newGarden(); // the same day and the same clock: the starter seeds get the same ids
    expect(s.state().seeds[0]?.id).toBe(`seed-${TODAY}-${T0}-0`);
    s.clear();
    s.release('right', 'carry', seedRef(`seed-${TODAY}-${T0}-0`), 'bed', cell(0, 0));
    expect(s.seen).toEqual([]);
    expect(s.state().plants).toEqual([]);

    s.palmUp('left'); // the new garden's own seed comes out as any other
    expect(s.names()).toEqual(['garden:seedOut']);
  });

  it('BUG-006: a hand closed on the old seed plants nothing, though the new seed of that id is out on the other palm', () => {
    const s = setup();
    const id = `seed-${TODAY}-${T0}-0`;
    s.system.load(s.lib.newGarden(T0, s.core.settings.get()));
    s.features();
    s.palmUp('left');
    s.pinch('right', seedRef(id));
    s.system.newGarden(); // the same day: the starter seeds get the same ids
    s.palmUp('left'); // the re-arm: the new seed of that id rests on the left palm
    s.clear();
    s.release('right', 'carry', seedRef(id), 'bed', cell(0, 0)); // the right hand never let go
    expect(s.seen).toEqual([]);
    expect(s.state().plants).toEqual([]);

    s.pinch('right', seedRef(id)); // a pinch in the new garden plants it
    s.release('right', 'carry', seedRef(id), 'bed', cell(0, 0));
    expect(s.state().plants.map((p) => p.id)).toEqual([id]);
  });

  it('a seed planted with no pinchStart (the gaze, T-160) is planted after a New garden: the hand-out forgets old pinches', () => {
    const s = setup();
    const id = `seed-${TODAY}-${T0}-0`;
    s.system.load(s.lib.newGarden(T0, s.core.settings.get()));
    s.features();
    s.palmUp('right');
    s.pinch('right', seedRef(id)); // a real pinch in the old garden
    s.release('right', 'carry', seedRef(id), 'bed', cell(0, 0));
    s.system.newGarden();
    s.palmUp('right'); // the gaze asks for the next seed and lets it go over a cell, with no pinchStart between
    s.release('right', 'carry', seedRef(id), 'bed', cell(1, 1));
    expect(s.state().plants.map((p) => [p.id, p.cell])).toEqual([[id, { ring: 1, step: 1 }]]);
  });

  it('D-060 item 13: for RESTORE_WINDOW_MS after New garden the old garden comes back, plants, bed and anchor pair; a plant or the time ends it', () => {
    const s = setup();
    const old = saved([plant('a', 0, 0), plant('b', 1, 1)], [seed('s1')], {
      anchorHandle: 'h1',
      anchorLevel: 2,
      bedHeightOffset: 0.05,
    });
    s.system.load(old);
    s.features(ROOM);
    expect(s.system.canRestore).toBe(false); // no New garden yet
    const before = s.state(); // the loaded garden after this session's visit
    s.system.newGarden();
    const made = s.state();
    expect(s.system.canRestore).toBe(true);
    s.clear();
    s.time.now += RESTORE_WINDOW_MS - 1;
    s.system.restoreReplaced();
    expect(s.seen).toEqual([
      ['garden:changed', { state: before, diff: { added: ['a', 'b'], removed: [], changed: [] } }],
    ]);
    expect(s.state()).toBe(before); // the plants, the seeds, the bed height and the anchor pair, as they were
    expect(before).toMatchObject({ anchorHandle: 'h1', anchorLevel: 2, bedHeightOffset: 0.05 });
    expect(before.plants.map((p) => p.id)).toEqual(old.plants.map((p) => p.id));
    expect(s.system.canRestore).toBe(false); // once
    s.clear();
    s.system.restoreReplaced();
    expect(s.seen).toEqual([]);
    expect(made.plants).toEqual([]);

    // The window: RESTORE_WINDOW_MS on core's clock.
    s.system.newGarden();
    s.time.now += RESTORE_WINDOW_MS;
    expect(s.system.canRestore).toBe(false);
    s.system.restoreReplaced();
    expect(s.state().plants).toEqual([]);

    // A plant in the new garden ends it at once.
    s.system.newGarden();
    expect(s.system.canRestore).toBe(true);
    const id = s.state().seeds[0]!.id;
    s.palmUp('right');
    s.pinch('right', seedRef(id));
    s.release('right', 'carry', seedRef(id), 'bed', cell(2, 2));
    expect(s.state().plants).toHaveLength(1);
    expect(s.system.canRestore).toBe(false);
  });

  it('New garden before the session has its signature stops after garden:changed; the seeds come with that visit', () => {
    const s = setup();
    s.system.load(saved([plant('a', 0, 0), plant('b', 1, 1)], [seed('s1')]));
    s.clear();
    s.system.newGarden();
    expect(s.seen).toEqual([
      ['garden:changed', { state: s.state(), diff: { added: [], removed: ['a', 'b'], changed: [] } }],
    ]);
    expect(s.state()).toEqual(s.lib.newGarden(T0, s.core.settings.get()));
    expect(s.state()).not.toHaveProperty('anchorHandle');

    s.clear();
    s.features();
    expect(s.names()).toEqual([
      'room:signature',
      'garden:changed',
      'garden:seedArrived',
      'garden:seedArrived',
      'garden:seedArrived',
    ]);
    expect(s.at(0, 'room:signature').starterSeeds).toBe(true);
  });

  it('setBedHeightOffset commits the reducer: clamped, and nothing when nothing changes', () => {
    const s = setup();
    s.system.load(saved([plant('a', 0, 0)]));
    s.clear();
    s.system.setBedHeightOffset(0.05);
    expect(s.seen).toEqual([['garden:changed', { state: s.state(), diff: NO_DIFF }]]);
    expect(s.state().bedHeightOffset).toBe(0.05);

    s.system.setBedHeightOffset(0.05);
    s.system.setBedHeightOffset(Number.NaN);
    expect(s.seen).toHaveLength(1);
    s.system.setBedHeightOffset(1);
    expect(s.state().bedHeightOffset).toBe(0.1);
  });
});

describe('garden/GardenSystem: on the bus (API_SPEC §2, LLD §3.2 Bus order)', () => {
  it('subscribes first, so a later handler of the same event finds the garden already changed', () => {
    const s = setup();
    s.system.load(saved([], [], { anchorHandle: 'h1', anchorLevel: 2 }));
    const order: string[] = [];
    s.bus.on('garden:changed', () => order.push('first handler'));
    s.bus.on('garden:changed', () => order.push('second handler'));
    s.bus.on('room:bedPlaced', () => order.push(`room, pair kept: ${'anchorHandle' in s.state()}`));
    s.bedPlaced(false);
    expect(order).toEqual(['first handler', 'second handler', 'room, pair kept: false']);
  });

  it('a handler of another module that throws does not break the garden: the state and the next events stand', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const s = setup();
    const after: string[] = [];
    for (const name of ['room:signature', 'garden:changed', 'garden:seedArrived'] as const) {
      s.bus.on(name, () => {
        throw new Error(`a renderer broke on ${name}`);
      });
      s.bus.on(name, () => after.push(name));
    }
    s.system.load(s.lib.newGarden(T0, s.core.settings.get()));
    s.features();
    expect(error).toHaveBeenCalledTimes(6);
    expect(s.names()).toEqual(after);
    expect(after).toHaveLength(6);
    expect(s.state().visits).toBe(1);
    expect(s.state().seeds).toHaveLength(3);

    s.palmUp('left');
    s.release('right', 'carry', seedRef(`seed-${TODAY}-${T0}-0`), 'bed', cell(0, 0));
    expect(s.state().plants.map((p) => p.id)).toEqual([`seed-${TODAY}-${T0}-0`]);
  });

  it('known limit: a change made from inside a garden:changed handler is applied, logged at error, and told out of order', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const s = inSession(saved([plant('a', 0, 0)]));
    const heldAtEmit: (GardenState | null)[] = [];
    s.bus.on('garden:changed', () => {
      heldAtEmit.push(s.system.state);
      if (heldAtEmit.length > 1) return;
      s.system.setBedHeightOffset(0.05); // a call,
      s.release('right', 'drag', plantRef('a'), 'bed', cell(3, 3)); // and an event
    });
    const late: GardenState[] = [];
    s.bus.on('garden:changed', ({ state }) => late.push(state));

    s.release('left', 'pull', plantRef('a'), 'bed', null, 0.05);
    const changes = [0, 1, 2].map((i) => s.at(i, 'garden:changed'));
    const height = s.lib.heightAfterPull(0.5, 0.05);
    expect(s.seen).toHaveLength(3);
    expect(heldAtEmit).toEqual(changes.map((c) => c.state)); // each was replaced before it was announced (rule 6)
    expect(changes.map((c) => c.diff.changed)).toEqual([['a'], [], ['a']]);
    expect(changes.map((c) => c.state.bedHeightOffset)).toEqual([0, 0.05, 0.05]);
    expect(changes.map((c) => c.state.plants[0]?.height)).toEqual([height, height, height]);
    expect(changes.map((c) => c.state.plants[0]?.cell)).toEqual([cell(0, 0), cell(0, 0), cell(3, 3)]);
    expect(s.system.state).toBe(changes[2]?.state);
    // No queue (API_SPEC §1.10 rule 6). The bus finishes the inner events first, so a handler that subscribed
    // after the one that asked is told the outer change last: its last payload is not the newest state.
    expect(late).toEqual([changes[1]?.state, changes[2]?.state, changes[0]?.state]);
    // Each breach is logged once: here the call and the event.
    expect(error).toHaveBeenCalledTimes(2);
    expect(last(s.core.log.recent())).toMatchObject({ level: 'error', scope: 'garden' });

    s.system.setBedHeightOffset(0.02); // a change from outside any handler is none
    expect(error).toHaveBeenCalledTimes(2);
  });

  it('has no per-frame work: no update, and it listens to no event that comes every frame', () => {
    const system = new lib.GardenSystem();
    const listened = subscribed.mock.calls.map(([type]) => type);
    expect(listened.sort()).toEqual([
      'gesture:palmUp',
      'gesture:palmsOut', // T-148, Listen mode
      'gesture:pinchStart',
      'gesture:release',
      'gesture:trackingLost',
      'gesture:wake',
      'room:anchored',
      'room:bedPlaced',
      'room:features',
      'xr:sessionEnd',
      'xr:visibility',
    ]);
    expect('update' in system).toBe(false);
  });
});

describe('garden/GardenSystem: the time-lapse demo (T-174, D-057)', () => {
  const PLANTED = T0 - 1000; // a second old at the session's visit: stage 0
  /** In a session with one young plant, fake timers, and a zone of India at every instant. */
  function lapsing(over: Partial<Flags> = {}) {
    vi.useFakeTimers();
    const s = setup(over);
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(IST); // the demo's days are other instants
    s.system.load(saved([plant('p1', 0, 0, { plantedAt: PLANTED })]));
    s.features();
    s.clear();
    return s;
  }
  const grown = (s: ReturnType<typeof setup>) =>
    s.seen.filter(([name]) => name === 'garden:grown').map(([, e]) => (e as EventMap['garden:grown']).deltas);
  const stage = (state: GardenState): number => lib.stageFor(state.lastVisitAt - PLANTED);

  it('runs a simulated day a TIME_LAPSE_DAY_MS through the visit real days use: stages 1, 2, 3 at days 1, 3, 7', () => {
    const s = lapsing();
    const real = s.state();
    s.system.setTimeLapse(true);
    expect(s.system.timeLapse).toBe(true);
    vi.advanceTimersByTime(TIME_LAPSE_DAY_MS - 1);
    expect(s.seen).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(stage(s.state())).toBe(1);
    expect(s.state().lastVisitAt).toBe(T0 + DAY_MS);
    vi.advanceTimersByTime(6 * TIME_LAPSE_DAY_MS);
    expect(stage(s.state())).toBe(3);
    expect(grown(s)).toEqual([
      [{ plantId: 'p1', from: 0, to: 1 }],
      [{ plantId: 'p1', from: 1, to: 2 }],
      [{ plantId: 'p1', from: 2, to: 3 }],
    ]);
    expect(s.names().filter((name) => name === 'garden:changed')).toHaveLength(7); // one per day, drawn from it
    expect(s.system.saved).toBe(real); // the save's garden never moved
  });

  it('off: the real garden is back, the same object; nothing done meanwhile stays, and no more days pass', () => {
    const s = lapsing();
    const real = s.state();
    s.system.setTimeLapse(true);
    vi.advanceTimersByTime(3 * TIME_LAPSE_DAY_MS);
    s.palmUp('left'); // a seed the demo brought is out
    s.clear();
    s.system.setTimeLapse(false);
    expect(s.system.timeLapse).toBe(false);
    expect(s.state()).toBe(real);
    expect(s.system.saved).toBe(real);
    expect(s.names()).toEqual(['garden:seedBack', 'garden:changed']);
    vi.advanceTimersByTime(10 * TIME_LAPSE_DAY_MS);
    s.visible(false);
    s.visible(true); // a real visit again, on the real clock
    expect(s.state().lastVisitAt).toBe(T0);
    expect(grown(s)).toEqual([]);
  });

  it('a change to the bed during the demo reaches the real garden too: its anchor pair and its height are saved', () => {
    const s = lapsing();
    s.anchored('pair-1', 1);
    const real = s.state();
    s.system.setTimeLapse(true);
    vi.advanceTimersByTime(TIME_LAPSE_DAY_MS);
    s.bedPlaced(false); // Re-place: the saved pair is stale
    expect(s.system.saved).not.toBe(real);
    expect(s.system.saved).not.toHaveProperty('anchorHandle');
    expect(s.system.saved).toMatchObject({ lastVisitAt: T0 }); // the real visit, not the demo's day
    s.anchored('pair-2', 2);
    s.system.setBedHeightOffset(0.04);
    const bed = { anchorHandle: 'pair-2', anchorLevel: 2, bedHeightOffset: 0.04 };
    expect(s.system.saved).toMatchObject({ ...bed, lastVisitAt: T0, visits: real.visits });
    expect(s.state()).toMatchObject({ ...bed, lastVisitAt: T0 + DAY_MS });
    s.system.setTimeLapse(false);
    expect(s.state()).toBe(s.system.saved);
    expect(s.state()).toMatchObject(bed);
  });

  it('passes no day while the session is hidden, and the return does not catch the hidden days up', () => {
    const s = lapsing();
    s.system.setTimeLapse(true);
    vi.advanceTimersByTime(TIME_LAPSE_DAY_MS);
    s.visible(false);
    s.clear();
    vi.advanceTimersByTime(5 * TIME_LAPSE_DAY_MS);
    expect(s.seen).toEqual([]);
    s.visible(true); // the return's own visit, at the demo's day 1 still
    expect(s.state().lastVisitAt).toBe(T0 + DAY_MS);
    vi.advanceTimersByTime(TIME_LAPSE_DAY_MS);
    expect(s.state().lastVisitAt).toBe(T0 + 2 * DAY_MS);
  });

  it('starts with the garden under the timeLapse flag; a second on or off changes nothing', () => {
    const s = lapsing({ timeLapse: true });
    expect(s.system.timeLapse).toBe(true);
    const real = s.system.saved;
    s.system.setTimeLapse(true); // no second timer
    vi.advanceTimersByTime(TIME_LAPSE_DAY_MS);
    expect(s.state().lastVisitAt).toBe(T0 + DAY_MS);
    expect(s.system.saved).toBe(real);
    s.system.setTimeLapse(false);
    s.clear();
    s.system.setTimeLapse(false);
    expect(s.seen).toEqual([]);
  });

  it('passes no day before the session has had its visit', () => {
    vi.useFakeTimers();
    const s = setup();
    s.system.load(saved([plant('p1', 0, 0, { plantedAt: PLANTED })]));
    s.system.setTimeLapse(true);
    s.clear();
    vi.advanceTimersByTime(5 * TIME_LAPSE_DAY_MS);
    expect(s.seen).toEqual([]);
  });
});
