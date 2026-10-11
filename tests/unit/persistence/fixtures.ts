// Shared by the persistence tests: an in-memory Backend (the adapter Store.ts keeps IndexedDB behind), a valid
// saved state, and every way that state can be corrupt (TC-PER-02, TC-PER-04).
import { DEFAULT_SETTINGS } from '../../../src/core/index.js';
import { garden, plant, seed } from '../garden/fixtures.js';

import type { GardenState } from '../../../src/garden/index.js';
import type { Backend } from '../../../src/persistence/Store.js';

export interface MemoryBackend extends Backend {
  readonly data: Map<string, unknown>;
  /** The calls that reject, by name. */
  readonly failing: Set<keyof Backend>;
}

/** Like IndexedDB, it keeps and returns a structured clone, so a test cannot pass through a shared reference. */
export function memoryBackend(): MemoryBackend {
  const data = new Map<string, unknown>();
  const failing = new Set<keyof Backend>();
  const call = <T>(name: keyof Backend, op: () => T): Promise<T> =>
    failing.has(name) ? Promise.reject(new Error(`${name} failed`)) : Promise.resolve().then(op);
  return {
    data,
    failing,
    get: (key) => call('get', () => structuredClone(data.get(key))),
    set: (key, value) => call('set', () => void data.set(key, structuredClone(value))),
    delete: (key) => call('delete', () => void data.delete(key)),
    keys: () => call('keys', () => [...data.keys()]),
  };
}

/** A valid version-1 state that uses every field: two plants, a seed, the anchor pair, a non-default setting. */
export function savedGarden(over: Partial<GardenState> = {}): GardenState {
  return garden([plant('s1', 0, 0), plant('s2', 4, 15, { voice: 'pad', height: 1 })], [seed('s3')], {
    bedHeightOffset: 0.05,
    createdAt: 1_760_000_000_000,
    lastVisitAt: 1_760_100_000_000,
    visits: 3,
    codex: { discovered: ['bell', 'pad'] },
    anchorHandle: 'anchor-uuid',
    anchorLevel: 2,
    settings: { ...DEFAULT_SETTINGS, dwellMs: 1200, volume: 0.5 },
    ...over,
  });
}

/** A shallow copy without one key. */
export function omit(value: object, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([k]) => k !== key));
}

const base = savedGarden();
const withPlant = (patch: Record<string, unknown>): unknown => ({
  ...base,
  plants: [{ ...base.plants[0], ...patch }, ...base.plants.slice(1)],
});
const withSeed = (patch: Record<string, unknown>): unknown => ({
  ...base,
  seeds: [{ ...base.seeds[0], ...patch }],
});
const without = (key: keyof GardenState): Record<string, unknown> => omit(base, key);
const cell = (ring: unknown, step: unknown): unknown => withPlant({ cell: { ring, step } });

/** [what is wrong, the stored value]. Each one must load as "corrupt": a backup and a new garden, no throw. */
export const CORRUPT: [string, unknown][] = [
  ['not an object: a string (corrupt JSON)', '{"version":1,"plants":[{'],
  ['not an object: a number', 42],
  ['not an object: null', null],
  ['an array', [base]],
  ['an empty object', {}],
  ['version 0', { ...base, version: 0 }],
  ['version 2 (unknown)', { ...base, version: 2 }],
  ['version as a string', { ...base, version: '1' }],
  ['no version', without('version')],
  ['bedRadius of the old layout', { ...omit(without('bedInner'), 'bedOuter'), bedRadius: 0.3 }],
  ['no bedInner', without('bedInner')],
  ['no bedOuter', without('bedOuter')],
  ['another bedInner', { ...base, bedInner: 0.1 }],
  ['another bedOuter', { ...base, bedOuter: 0.35 }],
  ['bedHeightOffset NaN', { ...base, bedHeightOffset: Number.NaN }],
  ['bedHeightOffset as a string', { ...base, bedHeightOffset: '0' }],
  ['bedHeightOffset above +0.10 m', { ...base, bedHeightOffset: 0.11 }],
  ['bedHeightOffset below -0.10 m', { ...base, bedHeightOffset: -0.11 }],
  ['no bedHeightOffset', without('bedHeightOffset')],
  ['no plants', without('plants')],
  ['plants not an array', { ...base, plants: { 0: base.plants[0] } }],
  ['a plant that is null', { ...base, plants: [null] }],
  ['ring 5 (old 7-ring layout)', cell(5, 0)],
  ['ring 6 (old 7-ring layout)', cell(6, 0)],
  ['ring -1', cell(-1, 0)],
  ['ring between two rings', cell(1.5, 0)],
  ['ring NaN', cell(Number.NaN, 0)],
  ['ring as a string', cell('2', 0)],
  ['step 16', cell(0, 16)],
  ['step -1', cell(0, -1)],
  ['step between two steps', cell(0, 2.5)],
  ['step Infinity', cell(0, Number.POSITIVE_INFINITY)],
  ['no step', withPlant({ cell: { ring: 0 } })],
  ['no cell', withPlant({ cell: undefined })],
  ['plantedAt NaN', withPlant({ plantedAt: Number.NaN })],
  ['plantedAt Infinity', withPlant({ plantedAt: Number.POSITIVE_INFINITY })],
  ['plantedAt as a string', withPlant({ plantedAt: '1000' })],
  ['plantedAt null (a NaN that went through JSON)', withPlant({ plantedAt: null })],
  ['plant height above 1', withPlant({ height: 1.2 })],
  ['plant height below 0', withPlant({ height: -0.1 })],
  ['plant height NaN', withPlant({ height: Number.NaN })],
  ['plant hue above 1', withPlant({ hue: 1.5 })],
  ['plant hue as a string', withPlant({ hue: '0.2' })],
  ['an unknown voice', withPlant({ voice: 'kazoo' })],
  ['a voice named like an Object.prototype key', withPlant({ voice: 'constructor' })],
  ['plant id empty', withPlant({ id: '' })],
  ['plant id a number', withPlant({ id: 7 })],
  ['two plants in one cell', { ...base, plants: [plant('a', 2, 3), plant('b', 2, 3)] }],
  ['two plants with one id', { ...base, plants: [plant('a', 2, 3), plant('a', 2, 4)] }],
  ['a seed with the id of a plant', withSeed({ id: 's1' })],
  ['two seeds with one id', { ...base, seeds: [seed('x'), seed('x')] }],
  ['no seeds', without('seeds')],
  ['seeds not an array', { ...base, seeds: 'none' }],
  ['seed receivedAt NaN', withSeed({ receivedAt: Number.NaN })],
  ['seed hue above 1', withSeed({ hue: 2 })],
  ['seed with an unknown voice', withSeed({ voice: 'drum' })],
  ['seed id missing', withSeed({ id: undefined })],
  ['lastSeedDate a number', { ...base, lastSeedDate: 20261011 }],
  ['lastSeedDate not a date', { ...base, lastSeedDate: 'yesterday' }],
  ['lastSeedDate month 13', { ...base, lastSeedDate: '2026-13-01' }],
  ['lastSeedDate day 00', { ...base, lastSeedDate: '2026-10-00' }],
  ['lastSeedDate with a tail', { ...base, lastSeedDate: '2026-10-11x' }],
  ['lastSeedDate with a head', { ...base, lastSeedDate: 'x2026-10-11' }],
  ['a plant id of 65 characters', withPlant({ id: 'p'.repeat(65) })],
  ['a seed id of 65 characters', withSeed({ id: 's'.repeat(65) })],
  ['6 seeds (FR-MUS-08: 5 at most)', { ...base, seeds: [1, 2, 3, 4, 5, 6].map((i) => seed(`n${i}`)) }],
  ['codex with a voice twice', { ...base, codex: { discovered: ['bell', 'pad', 'bell'] } }],
  ['createdAt NaN', { ...base, createdAt: Number.NaN }],
  ['lastVisitAt Infinity', { ...base, lastVisitAt: Number.NEGATIVE_INFINITY }],
  ['visits negative', { ...base, visits: -1 }],
  ['visits not whole', { ...base, visits: 1.5 }],
  ['visits as a string', { ...base, visits: '3' }],
  ['no codex', without('codex')],
  ['codex.discovered not an array', { ...base, codex: { discovered: 'bell' } }],
  ['codex with an unknown voice', { ...base, codex: { discovered: ['bell', 'kazoo'] } }],
];
