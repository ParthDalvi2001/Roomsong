# Third-Party Licenses & Asset Register — Roomsong

**Status:** Living · **Owner:** devops-engineer (packages) / ux-designer (assets)
Contest rule: Meta may request proof of licence for any material. Every external item is logged here **before** it is added. Runtime policy: original or CC0/OFL/MIT/BSD/Apache/ISC only. No brands, no identifiable people.

---

## 1. Runtime dependencies (shipped in the bundle)
| Package | Version | License | Purpose | Added by (task) |
|---|---|---|---|---|
| @iwsdk/core (Immersive Web SDK) | 1.0.1 | MIT — https://github.com/facebook/immersive-web-sdk | WebXR framework (ECS, XR session, input, scene) | T-101 |
| three (npm alias of `super-three`) | 0.181.0 | MIT — https://threejs.org/ | 3D rendering; the `super-three` fork is what IWSDK requires | T-101 |
| @pmndrs/uikit · @pmndrs/uikit-horizon · @pmndrs/uikit-lucide | 1.0.76 | MIT (LICENSE file; package.json says "SEE LICENSE IN LICENSE") — https://github.com/pmndrs/uikit; lucide icons ISC | spatial UI (settings panel, captions) | T-101 (declared by the scaffold) |
Transitive runtime packages pulled by @iwsdk/core (not declared by us; listed so the audit is complete):
| Package | Version | License | Note |
|---|---|---|---|
| @iwsdk/xr-input · @iwsdk/locomotor · @iwsdk/scene-composition | 1.0.1 | MIT | locomotion is disabled in `iwsdk.config.json` |
| elics | 3.4.2 | MIT | ECS |
| @pmndrs/handle · @pmndrs/pointer-events | 6.6.31 | MIT | grab / pointer |
| three-mesh-bvh | 0.9.16 | MIT | raycast acceleration |
| @preact/signals-core | 1.14.4 | MIT | reactive values |
| @babylonjs/havok | 1.3.14 | MIT (wrapper) | physics is **off**; Vite still emits `physics-*` chunks (lazy) — confirm they never load |
| @drawcall/uikitml | 0.1.8 | **not declared: decision needed** (checked 2026-10-10, T-111). Evidence: the npm registry entry has no `license` field; the published tarball `uikitml-0.1.8.tgz` holds `package.json` (no `license` field), `README.md`, `dist/` and `skills/`, and no LICENSE file; the source repository https://github.com/drawcall-ai/uikitml at `main` c82fe59 has no LICENSE / COPYING / NOTICE file, the GitHub API reports `license: null`, none of its four `package.json` files has a `license` field, and neither README mentions a licence | UIKitML panel markup. Exact-pinned dependency of @iwsdk/core 1.0.1 (MIT), imported by its transform, grab, level and UI modules: its parser is in our main chunk even with no panel authored, so it cannot be dropped without dropping IWSDK. npm maintainer `bela-bohlender`. Options: ask the maintainer or the IWSDK team to declare a licence, or accept and disclose. Decide before G1 |
| @types/webxr · @types/three | 0.5.24 · 0.181.0 | MIT | types only, not shipped |

## 2. Build/dev dependencies (not shipped)
| Package | Version | License |
|---|---|---|
| @iwsdk/cli · @iwsdk/vite-plugin-dev · @iwsdk/reference | 1.0.1 | MIT |
| vite | 7.3.7 | MIT |
| vitest | 5.0.3 | MIT |
| @vitest/coverage-v8 (+ 11 packages it pulls in: @babel/parser, @babel/types, two @babel helpers, @bcoe/v8-coverage, two @vitest/istanbul-lib packages, ast-v8-to-istanbul, js-tokens, magicast, tinyrainbow) | 5.0.3 | MIT (all twelve); development only, not in the built page (T-117) |
| @playwright/test (+ playwright, playwright-core) | 1.64.0 | Apache-2.0 |
| typescript | 5.9.3 | Apache-2.0 |
| eslint · @eslint/js | 9.39.5 | MIT |
| typescript-eslint (@typescript-eslint/*) | 8.71.1 | MIT |
| eslint-plugin-import | 2.32.0 | MIT |
| eslint-import-resolver-typescript | 4.4.5 | ISC |
| eslint-config-prettier | 10.1.8 | MIT |
| globals | 17.13.0 | MIT |
| prettier | 3.9.10 | MIT |
| @types/node · @types/three | 24.19.2 · 0.181.0 | MIT |
| sharp (via @iwsdk/vite-plugin-dev, glTF/texture optimisation) · onnxruntime-node (via @iwsdk/reference) | 0.35.4 · 1.21.0 | Apache-2.0 · MIT |
Not installed: `@meta-quest/metavr` (the scaffold adds it as a devDependency; Meta Platform Technologies SDK licence, telemetry). Removed in T-101 pending the T-002 decision.

## 3. Assets
| Asset | Type | Source | License | Where used |
|---|---|---|---|---|
| All 3D plant/bed/vine geometry | procedural | entrant-built | original | render/ |
| All shaders | code | entrant-built | original | render/shaders |
| All sounds | synthesized | entrant-built | original (ADR-002) | audio/ |
| Gesture icons (palm, pinch, pull, drag, drag-off, palms-out, wake) | SVG | entrant-built | original | ui/ |
| Font (captions/panel) | _tbd: system font or an OFL font (e.g. Inter OFL-1.1)_ — note: @pmndrs/uikit ships an Inter MSDF atlas by default (the T-101 build emitted an `inter-*.js` chunk, 423 kB; the build stopped emitting it once T-111 removed the only UIKitML panel) | | OFL-1.1 if kept | ui/ |
| App icon / Devpost gallery images | captures of the app | entrant-built | original | submission |
| IWSDK default hand and controller models (`cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0`) | glTF | immersive-web/webxr-input-profiles, `packages/assets` | MIT per that package's `LICENSE.md`; not shipped, not fetched | **nowhere** (closed in T-111, 2026-10-10). @iwsdk/xr-input 1.0.1 fetched one of these whenever a hand or controller joined a session; `src/index.ts` now makes the SDK create no input model, so nothing is requested. `tests/e2e/01-enter-xr.spec.ts` fails on any request or WebSocket off localhost, with hands and with controllers (emulator evidence only). The URL is still a string inside the SDK code in `dist/`, next to two other SDK defaults that nothing in the app triggers: `unpkg.com/three@0.181.0` (Draco/KTX2 decoders, only for a compressed glTF) and `api.dicebear.com` (UIKit `Avatar` default picture). Check again before G1 if a glTF file or a UIKit avatar is ever added |
| Mulberry32 PRNG (algorithm by Tommy Ettinger) | code, about 10 lines | public snippet | public domain as stated by its author; re-verify before it moves out of `proto/` | `proto/sound/src/prng.ts` only (prototype, not shipped) |

## 4. Verification checklist (before submission)
- [ ] `npm ls --prod --json | node scripts/licenses.mjs` output matches §1
- [ ] No file in `public/` or `src/` originates from a third party without a row above
- [ ] Video contains only app footage, team VO, and app audio
