# Release Notes — SonicSpace

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

## v1.0.0-rc1 (code freeze, 12–13 Nov 2026; D-082)
- Build hash: the commit tagged `v1.0.0-rc1` (`git rev-parse 'v1.0.0-rc1^{commit}'`); `package.json` 1.0.0, kept for every rc and the submission (`version.json` `commit` tells builds apart).
- Highlights since v0.5.0: the seed comes at once to an open palm and the Seeds page is a place to go (D-080); the settings board on one grid, "Classic" and "Calm" libraries (D-081); the guide with "Skip tutorial", also on the landing page (D-084, D-085); every setting explains itself, the guide's glow breathes (D-086); **the strict guide** (D-090): palm, plant, grow, move, remove, undo the petal, Listen and back, the settings orb, the Seeds and Move tips, each step taking only its own gesture, with dotted neon arrows, rings and icons (D-089), Skip always there.
- Tested: unit 2,091; the full browser run 129 + 8 rerun alone (load time-outs), 6 skipped; build checks pass. Headset: D-080 to D-086 seen on a Quest 3S (10 Nov); the strict guide (D-090) by Parth on the headset, 12 Nov.
- Known issues: BUG-060 (a flaky e2e scene, not the app). The room signature needs Space Setup (else "No room scan"). One-hand and look-to-select modes show the guide's captions without the orb arrow (Parth: not to fix).

## v0.5.0 (feature freeze, 9 Nov 2026; moved forward from 12 Nov on Parth's word)
- Build hash: the commit tagged `v0.5.0` (`git rev-parse 'v0.5.0^{commit}'`); it is the commit that sets `package.json` to 0.5.0. Deployed: option A, the freeze build goes live (DECISIONS_PENDING 6, Parth 9 Nov). Checks at freeze: `npm run verify` 1 986 unit tests green; the full browser suite 132 passed, 1 timing flake (BUG-052, passes 3 of 3 alone), 6 skipped.
- Highlights: every Must built, the core of each seen on a headset; the room signature (S1) stays in. Headsets: a Quest 3S (7 Nov, dev server with the recorder) and a Quest 3 (8 Nov, the live site at 4bc6c7c), TEST_PLAN §4.6.

**In the build**
- Play: either hand takes the seed, also off its own palm, and a resting seed crosses to the other palm (D-062). A plant is pinched at its head, and a pull's full range is 11 cm (D-063). A look past the fingers and a pinch takes a panel control, a plant or the undo petal (D-066, BUG-032, BUG-033); a pinch begun on a control presses it wherever it ends, New garden excepted (D-064). Exit on the Garden tab, one press (D-067). The guide waits on the palm and plant steps (D-061). The Garden tab's day counts calendar days (BUG-037).
- Sound: while shaping, a tick on a plant pinch, the plant's own note while pulled, a bump when it is let go in the hole or where it cannot land (T-147b, API v1.2.62).
- Room: "No room scan: run Space Setup", once a session, when the room read finds no plane (D-068). The plants' colour turn follows room size, small rooms warmer, big rooms cooler; the ceiling caption names the mood (D-071).
- Access: `?access=gaze,onehand,contrast,reduce` links, saved like a ticked box, turned off in the Access tab (D-070); the start page's switches in a closed section, so a stray tap cannot turn look to select on (D-065).
- Fixes: from the headset runs BUG-021 to BUG-030 (tracking drops, the tutorial's stall net, the palm pick, the plant's target and pull range, the orb and panel presses, the start page's switches); BUG-031 (laptop drag); BUG-036 (a per-frame allocation); BUG-040 (the anchor re-read after a resume); BUG-042 (a panel control beats the palm seed); BUG-043 (laptop mode's eye). The test pages are out of the release build (T-189).

**Tested**
- Seen on a headset: entry with hand tracking; the room read and tuned after Space Setup; the palm-up seed by either hand; three seeds planted 35 s after Enter (3S) and by 62 s (3); 12 pulls and 6 moves with no hand lost; Listen (palms out) and wake; the settings orb and panel by look and pinch; Exit and re-entry; save after a reload; pause and resume; the daily seed (3); one-hand mode (3); about 90 fps on both (3S: 11 draws, about 5k triangles, JS under 2 ms).
- Emulator and unit only: "No room scan"; the `?access=` links; the closed switches (BUG-028); the calendar-day count; the D-071 colours and captions; the shaping sounds (not listened to yet); removal and the undo petal; plants and petals by look (BUG-030, BUG-032, BUG-033); a pinch at a control with a seed on the palm (BUG-042); a whole look-to-select game; the guide from a brand-new garden; in XR in 5 s or less on the built page; the first sound timed; first-try pinch rates (TC-DEV-00); two rooms by ear.

**Known issues**
- BUG-052 (S3, open, watch): a shaky-hands e2e scene timed out once under slow frames and passes alone. Tests only.
- Fixed on 9 Nov in unit and emulator, pending device: BUG-043 to BUG-051 (the window's eye and head click, the no-room notice's reads, test flags that do not save on the live site, the tab channel, the dev recorder endpoint, the window drag after a sight pick, no shaping sounds on the Listen wake, the preview's allocation).
- BUG-035, BUG-039 (S3, open, watch): two e2e tests time out on a very busy machine and pass alone. Tests only.
- BUG-040 (S3, fixed in unit and emulator, pending device): after the headset came off and on, the log repeated an anchor warning; the bed stayed where it was.
- BUG-042 (S3, fixed in unit and emulator, pending device): with a seed on the palm, a look-and-pinch at a panel control took the seed.
- With no table in the room scan, the bed's height varied per try on the 3S (0.69, 0.73, 0.81 m).

**What's next** (not in the build; FEATURE_FREEZE_PREP_2026-11-12 §3)
- A sixth voice.
- Shared gardens: a friend's garden in your room's key.
- The store-launch line is not agreed (DECISIONS_PENDING 7.6): added only if Parth and Chinmay agree it.

## v0.5.0, 10 Nov live build (`main` 42cb460; not tagged)
- Build hash: `42cb46005dd140b6557d1d4c8a1ee5b155d5044a`; `version.json` says version 0.5.0, built 2026-11-10T02:35:05Z. Pushed by Parth about 08:00 IST; `deploy` run 42743410491 green. Live at `https://parthdalvi2001.github.io/SonicSpace/` (the repository renamed, D-069; `/Roomsong/` answers 404). Checks: unit 2 068 green; the full browser suite 136 of 136 at ab391b1 (42cb460 adds documents only).
- Highlights over 00d0d52 (BUG-055, BUG-056): the garden placed again by aim, ten seed kinds in two libraries, the seed at a palm-up at once, the settings board on one grid.

**In the build**
- Room: "Place the garden again" starts at the aim: the ghost ring shows where the bed lands, a pinch on nothing places it there, after 40 s it lands where it shows; with no hit-test the whole chain runs as before (T-194, D-079).
- Seeds: ten kinds in two libraries, Classic and Calm, each with its own head shape; the tenth voice, the hum, a tanpura-like string for Calm's bass plant (T-193, D-076, D-081).
- Play: every palm-up gives the next seed at once; a seed you do not want, thrown off the bed, goes back to the supply. Picking a kind is optional, on the Seeds page, from the orb or the Garden tab's Seeds button (D-080).
- Board: every setting a label on the left and its control on the right; pills for switches, segmented tracks for steppers and choices, the chosen tab filled; 0.48 x 0.335 m (D-081, API v1.2.76).

**Tested**
- Seen on a headset (Quest 3, 10 Nov, Parth, dev server with the recorder; TEST_PLAN §4.6): "Place the garden again" by aim (TC-DEV-15); the "No seeds left. More tomorrow." notice on a palm-up with an empty supply (BUG-056); the palm seed picked at once, 4 seeds in 10 s, none flew back (BUG-055, TC-DEV-03). The live 42cb460 itself has not been opened on a headset yet (HEADSET_RUN_2026-11-10 part F).
- Emulator and unit only: the seed at once and the Seeds page (D-080, TC-DEV-18); the one-grid board (D-081, TC-DEV-19); the ten kinds and the hum, not listened to on a headset (TC-DEV-20).

**Known issues**
- The re-place button is hard to find: Parth looked twice before finding the small "start" on its row (TC-DEV-15).
- BUG-055 (S2, fixed pending device): a full bed over the hole reports `offBed`, not `full`; its beta and angle need a headset rating.
- BUG-035, BUG-039, BUG-052 (S3, watch): e2e timeouts on a very busy machine. Tests only.

**Next push** (develop 9077836, not live)
- Sound: T-164, the style B mix within ±1.5 dB of the table (the pluck left for Parth's ear); no press tick in Listen.
- Fixes from the T-168 review: picking the kind the palm seed already has leaves it on the palm (BUG-057); the Seeds button dims with an empty supply (BUG-058); segments and stepper buttons outlined in high contrast (BUG-059).
- Documents: Devpost copy v3.2 (T-180), UAT plan v1.4 with TC-DEV-18 to 20 (T-184), the V1 video script.

## v1.0.0-rc1 — Code freeze (2026-11-15)
## v1.0.0-submission — Submitted build (2026-11-17)
- Build hash: _tbd_ · Prod URL: _tbd_ · Video: _tbd_ · Device-tested: _yes/no (state honestly)_
