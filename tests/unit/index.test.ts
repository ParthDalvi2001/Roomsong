// The boot, src/index.ts (LLD §3.3 A1 and A2; API_SPEC §1.10 rule 1): what its chunk may load, and what it does
// when the app chunk or the wiring fails. Fakes only: no DOM, no SDK. The browser's side of the same rule is
// tests/e2e/14-boot-session.spec.ts.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');

/**
 * What loading a source file loads with it: `import … from`, `export … from` and a bare `import '…'`. Not
 * `import type` (erased) and not `import()` (another chunk). `import { type X }` counts: the stricter reading.
 */
function staticImports(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''); // a comment may quote an import
  const found = code.matchAll(/\b(?:import|export)\s+(?!type\b)(?:[\w\s{},*$]*?\bfrom\s*)?(['"])([^'"]+)\1/g);
  return Array.from(found, (m) => m[2] ?? '');
}

/** Every file under src/ reached from `entry` by static imports, and every package they name. */
function reach(entry: string, read: (file: string) => string) {
  const files = [entry];
  const packages = new Set<string>();
  for (const file of files) {
    for (const spec of staticImports(read(file))) {
      if (!spec.startsWith('.')) {
        packages.add(spec);
        continue;
      }
      const next = join(dirname(file), spec).replace(/\.js$/, '.ts');
      if (!files.includes(next)) files.push(next);
    }
  }
  return { files, packages: [...packages] };
}

describe('the boot chunk (API_SPEC §1.10 rule 1)', () => {
  const read = (file: string): string => readFileSync(join(SRC_DIR, file), 'utf8');
  const boot = reach('index.ts', read);

  it('src/index.ts and what it imports statically load neither @iwsdk/core nor three: no package at all', () => {
    expect(boot.packages).toEqual([]);
  });

  // By itself too: garden/, audio/ and persistence/ load core/index.ts in Node, and must not get the SDK with it.
  it('core/index.ts reaches no package: the three components are not among its exports', () => {
    const core = reach('core/index.ts', read);
    expect(core.packages).toEqual([]);
    expect(core.files).not.toContain('core/components.ts');
  });

  it('is the landing page and core without its components, and not the wiring', () => {
    expect(boot.files).toEqual(expect.arrayContaining(['ui/Landing.ts', 'ui/strings.ts', 'core/index.ts']));
    expect(boot.files).not.toContain('core/components.ts');
    expect(boot.files).not.toContain('app.ts');
    expect(boot.files).not.toContain('ui/index.ts');
    // The graph is small: a file that joins it is seen here.
    expect(boot.files.filter((file) => !file.startsWith('core/')).sort()).toEqual([
      'index.ts',
      'ui/Landing.ts',
      'ui/strings.ts',
    ]);
  });

  it('the check does follow a re-export and a bare import to a package, and leaves types and import() alone', () => {
    const planted: Record<string, string> = {
      'index.ts': "import { a } from './a.js';\nimport('./lazy.js');\nimport type { T } from './types.js';",
      'a.ts': "export { b } from './deep/b.js';\nexport type { U } from 'elics';\n// import 'commented';",
      'deep/b.ts': "import '../c.js';\nimport {\n  World,\n} from '@iwsdk/core';",
      'c.ts': "import * as THREE from 'three';\nexport * from 'three/addons/x.js';",
      'lazy.ts': "import 'never-reached';",
    };
    const found = reach('index.ts', (file) => planted[file] ?? '');
    expect(found.files).toEqual(['index.ts', 'a.ts', 'deep/b.ts', 'c.ts']);
    expect(found.packages).toEqual(['@iwsdk/core', 'three', 'three/addons/x.js']);
  });
});

describe('the boot, with a fake page and a fake app chunk (LLD §3.3 A1, A2)', () => {
  afterEach(() => {
    vi.doUnmock('../../src/ui/Landing.js');
    vi.doUnmock('../../src/app.js');
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Runs src/index.ts once. `app` is the factory of the app chunk: what `import('./app.js')` gives, or throws. */
  async function boot(app: () => { start: (landing: unknown) => Promise<void> }) {
    const landing = { ready: vi.fn(), granted: vi.fn(), failed: vi.fn() };
    const mountLanding = vi.fn((root: unknown) => (void root, landing));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('document', { getElementById: (id: string) => ({ id }) });
    vi.doMock('../../src/ui/Landing.js', () => ({ mountLanding }));
    vi.doMock('../../src/app.js', app);
    await import('../../src/index.js');
    return { landing, mountLanding, errors };
  }

  it('mounts the landing page into #landing and hands that page to start()', async () => {
    const start = vi.fn((landing: unknown) => (void landing, Promise.resolve()));
    const run = await boot(() => ({ start }));
    await vi.waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    expect(run.mountLanding).toHaveBeenCalledWith({ id: 'landing' });
    expect(start).toHaveBeenCalledWith(run.landing);
    expect(run.landing.failed).not.toHaveBeenCalled();
    expect(run.errors).not.toHaveBeenCalled();
  });

  it('mounts the page before it asks for the app chunk: when the mount throws, the chunk is never asked for', async () => {
    // The factory of a mocked module runs when the module is asked for. With the two lines of the boot the other
    // way round, the chunk would already be on its way when the mount throws, and the factory would run.
    const app = vi.fn(() => ({ start: () => Promise.resolve() }));
    const mountLanding = (): never => {
      throw new Error('planted: no page');
    };
    vi.stubGlobal('document', { getElementById: (id: string) => ({ id }) });
    vi.doMock('../../src/ui/Landing.js', () => ({ mountLanding }));
    vi.doMock('../../src/app.js', app);
    await expect(import('../../src/index.js')).rejects.toThrow('planted: no page');
    await vi.dynamicImportSettled();
    expect(app).not.toHaveBeenCalled();
  });

  it('a chunk that does not arrive: the page says so, once, and the reason is logged', async () => {
    // A factory that throws is an import() that rejects (Vitest wraps the error in its own).
    const run = await boot(() => {
      throw new Error('planted: no chunk');
    });
    await vi.waitFor(() => expect(run.landing.failed).toHaveBeenCalledTimes(1));
    expect(run.errors).toHaveBeenCalledTimes(1);
    expect(run.errors.mock.calls[0]?.[0]).toBe('[app] the world could not load');
    expect(run.errors.mock.calls[0]?.[1]).toBeInstanceOf(Error);
  });

  it('a start() that rejects (no WebGL, a fault in the wiring): the same', async () => {
    const fault = new Error('planted: no world');
    const run = await boot(() => ({ start: () => Promise.reject(fault) }));
    await vi.waitFor(() => expect(run.landing.failed).toHaveBeenCalledTimes(1));
    expect(run.errors.mock.calls).toEqual([['[app] the world could not load', fault]]);
    expect(run.landing.ready).not.toHaveBeenCalled();
  });
});
