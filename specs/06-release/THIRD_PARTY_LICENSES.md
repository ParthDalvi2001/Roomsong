# Third-Party Licenses & Asset Register — Roomsong

**Status:** Living · **Owner:** devops-engineer (packages) / ux-designer (assets)
Contest rule: Meta may request proof of licence for any material. Every external item is logged here **before** it is added. Runtime policy: original or CC0/OFL/MIT/BSD/Apache/ISC only. No brands, no identifiable people.

**Checked:** 2026-10-13, against `develop` at 85a06fc (T-170).
- **What ships:** 65 packages are in the production tree (5 declared, 60 pulled in). Code of 20 of them is in the built app. The other 45 are installed but not built in.
- **Licences:** 63 of the 65 have a clear permissive licence (46 MIT, 13 Apache-2.0, 3 BSD, 1 CC0). One more is a font package under Apache-2.0 and OFL-1.1; it is not in the build.
- **Open:** one package with code in the build has no licence at all (§0: blocks submission). Two smaller gaps: licence texts missing from `LICENSES/` and from the built site (§1.3), and a scaffold header that points at a file that does not exist (§3).

How it was checked: `package.json` and `npm ls --omit=dev --all` for the tree; each package's own `package.json` and licence file in `node_modules` for the licence; a text search of the last build (`dist/`) for what is really built in. Another session rebuilt `dist/` during the check (2026-10-13 00:36 IST); every search was run again on that build and gave the same answers as on the build of 2026-10-12 23:49. Built files are named by their prefix, because the hash in the name changes with each build. No build was run for this check. §2 was not re-checked.

---

## 0. Open: blocks submission

**`@drawcall/uikitml` 0.1.8 has no licence, and its code is in the built app.**

What is and is not there (installed copy, read 2026-10-13):
- Its `package.json` has no `license` field. It names a repository: https://github.com/drawcall-ai/uikitml.
- The package folder holds `package.json`, `README.md`, `dist/` and `skills/`. There is no LICENSE, COPYING or NOTICE file. The README does not mention a licence.
- Online, re-read 2026-10-13 by an automated page fetch: the npm registry entry has no `license` field (the latest version is still 0.1.8; one maintainer, `bela-bohlender`); the repository page shows no licence and no licence file. This matches the first check on 2026-10-10 (T-111, `main` at c82fe59).

How it comes in:
- `@iwsdk/core` 1.0.1 (MIT) depends on exactly this version. Four of its files import it: `ui/uikitml.js`, `transform/transform.js`, `grab/grab-system.js` and `level/level-component-applier.js`.
- Nothing in `src/` or `proto/*/src` imports it. No `.uikitml` file is in the repository. The settings panel and the captions are drawn by our own canvas code.

What is in the build. Three files of `dist/` contain the word "uikitml":
| Built file | What the mention is | Code of the package? |
|---|---|---|
| `assets/RenderSystems-*.js` (the main chunk; the page loads it on every start) | the package's own error messages: "UIKitML requires exactly one root component." (`parse.js`), "Expected a stylesheet selector before declaration block." (`css.js`), "Expected a bundled or @font-face font family" (`fonts.js`). A search of the installed `@iwsdk`, `@pmndrs` and `@drawcall` packages finds the first two only in this one | **yes**: its parser, its stylesheet reader and its font-name list are built in |
| `assets/world-initializer-*.js` | IWSDK's own text and names ("UIKitML inspection allows at most", `instantiateUIKitML`) | none found |
| `assets/_virtual_iwsdk-disabled-bundled-fonts-*.js` | one error message written by the IWSDK build plugin | no |

Not in the build: the package's command-line tool, its feedback sender (the only code that loads `@sentry/node`) and its picture renderer (the only code that loads `playwright`). None of their text is in `dist/`, and no file of `dist/` contains "sentry".

Why it blocks: with no licence, nothing gives us the right to copy or publish this code, and this list cannot show a licence for it if Meta asks (HACKATHON_RULES C3: every third-party asset is licensed and listed). What it is not: there is no sign of a restrictive licence, and the package is public and required by Meta's own SDK. Neither of those is a licence.

Ways out. None is chosen here: the decision is the developer's.
1. **Get a licence stated.** Ask the maintainer (the repository above; `@pmndrs/uikit`, which is MIT, names Bela Bohlender as its author) or the IWSDK team to declare one. Enough: a licence file in the repository, a `license` field in a new npm release, or a written statement we can keep. The answer is not in our hands.
2. **Show that the code is not in the build.** Not possible today: the search above finds it. This way opens only if way 3 works.
3. **Build without it.** The IWSDK feature that uses the package is `world.features.spatialUI` in `iwsdk.config.json` (on, kit "horizon"). The app does not use that feature. Not known: whether turning it off takes the code out, because three other IWSDK files import the package directly. It needs a trial build and the same search of `dist/`. Not tried in this check.

Saying so in the submission text is not a fourth way out: the code would still have no licence, and C3 would stay unticked. Whether to submit like that is the developer's call.

---

## 1. Runtime dependencies (the production tree; the last column says what is in the build)

**In the build** column. *yes*: text or a binary that belongs to the package's own code was found in `dist/`, and is named. *yes (by import)*: nothing searchable survives the minifier, but code that is in the build imports it. *no*: a reason is given. *name not found in dist*: no built file contains the package's name, and nothing that is built in loads it. A name found is only a hint; a row says so when that is all there is.

**1.1 Declared in `package.json` (5).**
| Package | Version | License | Purpose | In the build | Added by (task) |
|---|---|---|---|---|---|
| @iwsdk/core (Immersive Web SDK) | 1.0.1 | MIT — https://github.com/facebook/immersive-web-sdk | WebXR framework (ECS, XR session, input, scene). With `three`, the only package our code imports | yes: its messages are in `RenderSystems-*.js` and `world-initializer-*.js` | T-101 |
| three (npm alias of `super-three`) | 0.181.0 | MIT — https://threejs.org/ | 3D rendering; the `super-three` fork is what IWSDK requires | yes: "THREE.WebGLRenderer" in `pinch-*.js` (a shared chunk); a second copy, with its MIT notice, is inside the locomotion worker (the 199 kB `worker-*.js`) | T-101 |
| @pmndrs/uikit | 1.0.76 | MIT, from its LICENSE file (© 2024 Bela Bohlender; © 2023 Coconut Capital); `package.json` says "SEE LICENSE IN LICENSE" — https://github.com/pmndrs/uikit | IWSDK's panel toolkit. **Our code does not use it:** nothing in `src/` or `proto/*/src` imports it, and the settings panel and the captions are drawn on a canvas by our own code (`src/ui/PanelSystem.ts`, `src/ui/Captions.ts`). It comes in through `@iwsdk/core` and `@drawcall/uikitml` | yes: "Only pmndrs/uikit components can be added as children" in `RenderSystems-*.js` | T-101 (declared by the scaffold) |
| @pmndrs/uikit-horizon | 1.0.76 | MIT, from its LICENSE file (© 2024 Bela Bohlender; © 2025 Meta Platforms LLC); `package.json` says "SEE LICENSE IN LICENSE" | panel widgets in the "horizon" style. Not used by our code; comes in through `@drawcall/uikitml` | yes: "the Avatar component can not have any children" in `RenderSystems-*.js` | T-101 (declared by the scaffold) |
| @pmndrs/uikit-lucide | 1.0.76 | MIT, from its LICENSE file (© 2024 Bela Bohlender; © 2023 Coconut Capital); `package.json` says "SEE LICENSE IN LICENSE". The icon shapes are the Lucide set (ISC, by the Lucide project); the package does not carry that text, so this part is not verified from the installed files | icons for the panel toolkit. Not used or shown by our code; comes in through `@pmndrs/uikit-horizon` and `@drawcall/uikitml` | yes: the word "lucide" is in `RenderSystems-*.js` 3,189 times; the icon set is built in | T-101 (declared by the scaffold) |

**1.2 Pulled in by those five (60).** Version and licence are from each package's own `package.json`.
| Package | Version | License | Comes in through | In the build |
|---|---|---|---|---|
| @drawcall/uikitml | 0.1.8 | **FLAG: none declared** (§0) | @iwsdk/core (exact version) | **yes** (§0) |
| @iwsdk/xr-input | 1.0.1 | MIT | @iwsdk/core | yes: "SimpleBatchedMesh: Maximum geometry count reached" in `RenderSystems-*.js` |
| @iwsdk/locomotor | 1.0.1 | MIT | @iwsdk/core | yes: its worker is the 199 kB `worker-*.js`. Locomotion is off in `iwsdk.config.json`; the build still writes the file |
| @iwsdk/scene-composition | 1.0.1 | MIT | @iwsdk/core | yes: "Canonical JSON input must be finite JSON data" in `RenderSystems-*.js` |
| elics | 3.4.2 | MIT | @iwsdk/core | yes: "Array/vector types must be read via getVectorView" in `RenderSystems-*.js` |
| three-mesh-bvh | 0.9.16 | MIT | @iwsdk/core, @iwsdk/locomotor | yes: "MeshBVH" 7 times in `RenderSystems-*.js` |
| @preact/signals-core | 1.14.4 | MIT | @iwsdk/core, @iwsdk/xr-input, elics, @pmndrs/uikit, @pmndrs/uikit-pub-sub, @drawcall/uikitml | yes: "Cycle detected" in `RenderSystems-*.js` |
| @pmndrs/handle | 6.6.31 | MIT, from its LICENSE file (© 2024 Bela Bohlender); `package.json` says "SEE LICENSE IN LICENSE" | @iwsdk/core | yes: names from its store (`initialTargetParentWorldMatrix`) in `RenderSystems-*.js` |
| @pmndrs/pointer-events | 6.6.31 | MIT, from its LICENSE file (© 2024 Bela Bohlender; © 2023 Coconut Capital); `package.json` says "SEE LICENSE IN LICENSE" | @iwsdk/core, @iwsdk/xr-input, @pmndrs/handle | yes: "unable to process a pointer capture of type" in `RenderSystems-*.js` |
| zustand | 4.5.7 | MIT | @pmndrs/handle (one file, `screen/camera.js`) | name not found in dist (nor its `getInitialState`) |
| react | 19.3.0 | MIT | zustand, use-sync-external-store | no: no React marker in dist (`react.element`, `react.transitional`, `useSyncExternalStore`) |
| use-sync-external-store | 1.7.0 | MIT | zustand | name not found in dist |
| @babylonjs/havok | 1.3.14 | MIT | @iwsdk/core | no: left out by the IWSDK build plugin because physics is off. `physics-runtime-*.js` says "Physics was excluded from this production build"; "HavokPhysics" is not in dist; dist has no `.wasm` file |
| @types/emscripten | 1.41.6 | MIT | @babylonjs/havok | no: type declarations only |
| @types/three | 0.181.0 | MIT | @iwsdk/core | no: type declarations only |
| @types/webxr | 0.5.24 | MIT | @iwsdk/core, @types/three | no: type declarations only |
| @types/stats.js | 0.17.4 | MIT | @types/three | no: type declarations only |
| @webgpu/types | 0.1.74 | BSD-3-Clause | @types/three | no: type declarations only |
| @dimforge/rapier3d-compat | 0.12.0 | Apache-2.0 | @types/three | name not found in dist |
| @tweenjs/tween.js | 23.1.3 | MIT | @types/three | name not found in dist |
| fflate | 0.8.3 | MIT | @types/three | name not found in dist (`three` carries its own copy: see the note below) |
| meshoptimizer | 0.22.0 | MIT | @types/three | no: name found, code not. "meshopt" in `RenderSystems-*.js` is the name of a glTF extension in three's loader; nothing loads this package |
| @pmndrs/msdfonts | 1.0.76 | **FLAG: OFL-1.1** for 16 font families and Apache-2.0 for Roboto, from its LICENSE file; `package.json` says "SEE LICENSE IN LICENSE". OFL-1.1 is allowed by the policy line above | @pmndrs/uikit, @drawcall/uikitml | no: the IWSDK build plugin swaps all 17 fonts for a stub (`_virtual_iwsdk-disabled-bundled-fonts-*.js`). No font picture or font file is in dist |
| @pmndrs/uikit-pub-sub | 1.0.76 | MIT | @pmndrs/uikit | yes (by import): the toolkit's property class is built on it |
| @zappar/msdf-generator | 1.2.4 | MIT. Its LICENSE file also lists Skia PathOps (BSD-3-Clause), msdfgen (MIT) and stb_truetype (MIT or public domain) | @pmndrs/uikit | yes: `msdf-worker-*.js` (with a WebAssembly binary), the 42 kB `worker-*.js` and one 7 kB `index-*.js`. These are separate files that load only if the panel toolkit asks for them |
| comlink | 4.4.2 | Apache-2.0 | @zappar/msdf-generator | yes: "Comlink.proxy" in the same three files |
| yoga-layout | 3.2.1 | MIT (`package.json`; the package has no licence file) | @pmndrs/uikit | yes: its WebAssembly binary is inside `RenderSystems-*.js` (same first bytes as the package's file) |
| zod | 4.6.5 | MIT | @pmndrs/uikit, @pmndrs/uikit-horizon, @drawcall/uikitml | yes: "ZodError" in `RenderSystems-*.js` |
| entities | 6.0.1 | BSD-2-Clause | @drawcall/uikitml | yes: `missingSemicolonAfterCharacterReference` in `RenderSystems-*.js` |
| @sentry/node | 10.76.2 | MIT | @drawcall/uikitml | **no.** Re-checked 2026-10-13 on both builds: no file of `dist/` contains "sentry". It is an error-reporting package. Only the command `uikitml feedback` loads it (`feedback.js`), and the package's entry point does not load that file. It cannot send anything from the app: its code is not there |
| @sentry/conventions | 0.16.0 | MIT | @sentry/node | name not found in dist |
| @sentry/core | 10.76.2 | MIT | @sentry/node | name not found in dist |
| @sentry/node-core | 10.76.2 | MIT | @sentry/node | name not found in dist |
| @sentry/opentelemetry | 10.76.2 | MIT | @sentry/node | name not found in dist |
| @sentry/server-utils | 10.76.2 | MIT | @sentry/node | name not found in dist |
| @opentelemetry/api | 1.9.1 | Apache-2.0 | @sentry/node | name not found in dist |
| @opentelemetry/api-logs | 0.220.0 | Apache-2.0 | @opentelemetry/instrumentation | name not found in dist |
| @opentelemetry/instrumentation | 0.220.0 | Apache-2.0 | @sentry/node | name not found in dist |
| @opentelemetry/core | 2.12.0 | Apache-2.0 | @opentelemetry/sdk-trace-base | name not found in dist |
| @opentelemetry/resources | 2.12.0 | Apache-2.0 | @opentelemetry/sdk-trace-base | name not found in dist |
| @opentelemetry/sdk-trace | 2.12.0 | Apache-2.0 | @opentelemetry/sdk-trace-base | name not found in dist |
| @opentelemetry/sdk-trace-base | 2.12.0 | Apache-2.0 | @sentry/node | name not found in dist |
| @opentelemetry/semantic-conventions | 1.43.0 | Apache-2.0 | @opentelemetry/sdk-trace-base | name not found in dist |
| import-in-the-middle | 3.5.2 | Apache-2.0 | @sentry/node, @opentelemetry/instrumentation | name not found in dist |
| require-in-the-middle | 8.0.1 | MIT | @opentelemetry/instrumentation | name not found in dist |
| cjs-module-lexer | 2.3.0 | MIT | import-in-the-middle | name not found in dist |
| es-module-lexer | 3.0.3 | MIT | import-in-the-middle | name not found in dist |
| module-details-from-path | 1.0.4 | MIT | import-in-the-middle, require-in-the-middle | name not found in dist |
| debug | 4.4.3 | MIT | require-in-the-middle | no: comes only through `@sentry/node` (note A) |
| ms | 2.1.3 | MIT | debug | no: comes only through `@sentry/node` (note A) |
| commander | 14.0.3 | MIT | @drawcall/uikitml (its command-line file) | name not found in dist |
| commander | 2.20.3 | MIT | nearley | name not found in dist |
| moo | 0.5.3 | BSD-3-Clause | @drawcall/uikitml, nearley | no: no file of uikitml imports it (note A) |
| nearley | 2.20.1 | MIT | @drawcall/uikitml | name not found in dist; no file of uikitml imports it |
| railroad-diagrams | 1.0.0 | CC0-1.0 | nearley | name not found in dist |
| randexp | 0.4.6 | MIT | nearley | name not found in dist |
| discontinuous-range | 1.0.0 | MIT | randexp | name not found in dist |
| ret | 0.1.15 | MIT | randexp | no: comes only through `nearley` (note A) |
| playwright | 1.64.0 | Apache-2.0 | @drawcall/uikitml (its picture renderer) | name not found in dist |
| playwright-core | 1.64.0 | Apache-2.0 | playwright | name not found in dist |

Notes to the table:
- **Note A.** `debug`, `ms`, `moo` and `ret` are common words, so a name search proves nothing. They are counted as not built in because the only code that loads them is not: `debug` and `ms` come only through `@sentry/node`, `ret` only through `nearley`, and no file of `@drawcall/uikitml` 0.1.8 imports `moo` or `nearley`, although its `package.json` lists both.
- **Not in the tree.** `npm ls` on this Mac also prints `@img/sharp-wasm32` 0.35.4 (**FLAG:** "Apache-2.0 AND LGPL-3.0-or-later AND MIT"), `@emnapi/runtime` 1.11.3 (MIT) and `tslib` 2.8.1 (0BSD) as "extraneous". They belong to `sharp`, a build-time picture tool (§2). None of the three names is in dist.
- **Inside `three`.** The `three` package carries other people's libraries in `examples/jsm/libs`. The loaders that IWSDK uses import three of them: `zstddec` (its WebAssembly binary is in `RenderSystems-*.js`: same first bytes), `ktx-parse`, and `fflate` 0.8.2 (MIT, from its header). The `zstddec` and `ktx-parse` files state no licence. **Not verified:** their licences have to be read from their own projects.
- Six packages say "SEE LICENSE IN LICENSE" in `package.json`. Each file was read: five are MIT, one is the font package.

**1.3 Licence texts kept in `LICENSES/`.** MIT, BSD and Apache-2.0 all ask that the notice travels with every copy.
| Text | State |
|---|---|
| `LICENSES/IWSDK-MIT.txt` | present. The same text as the LICENSE file of @iwsdk/core, @iwsdk/xr-input, @iwsdk/locomotor and @iwsdk/scene-composition (compared 2026-10-13). It also covers the scaffold-derived source (§3) |
| three (MIT, © 2010-2025 three.js authors) | **missing** (declared dependency) |
| @pmndrs/uikit, @pmndrs/uikit-horizon, @pmndrs/uikit-lucide (MIT; three different sets of copyright lines) | **missing** (declared dependencies). For the icons, also the Lucide project's ISC text, which the package does not carry |
| elics, three-mesh-bvh, @preact/signals-core, @pmndrs/handle, @pmndrs/pointer-events, @pmndrs/uikit-pub-sub, zod (MIT) | **missing** (pulled in; code in the build) |
| @zappar/msdf-generator (MIT, with the Skia PathOps, msdfgen and stb_truetype notices in the same file) | **missing** (pulled in; code in the build) |
| comlink (Apache-2.0), entities (BSD-2-Clause) | **missing** (pulled in; code in the build) |
| yoga-layout (MIT) | **missing**, and the package has no licence file: the text has to come from its source repository |
| @drawcall/uikitml | no text exists (§0) |

`LICENSES/` is also not part of the built site: nothing copies it into `dist/`, and the build removes licence comments (a search of `dist/` for "@license", "copyright" or "SPDX" finds lines in 2 of its 18 script files). So the published app carries no licence texts today.

## 2. Build/dev dependencies (not shipped)
Not re-checked on 2026-10-13.
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
No picture, sound, font, model or video file is in the repository (checked 2026-10-13 with `git ls-files`). `public/` holds one file, the scene file below.
| Asset | Type | Source | License | Where used |
|---|---|---|---|---|
| All 3D geometry (bed, plants, tide; flat quads for the captions, the panel and the performance read-out) | procedural | entrant-built | original | `src/render/` (`BedRenderer.ts`, `PlantRenderer.ts`, `TideRenderer.ts`, `PerfHud.ts`), `src/ui/` |
| All shaders | code: GLSL text inside TypeScript | entrant-built | original | `src/render/BedRenderer.ts`, `src/render/PlantRenderer.ts` |
| All sounds | synthesized | entrant-built | original (ADR-002) | `src/audio/` |
| Signs on the panel (the settings orb with its three sliders; one-letter signs on buttons) | drawn on a canvas by code; letters come from the device's font | entrant-built | original | `src/ui/PanelSystem.ts`. No icon or SVG file exists |
| Font (captions, panel, landing page, test pages) | **none shipped** | the device's own font | not ours to license | CSS `system-ui, sans-serif` in `src/ui/config.ts`, `src/ui/landing.css` and `proto/*/src/style.css` (one `monospace` rule in `proto/bed`). Our code has no `@font-face` and no `url()`. No font file is in the repository or in `dist/`. The font package `@pmndrs/msdfonts` is installed but not built in (§1.2) |
| App icon / Devpost gallery images | none exist yet; to be captures of the app | entrant-built | original | submission |
| `public/scenes/main.iwsdk.scene.json` | scene file (JSON, 14 lines); the only file in `public/`; copied as it is to `dist/scenes/` | the IWSDK project scaffold (commit 541235b, T-101). T-111 (28ddf1e) removed the scaffold's four sample nodes; what is left is the scaffold's own text | MIT, as the headers of the scaffold's source files state (text in `LICENSES/IWSDK-MIT.txt`); the scene file itself carries no notice | named by `iwsdk.config.json` as the scene. It holds: the format name `iwsdk.scene.v1`, the unit (metres), one component, `IBLGradient` (three colours and a strength for the ambient light), no resources and no nodes |
| Scaffold-derived source code | code | the IWSDK project scaffold (commit 541235b, T-101) | MIT, © Meta Platforms, Inc. and affiliates (text in `LICENSES/IWSDK-MIT.txt`) | `vite.config.ts` (most of the scaffold's settings are still there), `src/assets.ts` and `src/components.ts` (the scaffold's two-line shape; the contents are ours). `src/index.ts` carries the same header but has held no scaffold code since T-128a (3a10e13); the scaffold's one call, `World.create`, is now in `src/app.ts`, which has no header. **Open:** all four headers say "the LICENSE file in the root directory", and no such file exists. The same commit added files with no header (`index.html`, `iwsdk.config.json`, `tsconfig.json`, `src/vite-env.d.ts`, the `iwsdk-*` guides under `.claude/`); which of their lines are the scaffold's was not traced |
| IWSDK default hand and controller models (`cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0`) | glTF | immersive-web/webxr-input-profiles, `packages/assets` | MIT per that package's `LICENSE.md`; not shipped, not fetched | **nowhere** (closed in T-111, 2026-10-10). @iwsdk/xr-input 1.0.1 fetched one of these whenever a hand or controller joined a session; `src/app.ts` makes the SDK create no input model, so nothing is requested. `tests/e2e/01-enter-xr.spec.ts` fails on any request or WebSocket off localhost, with hands and with controllers (emulator evidence only). The URL is still a string inside the SDK code in `dist/` (`RenderSystems-*.js`, seen 2026-10-13), next to two other SDK defaults that nothing in the app triggers: `unpkg.com/three@0.181.0` (Draco/KTX2 decoders, only for a compressed glTF) and `api.dicebear.com` (UIKit `Avatar` default picture). Check again before G1 if a glTF file or a UIKit avatar is ever added |
| Mulberry32 PRNG (algorithm by Tommy Ettinger) | code, about 10 lines | public snippet | CC0 1.0: the header of the author's gist `mulberry32.c` ("Written in 2017 by Tommy Ettinger") dedicates it to the public domain worldwide and cites creativecommons.org/publicdomain/zero/1.0; re-read 2026-10-13 at gist.github.com/tommyettinger/46a874533244883189143505d203312c | shipped in the app: written out in `src/audio/Reverb.ts` and `src/audio/karplus.ts` (noise for the echo and the plucked strings, since T-121 and T-143). Shipped in a test page: `proto/pinch/src/trials.ts` (built to `dist/proto/pinch/`). Tests only: `tests/unit/audio/prng.ts` (the reference) and one test in `tests/unit/garden/rules.test.ts`. `three` has its own copy (`MathUtils.seededRandom`), under three's MIT licence |

## 4. Verification checklist (before submission)
- [ ] §0 is closed
- [ ] `npm ls --omit=dev --all` matches §1 (65 packages). The check is by hand: `scripts/licenses.mjs`, which this line used to name, does not exist
- [ ] Every text listed as missing in §1.3 is in `LICENSES/`, and the built site carries them
- [ ] The four scaffold headers point at a file that exists (§3)
- [ ] No file in `public/` or `src/` originates from a third party without a row above
- [ ] Video contains only app footage, team VO, and app audio
