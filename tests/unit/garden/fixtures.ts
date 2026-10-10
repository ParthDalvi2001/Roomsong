// Shared builders for the garden tests. Every state they build is deep-frozen, so a reducer that mutates its
// input throws in whichever test calls it (TC-GAR-07).
import { DEFAULT_SETTINGS } from '../../../src/core/settings.js';

import type { GardenState, Plant, Seed, VoiceType } from '../../../src/garden/index.js';

export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export function plant(id: string, ring: number, step: number, over: Partial<Plant> = {}): Plant {
  return { id, voice: 'bell', cell: { ring, step }, height: 0.5, hue: 0.25, plantedAt: 1000, ...over };
}

export function seed(id: string, voice: VoiceType = 'pad'): Seed {
  return { id, voice, hue: 0.4, receivedAt: 500 };
}

export function garden(
  plants: Plant[] = [],
  seeds: Seed[] = [],
  over: Partial<GardenState> = {},
): GardenState {
  return deepFreeze({
    version: 1,
    bedInner: 0.12,
    bedOuter: 0.3,
    bedHeightOffset: 0,
    plants,
    seeds,
    lastSeedDate: '2026-10-11',
    createdAt: 0,
    lastVisitAt: 0,
    visits: 1,
    codex: { discovered: [] },
    settings: { ...DEFAULT_SETTINGS },
    ...over,
  });
}

/** One plant in every cell of the bed, except the cells listed as `ring * 16 + step`. */
export function fullBedExcept(free: readonly number[] = []): Plant[] {
  const plants: Plant[] = [];
  for (let i = 0; i < 80; i++) if (!free.includes(i)) plants.push(plant(`p${i}`, Math.floor(i / 16), i % 16));
  return plants;
}
