# Submission dry run, 10 Nov (7 days to the submit target)

**Owner:** product-owner · **Date:** 2026-11-10 IST · **Checked against:** live `main` 42cb460 (`/version.json` fetched today: 0.5.0, commit 42cb460, built 2026-11-10T02:35:05Z), `develop` 65eecbb · **Method:** the `submission-pack` steps, documents only; `curl` of the live link, `git`, `grep`; nothing run, submitted or sent. **Read:** HACKATHON_RULES §10, §13, §14; DEVPOST_DRAFT v3.2 (ad3dfdb, merged 55cf70a); PROGRESS (header 08:55 IST, Test status, Perf, self-scores); TEST_PLAN §4.6, §4.8; DECISIONS_LOG D-069 to D-081; DECISIONS_PENDING; BUG_LOG; `evidence/README.md`; the 9 Nov dry run.

**Today: no-go, as expected 7 days out.** Compliance gate: pass 2 (C2, C3) · unproven 5 (C1, C4, C5, C6, C9) · fail 2 (C7, C8) · not due 1 (C10). One new operational fault: the old link is dead (below, first in "What changed").

## Compliance gate (HACKATHON_RULES §10) against the live build

| # | Check | Today | Evidence |
|---|---|---|---|
| C1 | Whole flow hands-only on a real Quest 3 | **unproven.** Core loop D on both headsets 7–10 Nov (enter, seeds, plant, pull, move, Listen, settings, re-place, Time-lapse, Exit, save, resume, one-hand). Not on a headset: the live build's seed flow and Seeds page (D-080, TC-DEV-18), the one-grid board (D-081, TC-DEV-19), undo, drag by sight, look-to-select, Day 2. No UAT-01 recording | `specs/05-testing/TEST_PLAN.md` §4.6; `specs/05-testing/UAT_PLAN.md` UAT-01; `specs/06-release/evidence/2026-11-09/headset.md` |
| C2 | First commit on or after 24 Sep | **pass.** 4c831aa, 2026-10-10 | `git log --reverse` |
| C3 | Third-party items licensed and listed | **pass.** No dependency change since the 9 Nov check (`package.json` 359799f..develop: version and description only); the ten seed kinds are synthesized, no recordings ship (D-075). Re-check on the freeze build | `specs/06-release/THIRD_PARTY_LICENSES.md` |
| C4 | No brands, logos or people | **unproven.** TC-POL-05 run 1 (9 Nov) is not a pass: (d) gallery and video need a human look. The 12 names added 10 Nov (ten kinds, "Classic", "Calm"; `src/core/strings.ts` 51–62) are unswept; "Calm" is also a well-known app's name (descriptive label, ★ keep, the sweep records it). The product name's trademark question is open (DECISIONS_PENDING 7.7, Rules §4.17) | `specs/05-testing/TEST_PLAN.md` §4.8; `specs/08-status/DECISIONS_PENDING.md` 7.7 |
| C5 | ≥ 60 fps sustained over 10 min on Quest 3 | **unproven.** About 90 fps (Quest 3S dev 7 Nov, low 88; Quest 3 live 8 Nov; Quest 3 dev 10 Nov, median 90); never 10 minutes, never on 42cb460 with ten voices | `specs/08-status/PROGRESS.md` Perf; TEST_PLAN TC-DEV-07; `specs/06-release/evidence/2026-11-09/perf.md` |
| C6 | Public HTTPS, no login | **unproven (passes by curl).** `https://parthdalvi2001.github.io/SonicSpace/` HTTP 200 with no login, `/version.json` served. Clean-headset UAT-02 open | this file; `specs/06-release/FREEZE_AND_SUBMIT_RUNBOOK.md` §1.5 |
| C7 | Video < 3:00, public, real footage | **fail.** No footage; VIDEO_SCRIPT_V1 updated for the 10 Nov build (9077836); capture with sound untried | `specs/06-release/VIDEO_SCRIPT_V1.md` |
| C8 | Representative a Start member; all 18+ and eligible | **fail.** No screenshot since 10 Oct | `specs/08-status/DECISIONS_PENDING.md` 7.3 (a) |
| C9 | All text in English | **unproven.** 9 Nov sweep: all English. The 10 Nov strings are not swept (coined English compounds; low risk) | TEST_PLAN §4.8 TC-POL-05 (a) |
| C10 | Submitted before 18 Nov 12:00 PT (19 Nov 01:30 IST) | **not due.** Target 17 Nov 18:00 IST, by hand (Rules §3: no automated entry); check "My projects" shows it submitted | HACKATHON_RULES §13; runbook §2 |

## Every number in DEVPOST_DRAFT v3.2, checked

| Claim (copy) | Backing | Verdict |
|---|---|---|
| 495 words of 500 | recounted today by the draft's rule: 495 | ✓ (5 words slack; the newcomers wording +3) |
| Tagline A, 111 characters | recounted: 111 | ✓; "Every room … its own song" waits on TC-DEV-13 (decide marker) |
| "15–18 s after Enter (emulator)" | PROGRESS: G1, 24 Oct, test-speed hands; TEST_PLAN TC-DEV-01: no device first-sound time | **stale:** honestly tagged, but measured before D-074 (level 3 waits 40 s for a pinch) and D-080; not re-timed on 42cb460 |
| "within 90 s; 35 s (Quest 3S) and 62 s (Quest 3)"; "two minutes" | TC-DEV-01: D 7 Nov (recorder, from Enter), D 8 Nov (Chinmay's report) | ✓ (older builds; the 62 s start as he reported it) |
| "about 90 fps on Quest 3 (live site) and Quest 3S (development build)" | PROGRESS Perf; TC-DEV-07 | ✓ as worded (no "sustained") |
| "code under 2 ms a frame" | PROGRESS Perf: the Quest 3S dev build only | **partly backed:** reads as both headsets |
| "the bed about 0.45 m ahead" | `BED_CENTRE_DEFAULT_M` (E); re-place by aim landed 0.57 m ahead on the Quest 3 (TC-DEV-02, 10 Nov), as aimed | ✓ (the default) |
| "5 seconds to undo"; "1.5-second hold … back for 10"; "a week in 30 s"; "2.5 cm … 4 cm hit radius" | design values (API_SPEC, `hands/config.ts`); undo is in "Emulator only"; Time-lapse toggle D 10 Nov (TC-DEV-15) | ✓ (not claimed as timed; the hit radius stays provisional, Golden rule 3) |
| "Ten seed kinds, Classic and Calm" | live on 42cb460 (E); TC-DEV-20: a hum rated under 3 is hidden, nine kinds | **unproven:** waits on Parth's hum rating |
| "Tested … on Quest 3S and Quest 3, one room each" | the claims table: "Parth to confirm"; the 9–10 Nov runs were a Quest 3 on the dev server, room not recorded (TC-DEV-02, BUG-055, BUG-056) | **unproven** |
| Tested list (re-placing, Time-lapse, no-seeds notice, seeds …) and the "Emulator only" list | TEST_PLAN §4.6 rows and its "Still to run" list | ✓ both match |
| "(tried on a Quest 3)" one-hand | TC-DEV-06, D 8 Nov | ✓ |
| "Store launch: early 2027." | D-069 | ✓ |
| Build link `/SonicSpace/`, "/version.json" | curl today: 200, 0.5.0 42cb460 | ✓ (the hash is filled at T-183) |

**Findings, with the smallest fix (the draft is not edited here):**
1. "15–18 s after Enter (emulator)": re-time the first sound on the live build (HEADSET_RUN A1, or the emulator on 42cb460) and swap the number; same word count.
2. "Ten seed kinds": if the hum is hidden, "Nine seed kinds" (0 words).
3. "one room each": Parth confirms the 9–10 Nov headset and room; change the count only if wrong.
4. "code under 2 ms a frame": add "(Quest 3S)" (+1, 496), or record the Quest 3's figure in today's run.
5. "a seed glides in": since D-078/D-080 the seed comes at once (TC-DEV-03); if the video shows no glide, "a seed lands there" (0 words). Low.
6. "Plane detection finds the table": "WebXR plane detection …" (+1), as HACKATHON_RULES §13 asks for the judges' scene-understanding word. Optional.
7. Not copy: the draft's line 3 and the §1.1 Build link "State" still say `/Roomsong/` is live; it is dead (below).

## What changed since 9 Nov

- **The old link is dead.** `https://parthdalvi2001.github.io/Roomsong/` (and its `/version.json`) answers HTTP 404 with no redirect since the repository rename (D-069). Still on it: `specs/05-testing/HEADSET_RUN_2026-11-10.md` lines 18, 28, 97, 122, 147, 162 (**today's sheet**), `FEATURE_FREEZE_PREP_2026-11-12.md` §6 step 5, `DEVICE_SCRIPT_S1.md` 182, ADR-004, HLD 99. Smallest fix: `/Roomsong/` → `/SonicSpace/` in those lines (driving session). Rule lesson: the app must stay up until the winners (11 Dec 23:30 IST, §13); a rename or a private repository after submitting breaks the submitted link the same way.
- **Live moved twice:** b9109fe (v0.5.0, 9 Nov 16:01 IST), then 42cb460 (about 08:00 IST 10 Nov): ten seed kinds (T-193, D-076/D-077, the freeze reopened for it), the seed catch (D-078, BUG-055), the no-seeds notice (BUG-056), re-place by aim (D-079), the seed at once (D-080), the one-grid board (D-081). Closed: B1, V4, F4.
- **develop 65eecbb is ahead of live** with visible changes: T-164 mix, BUG-057 to 059 (the Seeds button dims with an empty supply; high-contrast outlines on segments, which the hands field's "high contrast" leans on). They go live before the 11–12 Nov capture, or the footage is of a build that changes after it.
- **Device, 10 Nov (Quest 3, dev server):** seed catch, no-seeds notice, re-place, Time-lapse, 90 fps median (TEST_PLAN §4.6).
- **Rules (§13, Parth's screenshots):** no change since 27 Oct; the award wording recorded; closes 19 Nov 01:30 IST; submit by hand. **Track (§14):** Entertainment stays; v3.2 shows plant-then-listen. Closed: F16 (the form's fields are still unknown, F14).
- **Copy v3.2:** 495 words; the originality sentence "We found no app where the room sets the key." and the checklist quotes it (62ddc60): F15 closed. Launch line agreed: F12 closed.
- **Evidence folder exists** (T-192, 1172c6b): E1 closed.
- **Mirror:** the first-choice Netlify name is taken; ★ `sonicspace-garden` (DECISIONS_PENDING 7.1). **Name:** a recording studio with nearly the same name exists (DECISIONS_PENDING 7.7).
- **Self-score, strict:** 6 / 6 / 6 / 4 = 22, as on 9 Nov. The driver's Experience 7 rests on emulator-only work; it is earned when TC-DEV-18 and 19 pass on a headset and a new person plays unaided.

## Go/no-go today: NO-GO

Blockers in order: (1) C8, the Representative's membership, unproven: without it nothing else counts; (2) C7, no video, so Stage 1 fails; (3) F14, the form's fields unseen; (4) C1 and C5 evidence on the final build (UAT-01 recording, 10-minute run); (5) the team's own fields: "What excites us about VR" and both emails (F11, F13); (6) the two decide markers and the hum rating, which settle the tagline and three copy words.

## Human actions left, in deadline order

| # | Date | Owner | Action |
|---|---|---|---|
| 1 | 10 Nov | Parth | HEADSET_RUN part F on the live link, typing `/SonicSpace/` (the sheet's `/Roomsong/` is dead): TC-DEV-18 seed and Seeds page, TC-DEV-19 board (1–5, lower edge clears the table), TC-DEV-20 hum (1–5), DECISIONS_PENDING 8.1, 8.2 and 7.4 ratings; time the first sound from Enter |
| 2 | 10 Nov | Parth | Say which headset and room the 9–10 Nov runs used ("one room each") |
| 3 | 11 Nov, before the capture | Parth | Go to push develop to `main` after the full browser run (T-164 mix, BUG-057 to 059 visible) |
| 4 | 11 Nov | Parth | Day 2: the Garden tab says Day 2 (2 minutes) |
| 5 | 11–12 Nov | Chinmay + Parth | Capture dry run: passthrough and the app's sound at 1080p (DECISIONS_PENDING 9.1) |
| 6 | 12 Nov | Chinmay | Start membership screenshot (C8, DECISIONS_PENDING 7.3 (a)) |
| 7 | 12 Nov | Chinmay | Photo of the Devpost form's fields; prize papers if asked (7.3 (b), (c); T-115) |
| 8 | 12 Nov | Parth | The name: keep SonicSpace after a quick search, or rename before the shoot (7.7, ★ keep); a rename moves the link again |
| 9 | 12 Nov | Parth | Mirror address (★ `sonicspace-garden`) or "no mirror" (7.1) |
| 10 | 12 Nov | Parth or Chinmay | A new person's unaided first five minutes (DECISIONS_PENDING 5) |
| 11 | 12 Nov | Chinmay | Two rooms through Space Setup, their "Tuned to" lines written, compared by ear (V6, TC-DEV-13) |
| 12 | 13 Nov | Chinmay | Shoot (VIDEO_SCRIPT_V1); Parth's 3S as backup |
| 13 | 14 Nov | Chinmay | Retakes |
| 14 | 14 Nov | Parth | End-card URL (9.2, ★ Pages), cut, public YouTube upload with chapters, plays logged out, under 3:00 |
| 15 | 14 Nov | Parth + Chinmay | "What excites us about VR" in their own words (7.6); both emails (T-185); settle the two decide markers |
| 16 | 14 Nov | Chinmay + Parth | Headset stills for gallery shots 1, 3, 4, 5 (DECISIONS_PENDING 10 A) |
| 17 | 15 Nov | Parth | Code freeze: pick the six images; push `main`, tag `v1.0.0-rc1`, uptime watch (T-187), `github-pages.zip` and deploy screenshot, the gallery's second copy; open both links on a phone over mobile data |
| 18 | 15 Nov | Parth | 10-minute run (TC-DEV-07) and cold start (TC-DEV-12) on the 3S in a third room |
| 19 | 16 Nov | Chinmay | Final check on his Quest 3, clean headset, prod URL: UAT-01 recorded (C1), UAT-02 (C6), 10 minutes ≥ 60 fps (C5), P0 scenarios, video and gallery look (C4 (d)), the description read aloud |
| 20 | 17 Nov 12:00 IST | Parth | Tag `v1.0.0-submission`; the submission row with Claude (E6) |
| 21 | 17 Nov 18:00 IST | Chinmay | Fill and submit the form by hand; confirm "My projects" shows it submitted; screenshots (C10, E7) |
