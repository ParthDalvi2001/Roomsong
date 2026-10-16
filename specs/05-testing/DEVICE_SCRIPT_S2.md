# Device script S2 — shaping, Listen, restore, pause (T-154)

**Status:** the shaping blocks (TC-DEV-03) are written. Only block 1 can be run today. Nothing in this script has been tried on a headset. · **Owner:** qa-engineer · **Written:** 2026-10-15 against `develop` ce33e46 (T-146 the shaping gestures, T-147 their drawing, T-127 seed delivery, T-128c the bed on the table). Blocks 6A to 6D (Listen, TC-DEV-04) were written on 2026-10-16 against the T-148 branch at 088ea07, before its merge. Blocks 7 and 8 are stubs: each is written when the task it waits for is merged.

This script produces results. It contains none.

**What S2 covers.** TC-DEV-03, shaping a plant with bare hands: pinch and hold (the lift), pull to grow or shrink, drag to another cell, drag off the bed to remove it, the 5-second undo, and the glide home when the headset loses the hand mid-gesture. Then TC-DEV-04, Listen: going in and out with bare hands, the dim and the halo over a real room, the near plants louder, the poses that must not fire by accident, and the 10-minute end. Later: TC-DEV-05 the garden coming back, TC-DEV-08 pause. Listening review #1 (the other half of T-154) is not in this file.

How sure each step is (the marks of DEVICE_SCRIPT_S1):

- **No mark:** a step about our own pages or code, checked against the source on `develop` ce33e46.
- **(unchecked):** a step about the headset's own menus, the browser or the Mac's console, which nobody on the team has seen yet. If it looks different, do the nearest thing and write down what it was called.
- **(from the plan):** a step about a part of the app that is not on `develop` yet (the wiring of T-128d). It is written from API_SPEC "Who calls it (T-128d)", not from code. When T-128d lands, Claude checks the step against the code and takes the mark off.
- **Blocks 6A to 6D** are checked against the T-148 branch at 088ea07 (Listen, in review when written), not against `develop`. When T-148 is merged, Claude checks them against `develop` and takes this line off.

Every block starts with **Can be run today** or **Needs: a task**. "Today" means `develop` at ce33e46. In the app today you can enter a session and see the bed on your table, but you cannot plant, shape or hear a plant: `GardenSystem` and the plants' drawing are joined to the app by T-128d (the first loop, in progress). The only stand-in today is the bed preview, `proto/bed/`: its four buttons **play** each shaping with a scripted hand (`proto/bed/README.md`, "Shaping a plant (T-147)"). It shows the drawing, never your hand: it cannot answer a TC-DEV-03 pass rule.

**What a sitting needs.** Everything in DEVICE_SCRIPT_S1 "Before you start": Headset, once; Leaving a session with hands only; The Mac's console over USB (a bonus here, needed for block 1 route A); The room; Five things beside you (the white sheet for block 1); the tape-measure table. One address for the whole sitting (S1, "One address for the whole sitting"). Controllers out of reach: if you ever need one, write down where. Sit at the table, belly at its edge, as in S1.

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
| 7 | The garden comes back (stub) | TC-DEV-05 | — | needs T-128e |
| 8 | Pause and resume (stub) | TC-DEV-08 | — | needs T-128e and T-152 |
| 9 | Hand the results to Claude | the filled results sheet | 5 min | today |

**Time.** Blocks 0 to 5 and 9: 90 minutes; about 1 h 55 with 15 minutes of setup and one 10-minute break. Block 1 can also be run alone today, right after S1 block 4 (same page, same bookmark): then the S2 sitting is 75 minutes of blocks. Listen (6A to 6D) adds 57 minutes: with it the sitting is about 3 h with setup and two breaks. Listen can also be its own sitting: blocks 0, 6A to 6D and 9, 72 minutes of blocks, about 1 h 35 with setup and one break. Blocks 7 and 8 get their minutes when they are written.

**Order.** 0, then 1, then 2 to 5 in order: block 2 makes the plants of different heights that block 3 moves; block 4 removes and brings back; block 5 needs plants in their cells. Then 6A to 6D in order (6D last: it is ten minutes of sitting still), then 9. If S1 sitting 2 is on the same day, run S2 blocks 2 to 5 after S1 block 11 and before S1 block 12 (which ends with New garden), and skip S1 block 13 step 11: block 5 here asks the same, with the numbers.

**A try, and first try.** A try is one pinch and one release, aimed at a plan you made before the pinch ("this plant, up to the top ring"). Moving your hand while you hold is part of the try: the ghost is there to guide it. A **first-try success** is a try that gives the planned result without a second pinch. A miss is not corrected and not repeated: count it and go on (the rule of TC-DEV-00).

Pass and fail: each block has its rule. Where the documents give a number, the rule is that number, with its source. Where they give none, it says "write down what you see", and that is the result.

---

## Block 0 — The build on the headset (10 min)

**Can be run today** for the address. The build check **needs: T-128d.**

**Purpose:** open the app from the one address, and make sure the build holds the first loop.

**Checked against:** `src/core/flags.ts` (`dev=1`, `perfHud`, `eventLog`, `autoplant`), `src/app.ts` (`__roomsong` with `dev=1`), `src/garden/GardenSystem.ts` (`autoplant` plants only into a garden with no plants).

### Steps

1. Do S1 block 0 (route A or B) for the build of the day. Write down the build.
2. Ask Claude whether that build holds T-128d. If not, run block 1 only and stop.
3. Make two bookmarks on that address:
   - **"S2, shaping":** the app with `?dev=1&flags=perfHud,autoplant=20` at the end of its address.
   - **"S2, console":** the app with `?dev=1&flags=eventLog,autoplant=20`. The event log costs frame time: read `fps` only from the first bookmark.
4. `autoplant=20` puts 20 plants on the bed, spread over all five rings, but only into a garden with no plants (`GardenSystem.ts`). Until T-128e nothing is saved, so every load is a fresh garden. From T-128e on, a saved garden comes back: first empty it with **New garden** (S1 block 12, step 11: hold the button 2 seconds), then reload.

### Write down

| Field | Value |
|---|---|
| Address and build | route A or B; the commit or short hash |
| T-128d in the build | yes / no |

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

## Block 7 — The garden comes back (stub)

**Needs: T-128e.** Will test TC-DEV-05: leave and come back (reload, browser closed): the bed returns within 4 s at the same spot with the same key and scale, the drift in cm, or "re-placed" with every plant kept; S1 block 16 holds the longer runs.

## Block 8 — Pause and resume (stub)

**Needs: T-128e and T-152.** Will test TC-DEV-08: the Quest button for 30 s and the headset off for 5 s: the sound comes back on return, in time, and whether it needs a pinch (S1 block 9 has the first look).

---

## Block 9 — Hand the results to Claude (5 min)

**Can be run today.**

1. Fill the results sheet below in your results note (not in this file).
2. Send it as in S1 block 20 (mail to yourself, or the USB route). There is nothing to copy from the app's pages in these blocks: every result is in your note.

---

## Results sheet

| # | What | Your result | Who waits for it |
|---|---|---|---|
| 0 | Build, and T-128d in it | | Claude: which blocks counted |
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
| 2–6 | `fps` usual and lowest with plants and hands | | Golden Rule 5, TC-PERF-01 |
| 2–5 | Anything you could only do with a controller | | FR-HND-01 (Stage-1 pass/fail) |

---

## For Claude: before the sitting

- When T-128d lands: check blocks 2 to 5 against `BedRenderSystem`'s handlers and `app.ts` (the enter button's words, the bookmarks, `__roomsong.garden`), and take the "(from the plan)" marks off.
- If the pinch test (S1 blocks 2 and 3) changes the hit radius or the outer radius (D-020), update the 4 cm, 35 cm, 57 cm and 10 cm figures here.
- When T-164 or T-128d builds the shaping sounds, give the sound rows of blocks 2 to 4 their rule.
- When T-148 is merged: check blocks 6A to 6D against `develop` (the constants, the waking pinch's seed exception, the pause, `18-listen.spec.ts`'s draw count) and take the branch mark off. If D-050's numbers (40°, 1.5 s, 0.6 s, 0.45 m, 30°) change after a sitting, change them here. When the gaze dwell on the orb (T-160) or the wrist orb of one-hand mode (UX §9.1) is built, add a step to 6A.
