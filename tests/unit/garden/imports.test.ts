import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as garden from '../../../src/garden/index.js';

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src');
const GARDEN_DIR = join(SRC_DIR, 'garden');
const CORE_INDEX = join(SRC_DIR, 'core', 'index.js');
// API_SPEC §1: the one garden file that is an ECS system; it may load core's bus, log and flags.
const SYSTEM_FILE = 'GardenSystem.ts';

/** Every module a source file imports or re-exports from, and whether the whole statement is type-only. */
function imports(source: string): { spec: string; typeOnly: boolean }[] {
  const found = source.matchAll(
    /\b(?:import|export)\s+(type\s+)?[\w\s{},*$]*?\bfrom\s*(['"])([^'"]+)\2|\bimport\s*\(?\s*(['"])([^'"]+)\4/g,
  );
  return Array.from(found, (m) => ({ spec: m[3] ?? m[5] ?? '', typeOnly: m[1] !== undefined }));
}

/** The imports of one garden file that break the rule: its own folder, plus `import type` from core/index. */
function violations(file: string, source: string): string[] {
  const bad = imports(source).filter(({ spec, typeOnly }) => {
    if (!spec.startsWith('.')) return true; // no package at all: not three, not @iwsdk/core
    const target = resolve(GARDEN_DIR, dirname(file), spec);
    if (target.startsWith(GARDEN_DIR + sep)) return false;
    return target !== CORE_INDEX || !(typeOnly || file === SYSTEM_FILE);
  });
  return bad.map(({ spec }) => spec);
}

describe('garden/ dependency direction and purity (API_SPEC §1)', () => {
  const files = readdirSync(GARDEN_DIR, { recursive: true, encoding: 'utf8' }).filter((f) =>
    f.endsWith('.ts'),
  );
  const read = (file: string): string => readFileSync(join(GARDEN_DIR, file), 'utf8');

  it('no file under src/garden/ loads anything from outside the folder; core gives it types only', () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const file of files) expect(violations(file, read(file)), file).toEqual([]);
  });

  it('the check does catch a runtime core import, a deep import, another folder and a package', () => {
    const caught = (source: string, file = 'rules.ts'): boolean => violations(file, source).length === 1;
    expect(caught("import { bus } from '../core/index.js';")).toBe(true);
    expect(caught("import { type Vec2 } from '../core/index.js';")).toBe(true);
    expect(caught("export * from '../core/index.js';")).toBe(true);
    expect(caught("import '../core/index.js';")).toBe(true);
    expect(caught("const core = await import('../core/index.js');")).toBe(true);
    expect(caught("import type { Vec2 } from '../core/types.js';")).toBe(true);
    expect(caught("import type { AudioEngine } from '../audio/index.js';")).toBe(true);
    expect(caught("import type { World } from '../index.js';")).toBe(true);
    expect(caught("import { Vector3 } from 'three';")).toBe(true);
    expect(caught("import type { Entity } from '@iwsdk/core';")).toBe(true);
    expect(caught("import { log } from '../audio/index.js';", SYSTEM_FILE)).toBe(true);

    expect(violations('rules.ts', "import type { Vec2 } from '../core/index.js';")).toEqual([]);
    expect(violations('rules.ts', "export type { Settings } from '../core/index.js';")).toEqual([]);
    expect(violations('rules.ts', "import { cellAt } from './snap.js';")).toEqual([]);
    expect(violations(SYSTEM_FILE, "import { bus, log } from '../core/index.js';")).toEqual([]);
    expect(violations('model.ts', "export type VoiceType = 'bell' | 'pad';")).toEqual([]);
  });

  // The one use of Date that passes is the exact text `new Date(localMs)`: the calendar of a time that was passed
  // in, read with the UTC getters (growth.ts). Every other construction is taken for the clock, and the readers
  // of the host's time zone are banned by name. The guard catches accidents, not intent. It knowingly misses
  // `Date()` without `new`, `Reflect.construct(Date, [])`, `new (Date)()`, `new globalThis.Date()`, an alias of
  // Date, a value named localMs that came from a clock, and toString() or toDateString() on a Date, which print
  // local time.
  const IMPURE =
    /\bDate\.(?:now|parse)\b|\bnew Date\b(?!\(localMs\))|\bMath\.random\b|\bperformance\.now\b|getTimezoneOffset|\.get(?:FullYear|Year|Month|Date|Day|Hours|Minutes)\(|toLocale|\bIntl\./;

  it('the pure files read no clock, no random source and no host time zone: all come in as arguments', () => {
    for (const file of files) if (file !== SYSTEM_FILE) expect(IMPURE.test(read(file)), file).toBe(false);
  });

  it('the check does catch the clock, the random source and the readers of the host zone', () => {
    const caught = [
      'new Date()',
      'new Date( )',
      'new Date;',
      'Date.now()',
      'performance.now()',
      'Math.random()',
      'new Date(...[])',
      'new Date(/* now */)',
      'new Date(// now\n)',
      'new Date(ms).getDate()',
      'new Date(y, m, d)',
      'new Date (localMs)',
      'new Date(localMs, 1)',
      'new Date(localMs).getDate()',
      'new Date(localMs).getHours()',
      'x.toLocaleDateString()',
      'x.getTimezoneOffset()',
      "Date.parse('2026-10-11T10:00')",
      'new Intl.DateTimeFormat()',
    ];
    for (const source of caught) expect(IMPURE.test(source), source).toBe(true);
    const passes = [
      'new Date(localMs).getUTCFullYear()',
      'new Date(localMs).toISOString().slice(0, 10)',
      'Date.UTC(2026, 9, 11)',
    ];
    for (const source of passes) expect(IMPURE.test(source), source).toBe(false);
  });

  it('index.ts exports the public surface, and nothing else', () => {
    expect(Object.keys(garden).sort()).toEqual(
      [
        'BED_INNER',
        'BED_OUTER',
        'MODE_DEGREES',
        'PULL_RANGE_M',
        'REVERB_RT60_DEFAULT_S',
        'REVERB_RT60_MAX_S',
        'REVERB_RT60_MIN_S',
        'REVERB_RT60_STEPS_S',
        'RINGS',
        'SEED_SUPPLY_MAX',
        'STEPS',
        'WANDERER',
        'applyVisit',
        'bedZone',
        'cellCentre',
        'chordDegrees',
        'heightAfterPull',
        'movePlant',
        'nearestFreeCell',
        'newGarden',
        'plantSeed',
        'removePlant',
        'roomSignature',
        'setAnchor',
        'setHeight',
        'snapToCell',
        'stageFor',
        'undoRemove',
      ].sort(),
    );
  });
});
