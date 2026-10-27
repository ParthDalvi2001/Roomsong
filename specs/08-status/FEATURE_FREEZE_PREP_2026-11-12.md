# Feature freeze prep: G3, 12 Nov (T-169)

> **The freeze itself happens on Wednesday 12 Nov 2026 (D-007, immovable).** This document only prepares it: nothing is frozen today, and no tag exists. Written 2026-10-27 against `develop` 0c5de87.

**Owner:** scrum-master + devops-engineer; Parth tags or says go · **Sources:** PRD §6 (MoSCoW v2.1) and the SRS rows marked Must/Should; SPRINT_PLAN (G3 criteria, rows T-147, T-153..T-155, T-164, T-166, T-168, T-169, T-175, T-180..T-187); PROGRESS "Gates", "Test status", "Perf"; `G2_REVIEW_2026-11-03.md`; TEST_PLAN §2, §4.5, §4.6; UAT_PLAN §2.1; DEPLOYMENT_GUIDE §4–§5; RELEASE_NOTES; DECISIONS_LOG D-007, D-013, D-021, D-060.

**Honesty line.** "Built" means merged on `develop` with its emulator or unit tests passing. "Built, pending device" means the same, but the behaviour also has a TC-DEV row that only a headset can run. No headset has been used (Emergency mode since 27 Oct), so no row below says "verified on Quest".

## 0. In one paragraph

Every Must is built. All nine are **built, pending device**, because each has a headset row. Of the four live Shoulds, the garden window, the daily seed and the per-plant cycles are **built**. The room signature is **built, pending device**, and G2 decides whether it stays. The Shimmer voice is **not built** (cut 25 Oct). The work left before 12 Nov is mostly human or release work: go live, the outsider and stranger play, the rating, the video take, the Emergency-mode equivalents, the bug bash and the tag. Only two small code rows remain: the shaping audio preview and the test pages leaving the build.

## 1. Must items (PRD §6)

| Must | State | Evidence (emulator / unit) | Left before green on a Quest |
|---|---|---|---|
| M1 Enter XR hands-only; placement L1 → L4; reach ≤ 0.75 m | **built, pending device** | `01-enter-xr` 3, `06-room` 12, `29-room-matrix` 6/6 (centre 0.35–0.45 m, far edge ≤ 0.75 m in all six rooms); BUG-010 fixed | TC-DEV-01, TC-DEV-02 |
| M2 Seed → pinch-carry → plant → snap (80 cells) → tide; 5 voices; scale; limiter; equal-power spatial | **built, pending device** | `16-seeds`, `19-first-loop`, `09-audio` 7, `21-styles`; 5 voices (T-144), spatializer (T-145), style B in the app (56b088b) | TC-DEV-01/07; the sound rating (G0's criterion, failed since D-051) |
| M3 Shaping: pull, drag, drag-off + 5 s undo petal; hover cue; tracking-loss recovery | **built, pending device**; one leftover | `15-shaping` 3, `11-tracking-loss`, the undo petal and its hover cue (T-146, T-147, T-116) | TC-DEV-03, TC-DEV-09; **the live audio preview** (`AudioEngine.preview()` is a stub; G2 §3 (b): build by 6 Nov or cut) |
| M4 Listen: palms-out or orb; dim; aurora halo; auto-end 10 min; wake | **built, pending device** | `18-listen` 3 (T-148, D-050) | TC-DEV-04 |
| M5 Local save/restore; corrupt-save safety; persistent anchor with re-placement fallback | **built, pending device** | `22-save-restore` 7, `10-persistence` 3, `13-anchor-store` 2, `14-boot-session` 13; one backup on New garden plus "Bring back the old garden" (a2dc475) | TC-DEV-05 (restore reliability is device-only) |
| M6 Onboarding: ≤ 6-word captions; first sound ≤ 20 s; 3-plant loop ≤ 90 s | **built, pending device** | `23-onboarding` 4/4; the first sound ≤ 20 s in all six matrix rooms; first loop 34.4 s at test speed | TC-DEV-01; the no-table first plant note re-measured after the 6 s wait (G2 §1 row 8) |
| M7 Perf ≥ 72 / ≥ 60 fps; emulator budgets; rendering rules; flash cap | **built, pending device** | 48 draws / 103 972 tris / 2.03 ms JS (budgets 60 / 150k / 6); soak +1.13 %; 0 lights, no shadows, no post; `maxFlashPerS` ≤ 3 | TC-DEV-07 (fps on hardware); the Devpost names fps as unverified |
| M8 Accessibility: one-hand, high contrast, beat ring, reduced motion, gaze-dwell select + Listen | **built, pending device** | `24-one-hand`, `25-gaze`, TC-E2E-08 (T-160, D-054, D-055); BUG-007/008 fixed | TC-DEV-06 |
| M9 FoV-safe layout; seated reach | **built, pending device** | TC-E2E-11 (FovGuard ±25° / ±20°); reach in every matrix room; the panel never below −30° | TC-DEV-01/06 (on-device view) |

## 2. Should items (PRD §6), and the Coulds in one line

| Should | State | Evidence | If not green by 10 Nov |
|---|---|---|---|
| S1 Room signature v1 + tuning ripple + re-tune | **built, pending device**; in or out at G2 | TC-SIG-01..04, `17-ripple`, `29-room-matrix` 6/6; honest captions (D-060 (7)); a floating bed keeps a known wall's signature (D-060 (14)) | If G2 or a tripwire says out (G2 §4): force `WANDERER`, cut the room captions, use the no-signature copy, and add *"the room tunes the song"* to "What's next" |
| S3 Daily seed + growth 0/1/3/7 d + `fakeDay` | **built** | T-161, T-119, the Time-lapse switch T-174 (`26-time-lapse`), TC-E2E-06 | (green) |
| S5 Shimmer, the sixth voice | **not built** (cut 25 Oct in T-164) | — | "What's next": *a sixth voice* |
| S6 Garden window (non-XR tab, pointer as pinch) | **built** (desktop) | `20-window` 1, TC-E2E-14 in `23-onboarding`; offered to judges as a labelled preview (D-060 (11)) | (green; verify on the hosted build, T-183) |
| FR-MUS-13 (Should) per-plant 1/2/3/5-bar cycles | **built** | T-173 part 1, `19-first-loop` reads the engine's own rests | (green) |

S2 moved to C4 and S4 moved to M5 (D-021).
**Coulds:** C4 vines **built, pending device** (T-149); C1 **partly** (the styles' daily variations, with no Listen-only arrangement); C2 and C3 **not built**. Coulds never go into "What's next" unless the product-owner wants a line.

**"Green by 10 Nov" in Emergency mode (proposed; the scope rule of PRD §6 does not define it):** built and merged; its emulator and unit TCs pass in the last full run; no open S1 or S2 bug in it; its Devpost claim states what was not device-tested. "Pending device" alone does not make a Should red, because TEST_PLAN §2 lets device rows be recorded as unverified in Emergency mode.

## 3. What moves to Devpost "What's next" if not green by 10 Nov (never into the build)

Decided on **Mon 10 Nov** by the scrum-master (the PRD §6 rule), applied by the product-owner in DEVPOST_DRAFT §1.2 "What's next". The list as of today:
1. **A sixth voice** (S5, already cut).
2. **The room tunes the song**, but only if S1 is out at G2 or a tripwire fires. If S1 stays in, the line is not needed.
3. Anything else red on 10 Nov, by the definition in §2. Today nothing else is red.
4. Already in the draft and unchanged: *Shared gardens: a friend's garden in your room's key.* (Drop "in your room's key" if S1 goes out.)

## 4. Open plan rows that must land before 12 Nov

| Row | What is left | Owner | Date | Blocks |
|---|---|---|---|---|
| T-108 | Go live: Pages from `main` + the Netlify mirror (DECISIONS_PENDING 1) | **Parth**, then devops-engineer (smoke check) | **29 Oct 18:00 IST** | Playtest & React, Path A of G2, Stage 1 |
| T-115 | Chinmay's calendar, eligibility, and the Start Member screenshot (DECISIONS_PENDING 3) | Chinmay | 31 Oct | T-185 |
| T-153 + T-175 | Re-take with `handCue` and a second room; share the rough cut with Chinmay | ux-designer (driver runs the capture) | 31 Oct | G2 row 4, T-181 |
| T-164 / T-103 | Rate style B by ear: Parth, then Chinmay + 2 outsiders (DECISIONS_PENDING 4); the sound freeze at 56b088b proposed | Parth, Chinmay | 2 Nov | G0 sound criterion, Polish |
| (driver) | One clean full browser run + the 5-minute soak at the G2 commit | driver | 2 Nov | G1 condition 1, G2 condition 3 |
| T-155 | The G2 review held; the outsider sheets in PROGRESS | scrum-master + Parth + Chinmay | 3 Nov (sheets 2 Nov) | the cut list, S1 |
| T-147b (if G2 §3 (b) says build) | The live audio preview while shaping | backend-dev | 6 Nov | M3's last piece |
| T-154 | The listening review #1 written (S2 device blocks wait for a headset) | qa-engineer + Parth | 7 Nov | T-164's close |
| T-186 | Weekly rule check | product-owner / Chinmay | 31 Oct, 7 Nov | — |
| (D-013) | 8 Nov with no headset: submit in Emergency mode or withdraw | **Parth** | **8 Nov** | everything after |
| T-166 | Stranger tests: ≥ 3 strangers in ≥ 3 rooms on a headset. Playtest & React notes count if they reach that; else recorded as unverified at G3 | qa-engineer + Chinmay | 10 Nov | G3 criterion 3 |
| T-188 (new, proposed) | Emergency-mode equivalents of TC-DEV-01..09, one line each in TEST_PLAN §4.6 (draft in §5 below) | qa-engineer | 10 Nov | G3 criterion 2 |
| (scope rule) | Should check and the "What's next" list fixed (§3) | scrum-master → product-owner | 10 Nov | T-169, T-180 |
| T-168 | Bug bash: BUG_LOG open S1/S2 = 0; S3 if cheap | all devs | 9–11 Nov | T-169 |
| T-189 (new, proposed at G2) | Test pages out of the submission build (D-060 (10)) | devops-engineer | 11 Nov | the release build |
| T-129 | Device script S1: only if a headset is borrowed (the one-hour version) | qa-engineer + Parth | any day | the device rows |
| T-169 | **The freeze and the v0.5.0 tag** (§6) | scrum-master + devops-engineer; Parth | **12 Nov** | T-180..T-183 |

After the freeze, and out of scope here: T-180 copy (from 12 Nov), T-181 video (13–14 Nov), T-182 gallery, T-183 code freeze `v1.0.0-rc1` (15 Nov), T-184 UAT (16 Nov), T-185 submit (17 Nov ≤ 18:00 IST), T-187 uptime (the last steps ride on T-185).

## 5. G3 criteria, checked ahead

| G3 criterion (SPRINT_PLAN) | Today | What closes it by 12 Nov |
|---|---|---|
| Zero open S1/S2 | **met** (10 logged, 0 open) | T-168 keeps it at 0 |
| TC-DEV-01..09 pass, or Emergency-mode emulator equivalents documented | **not run: no headset**; the equivalents are not written down yet | T-188. Draft mapping: 01 → `01-enter-xr`, `23-onboarding`, the matrix's first sound · 02 → `29-room-matrix`, `06-room` · 03 → `15-shaping` · 04 → `18-listen` · 05 → `22-save-restore`, `13-anchor-store` · 06 → `24-one-hand`, `25-gaze` · 07 → `26-worst-frame`, `27-heap` (fps itself unverifiable) · 08 → `14-boot-session` · 09 → `11-tracking-loss`. Each line also names what the emulator cannot show (UAT_PLAN §2.1) |
| Stranger tests done | **open** | Playtest & React notes (if ≥ 3 strangers in ≥ 3 rooms), else recorded as not done in Emergency mode. A laptop run never counts (UAT_PLAN §2.1) |
| Self-score ≥ 8/10 each criterion, or an accepted decision | **not met** (17 Oct guess 5 / 5 / 5 / 3; the 12 Nov guess with no headset is 6 / 6 / 5 / 5) | Without a headset, Technical and Polish cannot pass about 6 (DEVPOST_DRAFT §2). This needs **an accepted decision by Parth at G3**, recorded in DECISIONS_LOG, with the outsider scores beside it |

## 6. The v0.5.0 tag steps (12 Nov; Parth tags, or says "go")

A tag is a label: it deploys nothing (DEPLOYMENT_GUIDE §5). Agents never push `main`.
1. **Check (driver, morning of 12 Nov):** T-168 is closed with BUG_LOG open S1/S2 = 0. `npm run verify` and the full browser suite pass on `develop`'s head, with the soak inside ±5 % and the worst frame inside 60 / 150k / 6 ms. Record the results in PROGRESS "Test status" with the commit.
2. **Prepare (driver, on `develop`):** set `"version": "0.5.0"` in `package.json` (it is what `version.json` reports); fill RELEASE_NOTES "v0.5.0 — Feature freeze" (the date, what is in, the known limitations, the "What's next" list of §3). Commit and verify.
3. **Parth's go, in one of two forms:**
   - **A ★ (the freeze build goes public, so Chinmay and outsiders see what is frozen):** Parth runs `git checkout main && git merge --ff-only develop && git push origin main && git checkout develop`, waits for `ci` and `deploy` to pass, then runs `git tag -a v0.5.0 -m "Feature freeze 2026-11-12" main && git push origin v0.5.0`.
   - **B (label only, no deploy):** Parth says "go v0.5.0", and the driver runs `git tag -a v0.5.0 -m "Feature freeze 2026-11-12" <develop commit> && git push origin v0.5.0`.
4. **With A:** from a second device or network, check that `/Roomsong/version.json` `commit` equals `git rev-parse v0.5.0` on Pages and on the mirror (DEPLOYMENT_GUIDE §4 step 5).
5. **Record:** a DECISIONS_LOG line (the freeze at `<hash>`, the What's next list, the G3 verdict, the self-score decision); SPRINT_PLAN T-169 done; PROGRESS "Gates" G3 row.
6. **From then on (D-007):** no new features. Only bug fixes, copy, video and the release rows until the code freeze (15 Nov, `v1.0.0-rc1`).

## 7. For the driver (texts to paste; nothing here edits PROGRESS, SPRINT_PLAN or DECISIONS_PENDING)

**PROGRESS "## Gates", the G3 row (now):**

`| G3 freeze | Nov 12 | — (prep written 27 Oct: FEATURE_FREEZE_PREP_2026-11-12.md; the freeze and the v0.5.0 tag happen on 12 Nov) | Musts 9 of 9 built, pending device; Shoulds: S3, S6, FR-MUS-13 built, S1 built pending device (G2 decides), S5 not built (What's next). Open G3 criteria: TC-DEV-01..09 equivalents (T-188, 10 Nov), stranger tests (T-166), self-score ≥ 8 or an accepted decision (Parth, 12 Nov). Should check and the What's next list on 10 Nov. |`

**SPRINT_PLAN row status updates:**
- T-169: `todo (prep written 27 Oct: FEATURE_FREEZE_PREP_2026-11-12.md; the freeze and the tag on 12 Nov: Parth merges main and tags (A) or says go (B))`
- T-147: append `; the live audio preview: G2 §3 (b), T-147b by 6 Nov or cut`

**SPRINT_PLAN new rows (Phase 3):**

`| T-188 | **Emergency-mode equivalents of TC-DEV-01..09** (G3 criterion; TEST_PLAN §2): one line per row in TEST_PLAN §4.6 naming the e2e spec that stands in and what the emulator cannot show (UAT_PLAN §2.1); the Devpost "Known limitations" cites it | qa-engineer | — | D | TEST_PLAN §4.6 lines; G3 | todo (by 10 Nov) |`

`| T-147b | **The live audio preview while shaping** (T-147's leftover; only if G2 §3 (b) says build): ui('tick') on a pinch of a plant, preview() of the plant at its pulled height (throttled), ui('tick') on a drag cell change, ui('bump') on a drag released inside | backend-dev | T-147 | C | unit: the throttle and the four calls; 15-shaping still green; heap case | todo (by 6 Nov) |`

**SPRINT_PLAN change log:**

`- 2026-10-27 — Feature freeze prepared (T-169, FEATURE_FREEZE_PREP_2026-11-12.md): new rows T-188 (Emergency-mode equivalents, 10 Nov) and T-147b (the shaping audio preview, 6 Nov, if G2 keeps it); the Should check on 10 Nov with "green" defined for Emergency mode; the v0.5.0 steps.`

**DECISIONS_PENDING, under "Later":**

`- **12 Nov, the feature freeze:** v0.5.0 by A (you merge main and tag, the freeze build goes public) ★ or B (say "go", I tag develop, no deploy); and the self-score decision (≥ 8 is out of reach without a headset). FEATURE_FREEZE_PREP_2026-11-12.md §5–§6.`

## 8. What this did not do

It ran no tests and wrote no code. The states are read from the plan, PROGRESS, the specs' assertions and the source. It created no tag, and the freeze is not done.
