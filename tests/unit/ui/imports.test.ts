import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as ui from '../../../src/ui/index.js';

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src');
const UI_DIR = join(SRC_DIR, 'ui');
// API_SPEC §1: ui/ may import the modules named before it, each through its index.ts. Not access/, onboarding/
// or window/ (named after it), and never src/index.ts.
const BELOW = ['core', 'garden', 'room', 'hands', 'audio', 'persistence', 'render'];
const ALLOWED_INDEXES = BELOW.map((module) => join(SRC_DIR, module, 'index.js'));
// Three.js comes through IWSDK's re-exports, so the app has one copy of it (vite.config.ts `dedupe`).
const ALLOWED_PACKAGES = ['@iwsdk/core'];

/** Every module a source file imports or re-exports from. */
function imports(source: string): string[] {
  const found = source.matchAll(
    /\b(?:import|export)\s+(?:type\s+)?[\w\s{},*$]*?\bfrom\s*(['"])([^'"]+)\1|\bimport\s*\(?\s*(['"])([^'"]+)\3/g,
  );
  return Array.from(found, (m) => m[2] ?? m[4] ?? '');
}

/** The imports of one ui file that break the rule. */
function violations(file: string, source: string): string[] {
  return imports(source).filter((spec) => {
    if (!spec.startsWith('.')) return !ALLOWED_PACKAGES.includes(spec);
    const target = resolve(UI_DIR, dirname(file), spec);
    return !target.startsWith(UI_DIR + sep) && !ALLOWED_INDEXES.includes(target);
  });
}

describe('ui/ dependency direction (API_SPEC §1)', () => {
  const files = readdirSync(UI_DIR, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'));
  const read = (file: string): string => readFileSync(join(UI_DIR, file), 'utf8');

  it('every file under src/ui/ imports its own folder, a lower module through its index, or IWSDK', () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const file of files) expect(violations(file, read(file)), file).toEqual([]);
  });

  it('the check does catch a deep import, a module above ui, the entry file and another package', () => {
    const caught = (source: string): boolean => violations('Captions.ts', source).length === 1;
    expect(caught("import { STRINGS } from '../core/strings.js';")).toBe(true);
    expect(caught("import type { Flags } from '../core/flags.js';")).toBe(true);
    expect(caught("export * from '../hands/config.js';")).toBe(true);
    expect(caught("import { GazeDwell } from '../access/index.js';")).toBe(true);
    expect(caught("import { Onboarding } from '../onboarding/index.js';")).toBe(true);
    expect(caught("import { WindowStage } from '../window/index.js';")).toBe(true);
    expect(caught("import { world } from '../index.js';")).toBe(true);
    expect(caught("const core = await import('../core/log.js');")).toBe(true);
    expect(caught("import { Vector3 } from 'three';")).toBe(true);
    expect(caught("import { Text } from '@pmndrs/uikit';")).toBe(true);

    expect(violations('Captions.ts', "import { bus, STRINGS } from '../core/index.js';")).toEqual([]);
    expect(violations('Captions.ts', "import type { Cell } from '../garden/index.js';")).toEqual([]);
    expect(violations('Captions.ts', "import { HIT_RADIUS_M } from '../hands/index.js';")).toEqual([]);
    expect(violations('Captions.ts', "import { clampToFov } from './FovGuard.js';")).toEqual([]);
    expect(violations('Captions.ts', "import { Mesh, createSystem } from '@iwsdk/core';")).toEqual([]);
  });

  it('index.ts exports the public surface, and nothing else', () => {
    expect(Object.keys(ui).sort()).toEqual(['CaptionSystem', 'PanelSystem', 'clampToFov', 'mountLanding']);
  });
});
