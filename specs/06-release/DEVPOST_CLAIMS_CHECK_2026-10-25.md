# Devpost claims check — 2026-10-25 (Golden Rule 11, the honest submission)

**Checked:** every claim of `DEVPOST_DRAFT.md` v1 (17 Oct) §1.1 to §1.3, "How to test" first, against `develop` at a2a6f3f: the code, the tests, `PROGRESS.md` (Test status, Perf, Blocked on human), `specs/05-testing/audits/` (23 Oct), `TEST_PLAN.md`, `BUG_LOG.md`, `DECISIONS_LOG.md` (to D-058), `SPRINT_PLAN.md`. Read-only on code; one network probe (the Pages URL). Auditor: backend-dev.

**Verdicts.** **backed**: in the code, tested, true as written on any build · **emulator-only**: built and tested in the emulator (IWER, desktop Chromium), the device behaviour unverified (no headset, T-000) · **wrong**: not true as written · **unbuilt**: the thing does not exist yet (a link, a video, a hash) · **unbacked**: nobody has measured or checked it.

## 0. What to fix first (wrong, unbacked, unbuilt)

| # | Claim | Verdict | Fix |
|---|---|---|---|
| 39 | "<20> draw calls [not yet: T-165]" | wrong as a placeholder: the measured worst frame is **46 draws for both eyes** (budget 60; `26-worst-frame`, 23 Oct); 12–16 in the six-room matrix; gallery shots 16–30 | "46 draw calls in the worst frame (both eyes, emulator)" or drop the number; T-165 A and B are merged, the marker can go |
| 41 | "<0.7> MB download" | wrong by rounding: **743.6 kB gzip** (`check-size`, 23 Oct; 699 kB was 13 Oct) | "0.75 MB" or "under 1 MB" |
| 42 | "To our knowledge the first consumer MR instrument, and the first on Quest, whose room geometry tunes the music; art and research projects (MR4MR, ARCHISCORE, RoomTone) came before us" | unbacked: no one has searched for a prior consumer product; the three names are other projects' names (rule C4 risk; PROGRESS item 16a never answered); rests on S1 (T-155) | "As far as we know, no consumer MR instrument before this lets the room's geometry tune the music." No names. Only if S1 ships |
| 2 | "built-in speakers (Bluetooth lags)" | unbacked: the lag is reported on the web, not measured by the team; the app has been heard on no speaker (draft's own claims table) | "use the headset's own speakers" (no reason given) |
| 49 | "pinch and pull to grow" (hands field) | wrong word: a pull sets the plant's height, which is loudness and sustain (`mapping.ts` −24..0 dB, 0.2..2.5 s), not growth, which is days | "pinch and pull for louder" |
| 46 | "Rooms without a scanned table or walls get the default tuning." | half wrong: the default comes when the bed is not on a found table or surface, or nothing was measured (`signature.ts:107`); a table with no walls still gets a tuning from the floor and the table; a room with walls but no reachable table (the bed floats) gets the default today (item 41 open) | "A room where no table is found gets the default tuning." |
| 25 | "music visualization in spatial audio" | overstated: one equal-power `PannerNode` per voice, no HRTF (`Spatializer.ts:1-3, :39`; HRTF waits for a device A/B) | "stereo sound placed round the ring", unless SUBMISSION_CHECKLIST §2.1 needs the term; then keep and know it is panning |
| 5 | Step 1: the GitHub Pages URL · the mirror · "Build <hash>" | unbuilt: `https://parthdalvi2001.github.io/Roomsong/` answers **404** (probed 25 Oct); T-108 is blocked on Parth (PROGRESS item 3, 37 (2)); no mirror chosen; the stamp exists (`scripts/write-version.mjs` → `dist/version.json`) but is not live | no fix in words; T-108 then T-183 |
| 10 | "No headset? Watch the video" | unbuilt: T-153 and T-181 todo; no capture rig; no visible hand in emulator footage (D-027) | keep the marker until a video exists |
| 43 | Known limitations, first line | only the second alternative is true: no headset, no device run (PROGRESS Test status: device —; Emergency mode from 27 Oct); "video included" waits on T-181 | "No headset: tested only in the Immersive Web Emulator." Add "video included" when there is one |
| 31 | "first sound in <N> s" | last measured **15.1 s** from Enter (emulator, hands at test speed, 16 Oct, T-150); the bound (20 s on the app's share) is asserted and was green on 23 Oct; a room with no table takes about 22 s (item 39 (a) open) | "first sound in 15 s (emulator)" or drop it; not a device number |
| 58 | Form fields: Gallery "not started" | stale: six emulator shots exist (`npm run gallery`, e11ed2c, 23 Oct: bed + ripple, full bed + vine, Listen, high contrast, seed on palm, panel) | update the state; the images are emulator captures and must be captioned so (C7) |

Everything else below is backed or emulator-only. The stale paragraph "Where the build stands (17 Oct)" and §2 and §3 of the draft are not submission copy; their numbers (44 of 72 tasks, 699 kB, BUG-007/008/009 open, "not pushed") are out of date and are refreshed at T-180.

## 1. "How to test"

| # | Claim | Where it is | Verdict | Fix wording |
|---|---|---|---|---|
| 1 | "Quest 3 or 3S, hand tracking on, controllers down" | `iwsdk.config.json` `handTracking.required: true`; `HandSystem` is the only input in a session (no controller path; SDK input models off, D-027); the landing says what to switch on when hands are missing (`ui/strings.ts` `E_HANDS_UNAVAILABLE`) | backed by design; device proof at T-184 | — |
| 2 | "built-in speakers (Bluetooth lags)" | nothing in the repo measures it | unbacked | see §0 |
| 3 | "seated at a table" | level 1 takes a labelled table 0.5–1.1 m high (BUG-010 fix); `BED_CENTRE_DEFAULT_M` 0.45 (`room/config.ts:5`) | backed (emulator: `06-room`, `29-room-matrix`) | — |
| 4 | "Space Setup lets your room tune the song" | `garden/signature.ts:97-131` (floor area → key, ceiling → scale, volume → echo), `room/RoomFeatures.ts`; six emulator rooms give six tunings (`29-room-matrix`) | emulator-only: no real room has ever been read; S1 is gated on T-155 | keep the `[not yet: T-155]` marker |
| 5 | Step 1: Pages URL, mirror, build hash | see §0 | unbuilt | — |
| 6 | Step 2: "Press Enter the garden; allow hands and room." | the button's text is `Enter the garden` (`ui/strings.ts` LANDING.enter); the one way in (API_SPEC §1.10 rule 2); the permission prompts are the browser's | backed | — |
| 7 | Step 3: "Follow 'Your first minute', then hold both palms out." | `PALMS_OUT_MAX_ANGLE_DEG` 40, `PALMS_OUT_HOLD_MS` 1500 (`hands/config.ts:31-32`); `GardenSystem.startListen`; `18-listen` | emulator-only (no pose tried on a hand; D-050 narrowed them by reasoning) | — |
| 8 | Step 4: "Sit still eight seconds: the garden opens." | `STILL_OPEN_MS` 8000 (`access/config.ts:45`), `StillnessSystem` (head under 8°/s, bed centre in the view box), `HaloRenderer.setOpen`, `AudioEngine.setStillness`; `28-stillness` | emulator-only (whether a seated head holds under 8°/s is a device check, S2 block "stillness") | "Look at the garden and hold still for eight seconds: it opens" (says where to look) |
| 9 | "Time-lapse (Garden tab): a week in 30 seconds, unsaved." | label `Time-lapse` on the Garden tab (`ui/strings.ts:108`, `ui/Panel.ts`); `TIME_LAPSE_DAY_MS` 4000 → the 7-day stage at 28 s; `garden.saved` keeps the real garden (`app.ts` keepSaved; `app.test.ts` byte-identical save); `26-time-lapse`, `12-settings` | backed (emulator) | — . Note: laptop mode has no panel; on the hosted build the flag needs `?dev=1&flags=timeLapse` |
| 10 | "No headset? Watch the video" | — | unbuilt | see §0 |
| 11 | "or open the link on a computer, where a click pinches: no passthrough, room tuning, poses or pull." | T-114b done; TC-E2E-14 (`20-window`); the landing says "The garden opens in this tab: a click or a tap is a pinch. Height and settings need a headset." (`ui/strings.ts:16`); `PointerSource.ts:3` "A pointer cannot pull"; no `room:features` in the window, so the default tuning | backed in desktop Chromium only (Safari and Firefox untested); offering it to judges waits on Parth (items 36, 37 (4), unanswered) | add nothing; keep it after the headset steps as drafted |

## 2. The description

| # | Claim | Where it is | Verdict | Fix wording |
|---|---|---|---|---|
| 12 | "turns your real table into a glowing ring garden" | passthrough + plane detection: `PlacementSolver` level 1 | emulator-only (never on a real table) | — |
| 13 | "Where you plant sets when it plays and how high." | 16 steps × 5 rings (`garden/snap.ts`, `audio/Scheduler.ts`: the step is the beat, the ring the pitch); `19-first-loop` | backed | — |
| 14 | "A sweep of light plays each plant, always in scale." | `TideRenderer`; notes quantised to the mode (`audio/scales`, `note.ts`); TC-AUD tests | backed | — |
| 15 | "floor size sets the key, ceiling height the scale, room volume the echo" | `signature.ts:109-113` | emulator-only (S1) | keep the marker |
| 16 | "The ring settles on your table (none: look at a surface and pinch)." | levels 1–4 (`room/config.ts`, `PlacementSolver`); the caption is `Look at your table, and pinch` (`core/strings.ts`); `06-room` c2 | emulator-only | the caption says "table", the copy "surface": either is fine |
| 17 | "A ripple crosses table, wall and ceiling, each ringing a note" | `TuningRipple` (T-142); one chord note per surface (`AudioEngine.ts:101, :164`, T-142b); `17-ripple` | emulator-only; nobody has listened to the chord (item 27) | — . Go-live note: the app's own captions `Table: colour.` / `Walls: colour.` (`core/strings.ts:5-6`) promise a tint nothing draws (item 39 (b) open): change the captions or build the tint before judges read them |
| 18 | "Hold a palm up: a seed glides in." | `PALM_UP_MAX_ANGLE_DEG` 35, `PALM_UP_HOLD_MS` 400; `SeedSystem` glide; caption `Open your hand, palm up`; `16-seeds` | emulator-only (the pose) | — |
| 19 | "Pinch it with your other hand; its landing spot lights up." | the hovered cell lights (`BedRenderer` markers, FR-HND-16 hover); caption `Pinch the seed, drop it here`; BUG-007 fixed 17 Oct | backed (emulator) | — |
| 20 | "Let go: the sweep makes it sing." | commit on release (FR-HND-16); since T-173 the placed note sounds at once (`engine.ui('placed', …)` in `AudioSystem.ts`) and the sweep plays it every bar | backed | optional: "Let go: it sounds, and the sweep plays it every bar." |
| 21 | "Three plants make a song within 90 seconds." | `23-onboarding`: first loop 34.4 s at test speed (16 Oct); `FIRST_LOOP_MS` 90 000 asserted, green 23 Oct | emulator-only (the hands move at the test's speed) | — |
| 22 | "Pull a plant up for louder" | `mapping.ts` height → −24..0 dB and 0.2..2.5 s release; `PULL_RANGE_M` 0.25; `15-shaping` | backed | "louder and longer" if a word is free |
| 23 | "drag to move it, off the ring to remove it; 5 seconds to undo." | `rules.ts` movePlant/removePlant, `UNDO_LIFE_MS` 5000 (`garden/config.ts:113`); the petal; `15-shaping`, `GardenSystem.test` | backed (emulator) | — |
| 24 | "Palms out: the lights dim, a halo rises and the garden performs" | the dome leaves passthrough at 40 % behind it, the aurora halo (`HaloRenderer.ts:1-5`); Listen (T-148); `18-listen` | emulator-only (the pose; the look of passthrough dimming is a device check) | — |
| 25 | "music visualization in spatial audio" | `Spatializer.ts` equal-power panning per voice, no HRTF | overstated | see §0 |
| 26 | "Saved, it returns to its spot" | `AnchorStore` (T-162), restore at session start (T-128c); `13-anchor-store`, `22-save-restore` | emulator-only: the Quest's persistent anchors have never restored anything ("how a real headset restores is not known", PROGRESS) | keep; it is covered by "unverified on Quest" only if "room readings" is read to include anchors: add "saved places" there |
| 27 | "each day brings a seed and plants grow" | `growth.ts` (one seed per new local day, up to 5; stages at 1, 3, 7 days); `22-save-restore` e3 (`fakeDay`) | backed | — |
| 28 | "Entertainment: a lean-back Listen mode." | T-148 | backed | — |
| 29 | "Hands-first: bare hands only; no controllers." | as row 1 | backed by design; device proof at T-184 | — |
| 30 | "the bed 0.45 m ahead, within reach" | `BED_CENTRE_DEFAULT_M` 0.45; a restored bed is kept up to 0.55 m (D-041 applied), far edge up to 0.85 m | backed for a new placement; a restore may sit 0.10 m further | "the bed about 0.45 m ahead" |
| 31 | "first sound in <N> s" | see §0 | emulator figure only | see §0 |
| 32 | "ten-minute visits" | `LISTEN_MAX_MS` 600 000 and "Goodnight"; Golden Rule 4 | backed | — |
| 33 | "Purposeful MR: the table is the stage, the room the tuning" | rows 12 and 15 | emulator-only (S1) | keep the marker |
| 34 | "Original: synthesized sound, procedural visuals, offline after loading." | no audio or model files in `dist/` (`check-dist`: 45 files, 4 HTML, 21 licence texts); CSP `default-src 'self'`; `offHost` is [] in every e2e (TC-E2E-01) | backed; one caveat: there is no service worker, so a reload needs the network | "needs no network once loaded" |
| 35 | "Built with the Immersive Web SDK (IWSDK)." | `@iwsdk/core` 1.0.1 in `package.json` | backed | — |
| 36 | "IWSDK (WebXR), Three.js, TypeScript and Web Audio." | the stack | backed | — |
| 37 | "Plane detection finds the table; a four-step fallback ends in a floating bed." | levels 1 (table) · 2 (a flat surface in reach) · 3 (look and pinch) · 4 (floating) (`room/config.ts`) | emulator-only (real planes unseen) | — |
| 38 | "A fixed mapping turns room measurements into key, scale and echo" | `signature.ts` (deterministic, TC-SIG-01) | emulator-only (S1) | keep the marker |
| 39 | "<20> draw calls" | see §0 | wrong placeholder | see §0 |
| 40 | "24 pooled voices" | `VOICE_CAP` 24 (`audio/config.ts:21`), stealing, the UI notes in the same pool | backed | — |
| 41 | "<0.7> MB download" | see §0 | wrong by rounding | see §0 |
| 42 | the "first" sentence with three names | see §0 | unbacked | see §0 |
| 43 | Known limitations, first line | see §0 | only the emulator line is true | see §0 |
| 44 | "Frame rate, hand feel, target sizes and room readings are unverified on Quest" | PROGRESS Perf: "device fps: no headset"; `hands/config.ts` header: "none has been tuned on a headset" | backed (an honest line) | add "saved places" (row 26) |
| 45 | "The echo follows room size, not measured acoustics." | `signature.ts:79-81` rawDecay from room volume (P-017 skipped, D-056) | backed | — |
| 46 | "Rooms without a scanned table or walls get the default tuning." | see §0 | half wrong | see §0 |
| 47 | "A room near a measuring step can change scale between visits." | `MODE_CEILING_BOUNDS_M` steps at 2.60 and 2.90 m; PROGRESS item 21 | backed (by arithmetic; the real drift is unmeasured, T-129) | — |
| — | Tagline A ("Every room gives your garden its own song") | rows 15, 38 | emulator-only (S1) | choose at G2 as drafted |
| — | Tagline B ("your garden grows every day you return") | row 27: a seed each day; stages at 1, 3 and 7 days | backed | — |

## 3. The hands field (§1.3)

| # | Claim | Where it is | Verdict | Fix wording |
|---|---|---|---|---|
| 48 | "Hands only; no controller is ever needed." | row 1 | backed by design | — |
| 49 | "Palm up to receive a seed; pinch to plant; pinch and pull to grow; pinch and drag to move; drag off the ring to remove." | `GestureMachine` (pull or drag after `DRAG_DEAD_ZONE_M` 0.02), `GardenSystem.release` table | backed, one wrong word | "pinch and pull for louder" |
| 50 | "Palms out, or a pinch on the Listen orb, to listen; a palm turned to your face, or any pinch, to come back." | palmsOut and the orb press start Listen; wake = a palm facing the head within 40° and 0.45 m (`WAKE_*`, D-050) or any `gesture:pinchStart` (`GardenSystem.ts`) | backed (emulator) | — |
| 51 | "You see your own hands in passthrough; the app draws none." | D-027; no hand mesh anywhere in `src/` | backed (what is drawn); seeing them is a device thing | — |
| 52 | "What a pinch will act on lights up first [not yet: BUG-007]" | hover cues on cell, seed, plant, petal and panel; BUG-007 **Fixed (emulator) 17 Oct** | backed (emulator) | drop the marker |
| 53 | "every action commits when you let go" | FR-HND-16; every change on `gesture:release` | backed | — |
| 54 | "Targets are 2.5 cm wide with a 4 cm hit radius, pinch hysteresis and smoothing, provisional until a headset test" | `TARGET_VISIBLE_DIAMETER_M` 0.025, `HIT_RADIUS_M` 0.04, `PINCH_ENTER_M` 0.02 / `PINCH_RELEASE_M` 0.032, the 1€ filter (`hands/config.ts`) | backed | — |
| 55 | "A hand that leaves the headset's view loses nothing: what it held goes back." | `TRACKING_GRACE_MS` 200 then the revert (`REVERT_LERP_MS`), `garden:seedBack` 'lost'; `11-tracking-loss` | backed (emulator) | — |
| 56 | "high contrast [not yet: BUG-008], voices told apart by shape, and nothing changes brightness more than 3 times a second; one-hand mode, a visual beat ring, reduced motion, and head-aimed look-and-hold, which places the garden, plants, undoes and listens but cannot move or remove a plant" | BUG-008 **Fixed 17 Oct**; `SHAPE_OF` per voice (`PlantRenderer`); `FLASH_CAP_PER_S` 3 (`render/config.ts:6`), asserted in TC-E2E-09 and 13b; the four switches (T-160); gaze: `placeLookGaze`, `onboardPlantGaze`, `undoHintGaze`, the orb dwell (D-054), scope D-055; `25-gaze`, `12-settings` | backed (emulator) | drop the BUG-008 marker; "look-and-hold" also works the settings panel, if a word is free |

## 4. Form fields (§1.1)

| # | Claim | Where it is | Verdict | Fix |
|---|---|---|---|---|
| 57 | Name, Track, Division ("first commit 2026-10-10, 4c831aa") | `git log --reverse`: 4c831aa 2026-10-10 | backed | — |
| 5 | Build link, mirror, hash | §0 | unbuilt | T-108, T-183 |
| 10 | Video | §0 | unbuilt | T-153, T-181 |
| 58 | Gallery "not started" | §0 | stale | update; caption the shots "captured in the Immersive Web Emulator" |
| — | Target launch, team emails | human decisions | — | T-180, T-185 |

## 5. Notes for the driver

- Every pose, caption and sweep above is emulator-only in the same sense: built, tested in IWER, never felt on a hand. The draft's "Known limitations" line and the hands field's "provisional" already say so; keep them.
- Two things judges will read that are not in the copy: the ripple captions `Table: colour.` / `Walls: colour.` (row 17) and the Pages 404 (row 5).
- The `timeLapse` URL flag is dev-only (`core/flags.ts`): on the hosted build it is `?dev=1&flags=timeLapse`; the panel switch needs no flag.
- Not checked here: the word count after these fixes (T-180), SUBMISSION_CHECKLIST §2.1's required terms (row 25 depends on it), and anything the form itself asks (T-115).
