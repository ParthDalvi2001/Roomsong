# Submission dry run, 9 Nov (8 days early)

**Owner:** product-owner · **Date:** 2026-11-09 afternoon IST · **Checked against:** `develop` 359799f (live site: `main` 5c676b6) · **Method:** the `submission-pack` skill's seven steps, documents only: nothing submitted, nothing sent, no network (so no `curl` of the live `version.json` and no `ffprobe`). **Read:** HACKATHON_RULES §5, §10, §12; SUBMISSION_CHECKLIST §1 to §5; DEVPOST_DRAFT v3.1 (f5a378d); VIDEO_SCRIPT_V1; FREEZE_AND_SUBMIT_RUNBOOK §1.7, §2; DECISIONS_PENDING (9 Nov); FEATURE_FREEZE_PREP §5; PROGRESS (Perf, Test status, rule check log); BUG_LOG; THIRD_PARTY_LICENSES; `git tag -l` (no tags yet). `evidence/gallery/` is git-ignored (Parth's word), so it exists only in the main checkout on this Mac: its README and its file list were read there, read only.

**Today: no-go, as expected 8 days out.** Of 60 items (each counted by the first mark in its State cell): ✓ ready 18 · ✗ missing 14 · ⏳ waits 28. The order of the blockers is at the end.

| # | Item | State | Waits for (person, date) | Lives in |
|---|---|---|---|---|
| **Compliance gate** | | | | HACKATHON_RULES §10 |
| C1 | Whole flow hands-only on a real Quest 3 | ⏳ D so far on both headsets (7–8 Nov: enter, plant, shape, Listen, settings, Exit, save, one-hand). Not on a headset: undo, drag by sight, hands-free, Day 2, and every 9 Nov merge (D-071, T-147b, BUG-042..050) | Parth or Chinmay: HEADSET_RUN sheet 10 Nov; Chinmay: UAT-01 on the freeze build, 16 Nov | `specs/05-testing/UAT_PLAN.md` UAT-01; `specs/05-testing/TEST_PLAN.md` §4.6; `specs/05-testing/HEADSET_RUN_2026-11-10.md` |
| C2 | First commit on or after 24 Sep | ✓ 4c831aa, 2026-10-10 | — | `git log --reverse` |
| C3 | Third-party items licensed and listed | ✓ 65 packages listed; the only package change since the 25 Oct check (zod 4.6.5 → 4.6.7, 5019066, 7 Nov) is in its row; re-check on the freeze build | qa-engineer, T-184, 16 Nov | `specs/06-release/THIRD_PARTY_LICENSES.md` |
| C4 | No brands, logos or people (app, video, images) | ⏳ app words ✓ (T-167; the 9 Nov captions "Ceiling: minor / major / open mood." are plain); gallery drafts clean (README); video not shot | Chinmay (clean frame, 13–14 Nov); qa-engineer the sweep, 16 Nov. TC-POL-05, its named evidence, is defined in no test plan: qa-engineer writes its steps before then | `specs/06-release/VIDEO_SCRIPT_V1.md` §2, §4; HACKATHON_RULES §10 |
| C5 | ≥ 60 fps over 10 minutes on Quest 3 | ⏳ about 90 fps on both headsets (D), but never over 10 minutes and never on the freeze build | Parth: TC-DEV-07 and TC-DEV-12 on the 3S in a third room, by 15 Nov (FEATURE_FREEZE_PREP §5.1 decision 3); Chinmay: 10 min on Quest 3, 16 Nov | `specs/08-status/PROGRESS.md` Perf |
| C6 | Public HTTPS link, no login | ⏳ ✓ public HTTPS, no login, since 8 Nov; the clean-headset check of the freeze build is open | Chinmay, 16 Nov | `specs/06-release/FREEZE_AND_SUBMIT_RUNBOOK.md` §1.5 |
| C7 | Video under 3:00, public, real footage | ✗ no footage; the script is ready | Chinmay (shoot 13 Nov, retakes 14), Parth (cut, upload 14 Nov) | `specs/06-release/VIDEO_SCRIPT_V1.md` |
| C8 | Representative a Start member; everyone 18+ and eligible | ✗ unconfirmed since 10 Oct | Chinmay: membership screenshot, by 12 Nov (DECISIONS_PENDING 7.3 (a)) | `specs/08-status/DECISIONS_PENDING.md` 7.3 |
| C9 | All text in English | ⏳ app ✓ (T-167), copy ✓; final sweep on the freeze build | qa-engineer, 16 Nov | HACKATHON_RULES §10 |
| C10 | Submitted before 18 Nov 12:00 PT | ⏳ | Chinmay, 17 Nov by 18:00 IST | `specs/06-release/FREEZE_AND_SUBMIT_RUNBOOK.md` §2 |
| **Devpost form** | | | | `specs/06-release/DEVPOST_DRAFT.md` §1 |
| F1 | Name | ✓ Roomsong; ⏳ the rename question is open | Parth (DECISIONS_PENDING 2, ★ keep), before the 13 Nov shoot: the title, link and end card change together | DEVPOST_DRAFT §1.1 |
| F2 | Tagline ≤ 140, names the pinch and the real table | ✓ A, 111 characters (B 112); ⏳ `[decide 14 Nov]`: B if two rooms do not sound different | Chinmay or Parth: TC-DEV-13 two rooms by ear, by 13 Nov | DEVPOST_DRAFT §1.1 |
| F3 | Track and division | ✓ Entertainment, New Experience | — | DEVPOST_DRAFT §1.1 |
| F4 | Build link field | ✓ `https://parthdalvi2001.github.io/Roomsong/`; ⏳ the freeze build on it (B1) | Parth | DEVPOST_DRAFT §1.1 |
| F5 | Description ≤ 500 words, the four required sections | ✓ 497 words by the draft's script rule; How to test first; How this meets the brief, Known limitations, What's next present | — | DEVPOST_DRAFT §1.2 |
| F6 | Open markers in the description | ⏳ mirror (`[not yet: T-108]`), build hash (T-183), video link (T-181), launch line | Parth: mirror, DECISIONS_PENDING 7.1 (★ none); Claude: hash, 15 Nov; Parth: video link, 14 Nov; Parth + Chinmay: launch, 14 Nov | DEVPOST_DRAFT §1.2 |
| F7 | The two G3 decide markers | ⏳ "tested by the team" (no stranger yet) and "Your room tunes it" / tagline A | Parth or Chinmay: a stranger's unaided first five minutes (DECISIONS_PENDING 5); TC-DEV-13; both settled 14 Nov | DEVPOST_DRAFT §1.2; `specs/08-status/FEATURE_FREEZE_PREP_2026-11-12.md` §5.1 |
| F8 | Real numbers from the final build | ⏳ in the copy today: about 90 fps and JS < 2 ms (D: 3S dev build, Quest 3 on an older live build), first sound 15–18 s (E, 24 Oct), three plants 35 s and 62 s (D), two headsets, one room each. Re-measure on the freeze build | qa-engineer + Chinmay, T-184, 16 Nov; Parth confirms "one room each" | `specs/08-status/PROGRESS.md` Perf; DEVPOST_DRAFT claims table |
| F9 | Known limitations: device against emulator | ✓ tested list, rooms, and "Emulator only so far", with the 9 Nov shaping sounds and room tints | moves as the headset checks pass | DEVPOST_DRAFT §1.2 |
| F10 | Hand-interaction field | ✓ drafted, 319 words; ⏳ the field's existence and limit are unknown | Chinmay: photo of the form's fields, by 12 Nov (DECISIONS_PENDING 7.3 (b), T-115) | DEVPOST_DRAFT §1.3 |
| F11 | "What excites us about VR" | ✗ must be the team's own words (a starting point is in the draft) | Parth + Chinmay, by 14 Nov (DECISIONS_PENDING 7.6) | DEVPOST_DRAFT §1.3 |
| F12 | Target launch | ✗ not agreed; with no agreement the 4 words "Store launch: early 2027." are cut | Parth + Chinmay, by 14 Nov (DECISIONS_PENDING 7.6) | DEVPOST_DRAFT §1.1 |
| F13 | Team: names, emails, roles | ✗ emails missing; roles drafted (Developer; Product Manager, Representative) | Parth + Chinmay, by 14 Nov (T-185) | DEVPOST_DRAFT §1.1 |
| F14 | The real form field list | ✗ never seen | Chinmay, by 12 Nov (T-115) | `specs/08-status/DECISIONS_PENDING.md` 7.3 |
| F15 | The one "first" sentence matches the copy rule | ✗ the checklist rule still asks for the antecedents; the draft's "no earlier consumer MR instrument" was chosen (HACKATHON_RULES §12 gap 5, ★) | driving session: amend SUBMISSION_CHECKLIST §2.1, by 12 Nov | `specs/00-hackathon/SUBMISSION_CHECKLIST.md` §2.1 |
| F16 | Weekly rule check against the live site | ✗ last live read 27 Oct (HTTP 403 to automated reads since 8 Nov); special award criteria never recorded | Parth or Chinmay, logged in, by 12 Nov (DECISIONS_PENDING 3) | HACKATHON_RULES §12; PROGRESS rule check log |
| **Video** | | | | `specs/06-release/VIDEO_SCRIPT_V1.md` |
| V1 | Script: length, beats, captions, no voice-over, chapters | ✓ 88.6 s (cap 3:00); the loop by 0:10; the first minute in one take; burned-in captions; three chapters | — | VIDEO_SCRIPT_V1 §1 |
| V2 | Video words match the copy | ✓ room wording v1, end card "Recorded on Quest 3 and Quest 3S. Hands only, no controllers."; ⏳ V3's "Same garden. Another room. Another song." stands only if TC-DEV-13 passes | Chinmay, 12–13 Nov | VIDEO_SCRIPT_V1 §1; DEVPOST_DRAFT §1.2 |
| V3 | D-072 (test flags save nothing on the live site) | ✓ no effect: the shoot uses the live site with no flags, and day 3 is the Time-lapse switch | — | VIDEO_SCRIPT_V1 ground rules, V4b |
| V4 | The live site serves the freeze build before the shoot | ✗ live is 5c676b6, without the D-071 tint and the T-147b sounds; footage shot on it fails §4 item 2 ("nothing visible has changed since it was shot") | Parth: push `main`, tag v0.5.0 (DECISIONS_PENDING 1, 6 A), before 11 Nov | VIDEO_SCRIPT_V1 §4 |
| V5 | Capture dry run: passthrough and the app's sound in a Quest recording | ⏳ untried on either headset | Chinmay + Parth, 11–12 Nov (DECISIONS_PENDING 9.1) | VIDEO_SCRIPT_V1 §2 |
| V6 | Two rooms through Space Setup, their "Tuned to" lines written down | ⏳ | Chinmay, 12 Nov | VIDEO_SCRIPT_V1 §2 |
| V7 | Sound and look ratings | ⏳ the only ratings on record are "bad" (D-051, before both passes) | Parth, 1–5 each, in the dry run (DECISIONS_PENDING 7.4, 8) | `specs/08-status/DECISIONS_PENDING.md` 7.4, 8 |
| V8 | Footage | ✗ | Chinmay 13 Nov, retakes 14; Parth's 3S as backup | VIDEO_SCRIPT_V1 §2 |
| V9 | Public YouTube upload, chapters, description text, plays logged out, length checked | ⏳ | Parth, 14 Nov | VIDEO_SCRIPT_V1 §4 items 9–10 |
| V10 | End-card URL | ⏳ | Parth (DECISIONS_PENDING 9.2, ★ the Pages address) | VIDEO_SCRIPT_V1 §5 |
| **Gallery** | | | | `evidence/gallery/README.md` (main checkout only) |
| G1 | Six images and an icon in the checklist's order | ✓ six drafts at 1920 × 1080 (per the README; not re-measured) and the icon, made 9 Nov; one caption each, "(emulator)" | — | `evidence/gallery/README.md` |
| G2 | Real captures, no mock-ups | ✗ all six are emulator shots; 03 shows the dev-only hand cue (do not ship it without a headset still) | Chinmay + Parth: stills from the video for 1, 3, 4, 5 on 13–14 Nov, the six picked by 15 Nov (DECISIONS_PENDING 10, ★ A) | `evidence/gallery/README.md`; SUBMISSION_CHECKLIST §2.2 |
| G3 | Icon or thumbnail | ⏳ not wired into the app; the 32 px favicon blurs | Parth, before the freeze (README) | `evidence/gallery/icon/` |
| G4 | A second copy of the gallery | ⏳ git-ignored, so on this Mac only; `npm run gallery` re-makes the drafts, not headset stills | Parth, with the evidence archive, 15 Nov | runbook §1.7 |
| **Build link** | | | | `specs/06-release/FREEZE_AND_SUBMIT_RUNBOOK.md` |
| B1 | Pages serves the freeze build | ✗ live 5c676b6; develop 359799f holds the 9 Nov merges (freeze moved to 9 Nov, option A) | Parth: push `main`, tag v0.5.0, after the full browser run (DECISIONS_PENDING 1, 6) | `specs/08-status/FEATURE_FREEZE_PREP_2026-11-12.md` §6 |
| B2 | Public, HTTPS, no login; enters XR hands-only | ✓ since 8 Nov, entered hands-only on Quest 3 (D, 8 Nov, an older build) | — | PROGRESS Now (T-000) |
| B3 | `version.json` on the served build | ✓ built since T-108 prep; not fetched today (no network) | Claude, both links, 15 Nov | runbook §1.5 |
| B4 | Mirror | ⏳ not live | Parth: an address or "no mirror" (DECISIONS_PENDING 7.1, ★ no mirror) | DEVPOST_DRAFT §1.1 |
| B5 | Opened from a second device or network | ⏳ | Parth, phone on mobile data, 15 Nov | runbook §1.5 |
| B6 | Test pages out of the release build | ✓ T-189; `scripts/check-dist.mjs` fails a build that has them | — | DEVPOST_DRAFT §3.6 |
| B7 | Uptime watch on `main` before the lock | ⏳ the workflow is built | Parth, 15 Nov (T-187) | runbook §1.6 |
| B8 | Tags `v1.0.0-rc1`, `v1.0.0-submission` | ⏳ no tag exists yet | Parth: 15 Nov; 17 Nov 12:00 IST | runbook §1.3, §2 |
| **Evidence archive** | | | | `specs/06-release/evidence/` |
| E1 | The folder itself | ✗ does not exist on develop | Claude, at the code freeze, 15 Nov | runbook §1.7 |
| E2 | `github-pages.zip` and the green deploy screenshot (rc1) | ⏳ (the zip is git-ignored: the offline drive too) | Parth, 15 Nov | runbook §1.7 |
| E3 | Both `version.json` files as served | ⏳ | Claude, 15 Nov | runbook §1.7 |
| E4 | C1 and C5 evidence: UAT-01 recording, 10-minute perf report | ⏳ | Chinmay + qa-engineer, 16 Nov | HACKATHON_RULES §10 |
| E5 | C8 evidence: the Start membership screenshot | ✗ | Chinmay, by 12 Nov | DECISIONS_PENDING 7.3 |
| E6 | Submission row: tag, zip, `specs/` snapshot, video file | ⏳ | Parth + Claude, 17 Nov | runbook §2 step 6 |
| E7 | Devpost confirmation and smoke-test screenshots | ⏳ | Chinmay, 17 Nov | SUBMISSION_CHECKLIST §5 |
| **Go/no-go list (rest)** | | | | SUBMISSION_CHECKLIST §4 |
| N1 | Zero open S1/S2 | ✓ BUG_LOG count 0; BUG-042 to BUG-050 are S2–S4 and fixed (unit and emulator) | qa-engineer keeps it at 0 (T-168) | `specs/05-testing/BUG_LOG.md` |
| N2 | Every P0 UAT scenario on the prod URL from a clean headset | ⏳ | Chinmay + qa-engineer, 16 Nov | `specs/05-testing/UAT_PLAN.md` §3 |
| N3 | A stranger's first five minutes (Best First Five Minutes) | ⏳ none yet | Parth or Chinmay, by 14 Nov (DECISIONS_PENDING 5) | FEATURE_FREEZE_PREP §5.1 |
| N4 | Description read aloud once, both links and the hash in it | ⏳ | Chinmay, 16 Nov | SUBMISSION_CHECKLIST §4 |
| N5 | Every member listed with a role | ✓ drafted; emails are F13 | — | DEVPOST_DRAFT §1.1 |

## Go/no-go blockers, in order

1. **The freeze build is not live (B1, V4).** Parth pushes `main` and tags v0.5.0 (DECISIONS_PENDING 1, 6 A) by 10 Nov: the headset sheet, the video and every number in the copy are measured on it.
2. **C8, the Representative's Start membership, is unproven (E5).** Chinmay's screenshot by 12 Nov; without it the entry is not eligible, whatever else is ready.
3. **No live rule read since 27 Oct, and the form's fields are unknown (F16, F14, F10).** A logged-in browser read and a photo of the form by 12 Nov, so the copy fits the real fields.
4. **No video, so Stage 1 fails (C7, V5–V9).** Dry run 11–12 Nov (if a Quest recording shows a black room, VIDEO_SCRIPT_V1 §3: emulator, tagged), shoot 13 Nov, public upload 14 Nov. The name (F1) and the end-card URL (V10) are settled before the shoot.
5. **The two decide markers (F2, F7, V2).** A stranger's unaided run and TC-DEV-13 by 14 Nov; with neither, the copy says "tested by the team" and drops the "hear your room" claim (tagline B).
6. **The team's own fields (F11, F12, F13).** "What excites us", the launch line (else cut) and both emails, by 14 Nov.
7. **Gallery from real captures (G2).** Headset stills on 13–14 Nov, the six picked by 15 Nov; else the emulator drafts captioned, without 03.
8. **Code freeze, 15 Nov (F6, B3–B8, C5, E1–E3).** The hash into the copy, the mirror decided, `version.json` on every link from a second network, the 10-minute and third-room runs, the evidence folder.
9. **Final check, 16 Nov (C1, C4, C6, C9, F8, N2, N4).** P0 UAT on a clean headset, the brand and English sweep, the numbers re-measured, the copy read aloud.
10. **Submit, 17 Nov (B8, C10, E6, E7).** The submission tag at 12:00 IST, Chinmay submits by 18:00 IST, then the confirmation and smoke test. The checklist's "first" rule (F15) is fixed before then.
