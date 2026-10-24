# Third-Party Licenses & Asset Register — Roomsong

**Status:** Living · **Owner:** devops-engineer (packages) / ux-designer (assets)
Contest rule: Meta may request proof of licence for any material. Every external item is logged here **before** it is added. Runtime policy: original or CC0/OFL/MIT/BSD/Apache/ISC only. No brands, no identifiable people.

**Checked:** 2026-10-13, against `develop` at 85a06fc (T-170). **"In the build" re-checked** 2026-10-13 on a build of the T-171 branch (after the stub of §0). **Re-checked 2026-10-25** (T-170, licence half) against `develop` at 01bf60b: `package-lock.json` is unchanged since 8c7ade2 (12 Oct), and a script compared every row of §1 and §2 with it: all 65 production entries and every §2 package have a row with the locked version and licence, and no row names a package the lock does not hold (no row added or removed). The markers of the "In the build" column were searched again in a build of 23 Oct (`dist/`, 19:40; same lock, and the only change to `vite.config.ts` since is its `cacheDir`): every "yes" marker is still found and every "no" marker is still absent.
- **What ships:** 65 packages are in the production tree (5 declared, 60 pulled in). Code of 14 of them is in the built app (20 before T-171: `@drawcall/uikitml`, `@pmndrs/uikit-horizon`, `@pmndrs/uikit-lucide`, `zod`, `entities` and `comlink` left with the stub). The other 51 are installed but not built in. Two build tools also put a little code of their own into the build (§2: `vite`, `@iwsdk/vite-plugin-dev`).
- **Licences:** 63 of the 65 have a clear permissive licence (46 MIT, 13 Apache-2.0, 3 BSD, 1 CC0). One more is a font package under Apache-2.0 and OFL-1.1; it is not in the build. The one with no licence, `@drawcall/uikitml`, is no longer in the build (§0, closed).
- **Licence texts:** the site ships 21 (§1.3): 16 copied from the packages of `SHIPPED_PACKAGES` and 5 committed in `LICENSES/`, including those of the libraries `three` carries inside itself (§1, note "Inside `three`").
- **Closed 2026-10-25:** the four scaffold headers now point at `LICENSES/IWSDK-MIT.txt`, a file that exists (§3).

How it was checked: `package.json` and `npm ls --omit=dev --all` for the tree; each package's own `package.json` and licence file in `node_modules` for the licence; a text search of the built files (`dist/`, leaving out `dist/LICENSES/`, whose texts name many packages) for what is really built in. Built files are named by their prefix, because the hash in the name changes with each build. Rollup also names the main chunk after a module inside it, so that prefix moves too: `RenderSystems-*.js` on 13 Oct (§0 keeps that name), `HaloSystem-*.js` since (§1 to §3). §2 was re-checked against the lock file on 2026-10-25 (versions and licences); what the build tools ship is the two named above.

---

## 0. Closed (T-171, 2026-10-13): the package with no licence is no longer in the build

**`@drawcall/uikitml` 0.1.8 has no licence. Since T-171 none of its code is in the built app** (way 3 below).

What T-171 found and did:
- **The feature flags alone do not drop it.** With `grabbing` and `spatialUI` set to `false` (the values `init/world-initializer.js` reads: `!!features.spatialUI`, default `true`), the build was the same size and still held the parser. The reason is in IWSDK's source: `init/world-initializer.js` imports `loadUIKitMLAsset` from `ui/uikitml.js` statically and only *calls* it behind the run-time flag; `ui/uikitml.js` imports `parse`, `instantiate` and `resolveKitComponentSets` from the package; three more files import it bare. The package declares no `sideEffects`, so the bundler keeps every module it reaches.
- **A stub stands in for it.** `vite.config.ts` aliases `@drawcall/uikitml` to `build/stubs/uikitml.js` (dev server and build). The stub exports those three names; each throws `UIKitMLRemovedError`, saying why. Only IWSDK's UIKitML panels call them (a PanelUI component, a `.uikitml` asset, the spatialUI feature), and Roomsong uses none. This is the pattern IWSDK's own plugin uses for the physics engine and the fonts it leaves out.
- **Measured** (`node scripts/check-size.mjs`, first load, gzip): 2004.5 kB before, 2004.5 kB with the flags off, 676.0 kB with the stub (696.1 kB with the licence texts of §1.3). `RenderSystems-*.js`: 5,962 kB raw before, 1,399 kB after. The package's three messages ("UIKitML requires exactly one root component.", "Expected a stylesheet selector before declaration block.", "Expected a bundled or @font-face font family") are in no file of `dist/`. "uikitml" is left only in IWSDK's own MIT code (asset kinds, its loader's messages) and in the stub's message.
- **Guards.** `scripts/check-dist.mjs` (in `npm run verify`) fails if a built file holds the package's first two messages. `tests/unit/policy/uikitml-stub.test.ts` pins the alias, the error, and that the stub exports exactly the names `@iwsdk/core` imports. An IWSDK update that imports another name stops the build ("is not exported by build/stubs/uikitml.js").
- **Still installed, not shipped.** The package stays in `node_modules` (IWSDK depends on it). Two development tools run it on this Mac: the IWSDK Vite plugin (to check `.uikitml` files in `public/`; there are none) and the `@iwsdk/reference` command line. Nothing of it is published.

What is and is not there (installed copy, read 2026-10-13):
- Its `package.json` has no `license` field. It names a repository: https://github.com/drawcall-ai/uikitml.
- The package folder holds `package.json`, `README.md`, `dist/` and `skills/`. There is no LICENSE, COPYING or NOTICE file. The README does not mention a licence.
- Online, re-read 2026-10-13 by an automated page fetch: the npm registry entry has no `license` field (the latest version is still 0.1.8; one maintainer, `bela-bohlender`); the repository page shows no licence and no licence file. This matches the first check on 2026-10-10 (T-111, `main` at c82fe59).

How it comes in:
- `@iwsdk/core` 1.0.1 (MIT) depends on exactly this version. Four of its files import it: `ui/uikitml.js`, `transform/transform.js`, `grab/grab-system.js` and `level/level-component-applier.js`.
- Nothing in `src/` or `proto/*/src` imports it. No `.uikitml` file is in the repository. The settings panel and the captions are drawn by our own canvas code.

What was in the build before T-171. Three files of `dist/` contained the word "uikitml":
| Built file | What the mention is | Code of the package? |
|---|---|---|
| `assets/RenderSystems-*.js` (the main chunk; the page loads it on every start) | the package's own error messages: "UIKitML requires exactly one root component." (`parse.js`), "Expected a stylesheet selector before declaration block." (`css.js`), "Expected a bundled or @font-face font family" (`fonts.js`). A search of the installed `@iwsdk`, `@pmndrs` and `@drawcall` packages finds the first two only in this one | **yes**: its parser, its stylesheet reader and its font-name list are built in |
| `assets/world-initializer-*.js` | IWSDK's own text and names ("UIKitML inspection allows at most", `instantiateUIKitML`) | none found |
| `assets/_virtual_iwsdk-disabled-bundled-fonts-*.js` | one error message written by the IWSDK build plugin | no |

Not in the build: the package's command-line tool, its feedback sender (the only code that loads `@sentry/node`) and its picture renderer (the only code that loads `playwright`). None of their text is in `dist/`, and no file of `dist/` contains "sentry".

Why it blocked: with no licence, nothing gives us the right to copy or publish this code, and this list could not show a licence for it if Meta asks (HACKATHON_RULES C3: every third-party asset is licensed and listed). There is no sign of a restrictive licence, and the package is required by Meta's own SDK; neither of those is a licence.

Ways out, as listed before T-171: (1) get a licence stated by the maintainer or the IWSDK team: not needed now, still welcome; (2) show that the code is not in the build: done, by (3) build without it: done, as above. Re-open this section if any `dist/` file again holds the package's text (check-dist says so), or if a feature that needs UIKitML panels is ever wanted.

---

## 1. Runtime dependencies (the production tree; the last column says what is in the build)

**In the build** column. *yes*: text or a binary that belongs to the package's own code was found in `dist/`, and is named. *yes (by import)*: nothing searchable survives the minifier, but code that is in the build imports it. *no*: a reason is given. *name not found in dist*: no built file contains the package's name, and nothing that is built in loads it. A name found is only a hint; a row says so when that is all there is.

**1.1 Declared in `package.json` (5).**
| Package | Version | License | Purpose | In the build | Added by (task) |
|---|---|---|---|---|---|
| @iwsdk/core (Immersive Web SDK) | 1.0.1 | MIT — https://github.com/facebook/immersive-web-sdk | WebXR framework (ECS, XR session, input, scene). With `three`, the only package our code imports | yes: its messages are in `HaloSystem-*.js` and `world-initializer-*.js` | T-101 |
| three (npm alias of `super-three`) | 0.181.0 | MIT — https://threejs.org/ | 3D rendering; the `super-three` fork is what IWSDK requires | yes: "THREE.WebGLRenderer" in `pinch-*.js` (a shared chunk); a second copy, with its MIT notice, is inside the locomotion worker (the 199 kB `worker-*.js`) | T-101 |
| @pmndrs/uikit | 1.0.76 | MIT, from its LICENSE file (© 2024 Bela Bohlender; © 2023 Coconut Capital); `package.json` says "SEE LICENSE IN LICENSE" — https://github.com/pmndrs/uikit | IWSDK's panel toolkit. **Our code does not use it:** nothing in `src/` or `proto/*/src` imports it, and the settings panel and the captions are drawn on a canvas by our own code (`src/ui/PanelSystem.ts`, `src/ui/Captions.ts`). It comes in through `@iwsdk/core`, which imports it statically | yes: "Only pmndrs/uikit components can be added as children" in `HaloSystem-*.js` (re-checked after T-171) | T-101 (declared by the scaffold) |
| @pmndrs/uikit-horizon | 1.0.76 | MIT, from its LICENSE file (© 2024 Bela Bohlender; © 2025 Meta Platforms LLC); `package.json` says "SEE LICENSE IN LICENSE" | panel widgets in the "horizon" style. Not used by our code; comes in through `@drawcall/uikitml` | **no since T-171**: only the stubbed `@drawcall/uikitml` loaded it. "the Avatar component can not have any children" and "uikit-horizon" are in no built file | T-101 (declared by the scaffold) |
| @pmndrs/uikit-lucide | 1.0.76 | MIT, from its LICENSE file (© 2024 Bela Bohlender; © 2023 Coconut Capital); `package.json` says "SEE LICENSE IN LICENSE". The icon shapes are the Lucide set (ISC, by the Lucide project); the package does not carry that text, so this part is not verified from the installed files | icons for the panel toolkit. Not used or shown by our code; comes in through `@pmndrs/uikit-horizon` and `@drawcall/uikitml` | **no since T-171** (3,189 mentions of "lucide" before): the word "lucide" is in no built file | T-101 (declared by the scaffold) |

**1.2 Pulled in by those five (60).** Version and licence are from each package's own `package.json`.
| Package | Version | License | Comes in through | In the build |
|---|---|---|---|---|
| @drawcall/uikitml | 0.1.8 | **FLAG: none declared** (§0) | @iwsdk/core (exact version) | **no since T-171**: `vite.config.ts` swaps it for `build/stubs/uikitml.js` (§0). "uikitml" is left only in IWSDK's own code and the stub's message |
| @iwsdk/xr-input | 1.0.1 | MIT | @iwsdk/core | yes: "SimpleBatchedMesh: Maximum geometry count reached" in `HaloSystem-*.js` |
| @iwsdk/locomotor | 1.0.1 | MIT | @iwsdk/core | yes: its worker is the 199 kB `worker-*.js`. Locomotion is off in `iwsdk.config.json`; the build still writes the file |
| @iwsdk/scene-composition | 1.0.1 | MIT | @iwsdk/core | yes: "Canonical JSON input must be finite JSON data" in `HaloSystem-*.js` |
| elics | 3.4.2 | MIT | @iwsdk/core | yes: "Array/vector types must be read via getVectorView" in `HaloSystem-*.js` |
| three-mesh-bvh | 0.9.16 | MIT | @iwsdk/core, @iwsdk/locomotor | yes: "MeshBVH" 7 times in `HaloSystem-*.js` |
| @preact/signals-core | 1.14.4 | MIT | @iwsdk/core, @iwsdk/xr-input, elics, @pmndrs/uikit, @pmndrs/uikit-pub-sub, @drawcall/uikitml | yes: "Cycle detected" in `HaloSystem-*.js` |
| @pmndrs/handle | 6.6.31 | MIT, from its LICENSE file (© 2024 Bela Bohlender); `package.json` says "SEE LICENSE IN LICENSE" | @iwsdk/core | yes: names from its store (`initialTargetParentWorldMatrix`) in `HaloSystem-*.js` |
| @pmndrs/pointer-events | 6.6.31 | MIT, from its LICENSE file (© 2024 Bela Bohlender; © 2023 Coconut Capital); `package.json` says "SEE LICENSE IN LICENSE" | @iwsdk/core, @iwsdk/xr-input, @pmndrs/handle | yes: "unable to process a pointer capture of type" in `HaloSystem-*.js` |
| zustand | 4.5.7 | MIT | @pmndrs/handle (one file, `screen/camera.js`) | name not found in dist (nor its `getInitialState`) |
| react | 19.3.0 | MIT | zustand, use-sync-external-store | no: no React marker in dist (`react.element`, `react.transitional`, `useSyncExternalStore`) |
| use-sync-external-store | 1.7.0 | MIT | zustand | name not found in dist |
| @babylonjs/havok | 1.3.14 | MIT | @iwsdk/core | no: left out by the IWSDK build plugin because physics is off. `physics-runtime-*.js` and `physics-worker-*.js` (IWSDK's physics worker with the plugin's stand-in for the engine) say "Physics was excluded from this production build"; "HavokPhysics" is not in dist; dist has no `.wasm` file |
| @types/emscripten | 1.41.6 | MIT | @babylonjs/havok | no: type declarations only |
| @types/three | 0.181.0 | MIT | @iwsdk/core | no: type declarations only |
| @types/webxr | 0.5.24 | MIT | @iwsdk/core, @types/three | no: type declarations only |
| @types/stats.js | 0.17.4 | MIT | @types/three | no: type declarations only |
| @webgpu/types | 0.1.74 | BSD-3-Clause | @types/three | no: type declarations only |
| @dimforge/rapier3d-compat | 0.12.0 | Apache-2.0 | @types/three | name not found in dist |
| @tweenjs/tween.js | 23.1.3 | MIT | @types/three | name not found in dist |
| fflate | 0.8.3 | MIT | @types/three | name not found in dist (`three` carries its own copy: see the note below) |
| meshoptimizer | 0.22.0 | MIT | @types/three | no: name found, code not. "meshopt" in `HaloSystem-*.js` is the name of a glTF extension in three's loader; nothing loads this package |
| @pmndrs/msdfonts | 1.0.76 | **FLAG: OFL-1.1** for 16 font families and Apache-2.0 for Roboto, from its LICENSE file; `package.json` says "SEE LICENSE IN LICENSE". OFL-1.1 is allowed by the policy line above | @pmndrs/uikit, @drawcall/uikitml | no: before T-171 the IWSDK build plugin swapped all 17 fonts for a stub (`_virtual_iwsdk-disabled-bundled-fonts-*.js`); since T-171 nothing built in imports them, and that file is gone too. No font picture or font file is in dist |
| @pmndrs/uikit-pub-sub | 1.0.76 | MIT | @pmndrs/uikit | yes (by import): the toolkit's property class is built on it |
| @zappar/msdf-generator | 1.2.4 | MIT. Its LICENSE file also lists Skia PathOps (BSD-3-Clause), msdfgen (MIT) and stb_truetype (MIT or public domain) | @pmndrs/uikit | yes, one file since T-171: the 42 kB `worker-*.js` (its worker source and the msdfgen loader, "createMSDFGenModule"). The build writes it, but no built file names it, so nothing loads it. Gone since T-171: `msdf-worker-*.js` (with its WebAssembly binary) and the 7 kB `index-*.js` |
| comlink | 4.4.2 | Apache-2.0 | @zappar/msdf-generator | **no since T-171** ("Comlink.proxy" is in no built file): only its name is left, in an `import … from "comlink"` line at the top of that unused worker file |
| yoga-layout | 3.2.1 | MIT (`package.json`; the package has no licence file) | @pmndrs/uikit | yes: its WebAssembly binary is inside `HaloSystem-*.js` (same first bytes as the package's file) |
| zod | 4.6.5 | MIT | @pmndrs/uikit, @pmndrs/uikit-horizon, @drawcall/uikitml | **no since T-171**: "ZodError", "$ZodError" and `new Function` are in no built file |
| entities | 6.0.1 | BSD-2-Clause | @drawcall/uikitml | **no since T-171**: `missingSemicolonAfterCharacterReference` is in no built file (the word "entities" is, as a common word) |
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
- **Inside `three`.** The `three` package carries other people's libraries in `examples/jsm/libs`. The loaders that IWSDK uses import three of them: `zstddec` (its WebAssembly binary is in `HaloSystem-*.js`: same first bytes), `ktx-parse`, and `fflate` 0.8.2 (MIT, from its header). The `zstddec` and `ktx-parse` files state no licence, and no package of either is installed: their rows and licences are in the table below.

**Code that `three` carries inside itself** (in the build; not npm packages of the tree, so not counted in the 65). Re-checked after T-171. Upstream texts read 2026-10-13 through GitHub's licence API; each committed text is byte-for-byte that file.
| Library | License | Text from | In the build |
|---|---|---|---|
| zstddec (`examples/jsm/libs/zstddec.module.js`) | MIT, © 2020 Don McCurdy | `LICENSES/zstddec.txt`: the `LICENSE` of `donmccurdy/zstddec` (now redirects to `donmccurdy/zstddec-wasm`), branch `main`, blob 20f1e36. The file also carries Zstandard's BSD licence | yes: "ZSTDDecoder" and its WebAssembly binary (same first bytes as three's file) in `HaloSystem-*.js` |
| Zstandard (inside zstddec's WebAssembly binary) | BSD-3-Clause, © Meta Platforms. zstd is offered under BSD or GPLv2 (its `COPYING`); we use it under BSD | `LICENSES/zstd.txt`: the `LICENSE` of `facebook/zstd`, branch `dev`, blob 7580028 | yes: compiled into that binary |
| ktx-parse (`examples/jsm/libs/ktx-parse.module.js`) | MIT, © 2020 Don McCurdy | `LICENSES/ktx-parse.txt`: the `LICENSE` of `donmccurdy/KTX-Parse`, branch `main`, blob 36d06b1 | yes: "Missing KTX 2.0 identifier." in `HaloSystem-*.js` |
| fflate 0.8.2 (`examples/jsm/libs/fflate.module.js`) | MIT (its header) | `fflate.txt`, copied at build time from the installed `fflate` 0.8.3 (same author) | yes: "invalid zip data" in `HaloSystem-*.js` |

Not checked: which zstd and which KTX-Parse versions three r181 carries. The texts are today's upstream ones.
- Six packages say "SEE LICENSE IN LICENSE" in `package.json`. Each file was read: five are MIT, one is the font package.

**1.3 Licence texts in the built site: `dist/LICENSES/` (since T-171).** MIT, BSD and Apache-2.0 all ask that the notice travels with every copy, and the build removes licence comments. The site publishes the texts at `<site>/LICENSES/`.

How: the `licenseTexts` plugin in `vite.config.ts` writes, at each build, (a) the own licence file of every package in its `SHIPPED_PACKAGES` list, read from `node_modules`, and (b) every `.txt` committed in `LICENSES/`. Copied, not committed, so each text is always the one of the installed version, and a package with no licence file stops the build. Committed only where no package file exists. Each text is named after its package (`@scope/name` → `scope-name.txt`). **The list cannot drift unnoticed:** the build stops when a package (the folder after the last `node_modules/` of a module id) has code in a chunk and no text of that name. Worker bundles are built apart and not seen by that check (today they hold `@iwsdk/locomotor`, `three` and `three-mesh-bvh`, all listed). Code that a package carries inside itself counts as that package (zstddec counts as `three`), so such libraries are listed by hand, in the table above. `scripts/check-dist.mjs` fails a build with no `dist/LICENSES/*.txt`.
| File in `dist/LICENSES/` | From | Covers |
|---|---|---|
| `iwsdk-core.txt`, `iwsdk-xr-input.txt`, `iwsdk-locomotor.txt`, `iwsdk-scene-composition.txt` | each package's LICENSE (MIT, © Meta Platforms) | the four IWSDK runtime packages |
| `iwsdk-vite-plugin-dev.txt` | its LICENSE (MIT, © Meta Platforms) | the stand-in it writes for the left-out physics engine (`physics-runtime-*.js`, and inside `physics-worker-*.js` beside @iwsdk/core's worker code, §2) |
| `three.txt` | its LICENSE (MIT, © 2010-2025 three.js authors) | three |
| `fflate.txt` | the installed `fflate` 0.8.3's LICENSE (MIT, Arjun Barrett) | three's built-in copy of fflate 0.8.2 (note "Inside `three`") |
| `three-mesh-bvh.txt`, `elics.txt`, `preact-signals-core.txt` | each package's LICENSE (MIT) | those packages |
| `pmndrs-uikit.txt`, `pmndrs-uikit-pub-sub.txt`, `pmndrs-handle.txt`, `pmndrs-pointer-events.txt` | each package's LICENSE (MIT) | those packages |
| `zappar-msdf-generator.txt` | its LICENSE (MIT, with the Skia PathOps, msdfgen and stb_truetype notices) | its unused worker file |
| `vite.txt` | its LICENSE.md (MIT; the file also lists the licences of Vite's own Node-side bundles, which do not ship) | Vite's module-preload polyfill and chunk preload helper (§2) |
| `IWSDK-MIT.txt` | committed in `LICENSES/` (the same text as @iwsdk/core's LICENSE, compared 2026-10-13) | the scaffold-derived source (§3) |
| `zstddec.txt`, `ktx-parse.txt`, `zstd.txt` | committed in `LICENSES/` (T-171 review), from the upstream repositories (note "Inside `three`") | three's built-in copies of zstddec (with its WebAssembly binary, built from Zstandard) and ktx-parse |
| `yoga-layout.txt` | committed in `LICENSES/` (T-171). The package has no licence file; its `package.json` says MIT and its source files say "Copyright (c) Meta Platforms, Inc. and affiliates … licensed under the MIT license", so the text is the MIT text with that line (the same as `IWSDK-MIT.txt`). **Not compared** with the LICENSE of the yoga repository | yoga-layout |

Not shipped, and why: `@pmndrs/uikit-horizon`, `@pmndrs/uikit-lucide` (and Lucide's ISC text), `zod`, `comlink`, `entities`: their code left the build with T-171. `@drawcall/uikitml`: no text exists, and its code is not built in (§0).

## 2. Build/dev dependencies (not shipped)
Not re-checked on 2026-10-13, except: two of these tools write a little code of their own into the build, and their licence texts ship (§1.3; checked in T-171). `vite`: the module-preload polyfill (`modulepreload-polyfill-*.js`) and the chunk preload helper (`__vite__mapDeps`, `vite:preloadError`). `@iwsdk/vite-plugin-dev`: the stand-in for the left-out physics engine ("Physics was excluded from this production build" in `physics-runtime-*.js`). No esbuild helper (`__defProp`, `__publicField`, `__toESM`) is in the build.
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
No picture, sound, font, model or video file is in the repository (checked 2026-10-13 with `git ls-files`; again 2026-10-25: none). Two test tools write pictures and sounds into the ignored `.tmp/` folder only, never into `src/`, `public/` or `dist/`: `npm run gallery` (captures of the app in the emulator, `.tmp/gallery/`) and `npm run audio:renders` (WAV files rendered by our own engine, `.tmp/renders/`); both are entrant-made. `public/` holds one file, the scene file below.
| Asset | Type | Source | License | Where used |
|---|---|---|---|---|
| All 3D geometry (bed, plants, tide, seeds, undo petals, Listen dome, aurora halo and orb, tuning ripple, shaping guides, vine, beat ring, gaze reticle, the garden window's table and floor; flat quads for the captions, the hints, the panel and the performance read-out) | procedural | entrant-built | original | `src/render/` (every `*Renderer.ts`, `TuningRipple.ts`, `ShapingGuides.ts`, `outline.ts`, `PerfHud.ts`), `src/access/BeatRing.ts`, `src/access/Reticle.ts`, `src/ui/` (`Captions.ts`, `Hints.ts`, `PanelSystem.ts`), `src/window/WindowStage.ts` |
| All shaders | code: GLSL text inside TypeScript | entrant-built | original | `src/render/`: `BedRenderer.ts`, `HaloRenderer.ts`, `OrbRenderer.ts`, `PetalRenderer.ts`, `PlantRenderer.ts`, `SeedRenderer.ts`, `ShapingGuides.ts`, `TideRenderer.ts`, `TuningRipple.ts`, `outline.ts` |
| All sounds | synthesized | entrant-built | original (ADR-002) | `src/audio/` |
| Signs and icons (the settings orb with its three sliders; one-letter signs on buttons; the hint icons: palm, ghost pinch, pull and drag, Listen, remove arrow, hand out of view; the gaze reticle's dot and ring) | drawn by code: on a canvas (letters from the device's font) or into a texture's pixels | entrant-built | original | `src/ui/PanelSystem.ts`, `src/ui/Hints.ts`, `src/ui/Captions.ts`, `src/access/Reticle.ts` (a `DataTexture` filled by code). No icon or SVG file exists |
| Font (captions, panel, landing page, test pages) | **none shipped** | the device's own font | not ours to license | CSS `system-ui, sans-serif` in `src/ui/config.ts`, `src/ui/landing.css` and `proto/*/src/style.css` (one `monospace` rule in `proto/bed`). Our code has no `@font-face` and no `url()`. No font file is in the repository or in `dist/`. The font package `@pmndrs/msdfonts` is installed but not built in (§1.2) |
| App icon / Devpost gallery images | gallery: emulator captures of the app, made by `npm run gallery` (`tests/tools/gallery.spec.ts`, T-182 prep) into `.tmp/gallery/`, not committed; app icon: none yet | entrant-built | original | submission |
| `public/scenes/main.iwsdk.scene.json` | scene file (JSON, 14 lines); the only file in `public/`; copied as it is to `dist/scenes/` | the IWSDK project scaffold (commit 541235b, T-101). T-111 (28ddf1e) removed the scaffold's four sample nodes; what is left is the scaffold's own text | MIT, as the headers of the scaffold's source files state (text in `LICENSES/IWSDK-MIT.txt`); the scene file itself carries no notice | named by `iwsdk.config.json` as the scene. It holds: the format name `iwsdk.scene.v1`, the unit (metres), one component, `IBLGradient` (three colours and a strength for the ambient light), no resources and no nodes |
| Scaffold-derived source code | code | the IWSDK project scaffold (commit 541235b, T-101) | MIT, © Meta Platforms, Inc. and affiliates (text in `LICENSES/IWSDK-MIT.txt`) | `vite.config.ts` (most of the scaffold's settings are still there), `src/assets.ts` and `src/components.ts` (the scaffold's two-line shape; the contents are ours). `src/index.ts` carries the same header but has held no scaffold code since T-128a (3a10e13); the scaffold's one call, `World.create`, is now in `src/app.ts`, which has no header. All four headers said "the LICENSE file in the root directory", and no such file exists; since 2026-10-25 (T-170) they point at `LICENSES/IWSDK-MIT.txt` (the copyright and the licence statement unchanged). A root `LICENSE` was not added: it would have read as the licence of the whole project. The same commit added files with no header (`index.html`, `iwsdk.config.json`, `tsconfig.json`, `src/vite-env.d.ts`, the `iwsdk-*` guides under `.claude/`); which of their lines are the scaffold's was not traced |
| IWSDK default hand and controller models (`cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0`) | glTF | immersive-web/webxr-input-profiles, `packages/assets` | MIT per that package's `LICENSE.md`; not shipped, not fetched | **nowhere** (closed in T-111, 2026-10-10). @iwsdk/xr-input 1.0.1 fetched one of these whenever a hand or controller joined a session; `src/app.ts` makes the SDK create no input model, so nothing is requested. `tests/e2e/01-enter-xr.spec.ts` fails on any request or WebSocket off localhost, with hands and with controllers (emulator evidence only). The URL is still a string inside the SDK code in `dist/` (in the main chunk: `RenderSystems-*.js` when seen 2026-10-13, `HaloSystem-*.js` when seen 2026-10-25), next to another SDK default that nothing in the app triggers: `unpkg.com/three@0.${…}.0` (Draco/KTX2 decoders, only for a compressed glTF); both are on `scripts/check-dist.allowlist.json`. A third, `api.dicebear.com` (UIKit `Avatar` default picture), left the build with `@pmndrs/uikit-horizon` in T-171. Check again before G1 if a glTF file is ever added |
| Mulberry32 PRNG (algorithm by Tommy Ettinger) | code, about 10 lines | public snippet | CC0 1.0: the header of the author's gist `mulberry32.c` ("Written in 2017 by Tommy Ettinger") dedicates it to the public domain worldwide and cites creativecommons.org/publicdomain/zero/1.0; re-read 2026-10-13 at gist.github.com/tommyettinger/46a874533244883189143505d203312c | shipped in the app: written out in `src/audio/Reverb.ts` and `src/audio/karplus.ts` (noise for the echo and the plucked strings, since T-121 and T-143), `src/audio/voices/Perc.ts` (the percussion's noise) and `src/audio/Layers.ts` (the groove's hash, T-164). Shipped in a test page: `proto/pinch/src/trials.ts` (built to `dist/proto/pinch/`). Tests only: `tests/unit/audio/prng.ts` (the reference) and one test in `tests/unit/garden/rules.test.ts`. `three` has its own copy (`MathUtils.seededRandom`), under three's MIT licence |

## 4. Verification checklist (before submission)
- [x] §0 is closed (T-171; `scripts/check-dist.mjs` re-checks it on every build)
- [x] `npm ls --omit=dev --all` matches §1 (65 packages): 2026-10-25, by a one-off script against `package-lock.json` (every row's version and licence); `npm ls` in the main checkout prints the same tree plus the three extraneous packages of the note. No script is committed: `scripts/licenses.mjs`, which this line used to name, does not exist
- [x] The built site carries a licence text for every "yes" row of §1, and for the libraries inside three (`dist/LICENSES/`, §1.3; T-171). The build stops if a package with code in a chunk has none
- [x] The four scaffold headers point at a file that exists (§3; `LICENSES/IWSDK-MIT.txt`, 2026-10-25)
- [x] No file in `public/` or `src/` originates from a third party without a row above (2026-10-25: `public/` holds only the scene file; in `src/` the Meta header is in the scaffold files only, and the one outside snippet is Mulberry32. A search finds headers and named snippets, not unmarked copied lines)
- [ ] Video contains only app footage, team VO, and app audio
