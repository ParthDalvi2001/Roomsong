# High-Level Design (HLD) / Technical Architecture — Roomsong

**Status:** Approved · **Owner:** software-architect · **Version:** 1.2 (2026-10-10, plan v2.1: PLAN_AMENDMENT_2026-10-10 §6; review round applied the same day; v1.1 applied REPLAN_2026-10-10)
**ADRs:** adr/ADR-001-iwsdk-webxr.md · ADR-002-procedural-audio.md · ADR-003-local-only-persistence.md · ADR-004-github-pages.md (confirmed by D-022: GitHub Pages plus a mirror) · ADR-005-room-signature.md (amended 2026-10-10: D-021, D-025)

---

## 1. Architecture at a glance

```
                     ┌──────────────────────────── Browser (Quest) ────────────────────────────┐
                     │                                                                           │
  WebXR inputs ─────►│  ┌──────────┐   ┌────────────┐   ┌─────────────┐   ┌─────────────────┐   │
  hands, planes,     │  │  room/   │──►│  hands/    │──►│  garden/    │──►│  audio/         │──►│ speakers (stereo, equal-power pan)
  meshes, hit-test,  │  │ placement│   │ gestures   │   │ state+rules │   │ synth+sequencer │   │
  anchors            │  └──────────┘   └────────────┘   └──────┬──────┘   └─────────────────┘   │
                     │        ▲               ▲                │                 ▲               │
                     │        │               │        ┌───────▼────────┐        │               │
                     │  ┌─────┴─────┐   ┌─────┴─────┐  │  persistence/  │  ┌─────┴─────┐         │
                     │  │ ui/       │   │ access/   │  │  IndexedDB     │  │ core/     │         │
                     │  │ panels,   │   │ gaze,     │  └────────────────┘  │ events,   │         │
                     │  │ captions  │   │ one-hand  │                      │ clock,    │         │
                     │  └───────────┘   └───────────┘                      │ settings  │         │
                     │                                                     └───────────┘         │
                     │  ┌──────────────────────── render/ (Three.js, IWSDK ECS) ─────────────┐   │
                     │  │ bed, plants (instanced), tide, halo, tuning ripple, vines, particles │──►│ WebGL2 → XR layers
                     │  └─────────────────────────────────────────────────────────────────────┘   │
                     └───────────────────────────────────────────────────────────────────────────┘
  Hosting: GitHub Pages is the submitted URL, plus a mirror of the same build (D-022). No server. No service worker (offline cut, D-011).
  Room signature path: room/ RoomFeatures ──► garden/ roomSignature() (pure) ──► audio/ setSignature + render/ TuningRipple.
  Input path: an InputSource feeds hands/: WebXR hand joints in XR (IWER's emulated hands included), a pointer in the garden window.
  Garden window (FR-SYS-07, Should S6): without immersive-ar, window/ supplies a fixed camera, a virtual table and the pointer source;
                 every box above runs unchanged. Never the judged path.
```

**Style:** IWSDK **ECS** (entities, components, systems) on top of Three.js. Each folder above is a bounded module with
an explicit public interface (API_SPEC.md). Modules communicate via (a) ECS components/queries and (b) a typed
**event bus** (`core/events.ts`). No module imports another's internals.
Import direction (API_SPEC §1): `core/` imports no other module; `garden/` imports only `core/`; everything else builds on those two.
A component has to be imported to be used, so the components that modules on the same level or below share (`BedAnchor`, `Interactable`,
`Caption`) are declared in `core/components.ts`; every other component stays with the module that writes it (LLD §3).

## 2. Tech stack (versions pinned at scaffold time in T-004; record exact versions in ENVIRONMENT_SETUP.md)

| Layer | Choice | Why |
|---|---|---|
| Runtime | Meta Quest Browser, WebXR `immersive-ar` | Required for passthrough + hands on the web |
| Framework | **Immersive Web SDK (IWSDK)**, `npm create @iwsdk@latest`, TypeScript | Meta's recommended WebXR path; ECS, hands/grab interactions, spatial UI (UIKit), IWER emulator, MCP-based agent tooling |
| 3D | Three.js (bundled with IWSDK) | Industry standard; shader control; instancing |
| Audio | Web Audio API (native) | Zero deps, low latency, equal-power panning (HRTF only for ≤ 2 hero sources, and only if a device A/B justifies it), full synthesis control |
| Build | Vite (IWSDK default) | Fast; HTTPS dev server for the headset |
| Tests | Vitest (unit), Playwright + IWER (e2e, emulated XR), ESLint + Prettier, `tsc --noEmit` | All runnable headless by agents |
| CI/CD | GitHub (D-018); GitHub Pages is the submitted URL, plus a Vercel or Netlify mirror of the same build hash (D-022, DEPLOYMENT_GUIDE §1) | Judges need a public HTTPS URL; the rules name a GitHub page; the mirror is insurance |
| Tooling | `metavr` CLI + MCP, `iwsdk` CLI + MCP (Playwright browser), Meta agentic-tools skills | Lets agents deploy/inspect/test on device and in emulation |

## 3. Module responsibilities

| Module | Responsibility | Owner |
|---|---|---|
| `core/` (+ `src/index.ts`) | `core/`: the app clock (epoch ms plus the `fakeDay` offset; audio time is `AudioEngine.clock`), typed event bus, settings store and the `Settings` type, shared plain types (`Vec2`, `Vec3`, `Mat4`), the shared ECS components, the default tempo, strings, feature flags, logging; it imports no other module. `src/index.ts`: app bootstrap, owns the XR session and emits the three `xr:*` events, the mode gate (XR or garden window), the only file that imports every module | software-architect |
| `room/` | Plane/mesh/hit-test/anchor adapters; **PlacementSolver** (fallback chain; bed centre default 0.45 m, D-020); **RoomFeatures** extraction (table height/area, floor area, walls, ceiling, room volume → `RoomFeatures`, FR-ROOM-10; absorbs room-size estimate; reads the planes itself and gives the same result whichever way the user faces); persistent anchors (**Must**, D-021; the handle is saved with the placement level it was made at, so a restored bed keeps its room signature; fallback = re-place); wall finder (Could, C4) | fullstack-dev |
| `hands/` | **`InputSource`**: the one seam between an input device and the gesture machine (WebXR hand joints, IWER's emulated hands, or a pointer; FR-SYS-07). Hand joint sampling, 1€ filtering, two pinch signals (the platform's `select` for discrete actions, joint distance for pull and drag; FR-HND-02), pose detectors (palm-up, palms-out, wake), gesture state machine (idle → hover → pinched → pull/drag → release; release in the outer zone = remove; discrete actions commit on release, and one `gesture:release` that says what ended is the only event that commits; tracking-loss grace and revert, FR-HND-15), target picking with the hover cue (FR-HND-16: the highlighted cell is the cell a release commits) + bed zone | frontend-dev |
| `garden/` | Pure-TS domain model: Bed (annulus 0.12–0.30 m, 5×16), Cell, Plant, Seed, growth rules, seed supply, remove/undo, **`roomSignature()`** (v1: quantised features → reverb decay, key root and mode; tempo constant; starter voices and palette seed from a hash; LLD §5.8), the three pentatonic modes (D-025). No Three.js, no DOM. Seasons removed (D-011). | backend-dev |
| `audio/` | AudioContext, 5 voice synthesizers (+ Shimmer, Should), scheduler (look-ahead), 24 pooled equal-power panners with the listener at the user's head (`setListenerPose`, every frame), one shared reverb (procedural IR, decay from the signature's RT60, one send level), limiter stage (compressor, then a −1 dBFS ceiling), `setSignature` re-tune, chord tones for the ripple; variation engine (Could). Graph shape: §7, NFR-PERF-10 | backend-dev |
| `persistence/` | Schema, migrations, IndexedDB with localStorage fallback, backup, storage of the anchor handle and its placement level | backend-dev |
| `render/` | ECS systems for bed, plants (InstancedMesh per voice), tide, aurora halo (Must), **TuningRipple** (surface sweeps synced to chord tones, FR-ROOM-12), vines (Could, C4), particles, shaders, Listen-mode lighting, hover cue and tracking-loss tint, flash cap (FR-UI-11), perf HUD. Rendering rules: §7, NFR-PERF-09 | frontend-dev |
| `ui/` | Captions (in the projection layer, not a WebXR quad layer), hint icons, settings panel Sound/Access/Garden (UIKit; Codex cut), 2D landing page, FoV guard | frontend-dev |
| `access/` | Gaze-dwell controller, one-hand mapping, high-contrast & reduced-motion switches, visual beat ring | fullstack-dev |
| `onboarding/` | First-five-minutes state machine (caption sequencing, seed delivery, hint lifecycle) | fullstack-dev |
| `window/` | **Garden window** (FR-SYS-07, Should S6): for a browser without `immersive-ar` (or `?flags=window` in dev) one fixed camera over a virtual table and a pointer `InputSource` (mouse, pen or touch). The same `garden/`, `audio/` and `persistence/`. The headset-free bench and demo, never the judged path (LLD §11) | fullstack-dev |

## 4. Key runtime flows

### 4.1 Boot
`index.html` → `index.ts` → mode gate (`immersive-ar` supported → XR; unsupported, or `?flags=window` → garden window; picks the `InputSource`) →
`World.create()` (IWSDK) with features from FR-SYS-02 → register systems in order
(`RoomSystem → HandSystem → GardenSystem → AudioSystem → RenderSystems → UISystem`) → `persistence.load()` →
`AnchorStore.restore()` if a handle and its placement level are saved (the saved level is the placement level), else (or on failure) `PlacementSolver.run()` and a new anchor made in the background → `RoomFeatures.extract()` (on both paths) → `roomSignature()` → `audio.setSignature()` (before the first scheduled step) → tuning ripple → `onboarding.start()` or `restore()`.
The `AudioContext` is created or resumed inside the Enter gesture, the same one that requests the session (NFR-PERF-10).

### 4.2 Frame (72 Hz)
1. HandSystem samples its `InputSource` (filtered joints, or the pointer), updates gesture state, emits `gesture:*`, `target:hover` and `hands:lost` / `hands:found` events.
2. GardenSystem applies events to the domain model (pure functions) and emits `garden:changed`.
3. AudioSystem: sets the audio listener to the head pose (`setListenerPose`); the scheduler tick (runs every 25 ms on a worker-safe interval; not per frame) reads the model; `garden:changed` updates voice params immediately.
4. RenderSystems update instance matrices/colours from the model (dirty-flagged), animate the tide from the **audio clock**, update vines/particles.
5. UISystem updates captions/panel (only when dirty).
No allocations in steps 1–4 hot paths (pools, preallocated vectors).

### 4.3 Persistence
Any `garden:changed` → debounce 500 ms → `persistence.save(snapshot)`; also on `visibilitychange` and session end.

## 5. Deployment topology
Hosting is decided (D-022, ADR-004): GitHub Pages is the submitted URL, plus a Vercel or Netlify mirror of the same build hash (DEPLOYMENT_GUIDE §1; PoC D1). The freeze date holds for both hosts.

| Env | Branch | URL | Purpose |
|---|---|---|---|
| Local dev | any | `https://<lan-ip>:8081` | Headset over Wi-Fi via IWSDK dev server |
| Local, built | any | `npm run build && npm run preview`, `https://<lan-ip>:4173` | The production build before a release; there is no hosted staging (T-108) |
| Production | `main`, deployed by GitHub Actions | `https://parthdalvi2001.github.io/Roomsong/` (the path is case-sensitive) | The judged URL; frozen from 2026-11-17 |
| Mirror | same build as production | Vercel or Netlify (T-108) | Second link in the Devpost text; same build hash |

## 6. Third-party integrations
None at runtime. Build-time only: npm packages (IWSDK, Three.js, Vitest, Playwright, ESLint, Prettier). All listed in THIRD_PARTY_LICENSES.md.

## 7. Performance budgets (hard; enforced by `xr-perf-budget` skill and tests)

| Budget | Limit | How we stay under |
|---|---|---|
| Frame time | ≤ 13.8 ms (72 Hz) total; JS ≤ 6 ms | Dirty flags, pools, no per-frame allocations, systems early-out |
| Draw calls | ≤ 60 | One InstancedMesh per voice (≤6), bed (1), tide (1), halo (1), tuning ripple (≤3, transient ≤4 s), vines (≤4, Could), particles (≤3 GPU-driven), UI (≤10) |
| Triangles | ≤ 150k | Plants ≤ 600 tris each × 80 cells max = 48k; vines ≤ 20k; halo + ripple ≤ 2k; rest small |
| Textures | ≤ 16 MB GPU; mostly procedural | Procedural noise in shaders; 2–3 small LUTs |
| Shader cost | No full-screen post-processing; bloom faked via additive glow sprites | Quest fill-rate is the bottleneck |
| MSAA | 4×, through the XR layer | Quest handles well; never an own multisampled render target (NFR-PERF-09); keep alpha-blended overdraw low |
| Audio | ≤ 24 voices; ≤ 15% CPU | The graph shape below (NFR-PERF-10): one panner per voice channel from a pool of 24, one shared reverb, voice stealing |
| Download | ≤ 4 MB gzipped | No big assets; tree-shake Three.js; precompress |
| Memory | Stable heap over 10 min | Pools; dispose on remove; leak test TC-PERF-04 |
| **Rendering rules** (NFR-PERF-09) | One light at most (or unlit emissive); no shadow maps; no post-processing and no extra render targets; FFR medium requested; MSAA through the XR layer | Switching render targets mid-frame (a shadow map, a post pass) stops FFR and MSAA from working on Quest, and FFR never helps an intermediate buffer (Meta WebXR FFR doc), so glow and dimming are done in-material. Verified by inspection + `renderer.info` |
| **Audio graph shape** (NFR-PERF-10) | ≤ 24 voices (oldest-quietest stolen: the quietest note, the oldest on a tie; a note still in its attack counts at full level, and a note of the same step is never stolen); 24 pooled **equal-power** `PannerNode`s with a table-scale distance curve and the listener at the user's head; ≤ 2 HRTF "hero" panners, and only if a device A/B justifies them (T-129, W1); exactly **one** `ConvolverNode` on a shared send bus, IR ≤ 2.0 s, decay from the signature's RT60, one send level; scheduler look-ahead 120 ms, tick 25 ms; `AudioContext` created or resumed inside the Enter gesture | HRTF panners and convolvers are the most expensive Web Audio nodes; one of each kind of cost, not one per plant. Detail: LLD §7.1 |

Budgets are unchanged by the re-plan. Plan v2.1 adds the two rule rows (NFR-PERF-09, NFR-PERF-10) and keeps every number: the research's ≤ 100 draw calls was not adopted, ≤ 60 is stricter. Until a headset exists (REPLAN §1) only the emulator-measurable rows (draw calls, triangles, JS ms, heap, allocations via `perf:sample`) are enforced per PR; frame-rate and audio-CPU rows are verified on device once available.

Request **Fixed Foveated Rendering** at medium when available: the `'medium-fixed-foveation-level'` optional feature at session start, or the XR layer's `fixedFoveation` (0–1) at run time (Meta WebXR FFR doc: https://developers.meta.com/horizon/documentation/web/webxr-ffr/). How IWSDK passes it is verified with `hz-quest-verify-first` in T-125; the gain is measured on device in PoC F2.

## 8. Cross-cutting concerns
- **Error handling:** every system wraps update in a guard; an error in one system never stops the frame loop; errors are logged to an in-XR debug panel in dev builds.
- **Feature flags:** `core/flags.ts` with URL query overrides (`?flags=perfHud,fovGuide,noAnchors`) for testing fallbacks.
- **Determinism:** garden logic is pure and seedable; the e2e tests drive it with fixed seeds.
- **Observability (dev only):** perf HUD (fps, draw calls, tris, JS ms, voices, and the most luminance changes any element made in the last second, `maxFlashPerS`, for FR-UI-11), event log overlay.

## 9. Security & privacy
No network after load; CSP; no third-party scripts; no PII. Full plan in SECURITY_PLAN.md.

## 10. Risks & mitigations (technical)

| Risk | Mitigation | Owner |
|---|---|---|
| **No Quest headset on the team (as of 2026-10-10)** — fps, hand feel, pinch accuracy, plane/label availability and untested rooms cannot be verified | Emulator-first: IWER + Playwright pipeline from Phase 0, emulator budgets enforced per PR (§7); headset acquisition is **T-000** with gate H1 = Oct 20; device spike (T-104) and pinch test (T-105) pages are built ready to run the day a headset arrives; if none by Oct 27, *Emergency mode* (REPLAN §6): emulator-recorded video, honest Devpost description, device-dependent NFRs declared unverified; the room signature stays gated (ADR-005) so the Must path never depends on device-only features | architect (plan), Parth (T-000) |
| Persistent anchors missing, or restore unreliable (anchors are Must since D-021) | `AnchorStore` behind an interface; an unsupported or failed restore re-places by the chain and keeps the garden (FR-ROOM-07); the placement level is saved with the handle, so a restored bed keeps its room signature; reliability is validate-first on device (T-104, T-129 A1) | architect |
| Plane labels missing on 3S / planes unavailable | Height-band heuristic (FR-ROOM-01 level 2); hit-test level 3; room signature falls back to Wanderer at level ≥ 3 (ADR-005) | fullstack |
| Room signature flips between sessions in the same room (noise at a bucket boundary) | Key and mode: wide buckets with boundaries between common room sizes and ceiling heights; 1.3 % of ordinary rooms are within the worst-case test tolerance of a root boundary. Reverb decay: less protected, by construction: about 17 % of ordinary rooms are within the worst-case tolerance of a decay boundary; a flip there is one step (0.3–0.4 s) and never changes key or mode (LLD §5.8). Features do not depend on the way the user faces (footprint rectangle, not an axis-aligned box). The noise to expect is far below the tolerance, because the Quest Browser's planes are the user's saved room setup (LLD §5.8); T-129 compares two sessions in one room. No hysteresis in v1 (it needs persisted features); decided again after T-129. TC-SIG-02 | backend |
| Room signature reads as random (a listener does not hear the room as the cause) | v1 keeps the two rules that have evidence (reverb decay and key root from room size) plus one mode choice; tempo and table-height mappings stay out until validated (ADR-005 amendment); tuning ripple with captions that are true for v1; stranger test H13 (UAT-17) | architect |
| Audio clock vs render clock drift | Single source of truth = `AudioContext.currentTime`; tide position derived from it | backend |
| Hand jitter and tracking dropouts | 1€ filter, hysteresis, large hit radii, snapping; hover cue with a dead band and commit on release (FR-HND-16); 200 ms tracking-loss grace, then revert (FR-HND-15) | frontend |
| Fill-rate / overdraw from glow | Additive sprites with small footprints; cap particle counts; measure every sprint | frontend |
