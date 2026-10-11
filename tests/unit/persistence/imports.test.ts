// The import rule of API_SPEC §1 for persistence/: it imports core/ and garden/ through their index.ts, and
// nothing else. Same check as tests/unit/garden/imports.test.ts.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as persistence from '../../../src/persistence/index.js';

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src');
const OWN_DIR = join(SRC_DIR, 'persistence');
const ALLOWED = [join(SRC_DIR, 'core', 'index.js'), join(SRC_DIR, 'garden', 'index.js')];

/** Every module a source file imports or re-exports from. */
function imports(source: string): string[] {
  const found = source.matchAll(
    /\b(?:import|export)\s+(?:type\s+)?[\w\s{},*$]*?\bfrom\s*(['"])([^'"]+)\1|\bimport\s*\(?\s*(['"])([^'"]+)\3/g,
  );
  return Array.from(found, (m) => m[2] ?? m[4] ?? '');
}

/** The imports of one persistence file that break the rule. */
function violations(file: string, source: string): string[] {
  return imports(source).filter((spec) => {
    if (!spec.startsWith('.')) return true; // no package: no IndexedDB wrapper, no schema library (LLD §6)
    const target = resolve(OWN_DIR, dirname(file), spec);
    return !target.startsWith(OWN_DIR + sep) && !ALLOWED.includes(target);
  });
}

describe('persistence/ dependency direction (API_SPEC §1)', () => {
  const files = readdirSync(OWN_DIR, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'));

  it('no file under src/persistence/ imports anything but its own folder, core/index and garden/index', () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const file of files) {
      expect(violations(file, readFileSync(join(OWN_DIR, file), 'utf8')), file).toEqual([]);
    }
  });

  it('the check does catch a deep import, a module beside or above it, and a package', () => {
    const caught = (source: string): boolean => violations('Store.ts', source).length === 1;
    expect(caught("import { cellAt } from '../garden/snap.js';")).toBe(true);
    expect(caught("import type { Settings } from '../core/settings.js';")).toBe(true);
    expect(caught("import type { AudioEngine } from '../audio/index.js';")).toBe(true);
    expect(caught("export * from '../room/index.js';")).toBe(true);
    expect(caught("import type { World } from '../index.js';")).toBe(true);
    expect(caught("import { get, set } from 'idb-keyval';")).toBe(true);
    expect(caught("const idb = await import('fake-indexeddb');")).toBe(true);

    expect(violations('Store.ts', "import { clock, log } from '../core/index.js';")).toEqual([]);
    expect(violations('schema.ts', "import { snapToCell } from '../garden/index.js';")).toEqual([]);
    expect(violations('Store.ts', "import { migrate } from './migrations.js';")).toEqual([]);
  });

  it('index.ts exports the public surface, and nothing else', () => {
    expect(Object.keys(persistence).sort()).toEqual(['PersistenceSystem', 'openStore']);
  });
});
