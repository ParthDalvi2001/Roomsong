# Sprint Plan & Task Backlog — Roomsong (v2, re-planned 2026-10-10)

**Status:** Living · **Owner:** scrum-master · **Supersedes:** v1 backlog (T-001…T-093), archived in §Archive below.
Decisions: `specs/08-status/REPLAN_2026-10-10.md`. Dates IST. Status: `todo · doing · review · done · done-pending-device · blocked · dropped`.
Lanes: **A** fullstack (room/access/onboarding/integration) · **B** frontend (hands/render/ui) · **C** backend (garden/audio/persistence) · **D** support (qa/devops/arch/ux/PO). **Max 3 concurrent agents.**
**No headset on the team (2026-10-10).** Every device-dependent task is `done-pending-device` until a headset exists. T-000 outranks everything.

---

## Calendar (phases with gates, not fixed-length sprints)

| Phase | Dates | Goal | Gate |
|---|---|---|---|
| **0 Prove** | Oct 10–15 | Scaffold; desktop **sound prototype rated**; emulator pipeline; device-spike + pinch-test pages ready; hosting + name chosen | **G0 Oct 15** |
| **1 One path** | Oct 16–22 | Judge path end-to-end in the emulator; 3 voices; save/restore | **G1 Oct 22** · **H1 headset by Oct 20** |
| **2 Differentiator & payoff** | Oct 23–Nov 1 | Room signature (gated) + ripple; 5 voices + HRTF; shaping; Listen; onboarding; L3 | **G2 Nov 1** · rough video cut |
| **3 Polish** | Nov 2–11 | Accessibility set; daily seed/growth; art + sound pass; perf; room matrix | **G3 Nov 12 feature freeze** |
| **4 Release** | Nov 12–17 | Video, copy, **code freeze Nov 15**, clean UAT Nov 16, **submit Nov 17 ≤18:00 IST** | Confirmation |
| Watch | Nov 18–Dec 11 | Uptime only | — |

**Headset escalation:** none by Oct 27 → *Emergency mode* (emulator-verified only; emulator video; honest Devpost copy). None by Nov 8 → decision D-0xx: submit anyway or withdraw.

## Gate criteria
- **G0 (Oct 15):** `npm run verify` green; app enters emulated XR; sound prototype rated ≥4/5 by Parth and ≥3/5 by Chinmay + 2 outsiders (if below 3/5 twice → change sound direction before more code); device-spike page and pinch-test page built; hosting option chosen; name chosen; headset plan with a date.
- **G1 (Oct 22):** in the emulator: place (L1/L2/L4) → palm-up seed → pinch-plant → snap (5×16 annulus) → tide plays 3 voices → save → reload restores; draws ≤15, no console errors; TC-E2E-01/02/03 green. If a headset exists: TC-DEV-0A + TC-DEV-00 run; ≥72 fps in the one-path scene.
- **G2 (Nov 1):** outsider (Chinmay + 1) scores the build on the 4 criteria; cut list finalised; room signature in or out (based on T-104 evidence); rough video cut exists.
- **G3 (Nov 12):** zero open S1/S2; TC-DEV-01..09 pass (or Emergency-mode emulator equivalents documented); self-score ≥8/10 each criterion or accepted decision.

## Backlog

### Phase 0 — Prove (Oct 10–15)
| ID | Task | Owner | Deps | Lane | Acceptance | Status |
|---|---|---|---|---|---|---|
| **T-000** | **Get a Quest 3 or 3S in hand by Oct 20** (buy/borrow/rent; Quest 3S is the cheapest option). Record the plan and date in PROGRESS | Parth + Chinmay | — | human | headset date written; device arrives ≤ Oct 20 | **todo (critical)** |
| T-100 | Local git init (`main`), first commit (competition-window proof), `.gitignore`; GitHub remote `origin` added, push by Parth (D-018; zip sync retired) | devops-engineer | — | D | `git log` shows first commit ≥ 2026-09-24; remote reachable; ENVIRONMENT_SETUP §2.1 note | done (2026-10-10; push pending Parth) |
| T-101 | Scaffold IWSDK app (ENVIRONMENT_SETUP §2 options: TS, AR, hands required, anchors/hit-test/planes/meshes optional, no locomotion, grabbing yes, physics no); add Vitest/Playwright/ESLint/Prettier; scripts; `npm run verify` green; pin versions (§9); licences logged | devops-engineer | T-100 | D | verify green; emulator opens and enters XR | todo |
| T-102 | **Desktop sound prototype** (`proto/sound/`): AudioEngine + look-ahead Scheduler + theory + Bell/Pad/Pluck + limiter; a 30 s loop of 6 fixed plants on a 5-ring/16-step grid; a plain HTML page with Play + "next room" (3 fixed Wanderer-like signatures) | backend-dev | — | C | plays in Chrome; TC-AUD-01/02/05 for 3 voices; link posted for listening review | todo |
| T-103 | Listening review #0: Parth, Chinmay, 2 outsiders rate the prototype (1–5) + one sentence each | Parth + Chinmay | T-102 | human | ratings in PROGRESS; G0 criterion met or a sound-direction change logged | todo |
| T-104 | **Device capability spike page** (`proto/spike/`): reports `isSessionSupported('immersive-ar')`, per-feature availability (hand-tracking, plane-detection + semantic labels, mesh-detection, hit-test, anchors + `requestPersistentHandle`, layers), UA, and pinch-to-sound latency; results form | software-architect | T-101 | D | page builds; runs in emulator (shows emulated values); **device run pending headset** | todo |
| T-105 | **Pinch-accuracy test page** (`proto/pinch/`): target grids at 3/4/5 cm on a detected or floating surface; 20 pinches each; logs first-try success + latency (TC-DEV-00) | frontend-dev | T-101 | B | page builds; emulator smoke; **device run pending headset** | todo |
| T-106 | `core/` module: events, clock, settings, flags (incl. `forceLevel`, `forceSignature`, `fakeDay`, `autoplant`, `skipOnboarding`, `perfHud`), strings, log, pool + tests | software-architect | T-101 | D | unit tests pass; API_SPEC §2/§3 implemented | todo |
| T-107 | Emulator/e2e pipeline: IWSDK AI mode in `vite.config`; Playwright config; IWER fixture loader (6 rooms, hand paths); TC-E2E-01 green headless | qa-engineer | T-101 | D | `npm run test:e2e` green | todo |
| T-108 | Hosting decision (GitHub Pages / Vercel / Netlify) + name decision recorded; if hosting needs an account, Parth creates it | Parth + devops-engineer | — | human | D-0xx entries; DEPLOYMENT_GUIDE §1 filled | todo |
| T-109 | Security pass 1: CSP meta, no-network grep test, dependency audit in `verify` | software-architect | T-101 | D | SECURITY_PLAN §5 items in place | todo |
| T-110 | **G0 review** (Oct 15): gate checklist; Phase 1 task confirmation | scrum-master + Parth | all | D | PROGRESS §Gates | todo |

### Phase 1 — One path (Oct 16–22) → v0.1
| ID | Task | Owner | Deps | Lane | Acceptance | Status |
|---|---|---|---|---|---|---|
| T-120 | `garden/model` + `snap` (annulus 0.12–0.30, 5 rings, 16 steps, off-bed detection) + `plantSeed`/`nearestFreeCell` (TDD) | backend-dev | T-106 | C | TC-GAR-01/02/07 | todo |
| T-121 | `audio/` engine moved from proto: AudioEngine, Scheduler (120 ms look-ahead), theory (5-degree pentatonic, mode param), Bell/Pad/Pluck, limiter, `syncPlants` diffing | backend-dev | T-102, T-120 | C | TC-AUD-01/02/03/05 | todo |
| T-122 | `persistence/` Store + schema v1 (bedInner/bedOuter) + validators + backup + debounce | backend-dev | T-120 | C | TC-PER-01/02 | todo |
| T-123 | `room/` adapters (Plane, Mesh, HitTest) with `supported()` + IWER stubs; `PlacementSolver` L1/L2/L4 (+L3 stub) with clamp (centre 0.40 m, far edge ≤0.75 m) | fullstack-dev | T-106 | A | TC-ROOM-01/02; TC-E2E-02 for L1/L2/L4 | todo |
| T-124 | `hands/` HandSampler + 1€ filter + pinch hysteresis + palm-up detector + GestureMachine v1 (IDLE/CARRYING/PINCHED/PLANT) + TargetPicker | frontend-dev | T-106 | B | TC-HND-01/02/03(palmUp)/04(subset)/05 | todo |
| T-125 | `render/` BedRenderer (annulus guides) + PlantRenderer (InstancedMesh, 3 silhouettes) + TideRenderer (audio clock) + perf HUD + `perf:sample` | frontend-dev | T-120 | B | draws ≤15 in emulator; HUD shows numbers | todo |
| T-126 | `ui/Landing` (Enter, feature detection, access toggles, Help link) + `ui/Captions` + `FovGuard` | frontend-dev | T-106 | B | TC-E2E-01; TC-E2E-11 | todo |
| T-127 | Seed delivery: supply orb, palm-up → seed-to-palm animation, carry, release over bed → plant; off-bed release returns seed | fullstack-dev | T-120, T-124, T-125 | A | emulated palm-up/pinch path works | todo |
| T-128 | Integration: wire Room→Hands→Garden→Audio→Render→UI; save on change; restore on load; TC-E2E-03 (first loop) green | fullstack-dev + qa-engineer | T-121..T-127 | A | G1 emulator criteria met | todo |
| T-129 | Device script S1 (TC-DEV-0A spike, TC-DEV-00 pinch test, TC-DEV-01 first path, TC-DEV-02 a/b) — **run when headset arrives**; results → ENVIRONMENT_SETUP §9, cell size decision, BUG_LOG | qa-engineer + Parth | T-104, T-105, T-128 | D | report in PROGRESS | todo (pending headset) |
| T-130 | **G1 review** (Oct 22) + room-signature go/no-go draft (needs T-129 evidence or defaults to "build with Wanderer fallback, planes optional") | scrum-master + Parth | all | D | PROGRESS §Gates; D-0xx | todo |

### Phase 2 — Differentiator & payoff (Oct 23–Nov 1) → v0.3
| ID | Task | Owner | Deps | Lane | Acceptance | Status |
|---|---|---|---|---|---|---|
| T-140 | `room/RoomFeatures` extraction (table height/area, floor area, wall count, ceiling, largest wall; level) from planes/meshes with hit-test fallback estimates | fullstack-dev | T-123 | A | unit tests with 6 room fixtures | todo |
| T-141 | `garden/signature.ts` pure `roomSignature()` (quantised buckets → key/mode/tempo/reverb/starterVoices/paletteSeed) + Wanderer default (TDD) | backend-dev | T-106 | C | TC-SIG-01..04 | todo |
| T-142 | Tuning ripple: `render/TuningRipple` sweeps table → wall → ceiling; `audio` plays chord tones per surface; `room:tuned` ≤5 s after placement; reduced-motion variant | frontend-dev + backend-dev | T-140, T-141, T-125 | B | TC-E2E-13 | todo |
| T-143 | Re-tune on session start: recompute signature; `audio.setMode()` re-tunes plants in place | backend-dev | T-141 | C | unit + e2e (`forceSignature`) | todo |
| T-144 | Voices Bass + Choir (→5) + VoicePool stealing + height→gain/release mapping | backend-dev | T-121 | C | TC-AUD-03/04/05 all 5 | todo |
| T-145 | `Spatializer` (HRTF panners, pooled) + procedural `Reverb` (3 sizes) sized from signature/room | backend-dev | T-144 | C | no clicks at 24 voices (emulator CPU check) | todo |
| T-146 | Shaping gestures: pull (height), drag (move + snap), drag-off-bed → remove + 5 s undo petal; tracking-loss revert | frontend-dev | T-124 | B | TC-HND-04 full, TC-HND-06; TC-E2E-04 | todo |
| T-147 | Shaping feedback: lift/glow, scale ladder, ghost cell, live audio preview, petals (pooled particles) | frontend-dev | T-146, T-144 | B | UX §3.4 satisfied in emulator; zero per-frame allocations | todo |
| T-148 | Listen mode: palms-out + Listen orb, dim dome, aurora halo, auto-end 10 min, wake; `listen:*` events | fullstack-dev | T-124, T-125 | A | TC-E2E-05 (halo) | todo |
| T-149 | Vines (Should): `WallFinder` + `VineRenderer` along the nearest wall when available | fullstack-dev + frontend-dev | T-148, T-140 | A | TC-ROOM-03; vines with wall fixture | todo |
| T-150 | Onboarding state machine + captions + hints (pull/drag) + L3 hit-test placement | fullstack-dev | T-127, T-126 | A | TC-E2E-03 timing (first sound ≤20 s emulated) | todo |
| T-151 | Settings panel (Sound/Access/Garden) via UIKit + wrist orb; re-place bed; new garden (hold) | frontend-dev | T-126 | B | controls change state; e2e smoke | todo |
| T-152 | Pause/resume (visibility → fade, save, phase continuity) | backend-dev | T-122, T-121 | C | TC-AUD-07, TC-E2E-12 | todo |
| T-153 | Rough video cut v0 (emulator capture if no headset; device capture if available) per SUBMISSION_CHECKLIST §3 | Chinmay + ux-designer | T-148 | human | 2–3 min rough cut shared | todo |
| T-154 | Device script S2 (TC-DEV-03 shaping, 04 Listen, 05 restore, 08 pause) + listening review #1 | qa-engineer + Parth | T-147..T-152 | D | report | todo (pending headset) |
| T-155 | **G2 review** (Nov 1): outsider scoring; cut list; signature in/out final | scrum-master + Parth + Chinmay | all | D | PROGRESS §Gates; DECISIONS_LOG | todo |

### Phase 3 — Polish (Nov 2–11) → v0.4 / v0.5
| ID | Task | Owner | Deps | Lane | Acceptance | Status |
|---|---|---|---|---|---|---|
| T-160 | Accessibility set: one-hand mode + orb; gaze-dwell select + Listen; high contrast; reduced motion; beat ring | fullstack-dev | T-148, T-151 | A | TC-E2E-07/08; TC-DEV-06 (pending) | todo |
| T-161 | Daily seed + growth stages (0/1/3/7 d) + `applyVisit` + bloom-in animation + `fakeDay` | backend-dev + frontend-dev | T-122 | C | TC-GAR-04/05; TC-E2E-06 | todo |
| T-162 | Persistent anchor restore (Should) behind `AnchorStore`; fallback chain on failure | fullstack-dev | T-123, T-122 | A | e2e with `noAnchors`; TC-DEV-05 (pending) | todo |
| T-163 | Art pass: palette tint by paletteSeed, glow balance, idle sway, silhouettes polish; `impeccable` critique | ux-designer + frontend-dev | T-147 | B | visual review ≥4/5 (Parth + Chinmay) | todo |
| T-164 | Sound pass: mix levels, UI sounds from the room chord, Listen sweep, limiter; Shimmer voice if time | ux-designer + backend-dev | T-145 | C | listening review #2 ≥4/5; TC-AUD-05 | todo |
| T-165 | Perf pass: instancing audit, overdraw, FFR, heap soak TC-E2E-10, JS ≤6 ms (emulator); device fps (pending) | frontend-dev + qa-engineer | T-163 | B | TC-PERF-02..05 green; TC-PERF-01 pending device | todo |
| T-166 | Room matrix: 6 emulator fixtures + 6 real rooms (device, incl. no Space Setup and permission denied) | qa-engineer + Parth | T-150 | D | all playable; report | todo (device part pending) |
| T-167 | Help page = USER_MANUAL; strings proofread; policy sweep (no brands/people; English) | product-owner | T-151 | D | TC-DEV-11 / emulator sweep | todo |
| T-168 | Bug bash (Nov 9–11): all S1/S2; S3 if cheap | all devs | T-160..T-167 | A–C | BUG_LOG open S1/S2 = 0 | todo |
| T-169 | **G3 feature freeze** (Nov 12): tag `v0.5.0` | scrum-master + devops-engineer | T-168 | D | tag; DECISIONS_LOG | todo |

### Phase 4 — Release (Nov 12–17) → v1.0.0
| ID | Task | Owner | Deps | Lane | Acceptance | Status |
|---|---|---|---|---|---|---|
| T-180 | Devpost copy final (real numbers; honest about device testing) | product-owner + Chinmay | T-169 | D | ≤500 words; in SUBMISSION_CHECKLIST | todo |
| T-181 | Video final (Nov 13–14): capture (device if available, else emulator) + edit + captions; upload public | Chinmay + ux-designer | T-169 | human | <3:00; link | todo |
| T-182 | 6 gallery images + icon | Chinmay + ux-designer | T-169 | human | files in evidence/ | todo |
| T-183 | **Code freeze (Nov 15)**: tag `v1.0.0-rc1`; deploy to chosen host; verify from a second device/network | devops-engineer + Parth | T-168 | D | version.json matches | todo |
| T-184 | UAT final (Nov 16) on prod from a clean headset (or Emergency-mode emulator UAT) + compliance gate + go/no-go | qa-engineer + product-owner + Parth | T-183 | D | sign-off; gate 10/10 | todo |
| T-185 | **Submit (Nov 17 ≤18:00 IST)**: tag `v1.0.0-submission`, deploy, lock prod, Chinmay submits as Representative, archive evidence | Chinmay + devops-engineer | T-184 | human | confirmation screenshot | todo |
| T-186 | Weekly rule check (every Friday from Oct 10): Devpost Updates/FAQ/Rules | Chinmay / product-owner | — | D | note in PROGRESS | todo (recurring) |
| T-187 | Uptime checks through Dec 11 | devops-engineer | T-185 | D | zero downtime | todo |

## Lane guide
A = fullstack-dev · B = frontend-dev · C = backend-dev · D = support. Three agents max at once (one per A/B/C); D fills gaps. Worktree per agent.

## Change log
- 2026-10-09 — v1 backlog (T-001…T-093).
- 2026-10-10 — **v2**: phases + gates; headset reality (T-000, H1, Emergency mode); geometry fix; room signature as Should; scope cuts per REPLAN §5; new IDs T-100+. v1 IDs retired (see Archive).

## Archive — v1 task IDs (retired 2026-10-10)
T-001…T-093 are superseded. Mapping of the kept intent: T-004→T-101 · T-007→T-106 · T-003→T-104 · T-005→T-107 · T-014→T-109 · T-010/011→T-123 · T-015/016→T-124 · T-017→T-120 · T-018→T-121 · T-019/024→T-125 · T-020→T-127 · T-021→T-122 · T-022→T-128 · T-030/031→T-146 · T-033→T-144 · T-034→T-145 · T-037→T-147 · T-038/013→T-126 · T-039→T-162 · T-050→T-148 · T-051→T-149 · T-053→T-161 · T-055→T-150 · T-056→T-151 · T-057→T-152 · T-070–072→T-160 · T-074→T-163 · T-075→T-164 · T-076→T-165 · T-086–093→T-180–187. Dropped: T-009 (diagrams), T-061 (trace script), T-073 (controllers), T-077 (service worker), T-052 (variations → Could), seasons/codex work.
