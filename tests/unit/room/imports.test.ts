import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, expectTypeOf, it } from 'vitest';

import * as config from '../../../src/room/config.js';
import * as room from '../../../src/room/index.js';

import type { EventMap } from '../../../src/core/index.js';
import type { PlacementLevel, RoomFeatures } from '../../../src/garden/index.js';
import type { BedPlacement, RoomSurfaces } from '../../../src/room/index.js';

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src');
const ROOM_DIR = join(SRC_DIR, 'room');
// API_SPEC §1: room/ imports core/ and garden/, each through its index.ts.
const ALLOWED = [join(SRC_DIR, 'core', 'index.js'), join(SRC_DIR, 'garden', 'index.js')];

/** Every module a source file imports or re-exports from, static or dynamic. */
function imports(source: string): string[] {
  const found = source.matchAll(
    /\b(?:import|export)\s+(?:type\s+)?[\w\s{},*$]*?\bfrom\s*(['"])([^'"]+)\1|\bimport\s*\(?\s*(['"])([^'"]+)\3/g,
  );
  return Array.from(found, (m) => m[2] ?? m[4] ?? '');
}

/** The imports of one room file that break the rule. */
function violations(file: string, source: string): string[] {
  return imports(source).filter((spec) => {
    if (!spec.startsWith('.')) return true; // no package: the adapters use the browser's WebXR, not IWSDK or three
    const target = resolve(ROOM_DIR, dirname(file), spec);
    return !target.startsWith(ROOM_DIR + sep) && !ALLOWED.includes(target);
  });
}

const read = (file: string): string => readFileSync(join(ROOM_DIR, file), 'utf8');

describe('room/ dependency direction (API_SPEC §1)', () => {
  const files = readdirSync(ROOM_DIR, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'));

  it('no file under src/room/ imports anything but its own folder and the index of core/ and garden/', () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
    for (const file of files) expect(violations(file, read(file)), file).toEqual([]);
  });

  it('the check does catch a deep import, a module beside or above room/, the root and a package', () => {
    const caught = (source: string): boolean => violations('PlacementSolver.ts', source).length === 1;
    expect(caught("import type { Vec2 } from '../core/types.js';")).toBe(true);
    expect(caught("import { snapToCell } from '../garden/snap.js';")).toBe(true);
    expect(caught("import type { HandFrame } from '../hands/index.js';")).toBe(true);
    expect(caught("import { PlantView } from '../render/index.js';")).toBe(true);
    expect(caught("import type { World } from '../index.js';")).toBe(true);
    expect(caught("export * from '../audio/index.js';")).toBe(true);
    expect(caught("const hands = await import('../hands/index.js');")).toBe(true);
    expect(caught("import { Vector3 } from 'three';")).toBe(true);
    expect(caught("import { createSystem } from '@iwsdk/core';")).toBe(true);

    expect(violations('PlacementSolver.ts', "import { bus, log } from '../core/index.js';")).toEqual([]);
    expect(violations('events.ts', "import type { RoomFeatures } from '../garden/index.js';")).toEqual([]);
    expect(violations('PlaneAdapter.ts', "import type { RoomPlane } from './types.js';")).toEqual([]);
  });

  it('index.ts exports the public surface, and nothing else', () => {
    expect(Object.keys(room).sort()).toEqual(
      [
        'BED_CENTRE_DEFAULT_M',
        'BED_CENTRE_MAX_M',
        'BED_CENTRE_MIN_M',
        'BED_FAR_EDGE_MAX_M',
        'HitTestAdapter',
        'MeshAdapter',
        'PLANE_LEVELS_TIMEOUT_MS',
        'PlacementSolver',
        'PlaneAdapter',
      ].sort(),
    );
  });

  it('config.ts holds every placement number by value (FR-ROOM-01 and D-034, FR-ROOM-03 and D-020)', () => {
    expect({ ...config }).toEqual({
      BED_CENTRE_DEFAULT_M: 0.45,
      BED_CENTRE_MIN_M: 0.35,
      BED_CENTRE_MAX_M: 0.45,
      BED_FAR_EDGE_MAX_M: 0.75,
      TABLE_LABELS: ['table', 'desk'],
      SURFACE_MIN_HEIGHT_M: 0.5,
      SURFACE_MAX_HEIGHT_M: 1.1,
      LEVEL_MIN_COS: 0.996, // 5.1 degrees
      FLOATING_DROP_M: 0.25,
      PLANE_LEVELS_TIMEOUT_MS: 3000,
      HIT_TEST_TIMEOUT_MS: 10_000,
      EPSILON_M: 1e-6,
    });
    // index.ts hands on the same values, not copies of its own
    expect(room.BED_FAR_EDGE_MAX_M).toBe(config.BED_FAR_EDGE_MAX_M);
    expect(room.PLANE_LEVELS_TIMEOUT_MS).toBe(config.PLANE_LEVELS_TIMEOUT_MS);
  });
});

describe('room/events (API_SPEC §2)', () => {
  // Type assertions only: `npm run typecheck` is what fails when a payload drifts from the §2 table.
  it('merges the events room emits into the EventMap of core', () => {
    expectTypeOf<EventMap['room:placementLevel']>().toEqualTypeOf<{ level: PlacementLevel }>();
    expectTypeOf<EventMap['room:bedPlaced']>().toEqualTypeOf<{
      placement: BedPlacement;
      restored: boolean;
    }>();
    expectTypeOf<EventMap['room:anchored']>().toEqualTypeOf<{ handle: string; level: PlacementLevel }>();
    expectTypeOf<EventMap['room:features']>().toEqualTypeOf<{
      features: RoomFeatures;
      surfaces: RoomSurfaces;
    }>();
  });

  it('events.ts holds declarations only: type imports and the declare module block', () => {
    const rest = read('events.ts')
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
      .replace(/^import type [^;]+;$/gm, '')
      .replace(/^declare module '\.\.\/core\/index\.js' \{[\s\S]*^\}$/m, '');
    expect(rest.trim()).toBe('');
  });
});
