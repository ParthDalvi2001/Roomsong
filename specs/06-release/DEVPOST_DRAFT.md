# Devpost Submission Draft v1, Judging Scorecard, and Gap List

**Status:** Draft v1 (v0 was 15 Oct, at cc37db5) · **Owner:** product-owner · **Date:** 2026-10-17 · Checked against `develop` at dca03de.
**Feeds:** T-180 (final copy), T-181 (video), T-182 (gallery), T-184 (go/no-go). The rules of copy are SUBMISSION_CHECKLIST §2.1 ("Copy rules"); this file obeys them and does not replace them.
**Sources read:** HACKATHON_RULES §3, §5, §6, §10, §11 · SUBMISSION_CHECKLIST §2 · WINNING_STRATEGY §0 to §2 · PRD §6 · SPRINT_PLAN v2.1 (status column) · PROGRESS (Blocked on human; stand-ups of 16 Oct, to 18:24 IST) · API_SPEC Changelog v1.2.26 to v1.2.36, §1.6, §1.7 · LLD §11 · DECISIONS_LOG D-050 to D-056 · BUG_LOG · VIDEO_SCRIPT_V0 · the words players see (`src/core/strings.ts`, `src/ui/strings.ts`).

**Markers.** `[not yet: T-nnn]` follows every claim that is false today and names the task that makes it true; `[not yet: BUG-nnn]` names the open bug that keeps it false. Two kinds sit on sentences that are true today: `[not yet: T-155]` marks a claim that holds in the emulator build but rests on the room signature (S1), which the G2 review keeps or cuts; in "Known limitations" and the hands field, `[not yet: T-129]` or `[not yet: T-165]` marks a sentence to rewrite once a headset result exists. `<...>` is a number or choice filled in from the final build (checklist rule "Numbers"). Before submitting, every marker is resolved: the task is done, or the sentence is cut. A sentence with an open marker never ships.

**Where the build stands (17 Oct).** 44 of 72 tasks done at the last stand-up (16 Oct 18:24 IST); since then T-142b and T-160 have merged (not pushed: BUG-009 holds the push) and D-056 added T-172 and T-173. In the emulator the judge's whole path now runs in the app: the landing page; Enter, with sound in the same press; the bed on the table, or a ghost bed and a pinch, or floating; the tuning ripple over table, wall and ceiling with its captions and the room's chord (T-142, T-142b); key, scale and echo set by the room (T-128d); the guided first minute (T-150); palm-up seed, pinch to plant, the tide playing five voices with panning; pull, drag, remove and undo (T-128d); Listen with its dome, halo and 10-minute "Goodnight" (T-148); save, restore and pause (T-128e), with the daily seed and growth; the settings panel; one-hand mode, look-and-hold with a reticle, and the beat ring (T-160). Laptop mode (T-114b) runs the same garden in a plain browser tab, a click as the pinch. Measured in the emulator at test speed: first sound 15.1 s and first loop 34.4 s from Enter (laptop mode 12.1 s and 17.4 s; T-150). Zero network requests after load (TC-E2E-01). First download last measured at 699 kB (13 Oct, before the loop was joined; not measured since). Still open: plant colours (PROGRESS item 34: the captions "Table: colour." and "Walls: colour." promise a tint that nothing draws), the sound style (item 35: until Parth picks A, B or C the app keeps the sound he called "too boring", D-051), BUG-007, BUG-008 and BUG-009 (all S2), GitHub Pages (T-108), a headset (T-000). Nothing has run on a headset, and nobody has listened to the ripple's chord or a re-tune.

---

## 1. The submission text, draft v1

### 1.1 Form fields (HACKATHON_RULES §5.3; field list to be confirmed by Chinmay in T-115)

| Field | Draft | State |
|---|---|---|
| Name | Roomsong | done (D-016; a quick search, not a trademark search) |
| Tagline (≤140) | A, if the room signature ships: "Plant glowing seeds on your real table with a pinch. Each one sings. Every room gives your garden its own song." (111 characters) `[not yet: T-155]` · B, if it is cut at G2: "Plant glowing seeds on your real table with a pinch. Each one sings, and your garden grows every day you return." (112 characters) | choose at G2 (T-155); both are true of the emulator build today (A since T-128d, B since T-128e) |
| Track | Entertainment | done (D-001) |
| Division | New Experience (first commit 2026-10-10, 4c831aa) | done |
| Build link | `https://parthdalvi2001.github.io/Roomsong/` `[not yet: T-108]` | Pages not live; Parth's steps in PROGRESS item 3 |
| Mirror and build hash | named in the description, not in the link field `[not yet: T-108, T-183]` | mirror not chosen |
| Video | public YouTube, 60 to 90 s `[not yet: T-153, T-181]` | script v0 and shot list written (`VIDEO_SCRIPT_V0.md`, 15 Oct); capture not started: emulator footage needs a visible hand (PROGRESS item 33 (4)) |
| Target launch | `<team decides>`; the checklist's draft is "Q1 2027 on the store, as a web app" | needs Parth and Chinmay |
| Team | Parth · `<email>` · Developer; Chinmay · `<email>` · Product Manager (Representative). Agents are not team members | emails from the humans; Chinmay's Start membership unconfirmed (PROGRESS item 5) |
| Gallery | 6 images, §3.4 of this file | not started (T-182) |

### 1.2 Description (≤500 words)

Where each heading comes from:

| Heading | Source of the heading | Words (headings and placeholders counted, markers not) |
|---|---|---|
| How to test | SUBMISSION_CHECKLIST §2.1 (a required section; it comes first) | 99 |
| What it is | HACKATHON_RULES §5.3 "inspiration"; SUBMISSION_CHECKLIST §2.1 "Inspiration" and "What it does", merged to save words | 69 |
| Your first minute | the brief for this draft; PRD §3.1 (the First Five Minutes flow); its steps are the judge's path, so "How to test" points to it | 62 |
| After that | SUBMISSION_CHECKLIST §2.1 "What it does" (shaping, Listen, coming back) | 54 |
| How this meets the brief | SUBMISSION_CHECKLIST §2.1 (required); HACKATHON_RULES §3 (the theme and the design tests) | 53 |
| How we built it | HACKATHON_RULES §5.3 "how we built it"; SUBMISSION_CHECKLIST §2.1 | 79 |
| Known limitations | SUBMISSION_CHECKLIST §2.1 (required); CLAUDE.md Golden Rule 11; HACKATHON_RULES §10 C1, C5, C7 | 65 (both alternatives) |
| What's next | HACKATHON_RULES §5.3 "future plans"; SUBMISSION_CHECKLIST §2.1 (required) | 19 |

Total: **500 words with both "Known limitations" alternatives, 492 with the one that is true today** (counted on 23 Oct by script with the markers removed and list markers not counted; the rows above are by that count). On 23 Oct the stillness and Time-lapse sentences (16 words) went into "How to test" and 16 were cut across five sections ("ring-shaped", "to make it", "drag it", "it is", "in which the room's", "explored the idea", "maps … musically; it does", "no table", "palm", "one", two "and" commas). Laptop mode added 21 words to "How to test"; 12 were cut elsewhere (the fallback list, "built and", two short rewrites). The speakers note (D-057, 19 Oct) added 4 more, "built-in speakers (Bluetooth lags)", and "a click is the pinch" became "a click pinches" (2 fewer). About 8 words of slack: every placeholder filled with a real number or name must replace words, not add them. If the form has no separate hands field (T-115), the hands text of §1.3 (166 words) cannot fit and must shrink to about 20 words inside these 500.

**The no-headset path.** The rules ask for a build that launches in Quest Browser (HACKATHON_RULES §5.1) and allow emulator video (§5.2); the FAQ says judges play on a Quest 3 or 3S (§11). Since T-114b anyone without a headset can try the garden: on a browser with no mixed reality the landing page says "The garden opens in this tab: a click or a tap is a pinch." and Enter opens laptop mode. What it is: the same garden, sound, guide and save, seen from a fixed seat over a drawn table; the seed follows the pointer and a click on a free cell plants it; a press and drag moves a plant, or removes it off the ring; a click on the petal undoes; a click on the centre orb starts Listen and a click ends it. What it is not: mixed reality (no passthrough, no real table), the room signature (always the default "Wanderer" tuning), hand poses (no palm up, no palms out), pull (a plant cannot be made taller or shorter), the settings panel (the landing page's switches stand in) or look-and-hold. It is tested only in desktop Chromium by the browser tests (TC-E2E-14 and the laptop timing of T-150). PRD §6 calls S6 "never the judged path", so the copy offers it as a preview after the headset steps, beside the video. The weekly rule check of 15 Oct (T-186) found the rules unchanged; they were not re-read for this draft.

```markdown
## How to test
Quest 3 or 3S, hand tracking on, controllers down, built-in speakers (Bluetooth lags), seated at a table. Space Setup lets your room tune the song [not yet: T-155].
1. In Meta Quest Browser open <GitHub Pages URL> [not yet: T-108]. Mirror: <mirror URL>. Build <hash> (/version.json) [not yet: T-183].
2. Press Enter the garden; allow hands and room.
3. Follow "Your first minute", then hold both palms out.
4. Sit still eight seconds: the garden opens. Time-lapse (Garden tab): a week in 30 seconds, unsaved.
No headset? Watch the video [not yet: T-181], or open the link on a computer, where a click pinches: no passthrough, room tuning, poses or pull.

## What it is
Instruments ask for skill before they give joy. We wanted a song you grow. Roomsong turns your real table into a glowing ring garden where every plant sings. Where you plant sets when it plays and how high. A sweep of light plays each plant, always in scale. Your room tunes it: floor size sets the key, ceiling height the scale, room volume the echo [not yet: T-155].

## Your first minute
The ring settles on your table (none: look at a surface and pinch). A ripple crosses table, wall and ceiling, each ringing a note [not yet: T-155]. Hold a palm up: a seed glides in. Pinch it with your other hand; its landing spot lights up. Let go: the sweep makes it sing. Three plants make a song within 90 seconds.

## After that
Pull a plant up for louder, drag to move it, off the ring to remove it; 5 seconds to undo. Palms out: the lights dim, a halo rises and the garden performs, music visualization in spatial audio. Saved, it returns to its spot; each day brings a seed and plants grow.

## How this meets the brief
- Entertainment: a lean-back Listen mode.
- Hands-first: bare hands only; no controller path.
- Seated: the bed sits 0.45 m ahead, within reach; first sound in <N> s; ten-minute visits.
- Purposeful MR: the table is the stage, the room the tuning [not yet: T-155].
- Original: synthesized sound, procedural visuals, offline after loading.

## How we built it
WebXR with the Immersive Web SDK, Three.js, TypeScript and Web Audio. Plane detection finds the table; a four-step fallback ends in a floating bed. A fixed mapping turns room measurements into key, scale and echo [not yet: T-155]. <20> draw calls [not yet: T-165], 24 pooled voices, a <0.7> MB download. To our knowledge the first consumer MR instrument, and the first on Quest, whose room geometry tunes the music; art and research projects (MR4MR, ARCHISCORE, RoomTone) came before us [not yet: T-155].

## Known limitations
<"Tested on Quest <3/3S> in <N> rooms." | "No headset: tested only in the Immersive Web Emulator, video included.">
Frame rate, hand feel, target sizes and room readings are unverified on Quest [not yet: T-129, T-165]. The echo follows room size, not measured acoustics. Rooms without a scanned table or walls get the default tuning. A room near a measuring step can change scale between visits.

## What's next
<Should-haves that missed 10 Nov.> Shared gardens: a friend's garden in your room's key. <Target launch.>
```

Claims that hang on a human decision, not a task (resolve before T-180):

| Claim in the copy | Depends on | Today |
|---|---|---|
| "the bed sits 0.45 m ahead, within reach" | D-041: a restored bed may sit 0.10 m further, its far edge up to 0.85 m (PROGRESS item 31) | true for a new placement; true for a restore only with "no slack" |
| "First sound in <N> s" | PROGRESS items 23 and 26c: in a room with no table the plan's sum is 22 s, not 20 | with a table, 15.1 s at test speed in the emulator (T-150); with no table the 20 s rule fails until Parth picks a, b or c (the browser test logs that case without asserting it) |
| The three named antecedents | PROGRESS item 16a: "keep the names" or "no names" | the no-names version is "art and research prototypes" |
| "A room near a measuring step can change scale between visits" | PROGRESS item 21 and T-129: the real drift is unmeasured | keep the sentence until the device check |
| Any "same room, same song" line | T-129 two-session check | not written anywhere above, on purpose |
| "bare hands only; no controller path" | HACKATHON_RULES §10 C1, UAT-01 on device or, in Emergency mode, in the emulator | true by design; the whole loop runs hands-only in the emulator (TC-E2E-03, and TC-E2E-07 for one hand and look-and-hold); proven only at T-184 |
| "built-in speakers (Bluetooth lags)" | D-057; DEVICE_SCRIPT_S1 block 14, "speakers against headphones" (is the Bass there on the speakers) | the lag of Bluetooth headphones on Quest 3 is widely reported, not measured by the team; the app is tested on no speaker yet |
| "or open the link on a computer" (laptop mode) | PRD §6: S6 is "never the judged path"; Parth and Chinmay say whether judges are offered it at all | true in the build (TC-E2E-14); the sentence says what it lacks |

### 1.3 Hand interactions and the future of VR (HACKATHON_RULES §5.3, optional field we fill; SUBMISSION_CHECKLIST §2.1)

```markdown
## How hands are used
Hands only; no controller is ever needed. Palm up to receive a seed; pinch to plant; pinch and pull to grow; pinch and drag to move; drag off the ring to remove. Palms out, or a pinch on the Listen orb, to listen; a palm turned to your face, or any pinch, to come back. You see your own hands in passthrough; the app draws none. What a pinch will act on lights up first [not yet: BUG-007], and every action commits when you let go. Targets are 2.5 cm wide with a 4 cm hit radius, pinch hysteresis and smoothing, provisional until a headset test [not yet: T-129]. A hand that leaves the headset's view loses nothing: what it held goes back. Accessibility: high contrast [not yet: BUG-008], voices told apart by shape, and nothing changes brightness more than 3 times a second; one-hand mode, a visual beat ring, reduced motion, and head-aimed look-and-hold, which places the garden, plants, undoes and listens but cannot move or remove a plant.

## What excites us about VR
<The team writes this in its own words. A starting point for Parth and Chinmay to rewrite: "A headset can see the room you are in. Most apps treat the room as a backdrop. We wanted the room to take part: your table holds the garden and your room tunes it, so the same garden can sound different in another room.">
```

Changed from v0 besides the markers: "voices told apart by shape and colour" is now "by shape", because a plant's colour follows its place in the seed sequence, not its voice (ART_PASS_T163 §0), and no colour option on the table (item 34) makes colour name the voice.

---

## 2. Judging-criteria scorecard (HACKATHON_RULES §6; 25 % each)

Scored harshly, as a judge would score the build at `develop` on 17 Oct, with no headset. "Nov 12" is a guess at feature freeze if the plan lands and no headset arrives; with a headset and the device script run, add about 1 to Technical and Polish. The 15 Oct column is draft v0's.

| Criterion | 15 Oct | **17 Oct** | Nov 12 (no headset) | Evidence in the repository (17 Oct) | Tasks that raise it most before 12 Nov |
|---|---|---|---|---|---|
| **Stage 1 pass/fail** | fail | **fail** | pass | Fixed since 15 Oct: the loop plays in the app (T-128d) and Listen, the track-fit proof, is built (T-148). Still failing: no public link (T-108 waits for Parth's go-live steps, PROGRESS item 3) and no video. Hands-only holds by design and runs hands-only in the emulator; judges check it on a Quest (HACKATHON_RULES §11) | **T-108** go-live; the capture rig, then **T-153** |
| **Innovation & Creativity** | 4 | **5** | 6 | The room signature now plays in the app: the ripple crosses table, wall and ceiling with its captions and rings the room's chord from each surface (T-142, T-142b), and the garden takes the room's key, scale and echo (T-128d, T-143). Reason to come back is in: the daily seed and growth, saved (T-128e). Against: nobody has listened to the ripple's chord or a re-tune (item 27); "Table: colour." and "Walls: colour." promise a tint that nothing draws (item 34); S1 is still a Should gated on device evidence (PRD §6, T-155); the prior art is close and named (WINNING_STRATEGY §0.1) | item **34** (A makes the room tint the plants, so the captions come true); **T-129** drift check; keep S1 at **T-155** |
| **Experience Design** | 3 | **5** | 6 | In the app (emulator): the guided first minute, a ghost pinch over one glowing cell, captions of six words at most, first sound 15.1 s and first loop 34.4 s at test speed (T-150, D-053); shaping with a 5 s undo; Listen with its wake and "Goodnight" (T-148, D-050); save, restore and pause (T-128e); the settings panel; one hand, look-and-hold with a reticle, the beat ring (T-160, D-054, D-055); laptop mode (T-114b). Against: no hand has tried any of it, and on a Quest the feel is the criterion; BUG-007 (no hover cue on the seed, which one-hand mode relies on); BUG-008 (high contrast leaves the seed, the Listen orb and the petal without an outline); look-and-hold cannot move or remove a plant (D-055); in a room with no table the first sound is 22 s by the plan's sum (item 23, open); Parth's first look was "bad, distorted" (D-051, before the art pass) | **BUG-007**, **BUG-008**; item **23**; **T-152**; **T-166** stranger tests (needs a headset) |
| **Technical Implementation** | 5 | **5** | 5 | 1,748 unit tests and 103 browser tests at the 16 Oct push, more since (T-142b, T-160); 96.2 % of lines covered; a save is never overwritten by a failed read, and a change made just before closing is kept (T-128e); a breaker round every system; a four-level placement and a default tuning; laptop mode runs the same modules unchanged (T-114b); 30 draw calls for both eyes in high contrast with a full bed (T-163), under the budget of 60. Against, and this is half the criterion: zero device runs; fps unmeasured; planes, anchors and hand tracking never seen in a real room; BUG-009 (an unexplained second brightness change while the ghost bed shows) holds the push of T-142b and T-160 | **T-000** headset, then **T-129** (both sittings can run now: T-128c to T-128e are done); **T-165** perf pass; **BUG-009** |
| **Polish & Presentation** | 2 | **3** | 5 | The art pass is in (the head is the light, lit stems, whorls, idle sway, a high-contrast outline; T-163), and three sound styles wait for a pick (T-164: groove, tempo echo, moving chords, a breathing filter, soft percussion). Against: the only ratings are Parth's, the look "bad, distorted" and the sound "bad, did not like at all", "too boring" (D-051, both before these passes); the app keeps the old sound until a style is picked (item 35); the plant colours are open (item 34); no video, no gallery, no link; emulator footage shows no hands (D-027) | item **35**, then the listening review of **T-154**; item **34**; the capture rig and the **T-153** rough cut by 3 Nov |

The plan's own G3 bar is a self-score of at least 8 on each criterion (SPRINT_PLAN, gate criteria). Without a headset, Technical cannot pass 6 and Polish cannot pass 6: the rules ask for fps on Quest hardware and judges expect device footage. That bar needs either a headset or an accepted decision at G3, recorded in DECISIONS_LOG.

For the self-score table in PROGRESS (the driver copies it): 17 Oct, product-owner guess, no headset: Innovation 5, Experience 5, Technical 5, Polish 3; Nov 12 guess unchanged at 6 / 6 / 5 / 5.

---

## 3. Gap list against SUBMISSION_CHECKLIST

State: **done** · **not done** (on track) · **at risk** (a date, a human or a headset stands in the way).

### 3.1 Timeline (§1)
| Item | State | Task |
|---|---|---|
| First rough video cut, 3 Nov (G2) | at risk: the loop and Listen are in the app now (T-128d, T-148), but emulator footage needs a visible hand and nobody owns the capture rig (PROGRESS items 32 (7), 33 (4)) | T-153; capture rig: **no task, add one** |
| Feature freeze, 12 Nov | not done | T-169 |
| Video capture, 13 Nov | at risk: no headset | T-181 (T-000) |
| Video edit, screenshots, gallery, 14 Nov | not done | T-181, T-182 |
| Code freeze, 15 Nov: tag rc1, deploy to Pages and the mirror, same hash | at risk: Pages not live, mirror not chosen | T-183 (T-108) |
| Clean UAT, 16 Nov | at risk: no headset (Emergency mode allows emulator UAT, marked as such) | T-184 |
| Tag `v1.0.0-submission`, lock `main`, review on the `github-pages` environment, 17 Nov 12:00 | not done | T-185 |
| Submit, 17 Nov 18:00 IST; confirmation screenshot | not done; `specs/06-release/evidence/` does not exist yet | T-185 |
| Post-submission smoke test | not done | T-185 |
| Uptime checks to 11 Dec | not done; `uptime.yml` does not exist yet and must be on `main` before the lock | T-187 |

### 3.2 Form fields (§2)
| Item | State | Task |
|---|---|---|
| Name | done | D-016 |
| Tagline ≤140, naming a pinch and the real table | done as two variants (§1.1), both true of the emulator build; the choice waits for G2 | T-155, T-180 |
| Track, division | done | D-001 |
| Build link (Pages URL) | at risk: Parth's go-live steps (PROGRESS item 3; the PM's P-008 asks the same); the workflows have never run a deploy on GitHub | T-108 |
| Mirror named in the description | at risk: Vercel or Netlify not chosen | T-108, T-183 |
| Build hash in "How to test" | not done; the build stamp `version.json` exists (T-108 prep) | T-183 |
| Video link | not done | T-181 |
| Target launch | not done: a human decision | **no task, add it to T-180** |
| Team: names, emails, roles | not done: emails come from the humans | T-185 |
| The real form field list | not done | T-115 (Chinmay) |

### 3.3 Description (§2.1) and its copy rules
| Item | State | Task |
|---|---|---|
| The four required sections, both links, the hash | draft v1 here (§1.2); links and hash are placeholders | T-180 |
| ≤500 words | at risk: draft v1 is 492 with the one limitations line true today, about 8 words of slack after laptop mode and the speakers note joined "How to test"; the hands text does not fit if the form has no field for it | T-180, T-115 |
| Numbers measured on the final build (first sound, draw calls, fps only if measured on a headset) | not done; emulator figures at test speed exist (first sound 15.1 s, first loop 34.4 s, T-150), not the final build's | T-165, T-183 |
| What was device-tested and what was emulator-only | drafted, both alternatives | T-184 |
| The one qualified "first" sentence | drafted; true only if S1 ships; names wait for item 16a | T-155, T-180 |
| Room wording v1 (size, ceiling, volume; no tempo; no "your table set the key"; no measured acoustics) | done in the draft; the echo stays a mapping of room size (P-017, which would have measured it, was skipped by D-056) | T-180 |
| Should-haves not green by 10 Nov moved to "What's next"; unbuilt Could-haves never named | not done; the draft names no Could. S3 (daily seed, growth) and S6 (laptop mode) are built now | T-169 |
| "Spatial audio" and "music visualization" in the Listen sentence | done; Listen is built (T-148) | T-180 |
| Laptop mode in "How to test" | drafted with what it lacks; offering it to judges at all needs a human yes (§1.2 claims table) | T-180 |
| Hands field | drafted (§1.3); BUG-007 and BUG-008 fixed 17 Oct, so its two claims now hold (emulator) | T-180 |
| "What excites us about VR" | not done: must be the team's own words | **no task, add it to T-180 as a human step** |
| A no-room-signature version of pitch, tagline and video, ready for G2 | half done: tagline B exists and the video has its version (VIDEO_SCRIPT_V0 §2); the description has none, but every sentence that rests on S1 carries `[not yet: T-155]`, so the cut is mechanical | **no task, add it to T-155** |

### 3.4 Gallery (§2.2: 6 images, 1920×1080, real captures)
| Item | State | Task |
|---|---|---|
| 1 Hero on a real table, halo | at risk: a real table needs passthrough, so a headset; the halo is built (T-148) | T-182 (T-000) |
| 2 Tuning ripple with its captions | not done; the ripple and its captions are in the app (T-142) | T-182 |
| 3 Palm-up seed arriving | not done; in the app (T-128d) | T-182 |
| 4 Pinch-planting close-up | at risk: the app draws no hands (D-027); an emulator capture shows no pinch | T-182; capture rig: **no task, add one** |
| 5 Two rooms, two songs | at risk: needs S1 and two rooms (or two emulator rooms with `forceSignature`, captioned); until the plant colours are chosen (item 34) the two rooms look alike | T-182 (T-155, T-163) |
| 6 Settings panel, high contrast | not done; the panel is in the app (T-128d); high contrast leaves the seed, orb and petal without an outline (BUG-008) | T-182 |
| Icon | not done | T-182 |

### 3.5 Video (§3)
| Item | State | Task |
|---|---|---|
| The loop in the first 10 s | not done: the loop plays in the app (T-128d); the capture needs a visible hand | T-153, T-181 |
| The room signature in two rooms | at risk: S1 is gated at G2; the ripple and its chord are built (T-142, T-142b) | T-155, T-181 |
| Day 1 against day 3 (`fakeDay`) | not done; possible now: growth is drawn (T-119) and saved across days (T-128e, TC-E2E-06) | T-181 |
| Hosted URL in the last 4 s | at risk: T-108 | T-181 |
| Chapters in the YouTube description | not done | T-181 |
| Device footage, else emulator footage captioned "captured in the Immersive Web Emulator" | at risk: no headset | T-000, T-181 |
| A visible hand in emulator footage ("settle this before any emulator capture") | **not done and owned by nobody** (PROGRESS items 32 (7), 33 (4)) | **no task, add one** |
| The app's own sound in the video is the chosen style | at risk: no style picked (item 35); the sound in the app today was called "too boring" (D-051) | T-164 |
| No AI footage; no brands, logos or people in frame; music only from the app; burned-in captions | not done | T-181 (TC-POL-05) |

### 3.6 Go/no-go (§4), with the compliance gate (HACKATHON_RULES §10)
| Item | State | Task |
|---|---|---|
| C1 whole flow hands-only (device, or emulator in Emergency mode with the description saying so) | at risk: no headset; the flow is joined and runs hands-only in the emulator (TC-E2E-03; one hand and look-and-hold, TC-E2E-07) | T-184 |
| C2 first commit on or after 24 Sep | **done**: 4c831aa, 2026-10-10 | — |
| C3 every third-party item licensed and listed | done for what ships (§0 closed by T-171; 63 of 65 packages permissive, the other two not built in); no package added since 15 Oct (package files unchanged from cc37db5 to dca03de); one dangling scaffold licence pointer left (§3 of that file) | T-170 |
| C4 no brands, logos or people (app, video, images) | done for the app's words (T-167 sweep); the words added since (the first-minute hints, laptop mode, look-and-hold) read for this draft on 17 Oct: no brand, no person; video and images not made | T-181, T-182 |
| C5 ≥60 fps over 10 minutes on Quest 3 (Emergency: emulator budgets, fps "unverified") | at risk: no headset | T-129, T-165 |
| C6 public HTTPS, no login | not done | T-108, T-183, T-184 |
| C7 video under 3:00, public, real footage | not done | T-181 |
| C8 the Representative is a Start member; everyone 18+ and eligible | **at risk: unconfirmed since 10 Oct** (PROGRESS items 5 and 32 (13)) | T-115 |
| C9 all text in English | done for the app (T-167; the words added since read on 17 Oct); final sweep | T-184 |
| C10 submitted on time | not done | T-185 |
| P0 UAT scenarios from a clean headset | at risk: no headset | T-184 |
| Zero open S1/S2 bugs | **not done: BUG-007, BUG-008 and BUG-009 are open S2** (the log's own line "Open S1/S2 count: 0" is out of date) | T-168 |
| The landing page and the app promise only what is built, before a public address | mostly true now: the four switches, saving and Listen are in the app (T-160, T-128e, T-148). Still false: the ripple captions "Table: colour." and "Walls: colour." (nothing tints until item 34). Still missing: the help line that names the settings orb | T-163, T-170 (its go-live rule) |
| Test pages published with the app (`/proto/spike/`, `/proto/pinch/`, `/proto/bed/`) | open: keep and name them, or drop them from the submission build (PROGRESS item 28) | **no task, add one** |
| Every member listed with a role; confirmation screenshot; tag pushed; smoke test | not done | T-185 |

---

## 4. Video: the first 10 seconds (script v0: `VIDEO_SCRIPT_V0.md`, 15 Oct)

From SUBMISSION_CHECKLIST §3 (0:00 to 0:10, "the loop, at once"), SPRINT_PLAN T-153 and T-181, and WINNING_STRATEGY §3 ("lead with the room signature"):
1. **A hand pinches the third seed into the ring on a real table, the sweep of light reaches it, and it sings**: the whole loop, in one shot, inside 10 s, with the caption "Pinch. Plant. It sings." Nothing before it: no title card, no menu, no text. The loop plays in the app since T-128d.
2. **The hand must be seen.** On a headset the real hand shows in passthrough. In emulator footage the app draws no hand (D-027), so a hand cue must be on and the first emulator shot captioned "captured in the Immersive Web Emulator" (HACKATHON_RULES §10 C7).
3. **End the 10 s on the hook:** the first tuning ripple leaving the table for the wall (the 0:10 beat, "Your room tunes it"), so the room signature, which the strategy says leads everything, starts by second 10. The checklist (loop first) and the strategy (signature first) pull against each other; this line is the compromise. If S1 is cut at G2, end on the halo rising instead.

---

## 5. Proposed plan additions (for the driving session; not in SPRINT_PLAN yet)

Put to Parth at G0 as PROGRESS item 32 (7) to (11), and the capture rig again as item 33 (4); none decided by 17 Oct.

| Proposal | Why | Owner, by |
|---|---|---|
| New task: **emulator capture rig**, a visible hand in emulator footage and stills (the emulator's own overlay or a capture-only switch, captioned), 1080p 60 fps | SUBMISSION_CHECKLIST §3 says "settle this before any emulator capture"; nobody owns it; without it the first 10 s of an emulator video show no pinch | ux-designer + qa-engineer, before T-153 (31 Oct) |
| New task: **test pages in the submission build**, drop `/proto/*` from it or name them in "How to test" | PROGRESS item 28 is open and no task builds either answer | devops-engineer, decide at G2, built by T-183 |
| Add to T-155: **a no-room-signature version** of the description ("What it is", "Your first minute", "How we built it": every `[not yet: T-155]` sentence) and the "first" sentence removed; tagline B and the video's version (VIDEO_SCRIPT_V0 §2) exist | the pitch, the Innovation case and two video beats hang on S1, which is gated at G2 | product-owner, 3 Nov |
| Add to T-180: the target launch decision, the team's own "What excites us about VR", the final word count, and creating `specs/06-release/evidence/` | four checklist items with no owner | Parth + Chinmay + product-owner |
| ~~Optional (Could): check whether the Pages URL enters in desktop Chrome with Meta's Immersive Web Emulator extension~~ | superseded by laptop mode (T-114b): a computer browser opens the garden by itself, and "How to test" says so | — |
- **Freeze both links at submission (rule check 19 Oct):** the Judging page says an entry changed after the deadline "may be disqualified"; that covers the mirror as well as GitHub Pages (T-185 locks both).
