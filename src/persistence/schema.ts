// Schema version 1 of the saved garden and its validator (API_SPEC §4, LLD §6): hand-written, no schema library.
// This is the trust boundary for everything read from disk. The rule: a value the app could not have written is
// corrupt and the whole state is refused, except where the contract names a repair: the settings (core's
// validateSettings) and the anchor pair. The stored type is garden's GardenState, whose `version` is 1.
import { validateSettings } from '../core/index.js';
import { BED_INNER, BED_OUTER, cellCentre, RINGS, snapToCell, STEPS } from '../garden/index.js';

import { BED_HEIGHT_OFFSET_MAX_M, ID_MAX_LENGTH, SEED_SUPPLY_MAX } from './config.js';

import type { Cell, GardenState, Plant, Seed, VoiceType } from '../garden/index.js';

type Raw = Record<string, unknown>;

// Written as a record so that a voice added to, or cut from, VoiceType fails to compile here.
const VOICES = Object.keys({
  bell: 0,
  pad: 0,
  pluck: 0,
  bass: 0,
  choir: 0,
  shimmer: 0,
} satisfies Record<VoiceType, 0>);
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/; // YYYY-MM-DD; a day 31 passes in any month
const centre = { x: 0, y: 0 }; // scratch of cellOf

const isRaw = (v: unknown): v is Raw => typeof v === 'object' && v !== null;
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isUnit = (v: unknown): v is number => isNumber(v) && v >= 0 && v <= 1;
const isId = (v: unknown): v is string => typeof v === 'string' && v !== '' && v.length <= ID_MAX_LENGTH;
const isVoice = (v: unknown): v is VoiceType => typeof v === 'string' && VOICES.includes(v);

/** garden's shared frozen Cell for a stored cell; null when that is not a cell of the bed. */
function cellOf(raw: unknown): Cell | null {
  if (!isRaw(raw) || typeof raw.ring !== 'number' || typeof raw.step !== 'number') return null;
  // garden/ says what a cell is: only a cell of the bed comes back from its own centre unchanged. A ring 5 of
  // the old 7-ring layout snaps to ring 4, a ring 6 lies off the bed, a fraction snaps to a whole number.
  const cell = snapToCell(cellCentre({ ring: raw.ring, step: raw.step }, centre));
  return cell !== null && cell.ring === raw.ring && cell.step === raw.step ? cell : null;
}

function plantOf(raw: unknown): Plant | null {
  if (!isRaw(raw)) return null;
  const { id, voice, height, hue, plantedAt } = raw;
  const cell = cellOf(raw.cell);
  if (!isId(id) || !isVoice(voice) || cell === null) return null;
  if (!isUnit(height) || !isUnit(hue) || !isNumber(plantedAt)) return null;
  return { id, voice, cell, height, hue, plantedAt };
}

function seedOf(raw: unknown): Seed | null {
  if (!isRaw(raw)) return null;
  const { id, voice, hue, receivedAt } = raw;
  if (!isId(id) || !isVoice(voice) || !isUnit(hue) || !isNumber(receivedAt)) return null;
  return { id, voice, hue, receivedAt };
}

/**
 * A copy of the list with every item validated; null when it is not an array, is longer than `max` (checked
 * first, so an oversized list costs nothing) or one item is refused.
 */
function listOf<T>(raw: unknown, max: number, itemOf: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(raw) || raw.length > max) return null;
  const list: T[] = [];
  for (const item of raw as unknown[]) {
    const valid = itemOf(item);
    if (valid === null) return null;
    list.push(valid);
  }
  return list;
}

/**
 * One plant per cell (FR-MUS-01), and one id per plant and seed: a plant takes its seed's id (D-031), so a seed
 * that shares a plant's id would grow a second plant with it. The cells are garden's shared objects, one per
 * cell, so a Set tells two plants in one cell apart from two plants.
 */
function isDistinct(plants: readonly Plant[], seeds: readonly Seed[]): boolean {
  const cells = new Set(plants.map((p) => p.cell));
  const ids = new Set([...plants, ...seeds].map((x) => x.id));
  return cells.size === plants.length && ids.size === plants.length + seeds.length;
}

/** `codex.discovered`: voices, each at most once. */
function discoveredOf(codex: unknown): VoiceType[] | null {
  if (!isRaw(codex)) return null;
  const list = listOf(codex.discovered, VOICES.length, (v) => (isVoice(v) ? v : null));
  return list !== null && new Set(list).size === list.length ? list : null;
}

/** The anchor pair, or nothing: a handle with no valid level is dropped and the bed is placed again (FR-ROOM-07). */
function anchorOf(raw: Raw): Pick<GardenState, 'anchorHandle' | 'anchorLevel'> {
  const { anchorHandle, anchorLevel } = raw;
  const isLevel = anchorLevel === 1 || anchorLevel === 2 || anchorLevel === 3 || anchorLevel === 4;
  return isId(anchorHandle) && isLevel ? { anchorHandle, anchorLevel } : {};
}

function stateOf(raw: unknown): GardenState | null {
  if (!isRaw(raw) || raw.version !== 1) return null;
  if (raw.bedInner !== BED_INNER || raw.bedOuter !== BED_OUTER) return null; // another bed: its cells are not ours
  const { bedHeightOffset, lastSeedDate, createdAt, lastVisitAt, visits } = raw;
  if (!isNumber(bedHeightOffset) || Math.abs(bedHeightOffset) > BED_HEIGHT_OFFSET_MAX_M) return null;
  if (typeof lastSeedDate !== 'string' || !DATE.test(lastSeedDate)) return null;
  if (!isNumber(createdAt) || !isNumber(lastVisitAt)) return null;
  if (!isNumber(visits) || !Number.isInteger(visits) || visits < 0) return null;
  const plants = listOf(raw.plants, RINGS * STEPS, plantOf);
  const seeds = listOf(raw.seeds, SEED_SUPPLY_MAX, seedOf);
  const discovered = discoveredOf(raw.codex);
  if (plants === null || seeds === null || discovered === null || !isDistinct(plants, seeds)) return null;
  return {
    version: 1,
    bedInner: BED_INNER,
    bedOuter: BED_OUTER,
    bedHeightOffset,
    plants,
    seeds,
    lastSeedDate,
    createdAt,
    lastVisitAt,
    visits,
    codex: { discovered },
    ...anchorOf(raw),
    settings: validateSettings(raw.settings),
  };
}

/**
 * A valid GardenState built from anything, or null (FR-PER-02). Never throws and never changes `raw`. The result
 * is a new object that holds the fields of the schema and no other, so a key that is not part of it (the room
 * signature, FR-ROOM-13) is neither loaded nor saved. Refused: a wrong version, a missing field, a wrong type, a
 * number that is not finite or out of range, a plant off the bed, two plants in one cell, a repeated id, a list
 * or an id over its size bound. The full list is API_SPEC §4.
 */
export function validateState(raw: unknown): GardenState | null {
  try {
    return stateOf(raw);
  } catch {
    return null; // only a throwing getter or proxy gets here; stored data has neither
  }
}
