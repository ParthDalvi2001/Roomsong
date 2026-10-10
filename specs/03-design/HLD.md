# High-Level Design (HLD) / Technical Architecture — Roomsong

**Status:** Approved · **Owner:** software-architect · **Version:** 1.1 (2026-10-10, applies REPLAN_2026-10-10)
**ADRs:** adr/ADR-001-iwsdk-webxr.md · ADR-002-procedural-audio.md · ADR-003-local-only-persistence.md · ADR-004-github-pages.md (hosting choice now deferred, REPLAN §1) · ADR-005-room-signature.md

---

## 1. Architecture at a glance

```
                     ┌──────────────────────────── Browser (Quest) ────────────────────────────┐
                     │                                                                           │
  WebXR inputs ─────►│  ┌──────────┐   ┌────────────┐   ┌─────────────┐   ┌─────────────────┐   │
  hands, planes,     │  │  room/   │──►│  hands/    │──►│  garden/    │──►│  audio/         │──►│ speakers (HRTF)
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
  Hosting: static HTTPS host (choice deferred to Phase 1). No server. No service worker (offline cut, D-011).
  Room signature path: room/ RoomFeatures ──► garden/ roomSignature() (pure) ──► audio/ setSignature + render/ TuningRipple.
```

**Style:** IWSDK **ECS** (entities, components, systems) on top of Three.js. Each folder above is a bounded module with
an explicit public interface (API_SPEC.md). Modules communicate via (a) ECS components/queries and (b) a typed
**event bus** (`core/events.ts`). No module imports another's internals.

## 2. Tech stack (versions pinned at scaffold time in T-004; record exact versions in ENVIRONMENT_SETUP.md)

| Layer | Choice | Why |
|---|---|---|
| Runtime | Meta Quest Browser, WebXR `immersive-ar` | Required for passthrough + hands on the web |
| Framework | **Immersive Web SDK (IWSDK)**, `npm create @iwsdk@latest`, TypeScript | Meta's recommended WebXR path; ECS, hands/grab interactions, spatial UI (UIKit), IWER emulator, MCP-based agent tooling |
| 3D | Three.js (bundled with IWSDK) | Industry standard; shader control; instancing |
| Audio | Web Audio API (native) | Zero deps, low latency, HRTF panner, full synthesis control |
| Build | Vite (IWSDK default) | Fast; HTTPS dev server for the headset |
| Tests | Vitest (unit), Playwright + IWER (e2e, emulated XR), ESLint + Prettier, `tsc --noEmit` | All runnable headless by agents |
| CI/CD | Local `git` now; hosting (GitHub Pages / Vercel / Netlify) decided in Phase 1 (REPLAN §1, DEPLOYMENT_GUIDE §1) | Judges need a public HTTPS URL; no GitHub org yet |
| Tooling | `metavr` CLI + MCP, `iwsdk` CLI + MCP (Playwright browser), Meta agentic-tools skills | Lets agents deploy/inspect/test on device and in emulation |

## 3. Module responsibilities

| Module | Responsibility | Owner |
|---|---|---|
| `core/` | App bootstrap, XR session lifecycle, clock (audio-clock-driven), typed event bus, settings store, strings, feature flags, logging | software-architect |
| `room/` | Plane/mesh/hit-test/anchor adapters; **PlacementSolver** (fallback chain); **RoomFeatures** extraction (table height/area, floor area, walls, ceiling → `RoomFeatures`, FR-ROOM-10; absorbs room-size estimate); wall finder (Should); anchors (Should) | fullstack-dev |
| `hands/` | Hand joint sampling, 1€ filtering, pose detectors (pinch, palm-up, palms-out, wake), gesture state machine (idle → hover → pinched → pull/drag → release; release in the outer zone = remove), target picking + bed zone | frontend-dev |
| `garden/` | Pure-TS domain model: Bed (annulus 0.12–0.30 m, 5×16), Cell, Plant, Seed, growth rules, seed supply, remove/undo, **`roomSignature()`** (quantised features → key/mode/tempo/reverb/starter voices/palette seed, LLD §5.8). No Three.js, no DOM. Seasons removed (D-011). | backend-dev |
| `audio/` | AudioContext, 5 voice synthesizers (+ Shimmer, Should), scheduler (look-ahead), spatialization, reverb (procedural IR), limiter, `setSignature` re-tune, chord tones for the ripple; variation engine (Could) | backend-dev |
| `persistence/` | Schema, migrations, IndexedDB with localStorage fallback, backup, anchor handle storage | backend-dev |
| `render/` | ECS systems for bed, plants (InstancedMesh per voice), tide, aurora halo (Must), **TuningRipple** (surface sweeps synced to chord tones, FR-ROOM-12), vines (Should), particles, shaders, Listen-mode lighting, perf HUD | frontend-dev |
| `ui/` | Captions, hint icons, settings panel Sound/Access/Garden (UIKit; Codex cut), 2D landing page, FoV guard | frontend-dev |
| `access/` | Gaze-dwell controller, one-hand mapping, high-contrast & reduced-motion switches, visual beat ring | fullstack-dev |
| `onboarding/` | First-five-minutes state machine (caption sequencing, seed delivery, hint lifecycle) | fullstack-dev |

## 4. Key runtime flows

### 4.1 Boot
`index.html` → `main.ts` → `createWorld()` (IWSDK) with features from FR-SYS-02 → register systems in order
(`RoomSystem → HandSystem → GardenSystem → AudioSystem → RenderSystems → UISystem`) → `persistence.load()` →
`PlacementSolver.run()` → `RoomFeatures.extract()` → `roomSignature()` → `audio.setSignature()` (before the first scheduled step) → tuning ripple → `onboarding.start()` or `restore()`.

### 4.2 Frame (72 Hz)
1. HandSystem samples joints, filters, updates gesture state, emits `gesture:*` events.
2. GardenSystem applies events to the domain model (pure functions) and emits `garden:changed`.
3. AudioSystem: scheduler tick (runs every 25 ms on a worker-safe interval; not per frame) reads the model; `garden:changed` updates voice params immediately.
4. RenderSystems update instance matrices/colours from the model (dirty-flagged), animate the tide from the **audio clock**, update vines/particles.
5. UISystem updates captions/panel (only when dirty).
No allocations in steps 1–4 hot paths (pools, preallocated vectors).

### 4.3 Persistence
Any `garden:changed` → debounce 500 ms → `persistence.save(snapshot)`; also on `visibilitychange` and session end.

## 5. Deployment topology
Hosting is deferred to Phase 1 (REPLAN §1; DEPLOYMENT_GUIDE §1 compares GitHub Pages / Vercel / Netlify). The table below is the GitHub Pages variant (ADR-004) and is read as "once hosting is chosen"; the staging/production split and the freeze date hold for any host.

| Env | Branch | URL | Purpose |
|---|---|---|---|
| Local dev | any | `https://<lan-ip>:5173` | Headset over Wi-Fi via IWSDK dev server |
| Staging | `develop` | `https://<org>.github.io/roomsong/staging/` | Agents' and human's daily test build |
| Production | `main` → `gh-pages` | `https://<org>.github.io/roomsong/` | The judged URL; frozen from 2026-11-17 |

## 6. Third-party integrations
None at runtime. Build-time only: npm packages (IWSDK, Three.js, Vitest, Playwright, ESLint, Prettier). All listed in THIRD_PARTY_LICENSES.md.

## 7. Performance budgets (hard; enforced by `xr-perf-budget` skill and tests)

| Budget | Limit | How we stay under |
|---|---|---|
| Frame time | ≤ 13.8 ms (72 Hz) total; JS ≤ 6 ms | Dirty flags, pools, no per-frame allocations, systems early-out |
| Draw calls | ≤ 60 | One InstancedMesh per voice (≤6), bed (1), tide (1), halo (1), tuning ripple (≤3, transient ≤4 s), vines (≤4, Should), particles (≤3 GPU-driven), UI (≤10) |
| Triangles | ≤ 150k | Plants ≤ 600 tris each × 80 cells max = 48k; vines ≤ 20k; halo + ripple ≤ 2k; rest small |
| Textures | ≤ 16 MB GPU; mostly procedural | Procedural noise in shaders; 2–3 small LUTs |
| Shader cost | No full-screen post-processing; bloom faked via additive glow sprites | Quest fill-rate is the bottleneck |
| MSAA | 4× | Quest handles well; keep alpha-blended overdraw low |
| Audio | ≤ 24 voices; ≤ 15% CPU | Voice stealing; shared reverb bus; one panner per plant (reuse pool) |
| Download | ≤ 4 MB gzipped | No big assets; tree-shake Three.js; precompress |
| Memory | Stable heap over 10 min | Pools; dispose on remove; leak test TC-PERF-04 |

Budgets are unchanged by the re-plan. Until a headset exists (REPLAN §1) only the emulator-measurable rows (draw calls, triangles, JS ms, heap, allocations via `perf:sample`) are enforced per PR; frame-rate and audio-CPU rows are verified on device once available.

Use **Fixed Foveated Rendering** level 2 via the WebXR `fixedFoveation` layer attribute when available.

## 8. Cross-cutting concerns
- **Error handling:** every system wraps update in a guard; an error in one system never stops the frame loop; errors are logged to an in-XR debug panel in dev builds.
- **Feature flags:** `core/flags.ts` with URL query overrides (`?flags=perfHud,fovGuide,noAnchors`) for testing fallbacks.
- **Determinism:** garden logic is pure and seedable; the e2e tests drive it with fixed seeds.
- **Observability (dev only):** perf HUD (fps, draw calls, tris, JS ms, voices), event log overlay.

## 9. Security & privacy
No network after load; CSP; no third-party scripts; no PII. Full plan in SECURITY_PLAN.md.

## 10. Risks & mitigations (technical)

| Risk | Mitigation | Owner |
|---|---|---|
| **No Quest headset on the team (as of 2026-10-10)** — fps, hand feel, pinch accuracy, plane/label availability and untested rooms cannot be verified | Emulator-first: IWER + Playwright pipeline from Phase 0, emulator budgets enforced per PR (§7); headset acquisition is **T-000** with gate H1 = Oct 20; device spike (T-104) and pinch test (T-105) pages are built ready to run the day a headset arrives; if none by Oct 27, *Emergency mode* (REPLAN §6): emulator-recorded video, honest Devpost description, device-dependent NFRs declared unverified; the room signature stays gated (ADR-005) so the Must path never depends on device-only features | architect (plan), Parth (T-000) |
| Browser lacks persistent anchors | Anchor module behind an interface (Should, S4); fallback = re-place by chain; verify in T-104 | architect |
| Plane labels missing on 3S / planes unavailable | Height-band heuristic (FR-ROOM-01 level 2); hit-test level 3; room signature falls back to Wanderer at level ≥ 3 (ADR-005) | fullstack |
| Room signature flips between sessions in the same room (noise at a bucket boundary) | Wide buckets (LLD §5.8), boundaries away from common furniture heights; TC-SIG-02; hysteresis only if observed on device | backend |
| Audio clock vs render clock drift | Single source of truth = `AudioContext.currentTime`; tide position derived from it | backend |
| Hand jitter | 1€ filter, hysteresis, large hit radii, snapping | frontend |
| Fill-rate / overdraw from glow | Additive sprites with small footprints; cap particle counts; measure every sprint | frontend |
