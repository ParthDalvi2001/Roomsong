// T-171 (THIRD_PARTY_LICENSES.md §0): @drawcall/uikitml has no licence, so vite.config.ts aliases it to a stub
// that throws. This pins the alias, the stub's error, and that the stub exports every name @iwsdk/core imports.
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import viteConfig from '../../../vite.config';

const STUB = fileURLToPath(new URL('../../../build/stubs/uikitml.js', import.meta.url));
// Its exports map gives require only package.json.
const IWSDK_DIST = join(dirname(createRequire(import.meta.url).resolve('@iwsdk/core/package.json')), 'dist');
// Every `import … from` or `export … from` the package, either quote style. A bare `import '@drawcall/uikitml'`
// takes no name and is not matched.
const FROM_PACKAGE = /\b(?:import|export)\s*([^;'"]*?)\s*from\s*['"]@drawcall\/uikitml['"]/g;

/** The names a file takes from the package: `{ a, b as c }` gives a and b, a default import 'default', and
 * `* as x` or `export *` gives '*', which no stub can pin: such an import fails the test until a person reads it. */
function namesTaken(text: string): string[] {
  return [...text.matchAll(FROM_PACKAGE)].flatMap(([, clause = '']) => {
    const names = (/\{([^}]*)\}/.exec(clause)?.[1] ?? '')
      .split(',')
      .map((name) => name.trim().split(/\s+as\s+/)[0] ?? '')
      .filter((name) => name !== '');
    const rest = clause
      .replace(/\{[^}]*\}/, '')
      .replace(/,/g, '')
      .trim();
    return rest === '' ? names : [...names, rest.startsWith('*') ? '*' : 'default'];
  });
}

async function loadStub(): Promise<Record<string, () => unknown>> {
  const url = new URL('../../../build/stubs/uikitml.js', import.meta.url).href; // a .js file: no types to import
  return (await import(url)) as Record<string, () => unknown>;
}

describe('the @drawcall/uikitml stub', () => {
  it('vite.config.ts aliases the package to the stub', () => {
    const alias = viteConfig.resolve?.alias as Record<string, string> | undefined;
    expect(alias?.['@drawcall/uikitml']).toBe(STUB);
  });

  it('the scan reads every form of import and re-export', () => {
    const planted = [
      "import { a, b as c } from '@drawcall/uikitml';",
      'import d, { e } from "@drawcall/uikitml";',
      "import * as f from '@drawcall/uikitml';",
      'export { g } from "@drawcall/uikitml";',
      "export * from '@drawcall/uikitml';",
      "import '@drawcall/uikitml';",
      "import { h } from '@drawcall/other';",
    ].join('\n');
    expect(namesTaken(planted)).toEqual(['a', 'b', 'e', 'default', '*', 'g', '*']);
  });

  it('exports every name that @iwsdk/core imports from the package', async () => {
    const files = readdirSync(IWSDK_DIST, { recursive: true, encoding: 'utf8' }).filter((f) =>
      f.endsWith('.js'),
    );
    const imported = files.flatMap((f) => namesTaken(readFileSync(join(IWSDK_DIST, f), 'utf8')));
    expect(imported.length).toBeGreaterThan(0); // the scan still finds the imports
    expect(Object.keys(await loadStub()).sort()).toEqual([...new Set(imported)].sort());
  });

  it('every export throws a named error that says why', async () => {
    for (const [name, fn] of Object.entries(await loadStub())) {
      let thrown: unknown;
      try {
        fn();
      } catch (error) {
        thrown = error;
      }
      expect((thrown as Error | undefined)?.name, name).toBe('UIKitMLRemovedError');
      expect((thrown as Error).message, name).toContain('no licence');
    }
  });
});
