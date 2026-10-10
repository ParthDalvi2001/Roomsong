# Test Plan & Test Cases — Roomsong

**Status:** Living · **Owner:** qa-engineer
Levels: **Unit** (Vitest, agents run) · **Integration** (Vitest with fake audio context/XR stubs) · **E2E** (Playwright + IWER emulation, agents run) · **Device** (human on Quest, scripted by qa-engineer; **requires headset — none on the team as of 2026-10-10**, see REPLAN §1/§6) · **Perf** (emulator counters now; device fps once a headset exists).
Every test case maps to an SRS ID. Run `npm run verify` on every commit; e2e nightly and before every merge to `develop`; device scripts per phase gate (G1..G3) and before release — as soon as a headset is in hand.
Geometry under test (REPLAN §3): annulus bed R_in 0.12 m / R_out 0.30 m, **5 rings × 16 steps = 80 cells**, bed centre 0.40 m forward, reach cap 0.75 m.

---

## 1. Strategy
- Domain logic is pure → unit test exhaustively (fast, deterministic).
- Interaction = state machine → unit test transitions with synthetic `HandFrame` sequences.
- Rendering/audio integration → smoke tests in e2e (no crash, counters within budget, events emitted).
- Room fallbacks → e2e with `?flags=forceLevel=N`, plus device tests in ≥6 real rooms (once a headset exists).
- Room signature → pure function; unit test determinism/quantisation with fixture rooms; e2e checks the tuning ripple event timing.
- Perf → `perf:sample` assertions in e2e (draw calls, tris) + device fps via perf HUD / OVR Metrics (device only).
- Regression → the full suite on every PR; a tagged "golden" e2e run archived before release.

### 1.1 Emulator-first: what the emulator can and cannot verify
No Quest headset is on the team as of 2026-10-10 (T-000 = acquire one; H1 = Oct 20, Emergency mode if none by Oct 27). Until then every result is emulator-only and is reported as such.
| Emulator (IWER + Playwright, `iwsdk-runtime` MCP) **can** verify | Emulator **cannot** verify (needs a headset + human report) |
|---|---|
| Pure logic: snap/annulus geometry, scale quantisation, scheduler timing (fake clock), signature determinism | Real frame rate (≥72 typical / ≥60 floor), JS ms on the Quest CPU, thermal throttling |
| Flows: placement chain via `forceLevel=1..4`, seed → plant → tide, Listen enter/exit, save/restore, onboarding timing with emulated input | Hand-tracking feel: pinch hysteresis on real joints, jitter, tracking loss, first-try success rates |
| Draw/tri/voice budgets via `perf:sample`; heap soak via CDP | Real room detection quality: plane/semantic-label availability, anchor persistence, hit-test accuracy, untested rooms |
| Events emitted and ordered (`room:bedPlaced`, `room:tuned`, `listen:enter`, …) | Spatial audio localisation, audio clicks under device load, Quest Browser version quirks |
Rule: a TC that passes only in the emulator is marked **E** in PROGRESS §Test status, never **D**. "Verified" without a human device report is not allowed.

## 2. Entry / exit criteria
| Phase | Entry | Exit |
|---|---|---|
| Phase gate (G0..G3) | tasks merged to `develop` | all TCs for the phase's FRs pass in the emulator; no open S1; device TCs run if a headset is present |
| Release candidate | code freeze tag | all unit/e2e TCs pass; device suite 100% P0 **(requires headset)**; perf ≥72 fps **(requires headset)**; zero S1/S2. In Emergency mode (no headset by Oct 27): device/perf rows recorded as *unverified* and listed honestly in the Devpost description |
| Submission | RC approved | UAT_PLAN sign-off; compliance gate 10/10 |

## 3. Severity
S1 = blocks the core loop or crashes · S2 = major feature broken, workaround exists · S3 = minor/visual · S4 = cosmetic/nit.

## 4. Test cases

### 4.1 Unit — garden/ (backend-dev writes TDD; qa reviews)
| ID | Covers | Case |
|---|---|---|
| TC-GAR-01 | FR-MUS-01 | `snapToCell` on the **annulus**: `t = clamp((len − 0.12)/(0.30 − 0.12), 0, 1); ring = round(t·4)`. len 0.12 → ring 0; 0.165 → 1; 0.21 → 2; 0.255 → 3; 0.30 → 4; len 0.10 (= R_in − 0.02) → ring 0 (clamped); len 0.34 (= R_out + 0.04) → ring 4 (clamped). **Off-bed:** len < 0.12 − 0.03 = 0.09 or len > 0.30 + 0.05 = 0.35 → `null`. Angles wrap to **16** steps (−π ≡ +π; step 16 ≡ 0). Total cell count = 5 × 16 = **80**; no cell has ring > 4 |
| TC-GAR-02 | FR-MUS-01 | `plantSeed` into occupied cell returns `occupied`; `nearestFreeCell` prefers ring±1/step±1 within rings 0..4 |
| TC-GAR-03 | FR-MUS-12 | `removePlant` then `undoRemove` restores identical plant (same cell, height, hue); token expiry (5 s, fake timers) rejects |
| TC-GAR-04 | FR-MUS-08 (Should S3) | `applyVisit` grants exactly one seed per local calendar day; caps at 5 |
| TC-GAR-05 | FR-MUS-09 (Should S3) | `stageFor` boundaries at 0/1/3/7 days; offline growth deltas computed |
| TC-GAR-06 | FR-MUS-10 | *Cut (D-011)* — weekly seasons removed; mode now comes from the room signature (TC-SIG-*) |
| TC-GAR-07 | FR-PER-02 | reducers never mutate inputs (deep-freeze inputs in tests) |
| TC-GAR-08 | FR-UI-10 | bed **height** changes (±10 cm) keep all plants' cells valid; bed radius options *Cut (D-011)* — single 0.12–0.30 m bed, `bedInner`/`bedOuter` constants asserted |

### 4.2 Unit — audio/
| ID | Covers | Case |
|---|---|---|
| TC-AUD-01 | FR-MUS-02 | `degreeToHz` for ring 0..4 → scale degree 0..4 (inner = low, outer = high) in each signature mode (incl. Wanderer = C major pentatonic); 5 degrees = one pentatonic octave; all notes in the mode's scale set; degree 5+ (if ever passed) wraps an octave rather than throwing |
| TC-AUD-02 | FR-MUS-03 | Scheduler with a fake clock schedules 16 steps/bar, look-ahead ≥100 ms, no drift over 1000 bars |
| TC-AUD-03 | FR-MUS-05 | height→gain/release and hue→cutoff/detune mappings are monotonic and clamped |
| TC-AUD-04 | FR-MUS-07 | VoicePool steals the oldest-quietest when 25th voice requested |
| TC-AUD-05 | ADR-002 | Each voice renders via `OfflineAudioContext` with peak ≤ −1 dBFS and non-silent output |
| TC-AUD-06 | FR-MUS-11 (Could C1) | Variations with a fixed seed produce a deterministic sequence |
| TC-AUD-07 | FR-SYS-05 | suspend/resume fades (gain ramp durations) and the bar phase persists |

### 4.3 Unit — hands/
| ID | Covers | Case |
|---|---|---|
| TC-HND-01 | FR-HND-02 | Pinch hysteresis: 1.4 cm starts, 2.0 cm holds, 3.1 cm ends |
| TC-HND-02 | FR-HND-03 | 1€ filter reduces synthetic jitter RMS by ≥60% at 72 Hz |
| TC-HND-03 | FR-HND-05/06/07 | Pose detectors need the hold durations; a 100 ms dropout resets |
| TC-HND-04 | LLD §4 | GestureMachine transitions: pull/drag/plant/listen/wake, plus DRAGGING + release OFF-BED → REMOVE; no TWISTING/flick states exist (twist/flick *Cut (D-011)*); tracking loss reverts to IDLE and returns a dragged plant to its cell |
| TC-HND-05 | FR-HND-04 | TargetPicker picks the nearest within 4 cm (provisional; final radius from TC-DEV-00); none beyond |
| TC-HND-06 | FR-HND-11 | **Drag-off removal:** dragging a plant and releasing the pinch at `len > R_out + 0.05 m` (= 0.35 m from bed centre) removes it and emits an undo token; release at len ≤ 0.35 m moves it to the snapped cell instead; undo within 5 s (fake timers) restores the plant to its original cell; at 5.001 s the token is rejected. Synthetic hand paths `dragOff.json` and `dragOffUndo.json` |

### 4.4 Unit — room/ & persistence/
| ID | Covers | Case |
|---|---|---|
| TC-ROOM-01 | FR-ROOM-01 | Solver picks table plane over counter; counter over hit-test; floating when all fail (stubs) |
| TC-ROOM-02 | FR-ROOM-03 | Bed centre placed 0.40 m forward (clamped to 0.35–0.45 m); far edge (centre + 0.30 m) never exceeds the 0.75 m reach cap; re-centred on large surfaces |
| TC-ROOM-03 | FR-ROOM-04 | WallFinder returns ≤2 nearest vertical planes within 3 m, front hemisphere preferred |
| TC-ROOM-04 | FR-ROOM-06 | RoomSize buckets by area |
| TC-PER-01 | FR-PER-01 | save→load round-trips state; debounce coalesces bursts |
| TC-PER-02 | FR-PER-02 | corrupt JSON → backup written, returns null, no throw; unknown version → null |
| TC-PER-03 | FR-PER-04 | no `fetch`/`XMLHttpRequest` referenced anywhere in `src/` (static grep test; service worker *Cut (D-011)* so there is no exemption) |
| TC-PER-04 | FR-PER-01 | schema v1 state uses `bedInner: 0.12, bedOuter: 0.30` (no `bedRadius`); a saved state with ring 5 or 6 (old 7-ring layout) is rejected as corrupt → backup + null |

### 4.4b Unit — garden/signature.ts & room/RoomFeatures.ts (FR-ROOM-10..13, ADR-005; Should S1, gated on TC-DEV-0A)
| ID | Covers | Case |
|---|---|---|
| TC-SIG-01 | FR-ROOM-11 | **Determinism:** `roomSignature(features)` called 100× with the same `RoomFeatures` object returns deep-equal results every time; result shape is exactly `{ keyRoot, mode, tempo, reverbSize, starterVoices[3], paletteSeed }`; no `Math.random`/`Date` referenced in `signature.ts` (static grep) |
| TC-SIG-02 | FR-ROOM-11 | **Quantisation stability:** for each fixture room, perturb every length feature by ±5 cm (table height, ceiling height, largest wall width) and every area feature by ±0.3 m² (table area, floor area), 200 seeded samples → 100% of samples yield a signature deep-equal to the unperturbed one. Also assert that a bucket boundary exists (features moved by ≥2 buckets *do* change at least one output) so the test can fail |
| TC-SIG-03 | FR-ROOM-10/11/13 | **3 rooms → 3 signatures:** fixtures `rooms/sig-small-desk.json`, `rooms/sig-living-table.json`, `rooms/sig-kitchen-counter.json` produce three pairwise-distinct signatures (differ in ≥1 of keyRoot/mode/tempo); `extractRoomFeatures(planes)` from each fixture yields the expected `RoomFeatures` (level, table height/area, wall count); re-tune: applying a new signature to a 3-plant state keeps every plant's cell and changes only pitches |
| TC-SIG-04 | FR-ROOM-11 | **Wanderer fallback:** `roomSignature({ level: 3 })`, `roomSignature({ level: 4 })` and `roomSignature({})` (all features unknown) all return Wanderer = C major pentatonic, 84 BPM, medium reverb, starter voices Bell/Pad/Pluck; `?flags=forceSignature=wanderer` yields the same object regardless of features |

### 4.5 E2E — Playwright + IWER (`tests/e2e/`)
| ID | Covers | Scenario |
|---|---|---|
| TC-E2E-01 | FR-SYS-01/06 | Load → Enter → session active within 5 s (emulated); no console errors |
| TC-E2E-02 | FR-ROOM-01 | `forceLevel=1..4` each yields a placed bed and `room:bedPlaced` |
| TC-E2E-03 | US-03/04 | Emulated palm-up → seed; pinch → plant; after 3 plants, scheduler fires ≥3 triggers in one bar |
| TC-E2E-04 | US-05/07/08 | **pull** (emulated path raises height → gain/sustain change in next bar), **drag** (plant moves to the new snapped cell; old cell free), **drag-off** (release at > 0.35 m from bed centre → `garden:removed` + undo petal entity; pinch the petal within 5 s → plant back in its original cell; after 5 s petal gone). Twist/flick paths *Cut (D-011)* — assert no `TWISTING` state is ever entered |
| TC-E2E-05 | US-10 | palms-out **or** Listen-orb pinch → `listen:enter`; **halo** entity exists (default); vines entity exists only when `forceLevel=1` fixture has walls (Should S2); pinch → `listen:exit`; auto-end at 10 min with fake timers |
| TC-E2E-06 | US-12/13 (Should S3) | reload with `fakeDay=+1` → growth deltas and one new seed |
| TC-E2E-07 | FR-HND-12 | gaze-dwell mode completes **select (plant) + Listen** with no pinch events; no slider interaction required |
| TC-E2E-08 | FR-UI-05/06 | high-contrast and reduced-motion flags toggle the expected materials/particle counts; under reduced motion the tuning ripple becomes a sequential glow (no sweep) |
| TC-E2E-09 | NFR-PERF-03/04 | `autoplant=80` (full bed) + listen: `perf:sample` draws ≤60, tris ≤150k |
| TC-E2E-10 | NFR-PERF-07 | 5-minute soak at `autoplant=40`: heap delta ≤5% (CDP metrics) |
| TC-E2E-11 | NFR-FOV-01 | essential UI bounds within ±25°/±20° (FovGuard self-report) |
| TC-E2E-12 | FR-SYS-05 | emulated visibility hidden/visible → audio gain ramps, phase continuity |
| TC-E2E-13 | FR-ROOM-10..13 (Should S1) | **Tuning ripple:** with the `sig-living-table` plane fixture and `forceLevel=1`, after `room:bedPlaced` the events `room:features` → `room:signature` → `room:tuned` fire in order and `room:tuned` arrives **≤5 s** after `room:bedPlaced` (fake clock), with **≥1 note scheduled** on the scheduler (one per detected surface: table, nearest wall, ceiling) before `room:tuned`. With `forceLevel=3` or `forceSignature=wanderer`: `room:signature` payload equals Wanderer and `room:tuned` still fires with ≥1 note. Negative: with the ripple disabled the test must fail on the missing event |

### 4.6 Device (human runs the qa-engineer's numbered script; report pass/fail per step)
**Every row below requires headset — none on the team as of 2026-10-10.** Pages/flags for TC-DEV-00 and TC-DEV-0A are built in Phase 0 so they can run the day a headset arrives (G1 if H1 is met). Until a human report exists these rows stay *unverified*; in Emergency mode (no headset by Oct 27) they are listed as unverified in the Devpost description.
| ID | Covers | Steps (summary) |
|---|---|---|
| TC-DEV-00 | FR-HND-04, FR-MUS-01 (T-105) | **Pinch-accuracy test protocol** — *requires headset — none on the team as of 2026-10-10.* Open `?flags=pinchTest` on a real table at the bed distance (0.40 m forward). The page shows three grids of small glowing targets in turn, at **3 cm, 4 cm and 5 cm** spacing (5×5 targets each, randomised highlight order). For each grid perform **20 pinches** on the highlighted target; the page logs first-try hit/miss (hit = snapped target == highlighted) and the pinch-to-sound latency (pinch start → first audible click, measured by the page's audio timestamp). Report per grid: first-try success n/20, latency median/max ms. **Rule:** the smallest spacing with ≥90% (≥18/20) first-try success becomes the cell size / hit radius; if 5 cm also fails, file an S1 and re-plan the annulus. Record results in ENVIRONMENT_SETUP §9 and the decision in DECISIONS_LOG |
| TC-DEV-0A | FR-ROOM-01/04/07/10 (T-104) | **Device capability spike** — *requires headset — none on the team as of 2026-10-10.* Open `?flags=capSpike` on Quest 3 (and 3S if available) in a Space-Setup room. The page requests an `immersive-ar` session and reports, one line each, supported/granted/working: **hands** (joint count), **planes** + **semantic labels** (list the labels seen: table/wall/ceiling/floor…), **mesh** detection, **hit-test**, **anchors** + **persistent anchor handles** (create → exit → re-enter → restore), **layers**. Record `navigator.userAgent`, Quest Browser version and every result into **ENVIRONMENT_SETUP §9**. **Gate:** room signature (S1) is built only if planes + labels report *working* |
| TC-DEV-01 | US-01..04 | *requires headset — none on the team as of 2026-10-10.* Clean site data → open prod/staging URL → Enter → time to first sound ≤20 s, first loop ≤90 s |
| TC-DEV-02 | FR-ROOM-01/02 | *requires headset — none on the team as of 2026-10-10.* Run in: (a) Space-Setup room with table, (b) same room no Space Setup, (c) desk, (d) sofa with no table, (e) kitchen counter, (f) small bedroom. Note level reached; all playable |
| TC-DEV-03 | US-05/07/08 | *requires headset — none on the team as of 2026-10-10.* Pull, drag, drag-off (+undo): each ≥9/10 first-try success |
| TC-DEV-04 | US-10 | *requires headset — none on the team as of 2026-10-10.* Listen mode enters in ≤2 s; **aurora halo** over the bed (default); vines reach a real wall when walls are detected (Should S2); sound comes from plant positions (turn head) |
| TC-DEV-05 | US-12 | *requires headset — none on the team as of 2026-10-10.* Exit, re-enter same room → garden restores at the same spot ≤4 s (anchor = Should S4; re-place by chain is the accepted fallback) |
| TC-DEV-06 | US-15/16 | *requires headset — none on the team as of 2026-10-10.* One-hand mode and gaze-dwell mode (select + Listen) full loop |
| TC-DEV-07 | NFR-PERF-01 | *requires headset — none on the team as of 2026-10-10.* perf HUD: 10-min session, 24+ plants, Listen → min fps ≥60, typical ≥72 |
| TC-DEV-08 | FR-SYS-05 | *requires headset — none on the team as of 2026-10-10.* Press Quest button, wait 30 s, return → audio resumes, phase continuous |
| TC-DEV-09 | NFR-REL-02 | *requires headset — none on the team as of 2026-10-10.* Hide hands mid-drag → plant returns; no glitches |
| TC-DEV-10 | FR-HND-14 | *Cut (D-011)* — controller support removed from scope |
| TC-DEV-11 | Policy | *requires headset — none on the team as of 2026-10-10.* Visual sweep: no brands/text/people; English only; 10+ content (emulator sweep done first; device confirms) |
| TC-DEV-12 | Quest 3S | *requires headset — none on the team as of 2026-10-10.* TC-DEV-01, 04, 07 repeated on 3S if available |
| TC-DEV-13 | FR-ROOM-10..13 (Should S1) | *requires headset — none on the team as of 2026-10-10.* Place the bed in two different real rooms (e.g. desk room, kitchen): tuning ripple audible ≤5 s after placement in each; the two rooms produce audibly different key/tempo; re-entering room 1 after room 2 re-tunes the garden in place (plants stay in their cells) |

### 4.7 Perf (automated + device)
| ID | Metric | Budget | Where |
|---|---|---|---|
| TC-PERF-01 | fps | ≥72 typical, ≥60 min | TC-DEV-07 (**requires headset — none on the team as of 2026-10-10**; unverifiable in the emulator) |
| TC-PERF-02 | draw calls / tris | ≤60 / ≤150k | TC-E2E-09 |
| TC-PERF-03 | JS ms/frame | ≤6 ms | perf HUD |
| TC-PERF-04 | heap stability | ±5% over 5 min | TC-E2E-10 |
| TC-PERF-05 | bundle size | ≤4 MB gz | CI size check |
| TC-PERF-06 | audio glitches | 0 at 24 voices | TC-DEV-07 (listen for clicks; **requires headset**) |
| TC-PERF-07 | pinch-to-sound latency | report only (median/max ms) | TC-DEV-00 (**requires headset**) |

## 5. Test data & fixtures
- `tests/fixtures/handPaths/*.json`: recorded synthetic joint sequences for pinch, pull, drag, dragOff, dragOffUndo, palm-up, palms-out, wake, listenOrbPinch. (twist/flick paths *Cut (D-011)*.)
- `tests/fixtures/rooms/*.json`: plane/mesh sets for 6 synthetic rooms (table, counter, none, tiny, large, no-walls) plus 3 signature rooms with semantic labels and known `RoomFeatures` (`sig-small-desk`, `sig-living-table`, `sig-kitchen-counter`).
- `tests/fixtures/states/*.json`: garden states v1 (empty, 3 plants, full = 80 plants, corrupt, future-version, legacy-7-ring).

## 6. Tooling
Vitest (coverage via v8), Playwright, IWER (`iwsdk dev up --mode agent` for headless runs; `iwsdk-runtime` MCP for emulated hands/planes/hit-test/anchors), CDP metrics for heap, `renderer.info` for draws/tris; **once a headset exists:** perf HUD on device, OVR Metrics Tool / `metavr` perf tooling for traces. Meta XR Simulator targets OpenXR apps, not WebXR — it is not part of this pipeline.

## 7. Reporting
Results summary per phase gate in PROGRESS.md §Test status (pass/fail counts, coverage, perf), each row tagged **E** (emulator) or **D** (device, human report attached). Failures become BUG_LOG entries.

## 8. Traceability matrix (abridged; maintained by hand — `scripts/trace.mjs`/T-061 *Cut (D-011)*)
| FR/NFR | Unit | E2E | Device |
|---|---|---|---|
| FR-HND-01 | — | all | hands-first audit, TC-DEV-00..06 |
| FR-HND-04 (hit radius) | TC-HND-05 | TC-E2E-03 | **TC-DEV-00** |
| FR-ROOM-01..07 | TC-ROOM-* | TC-E2E-02 | TC-DEV-0A/02/05 |
| FR-ROOM-10..13 (room signature) | TC-SIG-01..04 | TC-E2E-13 | TC-DEV-0A (gate), TC-DEV-13 |
| FR-MUS-01..12 (FR-MUS-10 cut) | TC-GAR-*, TC-AUD-* | TC-E2E-03/04/05/06 | TC-DEV-03/04 |
| FR-UI-01..10 | — | TC-E2E-07/08/11 | TC-DEV-01/06/11 |
| FR-PER-01..04 | TC-PER-* | TC-E2E-06 | TC-DEV-05 |
| NFR-PERF-* | — | TC-E2E-09/10 | TC-DEV-07 (requires headset) |
