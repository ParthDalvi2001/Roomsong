/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from 'node:fs';

import { iwsdkDev } from '@iwsdk/vite-plugin-dev';
import { defineConfig, type Plugin } from 'vite';

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

export default defineConfig({
  plugins: [iwsdkDev(), contentSecurityPolicy],
  server: { host: '0.0.0.0', port: 8081, open: false },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'esnext',
    rollupOptions: {
      input: ['./index.html', ...PROTO_PAGES],
      // zod (inside IWSDK) tests for eval with `new Function('')` when its first schema is built; the policy
      // blocks and reports that test. `jitless` is zod's switch for strict policies, and zod reads its config
      // from this global (zod/v4/core/core.js), so it is set before any bundled module runs.
      output: { intro: '(globalThis.__zod_globalConfig ??= {}).jitless = true;' },
    },
  },
  esbuild: { target: 'esnext' },
  // @drawcall/uikitml otherwise pulls a second three/@pmndrs/uikit graph
  // (three@0.185 vs app super-three@0.181). Duplicate Component classes break
  // instanceof checks → "Only pmndrs/uikit components can be added as children".
  resolve: {
    dedupe: ['three', '@pmndrs/uikit', '@pmndrs/uikit-horizon', '@pmndrs/uikit-lucide'],
  },
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
    include: ['three', '@pmndrs/uikit', '@pmndrs/uikit-horizon', '@pmndrs/uikit-lucide', '@drawcall/uikitml'],
    esbuildOptions: { target: 'esnext' },
  },
  publicDir: 'public',
  base: './',
});
