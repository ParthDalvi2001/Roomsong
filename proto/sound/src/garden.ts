// Six fixed plants for the listening review: every ring 0..4 is used and all three Phase-0 voices appear,
// so one bar moves from the low pad root up through plucks and bells and back (LLD §7, T-102).
import type { Plant } from './types';

export const FIXED_PLANTS: readonly Plant[] = [
  { id: 'pad-root', voice: 'pad', cell: { ring: 0, step: 0 }, height: 0.75, hue: 0.4, plantedAt: 0 },
  { id: 'pluck-low', voice: 'pluck', cell: { ring: 1, step: 2 }, height: 0.5, hue: 0.6, plantedAt: 0 },
  { id: 'bell-high', voice: 'bell', cell: { ring: 4, step: 4 }, height: 0.6, hue: 0.5, plantedAt: 0 },
  { id: 'pluck-mid', voice: 'pluck', cell: { ring: 2, step: 7 }, height: 0.55, hue: 0.3, plantedAt: 0 },
  { id: 'pad-fifth', voice: 'pad', cell: { ring: 3, step: 8 }, height: 0.5, hue: 0.7, plantedAt: 0 },
  { id: 'bell-low', voice: 'bell', cell: { ring: 1, step: 12 }, height: 0.45, hue: 0.5, plantedAt: 0 },
];
