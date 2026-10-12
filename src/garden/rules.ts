// The pure reducers of planting and shaping (API_SPEC §1.1). None mutates its input, reads a clock or throws
// on a bad argument. A refusal is a Result; where the contract returns a GardenState, a call that changes
// nothing returns the state it was given (the same reference), which is how a caller tells.
import { BED_HEIGHT_OFFSET_MAX_M, NEW_PLANT_HEIGHT, PULL_RANGE_M, RINGS, STEPS } from './config.js';
import { cellAt } from './snap.js';

import type { Cell, GardenState, PlacementLevel, Plant, Result, UndoToken } from './model.js';

const CELL_COUNT = RINGS * STEPS;
// Scratch of nearestFreeCell, which runs per frame while a hand hovers and so allocates nothing.
// A mark, per cell index ring * STEPS + step: 0 = free, 1 = taken, 2 = taken and already queued.
const marks = new Uint8Array(CELL_COUNT);
const queue = new Uint8Array(CELL_COUNT);

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

function plantIn(s: GardenState, cell: Cell): Plant | undefined {
  return s.plants.find((p) => p.cell.ring === cell.ring && p.cell.step === cell.step);
}

function withPlant(s: GardenState, old: Plant, next: Plant): GardenState {
  return { ...s, plants: s.plants.map((p) => (p === old ? next : p)) };
}

/**
 * Plants a seed of the supply in a cell (FR-MUS-01). The plant takes the seed's id, voice and hue, and `now`
 * (ms on core's clock) as plantedAt; seed ids are never reused (D-031).
 * `notFound`: the cell is not on the bed.
 */
export function plantSeed(s: GardenState, seedId: string, cell: Cell, now: number): Result<GardenState> {
  const seed = s.seeds.find((x) => x.id === seedId);
  if (seed === undefined) return { ok: false, reason: 'noSeed' };
  const target = cellAt(cell.ring, cell.step);
  if (target === null) return { ok: false, reason: 'notFound' };
  const free = nearestFreeCell(s, target); // the one definition of taken and full: the search's own
  if (free === null) return { ok: false, reason: 'full' };
  if (free !== target) return { ok: false, reason: 'occupied' };
  const plant: Plant = {
    id: seed.id,
    voice: seed.voice,
    cell: target,
    height: NEW_PLANT_HEIGHT,
    hue: seed.hue,
    plantedAt: now,
  };
  return {
    ok: true,
    value: { ...s, plants: [...s.plants, plant], seeds: s.seeds.filter((x) => x !== seed) },
  };
}

/** Moves a plant to a free cell (FR-HND-10). Its own cell is allowed and changes nothing. */
export function movePlant(s: GardenState, plantId: string, cell: Cell): Result<GardenState> {
  const plant = s.plants.find((p) => p.id === plantId);
  const target = cellAt(cell.ring, cell.step);
  if (plant === undefined || target === null) return { ok: false, reason: 'notFound' };
  const holder = plantIn(s, target);
  if (holder === plant) return { ok: true, value: s };
  if (holder !== undefined) return { ok: false, reason: 'occupied' };
  return { ok: true, value: withPlant(s, plant, { ...plant, cell: target }) };
}

/** Sets a plant's height, clamped to 0..1 (FR-HND-08). An unknown plant or a NaN changes nothing. */
export function setHeight(s: GardenState, plantId: string, height: number): GardenState {
  const plant = s.plants.find((p) => p.id === plantId);
  if (plant === undefined || Number.isNaN(height) || clamp01(height) === plant.height) return s;
  return withPlant(s, plant, { ...plant, height: clamp01(height) });
}

/** The height after a vertical pull of `dy` metres, clamped (FR-HND-08). A NaN travel counts as none. */
export function heightAfterPull(height: number, dy: number): number {
  return clamp01(Number.isNaN(dy) ? height : height + dy / PULL_RANGE_M);
}

/**
 * Removes a plant and hands it back as the undo token (FR-HND-11). The token's 5 s life (FR-MUS-12) is kept
 * by GardenSystem: no reducer has a clock. `notFound`: no such plant.
 */
export function removePlant(
  s: GardenState,
  plantId: string,
): Result<{ state: GardenState; undo: UndoToken }> {
  const plant = s.plants.find((p) => p.id === plantId);
  if (plant === undefined) return { ok: false, reason: 'notFound' };
  return {
    ok: true,
    value: { state: { ...s, plants: s.plants.filter((p) => p !== plant) }, undo: { plant } },
  };
}

/**
 * Puts a removed plant back as it was (FR-MUS-12). Undo keeps the plant (D-031): if its cell was taken in the
 * meantime it comes back on the nearest free cell. Nothing changes when it is already back, the bed is full
 * or its cell is not on the bed.
 */
export function undoRemove(s: GardenState, token: UndoToken): GardenState {
  const { plant } = token;
  const home = cellAt(plant.cell.ring, plant.cell.step);
  if (home === null || s.plants.some((p) => p.id === plant.id)) return s;
  const cell = nearestFreeCell(s, home);
  if (cell === null) return s;
  return { ...s, plants: [...s.plants, cell === home ? plant : { ...plant, cell }] };
}

/**
 * Stores the saved anchor pair, or with null removes both fields (FR-ROOM-07). It does not validate the pair:
 * the persistence validator does (API_SPEC §4).
 */
export function setAnchor(
  s: GardenState,
  anchor: { handle: string; level: PlacementLevel } | null,
): GardenState {
  if (anchor !== null) {
    if (s.anchorHandle === anchor.handle && s.anchorLevel === anchor.level) return s;
    return { ...s, anchorHandle: anchor.handle, anchorLevel: anchor.level };
  }
  if (!('anchorHandle' in s) && !('anchorLevel' in s)) return s;
  const next = { ...s };
  delete next.anchorHandle;
  delete next.anchorLevel;
  return next;
}

/**
 * Sets how far the bed is raised or lowered, in metres, clamped to 10 cm either way (FR-UI-10). No plant moves:
 * a cell is a place on the bed, whatever its height. A value that is not finite changes nothing.
 */
export function setBedHeightOffset(s: GardenState, metres: number): GardenState {
  if (!Number.isFinite(metres)) return s;
  // `+ 0`: a -0 would be stored as it is, and it is not the 0 a new garden has
  const offset = Math.min(BED_HEIGHT_OFFSET_MAX_M, Math.max(-BED_HEIGHT_OFFSET_MAX_M, metres)) + 0;
  return offset === s.bedHeightOffset ? s : { ...s, bedHeightOffset: offset };
}

/** Neighbour `k` of cell index `i`, in search order: ring+1, ring-1, step+1, step-1. -1 = off the bed. */
function neighbour(i: number, k: number): number {
  if (k === 0) return i + STEPS < CELL_COUNT ? i + STEPS : -1;
  if (k === 1) return i - STEPS; // negative on the inner ring
  const step = i % STEPS;
  return i - step + ((step + (k === 2 ? 1 : STEPS - 1)) % STEPS); // the steps wrap: 15 and 0 are neighbours
}

function markTaken(s: GardenState, ignorePlantId: string | undefined): void {
  marks.fill(0);
  for (let i = 0; i < s.plants.length; i++) {
    const plant = s.plants[i];
    if (plant === undefined || plant.id === ignorePlantId) continue;
    const cell = cellAt(plant.cell.ring, plant.cell.step);
    if (cell !== null) marks[cell.ring * STEPS + cell.step] = 1;
  }
}

/**
 * The free cell nearest to `cell` on the grid, so that a cell never holds two plants (FR-MUS-01) and a
 * release commits the cell that was shown (FR-HND-16): `cell` when it is free, else a breadth-first search
 * over ring±1 and step±1 (LLD §5.1). With `ignorePlantId` that plant's own cell counts as free (a drag).
 * null = the bed is full, or `cell` is not on the bed. Returns a shared frozen Cell.
 */
export function nearestFreeCell(s: GardenState, cell: Cell, ignorePlantId?: string): Cell | null {
  const start = cellAt(cell.ring, cell.step);
  if (start === null) return null;
  markTaken(s, ignorePlantId);
  const first = start.ring * STEPS + start.step;
  if (marks[first] === 0) return start;
  marks[first] = 2;
  queue[0] = first;
  for (let head = 0, tail = 1; head < tail; head++) {
    const i = queue[head] ?? 0;
    for (let k = 0; k < 4; k++) {
      const n = neighbour(i, k);
      if (n < 0 || marks[n] === 2) continue;
      if (marks[n] === 0) return cellAt(Math.floor(n / STEPS), n % STEPS);
      marks[n] = 2;
      queue[tail++] = n;
    }
  }
  return null;
}
