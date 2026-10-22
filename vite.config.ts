/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { iwsdkDev } from '@iwsdk/vite-plugin-dev';
import { defineConfig, type Plugin } from 'vite';

import { roomCapture, type Room } from './tests/fixtures/rooms/capture';

// Device test pages (T-104 capability spike, T-105 pinch accuracy) and the bed preview (T-125). Each one that
// exists is built to dist/<same path>, so a headset opens it at <site>/proto/spike/, <site>/proto/pinch/ or
// <site>/proto/bed/.
const PROTO_PAGES = ['proto/spike/index.html', 'proto/pinch/index.html', 'proto/bed/index.html'].filter(
  (page) => existsSync(page),
);

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

export default defineConfig({
  plugins: [iwsdkDev(), emulatorRoom, contentSecurityPolicy, licenseTexts],
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
  base: './',
});
