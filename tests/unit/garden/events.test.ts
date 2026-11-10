import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, expectTypeOf, it } from 'vitest';

import type { EventMap, Hand } from '../../../src/core/index.js';
import type { GardenState, GrowthDelta, RoomSignature, Seed, UndoToken } from '../../../src/garden/index.js';

describe('garden/events (API_SPEC §2)', () => {
  // Type assertions only: `npm run typecheck` is what fails when a payload drifts from the §2 table.
  it('merges the events garden emits into the EventMap of core', () => {
    expectTypeOf<EventMap['garden:changed']['state']>().toEqualTypeOf<GardenState>();
    expectTypeOf<EventMap['garden:changed']['diff']>().toEqualTypeOf<{
      added: readonly string[];
      removed: readonly string[];
      changed: readonly string[];
    }>();
    expectTypeOf<EventMap['garden:removed']>().toEqualTypeOf<{
      plantId: string;
      undoToken: UndoToken;
      expiresAt: number;
    }>();
    expectTypeOf<EventMap['garden:grown']>().toEqualTypeOf<{ deltas: readonly GrowthDelta[] }>();
    expectTypeOf<EventMap['garden:seedArrived']>().toEqualTypeOf<{ seed: Seed }>();
    expectTypeOf<EventMap['garden:seedOut']>().toEqualTypeOf<{ seed: Seed; hand: Hand }>();
    expectTypeOf<EventMap['garden:seedBack']>().toEqualTypeOf<{
      seedId: string;
      reason: 'offBed' | 'full' | 'lost' | 'reset';
    }>();
    expectTypeOf<EventMap['room:signature']>().toEqualTypeOf<{
      signature: RoomSignature;
      starterSeeds: boolean;
    }>();
    expectTypeOf<EventMap['listen:enter']>().toEqualTypeOf<Record<string, never>>();
    expectTypeOf<EventMap['listen:exit']>().toEqualTypeOf<{ timedOut: boolean }>();
  });

  it('events.ts holds declarations only: type imports and the declare module block', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../../src/garden/events.ts', import.meta.url)),
      'utf8',
    );
    const rest = source
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
      .replace(/^import type [^;]+;$/gm, '')
      .replace(/^declare module '\.\.\/core\/index\.js' \{[\s\S]*^\}$/m, '');
    expect(rest.trim()).toBe('');
  });
});
