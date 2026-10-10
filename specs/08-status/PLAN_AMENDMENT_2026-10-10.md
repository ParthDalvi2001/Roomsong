# PLAN AMENDMENT 2026-10-10 — v2 → v2.1 (research applied · GitHub adopted · usage-limit slip)

**Status:** Applied on Parth's instruction ("start refactor the plan", 2026-10-10 afternoon) · **Written by:** Claude Code (developer's machine)
**Amends:** `REPLAN_2026-10-10.md` (v2, still authoritative for everything not listed here) and `07-workflow/SPRINT_PLAN.md` (now v2.1).
**Reversible:** row by row. Say which row to revert and it goes back to v2.
**Not yet propagated** to PRD/SRS/LLD/API_SPEC/UX/TEST_PLAN/SUBMISSION_CHECKLIST/USER_MANUAL: that is task **T-113** (§4 table), after the usage reset.

---

## 1. What triggered v2.1 (facts)
| Fact | Source | Consequence |
|---|---|---|
| The product discovery research (`09-research/`, 257 KB, 8 notes) was finished at 11:57, after every v2 document (11:02). None of v2 reflects it. | file timestamps | Apply its decision table (§15) where it differs from v2 (§3 below). |
| The repo is now on GitHub (`ParthDalvi2001/Roomsong`, D-018). | D-018 | Hosting can be decided now: GitHub Pages + mirror (D-022). |
| The Claude weekly usage limit was exhausted at ≈15:30 IST on Oct 10 while 3 agents ran; it resets Oct 13 13:30 IST. | agent 429 errors | ≈3 working days lost in Phase 0 → gates shift (D-023); agent cap 2. |

## 2. Decisions recorded (DECISIONS_LOG)
D-019 plan v2.1 adopted · D-020 bed centre default 0.45 m, outer radius decided by T-105 · D-021 scope changes (anchors Must, vines Could, signature v1 narrowed, garden window Should, tracking-loss/hover/flash cap Must) · D-022 hosting = GitHub Pages + mirror · D-023 gates G0 Oct 17 / G1 Oct 24 / G2 Nov 3, agent cap 2.

## 3. Deltas v2 → v2.1 (what the research changed, with its evidence section)
| Area | v2 said | v2.1 says | Research ref |
|---|---|---|---|
| Headset | buy/borrow/rent by Oct 20 | Buy a Quest 3S 128GB now (₹44,590 Amazon.in next-day, seen Oct 10; verify seller/warranty), resell after Dec 11; friend's-headset one-hour script as backup (T-129); H1 Oct 20 unchanged; one device PoC day before Oct 24 | §5.2, §15 Q4 |
| Hosting | decide by Oct 22 | GitHub Pages is the submitted URL (rule text: "GitHub page") + Vercel/Netlify mirror of the same build hash; PoC D1 (root deploy, no SharedArrayBuffer) | §9.4 |
| Bed centre | 0.40 m default | **0.45 m default** (still inside FR-ROOM-03's 0.35–0.45; far edge = 0.75 m cap); radii 0.12–0.30 unchanged; 0.30 vs 0.25 m outer radius decided by T-105 (outer-ring ≥90% first-try + IWER VR-Glasses FoV mask) | §9.4, §8 row "Outer radius" |
| Targets / pinch | hit radius ≥4 cm | visible 2.5 cm, hit slop 3.5–4.0 cm, dead band ≥0.5 cm; pinch enter <2.0 cm / release >3.0–3.5 cm, ≥2-frame debounce, 120–150 ms lockout; 1€ filter mincutoff 1 Hz β 0; `select*` events for discrete pinch; raw joints, not IWSDK grab | §8 rows "Seed targets", "Pinch detector" |
| Room signature v1 | key, mode, tempo, reverb, starter voices, paletteSeed | reverb RT60 (0.161·V/A, 0.3–2.0 s) + root/register from room size + mode within pentatonic sets; tempo and table-height mappings are validate-first (H13 stranger test); built **after** the core payoff is green; ripple + a caption naming the surface | §8 rows "Room signature v1", "Table height → register"; §11.2 |
| Anchors | Should (S4, Phase 3) | **Must** with re-placement fallback; reliability validate-first on device (A1); T-162 moved to Phase 2 | §8 row "Local save…" |
| Vines | Should (S2) | **Could** (C4); halo stays Must | §8 row "Wall vines" |
| New Must items | — | tracking-loss handling + hover cue (T-116); flashing cap ≤3/s (T-125); captions in the projection layer (T-126) | §8 rows "Tracking-loss", "Hover highlight", "Flashing cap", "Captions" |
| Garden window | — | Should: non-XR render path + `InputSource` abstraction (T-114, Phase 1, lane A) — the headset-free bench and demo | §8 row "Non-XR garden window", §9.1 |
| Audio | HRTF panners pooled, 3 reverbs | 24 equal-power panners, ≤1–2 HRTF hero sources only if a device A/B justifies, **one** shared convolver (≤2 s IR, decay from RT60), 16–24 voice cap, `latencyHint` fallback, AudioContext inside the entry gesture | §9.3, §8 row "Audio architecture" |
| Rendering rules | emulator budgets (draws ≤60, tris ≤150k, JS ≤6 ms) | kept (stricter than the research's ≤100 draws) **plus** explicit: one light, no shadow maps, no post-processing, FFR medium, MSAA via the XR layer | §9.3 |
| PoCs | T-104 spike, T-105 pinch | emulator: E0 (IWER feature report, in T-107), D1 (deploy, in T-108), U1 (World.create outside XR, in T-114); device: P1 labels, P2 permission decline, H1 pinch, F1/F2 frame rates/FFR, W1 audio latency/polyphony, A1 anchors, M1 mesh, G1 FoV — all in T-104/T-105/T-129, in that order (≈3.5 h) | §12 |
| Video | <3:00 | 60–90 s, device-recorded if possible, loop in the first 10 s, two rooms, day-1 vs day-3, URL at the end, chapters, no AI footage, no brands/persons | §15 master table "Video" |
| Devpost copy | template | sections "How this meets the brief / How to test / Known limitations / What's next"; measured fps; build hash; both links; ≤140-char tagline naming input + place; Listen / "spatial audio, music visualization" language; claim = "first in a consumer MR instrument / first on Quest" citing MR4MR, ARCHISCORE, RoomTone; never "first musical garden" | §15 Q7, master table "Devpost copy" |
| Stranger tests | 6-room matrix | + ≥3 strangers in ≥3 rooms; first 90 s unaided ≥4/5 (H12); signature attributed to the room ≥3/5 (H13) | §12 |
| PM calendar | — | T-115: Meta webinars Oct 12/13/14, Start membership + Devpost registration confirmed, form fields listed, W-8BEN/bank readiness | §11.1 Phase 0, §15 "Eligibility" |
| Scope rule | — | Should items not green by Nov 10 → "What's next" in the copy, never into the build; Could list empty until Phase 4 is green | §11, §15 Q10 |
| Process | max 3 agents | max 2 agents by default; narrow task cards; reset day = integration/human-test day | usage limit (not research) |

### Not adopted from the research (and why)
- Scheduler 100 ms / 25 ms → we keep API_SPEC's 120 ms / 25 ms (T-102 already built to spec; the difference is immaterial).
- ≤100 draw calls → we keep the stricter ≤60 emulator budget.
- 90 Hz via `updateTargetFrameRate(90)` → only if device frame time <9 ms (validate-first; not planned).
- Phone WebXR, share link, PWA/Store packaging → post-competition (after Dec 11).
- Webcam MediaPipe dev mode → only if no headset by Oct 20 (fallback, not scheduled).

## 4. File-by-file propagation (T-113; keep IDs stable; mark removed items *Cut (D-0xx)*)
| File | Change |
|---|---|
| PRD | §2 glossary bed centre default 0.45 m; §3.1 add hover cue + tracking-loss behaviour; §6 MoSCoW: M5 += persistent anchor (fallback = re-place), M3/M7 += tracking-loss + flashing cap, S1 room signature v1 narrowed (reverb + root/register + mode; tempo = validate-first), S2 vines → C4, new S6 garden window; §8 Q6 hosting resolved (D-022) |
| SRS | FR-ROOM-03 default 0.45 m; FR-ROOM-07 anchors → Must; FR-ROOM-04 vines → Could; FR-ROOM-11 signature inputs/outputs narrowed; FR-HND-01/02 pinch thresholds + 1€ parameters + `select*` events; new FR-HND-15 tracking-loss grace/lerp/tint, FR-HND-16 hover cue; FR-UI-xx flashing cap ≤3/s; FR-MUS-01 target sizes; NFR-AUD panner/convolver/voice-cap numbers; NFR-PERF rendering rules (one light, no shadows/post, FFR medium) |
| LLD | §5.1 snap uses the target numbers; §4 gesture machine: tracking-loss states, hover state; §5.8 signature v1 algorithm (RT60 formula, register buckets, mode sets); §7 audio graph (equal-power panners, one convolver, voice cap); new §x `InputSource` + garden window render path |
| API_SPEC | `RoomFeatures` += `roomVolume`, `RoomSignature` −`tempo` (keep field, mark "v1: fixed per preset"); `PlacementSolver` default centre 0.45; `hands` thresholds as constants; `InputSource` interface; events `hands:lost`/`hands:found`, `target:hover` |
| UX_WIREFRAMES | §2 numbers (0.45 m); §3.x hover cue, tracking-loss tint; Tuning caption names the surface; §6 sound (one reverb, equal-power) |
| TEST_PLAN | TC-ROOM-02 default 0.45; TC-HND thresholds; new TC-HND-07 tracking-loss, TC-UI flashing cap; TC-SIG-01..04 narrowed mapping; TC-DEV-0A += P2/F1/F2/W1/M1 fields; TC-E2E-14 garden window; stranger-test protocol H12/H13 |
| SUBMISSION_CHECKLIST | video 60–90 s spec; copy sections; claim wording; both links; post-submission smoke test |
| DEPLOYMENT_GUIDE | §1 decision = GitHub Pages + mirror (D-022); PoC D1; same-hash check |
| USER_MANUAL | hover cue, "hands lost" hint; nothing on vines unless built |
| WINNING_STRATEGY | Experience row: 0.45 m; differentiation wording (first in a consumer MR instrument) |
| HLD | §3 module table += `InputSource`, garden window; perf rules row |
| ENVIRONMENT_SETUP | §7 hosting = Pages + mirror |
| DECISIONS_LOG, PROGRESS, CLAUDE.md, README | done in this amendment |

## 5. Open (unverified) items carried forward
Plane semantic labels in Quest Browser · persistent-anchor restore reliability · pinch accuracy on a 4.5 cm pitch · frame budget with 80 instanced plants · Web Audio latency/polyphony on Quest · "no shipped consumer app derives music from room geometry" (re-checked by the research: medium–high confidence; use the "first in a consumer MR instrument" wording only) · whether the weekly usage limit is in fact weekly (assumed; confirm on Oct 13).

---

## 6. Propagation sheet — the single source for T-113 and for code written before T-113 lands (added 2026-10-10 evening)
Binding for every agent. If a spec file disagrees with this sheet, the sheet wins until T-113 is merged; after that the spec files win.

### 6.1 New and changed IDs (use exactly these; never renumber existing IDs)
| ID | Pri | Statement |
|---|---|---|
| FR-SYS-07 | S (S6) | **Garden window.** When `immersive-ar` is unsupported (or `?flags=window` in dev) the app runs the same garden in a non-XR window: fixed camera over a virtual table, pointer/touch as the pinch-equivalent through the `InputSource` abstraction; the same `garden/`, `audio/`, `persistence/` modules. Never the judged path; the dev bench and demo. |
| FR-HND-15 | M | **Tracking loss.** When a hand's joints become untracked: emit `hands:lost` at once; freeze any held gesture for a grace of **200 ms** (config range 150–250); tracking back within the grace → the gesture continues; otherwise `gesture:trackingLost` → revert (a dragged plant lerps back to its cell over 150 ms; a carried seed returns to the supply). While lost, a hand-visibility tint/hint is shown. No state corruption (NFR-REL-02). |
| FR-HND-16 | M | **Hover cue.** The target a pinch would act on is highlighted before commit (cell ghost / plant glow); the picker switches target only when the new candidate is ≥ **0.5 cm** closer (dead band); `target:hover` is emitted on change only; discrete actions commit on pinch **release** over the hovered target. |
| FR-UI-11 | M | **Flashing cap.** No element changes luminance more than **3 times per second** (tide, beat ring, trigger flash, halo, ripple, hover cue); enforced in the animation code (makes NFR-ACC-01 testable). |
| NFR-PERF-09 | — | **Rendering rules.** One light at most (or unlit emissive), no shadow maps, no post-processing and no extra render targets (keeps FFR + MSAA), FFR medium requested, MSAA through the XR layer. Verified by inspection + `renderer.info`. |
| NFR-PERF-10 | — | **Audio graph shape.** ≤ 24 voices (oldest-quietest stolen); 24 pooled **equal-power** `PannerNode`s with a custom distance curve; ≤ 2 HRTF "hero" panners and only if a device A/B justifies them (validate-first, T-129 W1); exactly **one** `ConvolverNode` on a shared send bus, IR ≤ 2.0 s; scheduler look-ahead 120 ms, tick 25 ms; `AudioContext` created/resumed inside the Enter gesture. |
| US-24 | S6 | "As someone without a headset I can open the link in a normal browser and plant with the mouse, so I can try or demo the garden." |
| UAT-16 | — | Stranger test H12: ≥ 4 of 5 first-time users complete the first 90 s (first sound, 3-plant loop) unaided. |
| UAT-17 | — | Stranger test H13: in two different rooms ≥ 3 of 5 listeners attribute the change in the song to the room without being told. |
| TC-HND-07 | — | Unit (GestureMachine, fake clock): loss < 200 ms → gesture continues; loss ≥ 200 ms → `gesture:trackingLost` + revert; `hands:lost`/`hands:found` emitted once each. |
| TC-HND-08 | — | Unit (TargetPicker): hover switches only when the new candidate is ≥ 0.5 cm closer; `target:hover` fires on change only. |
| TC-E2E-14 | — | Garden window: in a plain tab (no XR) the bed renders and a pointer click plants a seed that sounds on the next sweep. |
| TC-E2E-15 | — | Flash cap: with `autoplant=80` + Listen the renderer's self-report shows no element above 3 luminance changes per second. |
| TC-E2E-16 | — | Tracking loss e2e: a hand-loss fixture mid-drag → the plant returns to its cell, the hint shows, no console errors. |

PRD §6 MoSCoW after v2.1: **M3** += hover cue and tracking-loss recovery · **M5** += persistent anchor restore with re-placement fallback (was S4; reliability is validate-first on device) · **M7** += rendering rules and flashing cap · **S1** narrowed (6.3) · **S2 → C4** (vines) · **S4** → "moved to M5 (D-021)" · **S6** new (garden window). Could items stay empty-handed until Phase 4 is green.

### 6.2 Numbers (named constants in each module's `config.ts`, each with a comment citing the ID)
| Constant | Value | ID |
|---|---|---|
| Bed centre default / range | 0.45 m forward / 0.35–0.45 m; far edge ≤ 0.75 m | FR-ROOM-03, D-020 |
| Bed radii | 0.12–0.30 m (outer 0.25 m only if T-105 fails; then radial pitch 3.25 cm) | FR-MUS-01, D-020 |
| Pinch enter / release | < 0.020 m / > 0.032 m (hysteresis) | FR-HND-02 |
| Pinch debounce / re-pinch lockout | 2 frames / 130 ms | FR-HND-02 |
| 1€ filter on the pinch point | min cutoff 1.0 Hz, beta 0.0, d-cutoff 1.0 Hz (replaces β 0.007) | FR-HND-03 |
| Visible target diameter | 0.025 m | FR-HND-04 |
| Hit radius | 0.040 m default (tunable 0.035–0.040 by T-105); nearest wins | FR-HND-04 |
| Hover dead band | 0.005 m | FR-HND-16 |
| Tracking-loss grace / revert lerp | 200 ms / 150 ms | FR-HND-15 |
| Drag dead zone | 0.02 m, then the dominant axis decides pull vs drag | FR-HND-08/10 |
| Flash cap | 3 luminance changes per second | FR-UI-11 |
| Voices / panners / HRTF / convolver | ≤ 24 / 24 equal-power / ≤ 2 (validate-first) / exactly 1, IR ≤ 2.0 s | NFR-PERF-10 |
| Reverb RT60 clamp | 0.3–2.0 s | FR-ROOM-06 |
| Scheduler look-ahead / tick | 0.120 s / 0.025 s | FR-MUS-03 |
| Tempo | default 84 BPM; **not set by the room in v1**; user range 60–120; research band 60–80 noted, T-103 may change the default | FR-MUS-03 |
| Gaze dwell | 600 / 900 / 1200 ms, default 900 | FR-HND-12 |
| Video length | 60–90 s | SUBMISSION_CHECKLIST |

### 6.3 Contract deltas → API_SPEC v1.2 (architect owns the wording; the facts below are fixed)
- **Modes are anhemitonic pentatonic sets (D-025).** `ModeId = 'majorPent' | 'minorPent' | 'susPent'`; degree sets `majorPent = [0,2,4,7,9]`, `minorPent = [0,3,5,7,10]`, `susPent = [0,2,5,7,10]`. `dorianHex` and `lydianHex` are *Cut (D-025)*: their first five degrees contain a semitone, so two plants on adjacent rings could clash. `chordDegrees(mode)` returns a **mode-specific** index triple so each room chord is a distinct consonant sonority (architect defines; suggested major triad / minor triad / sus4).
- **Signature v1 (D-021).** Only three things vary with the room: **reverb decay** (`reverbRt60`, seconds, from room volume by Sabine with a named absorption constant, quantised, clamped 0.3–2.0), **key root / register** (from room size = floor area; bigger → lower: E, D, C\*, A), and **mode** (from one further bucket the architect picks; not table height). `tempo` stays in the type but is the constant 84 in v1. Table height, table area, wall count and largest wall width feed only the hash (starter voices, palette). `reverbSize` stays as the derived three-way label for the Settings UI.
- `RoomFeatures` += `roomVolume?: number` (m³; floor area × ceiling height, else global-mesh bounds, else unknown).
- `Settings` += `dwellMs: 600 | 900 | 1200` (default 900).
- Events += `hands:lost { hand }`, `hands:found { hand }` (hands → render, ui, garden) and `target:hover { hand, target: TargetRef | null, cell: Cell | null }` (hands → render, ui; on change only). `gesture:trackingLost` keeps its meaning: the grace expired and the gesture was reverted.
- `InputSource` interface (XR hands / IWER / pointer) for FR-SYS-07; flag `window` forces the garden window in dev.
- `PlacementSolver` default centre 0.45 m; `AnchorStore` is Must.
- `AudioEngine`: one shared reverb whose decay follows `reverbRt60`; equal-power panning by default.

### 6.4 Who edits which file in T-113 (one owner per file; nobody else touches it)
| Stage | Owner | Files |
|---|---|---|
| Contract (first) | software-architect | `04-development/API_SPEC.md`, `03-design/LLD.md`, `03-design/HLD.md`, `03-design/adr/ADR-005-room-signature.md`, `03-design/adr/README.md` |
| Propagation | product-owner | `02-requirements/PRD.md`, `02-requirements/SRS.md`, `02-requirements/USER_STORIES.md`, `02-requirements/BRD.md`, `00-hackathon/WINNING_STRATEGY.md`, `00-hackathon/SUBMISSION_CHECKLIST.md`, `06-release/USER_MANUAL.md` |
| Propagation | ux-designer | `03-design/UX_WIREFRAMES.md` |
| Propagation | qa-engineer | `05-testing/TEST_PLAN.md`, `05-testing/UAT_PLAN.md` |
| Propagation | devops-engineer | `06-release/DEPLOYMENT_GUIDE.md`, `04-development/ENVIRONMENT_SETUP.md` (§7 only), `03-design/adr/ADR-004-github-pages.md`, `06-release/ADMIN_GUIDE.md` |
| Never in T-113 | main session only | `08-status/*`, `07-workflow/SPRINT_PLAN.md`, `CLAUDE.md`, `06-release/THIRD_PARTY_LICENSES.md` (T-111 owns it this round) |
