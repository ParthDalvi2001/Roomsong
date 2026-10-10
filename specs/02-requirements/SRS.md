# System Requirements Specification (SRS) — Roomsong

**Status:** Approved · **Owner:** software-architect · **Version:** 1.2 (2026-10-10, plan v2.1 propagated by T-113: `08-status/PLAN_AMENDMENT_2026-10-10.md` §6 and contract API_SPEC v1.2, D-019–D-030; v1.1 applied `08-status/REPLAN_2026-10-10.md`)
Every requirement has an ID, a priority (M/S/C per PRD §6), and a verification method (T = test case in TEST_PLAN, D = device test, I = inspection).
IDs are stable: items removed by the re-plan are marked *Cut (D-011)* in place, never renumbered or deleted; items changed by plan v2.1 carry their decision id. Numbers are stated once here and live as named constants in each module's `config.ts` (API_SPEC §1); the design behind them is in LLD, by section. "D" verification requires a headset; none is on the team as of 2026-10-10 (see §4 note).

---

## 1. System context

```
┌──────────────────────────────────────────────────────────────┐
│ Meta Quest 3 / 3S  —  Meta Quest Browser (WebXR, immersive-ar) │
│                                                                │
│  ┌─────────────── Roomsong (IWSDK + Three.js, TS) ─────────┐  │
│  │ Hands ──► Interaction ──► Garden state ──► Sequencer ──►  │  │
│  │   ▲            │               │              │  Audio    │  │
│  │ Room scan ◄────┘        Persistence     Renderer (WebGL2) │  │
│  └──────────────────────────────────────────────────────────┘  │
│  Inputs: hand joints, planes, meshes, hit-test, anchors        │
│  Room scan ──► RoomFeatures ──► roomSignature() ──► Sequencer  │
│  Outputs: stereo audio, WebGL frames, localStorage/IDB         │
└──────────────────────────────────────────────────────────────┘
Hosting: static files over HTTPS: GitHub Pages + a mirror of the same build (D-022). Zero backend.
```

## 2. Functional requirements

### 2.1 Session & platform
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-SYS-01 | The app shall launch from a public HTTPS URL in Meta Quest Browser and enter an `immersive-ar` session on one button press. | M | D |
| FR-SYS-02 | The app shall request WebXR features: `hand-tracking` (required), `plane-detection`, `mesh-detection`, `hit-test`, `anchors`, `local-floor` (optional), `layers` (optional), `dom-overlay` (optional). | M | I, T |
| FR-SYS-03 | If hand tracking is unavailable, the app shall show a single-screen message in the 2D page explaining that hands are required and how to enable them. | M | T |
| FR-SYS-04 | *Cut (D-011)* — offline service worker; scope cut, the judged URL is always online. | — | — |
| FR-SYS-05 | Pause/resume: on XR session `visibilitychange` to hidden, audio shall fade out within 300 ms and state shall be saved; on resume, audio fades in and the tide continues from its saved phase. | M | T, D |
| FR-SYS-06 | Cold start to first rendered frame in XR ≤ 5 s on Quest 3 over Wi-Fi; total initial download ≤ 4 MB gzipped. | M | T |
| FR-SYS-07 | **Garden window.** When `immersive-ar` is unsupported (or `?flags=window` in dev) the app shall run the same garden in a non-XR window: a fixed camera over a virtual table, pointer/touch as the pinch-equivalent through the `InputSource` abstraction (API_SPEC §1.4, §1.7); the same `garden/`, `audio/`, `persistence/` modules. Never the judged path; the dev bench and demo. Limits in v1 (LLD §11): a pointer cannot pull (no height shaping), the settings panel is not reachable, and the signature is Wanderer. | S (S6) | T (TC-E2E-14) |

### 2.2 Hands & interaction
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-HND-01 | Every feature shall be operable with hand tracking alone; no feature shall require a controller. The app draws no hand or controller models (D-027): in passthrough the user sees their real hands, and any hand cue is the app's own (FR-HND-15, FR-HND-16). | M | D (hands-first audit) |
| FR-HND-02 | Pinch detection uses two signals, one per kind of action (LLD §4, D-028). **Joint distance (the hold signal):** thumb tip to index tip < 2.0 cm = pinch start; > 3.2 cm = pinch end (hysteresis); each edge confirmed over 2 consecutive frames (debounce); no new pinch for 130 ms after a release (lockout). **Platform select (the tap signal):** the platform's own pinch classifier (`selectstart` to `selectend`); the lockout applies to it too. **Rule:** discrete actions (a seed, the Listen orb, the undo petal, a panel control, wake) start and end on the platform select; a pinch on a plant (pull, drag) starts and ends on joint distance. The two are never OR-ed. A source with no platform classifier reports select = pinch. Raw joints only; IWSDK grab components are not used. Provisional until T-105; whether Quest Browser delivers `select*` for hands is unverified (checked before T-124). | M | T, D |
| FR-HND-03 | The pinch point used for targeting shall be smoothed with a 1€ filter: min cutoff 1.0 Hz, beta 0.0, d-cutoff 1.0 Hz. These are the filter's starting values, not tuned results: with beta 0 the pinch point trails a moving hand by about 3 cm at 0.2 m/s; T-105 tunes beta on device (LLD §5.7). The filter state is reset when a lost hand is found again. | M | T, D |
| FR-HND-04 | Interactive targets shall be drawn with a visible diameter of 2.5 cm and picked within a hit radius of 4.0 cm (tunable 3.5–4.0 cm by T-105); the nearest target within the radius wins. Hit spheres of inner-ring neighbours overlap by design; nearest-wins and the FR-HND-16 dead band separate them (LLD §5.1). | M | T, D |
| FR-HND-05 | Palm-up pose: palm normal within 35° of world-up, held 400 ms → "receive" intent. | M | T |
| FR-HND-06 | Palms-out pose: both palm normals within 40° of the head-forward vector, held 1.5 s → Listen mode. In one-hand mode a single palm suffices. | M | T |
| FR-HND-07 | Wake pose: a palm facing the head within 40°, held 600 ms, or any pinch → exit Listen mode. | M | T |
| FR-HND-08 | Pull: while pinched on a plant, once the hand has left the 2 cm dead zone with its vertical travel at least as large as its horizontal travel (dominant axis, latched until release; a tie is a pull), the vertical travel `dy` since pinch start changes the height **relative to the height the plant had at pinch start**: height = clamp(start height + dy / 0.25 m, 0, 1) (`heightAfterPull`, API_SPEC §1.1). The preview and the commit use the same function; the height commits on release and a pull never moves the plant. | M | T |
| FR-HND-09 | *Cut (D-011)* — wrist twist → hue; hue is fixed at seed creation (hue shaping via a settings control is Could, C3). | — | — |
| FR-HND-10 | Drag: while pinched, once the hand has left the 2 cm dead zone with its horizontal travel larger than its vertical travel (dominant axis, latched until release), the plant follows the hand as a preview; release over the bed commits the hovered free cell (FR-HND-16); release inside the inner hole (bed-local XZ length < R_in − 0.03 m) reverts the plant to its origin cell. | M | T |
| FR-HND-11 | Drag off the bed: release while the pinch position's bed-local XZ length > R_out + 0.05 m (= 0.35 m) → remove the plant with a 5 s undo petal (FR-MUS-12; emits `garden:removed`). No velocity threshold. With the bed centre at 0.45 m the far side of that zone is beyond reach, so removal is sideways or towards the body and the hint points that way (LLD §4). | M | T |
| FR-HND-12 | Gaze-dwell mode: a head-gaze reticle selects any target (seed, plant, orb, undo petal, panel control) by dwelling 900 ms (default; 600 / 900 / 1200 ms selectable, `Settings.dwellMs`), and toggles Listen via the orb; a pinch is never required for select or Listen. Pull via on-reticle sliders is Could (C2). | M | T, D |
| FR-HND-13 | Dominant hand selectable; all hints mirror. | M | T |
| FR-HND-14 | *Cut (D-011)* — controller support; hands-only (FR-HND-01). | — | — |
| FR-HND-15 | **Tracking loss.** When a hand's joints become untracked: emit `hands:lost` at once; freeze any held gesture for a grace of **200 ms** (config range 150–250); tracking back within the grace → `hands:found` and the gesture continues; otherwise `gesture:trackingLost` → revert (a dragged plant lerps back to its cell over 150 ms; a pulled plant returns to its height at pinch start; a carried seed returns to the supply; a pressed target is cancelled). While a held gesture is frozen or was just reverted, the held thing is tinted and a hand hint is shown (the app's own cue, D-027) until the hand is seen again, at most 5 s; an empty hand that is lost shows neither (UX §3.4, D-030). No state corruption (NFR-REL-02): nothing is committed before a release. | M | T (TC-HND-07, TC-E2E-16), D |
| FR-HND-16 | **Hover cue.** The target a pinch would act on is highlighted before commit (cell ghost / plant glow); the picker switches target only when the new candidate is ≥ **0.5 cm** closer (dead band); `target:hover` is emitted on change only; discrete actions commit on pinch **release** over the hovered target. For a carried seed or a dragged plant the hovered cell is the free cell a release will commit (LLD §4). | M | T (TC-HND-08), D |

### 2.3 Room understanding & placement
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-ROOM-01 | Placement fallback chain, evaluated in order within 3 s of session start: (1) a detected plane labelled table/desk whose centre is within 1.2 m and in front of the user; (2) any horizontal plane with height 0.5–1.1 m above floor meeting the same distance rule; (3) hit-test placement: the bed follows gaze along a hit-test ray and the user pinches to confirm, with a 10 s timeout; (4) floating bed at 0.45 m forward, 0.25 m below eye height. | M | T, D |
| FR-ROOM-02 | At every fallback level the complete experience shall be playable. | M | D |
| FR-ROOM-03 | The bed centre shall be 0.35–0.45 m forward of the head, **default 0.45 m** (D-020; nearer, down to 0.35 m, only when the surface does not reach 0.45 m), so that the far edge (centre + R_out 0.30 m) is ≤ 0.75 m from the head (seated reach; exactly 0.75 m at the default); re-centre toward the user if the surface is large. | M | T |
| FR-ROOM-04 | Listen mode shall always show an "aurora halo" above the bed (Must). Vines of light toward the nearest 1–2 detected wall planes within 3 m (mesh as fallback) are **Could** (C4; was Should S2, D-021); the halo alone is the complete Listen visual. | M (halo) / C (vines) | T, D |
| FR-ROOM-05 | The user shall be able to re-place the bed at any time from Settings → Garden → Re-place. | M | T |
| FR-ROOM-06 | Reverb decay shall be derived from the **room volume** when available: `reverbRt60` = 0.161 × V ÷ 10 (Sabine's formula with a fixed absorption area of 10 m²; V = `roomVolume`, else floor area × ceiling height with a 2.7 m default ceiling), clamped to 0.3–2.0 s and quantised to **six steps** 0.3 / 0.6 / 0.9 / 1.2 / 1.6 / 2.0 s with half-open boundaries on the raw value at 0.45 / 0.75 / 1.05 / 1.40 / 1.80 s (about 28.0 / 46.6 / 65.2 / 87.0 / 111.8 m³; the raw value decides) (LLD §5.8). Volume unknown → 0.9 s. The constant is tuned for an audible range, not for acoustic truth: the value does not predict the room's measured decay, and no copy may say it does. `reverbSize` (< 0.75 s small, < 1.05 s medium, else large) is a label for the Settings UI only. *The v1.1 floor-area rule (small < 15 m², large > 30 m²): Cut (D-021).* | S | T |
| FR-ROOM-07 | Persistent anchor (**Must**, M5; was Should S4, D-021): on placement create one persistent anchor and persist its handle together with the placement level (`anchorHandle`, `anchorLevel`); on later sessions restore it, and if anchors are unsupported or the restore does not resolve within 4 s, run the fallback chain with the garden preserved and make a new anchor in the background (order: API_SPEC §1.3). Neither case is an error. Creating the anchor never delays the ripple or the first sound. A restored bed keeps its saved level, so it keeps its room signature. Restore reliability is validate-first on device (T-129, A1). | M | T, D |
| FR-ROOM-10 | Room features: within 3 s of session start the app shall derive `RoomFeatures` (table height m, table area m², floor area m², wall count, ceiling height m, largest wall width m, **room volume m³** = floor area × ceiling height, else the global-mesh bounds, else unknown; detection level 1–4) from detected planes/meshes; any field that cannot be measured, or is not finite or not > 0, is left unknown (default). **Heading independence:** the features shall not depend on which way the user faces at session start (a fixture room turned by 30° gives identical features, TC-SIG-03; LLD §5.8). Extraction does not need the placement chain to have run, so an anchor-restored session gets the same features. Emits `room:features`. | S | T, D |
| FR-ROOM-11 | Room signature **v1** (D-021, D-028): a pure, total, deterministic, quantised function `roomSignature(features)` → `{ keyRoot, mode, tempo, reverbRt60, reverbSize, starterVoices[3], paletteSeed }`. In v1 the room sets exactly three outputs: **`keyRoot`** from floor area (< 8 m² → E, 8–17 → D, 17–34 → C, the default, ≥ 34 → A; a bigger room has a lower root), **`mode`** from ceiling height (< 2.60 m → `minorPent`, 2.60–2.90 → `majorPent`, the default, ≥ 2.90 → `susPent`) and **`reverbRt60`** from room volume (FR-ROOM-06). `tempo` is the constant 84 BPM: the room does not set it (FR-MUS-03). Table height, table area, wall count and largest wall width feed only a hash that picks `starterVoices` and `paletteSeed`. Stability: an input at least ±5 cm (a length) or ±0.3 m² (an area) from a bucket boundary keeps its bucket under that much noise; only an input within tolerance of a boundary may flip. The decay is the least stable output: about 17 % of ordinary rooms sit within tolerance of a decay boundary, and a flip moves it one step (LLD §5.8). Detection level ≥ 3 or no feature known → the "Wanderer" signature (C `majorPent`, 84 BPM, 0.9 s medium reverb, Bell/Pad/Pluck, `paletteSeed` 0). `?flags=forceSignature=wanderer` forces it. Not in v1 (validate-first, UAT-17): tempo from the room, and table height → key. | S | T |
| FR-ROOM-12 | Tuning ripple: after placement a light ripple crosses each detected surface in turn (table at 0.3 s → nearest wall at 1.5 s → ceiling at 2.7 s, if any) and each rings one note of the room chord (`chordDegrees(mode)`: a major triad, a minor triad or a sus4; API_SPEC §1.1); `room:tuned` is emitted at 4.0 s, so the full chord is audible ≤ 5 s after placement; a missing surface rings its note at the bed instead. **Captions:** one at a time, each naming its surface, at most 3 words and 16 characters, on screen ≥ 1.2 s: "Table: seeds." in the session that issues the starter seeds and "Table: colour." in every other, "Walls: colour.", "Ceiling: scale."; none at level 3 or 4. No caption credits a surface with the key or the echo (LLD §5.8). Reduced motion: surfaces glow in sequence without the sweep, with the same notes and captions. *The v1.1 chord "scale degrees 0, 2, 4": Cut (D-025).* | S | T, D |
| FR-ROOM-13 | Re-tune: on every session start the signature is recomputed from the current room (never persisted, so never compared with a previous session); plants keep their cells and their pitches follow the key and mode, the shared reverb takes the new decay, **the tempo does not change** (the room does not set it in v1), and the tuning ripple plays. A different room gives a different song with no stored history. | S | T |

### 2.4 Garden & music
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-MUS-01 | The bed is an annulus (ring-shaped): inner radius R_in = 0.12 m, outer radius R_out = 0.30 m; 5 pitch rings at radii 0.12 / 0.165 / 0.21 / 0.255 / 0.30 m (gap 4.5 cm) × 16 steps = 80 cells (inner-ring cell spacing ≈ 4.7 cm). Nothing is plantable inside R_in (tide origin + Listen-orb glow). A plant occupies exactly one (ring, step) cell; one plant per cell. Step 0 is to the seated user's right and steps advance clockwise seen from above: step 4 nearest the user, step 8 left, step 12 farthest (D-029). Provisional (D-020): R_out becomes 0.25 m (ring gap 3.25 cm) only if the T-105 outer-ring test fails. Target sizes: FR-HND-04. | M | T |
| FR-MUS-02 | Pitch mapping: ring r ∈ [0..4] maps to scale degree r (inner = low, outer = high; 5 degrees = one pentatonic octave) of the current mode, transposed by `keyRoot` (A −3, C 0, D +2, E +4 semitones), starting at the voice's base octave. **Modes** are three anhemitonic pentatonic sets (D-025), in semitones above `keyRoot`: `majorPent` [0,2,4,7,9], `minorPent` [0,3,5,7,10], `susPent` [0,2,5,7,10]; no two degrees are a semitone apart, so plants on adjacent rings cannot clash. Mode and key come from the room signature (FR-ROOM-11) or the Wanderer default (C `majorPent`). *`dorianHex`, `lydianHex`: Cut (D-025).* | M | T |
| FR-MUS-03 | Tide sweeps 16 steps per bar at tempo T BPM, 4 beats/bar. T is the user's setting: default 84, range 60–120. **The room does not set the tempo in v1** (D-021); the research band is 60–80 BPM and the listening review T-103 may change the default. Audio events are scheduled by a look-ahead scheduler with a 120 ms look-ahead and a 25 ms tick (no `setTimeout` for timing). *The signature's 72/84/96: Cut (D-021).* | M | T |
| FR-MUS-04 | Five voices synthesized in Web Audio (Must): Bell (FM), Pad (detuned saws + LPF), Pluck (Karplus-Strong), Bass (sub sine + saturation), Choir (formant). A sixth, Shimmer (granular-like noise + band-pass), is Should (S5). | M (5) / S (Shimmer) | T, listening |
| FR-MUS-05 | Height → gain (−24 dB..0 dB) and release time (0.2..2.5 s). Hue (fixed per plant at seed creation) → filter cutoff ±1 octave and detune ±8 cents. | M | T |
| FR-MUS-06 | Each plant's sound is spatialised at the plant's world position by a pooled `PannerNode` with **equal-power** panning and a table-scale distance curve; the listener follows the user's head every frame. At most 2 HRTF "hero" panners may be added, and only after a device A/B justifies them (validate-first, T-129 W1). There is exactly **one** shared reverb (one `ConvolverNode`, impulse response ≤ 2.0 s, one send level) whose decay follows FR-ROOM-06. A master limiter stage (a compressor, then a −1 dBFS ceiling) prevents clipping. Graph shape: NFR-PERF-10, LLD §7.1. *The HRTF panner per plant and the three reverb sizes: Cut (D-021).* | M | T |
| FR-MUS-07 | Max simultaneous voices 24, counted over every sound (plant notes, shaping preview, chord tones, UI sounds). Voice stealing drops the **oldest-quietest**: the note with the lowest envelope level at the steal time; among equally quiet notes, the one that started first. A note still in its attack counts at its peak level, and a note that starts at or after the steal time (the same step) is never stolen. The stolen note fades over 20 ms before its channel is reused (LLD §7.1). | M | T |
| FR-MUS-08 | Seed supply: 3 starter seeds on first launch (voices = the signature's `starterVoices`); one new seed per calendar day (local date) thereafter; unplanted seeds accumulate up to 5. The 3 starter seeds are Must; the daily seed is Should (S3). | M (starter) / S (daily) | T |
| FR-MUS-09 | Growth: plant age advances with real elapsed time (including offline). Visual stages at 0, 1, 3, 7 days (branches, blossoms, glow). Age also adds a subtle harmonic (octave shimmer at ≥3 days). `fakeDay` flag for the video. | S | T |
| FR-MUS-10 | *Cut (D-011)* — weekly seasons; the room signature (FR-ROOM-11) decides the mode instead. | — | — |
| FR-MUS-11 | Listen-mode variations: every 4 bars apply one of: octave echo on a random plant, ghost-note counter-rhythm, swell. Variations are deterministic from a per-session seed. | C | T |
| FR-MUS-12 | Undo for remove (FR-HND-11) lasts 5 s; the garden state is otherwise always consistent (no orphan audio nodes). | M | T |

### 2.5 Onboarding, UI, accessibility
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-UI-01 | Onboarding shows at most one short caption at a time (≤ 6 words; tuning-ripple captions ≤ 3 words, FR-ROOM-12), with icons; no paragraph text. Captions are drawn inside the scene (the projection layer), not in a separate WebXR quad layer. | M | I |
| FR-UI-02 | Time to first sound ≤ 20 s and first loop (3 plants) ≤ 90 s for a new user following captions. | M | D |
| FR-UI-03 | All essential UI lies within ±25° horizontal and ±20° vertical of the forward gaze at 0.5–0.75 m; non-essential effects may extend beyond. | M | T, I |
| FR-UI-04 | UI panels billboard toward the user and keep ≥ 30 px-equivalent text (≥ 1.4 cm cap height at 0.6 m). | M | I |
| FR-UI-05 | High-contrast mode: background dim to 60%, outlines on all targets, 7:1 contrast for captions. | M | T |
| FR-UI-06 | Reduced-motion mode: no camera-relative parallax effects, vine growth (if built, C4) replaced by fade, particle counts halved. | M | T |
| FR-UI-07 | Visual beat ring: a pulsing ring on the bed showing the tide position and each plant's trigger as a flash (for deaf/HoH users); always on in Listen mode; within the flash cap (FR-UI-11). | M | T |
| FR-UI-08 | Voices are distinguishable by silhouette alone (shape-coded); hue is secondary. | M | I |
| FR-UI-09 | One-hand mode: all two-hand poses have single-hand equivalents; the Listen orb is always available. | M | T, D |
| FR-UI-10 | Bed height adjustable ±10 cm. *Bed radius options cut (D-011)*: a single annulus bed 0.12–0.30 m (FR-MUS-01). | M | T |
| FR-UI-11 | **Flashing cap.** No element changes luminance more than **3 times per second** (tide, beat ring, trigger flash, halo, ripple, hover cue); enforced in the animation code (makes NFR-ACC-01 testable). Definitions (API_SPEC §1.8, LLD §5.9): one change = one brightness swing in one direction of at least 10 % of full scale, counted per drawn element in any 1 s window; a flash (up and back) is two changes, so anything that pulses on every beat pulses on every second beat above 90 BPM. Reported as `perf:sample.maxFlashPerS`. | M | T (TC-E2E-15) |

### 2.6 Persistence
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-PER-01 | Garden state (plants, seeds, settings incl. `dwellMs`, anchor handle and its placement level, timestamps) is saved to IndexedDB (localStorage fallback) within 500 ms of any change, and on `visibilitychange`. | M | T |
| FR-PER-02 | State is versioned with a schema version and migrated forward; corrupt state falls back to a new garden without crashing and keeps a backup copy. | M | T |
| FR-PER-03 | "New garden" requires a two-step confirmation (pinch + hold 1.5 s). | M | T |
| FR-PER-04 | No data leaves the device. No analytics, no network calls after assets load. | M | I, T |

## 3. Data requirements
Schema in `04-development/API_SPEC.md` §4. Storage budget ≤ 200 KB.

## 4. Non-functional requirements

| ID | Requirement | Target | Verify |
|---|---|---|---|
| NFR-PERF-01 | Frame rate on Quest 3 | ≥ 72 fps sustained; never < 60 fps for > 0.5 s | D (OVR Metrics / perf HUD) |
| NFR-PERF-02 | Frame rate on Quest 3S | ≥ 60 fps sustained | D |
| NFR-PERF-03 | Draw calls per frame | ≤ 60 | T (renderer.info) |
| NFR-PERF-04 | Triangles per frame | ≤ 150k | T |
| NFR-PERF-05 | JS main-thread time per frame | ≤ 6 ms | T |
| NFR-PERF-06 | Audio graph CPU | ≤ 15% of one core; no glitches at 24 voices | D |
| NFR-PERF-07 | Memory | ≤ 350 MB total browser process growth over a 10-min session; no leaks (heap stable ±5%) | T |
| NFR-PERF-08 | GC pressure | Zero allocations in per-frame hot paths (object pools) | I, T |
| NFR-PERF-09 | **Rendering rules** | One light at most (or unlit emissive), no shadow maps, no post-processing and no extra render targets (keeps FFR + MSAA), FFR medium requested, MSAA through the XR layer | I + T (TC-PERF-08, in TC-E2E-09 and TC-E2E-15); the effect of FFR and MSAA on fps is D |
| NFR-PERF-10 | **Audio graph shape** | ≤ 24 voices (oldest-quietest stolen, FR-MUS-07); 24 pooled **equal-power** `PannerNode`s with a custom distance curve; ≤ 2 HRTF "hero" panners and only if a device A/B justifies them (validate-first, T-129 W1); exactly **one** `ConvolverNode` on a shared send bus, IR ≤ 2.0 s; scheduler look-ahead 120 ms, tick 25 ms; `AudioContext` created/resumed inside the Enter gesture (LLD §7.1) | I + T (TC-PERF-09, TC-AUD-02/04/05) |
| NFR-REL-01 | Crash-free 10-min sessions | 100% in UAT | D |
| NFR-REL-02 | Recovers from hand-tracking loss (hands hidden) | No state corruption; behaviour per FR-HND-15 | T (TC-HND-07, TC-E2E-16), D |
| NFR-REL-03 | Works in ≥ 6 distinct tested rooms and all 4 fallback levels | D |
| NFR-START-01 | Cold start to XR | ≤ 5 s | D |
| NFR-SEC-01 | No third-party scripts, no network calls after load, CSP set | I |
| NFR-PRIV-01 | No PII, no identifiers, no telemetry | I |
| NFR-ACC-01 | WCAG-inspired: contrast ≥ 4.5:1 normal, 7:1 in high-contrast; no flashing above the FR-UI-11 cap (3 luminance changes per second per element, half of what the three-flashes rule allows) | T |
| NFR-COMP-01 | Content rating 10+; policy compliance per HACKATHON_RULES §4 | I |
| NFR-MAINT-01 | `npm run verify` green on every commit; unit coverage ≥ 80% for `audio/`, `garden/`, `persistence/`, `room/` logic (enforced from T-117; not set up before it) | T |
| NFR-FOV-01 | Essential UI inside ±25°H/±20°V; verified with the FoV simulation overlay in dev builds | T, I |
| NFR-I18N-01 | All user-facing strings in one `strings.ts` file; English only | I |

**NFR-PERF device-verification note (2026-10-10, REPLAN §1):** NFR-PERF-01/02/06, NFR-REL-01/03 and NFR-START-01 can only be verified on a Quest headset; the team has none as of 2026-10-10 (acquisition = T-000, headset gate H1 = Oct 20). Until a headset exists these targets are **unverified**, and the emulator budgets NFR-PERF-03/04/05/07/08 (draw calls, triangles, JS ms, heap, allocations — all measurable in IWER/Playwright via `perf:sample`) are enforced on every PR as the proxy. Device results are recorded in ENVIRONMENT_SETUP §9 when available.
**Added by plan v2.1 (also device-only, unverified today):** anchor restore reliability (FR-ROOM-07); the pinch thresholds, filter tuning and hit radius (FR-HND-02/03/04; T-105); whether the platform delivers `select*` for hands (FR-HND-02); tracking loss and joint jitter as real hands produce them (FR-HND-15; the emulator cannot show either); the HRTF A/B (NFR-PERF-10); the effect of FFR and MSAA (NFR-PERF-09); plane labels and two-session feature stability (FR-ROOM-10/11; T-129). The emulator verifies the logic, timing and budgets of all of these; it does not verify how they behave on a headset.

## 5. Operational constraints
- Hosting (decided, D-022): GitHub Pages is the submitted URL (a sub-path of the account's Pages site), plus a Vercel or Netlify mirror of the same build hash; releases deploy from `main` (DEPLOYMENT_GUIDE §1). There is no hosted staging: a push to `develop` runs CI and publishes nothing (DEPLOYMENT_GUIDE §3).
- The production URL and its mirror are frozen from 2026-11-17 12:00 IST until at least 2026-12-11.

## 6. Traceability
BRD goals → PRD features → SRS IDs → USER_STORIES → SPRINT_PLAN tasks → TEST_PLAN cases. The matrix is maintained in `05-testing/TEST_PLAN.md` §8.

Rows added or re-rated by plan v2.1 (PLAN_AMENDMENT §6.1); the test ids are defined in TEST_PLAN and UAT_PLAN:

| SRS ID | PRD §6 | Story / use case | Task | Verification |
|---|---|---|---|---|
| FR-SYS-07 | S6 | US-24 | T-114 | TC-E2E-14 |
| FR-HND-15 | M3 | UC-4, US-07, US-08 | T-116, T-146 | TC-HND-07, TC-E2E-16 |
| FR-HND-16 | M3 | US-03, US-07 | T-116 | TC-HND-08 |
| FR-UI-11 | M7 | US-17, US-18 | T-125 | TC-E2E-15 |
| NFR-PERF-09 | M7 | US-19 | T-125 | I + T (TC-PERF-08, in TC-E2E-09 and TC-E2E-15) |
| NFR-PERF-10 | M2, M7 | US-10 | T-121 | I + T (TC-PERF-09, TC-AUD-02/04/05) |
| FR-ROOM-07 (now Must) | M5 (was S4) | US-12 | T-162 | unit + e2e with `noAnchors`; device A1 (T-129) |
| FR-ROOM-06, FR-ROOM-10..13 (v1) | S1 | US-22, US-23 | T-141, T-142 | TC-SIG-01..04; UAT-17 |
| FR-UI-02 (first 90 s, unaided) | M6 | US-03, US-04 | T-166 | UAT-16 |
| FR-ROOM-04 vines (now Could) | C4 (was S2) | US-10 | not scheduled | TC-ROOM-03 only if built |
