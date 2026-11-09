# Evidence archive — Roomsong (T-192)

**Made:** 2026-11-09 from `develop` 764b6c1 · **Rules:** DEPLOYMENT_GUIDE §8 ("retain a copy of your entry") · **Steps:**
FREEZE_AND_SUBMIT_RUNBOOK §1.7 (code freeze), §2 step 6 (submission) · **Item ids:** SUBMISSION_DRY_RUN_2026-11-09 (C, E, G, V).

Every item the code freeze (15 Nov) and the submission (17 Nov) need, with where it goes, so nothing is hunted for on
the last days. Paths are from the repository root; Parth saves files in the main checkout (`~/Documents/test-pro/Roomsong`)
and Claude commits the text on `develop`.

**What stays off git.** `.gitignore` drops `specs/06-release/evidence/**/*.zip` and `**/*.mp4`, and `evidence/gallery/`
(Parth, 9 Nov). Nothing else here is ignored: a `.mov`, an `artifact.tar` or an unpacked site folder would be committed,
so export the video as `.mp4` and unpack zips in `~/Roomsong-release/<version>/` (runbook §1.4), not here. The repository
is public: a screenshot that shows an email address or an account page is cropped first or kept off the repo
(`~/Roomsong-release/submission/` and the drive).
**The offline drive** is the "one offline copy" of Guide §8: a drive Parth keeps off this Mac. On 15 Nov and again on
17 Nov he copies onto it `specs/06-release/evidence/` (with the zips and the video), `evidence/gallery/`, and the
UAT-01 recording.

Status on 9 Nov: ✓ there · ✗ missing and late or at risk · ⏳ not due yet.

| # | Item | Lives in | Who | When | Git | Today |
|---|---|---|---|---|---|---|
| **Now** | | | | | | |
| 1 | This list and the folder (E1) | `specs/06-release/evidence/README.md` | Claude | 9 Nov | committed | ✓ |
| 2 | Unit and browser results with commits | [`2026-11-09/tests.md`](2026-11-09/tests.md) | Claude | 9 Nov | committed | ✓ |
| 3 | Perf numbers (device 7–8 Nov, emulator 25 Oct) | [`2026-11-09/perf.md`](2026-11-09/perf.md) | Claude | 9 Nov | committed | ✓ |
| 4 | Headset results of 7–8 Nov | [`2026-11-09/headset.md`](2026-11-09/headset.md) → TEST_PLAN §4.6 | Claude | 9 Nov | committed | ✓ |
| 5 | Security check of 9 Nov (BUG-046 to 048) | [`2026-11-09/security-check.md`](2026-11-09/security-check.md) | Claude | 9 Nov | committed | ✓ |
| 6 | Licence list (C3) | `specs/06-release/THIRD_PARTY_LICENSES.md` (65 packages; chunk names 1f6af96) | qa-engineer re-checks on the freeze build | 16 Nov (T-184) | committed | ✓ (re-check ⏳) |
| **Before the freeze** | | | | | | |
| 7 | Headset run sheet, filled | `specs/05-testing/HEADSET_RUN_2026-11-10.md`; Claude moves the results into TEST_PLAN §4.6 | Parth or Chinmay; Claude | 10 Nov (part E 11 Nov) | committed | ⏳ |
| 8 | Start membership screenshot (C8, E5) | the drive and `~/Roomsong-release/submission/` (shows an account); the fact in DECISIONS_PENDING 7.3 | Chinmay | by 12 Nov | off git | ✗ |
| 9 | Video link, public YouTube (C7, V9) | DEVPOST_DRAFT §1.2; RELEASE_NOTES `v1.0.0-submission` "Video" | Parth | 14 Nov | committed (the URL) | ✗ no footage |
| 10 | Gallery, second copy (G4); real captures (G2) | `evidence/gallery/` (repo root, git-ignored, this Mac only) → the drive | Parth | 15 Nov | off git | ⏳ (G2 ✗) |
| **Code freeze, 15 Nov: `specs/06-release/evidence/v1.0.0-rc1/`** (an rc2 gets its own `v1.0.0-rc2/`, runbook §1.8) | | | | | | |
| 11 | The green `ci` commit `<C>`, full hash | PROGRESS.md (runbook §1.1 step 4) | Claude | 15 Nov | committed | ⏳ |
| 12 | Tag `v1.0.0-rc1` | GitHub tags; `git rev-parse 'v1.0.0-rc1^{commit}'` | Parth | 15 Nov | the tag | ⏳ (no tag yet) |
| 13 | Screenshot of the green `deploy` run (E2) | `v1.0.0-rc1/deploy-run.png` | Parth | 15 Nov | committed | ⏳ |
| 14 | `github-pages.zip`, the published site (E2) | `v1.0.0-rc1/github-pages.zip` + the drive | Parth | 15 Nov (the artifact is kept 1 day) | off git | ⏳ |
| 15 | `version.json` as served (E3) | `v1.0.0-rc1/version-pages.json` (and `version-mirror.json` only with a mirror) | Claude, `curl` from the Mac | 15 Nov | committed | ⏳ |
| 16 | Build hash | RELEASE_NOTES `v1.0.0-rc1`; DEVPOST_DRAFT §1.2 marker | Claude | 15 Nov | committed | ⏳ |
| 17 | Same build on every link, from a phone on mobile data (B5) | PROGRESS.md, T-183 (runbook §1.5) | Parth; Claude records | 15 Nov | committed | ⏳ |
| 18 | Tests on `<C>`: unit count and browser suite | `v1.0.0-rc1/tests.md` | Claude | 15 Nov | committed | ⏳ |
| 19 | First green `uptime` run (B7) | Actions → uptime run link in PROGRESS.md, T-187 | Parth; Claude records | 15 Nov | committed (the link) | ⏳ |
| **Go/no-go, 16 Nov** | | | | | | |
| 20 | 10-minute perf on the freeze build (C5, E4): 3S (TC-DEV-07, 12), Quest 3 | `v1.0.0-rc1/perf.md`; any recording to the drive | Parth by 15 Nov; Chinmay 16 Nov; qa-engineer writes it | 15–16 Nov | committed (text) | ⏳ |
| 21 | UAT-01 hands-only recording (C1, E4); UAT-02 clean headset (C6) | results in UAT_PLAN §3; the recording to the drive only | Chinmay + qa-engineer | 16 Nov | text committed, video off git | ⏳ |
| 22 | Brand and English sweep TC-POL-05 (C4, C9) | the sweep result in UAT_PLAN or TEST_PLAN | qa-engineer (its steps are not written yet) | 16 Nov (T-191) | committed | ⏳ |
| 23 | Signed go/no-go | SUBMISSION_CHECKLIST §4 and HACKATHON_RULES §10 ticked | qa-engineer runs, product-owner signs | 16 Nov (T-184) | committed | ⏳ |
| **Submission, 17 Nov: `specs/06-release/evidence/submission/`** (nothing new is built) | | | | | | |
| 24 | Tag `v1.0.0-submission` (B8) | GitHub tags | Parth | by 12:00 IST | the tag | ⏳ |
| 25 | The submitted site: the last rc's zip, copied | `submission/github-pages.zip` + the drive | Parth | 17 Nov | off git | ⏳ |
| 26 | `specs/` snapshot | `submission/specs-v1.0.0-submission.zip` + the drive; made with `git archive -o specs/06-release/evidence/submission/specs-v1.0.0-submission.zip v1.0.0-submission specs` | Claude | 17 Nov, after the tag | off git | ⏳ |
| 27 | Video file, as uploaded | `submission/roomsong-video.mp4` + the drive | Parth (cut 14 Nov) | 17 Nov | off git | ✗ no footage |
| 28 | Devpost confirmation screenshot (C10, E7) | `submission/devpost-confirmation.png` (crop any email) | Chinmay | 17 Nov by 18:00 IST | committed | ⏳ |
| 29 | Smoke-test screenshots, SUBMISSION_CHECKLIST §5 (E7) | `submission/smoke-*.png` (the public Devpost page, both `version.json`, the video signed out) | Chinmay + Claude | 17 Nov evening | committed | ⏳ |
| 30 | The lock, with its time (runbook §3) | DECISIONS_LOG, PROGRESS.md | Parth locks; Claude records | 17 Nov evening | committed | ⏳ |

If v0.5.0 is deployed (DECISIONS_PENDING 6 A), rows 13 to 15 go into `v0.5.0/` the same way.
