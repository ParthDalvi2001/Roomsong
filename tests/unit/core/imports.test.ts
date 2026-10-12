import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import manifest from '../../../src/components.js';
import * as components from '../../../src/core/components.js';
import * as core from '../../../src/core/index.js';

const CORE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src/core');
// API_SPEC §1: the only package core/ may import is @iwsdk/core, and only in components.ts.
const ALLOWED_PACKAGES: Record<string, string[]> = { 'components.ts': ['@iwsdk/core'] };

/** Every module specifier a source file imports or re-exports from, static or dynamic. */
function specifiers(source: string): string[] {
  const found = source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"]+)\1/g);
  return Array.from(found, (match) => match[2] ?? '');
}

/** The imports of one core file that break the dependency direction. */
function violations(file: string, source: string): string[] {
  return specifiers(source).filter((spec) => {
    if (!spec.startsWith('.')) return !(ALLOWED_PACKAGES[file] ?? []).includes(spec);
    return !resolve(CORE_DIR, dirname(file), spec).startsWith(CORE_DIR + sep);
  });
}

describe('core/ dependency direction (API_SPEC §1)', () => {
  const files = readdirSync(CORE_DIR, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'));

  it('no file under src/core/ imports another src/ folder or a package it may not use', () => {
    expect(files.length).toBeGreaterThanOrEqual(11);
    for (const file of files)
      expect(violations(file, readFileSync(join(CORE_DIR, file), 'utf8')), file).toEqual([]);
  });

  it('the check does catch an upward import, a root import, a package and a dynamic import', () => {
    expect(violations('events.ts', "import { x } from '../garden/index.js';")).toEqual([
      '../garden/index.js',
    ]);
    expect(violations('events.ts', "import type { Cell } from '../garden';")).toEqual(['../garden']);
    expect(violations('events.ts', "export * from '../index.js';")).toEqual(['../index.js']);
    expect(violations('events.ts', "import '../core-extra/x.js';")).toEqual(['../core-extra/x.js']);
    expect(violations('events.ts', "const m = await import('../audio/index.js');")).toEqual([
      '../audio/index.js',
    ]);
    expect(violations('events.ts', "import { Vector3 } from 'three';")).toEqual(['three']);
    expect(violations('events.ts', "import { Types } from '@iwsdk/core';")).toEqual(['@iwsdk/core']);
    expect(violations('components.ts', "import { Types } from '@iwsdk/core';")).toEqual([]);
    expect(violations('events.ts', "import { log } from './log.js';")).toEqual([]);
  });

  // Not the three components: index.ts is in the landing page's chunk, and they load the SDK (API_SPEC §1.10 rule 1).
  it('index.ts exports the public surface, and nothing else', () => {
    expect(Object.keys(core).sort()).toEqual(
      [
        'CAPTION_MIN_MS',
        'DEFAULT_SETTINGS',
        'DEFAULT_TEMPO_BPM',
        'MS_PER_DAY',
        'Pool',
        'STRINGS',
        'bus',
        'clock',
        'createClock',
        'flags',
        'log',
        'parseFlags',
        'settings',
        'validateSettings',
      ].sort(),
    );
    expect(core.DEFAULT_TEMPO_BPM).toBe(84);
    expect(core.CAPTION_MIN_MS).toBe(1200);
  });

  it('components.ts declares the three shared components with the fields of LLD §3', () => {
    const { BedAnchor, Caption, Interactable } = components;
    expect(Object.keys(components).sort()).toEqual(['BedAnchor', 'Caption', 'Interactable']);
    expect(BedAnchor.id).toBe('BedAnchor');
    expect(Object.keys(BedAnchor.schema)).toEqual(['inner', 'outer', 'heightOffset', 'source']);
    expect(Object.keys(BedAnchor.schema.source.enum)).toEqual(['table', 'surface', 'hittest', 'floating']);
    expect(BedAnchor.schema.inner).toEqual({ type: 'Float64', default: 0.12 });
    expect(BedAnchor.schema.outer).toEqual({ type: 'Float64', default: 0.3 });
    expect(Interactable.id).toBe('Interactable');
    expect(Object.keys(Interactable.schema)).toEqual(['kind', 'id', 'radius', 'worldPos']);
    expect(Object.keys(Interactable.schema.kind.enum)).toEqual(['plant', 'seed', 'orb', 'undo', 'panel']);
    expect(Caption.id).toBe('Caption');
    expect(Object.keys(Caption.schema)).toEqual(['key', 'expiresAt']);
    // Registered in the manifest the runtime and the editor load (src/components.ts). Core's three are in it;
    // a module's own component (HandState of hands/) is pinned by that module's tests.
    expect(Array.from(manifest)).toEqual(expect.arrayContaining([BedAnchor, Interactable, Caption]));
  });
});
