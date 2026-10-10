// TC-PER-03 (FR-PER-04, NFR-SEC-01, Golden Rule 9): nothing in src/ talks to the network. Comments are ignored:
// the check walks the TypeScript syntax tree, which holds no comments.
// shortcut: a name or URL split inside a word ('fe' + 'tch') or built from character codes is not seen, upgrade
// if the Content Security Policy in vite.config.ts, which blocks such a request at run time, is ever relaxed.
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Loaded with require, not import: for an import statement eslint-plugin-import parses the whole `typescript`
// package, which adds about 8 s to `npm run lint`.
const ts = createRequire(import.meta.url)('typescript') as typeof import('typescript');
type TsNode = import('typescript').Node;

const SRC = fileURLToPath(new URL('../../../src/', import.meta.url));
const CODE_FILE = /\.(ts|tsx|js|mjs|cjs)$/;
const NETWORK_APIS = new Set([
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'sendBeacon',
  'RTCPeerConnection',
  'WebTransport',
]);
// Caught in a string: a scheme with its colon, "://", or a string that starts with "//". That covers a URL
// joined as 'https:' + '//' + host or 'https' + '://' + host; pieces cut smaller are the shortcut above.
const URL_PIECE = /\b(https?|wss?):|:\/\/|^\/\//i;

function violations(file: string, code: string): string[] {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest);
  const found: string[] = [];
  const visit = (node: TsNode): void => {
    const isText = ts.isStringLiteralLike(node) || ts.isTemplateLiteralToken(node);
    if (ts.isIdentifier(node) || isText) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      if (NETWORK_APIS.has(node.text)) found.push(`${file}:${line} network API "${node.text}"`);
      else if (isText && URL_PIECE.test(node.text)) found.push(`${file}:${line} URL literal "${node.text}"`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('no network in src/ (TC-PER-03)', () => {
  it('the check catches each kind of violation and ignores comments', () => {
    const planted = [
      "void fetch('/a');",
      "navigator.sendBeacon('/b');",
      "const viaBracket = window['XMLHttpRequest'];",
      'new RTCPeerConnection();',
      'new WebTransport(endpoint);',
      "const scheme = 'https:';",
      "const slashes = '//';",
      "const schemeEnd = '://';",
      'const templated = `wss://${host}/live`;',
      "const relative = '//cdn.example/x.js';",
      "// fetch('https://comment.example') is only a comment",
      "/* new WebSocket('wss://comment.example') */",
      "const fine = 'rows: 5, data:, ./scene.json, a // b';",
    ].join('\n');
    const caughtLines = violations('planted.ts', planted).map((v) => Number(v.split(/[: ]/)[1]));
    expect(caughtLines).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('src/ has no network API and no URL literal', () => {
    const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' }).filter((f) => CODE_FILE.test(f));
    expect(files.length).toBeGreaterThan(0); // a wrong path must not pass as "clean"
    expect(files.flatMap((f) => violations(`src/${f}`, readFileSync(SRC + f, 'utf8')))).toEqual([]);
  });
});
