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
| @drawcall/uikitml | 0.1.8 | **not declared** in package.json / no LICENSE file — https://github.com/drawcall-ai/uikitml | UIKitML panel markup; verify licence before G1 (follow-up) |
| @types/webxr · @types/three | 0.5.24 · 0.181.0 | MIT | types only, not shipped |

## 2. Build/dev dependencies (not shipped)
| Package | Version | License |
|---|---|---|
| @iwsdk/cli · @iwsdk/vite-plugin-dev · @iwsdk/reference | 1.0.1 | MIT |
| vite | 7.3.7 | MIT |
| vitest | 5.0.3 | MIT |
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
| Font (captions/panel) | _tbd: system font or an OFL font (e.g. Inter OFL-1.1)_ — note: @pmndrs/uikit ships an Inter MSDF atlas by default (the build emits an `inter-*.js` chunk, 423 kB) | | OFL-1.1 if kept | ui/ |
| App icon / Devpost gallery images | captures of the app | entrant-built | original | submission |
| **IWSDK starter content (placeholder, must be removed before G1):** `public/audio/chime.mp3`, `public/gltf/webxr-banner/banner.gltf`, `public/textures/webxr.png`, `public/ui/welcome.uikitml`, `public/scenes/main.iwsdk.scene.json` (robot / plant / desk nodes), `src/robot*.ts`, `src/panel.ts`; the robot, plant and desk glTFs are fetched **at runtime from a CDN** (`cdn.jsdelivr.net/npm/@iwsdk/example-assets@0.4.2`) | scaffold template | Meta IWSDK (`@iwsdk/create` 1.0.1) | MIT | nowhere in the product — violates Golden Rules 8 (original assets) and 9 (offline) if shipped; strip in the first `core/` task |

## 4. Verification checklist (before submission)
- [ ] `npm ls --prod --json | node scripts/licenses.mjs` output matches §1
- [ ] No file in `public/` or `src/` originates from a third party without a row above
- [ ] Video contains only app footage, team VO, and app audio
