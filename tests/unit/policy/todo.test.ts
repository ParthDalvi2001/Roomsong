// CODING_GUIDELINES §7: a TODO or FIXME names its task or bug on the same line, as in TODO(T-123) or
// FIXME (BUG-001). This file is skipped: it has to spell the bare words to test for them.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SCANNED = ['src', 'tests', 'scripts', 'public', 'proto/spike', 'proto/pinch', 'proto/bed'];
const ROOT_FILE = /^(index\.html|.+\.config\.\w+)$/; // at the repository root: the page and the tool configs
const SELF = 'tests/unit/policy/todo.test.ts';
const TEXT_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|json|html|css|md|sh|py|glsl|frag|vert|svg)$/;
const BUILD_OUTPUT = /(^|\/)(node_modules|dist|__artifacts__)\//;
const MARKER = /\b(TODO|FIXME)\b/;
const ID = /\((T|BUG)-\d+\)/;

function bareMarkers(file: string, text: string): string[] {
  return text
    .split('\n')
    .flatMap((line, i) => (MARKER.test(line) && !ID.test(line) ? [`${file}:${i + 1} ${line.trim()}`] : []));
}

describe('no bare TODO or FIXME', () => {
  it('the check catches a marker without an id and accepts one with an id', () => {
    const planted = [
      '// TODO: later',
      '// TODO(T-123): later',
      '/* FIXME (BUG-001) */',
      'FIXME',
      'todo list',
    ];
    expect(bareMarkers('planted.ts', planted.join('\n'))).toEqual([
      'planted.ts:1 // TODO: later',
      'planted.ts:4 FIXME',
    ]);
  });

  it(`${SCANNED.join(', ')}, index.html and the root config files have none`, () => {
    const files = [
      ...readdirSync(ROOT).filter((f) => ROOT_FILE.test(f)),
      ...SCANNED.filter((dir) => existsSync(ROOT + dir)).flatMap((dir) =>
        readdirSync(ROOT + dir, { recursive: true, encoding: 'utf8' }).map((f) => `${dir}/${f}`),
      ),
    ];
    const scanned = files.filter((f) => TEXT_FILE.test(f) && !BUILD_OUTPUT.test(f) && f !== SELF);
    expect(scanned.length).toBeGreaterThan(0); // a wrong path must not pass as "clean"
    expect(scanned.flatMap((f) => bareMarkers(f, readFileSync(ROOT + f, 'utf8')))).toEqual([]);
  });
});
