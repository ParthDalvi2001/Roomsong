// Growth, the seed supply and the making of a garden (API_SPEC §1.1, LLD §5.4, FR-MUS-08, FR-MUS-09). Pure: the
// time and the zone offset come in as arguments. Nothing here reads a clock or the host's zone, or mutates its
// input.
import {
  BED_INNER,
  BED_OUTER,
  DAILY_VOICES,
  GROWTH_STAGE_DAYS,
  HUE_STEP,
  LAST_YEAR,
  MS_PER_DAY,
  MS_PER_MINUTE,
  NO_SEED_DATE,
  SEED_SUPPLY_MAX,
  STARTER_SEEDS,
  TZ_OFFSET_MAX_MIN,
} from './config.js';

import type { GardenState, GrowthDelta, RoomSignature, Seed } from './model.js';
import type { Settings } from '../core/index.js';

type Visit = { state: GardenState; grown: GrowthDelta[]; newSeeds: Seed[] };
/** A local calendar day: its date as YYYY-MM-DD, and its number in whole days from 1970-01-01. */
type Day = { date: string; index: number };

/** A seed's hue, 0..1: place `n` of the one sequence the starters and the daily seeds share. */
function hueAt(n: number): number {
  const turns = n * HUE_STEP;
  return turns - Math.floor(turns);
}

/**
 * A garden nobody has visited, and the one way to make a garden (API_SPEC §1.1). `visits` 0 is what makes it
 * new; the first applyVisit replaces the placeholder date. A `now` that is not finite counts as 0, so that
 * the garden can always be saved.
 */
export function newGarden(now: number, settings: Settings): GardenState {
  const createdAt = Number.isFinite(now) ? now : 0;
  return {
    version: 1,
    bedInner: BED_INNER,
    bedOuter: BED_OUTER,
    bedHeightOffset: 0,
    plants: [],
    seeds: [],
    lastSeedDate: NO_SEED_DATE,
    createdAt,
    lastVisitAt: createdAt,
    visits: 0,
    codex: { discovered: [] },
    settings,
  };
}

/** The growth stage at an age: 0, then 1, 2 and 3 from 1, 3 and 7 days (FR-MUS-09). A negative or NaN age is 0. */
export function stageFor(ageMs: number): 0 | 1 | 2 | 3 {
  const days = ageMs / MS_PER_DAY;
  if (days >= GROWTH_STAGE_DAYS[2]) return 3;
  if (days >= GROWTH_STAGE_DAYS[1]) return 2;
  return days >= GROWTH_STAGE_DAYS[0] ? 1 : 0;
}

/** The local day of `now` in a zone `tzOffsetMin` minutes behind UTC; null when no date string holds it. */
function localDay(now: number, tzOffsetMin: number): Day | null {
  if (!(Math.abs(tzOffsetMin) <= TZ_OFFSET_MAX_MIN)) return null; // a NaN offset too
  const localMs = now - tzOffsetMin * MS_PER_MINUTE;
  const date = new Date(localMs); // read with the UTC getters only: the host's own zone plays no part
  const year = date.getUTCFullYear();
  if (!(year >= 0 && year <= LAST_YEAR)) return null; // a time that is not finite too
  return { date: date.toISOString().slice(0, 10), index: Math.floor(localMs / MS_PER_DAY) };
}

/**
 * The seeds a visit brings (FR-MUS-08): the starters on the first visit, afterwards one on a local date later
 * than the last seed's. An id holds its date, and a date brings seeds once, so no id comes twice (D-031).
 */
function seedsFor(s: GardenState, now: number, sig: RoomSignature, day: Day): Seed[] {
  const room = SEED_SUPPLY_MAX - s.seeds.length;
  if (s.visits === 0) {
    return sig.starterVoices.slice(0, Math.max(0, room)).map((voice, i) => ({
      id: `seed-${day.date}-${i}`,
      voice,
      hue: hueAt(day.index + i),
      receivedAt: now,
    }));
  }
  // A full supply leaves lastSeedDate alone, so the day's seed still comes once there is room for it.
  if (room <= 0 || day.date <= s.lastSeedDate) return [];
  const voice = DAILY_VOICES[Math.abs(day.index) % DAILY_VOICES.length] ?? DAILY_VOICES[0];
  // The starters took STARTER_SEEDS places of the hue sequence on their day; each later day takes the next one.
  return [{ id: `seed-${day.date}`, voice, hue: hueAt(day.index + STARTER_SEEDS - 1), receivedAt: now }];
}

function visit(s: GardenState, now: number, sig: RoomSignature, tzOffsetMin: number): Visit | null {
  const day = localDay(now, tzOffsetMin);
  const hasStarters = Array.isArray(sig?.starterVoices) && sig.starterVoices.length === STARTER_SEEDS;
  if (day === null || !hasStarters) return null;
  if (!Number.isFinite(s.lastVisitAt) || !Number.isInteger(s.visits) || s.visits < 0) return null;
  // Garden time never runs backwards: after a clock set back it stands still, and no plant shrinks.
  const gardenNow = Math.max(now, s.lastVisitAt);
  const grown: GrowthDelta[] = [];
  for (const plant of s.plants) {
    const from = stageFor(s.lastVisitAt - plant.plantedAt);
    const to = stageFor(gardenNow - plant.plantedAt);
    if (to > from) grown.push({ plantId: plant.id, from, to });
  }
  const newSeeds = seedsFor(s, now, sig, day);
  const state: GardenState = { ...s, lastVisitAt: gardenNow, visits: s.visits + 1 };
  if (newSeeds.length > 0) {
    state.seeds = [...s.seeds, ...newSeeds];
    state.lastSeedDate = day.date;
  }
  return { state, grown, newSeeds };
}

/**
 * One visit (FR-MUS-08, FR-MUS-09): GardenSystem calls it when a session starts and when the page comes back
 * from a pause. `now` is ms on core's clock. `tzOffsetMin` is the device's zone at `now` in minutes, UTC minus
 * local (India −330): the caller asks the platform for it, garden/ reads no zone.
 * - Time: `lastVisitAt` becomes the later of `now` and its old value, and `visits` goes up by one. A plant's
 *   age is `state.lastVisitAt - plantedAt` everywhere, so it changes only here and a clock set back shrinks
 *   nothing. `grown` has one delta per plant whose stage rose since the last visit, however long ago that was.
 * - Seeds: a garden with `visits` 0 is new and gets one starter per voice of `sig.starterVoices`. Any other
 *   garden gets one seed when the local date of `now` is later than `lastSeedDate`, whatever the number of
 *   days in between, while the supply is below SEED_SUPPLY_MAX. A clock set back gives none and takes none.
 * No visit, which is `s` itself with two empty lists: a time or an offset that is not finite, an offset beyond
 * 16 hours, a local date outside the years 0000 to 9999, a signature whose starter voices are not a list of 3,
 * a `lastVisitAt` that is not finite, or `visits` that is not a whole number from 0. The rest of the state's
 * shape is the job of the save's validator (API_SPEC §4).
 */
export function applyVisit(s: GardenState, now: number, sig: RoomSignature, tzOffsetMin: number): Visit {
  try {
    const visited = visit(s, now, sig, tzOffsetMin);
    if (visited !== null) return visited;
  } catch {
    // a reducer never throws (API_SPEC §1.1): only a state the save's validator refuses can get here
  }
  return { state: s, grown: [], newSeeds: [] };
}
