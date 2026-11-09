# T-193: ten seed kinds, two libraries, the seed picker (D-076)

Design record, 9 Nov 2026. Made by a design workflow (5 code maps, 3 designs, a merge, 3 adversarial reviews) on develop 0dc5446. Nothing here has been seen on a headset. The contract is `specs/04-development/API_SPEC.md` v1.2.70; where this file and the spec differ, the spec wins.

## 0. Worktrees and branches (this table overrules any worktree line in a brief)

| Package | Worktree (under the repo root) | Branch | Starts from |
|---|---|---|---|
| P0-contract | `.claude/worktrees/t193` (exists) | `feat/t193-seed-kinds` | develop 0dc5446 |
| P1-garden-flow | `.claude/worktrees/t193-garden` | `feat/t193-garden` | `feat/t193-seed-kinds` after P0 |
| P4-ui-picker | `.claude/worktrees/t193-ui` | `feat/t193-ui` | `feat/t193-garden` after P1 |
| P2-audio-kinds | `.claude/worktrees/t193-audio` | `feat/t193-audio` | `feat/t193-seed-kinds` after P0 |
| P5-audio-hum | `.claude/worktrees/t193-audio` (the same) | `feat/t193-audio`, its own commits after P2 | P2 |
| P3-render-kinds | `.claude/worktrees/t193-render` | `feat/t193-render` | `feat/t193-seed-kinds` after P0 |
| P6-integration | `.claude/worktrees/t193` | `feat/t193-seed-kinds` | merges the four branches |

Rules for every package: work only inside your worktree; never edit the main checkout (it serves a headset on port 8081); no `npm ci` (modules resolve from the main checkout); never push; no Playwright except P6; unit tests with `--maxWorkers=2`. The stored-form decision is D-077 in `specs/08-status/DECISIONS_LOG.md`.

## 0.1 Defaults taken on the open questions (Parth may overrule any of them)

1. Does seed 1 arrive ready, with picking from seed 2 on? And if the timed headset run (a first-time player, Enter to the third plant with two picks) takes over 90 s, may picking start after three plants instead (SEED_PICK_MIN_PLANTS = 3)? Default: yes to both. The first bends 'every time'; the second means day one has no pick.
2. The picker opens where the settings board opens, above the bed. A player watching the palm must look up about 15 to 30 degrees, and golden rule 6 allows 20. Default: accept it with the caption 'Look up to pick a seed' and judge it on the headset before the merge. A picker at the hand would be a new build and is not possible tonight.
3. UI sounds (tick, confirm, remove, undo): the old short voices, or the bowls you heard tonight? Default: the old short voices, because a bowl tick rings 1.7 s per crossed cell. It needs your ear on the headset; switching back is one line.
4. Does the supply stay 3 seeds plus one a day (cap 5)? Default: yes, unchanged. A first session then has two picks, so a judge hears at most three of the ten kinds unless the time-lapse demo is used.
5. Who is the first-time player for the timed run, and when? Default: 10 Nov on your Quest 3S, someone who has not played, from a dev server started in the feature worktree on another port (develop and port 8081 stay as they are). develop gets the feature only after this run.

---

## 1. Design (revision 2)

Paths are under /Users/parth_baller/Documents/test-pro/Roomsong/. Read against develop 0dc5446; nothing was built, run or heard. The reviewers' seven distinct blockers were all confirmed in the code and are fixed; none is refuted. The evidence is in the decisions.

### Fixed after review
1. Gaze guard: `openSeeds` no longer sets `isFreshGaze`; a one-frame guard covers only a control already under the gaze.
2. Dwell pick: with look-to-select on, the board stays until the gaze leaves the picked swatch, so no cell behind it is planted.
3. Look-up: the look-away counts only after the board was seen, and a caption says "Look up to pick a seed". The look-up itself stays (question 2).
4. Render is must-ship (FR-UI-08). Only the hum can be dropped.
5. First loop: a timed headset gate before the merge; fallback `SEED_PICK_MIN_PLANTS = 3`.
6. Typecheck covers tests and proto: the audio and render briefs allow the fixture edits.
7. The hum is hidden by `HIDDEN_KINDS`, never deleted from `SEED_KINDS`; `kindOf` is total.

### Picker
A Seeds page on the settings board, opened by the garden. hands/ and access/ are not edited.

1. Palm-up on a bed with at least one plant (`SEED_PICK_MIN_PLANTS`): the garden emits `garden:seedAsk { hand }` and hands out nothing. The board opens.
2. A press or a dwell on a swatch calls `garden.pick(kind)`, which rewrites `seeds[0]`.
3. The next palm-up hands that seed out.

Rules:
- Close and the look-away give no seed.
- A hand asks once per palm raise: again after 0.9 s palm-down, after a seed was handed to it, or after its own pinch.
- A pick survives a tracking loss and a full bed. A seed released off the bed asks again: that is how a pick is changed.
- Picking is on only in an immersive session; the garden window and `?flags=presetSeeds` keep today's hand-out.

Board: 0.40 x 0.28 m at 0.55 m, where the settings board opens.
- Header: `lib:old`, `lib:new`, Close. It opens on New, then on the library last shown.
- Five swatches per library: 4 cm discs, hit radius 4 cm, columns at x -0.17 and +0.03 m, rows 5.5 cm apart, each name right of its swatch in the 50 px font. Siblings share a place.
- Bottom row: the text "Pick a seed", no control.
- Look-up: the board is placed for a head at most 30 degrees down. By the reviewers' arithmetic, a head 44 degrees down sees the swatch rows about 14, 20 and 26 degrees above its gaze line; golden rule 6 allows 20. The settings board has this exception today (UX 3.6).

Input modes:
- **Two hands:** palm up 0.4 s, board; pinch a swatch by touch or by sight; the seed is on the raised palm within 0.4 s.
- **One hand:** palm up, pinch a swatch, palm up again (0.4 s), take the seed off its own palm (D-062).
- **Gaze:** dwell a free cell (600, 900 or 1200 ms), board; dwell a swatch, which lights; look away and the board closes; dwell the cell. Three dwells per plant.

### Data model and migration
- `Seed.family?: 'new'` and `Plant.family?: 'new'`; absent = Old. `VoiceType` and schema version 1 do not change.
- Old saves load and are written back byte-identical. The validator keeps `family` only when it is `'new'`.
- Rollback: an older build drops the key and keeps the garden.
- Derived, never stored: `SeedKind`, `kindOf()`, `SEED_KINDS`, `HIDDEN_KINDS` (`['hum']` until the hum is merged).
- Names: twelve adjacent keys in `src/core/strings.ts`, the one place to rename.
- Release note: saved plants keep sound, shape and place and take their kind's colour. Gardens made on develop tonight go back to the old voices.

### The ten kinds

| Key | Voice, library | Placeholder | Colour (hue) | Head (Old: as built) |
|---|---|---|---|---|
| bell | bell, Old | Chimecap | gold 54 | lantern |
| pluck | pluck, Old | Plinkstem | lime 100 | pin and bead |
| choir | choir, Old | Chantleaf | mint 146 | umbrella |
| pad | pad, Old | Sighpetal | ice 192 | scalloped cup |
| bass | bass, Old | Thumpbulb | indigo 238 | jug |
| bowl | bell, New | Humbloom | soft gold 73 | wide shallow dish |
| chime | pluck, New | Tinglet | soft leaf 120 | six-point star cup |
| flute | choir, New | Whisperwort | soft aqua 166 | spire of three beads |
| reed | pad, New | Swellroot | soft sky 212 | square pleated box |
| hum | bass, New | Thrumsprout | soft violet 258 | low two-winged pod |

Old kinds have saturation 0.72, New kinds 0.50. A room turns all ten together by up to 15 degrees. High contrast changes no colour; name and head carry identity.

### Audio
- **Selection:** `VoiceParams.calm: boolean`, set at sync from `plant.family`. The five `recipe.calmVoices` tests in Bell, Pluck, Choir and Pad read `p.calm`; Bass gets one for the hum. Octave and `mixDb` stay the sibling's.
- **Identity by position, all ten:** ring sets pitch (`hzForRing`, the sibling's octave), step sets time, cell sets pan. Own tone: hue (cutoff, detune) for Old kinds; the id-and-cell hash plus hue for New kinds.
- **Tenth voice (hum):** a tanpura-like string: two oscillators on one shared wave, 2 to 5 cents apart, through a peaking filter that falls from 14 to 4 times the note over 0.6 to 1.0 s; long decay; 4 nodes; the Bass's octave. Until it is merged, a bass + new plant plays the Bass.
- **Notes that are no plant's:** drone, ripple and goodnight follow `recipe.calmVoices`. Preview, placed note and counter-line copy their plant's `calm`. UI sounds play the old short voices (question 3).

### Render
Five lathe tables are appended to `SHAPES`; `SHAPE_OF` is keyed by `SeedKind`; each new head has at most 252 triangles. Colour comes from the kind (`kindColour`) for plant, seed, petal and vine, and `kindSwatch()` gives the board the same colour. `hue` stays the sound's variation.

### Onboarding
Not edited. Seed 1 keeps today's path (first plant at 18.5 s on the Quest 3S). The board's text and the look-up caption teach the pick; the tutorial shows no caption between plants 1 and 3.

### Tests
- **Unit:** per package, one test per acceptance line; the heap tests keep their limits.
- **Browser:** one agent on its own port (8081 is the headset's): `32-seed-picker`, then the whole suite once. Every other spec runs with `presetSeeds`.
- **Headset gate before the merge to develop** (Parth, from the feature worktree's own dev server):
  1. A first-time player, clean site data: Enter to the third plant with two real picks, in 90 s or less.
  2. Palm up while watching the palm: is the board found?
  3. One hand: hover 3 s before the pinch. Does Listen start?
  4. Look-to-select: a whole loop; rest 2 s after a pick, nothing is planted.
  5. All ten by eye and ear; rate the hum; 24 New plants for crackle and fps.

### Cut line
- **Must ship together:** contract, garden flow, audio routing, render, picker, integration. If render is not green, nothing merges.
- **Droppable:** the hum. It stays in `HIDDEN_KINDS` and nine kinds are on the picker.
- **Stage 2:** head outlines on the swatches (first), a palm cue after a pick, the name at the hand, the hum's loudness render.
- **Fallback:** do not merge. `?dev=1&flags=presetSeeds` is a test switch, not a release path.

Order: contract; garden flow, audio and render together; then ui and the hum; integration last. My estimate is about 6 hours with no rework and 7 to 8 with it: unit-green tonight, the headset gate on 10 November.

### Risks and limits
- Draws: 48 measured on 25 October; ten kinds add 10 in the emulator, so 58 of 60 by arithmetic. Integration measures first and does not raise the budget.
- No headset has seen the picker. Look-to-select has never run on a device.
- A palm-up while the settings tabs are open gets nothing.
- Angles, draw counts and times are arithmetic. The role's skills could not be loaded in this run; the design adds no vendor API.

---

## 2. Decisions

1. **Blocker (reviewers 1 and 2): the fresh-gaze guard blocks the first swatch a gaze player looks at** Fixed in P4. `openSeeds` does not set `isFreshGaze`. `Panel.frame` sets the existing one-frame `selected` guard after its `dwell` call on the opening frame, so only a control already under the gaze when the targets appear is blocked. *Why:* Confirmed at src/ui/Panel.ts:451-454: the flag is spent on the first control met, whenever that is, and the board opens with the gaze on no control. `PanelSystem.update` runs `panel.frame`, then `show`, then `redraw`, so a guard set after the dwell is read by the first dwell that can see the new targets. Reviewer 2 put it in `PanelSystem.show`; inside `Panel.frame` it stays in the pure model and its two unit tests need no system.
2. **Blocker (reviewer 1): a dwell pick closes the board and the cell behind the swatch is planted** Fixed in P4. With gaze dwell on, a pick calls `pickSeed` at once, lights the swatch and keeps the board until the gaze is off that swatch. With it off, a press closes at once. *Why:* Confirmed: src/access/GazeDwell.ts:192 blocks the bed only while a panel control is under the gaze, and its select (237-247) is a palm-up plus a carry release, so a resting gaze plants after one dwell and the seed is spent. The rule keys on the setting, not on dwell against pinch, because a pinch by sight in gaze mode leaves the gaze on the swatch too. P6 checks it in the browser on the no-table room.
3. **Blocker (reviewers 1 and 3): the board opens above the plus or minus 20 degree box and closes unseen after 5 s** Fixed in part in P4; the look-up itself stays and goes to Parth (question 2). On the Seeds page the look-away counts only after the board's centre has been in the box since it was placed. Until then the caption 'Look up to pick a seed' is up. A unit test pins the row angles and UX 3.6 names the exception. *Why:* Confirmed: src/ui/Panel.ts:419-420 closes after `PANEL_LOOK_AWAY_MS`, src/ui/PanelSystem.ts:335 tests the centre as a point, and src/ui/config.ts:119 places the board for a head at most 30 degrees down to keep it off the table. Not refuted: golden rule 6 is bent for every seed after the first. Two corrections to the proposed fixes: PanelSystem has no caption entity today, so P4 makes one (pattern: `SeedSystem.raiseFull`, src/render/RenderSystems.ts:215); and on the opening frame `away` is computed from the last opening's `board.position`, so 'seen' counts from the frame after `show`. The 5 s rule is pinned by a unit test, which is exact; the browser spec checks that the board is open and the caption is up.
4. **Blocker (reviewer 1): the cut line let render drop, which ships two voices with one head** Fixed. P3 is must-ship: stage 1 is P0, P1, P2, P3, P4 and P6 together. Only the hum (P5) can be dropped. *Why:* FR-UI-08 is a Must (specs/02-requirements/SRS.md:104) and `SHAPE_OF` is keyed by `VoiceType` today (src/render/PlantRenderer.ts:181). Dropping a Must is Parth's call (CLAUDE.md section 6), so the plan does not offer it. P3 does colour first and commits, then shapes.
5. **Blocker (reviewers 1 and 3): first loop within 90 s is unmeasured with two picks in it** Fixed as a gate, not by code. develop gets the feature only after a timed headset run by a first-time player (Enter to the third plant, two real picks, 90 s or less), recorded in TEST_PLAN 4.6. Agreed fallback: `SEED_PICK_MIN_PLANTS = 3`, one edit; P1's tests name the constant. *Why:* Device times with no picker were 35 s (Parth) and 62 s (Chinmay) (specs/05-testing/TEST_PLAN.md:156), and the emulator runs at test speed, so reading code cannot settle it. With 3, day one has no pick, which is why it is question 1.
6. **Blocker (reviewer 2): P2 and P3 could not meet 'unedited' because typecheck covers tests and proto** Fixed. `calm` is a required boolean and P2 adds `calm: false` to the typed fixtures. P3 may edit proto/bed/src/main.ts:291 and the tests' reference colours. No assertion or limit changes in the heap tests. *Why:* Confirmed: tsconfig.json:18-24 includes tests/** and proto/bed/**. `grep -rl 'timbre: 0' tests/unit/audio` lists eight files (the reviewers counted seven), the set `timbre` touched today. Required beats optional: the four scratch literals in src/audio (Layers.ts:164 and :166, AudioEngine.ts:206 and :756) must then set it, so a reused scratch object cannot carry a stale value. tests/unit/audio has two heap tests, not three.
7. **Blocker (reviewer 2): cutting the hum by deleting its row leaves saved bass + new plants undefined** Fixed in P0. `SEED_KINDS` always has ten rows; `kindOf` is total by rule; `HIDDEN_KINDS` (first `['hum']`) keeps a kind off the picker and out of `pick`. P6 empties it only when P5 is merged; the listen gate puts `hum` back. *Why:* Autoplant and Parth's test gardens make bass + new plants, and the validator keeps `family: 'new'` on any voice, so they outlive a cut. Hidden by default also covers a build without P5: such a plant has the hum's head and colour and plays the Bass, and nobody can pick it.
8. **How is a kind stored: voice x family, or ten voice ids?** Unchanged: `family?: 'new'` on Seed and Plant, absent = Old; `VoiceType` and schema version 1 unchanged; a derived, never-stored `SeedKind`. *Why:* src/persistence/schema.ts rebuilds each object from listed fields and refuses an unknown voice, and one refused item refuses the whole save. An older build drops `family` and keeps the garden, but would refuse a new voice id. Reviewer 2 confirmed this against the live build (40191a5). P0 logs it in DECISIONS_LOG, because the stored form is the one part that is hard to reverse.
9. **Where does the picker live and what opens it?** Unchanged: a Seeds page of the settings board, opened by the garden event `garden:seedAsk { hand }` on palm-up. *Why:* Board controls are the only mid-air targets proven on a headset (D-066), and pinch, one-hand and the panel's own dwell already work on them, so hands/ and access/ are not edited.
10. **Layout and first library** Unchanged: two library tabs, five named swatches each on the Access tab's grid, siblings in the same place. It opens on New, then on the library last shown. *Why:* FR-UI-04 fixes the 50 px font, so ten names do not fit on one page, and unnamed colour dots would carry state by colour alone. Seed 1 is always an Old kind, so a first session hears both libraries. The first library is one word in Panel.ts, so it is a default, not a question.
11. **How does a pick become a seed on the hand?** Unchanged: `pick(kind)` rewrites `seeds[0]` and marks it picked; the next palm-up hands it out through today's `handOut`. *Why:* An immediate hand-out to the asking hand fails in gaze mode, where no hand is tracked. Arming keeps GazeDwell's palm-up and release in one call, as today.
12. **When does a palm ask again?** Changed: once per palm raise, again after 0.9 s palm-down, after a seed was handed to that hand, or after that hand's own `gesture:pinchStart`. *Why:* Reviewer 1's note is right: palm-up ticks keep coming while the palm is up, so '900 ms since the previous palm-up' is never true, and a one-hand player who presses Close and raises the palm again within 0.9 s got nothing. The garden already listens to `gesture:pinchStart` (src/garden/GardenSystem.ts:120), so this is one line. In the two-hand flow the other hand presses Close, so a held palm still does not loop the board.
13. **When is a pick forgotten?** Changed: when the seed is planted, and when it comes back for `offBed` or `reset`. It is kept for `lost` and `full`. *Why:* Both reviewers 1 and 3 asked for it: a tracking drop in mid-carry should not cost a second pick inside the 90 s loop. Releasing off the bed stays the way to change a pick. `reset` must clear it because New garden reuses seed ids (BUG-006).
14. **What does Close do?** Unchanged: Close and the look-away give no seed. *Why:* A seed of a kind nobody chose contradicts 'picks every time' and adds a second path into the garden. The once-per-raise rule stops a held palm from looping the board.
15. **Is the first seed picked too?** Unchanged: no. The first seed of an empty bed arrives preset (`SEED_PICK_MIN_PLANTS = 1`). *Why:* The first plant took 18.5 s on the Quest 3S against the 20 s golden rule. It bends 'every time', so it stays question 1, now together with the first-loop fallback.
16. **How is picking switched on?** Unchanged: `GardenSystem.setPicking(on)`, off by default; `src/app.ts` turns it on for an immersive session unless the flag `presetSeeds` is set. *Why:* The garden window also emits `xr:sessionStart` and its pointer is always palm-up, so the garden cannot tell by itself. In src/app.ts `stage !== null` is the window (lines 537-543).
17. **Audio routing: `VoiceParams.calm` or five new Voice classes?** Unchanged: `VoiceParams.calm`, read by the five branches that exist; Bass gets one for the hum. The field is required, not optional. *Why:* It is the small change of preview 8ef4217 that Parth and Chinmay listened to. `mixDb`, `VOICE_OCTAVE` and the pad-evolve test stay keyed by voice, so the loudness match holds for eight kinds. `Pluck.prepare(p)` has the params too (Pluck.ts:119), so the string is still prepared for Old plucks.
18. **What do drone, ripple, UI sounds and the counter-line play?** Unchanged: drone, ripple and goodnight follow `recipe.calmVoices`; preview, placed note and counter-line copy their plant's `calm`; UI sounds are the old short voices. *Why:* A tick fires per crossed cell and as a bowl it rings 1.7 s on 11 nodes. It changes the ticks heard tonight, so it stays a question for Parth's ear.
19. **Which tenth voice, and how is it cut if late or disliked?** A tanpura-like low string in its own package (P5). It is hidden from the picker until P5 is merged, and hidden again if Parth rates it under 3 of 5. No row is deleted. *Why:* D-076 leaves the tenth sound to the driver; the string differs from the Bass thump and from the struck bowls. Hiding keeps planted hums loading, drawn and sounding.
20. **Where does colour come from, and how does the board get it?** Unchanged: from the kind, in render; `hue` stays the sound's variation. The contract adds `kindColour` and `kindSwatch`; Panel.ts reads the swatch through `PanelActions.swatch`. *Why:* Writing a kind colour into `hue` would flatten the Old voices' only tone variation (src/audio/mapping.ts). ui may import render (tests/unit/ui/imports.test.ts).
21. **How is the pick taught?** Changed: the board's text line, plus the caption 'Look up to pick a seed' while the board is open and not yet seen. Onboarding is not edited. *Why:* After plant 1 the tutorial shows no caption until three plants, so the caption line is free exactly when the first pick happens. A cue to open the hand again after a pick is stage 2 (P7 item 2).
22. **How do the browser tests cope with the picker and with ten kinds?** Every spec runs with `presetSeeds` except 32-seed-picker and TC-E2E-03; `openApp` adds the flag on its own, not through `withoutOnboarding`. Autoplant gives `family: 'new'` to plants 5 to 9 of every ten. P6 runs 26-worst-frame first, then the whole suite once, on `E2E_PORT=8091`. *Why:* Reviewer 3 is right on three points: port 8081 is the headset's dev server (playwright.config.ts uses strictPort), shaky-play opens scenes with onboarding on, and specs 06, 07, 19 and 27 read autoplant too, so a ten-spec run would miss moved numbers. tests/tools/video.spec.ts opens through `openApp` (lines 379 and 389), so the judge video keeps running but will not show the picker until it is shot again with picking on.
23. **Is the garden's behaviour part of the contract package?** Unchanged: no. The contract holds spec, types, tables, strings, flag, event and the colour helper; `GardenSystem` and the validator are a wave-2 package. *Why:* Audio and render, the longest packages, start sooner, and each brief stays readable alone.
24. **Where do the agents work, and when does develop get the feature?** Every package works in its own worktree on or from `feat/t193-seed-kinds`; nobody edits the main checkout; no `npm ci` in a worktree. develop gets the feature only after Parth's headset gate. *Why:* The main checkout serves a headset from the dev server on port 8081, and saving a source file there reloads the headset page. The earlier P0 and P6 briefs named the main checkout. The kill switch is not a release path: with it no New kind can be reached, so the real fallback is not merging.
25. **Reviewer notes left for the headset run, not fixed in code** Device checks only: Listen starting while one hand hovers over the swatches; an accidental palm-up opening the board; a pinch by sight at the lowest swatch with tall plants behind it; a gaze through the board's empty slots filling the reticle; the frame in which the 1000 x 700 canvas is redrawn. *Why:* Each depends on real hands and heads, and none loses data: with no seed handed out, a dwell through the board plants nothing. Fixing them blind would add code nobody has seen fail.

## 3. Cut line

Stage 1 ships only as a whole: P0, P1, P2, P3, P4 and P6 green on branch feat/t193-seed-kinds (the picker in all three input modes, ten shapes and colours, old saves untouched). P3 is must-ship: a New kind on a borrowed head would drop FR-UI-08, a Must, and only Parth may drop a Must; if P3 is not green, nothing merges. The one droppable part is the hum (P5): it stays in HIDDEN_KINDS, nine kinds are on the picker, and any bass + new plant still loads, is drawn and sounds. develop gets the feature only after the headset gate: a first-time player reaches three plants with two real picks within 90 s, the board is found from a palm-watching posture, and one-hand and look-to-select each complete a loop. If the 90 s gate fails, the agreed fallback is SEED_PICK_MIN_PLANTS = 3, which is Parth's call. Stage 2 (P7, P8) waits for that headset look. There is no partial release: the fallback is not merging, and ?dev=1&flags=presetSeeds is a test switch only. Estimate: about 6 hours of wall time with no rework, 7 to 8 with it, so tonight can end unit-green with one browser run and the headset gate is 10 November.

## 4. Packages

### P0-contract: Contract: spec v1.2.70, shared types, kinds table, names, colour helper

Owner `software-architect` · stage 1 · modules: specs/, src/core, src/garden (model.ts, config.ts, rules.ts, events.ts, index.ts), src/render (palette.ts, config.ts, index.ts) · after: nothing · about 70 min

Repo /Users/parth_baller/Documents/test-pro/Roomsong. Never edit the main checkout (it serves a headset): `git worktree add .claude/worktrees/t193 -b feat/t193-seed-kinds develop`; no `npm ci`.
Spec first, same commit: specs/04-development/API_SPEC.md v1.2.70 with a changelog entry (never print line 3), sections 1.0, 1.1, 1.2, 1.6, 1.8, 1.9, 1.10 rule 8, 2, 3, 4. State: `VoiceParams.calm: boolean`; a `family` that is not `'new'` is dropped (the validator's third repair); the Seeds page uses the board's look-up exception. One line each: SRS FR-MUS-04, FR-MUS-08; UX_WIREFRAMES 3.3, 3.6, 5, 9.1, 9.5.
Kinds (id, name, hue): bell Chimecap 54; pluck Plinkstem 100; choir Chantleaf 146; pad Sighpetal 192; bass Thumpbulb 238; New, same voices: bowl Humbloom 73; chime Tinglet 120; flute Whisperwort 166; reed Swellroot 212; hum Thrumsprout 258.
core: `STRINGS` gains twelve adjacent keys (`kindBell` to `kindHum`, `libOld: 'Old'`, `libNew: 'New'`), then `pickSeed: 'Pick a seed'`, `pickSeedLookUp: 'Look up to pick a seed'`; boolean flag `presetSeeds`.
garden (model.ts, config.ts, rules.ts, events.ts, index.ts only): `family?: 'new'` on `Seed` and `Plant`, omitted for Old; `SeedKind`; `SEED_KINDS` rows `{kind, voice, family?, name}`, always ten, in that order; `HIDDEN_KINDS: readonly SeedKind[] = ['hum']`; `kindOf({voice, family})`, total by rule, never a table search (shimmer counts as pluck); `SEED_PICK_MIN_PLANTS = 1`; `setSeedKind(s, seedId, kind)` (pure; an Old kind removes the key; returns `s` when unchanged); `plantSeed` copies `family`; event `'garden:seedAsk': { hand: Hand }`.
render (palette.ts, config.ts, index.ts only): `KIND_HUE_DEG`, `NEW_KIND_SATURATION_DROP = 0.22`, `kindColour(out, kind, lightness, palette)`, `kindSwatch(kind, paletteSeed, reverbRt60): string`.
Tests: one per acceptance line; tests/unit/core/strings.test.ts:95 admits the new keys.

Acceptance:
- API_SPEC.md is v1.2.70 with a changelog line; the spec edits are in the same commit as the types; DECISIONS_LOG has one entry for the stored form (`family: 'new'`)
- `npm run typecheck`, lint and the unit tests of core, garden, persistence and render are green with no other source file edited; the main checkout was not edited
- A seed or plant without `family` is unchanged in every existing test; tests/unit/persistence and tests/e2e/10-persistence.spec.ts are not edited
- `kindOf` returns one of the ten kinds for all six voices in both families, whatever `HIDDEN_KINDS` holds
- `plantSeed` copies `family`; `setSeedKind` to an Old kind leaves no `family` key and never mutates its input
- The ten kind names differ, are at most 14 characters, and with the two library names are twelve adjacent lines in src/core/strings.ts and appear nowhere else
- The ten colours are distinct in all six rooms, and `kindSwatch` equals `kindColour` for every kind in every room

### P1-garden-flow: Garden: the ask, the pick, and `family` in the save

Owner `backend-dev` · stage 1 · modules: src/garden (GardenSystem.ts), src/persistence · after: P0-contract · about 50 min

Repo /Users/parth_baller/Documents/test-pro/Roomsong. Work in your own worktree from branch `feat/t193-seed-kinds`, never in the main checkout; no `npm ci`.
src/garden/GardenSystem.ts:
1. `setPicking(on: boolean)`, off by default.
2. `pick(kind: SeedKind)`: with a garden, a supply seed, no seed out and a kind not in `HIDDEN_KINDS`, commit `setSeedKind(s, seeds[0].id, kind)` and remember that seed's id as picked, also when the kind did not change. Otherwise nothing.
3. `handOut`, after today's checks: when picking is on, `s.plants.length >= SEED_PICK_MIN_PLANTS` and `seeds[0]` is not the picked seed, emit `garden:seedAsk { hand }` and hand out nothing. One ask per palm raise (a boolean per hand), reset when that hand's previous palm-up was `SEED_PALM_DOWN_MS` or more ago, when a seed is handed to it, and on its own `gesture:pinchStart`. `palmAskedAt` keeps its meaning (`crossOver` reads it).
4. The picked id is cleared when the seed is planted and in `takeBack` for `offBed` and `reset` (before its early return: New garden reuses ids, BUG-006). It is kept for `lost` and `full`.
5. `autoplanted`: plant n also gets `family: 'new'` when `Math.floor(n / 5) % 2 === 1`.
No per-frame work.
src/persistence/schema.ts: `plantOf` and `seedOf` keep `family` only when it is exactly `'new'` (conditional spread, as `anchorOf`); version 1; the header comment names this third repair.
Tests: one per acceptance line, naming `SEED_PICK_MIN_PLANTS`, never the number 1. Also the gaze order (palm-up, pick, palm-up, plant; a palm-up 600 ms later asks), a pick before load, and a schema round trip.

Acceptance:
- With picking off every existing garden test passes unedited, except the autoplant cases that plant more than five
- No ask with picking off or with fewer plants than `SEED_PICK_MIN_PLANTS`; the tests name the constant and stay green when it is 3
- A palm held up after an ask gets no second `garden:seedAsk`; a palm raised again after 0.9 s does, and so does a palm-up after that hand's own pinch
- After `pick('bowl')` and a palm-up, `garden:seedOut` carries that kind, the planted plant is `{ voice: 'bell', family: 'new' }` and the save round-trips it
- A picked seed that comes back for `lost` or `full` is handed out again with no ask; for `offBed` it asks again
- `pick` of a kind in `HIDDEN_KINDS` does nothing; `pick` of the kind the seed already has still counts as picked
- An Old plant is saved with no `family` key; a `family` that is not `'new'` is dropped and the state kept; `{ voice: 'bass', family: 'new' }` is kept; schema version is 1; tests/e2e/10-persistence.spec.ts is not edited

### P2-audio-kinds: Audio: a plant's family picks its voice (`VoiceParams.calm`)

Owner `backend-dev` · stage 1 · modules: src/audio · after: P0-contract · about 60 min

Repo /Users/parth_baller/Documents/test-pro/Roomsong. Work in your own worktree from branch `feat/t193-seed-kinds`, never in the main checkout; no `npm ci`.
`VoiceParams` (src/audio/voices/note.ts) gains a required `calm: boolean`: the note plays the calm sibling of its voice. The four literals get `calm: false` (Layers.ts:164 and :166, AudioEngine.ts:206 and :756). Set it wherever params are filled:
- `voiceParamsFor` (mapping.ts): `plant.family === 'new'`.
- `AudioEngine.preview` and `placed`: from the plant's synced record (AudioSystem's pulled-plant scratch carries no family).
- `Layers.groove` and `Layers.copy` (counter-line): from the source params.
- `Layers.droneNote`, `AudioEngine.chordTone`, `goodnight`: `recipe.calmVoices`. The last two also set `cutoffMul = 1`, `detune = 0`, `timbre = 0`; today they inherit them from the last preview on the shared `this.chord`.
- `AudioEngine.uiNotes`: `false`.
The five `this.r.calmVoices` tests (Bell.ts:20, Pluck.ts:119 and :146, Choir.ts:45, Pad.ts:30) become `p.calm`. `Recipe.calmVoices` stays; its doc now says drone, ripple and goodnight. `mixDb`, `VOICE_OCTAVE` and the pad-evolve test stay keyed by `voice`. Bass.ts is not edited here.
Fixtures: tests/** is typechecked, so the typed params in the eight files that `grep -rl 'timbre: 0' tests/unit/audio` lists gain `calm: false`, as `timbre` did today. No assertion changes in voices.test.ts or the two heap tests.
Tests (tests/unit/audio): one per acceptance line. Also: on every ring, for each voice in both families, `hz` equals `hzForRing(key, ring, voice)`; two seeds of one kind on one ring differ in `cutoffMul`, `detune` or `timbre`; preview and placed carry the record's `calm`. Update calm.test.ts, styles.test.ts and placed.test.ts to the new switch. No new allocation in the tick.

Acceptance:
- In style B a plant without `family` plays the old voice of its class and one with `family: 'new'` plays the calm one, for bell, pluck, choir and pad
- `npm run typecheck` is green; the fixture edits add `calm: false` only; no assertion changed in voices.test.ts, layers.heap.test.ts or GardenAudioSystem.heap.test.ts
- The drone in style B is still the shruti box; a UI tick is never calm (the FM bell)
- chordTone and goodnight no longer inherit cutoff, detune or timbre from a previous note (a test pins cutoffMul 1, detune 0, timbre 0 after a preview)
- A grep for `r.calmVoices` in src/audio/voices returns nothing

### P3-render-kinds: Render: ten head shapes and colour by kind

Owner `frontend-dev` · stage 1 · modules: src/render, proto/bed (src/main.ts:291 only) · after: P0-contract · about 120 min

Repo /Users/parth_baller/Documents/test-pro/Roomsong. Work in your own worktree from branch `feat/t193-seed-kinds`, never in the main checkout; no `npm ci`. Shape and colour by kind: `kindOf` comes from garden's index, `kindColour` from palette.ts. Colour first, commit, then shapes.
Colour: store each slot's kind at set-up, where `hueOf[slot] = plant.hue` is today (src/render/PlantRenderer.ts), and colour with `kindColour` in `colourFor`. The same in `SeedRenderer.setSupply` (now `Pick<Seed, 'id' | 'voice' | 'family'>`; a shown id whose kind changed is recoloured), `PetalRenderer.show` and `VineRenderer.setPlants`. `hue` sets no colour. Kind lookups in set-up only.
Shapes: append five lathe tables to `SHAPES` (bell stays index 0); key `SHAPE_OF` by `SeedKind`. bowl: wide shallow dish, rim rolled in, 16 segments. chime: six-point star cup, 12 segments, 6 lobes. flute: spire of three beads, open mouth, 8 segments. reed: square pleated box, 4 segments. hum: low two-winged pod, 16 segments, 2 lobes. Each: foot radius 0.0125; head radius at most 0.0225; stem thin at 0.4 and 0.6 of its height; at most 252 triangles; no pair of the ten outlines coincides more than bell and pad do (0.64, tests/unit/render/PlantRenderer.test.ts:297).
Typecheck covers tests/** and proto/bed/**: edit the seed literal at proto/bed/src/main.ts:291 and the tests' reference colours (`plantColour` by hue becomes the kind's colour, for example SeedSystem.heap.test.ts:118). In heap tests change the reference colour only, never a limit.
Tests (tests/unit/render): one per acceptance line; extend the shape list, triangle list, foot and width loop and the FR-UI-08 pairs to ten.
Not in scope: RenderSystems.ts, captions, heads on the picker.

Acceptance:
- Ten meshes, one per kind; a kind with no plant is hidden and costs no draw call
- Every new head: at most 252 triangles, foot radius 0.0125, head radius at most 0.0225; no pair of the ten outlines coincides more than 0.64
- Two plants of one kind with different hues have the same colour; plant, supply seed, petal and vine of one kind match `kindColour`
- A `{ voice: 'bass', family: 'new' }` plant is drawn with the hum's head while `hum` is in `HIDDEN_KINDS`
- A supply seed changes colour when `garden:changed` brings its id a new kind
- `npm run typecheck` is green, proto/bed included; in PlantRenderer.heap, BedRenderSystem.heap and SeedSystem.heap tests only a reference colour changed, no limit

### P4-ui-picker: UI: the Seeds page of the settings board

Owner `frontend-dev` · stage 1 · modules: src/ui · after: P0-contract · about 100 min

Repo /Users/parth_baller/Documents/test-pro/Roomsong. Own worktree from `feat/t193-seed-kinds`, never the main checkout; no `npm ci`. Do not edit hands/ or access/.
src/ui/Panel.ts:
- `PanelControl.fill?: string`; `PanelActions.pickSeed(kind)` and `swatch(kind, signature): string`.
- `openSeeds()`: nothing while the panel is open; else opens on the Seeds page. It must not set `isFreshGaze` (Panel.ts:453). Instead `frame()` sets `selected = true` after its `dwell` call on the first frame of that opening, so only a control already under the gaze when the targets appear is blocked.
- Controls: `lib:old`, `lib:new` (wide, `TAB_X[0]`, `TAB_X[1]`, the shown one lit; New first, then the last shown), `close`, and that library's rows of `SEED_KINDS` not in `HIDDEN_KINDS`: id `seed:<kind>`, round, `fill` from `swatch`, at `TOGGLE_X[i % 2]`, `ROW_Y[Math.floor(i / 2)]`, i = row index mod 5. Names through `toggleLabel`; `STRINGS.pickSeed` at `ROW_Y[3]`.
- A press or dwell on `seed:<kind>` calls `pickSeed(kind)`. Gaze dwell off: the board closes. On: the swatch is lit and the board closes on the first frame whose `gazeId` argument is not that swatch.
- Seeds page only: the look-away time counts only after `away` was false once since `show` placed the board (on the opening frame `board.position` is the last opening's). Getter `unseen` until then.
src/ui/PanelSystem.ts: `drawControl` fills `control.fill`; `init` wires `pickSeed` to `garden?.pick`, `swatch` to render's `kindSwatch`, and makes one caption entity; `listen()` maps `garden:seedAsk` to `panel.openSeeds()`; `update` keeps `Caption` `pickSeedLookUp` up while `panel.unseen && away` (take back first, as SeedSystem.raiseFull).
Tests (tests/unit/ui): one per acceptance line; the layout loops (Panel.test.ts:810-851) run on both libraries.

Acceptance:
- The Seeds page shows two library tabs, Close and one swatch per kind of that library not in `HIDDEN_KINDS`, each with its name beside it; no control on the bottom row; the swatch fill is drawn and names keep their contrast in high contrast
- Opened with the gaze on no control, the first swatch looked at picks after one dwell; a swatch under the gaze at opening picks nothing until the gaze has left it
- With gaze dwell on, after a pick (dwell or pinch) the board stays open, the swatch lit, until the gaze id changes; with it off a press closes at once; `pickSeed` is called once with the right kind either way; Close and the look-away call nothing
- A Seeds board whose centre was never in the box since it was placed is still open after 6 s away; once seen, 5 s away closes it; the settings tabs keep today's look-away
- The caption `pickSeedLookUp` is up while the Seeds board is open and unseen (expiry far ahead), and is taken back when the board is seen or closed; nothing is allocated in frames where that state does not change
- A unit test pins each row's angle above the gaze line for heads 44, 47 and 66 degrees down
- `openSeeds` while any page is open changes nothing; both libraries pass the existing layout rules; the settings tabs, their ids and tests/e2e/12-settings expectations are unchanged; the stand-ins at Panel.test.ts:65 and PanelSystem.test.ts:58 gain the new members; the ui heap test is green

### P5-audio-hum: Audio: the tenth voice (hum, a tanpura-like string)

Owner `backend-dev` · stage 1 · modules: src/audio · after: P2-audio-kinds · about 60 min

Repo /Users/parth_baller/Documents/test-pro/Roomsong, the audio worktree, after P2 is merged into `feat/t193-seed-kinds`; no `npm ci`. The tenth voice, `hum` (bass + family new): a tanpura-like low string.
src/audio/voices/calm.ts: `playHum(ctx, note, time, p, out)`. Two oscillators on one shared `PeriodicWave` (about 20 harmonics falling as 1/n, made once in the Kit) at `p.hz`; the second 2 to 5 cents sharp by `timbre`; both take `p.detune`. Into one peaking BiquadFilter (Q about 4, gain about +12 dB) whose frequency falls exponentially from 14x to 4x the note, the end times `Math.sqrt(p.cutoffMul)`, over 0.6 to 1.0 s by `timbre`. Into the envelope: attack 25 ms, decay tau from `p.release`, sources stopped by 4.5 s. 4 nodes, 2 sources; `note.begin` and `note.add` as `playBowl` does. Constants `HUM_*` in src/audio/config.ts beside the calm block, each with a comment. `HUM_LEVEL` first set so that a full-height note's RMS is near the Bass's in style B.
src/audio/voices/Bass.ts: first line of `trigger`: `if (p.calm) return playHum(...)`.
Tests: bass + new builds the hum graph (2 oscillators, 1 filter, 1 gain) and bass + old the old one; on each ring the hum's pitch equals the Bass's; two plants differ in detune and sweep time; no source lives past 4.5 s; the wave is made once.
Do not edit src/garden: `hum` stays in `HIDDEN_KINDS` until integration takes it out. Report `HUM_LEVEL` as first-pass and that nobody has heard the voice. Listen gate: under 3 of 5 from Parth, `hum` goes back into `HIDDEN_KINDS`; planted hums keep playing.

Acceptance:
- A bass plant with `family: 'new'` plays `playHum`; one without plays the old Bass, unchanged
- At most 4 nodes and 2 sources a note; nothing allocated in the tick beyond the note's own nodes; the audio heap tests are green
- The pitch test covers ten kinds by five rings
- The report says the level is first-pass and that nobody has heard the voice
- src/garden is not edited; with `hum` still in `HIDDEN_KINDS`, typecheck and tests are green

### P6-integration: Integration: app wiring, e2e picker spec, budgets, the whole suite once

Owner `fullstack-dev` · stage 1 · modules: src/app.ts, tests/e2e, src/garden (config.ts: HIDDEN_KINDS only) · after: P1-garden-flow, P2-audio-kinds, P3-render-kinds, P4-ui-picker · about 120 min

Repo /Users/parth_baller/Documents/test-pro/Roomsong, a new worktree on `feat/t193-seed-kinds`, never the main checkout; no `npm ci`. Merge the package branches; if P5 is merged and green, empty `HIDDEN_KINDS` in src/garden/config.ts.
src/app.ts: once `stage` is known, `garden.setPicking(stage === null && !flags.presetSeeds)`.
`openApp` (tests/e2e/support/iwer.ts) adds `presetSeeds` on its own, not through `withoutOnboarding`, with an option to leave it out. Every direct `page.goto` of the app that enters a session gains the flag (specs 06, 13, 22, 23:444, 26-time-lapse, 99).
New tests/e2e/32-seed-picker.spec.ts, picking on; copy the press, look and palm helpers of specs 12, 16 and 25 into it:
1. Two hands: seed 1 arrives with no board. After it is planted a palm-up opens the Seeds page; `lib:old`, `seed:choir` by sight: voice choir, no `family`. Then `seed:bowl`: voice bell, family new. Reload: the same.
2. One hand (`?access=onehand`): palm up, press, palm up again, take from the own palm, plant.
3. Gaze (`?access=gaze`), no-table room: dwell a cell, dwell a swatch, hold the gaze 1.5 s: board open, nothing planted. Look at a cell: planted.
4. Head at the table's pitch: board open, caption `pickSeedLookUp` up.
23-onboarding TC-E2E-03: picking on, real picks for seeds 2 and 3; its limits stay.
Playwright: check that no other run is live; set `E2E_PORT=8091` (8081 is the headset's). Run 26-worst-frame first and report draws and triangles (budgets 60 and 150 000). Then 32 until green, then the whole suite once. A pinned count moved by autoplant's New kinds is updated and listed; a budget is never raised.

Acceptance:
- `npm run verify` is green on the feature branch
- 32-seed-picker passes: two hands, one hand, gaze (nothing planted while the gaze rests after a pick), the reload check, and the board open with its caption at the table's head pitch
- 23-onboarding passes with real picks: first sound within 20 s and first loop within 90 s on the emulator
- 26-worst-frame is at or under 60 draws and 150 000 triangles with ten kinds planted; the numbers are in the report next to the 48 draws of 25 Oct; a number over budget is reported with a plan, not hidden
- The whole suite ran once on a port other than 8081; every pinned number that moved is listed; 10-persistence.spec.ts passes unedited
- The report lists the headset gate steps and what no headset has seen; the task is marked done-pending-device; develop and the main checkout are untouched and nothing is pushed

### P7-picker-polish: Polish: head outlines on swatches, palm cue, name at the hand

Owner `frontend-dev` · stage 2 · modules: src/ui, src/render (RenderSystems.ts) · after: P6-integration · about 150 min

Repo /Users/parth_baller/Documents/test-pro/Roomsong, own worktree from `feat/t193-seed-kinds`. Only after Parth has seen stage 1 on a headset; each item is separate and can be dropped. In this order:
1. Head outlines: render exports each kind's head outline as 2D points from its lathe table (set-up only); `drawControl` in src/ui/PanelSystem.ts strokes it in cream inside the swatch. No new mesh or draw call. Spec the export in API_SPEC 1.8 first.
2. Palm cue: after a pick with no seed handed out within 1.2 s, the board's caption entity shows `onboardPalm` (`onboardPlantGaze` with look-to-select), once per session.
3. Name at the hand: `SeedSystem` (src/render/RenderSystems.ts) raises the kind's `STRINGS` key as a caption on `garden:seedOut`, on its own caption entity with the take-back-first pattern of `raiseFull`. Not while a tutorial caption is up.
4. The seed's current kind is marked on the board (a heavier ring), read from `garden.seeds[0]` through `kindOf`.
5. If Parth wants it by ear: a swatch press plays that kind's note in place of the tick. This needs an engine call specified in API_SPEC 1.2 first and a backend-dev for src/audio.
Rules: no per-frame allocation; captions of at most six words; names stay cream on the backdrop, never text on a kind colour; the board's draw-call deltas pinned in tests/e2e/12-settings.spec.ts do not change.
Tests: one unit test per item; the heap tests of ui and render stay green.

Acceptance:
- Each swatch shows its kind's head outline in normal and high contrast with no new draw call
- The palm cue shows at most once per session, and never when the seed was handed out within 1.2 s of the pick
- The name caption shows once per hand-out and never over a tutorial caption
- tests/e2e/12-settings draw-call deltas and heap check pass unchanged
- Each item was seen by Parth on a headset before it is merged

### P8-hum-loudness: Polish: render-matched loudness for the hum and a ten-kind table

Owner `qa-engineer` · stage 2 · modules: tests/renders, src/audio (config.ts, HUM_LEVEL only) · after: P5-audio-hum, P6-integration · about 60 min

Repo /Users/parth_baller/Documents/test-pro/Roomsong, own worktree from `feat/t193-seed-kinds`. The hum's level was set by estimate in stage 1. Match it by render.
1. In tests/renders/renders.spec.ts, follow the per-voice plant renders near line 516: render a solo full-height plant of each of the ten kinds in style B (voice plus family), measured with tests/renders/measure.ts (integrated loudness).
2. Set `HUM_LEVEL` in src/audio/config.ts so the hum is within 0.3 LU of the Bass plant at the same height, ring and hue. Change no other constant.
3. Report a table of the ten kinds: integrated loudness, peak, and for bass and hum the share of energy above 200 Hz (the measure LLD section 7 used for Bass, specs/03-design/LLD.md:737), because headset speakers may not carry 55 to 147 Hz.
4. Also render the deep bowl at the lowest height: the audio reader estimates it gains about 4.7 dB on the bell there. Report the measured figure; do not fix it without Parth's ear.
This is a Playwright run: check that no other run is live on the machine first, set `E2E_PORT` to a port other than 8081, and run only the render spec.
After it, Parth rates the hum 1 to 5 on the headset for calm, for different from Bass and both bowls, and for audible on the speakers. Record the rating in specs/05-testing/TEST_PLAN.md section 4.6. Under 3: `hum` goes back into `HIDDEN_KINDS`.

Acceptance:
- The hum plant is within 0.3 LU of the Bass plant in style B at the reference height
- The ten-kind loudness table is in the report, with the figures marked measured
- Only `HUM_LEVEL` changed in src/audio; unit tests green
- Parth's rating of the hum is recorded, or `hum` is back in `HIDDEN_KINDS`

## 5. Reviewer notes that did not block (read the ones for your module)

- One hand: in one-hand mode a single open palm facing away from the face for 1.5 s starts Listen (/Users/parth_baller/Documents/test-pro/Roomsong/src/hands/HandSystem.ts:204; /Users/parth_baller/Documents/test-pro/Roomsong/src/hands/poses/palmsOut.ts:15). Hovering over five swatches while choosing is that pose. The pick still completes, because the pinch wakes Listen and presses. Device check: one-hand, hover 3 s before pinching. If it fires, the garden should ignore gesture:palmsOut while an ask is unanswered.
- Gaze sees through the Seeds page's empty slots. GazeDwell assumes controls cover the panel with no gap (/Users/parth_baller/Documents/test-pro/Roomsong/src/access/GazeDwell.ts:91). Reading 'Pick a seed' or the fifth name fills the reticle ring on a cell behind the board. Nothing is planted, because handOut gives no seed, but the ring completes with no effect.
- A seed that returns by tracking loss or a full cell (/Users/parth_baller/Documents/test-pro/Roomsong/src/garden/GardenSystem.ts:132 and :387) forgets its pick, so the whole picker runs again. Suggest clearing the pick only for reasons 'offBed' and 'reset'.
- Dead palm after Close: palm-up ticks come every 400 ms, so '900 ms since the previous palm-up' is never true while the palm stays up. A quick one-hand player who presses Close and turns the palm up again inside 0.9 s gets nothing. Suggest that the hand's own gesture:pinchStart also ends its raise (GardenSystem.ts:120). The same happens when the ask arrives while the settings tabs are open.
- Any accidental 0.4 s palm-up within 35 degrees (/Users/parth_baller/Documents/test-pro/Roomsong/src/hands/config.ts:33-34) now opens a 40 by 28 cm board where it used to give a small seed. In gaze mode a resting hand does it too. Device check.
- A pinch by sight takes whichever of control or plant is nearest the eye line (/Users/parth_baller/Documents/test-pro/Roomsong/src/hands/TargetPicker.ts:70-100). The board's lower edge is 34 cm below the eyes, so tall plants on the far side stand behind row 2. A pinch at the bass or hum swatch may take a plant. Device check with a planted far side.
- Stage 1 swatches are a colour disc and a placeholder name, with no shape at the moment of choice. P7 item 1 (head outline on the swatch) is the first thing to pull forward; it is what makes 'shape, not colour alone' hold on the board.
- The cue ring shows the right hand's hover before the left's (/Users/parth_baller/Documents/test-pro/Roomsong/src/ui/Panel.ts:434-435). A raised right palm in line with the board takes the ring away from the left hand's choice. The press itself is right.
- After a pick with no palm up (always the case in one-hand mode) nothing says to open the hand again. Reuse the onboardPalm caption or the palm icon once per session.
- Draws: 58 of 60 by the design's own arithmetic leaves no headroom. P6 must report the number and not raise the budget.
- Sound against the code: the preset first seed keeps the 18.5 s first-sound path; swatches use the 4 cm radius at 5.5 cm pitch; the board is 0.55 to 0.59 m from the eyes; 'Pick a seed' is 3 words; the board can reopen at most about once per 1.3 s, under the 3 per second cap; the one-hand flow completes through the same-hand palm pick (D-062); no control is under the gaze when a cell dwell opens the board.
- Not checked: nothing was built or run. The Quest 3's vertical field is my estimate. I did not review the audio, schema or render packages beyond the cut line. The main risk is that blockers 2, 3 and 5 depend on real heads and hands that no emulator run will show.
- Read and found true: the live build (40191a5, src/persistence/schema.ts:47 and :54) rebuilds plants and seeds from listed fields, so it drops `family` and keeps the garden. `codex.discovered` is written by nothing. The New-garden backup key is written and never read. The second-tab rule (src/app.ts keepSaved) is untouched. tests/e2e/10-persistence.spec.ts compares its own fixtures with `toEqual` and can stay unedited.
- Every file, function, constant, test line, spec section, D-ID and commit the design cites exists as named (Bell.ts:20, Pluck.ts:119 and :146, Choir.ts:45, Pad.ts:30, Panel.test.ts:65 and :810-851, PanelSystem.test.ts:58, PlantRenderer.test.ts:297, GardenSystem.test.ts:1137, strings.test.ts:95, 8ef4217, D-076). No two packages edit one folder in the same wave; ui may import render (tests/unit/ui/imports.test.ts BELOW list).
- API_SPEC section 4 says the validator "repairs two things only". P0 must name the third (a `family` that is not `'new'` is dropped, the state is kept), and P1 must update the header comment of schema.ts.
- `setSeedKind` from a New kind to an Old kind must remove the key; a plain spread keeps `family: 'new'`, and the seed would still play the calm voice. Add that case to P0's rules test. Also test `pick` of the kind the seed already has: the state does not change, but the seed must still count as picked.
- P6 only teaches `openApp` the `presetSeeds` flag. These open the app directly and would get the picker: tests/e2e/26-time-lapse.spec.ts:59 and :74, 22-save-restore.spec.ts:426, 23-onboarding.spec.ts:444, 13-anchor-store.spec.ts:176, 06-room.spec.ts:719, 99-polish-shots.spec.ts:57, and tests/tools/video.spec.ts (the judge video).
- Specs that read `autoplant` of 40 or 80 but are not in P6's run: 06-room.spec.ts:739, 07-bed.spec.ts:224, 19-first-loop.spec.ts:308, 27-heap.spec.ts. Autoplant now adds New kinds (five more meshes, calm voices), so their pinned numbers may move unseen.
- Gaze through the board: GazeDwell blocks the bed only within 4 cm of a panel control (src/access/GazeDwell.ts:91-92 and :184-189). The Seeds page has an empty bottom row and label columns, so a dwell there can select what lies behind. The Access tab has the same gaps today, but the Seeds page opens on every gaze plant. By arithmetic from the constants (not run), on the floating bed the Listen orb sits behind the bottom row's text. Check on the headset.
- P0's spec list misses UX section 5 (colour comes from the kind, no longer from hue), UX section 9.5 (five shapes become ten) and the API_SPEC section 1.6 sentence that the panel's controls cover it.
- Saved gardens keep their data, but every old plant changes colour (hue to kind colour). Gardens made on develop tonight change from the calm voices back to the old ones. Both follow from the decision; say so in the release note.
- Once-per-raise rule: if the settings panel is open, or the board closed by look-away, a palm that stays up gets nothing until it has been down 0.9 s, and nothing tells the player. A palm wobble longer than about 100 ms counts as a new raise and reopens the board after Close (src/hands/poses/palmUp.ts restarts the 400 ms hold).
- Not checked: nothing was run, built or heard. I did not read the hands target picker (pinch by sight on a swatch), the draw-call arithmetic beyond the recorded 46 plus vine, or the audio node counts. The gaze geometry above is arithmetic only.
- P2's acceptance contradicts itself and verify will be red as written. tsconfig.json:18-20 typechecks tests/**/*.ts, so a required `calm: boolean` on VoiceParams breaks the fixtures at tests/unit/audio/voices.test.ts:58-64, voicePool.test.ts:60, chordTone.test.ts:39, mapping.test.ts:87, layers.heap.test.ts:109, counterLine.test.ts:64 and placed.test.ts:206. The same seven files needed edits when `timbre` was added today (git diff 2dfb3a8^1 2dfb3a8). The brief says voices.test.ts and the heap tests pass 'unedited'. Fix: allow the one-line fixture edits in the brief.
- Draw calls: 58 of 60 is arithmetic on an old number. The last measurement is 48 draws and 103 972 triangles on 25 Oct (commit 3e42c1a; specs/08-status/PROGRESS.md:95). Five more plant meshes cost +10 in the emulator, which draws each mesh once per view (tests/e2e/26-worst-frame.spec.ts:11). Since 3e42c1a only HandCue (dev flag) added meshes, so 58 is credible, but the margin is one mesh and there is no cheap fallback if it reads over 60. Run 26-worst-frame on develop first for a baseline. The design's 'about 60 with the board open' double counts: the 48 already has the panel open with its ring and fill (26-worst-frame.spec.ts:5-7).
- Triangles and script time are safe by arithmetic. Existing heads are 240, 200, 112, 216, 252 triangles (tests/unit/render/PlantRenderer.test.ts:271); new heads at 252 at most give about 112 000 of 150 000 with 80 plants and shells in both views. JS was 2.03 ms of 6 (25 Oct) and the design adds no per-frame work. VOICE_CAP 24 holds by construction (src/audio/VoicePool.ts:52-60 steals).
- Playwright's default port is 8081 with strictPort and no reuse (playwright.config.ts:14, :42-46). That is the headset's dev server tonight, so P6 must set E2E_PORT (the built page uses port + 1000). The P0 and P6 briefs name the main checkout, not a worktree: saving a source file there reloads the headset page (headset memory note). Both must work in a worktree.
- P6's ten-spec run misses specs the change touches. 19-first-loop (autoplant=80 at :308, draws at most 60 at :337), 27-heap (autoplant=40 becomes 20 New plants; it is the browser allocation gate), 06-room (vine at autoplant=80, :739), 29-room-matrix (emits palm-up at :139), and 09-audio and 21-styles (plant voices in style B go back to old). The whole suite was 64 tests in 11.3 min (.tmp/e2e-develop.log). Run all of it once instead.
- The presetSeeds default in openApp must not ride on withoutOnboarding. tests/e2e/support/iwer.ts:187-197 adds flags only when onboarding is false, but tests/e2e/support/shaky-play.ts:192-193 opens tutorial scenes with onboarding: true and plants several seeds by palm-up, and 30-shaky-hands is in the run list. Add the flag independently, with its own option.
- A Playwright spec can pick a seed with what exists: a real pinch on a panel target (tests/e2e/12-settings.spec.ts:292-322 press(id)), a gaze dwell on a control (12-settings.spec.ts:580 lookAt; 25-gaze.spec.ts:226 panelAt), and palm-up by hand orientation (16-seeds.spec.ts:72). But every helper is local to its spec, 100 to 250 lines each, and 32-seed-picker needs all four sets. TC-E2E-03 takes 35 s of the 60 s scenario limit (playwright.config.ts:20); two more presses on a loaded Mac need a test.setTimeout.
- Time: 4 hours is the critical path with zero slack (P0 60, P1 45, P4 75, P6 75 = 255 min), no review, and P6 planned as one Playwright run for a new three-mode spec. My estimate is 6 to 8 hours to a green browser run. Unit-green tonight is realistic; the headset run is tomorrow. P3's 90 min includes five lathe tables nobody will see, against 45 pair checks, plus rewriting pinned expectations (PlantRenderer.test.ts:238, :271).
- The cut line without P3 is weak. P0's swatch colours would match no plant and no seed, and a picked seed would look the same as before the pick, so there is no confirmation until it sings. P6 lists P3 in depends_on. The kill switch ?dev=1&flags=presetSeeds leaves no way to reach New kinds and plants lose D-075's calm voices (every preset seed is Old), so the real fallback is 'do not merge'. Say in the plan that develop gets the feature only after Parth's headset run.
- Audio cost: no worse than today's develop in the worst case, except the hum. Its tails run to 4.5 s against the Bass's short thump, so it holds channels longer; by the design's own figure the pool is full near 16 New plants and steals from then on. Quest audio cost is unmeasured (D-075: 64 to 83 ms per audio second offline against 42 to 62). Device step: 24 or more New plants with several hums, listen for crackle, report fps.
- Gaze mode: after a dwell-pick the board closes and the gaze rests where the swatch was. GazeDwell then sees a new target (src/access/GazeDwell.ts:170-176), and a free cell behind the fifth swatch row would be planted after one dwell. The Seeds page also has gaps with no control, so it does not block the gaze the way the full tabs do (GazeDwell.ts:101-102). Add a browser assertion that nothing is planted until the gaze moves. Look-to-select has no headset run at all (TEST_PLAN.md TC-DEV-06).
- Each board opening and each library switch redraws and uploads a 1000 x 700 canvas (src/ui/PanelSystem.ts:403-423). This now happens once per seed, not once per settings visit. Frame time at the opening is a device check.
- Palm-up is the weakest gesture on the device: Parth's natural palm sat at 0.4 to 0.8 against the 0.82 needed (headset memory note; src/hands/config.ts:33). One-hand mode now needs two palm-ups per seed. If TEST_PLAN 4.6 gets a device script, batch: first loop with picks by a new person, board seen from the palm, one-hand, look-to-select, ten kinds by ear and by eye, a full New bed for crackle and fps.
- Not checked: nothing was run (no tests, build or browser); every budget figure is arithmetic on the 25 Oct measurement. I did not read AudioEngine's sync or the hands' TargetPicker in full. No device behaviour is verified.
