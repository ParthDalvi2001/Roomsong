# System Requirements Specification (SRS) — Roomsong

**Status:** Approved · **Owner:** software-architect · **Version:** 1.1 (2026-10-10, applies `08-status/REPLAN_2026-10-10.md`)
Every requirement has an ID, a priority (M/S/C per PRD §6), and a verification method (T = test case in TEST_PLAN, D = device test, I = inspection).
IDs are stable: items removed by the re-plan are marked *Cut (D-011)* in place, never renumbered or deleted. "D" verification requires a headset; none is on the team as of 2026-10-10 (see §4 note).

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
│  Outputs: stereo audio (HRTF), WebGL frames, localStorage/IDB  │
└──────────────────────────────────────────────────────────────┘
Hosting: static files over HTTPS (host deferred to Phase 1, REPLAN §1). Zero backend.
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

### 2.2 Hands & interaction
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-HND-01 | Every feature shall be operable with hand tracking alone; no feature shall require a controller. | M | D (hands-first audit) |
| FR-HND-02 | Pinch detection: index-thumb distance < 1.5 cm = pinch start; > 3.0 cm = pinch end (hysteresis). | M | T |
| FR-HND-03 | Hand positions used for targeting shall be smoothed with a 1€ filter (min cutoff 1.0 Hz, β 0.007) to reduce jitter. | M | T |
| FR-HND-04 | Interactive targets shall have a hit radius ≥ 4 cm; the nearest target within radius wins. | M | T |
| FR-HND-05 | Palm-up pose: palm normal within 35° of world-up, held 400 ms → "receive" intent. | M | T |
| FR-HND-06 | Palms-out pose: both palm normals within 40° of the head-forward vector, held 1.5 s → Listen mode. In one-hand mode a single palm suffices. | M | T |
| FR-HND-07 | Wake pose: a palm facing the head within 40°, held 600 ms, or any pinch → exit Listen mode. | M | T |
| FR-HND-08 | Pull: while pinched on a plant, vertical displacement from pinch origin maps linearly to height 0–1 over 0–0.25 m, clamped. | M | T |
| FR-HND-09 | *Cut (D-011)* — wrist twist → hue; hue is fixed at seed creation (hue shaping via a settings control is Could, C3). | — | — |
| FR-HND-10 | Drag: while pinched, horizontal displacement > 2 cm moves the plant; release over the bed snaps to the nearest ring/step; release inside the inner hole (bed-local XZ length < R_in − 0.03 m) reverts the plant to its origin cell. | M | T |
| FR-HND-11 | Drag off the bed: release while the pinch position's bed-local XZ length > R_out + 0.05 m (= 0.35 m) → remove the plant with a 5 s undo petal (FR-MUS-12; emits `garden:removed`). No velocity threshold. | M | T |
| FR-HND-12 | Gaze-dwell mode: a head-gaze reticle selects any target (seed, plant, orb, undo petal, panel control) by dwelling 900 ms, and toggles Listen via the orb; a pinch is never required for select or Listen. Pull via on-reticle sliders is Could (C2). | M | T, D |
| FR-HND-13 | Dominant hand selectable; all hints mirror. | M | T |
| FR-HND-14 | *Cut (D-011)* — controller support; hands-only (FR-HND-01). | — | — |

### 2.3 Room understanding & placement
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-ROOM-01 | Placement fallback chain, evaluated in order within 3 s of session start: (1) a detected plane labelled table/desk whose centre is within 1.2 m and in front of the user; (2) any horizontal plane with height 0.5–1.1 m above floor meeting the same distance rule; (3) hit-test placement: the bed follows gaze along a hit-test ray and the user pinches to confirm, with a 10 s timeout; (4) floating bed at 0.40 m forward, 0.25 m below eye height. | M | T, D |
| FR-ROOM-02 | At every fallback level the complete experience shall be playable. | M | D |
| FR-ROOM-03 | The bed centre shall be 0.35–0.45 m forward of the head (default 0.40 m) so that the far edge (centre + R_out 0.30 m) is ≤ 0.75 m from the head (seated reach); re-centre toward the user if the surface is large. | M | T |
| FR-ROOM-04 | Listen mode shall always show an "aurora halo" above the bed (Must). Vines of light toward the nearest 1–2 detected wall planes within 3 m (mesh as fallback) are added when walls exist (Should, S2); without walls the halo alone is the Listen visual. | M (halo) / S (vines) | T, D |
| FR-ROOM-05 | The user shall be able to re-place the bed at any time from Settings → Garden → Re-place. | M | T |
| FR-ROOM-06 | Reverb size shall be derived from room floor area when available: small < 15 m² → short, medium, large > 30 m² → long. Default medium. (Computed as `reverbSize` of the room signature, FR-ROOM-11.) | S | T |
| FR-ROOM-07 | Persistent anchor: on first placement create an anchor and persist its handle; on later sessions restore it, and if the restore fails within 4 s, run the fallback chain with the garden preserved. (Should, S4; fallback = re-place by chain.) | S | T, D |
| FR-ROOM-10 | Room features: within 3 s of session start the app shall derive `RoomFeatures` (table height m, table area m², floor area m², wall count, ceiling height m, largest wall width m, detection level 1–4) from detected planes/meshes; any field that cannot be measured is left unknown (default). Emits `room:features`. | S | T, D |
| FR-ROOM-11 | Room signature: a pure, deterministic, quantised function `roomSignature(features)` → `{ keyRoot, mode, tempo, reverbSize, starterVoices[3], paletteSeed }` (buckets in LLD §5.8). Inputs measured ≥ 5 cm (or ≥ 0.3 m² for areas) away from a bucket boundary shall give the same signature under ±5 cm / ±0.3 m² noise. Detection level ≥ 3 or unknown features → the "Wanderer" signature (C major pentatonic, 84 BPM, medium reverb, Bell/Pad/Pluck). `?flags=forceSignature=wanderer` forces it. | S | T |
| FR-ROOM-12 | Tuning ripple: after placement a light ripple crosses each detected surface in turn (table → nearest wall → ceiling if any) and each rings one chord tone of the room signature (scale degrees 0, 2, 4); the full chord is audible ≤ 5 s after placement; missing surfaces ring their tone at the bed instead. Reduced motion: surfaces glow in sequence without the sweep. Emits `room:tuned`. | S | T, D |
| FR-ROOM-13 | Re-tune: on every session start the signature is recomputed from the current room (never persisted); if it differs from the previous session's, plants keep their cells and their pitches follow the new key/mode, tempo and reverb follow the new signature, and the tuning ripple plays. | S | T |

### 2.4 Garden & music
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-MUS-01 | The bed is an annulus (ring-shaped): inner radius R_in = 0.12 m, outer radius R_out = 0.30 m; 5 pitch rings at radii 0.12 / 0.165 / 0.21 / 0.255 / 0.30 m (gap 4.5 cm) × 16 steps = 80 cells (inner-ring cell spacing ≈ 4.7 cm). Nothing is plantable inside R_in (tide origin + Listen-orb glow). A plant occupies exactly one (ring, step) cell; one plant per cell. | M | T |
| FR-MUS-02 | Pitch mapping: ring r ∈ [0..4] maps to scale degree r (inner = low, outer = high; 5 degrees = one pentatonic octave) of the current mode, transposed by `keyRoot`, starting at the voice's base octave. Mode and key come from the room signature (FR-ROOM-11) or the Wanderer default (C major pentatonic); the scale always sounds consonant. | M | T |
| FR-MUS-03 | Tide sweeps 16 steps per bar at tempo T BPM (default 84, or the signature's 72/84/96), 4 beats/bar; audio events are scheduled ≥100 ms ahead using a look-ahead scheduler (no `setTimeout` for timing). | M | T |
| FR-MUS-04 | Five voices synthesized in Web Audio (Must): Bell (FM), Pad (detuned saws + LPF), Pluck (Karplus-Strong), Bass (sub sine + saturation), Choir (formant). A sixth, Shimmer (granular-like noise + band-pass), is Should (S5). | M (5) / S (Shimmer) | T, listening |
| FR-MUS-05 | Height → gain (−24 dB..0 dB) and release time (0.2..2.5 s). Hue (fixed per plant at seed creation) → filter cutoff ±1 octave and detune ±8 cents. | M | T |
| FR-MUS-06 | Each plant's sound is spatialised with a `PannerNode` (HRTF) at the plant's world position; a master limiter (−1 dBFS ceiling) prevents clipping. | M | T |
| FR-MUS-07 | Max simultaneous voices 24; voice stealing drops the oldest quietest. | M | T |
| FR-MUS-08 | Seed supply: 3 starter seeds on first launch (voices = the signature's `starterVoices`); one new seed per calendar day (local date) thereafter; unplanted seeds accumulate up to 5. The 3 starter seeds are Must; the daily seed is Should (S3). | M (starter) / S (daily) | T |
| FR-MUS-09 | Growth: plant age advances with real elapsed time (including offline). Visual stages at 0, 1, 3, 7 days (branches, blossoms, glow). Age also adds a subtle harmonic (octave shimmer at ≥3 days). `fakeDay` flag for the video. | S | T |
| FR-MUS-10 | *Cut (D-011)* — weekly seasons; the room signature (FR-ROOM-11) decides the mode instead. | — | — |
| FR-MUS-11 | Listen-mode variations: every 4 bars apply one of: octave echo on a random plant, ghost-note counter-rhythm, swell. Variations are deterministic from a per-session seed. | C | T |
| FR-MUS-12 | Undo for remove (FR-HND-11) lasts 5 s; the garden state is otherwise always consistent (no orphan audio nodes). | M | T |

### 2.5 Onboarding, UI, accessibility
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-UI-01 | Onboarding shows at most one short caption at a time (≤ 6 words), with icons; no paragraph text. | M | I |
| FR-UI-02 | Time to first sound ≤ 20 s and first loop (3 plants) ≤ 90 s for a new user following captions. | M | D |
| FR-UI-03 | All essential UI lies within ±25° horizontal and ±20° vertical of the forward gaze at 0.5–0.75 m; non-essential effects may extend beyond. | M | T, I |
| FR-UI-04 | UI panels billboard toward the user and keep ≥ 30 px-equivalent text (≥ 1.4 cm cap height at 0.6 m). | M | I |
| FR-UI-05 | High-contrast mode: background dim to 60%, outlines on all targets, 7:1 contrast for captions. | M | T |
| FR-UI-06 | Reduced-motion mode: no camera-relative parallax effects, vine growth replaced by fade, particle counts halved. | M | T |
| FR-UI-07 | Visual beat ring: a pulsing ring on the bed showing the tide position and each plant's trigger as a flash (for deaf/HoH users); always on in Listen mode. | M | T |
| FR-UI-08 | Voices are distinguishable by silhouette alone (shape-coded); hue is secondary. | M | I |
| FR-UI-09 | One-hand mode: all two-hand poses have single-hand equivalents; the Listen orb is always available. | M | T, D |
| FR-UI-10 | Bed height adjustable ±10 cm. *Bed radius options cut (D-011)*: a single annulus bed 0.12–0.30 m (FR-MUS-01). | M | T |

### 2.6 Persistence
| ID | Requirement | Pri | Verify |
|---|---|---|---|
| FR-PER-01 | Garden state (plants, seeds, settings, anchor handle, timestamps) is saved to IndexedDB (localStorage fallback) within 500 ms of any change, and on `visibilitychange`. | M | T |
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
| NFR-REL-01 | Crash-free 10-min sessions | 100% in UAT | D |
| NFR-REL-02 | Recovers from hand-tracking loss (hands hidden) without state corruption | T |
| NFR-REL-03 | Works in ≥ 6 distinct tested rooms and all 4 fallback levels | D |
| NFR-START-01 | Cold start to XR | ≤ 5 s | D |
| NFR-SEC-01 | No third-party scripts, no network calls after load, CSP set | I |
| NFR-PRIV-01 | No PII, no identifiers, no telemetry | I |
| NFR-ACC-01 | WCAG-inspired: contrast ≥ 4.5:1 normal, 7:1 in high-contrast; no flashing > 3 Hz | T |
| NFR-COMP-01 | Content rating 10+; policy compliance per HACKATHON_RULES §4 | I |
| NFR-MAINT-01 | `npm run verify` green on every commit; unit coverage ≥ 80% for `audio/`, `garden/`, `persistence/`, `room/` logic | T |
| NFR-FOV-01 | Essential UI inside ±25°H/±20°V; verified with the FoV simulation overlay in dev builds | T, I |
| NFR-I18N-01 | All user-facing strings in one `strings.ts` file; English only | I |

**NFR-PERF device-verification note (2026-10-10, REPLAN §1):** NFR-PERF-01/02/06, NFR-REL-01/03 and NFR-START-01 can only be verified on a Quest headset; the team has none as of 2026-10-10 (acquisition = T-000, headset gate H1 = Oct 20). Until a headset exists these targets are **unverified**, and the emulator budgets NFR-PERF-03/04/05/07/08 (draw calls, triangles, JS ms, heap, allocations — all measurable in IWER/Playwright via `perf:sample`) are enforced on every PR as the proxy. Device results are recorded in ENVIRONMENT_SETUP §9 when available.

## 5. Operational constraints
- Hosting: a public HTTPS static host; the choice (GitHub Pages / Vercel / Netlify) is deferred to Phase 1 (REPLAN §1; DEPLOYMENT_GUIDE §1). Staging and production remain separate paths/URLs once chosen.
- The production URL is frozen from 2026-11-17 12:00 IST until at least 2026-12-11.

## 6. Traceability
BRD goals → PRD features → SRS IDs → USER_STORIES → SPRINT_PLAN tasks → TEST_PLAN cases. The matrix is maintained in `05-testing/TEST_PLAN.md` §8.
