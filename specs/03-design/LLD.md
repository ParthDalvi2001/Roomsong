# Low-Level Design (LLD) / Software Design Document — Roomsong

**Status:** Living · **Owner:** software-architect · **Version:** 1.2 (2026-10-10, plan v2.1: PLAN_AMENDMENT_2026-10-10 §6, D-020/D-021/D-025; review round applied the same day; v1.1 applied REPLAN §3 geometry, §4 room signature, §5 scope)
Exact IWSDK/Three.js API names must be verified with `hz-quest-verify-first` + the `iwsdk-reference` MCP before coding; this document fixes *our* structure and contracts, not vendor signatures.

---

## 1. Source layout

```
src/
├── index.ts                    bootstrap: World.create, register systems (IWSDK entry point; was main.ts, T-101);
│                               mode gate XR / garden window, picks the InputSource (§11)
├── core/
│   ├── events.ts               typed EventBus + EventMap (core's own events; modules merge theirs in, API_SPEC §2)
│   ├── components.ts           ECS components shared across modules: BedAnchor, Interactable, Caption (§3; API_SPEC §1)
│   ├── config.ts               core's named constants: DEFAULT_TEMPO_BPM, CAPTION_MIN_MS, caption limits, flag bounds, BedAnchor defaults
│   ├── clock.ts                the app clock: ms since the epoch plus the fakeDay offset, with an injectable source.
│   │                           audio/ keeps its own AudioEngine.clock (audio time); core/ cannot import audio/
│   ├── settings.ts             SettingsStore (validate, freeze, emit settings:changed; persistence/ saves) + the Settings type (API_SPEC §1.0)
│   ├── types.ts                Hand, Vec2, Vec3, Mat4: plain shared types (API_SPEC §1.0)
│   ├── flags.ts                feature flags + URL overrides
│   ├── strings.ts              ALL user-facing text
│   ├── log.ts                  leveled logger → console + dev overlay
│   └── pool.ts                 generic object pool
├── room/
│   ├── config.ts               BED_CENTRE_* constants (FR-ROOM-03, D-020) and every placement threshold (FR-ROOM-01, D-034)
│   ├── types.ts                SurfaceRef, RoomPlane, RoomMesh, RoomSurfaces, BedPlacement: plain data (API_SPEC §1.3)
│   ├── events.ts               the room:* events room/ emits, merged into core's EventMap (API_SPEC §2); declarations only
│   ├── PlacementSolver.ts      fallback chain (FR-ROOM-01), reach clamp (FR-ROOM-03), bed frame (D-029); driven by update() each frame
│   ├── PlaneAdapter.ts         WebXR plane detection → RoomPlane[]
│   ├── MeshAdapter.ts          mesh detection → RoomMesh[]
│   ├── HitTestAdapter.ts       WebXR hit-test along the gaze → the point it meets; the level-3 pinch is PlacementSolver.confirm(), the preview is T-128
│   ├── AnchorStore.ts          create/persist/restore anchor (behind interface; Must, D-021; fallback = re-place)
│   ├── WallFinder.ts           nearest walls for vines (FR-ROOM-04; Could C4, D-021)
│   └── RoomFeatures.ts         planes/meshes → RoomFeatures incl. roomVolume (FR-ROOM-10); absorbs the old RoomSize.ts (floor area)
├── hands/
│   ├── config.ts               every gesture threshold as a named constant (API_SPEC §1.4)
│   ├── InputSource.ts          the InputSource interface (FR-SYS-07; API_SPEC §1.4)
│   ├── HandSampler.ts          WebXR joints + select events → the caller's HandFrame, filled in place (no pool); implements InputSource; IWER's emulated hands take the same path
│   ├── OneEuroFilter.ts
│   ├── poses/                  pinch.ts, palmUp.ts, palmsOut.ts, wake.ts
│   ├── GestureMachine.ts       state machine incl. tracking-loss grace and commit on release (see §4)
│   ├── TargetPicker.ts         nearest interactable within radius; hovered target and the cell a release would commit, with dead band (FR-HND-16); bed zone (inner/bed/outer)
│   └── HandSystem.ts           ECS system wiring; samples the injected InputSource each frame
├── garden/
│   ├── config.ts               bed constants (§5.1: radii, rings, steps, zone margins), PULL_RANGE_M, NEW_PLANT_HEIGHT = 0.55;
│   │                           the signature constants (§5.8) join it with signature.ts
│   ├── model.ts                types: Cell, Seed, Plant, GardenState, RoomFeatures, RoomSignature, ModeId, UndoToken, Result + MODE_DEGREES
│   ├── rules.ts                pure functions: plant, move, grow, removePlant, undoRemove
│   ├── growth.ts               age → stage; offline growth (Should)
│   ├── seeds.ts                starter seeds (Must) + daily seed supply (Should)
│   ├── signature.ts            roomSignature(features) v1 — pure, quantised (§5.8); Wanderer default; chordDegrees(mode)
│   ├── snap.ts                 bed-local pos ↔ (ring, step) on the annulus; bed zone
│   └── GardenSystem.ts         applies gesture events → model → emits garden:changed
├── audio/                      as built in T-121; every file but AudioSystem.ts is free of core/ at run time, so the engine loads in a bare page
│   ├── config.ts               VOICE_CAP, scheduler, panner, reverb, limiter and voice constants (§7.1)
│   ├── AudioEngine.ts          the AudioEngine interface and its class: context, master gain, send bus and the one ConvolverNode,
│   │                           plant records and syncPlants, the 25 ms tick, suspend and resume (§7.1)
│   ├── AudioSystem.ts          createAudioEngine(): the engine wired to settings:changed and the xr:* events; the garden and room events
│   │                           and the per-frame listener pose join it with T-128
│   ├── Scheduler.ts            look-ahead scheduler (25 ms tick, 120 ms ahead), pure: the clock is injected (§5.3)
│   ├── VoicePool.ts            24 voice channels and their note records; oldest-quietest stealing, attack counted as full level (§7.1)
│   ├── Spatializer.ts          the 24 pooled channel strips (input + equal-power PannerNode) and the listener pose (NFR-PERF-10)
│   ├── Reverb.ts               the procedural impulse response for a given RT60 (≤ 2.0 s); the ConvolverNode itself is in AudioEngine.ts
│   ├── limiter.ts              the master limiter: compressor, then the −1 dBFS ceiling curve (§7.1)
│   ├── mapping.ts              plant height and hue → VoiceParams (FR-MUS-05)
│   ├── theory.ts               keyRoot + MODE_DEGREES[mode][ring] → Hz; the chord tones for the ripple join it with T-142
│   ├── karplus.ts              the Karplus-Strong string, rendered by pure code (§7)
│   ├── prng.ts                 seeded noise for the strings and the impulse response
│   ├── voices/                 note.ts (Voice, VoiceParams, the reusable note record with its steal fade), Bell.ts Pad.ts Pluck.ts;
│   │                           Bass.ts Choir.ts (Must, T-144) + Shimmer.ts (Should) (implement Voice)
│   └── Variations.ts           Listen-mode arrangement variations (Could, C1; not built)
├── persistence/
│   ├── config.ts               storage names, size bounds, SAVE_DEBOUNCE_MS, IDB_OPEN_TIMEOUT_MS (API_SPEC §4)
│   ├── schema.ts               the version-1 validator, hand-written: the trust boundary for stored data
│   ├── migrations.ts
│   ├── Store.ts                IndexedDB + localStorage fallback behind one four-call key-value interface; backup
│   └── PersistenceSystem.ts    the debounce: a plain class that listens to no event; src/index.ts calls save() and flush()
├── render/
│   ├── config.ts               FLASH_CAP_PER_S, FLASH_MIN_DELTA (API_SPEC §1.8); tuning-ripple timeline (§5.8)
│   ├── BedRenderer.ts          ring/step guides, beat ring
│   ├── PlantRenderer.ts        InstancedMesh per voice; per-instance attrs (height, hue, age, glow)
│   ├── TideRenderer.ts
│   ├── TuningRipple.ts         surface sweep (table → wall → ceiling) synced to chord tones (FR-ROOM-12)
│   ├── HaloRenderer.ts         aurora halo over the bed in Listen mode (Must)
│   ├── VineRenderer.ts         spline tube along wall plane (Could C4, D-021)
│   ├── Particles.ts            GPU-instanced petals/sparks
│   ├── ListenLighting.ts       dim + glow transitions
│   ├── FlashGuard.ts           caps every animated element at FLASH_CAP_PER_S = 3 luminance changes per second; reports maxFlashPerS (FR-UI-11, §5.9)
│   ├── shaders/                plant.vert/frag, tide, ripple, halo, vine, glowSprite (GLSL)
│   ├── PerfHud.ts
│   └── RenderSystems.ts
├── ui/
│   ├── Captions.ts             one caption at a time, FoV-guarded; drawn in the projection layer, not a WebXR quad layer (T-126)
│   ├── Hints.ts                gesture icon rings
│   ├── Panel.ts                settings panel: Sound / Access / Garden (UIKit)
│   ├── Landing.ts              2D page: Enter button, access toggles, help
│   └── FovGuard.ts             clamps essential UI into ±25°/±20°
├── access/
│   ├── GazeDwell.ts            dwell time = Settings.dwellMs (600 / 900 / 1200 ms, FR-HND-12)
│   ├── OneHand.ts
│   ├── Contrast.ts
│   ├── Motion.ts
│   └── BeatRing.ts
├── onboarding/
│   └── Onboarding.ts           first-five-minutes state machine
└── window/                     garden window (FR-SYS-07, Should S6; §11)
    ├── WindowStage.ts          one fixed camera + a virtual table; no XR session
    └── PointerSource.ts        mouse / pen / touch → HandFrame (sticky tracking, latched edges); implements InputSource
tests/
├── unit/                       mirrors src/ (Vitest)
└── e2e/                        Playwright + IWER scenarios
public/
├── scenes/, icons/, manifest.webmanifest        (no service worker — offline support cut, D-011)
```
Removed by the re-plan: `garden/seasons.ts`, `room/RoomSize.ts` (folded into `RoomFeatures.ts`), `public/sw.js`, the Codex panel tab.
Added in T-106: `core/config.ts`. Added by plan v2.1: `core/types.ts`, `core/components.ts`, the five other `config.ts` files named above, `hands/InputSource.ts`, `render/FlashGuard.ts`, `window/`. Every module that emits events also has an `events.ts`: its `EventMap` declarations and nothing else, the first file of the module to land (API_SPEC §2). Import direction between the folders: API_SPEC §1.

## 2. Module ownership (one owner per folder; cross-edits need the owner's review)
`core/` architect · `room/` fullstack · `hands/` frontend · `garden/` backend · `audio/` backend · `persistence/` backend ·
`render/` frontend · `ui/` frontend · `access/` fullstack · `onboarding/` fullstack · `window/` fullstack · `tests/` qa · CI/deploy devops.

## 3. ECS design

### Components (data only)
| Component | Declared in | Fields | Written by → read by |
|---|---|---|---|
| `BedAnchor` | `core/` | no pose field: the pose is the entity's own transform (below); `inner = 0.12`, `outer = 0.30` (both Float64), `heightOffset`, `source: 'table'\|'surface'\|'hittest'\|'floating'` | room → hands (bed-local conversion, zone), render, audio (`syncPlants`) |
| `PlantView` | `render/` | `plantId`, `voice`, `instanceIndex` | render |
| `Interactable` | `core/` | `kind: 'plant'\|'seed'\|'orb'\|'undo'\|'panel'`, `id`, `radius`, `worldPos` | render (plants, seeds, the Listen orb, the undo petal), ui (one per panel control) → hands (TargetPicker), access (gaze targets) |
| `HandState` | `hands/` | `hand: 'left'\|'right'`, `pinch`, `select`, `pinchPos`, `palmPos`, `palmNormal`, `velocity`, `tracked` (no `wristRoll`: twist cut) | hands → access, render, onboarding |
| `Caption` | `core/` | `key` (a key of `core/strings.ts`), `expiresAt` | render (tuning ripple), `src/index.ts` ("Saving unavailable", from PersistenceSystem's `onSaveFailed`, §8), onboarding, ui → ui (`Captions.ts`, the only reader) |
| `RoomSurfaces` | `room/` | `table?`, `nearestWall?`, `ceiling?`: one `SurfaceRef` each (extents + pose, for the ripple) | room → render |
| `VineTarget` | `render/` | `wallPlaneId`, `path: Vec3[]` | render (Could C4) |

Three components are declared in `core/` because a component has to be imported to be queried or attached, and the import direction (API_SPEC §1) forbids importing a module on the same level or above. `BedAnchor` is read by hands, which sits beside room. `Interactable` is attached by render and ui and read by hands, below them. `Caption` is raised by render and onboarding, and by `src/index.ts` for persistence (the save-failed caption, §8: PersistenceSystem is a plain class and creates no entity), and drawn by ui: a module raises a caption by creating an entity with a `Caption`, and never calls `ui/`. Garden uses no component; it gets `room:bedPlaced` and `room:anchored` and needs no pose. All components are registered in `src/components.ts`. The bed's pose (settled in T-106) is the transform of the entity that carries `BedAnchor`, not a component field: elics 3.4.2 has no matrix field type, and IWSDK gives every entity an `object3D`. A reader takes `entity.object3D.matrixWorld.elements`, which is a `Mat4` (API_SPEC §1.0), and null-checks `object3D` first (it is optional on an entity). room/ sets the transform and calls `updateMatrixWorld()` when it places or moves the bed, so a reader in the same frame sees the new pose. `inner` and `outer` are Float64: a Float32 field reads 0.12 back as 0.11999999731779099. Checked against `node_modules/elics/lib/types.d.ts` and `node_modules/@iwsdk/core/dist/ecs/entity.d.ts` (@iwsdk/core 1.0.1).
Panel controls are direct pinch targets (T-151: "large pinch targets over ray UI"). `ui/Panel.ts` attaches one `Interactable { kind: 'panel' }` per control, so a control goes through the same picker, hover cue and commit on release as a plant, and gaze dwell finds it the same way. How a UIKit control reports its world position is checked with `iwsdk-reference` in T-151.

### Systems (order matters)
`RoomSystem(10) → HandSystem(20) → GazeDwellSystem(25) → GardenSystem(30) → OnboardingSystem(35) → AudioSystem(40, scheduler-driven) → PlantRenderSystem(50) → TideRenderSystem(51) → HaloSystem(52) → VineRenderSystem(53, Could) → ParticleSystem(54) → TuningRippleSystem(55) → UISystem(60) → PerfHudSystem(99)`

RoomSystem is also the producer of `room:features` → (GardenSystem computes) `room:signature`; AudioSystem applies the signature before the first scheduled step so the garden never sounds in the wrong key.
The garden window (§11) registers the same systems in the same order; only the `InputSource` given to HandSystem and the camera differ.

## 4. Gesture state machine (`hands/GestureMachine.ts`)

`HandSystem` samples the injected `InputSource` once per frame for each hand it reports (API_SPEC §1.4) and feeds the `HandFrame` to the machine. The machine cannot tell WebXR hands, IWER's emulated hands and a pointer apart (§11).

```
IDLE ──(pinchStart & target=plant)──► PINCHED(plant)
IDLE ──(pinchStart & target=seed)───► CARRYING(seed)
IDLE ──(pinchStart & target∈{orb,undo,panel})► PRESSED(target)
IDLE ──(palmUp 400ms & seedsAvailable)► DELIVER(seed→palmPos) ──► IDLE
IDLE ──(palmsOut 1.5s)──────────────► LISTEN
LISTEN ──(wake 600ms | pinchStart)──► IDLE
PRESSED ──(release, hover = pressed target)► IDLE  (release 'press', target: the petal undoes, a control acts; the Listen orb ──► LISTEN)
PRESSED ──(release anywhere else)───► IDLE  (release 'press', target null: nothing happens)
PINCHED ──(|d|≥2cm & |dy|≥|dxz|)────► PULLING
PINCHED ──(|d|≥2cm & |dxz|>|dy|)────► DRAGGING
PINCHED ──(release, |d|<2cm)────────► IDLE  (release 'none': no-op)
PULLING ──(release)─────────────────► IDLE  (release 'pull', dy: garden sets the height; the plant never moves)
DRAGGING ──(release, zone=bed)──────► IDLE  (release 'drag', cell = the hovered free cell: garden moves the plant)
DRAGGING ──(release, zone=inner)────► IDLE  (release 'drag', cell null: the plant returns to its origin cell)
DRAGGING ──(release, zone=outer)────► REMOVE → spawn UNDO petal at the release point (5 s)
CARRYING ──(release, zone=bed)──────► PLANT (release 'carry', cell = the hovered free cell) ──► IDLE
CARRYING ──(release, zone≠bed, or bed full)► seed returns to supply ──► IDLE
HELD ──(tracked=false)──────────────► HELD, frozen  (emit hands:lost; the grace starts)
HELD, frozen ──(tracked=true <200ms)► HELD          (emit hands:found; the gesture continues)
HELD, frozen ──(200ms elapsed)──────► IDLE          (emit gesture:trackingLost; revert)
```
`HELD` = any of PRESSED, PINCHED, PULLING, DRAGGING, CARRYING. `d` = pinch point − pinch origin in bed-local space; `dy` is its vertical part, `dxz` its horizontal part. `release 'x'` is the `gesture` field of `gesture:release`. Once it has arrived, a delivered seed rests at `HandFrame.palmPos` and follows it with no smoothing; the picker sees it there as an ordinary `Interactable`.
`zone` = `bedZone(bedLocalXZ)` from `garden/snap.ts`: `inner` if `len < R_in − 0.03` (< 0.09 m), `outer` if `len > R_out + 0.05` (> 0.35 m), else `bed`. With the bed centre at 0.45 m the `outer` zone starts 0.80 m from the head on the far side, which is beyond the 0.75 m reach cap; it starts 0.57 m away to either side and 0.10 m away on the near side. So a plant is removed by dragging it off sideways or towards the body, and the remove hint points that way (UX); the far side is never the only way.

**Commit on release (FR-HND-16).** Nothing changes the garden before a pinch ends. While a plant is held, `gesture:pull` and `gesture:drag` only drive previews (render, and the quiet audio preview). `gesture:release` is the one event that commits, and it says what ended: `gesture` = `press`, `carry`, `drag`, `pull` or `none`, with the committed `target`, the `cell` (carry and drag only, already resolved to a free cell by the hover below) and `dy` (pull only: the total vertical travel since pinch start). The full table is in API_SPEC §1.4. Garden acts on `gesture` alone. A pull release carries `cell = null`, so a pulled plant whose hand drifted sideways cannot be moved; its new height is `heightAfterPull(height, dy)` (FR-HND-08, in `garden/`), the same function the preview uses, so the height shown while pulling is the height that is saved. Discrete actions (planting a carried seed, the Listen orb, the undo petal, a panel control) take effect on release over the hovered target, never on pinch start; moving off the target before the release cancels. In the frame of a release the hover is updated first, then the release is evaluated.

**Dominant axis (FR-HND-08/10).** Inside the dead zone (`|d| < DRAG_DEAD_ZONE_M`, 2 cm) a pinched plant does not react. On the first frame outside it the larger part of `d` decides: `|dy| ≥ |dxz|` → PULLING, otherwise DRAGGING. The choice is latched until release, so a pull never turns into a drag. A tie goes to PULLING, the gesture that cannot remove a plant. Provisional until the device pinch test (T-105).

**Hover (FR-HND-16, `hands/TargetPicker.ts`).** Every frame, for each tracked hand, the picker finds what a pinch would act on.
- *Empty hand:* the nearest `Interactable` within that target's own radius (at least `HIT_RADIUS_M`, 4 cm; nearest wins; API_SPEC v1.2.3). The current target is kept until another candidate is at least `HOVER_DEAD_BAND_M` (0.5 cm) closer, and it is dropped once it is further away than `HIT_RADIUS_M + HOVER_DEAD_BAND_M`, so the highlight cannot flicker between neighbours or at the edge of the radius.
- *Carrying a seed or dragging a plant:* the cell a release would commit. The picker snaps the pinch point (`snapToCell`, with the same 0.5 cm dead band between neighbouring cells) and then resolves it with `nearestFreeCell(state, cell, draggedPlantId)`, using the plants of the latest `garden:changed`; a dragged plant's own cell counts as free. The cell is `null` when the zone is not `bed` or the bed is full.

`target:hover { hand, target, cell }` is emitted only when the choice changes; render draws the cell ghost or the plant glow from it. The ghost therefore shows the cell that will get the plant, also when the cell under the hand is occupied, and `gesture:release.cell` is that hovered cell, not a fresh snap. The hover is frozen during a tracking-loss grace and cleared (`target: null, cell: null`) when the grace expires or an empty hand is lost.

**Tracking loss (FR-HND-15, NFR-REL-02).** The moment `HandFrame.tracked` goes false, `hands:lost { hand }` is emitted, once; `hands:found { hand }` is emitted once on return. render and ui show the tint and the hint only for a hand that held a gesture when it was lost, until `hands:found` and for at most 5 s; an empty hand shows neither (UX §3.4, D-030). A held gesture is frozen at the last pinch point for `TRACKING_GRACE_MS` (200 ms; tunable 150–250). Tracking back inside the grace: the gesture continues from the new sample (a pinch that opened meanwhile is an ordinary release). Grace expired: `gesture:trackingLost { hand }`, the state returns to IDLE and the in-flight change is reverted: a dragged plant lerps back to its cell over `REVERT_LERP_MS` (150 ms), a pulled plant returns to the height it had at pinch start, a carried seed returns to the supply, a pressed target is cancelled. Nothing is committed before release, so the garden model needs no undo and cannot be left half-changed. Pose timers (palm-up, palms-out, wake) restart when a hand is lost.

**Pinch signal (FR-HND-02; the T-124 rule).** An `InputSource` reports two booleans and the machine uses each for one kind of action.
- `HandFrame.select`, the tap signal, is the platform's own pinch classifier: true from `selectstart` to `selectend` of that hand's input source. Discrete actions use it: a pinch on a seed, the Listen orb, the undo petal or a panel control, and a pinch on nothing (wake), start and end on `select`.
- `HandFrame.pinch`, the hold signal, is ours: the thumb-tip to index-tip distance with hysteresis (pinch below `PINCH_ENTER_M` = 2.0 cm, release above `PINCH_RELEASE_M` = 3.2 cm), each edge confirmed over `PINCH_DEBOUNCE_FRAMES` (2) consecutive samples (27.8 ms at 72 Hz), with no new pinch for `PINCH_LOCKOUT_MS` (130 ms) after a release. The lockout applies to `select` as well; hysteresis and debounce do not, because the platform has done its own. A pinch on a plant starts and ends on `pinch`: it can become a pull or a drag, that is not known when it starts, and both are continuous holds whose release point is ours to place.

The hovered target at the moment a pinch starts decides which signal it uses, and its release is the falling edge of that same signal. This is the rule of the T-124 card and of plan v2.1 ("`selectstart`/`selectend` for discrete pinch, joint distance only for continuous pull"); the v1.2 draft's "OR the two signals" is *Cut*. A source with no platform classifier reports `select = pinch`: the pointer, where both are the button, and any XR session that delivers no `select*` for hands. Both signals are made inside the `InputSource`, not in the machine. Raw joints only: IWSDK grab components are not used (plan v2.1; grab under hand tracking is a known IWSDK issue, research §9.2). Provisional until T-105. Not verified: Meta's hands page says a pinch is exposed as a button press on the hand's emulated gamepad and does not mention `select*` (https://developers.meta.com/horizon/documentation/web/webxr-hands/); what the Quest Browser and IWER deliver is checked with `hz-quest-verify-first` before T-124 codes it.

Removed by the re-plan: TWISTING (wrist twist, FR-HND-09 cut) and the velocity-based flick → PRUNE (FR-HND-11 is now a drag-off release; no velocity threshold, so hand jitter at release cannot trigger it).
Replaced by plan v2.1 (D-021): the single rule `ANY ──(tracking lost >300ms)──► IDLE` (now the 200 ms grace above) and the per-axis thresholds `|dy|>2cm & |dxz|<2cm` (now the dominant-axis rule). Added: PRESSED, so the orb, the undo petal and panel controls commit on release.
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
Frame (D-029): bed-local +x points to the seated user's right, +y up, +z from the bed centre toward the user. So step 0 is at +x and the steps advance toward +z, clockwise seen from above: step 4 nearest the user, step 8 left, step 12 farthest.
`snapToCell` returns `null` when `zone ≠ 'bed'`. Occupied → BFS to nearest free cell (ring±1, step±1 first): `nearestFreeCell`, which the picker applies while the hand is still hovering (§4), not after the release. `undoRemove` uses it too: a plant whose cell was taken in the meantime comes back on the nearest free cell (D-031).

Target numbers (`hands/config.ts`; provisional until the on-device pinch-accuracy test T-105 / TC-DEV-00):
| Constant | Value | ID | Meaning |
|---|---|---|---|
| `TARGET_VISIBLE_DIAMETER_M` | 0.025 m | FR-HND-04 | drawn size of a cell marker and of a plant's base |
| `HIT_RADIUS_M` | 0.040 m (tunable 0.035–0.040) | FR-HND-04 | pick radius around an interactable; the nearest one wins |
| `HOVER_DEAD_BAND_M` | 0.005 m | FR-HND-16 | a new hover candidate must be at least this much closer |

With a 4.5 cm ring gap and 4.7 cm inner-ring spacing, neighbouring hit spheres overlap by design: "nearest wins" plus the dead band is what separates them, and the 4 cm radius is nominal there (between two inner-ring neighbours a target captures about 2.3 cm to each side). `snapToCell` stays the pure nearest-cell function, with no memory. The dead band and the resolution to a free cell live in `hands/TargetPicker.ts` (§4, Hover), and a release commits the hovered cell (`gesture:release.cell`), not a fresh snap, so the cell that was highlighted is the cell that gets the plant, also when the cell under the hand is occupied.
Two geometry decisions wait for T-105: (a) cell size: if the inner ring's 4.7 cm spacing scores below 90 % first-try, the fallback is 12 steps (inner spacing 6.3 cm) with the same 5 rings; (b) outer radius (D-020): `R_OUT` stays 0.30 m unless the outer ring scores below 90 % first-try or the bed does not fit the IWER VR-Glasses FoV mask when looking at the centre; then `R_OUT` = 0.25 m and the ring gap becomes 3.25 cm.

### 5.2 Pitch (`audio/theory.ts`)
`semitone = keyRoot + MODE_DEGREES[mode][ring]` with `ring ∈ 0..4`; `hz = baseHz(voice) · 2^(semitone/12)`. Five rings = five degrees = one pentatonic octave; no octave folding is needed because every set has exactly `RINGS` degrees.
Modes (D-025; `MODE_DEGREES` in `garden/model.ts`): `majorPent = [0,2,4,7,9]`, `minorPent = [0,3,5,7,10]`, `susPent = [0,2,5,7,10]`. All three are anhemitonic (no two degrees a semitone apart), so plants on adjacent rings cannot clash. `dorianHex` and `lydianHex` are *Cut (D-025)*: their first five degrees contain a semitone.
`keyRoot` is a semitone offset in −3..+4 (A = −3, C = 0, D = +2, E = +4) so the register never drifts more than a major third from C. `mode`/`keyRoot` come from the room signature (§5.8); Wanderer = C majorPent.
Room chord = `chordDegrees(mode)`, a mode-specific triple of ring indices (API_SPEC §1.1), so each mode has its own consonant chord:
| mode | ring indices | semitones | chord on C |
|---|---|---|---|
| `majorPent` | [0, 2, 3] | 0, 4, 7 | major triad, C–E–G |
| `minorPent` | [0, 1, 3] | 0, 3, 7 | minor triad, C–E♭–G |
| `susPent` | [0, 2, 3] | 0, 5, 7 | sus4, C–F–G |

Root and fifth are common to all three; the middle note tells the modes apart. These are the tuning-ripple notes (`AudioEngine.chordTone(0 | 1 | 2)`) and the UI confirm chord. The v1.1 chord "degrees 0, 2, 4" is *Cut (D-025)*.
Octave shimmer (plants ≥ 3 days old, §5.4): the old plan reserved a sixth scale degree for it, and the pentatonic sets have none. The shimmer is now the plant's own note one octave up (`semitone + 12`), mixed in at the §5.4 gain. An octave of a scale note is always in the scale, so it cannot clash and needs no extra degree.
Base octaves: Bass C2, Pad/Choir C3, Pluck/Bell C4, Shimmer C5.

### 5.3 Scheduler (`audio/Scheduler.ts`)
"Two clocks" pattern: `setInterval` 25 ms → while `nextStepTime < ctx.currentTime + 0.12` → for each plant at `step`, the pool assigns a voice channel (§7.1) and `voice.trigger(timeAt, params, channel)` → `nextStepTime += stepDuration`. Tide render position = `(ctx.currentTime − barStart) / barDuration`.
As built (T-121): step times are computed from an anchor, not summed, so they do not drift; a tempo change keeps the time of the next unscheduled step and does not move the tide phase. A step is counted before its listener runs, so a trigger that throws loses that step and not the clock. **Late steps:** after a stalled or throttled tick the scheduler walks every missed step, and the engine plays only those less than `LATE_DROP_S` = 0.1 s late; the older ones are skipped instead of sounding in one burst.

### 5.4 Growth (`garden/growth.ts`)
`ageDays = (now − plantedAt) / 86400e3`; stage = 0 (<1), 1 (<3), 2 (<7), 3 (≥7). Overnight: on load, compute stage per plant; emit `garden:grown` with deltas for the bloom animation. Octave shimmer gain = `min(1, (ageDays − 3) / 4)` for ≥3 days.

### 5.5 Placement (`room/PlacementSolver.ts`)
Returns `Promise<BedPlacement>` (API_SPEC §1.3); runs levels with timeouts (L1+L2 3 s combined, L3 10 s, L4 immediate). Each level emits `room:placementLevel` for UI and logging. Clamp (FR-ROOM-03, D-020; constants in `room/config.ts`): the bed centre targets `BED_CENTRE_DEFAULT_M` = 0.45 m forward of the head, which puts the far edge (centre + R_OUT) exactly on the `BED_FAR_EDGE_MAX_M` = 0.75 m reach cap. The centre may sit nearer, down to `BED_CENTRE_MIN_M` = 0.35 m, when the surface does not reach 0.45 m; it never sits beyond `BED_CENTRE_MAX_M` = 0.45 m. If the chosen surface point is outside 0.35–0.45 m, move it along the head→point vector into the range, to 0.45 m when beyond and to 0.35 m when nearer, while staying on the surface polygon when possible. L4 floating: 0.45 m forward, 0.25 m below eye height. (The v2 default of 0.40 m is replaced, D-020.)
Which surface, and which point of it (FR-ROOM-01, D-034; as built in T-123). A plane is read as the rectangle around its polygon, from its pose alone: the sign of its normal, `plane.orientation` and `lastChangedTime` are never read (tests/e2e/README.md). It is level when its normal is within 5° of vertical, either way up (`LEVEL_MIN_COS` = 0.996; provisional until T-129). The default spot is 0.45 m forward of the head, where forward is the level direction square to the head's right vector and every distance is measured level. The chosen surface point is the rectangle's point nearest the default spot. Reach rule: the plane counts only when that point is in front of the user and at most `BED_FAR_EDGE_MAX_M` = 0.75 m from the head, so part of the bed always rests on the surface. (*The centre-within-1.2 m rule and `SURFACE_MAX_DISTANCE_M`: replaced, D-034. It refused a long table from its short end and took a side table the bed could not touch.*) The centre then goes along the head→point line as far as the surface goes, held to 0.35–0.45 m, and takes the surface's own height there. Of several planes that count, the one whose point is nearest the default spot wins; the first seen wins a tie. Two height guards: a plane, or a level-3 hit, less than `FLOATING_DROP_M` = 0.25 m below the eyes is not used (no bed higher than the floating one would be: a level gaze meets a wall at eye height), and a level-3 hit lower than `SURFACE_MIN_HEIGHT_M` = 0.5 m above the floor is not a confirm (the floor is out of seated reach); the wait then runs on to the floating bed. Known limit: with the table to the user's side the bed is aimed at the table's nearest point, so it can land a few centimetres beside the table (5 cm with the edge 0.3 m to the side) although the table has a point 0.45 m away; a user who faces the table never meets it (device check, T-129). Per-frame cost: levels 1 and 2 read the planes anew on every frame of their wait, at most 3 s per placement (accepted, D-034).
Orientation (D-029): at every level the solver turns the bed about the vertical so that bed-local +z points from the bed centre toward the user (the head position at placement, projected onto the bed's plane), +x to the user's right and +y up. Step 0 is then on the user's right and step 4 nearest the user (§5.1).
Anchors (Must, D-021; FR-ROOM-07). The save holds a pair: `anchorHandle` and `anchorLevel`, the placement level the bed had when the anchor was made. A restored anchor gives back a pose and nothing else, and the chain that would report a level does not run. Without a saved level a returning session would have to be treated as level 3 or 4, which is Wanderer: the room signature would be gone from the second day on.
Order (RoomSystem; the same list as API_SPEC §1.3):
1. `src/index.ts` passes the saved pair, if there is one.
2. Pair present and `supported()` → `restore(handle, 4000)`. A pose comes back → `BedPlacement { pose, level: anchorLevel }`, `room:placementLevel`, `room:bedPlaced { restored: true }`.
3. No pair, unsupported, `null` or timeout → the chain, then `room:bedPlaced { restored: false }`, on which GardenSystem drops a stale pair. `clear()` and `create(pose)` then run in the background, and `room:anchored { handle, level }` lets GardenSystem store the new pair (`setAnchor`); the normal debounced save writes it. Creating the anchor never delays the ripple or the first sound. A `create()` that resolves after the bed has been placed again is thrown away.
4. `RoomFeatures.extract(placement)` runs in both cases and reads the planes itself (§5.8).

Re-place from Settings (FR-ROOM-05) is step 3 again. The garden is kept in every case. One persistent anchor is kept per site (`clear()` before `create()`); the Quest Browser allows a site 8 at a time (Meta, WebXR mixed reality: https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/). Restore reliability is validate-first on device (T-129, A1).

### 5.6 Vines (`room/WallFinder.ts` + `render/VineRenderer.ts`) — Could (C4, D-021; was Should S2); the halo (`render/HaloRenderer.ts`) is the Must fallback and always shows
Find ≤2 vertical planes within 3 m, prefer those in front hemisphere. Path: Catmull-Rom from bed edge → wall base → up the wall 1.2–1.8 m with ±0.15 m lateral noise. Tube geometry built once per Listen entry (≤20k tris total); animated by a `growth` uniform.

### 5.7 1€ filter
Standard implementation (Casiez 2012); per-axis, on the pinch point; `ONE_EURO_MIN_CUTOFF_HZ = 1.0`, `ONE_EURO_BETA = 0.0`, `ONE_EURO_D_CUTOFF_HZ = 1.0` (FR-HND-03; β 0.0 replaces 0.007).
β is in Hz per m/s: the cutoff is `min cutoff + β · |speed|`. With β = 0 the cutoff does not rise with hand speed: the filter is a fixed 1 Hz low-pass (time constant ≈ 0.16 s), steady at rest and laggy in motion. The pinch point trails a moving hand by speed × 0.16 s: 3.2 cm at 0.2 m/s, more than half a ring gap (2.25 cm). These are the starting values of the filter's own tuning procedure (settle the jitter with the min cutoff first, then raise β until the lag goes). T-105 raises β on device and searches about 5–50: β = 10 leaves about 1 cm of lag at 0.2 m/s, β = 20 about 0.6 cm. The change is one constant. The old 0.007 was already inert at hand speeds (it added 0.0035 Hz at 0.5 m/s), so the emulator and any build made before T-105 run the fixed 1 Hz low-pass. A non-zero default would change sheet 6.2 and needs Parth's approval; it is left as an open decision.
The filter state is reset when a hand is found again after a tracking loss (§4), so the first sample passes through unfiltered.

### 5.8 Room signature (`room/RoomFeatures.ts` → `garden/signature.ts` → `render/TuningRipple.ts`) — Should (S1), ADR-005 (amended 2026-10-10), D-010, D-021, D-025
Gated on device evidence (T-104 spike, T-129 script): go/no-go at G2, and the default is to build it with the Wanderer fallback. Without that evidence the app ships Wanderer-only and the pure function stays for later. Built after the core payoff is green (plan v2.1).

**Features (`room/RoomFeatures.ts`, FR-ROOM-10).** Computed once, ≤3 s after session start. The extractor reads the planes and meshes itself, from the `room/` adapters (no extra XR feature requests). It does not depend on the PlacementSolver having run, so a session whose bed came back from an anchor (§5.5) gets the same features as one that ran the chain. Its inputs are the bed pose and the placement level; `surfaceId` is a hint, and without it the bed surface is the horizontal plane that contains the bed centre (within 5 cm vertically).
`tableHeight` = height of the bed surface above the floor (levels 1–2 only); `tableArea` = polygon area of that plane; `floorArea` = polygon area of the floor plane, else the area of the **footprint rectangle** of the wall planes (it needs two walls that are not parallel), else unknown; `wallCount` = number of vertical planes with height ≥ 1.5 m; `ceilingHeight` = ceiling-plane height above the floor; `largestWallWidth` = widest vertical plane; `roomVolume` = `floorArea × ceilingHeight` when both are known, else the footprint rectangle of the global mesh × its vertical extent, else unknown; `level` = placement level 1–4.
The footprint rectangle is the minimum-area bounding rectangle of the points projected onto the floor: the smallest rectangle found over the edge directions of their convex hull (rotating calipers; once per session, off the hot path). It is not the axis-aligned box of the reference space. That box depends on the angle between the room and the way the user faces at session start: a square room read at 45° doubles in area, and in the review's check the kitchen fixture changed its root at a 4° turn. The features of a room must not depend on its yaw; a fixture room turned by 30° checks that (TC-SIG-03).
A measurement that is not finite or not greater than 0 is dropped. An unknown field is left out of the object, never set to `undefined`. Emits `room:features`.

**Signature v1 (`garden/signature.ts`, FR-ROOM-11, D-021).** In v1 the room moves exactly three things: the reverb decay, the key root and the mode. The tempo is a constant. Every other feature feeds only a hash. Each input is bucketed and the signature depends only on the bucket tuple, so detection noise never changes the song unless a value sits within noise distance of a boundary. Constants live in `garden/config.ts`. The steps, in order:

1. **Wanderer rule.** `level ≥ 3`, or no measured field known → the whole signature is `WANDERER` = `{ keyRoot: 0, mode: 'majorPent', tempo: 84, reverbRt60: 0.9, reverbSize: 'medium', starterVoices: [bell,pad,pluck], paletteSeed: 0 }` regardless of other fields. A value that is not finite or not greater than 0 counts as unknown here too, so the function is total. At `level ≤ 2` unknown fields take their default bucket (marked \*) individually. The `forceSignature=wanderer` flag is not part of the function: GardenSystem checks it and then uses `WANDERER` without calling `roomSignature`, which stays pure.
2. **Reverb decay (FR-ROOM-06): Sabine's formula on the room volume, with a fixed absorption area.**
   ```
   V   = roomVolume ?? floorArea × (ceilingHeight ?? CEILING_DEFAULT_M)   // CEILING_DEFAULT_M = 2.7. No volume and no floor area →
                                                                          // reverbRt60 = REVERB_RT60_DEFAULT_S (0.9 s); go to step 3
   raw = SABINE_K · V / SABINE_ABSORPTION_M2                               // Sabine: RT60 = 0.161 · V / A
   reverbRt60 = the step of clamp(raw, REVERB_RT60_MIN_S, REVERB_RT60_MAX_S) in the table below
   ```
   `SABINE_K = 0.161` s/m. `SABINE_ABSORPTION_M2 = 10` m² is the one absorption constant: the room's equivalent absorption area A, held the same for every room. It is **tuned for an audible musical range, not for acoustic truth**. In a real room A grows with the surfaces, so the real decay grows only with the room's linear size, and with any single absorption coefficient homes differ by a factor of about 2.3. The v1.2 draft did exactly that (`A = 0.10 · S`): more than nine ordinary rooms in ten landed on 0.9 or 1.2 s, a 3 × 4 m bedroom and a 5 × 5 m living room both got 0.9 s, and neither 0.3 s nor 2.0 s could be reached in a home (2.0 s needed more than 150 m² of floor). With A fixed the decay is proportional to the volume (`raw = V / 62.1`) and homes use the whole clamp:

   | `reverbRt60` | 0.3 s | 0.6 s | 0.9 s | 1.2 s | 1.6 s | 2.0 s |
   |---|---|---|---|---|---|---|
   | room volume (m³, rounded; `raw` decides) | < 28.0 | 28.0–46.6 | 46.6–65.2 | 65.2–87.0 | 87.0–111.8 | ≥ 111.8 |
   | floor area under a 2.7 m ceiling (m²) | < 10.4 | 10.4–17.3 | 17.3–24.2 | 24.2–32.2 | 32.2–41.4 | ≥ 41.4 |

   The same bedroom now gets 0.6 s and the same living room 1.2 s. The result does not predict the room's measured RT60, and the Devpost copy must not say it does. The draft's `SABINE_ALPHA` and its surface estimate `S` are *Cut (v1.2 review)*.
3. **Key root** from the floor-area bucket: a bigger room has a lower root (E, D, C, A).
4. **Mode** from the ceiling-height bucket. Not from table height.
5. **Tempo** = `DEFAULT_TEMPO_BPM` = 84 (`core/`). The room does not set it in v1.
6. **Hash** of the bucket tuple → starter voices and palette seed.

| Input | Buckets (unknown → default, marked \*) | Drives |
|---|---|---|
| `raw` RT60 (s), from `roomVolume`, or from `floorArea` and `ceilingHeight` | `< 0.45` → 0.3 · `0.45–0.75` → 0.6 · `0.75–1.05` → 0.9\* · `1.05–1.40` → 1.2 · `1.40–1.80` → 1.6 · `≥ 1.80` → 2.0 (= `REVERB_RT60_STEPS_S`) | `reverbRt60` |
| `reverbRt60` (s) | `< 0.75` → small · `< 1.05` → medium · else large | `reverbSize`: a derived label for the Settings UI. It sets nothing in audio (§7.1) |
| `floorArea` (m²) | `< 8` → E (+4) · `8–17` → D (+2) · `17–34` → C (0)\* · `≥ 34` → A (−3) | `keyRoot` |
| `ceilingHeight` (m) | `< 2.60` → minorPent · `2.60–2.90` → majorPent\* · `≥ 2.90` → susPent | `mode` |
| none | constant 84 | `tempo` |
| `tableHeight` (m) | `< 0.62` → 0 · `0.62–0.85` → 1\* · `0.85–1.00` → 2 · `≥ 1.00` → 3 | hash only |
| `tableArea` (m²) | `< 0.5` → 0 · `0.5–1.5` → 1\* · `≥ 1.5` → 2 | hash only |
| `wallCount` | `0–2` → 0 · `3–5` → 1\* · `≥ 6` → 2 | hash only |
| `largestWallWidth` (m) | `< 2.5` → 0 · `2.5–4.0` → 1\* · `≥ 4.0` → 2 | hash only |

Named constants (`garden/config.ts`, each with a comment citing its ID): `SABINE_K = 0.161`, `SABINE_ABSORPTION_M2 = 10`, `CEILING_DEFAULT_M = 2.7`, `REVERB_RT60_MIN_S = 0.3`, `REVERB_RT60_MAX_S = 2.0`, `REVERB_RT60_STEPS_S = [0.3, 0.6, 0.9, 1.2, 1.6, 2.0]`, `REVERB_RT60_BOUNDS_S = [0.45, 0.75, 1.05, 1.40, 1.80]`, `REVERB_RT60_DEFAULT_S = 0.9`, `REVERB_LABEL_BOUNDS_S = [0.75, 1.05]` (all FR-ROOM-06); `ROOT_AREA_BOUNDS_M2 = [8, 17, 34]` with `ROOT_SEMITONES = [4, 2, 0, −3]`, `MODE_CEILING_BOUNDS_M = [2.60, 2.90]`, `TABLE_HEIGHT_BOUNDS_M = [0.62, 0.85, 1.00]`, `TABLE_AREA_BOUNDS_M2 = [0.5, 1.5]`, `WALL_COUNT_BOUNDS = [3, 6]`, `WALL_WIDTH_BOUNDS_M = [2.5, 4.0]` (all FR-ROOM-11). The tempo is `DEFAULT_TEMPO_BPM` from `core/` (FR-MUS-03); `garden/` has no tempo constant of its own.
Boundaries are half-open (`[lo, hi)`). `h = fnv1a32(rootBucket, modeBucket, rt60Step, tableHeightBucket, tableAreaBucket, wallCountBucket, wallWidthBucket)`: 7 bytes, each the 0-based index of its bucket in the table above, read left to right (FNV-1a 32-bit, offset basis `0x811c9dc5`, prime `0x01000193`; no floats enter the hash). None of the 7,776 tuples hashes to 0, so `paletteSeed` 0 always means Wanderer.
`starterVoices = STARTER_SETS[h % 6]` with `STARTER_SETS = [[bell,pad,pluck], [pluck,choir,bass], [bell,choir,bass], [pad,pluck,bass], [bell,pad,choir], [pluck,bell,choir]]`: six different sets, each with at least one sustaining voice (pad, choir) and one percussive voice (bell, pluck); index 0 is the Wanderer set. (The draft's sixth set repeated the fourth in another order.)
`paletteSeed = h` (uint32); the renderer derives a hue rotation `(h % 360)°` and a saturation nudge `((h >>> 9) % 3) − 1` applied to the fixed bioluminescent palette (UX §5).
The 12 (root, mode) pairs give 8 different sets of note names: C major, A minor and D sus are the same five notes, and so are E minor and A sus, and D major and E sus. Two such rooms still differ in which note sits on which ring, in the room chord and usually in the decay.

**Validate-first, not in v1 (D-021).** Table height → key or register, and anything → tempo. Neither has evidence that a listener hears the cause (research §8; note 06, KQ6); both wait for the stranger test H13 (UAT-17). Table height keeps its v1.1 buckets as a hash input, so switching a mapping on later needs no new feature. The v1.1 rows `tableHeight → keyRoot`, `floorArea → mode`, `wallCount → tempo` and `floorArea → reverbSize` are *Cut (D-021, D-025)*.

**Stability contract (TC-SIG-02).** The tolerance is ±5 cm on a length (heights, widths, each side of the mesh bounds) and ±0.3 m² on an area. It is a bound for the tests, not a measurement of the device.
*Bucketed inputs.* An input at least its tolerance from a boundary keeps its bucket. The narrowest buckets (0.15 m table height, 0.30 m ceiling height, 1.0 m² table area, 9 m² floor area) are ≥ 3× the tolerance. Ceiling boundaries sit between the usual build heights (about 2.4–2.5 m, 2.7–2.75 m and 3.0 m); floor-area boundaries sit between common room sizes (9, 16, 20, 30 and 36 m²). On a grid of 375 ordinary rooms (2.5–7 m × 2.5–8 m, ceilings 2.4–3.0 m) 1.3 % can change root at the worst corner of the tolerance.
*Wall count.* A count has no tolerance: one missed or doubled wall moves it by one. The default bucket is three wide (3–5), so a four-walled room keeps its bucket either way; a room detected with 3 or 5 walls does not. It feeds only the hash (the starter voices of a new garden, and the tint), never key, mode or decay.
*Reverb decay.* It is quantised after the formula, so its boundaries live in RT60 space (0.45, 0.75, 1.05, 1.40, 1.80 s), that is at volumes of about 28.0, 46.6, 65.2, 87.0 and 111.8 m³ (rounded; `raw` decides). The tolerance moves `raw` by 0.0161 s per m³. When the volume is area × height that is `0.0161 · (0.05·F + 0.3·H + 0.015)`: at most 0.024 / 0.028 / 0.035 / 0.043 / 0.052 s at the five boundaries (ceilings 2.2–3.5 m). When it is the mesh bounds with ±5 cm on each side it is at most 0.026 / 0.037 / 0.047 / 0.059 / 0.071 s (rooms up to 3:1). A room whose `raw` is further than that from every boundary keeps its step. The decay is the least stable of the three outputs, and by construction: it has five boundaries inside the range of homes where the root has three. On the same grid about 17 % of rooms sit within the worst-case tolerance of a decay boundary (the draft formula: 7.5 %, with two steps doing all the work). A flip moves the decay by one step, 0.3–0.4 s, and changes neither key nor mode.
Only the documented boundary case (an input within tolerance of a boundary) may flip, and TC-SIG-02 asserts that it does. Hysteresis across sessions is **not** in v1: it needs persisted features, and FR-ROOM-13 recomputes the signature from nothing each session. The noise expected between two sessions in one room is far below the tolerance: the Quest Browser's planes are the surfaces the user defined in the headset's room setup, which the browser exposes as planes (Meta, WebXR mixed reality: https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/), so the same room should repeat the same inputs until the user redoes the setup. That last step is our inference, not Meta's statement. T-129 checks this on device (same room, two sessions, compare `room:features`); hysteresis is revisited only if that check shows drift.

**Worked by hand: the three signature fixture rooms (TC-SIG-03).** Dimensions are plausible rooms chosen to sit clear of every boundary; the fixtures in `tests/fixtures/rooms/` use them.

| | `sig-small-desk` | `sig-kitchen-counter` | `sig-living-table` |
|---|---|---|---|
| Room, L × W × ceiling (m) | 2.0 × 2.8 × 2.40 | 3.6 × 4.2 × 2.70 | 6.0 × 7.0 × 3.00 |
| Bed surface: height; top | desk 0.74 m; 1.4 × 0.7 = 0.98 m² | counter 0.92 m; 3.2 × 0.6 = 1.92 m² | table 0.75 m; 1.2 × 0.8 = 0.96 m² |
| Walls: count; widest | 4; 2.8 m | 4; 4.2 m | 4; 7.0 m |
| Placement level | 1 | 2 | 1 |
| `floorArea` F (m²) | 5.60 | 15.12 | 42.00 |
| `roomVolume` V = F × H (m³) | 13.44 | 40.82 | 126.00 |
| `raw` = 0.161 · V / 10 (s) | 0.216 | 0.657 | 2.029 |
| **`reverbRt60`** (`reverbSize`) | **0.3 s** (small) | **0.6 s** (small) | **2.0 s** (large) |
| **`keyRoot`** | **E** (+4): 5.60 < 8 | **D** (+2): 8 ≤ 15.12 < 17 | **A** (−3): 42.00 ≥ 34 |
| **`mode`** | **minorPent**: 2.40 < 2.60 | **majorPent**: 2.60 ≤ 2.70 < 2.90 | **susPent**: 3.00 ≥ 2.90 |
| Room chord | E–G–B (E minor) | D–F♯–A (D major) | A–D–E (A sus4) |
| `tempo` | 84 | 84 | 84 |
| Hash tuple | (0, 0, 0, 1, 1, 1, 1) | (1, 1, 1, 2, 2, 1, 2) | (3, 2, 5, 1, 1, 1, 2) |
| `paletteSeed` = h | `0x0fe2778b` | `0xccfb3565` | `0xadd04cf6` |
| `starterVoices` = `STARTER_SETS[h % 6]` | set 1: pluck, choir, bass | set 3: pad, pluck, bass | set 4: bell, pad, choir |
| Palette: hue rotation; saturation nudge | 259°; 0 | 69°; −1 | 118°; +1 |
| Nearest RT60 boundary; distance of `raw`; worst move of `raw` under the tolerance | 0.45 s; 0.234 s; 0.016 s | 0.75 s; 0.093 s; 0.030 s | 1.80 s; 0.229 s; 0.066 s |

Three rooms, three results that differ in all three room-driven outputs: decay 0.3 / 0.6 / 2.0 s, root E / D / A, mode minor / major / sus. They differ in the starter set and the tint as well, so the seeds caption can be shown in a demo. Every bucketed input is at least its tolerance from a boundary, each room has four walls, and every `raw` is more than three times its worst-case move away from a boundary. All 64 corner cases of the tolerance (±0.3 m² floor and table area, ±5 cm ceiling, table height and wall width, the volume taken as the product or as mesh bounds) leave each tuple unchanged, and so does one wall more or less. The small desk and the living table use the same five note names (E minor pentatonic and A suspended pentatonic are both A, B, D, E, G); they differ in which note sits on which ring, in the chord and in the decay.
The living room is 6.0 × 7.0 m, not the draft's 5.5 × 7.0 m, which would sit 0.06 s from the 1.80 s boundary. The T-102 prototype's presets use 0.4 s and 1.8 s, which this function cannot produce; the listening review should rate these three signatures instead (handed to the T-102 owner).

**Tuning ripple (`render/TuningRipple.ts` + `audio/theory.chordTones`, FR-ROOM-12).** Triggered by `room:signature`, which GardenSystem emits when `room:features` arrives, right after `room:bedPlaced`. Timeline from `t0 = bed placed` (constants in `render/config.ts`):
| t (s) | Surface | Sweep | Note (voice) | Caption (only if that surface was detected) | True in v1 because |
|---|---|---|---|---|---|
| 0.3 | table / bed surface | 0.6 s radial ripple across the plane extents | chord note 0, the root (Pad) | "Table: seeds." in the session that issues the starter seeds (`room:signature.starterSeeds`); "Table: colour." in every other session | `tableHeight` and `tableArea` are hash inputs. The hash picks `starterVoices`, which are used once, for the seeds a new garden starts with (FR-MUS-08). The hash is also `paletteSeed`, which tints the palette in every session |
| 1.5 | nearest wall (if any) | 1.0 s sweep up the wall from its base | chord note 1, the third or fourth (Bell) | "Walls: colour." | `wallCount` and `largestWallWidth` are hash inputs, and the hash is `paletteSeed` |
| 2.7 | ceiling (if any) | 0.8 s sweep across | chord note 2, the fifth (Pluck) | "Ceiling: scale." | `ceilingHeight` alone picks the mode |
| 4.0 | — | — | `room:tuned` emitted | — | — |

No caption credits a surface with the key or the echo. In v1 the key root comes from the floor area and the reverb decay from the room volume, and the floor is not a ripple surface; "Your table set the key" would be false (table height is validate-first). The "Tuned by" read-out on the Sound tab (UX §3.6) is where the room is credited with the key and the echo. With `forceSignature=wanderer` the ripple behaves as at L3/L4: one bed ripple, three notes, no caption.
Ripple captions are strings in `core/strings.ts`: at most 3 words and 16 characters, and each names its surface (plan v2.1). TuningRipple raises one by adding a `Caption` component (§3); `ui/Captions.ts` draws it. One at a time: each shows from the start of its sweep until the next sweep starts, the last until `room:tuned`. That is 1.2 / 1.2 / 1.3 s, never less than `CAPTION_MIN_MS` = 1200, or 11–12 characters per second, where common subtitle practice allows 17–20. The draft's six-word sentences had 0.9–1.4 s, 21–37 characters per second, while the sweep draws the eye to the wall and the ceiling; they are *Cut (v1.2 review)*, and the wall sweep moved from 1.2 s to 1.5 s and the ceiling sweep from 2.6 s to 2.7 s so every caption gets its minimum. The first draft table caption, "Your table helped pick the seeds.", was true only in the session that creates the garden; hence the two table captions. The UX copy may change only inside what the last column says and inside these limits.
A missing surface skips its sweep and its caption, but its note still rings at the bed at the same time, so the chord is always complete and audible ≤ 4 s (budget 5 s). At L3/L4 (Wanderer) all three notes ring at the bed with a single bed ripple and no caption: no surface set anything. Reduced motion: each surface glows 0.4 s in the same order, same notes, same captions. Rendering: one transient quad per surface with a `sweep` uniform (≤ 3 draw calls, ≤ 100 tris, no allocation after warm-up; quads pooled); the crest and afterglow go through the flash cap (§5.9). The notes are scheduled on the audio clock via `AudioEngine.chordTone(note, time)` with `note` = 0, 1, 2 so visuals derive from the same clock as the tide.

**Re-tune (FR-ROOM-13).** The signature is recomputed every session and never persisted; `AudioEngine.setSignature()` re-tunes in place (plants keep cells; `theory.ts` recomputes Hz from ring + new key/mode; the shared reverb takes the new `reverbRt60`; the tempo does not change, the room does not set it in v1). The "different room, different song" effect needs no comparison with the previous session.

### 5.9 Flash cap (`render/FlashGuard.ts`, FR-UI-11)
No element changes luminance more than 3 times per second. The terms, with constants in `render/config.ts` (API_SPEC §1.8):
- **Element** = one drawn instance whose brightness is animated: one plant, one cell marker or ghost, one beat-ring tick, one ripple quad, the halo, the tide crest. A shape that moves at constant brightness is not changing luminance; what it lights up is counted on the element it lights (the trigger flash, on that plant).
- **One luminance change** = one swing of the element's brightness factor (0–1, the multiplier its material applies) in one direction, of at least `FLASH_MIN_DELTA` = 0.10. It is counted when the direction reverses or the swing stops. A flash, up and back, is two changes. A slow fade counts once, like a fast one.
- **Cap** = at most `FLASH_CAP_PER_S` = 3 changes of one element in any sliding 1 s window. That is at most 1.5 full flashes per second, half of what WCAG's three-flashes rule allows (a flash there is a pair of opposing changes of 10 % or more), so NFR-ACC-01 holds with margin.

**Enforcement.** Animation code does not write a brightness directly; it asks FlashGuard to start a swing for an element. FlashGuard grants it when the element's window has room and otherwise holds the element at its current brightness until it has. FlashGuard counts from the values it hands out, so its report does not depend on the callers. `perf:sample.maxFlashPerS` is the largest count any element reached in the last second; TC-E2E-15 asserts it never exceeds 3 with `autoplant=80` in Listen mode. The beat ring (`access/`) and the hover cue go through the same guard; `access/` and `ui/` may import `render/`.
**Consequences.** Per-step effects are safe: the tide passes 5.6 steps per second at 84 BPM and 8.0 at 120, but each plant and each ring tick is hit once per bar, which is two changes in 2.9 s at 84 BPM. Anything that pulses on every beat makes two changes per beat: 2.8 per second at 84 BPM, 3.2 at 96, 4.0 at 120. Above 90 BPM such an element pulses on every second beat; that is a fixed rule, not a pulse dropped here and there. The hover cue is a level, not a blink.

## 6. Data schemas
See API_SPEC.md §4 (`GardenStateV1`). Validation via a tiny hand-written validator (no runtime schema lib, to save bytes).

## 7. Voice design (`audio/voices/`)
| Voice | Pri | Synthesis | Shape silhouette |
|---|---|---|---|
| Bell | M | 2-op FM (ratio 3.5, index decays), exp decay 1.5 s | Tall bulb with drooping cap |
| Pad | M | 3 detuned saws → LPF (cutoff from hue) → slow attack 0.4 s | Wide soft fan of leaves |
| Pluck | M | Karplus-Strong string (noise burst → delay line + LPF feedback), computed into an `AudioBuffer` (see below) | Thin reed with a bead |
| Bass | M | Sine + 2nd harmonic, soft clip, 0.6 s; audible level in the 2nd and 3rd harmonics (see below) | Low, broad bulb |
| Choir | M | 3 formant band-passes over a pulse, slow vibrato | Cluster of three rounded petals |
| Shimmer | S (S5) | Band-passed noise grains × 6, high register | Spiky star-burst |

Phase 0 desktop sound prototype (G0) uses Bell, Pad, Pluck only.

All voices expose `trigger(time, { hz, gain, release, cutoffMul, detune }, out)` and `dispose()`; `out` is the input of the voice channel the pool assigned (§7.1). `Voice` is internal to `audio/`.
**Pluck is not a live delay loop.** A feedback loop through a native `DelayNode` cannot be shorter than one render quantum (128 frames: 375 Hz at 48 kHz), and Pluck plays 220–587 Hz: 26 of its 60 pitches are above that. The string is computed by pure code into an `AudioBuffer` and played through an `AudioBufferSourceNode`, as in the T-102 prototype. Buffers are rendered outside the frame loop and outside the scheduler tick (on `syncPlants` and on a re-tune) and cached per pitch and damping bucket, not per plant: 5 ring pitches × `PLUCK_DAMPING_BUCKETS` = 4 gives at most 20 buffers of `PLUCK_BUFFER_S` = 1.6 s, about 6 MB at 48 kHz (one buffer per plant would be 25 MB at 80 plucks). The target: a re-tune renders them a few per frame, so `setSignature` cannot stall a frame during the tuning ripple; until a buffer is ready its notes play the nearest ready one, re-pitched with `playbackRate`. **As built (T-121), a documented shortcut:** the strings a plant needs are rendered at once on `syncPlants`, every string of the new key at once on a re-tune, and the reverb's impulse response at once when the decay changes (at most 20 strings and one 2.0 s stereo response: about 23 ms in Node on a laptop, not measured on a headset). Spreading them over frames, with the nearest-ready fallback, is T-143.
**Bass has to be audible on small speakers.** Its fundamentals are 55–147 Hz (ring 0: A 55, C 65, D 73, E 82 Hz), which a headset's speakers may not reproduce (not measured). The voice therefore carries audible level in its 2nd and 3rd harmonics (110 Hz and up), and the device audio test W1 (T-129) includes a bass-audibility check.

### 7.1 Audio graph (`audio/AudioEngine.ts`, NFR-PERF-10)
```
note graph (built per note by a Voice: single-use sources + envelope)
   └─► channel[i].in ─┬─► PannerNode[i] (equal-power) ─────────────────────────────► master gain ─┐
        i = 0..23     └─► send (ONE gain on the bus) ─► ConvolverNode (×1) ─► wet return ─────────┤
                                                                                                  ▼
                  master gain (volume) ─► compressor ─► wave-shaper ceiling (−1 dBFS) ─► destination
AudioListener ◄── setListenerPose(head), every frame
```
Constants in `audio/config.ts`. Everything in the diagram but the note graph is built once in `init()`. **Pooled**, never created after `init()`: the 24 channel strips (input and panner), the 24 note records the pool keeps (one per channel, reused), and the rendered Pluck strings. **Created per note**, at trigger time: the note's source nodes and its envelope gain, plus a filter or an FM index gain for the voices that have one: 2 nodes for a Pluck, 4 for a Bell, 5 for a Pad. Web Audio sources are single-use, so these cannot be pooled; this is the one node creation CODING_GUIDELINES §5 allows in the tick ("voice triggers"), and the tick's own code makes no object besides. At 80 plants and 84 BPM that is about 28 notes per second.
**One send gain (as built, T-121).** Every channel input feeds the same send gain on the bus, taken before the pan so the reverb stays wide. One level for every channel makes 24 per-channel send gains the same signal with 24 more nodes; the `send[i]` of the v1.2 draft is *Cut (T-121)*. A voice hands its note to the pool through the channel's note record (`voices/note.ts`), which also does the steal fade.

| Part | Rule | Constants (ID) |
|---|---|---|
| Voices | 24 voice channels. Every sound takes one: plant notes, the shaping preview, the chord tones, the UI sounds. So the cap holds for the whole graph and `stats.voices ≤ 24` always. A full bed asks for more than 24 (5 notes per step, releases up to 2.5 s), so stealing is the normal state at 80 plants, not an edge case. | `VOICE_CAP = 24` (NFR-PERF-10, FR-MUS-07) |
| Stealing | "Oldest-quietest". A trigger for audio time `t` that finds no free channel steals the note with the lowest level at `t`; equal levels go oldest first. The level comes from the note's own envelope model, never from reading an `AudioParam`: it is the note's peak from its start until its decay begins, and the decaying value after that. So the attack counts as full level: a note that is still rising is not stolen first. A note that starts at or after `t` (the other notes of the same step) is never a candidate; if every channel holds such a note, the new note is not played. The stolen note fades over `STEAL_FADE_S` and the fade ends when the new note starts, so the channel and its panner are silent when they are reused: the new note starts at `max(t, now + STEAL_FADE_S)`, which is `t` for a scheduler note in normal running (it is scheduled about 0.1 s ahead) and 20 ms late for an immediate sound (preview, UI) that has to steal. Read literally as "lowest envelope level", the rule steals each note at its own onset, where its envelope is 0; in the review's simulation of a full bed 64 % of notes were then never heard. Counting the attack as full level is the T-102 prototype's rule (`voices/note.ts`, pinned by its pool test); the same-step exclusion and the fade that ends before the new note are added here, because in the 24-channel graph a stolen channel's panner moves. | `STEAL_FADE_S = 0.02` (FR-MUS-07) |
| Panning | One `PannerNode` per channel, `panningModel = 'equalpower'`, moved to the plant's world position before the note starts. The listener is the user's head: `AudioSystem` calls `AudioEngine.setListenerPose(head)` every frame with the viewer's world matrix (XR: the head; garden window: the WindowStage camera), and the engine writes the listener's position, forward and up from it, with no allocation. Without that call the listener stays at the origin of the reference space, which is on the floor under `local-floor`: a bed on a 0.74 m desk would read −5.5 to −8.4 dB, panned from the floor point. How the IWSDK world exposes the viewer's transform is checked with `iwsdk-reference` before T-121 codes it. No HRTF by default: at most 2 HRTF "hero" panners, and none until a device A/B (T-129, W1) shows they are worth their cost. The HRTF panner per plant of v1.1 is *Cut (D-021)*. | 24 panners (NFR-PERF-10) |
| Distance curve | The panner's inverse model with a table-scale reference: gain 1 up to 40 cm from the listener, about −6 dB at 80 cm. From a seated head (1.20 m, over a 0.74 m desk) the bed reads −1.7 dB at its near edge and −6.8 dB at its far edge. The Web Audio default reference of 1 m would give no distance cue on a table. | `PAN_REF_DISTANCE_M = 0.40`, `PAN_ROLLOFF = 1.0` (NFR-PERF-10) |
| Reverb | Exactly one `ConvolverNode`, fed by the shared send bus. Its impulse response is procedural (ADR-002), stereo, and one RT60 long, so never longer than 2.0 s. It is rebuilt when the decay changes (signature, Settings), never inside the scheduler tick. Decay = the signature's `reverbRt60` while `setReverb('auto')`, and the default 0.9 s before the first signature; `'small'` = a fixed 0.6 s; `'off'` = send muted. The three convolvers of v1.1 are *Cut (D-021)*. | `REVERB_IR_MAX_S = 2.0` (NFR-PERF-10), `REVERB_SMALL_RT60_S = 0.6` (FR-ROOM-06). The clamp `REVERB_RT60_MIN_S` / `MAX_S` and the default are imported from `garden/` (API_SPEC §1.1), not redeclared, once T-141 exports them; until then the engine holds the 0.9 s default itself and caps a decay at `REVERB_IR_MAX_S` only |
| Send level | One level for every channel and every room, on one gain node (above). `reverbSize` is a label for the Settings UI and sets nothing here (sheet 6.3), so there is no question of which label applies when the user fixes the decay. The T-102 prototype is built this way and the listening review T-103 rates it. The draft's per-label table is *Cut (v1.2 review)*. | `REVERB_SEND = 0.28` (UX §6: inside 20–35 %) |
| Limiter | Two nodes, last before the destination. A `DynamicsCompressorNode` does the level control; a `WaveShaperNode` after it is the ceiling: linear below 70 % of the ceiling, a soft curve above, never past −1 dBFS (0.891). A compressor alone cannot hold a ceiling: it adds make-up gain and overshoots during its attack. Stage and values are those of the T-102 prototype. | `LIMITER_THRESHOLD_DB = −10`, `LIMITER_KNEE_DB = 6`, `LIMITER_RATIO = 20`, `LIMITER_ATTACK_S = 0.002`, `LIMITER_RELEASE_S = 0.15`, `CEILING_DBFS = −1`, `CEILING_KNEE = 0.7` (FR-MUS-06) |
| Scheduler | §5.3: look-ahead 0.120 s, tick 0.025 s. | `LOOK_AHEAD_S = 0.120`, `TICK_MS = 25` (FR-MUS-03) |
| Context | The `AudioContext` is created or resumed inside the Enter gesture (the one that requests the XR session or opens the garden window), and resumed again on session start and when the page becomes visible. `latencyHint` stays at its default; a `'playback'` fallback is added only if the device test W1 shows burst glitches. | NFR-PERF-10 |

Unit check for the listener (qa adds it to the audio cases): after `setListenerPose` with a translated matrix the listener's position equals the translation, and a source 0.40 m in front of it has gain 1.

## 8. Error handling & recovery
- Each system's `update` is wrapped: catch → `log.error` → system disabled for 1 s → re-enabled (circuit breaker).
- Audio context suspended (autoplay) → resume on first user gesture (Enter button already satisfies).
- Save failure → the same write goes to localStorage; still failing → in-memory only (the state stays pending, and the next `save()` or `flush()` tries again) + caption "Saving unavailable". PersistenceSystem calls `onSaveFailed` when writes start to fail, once per run of failures, and `src/index.ts` raises the `Caption` from it (§3); PersistenceSystem listens to no event and never calls `ui/` (API_SPEC §1.5, §2).
- IndexedDB that does not open within `IDB_OPEN_TIMEOUT_MS` (1.5 s) → the session runs on localStorage alone, so the start never waits for it. A garden already in IndexedDB is not shown in that session and is never overwritten without a backup (API_SPEC §4).
- Hand tracking lost → grace, revert and hint as in §4 (FR-HND-15); the garden model is never touched before a release, so there is nothing to repair.
- Anchor restore fails or anchors are unsupported → re-place by the chain, garden kept (§5.5, FR-ROOM-07).

## 9. Dev-only tooling
`?flags=perfHud,fovGuide,eventLog,noAnchors,noPlanes,forceLevel=3,fakeDay=+1,forceSignature=wanderer,window`. `fakeDay` offsets the clock for growth testing; `forceSignature=wanderer` bypasses room features (emulator runs, A/B listening); `pinchTest` · `capSpike` (*Cut (T-104, T-105):* still parsed, read by nothing; the test pages are opened by address, `/proto/pinch/` (TC-DEV-00) and `/proto/spike/` (TC-DEV-0A)); `window` forces the garden window where `immersive-ar` is supported, for example under IWER (§11, TC-E2E-14).

## 10. Diagrams
*Cut (D-011)* — the diagrams task (T-013) is out of scope for the competition; the ASCII diagrams in HLD §1, LLD §4 and UX §2 are the reference.

## 11. Garden window and `InputSource` (FR-SYS-07, Should S6, T-114)
The headset-free bench and demo: the same garden in a plain browser tab. Never the judged path.
**Mode gate (`src/index.ts`).** `immersive-ar` supported and no `window` flag → the XR path. Otherwise → the garden window. The gate picks the `InputSource` (API_SPEC §1.4) and hands it to HandSystem; nothing else in the shared modules knows which mode it is in.

| | XR path | Garden window |
|---|---|---|
| Input | `hands/HandSampler.ts`: WebXR hand joints (IWER's emulated hands arrive through the same API, so they need no adapter) | `window/PointerSource.ts`: pointer or touch |
| Camera and stage | the XR viewer over passthrough | `window/WindowStage.ts`: one fixed camera at a seated eye point, aimed at the bed; a virtual table drawn under the bed |
| Placement | PlacementSolver chain L1–L4 | no XR adapter reports `supported()`, so the chain returns L4 at once; the camera stands in for the head |
| Signature | from the room, or Wanderer | Wanderer (level 4) |
| Lifecycle | XR session events | the same `xr:*` events, emitted for the page: Enter click, close, `visibilitychange` |
| Systems, garden, audio, save | §3 | identical |

**`PointerSource` → `HandFrame`.** One hand only (`hands` = the dominant hand). A mouse, a pen and a touch contact are all pointer events and get one mapping. No filter and no hysteresis: a button is already clean.
| Field | Value |
|---|---|
| `tracked` | true from Enter on, while the page is visible. Sticky: the source keeps the last pointer position, so a lifted finger, or a mouse that has left the canvas, is reported there with `pinch = false`. A touch lift is therefore a release, not a tracking loss. Before the first pointer event the position is a fixed spot beside the bed (WindowStage sets it). False only while the page is hidden |
| `pinch`, `select` | the same value: the primary button or a touch contact is down. **Latched:** pointer events are queued and `sample()` hands out at most one change per call, so a press and a release that both arrive between two frames are still seen, `true` in one sample and `false` in the next. A position jump that arrives together with a press (a touch landing somewhere new) is reported first, with `pinch = false`, and the press in the next sample, so the hover is computed at the new place before the pinch starts |
| `pinchPos` | where the camera ray through the pointer meets the bed plane. Every target of the window lies on that plane: plants, the Listen orb in the centre hole, the undo petal |
| `palmNormal` | world up, constant. A pointer has no palm; this keeps the palm-up pose true whenever the source is tracked, so the next seed is delivered 400 ms after the machine is idle (§4) |
| `palmPos` | the pinch point, while no plant, orb or undo petal is within `HIT_RADIUS_M` of it; otherwise the fixed spot beside the bed. A delivered seed rests at `palmPos` (§4), so it rides the pointer over open ground and steps aside when the pointer is on another target. Nearest-wins then picks that target, and the picker needs no special case |
| `velocity` | finite difference of `pinchPos` |

What a user does: click or tap an empty cell, and the seed riding the pointer is pinched and released there, so it is planted (TC-E2E-14). One `mouse.click()` is three samples (move, press, release) and so is a tap. Press a plant and drag to move it, drag it off the bed to remove it, click the undo petal to undo, click the centre orb to listen. Nothing needs a hover, so touch works like the mouse. After a plant the next seed arrives 400 ms later; a click before that does nothing.
Reach in v1: receive and plant a seed, drag to move, drag off to remove, undo, the Listen orb. Not reachable in v1: pull (a pointer on the bed plane has no vertical travel) and the settings panel (it opens from the settings orb at the wrist, which a pointer does not have; the landing page's access toggles are the settings of the window). Adding either later is a change inside `window/` only, with no contract change.
**Render path.** The same render systems and the same rendering rules (HLD §7, NFR-PERF-09). There is no XR layer, so the canvas's own antialiasing stands in for the XR layer's MSAA and there is no foveation. How the IWSDK world is created without a session is PoC U1, run first in T-114; nothing above depends on its answer.
