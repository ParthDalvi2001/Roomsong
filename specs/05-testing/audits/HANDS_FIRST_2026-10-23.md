# Hands-first audit — what landed on 23 Oct 2026

**Status:** the three fails (F1, F2, F3) are fixed in commit 43bb73c (fullstack-dev's worktree, 23 Oct); the gaps stand.

Checklist: `.claude/skills/hands-first-audit/SKILL.md` (14 checks). Against `develop` at dcd5eba (the evidence lines are of
that tree). Read-only on code; no browser run. Auditor: fullstack-dev.
Result key: ✅ pass · ❌ fail · n.a. not applicable (said why). Evidence is `file:line` on this tree or a test name.

Items: A stillness opening · B Time-lapse switch · C undo petal's hover cue · D "Pinch to resume sound" · E new captions and the
settings-orb hint · F level-1 band (BUG-010) · G laptop-mode (garden window) paths of each.

## A. Stillness opens the garden (P-016; StillnessSystem, HaloRenderer.setOpen, AudioEngine.setStillness)

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Hands only, whole path | ✅ no gesture is needed; it ends on a pinch or select of either hand | src/access/StillnessSystem.ts:71, :108; tests/unit/access/StillnessSystem.test.ts:129 |
| 2 | One hand | ✅ gesture-free | same |
| 3 | Gaze only, zero pinches | ✅ by design; the gazed plant by the gaze line | StillnessSystem.ts:95-105 (gazeTarget); test :151 |
| 4 | Hit radius ≥ 4 cm, nearest wins | ✅ the gazed plant through `gazeTarget` with HIT_RADIUS_M and the hover dead band | src/ui/Panel.ts gazeTarget (:515-531) |
| 5 | Pinch hysteresis / 1€ | n.a. no new gesture; `HandState.pinch` is hands/' own | hands/ unchanged |
| 6 | Seated reach | n.a. no target of its own; the bed's reach is the solver's (F) | — |
| 7 | FoV ±25°/±20° | ✅ opens only with the bed centre inside the box (`clampToFov` as a point) | StillnessSystem.ts:89-91; test :129 |
| 8 | Tracking loss | ✅ a lost hand's pinch/select clear, so the count goes on; a turn or the bed leaving closes it; nothing sticks | src/hands/HandSystem.ts:232; StillnessSystem.test.ts:129 |
| 9 | Feedback visible and audible | ✅ halo lift (visible), reverb send ×1.25 and the gazed plant +2 dB (audible); sound off leaves the halo | tests/unit/render/HaloRenderer.test.ts:130; tests/unit/audio/stillness.test.ts |
| 10 | Icon + ≤ 6-word caption, once | n.a. no instruction by design (a quiet reward); note: not discoverable, the manual says it (1f1b069) | — |
| 11 | Flash ≤ 3/s, reduced motion | ✅ one 2 s swing each way through the guard; reduced motion keeps the level change and drops the rise | HaloRenderer.test.ts:130; src/render/HaloRenderer.ts update (y scale 1 when reduced) |
| 12 | Thresholds in config with IDs; strings in strings.ts | ✅ STILL_OPEN_MS (access/config.ts, P-016/UX §9.8), STILL_HALO/STILL_RAMP_MS (render/config.ts), STILL_SEND_MUL/STILL_RAMP_TAU_S/STILL_GAZE_DB (audio/config.ts); no text | — (not hands/config.ts: a dwell-like constant beside access/' others) |
| 13 | Unit + e2e | ✅ 5 + 1 + 3 unit; e2e tests/e2e/28-stillness.spec.ts | — |
| 14 | Device step listed | ✅ S2 block "stillness" (1f1b069): hold still 8 s; whether a seated head holds under 8°/s | — |
| G | Laptop mode | n.a. by design: in a session only (the window's camera never moves) | StillnessSystem.ts:71 `isPresenting` |

**Verdict A: PASS pending device.**

## B. The Time-lapse switch (T-174; Panel.ts, GardenSystem.setTimeLapse, flag `timeLapse`)

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Hands only | ✅ a panel toggle, pinched like the others | src/ui/Panel.ts:448, :521; tests/unit/ui/Panel.test.ts:412-415; tests/e2e/12-settings.spec.ts:327 |
| 2 | One hand | ✅ in one-hand mode the orb waits in the view box, not on a hand; the panel is pinched by either hand | src/ui/PanelSystem.ts:457-470 |
| 3 | Gaze only | ✅ the panel's own dwell selects every control once | Panel.test.ts:539; 12-settings.spec.ts:565 |
| 4 | Hit radius | ✅ every control HIT_RADIUS_M on a 5.5 cm pitch, nearest wins | PanelSystem.ts:449; Panel.test.ts:889 |
| 5 | Hysteresis / 1€ | n.a. hands/ unchanged | — |
| 6 | Seated reach | ✅ panel at 0.55 m, orb home at 0.45 m | src/ui/config.ts:49 PANEL_DISTANCE_M, :135 ORB_DISTANCE_M |
| 7 | FoV | ✅ panel centre clamped into the box, closes after 5 s outside it; orb home clamped | PanelSystem.ts:315, :470; Panel.test.ts:169 |
| 8 | Tracking loss | ✅ the orb hides when its hand has no HandState; the demo is garden state, not a gesture; days pause while hidden | tests/unit/ui/PanelSystem.test.ts:588; src/garden/GardenSystem.ts:157 |
| 9 | Feedback | ✅ visible: the knob and "on", a stage every 4 s. Audible: none on the switch (the `confirm` sound exists, no caller) — visible-only works, so not a fail | src/audio/uiSounds.ts:25; grep `ui('confirm')` → no caller |
| 10 | Instruction | ✅ a one-word label "Time-lapse" on the row; "(demo)" dropped for width, the manual and Devpost say it | src/ui/strings.ts:108 |
| 11 | Flash | ✅ growth is geometry (stage), not luminance; 0.25 Hz; a select flips the knob once, the dwell selects once. (Pre-existing, all toggles: the panel has no FlashGuard, a pinch mash could flip a knob > 3/s) | Panel.test.ts:539 |
| 12 | Thresholds / strings | ✅ TIME_LAPSE_DAY_MS garden/config.ts:119; label in ui/strings.ts | — |
| 13 | Tests | ✅ unit GardenSystem.test.ts:1114, :1188; Panel.test.ts:412. ❌ gap: no e2e "stages advance with the switch on" (the T-174 row asked one) | grep timeLapse tests/e2e → none |
| 14 | Device step | ✅ S2 block "time-lapse" (1f1b069); the label's width at panel size is a device look | — |
| G | Laptop mode | ✅ by the URL flag `?flags=timeLapse` (the window has no settings orb, UX §3.7; the landing's limits line says so) | GardenSystem.ts:185; PanelSystem.ts:456; tests/e2e/20-window.spec.ts:13 |

**Verdict B: PASS pending device** (gap: the e2e for the stages; no sound on the switch).

## C. The undo petal's hover cue (FR-HND-16; PetalRenderer.setHover, RenderSystems target:hover)

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Hands only | ✅ a hand's hover lights it; a press undoes | src/render/RenderSystems.ts:308-311; tests/unit/garden/GardenSystem.test.ts:807, :821 |
| 2 | One hand | ✅ one slot per hand, either hand; two hands on one petal are one glow | src/render/PetalRenderer.ts:143-147, :268 |
| 3 | Gaze only | ✅ the dwell hovers (`target:hover`) and selects `undo` with a press release | src/access/GazeDwell.ts:206-209 (aim), :263-277 (setHover); 25-gaze covers the dwell's selects |
| 4 | Hit radius | ✅ HIT_RADIUS_M; 3 cm above its own cell; never two on one spot | RenderSystems.ts:436; tests/unit/render/PetalRenderer.test.ts:130, :242 |
| 5 | Hysteresis / 1€ | n.a. hands/ unchanged | — |
| 6 | Seated reach | ✅ on the bed (cell + 3 cm) | PetalRenderer.test.ts:130 |
| 7 | FoV | n.a. on the bed, not essential UI | — |
| 8 | Tracking loss | ✅ a lost hand's HandState goes untracked, its hover ends and the glow eases out; hide takes the hover with it | HandSystem.ts:232; PetalRenderer.test.ts:473, :513 |
| 9 | Feedback | ✅ visible: +20 % over 100 ms. Audible: hover cues are silent by convention (as the seed's); the undo's `undoFwd` sound exists with no caller (pre-existing) | render/config.ts:51, :102; uiSounds.ts:25 |
| 10 | Instruction | ✅ "Pinch the petal to undo" (5 words) once a session on the first removal; ❌ no gaze or window twin (see F2) | src/onboarding/OnboardingSystem.ts:92; tests/unit/onboarding/OnboardingSystem.test.ts:287 |
| 11 | Flash | ✅ through the guard: one swing in, one out; a petal has one luminance change in its life; reduced motion fades it in | PetalRenderer.test.ts:473, :193; PetalRenderer.ts:334-349 |
| 12 | Thresholds / strings | ✅ HOVER_CUE_MS, PLANT_HOVER_LIFT in render/config.ts; the hint in core/strings.ts | — |
| 13 | Tests | ✅ PetalRenderer.test.ts:473, :513; heap :23; e2e 15-shaping:378 (its draws), 99-polish-shots (look, POLISH_SHOTS=1) | — |
| 14 | Device step | ✅ S2 block "petal glow" (1f1b069) | — |
| G | Laptop mode | ✅ the pointer's hover is a hand's: the picker runs on the pointer's HandState; a carried seed steps aside for `undo` | src/window/PointerSource.ts:15 |

**Verdict C: PASS pending device**, with F2 (wording of the hint in gaze mode and the window).

## D. "Pinch to resume sound" after a pause (T-152; src/app.ts followSession)

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Hands only | ✅ the first `gesture:pinchStart` or `gesture:palmUp` of either hand resumes and takes the caption back | src/app.ts:340-346, :393-399; tests/unit/app.test.ts:437 |
| 2 | One hand | ✅ either hand | same |
| 3 | Gaze only | ❌ a gaze select of the orb or a petal emits `gesture:release` (press), not pinchStart; only a look at a free cell with seeds (palmUp) resumes; and the caption asks a gaze user to pinch. Platform limit underneath: with no hand there is no user activation at all (F3) | src/access/GazeDwell.ts:235-262 select; app.ts:397-398 |
| 4-6 | Radius / hysteresis / reach | n.a. no target; the caption is the only UI | — |
| 7 | FoV | ✅ captions clamp into the box, 8° below the gaze | src/ui/Captions.ts:209; tests/unit/ui/Captions.test.ts:194 |
| 8 | Tracking loss / stuck | ✅ the arm disarms itself and on `xr:sessionEnd`; a rejected resume is logged | app.ts:341-346, :410-414; app.test.ts "the session ending disarms…" |
| 9 | Feedback | ✅ the sound returns; the caption goes with the gesture | app.test.ts:437 first `it` |
| 10 | Instruction | ✅ 4 words, ≥ CAPTION_MIN_MS through the queue, once per return after the 3 s grace; ❌ no window twin (a click is the pinch there, F3) | core/strings.ts `soundResume`; Captions.test.ts:36; app.ts:62 |
| 11 | Flash on return | ✅ the halo and the ripple take a 30 s gap as one guarded change | HaloRenderer.test.ts:152; src/render/TuningRipple.ts:192-214 |
| 12 | Thresholds / strings | ✅ AUDIO_START_GRACE_MS in app.ts (LLD §3.3 B); the string in core/strings.ts | — |
| 13 | Tests | ✅ app.test.ts:437 (3); engine.test.ts "T-152: the bar phase…"; 14-boot a4 hide/show. No e2e of the pinch resume (a stubbed context) | — |
| 14 | Device step | ✅ S2 block "pause" (1f1b069): doff 10 s, don; which visibility state the Quest reports; whether the context ever stays suspended | — |
| G | Laptop mode | ✅ the page's `visibilitychange` becomes `xr:visibility`; a click's pinchStart resumes; ❌ the wording "Pinch" (F3) | src/window/WindowStage.ts:139-141; PointerSource.ts:80 |

**Verdict D: PASS pending device**, with F3.

## E. New captions and the settings-orb hint (1a6d5bf, 521c997; core/strings.ts, OnboardingSystem)

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Hands only | ✅ captions only; the steps they name are hands-only (23-onboarding) | OnboardingSystem.ts:13-16 |
| 2 | One hand | ❌ "Turn a hand over for settings" is wrong in one-hand mode: the orb waits in the view box, not on a hand; `sayDone` checks only the window and hints (F1) | OnboardingSystem.ts:150-152 vs PanelSystem.ts:457-470 |
| 3 | Gaze only | ❌ the same hint is wrong in gaze mode (the orb is in view, no hand needed); "Pinch the petal to undo" is wrong too (a dwell undoes) (F1, F2). The step captions have gaze twins ✅ | OnboardingSystem.ts:140 (onboardPlantGaze); :92 undoHint no twin |
| 4-6 | Radius / hysteresis / reach | n.a. text | — |
| 7 | FoV | ✅ 8° below the gaze in a session, lower in the window, both inside the box | Captions.test.ts:194 |
| 8-9 | Loss / feedback | n.a. | — |
| 10 | ≤ 6 words, once, ≥ CAPTION_MIN_MS | ✅ every string ≤ 6 words; one at a time with the minimum; each notice once a session, never in Listen | Captions.test.ts:205, :36, :55, :100; OnboardingSystem.ts:155-160; tests :287, :305 |
| 11 | Flash | ✅ the caption quad fades (pre-existing) | — |
| 12 | Strings in strings.ts | ✅ core/strings.ts; ONBOARD_CAPTION_MS in onboarding/config.ts | — |
| 13 | Tests | ✅ OnboardingSystem.test.ts:128 (gaze), :193 (window), :287, :305; strings.test.ts | — |
| 14 | Device step | ✅ legibility is in S1 already; nothing new | — |
| G | Laptop mode | ✅ Click twins for the steps; the settings hint is skipped in the window (no orb); the undo hint says "Pinch" where the landing says a click is a pinch (F2, consistency) | OnboardingSystem.ts:15-16, :151; 20-window.spec.ts:13 |

**Verdict E: FAIL (F1, F2)** — two wording cases, small fixes.

## F. The level-1 height band (BUG-010; PlacementSolver.spotOn)

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Hands only | ✅ levels 1-2 place by themselves; level 3 by a pinch; level 4 by the wait | src/room/PlacementSolver.ts:143-146; tests/e2e/06-room.spec.ts c2; 29-room-matrix |
| 2 | One hand | ✅ either hand's pinch confirms the ghost | 06-room c2 (a real pinch of one hand) |
| 3 | Gaze only | ✅ the dwell confirms the ghost (never floats it) | src/access/GazeDwell.ts:200-204; 25-gaze.spec.ts:161 |
| 4-5 | Radius / hysteresis | n.a. | — |
| 6 | Seated reach | ✅ the point of the fix: a table outside 0.5-1.1 m is no longer taken, so the bed is never past a seated reach; far edge ≤ 0.75 m | PlacementSolver.ts:143-146; room/config.ts:21-22; 29-room-matrix low-table row: level 4, 0.25 m under the eyes |
| 7 | FoV | ✅ the ghost's caption through the caption line | core/strings.ts:9-10 |
| 8 | Loss / pause | ✅ a pause restarts the level-3 wait (LLD §3.2, pre-existing) | — |
| 9 | Feedback | ✅ the bed lands, the ripple and the placed note follow | — |
| 10 | Instruction | ✅ "Look at your table, and pinch" / "…and wait" (gaze) | core/strings.ts:9-10 |
| 11 | Flash | ✅ unchanged | — |
| 12 | Thresholds | ✅ SURFACE_MIN/MAX_HEIGHT_M with FR-ROOM-01, D-034, BUG-010 cited | room/config.ts:14-23 |
| 13 | Tests | ✅ PlacementSolver.test.ts "BUG-010: …"; 29-room-matrix low-table | — |
| 14 | Device step | ✅ needed: does Space Setup label a 0.4 m coffee table "table"; a sofa user with the floating bed; the lost room signature (API_SPEC §1.3 item 4) is a product question | — |
| G | Laptop mode | n.a. the window floats the bed from a fixed camera | src/window/WindowStage.ts:39-47 |

**Verdict F: PASS pending device.**

## Fails and the smallest fix for each

- **F1 (S3, onboarding; fixed in 43bb73c)** "Turn a hand over for settings" is raised in one-hand and gaze modes, where the orb waits in the view box (PanelSystem.ts:457-470) and no hand carries it. Fix: in `sayDone()` (OnboardingSystem.ts:151) also require `!s.oneHand && !s.gazeDwell`, or raise a twin `settingsHintLook: 'Look for the settings orb'` (5 words) in those modes; one `it` beside OnboardingSystem.test.ts:305; the strings.test.ts notices list.
- **F2 (S4, onboarding; fixed in 43bb73c)** "Pinch the petal to undo" in gaze mode (a dwell undoes) and in the window (a click). Fix: twins `undoHintGaze: 'Look at the petal to undo'` (6) and `undoHintClick: 'Click the petal to undo'` (5), chosen as the step captions are (OnboardingSystem.ts:139-141, the `[xr, window]` table plus the gaze case); one `it` beside :287.
- **F3 (S4, app; fixed in 43bb73c)** "Pinch to resume sound" in the window (a click is the pinch) and for a gaze user (a gaze select is a `gesture:release`). Fix: `soundResumeClick: 'Click to resume sound'` chosen by `!world.renderer.xr.isPresenting` in `followSession` (app.ts:396); arm `gesture:release` beside pinchStart and palmUp (app.ts:397-398) so a gaze select of the orb or a petal resumes when a hand is present. Gaze-only with no hand tracked has no user activation at all: a platform limit to write into UX §8, not a third twin.

Gaps, not fails: no e2e for the time-lapse stages (the T-174 row asked one); the switch, the removal and the undo play no UI sound although `confirm`, `removeRev` and `undoFwd` are built (audio/uiSounds.ts:25, no caller); stillness has no discoverability cue (by design, the manual says it); the panel's toggles have no FlashGuard (pre-existing, all toggles).

**Overall: PASS pending device; F1-F3 fixed in 43bb73c (the new strings: 'Look for the settings orb', 'Look at the petal to undo', 'Click the petal to undo', 'Click to resume sound').**
