// TC-GAR-04 (the seed supply, FR-MUS-08) and TC-GAR-05 (growth, FR-MUS-09). Every time here is an instant
// written with its own UTC offset, and the zone is the fourth argument of applyVisit, so no test depends on the
// time zone of the machine that runs it.
import { describe, expect, it } from 'vitest';

import { createClock } from '../../../src/core/clock.js';
import { MS_PER_DAY } from '../../../src/core/config.js';
import { parseFlags } from '../../../src/core/flags.js';
import { DEFAULT_SETTINGS } from '../../../src/core/settings.js';
import {
  applyVisit,
  nearestFreeCell,
  newGarden,
  plantSeed,
  removePlant,
  SEED_SUPPLY_MAX,
  stageFor,
  undoRemove,
} from '../../../src/garden/index.js';
// The one import from above garden/: the states made here must pass the save's own check (API_SPEC §4).
import { validateState } from '../../../src/persistence/schema.js';

import { deepFreeze, garden, plant, seed } from './fixtures.js';

import type { GardenState, Result, RoomSignature } from '../../../src/garden/index.js';

// Minutes, as Date.prototype.getTimezoneOffset reports them: UTC minus local time.
const IST = -330; // India, no daylight saving
const PDT = 420; // US Pacific, summer
const PST = 480; // US Pacific, winter
const at = (iso: string): number => Date.parse(iso);

// Not the Wanderer set, so a test can tell the signature's voices from a default.
const SIG: RoomSignature = {
  keyRoot: 2,
  mode: 'minorPent',
  tempo: 84,
  reverbRt60: 0.6,
  reverbSize: 'small',
  starterVoices: ['pluck', 'choir', 'bass'],
  paletteSeed: 0x0fe2778b,
};

const DAY1 = at('2026-10-11T10:00:00+05:30');
/** A garden nobody has visited, as the app makes one. Frozen, so a reducer that writes to it throws. */
const brandNew = (createdAt = DAY1): GardenState => deepFreeze(newGarden(createdAt, { ...DEFAULT_SETTINGS }));
/** A garden whose first visit is over: no seeds, last seed on 11 October, last visit at DAY1. */
const visited = (over: Partial<GardenState> = {}): GardenState =>
  garden([], [], { createdAt: DAY1, lastVisitAt: DAY1, visits: 1, lastSeedDate: '2026-10-11', ...over });

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
  return result.value;
}

describe('garden/growth newGarden (API_SPEC §1.1)', () => {
  it('is a garden nobody has visited, with the settings it was given and no anchor', () => {
    const settings = { ...DEFAULT_SETTINGS, volume: 0.3 };
    expect(newGarden(DAY1, settings)).toEqual({
      version: 1,
      bedInner: 0.12,
      bedOuter: 0.3,
      bedHeightOffset: 0,
      plants: [],
      seeds: [],
      lastSeedDate: '1970-01-01',
      createdAt: DAY1,
      lastVisitAt: DAY1,
      visits: 0,
      codex: { discovered: [] },
      settings,
    });
  });

  it('passes the validator of the save as it is, before any visit', () => {
    const fresh = newGarden(DAY1, { ...DEFAULT_SETTINGS });
    expect(validateState(fresh)).toEqual(fresh);
  });

  it('two gardens share no list: planting in one leaves the other empty', () => {
    const [a, b] = [newGarden(DAY1, DEFAULT_SETTINGS), newGarden(DAY1, DEFAULT_SETTINGS)];
    expect(a.plants).not.toBe(b.plants);
    expect(a.seeds).not.toBe(b.seeds);
    expect(a.codex.discovered).not.toBe(b.codex.discovered);
  });

  it.each([NaN, Infinity, -Infinity])('a time of %s counts as 0, so the garden can still be saved', (now) => {
    const fresh = newGarden(now, { ...DEFAULT_SETTINGS });
    expect([fresh.createdAt, fresh.lastVisitAt]).toEqual([0, 0]);
    expect(validateState(fresh)).toEqual(fresh);
  });
});

describe('garden/growth stageFor (TC-GAR-05)', () => {
  it('stages start at 0, 1, 3 and 7 days, to the millisecond', () => {
    expect(stageFor(0)).toBe(0);
    expect(stageFor(MS_PER_DAY - 1)).toBe(0);
    expect(stageFor(MS_PER_DAY)).toBe(1);
    expect(stageFor(3 * MS_PER_DAY - 1)).toBe(1);
    expect(stageFor(3 * MS_PER_DAY)).toBe(2);
    expect(stageFor(7 * MS_PER_DAY - 1)).toBe(2);
    expect(stageFor(7 * MS_PER_DAY)).toBe(3);
    expect(stageFor(4000 * MS_PER_DAY)).toBe(3);
  });

  it('an age that is negative or not a number is stage 0; an endless one is stage 3', () => {
    expect(stageFor(-1)).toBe(0);
    expect(stageFor(-9 * MS_PER_DAY)).toBe(0);
    expect(stageFor(NaN)).toBe(0);
    expect(stageFor(-Infinity)).toBe(0);
    expect(stageFor(Infinity)).toBe(3);
  });
});

describe('garden/growth applyVisit: growth while away (TC-GAR-05, FR-MUS-09)', () => {
  // Ages at the last visit: 0.5, 1.5 and 6.5 days. A day later the first and the last have crossed a stage.
  const plants = [
    plant('young', 0, 0, { plantedAt: DAY1 - 0.5 * MS_PER_DAY }),
    plant('mid', 1, 0, { plantedAt: DAY1 - 1.5 * MS_PER_DAY }),
    plant('old', 2, 0, { plantedAt: DAY1 - 6.5 * MS_PER_DAY }),
  ];

  it('reports the stage of each plant before and after the time away, for the plants that grew', () => {
    const s = visited({ plants });
    const { state, grown } = applyVisit(s, DAY1 + MS_PER_DAY, SIG, IST);
    expect(grown).toEqual([
      { plantId: 'young', from: 0, to: 1 },
      { plantId: 'old', from: 2, to: 3 },
    ]);
    expect(state.plants).toBe(s.plants); // growth is read from plantedAt: no plant is rewritten
    expect(state.lastVisitAt).toBe(DAY1 + MS_PER_DAY);
    expect(state.visits).toBe(2);
    expect(s.visits).toBe(1); // the input is deep-frozen and untouched
  });

  it('a visit a minute later grows nothing', () => {
    expect(applyVisit(visited({ plants }), DAY1 + 60_000, SIG, IST).grown).toEqual([]);
  });

  it('a long absence gives the growth of the whole time away and loses nothing', () => {
    const s = visited({ plants, seeds: [seed('kept')] });
    const { state, grown } = applyVisit(s, DAY1 + 400 * MS_PER_DAY, SIG, IST);
    expect(grown).toEqual([
      { plantId: 'young', from: 0, to: 3 },
      { plantId: 'mid', from: 1, to: 3 },
      { plantId: 'old', from: 2, to: 3 },
    ]);
    expect(state.plants).toEqual(plants);
    expect(state.seeds.map((x) => x.id)).toContain('kept');
  });

  it('a plant put in after the last visit began starts from stage 0', () => {
    const s = visited({ plants: [plant('new', 0, 0, { plantedAt: DAY1 + 5 * 60_000 })] });
    expect(applyVisit(s, DAY1 + 2 * MS_PER_DAY, SIG, IST).grown).toEqual([
      { plantId: 'new', from: 0, to: 1 },
    ]);
  });

  it('a clock set back shrinks nothing: no delta goes down and garden time stands still', () => {
    const s = visited({ plants });
    const back = applyVisit(s, DAY1 - 30 * MS_PER_DAY, SIG, IST);
    expect(back.grown).toEqual([]);
    expect(back.state.lastVisitAt).toBe(DAY1);
    expect(back.state.plants).toBe(s.plants);
    expect(back.state.visits).toBe(2);
    // When the clock is right again, growth goes on from where the garden was.
    const again = applyVisit(back.state, DAY1 + MS_PER_DAY, SIG, IST);
    expect(again.grown).toEqual([
      { plantId: 'young', from: 0, to: 1 },
      { plantId: 'old', from: 2, to: 3 },
    ]);
  });

  it('a visit dated before the garden was created changes no plant and no seed', () => {
    const s = visited({ plants, seeds: [seed('kept')] });
    const { state, grown, newSeeds } = applyVisit(s, DAY1 - 5 * MS_PER_DAY, SIG, IST);
    expect([grown, newSeeds]).toEqual([[], []]);
    expect(state).toEqual({ ...s, visits: 2 });
  });
});

describe('garden/growth applyVisit: the first visit (FR-MUS-08)', () => {
  it("gives three starter seeds with the signature's voices, each with its own id and hue", () => {
    const { state, newSeeds, grown } = applyVisit(brandNew(), DAY1, SIG, IST);
    expect(newSeeds.map((x) => x.voice)).toEqual(['pluck', 'choir', 'bass']);
    expect(newSeeds.map((x) => x.id)).toEqual([
      `seed-2026-10-11-${DAY1}-0`,
      `seed-2026-10-11-${DAY1}-1`,
      `seed-2026-10-11-${DAY1}-2`,
    ]);
    // BUG-006: a garden made later the same day gets starters of its own ids
    const later = applyVisit(brandNew(DAY1 + 1), DAY1 + 1, SIG, IST).newSeeds.map((x) => x.id);
    expect(later).not.toEqual(newSeeds.map((x) => x.id));
    expect(later[0]).toBe(`seed-2026-10-11-${DAY1 + 1}-0`);
    expect(new Set(newSeeds.map((x) => x.hue)).size).toBe(3);
    for (const x of newSeeds) {
      expect(x.receivedAt).toBe(DAY1);
      expect(x.hue).toBeGreaterThanOrEqual(0);
      expect(x.hue).toBeLessThanOrEqual(1);
    }
    expect(state.seeds).toEqual(newSeeds);
    expect(grown).toEqual([]);
    expect([state.visits, state.lastVisitAt, state.lastSeedDate]).toEqual([1, DAY1, '2026-10-11']);
  });

  it('happens once: a second visit that day gives nothing, and no daily seed comes on day one', () => {
    const first = applyVisit(brandNew(), DAY1, SIG, IST);
    const second = applyVisit(first.state, DAY1 + 3_600_000, SIG, IST);
    expect(second.newSeeds).toEqual([]);
    expect(second.state.seeds).toBe(first.state.seeds);
    expect(second.state.visits).toBe(2);
  });

  it('an emptied garden is not a new one: no starter seeds after the first visit', () => {
    const { newSeeds } = applyVisit(visited(), DAY1 + 60_000, SIG, IST);
    expect(newSeeds).toEqual([]);
  });

  it('never fills the supply past the cap, even from a state that already holds seeds', () => {
    const held = [seed('a'), seed('b'), seed('c'), seed('d')];
    const { state, newSeeds } = applyVisit({ ...brandNew(), seeds: held }, DAY1, SIG, IST);
    expect(newSeeds.map((x) => x.voice)).toEqual(['pluck']);
    expect(state.seeds).toHaveLength(SEED_SUPPLY_MAX);
  });
});

describe('garden/growth applyVisit: the daily seed (TC-GAR-04, FR-MUS-08)', () => {
  it('gives exactly one seed on a new local day, and none on a second visit that day', () => {
    const now = at('2026-10-12T00:01:00+05:30');
    const morning = applyVisit(visited(), now, SIG, IST);
    expect(morning.newSeeds).toHaveLength(1);
    expect(morning.newSeeds[0]).toMatchObject({ id: 'seed-2026-10-12', receivedAt: now });
    expect(morning.state.seeds).toEqual(morning.newSeeds);
    expect(morning.state.lastSeedDate).toBe('2026-10-12');
    const night = applyVisit(morning.state, at('2026-10-12T23:59:00+05:30'), SIG, IST);
    expect(night.newSeeds).toEqual([]);
    expect(night.state.seeds).toBe(morning.state.seeds);
  });

  it('23:59 and 00:01 are two days, by the local date and not the UTC one', () => {
    // Both instants are 11 October in UTC (18:29 and 18:31).
    const s = visited({ lastSeedDate: '2026-10-10' });
    const late = applyVisit(s, at('2026-10-11T23:59:00+05:30'), SIG, IST);
    const early = applyVisit(late.state, at('2026-10-12T00:01:00+05:30'), SIG, IST);
    expect([late.newSeeds.length, early.newSeeds.length]).toEqual([1, 1]);
    expect([late.state.lastSeedDate, early.state.lastSeedDate]).toEqual(['2026-10-11', '2026-10-12']);
  });

  it('the same instant is another date in another zone', () => {
    const now = at('2026-10-11T20:00:00Z'); // 12 October 01:30 in India, 11 October 13:00 on the US west coast
    expect(applyVisit(visited(), now, SIG, IST).newSeeds).toHaveLength(1);
    expect(applyVisit(visited(), now, SIG, PDT).newSeeds).toEqual([]);
  });

  it('several days away give one seed, not one per missed day', () => {
    const { state, newSeeds } = applyVisit(visited(), DAY1 + 9 * MS_PER_DAY, SIG, IST);
    expect(newSeeds).toHaveLength(1);
    expect(state.lastSeedDate).toBe('2026-10-20');
  });

  it('unplanted seeds pile up to the cap of 5 and stop there', () => {
    let s = applyVisit(brandNew(), DAY1, SIG, IST).state;
    const supply: number[] = [];
    for (let day = 1; day <= 6; day++) {
      s = applyVisit(s, DAY1 + day * MS_PER_DAY, SIG, IST).state;
      supply.push(s.seeds.length);
    }
    expect(supply).toEqual([4, 5, 5, 5, 5, 5]);
    expect(SEED_SUPPLY_MAX).toBe(5);
    expect(validateState(s)).toEqual(s); // the save refuses a longer supply
  });

  it('a full supply does not use up the day: plant one, come back that day, and the seed arrives', () => {
    const five = ['a', 'b', 'c', 'd', 'e'].map((id) => seed(id));
    const full = applyVisit(visited({ seeds: five }), DAY1 + MS_PER_DAY, SIG, IST);
    expect(full.newSeeds).toEqual([]);
    expect(full.state.seeds).toBe(five);
    expect(full.state.lastSeedDate).toBe('2026-10-11');
    const planted = value(plantSeed(full.state, 'a', { ring: 0, step: 0 }, DAY1 + MS_PER_DAY));
    const later = applyVisit(planted, DAY1 + MS_PER_DAY + 3_600_000, SIG, IST);
    expect(later.newSeeds).toHaveLength(1);
    expect(later.state.seeds).toHaveLength(5);
  });

  it('a clock set back gives no extra seed and takes none away, however often it goes back and forth', () => {
    const day2 = applyVisit(visited(), DAY1 + MS_PER_DAY, SIG, IST);
    expect(day2.newSeeds).toHaveLength(1);
    const back = applyVisit(day2.state, DAY1 - 3 * MS_PER_DAY, SIG, IST);
    const forth = applyVisit(back.state, DAY1 + MS_PER_DAY + 60_000, SIG, IST);
    for (const visit of [back, forth]) {
      expect(visit.newSeeds).toEqual([]);
      expect(visit.state.seeds).toBe(day2.state.seeds);
      expect(visit.state.lastSeedDate).toBe('2026-10-12');
    }
    expect(applyVisit(forth.state, DAY1 + 2 * MS_PER_DAY, SIG, IST).newSeeds).toHaveLength(1);
  });

  it('a flight west, where the local date goes back a day, gives no second seed for that date', () => {
    const india = applyVisit(visited(), at('2026-10-12T01:00:00+05:30'), SIG, IST);
    expect(india.state.lastSeedDate).toBe('2026-10-12');
    const landed = applyVisit(india.state, at('2026-10-11T15:30:00-07:00'), SIG, PDT); // three hours later
    expect(landed.newSeeds).toEqual([]);
    expect(landed.state.lastSeedDate).toBe('2026-10-12');
    expect(landed.state.lastVisitAt).toBe(at('2026-10-11T15:30:00-07:00')); // real time did go on
  });

  it('the day the clocks go back is one day, although it lasts 25 hours', () => {
    const s = visited({ lastSeedDate: '2026-10-31' });
    const first = applyVisit(s, at('2026-11-01T00:30:00-07:00'), SIG, PDT);
    const sameDay = applyVisit(first.state, at('2026-11-01T23:30:00-08:00'), SIG, PST); // 24 hours later
    const nextDay = applyVisit(sameDay.state, at('2026-11-02T00:30:00-08:00'), SIG, PST);
    expect([first, sameDay, nextDay].map((v) => v.newSeeds.length)).toEqual([1, 0, 1]);
    expect(nextDay.state.lastSeedDate).toBe('2026-11-02');
  });

  it('the day the clocks go forward ends after 23 hours, and the next day brings its seed', () => {
    const s = visited({ lastSeedDate: '2027-03-13' });
    const first = applyVisit(s, at('2027-03-14T00:30:00-08:00'), SIG, PST);
    const nextDay = applyVisit(first.state, at('2027-03-15T00:10:00-07:00'), SIG, PDT); // 22 h 40 min later
    expect([first.newSeeds.length, nextDay.newSeeds.length]).toEqual([1, 1]);
    expect(nextDay.state.lastSeedDate).toBe('2027-03-15');
  });

  it.each([
    ['2026-10-31T23:59:00+05:30', '2026-11-01T00:01:00+05:30', '2026-11-01'],
    ['2026-12-31T23:59:00+05:30', '2027-01-01T00:01:00+05:30', '2027-01-01'],
    ['2027-02-28T23:59:00+05:30', '2027-03-01T00:01:00+05:30', '2027-03-01'],
    ['2028-02-28T23:59:00+05:30', '2028-02-29T00:01:00+05:30', '2028-02-29'], // a leap year
  ])('a month or a year ends: %s then %s is a new day, %s', (before, after, date) => {
    const eve = applyVisit(visited({ lastSeedDate: '2026-01-01' }), at(before), SIG, IST);
    const next = applyVisit(eve.state, at(after), SIG, IST);
    expect([eve.newSeeds.length, next.newSeeds.length]).toEqual([1, 1]);
    expect(eve.state.lastSeedDate).toBe(before.slice(0, 10));
    expect(next.state.lastSeedDate).toBe(date);
  });

  it('five days in a row bring the five voices that are built, each seed with another hue', () => {
    const seeds = [1, 2, 3, 4, 5].flatMap(
      (d) => applyVisit(visited(), DAY1 + d * MS_PER_DAY, SIG, IST).newSeeds,
    );
    expect(seeds.map((x) => x.voice).sort()).toEqual(['bass', 'bell', 'choir', 'pad', 'pluck']);
    expect(new Set(seeds.map((x) => x.hue)).size).toBe(5);
    for (const x of seeds) expect(x.hue >= 0 && x.hue <= 1).toBe(true);
  });

  it('the first eight seeds of a garden, three starters and five daily ones, have hues at least 0.05 apart', () => {
    const seeds = [
      ...applyVisit(brandNew(), DAY1, SIG, IST).newSeeds,
      ...[1, 2, 3, 4, 5].flatMap((d) => applyVisit(visited(), DAY1 + d * MS_PER_DAY, SIG, IST).newSeeds),
    ];
    expect(seeds).toHaveLength(8);
    const hues = seeds.map((x) => x.hue).sort((a, b) => a - b);
    for (let i = 1; i < hues.length; i++) {
      expect((hues[i] ?? 0) - (hues[i - 1] ?? 0), `${hues.join(' ')}`).toBeGreaterThanOrEqual(0.05);
    }
  });
});

describe('garden/growth applyVisit: seed ids (D-031)', () => {
  it('the same state, time and zone give the same seeds', () => {
    expect(applyVisit(brandNew(), DAY1, SIG, IST)).toEqual(applyVisit(brandNew(), DAY1, SIG, IST));
    const s = visited();
    expect(applyVisit(s, DAY1 + MS_PER_DAY, SIG, IST)).toEqual(applyVisit(s, DAY1 + MS_PER_DAY, SIG, IST));
  });

  it("a day's seed cannot come twice, also when its plant is gone from the garden", () => {
    const now = DAY1 + MS_PER_DAY;
    const got = applyVisit(visited(), now, SIG, IST);
    const id = got.newSeeds[0]?.id ?? '';
    const planted = value(plantSeed(got.state, id, { ring: 0, step: 0 }, now));
    const emptied = value(removePlant(planted, id)).state;
    expect([emptied.plants, emptied.seeds]).toEqual([[], []]); // no trace of the id is left in the state
    expect(applyVisit(emptied, now + 60_000, SIG, IST).newSeeds).toEqual([]);
  });

  it('40 days of planting, removing and undoing never reuse an id, and every state can be saved', () => {
    const issued: string[] = [];
    let s = brandNew();
    for (let day = 0; day < 40; day++) {
      const now = DAY1 + day * MS_PER_DAY;
      const visit = applyVisit(s, now, SIG, IST);
      issued.push(...visit.newSeeds.map((x) => x.id));
      s = visit.state;
      for (const x of s.seeds) {
        s = value(plantSeed(s, x.id, nearestFreeCell(s, { ring: 0, step: 0 }) ?? { ring: 0, step: 0 }, now));
      }
      // The oldest plant goes every day; every third day it is put back.
      const removed = value(removePlant(s, s.plants[0]?.id ?? ''));
      s = day % 3 === 0 ? undoRemove(removed.state, removed.undo) : removed.state;
      expect(validateState(s), `day ${day}`).toEqual(s);
    }
    expect(issued).toHaveLength(3 + 39);
    expect(new Set(issued).size).toBe(issued.length);
    for (const id of issued) expect(id.length).toBeLessThanOrEqual(64); // the save's limit for an id
  });
});

describe('garden/growth applyVisit: what the save accepts (API_SPEC §4)', () => {
  it('a brand-new garden passes the validator after its first visit', () => {
    const { state } = applyVisit(brandNew(), DAY1, SIG, IST);
    expect(validateState(state)).toEqual(state);
  });

  it('a garden passes it after several visits, with a full supply and grown plants', () => {
    let s = applyVisit(brandNew(), DAY1, SIG, IST).state;
    s = value(plantSeed(s, s.seeds[0]?.id ?? '', { ring: 2, step: 4 }, DAY1));
    for (const days of [1, 2, 3, 30, 31, 400]) s = applyVisit(s, DAY1 + days * MS_PER_DAY, SIG, IST).state;
    expect(s.seeds).toHaveLength(SEED_SUPPLY_MAX);
    expect(s.visits).toBe(7);
    expect(validateState(s)).toEqual(s);
  });
});

describe('garden/growth applyVisit: bad input', () => {
  const s = visited({
    plants: [plant('p', 0, 0, { plantedAt: DAY1 - 2 * MS_PER_DAY })],
    seeds: [seed('kept')],
  });
  const untouched = (state: GardenState): object => ({ state, grown: [], newSeeds: [] });

  // The last two are the first day after the year 9999 and the last day before the year 0000.
  const noTimes = [NaN, Infinity, -Infinity, 1e300, -1e300];
  const noDates = [at('9999-12-31T23:59:59Z') + MS_PER_DAY, at('0000-01-01T00:00:00Z') - MS_PER_DAY];
  it.each([...noTimes, ...noDates])('a time of %s changes nothing and does not throw', (now) => {
    const result = applyVisit(s, now, SIG, IST);
    expect(result).toEqual(untouched(s));
    expect(result.state).toBe(s);
  });

  it('a zone that is not a finite number, or more than 16 hours from UTC, changes nothing', () => {
    for (const zone of [NaN, Infinity, -Infinity, 961, -961, 1e9]) {
      expect(applyVisit(s, DAY1 + MS_PER_DAY, SIG, zone), `${zone}`).toEqual(untouched(s));
    }
    // The real extremes are UTC+14 (-840) and UTC-12 (720); 16 hours is the last offset taken.
    for (const zone of [-840, 720, 960, -960]) {
      expect(applyVisit(s, DAY1 + MS_PER_DAY, SIG, zone).state.visits, `${zone}`).toBe(2);
    }
  });

  it('a state of another shape comes back as it is, without a throw', () => {
    const shapes: unknown[] = [
      null,
      undefined,
      {},
      'garden',
      { ...s, plants: null },
      { ...s, plants: [null] },
      { ...s, seeds: undefined },
      { ...s, lastVisitAt: NaN },
      { ...s, lastVisitAt: '0' },
      { ...s, visits: 1.5 },
      { ...s, visits: '1' },
      { ...s, visits: -1 },
    ];
    for (const shape of shapes) {
      const broken = shape as GardenState;
      expect(applyVisit(broken, DAY1 + MS_PER_DAY, SIG, IST)).toEqual(untouched(broken));
    }
  });

  it('a signature whose starter voices are not a list of exactly 3 is no visit, for a new garden and an old one', () => {
    const fresh = brandNew();
    const signatures: unknown[] = [
      undefined,
      null,
      {},
      { ...SIG, starterVoices: [] },
      { ...SIG, starterVoices: ['bell', 'pad'] },
      { ...SIG, starterVoices: ['bell', 'pad', 'pluck', 'bass'] },
      { ...SIG, starterVoices: 'abc' }, // three long, but no list
    ];
    for (const signature of signatures) {
      const sig = signature as RoomSignature;
      expect(applyVisit(fresh, DAY1, sig, IST), JSON.stringify(signature)).toEqual(untouched(fresh));
      expect(applyVisit(s, DAY1 + MS_PER_DAY, sig, IST), JSON.stringify(signature)).toEqual(untouched(s));
    }
    // The garden stayed new, so the next visit, with a signature, still brings the starters.
    expect(applyVisit(fresh, DAY1, SIG, IST).newSeeds).toHaveLength(3);
  });

  it('a last seed date that is no date is repaired by the next seed', () => {
    const { state, newSeeds } = applyVisit(visited({ lastSeedDate: '' }), DAY1, SIG, IST);
    expect(newSeeds).toHaveLength(1);
    expect(state.lastSeedDate).toBe('2026-10-11');
  });
});

describe('the fakeDay flag (FR-MUS-09; TC-E2E-06 at unit level)', () => {
  it("a clock moved one day on by core's flag brings stage 1 and one new seed", () => {
    const { fakeDay } = parseFlags('?flags=fakeDay=+1', true);
    const real = createClock(() => DAY1);
    const moved = createClock(() => DAY1, fakeDay * MS_PER_DAY);
    let s = applyVisit(brandNew(), real.now(), SIG, IST).state;
    const id = s.seeds[0]?.id ?? '';
    s = value(plantSeed(s, id, { ring: 0, step: 0 }, real.now()));

    const { state, grown, newSeeds } = applyVisit(s, moved.now(), SIG, IST);
    expect(grown).toEqual([{ plantId: id, from: 0, to: 1 }]);
    expect(newSeeds).toHaveLength(1);
    expect(state.lastSeedDate).toBe('2026-10-12');
  });
});
