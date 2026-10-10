# Low-Level Design (LLD) / Software Design Document — Roomsong

**Status:** Living · **Owner:** software-architect · **Version:** 1.1 (2026-10-10, applies REPLAN §3 geometry, §4 room signature, §5 scope)
Exact IWSDK/Three.js API names must be verified with `hz-quest-verify-first` + the `iwsdk-reference` MCP before coding; this document fixes *our* structure and contracts, not vendor signatures.

---

## 1. Source layout

```
src/
├── index.ts                    bootstrap: World.create, register systems (IWSDK entry point; was main.ts, T-101)
├── core/
│   ├── events.ts               typed EventBus (see API_SPEC §2)
│   ├── clock.ts                audio-clock-backed time source
│   ├── settings.ts             SettingsStore (reactive, persisted)
│   ├── flags.ts                feature flags + URL overrides
│   ├── strings.ts              ALL user-facing text
│   ├── log.ts                  leveled logger → console + dev overlay
│   └── pool.ts                 generic object pool
├── room/
│   ├── PlacementSolver.ts      fallback chain (FR-ROOM-01)
│   ├── PlaneAdapter.ts         WebXR plane detection → RoomPlane[]
│   ├── MeshAdapter.ts          mesh detection → RoomMesh[]
│   ├── HitTestPlacer.ts        gaze hit-test preview + confirm
│   ├── AnchorStore.ts          create/persist/restore anchor (behind interface)
│   ├── WallFinder.ts           nearest walls for vines (FR-ROOM-04, Should)
│   └── RoomFeatures.ts         planes/meshes → RoomFeatures (FR-ROOM-10); absorbs the old RoomSize.ts (floor area)
├── hands/
│   ├── HandSampler.ts          joints → HandFrame (pooled)
│   ├── OneEuroFilter.ts
│   ├── poses/                  pinch.ts, palmUp.ts, palmsOut.ts, wake.ts
│   ├── GestureMachine.ts       state machine (see §4)
│   ├── TargetPicker.ts         nearest interactable within radius; bed zone (inner/bed/outer)
│   └── HandSystem.ts           ECS system wiring
├── garden/
│   ├── model.ts                types: Bed, Cell, Plant, Seed, GardenState, RoomFeatures, RoomSignature
│   ├── rules.ts                pure functions: plant, move, grow, removePlant, undoRemove
│   ├── growth.ts               age → stage; offline growth (Should)
│   ├── seeds.ts                starter seeds (Must) + daily seed supply (Should)
│   ├── signature.ts            roomSignature(features) — pure, quantised (§5.8); Wanderer default
│   ├── snap.ts                 bed-local pos ↔ (ring, step) on the annulus; bed zone
│   └── GardenSystem.ts         applies gesture events → model → emits garden:changed
├── audio/
│   ├── AudioEngine.ts          context, master bus, limiter, reverb bus
│   ├── Scheduler.ts            look-ahead scheduler (25 ms tick, 120 ms ahead)
│   ├── voices/                 Bell.ts Pad.ts Pluck.ts Bass.ts Choir.ts (Must) + Shimmer.ts (Should) (implement Voice)
│   ├── VoicePool.ts            max 24, stealing
│   ├── Spatializer.ts          PannerNode per plant (pooled)
│   ├── Reverb.ts               procedural impulse responses (3 sizes)
│   ├── theory.ts               modes, keyRoot + degree → Hz; chord tones for the ripple
│   ├── Variations.ts           Listen-mode arrangement variations (Could, C1)
│   └── AudioSystem.ts
├── persistence/
│   ├── schema.ts               versioned types + validators
│   ├── migrations.ts
│   ├── Store.ts                IndexedDB (idb-keyval-like minimal) + localStorage fallback
│   └── PersistenceSystem.ts    debounce + visibility hooks
├── render/
│   ├── BedRenderer.ts          ring/step guides, beat ring
│   ├── PlantRenderer.ts        InstancedMesh per voice; per-instance attrs (height, hue, age, glow)
│   ├── TideRenderer.ts
│   ├── TuningRipple.ts         surface sweep (table → wall → ceiling) synced to chord tones (FR-ROOM-12)
│   ├── HaloRenderer.ts         aurora halo over the bed in Listen mode (Must)
│   ├── VineRenderer.ts         spline tube along wall plane (Should)
│   ├── Particles.ts            GPU-instanced petals/sparks
│   ├── ListenLighting.ts       dim + glow transitions
│   ├── shaders/                plant.vert/frag, tide, ripple, halo, vine, glowSprite (GLSL)
│   ├── PerfHud.ts
│   └── RenderSystems.ts
├── ui/
│   ├── Captions.ts             one caption at a time, FoV-guarded
│   ├── Hints.ts                gesture icon rings
│   ├── Panel.ts                settings panel: Sound / Access / Garden (UIKit)
│   ├── Landing.ts              2D page: Enter button, access toggles, help
│   └── FovGuard.ts             clamps essential UI into ±25°/±20°
├── access/
│   ├── GazeDwell.ts
│   ├── OneHand.ts
│   ├── Contrast.ts
│   ├── Motion.ts
│   └── BeatRing.ts
└── onboarding/
    └── Onboarding.ts           first-five-minutes state machine
tests/
├── unit/                       mirrors src/ (Vitest)
└── e2e/                        Playwright + IWER scenarios
public/
├── scenes/, icons/, manifest.webmanifest        (no service worker — offline support cut, D-011)
```
Removed by the re-plan: `garden/seasons.ts`, `room/RoomSize.ts` (folded into `RoomFeatures.ts`), `public/sw.js`, the Codex panel tab.

## 2. Module ownership (one owner per folder; cross-edits need the owner's review)
`core/` architect · `room/` fullstack · `hands/` frontend · `garden/` backend · `audio/` backend · `persistence/` backend ·
`render/` frontend · `ui/` frontend · `access/` fullstack · `onboarding/` fullstack · `tests/` qa · CI/deploy devops.

## 3. ECS design

### Components (data only)
| Component | Fields | Used by |
|---|---|---|
| `BedAnchor` | `pose: Mat4`, `inner = 0.12`, `outer = 0.30`, `heightOffset`, `source: 'table'|'surface'|'hittest'|'floating'` | room, render, garden |
| `PlantView` | `plantId`, `voice`, `instanceIndex` | render |
| `Interactable` | `kind: 'plant'|'seed'|'orb'|'undo'`, `id`, `radius`, `worldPos` | hands |
| `HandState` | `hand: 'left'|'right'`, `pinch`, `pinchPos`, `palmNormal`, `velocity`, `tracked` (no `wristRoll`: twist cut) | hands, access |
| `Caption` | `key`, `expiresAt` | ui |
| `RoomSurfaces` | `table?: PlaneRef`, `nearestWall?: PlaneRef`, `ceiling?: PlaneRef` (extents + pose, for the ripple) | room, render |
| `VineTarget` | `wallPlaneId`, `path: Vec3[]` | render (Should) |

### Systems (order matters)
`RoomSystem(10) → HandSystem(20) → GazeDwellSystem(25) → GardenSystem(30) → OnboardingSystem(35) → AudioSystem(40, scheduler-driven) → PlantRenderSystem(50) → TideRenderSystem(51) → HaloSystem(52) → VineRenderSystem(53, Should) → ParticleSystem(54) → TuningRippleSystem(55) → UISystem(60) → PerfHudSystem(99)`

RoomSystem is also the producer of `room:features` → (GardenSystem computes) `room:signature`; AudioSystem applies the signature before the first scheduled step so the garden never sounds in the wrong key.

## 4. Gesture state machine (`hands/GestureMachine.ts`)

```
IDLE ──(pinchStart & target=plant)──► PINCHED(plant)
IDLE ──(pinchStart & target=seed)───► CARRYING(seed)
IDLE ──(palmUp 400ms & seedsAvailable)► DELIVER(seed→palm) ──► IDLE
IDLE ──(palmsOut 1.5s)──────────────► LISTEN
LISTEN ──(wake 600ms | pinchStart)──► IDLE
PINCHED ──(|dy|>2cm & |dxz|<2cm)────► PULLING    ──(release)──► IDLE  (commit height)
PINCHED ──(|dxz|>2cm)───────────────► DRAGGING
DRAGGING ──(release, zone=bed)──────► IDLE  (snap/move to nearest free cell)
DRAGGING ──(release, zone=inner)────► IDLE  (revert to origin cell)
DRAGGING ──(release, zone=outer)────► REMOVE → spawn UNDO petal at the release point (5 s)
PINCHED ──(release, no move)────────► IDLE  (no-op)
CARRYING ──(release, zone=bed)──────► PLANT (snap) ──► IDLE
CARRYING ──(release, zone≠bed)──────► seed returns to supply ──► IDLE
ANY ──(tracking lost >300ms)────────► IDLE (revert in-flight change)
```
`zone` = `bedZone(bedLocalXZ)` from `garden/snap.ts`: `inner` if `len < R_in − 0.03` (< 0.09 m), `outer` if `len > R_out + 0.05` (> 0.35 m), else `bed`.
Removed by the re-plan: TWISTING (wrist twist, FR-HND-09 cut) and the velocity-based flick → PRUNE (FR-HND-11 is now a drag-off release; no velocity threshold, so hand jitter at release cannot trigger it).
All thresholds live in `hands/config.ts` (tunable via flags for device tuning sessions).

## 5. Core algorithms

### 5.1 Snap (`garden/snap.ts`) — annulus bed
Constants: `R_IN = 0.12`, `R_OUT = 0.30`, `RINGS = 5`, `STEPS = 16` (ring radii 0.12 / 0.165 / 0.21 / 0.255 / 0.30 m; ring gap 4.5 cm; inner-ring step spacing 2π·0.12/16 ≈ 4.7 cm, outer ≈ 11.8 cm; 80 cells).
```
local = inverse(bedPose) * worldPos                       // bed-local, y up
len   = length(local.xz)
zone  = len < R_IN − 0.03 ? 'inner' : len > R_OUT + 0.05 ? 'outer' : 'bed'   // off-bed if ≠ 'bed'
t     = clamp((len − R_IN) / (R_OUT − R_IN), 0, 1)        // 0..1 across the annulus
ring  = round(t * (RINGS − 1))                            // 0..4 (0 = inner ring, low pitch)
θ = atan2(local.z, local.x); step = mod(round(θ / (2π/STEPS)), STEPS)
```
`snapToCell` returns `null` when `zone ≠ 'bed'`. Occupied → BFS to nearest free cell (ring±1, step±1 first). Hit radius ≥ 4 cm is provisional: the inner ring's 4.7 cm spacing is the tightest case, and the on-device pinch-accuracy test (T-105 / TC-DEV-00) decides the final cell size; if 4 cm fails, the fallback is 12 steps (inner spacing 6.3 cm) with the same 5 rings.

### 5.2 Pitch (`audio/theory.ts`)
`semitone = keyRoot + MODE[mode][ring]` with `ring ∈ 0..4`; `hz = baseHz(voice) · 2^(semitone/12)`. Five rings = five degrees = one pentatonic octave; no octave folding is needed because `RINGS ≤ MODE.length` for all modes.
Modes (degrees 0..4 used; a 6th degree exists only for the hexatonics and is reserved for the ≥3-day octave shimmer): `majorPent = [0,2,4,7,9]`, `dorianHex = [0,2,3,5,7,9]`, `lydianHex = [0,2,4,6,7,9]`.
`keyRoot` is a semitone offset in −3..+4 (A = −3, C = 0, D = +2, E = +4) so the register never drifts more than a major third from C. `mode`/`keyRoot` come from the room signature (§5.8); Wanderer = C majorPent.
Room chord = scale degrees 0, 2, 4 (rings 0, 2, 4): majorPent → [0,4,9] (C–E–A), dorianHex → [0,3,7] (minor triad), lydianHex → [0,4,7] (major triad). These are the tuning-ripple notes and the UI confirm chord.
Base octaves: Bass C2, Pad/Choir C3, Pluck/Bell C4, Shimmer C5.

### 5.3 Scheduler (`audio/Scheduler.ts`)
"Two clocks" pattern: `setInterval` 25 ms → while `nextStepTime < ctx.currentTime + 0.12` → for each plant at `step`, `voice.trigger(timeAt, params)` → `nextStepTime += stepDuration`. Tide render position = `(ctx.currentTime − barStart) / barDuration`.

### 5.4 Growth (`garden/growth.ts`)
`ageDays = (now − plantedAt) / 86400e3`; stage = 0 (<1), 1 (<3), 2 (<7), 3 (≥7). Overnight: on load, compute stage per plant; emit `garden:grown` with deltas for the bloom animation. Octave shimmer gain = `min(1, (ageDays − 3) / 4)` for ≥3 days.

### 5.5 Placement (`room/PlacementSolver.ts`)
Returns `Promise<BedAnchor>`; runs levels with timeouts (L1+L2 3 s combined, L3 10 s, L4 immediate). Each level emits `room:placementLevel` for UI and logging. Clamp (FR-ROOM-03): the bed centre targets 0.40 m forward of the head (allowed 0.35–0.45 m) so the far edge (centre + R_OUT) is 0.65–0.75 m; if the chosen surface point is outside that band, move it along the head→point vector to 0.40 m while staying on the surface polygon when possible. L4 floating: 0.40 m forward, 0.25 m below eye height.

### 5.6 Vines (`room/WallFinder.ts` + `render/VineRenderer.ts`) — Should (S2); the halo (`render/HaloRenderer.ts`) is the Must fallback and always shows
Find ≤2 vertical planes within 3 m, prefer those in front hemisphere. Path: Catmull-Rom from bed edge → wall base → up the wall 1.2–1.8 m with ±0.15 m lateral noise. Tube geometry built once per Listen entry (≤20k tris total); animated by a `growth` uniform.

### 5.7 1€ filter
Standard implementation (Casiez 2012); per-axis; `minCutoff=1.0, beta=0.007, dCutoff=1.0`.

### 5.8 Room signature (`room/RoomFeatures.ts` → `garden/signature.ts` → `render/TuningRipple.ts`) — Should (S1), ADR-005, D-010
Gated on the device spike (T-104): built only if planes or plane labels are available on the test headset; otherwise the app ships Wanderer-only and the pure function stays for later.

**Features (`room/RoomFeatures.ts`, FR-ROOM-10).** Computed once, ≤3 s after session start, from the same planes/meshes the PlacementSolver already queried (no extra XR requests):
`tableHeight` = height of the chosen bed surface above floor (L1/L2 only); `tableArea` = polygon area of that plane; `floorArea` = area of the floor plane, else the XZ bounding-box area of all wall planes, else unknown; `wallCount` = number of vertical planes with height ≥ 1.5 m; `ceilingHeight` = ceiling-plane height above floor; `largestWallWidth` = widest vertical plane; `level` = placement level 1–4. Every unmeasurable field is `undefined` (unknown). Emits `room:features`.

**Quantisation (`garden/signature.ts`, FR-ROOM-11).** Each input is bucketed; the signature depends only on the bucket tuple, so detection noise never changes the song unless a value sits within noise distance of a boundary. Boundaries are placed away from common furniture heights (desk 0.72–0.76 m sits mid-bucket).

| Input | Buckets (unknown → default, marked \*) | Drives |
|---|---|---|
| `tableHeight` (m) | `< 0.62` → A (−3) · `0.62–0.85` → C (0)\* · `0.85–1.00` → D (+2) · `≥ 1.00` → E (+4) | `keyRoot` |
| `floorArea` (m²) | `< 15` → dorianHex · `15–30` → majorPent\* · `> 30` → lydianHex | `mode` |
| `wallCount` | `0–2` → 72 · `3–4` → 84\* · `≥ 5` → 96 | `tempo` (BPM) |
| `floorArea` (m²) | `< 15` → small · `15–30` → medium\* · `> 30` → large (same bounds as FR-ROOM-06) | `reverbSize` |
| `tableArea` (m²) | `< 0.5` → 0 · `0.5–1.5` → 1\* · `> 1.5` → 2 | hash only |
| `ceilingHeight` (m) | `< 2.4` → 0 · `2.4–3.0` → 1\* · `> 3.0` → 2 | hash only |
| `largestWallWidth` (m) | `< 2.5` → 0 · `2.5–4.0` → 1\* · `> 4.0` → 2 | hash only |

Boundaries are half-open (`[lo, hi)`). `h = fnv1a32(keyBucket, modeBucket, tempoBucket, reverbBucket, tableAreaBucket, ceilingBucket, wallWidthBucket)` (7 bytes, FNV-1a 32-bit; no floats enter the hash).
`starterVoices = STARTER_SETS[h % 6]` with `STARTER_SETS = [[bell,pad,pluck], [pluck,choir,bass], [bell,choir,bass], [pad,pluck,bass], [bell,pad,choir], [pluck,pad,bass]]` (every set has one sustaining and one percussive voice; index 0 is the Wanderer set).
`paletteSeed = h` (uint32); the renderer derives a hue rotation `(h % 360)°` and a saturation nudge `((h >>> 9) % 3) − 1` applied to the fixed bioluminescent palette (UX §5).
Wanderer rule: `level ≥ 3`, or `forceSignature=wanderer`, → the whole signature is `{ keyRoot: 0, mode: 'majorPent', tempo: 84, reverbSize: 'medium', starterVoices: [bell,pad,pluck], paletteSeed: 0 }` regardless of other fields. At `level ≤ 2` unknown fields take their default bucket individually.
Stability contract (TC-SIG-02): any input ≥ 5 cm (heights/widths) or ≥ 0.3 m² (areas) from a boundary yields the identical signature under ±5 cm / ±0.3 m² noise; the narrowest buckets (0.15 m for height, 0.6 m for ceiling, 1.0 m² for table area) are ≥ 3× the tolerance, so only the documented boundary case (input within tolerance of a boundary) may flip, and TC-SIG-02 asserts it does. Hysteresis across sessions is deliberately **not** designed in (would need persisted features); revisit only if flapping is observed on device.

**Tuning ripple (`render/TuningRipple.ts` + `audio/theory.chordTones`, FR-ROOM-12).** Triggered by `room:signature` (which GardenSystem emits right after `room:bedPlaced`). Timeline from `t0 = bed placed`:
| t (s) | Surface | Sweep | Note (voice) |
|---|---|---|---|
| 0.3 | table / bed surface | 0.6 s radial ripple across the plane extents | degree 0 (Pad) |
| 1.2 | nearest wall (if any) | 1.0 s sweep up the wall from its base | degree 2 (Bell) |
| 2.6 | ceiling (if any) | 0.8 s sweep across | degree 4 (Pluck) |
| ≤ 4.0 | — | — | `room:tuned` emitted |
A missing surface skips its sweep but its note still rings at the bed at the same time, so the chord is always complete and audible ≤ 4 s (budget 5 s). At L3/L4 all three notes ring at the bed with a single bed ripple. Reduced motion: each surface glows 0.4 s in the same order, same notes. Rendering: one transient quad per surface with a `sweep` uniform (≤ 3 draw calls, ≤ 100 tris, no allocation after warm-up; quads pooled). The notes are scheduled on the audio clock via `AudioEngine.chordTone(degree, time)` so visuals derive from the same clock as the tide.

**Re-tune (FR-ROOM-13).** The signature is recomputed every session and never persisted; `AudioEngine.setSignature()` re-tunes in place (plants keep cells; `theory.ts` recomputes Hz from ring + new key/mode; tempo and reverb follow). The "different room, different song" effect needs no comparison with the previous session.

## 6. Data schemas
See API_SPEC.md §4 (`GardenStateV1`). Validation via a tiny hand-written validator (no runtime schema lib, to save bytes).

## 7. Voice design (`audio/voices/`)
| Voice | Pri | Synthesis | Shape silhouette |
|---|---|---|---|
| Bell | M | 2-op FM (ratio 3.5, index decays), exp decay 1.5 s | Tall bulb with drooping cap |
| Pad | M | 3 detuned saws → LPF (cutoff from hue) → slow attack 0.4 s | Wide soft fan of leaves |
| Pluck | M | Karplus-Strong (noise burst → delay line + LPF feedback) | Thin reed with a bead |
| Bass | M | Sine + 2nd harmonic, soft clip, 0.6 s | Low, broad bulb |
| Choir | M | 3 formant band-passes over a pulse, slow vibrato | Cluster of three rounded petals |
| Shimmer | S (S5) | Band-passed noise grains × 6, high register | Spiky star-burst |

Phase 0 desktop sound prototype (G0) uses Bell, Pad, Pluck only.

All voices expose `trigger(time, { hz, gain, release, cutoffMul, detune })` and `dispose()`.

## 8. Error handling & recovery
- Each system's `update` is wrapped: catch → `log.error` → system disabled for 1 s → re-enabled (circuit breaker).
- Audio context suspended (autoplay) → resume on first user gesture (Enter button already satisfies).
- Save failure → retry with localStorage; still failing → in-memory only + caption "Saving unavailable".

## 9. Dev-only tooling
`?flags=perfHud,fovGuide,eventLog,noAnchors,noPlanes,forceLevel=3,fakeDay=+1,forceSignature=wanderer,pinchTest,capSpike`. `fakeDay` offsets the clock for growth testing; `forceSignature=wanderer` bypasses room features (emulator runs, A/B listening); `pinchTest` / `capSpike` open the on-device pinch-accuracy page (TC-DEV-00) and the capability-spike probe page (TC-DEV-0A).

## 10. Diagrams
*Cut (D-011)* — the diagrams task (T-013) is out of scope for the competition; the ASCII diagrams in HLD §1, LLD §4 and UX §2 are the reference.
