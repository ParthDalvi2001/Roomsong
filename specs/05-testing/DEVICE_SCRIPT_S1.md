# Device script S1 — the sittings with a headset (T-129)

**Status:** the blocks marked "can be run today" are ready to run. Nothing in this script has been tried on a headset. · **Owner:** qa-engineer · **Written:** 2026-10-12 against `develop` 32eea00 · **Brought up to date:** 2026-10-13 against `develop` 3ca3392, with the headset notes from the reviews of T-116, T-121, T-123, T-124, T-128a, T-140, T-141, T-143, T-144, T-151 and T-162; the drawing checks of T-119 added against `develop` bbeb0c8; the tuning ripple's look (T-142) added to block 17 on 2026-10-16 against `develop` af94284; the first-minute guide (T-150) added to block 11 and the ripple's notes (T-142b) to block 17 on 2026-10-17 against `develop` dca03de; the PM's headset-week sound checks (Chinmay's 16 Oct update §7, which supersedes PM_PROPOSALS P-020; D-057) added to blocks 5, 11, 12, 14 and 15 on 2026-10-19 against `develop` 079944d; the device checks left open by the work of 23 to 25 Oct (the coffee table after BUG-010, the device half of T-166's room matrix, the chord when the bed lands) added to blocks 10 and 17 on 2026-10-25 against `develop` 93af00a.

This script produces results. It contains none.

How sure each step is:

- **No mark:** a step about our own pages, checked against the page's source code on `develop`.
- **(unchecked):** a step about the headset's own menus, which nobody on the team has seen yet. If a menu looks different, do the nearest thing and write down what it was called.
- **(from the plan):** a step about a part of the app that is not on `develop` yet. It is written from the plan and the review notes, not from code. When the part lands, Claude checks the step against the code and takes the mark off.

Every block starts with **Can be run today** or **Needs: a task**. "Today" means `develop` at 3ca3392: the test pages, and the app with its landing page, its Enter button, the session and the sound engine started, but no bed, no plants and nothing to hear yet. A block that needs a task can be run as soon as that task is merged and the build on the headset holds it (block 0 tells you the build).

You need only this file during the sitting.

## The sitting at a glance

| # | Block | Answers | Time | Can be run |
|---|---|---|---|---|
| 0 | Get the pages onto the headset | first load of the app page (T1) | 15 min | today |
| 1 | Capability page, three runs | P1 labels · F1/F2 frame rates · W1 audio · A1 anchors ×2 · M1 mesh and its label · do hands send `select` events | 15 min | today |
| 2 | Pinch page, first run | H1 pinch on the ring · G1 field of view | 10 min | today |
| 3 | Pinch page, smoothing runs | hand smoothing ("beta") | 20 min | today |
| 4 | Garden preview in passthrough | the garden's look · frame rate with the garden drawn · the light's dark edge, Bass and Choir shapes, growth, high contrast (T-119) | 25 min | today |
| 5 | Sound page on the headset speakers | bass · steady time · headset taken off · the speakers at 100 % | 15 min | today |
| 6 | Same room, second session | does the key, the scale or the echo change between sessions · an anchor about an hour old | 5 min | today |
| 7 | A room without Space Setup | what the headset gives with no room scan · a saved anchor asked for in another room | 10 min | today |
| 8 | The app: landing page and Enter | start times (T1, T2) · no drawn hands · does one click start sound and session | 15 min | today |
| 9 | The app: headset off and on, the menu, leaving | what a pause looks like to the app · does the sound come back by itself | 15 min | today (the steps you listen to: T-128d) |
| 10 | The app: the bed on your table | the bed on the real table · the hint when no table is found · the table limits of D-034 · a coffee table after BUG-010 | 15 min, and 7 min for the coffee table | needs T-128c (the coffee table: the BUG-010 fix too) |
| 11 | The app: plant, first sound, first loop | first sound within 20 s, first loop within 90 s · does a plant land where your fingers are · the first-minute guide: the ghost pinch, the hints from your seat, a stranger's first minute (T-150) · five first plays, thinking aloud (L5) | 10 min, and 8 min for the guide (12 more with a stranger); the five first plays 60 min, a sitting of their own | needs T-128d (with T-127); the guide needs T-150 |
| 12 | The app: the settings panel and its orb | the orb · reading the panel · hitting its buttons · the long hold · by looking · pinch to sound, filmed (F11) | 15 min, and 10 min for the film (10 more on the Mac afterwards) | needs T-128d; the film's panel press needs T-164 |
| 13 | The app: hands lost | the the hand-out-of-view icon (a palm in a dashed ring) words · the 0.2 s grace | 10 min | needs T-128d (with T-127) |
| 14 | The app: ten minutes with a full garden | frame rate with sound and hands · steady time · Bass on the speakers · drift of the bed · what a hand lights up (T-119) · speakers against headphones, and the app at 100 % (L7) · ten minutes kept on, startles, turning it down (L4, L8) | 30 min, and 31 min for the sound checks | needs T-128d |
| 15 | The app: a key change listened to | the re-tune, rated · does the sound come from the plant (L6) · the 3D-sound comparison (HRTF A/B, T-145) | 10 min, and 10 min for the sound as you move (15 more for the comparison) | needs T-128d; the comparison needs an HRTF switch, not built |
| 16 | The app: the garden comes back | the saved place: does the bed return, in how many seconds, how many cm off · the reach slack · the anchor count · a week later, in bloom (T-119) | 35 min | needs T-128e |
| 17 | Rooms against the tape measure | what the app reads of a room, against your tape · two rooms sound different · the tuning ripple's look and its three notes, once (T-142, T-142b) · the room matrix in six rooms, the device half of T-166 · the chord when the bed lands, once | 10 min a room (18 with the matrix), 20 min once for the ripple and 4 for the landing chord | needs T-128c; the ripple and the matrix need T-128d, the ripple's notes T-142b, the landing chord its fix |
| 18 | Say no: the room permission, and hand tracking off | P2 permission decline · what the app says | 15 min | today |
| 19 | Clear the site's data | do the saved places go with it | 10 min | part A today (USB cable) · part B needs T-128e |
| 20 | Hand the results to Claude | the filled results sheet | 10 min | today |

All of it is about 5 h 30 of blocks (5 h 45 with the stranger of block 11), over 6 hours with setup and breaks. That is too long for one sitting, so there are two, and a walk through other rooms. The PM's headset-week sound checks (D-057) add 51 minutes, and an hour with five new people: they have sittings of their own, in the table below. The checks of 23 to 25 Oct add 7 minutes to block 10, 8 minutes a room to the room walk (six rooms) and 4 minutes once.

| Sitting | Blocks, in this order | Time |
|---|---|---|
| **Sitting 1, the test pages and the app's entry.** Can be run today | 0 to 9 · 18 · 20 (and 19 part A only if time is left and you have a USB cable) | 2 h 50 of blocks; about 3 h 35 with 30 minutes of setup and two short breaks |
| **Sitting 2, the garden in the app.** Needs T-128c, T-128d and T-128e | 0 again for the new build (10 min) · the listening steps of 9 (5 min) · 10 to 16 · 19 (part A, if not done in sitting 1, and part B) · 20 | 2 h 50 of blocks (3 h with the stranger of block 11); about 3 h 30 with setup and breaks |
| **Room walk.** Needs T-128c | 17, in each other room you can reach; its ripple steps and the landing chord once, in room 1 (needs T-128d; the notes T-142b; the chord its fix); the room matrix in the six rooms it names (needs T-128d) | 10 minutes a room, 18 with the matrix, and 24 minutes once; any day you have the headset |
| **The sound checks (D-057).** Needs T-128d | 0 again for the new build (10 min) · the film of block 12 (F11) · the two sound checks of block 14 (L7; L4 and L8) · the sound as you move of block 15 (L6) · 20. Each check starts from its own "You need", so they also fit into sitting 2, each right after its block | 51 min of checks, 71 with blocks 0 and 20; about 1 h 30 with setup and a break. The 3D-sound comparison adds 15 min once its switch is built |
| **Five first plays (L5).** Needs T-128d | the five first plays of block 11 | 60 minutes and five people new to Roomsong; any day you have the headset |
| **One hour, a friend's headset.** Can be run today | see "One-hour version" near the end | 1 hour |

If only part of the integration is merged on the day of sitting 2, run the blocks whose "Needs" line is met and skip the rest. Blocks 10 and 17 need the least (T-128c), then 11 to 15 (T-128d), then 16 and 19 part B (T-128e).

**Why this order.**

- **Fresh things first.** Block 0 times the very first load, while nothing is stored.
- **The capability page before the app's bed.** From T-128c on, the app deletes every saved place ("persistent anchor") on its address that is not its own (D-040). The capability page keeps one there, one at a time. So blocks 1, 6 and 7 come before the app places a bed. Today the app saves no place, so in sitting 1 this cannot go wrong.
- **Things that are hard to undo last.** "Say no to the room" (block 18) comes after every block that needs the room, because nobody knows yet how easily a declined permission is switched back on. Clearing the site's data (block 19) is the very last thing before the hand-over: it wipes the saved garden and the pages' stored results.
- **One change from the order in the plan:** the plan had the permission decline (P2) second. It is near the end, for the reason above.
- **The app's blocks feed each other.** Block 11 plants the three starter seeds. Block 12 ends with "New garden", which gives three fresh seeds. Block 13 carries those seeds and plants none. Block 14 fills the empty bed by a flag and plants one seed by hand. Blocks 15 and 16 use that full garden.
- **If you do both sittings on one day,** follow the numbers from 0 to 20.

Pass and fail: each block has its rule. Where the documents give a number, the rule is that number. Where they give none, it says "write down what you see", and that is the result.

The **results sheet** near the end lists every number and every yes or no the developers wait for, with the decision or task that waits for it. Fill it as you go: the sitting ends with that one page.

---

## Before you start

### Decide before the day (PROGRESS item 22)

Write the five answers at the top of your results note.

| Question | Your answer |
|---|---|
| Which room and which table (at least 75 cm deep; round or not)? Is there a second room without Space Setup in reach of the same Wi-Fi? | |
| Your own headset or a borrowed one? Quest 3 or Quest 3S? | |
| Will the public site be live before the headset arrives? Only that route gives the real start-up time | |
| Results back by mail from the headset's browser, or by USB cable? | |
| Can you keep the headset overnight? Then blocks 6 and 16 are repeated the next day | |

### One address for the whole sitting

A saved garden and a saved place belong to the address they were made on. The public site, the mirror and the Mac are three different places to the headset, and so are two ports of the same Mac: what is saved on one is not seen on the other.

1. Open everything from **one address: the built site.** That is the public address (route A of block 0), or the Mac's preview of the build (route B). Both serve the app at `/` and the test pages at `proto/spike/`, `proto/pinch/` and `proto/bed/`.
2. If the public site is live, use it: it is the address that will be submitted, and the mirror is not tested in its place (from T-162).
3. **One exception: the sound page** (block 5). It is not part of the built site. It is opened from the Mac, from its own folder and its own port. It saves nothing, so this does no harm.
4. **A second exception, for one check only:** the dev server (block 9, last step). A garden saved there is not the garden on the built site.

### Charge and connect

1. Charge the headset to 100 %. Keep its charger at the table and plug it in at every break.
2. Keep the Mac on power.
3. Join the headset to the same Wi-Fi as the Mac. Use the home network, not a guest network: guest networks often stop devices from seeing each other.

### Headset, once (unchecked)

1. Phone, Meta Horizon app → Devices → your headset → Developer Mode: on. Restart the headset. This is needed for the Mac's console over USB (blocks 9, 16 and 19) and for the USB way of copying results (block 20).
2. Headset Settings → Movement tracking → Hand tracking: on. Another document calls this path Settings → Tracking → Hand and Body Tracking. Write down the real path: the app's own error message quotes the first one.
3. Run Space Setup in the test room. It must have the walls, the floor and the ceiling, and your table added as a table.
4. In Meta Quest Browser, sign in to your email. You will paste results into a mail to yourself. Do not use a private window: the pages keep their results in the browser.

### Leaving a session with hands only (unchecked)

Block 4 and blocks 8 to 17 start a session that does not end by itself. To leave:

1. Look at your palm at eye level.
2. Hold thumb and index finger together until the icon fills, then let go. The headset's menu opens.
3. Leave or close from there.

If you had to press a controller button to leave, write that down: it is a finding.

### Mac, once

1. In the repository folder, `git status` shows a clean `develop`.
2. `npm install` has been run. If it fails with `EACCES`: `npm install --cache "${TMPDIR:-/tmp}/roomsong-npm-cache" --no-audit --no-fund`.
3. For the console over USB and the USB way of copying results: Android Platform Tools (`adb`), Chrome and a USB-C cable.

### The Mac's console over USB (unchecked)

Some steps say **(console)**. They read lines that the app writes for developers. You need this for blocks 9, 16 and 19; elsewhere it is a bonus. Without a cable, skip the steps marked (console) and say so in the results.

1. Connect the headset to the Mac with the USB-C cable. In the headset, allow USB debugging.
2. Mac, Chrome: open `chrome://inspect/#devices`. The headset and its open pages are listed.
3. Click **inspect** under the page you are testing. A window opens. Choose its **Console** tab.
4. In the Console's level menu ("Default levels"), tick **Verbose**. The app writes its event lines at that level.
5. Open the app with `?dev=1&flags=eventLog` at the end of its address. Every event of the app is now a line in the Console: `[events]`, then the event's name, then its values. Example: `[events] xr:sessionStart`. Lines that start with `[app]` come from the app's start and its sound.
6. To type a command: click in the Console, type the line, press Enter. With `dev=1` the app offers `__roomsong` there: it holds `world` and `engine` (and `garden` from T-128d on).
7. The window closes when the page reloads or the browser restarts: click **inspect** again.

### The room

- The room where you ran Space Setup, and the table you added. Clear the table top.
- Best is a table at least 75 cm deep in front of you: the far edge of the garden is 75 cm from your head.
- Ordinary room light. You will write down "bright", "normal" or "dim".
- A second room where Space Setup was never run, with any table or desk, in reach of the same Wi-Fi (blocks 7 and 10).
- For the room walk (block 17): any other rooms you can reach with the headset. Most useful are a small desk room, a kitchen and a living room.
- Controllers out of reach for the whole sitting. If you ever need one, write down where: that is a finding. One planned exception: block 18 switches hand tracking off, and the headset's menus then need a controller. Keep one in the room, put down.

### Five things beside you

1. The Mac, with this file open and a plain note for the results (or the Claude chat). Do not type results into this file.
2. A tape measure.
3. A coin, or a small sticker. It marks the middle of the bed on the real table (blocks 14 and 16).
4. The USB-C cable, if you use the console.
5. A large sheet of white paper, or a white pillowcase or towel. It is the bright table for the sweeping light (blocks 4, 14 and 16).

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

**Can be run today.**

**Purpose:** open the pages in Meta Quest Browser, and time the very first load of the app page while nothing is stored yet. There are two routes. Use route A if the public site is live and its build holds T-128a (published on 2026-10-13 or later: an older one has another way in and other words on the page). Use route B otherwise. Whichever you choose, it is your one address for the whole sitting (see "One address for the whole sitting"). The sound page (block 5) always comes from the Mac.

**Answers:** TC-DEV-01 and FR-SYS-06, the first half (time from page load to a usable Enter button) · the two routes of DEPLOYMENT_GUIDE §1 and §3.

**You need:** the headset, the Mac on the same Wi-Fi, and for route B a Terminal window.

**Checked against:** `vite.config.ts` (the build holds the app page, `proto/spike/`, `proto/pinch/` and `proto/bed/`), `package.json` (`preview`), the certificate code of the dev plugin, a local build, `src/ui/Landing.ts` and `src/ui/strings.ts` (the words on the app page), `src/core/flags.ts` (`dev=1`), DEPLOYMENT_GUIDE §1 and §3, ENVIRONMENT_SETUP §3 and §7.

### Route A — the public address (only after you have gone live on GitHub Pages)

1. Headset: open Meta Quest Browser.
2. Type `https://parthdalvi2001.github.io/Roomsong/` (capital R: the address is case-sensitive). No warning is expected.
3. Count the seconds from the moment the page starts to load until the line "Getting the garden ready." under the button is gone. Write the count down as T1.
4. You see "Roomsong", "Grow a song on your table." and a button **Enter the garden**. Do not pinch it yet. Bookmark the page.
5. Open the same address followed by `proto/spike/`. You see "Roomsong - device capability spike". Bookmark it.
6. Open the same address followed by `proto/pinch/`. You see "Roomsong - pinch accuracy test". Bookmark it.
7. Open the same address followed by `proto/bed/?dev=1&flags=perfHud`. You see "Roomsong - bed preview". Bookmark it.
8. Open the same address followed by `?dev=1&flags=perfHud,eventLog`. It is the app page again, with the developers' read-outs switched on. Bookmark it as "app, dev".
9. Open the same address followed by `version.json`. Write down the value of `commit`.

### Route B — the Mac over Wi-Fi

1. Mac, Terminal, in the repository folder. Stop old servers, so that no old page is served: `lsof -ti tcp:4173 | xargs kill`. A complaint from `kill` means nothing was running. (This also stops the sound preview Claude keeps running; block 5 starts a new one.)
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
13. Open the same address followed by `?dev=1&flags=perfHud,eventLog`. It is the app page again, with the developers' read-outs switched on. Bookmark it as "app, dev".

### Write down

| Field | Value |
|---|---|
| Route used, and the address | A or B; the address |
| Build | the `commit` (route A) or the short hash (route B) |
| T1, page load to a usable Enter button | seconds |
| The warning: what the headset showed and what you pressed | words |
| Anything you could not do with hands only | words |

**Pass rule:** to be decided (PROGRESS item 26b). The rule says "in the room within 5 seconds", and it is not settled whether that counts from opening the page or from the Enter pinch. So two numbers are recorded and kept apart: T1 here, and T2 (Enter pinch to the first sight of the room) in block 8. Route A is the T1 that counts: route B loads from your own Mac.

**If it fails:** the page does not load on route B → check that both are on the same Wi-Fi, that the address starts with `https://` and has the port, and that the Mac is awake. If the warning offers no way to continue, tell Claude: the fix is a trusted certificate (ENVIRONMENT_SETUP §8), and until then only route A works. A page under `proto/` that is missing on route A means the public site is older than that page: use route B.

---

## Block 1 — Capability page, three runs (15 min)

**Can be run today.**

**Purpose:** ask the headset's browser what it really supports: room labels, frame rate, audio, saved anchors, room mesh, and whether a hand pinch sends `select` events.

**Answers:** T-104, TC-DEV-0A · P1, F1/F2, W1, A1, M1 · from T-124: do hands send `selectstart` and `selectend` · from T-123: which labels, whether planes are there early, what the hit-test meets · from T-141: room size, first session · D-034: how level the table plane is · from T-140: is the room mesh labelled `global mesh` · from T-128a: does the session say which features it was given, and what the foveation setting reads · from T-162: how long a saved place's name ("handle") is.

**You need:** the room with Space Setup, your table, the capability page's bookmark. The USB console only for step 15.

**Checked against:** `proto/spike/index.html`, `src/main.ts`, `src/probe.ts`, `src/config.ts`, `proto/spike/README.md`.

**Know this first:** the page keeps one saved place at a time. Each run asks the headset for the place the run before saved, deletes it, and saves a new one half a metre in front of you. So `anchors.restore` in run 2 is about the place of run 1.

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
14. If the mail did not arrive: fill in the second group of rows by hand for run 3, and carry on. The page keeps every run, and block 20 has a second way to get them.
15. Only with the USB console, after run 3 (console): type `JSON.parse(localStorage.getItem('roomsong.spike.anchor')).handle.length` and write down the number. It is the length of the saved place's name.

### Write down, once per run

How to read the page: the table has one row per value. A value shown as `null (…)` has its reason in the brackets: copy the reason.

| Always | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| Clock time of the run | | | |
| `emulator` | | | |
| `completed` | | | |
| `planes.labels` (copy the list exactly) and `planes.desk` | | | |
| `meshes.count` and `meshes.labels`: is `global mesh` in the list? | | | |
| `features.granted`: a list, or `null` with a reason? | | | |
| Click heard: yes / no | | | |
| The crackle step you answered | | | |
| `anchors.restore.restored`, and `anchors.restore.error` when it is not `true` | no earlier run | | |
| Length of the handle (step 15) | — | — | |

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
| Handle length | at most 64 characters. The app's save drops a longer one, and the bed would then be placed again on every visit | API_SPEC §4, from T-162 |
| Features given | `features.granted` is a list. `null` means the browser does not say what it gave, and the app's "This device" lines (block 8) cannot be trusted | from T-128a |
| Mesh label | write down what you see. The app looks for the label `global mesh` to measure a room that has no floor or ceiling plane | from T-140 |
| `select` events, hit-test, joints, foveation | write down what you see. Compare `hitTest.height` with the table height from your tape | — |

### If it fails

- The page says "Stopped early: …" or "The probe failed: …": write down the reason and pinch **Start** again. Nothing measured is lost: the page saves after every step.
- No planes or no labels: check that Space Setup was run in this room, and run once more. If still none, the game already has its fallback (a floating bed and the default "Wanderer" tuning), and the room signature is not built. Tell Claude.
- No click and no `hands.pinchEvents`: the browser sends no `select` events for hands. The game then uses the distance between thumb and finger for everything (FR-HND-02).
- An anchor does not come back: the game places the bed again and keeps every plant. That is the accepted fallback, not a failure by itself.
- Crackle at 24 voices or fewer: the voice limit can go down to 16. Tell Claude.

---

## Block 2 — Pinch page, first run (10 min)

**Can be run today.**

**Purpose:** find the smallest dot spacing you hit on the first try, and whether the ring's outer and inner rows are within easy reach and in view.

**Answers:** T-105, TC-DEV-00 · H1, G1 · D-020 (bed distance, outer radius, view box) · D-027 (no drawn hands) · D-030 and T-116 (how often, and where, real hands are lost; what the app does about it is block 13) · D-034 (how far the table is below your eyes) · from T-123: which label the table has, and whether its plane is there in the first second.

**You need:** the room with Space Setup, your table, the pinch page's bookmark.

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

**Can be run today.**

**Purpose:** find the smoothing value ("beta") at which the judged point no longer trails your hand. With the starting value 0 it trails by about 3 cm.

**Answers:** T-129 (beta, search about 5 to 50) · TC-DEV-00 (the second run is required) · FR-HND-03 · D-028 · the second look at the outer ring (D-020).

**You need:** the same seat and table as block 2.

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

## Block 4 — Garden preview in passthrough (25 min)

**Can be run today.**

**Purpose:** see the garden in your real room for the first time, and read the frame rate with it drawn. It is a picture that moves: no sound, nothing to pinch. Part B looks at what T-119 added: the dark edge of the sweeping light, the Bass and Choir shapes, growth, the unfurl and high contrast.

**Answers:** T-125 (the look, to rate) · TC-DEV-07 and TC-PERF-01, in part (frame rate with the garden drawn, without sound and without hands) · FR-UI-11 (flashing) · D-020 (the view box, now with plants) · from T-119: the light's dark leading edge on a real bright table; jug and umbrella by outline; the hole at the top of the umbrella's stem; leaf whorls and cream blossoms; the unfurl and a week passing; high contrast; the frame rate with a full bed of five shapes and every effect on (D-044).

**You need:** your table, the bed preview's bookmark, a large sheet of white paper (or a white pillowcase or towel) for part B.

**Checked against:** `proto/bed/index.html` (the switches: the list **Garden**, the button **A week passes**, the boxes **Bright table**, **Glow the plant under the pointer**, **Dim the nearest plant (hand out of view)**, **Reduced motion**, **High contrast**), `proto/bed/src/main.ts`, `proto/bed/README.md`, `src/render/PerfHud.ts`, `src/render/config.ts` (the dark band's strength, `TIDE_SHADE_COVER`, is 0.6), `src/core/flags.ts`, `src/core/config.ts`.

**Know this first:**

- The preview does not look for your table. It puts the bed 45 cm in front of where you sit when the session starts, 72 cm above the floor. On a table of another height it floats or sinks: that is expected here.
- Set the switches on the flat page before you pinch **Enter XR**: in a session the page is hidden. Leave the session to change them.
- In a session the page's drawn table is hidden and you see your real one, so the box **Bright table** changes nothing there. The white sheet is the bright table.
- The pointer stands in for a hand on the flat page only. In a session there is no pointer, so the box **Glow the plant under the pointer** and the lit cell under it cannot be seen here. With real hands they are block 14, part B.

### Steps, part A — the numbers

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

### Steps, part B — the drawing (T-119)

11. Open the bed preview's bookmark again (without `autoplant`). Lay the white sheet flat on the table where the ring appeared in step 4.
12. Leave **Garden** on "13 sample plants". Pinch **Enter XR**. Watch the light sweep over the white sheet. A dark band runs just ahead of the light. Can you see it? Does the sweep show clearly on white? Is the dark band too weak, about right, or too strong? Leave the session.
13. **Garden**: choose "The five shapes". Enter. Without counting stems, name each shape by its outline: which one is the jug (Bass) and which the umbrella (Choir)? Look at the top of the umbrella's stem from your seat: there is a small hole there, about 8 mm. Do you notice it? Leave.
14. **Garden**: choose "Growth: new, 1 day, 3 days, a week". Enter. Each row shows one shape at four ages, from left to right: new, a day, three days, a week. Stretch an arm toward the bed and count the leaf whorls on each stem (the small four-leaf stars, about 2.4 cm across): none, one, two, then cream blossoms. Can you count them from your seat? Do the cream blossoms stand out on the white sheet? Leave.
15. Tick **High contrast**. Enter. Every plant gets a cream rim. Does it read as an outline round each plant? Leave. Untick **High contrast**.
16. The unfurl, on the flat page. In a session you cannot see it here: once a week passes, every plant unfurls the next time the light reaches it, within one sweep (about 3 seconds), sooner than you can enter. So: **Garden**: choose "Full bed, all five shapes". Look at the flat page, pinch **A week passes**, and watch one sweep. Each plant unfurls as the light reaches it: leaf whorls grow, open into cream blossoms, and the plant turns lighter. Is it pleasant? The blossom's colour arrives at once with the light: does it look like part of the light's flash? About 160 whorls change in one sweep: does the bed bloom, or sparkle? (In passthrough: block 16, part C.)
17. Every effect on, for the numbers. Keep that full bed, now a week old. Tick **Dim the nearest plant (hand out of view)** and **High contrast**. Enter. Watch the panel for one minute and write down its numbers. Leave. Untick both boxes.

### Write down

| Number on the panel | 13 plants | 80 plants | 80 plants, five shapes, a week old, every switch on (step 17) |
|---|---|---|---|
| `fps`, usual | | | |
| `fps`, lowest seen | | | |
| `ms` | | | |
| `draws` and `tris` | | | |
| `flash` (shown as a count out of 3) | | | |

| Question | Answer |
|---|---|
| Where did the bed appear? | on the table / above it by … cm / inside it / somewhere else |
| The ring's guide lines over your real table | clear / faint / not visible |
| The sweeping light | clear / faint / not visible |
| Can you tell the three plant shapes apart at a glance? | yes / no |
| Anything too bright, too dim, or flickering | words |
| Whole ring and all plants in view when you look at its centre, head still? | yes / no, which edge was cut |
| The look, 1 to 5, and one thing to change first | number, words |

| Part B question | Answer |
|---|---|
| The dark band ahead of the light, on the white sheet | visible / not visible; too weak / about right / too strong |
| The sweep on white | clear / faint / not visible |
| Jug (Bass) and umbrella (Choir) named by outline | yes / no, which was confused |
| The hole at the top of the umbrella's stem | not noticed / noticed / distracting |
| Leaf whorls counted from your seat | yes / no, which age was hard |
| Cream blossoms on the white sheet | stand out / blend in |
| High contrast: the cream rim reads as an outline | yes / no, words |
| The unfurl (flat page): pleasant | 1 to 5, words |
| The blossom's colour with the light: part of the flash | yes / no |
| A week passes, all whorls in one sweep | bloom / sparkle |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Frame rate | usual `fps` at least 72 and never below 60, in all three runs | TC-PERF-01 |
| Script time | `ms` at most 6 | NFR-PERF-05 |
| Drawing budget | `draws` at most 60, `tris` at most 150,000. In the emulator, both eyes with the panel: 14 draws and 11,748 triangles (13 plants), 14 and 36,436 (80 plants), 20 and 49,732 (80 plants, five shapes, a week old) | Golden Rule 5, `proto/bed/README.md`, D-044 |
| Flashing | `flash` at most 3 | FR-UI-11 |
| The dark band | write down what you see. Its strength, 0.6, was chosen without a headset: on a headset the light is added to the real table, and the emulator cannot show whether the band shows | from T-119, D-044 |
| The look, the shapes, growth, the unfurl, high contrast | write down what you see. Parth's answers go to the art pass (T-163) | from T-119 |

A pass on frame rate here is needed but not enough: the real test runs 10 minutes with sound and hands (TC-DEV-07, block 14).

### If it fails

- No **Enter XR** button, and the page says "This browser has no WebXR session to offer": write it down and tell Claude.
- No panel beside the ring: the address lacks `dev=1`. A built page ignores `flags` without it.
- The bed is behind you or to the side: you were not facing the table when the session started. Leave, face the table, enter again.
- `fps` below 72 with 13 plants: nothing to do in the sitting. Tell Claude: the performance work (T-165) moves forward.
- `fps` fine in part A and below 72 only in step 17: write down both. D-044 accepted 20 draw calls on the emulator's numbers; the perf pass (T-165) looks at it again.
- A switch seems to do nothing in a session: it was changed while the session ran, or it is **Bright table** or **Glow the plant under the pointer** (see "Know this first").

---

## Block 5 — Sound page on the headset speakers (15 min)

**Can be run today.**

**Purpose:** hear the garden loop on the headset's own speakers: is the low drone there, does the loop keep steady time, and what happens to the sound when the headset comes off.

**Answers:** T-129 (bass on the headset speakers) · T-103 (listening review, one more rating) · from T-121: steady time and the stop when the headset is taken off, as far as this page can show it · from the PM's 16 Oct update §7: the speakers at 100 % (harshness, buzz). The app's own mix at 100 % is block 14, "Also, speakers against headphones".

**You need:** the Mac with a second Terminal window, the headset on the same Wi-Fi, no headphones.

**What this block cannot show:** this is an ordinary web page with the first sound sketch, not the game inside a session. The game's own sound inside a session is blocks 9 and 14, and its Bass voice is block 14.

**Where this page is opened from:** it is not published with the site, so it is not on your one address. The Mac serves it from the folder `proto/sound`, on its own port (4175) and without the `s` in `http`. It saves nothing.

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
8. Turn the headset's volume up to its highest (100 %). Listen for 30 seconds: is it harsh? Do you hear a buzz or a rattle from the speakers, or crackling? Turn it back to the level of step 1.
9. Read the line under the meter and write down the number after `tick` (the work of one audio tick, in ms).
10. While it plays, take the headset off and hold it. Does the sound stop? After how many seconds?
11. Put the headset back on. Is the sound there by itself? Clean, or with a jump?
12. Pinch **Stop**.
13. Rate it from 1 to 5: "If a garden you planted yourself sounded like this, would you keep listening and add more plants?" Add one sentence on what to change first.

### Write down

| Field | Value |
|---|---|
| Headset volume | level |
| Drone in "Wanderer" | clearly / faintly / no |
| Drone in "Hall"; echo longer | clearly / faintly / no; yes / no |
| Pads alone | clearly / faintly / no / not done |
| Anything harsh, muddy or crackling | words |
| Stutters, gaps or clicks in one minute | count |
| At 100 %: harsh; buzz, rattle or crackling | no / a little / very; none / which |
| `tick` | ms |
| Headset off | stops after … s / keeps playing / stutters |
| Headset back on | plays cleanly / jumps / silent until Play |
| Rating and one sentence | 1 to 5, words |

### Pass rules

- Steady time: 0 stutters or gaps with the headset on (the page plans every note 120 ms ahead from a 25 ms tick).
- Bass and the headset coming off: the documents give no number. Write down what you hear.
- At 100 %: no buzz, rattle or crackling (the PM's 16 Oct update §7). The page ends in a limiter and a −1 dBFS ceiling (`proto/sound/src/engine.ts`), so what you hear is the speakers or a voice's own tone, not clipping. It is the first sketch, not the app's mix: a fail here is a note for the 100 % step of block 14, not a bug. Harshness is Parth's rating.

### If it fails

- The page does not open: check the `http://` and the port 4175, and that the second Terminal window is still running.
- The drone is faint or missing: nothing to do in the sitting. The sound pass (T-164) raises it or adds overtones. The lower Bass voice of T-144 gets the same check in block 14.
- The sound keeps playing with the headset off: expected for this page, which has no pause of its own. What the game does is block 9; its fade is T-152.

---

## Block 6 — Same room, second session (5 min)

**Can be run today.**

**Purpose:** measure the same room again, to see whether the room would get the same key, scale and echo twice.

**When:** at least 30 minutes after block 1, at the same table and seat. The headset has been off your head in between (block 5 did that).

**Answers:** T-129 (two sessions in one room) · from T-141: ceiling height and floor area on two visits · TC-DEV-13 (last sentence) · D-028 (echo from room volume) · A1 once more: an anchor that is about an hour old.

**You need:** the capability page's bookmark, your tape numbers.

**Checked against:** `proto/spike/src/probe.ts` (`readScene`: one plane per label with its size and position), `src/garden/config.ts` (the limits below).

### Steps

1. Open the capability page from its bookmark. Pinch **Start**. Allow everything.
2. Look straight ahead over the table for 10 seconds. Pinch once when the view turns green. Wait for the end.
3. Leave **Which run was this** on "not answered". Answer the other two questions.
4. Write down the clock time, and the rows below.
5. Pinch **Copy JSON** and mail it to yourself, as before.

### Write down

For floor and ceiling, read the rows as in block 1. Ceiling height = the ceiling's middle `position` number minus the floor's.

| | Block 1, run 1 | Run 2 | Run 3 | Block 6 | Your tape |
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

The page measures the box around one floor plane and the height of one ceiling plane. The game's own measurement (T-140) may give slightly different numbers: block 17 reads those. What counts here is how much the numbers move between sessions.

**If it fails:** nothing to do in the sitting. The choice afterwards is to keep it, to remember the last result, or to promise less (PROGRESS, "Know this about the room tunes the song").

**If you still have the headset the next day:** do this block once more. That is the real second visit, and it takes 2 minutes.

---

## Block 7 — A room without Space Setup (10 min)

**Can be run today.**

**Purpose:** see what the headset gives in a room it has never scanned: planes, mesh, and what the test ray hits. Also: what the headset answers when it is asked, in this room, for a place that was saved in the first room.

**Answers:** from T-123: what the hit-test meets without Space Setup · TC-DEV-02 (b), in part · TC-DEV-00 (the optional floating run) · from T-162: what the browser does with a known saved place in another room (refuses it, gives it back but cannot find it, or never answers).

**You need:** the second room, its table or desk, the two bookmarks. Do block 6 first: its run saved the place that this block asks for.

**Checked against:** `proto/spike/src/probe.ts` (hit-test: one ray from the head, 60 degrees below straight ahead, for 1 second; the anchor step: the last run's place is asked for once, and a step that gets no answer is given up after 3 seconds with "timed out"), `proto/pinch/src/main.ts` (`findSurface`: no plane means dots floating 45 cm below the head).

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
| The place saved in the first room: `anchors.restore.restored`, `anchors.restore.tracked`, `anchors.restore.error` | |
| Pinch page, the line under the table: Surface … | |
| Floating dots: were they at a height you could use? | words |

**Pass rule:** write down what you see. A hit at about the table's height means that a pinch on a surface (the game's third way to place the bed) has something to work with.

How to read the saved-place row: `restored` false with an error text = the browser refused it. `restored` true and `tracked` false = it gave the place back but cannot find it here. An error that says "timed out" = it never answered in 3 seconds. The app waits 4 seconds for a saved place and then places the bed again, so every one of these is handled; the developers need to know which one happens.

**If it fails:** the ray hits nothing → the game's last way to place the bed is the floating bed, which needs no room data.

---

## Block 8 — The app: landing page and Enter (15 min)

**Can be run today.**

**Purpose:** check the app's first screen and the step into the room: how long it takes, that one pinch on Enter starts both the session and the sound, and that the way in still works after you leave, come back or go away and return. Inside the session there is nothing to see or hear yet: the garden is not in the app until T-128c and T-128d.

**Answers:** T-126 and T-128a · TC-DEV-01, the part that exists (the two start times) · TC-DEV-14 (new: entry and session) · FR-SYS-01, FR-SYS-02, FR-SYS-03 · API_SPEC §1.10 rule 2 (one way in; sound and session from one click) · D-027 (no drawn hands, in the app itself) · Golden Rule 1 (hands only).

**You need:** the app's plain bookmark and the "app, dev" bookmark. No cable.

**Checked against:** `index.html`, `src/index.ts`, `src/app.ts` (`enterSession`, `followSession`, the 3-second wait before "No sound. Leave and enter again.", which then stays 5 seconds), `src/ui/Landing.ts`, `src/ui/strings.ts` and `src/core/strings.ts` (the words, as they are since T-128a), `iwsdk.config.json` (`offer` is `"none"`; hand tracking required; planes, mesh, anchors and hit-test optional), `src/render/RenderSystems.ts` and `src/render/config.ts` (the read-out: 16 cm wide, 10 cm to the left of your nose, 12.5 cm below it, 50 cm ahead).

### Steps

1. Open the app page from its plain bookmark. You see "Roomsong", "Grow a song on your table.", the button **Enter the garden**, a list "This device", four boxes under "Accessibility", "Help", and a last line about saving.
2. Write down the four lines under "This device".
3. Pinch each of the four "Accessibility" boxes on, then off again. Pinch "Help" to open it. Does every one react to a hand pinch?
4. Look at the browser's address bar: does the browser show a button of its own for entering? None is expected. Write yes or no. Do not use it.
5. Sit facing the table. Pinch **Enter the garden**. Allow what the headset asks.
6. You see your room and your real hands, and nothing else. No drawn hands and no controllers should appear.
7. Keep looking straight ahead for 5 seconds. Do the words "No sound. Leave and enter again." appear in front of you, a little below where you look? If they do: at once, or after about 3 seconds?
8. Look around for 20 seconds. Write down anything that is drawn, and any stutter of the room picture.
9. Leave the session (see "Leaving a session with hands only"). The landing page is back.
10. Write down the four lines under "This device" again: they now say what the session was given.
11. Pinch **Enter the garden** once more and count the seconds from your pinch until you see the room. Write the count down as T2. The headset should ask nothing this time; if it asks again, write that down and count from your last answer.
12. Again look straight ahead for 5 seconds: "No sound. Leave and enter again.", yes or no? This is the second Enter of the same page.
13. Leave the session.
14. Reload the app page. Before you pinch Enter, open the capability page's bookmark in the same tab. Do not start it. Then use the browser's Back arrow: the app page is back.
15. Pinch **Enter the garden**. Does the session start? Leave it.
16. Open the "app, dev" bookmark. Pinch **Enter the garden**.
17. A small panel with three lines of numbers sits low on your left, half a metre away, and moves with your head. Can you read it without squinting? Is it in the way?
18. Watch it for 30 seconds. Write down the usual `fps`, the lowest `fps`, and `ms`, `draws` and `tris`. Leave the session.

### Write down

| Field | Value |
|---|---|
| "This device", before the first session | four lines |
| Every box, "Help" and the button work with a hand pinch | yes / which did not |
| The browser's own enter button | yes / no |
| Anything drawn in the session; drawn hands | words; yes / no |
| "No sound. Leave and enter again." on the first Enter | no / at once / after about 3 s |
| "This device", after the first session | four lines |
| T2, Enter pinch to the first sight of the room (second entry) | seconds |
| "No sound. Leave and enter again." on the second Enter | no / at once / after about 3 s |
| Enter after Back | works / what happened |
| The read-out: readable; in the way; where it sat | yes / no; yes / no; words |
| Empty session: `fps` usual and lowest; `ms`; `draws`; `tris` | |
| Words on the page that are hard to read, or wrong | words |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Start times | to be decided (PROGRESS item 26b). T1 (block 0) and T2 are recorded apart and not added. The limit in the documents is 5 seconds; whether it applies to T1, to T2 or to each is Parth's call. You count by ear: write the numbers as you counted them | TC-DEV-01, FR-SYS-06, T-128a |
| One click for sound and session | the session starts, and "No sound. Leave and enter again." does not appear, on the first Enter and on the second | API_SPEC §1.10 rule 2, T-128a |
| One way in | the browser shows no enter button of its own | API_SPEC §1.10 rule 2 |
| Before the first session | "Mixed reality: supported.", and three lines that each say "checked when you enter" | `src/ui/strings.ts` |
| After the first session | "Hand tracking: on." If you allowed the room: "Table detection: on. The garden looks for your table." and "Saved position: on. The garden can come back to the same spot." They must agree with `features.granted` of block 1 | `src/ui/Landing.ts` |
| Enter after Back | a session starts | from T-128a |
| No drawn hands | none, and nothing else drawn (with the "app, dev" bookmark: only the read-out) | D-027 |
| Hands only | every control on the page reacts to a pinch | Golden Rule 1 |
| The read-out | write down what you see. Its place is a first guess until someone has seen it on a headset | from T-128a |
| Empty session frame rate | no rule for an empty session. The game's rule is 72 usual and never below 60, so less than 72 here is a warning | TC-PERF-01 |

### If it fails

- "No sound. Leave and enter again." appears: the browser did not start the sound with the Enter pinch. Nothing to do in the sitting. Write down on which Enter and how soon, and tell Claude: the sound then needs a pinch of its own inside the session (T-152).
- Under the button: "The garden did not open. Check that hand tracking is on in the headset: …". Switch hand tracking on and enter again.
- Under the button: "The garden could not load. Reload the page." Reload. If it says so again, tell Claude: it is a bug.
- Under the button on the headset: "Roomsong is played in a mixed-reality headset. …". Tell Claude: it is a top-severity bug.
- No read-out with the "app, dev" bookmark: the address lacks `dev=1`. A built page ignores `flags` without it.

---

## Block 9 — The app: headset off and on, the menu, leaving (15 min)

**Can be run today** for everything you read in the console and see. The steps marked **(listen)** need T-128d: until then the session is silent. A soft fade when the headset comes off is T-152.

**Purpose:** find out what the app is told when you take the headset off, open the headset's menu, or leave it lying; and whether the sound comes back by itself.

**Answers:** from T-128a: which pause events arrive, does the sound come back without a pinch, does it keep playing under the menu, a session the headset ends by itself, the foveation setting as the headset reports it · from T-121 and TC-DEV-08: the sound stops on time and returns in time · from T-162: does taking the headset off count as "hidden" · TC-DEV-14 (new).

**You need:** the USB cable and the Mac's console with **Verbose** ticked (see "The Mac's console over USB"); the "app, dev" bookmark. From T-128d on, add `,autoplant=13` at the end of that address, so that a small garden plays (from the plan).

**Checked against:** `src/app.ts` (`followSession`: the app's pause event `xr:visibility` comes from the session's own `visibilitychange`, only when the value changes, and a dimmed, "blurred", session counts as seen; a session that starts unseen says so; the line a failed part writes), `src/core/events.ts` and `src/core/log.ts` (the `eventLog` lines), `src/render/config.ts` (the app asks for foveation 2/3, "medium").

### Steps

1. Connect the cable. Headset: open the "app, dev" bookmark. Mac: click **inspect** under it and choose **Console**.
2. Pinch **Enter the garden**. The console shows `[app] audio started` and `[events] xr:sessionStart`. Write yes or no for each. A red `[app] E_AUDIO_CONTEXT` line means the sound did not start.
3. (console) Type `__roomsong.world.renderer.xr.getBaseLayer().fixedFoveation` and write down the number. The app asks for 0.67.
4. Take the headset off and hold it for 5 seconds. Put it back on.
5. Read the console: which `[events] xr:visibility` lines came? `visible: false` and then `visible: true` means the app was told. No line means the headset only dimmed the session and the app never knew. Is there a red `E_AUDIO_CONTEXT` line?
6. (listen) Did the sound stop when the headset came off? Did it come back by itself, without a pinch? In time with the light, or with a jump?
7. Open the headset's menu over the session: look at your palm, pinch and hold. Read the console: any `xr:visibility` line? (listen) Does the sound keep playing under the menu?
8. Keep the menu open for 30 seconds. Then close it and go back to the session. (listen) Is the sound there? Does the loop carry on in time?
9. Take the headset off and put it down until it goes to sleep. Try 2 minutes (unchecked: nobody knows how long it takes). Put it back on.
10. Is the session still there, or is the landing page back? If the page is back, the headset ended the session while it was unseen. Read the console: is there an `[events] xr:sessionEnd` line?
11. If the page is back: is **Enter the garden** ready? Pinch it. Does a session start? Leave it.
12. Only if a red line in any app block read `[app] ….update threw: skipped for 1 s` and the name before `.update` was one or two meaningless letters: the build shortened the name. To read the full name, start the dev server on the Mac (`npm run dev:runtime`; it serves on port 8081), open its address on the headset (unchecked: nobody has opened the dev server from a headset, and a new certificate warning is expected), and do the same thing again. That address is another place: a garden saved there is not the garden on the built site.

### Write down

| Field | Value |
|---|---|
| `[app] audio started`; `[events] xr:sessionStart`; any red `E_AUDIO_CONTEXT` | yes / no each |
| Foveation as the headset reports it | number / the console's error text |
| Headset off 5 s: the `xr:visibility` lines | false then true / none / other |
| (listen) Sound with the headset off, and back on | stops after … s / keeps playing; back by itself / needs a pinch; in time / jumps |
| The menu: an `xr:visibility` line; (listen) sound under the menu | yes / no; plays / stops |
| (listen) After 30 seconds in the menu | sound there; loop in time / jumps |
| Headset put down: how long until it slept; what you found | minutes; session still there / landing page |
| `[events] xr:sessionEnd` when the headset ended the session | yes / no |
| Enter after the headset ended the session | works / what happened |
| Any other red line (copy it) | words |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| The pause is seen | write down what you see. The app saves on `visible: false`, and from T-152 it fades the sound there. If no line comes when the headset is off, neither can happen | API_SPEC §1.10 rules 3 and 9, from T-128a and T-162 |
| Sound under the menu (listen) | it keeps playing | from T-128a |
| Back after a pause (listen) | the sound is back and the loop carries on in time, after 5 seconds off and after 30 seconds in the menu | TC-DEV-08, FR-SYS-05, from T-121 |
| After the headset ended the session | Enter starts a new one | from T-128a |
| Foveation | write down what you see | NFR-PERF-09 |

### If it fails

- The console shows nothing at all: tick **Verbose** in its level menu, and check that the address has `dev=1&flags=eventLog`.
- `__roomsong` "is not defined": the address lacks `dev=1`.
- A red `E_AUDIO_CONTEXT` line after the headset came back: the browser wants a pinch before it plays again. Tell Claude: T-152 then asks for that pinch.
- The session is gone after 5 seconds off the head: write it down. The garden is saved at that moment from T-128e on, so nothing is lost, but every pause would then mean a new Enter.

---

## Block 10 — The app: the bed on your table (15 min)

**Needs: T-128c** (the room system and the bed drawn in the app). Every step of this block is **(from the plan)**.

**Purpose:** see the app put the bed on your real table: where, how fast, and by which of its four ways. Then see what it does from a bad seat, at a low table, and in the room where it finds no table.

The four ways, which the app calls levels: **1** a surface the headset labels as a table · **2** any level surface at table height · **3** you look at a surface and pinch · **4** a bed that floats in front of you.

**Answers:** TC-DEV-02 (a) and (b) · from T-123: which level your table gets, the 3-second wait for a table, a pinch on a coffee table 0.4 m high, the limits of D-034 · from T-140: sitting with your head over the table near its far edge, looking outward · from T-116: entering while a pinch is held (nothing may be confirmed) · D-040: do the room's surfaces still arrive with the SDK's own scene system switched off · Golden Rule 2 and D-020 (reach) · the hint's words over a bright wall (from the reviews) · PROGRESS items 23 and 26c (first sound in a room with no table).

**You need:** your table; the second room (no Space Setup); a low table about 40 cm high, if you have one; the tape; the "app, dev" bookmark. The console is a bonus here.

**Written from:** the T-128c row of the plan, API_SPEC §1.10 rule 4 and §2 (`room:placementLevel`, `room:bedPlaced`), UX_WIREFRAMES §9.2 (the pale "ghost" ring and the words of the hint). Checked against code that is already on `develop`: `src/room/config.ts` (3 seconds for a table, 10 seconds for your pinch, nothing lower than 0.5 m above the floor, nothing less than 0.25 m below your eyes).

### Steps, part A — at your table

1. Sit at your table as in block 2, belly at its edge, facing it. Open the "app, dev" bookmark.
2. Pinch **Enter the garden**. Count the seconds from the first sight of the room until the ring shows.
3. Where is the ring? On the table top, above it, or sunk into it: by how many cm?
4. Put the tape on the table: measure from the table's near edge, at your belly, to the middle of the ring, and to the ring's far edge.
5. Look at the middle of the ring and keep your head still: is the whole ring in view?
6. (console) Read the `[events] room:placementLevel` lines: write the numbers in order. Read `[events] room:bedPlaced`: is `restored` false?
7. Leave the session.

### Steps, part B — a bad seat and a low table

8. Stand at the far side of your table and lean over it, so that your head is above the table near its far edge. Face away from the middle of the table. Pinch **Enter the garden**.
9. Where does the bed land: on the table, or in the air past its edge? (console) Which level? Leave the session.
10. Only with a low table: sit beside it, somewhere the app finds no table (the second room is fine). Enter. When the pale ring shows, look at the low table and pinch.
11. Does the bed land on the low table? Today it should not: it floats instead. Would you have wanted it there? Leave the session.

### Steps, part C — the room with no table

12. Carry the headset to the second room. Sit at its desk. Open the "app, dev" bookmark.
13. Press the thumb and finger of your left hand together and keep them together. With your right hand, pinch **Enter the garden**. Count the seconds aloud from this pinch.
14. After about 3 seconds a pale copy of the ring shows where the bed would land, with the words "Look at your table, and pinch". Now open your left hand. Did the bed land at that moment? It must not.
15. Are the words easy to read? Turn until a bright wall or a window is behind them: still easy?
16. Look at the desk: the pale ring moves onto it. Pinch once and let go. The bed lands where the pale ring was. Write down your count.
17. Only once T-128d is in: plant your first seed as in block 11 and write down your count when it first sings.
18. Leave. Enter again, look at the desk and do not pinch. After 10 seconds the bed lands by itself. On the desk, or floating?

### Write down

| Field | Value |
|---|---|
| Part A: seconds from the first sight of the room to the ring | seconds |
| The ring on the table top | on it / above by … cm / sunk by … cm |
| Near edge of the table to the ring's middle; to its far edge | cm; cm |
| Whole ring in view, head still | yes / no, which edge was cut |
| (console) Levels in order; `restored` | numbers; true / false |
| Part B: head over the far edge, facing outward: where the bed landed; level | words; number |
| Low table (height from your tape): did the bed land on it; did you want it there | cm; yes / no; yes / no |
| Part C: did opening the held pinch place the bed | yes / no |
| The hint's words: readable; over a bright wall | yes / no; yes / no |
| Seconds from the Enter pinch to the bed (you pinched) | seconds |
| Seconds from the Enter pinch to your first plant singing, in this room (T-128d) | seconds |
| No pinch: where the bed landed after 10 seconds | on the desk / floating |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Reach | the ring's middle is 35 to 45 cm in front of your head and its far edge at most 75 cm. From the table's edge at your belly that is about the same | Golden Rule 2, FR-ROOM-03, D-020 |
| Your table | level 1: the table's surface was there within 3 seconds and carries the label `table` or `desk`. Level 2: write it down with the label block 1 showed. Level 3 or 4 at a table from Space Setup: tell Claude, because the room then does not tune the song | FR-ROOM-01, TC-DEV-02, from T-123 |
| The surfaces still arrive | level 1 or 2 at your table also shows that the SDK's own scene system is not needed | D-040 |
| Time to the bed at a table | within 3 seconds of the session's start | FR-ROOM-10, API_SPEC §2 |
| A pinch held from before Enter | places nothing | from T-116 |
| The bad seat | write down what you see | from T-140 |
| The low table | write down what you see. The limit of 0.5 m above the floor is a first guess until this run | D-034 |
| The hint | its words show from the pale ring until the bed is placed, and can be read | UX_WIREFRAMES §9.2 |
| First sound with no table | the rule is 20 seconds. The plan counts 22 at worst; Parth chooses between three ways out (PROGRESS items 23 and 26c). Your count decides how urgent it is | FR-UI-02 |

### If it fails

- No ring 15 seconds after you see the room: tell Claude. It is a top-severity bug.
- The bed floats although you sit at your Space Setup table: check that you faced the table, and that "This device" says "Table detection: on." (block 8). If the pinch page said `table` in block 2 and the app floats, the app is wrong: tell Claude, and name D-040.
- No pale ring and no words in the second room: the headset gave no hit-test there. Compare with `hitTest.hits` of block 7.

### Also, a coffee table after BUG-010 (7 min)

**Needs: T-128c and the BUG-010 fix** (on `develop` since 23 Oct; block 0 tells you the build has it). Checked against `develop` 93af00a. Run it right after part B, at the same coffee table.

**Purpose:** before BUG-010 a surface labelled `table` was taken at any height, so a coffee table 0.42 m high put the bed 1.18 m under the eyes (the emulator's `low-table` room). Since the fix a labelled table must also be 0.5 to 1.1 m above the floor, as at level 2. Two questions only a headset answers: does Space Setup label a coffee table `table` at all, and where does the bed go when a coffee table is all there is.

**Answers:** BUG-010 (the device check) · D-034 (the limit of 0.5 m) · PROGRESS item 41 (the room's sound with a floating bed beside a low table) · TC-E2E-13's `low-table` room on a headset.

**You need:** a sofa or a low chair with a coffee table about 40 cm high in front of it, in a room where you ran Space Setup and added the coffee table (if Space Setup asks what it is, choose "Table" (unchecked)); the tape; the capability page bookmark; the "app, dev" bookmark; the console, if you have the cable.

**Checked against:** `src/room/PlacementSolver.ts` (`spotOn`: a plane is used at level 1 when it is labelled `table` or `desk` and is 0.5 to 1.1 m above the floor, at level 2 when it is in that band; nothing less than 0.25 m below the eyes), `src/room/config.ts` (`SURFACE_MIN_HEIGHT_M` 0.5, `SURFACE_MAX_HEIGHT_M` 1.1, `FLOATING_DROP_M` 0.25), `tests/e2e/29-room-matrix.spec.ts` (the `low-table` room: level 4, the bed 0.45 m ahead and 0.25 m under the eyes).

**Know this first:** the app should not put the bed on the coffee table. With nothing else at table height in reach it shows the pale ring after 3 seconds; a pinch on the coffee table floats the bed (a hit lower than 0.5 m is not used), and so does waiting 10 seconds. A floating bed reads no room: the song is in the default tuning ("Wanderer").

#### Steps

1. Before the headset: with the tape, the coffee table's height (floor to its top) and, sitting on the sofa, your eye height (floor to the corner of your eye; ask someone, or hold the tape against your cheek).
2. Open the capability page and run it once, sitting on the sofa (block 1's first run). Write down `planes.labels`: is the coffee table there, and as `table`, `other` or another word? Write down its height if the page shows one.
3. Open "app, dev". Sit on the sofa, facing the coffee table, and pinch **Enter the garden**. Count the seconds until the pale ring or the bed shows.
4. When the pale ring shows, look at the coffee table and pinch. Where does the bed land: on the coffee table, or floating in front of you?
5. (console) Read `[events] room:placementLevel` (the numbers in order) and `[events] room:bedPlaced` (`level`). Read `[events] room:signature`: `keyRoot` and `mode`.
6. With the tape, floor to the middle of the ring. Your eye height minus that is the bed's drop under your eyes.
7. Plant one seed as in block 11. Can you reach the bed from the sofa without leaning forward? Would you have wanted it on the coffee table?
8. Leave the session.

#### Write down

| Field | Value |
|---|---|
| Coffee table height; your eye height on the sofa | cm; cm |
| Capability page: the coffee table's label | `table` / `desk` / `other` / another word / not found |
| Seconds from Enter to the pale ring or the bed | seconds |
| (console) Levels in order; the level placed | numbers; number |
| Where the bed landed | on the coffee table / floating / elsewhere |
| Drop under the eyes (eye height minus the ring's height) | cm |
| (console) The room's key | `keyRoot`, `mode` |
| Reach from the sofa without leaning; wanted it on the coffee table | yes / no; yes / no |

#### Pass rules

| Check | Rule | Source |
|---|---|---|
| Not on the coffee table | the bed does not land on a surface lower than 0.5 m: level 4 (floating), or level 2 or 3 on something else in the band | BUG-010, D-034 |
| Reach | the ring's middle 35 to 45 cm in front of your head, its far edge at most 75 cm; a floating bed 25 cm under your eyes (the emulator: 0.25 m) | Golden Rule 2, FR-ROOM-01, FR-ROOM-03 |
| The label | write down what Space Setup gave: it decides whether BUG-010 could happen on a real headset at all | BUG-010 |
| The room's sound | floating means the default tuning: write down the key; Parth decides PROGRESS item 41 | PROGRESS item 41 |

#### If it fails

- The bed lands on the coffee table: the build lacks the fix (block 0), or the headset reads the coffee table higher than 0.5 m (write down the page's height). Tell Claude and name BUG-010.
- The floating bed is too high or too low to reach from the sofa: write down the drop. Its height (25 cm under the eyes) is a first guess (D-034).

---

## Block 11 — The app: plant, first sound, first loop (10 min)

**Needs: T-128d, with T-127** (seeds that come to your hand). Every step of this block is **(from the plan)**.

**Purpose:** do the game's first minute as a new player would, and time it. See whether a plant lands where your fingers are.

**Answers:** TC-DEV-01, the second half (first sound within 20 seconds, first loop within 90) · Golden Rule 4 · from T-116: does a pinch land where the fingers are (the app trusts that the headset's space and its own are one: API_SPEC §1.10 rule 13); entering while a pinch is held (nothing may be planted) · D-037 (three starter seeds on the first visit, no fourth) · Golden Rule 1.

**You need:** your table; the app's plain bookmark (no flags: this is the real thing). A garden that was never opened on this address is best. If the app has run here before, say so in the results.

**Written from:** the T-127 and T-128d rows of the plan, API_SPEC §1.10 rules 4 and 8. Checked against code that is already on `develop`: `src/ui/strings.ts` (the Help lines say the same three moves), `src/garden/` (three starter seeds, at most one seed out at a time).

### Steps

1. Sit at your table, facing it. Open the app's plain bookmark.
2. Pinch **Enter the garden** and count the seconds aloud from this pinch. Keep counting until step 6.
3. The ring shows on the table. Remember your count.
4. Open one hand, palm up. A seed comes to it.
5. With the other hand pinch the seed, carry it over the ring and let go. A plant stands there. Remember your count when you first hear it sing. If you heard any other sound before it, remember that count too.
6. Plant the other two seeds in the same way. Remember your count when all three have sung in one turn of the light. Stop counting and write the counts down.
7. Look at each plant: does it stand where your fingertips were when you let go? If not: how many cm off, and in which direction? The same direction every time?
8. Open a palm once more. No fourth seed should come.
9. Leave the session. Press the thumb and finger of one hand together and keep them together. With the other hand pinch **Enter the garden**.
10. When the ring shows, move the closed hand over it and open it. Nothing may be planted or moved. Leave the session.

### Write down

| Field | Value |
|---|---|
| Was this the first time the app ran on this address? | yes / no |
| Count when the ring showed | seconds |
| Count at the first sound of any kind, and what it was | seconds; words |
| Count when your first plant sang ("first sound") | seconds |
| Count when all three sang in one turn ("first loop") | seconds |
| Plants against your fingertips | on the spot / off by … cm, direction, same every time? |
| Seeds on the first visit | three / other |
| Opening a pinch held from before Enter | nothing happened / what happened |
| Anything you could not do with hands only | words |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| First sound | your first plant sings within 20 seconds of the Enter pinch | TC-DEV-01, FR-UI-02, Golden Rule 4 |
| First loop | all three sing in one turn within 90 seconds | TC-DEV-01, Golden Rule 4 |
| Where a plant lands | write down what you see. A steady offset in one direction means the app's space and the headset's are not one, and it is a bug | from T-116, API_SPEC §1.10 rule 13 |
| Starter seeds | three on the first visit and no more that day | D-037 |
| A pinch held from before Enter | plants nothing | from T-116 |

Whether the time to load the page (T1) is added to these counts waits for the same call as the start times: PROGRESS item 26b.

### If it fails

- No seed comes to an open palm: hold the palm flat and still, facing up, for a full second. Still none: tell Claude.
- The plant stands in another cell than the one you aimed at, now and then: that is aim, and block 2 measured it. Every time, the same way: that is the offset of step 7.
- No sound at all, and "No sound. Leave and enter again." showed: see block 8.

### Also, the first-minute guide (T-150; 8 min, and 12 min with a stranger)

**Needs: T-150** (the guide; on `develop` since 16 Oct), on top of T-128d. Checked against `develop` dca03de; the cast is **(unchecked)**.

**Answers:** is the ghost pinch read as "pinch here" · are the hints legible from your seat, 0.45 to 0.6 m away · a stranger's first minute, timed: first sound within 20 s, first loop within 90 s (TC-DEV-01, FR-UI-02; a first look at UAT-16) · D-053 (the guide on any session's empty bed; no step waits more than 60 s).

**You need:** the app's plain bookmark; the white sheet; a stopwatch (a phone). For part B, one person who has never seen Roomsong, its video or its page and is not on the team. If you can, cast the headset's view to the phone or the Mac (the Meta Horizon app's Cast), so you see what they see.

**Checked against:** `src/onboarding/Onboarding.ts` and `src/onboarding/config.ts` (the steps in order; `HINT_RING_AFTER_PLANTS` 3, `LISTEN_AFTER_MS` 240 000, `LISTEN_AFTER_PLANTS` 6, `STEP_STALL_MS` 60 000, `ONBOARD_CAPTION_MS` 5000), `src/onboarding/OnboardingSystem.ts` (it starts when a session's first room signature finds an empty bed), `src/ui/config.ts` (`GUIDE_CELL` ring 2, step 4; `GHOST_SIZE_M` 0.06, `GHOST_LOOP_MS` 2000, `RING_SIZE_M` 0.07, `ICON_SIZE_M` 0.05, `PALM_ICON_LIFT_M` 0.17; `CAPTION_DISTANCE_M` 0.6, `CAPTION_BELOW_GAZE_DEG` 8, `CAPTION_HEIGHT_M` 0.05, letters about 1.6 cm tall), `src/core/strings.ts` (the captions); UX §3.3 and its "As built (T-150)"; API_SPEC v1.2.34; UAT_PLAN §3.1.

**Know this first:**

- The guide runs whenever a session begins on an empty bed (D-053). After the ripple: "Open your hand", with a palm icon above the seeds. Once a seed is on a hand: "Pinch, and plant it", with a small drawn hand (6 cm) that pinches over one glowing cell (the middle ring, the step nearest you) once every 2 s. After the first plant no words: the 2nd and 3rd seeds come without any. After 3 plants a ring round the newest plant with the pull icon (↕), and after your first pull the drag icon (✥). After 4 minutes, or at 6 plants: "Rest your hands to listen", with a palms-out icon. A caption stays about 5 s; its icon stays until you do the step.
- No step waits more than 60 s: then the next one comes (D-053).
- The captions are 0.6 m ahead, 8° below your gaze, with letters about 1.6 cm tall (FR-UI-04: at least 1.4 cm). The icons float over the bed, about 0.45 to 0.6 m from your eyes (computed from the seated sketch of UX §2, not measured).
- In the emulator, at test speed: first sound 15.1 s and first loop 34.4 s after Enter (API_SPEC v1.2.34). A person needs longer.
- The three notes right after the bed lands are the ripple's (T-142b), not the first sound: the first sound is the first plant singing (step 5 above).

#### Steps, part A — you, looking on purpose (8 min)

1. In the session of this block, open the panel, **Garden** tab, pinch **hold** beside "New garden" and keep the pinch 2 s. Leave the session. The next session begins on an empty bed with three seeds, so the guide runs again.
2. Lay the white sheet under the near half of the bed's place. Sit back as you would to play; from here on, do not lean in.
3. Enter. Read each caption aloud as it comes. Could you read it to its end without leaning in?
4. "Open your hand": find the palm icon above the middle of the bed. What does it show, from your seat? Open your hand, palm up.
5. "Pinch, and plant it": before you pinch, watch the little hand over the glowing cell for three of its loops (about 6 s). In your own words: what is it telling you? Is the glowing cell easy to pick out on the sheet? Then plant the seed in that cell.
6. Plant the other two seeds anywhere. After the third, a ring with an icon comes round the newest plant: what does it ask, from your seat? Do it (pull the plant up). The next icon comes: what does it ask? Do it (drag the plant to another cell).
7. Optional, if you can stay 4 minutes: keep playing without Listen until "Rest your hands to listen" and its icon come. Readable from your seat?

#### Steps, part B — a stranger's first minute (12 min)

The rules of UAT_PLAN §3.1, as for UAT-16: from their pinch on Enter you say nothing and point at nothing; the one answer to any question is "do what feels right". Keep no name, photo, voice or video: call the person P0. A person is a first-time user once: P0 cannot be one of UAT-16's five later.

8. Before they arrive: in your own session, New garden (keep the pinch 2 s) and leave, so their session begins on an empty bed with three seeds. Take the white sheet away. Controllers out of reach. Start the cast if you have one.
9. Seat them at your table, belly at its edge. Fit the headset and bring up the app page with **Enter the garden** (the plain bookmark).
10. Say only: "Tap Enter and do what it shows you. I can't help you."
11. Start the stopwatch at their pinch on Enter. Note the time of the first plant's note and the time when three plants are playing; stop at three plants playing, or at 90 s. Without a cast, go by ear: the ripple's three notes right after the bed lands do not count; three plants are playing when three different notes come round each turn.
12. While it runs, note where they stopped or hesitated (the words, the seed, the pinch, the bed's placement), without a word or a gesture.
13. Once the stopwatch has stopped you may talk. Ask, and write down their words: "What did the small hand over the ring mean?" "Could you read the words? Which were hard?" "Have you used a headset before? Hand tracking?"

#### Write down

| Field | Value |
|---|---|
| You: each caption read to its end without leaning | yes / no, which not |
| You: the palm icon, from your seat | what it showed, in your words |
| You: the little hand over the glowing cell, in your words; the cell easy to pick out on the sheet | words; yes / no |
| You: the pull icon and the drag icon, from your seat | what each asked, in your words |
| You: "Rest your hands to listen" and its icon (optional) | readable / not; not reached |
| A step that waited more than 60 s with nothing happening | none / which |
| P0: first sound (s); three plants playing (s), or "not in 90 s" | s; s |
| P0: aided or unaided; where they hesitated or stopped | which; words |
| P0: the bed on the table or floating; the room bright or dim | which; which |
| P0: what the small hand meant, in their words; words they could not read | words |
| P0: used a headset before; hand tracking before | yes / no each |
| P0: anything done with a controller | words |
| Cast used | yes / no (then by ear) |

#### Pass rules

| Check | Rule | Source |
|---|---|---|
| First sound | P0's first plant sings within 20 s of the Enter pinch | TC-DEV-01, FR-UI-02, UAT-16 |
| First loop | three plants playing within 90 s of the Enter pinch, unaided | TC-DEV-01, FR-UI-02, UAT-16 |
| One person | the result is "1 of 1, below sample", never a pass or a fail of UAT-16 (five people, at least 4 of 5) | UAT_PLAN §3.1 |
| The ghost pinch | the documents give no rate: P0's words and yours are the result, and Parth judges whether it reads as "pinch here" | UX §3.3 step 2, T-150 |
| Legible | every caption read to its end from the seat; the documents fix the size (letters at least 1.4 cm at 0.6 m), not a rate | FR-UI-04, UX §3.3 |
| Captions | one at a time, at most 6 words, with an icon; no paragraph | FR-UI-01 |
| No step held | after 60 s with nothing done, the next step comes | D-053 |
| Hands only | no controller | FR-HND-01 |

#### If it fails

- No "Open your hand" at all: the bed was not empty when the session began (the guide runs only then, D-053): do step 1 again. Still none: the build lacks T-150 (block 0).
- A step does not give way after 60 s: write down which, and the count. Claude files it against T-150 (D-053).
- P0 is stuck: do not help. Stop at 90 s and write down where. If you helped, the run is "aided".

### Also, five first plays, thinking aloud (L5; 60 min, a sitting of its own)

**Needs: T-128d**, as this block. Checked against `develop` 079944d for what a new player hears first: the 2.5 s fade-in at the start, and a plant that sings its own note at once when it is let go (the placed note, T-173; API_SPEC §1.2). The cast is **(unchecked)**.

**Answers:** the PM's 16 Oct update §7, L5: do new players notice, without being asked, that the sound reacts to them; does anybody find it uncomfortable (with L8). It is not UAT-16: nothing here is timed. A person who plays here is no longer a first-time user, so cannot be one of UAT-16's five later (UAT_PLAN §3.1).

**You need:** five people who have never seen Roomsong, its video or its page and are not on the team, one at a time, none of them P0 of the guide; the app's plain bookmark; a note and a clock; a cast to the phone or the Mac if you can. Keep no name, photo, voice or video: call them A to E (UAT_PLAN §3.1).

**Know this first:** what counts as "the sound reacts to me": a sentence, said before your questions in step 6, that ties a sound to something they did or to where they are. For example: "it played the one I just put down", "further out is higher", "it comes from over there", "it got louder when I leaned in", "it changed when I moved it". Not counted: words about the sound alone ("pretty", "calm"), or anything said after a question about the sound.

#### Steps, for each person (12 min)

1. Before they arrive: in your own session, open the panel, **Garden** tab, pinch **hold** beside "New garden" and keep the pinch 2 s, and leave. Their session begins on an empty bed with three seeds. Controllers out of reach.
2. Seat them at your table, belly at its edge. Fit the headset and bring up the page with **Enter the garden**.
3. Say only: "Please say out loud what you see, hear and think, the whole time. Tap Enter and do what it shows you. I can't help you."
4. For 5 minutes from their pinch on Enter, write down what they say, word for word as far as you can, with the minute. If they are quiet for 10 seconds, say only "Keep talking". Any question gets "do what feels right".
5. At 5 minutes, or when they stop by themselves, write down the time.
6. Take the headset back. Ask, and write down the words: "Was anything uncomfortable or unpleasant: the sound, the light, anything?"
7. Only then ask: "What did the sound do while you played?" This answer never changes the count of step 4.

#### Write down, one column per person

| Field | A | B | C | D | E |
|---|---|---|---|---|---|
| Words that tie a sound to what they did, unprompted (minute: words), or "none" | | | | | |
| Counted as "the sound reacts to me": yes / no | | | | | |
| Stopped before 5 minutes by themselves: at what time | | | | | |
| Discomfort, while playing or in step 6: none / their words | | | | | |
| What the sound did, in their words (step 7) | | | | | |
| Room bright or dim; bed on the table or floating; used a headset, hand tracking before | | | | | |
| Anything done with a controller | | | | | |

#### Pass rules

| Check | Rule | Source |
|---|---|---|
| The sound reacts to them | at least 4 of 5 say so unprompted, in step 4 | the PM's 16 Oct update §7, L5 |
| Comfort | nobody reports discomfort: 0 of 5, while playing or in step 6 | the same, L5 and L8 |
| Fewer than five people | the result is "n of N, below sample", never a pass or a fail | UAT_PLAN §3.1, the same rule |
| Hands only | no controller | Golden Rule 1 |

#### If it fails

- Fewer than 4 of 5: write down what the others talked about instead. It is a finding for Parth and the sound pass (T-164), not a bug.
- Any discomfort: write down the minute and what was playing. Claude files it in BUG_LOG the same day.

---

## Block 12 — The app: the settings panel and its orb (15 min)

**Needs: T-128d** (its first step, d1, puts the panel into the app). That the panel is in the app is **(from the plan)**; what it looks like and does is checked against code.

**Purpose:** find the small orb that opens the settings, read the panel, hit its buttons with a pinch and by looking, and try the long hold that starts a new garden. Nobody has seen any of it on a headset.

**Answers:** from T-151: does the back of the hand show the orb and the palm hide it; does the orb show most of the time while you play; can the panel be read at arm's length and over a bright room; is it drawn over your real hands; do Tempo + and the tabs take the pinch without a neighbour taking it (buttons 4 cm wide, 5.5 cm apart); the 1.5 second hold on New garden; the same by looking; a hitch when the panel redraws; the panel after a head tilt; where the orb waits at the very start · TC-DEV-15 (new) · Golden Rule 1.

**You need:** the session of block 11 with its three plants, or any garden. The app opened with `?dev=1&flags=perfHud` at the end of its address: the read-out shows a hitch.

**Checked against:** `src/ui/Panel.ts`, `src/ui/PanelSystem.ts`, `src/ui/config.ts` (panel 40 by 28 cm, 55 cm away; orb 4 cm, 9 cm off the hand; the hold 1.5 s), `src/ui/strings.ts` (the panel's words), `src/hands/config.ts`, `src/core/settings.ts` (the main hand is the right one unless you change it, so the orb is on the left hand).

**Know this first:** this block ends with a new, empty garden and three fresh seeds. Blocks 13 and 14 need exactly that.

### Steps

1. Open the app with `?dev=1&flags=perfHud`. Pinch **Enter the garden**. The bed is on your table.
2. Hold your left hand up with its back toward your face. A small round orb shows a little way off the back of the hand. Turn the palm up: the orb goes.
3. Play as usual for one minute, both hands palm-down over the bed. How much of that minute does the orb show? Is it in the way?
4. Show the orb and pinch it with the other hand. A panel opens in front of you with three tabs: **Sound**, **Access**, **Garden**.
5. Read every word on the Sound tab with your arm stretched toward it. Turn until a bright wall or a window is behind the panel: still easy to read?
6. Hold a hand between your face and the panel. Do you see your hand, or is the panel's picture drawn over it?
7. Pinch **+** beside Tempo five times, slowly. Each time: did the number go up by 4? Count the pinches that hit something else or nothing. Watch the read-out: does the picture hitch at a press?
8. Pinch the tabs Access, Garden, Sound, twice round. Count the pinches that opened the wrong tab or nothing.
9. Tilt your head toward one shoulder and hold it. Does the panel stay level? Close it with the **x** and open it again with the head still tilted: how does it sit now? Straighten your head: does the panel look crooked until you open it again?
10. Garden tab: beside "New garden" is a button **hold**. Give it one short pinch. Nothing may happen.
11. Pinch that button and hold for 2 seconds: a ring fills. Let go. The plants are gone and three seeds wait.
12. Access tab: pinch **Look and hold** on. From here to step 15, do not pinch.
13. Look at the Sound tab and keep looking: a ring fills and the tab opens. Look at Tempo **+** and keep looking: does it press?
14. Look at the Garden tab, then at the button **hold** beside "New garden", and keep looking until a new garden starts. It takes the hold time and then 1.5 seconds more. Does it start?
15. Look at the **x** to close the panel. In this mode the orb does not need your hand: it waits in view by itself. Where is it?
16. Leave the session and enter again. In the first second: is the orb in view at that same place, or somewhere odd (at your feet, on the floor, behind you)?
17. Open the panel by looking at the orb. Access tab: look at **Look and hold** and keep looking. It must not switch off. Now pinch it off.

### Write down

| Field | Value |
|---|---|
| Back of the hand shows the orb; palm up hides it | yes / no; yes / no |
| The orb during a minute of play | most of the time / now and then / never; in the way: yes / no |
| The panel's words at arm's length; over a bright wall | easy / hard, which words; easy / hard |
| Your hand in front of the panel | hand visible / covered by the panel |
| Tempo +: pinches that missed, of 5 | count, and what was hit |
| Tabs: pinches that missed, of 6 | count, and what was hit |
| A hitch at a press; the lowest `fps` you saw | yes / no; number |
| Head tilted: the panel | stays level / tilts with you; crooked until reopened: yes / no |
| Short pinch on New garden | nothing / what happened |
| Hold on New garden | new garden with three seeds / what happened |
| By looking: tab opened; Tempo + pressed; New garden started | yes / no each |
| The orb in look-and-hold mode: where it waits; where it was at the very start of the next session | words; words |
| Look and hold by looking | stays on / went off |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| The orb | the back of the left hand toward your face shows it; palm up hides it | from T-151 |
| Buttons | no pinch on Tempo + or on a tab is taken by a neighbour | from T-151, FR-HND-04 |
| New garden | a short pinch does nothing; only the hold, let go after 1.5 seconds, starts one; by looking it starts too, after the longer wait | from T-151, FR-PER-03 |
| Look and hold | looking cannot switch it off | from T-151 |
| Reading, the orb during play, your hand in front, the hitch, the head tilt, the orb at the start | write down what you see. Each has a note in the review and no number | from T-151 |
| Hands only | every control reacts to a pinch | Golden Rule 1 |

### If it fails

- No orb: it shows on the hand that is not your main hand. Still none: tell Claude. Without the orb nothing else in this block can be done, and blocks 13 and 14 then need another empty garden: reload the page while T-128e is not in, or wait for block 19.
- The panel is gone by itself: it closes when you look away from it for 5 seconds. Open it again.
- The orb is in the way while you play: write down where your hands were. The review expected this risk.

### Also, pinch to sound, filmed (F11; 10 min, and 10 min on the Mac afterwards)

**Needs: T-128d.** The placed note is on `develop` (T-173 part 1, 079944d). A panel press makes no sound on `develop` 079944d (`ui('tick')` is silent until the sound pass): that half needs T-164. The phone's slow motion and the Mac's video editor are **(unchecked)**.

**Answers:** the PM's 16 Oct update §7, F11: on the device, the time from the pinch to the sound for a seed let go on the bed (the placed note) and for a panel press · the UI-sound rule of at most 70 ms from the pinch to the sound, "measured on the device" (API_SPEC §1.2; T-172, P-025) · the finger-to-sound time of the last section of this file.

**You need:** a phone that films slow motion at 240 frames a second with sound (one frame is 4.17 ms); something to stand it on; the headset's own speakers, no headphones (Bluetooth adds a delay of its own); this block's garden after step 17: empty, with three seeds.

**Checked against:** `src/audio/AudioSystem.ts` (a seed let go on a cell plays `ui('placed')` at once), `src/audio/AudioEngine.ts` (of the UI sounds only `placed` and `goodnight` are built), `src/audio/config.ts` (`PLACED_DB_RE_PLANT` −9: the placed note is 9 dB under a full-height plant of its voice); API_SPEC §1.2 (no placed note when the light reaches the cell within one step).

**Know this first:**

- The plant is made when you let go, so the time runs from the first frame in which thumb and finger are apart to the first sign of the note in the sound track. A panel control acts on the release too.
- No placed note sounds when the light reaches the cell within one step: let go in a cell the light has just passed.
- The phone's picture and sound are not exactly in step. The claps of step 2 measure that offset; it is subtracted.
- Sound needs 1.5 ms to cross 50 cm: keep the phone within that.

#### Steps

1. Stand the phone 30 to 50 cm from the near edge of the bed, filming the near side from the side, so your fingertips are sharp. Start slow motion.
2. The offset: clap three times, hands 20 cm from the phone, in view.
3. In this block's session, open a palm, take a seed, carry it over a free cell of the near ring just after the light has passed it, and let go. Hold still for 2 seconds. Do the same with the other two seeds.
4. Only with T-164 in the build: open the panel and pinch **+** beside Tempo three times, slowly, in view of the phone. Close the panel.
5. Stop filming. Open the panel, **Garden** tab, pinch **hold** beside "New garden" and keep the pinch 2 s: blocks 13 and 14 need the empty garden with three seeds.
6. On the Mac, after the sitting: open the video in an editor that shows the sound wave under the frames. For each clap, count the frames from the palms touching to the start of its sound: the middle of the three is the offset. For each plant, count the frames from the first frame with thumb and finger apart to the start of its note; for a panel press, from its release. Frames × 4.17 ms, minus the offset, is the time. Show only your hand in the video, keep it out of the repository, and delete it once the numbers are written down.

#### Write down

| Field | Value |
|---|---|
| The phone's slow-motion rate | frames a second |
| The three claps: frames each; the offset (the middle one) | frames; ms |
| The three placed notes: frames each; time after the offset | frames; ms each |
| A seed let go on a free cell with no note heard | count; where the light was |
| The three panel presses: frames each; time | frames; ms each, or "no sound (T-164 not in)" |

#### Pass rules

| Check | Rule | Source |
|---|---|---|
| A seed let go | each placed note at most 70 ms after the fingers part | API_SPEC §1.2 (the UI-sound rule, T-172, P-025); the PM's 16 Oct update §7, F11 |
| A panel press | each tick at most 70 ms after the release | the same; needs T-164 |
| A seed let go away from the light | it sings at once, every time | API_SPEC §1.2 (T-173, P-012) |
| Within one frame of 70 ms | "at the limit", neither a pass nor a fail: one frame is 4.17 ms | 240 frames a second |

#### If it fails

- Over 70 ms: write down every time, and `audio.outputLatency` from block 1 (the capability page). Claude splits the time into the hand, the frame and the sound and files it.
- No note for a seed let go away from the light: write down the ring and where the light was. Claude files it against T-173.
- The phone has no 240: film at its highest rate and write it down; one frame is then 1000 ÷ that rate, in ms.

---

## Block 13 — The app: hands lost (10 min)

**Needs: T-128d, with T-127** (a seed to carry). The last step also needs T-146. That a seed can be carried in the app is **(from the plan)**; the hand rules are checked against code.

**Purpose:** see what happens when the headset loses a hand that is holding something: the hand-out-of-view icon (a palm in a dashed ring), where the seed goes, and whether a lost moment can plant a seed you never let go of.

**Answers:** TC-DEV-09 · NFR-REL-02, FR-HND-15 · D-030 (the words only for a hand that held something, for at most 5 seconds) · from T-116: does the browser end the pinch when a hand drops out for an instant and start it again a moment late (a carried seed would then be let go: say what happened); how real hands are lost and whether a grace of 0.2 seconds suits; do the words stay at least 1.2 seconds, also after a very short loss and when the headset's menu takes the hands away, or do they flicker; can the words be read, also over a bright wall.

**You need:** the empty garden with three seeds from block 12; the "app, dev" bookmark. The console is a bonus: it shows `hands:lost`, `gesture:trackingLost` and `garden:seedBack`.

**Checked against:** `src/hands/config.ts` (the grace is 200 ms; the words stay at most 5 s), `src/hands/HandSystem.ts`, `src/core/strings.ts` (the hand-out-of-view icon (a palm in a dashed ring)), `tests/e2e/11-tracking-loss.spec.ts` (what the emulator already shows: a whole hand removed while it carries a seed).

**Know this first:** do not plant a seed in this block. To put a seed back, let go of it away from the ring.

### Steps

1. Open the "app, dev" bookmark and enter. Open a palm: a seed comes. Pinch it with the other hand. You now carry it.
2. Put the carrying hand behind your back for 3 seconds. The words the hand-out-of-view icon (a palm in a dashed ring) should show, and the seed should be back in the supply: not planted, not gone. Bring the hand back. Do the words go? Did they stay at least a second?
3. Take the seed again. Slide the carrying hand slowly out of view, down past the table's edge. The same questions.
4. Take the seed again. Flick the carrying hand out of view and straight back, as fast as you can. The seed should still be at your fingers. Did the words flash up?
5. Carry the seed over the ring. Pass your other hand quickly between your face and the carrying hand, three times. Did the seed get planted, or drop, although you never let go? Say exactly what happened.
6. Carry the seed. With the other hand open the headset's menu (palm, pinch and hold). Do the words show steadily, or do they flicker? Close the menu. Where is the seed?
7. Carry the seed, hide the hand behind your back and keep it there for 10 seconds. Do the words go by themselves after about 5 seconds?
8. Let go of the seed away from the ring. Rest one empty hand in your lap, out of view, for 10 seconds. No words may show.
9. Make the words show once more, as in step 2, and read them with a bright wall or a window behind them.
10. Think back over steps 2 to 7. Did the seed ever go back although your hand was gone only for a blink? Did it ever hang in the air long after the hand had gone?
11. Only once T-146 is in: pinch a plant and drag it, and hide the hand as in step 2: the plant goes back to its cell. Flick as in step 4: the drag goes on. The same while pulling a plant up. No plant may be lost or doubled.

### Write down

| Field | Value |
|---|---|
| Behind the back: the words; the seed; how long the words stayed | yes / no; back in the supply / planted / gone; seconds |
| Past the table's edge: the same | |
| The flick: seed still carried; the words | yes / no; nothing / flashed |
| The other hand passed in front, three times | nothing / the seed was planted / dropped; words |
| The menu: the words | steady / flicker / none; where the seed was afterwards |
| Hidden for 10 seconds: the words | gone after about … s / stayed |
| Empty hand out of view | no words / words showed |
| The words over a bright wall | easy / hard |
| The grace of 0.2 seconds | suits / too short (when) / too long (when) |
| With T-146: drag and pull | plant back in its cell; drag goes on after a flick; lost or doubled plants: count |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| A held thing and a lost hand | the words show and the seed goes back (a dragged plant: to its cell) | TC-DEV-09, FR-HND-15 |
| Back at once | a hand back within about 0.2 seconds carries on | TC-DEV-09 |
| Nothing planted by a loss | no seed is planted or dropped without your letting go | from T-116, NFR-REL-02 |
| The words | they stay at least 1.2 seconds and do not flicker, also after a very short loss and under the menu; they go after 5 seconds at most | from T-116, D-030 |
| An empty hand | no words | D-030 |
| The grace | write down what you see | from T-116 |

### If it fails

- The words flicker: nothing to do in the sitting. Tell Claude when (a short loss, or the menu): the review already names the fix.
- A seed was planted that you never let go of: write down the step. It is a bug of the second-highest severity: the review reasoned this case out and could not test it without a headset.
- No seed comes: all were planted. From T-128e on, open the app with `?dev=1&flags=eventLog,fakeDay=+1`: one new seed arrives, as on the next day. Raise the number by one each time you need another.

---


### Also, from the T-146 review (needs T-146 in the app: T-128d)
1. Pinch a plant and hold perfectly still for 2 seconds. Nothing should stretch and no ghost cell should appear. Write down: yes or no.
2. Pinch a plant and open your fingers at once. Its height and its place must not change. Write down: yes or no.
3. Remove a plant, plant a seed in the same spot, then pinch the petal above it. The petal must be taken, not the new plant (they are 3 cm apart). Write down: which one was taken, three tries.
4. Pull one plant up with one hand while you drag another with the other hand; then put both hands on the same plant. Write down anything odd.
5. Watch the petal fade over a bright table: a fade, or a blink? Write down: fade or blink.

## Block 14 — The app: ten minutes with a full garden (30 min)

**Needs: T-128d** (the garden drawn and played in the app). That the app draws and plays the plants, and that a hand's hover lights them, is **(from the plan)**; the flag and the read-out are checked against code.

**Purpose:** the real frame-rate test: ten minutes with sound, hands and many plants. In the same ten minutes: does the loop keep steady time, does the Bass come through the headset's speakers, does planting late in a session hitch, and does the bed creep away from its place. Part B looks at what a real hand lights up (T-119), now that the bed lies on your real table.

**Answers:** TC-DEV-07, TC-PERF-01, TC-PERF-06 (without Listen mode, which is T-148) · from T-121: the sound keeps its rate inside a session · from T-144: is the lowest Bass heard on the headset's speakers; what many Choir notes cost · from T-143: a first plant put in minutes after the start · from T-162 and TC-DEV-05: the bed's drift over ten minutes, in cm · from T-119 and D-044: the light's dark edge on your real table; the lit cell and the 20 % glow of a hovered plant in passthrough, also under the light's crest and in high contrast, where the hovered plant's own cell lights up too; a glow that feels late or flickers with a real hand; the frame rate with those effects on.

**You need:** the empty garden with three seeds from block 12; the coin; the white sheet of block 4; the app's address with `?dev=1&flags=perfHud,autoplant=60` at its end. Leave `eventLog` out: its lines cost time and would spoil the numbers.

**Checked against:** `src/garden/GardenSystem.ts` (`autoplant` fills only a garden that has no plants; the plants take the five voices in turn: bell, pad, pluck, bass, choir), `src/core/flags.ts` (0 to 80), `src/render/PerfHud.ts` (the three lines of the read-out), `src/garden/signature.ts` (the key A, the lowest, goes to rooms with a floor of 34 m² or more).

**Know this first:** 60 plants are 12 of each voice, and 20 cells stay free for step 6. The lowest Bass note of all (55 Hz) belongs to the key of A. In a smaller room the lowest note is higher and easier to hear: that is why you write the key down.

### Steps, part A — ten minutes

1. Open the app with `?dev=1&flags=perfHud,autoplant=60`. Pinch **Enter the garden**. Sixty plants stand on the ring and the light plays them.
2. Put the coin on the real table, exactly under the middle of the ring.
3. Look at a clock. For 10 minutes keep your hands over the bed and move them as in play. Watch the read-out.
4. Listen the whole time. Count stutters, gaps and clicks, and moments when the sound and the light drift apart.
5. Listen for the lowest notes. Do you hear the Bass on the headset's speakers? Open the panel (block 12), Garden tab, and write down the Key.
6. After minute 5: open a palm, take a seed and plant it in a free cell. Did the picture or the sound hitch at that moment? What does the new plant sound like?
7. At minute 10: look straight down at the coin. How far is the middle of the ring from it, and in which direction?
8. Write down the read-out's numbers. Leave the session. Leave the coin where it is: block 16 uses it.

### Steps, part B — what a hand lights up (T-119)

9. Slide the white sheet onto the table under the right half of the ring. Do not move the coin. Open the same address and enter: the garden is full already, so the flag adds nothing.
10. Watch the light pass over your real table and over the sheet. A dark band runs just ahead of it. Can you see it on the table? On the sheet? Too weak, about right, or too strong?
11. Hold an empty hand over a plant, fingers apart, as if about to pinch it. The plant should brighten a little and the ring of its cell light up. Can you see both in your room? Keep the hand there while the light passes over that plant: can you still tell it is the one under your hand?
12. Move the hand slowly from plant to plant, then quickly, and stop it on the line between two plants. Does the glow follow at once, or feel late? Does it flicker between the two?
13. Open a palm, take a seed and carry it over free cells without letting go. The ring of the cell where it would land lights up. Can you see it? Then let go of the seed away from the ring: it goes back.
14. Open the settings panel (block 12), Access tab, and pinch **High contrast** on. Close the panel. Every plant has a cream rim: does it read as an outline? Hover a plant as in step 11, also while the light passes over it. Can you tell which one you hover? Its cell lights up as well: is that enough?
15. Keep a hand hovering and high contrast on, and read the read-out: `fps`, `draws`, `tris`. Then switch **High contrast** off on the panel and leave the session.

### Write down

| Field | Value |
|---|---|
| `fps`, usual; `fps`, lowest seen, and when | |
| `ms` | |
| `draws` and `tris` | |
| `voices`, the highest you saw | |
| `flash` (shown as a count out of 3) | |
| Stutters, gaps, clicks; sound and light apart | count; yes / no |
| The Bass on the speakers; the Key on the panel | clearly / faintly / no; letter |
| The seed planted after minute 5 | no hitch / picture hitched / sound hitched; what the plant sounds like |
| The ring's middle against the coin after 10 minutes | cm, direction |

| Part B | Value |
|---|---|
| The dark band ahead of the light: on your table; on the sheet | visible / not visible each; too weak / about right / too strong |
| A hovered plant's glow; its lit cell | visible / faint / not visible each |
| The hovered plant under the light's crest | still clear / lost |
| The glow with a moving hand | at once / late; steady / flickers between two |
| The lit cell under a carried seed | visible / faint / not visible |
| High contrast: the cream rim as an outline; which plant is hovered, with its cell lit | yes / no; clear / not clear; enough / not enough |
| Hand hovering, high contrast on: `fps`, `draws`, `tris` | |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Frame rate | usual `fps` at least 72 and never below 60, over the 10 minutes, and in step 15 | TC-DEV-07, TC-PERF-01, Golden Rule 5 |
| Script time | `ms` at most 6 | NFR-PERF-05 |
| Drawing budget | `draws` at most 60, `tris` at most 150,000. D-044 expects up to 20 draws with every effect on | Golden Rule 5, D-044 |
| Flashing | `flash` at most 3 | FR-UI-11 |
| Steady time | 0 stutters, gaps or clicks | TC-PERF-06, from T-121 |
| The Bass, the late plant, the drift | write down what you see and hear | from T-144, T-143, T-162 |
| The dark band, the glow, the lit cells, high contrast | write down what you see. A hovered plant you cannot pick out in high contrast, even with its cell lit, goes back to D-044 | from T-119, D-044 |

Listen mode is part of TC-DEV-07 and is not on `develop` yet (T-148): that half is device script S2, block 6D.

### If it fails

- Only a few plants stand on the ring: the garden was not empty, so the flag did nothing. Make a new garden (block 12, step 11) and open the address again.
- `fps` below 60: nothing to do in the sitting. Make a new garden and repeat steps 1 and 3 for two minutes with `autoplant=24`, the smallest garden the rule names. Write down both sets of numbers and tell Claude: the performance work (T-165) moves forward.
- Clicks or gaps: write down what was playing. Compare with the crackle step of block 1.
- The Bass cannot be heard: nothing to do in the sitting. The sound pass (T-164) adds overtones to it.

### Also, speakers against headphones, and the app at 100 % (L7; 15 min)

**Needs: T-128d**, as this block. The headset's sound socket is **(unchecked)**: if it has no 3.5 mm socket, use headphones with a USB-C plug, or a USB-C to 3.5 mm adapter, in its USB-C port.

**Answers:** the PM's 16 Oct update §7, L7: is the Bass there on the Quest's built-in speakers, against wired headphones, for you and two other listeners (its fundamentals are 55 to 147 Hz, where small speakers give little) · the same update: the app's own mix at 100 % (harshness, buzz) · whether the Devpost line that sends judges to the built-in speakers holds.

**You need:** the full garden of part A (60 plants, 12 of them Bass); the app's plain bookmark; wired headphones, not Bluetooth; two listeners from outside the team, one at a time (friends or family will do); the Key from step 5 of this block.

**Know this first:** in the key of A the lowest Bass note is 55 Hz; in a smaller room the key, and so the Bass, is higher. Taking the headset off to hand it over pauses the garden (block 9); if it is not playing when the next listener has it on, enter again.

#### Steps

1. Open the plain bookmark and enter: the full garden plays. Panel, Sound tab: the Volume reads 80 %, the default. Leave it. Headset volume at the middle, as in block 5.
2. Speakers: for 30 seconds listen to the lowest notes, under the others. Clearly, faintly or not at all?
3. Plug in the headphones. The same 30 seconds and the same question. Unplug.
4. Each listener in turn: fit the headset on them and say only "Listen to the lowest notes, under the others." 30 seconds on the speakers, then 30 on the headphones; they answer clearly, faintly or not at all for each. Then ask "Which would you keep?"
5. The 100 %, you, on the speakers: the headset's volume to its highest; on the panel, Volume **+** twice, to 100 %. Listen for 30 seconds: harsh? A buzz, a rattle or crackling? Then Volume **−** twice, back to 80 %, and the headset back to the middle.

#### Write down

| Field | You | Listener 1 | Listener 2 |
|---|---|---|---|
| The Bass on the built-in speakers | clearly / faintly / no | | |
| The Bass on the headphones | clearly / faintly / no | | |
| Which they would keep | speakers / headphones | | |

| Also | Value |
|---|---|
| The Key on the panel | letter |
| The headphones' plug | 3.5 mm socket / USB-C / adapter |
| At 100 % on the speakers: harsh; buzz, rattle or crackling | no / a little / very; none / which |

#### Pass rules

| Check | Rule | Source |
|---|---|---|
| The Bass on the speakers | every listener hears it on the speakers, at least faintly | the PM's 16 Oct update §7, L7 (fundamentals 55 to 147 Hz) |
| Speakers against headphones | a listener who hears it on the headphones and not on the speakers is a fail: the Bass needs overtones that small speakers carry | the same; T-144, T-164 |
| At 100 % | no buzz, rattle or crackling. The mix ends in a compressor and a −1 dBFS ceiling, so what is left is the speakers or a voice's own tone. Harshness is Parth's rating | the PM's 16 Oct update §7; API_SPEC §1.2 |

#### If it fails

- No Bass on the speakers: write down the Key. The sound pass (T-164) adds overtones to the Bass. The Devpost line for the speakers stays: the delay of Bluetooth headphones is the worse problem.
- A buzz at 100 %: lower the headset's volume one step at a time until it goes, and write down that level.
- No sound in the headphones: write down the plug and skip the headphone half of steps 3 and 4.

### Also, ten minutes kept on, startles, and turning it down (L4 and L8; 16 min)

**Needs: T-128d.** **Checked against:** `src/audio/config.ts` (`START_FADE_S` 2.5: from silence the master is −10 dB at 0.3 s and −3 dB at 1 s), `src/ui/config.ts` (`VOLUME_STEP` 0.1: a press moves the Volume 10 %, UX §3.6), `src/ui/Panel.ts` (the **Mono** switch on the Sound tab's last row), API_SPEC §1.2 (`setMono` sums the mix to mono at the master; `resume()` fades in) and §4 (`volume` and `mono` are saved with the settings).

**Answers:** the PM's 16 Oct update §7, L4: a ten-minute "keep it on" test, with the times a listener would stop and the times a sound startled them · L8: comfort, startle, and a way to turn the music down (the Volume on the Sound tab; the Mono switch) · Golden Rule 4 (a session of up to 10 minutes, and satisfying).

**You need:** a wearer, best someone who has not heard the garden today (a friend, or a listener of L7); you, with a clock and a note; the full garden of part A; the app's plain bookmark.

#### Steps

1. Say only: "Play and listen as you would at home, for up to ten minutes. Say 'stop' at the moment you would turn it off, and 'jump' each time a sound makes you jump."
2. They pinch **Enter the garden**: start the clock. Listen too: does the sound rise from silence over about 2 seconds, or start with a jump?
3. Write down the minute and second of every "jump", and of "stop". At "stop", ask "Why?", write it down, and let them go on if they like: the stop time stays.
4. At 10 minutes (or at "stop", if they want to end): say "Now make the music quieter, with your hands only." Time it from your sentence to the first quieter note. Say nothing else for 60 s; after that, show them the orb, and the run is "shown". Write down what they reached for first: the orb, the headset's own volume buttons, or something else.
5. Panel, Sound tab: Volume **−** until it reads 0 %. Is it silent? Then **+** up to 50 %.
6. Pinch **Mono** on. Ask them to turn their head left and right: do the plants still come from their own side, or the same from everywhere? Louder, softer or the same?
7. Leave the session with Mono on and the Volume at 50 %. Enter again: do both read as you left them? Does the sound rise from silence again? Then the Volume back to 80 % and Mono off.
8. Ask, and write down the words: "Was anything uncomfortable: too loud, sudden, shrill, tiring for your ears?"

#### Write down

| Field | Value |
|---|---|
| "stop": the time, and why | m:ss, words; or "not before 10:00" |
| "jump": each time, and what was playing | m:ss, words each; or "none" |
| The start at Enter | rose from silence / jumped |
| Quieter: seconds; alone or shown; reached first for | s; alone / shown; the orb / the headset's buttons / other |
| Volume at 0 % | silent / still heard |
| Mono: from their own side or from everywhere; the level | words; louder / softer / the same |
| After leaving and entering: the Volume at 50 % and Mono on kept; the start rose again | yes / no each |
| Discomfort | none / their words |

#### Pass rules

| Check | Rule | Source |
|---|---|---|
| Kept on | no "stop" before 10:00 | the PM's 16 Oct update §7, L4; Golden Rule 4 |
| Startle | no "jump" | the same, L4 and L8 |
| The start | the sound rises from silence over about 2.5 s, at Enter and after leaving and entering; never a jump to full level | API_SPEC §1.2 (`resume()`; T-173, P-014) |
| Turning it down | done with hands only; each Volume press is 10 %; 0 % is silent | the PM's 16 Oct update §7, L8; Golden Rule 1; UX §3.6 |
| Mono | the plants no longer come from their own side; Mono and the Volume are kept after leaving | API_SPEC §1.2 (`setMono`) and §4 |
| Comfort | nothing uncomfortable | the PM's 16 Oct update §7, L8 |
| The time to find "quieter" | write it down: the documents give no number | the PM's 16 Oct update §7, L8 |

#### If it fails

- A "stop" or a "jump": write down what was playing at that moment (a voice, the light, a placed note). Claude takes each to the sound pass (T-164) and files each startle in BUG_LOG.
- Not found alone in 60 s: write down where they looked. A finding for the panel and its orb (T-151).
- The Volume or Mono not kept: Claude files it against the panel and the save (T-151, T-128e).

---

## Block 15 — The app: a key change listened to (10 min)

**Needs: T-128d.** Every step of this block is **(from the plan)**. The listening points are from the review of T-143; how to cause the change in the middle of playing is this script's best reading of the contract, and Claude confirms it when T-128d lands.

**Purpose:** listen to the moment the garden changes key, scale and echo. The review found nothing wrong by measuring; whether it sounds like a breath or like a fault only ears can say.

**Answers:** from T-143 (W1) and PROGRESS item 27: do the first plucked notes after a change sound like the same instrument (a plucked note can be shifted by up to about 10 semitones); the cut and the silent step; the short dry moment when the echo is swapped; a long echo cut short and any jump in loudness; any click; the very first plucked notes of a session with a garden already there; on the headset, a visible hitch at the swap in a large room · the open choice in the T-143 notes: accept the cost of the echo swap or shorten the echo for large rooms · TC-DEV-17 (new).

**You need:** the garden of block 14, playing; the app's plain bookmark; a room that the app could read (the bed sat on a table by level 1 or 2 in block 10). In a room it could not read, the garden is already in the default tuning and step 4 changes nothing.

**Written from:** `T-143` in the plan and its review notes; API_SPEC §1.10 rule 4 and §2 (`room:features` comes again after "Re-place bed", and a bed that floats gets the default tuning, "Wanderer"); UX_WIREFRAMES §9.2 (a pinch while looking at nothing floats the bed at once).

### Steps

1. Sit at your table. Open the app's plain bookmark and pinch **Enter the garden**. The app tunes the garden to the room about one second before the first note.
2. Listen to the first turn of the light and to the second. Do the plucked notes of the first turn sound like the same instrument as in the second? Or thinner and shorter, or duller and longer?
3. Let it play for a minute, so that you know the sound.
4. Now a change in the middle of playing. Open the panel, Garden tab, and pinch the button **start** beside "Re-place bed". The panel closes and the pale ring shows. Look up, away from every table, and pinch. The bed floats, and the garden goes to the default tuning.
5. Listen at that moment, and for the two turns after it. Use the questions in the table below.
6. Change back: "Re-place bed" again, look at your table and pinch (or wait). The garden goes back to the room's tuning. Listen again in the same way.
7. Do steps 4 to 6 once more if you were not sure.
8. Rate each of the four questions from 1 (a fault) to 5 (fine, or not heard).

### Write down

| Question | Rating 1 to 5 | Words |
|---|---|---|
| (a) Right after the change, do the first one or two plucked notes still sound like the same instrument? Compare the first turn with the second | | |
| (b) Every note is cut, one step stays silent and there is a short gap of about a third of a second: a breath, or a glitch? | | |
| (c) About half a second later the echo drops out for a moment: do you hear it? | | |
| (d) Any click? | | |

| Also | Value |
|---|---|
| The first turn after Enter (step 2): plucked notes | same instrument / thinner / duller |
| A long echo cut short at the change, or a jump in loudness | yes / no, which way |
| Did the picture hitch at the change? The room's size, from your tape | yes / no; m × m |
| Did the bed float in step 4, and did the sound change at all? | yes / no; yes / no |

### Pass rule

The documents give no number. Parth's ratings decide two things: whether the shifted notes are kept or the sound pass (T-164) replaces them, and whether the echo swap is accepted as it is or the echo is shortened for large rooms.

### If it fails

- Nothing changes at step 4: the bed did not float, or this room was not read. Write that down. Then the only change you can hear is the one at Enter (steps 1 and 2), and the rest waits for the two-room test (TC-DEV-13, block 17).
- No **Re-place bed** on the panel, or it does something else: write it down and tell Claude. This step is from the plan.

### Also, the sound as you move: does it come from the plant? (L6, T-145; 10 min)

**Needs: T-128d.** **Checked against:** API_SPEC §1.2, "As built (T-145, the spatializer)" (24 equal-power panners; the listener glides after the head with `PARAM_SMOOTH_S` 0.03 s in `src/audio/config.ts`, so the sound settles within about 0.1 s of a head that stops) and `src/render/PerfHud.ts` (its lines show `voices`, not the audio load). The console's WebAudio tab is **(unchecked)**. The same turn in Listen is device script S2, block 6B, step 5.

**Answers:** the PM's 16 Oct update §7, L6: does the sound come from the plant: pointing, fast head turns; buzz, grain, sound trailing the head, crackle · TC-AUD-04 on the headset (no clicks at 24 voices; so far measured in desktop Chromium only) · NFR-PERF-06 (the audio graph within 15 % of one core, no glitches at 24 voices).

**You need:** the full garden of block 14 (60 plants, so many voices sound at once); the app with `?dev=1&flags=perfHud`; the Mac's console over USB for step 6 (a bonus).

#### Steps

1. Enter: the full garden plays. Close your eyes. Point with one finger at where the notes come from and follow them round for two turns of the light. In the third turn open your eyes, still pointing: is your finger on the light? If not, how far off: an eighth of the ring, a quarter, more?
2. Eyes open, look at the far side of the bed, then turn your head 90° to the left and hold it. Do the notes stay at the bed, now on your right? Then 90° to the right.
3. Turn your head fast left and right for 30 seconds. Listen for buzz, grain or crackles that are not there when you hold still: none, a little, a lot.
4. Turn quickly and stop: does the sound trail behind your head and catch up after you stop? Yes or no.
5. Listen to the note starts for 30 seconds: any ticks? Yes or no. Write down the highest `voices` on the read-out.
6. (console) In the inspect window open the **WebAudio** tab (in its ⋮ menu, More tools). It shows the AudioContext's **Render Capacity**, in %. Write down the highest while you hold still, and while you turn fast.

#### Write down

| Field | Value |
|---|---|
| Pointing with eyes closed: the finger at the third turn | on the light / an eighth of the ring off / a quarter / more |
| Head turned 90°: the notes stay at the bed | yes / no, each side |
| Fast turns: buzz, grain or crackles | none / a little / a lot |
| A quick stop: the sound trails | yes / no |
| Ticks at note starts; the highest `voices` | yes / no; number |
| (console) Render Capacity: still; turning fast | %; % |

#### Pass rules

| Check | Rule | Source |
|---|---|---|
| Pointing | the documents give no number: write it down. A finger more than a quarter of the ring off (4 of its 16 steps) is a reason to run the comparison below | FR-MUS-06 (each plant's sound at its place); the PM's 16 Oct update §7, L6 |
| Head turned | the notes stay at the bed | TC-DEV-04, FR-MUS-06 |
| Buzz, grain, crackles, ticks | none | TC-AUD-04; NFR-PERF-06 (no glitches at 24 voices) |
| Trailing | none you can hear: the listener settles within about 0.1 s | API_SPEC §1.2 (T-145); `PARAM_SMOOTH_S` 0.03 s |
| Audio cost | Render Capacity at most 15 %, still and turning. It is the nearest reading a page gives to "15 % of one core" | NFR-PERF-06 |

#### If it fails

- Buzz, grain or crackles only while turning: write down the highest `voices` and the Render Capacity. Claude compares them with TC-AUD-04 and files it against T-145.
- The sound trails: write down about how long (a blink, half a second, more). Claude files it against T-145.
- No WebAudio tab: write "no tab" and the Chrome version on the Mac.

### Also, the 3D-sound comparison (HRTF A/B, T-145; 15 min)

**Needs: a switch for the HRTF panners, not built.** API_SPEC §1.2 has no HRTF switch: at most 2 HRTF "hero" panners may be added, and only after this comparison justifies them (NFR-PERF-10, FR-MUS-06). Every step is **(from the plan)**: when a switch lands, Claude names it here and takes the mark off. In desktop Chromium two HRTF panners cost no measurable render time (LLD §7.1); the headset is the open question.

**Answers:** T-145 and NFR-PERF-10: are 2 HRTF panners worth having on the headset · is the plant easier to place by ear with them · what they cost on the headset's audio thread (NFR-PERF-06).

**You need:** a helper who works the switch; a coin; the full garden of block 14; the Mac's console over USB with the WebAudio tab, as in the section above.

#### Steps

1. Switch off (equal power for all, as today): hold still for 30 seconds, then turn fast for 30. Write down the highest Render Capacity of each.
2. Switch on: the same.
3. Eight rounds. In each, the helper flips the coin and sets the switch (heads on, tails off) without a word. You point with your eyes closed for two turns of the light, as in step 1 above, and open them in the third. Say your guess, "on" or "off", and how far off your finger was. The helper writes down the switch.

#### Write down

| Field | Value |
|---|---|
| Render Capacity, switch off: still; turning | %; % |
| Render Capacity, switch on: still; turning | %; % |
| Eight rounds: the switch, your guess, the finger off by | on / off; on / off; on / an eighth / a quarter / more, each |
| A crackle with the switch on that was not there with it off | yes / no |

#### Pass rules

| Check | Rule | Source |
|---|---|---|
| Heard | your guess right in at least 7 of 8 rounds (by chance 1 in 28), and the finger nearer the light with the switch on | the documents give no number: this script's line; adopting it is Parth's decision |
| Cost | Render Capacity with the switch on at most 15 %, still and turning; no new crackle | NFR-PERF-06 |
| Count | never more than 2 HRTF panners | NFR-PERF-10 |

#### If it fails

- Fewer than 7 of 8, or the finger no nearer: the equal-power panners stay, as today. Claude writes the result into the note of NFR-PERF-10.
- Over 15 %: write down both numbers. HRTF stays out, whatever the ears say.

---

## Block 16 — The app: the garden comes back (35 min)

**Needs: T-128e** (the garden is saved), on top of T-128c (the bed's place is saved with the headset). Every step of this block is **(from the plan)**.

**Purpose:** leave and come back, in every way a player can, and see each time whether the bed is on the same spot, how long that takes, how far off it is, and that the plants are all there. This is a must-have of the game, and no emulator can show it.

**Answers:** TC-DEV-05 (Must), FR-ROOM-07, US-12 · from T-162: after a reload and after closing the browser (does the bed return, in how many seconds, how many cm off); table moved; light changed; Space Setup done again; headset restarted; sitting elsewhere; headset off, or the menu opened, in the first 4 seconds; a recentre in mid-session; leaving within a second of a fresh placement, three times; the number of saved places at each step; the next day · D-040 (the number of saved places stays at 1) · D-041 (is a slack of 0.10 m right) · D-033 (the garden shown is the one you grew) · D-037 (one new seed the next day) · from T-119, in part C: the unfurl and a week passing in passthrough, leaf whorls and blossoms on your real table, the frame rate with a full garden in bloom (D-044).

**You need:** the garden of block 14, with the one plant you planted by hand; the coin; the tape; the white sheet; the "app, dev" bookmark; the Mac's console for the lines marked (console). Blocks 1, 6 and 7 must be done: from here on the app removes the capability page's saved place.

**Written from:** the T-128c and T-128e rows of the plan, TEST_PLAN TC-DEV-05, D-040, D-041, the review notes of T-162. Checked against code that is already on `develop`: `src/room/config.ts` (the app waits 4 seconds for a saved place; the bed's middle is at most 0.45 m ahead of you).

**Know this first:** "returned" means the bed came back from its saved place. "Placed again" means the app gave up after 4 seconds and put the bed down afresh, with every plant kept. Placed again is the accepted way out and not a failure. A garden without its plants is a failure.

### Steps, part A — the same seat (15 min)

1. Sit at your table as before. Open the "app, dev" bookmark. Pinch **Enter the garden**.
2. Put the coin on the table exactly under the middle of the ring. Wait 10 seconds.
3. (console) Type `__roomsong.world.renderer.xr.getSession().persistentAnchors` and count the entries it shows. One is expected. `undefined` means this browser has no such list: write that down.
4. Leave the session. Reload the page. Pinch **Enter the garden** and count the seconds from the first sight of the room until the ring shows.
5. Is the middle of the ring at the coin? How many cm off? Are all your plants there? (console) Does the `[events] room:bedPlaced` line say `restored: true`? Count the saved places again.
6. Leave. Close Meta Quest Browser completely and open it again. Open the bookmark and enter. The same four answers as in step 5.
7. Leave. Push your chair back about 5 cm and sit as before. Measure with the tape, held level, from under your eyes to the coin. Enter. The bed should still be at the coin.
8. Leave. Push the chair back 20 cm more. Measure again. Enter. The bed should now be put down again within your reach, with every plant. Then move the chair back to its first place, enter, and put the coin under the new middle.
9. Leave. Pinch **Enter the garden** and at once take the headset off for 5 seconds. Put it back on. Is the bed at the coin?
10. Leave. Enter, and at once open the headset's menu for 5 seconds. Close it. Is the bed at the coin?
11. In the session, recentre the view: look at your palm, pinch and keep holding until the view resets (unchecked). Does the bed stay on the table at the coin? If it moved: how many cm? (console) Copy any new line.
12. Open the panel, Garden tab, **start** beside "Re-place bed", place the bed, and leave the session as fast as you can. Do this three times. Write down about how many seconds leaving took.
13. Enter. Is the bed where you placed it last? Put the coin under its middle. (console) Count the saved places: one is expected.
14. (console) Switch on the times of the lines: the gear icon of the inspect window, Preferences, Console, "Timestamps". Place the bed once more with "Re-place bed" and stay in the session. Read the time of the `[events] room:bedPlaced` line and of the `[events] room:anchored` line after it. The difference is how long the headset took to save the place. No `room:anchored` line within 10 seconds: write "none".

### Steps, part B — the room changes (15 min; after each one: enter, then the same four answers as in step 5)

15. The light: switch the room's light off, or close the curtains. Enter. Then make it bright again.
16. The table: push the table about 30 cm to one side, with the coin on it. Enter. Is the bed at the coin (it followed the table), where the table used to be, or put down again? Push the table back.
17. The headset: switch it off and on again. Open the browser and the bookmark. Enter.
18. Space Setup: run it again in this room, with the table. Enter.
19. The next day, if you keep the headset: sit at the same table and enter. The same four answers. Open a palm: exactly one new seed should come. Then do block 6 once more.

### Steps, part C — a week later (5 min; after step 19, or at the end of sitting 2 if you cannot keep the headset)

Do this part last in this block. The flag `fakeDay=+7` makes the garden a week older, and the garden's own date never goes back (D-037): a real next day after it would bring no new seed, and step 19 would read wrong.

20. Lay the white sheet under the right half of the ring, as in block 14. Open the app with `?dev=1&flags=perfHud,fakeDay=+7`. Enter.
21. Every plant is a week older. Each one keeps its look until the light next reaches it, then unfurls: leaf whorls grow on its stem and open into cream blossoms, and it turns lighter. Watch the whole sweep. Is it pleasant? Does a blossom's colour, arriving with the note, look like part of the flash? Two whorls change on every plant, about 120 in one sweep: does the bed bloom, or sparkle?
22. Stretch an arm toward the bed. Can you count the whorls of a plant from your seat? Do the cream blossoms stand out on the sheet and on your table?
23. Read the read-out for one minute: `fps` usual and lowest, `draws`, `tris`. This is the full garden in bloom.
24. Leave the session.

### Write down

| When | Bed: returned / placed again | Seconds | cm from the coin | All plants there | (console) `restored`; saved places |
|---|---|---|---|---|---|
| After a reload | | | | | |
| After closing the browser | | | | | |
| Chair 5 cm back (eyes to coin: … cm) | | | | | |
| Chair 25 cm back (eyes to coin: … cm) | | | | | |
| Headset off in the first seconds | | | | | |
| Menu open in the first seconds | | | | | |
| After three quick leaves (leaving took … s) | | | | | |
| Light changed | | | | | |
| Table moved 30 cm | | | | | |
| Headset restarted | | | | | |
| Space Setup done again | | | | | |
| The next day | | | | | |

| Also | Value |
|---|---|
| Saved places at the start (step 3) | count / no such list |
| Recentre: did the bed stay at the coin; any new line | yes / moved … cm; words |
| Time from `room:bedPlaced` to `room:anchored` (step 14) | seconds / none |
| The slack: did the bed stay when you had only shifted a little, and move when it was a stretch? | yes / no; words |
| The next day: seeds that came | one / other |
| Part C: the unfurl, pleasant; a blossom's colour part of the flash | 1 to 5, words; yes / no |
| Part C: all whorls in one sweep | bloom / sparkle |
| Part C: whorls counted from your seat; blossoms on the sheet and on your table | yes / no; stand out / blend in each |
| Part C: in bloom, `fps` usual and lowest; `draws`; `tris` | |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Reload and browser closed | the garden is back on the same spot within 4 seconds, from its saved place. Write the cm. Placed again with every plant kept is the accepted way out: report it as "placed again" | TC-DEV-05, FR-ROOM-07 |
| The count | report returned n of N over all rows | TC-DEV-05 |
| The plants | all there, in every row. A new, empty garden in place of yours is a top-severity bug | US-12, D-033 |
| Saved places | the count stays at 1 at every step | D-040 |
| Time to save a place | under 4 seconds: the app gives up after that, and the next visit then places the bed again | from T-162, `src/room/config.ts` |
| Reach | with the coin more than about 55 cm from under your eyes, the bed is put down again within reach; nearer than that, it stays. Whether 10 cm of slack is the right number is your call after steps 7 and 8 | D-041, Golden Rule 2 |
| The first seconds, the recentre, the quick leaves, light, table, restart, Space Setup | write down what you see | from T-162 |
| The next day | exactly one new seed | D-037 |
| Part C, in bloom | usual `fps` at least 72 and never below 60; `draws` at most 60; `tris` at most 150,000 | TC-PERF-01, Golden Rule 5, D-044 |
| Part C, the unfurl, whorls and blossoms | write down what you see. Parth's answers go to the art pass (T-163) | from T-119 |

### If it fails

- The plants are gone after a reload: stop this block and tell Claude. Nothing else in it means anything until the save works.
- Placed again every time, never returned: compare with `anchors.restore.restored` of blocks 1 and 6. If the capability page got its place back and the app does not, the app is wrong. If neither does, the headset does not keep places, and the game's fallback is what players get.
- More than one saved place: copy the list from the console and tell Claude. The device allows a site only a few, and after that no new place can be saved.

---

## Block 17 — Rooms against the tape measure (10 min a room)

**Needs: T-128c** (the app reads the room). The listening step needs T-128d. Every step of this block is **(from the plan)**; the names of the numbers are checked against the contract.

**Purpose:** in each room you can reach, compare what the app reads (floor area, ceiling height, volume, walls) with your tape, and hear whether two rooms sound different. Nothing in the room code has ever seen a real room.

**Answers:** from T-140: `room:features` against a tape measure in a small desk room, a kitchen and a living room, and in the same room on two visits; an L-shaped room; a wardrobe or a tall fridge; a sloped ceiling; a room without Space Setup; a room with a mesh but no floor or ceiling surface (a hitch as the bed appears); the three known limits of LLD §5.8 · TC-DEV-13 (two rooms differ in key, scale or echo; back in room 1 the garden is re-tuned in place) · TC-DEV-02 (c) to (f) (which level each room reaches; all playable) · TC-DEV-16 (new).

**You need:** the tape; the "app, dev" bookmark; the Mac's console within cable reach of each room, or, from T-128d on, the panel (its Sound tab shows a line "Tuned by:" with the room's floor area, ceiling height and echo). Run Space Setup in each room first, except the one you keep unscanned.

**Written from:** the review notes of T-140, LLD §5.8, API_SPEC §1.1 (`RoomFeatures`, `RoomSignature`) and §2 (`room:features`, `room:signature`).

### Steps, once per room

1. With the tape: the floor's length and width, and the ceiling's height. Note the shape (a rectangle, or L-shaped), tall furniture (a wardrobe, a tall fridge: where it stands, how far from the wall), and a sloped ceiling.
2. Sit at a table, a desk or a counter. Open the "app, dev" bookmark and pinch **Enter the garden**.
3. Did the picture hitch at the moment the bed appeared?
4. (console) Click the `[events] room:features` line open. Write down `level`, `floorArea`, `ceilingHeight`, `roomVolume`, `wallCount`, `largestWallWidth`, `tableHeight` and `tableArea`. A value that is missing counts as "unknown": write that.
5. (console) Click the `[events] room:signature` line open. Write down `keyRoot`, `mode` and `reverbRt60`. Without a cable: open the panel and copy the "Tuned by:" line of the Sound tab and the Key of the Garden tab.
6. Only once T-128d is in: listen for 30 seconds. Against the room before: is the song higher or lower, and is the echo longer or shorter?
7. Leave the session.
8. After the last room, go back to the first one and enter. Are the plants in their cells? Does it sound as it did there before?

### Write down, one column per room

| | Room 1 (first visit) | Room 1 (second visit) | Small desk room | Kitchen | Living room | Other |
|---|---|---|---|---|---|---|
| Tape: floor length × width (m); area (m²) | | | | | | |
| Tape: ceiling height (m) | | | | | | |
| Shape; tall furniture; sloped ceiling | | | | | | |
| `level` | | | | | | |
| `floorArea` (m²) | | | | | | |
| `ceilingHeight` (m) | | | | | | |
| `roomVolume` (m³) | | | | | | |
| `wallCount`; `largestWallWidth` (m) | | | | | | |
| `tableHeight` (m); `tableArea` (m²) | | | | | | |
| `keyRoot`, `mode`, `reverbRt60` (s) | | | | | | |
| A hitch as the bed appeared | | | | | | |
| How it sounds against the room before | | | | | | |

### What the plan expects in odd rooms (only if your home has one)

| Room | The app should read | Write down |
|---|---|---|
| L-shaped | the floor as the rectangle around it, so more than the real area (an L of 27 m² reads 36), the same on every visit | both areas; the key |
| A wardrobe or a tall fridge | one more wall in `wallCount` | the count with it |
| A wardrobe whose front is about 0.6 m off the wall, in a room that gives no floor surface | no `floorArea`, unless the front is turned more than 5 degrees from the wall | `floorArea` or "unknown" |
| Three flat fronts close behind each other (8 cm apart) | one wall or two, depending on their widths | the count |
| A sloped ceiling | `ceilingHeight` and `roomVolume` unknown | both |
| A tall cupboard, top at about 2.0 m, in a room that gives no ceiling surface | the cupboard's top as the ceiling | `ceilingHeight` |
| No Space Setup | nothing; the default tuning ("Wanderer"); the bed by your pinch, or floating | `level`; the key |
| A mesh but no floor or ceiling surface (block 1 tells you: `meshes.count` above 0 and no `floor` or `ceiling` in `planes.labels`) | the volume from the mesh; a short hitch as the bed appears is the risk | the hitch; `roomVolume` |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Against the tape | the documents give no allowed error. What counts is the band: use the three band tables of block 6. A room that the app puts in another band than your tape does is the result to report | from T-140, T-141 |
| The same room twice | the same band on both visits | TC-DEV-13, from T-140 |
| Two rooms | they differ by ear in key, scale or echo, and their numbers differ; back in room 1 the plants are in their cells and the song is room 1's again | TC-DEV-13 |
| Every room | note the level reached; the garden can be played in each | TC-DEV-02 |
| Odd rooms | write down what you see next to what the plan expects | from T-140, LLD §5.8 |

### If it fails

- No `room:features` line: the address lacks `dev=1&flags=eventLog`, or **Verbose** is not ticked in the console.
- Every room gives the default tuning: check `level`. At level 3 or 4 the room does not tune the song. If the level is 1 or 2 and the numbers are all unknown, tell Claude, and name block 1's `planes.labels`.
- The numbers are far from the tape (a floor twice the size, a ceiling half a metre off): nothing to do in the sitting. Write both down. Claude decides after the sitting whether the room's tuning is built as planned (gate G1, T-130).

### Also, the tuning ripple's look (T-142; 12 min, room 1 only)

**Needs: T-128d.** The ripple is on `develop` (T-142, checked against `develop` af94284), but it starts only on the room's signature, which comes from the app's garden, and the app makes its garden with T-128d: that part is **(from the plan)**. **The ripple's three notes (T-142b)** have their own steps, in the part after this one: here, watch, and do not rate the chord.

**Answers:** the first half of TC-DEV-13 for the eye (each caption names its surface; the ripple in each room) · FR-ROOM-12 (the order, the captions, at least 1.2 s each) · from T-142: does the crest read on a light and on a dark real table; is the wall sweep seen through passthrough; is the ceiling sweep seen from a seat at all; the stall in the frame where the bed appears.

**You need:** the "app, dev" bookmark; the white sheet; a dark cloth or towel (if your table is dark, the white sheet alone is enough: the table itself is the dark run). Know before you start which wall is nearest to the bed.

**Checked against:** `src/render/config.ts` (`RIPPLE_SWEEP_AT_MS` 300 / 1500 / 2700, `RIPPLE_SWEEP_MS` 600 / 1000 / 800, `RIPPLE_TUNED_MS` 4000, `RIPPLE_CREST_M` 0.04, `RIPPLE_AFTERGLOW_MS` 1000, `RIPPLE_GLOW_MS` 400, `RIPPLE_SHADE_M` 0.06, `TIDE_SHADE_COVER` 0.6), `src/render/TuningRipple.ts` (the shader drawn once, dark, in the frame the bed appears), `src/core/strings.ts` (the four captions), `src/core/config.ts` (`CAPTION_MIN_MS` 1200; at most 3 words and 16 characters), `src/app.ts` (`TuningRippleSystem` at 55); LLD §5.8 (the timeline and "As built (T-142)"), §3.3 D (the placement frame's 50 ms); UX §5 ("Tuning ripple"); API_SPEC §1.9 (captions: 0.6 m ahead, 8° below the gaze where each appears).

**Know this first:**

- The ripple runs once each time the bed is placed: at every Enter, and after "Re-place bed". It is over in 4 s. To see it again, leave the session and enter.
- From the moment the bed lands: at 0.3 s the table (0.6 s, out from the bed across the table), at 1.5 s the nearest wall (1.0 s, up from its foot), at 2.7 s the ceiling (0.8 s, from above the bed to its far side); `room:tuned` at 4.0 s. Each is a thin cream crest, 4 cm wide, led by a 6 cm dark band (so it shows on a light table), leaving a 1 s afterglow in the room's own tint.
- Captions, one at a time, only for a surface the headset found: "Table: seeds." (in the session that hands out a new garden's first seeds) or "Table: a note." (every other session), "Walls: a note.", "Ceiling: mood.". Each is up from its sweep's start to the next one's: 1.2, 1.2 and 1.3 s. A caption appears where you look and stays at that spot in the room.
- A room the app could not read (level 3 or 4, "Wanderer") gets one ripple on the bed and no caption. With reduced motion each surface glows for 0.4 s in the same order, with the same captions.

#### Steps

1. **Eyes on the bed (the bare table).** Sit at your table. Open the "app, dev" bookmark and enter. Keep your eyes on the bed for 5 seconds and do not look for anything. Write down what you noticed, and whether anything drew your eye to the wall or up. Did the picture hitch: as the bed appeared, or a moment later, during the first sweep?
2. Read each caption aloud as it appears. Write down the words, in order, and whether any changed before you had finished it.
3. **Looking for it.** Leave and enter again. This time follow it: the table at once, then turn to the nearest wall (by about the count of one and a half), then look up (by about three). Write down what you saw on each.
4. **A light table.** Leave. Lay the white sheet flat under the bed's place and around it, and enter. Watch the table: the cream crest, and the dark band just ahead of it.
5. **A dark table.** The same with the dark cloth (skip if your table is dark: step 1 was that run).
6. **Reduced motion.** Leave. On the landing page tick **Reduce motion**, enter: the table, the wall and the ceiling each glow briefly in turn, with no sweep, and the same captions. Leave, untick it.
7. **No room (optional).** Add `,forceSignature=wanderer` to the address and enter: one ripple on the bed, no caption.
8. In every run, read the panel during the 4 s: the lowest `fps`, the highest `draws` and `flash`.

#### Write down

| Field | Value |
|---|---|
| Your table's colour; the room's light | light / dark; bright / normal / dim |
| Eyes on the bed: what you noticed; drawn to the wall, drawn up | words; yes / no, each |
| The hitch: as the bed appeared / during the first sweep / none | which; small / large |
| Captions: the words, in order | words |
| Each caption up long enough to read aloud; readable over what was behind it | yes / no, which one failed |
| Bare table: the crest; the afterglow | seen / faint / not seen, each |
| White sheet: the crest; the dark band ahead of it | seen / faint / not seen, each |
| Dark cloth (or dark table): the crest | seen / faint / not seen |
| The wall sweep through passthrough, looking for it | seen / faint / not seen / no wall swept |
| The ceiling sweep, looking for it; did you have to tip your head far back | seen / faint / not seen / no ceiling swept; yes / no |
| Reduced motion: glows in turn, no sweep, same captions | yes / no |
| No room: one ripple on the bed, no caption (optional) | yes / no |
| Panel during the ripple | lowest `fps`; highest `draws`, `flash` |

#### Pass rules

| Check | Rule | Source |
|---|---|---|
| The captions | one at a time; only for surfaces found; the words above, with "Table: seeds." only in a new garden's first session; none in a room that was not read | FR-ROOM-12, LLD §5.8 |
| Up long enough | each at least 1.2 s on screen (as built 1.2 / 1.2 / 1.3 s): every caption read aloud to its end before the next | FR-ROOM-12, `CAPTION_MIN_MS` 1200 (API_SPEC §1.0) |
| The order | table, then wall, then ceiling, all over within about 4 s | FR-ROOM-12, LLD §5.8 |
| Flashing | `flash` at most 3 | FR-UI-11, LLD §5.9 |
| Drawing budget | the ripple adds at most 3 draw calls and 100 triangles (as built: 3 quads, 6 triangles); the panel counts both eyes, so at most 6 more `draws` while it runs | LLD §5.8 |
| Frame rate | usual `fps` at least 72, never below 60. One hitch as the bed appears is the placement frame's known cost (up to 50 ms of script, LLD §3.3 D): write it down. A hitch in the middle of the first sweep is a bug: the shader is compiled in the placement frame so that it does not stall 0.3 s later (about 140 ms in the emulator, T-142) | Golden Rule 5, LLD §3.3, T-142 |
| The look: crest on light and dark, the wall, the ceiling from a seat | write down what you see. Parth decides with it whether the ceiling sweep stays, and the art pass (T-163) takes the rest. UX §5 gives no number | from T-142, UX §5 |

#### If it fails

- No ripple, but the garden plays: the signature came (plants sound only from it on), so the ripple failed. Write down the `level`; Claude files it against T-142. Even at level 3 or 4 there is one ripple on the bed.
- No ripple and no sound: the build lacks T-128d (block 0).
- A caption you could not read in time: write down which, and where you were looking when it came.

### Also, the tuning ripple's notes (T-142b; 8 min, room 1 only)

**Needs: T-142b** (on `develop` since 16 Oct), on top of T-128d. Checked against `develop` dca03de. Run it right after the ripple's look, in the same room.

**Answers:** TC-DEV-13, the ear's half (the ripple heard within 5 s of placement) · FR-ROOM-12 (each surface rings one note of the room chord; a missing surface's note rings at the bed) · from T-142b: one chord, in tune with the garden, landing with each sweep · UX §5 against LLD §5.8: the note at the sweep's start (as built) or at the crest's arrival (UX §5).

**You need:** the "app, dev" bookmark; a garden that plays (the one of block 14 or 16).

**Checked against:** `src/audio/AudioEngine.ts` (`chordTone`: `CHORD_VOICES` pad, bell, pluck; the room chord's root, third or fourth, and fifth, from `chordDegrees(mode)`; each a full-height note; from its surface, else from the bed; nothing when the sound is not running), `src/render/TuningRippleSystem.ts` (all three notes scheduled when the ripple starts, at `RIPPLE_SWEEP_AT_MS` 300 / 1500 / 2700), LLD §5.8 (the timeline; the chord table: major, minor or sus4), SRS FR-ROOM-12, API_SPEC v1.2.35.

**Know this first:**

- Three notes, 1.2 s apart, counted from the moment the bed lands: at 0.3 s a soft, long pad from the table (the chord's root); at 1.5 s a bell from the nearest wall (the third, or the fourth in a "sus" room); at 2.7 s a pluck from above, the ceiling (the fifth). Together they are one chord: major, minor or sus, by the room. A surface the headset did not find rings its note at the bed. In a room the app could not read, all three ring at the bed.
- Each note starts with its sweep, not when the crest has crossed its surface: that is how it is built (LLD §5.8); UX §5 asked for the arrival. You choose which feels right.
- The garden's song plays under the notes, in the same key.

#### Steps

1. Sit at your table. Open "app, dev" and enter. Eyes on the bed, no other task. Count the notes you hear in the first 4 s after the bed lands, and name the instruments in the order you hear them.
2. Leave and enter again. This time listen to where each note comes from: the table, the wall, above you. You may turn to the wall at the second note (by the count of one and a half).
3. Leave and enter again. Do the three notes sound like one chord? Does it sit in tune with the song that follows? Rate 1 to 5 (5: it belongs to the garden).
4. Leave and enter again, watching the light. Does each note come as its sweep starts? Would you rather hear it when the light has crossed its surface? Words.
5. Leave. Add `,forceSignature=wanderer` to the end of the address and enter: one ripple on the bed, and three notes, all from the bed.
6. In every run: any click, crackle or note cut short?

#### Write down

| Field | Value |
|---|---|
| Notes heard in the first 4 s; their order | n of 3, each run; words |
| Where each came from | table / wall / above / the bed, each |
| One chord; in tune with the garden | yes / no; rating 1 to 5 |
| With the sweeps: on the start / early / late; your choice, start or arrival | words |
| No room: three notes from the bed | yes / no |
| Clicks, crackles, a note cut short | none / which run |

#### Pass rules

| Check | Rule | Source |
|---|---|---|
| Heard | in every run three notes, the last within 5 s of the bed landing (as built: at 2.7 s) | FR-ROOM-12, TC-DEV-13, LLD §5.8 |
| Spacing and voices | pad, bell, pluck, about 1.2 s apart | LLD §5.8 (the table), `RIPPLE_SWEEP_AT_MS` |
| One chord, in tune | the documents give no number: your rating is the result (listening ratings are Parth's) | LLD §5.8 (the chord table), UX §3.3 step 0 |
| From its surface | write down what you hear; a surface not found rings at the bed | FR-ROOM-12, LLD §5.8 |
| No room | three notes from the bed, one bed ripple, no caption | LLD §5.8 |
| Clean | no click or crackle | TC-PERF-06 |

#### If it fails

- No notes, but the light and the captions come: if "No sound. Leave and enter again." is up, there is no sound and so no notes. If the garden sings and the ripple is silent, the build may lack T-142b (block 0); else Claude files it against T-142b.
- Fewer than three: write down which instrument was missing, and which surface had no sweep.
- A note out of tune: write down which (pad, bell or pluck), and the Key on the panel's Garden tab.

### Also, the room matrix: the device half of T-166 (8 min a room, six rooms)

**Needs: T-128c and T-128d** (a seed that sings). Checked against `develop` 93af00a and `tests/e2e/29-room-matrix.spec.ts`. Run it during the room walk: in each room, block 17's steps 1 to 5 first, then these.

**Purpose:** the emulator runs the app in six made-up rooms (TC-E2E-13) and prints one line for each: the level, how far ahead of the head and how far below the eyes the bed is, the time from Enter to the first note, and the draw calls. This is the same in six real rooms.

**Answers:** T-166 (the device half: six real rooms, all playable) · TC-DEV-02 (c) to (f) · Golden Rule 2 (reach) and 4 (first sound within 20 s) · NFR-PERF-03 (draws).

**You need:** the tape; the "app, dev" bookmark (its read-out shows `fps`, `draws` and `tris`); the console, if you have the cable; three seeds to give in each room. The first room gets the starter seeds; in each other room press **New garden** on the panel's Garden tab first (block 12 shows where), so every room starts from an empty bed and three seeds.

**Which real room stands in for which emulator room:**

| Emulator room | What it stands for | A real room to use | The emulator's line (23 Oct) |
|---|---|---|---|
| `tiny` | a small room with a table | a study or box room of about 5 to 8 m², at its desk | level 1; 0.45 m ahead; 0.88 m under the eyes; first note 1.4 s; 14 draws |
| `large` | a large room, the table re-centred | a living or dining room of 30 m² or more, at a big table whose middle is 1 m or more from your seat | level 1; 0.45 m; 0.85 m; 1.0 s; 14 |
| `floor` | no table: the floor and the walls only | a scanned room, on a chair with nothing at table height within reach (a bedroom, a hall) | level 4; 0.45 m; 0.25 m; 5.8 s; 16 |
| `no-walls` | no walls: the default tuning ("Wanderer") | a Space Setup with the furniture and no walls, if Space Setup lets you finish without them (unchecked); else an open-plan space with far walls; else write "not possible" | level 1; 0.45 m; 0.86 m; 1.0 s; 14 |
| `low-table` | a very low table | the sofa and coffee table of block 10 ("a coffee table after BUG-010"): copy its numbers | level 4; 0.45 m; 0.25 m; 5.4 s; 16 |
| `none` | no scene data | the second room, never scanned (blocks 7 and 10, part C); and once with the room permission declined (block 18, part B) | level 4; 0.45 m; 0.25 m; 5.3 s; 16 |

The emulator's times are not yours: there the test plants the seed the moment one is there, here you plant it by hand. The emulator counts the first note of a plant (the tide's, or the placed note).

#### Steps, once per room

1. Before the headset: your eye height on the seat (floor to the corner of your eye), and the table's height if there is one.
2. Open "app, dev". Pinch **Enter the garden** and start counting seconds aloud at that pinch.
3. If the pale ring shows: look at your table (straight ahead if there is none) and pinch.
4. Plant one seed as in block 11: palm up, pinch the seed, drop it on the bed. Write down your count when it first sings.
5. Right after that note, look at the bed and read the read-out: `fps`, `draws`, `tris`.
6. (console) `[events] room:bedPlaced`: `level`. `[events] room:signature`: `keyRoot`, `mode`, `reverbRt60`.
7. With the tape: level from your nose (the headset's front) to the ring's middle, and to its far edge; floor to the ring's middle. Your eye height minus that is the drop.
8. Leave the session.

#### Write down, one column per room

| | `tiny` | `large` | `floor` | `no-walls` | `low-table` | `none` (no scan) | `none` (declined) |
|---|---|---|---|---|---|---|---|
| The real room (name, m²) | | | | | | | |
| Level | | | | | | | |
| Bed ahead: nose to the ring's middle (cm) | | | | | | | |
| Far edge: nose to the ring's far edge (cm) | | | | | | | |
| Under the eyes: eye height minus the ring's height (cm) | | | | | | | |
| Enter to the first note, planting by hand (s) | | | | | | | |
| `fps`; `draws`; `tris` right after the note | | | | | | | |
| `keyRoot`, `mode`, `reverbRt60` | | | | | | | |
| Playable: a seed planted and heard | | | | | | | |

#### Pass rules

| Check | Rule | Source |
|---|---|---|
| All playable | in every room the bed lands, a seed is planted and it sings | T-166, TC-DEV-02 |
| Reach | the ring's middle 35 to 45 cm ahead and its far edge at most 75 cm, in every room | Golden Rule 2, FR-ROOM-03, D-020 |
| Under the eyes | at least 25 cm: a table's own drop at a table, 25 cm for a floating bed | D-034, FR-ROOM-01 |
| First sound | within 20 s of the Enter pinch, your planting included | FR-SYS-03, Golden Rule 4 |
| Draws and frame rate | `draws` at most 60 and `fps` at least 60 (72 is the aim) | NFR-PERF-03, Golden Rule 5 |
| Against the emulator | write both; a level that differs from the emulator's line is the result to report | TC-E2E-13 |

#### If it fails

- No bed within 15 seconds in a room: a top-severity bug. Tell Claude with the room's name and the console's level lines.
- A table room at level 3 or 4: see block 10's "If it fails"; the room then does not tune the song.
- `draws` above 60: write down the room and what was in view (the vine on a wall, the ripple). Claude compares it with TC-E2E-09.

### Also, the chord when the bed lands (4 min, room 1 only)

**Needs: the landing-chord fix** (not on `develop` on 25 Oct: run this once block 0 shows a build that has it), on top of T-128d. Checked against `develop` 93af00a: `src/audio/AudioSystem.ts` (`room:bedPlaced` plays `ui('confirm')`) and `src/audio/uiSounds.ts` (`confirm`: the room chord as three plucked notes rising, 40 ms apart).

**Purpose:** when the bed lands, three quick plucked notes rise: the room's chord. Since 91f079a (25 Oct) the chord waits for the room's re-tune, so the first landing of a page and a later one play the same chord, in the room's key; before it, the first landing's chord was dropped by the re-tune and not heard at all.

**Answers:** the landing-chord fix · T-164 §6 (the bed's chord) · API_SPEC §1.2 (UI sounds from the room chord, T-172 and P-025).

**You need:** room 1, if its key is not the default (block 17: `keyRoot` other than 0, or `mode` other than `majorPent`); else another room whose key is not; the "app, dev" bookmark; the console, if you have it.

**Know this first:** the landing chord is short (about a tenth of a second) and comes just before the ripple's first note (0.3 s). Listen at the moment the ring settles.

#### Steps

1. Close the app's tab: a fresh page starts in the default key. Open "app, dev" again.
2. Enter, eyes on the table. Listen for the three rising notes as the bed lands, then to the ripple's chord and the song after it.
3. (console) `[events] room:signature`: `keyRoot`, `mode`.
4. Open the panel's Garden tab and pinch **Re-place bed**; let the bed land on the table again. Listen to the three notes again.
5. Did the two landing chords sound the same? Did the first one sit in tune with the ripple's chord and the song?
6. Leave. Add `,forceSignature=wanderer` to the end of the address, close the tab, open it again and enter: the default key throughout, the reference in which the chords always match.

#### Write down

| Field | Value |
|---|---|
| The room's key | `keyRoot`, `mode` |
| First landing: three notes heard; in tune with the ripple and the song | yes / no; yes / no / not sure |
| Re-place: the same chord as the first landing | yes / no / not sure |
| The Wanderer run: the landing chord in tune | yes / no |

#### Pass rules

| Check | Rule | Source |
|---|---|---|
| In the room's key | the first landing's chord is the Re-place one, and sits in tune with the ripple and the song | the landing-chord fix; T-164 §6; API_SPEC §1.2 |
| Heard | three rising notes at each landing | T-164 §6 |

#### If it fails

- The first chord differs from the Re-place one, or clashes with the ripple: the build lacks the fix (block 0), or the fix does not hold on a headset. Write down the key and tell Claude.
- No chord at all: if the ripple's notes come, write it down for T-164; if nothing sounds, see block 11's "If it fails".

---

## Block 18 — Say no: the room permission, and hand tracking off (15 min)

**Can be run today**, both parts. In part B the bed that floats after a "no" needs T-128c.

**Purpose:** see what the browser returns when the player says no to the room request, and that everything else still works. Then the same in the app: what the page says after a "no", after the headset came off during the question, and with hand tracking switched off.

**Answers:** T-104, TC-DEV-0A run 4 · P2 · FR-ROOM-04 · from T-128a: decline the headset's question in the app (what the page says, and that Enter still works); the headset taken off during the question (does the session start unseen); hand tracking switched off, then Enter (the page says how to switch it on, and Enter works afterwards) · TC-DEV-14 (new).

**You need:** the first room and table; the capability page's bookmark and the app's bookmarks; one controller within reach, for steps 15 to 17 only. The console is a bonus for step 14.

**Checked against:** `proto/spike/src/probe.ts` (`setScene`: the `permission` fields), `src/config.ts` (every feature is asked for as optional), `iwsdk.config.json` (the game requires hand tracking only), `proto/spike/README.md` step 9, `src/app.ts` (a refused session leaves the page usable; a session that starts unseen says so with `xr:visibility`), `src/ui/strings.ts` (the sentence under the button).

### Steps, part A — the capability page (10 min)

1. Go back to the first room and the first table.
2. Make the results so far safe first: do block 20, steps 1 to 3, now. The reset in the next step may also wipe what the page has saved (unchecked).
3. Open the capability page. Reset this site's permissions: the icon left of the address (unchecked; the menu names may differ).
4. Reload. Pinch **Start**. When the headset asks for the room or for spatial data: decline. Allow hand tracking.
5. If the session starts: pinch once when the view turns green, listen to the six steps, wait for the end.
6. On the page: **Which run was this** = "run 4: decline" · **Room permission on this run** = "declined", or "the headset did not ask".
7. Write down the rows of the first table below.
8. Pinch **Copy JSON** and mail it to yourself: it now ends with this run.

### Steps, part B — the app (5 min)

9. Reset this site's permissions again, as in step 3. Open the app's "app, dev" bookmark.
10. Pinch **Enter the garden**. When the headset asks: say no to everything.
11. Read the sentence under the button. Is **Enter the garden** ready again?
12. Pinch **Enter the garden** again. Does the headset ask again? This time allow hand tracking and decline the room, if it asks for them one by one. Does the session start? Leave it, and write down the four lines under "This device".
13. Reset the permissions once more. Pinch **Enter the garden**. The moment the question shows, take the headset off for 5 seconds. Put it back on and allow everything.
14. Did the session start? (console) Is there an `[events] xr:visibility` line with `visible: false` right after `[events] xr:sessionStart`? Leave the session.
15. Now the one step with a controller (unchecked). Headset Settings → Movement tracking → Hand tracking: off.
16. With the controller, open the app page and press **Enter the garden**. Read the sentence under the button. Does the path in it match the path you just used?
17. Switch hand tracking on again and put the controller away. Pinch **Enter the garden**. Does the session start? Leave it.
18. If the room is still declined: reset the permissions a last time and allow everything at the next Enter.

### Write down

| Part A, the capability page | Value |
|---|---|
| The words of the headset's question, as well as you remember | words |
| Did the session start; `completed` | yes / no |
| `features.granted` and `permission.notGranted` | |
| `permission.detectedPlanes` and `permission.detectedPlanesAtEnd` | |
| `permission.detectedMeshes` and `permission.detectedMeshesAtEnd` | |
| `planes` (copy the reason in the brackets) | |
| `hitTest.hits`, `anchors.created` | |
| Click heard on the pinch | yes / no |

| Part B, the app | Value |
|---|---|
| After "no" to everything: the sentence under the button; Enter ready again | words; yes / no |
| Second Enter: did the headset ask again; did the session start with the room declined | yes / no; yes / no |
| "This device" after that session | four lines |
| From T-128c on: where the bed went with the room declined | pale ring and a pinch / floating / none |
| Headset off during the question: did the session start; the `visible: false` line | yes / no; yes / no / no console |
| Hand tracking off: the sentence under the button; does its path match the real one | words; yes / the real path is … |
| Hand tracking on again: Enter | works / what happened |
| How you switched the room permission back on | words |

### Pass rules

| Check | Rule | Source |
|---|---|---|
| Part A | the session still starts and the pinch still clicks with the room declined. The rest: write down what you see | TC-DEV-0A run 4, FR-ROOM-04 |
| After a "no" in the app | the page says "The garden did not open. Check that hand tracking is on in the headset: Settings, Movement tracking, Hand tracking." and Enter works again | from T-128a, `src/ui/strings.ts` |
| The room declined in the app | the session starts. "This device" then reads "Table detection: not available. The garden asks you where to put it, or floats in front of you." if the headset really withheld it: write down what it reads | FR-ROOM-04, `src/ui/Landing.ts` |
| Headset off during the question | write down what you see | from T-128a |
| Hand tracking off | the page says how to switch it on, with the right path, and Enter works once it is on | from T-128a, UX_WIREFRAMES §9.7 |

### If it fails

- Part A, the session does not start at all: tell Claude. It becomes a bug, because the game asks for the same features in the same way.
- The sentence after a "no" talks about hand tracking although you declined the room: expected. The browser does not tell the page why it refused. Write down whether that misled you.
- You cannot switch the permission back on: look in the browser's site settings (unchecked). This is why the block is near the end. Block 19 clears everything for this address, and that also brings the question back.

---

## Block 19 — Clear the site's data (10 min)

**Part A can be run today**, with the USB cable. **Part B needs: T-128e**, and the cable too.

**Purpose:** find out whether the places the headset saved for this address go away when the player clears the site's data. If they stay, they count toward the few a site may keep.

**Answers:** from T-162: site storage cleared (do the address's saved places go too).

**You need:** the USB cable and the Mac's console; your results note. Do this block last: it wipes the saved garden, the capability page's stored runs and, most likely, the permissions.

**Checked against:** `proto/spike/src/probe.ts` and `src/config.ts` (the page keeps the name of its saved place under `roomsong.spike.anchor`, and its runs under `roomsong.spike.runs`), `src/room/AnchorStore.ts` (with the flag `noAnchors` the app touches no saved place), `src/core/flags.ts`.

### Steps, part A — the capability page's saved place

1. Make the results safe first: do block 20, steps 1 to 3, now.
2. Open the capability page. Mac: click **inspect** under it, **Console**.
3. (console) Type `copy(localStorage.getItem('roomsong.spike.anchor'))`. Paste into your note on the Mac. It is one line in curly brackets: the name of the saved place and when it was saved. If you get `null`, run the page once (**Start**) and do this step again.
4. Headset: clear this site's data (unchecked: the icon left of the address, then the site's settings; or the browser's settings, privacy, clear browsing data, cookies and site data). Write down the path you used.
5. Reload the capability page. The results of earlier runs should be gone from the page: that shows the clearing worked.
6. (console; click **inspect** again) Type `localStorage.setItem('roomsong.spike.anchor', '…')` with the line from your note between the two single quotes.
7. Pinch **Start**. Did the headset ask for its permissions again? Allow everything and let the run finish.
8. Read `anchors.restore.restored` on the page. `true`: the saved place outlived the clearing. `false`: it went with the data; copy `anchors.restore.error`.

### Steps, part B — the app's saved place

9. Before step 4, with the garden of block 16 still there: (console) count the saved places as in block 16, step 3. One is expected.
10. After step 4: open the app with `?dev=1&flags=eventLog,noAnchors` at the end of its address. With that flag the app leaves the saved places alone. Enter. The garden is new and empty: that is expected, the save is gone.
11. (console) Type `__roomsong.world.renderer.xr.getSession().persistentAnchors` and count the entries. None: the place went with the data. One: it stayed.

### Write down

| Field | Value |
|---|---|
| How you cleared the site's data | the path |
| Earlier runs gone from the capability page | yes / no |
| Did the headset ask for its permissions again | yes / no |
| The capability page's place after the clearing: `anchors.restore.restored`; the error | true / false; words |
| The app: saved places before the clearing; after it | count; count |
| The app after the clearing | a new garden with three seeds / what you saw |

**Pass rule:** write down what you see. Either answer is fine for the player; the developers need to know which, because a place that stays is only removed when the app next saves one of its own (D-040).

**If it fails:** the console says `SyntaxError` at step 6 → the quotes are wrong: single quotes outside, the pasted line inside, nothing else. You cannot find a way to clear one site's data → clear the browser's whole data instead, after block 20 is done, and say so.

---

## Block 20 — Hand the results to Claude (10 min)

**Can be run today.**

**You need:** your results note with the filled results sheet (the section after this block), and your mail open in the headset's browser, or the USB cable.

**Checked against:** `proto/spike/src/main.ts` (Copy JSON, the storage key `roomsong.spike.runs`), `proto/pinch/index.html` and `src/main.ts` (the element `json`; nothing is stored), `proto/spike/README.md` steps 10 to 13.

1. Capability page: pinch **Copy JSON**. It copies every run kept in this browser, newest last.
2. Open your mail in a new tab, paste, send it to yourself.
3. If "Copied." does not show, the page says "Copying was blocked. The text is selected: copy it by hand." Do that.
4. If copy or paste does not work at all (unchecked): connect the headset to the Mac by USB and allow USB debugging in the headset. In Chrome on the Mac open `chrome://inspect/#devices` and click **inspect** under the page.
5. In its Console, for the capability page: `copy(localStorage.getItem('roomsong.spike.runs'))`. The text is now on the Mac's clipboard.
6. In its Console, for the pinch page while its results are still on screen: `copy(document.getElementById('json').textContent)`.
7. Check before you send anything: every capability run reads `"emulator": null`.
8. Give Claude, in one message: the filled results sheet · the capability text · each pinch text with its beta · your filled-in tables · the tape measurements · headset model and lighting · the route, the address and the build from block 0 · the clock time of each capability run and what it was (run 1, 2, 3, second session, other room, decline, after the clearing) · which blocks you skipped, and why.
9. On the Mac, stop both servers: Ctrl+C in both Terminal windows.

The copied text holds the browser version and the sizes and heights of the surfaces in your room, and nothing else about you. A public GitHub issue would show those sizes to everyone: a mail to yourself does not.

Say in the message what was run on a headset and what was not. Claude writes the results into the documents with those words: a check that was skipped stays "not tested on a device".

---

## Results sheet

One page. Every line is a number or a yes or no that a decision or a task waits for. Copy it into your results note before you start and fill it as you go. A line you could not fill gets "not run" and the reason.

### Sitting 1 — can be filled today

| # | What | Your answer | From block | Who waits for it |
|---|---|---|---|---|
| 1 | Headset model; lighting; route, address and build | | setup, 0 | every result below |
| 2 | T1: page load to a usable Enter button (s) | | 0 | TC-DEV-01; PROGRESS item 26b |
| 3 | T2: Enter pinch to the first sight of the room (s) | | 8 | TC-DEV-01; PROGRESS item 26b |
| 4 | Does one pinch on Enter start session and sound: "No sound. Leave and enter again." on the first Enter, on the second | | 8 | T-128a (API_SPEC §1.10 rule 2); T-152 |
| 5 | Room labels: is there a floor, a ceiling, a table or a desk | | 1 | the room signature, gate G1 (T-130); D-028 |
| 6 | Is the room mesh there, and labelled `global mesh` | | 1 | T-140 |
| 7 | Does a hand pinch send `selectstart` and `selectend`, and in which order | | 1 | T-124 (then the switch to `XRFrame.fillPoses`) |
| 8 | First sound step that crackled (8, 16, 24, 32, 48, 64 voices, or none) | | 1 | the voice limit (T-145); TC-PERF-06 |
| 9 | Saved place back after a reload, after a browser restart, after about an hour (n of 3) | | 1, 6 | anchors as a must-have (D-021, T-162) |
| 10 | Length of the saved place's name (at most 64?) | | 1 | T-162; API_SPEC §4 |
| 11 | Empty page: frame rate measured; rates offered; foveation and whether it can be set | | 1 | T-165; NFR-PERF-09 |
| 12 | Smallest dot spacing with 18 of 20 on the first try, unfiltered (3, 4 or 5 cm, or none) | | 2, 3 | cell size and hit radius (FR-HND-04) |
| 13 | Outer ring, unfiltered (n of 10, all runs) | | 2, 3 | D-020: outer radius 0.30 or 0.25 m |
| 14 | Inner ring, unfiltered (n of 10, all runs) | | 2, 3 | 16 or 12 steps (LLD §5.1) |
| 15 | Lowest beta at which "First try" matches "First try unfiltered" | | 3 | D-028; FR-HND-03 |
| 16 | Whole ring in view when you look at its middle, head still | | 2, 4 | D-020; Golden Rule 6 |
| 17 | Table: its label, and how far below your eyes (m) | | 1, 2 | D-034 |
| 18 | Hands lost during the pinch runs (count, and where) | | 2 | D-030; T-116 |
| 19 | No drawn hands: did aiming suffer | | 2, 8 | D-027 |
| 20 | Garden preview: `fps` usual and lowest, with 13 plants and with 80 | | 4 | T-165; TC-PERF-01 |
| 21 | The garden's look, 1 to 5, and what to change first | | 4 | the art pass (T-163) |
| 22 | The drone on the headset's speakers, in "Wanderer" and in "Hall"; at 100 %: harsh, buzz or rattle | | 5 | the sound pass (T-164) |
| 23 | The sound sketch, 1 to 5 | | 5 | T-103 |
| 24 | Same room twice: does floor area, ceiling height or volume change band | | 1, 6 | D-028; PROGRESS item 21; the wording "same key and scale" |
| 25 | No Space Setup: does the test ray hit the table | | 7 | T-123 (placing the bed by a pinch) |
| 26 | A place saved in room 1, asked for in room 2: refused, not found, or no answer | | 7 | T-162 |
| 27 | Headset off 5 s: is the app told (`xr:visibility` lines) | | 9 | T-152; T-128e (the save on a pause) |
| 28 | The menu over the session: is the app told | | 9 | T-152 |
| 29 | After the headset ended the session by itself: does Enter work | | 9 | T-128a |
| 30 | The app's foveation as the headset reports it | | 9 | T-128a; NFR-PERF-09 |
| 31 | The perf read-out in the app: readable, and where it should sit | | 8 | T-128a |
| 32 | Room declined: does a session still start (capability page; app) | | 18 | FR-ROOM-04; P2 |
| 33 | After a "no", and with hand tracking off: what the page says, and does Enter work afterwards | | 18 | T-128a |
| 34 | The real menu path to hand tracking | | setup, 18 | the sentence on the landing page (UX_WIREFRAMES §9.7, T-167) |
| 35 | Headset off during the headset's question: does the session start unseen | | 18 | T-128a |
| 36 | Site data cleared: does the capability page's saved place survive | | 19 | T-162; D-040 |
| 37 | Anything that needed a controller, apart from block 18 | | all | Golden Rule 1 |

### Sitting 2 and the room walk — once the garden is in the app

| # | What | Your answer | From block | Who waits for it |
|---|---|---|---|---|
| 38 | (listen) Headset off and back: does the sound return by itself, in time | | 9 | TC-DEV-08; T-152; T-121 |
| 39 | (listen) Does the sound keep playing under the menu | | 9 | T-128a |
| 40 | The bed at your table: level; on the table top (cm off); seconds until it showed | | 10 | T-128c; T-123; D-040 |
| 41 | Near edge of the table to the ring's middle, and to its far edge (cm) | | 10 | D-020; Golden Rule 2 |
| 42 | Head over the far edge, facing outward: where the bed landed | | 10 | T-140 |
| 43 | A low table (height): did the bed land on it; did you want it there | | 10 | D-034 (the limit of 0.5 m) |
| 44 | No table: seconds from Enter to the bed, and to your first plant singing | | 10 | PROGRESS items 23 and 26c |
| 45 | The hint's words over a bright wall: readable | | 10, 13 | T-126 (captions) |
| 46 | A pinch held from before Enter: did it place or plant anything | | 10, 11 | T-116 |
| 47 | First sound (s) and first loop (s) at your table | | 11 | TC-DEV-01; Golden Rule 4 |
| 48 | Does a plant land where your fingers are (cm off, direction) | | 11 | T-116; API_SPEC §1.10 rule 13 |
| 49 | The orb: shown by the back of the hand; how often during play | | 12 | T-151 |
| 50 | The panel: readable; your hand in front of it; missed pinches on Tempo + and the tabs | | 12 | T-151; T-167 |
| 51 | New garden: short pinch does nothing; the hold works; by looking it works | | 12 | T-151; T-160 |
| 52 | A hitch when the panel redraws; the panel after a head tilt; the orb at the very start | | 12 | T-151 |
| 53 | Hand lost while carrying: the words show, the seed goes back, nothing is planted | | 13 | TC-DEV-09; T-116 |
| 54 | The words: at least 1.2 s, steady or flickering (short loss; menu) | | 13 | T-116 |
| 55 | Does a grace of 0.2 s suit | | 13 | T-116; D-030 |
| 56 | An empty hand out of view: no words | | 13 | D-030 |
| 57 | Ten minutes, 60 plants: `fps` usual and lowest; `ms`; `draws`; `tris` | | 14 | TC-DEV-07; T-165; the numbers in the Devpost text |
| 58 | Stutters, gaps or clicks in ten minutes | | 14 | T-121; TC-PERF-06 |
| 59 | The Bass on the headset's speakers, and the key | | 14 | T-144; T-164 |
| 60 | A seed planted after minute 5: a hitch | | 14 | T-143 |
| 61 | Drift of the bed after ten minutes (cm) | | 14 | T-162; TC-DEV-05 |
| 62 | The key change: ratings (a) to (d) | | 15 | PROGRESS item 27; T-143; T-164 |
| 63 | A long echo cut short, a jump in loudness, a hitch at the change | | 15 | T-143 (keep the echo swap, or shorten it) |
| 64 | The garden back after a reload and after closing the browser: returned or placed again; seconds; cm | | 16 | TC-DEV-05; T-162; D-021 |
| 65 | Saved places at every step (stays at 1?); does the list exist; seconds to save a place (under 4?) | | 16 | D-040; T-162 |
| 66 | Eyes to coin when the bed stayed, and when it was put down again (cm): is 10 cm of slack right | | 16 | D-041 |
| 67 | Headset off, or the menu, in the first 4 s: is the bed back | | 16 | T-162; T-128c |
| 68 | A recentre: does the bed stay on the table | | 16 | T-162; T-128c |
| 69 | Table moved; light changed; headset restarted; Space Setup done again: returned or placed again | | 16 | T-162 |
| 70 | The next day: returned; exactly one new seed | | 16 | TC-DEV-05; D-037 |
| 71 | Was a new, empty garden ever shown in place of yours | | 16 | D-033; T-128e |
| 72 | Each room: the app's floor area, ceiling height and volume against your tape; same band? | | 17 | T-140; T-141; gate G1 (T-130) |
| 73 | Two rooms: do they sound different (key, scale or echo) | | 17 | TC-DEV-13 |
| 74 | Odd rooms (L-shaped, wardrobe, sloped ceiling, mesh only): what the app read | | 17 | T-140; LLD §5.8 |
| 75 | Site data cleared: do the app's saved places go | | 19 | T-162; D-040 |

### The garden's drawing (T-119) — the preview today, the app later

| # | What | Your answer | From block | Who waits for it |
|---|---|---|---|---|
| 76 | The light's dark leading edge on a real white surface: visible; its strength (0.6) too weak, right or too strong (preview; app) | | 4, 14 | D-044; the perf pass (T-165) |
| 77 | A hovered plant's 20 % glow and the lit cell, in passthrough; under the light's crest; in high contrast with the plant's own cell lit: enough | | 14 | D-044; T-165 |
| 78 | Full bed of five shapes, a week old, every effect on: `fps` usual and lowest; `draws`; `tris` (preview; app in bloom) | | 4, 16 | D-044; T-165 |
| 79 | The unfurl: pleasant; does a blossom's colour read as part of the flash | | 4, 16 | the art pass (T-163) |
| 80 | A week later, all whorls in one sweep: bloom or sparkle | | 4, 16 | T-163 |
| 81 | Leaf whorls counted from your seat; cream blossoms on a light table | | 4, 16 | T-163 |
| 82 | Jug (Bass) and umbrella (Choir) named by outline; the hole at the top of the umbrella's stem | | 4 | T-163 |
| 83 | High contrast: does the cream rim read as an outline | | 4, 14 | T-163 |
| 84 | The glow with a real, moving hand: late, or flickering between two plants | | 14 | T-163 |

### The tuning ripple's look (T-142) — block 17, once

| # | What | Your answer | From block | Who waits for it |
|---|---|---|---|---|
| 85 | Captions: the words in order; each read to its end; readable over what was behind | | 17 | FR-ROOM-12; TC-DEV-13 |
| 86 | The crest on your table, on the white sheet, on a dark cloth; the dark band; the afterglow | | 17 | T-163 art pass |
| 87 | The wall sweep and the ceiling sweep: noticed with eyes on the bed; seen when looked for | | 17 | Parth: keep the ceiling sweep or not; T-163 |
| 88 | The hitch: as the bed appeared or during the first sweep; lowest `fps`, highest `draws`, `flash` | | 17 | T-142; T-165 perf pass |
| 89 | Reduced motion: glows in turn, same captions; no room: one bed ripple, no caption | | 17 | FR-ROOM-12; FR-UI-06 |

### The tuning ripple's notes (T-142b) — block 17, once

| # | What | Your answer | From block | Who waits for it |
|---|---|---|---|---|
| 90 | Notes heard, their order, where each came from | | 17 | FR-ROOM-12; TC-DEV-13 |
| 91 | One chord, in tune with the garden: rating 1 to 5 | | 17 | T-142b; T-164 |
| 92 | On the sweep's start, or rather at the crest's arrival | | 17 | Parth: UX §5 against LLD §5.8 |
| 93 | No room: three notes from the bed; clicks or crackles | | 17 | LLD §5.8; TC-PERF-06 |

### The first-minute guide (T-150) — block 11

| # | What | Your answer | From block | Who waits for it |
|---|---|---|---|---|
| 94 | The captions read to their end from your seat, without leaning | | 11 | FR-UI-04; T-150 |
| 95 | The little hand over the glowing cell, in your words; the cell on the white sheet | | 11 | T-150; UX §3.3 |
| 96 | The palm, pull and drag icons named from your seat; a step that waited more than 60 s | | 11 | T-150; D-053; T-163 |
| 97 | P0: first sound (s), three plants (s), aided or not, where they stopped, what the hand meant | | 11 | TC-DEV-01; UAT-16 (a first look, below sample); T-166 |

### The sound checks (D-057) — blocks 11, 12, 14 and 15

| # | What | Your answer | From block | Who waits for it |
|---|---|---|---|---|
| 98 | Five first plays: how many of 5 said, unprompted, that the sound reacts to them; anybody uncomfortable | | 11 | L5; T-164 |
| 99 | Pinch to sound, filmed: the three placed notes (ms, after the offset); the panel's ticks, or "not built" | | 12 | F11; API_SPEC §1.2 (at most 70 ms); T-173; T-164 |
| 100 | The Bass on the built-in speakers and on headphones, for you and two listeners; the Key | | 14 | L7; T-164; the Devpost line for the speakers |
| 101 | The app at 100 % on the speakers: harsh; buzz, rattle or crackling | | 14 | L7; T-164 |
| 102 | Ten minutes kept on: the "stop" time; each "jump" and what was playing; the start from silence | | 14 | L4, L8; T-164 |
| 103 | Turning it down: seconds, alone or shown, what they reached for first; 0 % silent; Mono heard; both kept | | 14 | L8; T-151 |
| 104 | Pointing at the sound; head turns; buzz, grain, crackles, trailing, ticks; Render Capacity | | 15 | L6; T-145; NFR-PERF-06 |
| 105 | The HRTF comparison: right guesses of 8; Render Capacity off and on | | 15 | T-145; NFR-PERF-10 |

### The checks of 23 to 25 Oct — blocks 10 and 17

| # | What | Your answer | From block | Who waits for it |
|---|---|---|---|---|
| 106 | Coffee table: its height; its Space Setup label | | 10 | BUG-010 |
| 107 | Coffee table: the level placed; on it or floating; the drop under your eyes (cm) | | 10 | BUG-010; D-034 |
| 108 | Coffee table: the room's key with that bed; reach from the sofa; wanted it on the coffee table | | 10 | PROGRESS item 41 |
| 109 | Room matrix `tiny`: the real room; level; ahead, far edge, under the eyes (cm); first note (s); `fps`, `draws` | | 17 | T-166; TC-E2E-13 |
| 110 | Room matrix `large`: the same numbers | | 17 | T-166; D-034 (re-centre) |
| 111 | Room matrix `floor`: the same numbers | | 17 | T-166 |
| 112 | Room matrix `no-walls`: the same numbers, or "not possible" | | 17 | T-166; FR-ROOM-04 |
| 113 | Room matrix `low-table`: the numbers of 107 | | 10, 17 | T-166; BUG-010 |
| 114 | Room matrix `none`: the same numbers, unscanned and declined | | 17, 18 | T-166; P2 |
| 115 | All six playable; a room over 60 draws or under 60 fps | | 17 | T-166; NFR-PERF-03 |
| 116 | The landing chord: the first landing in the room's key; the same as Re-place | | 17 | the landing-chord fix; T-164 §6 |

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
8. Block 8, steps 5 to 12 (5 min): the Enter pinch, "No sound. Leave and enter again." yes or no on both entries, T2.
9. Block 18, part A (8 min).
10. Block 20, by mail (5 min).
11. Block 5, headset steps 1 to 5 and 10 to 12, only if the Mac is there (8 min).
12. Left out: run 3, blocks 6, 7 and 9, the other beta values, the 80-plant run, block 18 part B, block 19, and every block that needs the garden in the app (10 to 17).
13. On the results sheet you can fill lines 1 to 9, 11 to 21 and 32, and lines 22 and 23 if the Mac is there.
14. Optional recording of block 2: Navigator → Camera → Record video. Do not record during block 1 or block 4: recording may lower the frame rate those blocks read. Clear the table and walls of brand names and photos first, and keep other people out of view.

---

## After the sitting

### Where the results go

You hand them over (block 20). Claude files them:

| Result | Filed in |
|---|---|
| Capability text, per headset model | `specs/04-development/ENVIRONMENT_SETUP.md` §9.1 |
| Pinch tables and texts | `specs/04-development/ENVIRONMENT_SETUP.md` §9.2 |
| Each choice made from them | `specs/08-status/DECISIONS_LOG.md` |
| Anything that failed, the same day | `specs/05-testing/BUG_LOG.md` |
| The summary, and each `TC-DEV-` case that was run marked as run on a device, with the blocks that were skipped named as not tested | `specs/08-status/PROGRESS.md`, `specs/05-testing/TEST_PLAN.md` |

### What they unblock

| Decision or gate | From |
|---|---|
| D-020: outer radius 0.30 or 0.25 m; bed centre at 0.45 m; the view box | blocks 2, 3, 4 and 10 |
| Cell size and hit radius (FR-HND-04, today 4 cm); 16 or 12 steps | block 2 |
| D-028: the smoothing value; whether echo-from-room-volume is steady enough | blocks 3 and 6 |
| D-027: no drawn hands | blocks 2 and 8 |
| D-030: the hand hint | block 2 (how often hands are lost), block 13 (the hint itself) |
| D-034: table reach, the two height limits, the 5 degrees | block 1 (table plane), block 2 (table below the eyes), block 10 (the low table, the bad seat), your tape |
| D-033: the garden you grew is the one shown | block 16 |
| D-037: three starter seeds; one new seed the next day | blocks 11 and 16 |
| D-040: the room's surfaces arrive without the SDK's scene system; the number of saved places stays at 1 | blocks 10, 16 and 19 |
| D-041: the reach slack of 0.10 m | block 16 |
| D-044: up to 20 draw calls with every effect on; a hovered plant lights its own cell | blocks 4, 14 and 16 |
| The drawing of T-119: the dark edge, the shapes, growth, the unfurl, high contrast, the glow (art pass T-163) | blocks 4, 14 and 16 |
| Room signature: build it or not (gate G1, T-130) | block 1, then block 17 |
| The tuning ripple's look and whether its ceiling sweep stays (T-142; art pass T-163) | block 17, the ripple |
| Voice limit and audio latency setting (T-145) | blocks 1 and 14 |
| Anchors as a must-have (D-021, T-162) | blocks 1, 6, 7 and 16 |
| The garden's look (art pass T-163) and how early the performance work starts (T-165) | blocks 4 and 14 |
| The one way in: the page's Enter button starts session and sound (`xr.offer` is `"none"` since T-128a) | block 8 |
| The start-time rule, from page load or from Enter (PROGRESS item 26b) | blocks 0 and 8 |
| First sound in a room with no table (PROGRESS items 23 and 26c) | block 10 |
| Pause and resume: is the app told, and does the sound need a pinch (T-152) | block 9 |
| The key change: keep the shifted notes and the echo swap, or change them (PROGRESS item 27, T-164) | block 15 |
| The sound direction (T-103, sound pass T-164) | blocks 5 and 14 |
| The sound pass's Bass overtones, its level at 100 %, its startles and the way to turn it down (T-164); HRTF panners or none (T-145, NFR-PERF-10); the Devpost line for the built-in speakers | the sound checks of blocks 5, 11, 12, 14 and 15 (D-057) |
| The hand reader's switch to `XRFrame.fillPoses` (follow-up of T-124) | done after this run |

### The three results that could change the plan the most

1. **Block 1, `planes.labels`.** No floor, ceiling or table labels means the room cannot tune the song. The headline idea falls back to one default tuning, and the pitch and the video change.
2. **Block 2, the grids and the two rings.** Below 18 of 20 on the 5 cm grid, or a failed outer or inner ring, changes the bed itself: fewer or larger cells, a smaller ring, or 12 steps. Garden, visuals and tests follow.
3. **Block 6, a band that flips.** If the same room lands in another band on the second session, "same room, same key and scale" cannot be promised as written.

Next in line: "No sound. Leave and enter again." in block 8; a frame rate below 72 in block 4 or below 60 in block 14; saved places that do not come back in blocks 1, 6 and 16.

### Left for device script S2 and for later tasks

Not in this script, because no review note asks for it here and its own task or script owns it.

| What | Where it is checked |
|---|---|
| Pull, drag and drag-off, with the 2 cm of movement that decides between them (TC-DEV-03) | device script S2 (T-154), once T-146 is in. Block 13, step 11, only covers a hand lost while shaping |
| Listen mode; one-hand and look-and-hold modes over a full loop, and the beat ring; the policy sweep on the headset (TC-DEV-04, 06, 11); the Listen half of TC-DEV-07 | device script S2 (T-154): Listen in blocks 6A to 6D, one hand and look and hold in block 9; the policy sweep is not written yet |
| The same blocks on a Quest 3S (TC-DEV-12) | a second run of this script, if a 3S is at hand |

---

## For Claude: where each source note went

**Block numbers changed on 2026-10-13.** Old 5 (the app's landing page) is 8 · old 6 (sound page) is 5 · old 7 (second session) is 6 · old 8 (room without Space Setup) is 7 · old 9 (decline) is 18, part A · old 10 (hand-over) is 20. Blocks 0 to 4 kept their numbers.

"Last section" below means "Not measurable yet: needs a small read-out".

| Source note | Where |
|---|---|
| **The T-129 row itself** | |
| P1 labels | block 1 |
| P2 permission decline | block 18 |
| H1 pinch on the ring (TC-DEV-00) | blocks 2 and 3 |
| F1/F2 frame rates and foveation | block 1 (an empty page), block 4 (the garden drawn), blocks 8 and 9 (the app's empty session and its layer), block 14 (sound and hands) |
| W1 audio | blocks 1 and 14; the 3D-sound comparison is block 15 (it needs an HRTF switch) |
| A1 anchors ×2 | block 1 (reload, restart), block 6 (after about an hour) |
| A1 drift | block 14 (ten minutes), block 16 (cm on every return) |
| M1 mesh | block 1 |
| G1 field of view | block 2 (dots), block 4 (plants), block 10 (the bed in the app) |
| Two sessions in one room | block 6 (the page), block 17 (the app's own numbers) |
| Bass on the headset speakers | block 5 (the Pad of the sketch), block 14 (the Bass voice) |
| Beta, about 5 to 50 | block 3 |
| Do hands send `select` events | block 1 |
| One-hour version | its own section |
| **From T-124** | |
| Re-pinch time | last section |
| `selectstart` and `selectend` for a hand pinch | block 1 |
| Switch to `XRFrame.fillPoses` | after the run ("What they unblock") |
| **From T-121** | |
| The 25 ms tick keeps its rate inside a session | block 14, by ear (steady time); a worst tick: last section |
| The sound stops on time when the headset comes off (TC-DEV-08) | block 9; block 5 for the sketch page |
| **From T-141** | |
| Ceiling height and floor area, two visits | blocks 1 and 6; block 17 |
| **From T-144** | |
| The lowest Bass note on the headset speakers | block 14 |
| What 24 Choir notes cost | block 14 gives the numbers with 12 Choir plants; exactly 24: last section |
| **From T-123** | |
| Which labels | blocks 1, 2 and 10 |
| Time to the first surface, against the 3-second wait | block 10 (level 1 means it was there in time; the seconds are counted); brackets in blocks 1 and 2 |
| Hit-test without Space Setup | block 7; block 10, part C |
| Outline of a round table; cost of an unused hit-test source | last section |
| A coffee table 0.4 m high | block 10, part B; and "a coffee table after BUG-010" |
| The two height limits and the 5 degrees (D-034) | blocks 1, 2 and 10, your tape |
| **From T-140** | |
| `room:features` against a tape in three rooms; the same room twice | block 17 |
| L-shaped room; wardrobe or tall fridge; sloped ceiling; mesh without floor or ceiling surface; the three known limits of LLD §5.8 | block 17, "odd rooms" |
| No Space Setup (Wanderer) | block 17; block 10, part C |
| Is the mesh labelled `global mesh` | block 1 |
| Head over the table near its far edge, looking outward | block 10, part B |
| **From T-116 (TC-DEV-09)** | |
| A pinch ended by a very short loss and started again late (a carried seed let go) | block 13, step 5 |
| How real hands are lost; does 0.2 s suit | block 2 (count and place), block 13, step 10 |
| The words stay at least 1.2 s, after a short loss and under the menu | block 13, steps 2 to 7 |
| Enter while still pinching | block 10, steps 13 and 14; block 11, steps 9 and 10 |
| Does a pinch land where the fingers are | block 11, step 7 |
| Can the hint be read | block 13, step 9 |
| **From T-151** | |
| Back of the hand shows the orb, palm up hides it; does it show most of the time | block 12, steps 2 and 3 |
| Readable at arm's length and over passthrough; the panel over real hands | block 12, steps 5 and 6 |
| Tempo + and a tab without a neighbour taking the pinch; a hitch on a redraw | block 12, steps 7 and 8 |
| Hold New garden 1.5 s; the same by looking | block 12, steps 10 to 14 and 17 |
| The panel after a head roll | block 12, step 9 |
| The orb's place when the first head pose is late | block 12, steps 15 and 16 |
| **From T-143 (listen, W1)** | |
| First plucked notes after a re-tune (up to about 10 semitones); the cut; the silent step; the dry moment at the echo swap; a long echo cut short; any click; a hitch at the swap | block 15 |
| The very first plucked notes of a session with a garden already there | block 15, steps 1 and 2 |
| The first plant put in minutes after the start | block 14, step 6 |
| A worst-tick reading | last section |
| **From T-162 (TC-DEV-05)** | |
| After a reload, after closing the browser, the next day: returned, seconds, cm | block 16, steps 4 to 6 and 19 |
| Table moved; light changed; Space Setup done again; headset restarted | block 16, part B |
| Site storage cleared | block 19 |
| A ten-minute session for drift | block 14, step 7 |
| The restored pose logged every frame; does `reset` fire on a recentre | last section |
| Sitting elsewhere (D-041) | block 16, steps 7 and 8 |
| Headset off, or the menu, in the first 4 s | block 16, steps 9 and 10 |
| A recentre in mid-session (does the bed leave the table) | block 16, step 11 |
| Leaving within a second of a fresh placement, three times | block 16, steps 12 and 13 |
| The count of saved places at each step; does the list exist | block 16, steps 3, 5 and 13; block 19 |
| A known saved place asked for in another room | block 7 |
| Time from saving a place to its name | block 16, step 14 |
| Pages and the mirror are different addresses | "One address for the whole sitting" |
| The capability page's anchor runs before the app | "Why this order" |
| The length of a handle | block 1, step 15 |
| The limit of eight; `deletePersistentAnchor` after the session ended; timers while hidden | last section |
| Does taking the headset off give `hidden` | block 9, step 5 |
| **From T-128a** | |
| One click for sound and session; the sound also on the second Enter | block 8, steps 5 to 7, 11 and 12; block 9, step 2 |
| Headset off 5 s: which events, does the sound return without a pinch | block 9, steps 4 to 6 |
| The menu over the session | block 9, steps 7 and 8 |
| Page load to a usable Enter; Enter to the first frame | block 0 (T1), block 8 (T2) |
| Hand tracking off, then Enter; decline the question | block 18, part B |
| Headset off during the question | block 18, steps 13 and 14 |
| The perf read-out: readable, low left; fps | block 8, steps 16 to 18 |
| Does `enabledFeatures` exist | block 1 (`features.granted`); block 8 ("This device" after a session) |
| A session the headset ends while unseen | block 9, steps 9 to 11 |
| Foveation read off the layer | block 9, step 3 |
| Leave the page before entering and come back with Back | block 8, steps 14 and 15 |
| Full class names in the log of a failed part (the dev server) | block 9, step 12 |
| Page timers, seen and unseen; the part of `engine.init()` inside the click | last section |
| **From T-119 (the drawing; the main session's list of 2026-10-13)** | |
| 1. The light's dark leading edge on a real bright table; is 0.6 enough | block 4, steps 11 and 12; block 14, steps 9 and 10 |
| 2. The cell cue and the 20 % glow in passthrough; under the crest; in high contrast with the cell lit (D-044) | block 14, steps 11, 13 and 14 (the preview has no pointer in a session) |
| 3. The unfurl on a plant's first note; a blossom's colour with the flash | block 4, step 16 (flat page); block 16, step 21 (passthrough) |
| 4. A week later, about 160 whorls in one bar: bloom or sparkle | block 4, step 16; block 16, step 21 |
| 5. A 2.4 cm leaf whorl counted at arm's length; cream blossoms on a light table | block 4, step 14; block 16, step 22 |
| 6. Jug and umbrella by outline; the 8 mm hole at the top of the Choir's stem | block 4, step 13 |
| 7. High contrast: the cream rim as an outline | block 4, step 15; block 14, step 14 |
| 8. A flickering hover with a real hand: does the glow feel late | block 14, step 12 |
| 9. Frame rate, a full bed of 80 plants in five shapes, every effect on | block 4, step 17; block 14, step 15; block 16, step 23 |
| **Decisions and status items** | |
| D-030 · D-033 · D-034 | block 13 · block 16 · blocks 1, 2 and 10 |
| D-037 · D-040 · D-041 | blocks 11 and 16 · blocks 10, 16 and 19 · block 16 |
| PROGRESS item 22 | "Decide before the day" |
| PROGRESS items 23 and 26c | block 10, part C |
| PROGRESS item 26b | blocks 0 and 8 (two numbers, kept apart; the rule is not decided) |
| PROGRESS item 27 | block 15 |
| **From T-142 (the tuning ripple)** | |
| The crest on a light and a dark real table | block 17, the ripple, steps 1, 4 and 5 |
| The wall sweep through passthrough; the ceiling sweep from a seat | block 17, the ripple, steps 1 and 3 |
| The captions readable and up at least 1.2 s | block 17, the ripple, step 2 |
| The stall in the placement frame | block 17, the ripple, step 1 |
| The notes (T-142b): one chord, in tune with the garden, landing with each sweep | block 17, the notes, steps 1 to 6 |
| **From T-150 (the first-minute guide)** | |
| The ghost pinch read as "pinch here" | block 11, the guide, steps 5 and 13 |
| The hints legible at 0.45 to 0.6 m | block 11, the guide, steps 3 to 7 |
| A stranger's first minute, timed | block 11, the guide, part B |
| **From the earlier reviews** | |
| The real pinch thresholds | block 2 counts pinches that got no tone and tones you did not mean; the gap in cm: last section |
| Caption legibility over a bright wall | block 10, step 15; block 13, step 9 |
| Frame rate with the garden drawn | blocks 4 and 14 |
| The landing page and the entry (T-126, T-128a) | blocks 0 and 8 |
| The garden's look in passthrough (T-125) | block 4 |
| **From the PM's 16 Oct update §7 (D-057; it supersedes PM_PROPOSALS P-020)** | |
| L4: a ten-minute "keep it on" test, stop and startle times | block 14, ten minutes kept on, steps 1 to 3 |
| L5: a first play by five new people, thinking aloud | block 11, the five first plays |
| L6: does the sound come from the plant: pointing, fast turns; buzz, grain, trailing, crackle | block 15, the sound as you move (the T-145 steps that were there, with pass rules) |
| L7: built-in speakers against headphones, with other listeners | block 14, speakers against headphones |
| L8: comfort, startle, a way to turn the music down (the Volume, the Mono switch) | block 14, ten minutes kept on, steps 2 and 4 to 8; block 11, the five first plays, step 6 |
| F11: UI latency filmed at 240 fps, a placed plant and a panel press (it replaces the finger-to-sound row of the last section) | block 12, the film |
| A pass at 100 % volume | block 5, step 8; block 14, speakers against headphones, step 5 |
| The HRTF A/B with its cost (T-145) | block 15, the comparison (needs an HRTF switch) |
| **From the work of 23 to 25 Oct** | |
| BUG-010: does Space Setup label a 0.4 m coffee table `table`; where the bed goes, its level and its drop | block 10, a coffee table after BUG-010 |
| T-166, the device half: six real rooms for the matrix's six, with the matrix's numbers | block 17, the room matrix |
| The bed-landing chord in the room's key on the first placement (after its fix) | block 17, the chord when the bed lands |

---

## Not measurable yet: needs a small read-out

The notes ask for these, and nothing on `develop` shows them. Do not hunt for them on the day. Each needs a line or a number added by the task named; then it gets a step in the block named.

| What the notes ask | Why you cannot read it today | Who could add the read-out | Then in block |
|---|---|---|---|
| The time between two pinches of the same hand (about 153 ms expected at 72 Hz) (T-124) | no page times one pinch against the next | the pinch page, as a follow-up of T-124 | 3 |
| The real gap between thumb and finger at the start and the end of a pinch, in cm | the pinch page judges the gap and does not show it | the same follow-up | 2 |
| Do page timers run at their normal rate in a session, seen and unseen (T-128a, T-162) | nothing shows a timer's rate | T-152, which depends on the answer; or the capability page | 9 |
| How long the part of `engine.init()` inside the Enter pinch takes (T-128a) | not logged | T-128d, which next edits that click: one `[app]` line | 8 |
| The longest single audio tick (T-121, T-143) | `stats.cpuEstimate` is an average over time and hides one long tick | T-128d, which adds `stats.triggers` beside it; or T-165 | 14 |
| The restored bed's place logged every frame for 10 s: does the first place move (T-162) | not logged | T-128c, in the room system, behind `eventLog` | 16 |
| Does the headset signal a recentre (`reset`) (T-162) | it is not one of the app's events, so `eventLog` does not show it | T-128c, which must listen for it anyway | 16 |
| What deleting a saved place does after the session has ended (T-162) | needs a command typed after the session with the session kept | T-128c, as a line when `clear()` runs late | 16 |
| The limit of eight saved places for a site (T-162) | no page saves nine | the capability page, as a follow-up of T-104 | 1 |
| The outline of a round table's surface (T-123) | the capability page keeps the box around a surface, not its outline | the capability page, as a follow-up of T-104 | 1 |
| The cost of a hit-test source that is asked for and not used (T-123) | needs the same frame-rate run with and without it | the capability page, or T-165 | 1 |
| The cost of exactly 24 Choir notes at once (T-144) | `autoplant` gives the five voices in turn: 80 plants hold 16 Choir | T-164 or T-165, with a flag that plants one voice only | 14 |
| How to cause a key change in a running session, for certain (T-143) | block 15 uses "Re-place bed" with the bed left floating; no note confirms that way | T-128d's builder, in one sentence | 15 |
