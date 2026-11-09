# Release Notes — Roomsong

**Status:** Living · **Owner:** devops-engineer (format) / product-owner (content)
Format per version: Version · Date · Build hash · Highlights · Changes (feat/fix/perf) · Known issues · Device/browser tested (or "emulator only").
Versions follow SPRINT_PLAN v2.1 phases. Up to v0.4.0 every entry is **"emulator only"**; from v0.5.0 (headsets since 7 Nov) each entry says what was seen on a headset and what was not.

---

## v0.0.1 — Phase 0 proof (target 2026-10-17, G0; D-023)
- Highlights: scaffold + `verify` green; desktop sound prototype (3 voices) with listening ratings; emulator pipeline; device-spike and pinch-test pages built (device runs pending).
- Tested: emulator only. Known issues: _tbd_

## v0.1.0 — One path (target 2026-10-24, G1; D-023)
- Highlights: place bed (L1/L2/L4) → palm-up seed → pinch-plant → tide plays 3 voices → save/restore.
- Tested: emulator only unless a headset arrives (H1). Known issues: _tbd_

## v0.3.0 — Differentiator & payoff (target 2026-11-03, G2; D-023)
- Highlights: room signature + tuning ripple (if gated in), 5 voices + equal-power spatial audio + one room-length reverb, shaping (pull/drag/drag-off + undo), Listen mode (halo), onboarding, L3 hit-test.

## v0.4.0 — Polish (target ~2026-11-08)
- Highlights: accessibility set, daily seed + growth, art + sound pass, perf pass, room matrix.

## v0.5.0 (feature freeze, 12 Nov 2026) — draft
- Build hash: `<F>` (the freeze commit, filled on 12 Nov; FEATURE_FREEZE_PREP_2026-11-12 §6). Drafted 9 Nov from `develop` f1c4d52. Deploy or label only: A or B, DECISIONS_PENDING 6.
- Highlights: every Must built, the core of each seen on a headset; the room signature (S1) stays in. Headsets: a Quest 3S (7 Nov, dev server with the recorder) and a Quest 3 (8 Nov, the live site at 4bc6c7c), TEST_PLAN §4.6.

**In the build**
- Play: either hand takes the seed, also off its own palm, and a resting seed crosses to the other palm (D-062). A plant is pinched at its head, and a pull's full range is 11 cm (D-063). A look past the fingers and a pinch takes a panel control, a plant or the undo petal (D-066, BUG-032, BUG-033); a pinch begun on a control presses it wherever it ends, New garden excepted (D-064). Exit on the Garden tab, one press (D-067). The guide waits on the palm and plant steps (D-061). The Garden tab's day counts calendar days (BUG-037).
- Sound: while shaping, a tick on a plant pinch, the plant's own note while pulled, a bump when it is let go in the hole or where it cannot land (T-147b, API v1.2.62).
- Room: "No room scan: run Space Setup", once a session, when the room read finds no plane (D-068). The plants' colour turn follows room size, small rooms warmer, big rooms cooler; the ceiling caption names the mood (D-071).
- Access: `?access=gaze,onehand,contrast,reduce` links, saved like a ticked box, turned off in the Access tab (D-070); the start page's switches in a closed section, so a stray tap cannot turn look to select on (D-065).
- Fixes: from the headset runs BUG-021 to BUG-030 (tracking drops, the tutorial's stall net, the palm pick, the plant's target and pull range, the orb and panel presses, the start page's switches); BUG-031 (laptop drag); BUG-036 (a per-frame allocation); BUG-040 (the anchor re-read after a resume); BUG-042 (a panel control beats the palm seed); BUG-043 (laptop mode's eye). The test pages are out of the release build (T-189).

**Tested**
- Seen on a headset: entry with hand tracking; the room read and tuned after Space Setup; the palm-up seed by either hand; three seeds planted in 38 s (3S) and by 62 s (3); 12 pulls and 6 moves with no hand lost; Listen (palms out) and wake; the settings orb and panel by look and pinch; Exit and re-entry; save after a reload; pause and resume; the daily seed (3); one-hand mode (3); about 90 fps on both (3S: 11 draws, about 5k triangles, JS under 2 ms).
- Emulator and unit only: "No room scan"; the `?access=` links; the closed switches (BUG-028); the calendar-day count; the D-071 colours and captions; the shaping sounds (not listened to yet); removal and the undo petal; plants and petals by look (BUG-030, BUG-032, BUG-033); a pinch at a control with a seed on the palm (BUG-042); a whole look-to-select game; the guide from a brand-new garden; in XR in 5 s or less on the built page; the first sound timed; first-try pinch rates (TC-DEV-00); two rooms by ear.

**Known issues**
- BUG-035, BUG-039 (S3, open, watch): two e2e tests time out on a very busy machine and pass alone. Tests only.
- BUG-040 (S3, fixed in unit and emulator, pending device): after the headset came off and on, the log repeated an anchor warning; the bed stayed where it was.
- BUG-042 (S3, fixed in unit and emulator, pending device): with a seed on the palm, a look-and-pinch at a panel control took the seed.
- With no table in the room scan, the bed's height varied per try on the 3S (0.69, 0.73, 0.81 m).

**What's next** (not in the build; FEATURE_FREEZE_PREP_2026-11-12 §3)
- A sixth voice.
- Shared gardens: a friend's garden in your room's key.
- The store-launch line is not agreed (DECISIONS_PENDING 7.6): added only if Parth and Chinmay agree it.

## v1.0.0-rc1 — Code freeze (2026-11-15)
## v1.0.0-submission — Submitted build (2026-11-17)
- Build hash: _tbd_ · Prod URL: _tbd_ · Video: _tbd_ · Device-tested: _yes/no (state honestly)_
