// audio/ dependency direction (API_SPEC §1, CODING_GUIDELINES §3): it imports core/ and garden/ only, each through
// its index.ts; no package (it is pure TypeScript + Web Audio); and only AudioSystem.ts loads core/ at run time,
// so the engine itself stays free of the ECS and loads in a bare page.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src');
const AUDIO_DIR = join(SRC_DIR, 'audio');
const CORE_INDEX = join(SRC_DIR, 'core', 'index.js');
const GARDEN_INDEX = join(SRC_DIR, 'garden', 'index.js');
const WIRING_FILE = 'AudioSystem.ts';

/** Every module a source file imports or re-exports from, and whether the whole statement is type-only. */
function imports(source: string): { spec: string; typeOnly: boolean }[] {
  const found = source.matchAll(
    /\b(?:import|export)\s+(type\s+)?[\w\s{},*$]*?\bfrom\s*(['"])([^'"]+)\2|\bimport\s*\(?\s*(['"])([^'"]+)\4/g,
  );
  return Array.from(found, (m) => ({ spec: m[3] ?? m[5] ?? '', typeOnly: m[1] !== undefined }));
}

/** The imports of one audio file that break the rule. */
function violations(file: string, source: string): string[] {
  const bad = imports(source).filter(({ spec, typeOnly }) => {
    if (!spec.startsWith('.')) return true; // no package at all: not three, not @iwsdk/core
    const target = resolve(AUDIO_DIR, dirname(file), spec);
    if (target.startsWith(AUDIO_DIR + sep)) return false;
    if (target === GARDEN_INDEX) return false; // garden/ is pure: loading it brings no ECS
    return target !== CORE_INDEX || !(typeOnly || file === WIRING_FILE);
  });
  return bad.map(({ spec }) => spec);
}

describe('audio/ dependency direction and purity (API_SPEC §1)', () => {
  const files = readdirSync(AUDIO_DIR, { recursive: true, encoding: 'utf8' }).filter((f) =>
    f.endsWith('.ts'),
  );
  const read = (file: string): string => readFileSync(join(AUDIO_DIR, file), 'utf8');

  it('every file imports only audio/, garden/index and core/index; core gives types only, outside the wiring file', () => {
    expect(files.length).toBeGreaterThanOrEqual(14);
    for (const file of files) expect(violations(file, read(file)), file).toEqual([]);
  });

  it('the check does catch a deep import, a run-time core import, another folder and a package', () => {
    const caught = (source: string, file = 'AudioEngine.ts'): boolean =>
      violations(file, source).length === 1;
    expect(caught("import { bus } from '../core/index.js';")).toBe(true);
    expect(caught("import { STEPS } from '../garden/config.js';")).toBe(true);
    expect(caught("import type { Plant } from '../garden/model.js';")).toBe(true);
    expect(caught("import type { Vec3 } from '../core/types.js';")).toBe(true);
    expect(caught("import { PlantView } from '../render/index.js';")).toBe(true);
    expect(caught("import { Vector3 } from 'three';")).toBe(true);
    expect(caught("import { bus } from '../../core/index.js';", 'voices/Bell.ts')).toBe(true);

    expect(violations('AudioEngine.ts', "import type { Mat4 } from '../core/index.js';")).toEqual([]);
    expect(violations('AudioEngine.ts', "import { STEPS } from '../garden/index.js';")).toEqual([]);
    expect(violations('voices/Bell.ts', "import { BELL_ATTACK_S } from '../config.js';")).toEqual([]);
    expect(violations(WIRING_FILE, "import { bus, log } from '../core/index.js';")).toEqual([]);
  });

  it('no file reads a random source or the wall clock: noise is seeded, and musical time is the audio clock', () => {
    const impure = /\bMath\.random\b|\bDate\.now\b|\bnew Date\b|\bsetTimeout\b|\brequestAnimationFrame\b/;
    for (const file of files) expect(impure.test(read(file)), file).toBe(false);
  });
});
