# Device script S2 — shaping, Listen, restore, pause (T-154)

**Status:** the shaping blocks (TC-DEV-03) are written; on 15 Oct only block 1 could be run. Nothing in this script has been tried on a headset. · **Owner:** qa-engineer · **Written:** 2026-10-15 against `develop` ce33e46 (T-146 the shaping gestures, T-147 their drawing, T-127 seed delivery, T-128c the bed on the table). Blocks 6A to 6D (Listen, TC-DEV-04) were written on 2026-10-16 against the T-148 branch at 088ea07, before its merge. Blocks 7, 8 and 9 (TC-DEV-05, 08 and 06) were written on 2026-10-17 against `develop` dca03de (T-128e save, restore and pause; T-160 the accessibility set; T-152 is not built). The hand-over moved from block 9 to block 10.

This script produces results. It contains none.

**What S2 covers.** TC-DEV-03, shaping a plant with bare hands: pinch and hold (the lift), pull to grow or shrink, drag to another cell, drag off the bed to remove it, the 5-second undo, and the glide home when the headset loses the hand mid-gesture. Then TC-DEV-04, Listen: going in and out with bare hands, the dim and the halo over a real room, the near plants louder, the poses that must not fire by accident, and the 10-minute end. Then TC-DEV-05, the garden coming back (block 7); TC-DEV-08, pause and resume (block 8); and TC-DEV-06, the whole loop with one hand and with the eyes alone, and the beat ring (block 9). Listening review #1 (the other half of T-154) is not in this file.

How sure each step is (the marks of DEVICE_SCRIPT_S1):

- **No mark:** a step about our own pages or code, checked against the source on `develop` ce33e46.
- **(unchecked):** a step about the headset's own menus, the browser or the Mac's console, which nobody on the team has seen yet. If it looks different, do the nearest thing and write down what it was called.
- **(from the plan):** a step about a part of the app that is not on `develop` yet (the wiring of T-128d). It is written from API_SPEC "Who calls it (T-128d)", not from code. When T-128d lands, Claude checks the step against the code and takes the mark off.
- **Blocks 6A to 6D** are checked against the T-148 branch at 088ea07 (Listen, in review when written), not against `develop`. When T-148 is merged, Claude checks them against `develop` and takes this line off.
- **Blocks 7 to 9** are checked against `develop` at dca03de, where the app plants, plays, saves and restores (T-128d, T-128e) and one-hand mode, look and hold and the beat ring are in (T-160).

Every block starts with **Can be run today** or **Needs: a task**. "Today" means `develop` at ce33e46. In the app today you can enter a session and see the bed on your table, but you cannot plant, shape or hear a plant: `GardenSystem` and the plants' drawing are joined to the app by T-128d (the first loop, in progress). The only stand-in today is the bed preview, `proto/bed/`: its four buttons **play** each shaping with a scripted hand (`proto/bed/README.md`, "Shaping a plant (T-147)"). It shows the drawing, never your hand: it cannot answer a TC-DEV-03 pass rule.

**What a sitting needs.** Everything in DEVICE_SCRIPT_S1 "Before you start": Headset, once; Leaving a session with hands only; The Mac's console over USB (a bonus here, needed for block 1 route A); The room; Five things beside you (the white sheet for blocks 1 and 9, the coin for blocks 7 and 8); the tape-measure table. One address for the whole sitting (S1, "One address for the whole sitting"). Controllers out of reach: if you ever need one, write down where. Sit at the table, belly at its edge, as in S1.

## The sitting at a glance

| # | Block | Answers | Time | Can be run |
|---|---|---|---|---|
| 0 | The build on the headset | is T-128d in the build · the address | 10 min | today (the address); the build check needs T-128d |
| 1 | The shaping played on the bed preview | the lift, the ladder, the ghost, the edge warning, the burst, the petal and the glide, seen in passthrough · frame rate while they show | 15 min | **today** (`proto/bed/`) |
| 2 | Hold and pull | TC-DEV-03 pull: 10 tries · the lift · the 2 cm dead zone · shrinking on a table | 15 min | needs T-128d |
| 3 | Drag to another cell | TC-DEV-03 drag: 10 tries · the ghost shows the cell before release, the plant lands there · the hole | 15 min | needs T-128d |
| 4 | Drag off the bed, and undo in 5 s | TC-DEV-03 drag-off and undo: 10 tries each · sideways and towards the body · after 5 s it is final · flash cap | 20 min | needs T-128d |
| 5 | The hand lost mid-shaping: the glide home | FR-HND-15 for a drag and a pull · no plant lost or doubled | 10 min | needs T-128d |
| 6A | Listen: in and out | TC-DEV-04 (starts within 2 s) · palms out, the orb, the wake, the waking pinch, one hand, a pause · no Listen before the garden (D-050) | 20 min | needs T-148 and T-128d |
| 6B | Listen: the look and the sound | TC-DEV-04 (the halo; the sound from each plant as you turn) · the dim over real passthrough · the near plants louder · frame rate | 10 min | needs T-148 and T-128d |
| 6C | Listen by accident | D-050: palms down over the bed, a palm up on the lap or the table edge, palm up for a seed against the wake, the Quest's own palm gesture | 15 min | needs T-148 and T-128d |
| 6D | Ten minutes of Listen, and "Goodnight" | the 10-minute end · the Listen half of TC-DEV-07 · wakes at rest | 12 min | needs T-148 and T-128d |
| 7 | The garden comes back | TC-DEV-05 · after a reload and after closing the Browser: the same cells, the bed at the coin within 4 s or placed again, the same key · a plant made just before closing is kept · the next day one new seed · storage blocked: "Saving unavailable" once | 20 min | needs T-128e |
| 8 | Pause and resume | TC-DEV-08 · headset off 10 s (3 tries) and the menu 30 s: the garden, the bed and the sound come back, in time, without a pinch · a change made just before is kept | 15 min | needs T-128e; the fade and the phase checks need T-152 |
| 9 | One hand, and look and hold | TC-DEV-06 · one hand takes the seed off its own palm · the bed, plants and Listen by looking, the wake by a doubled look · the panel blocks the gaze · the 8°/s hold · the dot over a bright room · the beat ring, read and in time | 50 min | needs T-160 |
| 10 | Hand the results to Claude | the filled results sheet | 5 min | today |

**Time.** Blocks 0 to 5 and 10: 90 minutes; about 1 h 55 with 15 minutes of setup and one 10-minute break. Block 1 can also be run alone today, right after S1 block 4 (same page, same bookmark): then the S2 sitting is 75 minutes of blocks. Listen (6A to 6D) adds 57 minutes: with it the sitting is about 3 h with setup and two breaks. Listen can also be its own sitting: blocks 0, 6A to 6D and 10, 72 minutes of blocks, about 1 h 35 with setup and one break. Blocks 7 to 9 are 85 minutes; as their own sitting (blocks 0, 7, 8, 9 and 10) 100 minutes of blocks, about 2 h 5 with setup and one break. All of S2 is 3 h 52 of blocks: split it over two sittings.

**Order.** 0, then 1, then 2 to 5 in order: block 2 makes the plants of different heights that block 3 moves; block 4 removes and brings back; block 5 needs plants in their cells. Then 6A to 6D in order (6D last: it is ten minutes of sitting still), then 7, 8 and 9 in order, then 10. Block 7 plants a small garden of its own and block 8 pauses it; block 9 makes new gardens, so it comes after both. If S1 sitting 2 is on the same day, run S2 blocks 2 to 5 after S1 block 11 and before S1 block 12 (which ends with New garden), and skip S1 block 13 step 11: block 5 here asks the same, with the numbers.

**A try, and first try.** A try is one pinch and one release, aimed at a plan you made before the pinch ("this plant, up to the top ring"). Moving your hand while you hold is part of the try: the ghost is there to guide it. A **first-try success** is a try that gives the planned result without a second pinch. A miss is not corrected and not repeated: count it and go on (the rule of TC-DEV-00).

Pass and fail: each block has its rule. Where the documents give a number, the rule is that number, with its source. Where they give none, it says "write down what you see", and that is the result.

---

## Block 0 — The build on the headset (10 min)

**Can be run today** for the address. The build check **needs: T-128d.**

**Purpose:** open the app from the one address, and make sure the build holds the first loop.

**Checked against:** `src/core/flags.ts` (`dev=1`, `perfHud`, `eventLog`, `autoplant`), `src/app.ts` (`__roomsong` with `dev=1`), `src/garden/GardenSystem.ts` (`autoplant` plants only into a garden with no plants).

### Steps

1. Do S1 block 0 (route A or B) for the build of the day. Write down the build.
2. Ask Claude whether that build holds T-128d (and, for blocks 7 to 9, T-128e and T-160). If it lacks T-128d, run block 1 only and stop.
3. Make two bookmarks on that address:
   - **"S2, shaping":** the app with `?dev=1&flags=perfHud,autoplant=20` at the end of its address.
   - **"S2, console":** the app with `?dev=1&flags=eventLog,autoplant=20`. The event log costs frame time: read `fps` only from the first bookmark.
4. `autoplant=20` puts 20 plants on the bed, spread over all five rings, but only into a garden with no plants (`GardenSystem.ts`). Until T-128e nothing is saved, so every load is a fresh garden. From T-128e on, a saved garden comes back: first empty it with **New garden** (S1 block 12, step 11: hold the button 2 seconds), then reload.

### Write down

| Field | Value |
|---|---|
| Address and build | route A or B; the commit or short hash |
| T-128d in the build; T-128e and T-160 | yes / no each |

---

## Block 1 — The shaping played on the bed preview (15 min)

**Can be run today.**

**Purpose:** see the drawing of every shaping on your real table, in passthrough, before any hand can do it. No sound, no hand, nothing to pinch: a script plays a right hand on the plant nearest your eyes.

**Answers:** from T-147: is the 1 cm lift visible · are the ladder's five rings readable on a real table · does the charcoal edge band show over passthrough (a dark colour over the real room is the same open question as the tide's dark band in S1 block 4) · is the burst seen and does it lead the eye to the petal · is the 0.15 s glide a glide or a jump · frame rate and flash count while each plays. It does **not** answer TC-DEV-03.

**You need:** the bed preview's bookmark from S1 block 4 (`…/proto/bed/?dev=1&flags=perfHud`); the white sheet; for route A, the USB cable and the Mac's console (S1, "The Mac's console over USB").

**Checked against:** `proto/bed/README.md` ("Shaping a plant (T-147)"), `proto/bed/index.html` (the buttons **Pull it up**, **Drag it to a free cell**, **Drag it off the bed**, **Lose the hand mid-drag** and the box **Slow motion (10 times)**), `proto/bed/src/main.ts` (the script's times: the lift at 0.3 s, the move until 1.3 s, the release at 3.3 s, the end 0.5 s later, and a drag off the bed ends only when its petal is gone, 5 s after that; the console handle `__bed.play`, which exists on the built page too), `src/render/config.ts`.

**Know this first:**

- The page's played hand pinches the plant at its head, 9 cm up (`HAND_ABOVE_M` in `proto/bed/src/main.ts`). The app does not: it picks a plant within 4 cm of its **foot**, the centre of its cell on the bed (API_SPEC §1.10 rule 7). Do not copy the page's hand in blocks 2 to 5.
- As in S1 block 4: the switches and buttons are on the flat page, which is hidden in a session. A play at normal speed is over in about 4 s (9 s for the drag off), sooner than you can enter. Hence the two routes below.

### Steps, on the flat page

1. Open the bookmark. Leave **Garden** on "13 sample plants". Pinch each of the four play buttons in turn and watch it end before the next. Write down anything you could not see on the headset's flat screen.

### Steps, in passthrough

Route A, with the console (normal speed):

2. Pinch **Enter XR**. On the Mac, in the page's Console (S1, "The Mac's console over USB", steps 1 to 4), type `__bed.play('pull')` and press Enter. Watch. Wait 5 seconds.
3. The same with `__bed.play('drag')`, then `__bed.play('dragOff')` (wait 10 seconds: the petal stays 5 s), then `__bed.play('lost')`.
4. Lay the white sheet under the ring and play `__bed.play('dragOff')` again. Leave the session.

Route B, without a cable (10 times slower):

2. Tick **Slow motion (10 times)**. Pinch **Pull it up**, then at once pinch **Enter XR**. In slow motion the hold starts at 3 s, the hand moves until 13 s, and lets go at 33 s, so most of it plays in the session. (unchecked: whether the page's clock carries on through the Enter. If nothing moves, write that down: only route A is left.)
3. Leave. Do the same with **Drag it to a free cell**, **Drag it off the bed** (it ends about 88 s after the pinch) and **Lose the hand mid-drag**.
4. Lay the white sheet under the ring and do **Drag it off the bed** once more. Untick **Slow motion**.

For every play, watch the panel right of the ring: write down the lowest `fps` and the highest `draws` and `flash` while the shaping shows.

5. Tick **Reduced motion**, and play the drag off the bed once more (route A or B): no burst, the petal fades in at its cell; the glides stay. Untick it.

### Write down

| Question | Answer |
|---|---|
| The lift (1 cm) and the glow when the hand pinches | seen / not seen |
| The ladder: five faint rings round the plant while it is pulled | readable / faint / not seen |
| The stem stretching as the hand rises | smooth / steps / not seen |
| The ghost: the ring of the cell the drag will land on, lit | seen / not seen |
| Past the edge: the plant at half brightness | seen / not seen |
| Past the edge: the dark band just outside the glass, on your table and on the white sheet | seen / not seen, for each |
| The burst: petals drifting from the release point back to the cell | seen; does it lead your eye to the cell? |
| The petal over the cell, shrinking for 5 s, then gone | seen; found without searching? |
| Lose the hand: the plant waits at half brightness, then goes back to its cell | a glide / a jump / not seen |
| Reduced motion: the petal fades in, no burst | yes / no |
| Route used | A / B |
| Panel during the plays | lowest `fps`, highest `draws`, highest `tris`, highest `flash` |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Frame rate | usual `fps` at least 72, never below 60 | Golden Rule 5, TC-PERF-01 |
| Drawing budget | `draws` at most 60, `tris` at most 150,000. In the emulator a play adds 1 draw call per eye: the ladder or the edge band, or the petal and its burst (13 plants in a session, both eyes, with the panel: 14 draw calls and 11,748 triangles before a play) | Golden Rule 5, `proto/bed/README.md`, API_SPEC "Shaping as drawn" |
| Flashing | `flash` at most 3 | FR-UI-11 |
| The look of each shaping | write down what you see. Parth's answers go to the art pass (T-163) | from T-147 |

### If it fails

- `__bed` is not defined in the Console: the Console is on another page. Click **inspect** under `proto/bed/`.
- The petal or the burst appears beside you, not on the bed: you were not facing the table when the session started (S1 block 4, "If it fails").

---

## Block 2 — Hold and pull (15 min)

**Needs: T-128d.** The commit of a pull and the drawing are checked against code; that the app joins them is **(from the plan)**.

**Purpose:** grow and shrink plants with one hand, ten tries, and see whether a pinch reaches the plant you mean.

**Answers:** TC-DEV-03 (pull, at least 9 of 10 first try) · US-05 · FR-HND-08 · FR-HND-04 on a plant (4 cm round its foot) · FR-HND-16 (a held plant stays your hover) · from T-147: the lift and the ladder with a real hand · computed, not measured: how far a pull can go down on a real table.

**You need:** the "S2, shaping" bookmark; for step 9, the "S2, console" bookmark and the console.

**Checked against:** API_SPEC §1.1 (`PULL_RANGE_M` 0.25, `heightAfterPull`), §1.4 ("Shaping as built (T-146)", `DRAG_DEAD_ZONE_M` 0.02, `HIT_RADIUS_M` 0.040, `HOVER_DEAD_BAND_M` 0.005, the `pull` row of the release table), §1.8 ("Shaping as drawn (T-147)"), §1.10 rule 7; `src/garden/config.ts` (`NEW_PLANT_HEIGHT` 0.55); `src/render/config.ts` (`PLANT_PINCH_LIFT_M` 0.01, `PLANT_STEM_MIN_M` 0.03, `PLANT_STEM_MAX_M` 0.14, `LADDER_MARKS` 5, `HOVER_CUE_MS` 100); UX §3.4.

**Know this first:**

- **Where to pinch:** a plant is picked within 4 cm of its foot, the middle of its cell on the bed; the nearest plant wins (FR-HND-04, API_SPEC §1.10 rule 7). The plant's head, 9 cm up on a new plant, is outside that. Before each pinch the plant your fingers would take glows 20 % brighter with a soft outline (the hover cue, UX §3.4).
- **What a pinch does:** the plant lifts 1 cm and glows, and stays lifted while you hold. For the first 2 cm of hand travel nothing else happens. After 2 cm, if your hand moved at least as much up or down as sideways, it is a pull, and it stays a pull until you let go: the plant never moves cell (FR-HND-08).
- **How much:** 25 cm of hand travel is the whole range from the shortest plant to the tallest (FR-HND-08). 10 cm up adds 0.4 (US-05). The five ladder rings are 6.25 cm of hand apart (API_SPEC "Shaping as drawn"). The stem is 3 cm at the bottom and 14 cm at the top, so it grows slower than your hand rises (`src/render/config.ts`).
- **A new plant** (and every autoplanted one) is at 0.55: 11.25 cm of hand up to the top, 13.75 cm down to the bottom (computed from `NEW_PLANT_HEIGHT` and `PULL_RANGE_M`).
- **Down on a table** (computed, not measured): the pinch starts at most 4 cm above the bed, so one pull can go down only as far as the table lets your fingers: about 0.16 at most. Taking a new plant to the bottom ring then needs four pulls or more. Steps 6 and 7 find out.
- **Sound:** the soft tick on the pinch and the quiet live preview of UX §3.4 are not built (T-147 left them for T-164 or T-128d). Write down what you hear; there is no rule for it yet.

### Steps

1. Open the "S2, shaping" bookmark and pinch **Enter the garden** (or the app's enter button of the day). The bed is on your table with 20 plants. If the help or a hint asks for a first plant, follow it, then go on.
2. **Dead zone, three tries.** Pinch a plant, hold still, let go. The plant must lift 1 cm while held, settle back, and nothing else changes. Then pinch, move your hand about 1 cm (a fingertip's width) in any direction, and let go: the same. Count the tries where something changed.
3. **Up, five tries.** Pick a plant you can reach easily. Pinch it at its foot and raise your hand slowly until the tip of the stem reaches the top ring of the ladder. Hold still for a second, then let go. Each try on a different plant, across the rings (inner and outer, left and right).
4. After each up try, look: did the plant you aimed at lift at the pinch? Did it stretch and stay in its cell? After you let go, did it keep the height it showed, without a jump?
5. Write down per try: success yes / no; and if no, what happened (another plant took the pinch, the plant moved instead, it jumped at release, it shrank).
6. **Down, five tries.** Pick five different plants. Pinch each at its foot and lower your hand until your fingers touch the table, then let go. Same questions as step 4, but it must shrink.
7. **Shrink one plant to the bottom.** Choose a plant at 0.55 (one you have not pulled). Pull it down again and again until its stem's tip is at the lowest ladder ring. Count the pulls.
8. **The far side, one try.** Pull up a plant on the outer ring, on the far side of the bed (about 75 cm from your head). Could you reach it seated, without standing up?
9. **The numbers, optional, with the console** (from the plan). Leave, open the "S2, console" bookmark, enter, open the Console (S1, "The Mac's console over USB"). Pull one new plant up by about one ladder ring and let go. The Console line `[events] gesture:release` shows `gesture: 'pull'` and its `dy` in metres; read the collapsed one-line preview, not the expanded object, because the app reuses that object for the next event (unchecked: what the Console shows). Then type `__roomsong.garden.state.plants.map(p => p.height.toFixed(2)).join(' ')` and find the new height. It should be 0.55 + `dy` / 0.25, at most 1.
10. Leave the session.

### Write down

| Field | Value |
|---|---|
| Dead zone, 3 tries: tries where something changed | n/3 |
| Up: first-try successes | n/5, with what went wrong |
| Down: first-try successes | n/5, with what went wrong |
| Pull, both together | n/10 |
| Pulls to take a 0.55 plant to the bottom ring | n |
| The far-side outer plant: reached seated | yes / lean / stand |
| Where you pinched by habit before you knew the rule | foot / stem / head |
| The lift (1 cm) under a real hand | seen / not seen |
| The ladder under a real hand | readable / faint / not seen |
| The plant drawn over your fingers (no hand is drawn, D-027) | fine / confusing, words |
| Sound on the pinch and while pulling | words |
| Step 9: `dy`, the height before and after | numbers |
| Panel: `fps` usual and lowest, `draws`, `tris`, `flash` while pulling | numbers |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Pull | at least 9 of 10 first-try successes | TC-DEV-03 |
| A pull never moves a plant | 10 of 10: no plant changed cell in a pull | FR-HND-08, US-05 |
| The height shown is the height saved | no jump at release in any try | FR-HND-08, US-05, API_SPEC "Shaping as drawn" |
| Dead zone | nothing changes in 3 of 3 | FR-HND-08/10, API_SPEC §1.4 (`DRAG_DEAD_ZONE_M` 0.02) |
| Step 9 | the new height is 0.55 + `dy` / 0.25, at most 1, to two decimals | FR-HND-08, API_SPEC §1.1 |
| Shrinking on a table, the far side, where you pinch | write down what you see. The spec gives no number | — |
| Frame rate, budget, flashing | as block 1 | Golden Rule 5, FR-UI-11 |

### If it fails

- Another plant takes the pinch, often: write down on which ring. Inner-ring cells are 4.7 cm apart, so their 4 cm spheres overlap by design (UX §2); the pinch test of S1 block 2 decides the hit radius (3.5 to 4.0 cm, T-105). If that test changed it, the new number applies here.
- The plant moves when you meant to pull: your first 2 cm went more sideways than up. Write down how often; it decides whether the dead zone or the tie rule changes (FR-HND-08 is provisional until T-105, UX §4).
- No plants on the bed: the garden was not empty when it loaded (block 0, step 4).

---

## Block 3 — Drag to another cell (15 min)

**Needs: T-128d.** As block 2: the commit and the drawing are checked against code; that the app joins them is **(from the plan)**.

**Purpose:** move plants with one hand, ten tries, and check that the lit cell is where the plant lands.

**Answers:** TC-DEV-03 (drag at least 9 of 10 first try; the hover cue shows the cell before release and the plant lands in that cell) · US-07 · FR-HND-10 · FR-HND-16 · from TC-DEV-00: the game commits on release, and opening the fingers moves the pinch point · from T-147: the plant hanging at your fingers, the ghost cell.

**You need:** the session of block 2, or the "S2, shaping" bookmark again.

**Checked against:** API_SPEC §1.4 ("Hover as built", "Shaping as built (T-146)", the `drag` row of the release table, `REVERT_LERP_MS` 150), §1.1 (`bedZone`: the hole is under 0.09 m from the centre), §1.8 ("Shaping as drawn"); `src/render/config.ts` (`HOVER_CUE_MS` 100); UX §2 and §3.4.

**Know this first:**

- After the 2 cm dead zone, if your hand moved more sideways than up or down, it is a drag until you let go (FR-HND-10). The plant hangs at your fingers.
- The **ghost** is the ring of the cell a release would fill, lit. It is the free cell nearest your fingers: if the cell under you holds a plant, the ghost is on the nearest free one (FR-HND-16, UX §7). It moves to a neighbour only when that one is at least 0.5 cm nearer, so it does not flicker (FR-HND-16).
- Let go over the bed: the plant glides into the ghost's cell. Let go over the hole in the middle, more than 3 cm inside the inner ring (under 0.09 m from the centre): it glides back to its own cell in 0.15 s and nothing changes (FR-HND-10, US-08). A release anywhere on the bed never removes a plant (US-08).
- Between the drawn edge of the glass and 5 cm past the outer ring the ghost still shows a cell on the outer ring: a release there moves the plant to that ring, it does not remove it (FR-HND-11; the glass ends 1.25 cm past the outer ring, UX §2). Block 4 is the removal.
- Sound: the tick when the ghost changes cell and the bump on a release in the hole (UX §3.4) are not built (T-147 row). Write down what you hear.

### Steps

1. In the session, look at the bed. Choose a plant and an empty cell two or three cells away. Look at the empty cell: that is your plan.
2. Pinch the plant at its foot, move your hand flat over the bed to the empty cell, watch the ghost, and let go only when the ghost is on your cell.
3. Look: did the plant land on the cell the ghost showed just before you opened your fingers? On the cell you planned?
4. Do it ten times in all: short moves and long ones, along a ring and across rings, at least two onto the outer ring and two onto the inner ring, at least one to the far side of the bed (seated reach: 75 cm from your head). For two of the ten, aim at a cell next to a plant, so that the ghost has to choose.
5. **Into the hole, three tries.** Drag a plant over the hole in the middle and let go. It must go back to its own cell.
6. **The other hand, two tries.** Two drags with your other hand. The same questions.
7. Stay in the session for block 4.

### Write down

| Field | Value |
|---|---|
| Drag: first-try successes | n/10, with what went wrong |
| Landed on the cell the ghost showed before you opened | n/10 |
| The ghost moved at the last moment, as your fingers opened | n/10 |
| Landed on the cell you planned | n/10 |
| Into the hole: back to its own cell | n/3 |
| The other hand | n/2 |
| The plant at your fingers: easy to follow; does it hide the ghost? | words |
| The ghost on the outer and inner rings | clear / faint |
| Sound while dragging and on release | words |
| Panel: `fps` usual and lowest, `draws`, `tris`, `flash` while dragging | numbers |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Drag | at least 9 of 10 first-try successes | TC-DEV-03 |
| The cell before release is the cell it lands on | 10 of 10 on the ghost's cell as last seen | TC-DEV-03, FR-HND-16, US-07 |
| The hole | 3 of 3 back to their own cell, nothing changed | FR-HND-10, US-08 |
| No plant removed on the bed | none removed in any try of this block | US-08 |
| Frame rate, budget, flashing | as block 1 | Golden Rule 5, FR-UI-11 |

### If it fails

- The plant lands one cell off the ghost: write down how often and on which ring. The release is read on the sample where the fingers open (API_SPEC §1.4); this is the one place where the pinch page's "judged at the start" and the game's "commit on release" differ (TC-DEV-00).
- The ghost flickers between two cells while you hold still: write down the ring. The dead band (0.5 cm) may be too small for real hands.

---

## Block 4 — Drag off the bed, and undo in 5 s (20 min)

**Needs: T-128d.** The removal, the petal and the undo are checked against code; that the app shows the petal and makes it a target is **(from the plan)** (API_SPEC "The undo petal as built", "Who calls it (T-128d)").

**Purpose:** remove plants by dragging them off the bed, sideways and towards you, and bring each back with the petal within 5 seconds.

**Answers:** TC-DEV-03 (drag-off and undo, each at least 9 of 10 first try; drag-off works sideways and towards the body) · US-08 · FR-HND-11 · FR-MUS-12 · FR-UI-11 on the edge warning · from UX §9.3: is a petal of 2.5 to 1.0 cm found in time, and is 4 cm enough to pinch it · the view box for the 12 near-side and side cells.

**You need:** the session of block 3 with its plants.

**Checked against:** API_SPEC §1.1 (`bedZone`: off the bed past 0.35 m from the centre; `undoRemove` and D-031), §1.4 (the `drag` and `press` rows), §1.8 ("Shaping as drawn", "The undo petal as built"), §1.10 (`UNDO_LIFE_MS` 5000), §2 (`garden:removed`); `src/render/config.ts` (`PLANT_OFF_BED_BRIGHTNESS` 0.5, `RIM_WARN_WIDTH_M` 0.01, `HOVER_CUE_MS` 100, `BURST_PETALS` 6, `BURST_MS` 400, `PETAL_FADE_IN_MS` 150); UX §2, §3.4, §9.3.

**Know this first:**

- **Where "off" is:** your fingers more than 35 cm from the bed's centre, which is 5 cm past the outer ring, when you let go. No speed is needed (FR-HND-11). The far side is out of reach (80 cm from your head, past the 75 cm cap), so remove **sideways** (about 57 cm from your head, to the side of the holding hand) or **towards you** (your fingers only about 10 cm in front of your face, measured level, with the bed centre at 45 cm) (UX §2, computed, not measured).
- **The warning before you let go:** past that line the plant fades to half brightness and a dark band 1 cm wide appears just outside the glass, both over 0.1 s; the ghost goes out (API_SPEC "Shaping as drawn"). Bring the hand back and the warning goes.
- **Letting go there:** the plant bursts into petals at your fingers; six of them drift back to the plant's cell in 0.4 s and one stays, 3 cm above the cell, for 5 s, shrinking from 2.5 to 1.0 cm and fading out in its last 0.3 s (UX §9.3, API_SPEC "The undo petal as built"). Under reduced motion there is no burst: the petal fades in at the cell in 0.15 s.
- **Undo:** pinch the petal and let go on it, with either hand, within 5 s. Its pinch sphere stays 4 cm all along, however small it is drawn (UX §9.3). The plant comes back to its cell with its height and colour (US-08). After 5 s the removal is final (FR-MUS-12).
- If a seed was planted in that cell meanwhile, the undo puts the plant on the nearest free cell (D-031). Do not plant in this block.
- The remove hint of UX §3.4 (an arrow on the rim, on the side of the holding hand) is not built, and no task in the plan builds it yet. If you see one, write it down.
- Sound: the reverse chime on removal and the forward chime on undo (UX §3.4) come with T-128d's wiring (from the plan). Write down what you hear.

### Steps

1. **Sideways, five tries.** Pinch a plant on the side of the bed nearest your holding hand. Drag it out sideways until it fades and the dark band shows, and let go. Watch the petals drift back.
2. Within about 2 seconds, pinch the petal and let go on it. The plant must come back to the cell it left, as tall as it was.
3. Count each removal and each undo apart: the removal is a success if the plant was removed on that one release; the undo is a success if one pinch on the petal brought it back.
4. **Towards you, five tries.** Pinch a plant on the near side of the bed (the side nearest you). Drag it towards your chest until it fades, and let go. Undo as in step 2. Near-side plants are the ones whose petals may be just outside the view box (UX §9.3): say whether you had to look down to find the petal.
5. **Late undo, one try.** Remove a plant, count slowly "one thousand, two thousand, three thousand, four thousand", then pinch the petal. It is about 1.3 cm across then (computed from the 2.5 to 1.0 cm shrink). Did it come back?
6. **Too late, one try.** Remove a plant and wait until the petal is gone (count to seven). Pinch where it was. Nothing must come back. This plant stays removed.
7. **The warning without a release, flash check.** Drag a plant out past the line and back in five times quickly, then let go on the bed. Read the panel's `flash` while you do it.
8. Leave the session (S1, "Leaving a session with hands only"), or stay for block 5.

### Write down

| Field | Value |
|---|---|
| Removal sideways: first-try successes | n/5 |
| Removal towards you: first-try successes | n/5 |
| Removal, both together | n/10 |
| Undo: first-try successes | n/10 |
| Undo brought it back to its own cell with its height | n/10 |
| Late undo (about 4 s) | came back / not |
| Too late (after the petal is gone) | nothing came back / something did |
| Where your fingers had to be for "towards you" | above the table / at your chest / at your chin / could not |
| The warning (half brightness, dark band) before letting go | seen / not seen; on which side |
| The burst led your eye to the petal | yes / no |
| Petal on a near-side cell: had to look down for it | yes / no, which cell |
| A plant removed when you did not mean to (in this block or the last) | count, where |
| Remove hint arrow seen | yes / no |
| Sound on removal and undo | words |
| Step 7: highest `flash` | number |
| Panel: `fps` usual and lowest, `draws`, `tris` with a petal up | numbers |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Drag-off | at least 9 of 10 first-try successes, sideways and towards you counted together. No split is given: write the two counts apart, and a side with two misses or more is a finding even when the total passes | TC-DEV-03 |
| Works sideways and towards the body | at least one success each way | TC-DEV-03 |
| Undo | at least 9 of 10 first-try successes | TC-DEV-03 |
| Undo restores | the same cell, height and colour in every undo | US-08, FR-MUS-12 |
| Undo window | the late try (about 4 s) comes back; after the petal is gone, nothing does | FR-MUS-12 (`UNDO_LIFE_MS` 5000) |
| Flashing | `flash` at most 3 in step 7 | FR-UI-11, API_SPEC "Shaping as drawn" (24 runs in and out past the edge in the emulator read at most 3) |
| Found in time, the view box | write down what you see. UX §9.3: "only a headset shows whether a 1.0 to 2.5 cm petal among plants is found in time" | UX §9.3 |
| Frame rate, budget | as block 1 | Golden Rule 5 |

### If it fails

- The plant comes back to the bed instead of being removed: you let go before the line. Write down where your fingers were; the line is 5 cm past the outer ring, not at the glass.
- "Towards you" cannot be done seated, or the headset loses the hand that close: write it down. It is the one removal direction for near-side plants, and the decision is Parth's (it touches a Must, FR-HND-11).
- The petal cannot be found or pinched: write down the ring and the side. Parth decides on the petal's size and place (UX §9.3).

---

## Block 5 — The hand lost mid-shaping: the glide home (10 min)

**Needs: T-128d.** The hand rules and the drawing are checked against code; that the app shows the tint and the hint for a held plant is **(from the plan)**.

**Purpose:** take a hand out of view while it drags or pulls a plant, and see the plant go back where it was, with nothing lost.

**Answers:** FR-HND-15 for a drag and a pull · NFR-REL-02 · D-030 · from T-147: the 0.15 s glide home on a real table · the part of TC-DEV-09 that S1 block 13 step 11 left for T-146.

**You need:** a session with plants, as at the end of block 4. The console is a bonus: it shows `hands:lost`, `hands:found` and `gesture:trackingLost`.

**Checked against:** API_SPEC §1.4 ("Tracking loss as built (T-116)", "Shaping as built (T-146)": `TRACKING_GRACE_MS` 200, `REVERT_LERP_MS` 150, `HAND_HINT_MAX_MS` 5000), §1.8 ("Shaping as drawn": every jump of a held plant eased over 150 ms, also on a tracking loss); `src/core/strings.ts` ("Hand out of view"); UX §3.4 ("Hand out of view"), §7; D-030.

**Know this first:**

- When the headset loses a hand that holds a plant, the plant freezes where it is and dims to half at once (the tint, a level, not a blink). A hint shows near where the hand was, for as long as the hand is gone and at most 5 s (FR-HND-15, D-030).
- Back within 0.2 s: full brightness again and the gesture goes on. Gone longer than 0.2 s: the gesture is undone, nothing is saved: a dragged plant glides back to its own cell in 0.15 s, a pulled plant returns to the height it had at the pinch (FR-HND-15, UX §3.4).
- What the hint looks like is not settled in the documents: S1 block 13 and `src/core/strings.ts` have the words "Hand out of view"; UX §3.4 draws an open-palm icon in a dashed ring, 4 cm across, and UX §7 says "no caption". Write down which you see.
- Do not let go while the hand is hidden.

### Steps

1. **Drag, hand hidden, three tries.** Pinch a plant and drag it to the middle of the hole or over another cell. Keep the pinch and put the hand behind your back for 3 seconds (as in S1 block 13 step 2). Watch the plant. Bring the hand back open.
2. The plant must end in its own cell, as tall as before. Count the plants on the bed before and after (the console: `__roomsong.garden.state.plants.length`, from the plan): none lost, none doubled.
3. **Pull, hand hidden, two tries.** Pinch a plant and pull it up two ladder rings. Keep the pinch and hide the hand behind your back for 3 seconds. The plant must return to the height it had at the pinch.
4. **A flick, three tries.** Drag a plant, flick the hand out of view and straight back as fast as you can (S1 block 13 step 4). If you were quick enough, the drag goes on: the plant is still at your fingers. Let go on a free cell: it lands there.
5. Leave the session (S1, "Leaving a session with hands only").

### Write down

| Field | Value |
|---|---|
| Drag hidden: back in its own cell | n/3 |
| Pull hidden: back to its old height | n/2 |
| Plants lost or doubled | count |
| The return: a glide / a jump / not seen | words |
| The plant dimmed to half while the hand was gone | yes / no |
| The hint: words, an icon, or nothing; how long it stayed | words, seconds |
| Flick: the drag went on | n/3; and how many of those landed where you let go |
| Did the headset ever end the pinch by itself when the hand came back (the plant let go without you opening) | count, words |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| A held plant after a loss longer than 0.2 s | 5 of 5 back to its own cell and its old height; nothing saved | FR-HND-15, UX §3.4 |
| No state corruption | no plant lost or doubled | NFR-REL-02 |
| The hint | shows only while the hand that held something is gone, at most 5 s | FR-HND-15, D-030 |
| The grace (0.2 s), the glide (0.15 s), the flick | write down what you see. The grace is tunable 150 to 250 ms (FR-HND-15) | from T-116, T-147 |

### If it fails

- A plant moved or vanished after a loss: say exactly what you did, in order. It is an S1 bug (data lost); Claude files it.
- A flick always reverts: the grace is too short for real hands. Write down how fast your flicks were (a guess is fine).

---

## Block 6A — Listen: in and out (20 min)

**Needs: T-148 and T-128d.** Listen needs the app's garden (D-050: no Listen before it), and the app makes its garden with T-128d: that part is **(from the plan)**. The rest is checked against the T-148 branch (the mark at the top).

**Purpose:** go into Listen both ways and out of it every way, with bare hands, and count the tries.

**Answers:** TC-DEV-04 (Listen starts within 2 s) · US-10 · FR-HND-06 and FR-HND-07 with real hands · FR-HND-01 (hands only; Stage-1 pass/fail) · D-050 (no Listen before the garden; the wake only within 0.45 m of the head; the waking pinch does nothing else) · the one-palm half of TC-DEV-06.

**You need:** the "S2, shaping" bookmark of block 0 and a garden with plants (block 0, step 4). No console.

**Checked against (T-148 branch, 088ea07):** `src/hands/config.ts` (`PALMS_OUT_MAX_ANGLE_DEG` 40, `PALMS_OUT_HOLD_MS` 1500, `WAKE_MAX_ANGLE_DEG` 40, `WAKE_HOLD_MS` 600, `WAKE_MAX_DISTANCE_M` 0.45, `PALMS_OUT_MIN_DOWN_ANGLE_DEG` 30), `src/hands/poses/palmsOut.ts`, `src/hands/poses/wake.ts`, `src/hands/HandSystem.ts` (`listenPoses`), `src/garden/GardenSystem.ts` (`startListen`, `stopListen`, the waking pinch, a pause), `src/render/config.ts` (`LISTEN_ENTER_MS` 1200, `LISTEN_EXIT_MS` 800, `LISTEN_ORB_LIFT_M` 0.02), `src/render/OrbRenderer.ts`, `src/render/HaloSystem.ts`; SRS FR-HND-06/07; PRD §3.4; UX §3.5; API_SPEC §1.4 (the `press` row: orb → Listen); D-050; `src/room/config.ts` (`HIT_TEST_TIMEOUT_MS` 10 000) for step 1.

**Know this first:**

- **Palms out:** both hands open (no pinch), palms facing away from you the way you look, each within 40° of where your head points, held 1.5 s. In one-hand mode one palm is enough; in two-hand mode one palm does nothing (FR-HND-06). A palm within 30° of straight down never counts, so hands resting flat on the table are not "out" (D-050). Losing a hand restarts the count (LLD §4).
- **The orb:** a small cream pearl, 2.5 cm across, 2 cm above the middle of the bed's hole, picked within 4 cm. Pinch it and let go over it: Listen starts at the release (UX §3.5, API_SPEC §1.4). The seed supply floats 10 cm higher; it is not the orb. Dwelling on it by gaze is T-160, not here.
- **Going in:** over 1.2 s the room dims and a curtain of light rises round the bed (block 6B looks at it closely).
- **The wake:** one palm turned to your face, within 40°, no farther than 45 cm from your head, held 0.6 s (FR-HND-07, D-050); or any pinch anywhere. The waking pinch only wakes: it moves, pulls and presses nothing (D-050). One exception, by T-148's choice: a seed already on your hand is still planted if the waking pinch carries it, so a seed never sticks to a hand. A pause (the Quest button, the headset off) and the session's end also end Listen; after a pause you are back in the garden, not in Listen. The room comes back over 0.8 s.
- **Counting to 2 s:** say "one thousand and one, one thousand and two" from the moment both palms are out. The room should start to dim at about "and one and a half".

### Steps

1. **Not before the garden, two tries.** Add `,forceLevel=3` to the end of the "S2, shaping" address and open it. Pinch **Enter the garden**. The pale copy of the ring shows with "Look at your table, and pinch"; the bed waits for that pinch, at most 10 s. While it waits, hold both palms out at the table for 3 seconds: nothing may dim. Then look at the table and pinch: the bed lands. Leave the session (S1, "Leaving a session with hands only") and do it once more.
2. Open the plain "S2, shaping" bookmark and enter. Let the garden play for 10 seconds.
3. **Palms out, five tries.** Sit back, hands at chest height, open, palms facing the bed as if saying "stop", and hold. Count (see above). Write down the count at which the room began to dim. Stay 5 seconds, then wake with a pinch in the air. Vary the tries a little: hands lower, higher, fingers together, spread.
4. **One palm only, two-hand mode, one try.** One palm out for 3 seconds, the other hand in your lap: nothing may dim.
5. **The orb, five tries.** Pinch the orb and let go over it. Did Listen start at the release, first try? Wake each time with a palm (step 6). Then once: pinch the orb, move your hand 10 cm away, let go: nothing may start (a cancelled press).
6. **Wake by palm, five tries.** In Listen, turn one palm to your face, about a forearm's length away, and hold. Count: the room should start to come back at about "and one", and be back by "and two". Then one try with the arm straight out (farther than 45 cm): it must not wake. Wake that one with a pinch.
7. **The waking pinch does nothing else, three tries.** In Listen, pinch a plant at its foot as if to drag it, move it to a free cell and let go. Listen ends at the pinch. The plant may follow your fingers while you hold (the drawing follows the hand's gesture, and no test has looked at it after a wake); after the release it must be in its own cell, as tall as before. Write down whether it followed. Then once: in Listen, pinch the orb and let go over it. Listen ends and must not start again at the release.
8. **One hand, three tries.** Leave. On the landing page tick **One hand**, enter, and hold one palm out: Listen must start. Wake with the same palm. Leave, untick **One hand**.
9. **A pause.** Enter, go into Listen by the orb, press the Quest button (unchecked: the button and its menu) and come back after 10 seconds. Listen must be over: the room bright, no curtain; the garden plays (whether the sound comes back by itself is block 8, TC-DEV-08). Leave the session.

### Write down

| Field | Value |
|---|---|
| Before the garden: dimmed while the ghost showed | n/2 |
| Palms out: Listen started | n/5; the count at which it dimmed, each try |
| One palm in two-hand mode: Listen started | yes / no |
| Orb: started at the release, first try | n/5; the cancelled press started it: yes / no |
| Wake by palm, near: first try | n/5; the count until the room was back |
| Wake by palm, arm straight out: woke | yes / no |
| Waking pinch: Listen ended and the plant stayed, as tall | n/3; it followed the fingers while held: yes / no; the orb's pinch started Listen again: yes / no |
| One hand: one palm started Listen | n/3 |
| After the pause: Listen over, garden playing | yes / no |
| Anything you could only do with a controller | words |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Starts in time | every try that starts Listen dims within 2 s of both palms out, or of the release over the orb | TC-DEV-04; the 1.5 s hold of FR-HND-06 |
| How often a pose is read | the documents give no rate: write down n/5. Parth decides with these counts whether 40° and 1.5 s stay (D-050: provisional until this script) | FR-HND-06, D-050 |
| Hands only | Listen entered and left with bare hands, both ways in and both ways out; no controller | FR-HND-01 |
| Not before the garden | 2 of 2: nothing dims before the bed lands | D-050 |
| One palm | two-hand mode: no Listen; one-hand mode: Listen | FR-HND-06 |
| The orb | starts at the release over it; a release off it starts nothing | API_SPEC §1.4 (`press`), UX §3.5 |
| The wake | near: the room comes back; arm straight out: no wake | FR-HND-07, D-050 (0.45 m) |
| The waking pinch | 3 of 3: no plant moved or changed height; the orb's waking pinch does not start Listen again | D-050, PRD §3.4 |
| A pause | ends Listen; on return the garden, not Listen | T-148 (`GardenSystem`, "a pause ends Listen") |

### If it fails

- Nothing ever dims, by palms or the orb: ask Claude whether the build holds T-148 and T-128d (block 0). Then check that the bed had landed: before the garden there is no Listen.
- Palms out never starts it, the orb does: write down how you held your hands. The pose is read from the palm's direction only; the headset may report a real palm a little turned.
- It wakes when you did not mean to: write down what your hands were doing. Block 6C counts this on purpose.

---

## Block 6B — Listen: the look and the sound (10 min)

**Needs: T-148 and T-128d**, as block 6A.

**Purpose:** see whether the dim reads over a real room, whether the halo is seen all round your real table, and hear whether the near plants come forward.

**Answers:** TC-DEV-04 (the aurora halo over the bed; the sound comes from each plant as you turn your head) · FR-ROOM-04 (the halo is the whole Listen picture: Must) · UX §3.5 (40 %, never fully hidden; 1.2 s in, 0.8 s out) · FR-UI-11 · FR-UI-06 (reduced motion) · NFR-PERF-10 · from T-148: does the dim read over real passthrough; does the breath feel like the music; can you hear the near plants come forward.

**You need:** as block 6A; read the panel for frame rate.

**Checked against (T-148 branch, 088ea07):** `src/render/config.ts` (`DOME_DIM` 0.6, `DOME_RADIUS_M` 2, `HALO_LIFT_M` 0.02, `HALO_HEIGHT_M` 0.22, `HALO_LOW` 0.75, `HALO_BEATS_PER_BREATH` 2, `HALO_DRIFT_MS` 60 000, `LISTEN_ENTER_MS` 1200, `LISTEN_EXIT_MS` 800), `src/render/HaloRenderer.ts`, `src/audio/config.ts` (`LISTEN_FOCUS_REF_M` 0.62), `src/audio/Spatializer.ts` (`place`), `tests/e2e/18-listen.spec.ts` (the draw calls Listen adds); UX §3.5, §5; PRD §3.4.

**Know this first:**

- **The dim:** a dark see-through dome, 2 m round the bed's middle, lets 40 % of the room through. You should still see your table, your hands and the door, darker.
- **The halo:** a curtain of light on the bed's rim, from 2 cm above the glass to 22 cm high, brightest at its foot: green and blue at the foot, violet towards the top. It rises as the room dims; its folds drift round the bed once a minute. It breathes from full to three quarters and back once every two beats (UX §5's "every beat" is not built: on every beat the flash cap held it still in 39 to 63 % of frames, measured in T-148). With reduced motion it does not rise or drift; the dim and the breath stay.
- **The orb** shines at full brightness while Listen lasts.
- **The near plants:** while Listen lasts, a plant farther from your head than 62 cm sounds at (0.62 ÷ its distance)² of its level, at most full: the near half of the bed keeps its level, the far rim (about 86 cm) is about 6 dB quieter, on top of the usual fall-off with distance. The change lands on each plant's next note, not at once, and it follows your head: lean in and the far plants come up.
- **Not built** (write down only if you see or hear them): the bed glowing brighter and the light turning into "a soft comet" (UX §3.5), vines to the wall (Could, D-021), the pad's filter sweep and a wider echo (UX §5: not in the contract), a second orb by the wrist in one-hand mode (UX §9.1).

### Steps

1. Enter Listen by palms out. For 30 seconds look round the room: the table, your hands, the door, a window, the wall behind the bed. Is the room plainly darker? Can you still see each of them?
2. Look at the halo for four breaths. Did it rise as the room dimmed? Is it there all round the bed, also on the near side by your chest? Does it breathe in time with the song? Any flicker?
3. Wake with a palm and watch the room come back: smooth or a jump?
4. **Near plants.** Out of Listen, close your eyes and listen for 20 seconds. Open them, go into Listen by the orb, close them again for 20 seconds. Do the plants nearest you stand out more in Listen? Rate 1 (no difference) to 5 (clearly). Wake.
5. **Turn your head.** In Listen, look at one plant you can pick out by ear (a Bell or a Bass), then turn your head slowly 45° to the left and to the right. Does its sound stay where the plant is?
6. **Lean.** In Listen, lean towards the far rim for 10 seconds, then sit back. Did the far plants come up as you leaned?
7. Read the panel in Listen and out of it: the lowest `fps`, the highest `draws`, `tris` and `flash`.
8. **Reduced motion.** Leave. On the landing page tick **Reduce motion**, enter, go into Listen: the curtain is there at full height at once and its folds are still; the dim and the breath stay. Leave, untick it.
9. **Optional, standing.** In Listen, stand up and take two steps back from the table, so your head is more than 2 m from the bed's middle: you leave the dome. Write down what you see, and sit down again.

### Write down

| Field | Value |
|---|---|
| Lighting in the room | bright / normal / dim |
| The dim: plainly darker; table, hands, door still seen | yes / no, each |
| The halo: rose; all round, the near side too; breath in time; flicker | yes / no, each |
| The way out (0.8 s) | smooth / a jump |
| Near plants forward | rating 1 to 5, words |
| Turning the head: the sound stayed at the plant | yes / no |
| Leaning in: the far plants came up | yes / no / not sure |
| Panel in Listen and out of it | lowest `fps`; highest `draws`, `tris`, `flash` |
| Reduced motion: full height at once, folds still | yes / no |
| Standing, out of the dome (optional) | words |
| The look, in your words | for the art pass |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| The halo | seen round the whole bed every time Listen is on | FR-ROOM-04 (Must), TC-DEV-04 |
| The dim | plainly darker, and table, hands and door still seen through it | UX §3.5 (40 %, never fully hidden) |
| The sound from each plant | it stays at its plant as you turn your head | TC-DEV-04, NFR-PERF-10 |
| Frame rate | usual `fps` at least 72, never below 60 | Golden Rule 5, TC-PERF-01 |
| Drawing budget | `draws` at most 60, `tris` at most 150,000. Listen adds 2 draw calls per eye, the dome (80 triangles) and the halo (96): 4 more in a session with both eyes | Golden Rule 5; measured in `tests/e2e/18-listen.spec.ts` |
| Flashing | `flash` at most 3 (the dome and the halo are one flash-guard element each) | FR-UI-11 |
| Reduced motion | no rise, no drift; the dim and the breath stay | FR-UI-06, UX §5 |
| The near plants, the breath, the fades, the look | write down. The near-plants law is T-148's own choice (`LISTEN_FOCUS_REF_M` 0.62); Parth's rating keeps or changes it, and the look goes to the art pass (T-163) | from T-148 |

### If it fails

- No dim, but the halo shows (or the other way round): write down which. They are two meshes; Claude files it.
- The dome reads as a black wall: write down the room's lighting. 40 % is UX §3.5's number, so a change is Parth's.
- No breath: the halo holds full brightness while the song has not started; check that you hear the garden.

---

## Block 6C — Listen by accident: poses that must not fire (15 min)

**Needs: T-148 and T-128d**, as block 6A. Step 7 is about the headset's own gesture: **(unchecked)**.

**Purpose:** do, on purpose, the things a player does by habit near the bed, and count every Listen that starts or ends when nobody asked.

**Answers:** D-050 (its numbers are provisional until this script: the wake only within 0.45 m of the head; palms out ignores a palm within 30° of world down) · FR-HND-05 against FR-HND-07 (palm up for a seed and the wake) · from the T-148 review: before D-050 a resting palm woke Listen at 29 to 33°, and palms out fired for palm-down hands when the head's pitch and the palm's tilt added up to 50° or more.

**You need:** as block 6A; the tape measure. **Before the headset goes on:** sit as you will, and have someone measure from between your eyes to your palm when it rests face up on your lap, and on the table's near edge. Write both down: the wake needs 45 cm or less.

**Checked against (T-148 branch, 088ea07):** as block 6A, and `src/hands/config.ts` (`PALM_UP_MAX_ANGLE_DEG` 35, `PALM_UP_HOLD_MS` 400: a seed is asked for by a palm within 35° of up, held 0.4 s), `src/garden/GardenSystem.ts` (`handOut`: no seed is handed out in Listen).

**Know this first:**

- **The geometry of palms down** (from the numbers, not measured): a palm tipped from flat-down towards the far side of the bed by an angle t, while the head looks down by an angle p, points within 40° of the head's forward when p + t is 50° or more. D-050 never counts a tip of 30° or less, so the risk left is a tip past 30° with the head down by 20° or more: a hand reaching over the bed, palm angled at it.
- **Palm up near the face is the wake by design:** in Listen a palm closer than 45 cm that faces your face wakes it. A palm held up for a seed, close under your chin, is that pose. Outside Listen the wake is not looked for, and a palm up never counts as palms out.
- **No seed in Listen:** a palm up in Listen hands out no seed (PRD §3.4: in Listen nothing but the wake is taken).

### Steps

1. **Palms down, looking down, three tries.** Not in Listen. Bend your head until you look straight at the bed's middle. Hold both hands open and flat, palms down, a hand's width above the bed, still, for 5 seconds. Nothing may dim.
2. **Palms tipped, looking down.** Head as in step 1. From flat, tip both palms to face the far side of the bed, about 30° (a third of the way to upright), 5 seconds; then about 45° (half way), 5 seconds. Write down whether Listen started, and at which tip. Wake it with a pinch if it did.
3. **Two minutes of ordinary shaping.** Pull and drag plants as in blocks 2 and 3, with your head down over the bed, without thinking about Listen. Count every Listen you did not want, and what your hands were doing.
4. **A palm up on the lap, two tries.** Go into Listen by the orb. Rest one hand palm up on your lap for 10 seconds, eyes on the bed. Listen must stay on.
5. **A palm up on the table's edge, two tries.** The same with the hand palm up on the table's near edge.
6. **Palm up for a seed.**
   - In Listen, three tries: hold a palm up as you do to ask for a seed, at your usual height, for 2 seconds. Write down: did Listen end, did a seed come? If Listen ended, keep the palm up 2 seconds more: does a seed come now, or only after you lower the hand and raise it again?
   - Out of Listen, three tries: ask for a seed the usual way. Listen must not start. Put the seed back or plant it.
7. **The Quest's own palm gesture (unchecked).** With hand tracking, the Quest shows its own menu button when you look at a palm turned to your face, and a pinch on that button opens the Quest's menu.
   - (a) In Listen: turn a palm to your face as you would for the Quest's button, and hold without pinching for 2 seconds. Which came first: the room coming back (the wake, 0.6 s) or the Quest's button?
   - (b) Out of Listen, the same: nothing of Roomsong may change.
   - (c) In Listen, the whole Quest gesture with its pinch: the Quest menu opens. Come back to the session: Listen must be over and the garden playing (as block 6A step 9).
   - (d) Did the Quest ever show anything while you held palms out?
8. Leave the session.

### Write down

| Field | Value |
|---|---|
| Eyes to palm: on the lap; on the table's edge | cm, cm |
| Palms flat down, looking down: Listen started | n/3 |
| Palms tipped about 30°; about 45° | started: yes / no, each |
| Two minutes of shaping: Listen you did not want | count; what the hands did |
| A palm up on the lap: woke | n/2 |
| A palm up on the table's edge: woke | n/2 |
| Palm up for a seed, in Listen: woke; a seed came | n/3; n/3; after the wake: a seed with the palm still up, or only after raising it again |
| Palm up for a seed, out of Listen: Listen started | n/3 |
| The Quest's gesture: (a) which came first; (b) a change; (c) Listen over after the menu; (d) a Quest reaction to palms out | words |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Palms flat down while looking down | 0 of 3 start Listen | D-050 (30° of world down) |
| Palms tipped | write down the tip that starts it. Past 30° the pose can count by design (geometry above); Parth decides with D-050 | D-050, from the T-148 review |
| Ordinary shaping | the documents give no rate: write down every start you did not want. Any one is a finding for D-050 | D-050 |
| A palm up on the lap or the table's edge | no wake where your measured distance is over 45 cm. Where it is 45 cm or less the wake is by design: write it down for D-050 | D-050 (0.45 m), FR-HND-07 |
| Palm up for a seed in Listen | no seed while Listen is on, 3 of 3. Whether it wakes: write down | PRD §3.4, `GardenSystem.handOut`; FR-HND-07 |
| Palm up for a seed out of Listen | 0 of 3 start Listen | FR-HND-06 (palms facing away) |
| The Quest's gesture | write down. If its button shows before the wake, a player who looks at a palm may get both: that is Parth's call with D-050. After the Quest menu, Listen is over | T-148 (a pause ends Listen) |

### If it fails

- Listen starts with palms flat: write down how far your head was bent. D-050's 30° may be too small for real hands; Claude files it as a bug against T-148.
- A palm on the lap wakes Listen though it was over 45 cm away: write down both distances. The headset's head point may sit in front of the eyes; Claude checks the number.

---

## Block 6D — Ten minutes of Listen, and "Goodnight" (12 min)

**Needs: T-148 and T-128d**, as block 6A.

**Purpose:** sit back in Listen for its whole ten minutes, as a player would, and see it end by itself.

**Answers:** the 10-minute end (PRD §3.4, UX §3.5: the ending chord, "Goodnight", still in the session) · the Listen half of TC-DEV-07 (24 or more plants, frame rate) · TC-PERF-06 (no clicks) · wakes you did not want, with hands at rest (D-050).

**You need:** a third bookmark, **"S2, Listen":** the app with `?dev=1&flags=perfHud,autoplant=24` at the end of its address (24 plants, TC-DEV-07; autoplant fills only an empty garden: block 0, step 4). A clock or a watch you can read through passthrough, or someone beside you with a stopwatch. Nothing in your hands. Sit where you can lean back.

**Checked against (T-148 branch, 088ea07):** `src/garden/config.ts` (`LISTEN_MAX_MS` 600 000), `src/garden/GardenSystem.ts` (the 10-minute timer, on the page's own clock, from the moment Listen starts), `src/audio/AudioEngine.ts` (`goodnight`: the room's chord on the Pad voice from the bed's middle, the garden playing on under it), `src/render/HaloSystem.ts` and `src/render/config.ts` (`GOODNIGHT_CAPTION_MS` 5000), `src/core/strings.ts` (`goodnight`); UX §3.5.

### Steps

1. Open the "S2, Listen" bookmark and enter. Wait until the garden plays.
2. Go into Listen by the orb. Note the time.
3. Lean back and listen for ten minutes. Rest your hands where they fall: lap, armrest, the table's edge. Once in a while do what people do: scratch your nose, push your hair back, take a sip of water. Do not pinch and do not turn a palm to your face on purpose.
4. About every 2 minutes glance at the panel: write down the lowest `fps` and the highest `flash` you see.
5. If Listen ends before ten minutes: write down the minute and what your hands were doing. Go into Listen again by the orb and note the new time: the ten minutes start again.
6. At ten minutes: a soft chord from the bed, the word "Goodnight" for about 5 seconds, and the room comes back. You are still in the session and the garden plays on.
7. Leave the session.

### Write down

| Field | Value |
|---|---|
| Plants on the bed | count, or 24 |
| Listen ended before its time | count; the minute and the hands, each time |
| The end: minutes from the start; the chord heard; "Goodnight" read; still in the session | min; yes / no, each |
| `fps` lowest and usual over the ten minutes; highest `flash` | numbers |
| Stutters, gaps or clicks | count, words |
| Ten minutes of Listen: pleasant, too long, too short | words |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| The end | at 10 minutes after the last start: the chord, "Goodnight", the room back, still in the session | PRD §3.4, UX §3.5, `LISTEN_MAX_MS` 600 000 |
| The caption | "Goodnight", readable, about 5 s | UX §3.5 (the one caption that is not an instruction), `GOODNIGHT_CAPTION_MS` 5000 |
| Frame rate, 24 or more plants, in Listen | lowest `fps` at least 60, usual at least 72 | TC-DEV-07, TC-PERF-01, Golden Rule 5 |
| Flashing | `flash` at most 3 | FR-UI-11 |
| Clicks | none | TC-PERF-06 |
| Wakes at rest | the documents give no rate: write down each one with the hands | D-050 |

### If it fails

- No "Goodnight" after more than 10 minutes: check that Listen was not woken and restarted (step 5). If it was on the whole time, Claude files it against T-148.
- The chord is heard, but no word: write it down. The caption waits its turn behind any other caption (API_SPEC §1.9).

---

## Block 7 — The garden comes back (20 min)

**Needs: T-128e** (save, restore and pause; on `develop` since 16 Oct). The Browser's own buttons and settings are **(unchecked)**.

**Purpose:** leave the garden the ways a player does and come back to it. Are the plants the same, in the same cells, and is the bed on the same spot? Is a plant made just before closing the Browser kept? Does the next day bring exactly one seed? And when the Browser blocks storage, does the app say so once and play on?

**Answers:** TC-DEV-05 (Must; FR-ROOM-07, US-12): after a reload and after closing the Browser, the bed back at the same spot within 4 s (the drift in cm) or placed again with every plant kept, with the same key and scale · FR-PER-01 (a save within 500 ms of a change, and at once when the page is hidden) · from T-128e: a change made just before closing is kept; with storage blocked, "Saving unavailable" once, in the session, and the garden saved before is not written over · FR-MUS-08 and D-037 (a later date brings one seed). The longer runs (the chair moved, the table moved, the light, Space Setup again, a headset restart, a recentre, the count of saved places) are S1 block 16: not repeated here.

**You need:** the "app, dev" bookmark (S1 block 0); the coin; the tape. The console is a bonus (the `room:bedPlaced` line).

**Checked against:** `src/app.ts` (`keepSaved`: a save on every garden and settings change, a flush when the session is hidden or ends, and `flushNow`, a write at once, when the page is hidden or goes; `inSession`: "Saving unavailable" raised in a session, for 5 s), `src/persistence/PersistenceSystem.ts` (`SAVE_DEBOUNCE_MS` 500; the first failed write of a run is reported, the ones after it are not), `src/persistence/Store.ts` (IndexedDB, then localStorage; with neither, nothing loads and every save fails), `src/garden/growth.ts` (one seed on a later local date while fewer than `SEED_SUPPLY_MAX` 5 wait; a date the garden has seen brings none), `src/core/clock.ts` (`fakeDay` moves the date), `src/room/config.ts` (`ANCHOR_RESTORE_TIMEOUT_MS` 4000), `src/room/AnchorStore.ts` (a new saved place has every other one of the site deleted, D-040), `src/ui/Panel.ts` (the Garden tab's first line: Day, Seeds, Key), `src/core/strings.ts` (`E_SAVE_FAILED`); API_SPEC §4 and its v1.2.33 entry; TEST_PLAN TC-DEV-05.

**Know this first:**

- "Back" means the bed came back from its saved place. "Placed again" means the app waited 4 s, then put the bed down afresh with every plant kept: the accepted way out, not a failure (TC-DEV-05). A plant missing, moved or doubled is a failure.
- The garden is saved within half a second of each change, and at once when the page is hidden or closes. Plants that `autoplant` put in are saved only with your next change (T-128e): this block plants its own.
- Storage blocked (steps 9 to 11) comes last, because it costs the bed's saved place: that session knows no saved place, and the one it makes deletes yours (D-040). In step 11 the bed is therefore expected to be placed again.

### Steps

1. Open the "app, dev" bookmark and enter. Open the panel (pinch the orb on the back of your other hand), **Garden** tab, pinch **hold** beside "New garden" and keep the pinch 2 s: three seeds wait. Write down the tab's first line (Day, Seeds, Key). Close the panel.
2. Plant two of the seeds and keep the third: one on the inner ring, the cell nearest you; one on the outer ring, on the far side. Pull the near one up to its full height.
3. Put the coin on the table exactly under the middle of the ring. Wait 5 seconds.
4. **Reload.** Leave the session (S1, "Leaving a session with hands only"). Reload the page with the Browser's reload button (unchecked). Enter, and count the seconds from the first sight of the room until the ring shows.
5. Is the ring's middle at the coin, or how many cm off? Are both plants in their cells, the near one still tall? Is the Garden tab's first line as in step 1, with Seeds now 1? (console) Does the `[events] room:bedPlaced` line say `restored: true`?
6. **Close right after planting.** Open your palm: the third seed comes. Plant it on the middle ring, on your right. At once, as fast as you can, open the headset's menu and close Meta Quest Browser from there (unchecked: write down what you pressed). Write down about how many seconds passed from letting go of the seed until the Browser was gone.
7. Open the Browser and the "app, dev" bookmark, and enter. Count to the ring as in step 4. Is the third plant there, on the middle ring on your right? The ring at the coin (cm)?
8. **The next day.** If you keep the headset until tomorrow, do this step then, at the same table, together with S1 block 16 step 19. Otherwise do it now: open the app with `?dev=1&flags=perfHud,eventLog,fakeDay=+1`. If S1 block 13 or 16 already used `fakeDay` on this address, put one more than the highest number used there: a date the garden has seen brings no seed (D-037). Enter. The Garden tab's first line: one Day more, and Seeds 1. Open your palm: one seed comes. Plant it. Open your palm again: none may come.
9. **Storage blocked.** Leave. In Meta Quest Browser's settings, block cookies and site data for this address (unchecked: look under Settings, then Privacy or Site settings, then Cookies; write down the real path). If there is no such setting, write "no setting" and go to block 8.
10. Open the "app, dev" bookmark and enter. The garden is new and empty (the app cannot read yours), so the guide starts. "Saving unavailable" should show once, early in the session (a caption waits its turn behind the ripple's and the guide's). Plant two seeds: it must not show again. Does the garden play?
11. Leave. Allow cookies and site data for this address again, the same way. Reload and enter. Your garden of step 8 must be back with every plant. Back at the coin, or placed again (expected, see above)?

### Write down

| Field | Value |
|---|---|
| The Garden tab's first line at step 1 | Day, Seeds, Key |
| Reload: seconds to the ring; back or placed again; cm from the coin | s; which; cm |
| Reload: both plants in their cells, the near one tall; the first line the same, with Seeds 1 | yes / no each |
| Browser closed: seconds from the release to the Browser gone; what you pressed | s; words |
| Reopened: the third plant there; seconds to the ring; back or placed again; cm | yes / no; s; which; cm |
| The next day (real, or `fakeDay` and its number): Day and Seeds before and after; seeds that came | numbers |
| Storage blocked: the Browser's path; "Saving unavailable" shown how many times; the garden played | words; n; yes / no |
| Storage allowed again: your garden back, every plant; back or placed again | yes / no; which |
| Anything you could only do with a controller | words |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| The same garden | after the reload and after the Browser was closed: every plant in its cell, at its height; none missing, moved or doubled | TC-DEV-05, US-12, D-033 |
| The bed's spot | back at the coin within 4 s of the first sight of the room (the cm are the result), or placed again with every plant kept: both pass, and placed again is reported as such | TC-DEV-05, FR-ROOM-07 (4 s) |
| Key and scale | the Key in the Garden tab's first line is the same after each return | TC-DEV-05 |
| Closed right after planting | the last plant is there | FR-PER-01 (a save at once when the page is hidden), T-128e (`flushNow`) |
| The next day | exactly one new seed | FR-MUS-08 (one seed a calendar day, up to 5 waiting), D-037 |
| Storage blocked | "Saving unavailable" shows once in the session and not again; the garden plays on; nothing crashes | T-128e ("Saving unavailable" once, raised in a session), API_SPEC §5 (`E_SAVE_FAILED`) |
| Storage allowed again | the garden saved before is back with every plant: the blocked session wrote nothing over it | T-128e (a garden is never overwritten by a failed read), API_SPEC §4 |
| Hands only | no controller | FR-HND-01 |

### If it fails

- A plant missing, moved or doubled: write down which (its ring, and where on the ring) and what you did just before. Claude files it against T-128e: the garden coming back is a Must (M5).
- The bed is placed again every time, never back: that is the saved place, S1 block 16's subject. Write down the seconds and go on.
- The third plant is gone after the Browser was closed: write down the seconds of step 6. Claude files it against T-128e.
- No new seed the next day: was Seeds already 5 (then none comes, FR-MUS-08)? Was the `fakeDay` number new for this address?
- No "Saving unavailable" with storage blocked: the setting may not block what the app uses. (console) Look for `[persistence] IndexedDB is not available` and `[persistence] localStorage is not available`. Shown more than once: count the times; Claude files it against T-128e.
- Your garden is gone once storage is allowed again: write down the Browser's path. The setting may have cleared the site's data, as S1 block 19 does on purpose; Claude decides whether it was the Browser or the app.

---

## Block 8 — Pause and resume (15 min)

**Needs: T-128e** (on `develop` since 16 Oct) for the garden through a pause. **T-152 is not built:** it adds the fade back in, the checks that the beat carries on in time, and a pinch that brings back a sound the Browser kept off. Until then the sound is judged by the TC-DEV-08 rule below, and the fade is written down, not judged. The headset's menus are **(unchecked)**.

**Purpose:** pause the garden the two ways a player does, taking the headset off and opening the headset's menu, and see the garden, the bed and the sound come back as they were, with a change made just before the pause kept.

**Answers:** TC-DEV-08 (FR-SYS-05): the headset off for 10 s, three times, and the menu open for 30 s: the sound back on return, in time, without a pinch · FR-SYS-05 (the state saved when the session is hidden; the tide carries on from where it stopped) · from T-128e: a hide writes at once, and the return is one more visit · S1 block 9 asked this with no garden; this block asks it with one.

**You need:** the garden of block 7; the coin; the "app, dev" bookmark. The console is a bonus (the `xr:visibility` lines).

**Checked against:** `src/app.ts` (`followSession`: `xr:visibility` comes from the session's own `visibilitychange`, on a change only, and a dimmed ("blurred") session, as under the menu, counts as seen; `keepSaved`: the saver is flushed on `visible: false`, and written at once when the page is hidden), `src/audio/AudioSystem.ts` (faded out and suspended when unseen, resumed when seen), `src/audio/config.ts` (`SUSPEND_FADE_S` 0.2), `src/audio/AudioEngine.ts` (`resume`: the volume comes back and the song's clock goes on from where it stopped), `src/garden/GardenSystem.ts` (a pause ends Listen; the return is a visit), `src/room/RoomSystem.ts` (on the return the bed is moved to its saved place again); SRS FR-SYS-05; TEST_PLAN TC-DEV-08.

**Know this first:** the app hears "unseen" only when the headset tells the session it is hidden; S1 block 9 finds out whether taking the headset off does that. Then the sound fades out over 0.2 s and the song's clock stops; on the return it goes on from where it stopped, so the light starts again close to where it was when you lifted the headset. The menu only dims the session: the garden plays on under it.

### Steps

1. Sit at your table. Open the "app, dev" bookmark and enter. The garden of block 7 plays. If the ring's middle is not at the coin, move the coin under it.
2. **A change, then the headset off.** Pinch the near plant at its foot and pull it to its full height or, if it is tall already, down to half. Let go. Note which plant the light is over, and at once take the headset off. Hold it for 10 seconds (count), lenses away from any window. Put it back on.
3. Is the session still there? The ring at the coin (cm)? Every plant in its cell, the one you pulled at its new height? Did the sound come back without a pinch, and how soon? Did the light start again close to where it was? Any burst of notes, click or jump? (console) `[events] xr:visibility` with `visible: false`, then `true`? A red `E_AUDIO_CONTEXT` line?
4. Steps 2 and 3 twice more, pulling a different plant each time.
5. **The menu, 30 s.** Open the headset's menu (look at your palm, pinch and hold). Keep it open 30 seconds. Does the sound keep playing under it? Close it. Is the garden as before, the ring at the coin, the loop in time?
6. **Kept.** Leave the session. Reload the page and enter. Is the plant you pulled in the last try of step 2 at its new height?

### Write down

| Field | Value |
|---|---|
| Headset off 10 s: the session still there | n/3 |
| The ring after each return | cm from the coin, each |
| Every plant in its cell, the pulled one at its new height | n/3 |
| The sound back without a pinch; about how soon | n/3; s |
| The light on the return: close to where it was / elsewhere | each try |
| A burst of notes, a click or a jump on the return | none / which try |
| (console) `xr:visibility` false then true; a red `E_AUDIO_CONTEXT` | yes / no each |
| The menu: the sound under it; after 30 s the garden, the ring and the loop as before | plays / stops; yes / no |
| After the reload: the last pulled plant at its new height | yes / no |
| Anything you could only do with a controller | words |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| The garden through a pause | 3 of 3: the session there, every plant in its cell at its height, the ring at the coin (the cm are the result; S1 block 16 judges drift) | TC-DEV-08, FR-SYS-05, T-128e |
| The sound comes back | by itself, without a pinch: 3 of 3 headset-off tries, and after the menu | TC-DEV-08 |
| In time | the light starts again close to where it was and the plants sing with it; no burst, click or jump. The documents give no number for "close"; T-152 adds the checks of the fade and the phase | FR-SYS-05 (the tide continues from its saved phase), TC-DEV-08 ("phase continuous"), TC-PERF-06 |
| Under the menu | the sound plays on | from T-128a (S1 block 9) |
| Kept | the change made just before the headset came off is there after the reload | FR-PER-01 (a save at once on `visibilitychange`), FR-SYS-05 (state saved when hidden) |
| Hands only | no controller | FR-HND-01 |

### If it fails

- The landing page is back after 10 s off the head (the headset ended the session): write it down and enter again: the garden must be there, saved when the page was hidden. S1 block 9 step 10 asks the same with no garden.
- No sound on the return and a red `E_AUDIO_CONTEXT` line: the Browser wants a pinch first. Pinch anywhere and write down whether that brought it back: T-152 builds that pinch.
- The light jumps or a burst of notes plays on the return: write down which try. Claude files it against T-152 (the phase).
- The pulled plant is back at its old height after the reload: Claude files it against T-128e (the save at the hide).

---

## Block 9 — One hand, and look and hold (50 min)

**Needs: T-160** (on `develop` since 16 Oct; emulator only so far). Two open bugs touch it: BUG-007 (the waiting seed does not light up when a pinch would take it) and BUG-008 (high contrast outlines only the plants and has no 60 % dim). The copy of the Listen orb beside the wrist is not built (D-055). The headset's menus and the Browser's pointer are **(unchecked)**.

**Purpose:** play the whole loop with one hand, then with the eyes alone (the aim of the head), and read the beat by eye.

**Answers:** TC-DEV-06 (US-15, US-16; FR-UI-09, FR-HND-12): one-hand mode and look and hold over a full loop, select and Listen · D-048 (one hand takes the seed off its own palm; is 8°/s right for a seated head) · D-054 (the look that ends Listen takes twice the hold time; the panel blocks the gaze) · D-055 (a look at a plant plants in the free cell nearest it; one select per look) · UX §9.1 (does the headset see a pinch made half-turned; does the seed hide the cell under a turned palm; a remove from the far ring with one hand) · UX §9.8 (is the 1.2 cm dot easy to see over a bright room; does a head that means to hold still stay under 8°/s) · FR-UI-07 and US-17 (the beat ring) · FR-HND-01. One palm for Listen in one-hand mode is block 6A step 8; the panel by looking (New garden, "Look and hold" cannot be looked off) is S1 block 12.

**You need:** the app's plain bookmark and the "app, dev" bookmark; the white sheet; for part B, a window, a lamp or a bright wall in view from your seat.

**Checked against:** `src/hands/GestureMachine.ts` (in one-hand mode an idle hand with nothing at its fingertips picks the seed at its own palm; every target within reach of the fingertips comes first), `src/hands/config.ts` (`HIT_RADIUS_M` 0.04, `HOVER_DEAD_BAND_M` 0.005, `PALM_UP_MAX_ANGLE_DEG` 35, `PALM_UP_HOLD_MS` 400, `PALM_REST_OFFSET_M` 0.03), `src/render/config.ts` (`SEED_GLIDE_MS` 300, `SEED_HOP_MS` 100), `src/access/GazeDwell.ts` and `src/access/config.ts` (the targets in their order, the panel blocking the gaze, `LISTEN_WAKE_DWELL_FACTOR` 2, the dot `RETICLE_DOT_M` 0.012 with its rim in high contrast, the beat ring's 16 ticks 1.5 cm past the bed's edge at `BEAT_TICK_REST` 0.3, lifted by `BEAT_TICK_TIDE_LIFT` 0.2 and `BEAT_TICK_FLASH_LIFT` 0.7), `src/ui/config.ts` (`HEAD_TURN_PAUSE_DEG_PER_S` 8, `PANEL_DISTANCE_M` 0.55, `NEW_GARDEN_HOLD_MS` 1500, `ORB_DISTANCE_M` 0.45, `ORB_SIDE_DEG` 20, `ORB_BELOW_GAZE_DEG` 12), `src/core/config.ts` (`DEFAULT_DWELL_MS` 900; tempo 84, at most 120), `src/ui/Panel.ts` (the Access tab), `src/ui/strings.ts` and `src/core/strings.ts` (the words); API_SPEC §1.4 "One-hand pick as built" and §1.6 "Gaze dwell as built"; UX §8, §9.1, §9.2, §9.8; D-048, D-054, D-055.

**Know this first:**

- **One hand** (D-048, UX §9.1). With **One hand** ticked, the hand you hold palm up (within 35°, for 0.4 s) gets the seed: it glides over in 0.3 s and rests 3 cm above that palm, and stays there when the hand turns. The same hand takes it with a pinch when nothing else is within 4 cm of its fingertips: the seed hops to the fingertips, and you carry and plant it as with two hands. A plant, the Listen orb, a petal or the settings orb within 4 cm of the fingertips comes first. The seed should light up when a pinch would take it; today it does not (BUG-007).
- **The settings orb**, in one-hand mode and in look and hold, rides no hand: it waits in view, about 45 cm ahead, 20° to the side of the hand that is not your main hand and a little below your aim. The panel opens where it is.
- **Look and hold** ("No hands: look and hold" on the landing page, "Look and hold" in the panel). A cream dot, 1.2 cm across, sits where your head points: on the target it is on, or 55 cm ahead when there is none. It follows your head, not your eyes. Rest it on a target and a ring round it fills; when the hold time is over (0.9 s unless you change it: 0.6, 0.9 or 1.2 s) it selects. Moving off resets it. While your head turns faster than 8° a second the fill holds: it neither grows nor resets. One look selects once: look away and back for the next. A hand that pinches stops it.
- **What a look selects.** Before the bed: the pale copy of the ring, on a table-like spot only ("Look at your table, and wait"); a look never puts down a floating bed, which only the 10 s time-out does. With the bed: the Listen orb (the cream pearl 2 cm over the middle of the bed's hole) and an undo petal; then, while a seed waits, a free cell: the next seed is planted there. A look at a plant plants in the free cell nearest it. A look never picks up, pulls or drags a plant. In Listen only the orb counts, and the look that ends Listen takes twice the hold time (1.8 s), so a glance back at it does not end Listen (D-054).
- **The panel blocks the gaze.** While the dot is on a panel control, or your head's line passes within 4 cm of one, nothing behind the panel is selected (D-054). The panel runs its own hold for its controls.
- **The beat ring** (FR-UI-07): 16 short ticks lying on the table just outside the bed's edge, one per step. At rest they are faint; the light lifts each a little as it passes; the tick of a step that holds a plant flashes bright with the plant's note. Shown while **Beat ring** is on (it is by default), and always in Listen.

### Steps, part A — one hand (15 min)

1. On the landing page tick **One hand**. Open the app's plain bookmark and pinch **Enter the garden** with your main hand. Put the other hand in your lap, out of view, for the whole of part A unless a step says otherwise.
2. Find the settings orb (to the side of your other hand, a little below) and pinch it. **Garden** tab: pinch **hold** beside "New garden" and keep the pinch 2 s. Three seeds wait above the bed. Close the panel (**x**).
3. **Seed 1.** Turn your hand palm up and hold: the seed comes and rests above your palm. Keep your fingertips away from the bed and the orbs. Before you pinch: does anything on the seed light up? Pinch with the same hand. Did the seed jump to your fingertips, first try? Carry it to the outer ring on the far side (the ghost shows the cell) and let go.
4. **Seed 2: a plant comes first.** Palm up: the seed rests on your palm. Keep it there, put your fingertips at the foot of the plant from seed 1, pinch, raise your hand 5 cm and let go. The plant must grow, and the seed stay on your palm. Then move your hand clear of the plant and pinch: the seed. Plant it anywhere.
5. **Seed 3: the other hand, half-turned.** Swap hands: the main hand in your lap. Palm up: the seed comes. Turn the palm halfway towards you, thumb up, and pinch. Did the pinch take the seed, first try? Before you plant it, turn the hand palm down over the bed for a moment: can you see the cell under your fingers past the seed? Plant it.
6. **A remove from the far ring.** Main hand again. Pinch the plant on the far side at its foot, drag it sideways past the bed's edge by a hand's width and let go: it is removed and a petal shows. Pinch the petal within 5 s: the plant is back. Comfortable with one hand? Write down your words.
7. **The first loop, one hand, timed.** Open the settings orb, New garden (keep the pinch 2 s), close the panel, and leave the session. The next session begins on an empty bed, so the guide runs (D-053). Pinch **Enter the garden** with your main hand and count aloud from that pinch. Follow the guide with that hand only and plant the three seeds. Write down the count when your first plant sings, and when all three sing in one turn of the light.

### Steps, part B — look and hold (25 min)

8. Leave. On the landing page untick **One hand** and tick **No hands: look and hold**. Open the app's address with `?dev=1&flags=forceLevel=3` at its end. Pinch **Enter the garden**: it is a button of the Browser's page, outside the garden, and look and hold does not reach it. Write down how a player with no hands could press it (the Browser's own pointer; unchecked). From here on keep both hands in your lap, out of view, except where a step says "pinch" or "leave".
9. The ring comes back from its saved place. Find the dot straight ahead. Look at the settings orb and hold until the panel opens; look at the **Garden** tab, then at **start** beside "Re-place bed". The ring goes, and a pale copy of it follows your aim, with "Look at your table, and wait". (If the pale copy showed at once after Enter, go on from step 10.)
10. **The bed by looking, two tries.** Look out into the room, away from the table, and hold still for 3 seconds: the copy floats in front of you, and nothing may land. Then look at a clear spot of your table and hold still. Count from the moment the dot is on the table until the bed lands. For the second try, Re-place again by looking (step 9) and choose another spot.
11. **Seeds.** Open the panel by looking at its orb. Garden tab: look at **hold** beside "New garden" until a new garden starts (the hold time and 1.5 s more: S1 block 12, step 14). Three seeds wait.
12. **The panel blocks the gaze (2 min).** Keep the panel open and use it by looking: switch the tabs; on the Access tab set **Hold time** to 0.6 s and back to 0.9 s; on the Sound tab set Reverb to **small** and back to **auto**. Where the bed's ring goes out of sight behind the panel, rest the dot on the control in front of that spot for 3 seconds. Count every plant that appears on the bed meanwhile: none may.
13. **Faster than 8° a second.** Access tab, with 0.9 s lit beside "Hold time". Move your head steadily along that row, from the panel's left edge to its right edge in about 4 seconds without stopping, and back. Three times. The lit choice must stay 0.9 s.
14. **Holding still.** Look at the **Sound** tab and hold until it opens, then at **Garden**, then Sound again: six looks. For each: did it open after about a second (count "one thousand and one"), clearly later, or not at all?
15. Look at **x** to close the panel.
16. **A sweep across the bed.** With the three seeds waiting, move your head steadily across the bed from its left edge to its right edge in about 5 seconds, and back. Nothing may be planted.
17. **Plant by looking.** Choose a free cell, look at it and hold: the next seed is planted there. Twice, on cells you choose before you look. Did each land on the cell you looked at, or the one next to it?
18. **A look at a plant.** Look at the top of one of the two plants and hold: the third seed is planted in the free cell nearest that plant. Where did it land? Then look at a free cell for 3 seconds: with no seed left, nothing may happen.
19. **Listen by looking, three tries.** Look at the cream pearl over the middle of the bed's hole (the Listen orb, not the settings orb) and hold: the room dims. In Listen, look at the pearl for about one second ("one thousand and one") and look away: Listen must go on. Then look at it and hold: after about two seconds the room comes back. Keep looking at it 2 seconds more: Listen must not start again until you look away and back.
20. **The first loop by looking.** Open the panel by looking, New garden by looking (step 11), close the panel by looking, and leave the session. Pinch **Enter the garden** and count aloud from that pinch. After the ripple, "Look at a cell to plant" shows: in this mode the guide has no palm, pull or drag hints. Plant the three seeds by looking. Write down the count when the first plant sings, and when all three sing in one turn of the light.
21. **The dot over a bright room.** With nothing under the dot, look for 5 seconds each at the brightest thing in view (a window or a lamp), at a white wall, and at the white sheet laid on the table beside the bed. Is the dot easy to find, found with effort, or lost? Open the panel by looking, Access tab, **High contrast** on, close the panel, and look at the same three again: the dot now has a dark rim. Switch High contrast off. Today high contrast has no 60 % dim and no outline on the seed, the orbs or the petal (BUG-008): do not write that down as new.

### Steps, part C — the beat ring (10 min)

22. Leave. On the landing page untick **No hands: look and hold**. Open the "app, dev" bookmark and enter: the three plants of step 20 play. Hands as usual.
23. Look at the ring of short ticks just outside the bed's edge and count them. From your seat, can you see those on the far side? Lay the white sheet under the near half of the bed: can you see the ticks on it?
24. Watch two turns of the light. The tick under the light lifts a little; at a plant's step it flashes bright. Does the flash come with the plant's note, before it, or after it?
25. **Sound off.** Open the panel (the orb on the back of your other hand), Sound tab, pinch Volume **−** until it reads 0 %. Watch two turns: can you tell from the ticks alone which plant plays when? Set the volume back.
26. **Off, and in Listen.** Access tab: **Beat ring** off: the ticks go. Close the panel and hold your palms out: in Listen the ticks are back. Wake (a palm to your face). Beat ring on again.
27. **The read-out.** For 30 seconds, read the highest `flash` and the usual and lowest `fps`. Then Sound tab, Tempo **+** until 120 (nine pinches from 84), and read them again for 30 seconds. Does any tick look as if it blinks? Tempo back to 84.

### Write down

| Field | Value |
|---|---|
| One hand: the seed taken off its own palm, first try (seeds 1, 2, 3) | n/3 |
| Anything lit on the seed before the pinch; could you tell the pinch would take it | yes / no; words |
| A plant within reach came first: the plant grew and the seed stayed on the palm | yes / no |
| The other hand, half-turned: took the seed; palm down: the cell seen past the seed | yes / no each |
| The far-ring remove with one hand; undone by the petal | comfortable / awkward / could not; yes / no |
| One hand: first sound and first loop, counted from the Enter pinch | s; s |
| Look and hold: how a player with no hands could press Enter | words |
| The bed by looking: floated while you looked away; landed on the table; seconds from the dot on the table | yes / no; n/2; s each |
| The panel used by looking for 2 min: plants that appeared on the bed | n |
| The 4 s sweeps along Hold time: the lit choice changed | n/3 |
| Holding still on a tab: opened after about a second / clearly later / not at all | counts of 6 |
| The 5 s sweep across the bed: plants planted | n |
| Plant by looking: on the cell looked at, or the one next to it | n/2 |
| A look at a plant: where the seed landed; with no seed left, anything happened | next to that plant / elsewhere; yes / no |
| Listen by looking: started; a one-second look ended it; the long look ended it; it started again while you kept looking | n/3 each |
| Look and hold: first sound and first loop, counted from the Enter pinch | s; s |
| The dot over a window or lamp, a white wall, the white sheet; the same with high contrast | easy / with effort / lost, each |
| Beat ring: ticks seen from your seat; seen on the white sheet | n of 16; yes / no |
| Beat ring: the flash and the note | with / before / after |
| Sound off: could you tell which plant plays when | yes / partly / no |
| Beat ring off: gone; in Listen: back | yes / no each |
| `flash` highest, `fps` usual and lowest, at 84 and at 120 BPM; a tick that seemed to blink | numbers; yes / no |
| Anything you could only do with two hands (part A), with a hand (part B, after Enter), or with a controller | words |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| One hand takes its own seed | each of the 3 seeds taken off the palm it rests on, by that hand, and planted, with no second hand and no controller. The documents give no rate (TC-DEV-03's 9 of 10 is for the shaping gestures): write down n/3 | D-048, UX §9.1, US-15 |
| A target in reach comes first | the plant grew and the seed stayed on the palm | API_SPEC §1.4 "One-hand pick as built" |
| The seed's light | nothing lights today (BUG-007, open): write down whether you could tell; it is not a new bug | UX §9.1, BUG-007 |
| The first loop, one hand | first sound within 20 s and first loop within 90 s of the Enter pinch | FR-UI-02, TC-DEV-01; US-15 (every story passes with one hand) |
| The bed by looking | lands on the table after the hold, 2 of 2; a look never floats it | UX §9.2, US-16 |
| The panel blocks the gaze | no plant appears behind the panel | D-054, API_SPEC §1.6 |
| Faster than 8°/s | the 4 s sweeps change nothing (0 of 3), and the bed sweep plants nothing | UX §8, §9.8 |
| Holding still | the documents give no rate: write down the six. Parth decides with them whether 8°/s stays (unverified until this run) | D-048, UX §9.8 |
| Plant by looking | each look plants one seed, on the cell looked at or the nearest free one; a look at a plant plants next to it; with no seed, nothing | FR-HND-12, US-16, D-055 |
| Listen by looking | 3 of 3 each: starts after the hold time (0.9 s); a one-second look does not end it; a look of twice the hold time (1.8 s) ends it; no new start while the look stays | FR-HND-12, D-054, D-055 (one select per look) |
| The first loop by looking | first sound within 20 s and first loop within 90 s of the Enter pinch, with no hand used after it | FR-UI-02, US-16, TC-DEV-06 |
| The dot | write down what you see. UX fixes its size and colour (1.2 cm, cream, a dark rim in high contrast), not a rate; lost over a bright background is a finding for Parth | UX §8, §9.8 |
| The beat ring | 16 ticks, one per step; a tick flashes with its plant's note; shown in Listen with Beat ring off | FR-UI-07, API_SPEC §1.6 |
| Sound off | you can tell which plant plays when | US-17 |
| Flashing | `flash` at most 3, at 84 and at 120 BPM | FR-UI-11, US-17 |
| In time | the documents give no number: with, before or after is the result | FR-UI-07 |
| Frame rate | usual `fps` at least 72, never below 60 | Golden Rule 5, TC-PERF-01 |
| Hands only, and no hands | part A with one hand; part B with no hand after the Enter pinch except to leave; no controller anywhere | FR-HND-01, US-15, US-16 |

### If it fails

- No seed comes to the palm: hold it flat, facing up, for a full second (S1 block 11). Seeds 0 on the Garden tab: New garden again.
- A pinch of the hand the seed rests on takes nothing: is **One hand** lit on the Access tab? Was a plant or an orb within 4 cm of your fingertips? Write down how the hand was turned.
- No dot in look and hold: is "Look and hold" lit on the Access tab?
- The bed never lands by looking: the spot must be at least 25 cm below your eyes and 50 cm above the floor (D-034). On a wall or the floor only the floating copy shows, and after 10 s it lands floating by itself (UX §9.2): Re-place and try again.
- A plant appeared behind the panel, or Listen ended at a short look: write down the control, or how long you looked. Claude files it against T-160.
- The ticks are never seen: is **Beat ring** lit? In Listen they show anyway.

---

## Block 10 — Hand the results to Claude (5 min)

**Can be run today.**

1. Fill the results sheet below in your results note (not in this file).
2. Send it as in S1 block 20 (mail to yourself, or the USB route). There is nothing to copy from the app's pages in these blocks: every result is in your note.

---

## Results sheet

| # | What | Your result | Who waits for it |
|---|---|---|---|
| 0 | Build, and T-128d in it; T-128e and T-160 | | Claude: which blocks counted |
| 1 | The look of each shaping in passthrough (block 1 table) | | T-163 art pass |
| 1 | The dark edge band over passthrough: seen? | | T-163, with S1 block 4's tide band |
| 1 | Lowest `fps`, highest `draws`, `tris`, `flash` during the plays | | T-165 perf pass |
| 2 | Pull first try, n/10 | | TC-DEV-03 |
| 2 | A pull moved a plant, or jumped at release: count | | TC-DEV-03, FR-HND-08 |
| 2 | Dead zone, n/3 changed | | FR-HND-08/10, T-105 |
| 2 | Pulls to shrink a 0.55 plant to the bottom | | UX §3.4 (pull down on a table) |
| 2 | Where you pinch a plant by habit: foot, stem or head | | API_SPEC §1.10 rule 7 (targets at the foot) |
| 3 | Drag first try, n/10 | | TC-DEV-03 |
| 3 | Landed on the ghost's cell, n/10; ghost moved as the fingers opened, n/10 | | TC-DEV-03, FR-HND-16 |
| 3 | Into the hole, n/3 back | | FR-HND-10 |
| 4 | Drag-off first try, n/5 sideways + n/5 towards you | | TC-DEV-03, FR-HND-11 |
| 4 | Undo first try, n/10; late undo; too late | | TC-DEV-03, FR-MUS-12 |
| 4 | Where the fingers had to be for "towards you" | | FR-HND-11, UX §2 |
| 4 | Petal found on near-side cells | | UX §9.3 (the view box) |
| 4 | `flash` in and out past the edge | | FR-UI-11 |
| 5 | Held plant back after a loss, n/5; lost or doubled plants | | FR-HND-15, NFR-REL-02 |
| 5 | The hint: words or icon | | UX §3.4 vs `src/core/strings.ts` |
| 6A | Palms out n/5 and the count to the dim; orb n/5; wake by palm n/5 | | TC-DEV-04; D-050 (40°, 1.5 s, 0.6 s) |
| 6A | Before the garden n/2 dimmed; one palm in two-hand mode; arm straight out woke | | D-050; FR-HND-06/07 |
| 6A | Waking pinch: plant stayed n/3; orb restarted Listen; one hand n/3; after a pause | | D-050; TC-DEV-06; T-148 |
| 6B | The dim over the room; the halo all round; sound stays at its plant on a head turn | | TC-DEV-04; FR-ROOM-04; UX §3.5 |
| 6B | Near plants forward, rating 1 to 5; leaning in | | T-148 (`LISTEN_FOCUS_REF_M`) |
| 6B | `fps`, `draws`, `tris`, `flash` in Listen and out | | Golden Rule 5; FR-UI-11 |
| 6B | The look of the dome and the halo, in your words | | T-163 art pass |
| 6C | Eyes to palm on the lap and the table edge (cm); wakes there | | D-050 (0.45 m) |
| 6C | Palms flat down n/3; the tip that starts Listen; unwanted Listen in 2 min of shaping | | D-050 (30°) |
| 6C | Palm up for a seed: in Listen woke, seed came; out of Listen started | | FR-HND-05/07; PRD §3.4 |
| 6C | The Quest's palm gesture: which came first; Listen after its menu | | D-050; T-148 |
| 6D | The end at 10 min: chord, "Goodnight", still in the session; early wakes at rest | | PRD §3.4; UX §3.5; D-050 |
| 6D | `fps` lowest and usual, 24 plants in Listen; `flash`; clicks | | TC-DEV-07; TC-PERF-06 |
| 7 | Reload and the Browser closed: back or placed again, seconds, cm from the coin; every plant in its cell; the Key the same | | TC-DEV-05 (Must); FR-ROOM-07 |
| 7 | Closed right after planting: seconds; the last plant kept | | FR-PER-01; T-128e |
| 7 | The next day (real, or which `fakeDay`): seeds that came | | FR-MUS-08; D-037 |
| 7 | Storage blocked: the Browser's path; "Saving unavailable" how many times; your garden back once allowed | | T-128e; API_SPEC §4 and §5 |
| 8 | Headset off 10 s: session there, garden and ring as before, sound back without a pinch, n/3; the light close to where it was; bursts or clicks | | TC-DEV-08; FR-SYS-05; T-152 |
| 8 | The menu 30 s: sound under it, the loop after; the change made before the pause, after a reload | | TC-DEV-08; FR-PER-01; T-128e |
| 9 | One hand: seed off its own palm n/3; a plant came first; half-turned; palm down; the far-ring remove; the seed's light | | D-048; UX §9.1; BUG-007 |
| 9 | First sound and first loop (s): with one hand; by looking | | TC-DEV-06; FR-UI-02 |
| 9 | Look and hold: the bed n/2; plants behind the panel; plant by looking n/2; a look at a plant; how to press Enter with no hands | | US-16; D-054; D-055 |
| 9 | 8°/s: sweeps that changed Hold time n/3; the bed sweep; holding still, the six looks | | D-048 (Parth: does 8°/s stay) |
| 9 | Listen by looking: started; a short look ended it; the long look ended it; n/3 each | | D-054; FR-HND-12 |
| 9 | The dot over a window, a white wall, the white sheet; with high contrast | | UX §9.8; T-163 art pass |
| 9 | Beat ring: ticks seen; on the sheet; the flash with, before or after the note; sound off; in Listen; `flash` and `fps` at 84 and 120 BPM | | FR-UI-07; FR-UI-11; US-17 |
| 2–6 | `fps` usual and lowest with plants and hands | | Golden Rule 5, TC-PERF-01 |
| 2–9 | Anything you could only do with a controller (in block 9 part B: with a hand) | | FR-HND-01 (Stage-1 pass/fail) |

---

## For Claude: before the sitting

- When T-128d lands: check blocks 2 to 5 against `BedRenderSystem`'s handlers and `app.ts` (the enter button's words, the bookmarks, `__roomsong.garden`), and take the "(from the plan)" marks off.
- If the pinch test (S1 blocks 2 and 3) changes the hit radius or the outer radius (D-020), update the 4 cm, 35 cm, 57 cm and 10 cm figures here.
- When T-164 or T-128d builds the shaping sounds, give the sound rows of blocks 2 to 4 their rule.
- When T-148 is merged: check blocks 6A to 6D against `develop` (the constants, the waking pinch's seed exception, the pause, `18-listen.spec.ts`'s draw count) and take the branch mark off. If D-050's numbers (40°, 1.5 s, 0.6 s, 0.45 m, 30°) change after a sitting, change them here. The gaze dwell on the orb (T-160) is block 9, step 19; the copy of the orb at the wrist is not built (D-055): if it is, add a step to 6A.
- When T-152 lands: give block 8's fade and phase their rules (FR-SYS-05: out within 300 ms, back in, the tide from its saved phase; a pinch that brings back a sound the Browser kept off) and take the T-152 line off.
- When BUG-007 or BUG-008 is fixed: block 9 steps 3 and 21 expect the seed lit and the outlines and the dim of high contrast. If the device run changes 8°/s (D-048), the hold times or D-054's factor of 2, change block 9.
