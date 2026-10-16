import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as access from '../../../src/access/index.js';

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src');
const ACCESS_DIR = join(SRC_DIR, 'access');
// API_SPEC §1: access/ may import the modules named before it, each through its index.ts, and the shared
// components; not onboarding/ or window/ (named after it), and never src/index.ts. Three.js comes through IWSDK.
const BELOW = ['core', 'garden', 'room', 'hands', 'audio', 'persistence', 'render', 'ui'];
const ALLOWED = [
  ...BELOW.map((module) => join(SRC_DIR, module, 'index.js')),
  join(SRC_DIR, 'core', 'components.js'),
];

function violations(source: string): string[] {
  const found = source.matchAll(/\b(?:import|export)\s+(?:type\s+)?[\w\s{},*$]*?\bfrom\s*(['"])([^'"]+)\1/g);
  return Array.from(found, (m) => m[2] ?? '').filter((spec) => {
    if (!spec.startsWith('.')) return spec !== '@iwsdk/core';
    const target = resolve(ACCESS_DIR, spec);
    return !target.startsWith(ACCESS_DIR + sep) && !ALLOWED.includes(target);
  });
}

describe('access/ dependency direction (API_SPEC §1)', () => {
  it('every file imports its own folder, a lower module through its index, or IWSDK; the check catches a breach', () => {
    const files = readdirSync(ACCESS_DIR).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const file of files)
      expect(violations(readFileSync(join(ACCESS_DIR, file), 'utf8')), file).toEqual([]);
    expect(violations("import { PanelSystem } from '../ui/PanelSystem.js';")).toHaveLength(1);
    expect(violations("import { Onboarding } from '../onboarding/index.js';")).toHaveLength(1);
    expect(violations("import { Vector3 } from 'three';")).toHaveLength(1);
  });

  it('index.ts exports the two systems and the dwell rule', () => {
    expect(Object.keys(access).sort()).toEqual(['BeatRingSystem', 'Dwell', 'GazeDwellSystem']);
  });
});
