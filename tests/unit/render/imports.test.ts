import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as render from '../../../src/render/index.js';

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src');
const RENDER_DIR = join(SRC_DIR, 'render');
// API_SPEC §1: render/ may import the modules named before it, each through its index.ts, and nothing above it.
const BELOW = ['core', 'garden', 'room', 'hands', 'audio', 'persistence'];
const PACKAGES = ['three', '@iwsdk/core'];

/** Every module a source file imports or re-exports from. */
function imports(source: string): string[] {
  const found = source.matchAll(
    /\b(?:import|export)\s+(?:type\s+)?[\w\s{},*$]*?\bfrom\s*(['"])([^'"]+)\1|\bimport\s*\(?\s*(['"])([^'"]+)\3/g,
  );
  return Array.from(found, (m) => m[2] ?? m[4] ?? '');
}

/** The imports of one render file that break the rule. */
function violations(file: string, source: string): string[] {
  return imports(source).filter((spec) => {
    if (!spec.startsWith('.')) return !PACKAGES.includes(spec);
    const target = resolve(RENDER_DIR, dirname(file), spec);
    if (target.startsWith(RENDER_DIR + sep)) return false;
    // The shared ECS components: every importer takes them from this file, not from core's index (CODING_GUIDELINES §3).
    if (target === join(SRC_DIR, 'core', 'components.js')) return false;
    return !BELOW.some((module) => target === join(SRC_DIR, module, 'index.js'));
  });
}

describe('render/ dependency direction (API_SPEC §1)', () => {
  const files = readdirSync(RENDER_DIR, { recursive: true, encoding: 'utf8' }).filter((f) =>
    f.endsWith('.ts'),
  );
  const read = (file: string): string => readFileSync(join(RENDER_DIR, file), 'utf8');

  it('every file under src/render/ imports its own folder, a lower module through its index, or three', () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
    for (const file of files) expect(violations(file, read(file)), file).toEqual([]);
  });

  it('the check does catch a deep import, a module above render, the app entry and another package', () => {
    const caught = (source: string): boolean => violations('PlantRenderer.ts', source).length === 1;
    expect(caught("import { cellAt } from '../garden/snap.js';")).toBe(true);
    expect(caught("import type { Vec2 } from '../core/types.js';")).toBe(true);
    expect(caught("import { Captions } from '../ui/index.js';")).toBe(true);
    expect(caught("import { GazeDwell } from '../access/index.js';")).toBe(true);
    expect(caught("import type { World } from '../index.js';")).toBe(true);
    expect(caught("const ui = await import('../ui/index.js');")).toBe(true);
    expect(caught("export * from '../onboarding/index.js';")).toBe(true);
    expect(caught("import { gsap } from 'gsap';")).toBe(true);
    expect(caught("import { OrbitControls } from 'three/addons/controls/OrbitControls.js';")).toBe(true);

    expect(violations('PlantRenderer.ts', "import { cellCentre } from '../garden/index.js';")).toEqual([]);
    expect(violations('PerfHud.ts', "import { bus, flags } from '../core/index.js';")).toEqual([]);
    expect(violations('BedRenderer.ts', "import { HIT_RADIUS_M } from '../hands/index.js';")).toEqual([]);
    expect(violations('PlantRenderer.ts', "import { stepGlow } from './TideRenderer.js';")).toEqual([]);
    expect(violations('PlantRenderer.ts', "import { InstancedMesh } from 'three';")).toEqual([]);
    expect(violations('RenderSystems.ts', "import { BedAnchor } from '../core/components.js';")).toEqual([]);
  });

  it('the renderers read no clock and no random source: time comes in as an argument', () => {
    const impure = /\bDate\.now\b|\bnew Date\b|\bMath\.random\b|\bperformance\.now\b|\bcurrentTime\b/;
    for (const file of files) {
      // One exception, by name and for one call: PerfSystem measures the script time of a frame (NFR-PERF-05),
      // which only a clock gives. API_SPEC §1.8 words the rule for the renderers, and none is in that file.
      const code = file === 'RenderSystems.ts' ? read(file).replace(/performance\.now\(\)/g, '') : read(file);
      expect(impure.test(code), file).toBe(false);
    }
  });

  it('nothing in render/ adds a light, a shadow, a render target or a post-processing pass (NFR-PERF-09)', () => {
    const banned = /\b\w*Light\b|castShadow|receiveShadow|shadowMap|RenderTarget|EffectComposer|\bPass\b/;
    for (const file of files) {
      const code = read(file).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''); // the comments may name them
      expect(banned.exec(code)?.[0], file).toBeUndefined();
    }
  });

  it('index.ts exports the public surface, and nothing else', () => {
    expect(Object.keys(render).sort()).toEqual(
      [
        'BedRenderSystem',
        'BedRenderer',
        'FLASH_CAP_PER_S',
        'FLASH_MIN_DELTA',
        'FOVEATION_MEDIUM',
        'FlashGuard',
        'HaloSystem', // T-148
        'PLANT_FLASH_BRIGHTNESS', // T-160: the beat ring lights as the plants do
        'PLANT_REST_BRIGHTNESS',
        'PerfSampler',
        'PerfSystem',
        'PetalRenderer',
        'PlantRenderer',
        'SeedSystem',
        'TideRenderer',
        'TuningRippleSystem',
        'VineSystem', // T-149
        'createPerfHud',
        'loadHandCue', // T-175: the hand cue's file, loaded in dev builds only
        'stepGlow', // T-160
      ].sort(),
    );
  });
});
