# Device script S1 — the first sitting with a headset (T-129)

**Status:** ready to run. Nothing in it has been tried on a headset. · **Owner:** qa-engineer · **Written:** 2026-10-12 against `develop` 32eea00.

This script produces results. It contains none.
Every step about our own pages was checked against the page's source code.
A step marked **(unchecked)** is about the headset's own menus, which nobody on the team has seen yet. If a menu looks different, do the nearest thing and write down what it was called.

You need only this file during the sitting.

## The sitting at a glance

| # | Block | Answers (codes of the T-129 row) | Time |
|---|---|---|---|
| 0 | Get the pages onto the headset | first load of the app page | 15 min |
| 1 | Capability page, three runs | P1 labels · F1/F2 frame rates · W1 audio · A1 anchors ×2 · M1 mesh · do hands send `select` events | 15 min |
| 2 | Pinch page, first run | H1 pinch on the ring · G1 field of view | 10 min |
| 3 | Pinch page, smoothing runs | hand smoothing ("beta") | 20 min |
| 4 | Garden preview in passthrough | the garden's look · frame rate with the garden drawn | 10 min |
| 5 | The app: landing page and entry | start time · no drawn hands | 10 min |
| 6 | Sound page on the headset speakers | bass · steady time · headset taken off | 15 min |
| 7 | Same room, second session | does the key, the scale or the echo change between sessions | 5 min |
| 8 | A room without Space Setup | what the headset gives with no room scan | 10 min |
| 9 | Decline the room permission | P2 permission decline | 10 min |
| 10 | Hand the results to Claude | — | 10 min |

Total: about 3 hours, with 30 minutes of setup and two short breaks. The plan said about 4 hours: the difference is the list "Not testable yet" near the end.

**One change from the order in the plan:** "decline the room permission" (P2) is last, not second. Every other block needs the room data, and nobody knows yet how easily a declined permission is switched back on.

Pass and fail: each block has its rule. Where the documents give a number, the rule is that number. Where they give none, it says "write down what you see", and that is the result.

---

## Before you start

### Charge and connect

1. Charge the headset to 100 %. Keep its charger at the table and plug it in at every break.
2. Keep the Mac on power.
3. Join the headset to the same Wi-Fi as the Mac. Use the home network, not a guest network: guest networks often stop devices from seeing each other.

### Headset, once (unchecked)

1. Phone, Meta Horizon app → Devices → your headset → Developer Mode: on. Restart the headset. This is needed only for the USB way of copying results (block 10).
2. Headset Settings → Movement tracking → Hand tracking: on. Another document calls this path Settings → Tracking → Hand and Body Tracking. Write down the real path: the app's own error message quotes the first one.
3. Run Space Setup in the test room. It must have the walls, the floor and the ceiling, and your table added as a table.
4. In Meta Quest Browser, sign in to your email. You will paste results into a mail to yourself. Do not use a private window: the pages keep their results in the browser.

### Leaving a session with hands only (unchecked)

Blocks 4 and 5 start a session that does not end by itself. To leave:

1. Look at your palm at eye level.
2. Hold thumb and index finger together until the icon fills, then let go. The headset's menu opens.
3. Leave or close from there.

If you had to press a controller button to leave, write that down: it is a finding.

### Mac, once

1. In the repository folder, `git status` shows a clean `develop`.
2. `npm install` has been run. If it fails with `EACCES`: `npm install --cache "${TMPDIR:-/tmp}/roomsong-npm-cache" --no-audit --no-fund`.
3. For the USB way of copying results: Android Platform Tools (`adb`), Chrome and a USB-C cable.

### The room

- The room where you ran Space Setup, and the table you added. Clear the table top.
- Best is a table at least 75 cm deep in front of you: the far edge of the garden is 75 cm from your head.
- Ordinary room light. You will write down "bright", "normal" or "dim".
- A second room where Space Setup was never run, with any table or desk, in reach of the same Wi-Fi (block 8).
- Controllers out of reach for the whole sitting. If you ever need one, write down where: that is a finding.

### Two things beside you

1. The Mac, with this file open and a plain note for the results (or the Claude chat). Do not type results into this file.
2. A tape measure.

### Measure with the tape before the headset goes on

| What | Write down |
|---|---|
| Headset model | Quest 3 or Quest 3S |
| Lighting | bright / normal / dim |
| Table shape and colour | rectangle / round / other; light / dark |
| Table height, floor to table top | cm |
| Table depth, your edge to the far edge | cm |
| Ceiling height, floor to ceiling | cm |
| Room length and width | m × m |
| Second room: table height | cm |

---

## Block 0 — Get the pages onto the headset (15 min)

**Purpose:** open the pages in Meta Quest Browser, and time the very first load of the app page while nothing is stored yet. There are two routes. Use route A if the public site is live and was published after 2026-10-12 (an older one has no garden preview and no landing page). Use route B otherwise. The sound page (block 6) always comes from the Mac.

**Answers:** TC-DEV-01 and FR-SYS-06, the first half (time to a ready page) · the two routes of DEPLOYMENT_GUIDE §1 and §3.

**Checked against:** `vite.config.ts` (the build holds the app page, `proto/spike/`, `proto/pinch/` and `proto/bed/`), `package.json` (`preview`), the certificate code of the dev plugin, a local build, `src/ui/Landing.ts` and `src/ui/strings.ts` (the words on the app page), `src/core/flags.ts` (`dev=1`), DEPLOYMENT_GUIDE §1 and §3, ENVIRONMENT_SETUP §3 and §7.

### Route A — the public address (only after you have gone live on GitHub Pages)

1. Headset: open Meta Quest Browser.
2. Type `https://parthdalvi2001.github.io/Roomsong/` (capital R: the address is case-sensitive). No warning is expected.
3. Count the seconds from the moment the page starts to load until the line "Getting the garden ready." under the button is gone. Write the count down as T1.
4. You see "Roomsong", "Grow a song on your table." and a button **Enter the garden**. Do not pinch it yet. Bookmark the page.
5. Open the same address followed by `proto/spike/`. You see "Roomsong - device capability spike". Bookmark it.
6. Open the same address followed by `proto/pinch/`. You see "Roomsong - pinch accuracy test". Bookmark it.
7. Open the same address followed by `proto/bed/?dev=1&flags=perfHud`. You see "Roomsong - bed preview". Bookmark it.
8. Open the same address followed by `version.json`. Write down the value of `commit`.

### Route B — the Mac over Wi-Fi

1. Mac, Terminal, in the repository folder. Stop old servers, so that no old page is served: `lsof -ti tcp:4173 | xargs kill`. A complaint from `kill` means nothing was running. (This also stops the sound preview Claude keeps running; block 6 starts a new one.)
2. `git rev-parse --short HEAD`. Write down what it prints.
3. `npm run build`
4. `npm run preview`. It prints a `Network:` line. Write down the address that starts with `https://192.168.`, with its port (4173, or the next free one).
5. If macOS asks whether to allow incoming connections: allow.
6. Leave this Terminal window open for the whole sitting.
7. Headset: open Meta Quest Browser and type that address. Example: `https://192.168.1.20:4173/`.
8. A full-page warning appears, because the Mac's certificate is self-made. In Chrome on a computer it reads "Your connection is not private". The headset's wording is unchecked.
9. Choose **Advanced**, then **Proceed to 192.168.… (unsafe)**. This is needed once.
10. Count the seconds from that press until the line "Getting the garden ready." under the button is gone. Write the count down as T1.
11. You see "Roomsong", "Grow a song on your table." and a button **Enter the garden**. Do not pinch it yet. Bookmark the page.
12. Open the same address followed by `proto/spike/`, then `proto/pinch/`, then `proto/bed/?dev=1&flags=perfHud`. No second warning is expected. Bookmark each.

### Write down

| Field | Value |
|---|---|
| Route used | A or B |
| Build | the `commit` (route A) or the short hash (route B) |
| T1, first load of the app page | seconds |
| The warning: what the headset showed and what you pressed | words |
| Anything you could not do with hands only | words |

**Pass rule:** T1 is half of a rule that block 5 completes (T1 + T2 at most 5 seconds). Route A is the number that counts: route B loads from your own Mac.

**If it fails:** the page does not load on route B → check that both are on the same Wi-Fi, that the address starts with `https://` and has the port, and that the Mac is awake. If the warning offers no way to continue, tell Claude: the fix is a trusted certificate (ENVIRONMENT_SETUP §8), and until then only route A works. A page under `proto/` that is missing on route A means the public site is older than that page: use route B.

---

## Block 1 — Capability page, three runs (15 min)

**Purpose:** ask the headset's browser what it really supports: room labels, frame rate, audio, saved anchors, room mesh, and whether a hand pinch sends `select` events.

**Answers:** T-104, TC-DEV-0A · P1, F1/F2, W1, A1, M1 · from T-124: do hands send `selectstart` and `selectend` · from T-123: which labels, whether planes are there early, what the hit-test meets · from T-141: room size, first session · D-034: how level the table plane is.

**Checked against:** `proto/spike/index.html`, `src/main.ts`, `src/probe.ts`, `src/config.ts`, `proto/spike/README.md`.

### Steps

1. Sit at the table, belly at its edge, facing it. Controllers away.
2. Open the capability page. Pinch **Start** (point your hand at it and pinch).
3. Allow everything the headset asks for. You have one minute to answer.
4. You see your room. For the first 10 seconds look straight ahead over the table, head level. The page sends a test ray from your head down at the table, and makes an anchor half a metre in front of you.
5. After about 7 seconds the view turns faintly green. Pinch once with thumb and index finger, hand in front of you, and let go.
6. You hear a short click. No click after a clear pinch is a result: write it down.
7. Six steps of sound follow, 2 seconds each: 8, 16, 24, 32, 48 and 64 voices. Remember the first step that crackles.
8. The session ends by itself, after 45 seconds at the latest. The page says "Done. The results are below."
9. Answer the three questions on the page: **Which run was this** = "run 1: allow" · **The sound started to crackle at** · **Room permission on this run** = "allowed".
10. Fill in the "always" rows below from the table on the page.
11. **Run 2.** Reload the page. Pinch **Start**. Repeat steps 4 to 10 with "run 2: after a reload".
12. **Run 3.** Close Meta Quest Browser completely and open it again (unchecked). Open the bookmark. Pinch **Start**. Repeat steps 4 to 10 with "run 3: after a browser restart".
13. Pinch **Copy JSON**. The page says "Copied." Open your mail in a new tab, paste, send it to yourself, and check on the Mac that it arrived.
14. If the mail did not arrive: fill in the second group of rows by hand for run 3, and carry on. The page keeps every run, and block 10 has a second way to get them.

### Write down, once per run

How to read the page: the table has one row per value. A value shown as `null (…)` has its reason in the brackets: copy the reason.

| Always | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| Clock time of the run | | | |
| `emulator` | | | |
| `completed` | | | |
| `planes.labels` (copy the list exactly) and `planes.desk` | | | |
| Click heard: yes / no | | | |
| The crackle step you answered | | | |
| `anchors.restore.restored` | no earlier run | | |

| Only if the copied text did not reach the Mac | Value |
|---|---|
| `planes.count` and `planes.countAtEnd` | |
| `meshes.count` and `meshes.labels` | |
| `hitTest.hits` and `hitTest.height` (m) | |
| `anchors.created`, `anchors.tracked`, `anchors.persistentHandle`, `anchors.restore.tracked` | |
| The `type` of each `hands.pinchEvents` row, in order | |
| `hands.sources.0.joints` and `hands.sources.1.joints` | |
| `frameRate.supported`, `frameRate.current`, `frameRate.measuredFps`, `frameRate.longestFrameMs` | |
| `frameRate.fixedFoveation` and `frameRate.fixedFoveationSettable` | |
| `audio.state`, `audio.baseLatency`, `audio.outputLatency`, `audio.pinchToSound.totalMs` | |
| `audio.polyphony.0.underrunEvents`, `.1.` and `.2.` (the steps of 8, 16 and 24 voices) | |
| Floor: find the row `planes.samples.N.label` that names the floor (N is a number); with the same N write `size` (two numbers, m) and the middle number of `position` | |
| Ceiling: the same for the ceiling: the middle number of `position` (m) | |
| Table: the same for the table: `plusY` (three numbers), the middle number of `position`, and `size` | |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| A real headset result | `emulator` is `null` in every run | TC-DEV-0A |
| P1 labels | planes are found and `planes.labels` holds real labels. For the room to tune the song the list must include a floor and a ceiling. This is the gate for the room signature | TC-DEV-0A gate, D-028 |
| W1 audio | no crackle at 8, 16 or 24 voices, and `audio.state` is `running` | TC-PERF-06, NFR-PERF-10 |
| A1 anchors | `anchors.restore.restored` is `true` in run 2 and in run 3: report it as n of 2 | TC-DEV-05 |
| F1/F2 frame rate | no rule for an empty page. The game's own rule is 72 typical and never below 60, so an empty page below 72 is a warning: write it down | TC-PERF-01 |
| `select` events, M1 mesh, hit-test, joints | write down what you see. Compare `hitTest.height` with the table height from your tape | — |

### If it fails

- The page says "Stopped early: …" or "The probe failed: …": write down the reason and pinch **Start** again. Nothing measured is lost: the page saves after every step.
- No planes or no labels: check that Space Setup was run in this room, and run once more. If still none, the game already has its fallback (a floating bed and the default "Wanderer" tuning), and the room signature is not built. Tell Claude.
- No click and no `hands.pinchEvents`: the browser sends no `select` events for hands. The game then uses the distance between thumb and finger for everything (FR-HND-02).
- An anchor does not come back: the game places the bed again and keeps every plant. That is the accepted fallback, not a failure by itself.
- Crackle at 24 voices or fewer: the voice limit can go down to 16. Tell Claude.

---

## Block 2 — Pinch page, first run (10 min)

**Purpose:** find the smallest dot spacing you hit on the first try, and whether the ring's outer and inner rows are within easy reach and in view.

**Answers:** T-105, TC-DEV-00 · H1, G1 · D-020 (bed distance, outer radius, view box) · D-027 (no drawn hands) · D-030 (how often hands are lost) · D-034 (how far the table is below your eyes) · from T-123: which label the table has, and whether its plane is there in the first second.

**Checked against:** `proto/pinch/index.html`, `src/main.ts`, `src/trials.ts`, `src/config.ts`, `src/hands/config.ts`, `proto/pinch/README.md`.

### Steps

1. Sit with your belly at the table edge, facing the table. Controllers away.
2. Open the pinch page (nothing after the last `/` of the address). Pinch **Start**. Allow hand tracking and spatial data if asked.
3. Keep facing the table while it starts. The dots are placed 45 cm in front of where your head is in the first second.
4. Dots appear on the table. One glows yellow: pinch it once with thumb and index finger, either hand.
5. Keep the other hand open or in your lap. If its thumb and finger drift together, that counts as a pinch.
6. One pinch per dot. Never correct a miss. High tick and green = hit. Low tone and red = miss.
7. Wait for the next dot to light, a bit over half a second. Keep a steady pace.
8. Four rounds of 20: dots 3 cm apart, 4 cm apart, 5 cm apart, then the real ring.
9. In the ring round, look once at the centre of the ring and keep your head still: can you see the whole ring?
10. A grey dot means the headset lost your hands. Bring a hand back into view and carry on. Count these moments.
11. Do not open the headset's menu with a pinch: it counts as a pinch. To stop early, pinch the big blue dot on your left.
12. After the last dot the session ends by itself. The page shows a results table and one line under it.
13. **Do not pinch Start and do not reload yet: this page keeps nothing.** Fill in the table below from the page first.
14. Pinch **Copy JSON**. Open your mail in a new tab, paste, send it to yourself. Name the mail "pinch, first run".

### Write down from the page

| Block (row on the page) | First try | First try unfiltered | Median ms | Pinch-to-sound median ms | Pinch-to-sound max ms |
|---|---|---|---|---|---|
| 3 cm grid (of 20) | | | | | |
| 4 cm grid (of 20) | | | | | |
| 5 cm grid (of 20) | | | | | |
| bed outer ring (of 10) | | | | | |
| bed inner ring (of 10) | | | | | |

| The line under the table | Value |
|---|---|
| Surface: `table`, `plane` or `floating`, and the label in brackets | |
| Surface height (m), and how far below the head (m) | |
| Degrees to each side, up and down | |
| "fits" or "does not fit" | |

### Write down what you saw

| Question | Answer |
|---|---|
| Clear pinches that got no tone | count |
| Tones you did not mean | count |
| Grey-dot moments, and where your hands were | count, words |
| Did the dots lie on the table top, float above it or sink into it? | cm |
| Did the blue dot stay on the same spot of the table from start to end? | yes / moved about … cm |
| The dots are drawn over your real hands, and no hands are drawn. Did that make aiming harder? | words |
| Whole ring in view when you looked at its centre, head still? | yes / no, which edge was cut |
| Could you reach the farthest dots without leaning? Were the nearest dots too close to your body? | words |

### Pass rules (TC-DEV-00)

Decide on the column **First try unfiltered**. The column "First try" of this run is held back by the hand smoothing: block 3 deals with that.

| Check | Rule |
|---|---|
| Cell size | the smallest spacing with at least 18 of 20 is the cell size the game can use. Today's value is 4 cm |
| 5 cm grid below 18 of 20 | a top-severity bug: the ring is planned again |
| Outer ring | 9 or 10 of 10: the outer radius stays 0.30 m. Fewer: 0.25 m. With 8 or 9 the round is run once more: block 3 does that |
| Inner ring | fewer than 9 of 10: the ring gets 12 steps instead of 16 |
| "First try" lower than "First try unfiltered" | the smoothing trails your hand. It is no reason to change the bed |
| Table label and plane | the line says `table`: the table's plane was there in the first second and carries the label `table` or `desk`. Anything else: write it down |
| Table below the eyes | the game does not use a surface less than 0.25 m below your eyes (D-034). Write down the value |
| G1 view | the guideline is 25 degrees to each side and 20 up and down. By arithmetic the ring is 1 to 2 degrees outside it, so "does not fit" is expected: your answer to "whole ring in view" decides |

### If it fails

- "The session did not start: …": hand tracking is off or was refused. Switch it on and pinch **Start** again.
- The line says `floating` although you sit at your table: the table is missing from Space Setup, or you were not facing it in the first second. Fix that and run again. The floating dots are the game's fallback and can be tested as they are.
- You pinched **Start** too early and the results are gone: run again. It takes 5 minutes.

---

## Block 3 — Pinch page, smoothing runs (20 min)

**Purpose:** find the smoothing value ("beta") at which the judged point no longer trails your hand. With the starting value 0 it trails by about 3 cm.

**Answers:** T-129 (beta, search about 5 to 50) · TC-DEV-00 (the second run is required) · FR-HND-03 · D-028 · the second look at the outer ring (D-020).

**Checked against:** `proto/pinch/src/main.ts` (`?beta=`, 0 to 100; the copied text names the value), `src/hands/config.ts`, `proto/pinch/README.md`.

### Steps

1. Rest your hands for two minutes.
2. Open the pinch page with `?beta=10` at the end of the address: `…/proto/pinch/?beta=10`.
3. Do block 2, steps 2 to 14. Name the mail "pinch, beta 10".
4. In the copied text, check that the line near the top reads `"beta": 10`.
5. Do it again with `?beta=20`. Name the mail "pinch, beta 20".
6. If "First try" is still below "First try unfiltered" at 20, and you have time: once more with `?beta=50`.
7. If the two columns were already equal at 10, and you have time: once more with `?beta=5`.

### Write down

The block 2 table "Write down from the page", once per run, with the beta value on top. Also: which run felt easiest, in a few words.

### Pass rule

The documents give no number for beta. Write down the tables: the lowest beta at which "First try" matches "First try unfiltered" is the candidate, and Claude records the choice.

Two notes for reading them:
- "First try unfiltered" does not depend on beta. If it climbs from run to run, that is practice.
- The outer-ring rule of block 2 uses the unfiltered outer-ring counts of all runs together.

**If it fails:** no beta closes the gap → write that down. The game then keeps the starting value, and a dragged plant trails the hand by about 3 cm (D-028).

---

## Block 4 — Garden preview in passthrough (10 min)

**Purpose:** see the garden in your real room for the first time, and read the frame rate with it drawn. It is a picture that moves: no sound, nothing to pinch.

**Answers:** T-125 (the look, to rate) · TC-DEV-07 and TC-PERF-01, in part (frame rate with the garden drawn, without sound and without hands) · FR-UI-11 (flashing) · D-020 (the view box, now with plants).

**Checked against:** `proto/bed/index.html`, `proto/bed/src/main.ts`, `proto/bed/README.md`, `src/render/PerfHud.ts`, `src/render/config.ts`, `src/core/flags.ts`, `src/core/config.ts`.

**Know this first:** the preview does not look for your table. It puts the bed 45 cm in front of where you sit when the session starts, 72 cm above the floor. On a table of another height it floats or sinks: that is expected here.

### Steps

1. Sit at the table, belly at its edge, facing it.
2. Open the bed preview from its bookmark (the address ends in `proto/bed/?dev=1&flags=perfHud`).
3. You see "Roomsong - bed preview" and the garden drawn on a dark table. Pinch **Enter XR**. Allow what the headset asks.
4. You see your room, with the ring, 13 plants and a light that sweeps round the ring about every 3 seconds.
5. Right of the ring is a small panel with three lines: `fps` and `ms` · `draws` and `tris` · `voices` and `flash`.
6. Watch the panel for one minute. Write down the usual `fps`, the lowest `fps` you saw, and the other numbers.
7. Look at the garden and answer the questions below.
8. Leave the session (see "Leaving a session with hands only").
9. Open the same address with `,autoplant=80` added at the end: `…/proto/bed/?dev=1&flags=perfHud,autoplant=80`. This is the full bed, 80 plants.
10. Pinch **Enter XR**. Watch the panel for one minute. Write down the same numbers. Leave the session.

### Write down

| Number on the panel | 13 plants | 80 plants |
|---|---|---|
| `fps`, usual | | |
| `fps`, lowest seen | | |
| `ms` | | |
| `draws` and `tris` | | |
| `flash` (shown as a count out of 3) | | |

| Question | Answer |
|---|---|
| Where did the bed appear? | on the table / above it by … cm / inside it / somewhere else |
| The ring's guide lines over your real table | clear / faint / not visible |
| The sweeping light | clear / faint / not visible |
| Can you tell the three plant shapes apart at a glance? | yes / no |
| Anything too bright, too dim, or flickering | words |
| Whole ring and all plants in view when you look at its centre, head still? | yes / no, which edge was cut |
| The look, 1 to 5, and one thing to change first | number, words |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Frame rate | usual `fps` at least 72 and never below 60, with 13 plants and with 80 | TC-PERF-01 |
| Script time | `ms` at most 6 | NFR-PERF-05 |
| Drawing budget | `draws` at most 60, `tris` at most 150,000. The emulator showed 14 draws, and 11,724 and 36,412 triangles | Golden Rule 5, `proto/bed/README.md` |
| Flashing | `flash` at most 3 | FR-UI-11 |
| The look | write down what you see | — |

A pass on frame rate here is needed but not enough: the real test runs 10 minutes with sound and hands (TC-DEV-07, not testable yet).

### If it fails

- No **Enter XR** button, and the page says "This browser has no WebXR session to offer": write it down and tell Claude.
- No panel beside the ring: the address lacks `dev=1`. A built page ignores `flags` without it.
- The bed is behind you or to the side: you were not facing the table when the session started. Leave, face the table, enter again.
- `fps` below 72 with 13 plants: nothing to do in the sitting. Tell Claude: the performance work (T-165) moves forward.

---

## Block 5 — The app: landing page and entry (10 min)

**Purpose:** check the app's first screen and the step into the room. Inside the session there is nothing to see yet: the garden is not wired into the app.

**Answers:** T-126 · TC-DEV-01, the part that exists (in the room within 5 seconds) · FR-SYS-01, FR-SYS-02, FR-SYS-03 · D-027 (no drawn hands, in the app itself) · Golden Rule 1 (hands only).

**Checked against:** `index.html`, `src/index.ts`, `src/ui/Landing.ts`, `src/ui/strings.ts`, `iwsdk.config.json` (hand tracking required; planes, mesh, anchors and hit-test optional), `public/scenes/main.iwsdk.scene.json` (an empty scene).

### Steps

1. Open the app page from its bookmark. You see "Roomsong", "Grow a song on your table.", the button **Enter the garden**, a list "This device", four boxes under "Access", "Help", and a last line about saving.
2. Write down the four lines under "This device".
3. Pinch each of the four "Access" boxes on, then off again. Pinch "Help" to open it. Does every one react to a hand pinch?
4. Sit facing the table. Pinch **Enter the garden**. Allow what the headset asks.
5. You see your room and your real hands, and nothing else. No drawn hands and no controllers should appear.
6. Look around for 20 seconds. Write down anything that is drawn, and any stutter of the room picture.
7. Leave the session (see "Leaving a session with hands only"). The landing page is back.
8. Write down the four lines under "This device" again: they now say what the session was given.
9. Pinch **Enter the garden** once more and count the seconds until you see the room. Write the count down as T2. The headset should ask nothing this time; if it asks again, write that down and count from your last answer.
10. Leave the session.
11. Look at the browser's address bar: does the browser show a button of its own for entering? Write yes or no. Do not use it.

### Write down

| Field | Value |
|---|---|
| "This device", before the first session | four lines |
| Every box, "Help" and the button work with a hand pinch | yes / which did not |
| Anything drawn in the session; drawn hands | words; yes / no |
| "This device", after the first session | four lines |
| T2, second entry | seconds |
| T1 (block 0) + T2 | seconds |
| The browser's own enter button | yes / no |
| Words on the page that are hard to read, or wrong | words |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Start time | T1 + T2 at most 5 seconds. You count by ear: write the number as you counted it | TC-DEV-01, FR-SYS-06 |
| Before the first session | "Immersive AR: supported.", and three lines that each say "checked when you enter" | `src/ui/strings.ts` |
| After the first session | "Hand tracking: on." If you allowed the room: "Plane detection: on. The garden looks for your table." and "Anchors: on. The garden can come back to the same place." They must agree with `features.granted` of block 1 | `src/ui/Landing.ts` |
| No drawn hands | none, and nothing else drawn | D-027 |
| Hands only | every control on the page reacts to a pinch | Golden Rule 1 |

### If it fails

- Under the button: "The garden did not open. Check that hand tracking is on in the headset: …". Switch hand tracking on and enter again.
- Under the button: "The garden could not load. Reload the page." Reload. If it says so again, tell Claude: it is a bug.
- Under the button on the headset: "Roomsong needs immersive AR. …". Tell Claude: it is a top-severity bug.

---

## Block 6 — Sound page on the headset speakers (15 min)

**Purpose:** hear the garden loop on the headset's own speakers: is the low drone there, does the loop keep steady time, and what happens to the sound when the headset comes off.

**Answers:** T-129 (bass on the headset speakers) · T-103 (listening review, one more rating) · from T-121: steady time and the stop when the headset is taken off, as far as this page can show it.

**What this block cannot show:** this is an ordinary web page, not the game inside a session. The game's own audio inside a session is under "Not testable yet".

**Checked against:** `proto/sound/index.html`, `src/main.ts`, `src/engine.ts`, `src/signatures.ts`, `src/garden.ts`, `package.json`, `vite.config.ts`, `proto/sound/README.md`. The root build does not contain this page, so it is not on the public address.

### Steps on the Mac

1. Open a second Terminal window in the repository folder.
2. `cd proto/sound`
3. `npm install` (first time only; with `EACCES` add `--cache "${TMPDIR:-/tmp}/roomsong-npm-cache"`).
4. `npm run build`
5. `npx vite preview --host --port 4175 --strictPort`. Write down the `Network:` address that starts with `http://192.168.`.
6. Leave this window open.

### Steps on the headset

1. No headphones. Set the headset volume to about the middle and write down the level.
2. Type the address from the Mac. It starts with `http://`, without an s. If the browser says the page is not secure, continue (unchecked).
3. You see "Roomsong - sound prototype". Pinch **Play**.
4. Listen for 30 seconds. The room line reads "Wanderer". The low, slow drone is the Pad. Can you hear it?
5. Pinch **Next room** twice. The room line reads "Hall": the lowest key on this page, with a drone at about 110 Hz and the longest echo. Listen for 30 seconds. Can you hear the drone? Is the echo clearly longer?
6. Only if you can hit the small circles: pinch each Bell and each Pluck plant on the ring to remove it (the legend shows the colours). Only the two Pads are left. Listen for 30 seconds. Then pinch **Reset garden**.
7. Listen for one more minute and count stutters, gaps and clicks.
8. Read the line under the meter and write down the number after `tick` (the work of one audio tick, in ms).
9. While it plays, take the headset off and hold it. Does the sound stop? After how many seconds?
10. Put the headset back on. Is the sound there by itself? Clean, or with a jump?
11. Pinch **Stop**.
12. Rate it from 1 to 5: "If a garden you planted yourself sounded like this, would you keep listening and add more plants?" Add one sentence on what to change first.

### Write down

| Field | Value |
|---|---|
| Headset volume | level |
| Drone in "Wanderer" | clearly / faintly / no |
| Drone in "Hall"; echo longer | clearly / faintly / no; yes / no |
| Pads alone | clearly / faintly / no / not done |
| Anything harsh, muddy or crackling | words |
| Stutters, gaps or clicks in one minute | count |
| `tick` | ms |
| Headset off | stops after … s / keeps playing / stutters |
| Headset back on | plays cleanly / jumps / silent until Play |
| Rating and one sentence | 1 to 5, words |

### Pass rules

- Steady time: 0 stutters or gaps with the headset on (the page plans every note 120 ms ahead from a 25 ms tick).
- Bass and the headset coming off: the documents give no number. Write down what you hear.

### If it fails

- The page does not open: check the `http://` and the port 4175, and that the second Terminal window is still running.
- The drone is faint or missing: nothing to do in the sitting. The sound pass (T-164) raises it or adds overtones, and the lower Bass voice of T-144 needs this same check.
- The sound keeps playing with the headset off: expected for this page, which has no pause of its own. The game's pause is T-152.

---

## Block 7 — Same room, second session (5 min)

**Purpose:** measure the same room again, to see whether the room would get the same key, scale and echo twice.

**When:** at least 30 minutes after block 1, at the same table and seat. The headset has been off your head in between (block 6 did that).

**Answers:** T-129 (two sessions in one room) · from T-141: ceiling height and floor area on two visits · TC-DEV-13 (last sentence) · D-028 (echo from room volume) · A1 once more: an anchor that is about an hour old.

**Checked against:** `proto/spike/src/probe.ts` (`readScene`: one plane per label with its size and position), `src/garden/config.ts` (the limits below).

### Steps

1. Open the capability page from its bookmark. Pinch **Start**. Allow everything.
2. Look straight ahead over the table for 10 seconds. Pinch once when the view turns green. Wait for the end.
3. Leave **Which run was this** on "not answered". Answer the other two questions.
4. Write down the clock time, and the rows below.
5. Pinch **Copy JSON** and mail it to yourself, as before.

### Write down

For floor and ceiling, read the rows as in block 1. Ceiling height = the ceiling's middle `position` number minus the floor's.

| | Block 1, run 1 | Run 2 | Run 3 | Block 7 | Your tape |
|---|---|---|---|---|---|
| Floor `size` (m × m) | | | | | |
| Floor area = the two numbers multiplied (m²) | | | | | |
| Ceiling height (m) | | | | | |
| Volume = area × height (m³) | | | | | |
| `planes.labels` | | | | | — |
| `anchors.restore.restored` and `.tracked` | — | | | | — |

### Pass rule

Every session lands in the same band, in all three rows of this table:

| Measure | Bands | What it sets |
|---|---|---|
| Floor area (m²) | below 8 · 8 to 17 · 17 to 34 · 34 and over | the key |
| Ceiling height (m) | below 2.60 · 2.60 to 2.90 · 2.90 and over | the scale |
| Volume (m³) | below 28 · 28 to 46.6 · 46.6 to 65.2 · 65.2 to 87 · 87 to 111.8 · over 111.8 | the echo length |

A value that changes band between sessions, or a ceiling within 5 cm of 2.60 or 2.90 m, is the result to report.

The page measures the box around one floor plane and the height of one ceiling plane. The game's own measurement (T-140) may give slightly different numbers; what counts here is how much they move between sessions.

**If it fails:** nothing to do in the sitting. The choice afterwards is to keep it, to remember the last result, or to promise less (PROGRESS, "Know this about the room tunes the song").

**If you still have the headset the next day:** do this block once more. That is the real second visit, and it takes 2 minutes.

---

## Block 8 — A room without Space Setup (10 min)

**Purpose:** see what the headset gives in a room it has never scanned: planes, mesh, and what the test ray hits.

**Answers:** from T-123: what the hit-test meets without Space Setup · TC-DEV-02 (b), in part · TC-DEV-00 (the optional floating run).

**Checked against:** `proto/spike/src/probe.ts` (hit-test: one ray from the head, 60 degrees below straight ahead, for 1 second), `proto/pinch/src/main.ts` (`findSurface`: no plane means dots floating 45 cm below the head).

### Steps

1. Carry the headset to the second room. Sit at its table or desk.
2. Open the capability page. Pinch **Start**.
3. If the headset offers to scan or set up this room: say no (unchecked; write down what it asked). Allow the rest.
4. Look straight ahead over the table for 10 seconds. Pinch once when the view turns green. Wait for the end.
5. Leave **Which run was this** on "not answered". Write down the clock time and the rows below.
6. Open the pinch page (plain address). Pinch **Start**. Pinch five or six dots, then pinch the big blue dot on your left to finish.
7. Write down the line under the table.

### Write down

| Field | Value |
|---|---|
| What the headset asked in this room | words |
| `planes.count`, `planes.countAtEnd`, `planes.labels` | |
| `meshes.count` | |
| `permission.detectedPlanes` | |
| `hitTest.hits` and `hitTest.height` (m); the table height from your tape | |
| `anchors.created` | |
| Pinch page, the line under the table: Surface … | |
| Floating dots: were they at a height you could use? | words |

**Pass rule:** write down what you see. A hit at about the table's height means that a pinch on a surface (the game's third way to place the bed) has something to work with.

**If it fails:** the ray hits nothing → the game's last way to place the bed is the floating bed, which needs no room data.

---

## Block 9 — Decline the room permission (10 min)

**Purpose:** see what the browser returns when the player says no to the room request, and that everything else still works.

**Answers:** T-104, TC-DEV-0A run 4 · P2 · FR-ROOM-04.

**Checked against:** `proto/spike/src/probe.ts` (`setScene`: the `permission` fields), `src/config.ts` (every feature is asked for as optional), `iwsdk.config.json` (the game requires hand tracking only), `proto/spike/README.md` step 9.

### Steps

1. Go back to the first room and the first table.
2. Make the results so far safe first: do block 10, steps 1 to 3, now. The reset in the next step may also wipe what the page has saved (unchecked).
3. Open the capability page. Reset this site's permissions: the icon left of the address (unchecked; the menu names may differ).
4. Reload. Pinch **Start**. When the headset asks for the room or for spatial data: decline. Allow hand tracking.
5. If the session starts: pinch once when the view turns green, listen to the six steps, wait for the end.
6. On the page: **Which run was this** = "run 4: decline" · **Room permission on this run** = "declined", or "the headset did not ask".
7. Write down the rows below.
8. Pinch **Copy JSON** and mail it to yourself: it now ends with this run.

### Write down

| Field | Value |
|---|---|
| The words of the headset's question, as well as you remember | words |
| Did the session start; `completed` | yes / no |
| `features.granted` and `permission.notGranted` | |
| `permission.detectedPlanes` and `permission.detectedPlanesAtEnd` | |
| `permission.detectedMeshes` and `permission.detectedMeshesAtEnd` | |
| `planes` (copy the reason in the brackets) | |
| `hitTest.hits`, `anchors.created` | |
| Click heard on the pinch | yes / no |

**Pass rule:** the session still starts and the pinch still clicks with the room declined. The rest: write down what you see.

**If it fails:** the session does not start at all → tell Claude: it becomes a bug, because the game asks for the same features in the same way. If you cannot switch the permission back on afterwards, look in the browser's site settings (unchecked): this is why the block is last.

---

## Block 10 — Hand the results to Claude (10 min)

**Checked against:** `proto/spike/src/main.ts` (Copy JSON, the storage key `roomsong.spike.runs`), `proto/pinch/index.html` and `src/main.ts` (the element `json`; nothing is stored), `proto/spike/README.md` steps 10 to 13.

1. Capability page: pinch **Copy JSON**. It copies every run kept in this browser, newest last.
2. Open your mail in a new tab, paste, send it to yourself.
3. If "Copied." does not show, the page says "Copying was blocked. The text is selected: copy it by hand." Do that.
4. If copy or paste does not work at all (unchecked): connect the headset to the Mac by USB and allow USB debugging in the headset. In Chrome on the Mac open `chrome://inspect/#devices` and click **inspect** under the page.
5. In its Console, for the capability page: `copy(localStorage.getItem('roomsong.spike.runs'))`. The text is now on the Mac's clipboard.
6. In its Console, for the pinch page while its results are still on screen: `copy(document.getElementById('json').textContent)`.
7. Check before you send anything: every capability run reads `"emulator": null`.
8. Give Claude, in one message: the capability text · each pinch text with its beta · your filled-in tables · the tape measurements · headset model and lighting · the route and the build from block 0 · the clock time of each capability run and what it was (run 1, 2, 3, second session, other room, decline).
9. On the Mac, stop both servers: Ctrl+C in both Terminal windows.

The copied text holds the browser version and the sizes and heights of the surfaces in your room, and nothing else about you. A public GitHub issue would show those sizes to everyone: a mail to yourself does not.

---

## One-hour version, for a borrowed headset

**Checked against:** the blocks above; the research note `specs/09-research/research_notes/Roomsong product discovery research/07_headset_logistics_and_rules.md` (question 1b) for the two headset features named here. Both are unchecked.

Ask the owner beforehand: headset charged, hand tracking on, Space Setup done in the room with the table added as a table.

1. The address: the public one (route A). Without it, bring the Mac, join the owner's Wi-Fi and use route B: the `Network:` address is a new one there.
2. To skip typing: on a phone signed in to the Meta Horizon app, open `https://www.oculus.com/open_url/?url=` followed by the page's address in encoded form (`https%3A%2F%2F…`). It sends the page to the headset (Web Launch; it takes `https://` addresses only).
3. Block 0, the first load of the app page only: T1 (2 min).
4. Block 1, runs 1 and 2 only (8 min).
5. Block 2 (10 min).
6. Block 3 with `?beta=10` only (8 min).
7. Block 4 with 13 plants only (5 min).
8. Block 5, steps 4 to 9 (5 min).
9. Block 9 (8 min).
10. Block 10, by mail (5 min).
11. Block 6, steps 1 to 5 and 9 to 11, only if the Mac is there (8 min).
12. Left out: run 3, blocks 7 and 8, the other beta values, the 80-plant run.
13. Optional recording of block 2: Navigator → Camera → Record video. Do not record during block 1 or block 4: recording may lower the frame rate those blocks read. Clear the table and walls of brand names and photos first, and keep other people out of view.

---

## Not testable yet

One line each. No steps are written for these, because the part is not on `develop`.

| What | Arrives with |
|---|---|
| Planting in the real app; first sound within 20 s; first loop within 90 s (TC-DEV-01, second half) | T-127 (seeds), T-128 (wiring) |
| Captions over a bright wall: can they be read, is the contrast enough. The caption code is merged, but the app shows no caption until it is wired in | T-128 |
| The bed on your real table; the hint while the game waits for a pinch to place the bed (placement level 3); the exact time the first plane takes, against the 3-second wait; the refused pinch on a coffee table 0.4 m high | T-128; hints in T-150 |
| Saving in the app and finding the same garden again | T-128 |
| The saved anchor putting the bed back in place, and its drift in cm (TC-DEV-05). The capability page draws nothing at its anchor | T-162 |
| Frame rate over 10 minutes with sound, hands and 24 or more plants (TC-DEV-07) | T-128, then T-165 |
| The game's own 25 ms audio tick inside a session; a clean stop and return when the headset comes off (TC-DEV-08) | T-128, T-152 |
| The hand hint and the plant that goes back when hands are lost (TC-DEV-09, D-030) | T-116 |
| Pull, drag and drag-off (TC-DEV-03) | T-146 |
| The room's song in the room: the tuning ripple, two rooms that sound different (TC-DEV-13) | T-140, T-142, T-143 |
| The Bass voice, an octave below the pad, and the Choir | T-144 |
| The 3D-sound comparison (HRTF A/B) | T-145 |
| Listen mode, one-hand and gaze modes, the policy sweep on the headset (TC-DEV-04, 06, 11) | device script S2 (T-154) |
| The re-pinch time (about 153 ms expected at 72 Hz); the real gap between thumb and finger at pinch and at release, in cm; the outline of a round table's plane; the cost of a hit-test source that is not used; finger-to-sound time from a recording | no page shows these and no task owns the read-out yet |

---

## After the sitting

### Where the results go

You hand them over (block 10). Claude files them:

| Result | Filed in |
|---|---|
| Capability text, per headset model | `specs/04-development/ENVIRONMENT_SETUP.md` §9.1 |
| Pinch tables and texts | `specs/04-development/ENVIRONMENT_SETUP.md` §9.2 |
| Each choice made from them | `specs/08-status/DECISIONS_LOG.md` |
| Anything that failed, the same day | `specs/05-testing/BUG_LOG.md` |
| The summary, and TC-DEV-00 and TC-DEV-0A marked as run on a device | `specs/08-status/PROGRESS.md`, `specs/05-testing/TEST_PLAN.md` |

### What they unblock

| Decision or gate | From |
|---|---|
| D-020: outer radius 0.30 or 0.25 m; bed centre at 0.45 m; the view box | blocks 2, 3 and 4 |
| Cell size and hit radius (FR-HND-04, today 4 cm); 16 or 12 steps | block 2 |
| D-028: the smoothing value; whether echo-from-room-volume is steady enough | blocks 3 and 7 |
| D-027: no drawn hands | blocks 2 and 5 |
| D-030: the hand hint (only how often hands are lost; the hint itself is not built) | block 2 |
| D-034: table reach, the two height limits, the 5 degrees | block 1 (table plane), block 2 (table below the eyes), your tape |
| Room signature: build it or not (gate G1, T-130) | block 1 |
| Voice limit and audio latency setting (T-145) | block 1 |
| Anchors as a must-have (D-021, T-162) | blocks 1 and 7 |
| The garden's look (art pass T-163) and how early the performance work starts (T-165) | block 4 |
| Whether the app keeps the browser's own enter button (`xr.offer`, decided in T-128) | block 5 |
| The sound direction (T-103, sound pass T-164) | block 6 |
| The hand reader's switch to `XRFrame.fillPoses` (follow-up of T-124) | done after this run |

### The three results that could change the plan the most

1. **Block 1, `planes.labels`.** No floor, ceiling or table labels means the room cannot tune the song. The headline idea falls back to one default tuning, and the pitch and the video change.
2. **Block 2, the grids and the two rings.** Below 18 of 20 on the 5 cm grid, or a failed outer or inner ring, changes the bed itself: fewer or larger cells, a smaller ring, or 12 steps. Garden, visuals and tests follow.
3. **Block 7, a band that flips.** If the same room lands in another band on the second session, "same room, same key and scale" cannot be promised as written.

Next in line: a frame rate below 72 in block 4, and anchors that do not come back in blocks 1 and 7.

---

## For Claude: the T-129 row, clause by clause

| Clause of the row | Where |
|---|---|
| P1 labels | block 1 |
| P2 permission decline | block 9 (moved to the end) |
| H1 pinch on the ring (TC-DEV-00) | blocks 2 and 3 |
| F1/F2 frame rates and foveation | block 1 (an empty page), block 4 (the garden drawn, no sound, no hands) |
| W1 audio | block 1; the 3D-sound comparison is not testable yet |
| A1 anchors ×2 | block 1 (reload, restart), block 7 (after about an hour) |
| A1 drift | not testable yet (T-162); block 2 asks only whether the dots stay put within one session |
| M1 mesh | block 1 |
| G1 field of view | block 2 (dots), block 4 (plants) |
| Two sessions in one room | block 7 |
| Bass on the headset speakers | block 6 (the Pad; the Bass voice is not on `develop`) |
| Beta, about 5 to 50 | block 3 |
| Do hands send `select` events | block 1 |
| One-hour version | its own section |
| T-124: re-pinch time | not testable yet (no read-out) |
| T-124: `selectstart` and `selectend` for a hand pinch | block 1 |
| T-124: switch to `XRFrame.fillPoses` | after the run |
| T-121: the 25 ms tick inside a session; stop when the headset comes off | block 6 for an ordinary page; the game itself is not testable yet |
| T-141: ceiling height and floor area, two visits | blocks 1 and 7 |
| T-123: labels | blocks 1 and 2 |
| T-123: time to the first plane | only brackets: there in the first second (block 2), there at about 7 seconds (block 1) |
| T-123: hit-test without Space Setup | block 8 |
| T-123: round tables; cost of an unused hit-test source; the coffee table | not testable yet |
| T-123: the two height limits and the 5 degrees | blocks 1 and 2, your tape |
| From the reviews: the real pinch thresholds | block 2 counts pinches that got no tone and tones you did not mean; the gap in cm is not testable yet |
| From the reviews: caption legibility over a bright wall | not testable yet (T-128) |
| From the reviews: frame rate with the garden drawn | block 4 |
| The landing page and the entry (T-126) | blocks 0 and 5 |
| The garden's look in passthrough (T-125) | block 4 |
