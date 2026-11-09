# Feature freeze prep: G3, 12 Nov (T-169)

> **The freeze itself happens on Wednesday 12 Nov 2026 (D-007, immovable).** This document only prepares it: nothing is frozen today, and no tag exists. **Refreshed 2026-11-09** against `develop` 792f31f; the live site serves `main` = 5c676b6 (9 Nov).
> *History:* first written 2026-10-27 against `develop` 0c5de87, in Emergency mode (D-013: no headset from 27 Oct). That ended on 7 Nov when Parth's Quest 3S ran the build; Chinmay's Quest 3 followed on 8 Nov. The 27 Oct text is in git (6fa40c3).

**Owner:** scrum-master + devops-engineer; Parth tags or says go · **Sources:** PRD §6 (MoSCoW v2.1); SPRINT_PLAN (G3 criteria; rows T-147b, T-166, T-168, T-169, T-180..T-190); PROGRESS "Gates", "Test status", "Perf" and the 9 Nov stand-ups; TEST_PLAN §4.6 (device status, 9 Nov, T-188); BUG_LOG (BUG-021..041); DECISIONS_LOG D-061..D-071; DECISIONS_PENDING (9 Nov); DEVPOST_DRAFT §1.2; HACKATHON_RULES (T-186, 9 Nov); DEPLOYMENT_GUIDE §1, §4, §5; FREEZE_AND_SUBMIT_RUNBOOK.

**Honesty line.** "Built" = merged on `develop`, with its emulator and unit tests passing (verify 1 966 unit tests green; full browser suite on 8 Nov: 132 passed, 1 flaky BUG-039, 6 skipped). "Seen on a headset" = a human report (**D**) in TEST_PLAN §4.6: Parth, Quest 3S, the dev server with the recorder, 7 Nov; Chinmay, Quest 3, the live site, 8 Nov; one room each. "Pending device" = a part of the row with no human report yet. Nothing below is a full pass of a TC-DEV row.

## 0. In one paragraph

Every Must is built, and the core of each was seen on a headset on 7–8 Nov; each still has parts pending device (TEST_PLAN §4.6 "Still to run"). The Should check passes: S1 (room signature) stays in the build, built and seen tuning both headsets' rooms, with the two-room comparison and the re-tune by ear pending device; S3, S6 and FR-MUS-13 are green; S5 (Shimmer) is not built and stays in "What's next". Code left before 12 Nov: the T-168 bug bash (T-147b, the shaping audio preview, merged 9 Nov as f858505). Human items left: the headset checks, a new person playing, the self-score decision, the name, and A or B for the tag.

## 1. Must items (PRD §6)

| Must | State | Seen on a headset (TEST_PLAN §4.6) | Pending device / left |
|---|---|---|---|
| M1 Enter XR hands-only; placement L1 → L4; reach ≤ 0.75 m | **built, seen on a headset** | Enter starts immersive-ar with hand tracking (3S, 3); the table read after Space Setup (0.56 m); an unscanned room plays the default song, now with "No room scan" (D-068) | in XR ≤ 5 s on the built page (TC-DEV-01/12); desk, sofa, counter, bedroom (TC-DEV-02); the level-3 bed height varied 0.69–0.81 m; "No room scan" not seen on a device yet |
| M2 Seed → pinch-carry → plant → snap (80 cells) → tide; 5 voices; limiter; spatial | **built, seen on a headset** | palm-up seed, either hand pinches (D-062); 3 seeds planted 35 s after Enter (3S) and by 62 s (3) | crackle by voice count (TC-DEV-0A); the sound rating of style B (DECISIONS_PENDING 7.4) |
| M3 Shaping: pull, drag, drag-off + 5 s undo; hover cue; tracking loss | **built, seen on a headset** (pull, move) | 12 pulls and 6 moves, no hand lost (D-063, D-066; BUG-021, 025, 026, 030) | drag-off, the undo petal, a drag by sight (BUG-032/033), hands hidden mid-drag (TC-DEV-09); **T-147b** the live audio preview: merged by 11 Nov or cut (§4) |
| M4 Listen: palms-out or orb; dim; halo; auto-end 10 min; wake | **built, seen on a headset** | Listen (both palms out) and wake (3S) | entry ≤ 2 s; sound from the plants' places; the halo in passthrough |
| M5 Local save/restore; corrupt-save safety; anchor with re-placement | **built, seen on a headset** | saved and back after a reload; Exit and re-entry (D-067); the daily seed arrived (3) | after closing the browser; the 4 s anchor restore and drift; BUG-040's fix (done-pending-device); Day 2 |
| M6 Onboarding: ≤ 6-word captions; first sound ≤ 20 s; 3-plant loop ≤ 90 s | **built, seen on a headset** | first loop 35 s (3S) and 62 s (3), both under 90 s; the stall net fixed (D-061, BUG-022) | the first sound timed on a headset (emulator 15–18 s); the tutorial from a brand-new garden; a new person unaided (DECISIONS_PENDING 5) |
| M7 Perf ≥ 72 / ≥ 60 fps; budgets; rendering rules; flash cap | **built, seen on a headset** | about 90 fps on the 3S (dev server, low 88; first run low 67) and 90 fps on the 3 (live site); 11 draws, about 5k triangles, JS < 2 ms | the 10-minute session with 24+ plants and Listen; a full bed with every effect (emulator worst frame 48 / 103 972 / 2.03 ms); the built page on the 3S |
| M8 Accessibility: one-hand, high contrast, beat ring, reduced motion, gaze-dwell | **built, seen on a headset** (one-hand) | one-hand mode (3); the start page's switches closed until asked for (D-065, BUG-028) | a whole look-to-select run; the `?access=` links (D-070); BUG-028's device check |
| M9 FoV-safe layout; seated reach | **built, seen on a headset** | the settings orb, panel and Exit by pinch and eye-line press (D-064, D-066, D-067) | reading the panel over a bright wall; the 1.5 s New-garden hold (TC-DEV-15) |

## 2. The Should check (PRD §6 scope rule; checked 9 Nov, confirmed on 10 Nov)

"Green by 10 Nov" now that headsets exist (replaces the 27 Oct Emergency-mode definition): built and merged; its emulator and unit TCs pass in the last full run; no open S1 or S2 bug in it; its core seen on a headset, or its Devpost claim lists it under "Emulator only so far". A part pending device does not make a Should red; it does mean the Devpost does not claim that part as tested.

| Should | Result | Evidence | Note |
|---|---|---|---|
| S1 Room signature v1 + tuning ripple + re-tune | **built-pending-device in part; stays in the build** | TC-SIG-01..04, `17-ripple`, `29-room-matrix` 6/6; D: after Space Setup the room tuned the song on the 3S (table 0.56 m, 8 walls, ceiling 2.18 m → minorPent, key 2) and was read on the 3; T-190 room looks merged (D-071, API v1.2.61: the palette turn follows room size, the ceiling caption names the mood) | Pending device: two rooms compared by ear, the ripple ≤ 5 s, one room in two sessions (TC-DEV-13), re-tune by ear (TC-DEV-17), the D-071 look (Parth's 1–5). G2's in-or-out was never recorded (DECISIONS_PENDING 7.5); the headset evidence answers it: **in** |
| S3 Daily seed + growth 0/1/3/7 d + `fakeDay` | **green** | T-161, T-119, T-174 Time-lapse (`26-time-lapse`), TC-E2E-06; D: the daily seed arrived (3, 8 Nov); the calendar-day count fixed (BUG-037) | The Day 2 count is a headset check (DECISIONS_PENDING 4.7); "Emulator only so far" lists "day 2" |
| S5 Shimmer, the sixth voice | **not built → "What's next"** (cut 25 Oct in T-164) | `AudioEngine` rings a `shimmer` plant as a bell; no synth | Already in the draft: *"A sixth voice."* |
| S6 Garden window (non-XR tab, pointer as pinch) | **green** (desktop) | `20-window`, TC-E2E-14 in `23-onboarding`; BUG-031 fixed; the labelled preview for judges (D-060 (11)) | Open it on the live link once at T-183 |
| FR-MUS-13 per-plant 1/2/3/5-bar cycles | **green** | T-173 part 1; `19-first-loop` reads the engine's own rests | — |

Nothing moves into "What's next" on 10 Nov beyond S5. S2 moved to C4 and S4 to M5 (D-021).
**Coulds:** C4 vines **built, pending device** (no device report); C1 **partly** (the styles' daily variations, no Listen-only arrangement); C2 and C3 **not built**. Unbuilt Coulds are never named in the copy (SUBMISSION_CHECKLIST §2.1).

## 3. "What's next" for the Devpost (items not in the build; never into the build)

Fixed on 9 Nov by the scrum-master (PRD §6), applied by the product-owner in DEVPOST_DRAFT §1.2. The draft's 19 words stand:
1. **A sixth voice** (S5, not built).
2. **Shared gardens: a friend's garden in your room's key** (multiplayer is cut, D-011). "In your room's key" stays: S1 is in.
3. **Store launch: early 2027**: not agreed (DECISIONS_PENDING 7.6; T-186 gap 2). Parth and Chinmay agree it, or it is cut (−3 words).
Not added: "the room tunes the song" (S1 is in); T-147b if it is cut (a detail of M3, never promised in the copy); device checks not run (they belong in "Known limitations").

## 4. Open rows before 12 Nov

| Row | What is left | Owner | By | Blocks |
|---|---|---|---|---|
| T-147b | The live audio preview while shaping: **merged 9 Nov (f858505)**; Parth listens and rates it (DECISIONS_PENDING 8) | backend-dev; Parth | done | M3's last piece |
| T-168 | Bug bash: open S1/S2 = 0 (today 0); the code-review pass over the 7–9 Nov changes; S3 if cheap | all devs | 9–11 Nov | the freeze |
| Headset checks | DECISIONS_PENDING 4 (8 checks; TEST_PLAN §4.6 "Still to run", 10 items). A check not run by 16 Nov stays in "Emulator only so far" | Parth / Chinmay | before 12 Nov where possible; the rest by T-184 | the Devpost tested list |
| T-166 | A new person plays the first five minutes unaided (DECISIONS_PENDING 5); the plan wants ≥ 3 strangers in ≥ 3 rooms | Parth (+ Chinmay) | 12 Nov | G3 criterion 3 |
| Self-score | Re-score with the headset evidence (the 15 Oct row in PROGRESS and DEVPOST_DRAFT §2 are superseded) | product-owner; Parth decides below 8 | 11 Nov | G3 criterion 4 |
| The name | Roomsong (★) or SonicSpace (DECISIONS_PENDING 2) | **Parth** | **12 Nov** (the video is 13–14 Nov) | T-180, T-181, T-182 |
| T-169 | **The freeze and the v0.5.0 tag** (§6): A or B (DECISIONS_PENDING 6) | scrum-master + devops-engineer; **Parth** | **12 Nov** | T-180..T-183 |

Not blocking the freeze, needed before 15–17 Nov: the Netlify mirror's address or "no mirror" (DECISIONS_PENDING 7.1; the runbook's mirror steps hang on it); the sound style B rating (7.4); Chinmay's Start Member screenshot and form fields (T-115, 7.3); the launch line and "What excites us" in Parth's and Chinmay's words (7.6); G2's six questions (7.5, can close at G3).
Done since 27 Oct: T-000 headsets (7–8 Nov); T-108 Pages live (8 Nov; mirror not set up); T-188 device status (9 Nov); T-189 test pages out of the release build (9 Nov); T-190 room looks (9 Nov, D-071); T-180 draft at 498/500 words; D-013's 8 Nov "Emergency mode or withdraw" is moot.
After the freeze, out of scope here: T-180 copy (from 12 Nov), T-181 video (13–14 Nov), T-182 gallery (drafting since 9 Nov), T-183 code freeze `v1.0.0-rc1` (15 Nov), T-184 UAT on a headset (16 Nov), T-185 submit (17 Nov ≤ 18:00 IST), T-187 uptime: all in FREEZE_AND_SUBMIT_RUNBOOK.md.

## 5. G3 criteria, checked ahead (9 Nov)

| G3 criterion (SPRINT_PLAN) | Today | What closes it by 12 Nov |
|---|---|---|
| Zero open S1/S2 | **met**: 41 logged, open S1/S2 0. Open S3 "watch": BUG-035, BUG-039 (test timing). Fixed, device check pending: BUG-028, 030, 032, 033, 040 | T-168 keeps it at 0 |
| TC-DEV-01..09 pass, or emulator equivalents documented | **met in the documented form** (T-188): each row has its device result, its emulator stand-in and what the emulator cannot show; each of 01..09 has a partial D report; **none is a full pass** | The headset checks (§4) move parts to passed; the rest is said in "Known limitations" (Golden Rule 11) |
| Stranger tests done | **not met**: Parth and Chinmay, one room each; no stranger yet | DECISIONS_PENDING 5; fewer than 3 strangers is recorded as not met at G3 |
| Self-score ≥ 8/10 each criterion, or an accepted decision | **not scored since 15 Oct** (4 / 3 / 5 / 2, no headset) | The product-owner re-scores by 11 Nov; any criterion below 8 needs **Parth's accepted decision at G3**, recorded in DECISIONS_LOG |

Suggested verdict for 12 Nov if T-168 is at 0 and the §6 step 1 checks are green: **conditional pass**, with the stranger tests and the self-score decision as the conditions.

## 6. The v0.5.0 tag steps (12 Nov; Parth tags, or says "go")

A tag is a label: it deploys nothing (DEPLOYMENT_GUIDE §5). Agents never push `main`. `<F>` = the freeze commit of step 2. All commands run in `~/Documents/test-pro/Roomsong`.
1. **Check (driver, 11 Nov evening to 12 Nov morning):** T-147b merged (done 9 Nov); T-168 closed, BUG_LOG open S1/S2 = 0. On `develop`'s head: `npm run verify`, then the full `npm run test:e2e` (one browser run machine-wide); only BUG-035 and BUG-039 may be re-run once. The soak inside ±5 % and the worst frame inside 60 / 150k / 6 ms. Results in PROGRESS "Test status" with the commit.
2. **Prepare (driver, on `develop`):** `npm version 0.5.0 --no-git-tag-version` (`package.json` says 0.1.0 today; `version.json` reports it); fill RELEASE_NOTES "v0.5.0 — Feature freeze" (the date, what is in, what was seen on a headset, the known limitations, the §3 list); commit, `npm run verify`; `git rev-parse develop` is `<F>`, written in PROGRESS. Nothing else merges until step 3 is done.
3. **Parth's go, in one of two forms:**
   - **A ★ (the freeze build goes live, so Chinmay, the new-person test and the 12–15 Nov headset checks run what is frozen):**
     1. Driver, on Parth's go: `git push origin develop`; wait for its `ci` to go green (a known timing test, BUG-020: **Re-run failed jobs**, once).
     2. Parth: `git status` says "nothing to commit, working tree clean", then
        `git fetch origin && git checkout main && git merge --ff-only <F> && git push origin main && git checkout develop`
     3. Parth: Actions → wait for `deploy` of `<F>` to go green (red: runbook §5).
     4. Parth: `git tag -a v0.5.0 -m "Feature freeze 2026-11-12" <F> && git push origin v0.5.0`
     5. Check: on the phone (mobile data) `https://parthdalvi2001.github.io/Roomsong/version.json?nocache=1` shows `commit` = `<F>`; the driver runs `git fetch origin --tags && git rev-parse 'v0.5.0^{commit}'` and compares. On a headset: open the live link in Meta Quest Browser, Enter, plant one seed, hear it. No mirror check (no mirror yet).
   - **B (label only, no deploy; the live site stays on today's `main`, 5c676b6, until the code freeze, so T-190 and T-147b reach it only on 15 Nov):** Parth says "go v0.5.0"; the driver runs
     `git tag -a v0.5.0 -m "Feature freeze 2026-11-12" <F> && git push origin develop v0.5.0`
4. **Record:** a DECISIONS_LOG line (the freeze at `<F>`, A or B, the What's next list, the G3 verdict, the self-score decision); SPRINT_PLAN T-169 done; PROGRESS "Gates" G3 row; DECISIONS_PENDING 6 removed.
5. **From then on (D-007):** no new features. Only S1/S2 fixes (BUG_LOG triage), copy, video, gallery and the release rows until the code freeze (15 Nov, `v1.0.0-rc1`), then S1 fixes only. A rename to SonicSpace after the freeze counts as copy, but its `/Roomsong/` link change does not: decide the name by 12 Nov.

## 7. For the driver (texts to paste; nothing here edits PROGRESS, SPRINT_PLAN or DECISIONS_PENDING)

**PROGRESS "## Gates", the G3 row (now):**

`| G3 freeze | Nov 12 | — (prep refreshed 9 Nov: FEATURE_FREEZE_PREP_2026-11-12.md; the freeze and the v0.5.0 tag on 12 Nov) | Musts 9 of 9 built, the core of each seen on a headset (7–8 Nov), parts pending device. Should check (9 Nov): S1 stays (built, pending device in part); S3, S6, FR-MUS-13 green; S5 not built (What's next). Open S1/S2 0. Left: T-168; a new person plays (DP 5); the self-score re-score and Parth's decision; the name (DP 2); A or B (DP 6). |`

**SPRINT_PLAN T-169 status:** `doing (9 Nov: prep refreshed, FEATURE_FREEZE_PREP_2026-11-12.md: the Should check passed (S5 to What's next only), What's next fixed, the 12 Nov steps for A and B; the freeze and the tag on 12 Nov)`

**SPRINT_PLAN change log:** `- 2026-11-09 — T-169 prep refreshed now that headsets exist (Emergency mode ended 7 Nov): the Should check (S1 stays, pending device in part; S3, S6, FR-MUS-13 green; S5 to What's next), What's next unchanged (the launch line needs agreement), the 12 Nov steps for A and B with commands; the runbook's mirror, UAT and test-page lines brought up to date.`

**DECISIONS_PENDING 6 (unchanged in substance):** ★ A or B as in §6 step 3; the self-score decision joins it on 12 Nov.

## 8. The runbook, checked against 9 Nov

FREEZE_AND_SUBMIT_RUNBOOK.md fixed for plain facts: the "Checked" date; a state line (Pages live, the Netlify mirror not set up and what to skip without it, test pages out of the release build, two headsets); the code-freeze row ("and Netlify, if set up"); the UAT row (on a Quest 3 / 3S); §1.4 (only with a mirror; the site folder has no `proto` since T-189); §1.5 step 4 (`proto/bed/` also 404). Still true: `uptime.yml` is on `main` (5c676b6) and skips an unset `MIRROR_URL` with "no mirror yet"; the Pages artifact lasts 1 day (`upload-pages-artifact@v4`, no `retention-days`); `package.json` goes to `1.0.0` at T-183.
Hangs on Parth: with "no mirror" (DECISIONS_PENDING 7.1), the Devpost's "mirror <mirror URL>" goes, and the uptime watch checks Pages alone.

## 9. What this did not do

It ran no tests and wrote no code. States are read from TEST_PLAN §4.6, BUG_LOG, PROGRESS, DECISIONS_LOG, SPRINT_PLAN and the source. The live site's commit (5c676b6) is read from `origin/main`, not fetched (no network). It created no tag, and the freeze is not done.
