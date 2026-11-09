/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * file LICENSES/IWSDK-MIT.txt in the root directory of this source tree.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { iwsdkDev } from '@iwsdk/vite-plugin-dev';
import { defineConfig, type Plugin } from 'vite';

import { roomCapture, type Room } from './tests/fixtures/rooms/capture';

// Device test pages (T-104 capability spike, T-105 pinch accuracy) and the bed preview (T-125). Not in the release
// build (T-189, D-060 (10); scripts/check-dist.mjs fails if one is): `ROOMSONG_PROTO=1 npm run build` builds each
// one that exists to dist/<same path>, for a LAN preview (<preview>/proto/spike/ …) and the built-page e2e specs.
const PROTO_PAGES =
  process.env.ROOMSONG_PROTO === '1'
    ? ['proto/spike/index.html', 'proto/pinch/index.html', 'proto/bed/index.html'].filter((page) =>
        existsSync(page),
      )
    : [];

// Content Security Policy for every built page (T-109; SECURITY_PLAN §5, NFR-SEC-01, Golden Rule 9). No remote
// host anywhere. Each relaxation is here because the built page reports a violation without it (headless
// Chromium on `vite preview`, 2026-10-10):
//   script-src 'wasm-unsafe-eval'   UIKit's layout engine (yoga-layout) is WebAssembly, compiled at start-up
//   connect-src data:               that WebAssembly binary sits in the bundle and is read with fetch('data:…')
//   style-src-attr 'unsafe-inline'  <body style="margin: 0"> in index.html; <style> elements stay blocked
//   img-src data:                   the empty favicon <link rel="icon" href="data:,"> in index.html
// Blocked: eval, inline scripts and handlers, every other host, and all blob: URLs. The SDK has blob: paths that
// the app does not use yet (UIKit font worker, glTF textures, Draco and KTX2 workers): the feature that first
// uses one needs a relaxation here, and tests/e2e/04-built-page-policy.spec.ts is the run that shows it.
// scripts/check-dist.mjs fails `npm run verify` unless every built page carries exactly this policy; it holds
// its own copy of the string, so a change is made in both files.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "connect-src 'self' data:",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data:",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

// Build only: the dev server and its emulator need inline scripts and a WebSocket.
const contentSecurityPolicy: Plugin = {
  name: 'roomsong-content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
      injectTo: 'head-prepend', // a meta policy only covers what comes after it
    },
  ],
};

// Licence texts in the built site (T-171; THIRD_PARTY_LICENSES.md §1.3): MIT, BSD and Apache-2.0 want the notice
// with every copy, and the minifier strips licence comments. dist/LICENSES/ gets the texts committed in LICENSES/
// (the scaffold-derived code; yoga-layout, whose package has no licence file) and, read from node_modules at build
// time, the own licence file of every package below. The list is §1's "in the build: yes" rows: keep them equal.
// The build stops if a package has code in a chunk and no <name>.txt here; scripts/check-dist.mjs fails a build
// without dist/LICENSES/.
const ROOT = fileURLToPath(new URL('./', import.meta.url));
const SHIPPED_PACKAGES = [
  '@iwsdk/core',
  '@iwsdk/xr-input',
  '@iwsdk/locomotor',
  '@iwsdk/scene-composition',
  '@iwsdk/vite-plugin-dev', // its stand-in for the physics engine that the build leaves out
  'three',
  'fflate', // three's own copy (examples/jsm/libs, 0.8.2) is built in; the text is the installed 0.8.3's
  'three-mesh-bvh',
  'elics',
  '@preact/signals-core',
  '@pmndrs/uikit',
  '@pmndrs/uikit-pub-sub',
  '@pmndrs/handle',
  '@pmndrs/pointer-events',
  '@zappar/msdf-generator', // its font worker is written to dist/ (nothing loads it)
  'vite', // the module-preload polyfill and the chunk preload helper
];

/** Where a package is installed, looked up as Node does: node_modules/<name> here or in a parent folder. */
function packageDir(name: string): string {
  for (let dir = ROOT; dir !== dirname(dir); dir = dirname(dir)) {
    if (existsSync(join(dir, 'node_modules', name, 'package.json'))) return join(dir, 'node_modules', name);
  }
  throw new Error(`licence texts: ${name} is not installed`);
}

const textFile = (name: string): string => `${name.replace('@', '').replace('/', '-')}.txt`;
const PACKAGE_OF = /.*node_modules\/((?:@[^/]+\/)?[^/]+)/; // the package after the last node_modules/ of a module id

const licenseTexts: Plugin = {
  name: 'roomsong-license-texts',
  apply: 'build',
  generateBundle(_options, bundle) {
    const texts = readdirSync(join(ROOT, 'LICENSES'))
      .filter((file) => file.endsWith('.txt'))
      .map((file): [string, string] => [file, join(ROOT, 'LICENSES', file)]);
    for (const name of SHIPPED_PACKAGES) {
      const dir = packageDir(name);
      const file = readdirSync(dir).find((f) => /^licen[cs]e/i.test(f));
      if (file === undefined)
        throw new Error(`licence texts: ${name} has no licence file (THIRD_PARTY_LICENSES.md)`);
      texts.push([textFile(name), join(dir, file)]);
    }
    // Every package with code in a chunk has its text. shortcut: worker bundles are built apart and not seen here
    // (today they hold @iwsdk/locomotor, three and three-mesh-bvh, all listed), upgrade if a worker brings another.
    const have = new Set(texts.map(([file]) => file));
    for (const chunk of Object.values(bundle)) {
      for (const [id, { renderedLength }] of chunk.type === 'chunk' ? Object.entries(chunk.modules) : []) {
        const name = renderedLength > 0 ? PACKAGE_OF.exec(id)?.[1] : undefined;
        if (name !== undefined && !have.has(textFile(name)))
          this.error(
            `licence texts: ${name} has code in ${chunk.fileName} and no text: add it to SHIPPED_PACKAGES, or ` +
              `commit LICENSES/${textFile(name)} if the package has no licence file (THIRD_PARTY_LICENSES.md)`,
          );
      }
    }
    for (const [file, path] of texts)
      this.emitFile({ type: 'asset', fileName: `LICENSES/${file}`, source: readFileSync(path) });
  },
};

// Dev server only (BUG-002): the emulator fetches its room (`dev.emulator.environment` in iwsdk.config.json) from
// www.unpkg.com on every page load, and an offline dev page throws "Failed to fetch". The address is fixed inside
// @iwsdk/vite-plugin-dev, so a script ahead of its injection sends that one fetch to the dev server instead, which
// answers with the `table` room fixture of tests/fixtures/rooms in the capture format (the room the app is for;
// tests/e2e/support/iwer.ts answers the same path with each test's own fixture). Not in the build: `apply: 'serve'`.
const EMULATOR_ROOM_PATH = '/__emulator/rooms/';
const emulatorRoom: Plugin = {
  name: 'roomsong-emulator-room',
  apply: 'serve',
  transformIndexHtml: {
    order: 'pre',
    handler: () => [
      {
        tag: 'script',
        children:
          '(function (fetch) { window.fetch = function (input, init) {' +
          ' var url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;' +
          ' var room = /^https:\\/\\/www\\.unpkg\\.com\\/@iwer\\/sem@[^/]+\\/captures\\/(\\w+)\\.json$/.exec(url);' +
          ` return fetch.call(window, room ? "${EMULATOR_ROOM_PATH}" + room[1] + ".json" : input, init); }; })(window.fetch);`,
        injectTo: 'head-prepend', // before the emulator's own script, which @iwsdk/vite-plugin-dev puts at the head's end
      },
    ],
  },
  configureServer: (server) => {
    server.middlewares.use(EMULATOR_ROOM_PATH, (req, res, next) => {
      if (!/^\/\w+\.json$/.test(req.url ?? '')) return next();
      const room = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/rooms/table.json'), 'utf8')) as Room;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(roomCapture(room)));
    });
  },
};

// Dev server only: with ?rec=1 the page loads tests/tools/headset-recorder.ts, which posts what a real headset session
// senses here, appended to .tmp/headset/rec.jsonl, and its snapshots of the drawn view (.tmp/headset/snaps/); with
// &ghost=1 too, tests/tools/headset-ghost.ts, which plays the shaky-hands scenes with pretend hands in the room.
// Same origin; not in the build (`apply: 'serve'`).
const SNAP_MAX_BYTES = 4_000_000;
const REC_MAX_BYTES = 1_000_000;
/** BUG-048: a `/__rec` body is lines the recorder writes, each a JSON object with a numeric `t` and a string `kind`. */
export function isRecBody(body: string): boolean {
  return body.split('\n').every((line) => {
    try {
      const value: unknown = JSON.parse(line);
      return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        typeof (value as { t?: unknown }).t === 'number' &&
        typeof (value as { kind?: unknown }).kind === 'string'
      );
    } catch {
      return false;
    }
  });
}
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const headsetRecorder: Plugin = {
  name: 'roomsong-headset-recorder',
  apply: 'serve',
  transformIndexHtml: () => [
    {
      tag: 'script',
      attrs: { type: 'module' },
      children:
        'if (/[?&]rec=1/.test(location.search)) import("/tests/tools/headset-recorder.ts");' +
        'if (/[?&]rec=1/.test(location.search) && /[?&]ghost=1/.test(location.search))' +
        ' import("/tests/tools/headset-ghost.ts");',
      injectTo: 'head-prepend',
    },
  ],
  configureServer: (server) => {
    const dir = join(ROOT, '.tmp/headset');
    mkdirSync(dir, { recursive: true });
    // Anyone on the network can post here too: only a POST of recorder lines within the size is written (BUG-048).
    server.middlewares.use('/__rec', (req, res) => {
      const chunks: Buffer[] = [];
      let size = 0;
      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size <= REC_MAX_BYTES) chunks.push(chunk);
      });
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        const isValid = req.method === 'POST' && size <= REC_MAX_BYTES && isRecBody(body);
        if (isValid) appendFileSync(join(dir, 'rec.jsonl'), `${body}\n`);
        res.statusCode = isValid ? 204 : 400;
        res.end();
      });
    });
    // The recorder's snapshots of the drawn view: one PNG each, and a `snap` line naming it. Anyone on the network
    // can post here, so the name, the size and the PNG signature are checked before anything is written.
    const snaps = join(dir, 'snaps');
    mkdirSync(snaps, { recursive: true });
    server.middlewares.use('/__snap', (req, res) => {
      const query = new URLSearchParams((req.url ?? '').split('?')[1]);
      const name = query.get('name') ?? '';
      const why = query.get('why') ?? '';
      const chunks: Buffer[] = [];
      let size = 0;
      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size <= SNAP_MAX_BYTES) chunks.push(chunk);
      });
      req.on('end', () => {
        const png = Buffer.concat(chunks);
        const isValid =
          req.method === 'POST' &&
          /^[\dTZ.-]{1,40}-\d{1,6}$/.test(name) &&
          /^[\w:]{1,40}$/.test(why) &&
          size <= SNAP_MAX_BYTES &&
          png.subarray(0, 8).equals(PNG_SIGNATURE);
        if (isValid) {
          writeFileSync(join(snaps, `${name}.png`), png);
          const data = { file: `snaps/${name}.png`, why, multiview: query.get('multiview') === '1' };
          appendFileSync(
            join(dir, 'rec.jsonl'),
            `${JSON.stringify({ t: Number(query.get('t')), kind: 'snap', data })}\n`,
          );
        }
        res.statusCode = isValid ? 204 : 400;
        res.end();
      });
    });
  },
};

export default defineConfig({
  plugins: [iwsdkDev(), emulatorRoom, headsetRecorder, contentSecurityPolicy, licenseTexts],
  server: { host: '0.0.0.0', port: 8081, open: false },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'esnext',
    rollupOptions: { input: ['./index.html', ...PROTO_PAGES] },
  },
  esbuild: { target: 'esnext' },
  resolve: {
    // @drawcall/uikitml has no licence, and @iwsdk/core imports it statically even with spatialUI off: a stub that
    // throws stands in for it, in dev and in the build (T-171; why and which names: the stub's header).
    alias: { '@drawcall/uikitml': fileURLToPath(new URL('./build/stubs/uikitml.js', import.meta.url)) },
    // One copy of each: duplicate Component classes break instanceof checks ("Only pmndrs/uikit components can be
    // added as children").
    dedupe: ['three', '@pmndrs/uikit'],
  },
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
    include: ['three', '@pmndrs/uikit'],
    esbuildOptions: { target: 'esnext' },
  },
  publicDir: 'public',
  // Vite's default cache is node_modules/.vite, and a worktree has no node_modules of its own: every worktree's dev
  // server then shares the root's, and one that re-optimises its dependencies replaces the files the others serve,
  // whose pages reload ("Outdated Optimize Dep": the "execution context destroyed" of e2e runs on a busy host).
  // One cache per worktree, git-ignored.
  cacheDir: '.vite',
  base: './',
});
