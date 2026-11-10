# User Acceptance Testing (UAT) Plan — SonicSpace

**Status:** Approved · **Owner:** qa-engineer · **Sign-off:** the human (Representative) and product-owner · **Version:** 1.4 (2026-11-10: matched to the 10 Nov build: Move ("Garden spot") by aim, D-079; a palm-up gives the seed at once, a seed thrown off the bed goes back, the Seeds page with Classic and Calm, D-080 and D-081; the one-grid board, D-081. 1.3 of 2026-11-09 checked against the build and facts of 9 Nov; 1.2 of 2026-10-10 propagated plan v2.1, T-113)
UAT mirrors **how judges will test**: an unknown room, a clean headset, ≤10 minutes, hands only, then the video and the Devpost page.

> **Headsets since 7 Nov:** Parth's Quest 3S and Chinmay's Quest 3 (results: TEST_PLAN §4.6). Emergency mode (§2.1) was in force from 27 Oct to 7 Nov and is no longer. A scenario that says "headset", "room", "fps" or "feel" is still **unverified until a human runs it on a real Quest**; the emulator rehearses flows and events but signs off no device criterion (TEST_PLAN §1.1). The stranger tests (UAT-16, UAT-17; §3.1) need people from outside the team and have not been run. The open device items before UAT: `05-testing/HEADSET_RUN_2026-11-10.md`. The 10 Nov changes (UAT-18 to UAT-20 and the seed and board parts of UAT-01, 02, 04, 08 and 09) are emulator only, except Move ("Garden spot"), pressed on a headset on 10 Nov (D-079); their first device checks are that sheet's Part F and TEST_PLAN TC-DEV-18 to 20.

---

## 1. When
- UAT-dry-run: end of Phase 3 (2026-11-11, before the G3 feature freeze) on the live site once `main` carries the `develop` build, or on a preview of the `develop` build opened on the headset over Wi-Fi (`npm run build`, `npm run preview`). On 7 Nov the dev server over LAN worked on the Quest 3S (`?rec=1`); the preview route is not yet checked on a headset. *"On staging": replaced; the site is published from `main` only (D-022).*
- UAT-final (T-184): 2026-11-16 (clean-headset UAT, REPLAN §6 Phase 4) on the **production URL** after code freeze: GitHub Pages, `https://parthdalvi2001.github.io/SonicSpace/` (D-022; the path since the rename, D-069); `version.json?nocache=1` must name the release commit. UAT-01 once more on the mirror only if one is set up: Netlify is chosen (project `sonicspace`, D-069) but not live; Parth sends the address (T-108; FREEZE_AND_SUBMIT_RUNBOOK, State on 9 Nov). Only S1 fixes allowed afterwards (re-run affected scenarios).
- Stranger tests UAT-16 and UAT-17 (T-166): during Phase 3 (Nov 4–11), before the G3 feature freeze, so that a missed threshold can still change the build.

## 2. Setup for every UAT run
1. Quest 3 (Chinmay's) and Quest 3S (Parth's), hand tracking on, **controllers out of reach**.
2. Quest Browser → Settings → clear site data (and cached files) for the app origin (simulates a judge's first run). The site data also holds the settings and the `?access=` modes, which stay on until turned off (BUG-041).
3. Use a room the team has **not** tuned in (ask a friend's room, or rearrange furniture). Do at least one run without Space Setup.
4. Start a stopwatch at the moment you tap the link and note T1 (link to a usable **Enter the garden**) and T2 (Enter pinch to the first sight of the room) apart (TC-DEV-14).
5. Links: the plain link for UAT-01 to 05, 07 and 18 to 20; `?dev=1&flags=perfHud` for UAT-06 (the fps panel, low and left in the view); `?access=onehand` and `?access=gaze` for UAT-08, run last, then switched off on the first page (Accessibility section). The device test pages (`proto/`) are not in the release build (T-189), so TC-DEV-00 and TC-DEV-0A are not part of UAT.

### 2.1 Emergency-mode variant (in force 27 Oct–7 Nov, REPLAN §6; now only for a criterion with no device report)
Run UAT in the emulator (the IWER panel under `npm run dev`, with `iwsdk-runtime` MCP input; the automated flows are `npm run test:e2e`), with a desktop browser and a clean profile instead of steps 1–3 above. Record the same stopwatch times and pass/fail per scenario, tagged **E** in the evidence folder. The following criteria **cannot** be verified and must be listed as *unverified* in the sign-off table and in the Devpost description:
- Frame rate (UAT-06 fps, audio clicks under device load) and the 5 s start (UAT-01: the emulator's time measures the Mac, not the product; BUG-003).
- Hand-tracking feel and first-try success rates (UAT-01 "never needed text", UAT-02 ≥9/10 and real tracking loss, UAT-08 one-hand/gaze on real joints).
- Real room detection: persistent-anchor restore in place (UAT-04, a Must: the emulator restores every handle, so it shows the flow and nothing about reliability), no-table rooms (UAT-05), room-to-room signature difference in real rooms (UAT-15), vines on a real wall (UAT-03; Could, only if built).
- Quest-button pause/resume on the real OS (UAT-07); Quest 3S (UAT-13); spatial audio localisation by turning the head.
- The stranger tests (UAT-16, UAT-17): they need people from outside the team wearing a headset in real rooms. A mouse run in the garden window (FR-SYS-07) or an emulator run is a rehearsal and never counts towards either threshold.
Everything else (flows, timings with emulated input, save/restore, accessibility flags, content/policy sweep, Devpost page/video) is verified in the emulator and marked **E**. The video, if recorded from the emulator, must say so on the Devpost page.

## 3. Scenarios (P0 must all pass; P1 should pass)

| ID | Pri | Scenario (acts like a judge) | Pass criteria |
|---|---|---|---|
| UAT-01 | P0 | Open link, tap Enter, follow only what the app shows | In XR ≤5 s (T1 and T2 recorded apart; which one the limit means is open, PROGRESS item 26b); first sound ≤20 s; three plants playing ≤90 s; each palm-up with seeds left puts a seed on the palm at once (no board, no choice asked, D-080); never needed a controller or text |
| UAT-02 | P0 | Explore shaping with no hints beyond the app's own icons; let one seed go off the bed; then hide a hand in the middle of a drag | **Pull** (height), **drag** (move to another cell), **drag off the bed** (remove), **undo** (petal within 5 s) all discovered or triggered within 3 min; each works first try ≥9/10 (twist/flick *Cut (D-011)*); a seed let go off the bed goes back to the supply, nothing lost (Seeds left on the Garden tab unchanged, D-080); the highlighted cell is the cell the plant lands in (hover cue, FR-HND-16); with the hand hidden a hint shows and the plant returns to its cell, nothing lost or doubled (FR-HND-15) |
| UAT-03 | P0 | Both palms out, facing away, for 1.5 s, or pinch the Listen orb in the middle of the bed | Listen mode in ≤2 s; dim; **aurora halo** over the bed by default: the halo alone is a pass; a vine climbs a real wall within 1.5 m of the bed when one is detected (*Could C4, D-021; built, T-149, not yet seen on a headset*); sound localised to plants; back by a palm to the face or a pinch |
| UAT-04 | P0 (**Must**, M5, D-021) | Leave XR (**Exit** in the settings panel's Garden tab, beside Move ("Garden spot"), D-067), return later (same room): once after reloading the page, once after closing the browser | Garden restores **in place from the persistent anchor** ≤4 s, in the same key and scale as before; growth/seed logic sensible. If the anchor does not come back, the bed is re-placed by the fallback chain with every plant kept: still a pass for this scenario, recorded as "re-placed", and the restore count n/N goes into the evidence and the Devpost limitations. A lost, emptied or doubled garden is a fail |
| UAT-05 | P0 | Run in a room with **no table** and no Space Setup | "No room scan: run Space Setup" shows once and the Wanderer song plays (D-068); the pale bed asks "Look at your table, and pinch", or places itself after about 6 s; hit-test or floating bed; full loop playable; nothing feels broken |
| UAT-06 | P0 | 10-minute session with ≥20 plants + Listen | No crash; fps HUD never <60 (dev flag run), typical ≥72; no audio clicks |
| UAT-07 | P0 | Pause with the Quest button for 30 s, resume | Audio fades/returns; tide continues; state intact |
| UAT-08 | P0 | Accessibility: one-hand mode; then gaze-dwell mode (the `?access=onehand` and `?access=gaze` links) | Full loop + Listen in each mode with no pinch (gaze) / one hand. A full loop by gaze is place, plant three, Listen and back, the panel (Exit included), the Seeds page by dwell (orb, Garden, Seeds, a kind: the next seed is that kind), and Move ("Garden spot") by dwell (the dwell that pressed it goes on to confirm the aim after the look time, so the player turns to the new spot at once: record where the bed lands, D-079 known limit): look to select cannot pull, move or remove a plant (USER_MANUAL), and the page's Enter and the headset's prompt still need one pinch |
| UAT-09 | P0 | Content & policy sweep (watch for text, logos, people) | None present (the ten seed names and the board's words included); all text English; nothing above 10+ |
| UAT-10 | P0 | Open the Devpost page and the video on a laptop as a judge | Video 60–90 s (the rule cap is <3:00), public, honest footage (emulator shots captioned as such); description ≤500 words, matches the build; the GitHub Pages link works and shows the release build hash (`version.json`); the mirror too, with the same hash, if one is set up (none today) |
| UAT-11 | P1 | High contrast + reduced motion | Readable captions (7:1), outlines, no parallax, the tuning ripple glows in sequence instead of sweeping, vines fade in instead of growing |
| UAT-12 | P1 | Controllers (bonus) | *Cut (D-011)* — controller support removed from scope |
| UAT-13 | P1 | Quest 3S | UAT-01, 03, 06 pass |
| UAT-14 | P1 | "Would I come back tomorrow?" | Human rating ≥4/5 after UAT-03 |
| UAT-15 | P1 (Should S1, gated on TC-DEV-0A) | Place the bed; then repeat in a second, different room (different in size or ceiling height); then once more in the first room | Tuning ripple crosses the table/wall/ceiling and is **audible ≤5 s** after placement, with one short caption naming each surface; the two rooms give an **audibly distinct key, scale or echo** (tester names the difference unprompted; *"key/tempo": replaced, D-021: the room does not set the tempo*); re-entering room 1 re-tunes the garden in place with no plant moved and gives the same key and scale as the first time (the echo may sit one step off in a room near a boundary: record it) |
| UAT-16 | P0 (FR-UI-02, M6) | **Stranger test H12** (§3.1): five first-time users, one at a time, are told only "tap Enter and do what it shows you" | **≥ 4 of 5** reach first sound and a 3-plant loop within the first 90 s, unaided |
| UAT-17 | P1 (Should S1; only if the room signature is built) | **Stranger test H13** (§3.1): each listener hears the same garden in two different rooms and is not told why it changed | **≥ 3 of 5** attribute the change in the song to the room, in their own words |
| UAT-18 | P1 (D-079) | Settings orb, Garden tab, **Move ("Garden spot")**; look at another spot on the table and pinch on nothing; once more, and this time look and wait without a pinch | The ghost ring shows where the head looks and the bed lands there on the pinch; with no pinch it lands where the ghost shows after 40 s; every plant stays in its cell; on the same table the key and scale do not change; a spot that is not usable gives the floating bed, never a lost or doubled garden |
| UAT-19 | P1 (D-080, D-081, FR-UI-08) | Free hand palm down, the orb, Garden tab, **Seeds**: look at the Classic and Calm tabs; with a seed on the palm pick a kind under Calm, then raise the palm; plant one kind from each tab | Ten kinds, five a tab (Classic: Chimecap, Plinkstem, Chantleaf, Sighpetal, Thumpbulb; Calm: Humbloom, Tinglet, Whisperwort, Swellroot, Thrumsprout), the chosen tab filled; the seed on the palm goes back to the supply and the next palm-up brings the picked kind, in its colour and shape; each kind told apart by shape alone; planting never needs a pick; the Thrumsprout (hum) rated ≥3/5 by ear, else it is hidden again and nine kinds pass. Picking the kind the seed already has still sends it home (D-080 known limit: record, not a fail) |
| UAT-20 | P1 (D-081, FR-UI-03/04, FR-PER-03) | Seated at the table, open the board at arm's length and read Sound, Access and Garden; on the Garden tab, last in the run, a short pinch on **New garden**, then a 1.5 s hold, then Bring back | One grid: every label on the left, its control on the right, the info line first; switches read on or off; "Move" ("Garden spot"), "Exit" and "New garden" read without leaning in; the board stays inside ±25° × ±20°; its lower edge clears the table and the plants (about 3.8 cm above the table by the build's numbers; any overlap is a fail); New garden is last and red, a short pinch does nothing, the hold starts a new garden and Bring back returns the old one; readability rated ≥4/5 |

### 3.1 Stranger tests (UAT-16, UAT-17; T-166; hypotheses H12 and H13 of plan v2.1)
*Requires a headset and people from outside the team: unverified until run.*

- **Participants.** Five per test; the same five may do both, UAT-16 first. A first-time user has never seen SonicSpace, its video or its page and is not on the team. At least three are strangers to the team; the others may be friends or family who know nothing about it. A person is a first-time user once: a re-test after a fix needs new people. A participant is a code (P1..P5): no name, photo, voice or video of a person is kept, and nobody appears in the submission video (Golden Rule 8).
- **Rooms.** At least three different rooms over the five sessions, none of them a room the team tuned in: one bright and one dim; at least one with no scanned table; at least one session with the room permission declined (T-166). The tester sets these up beforehand and does not mention them.
- **Setup for every participant.** §2 steps 1–2 (controllers out of reach, site data cleared, so each starts a new garden). Note the build hash from `version.json`. The tester may fit the headset and bring up the page with the Enter button. From the tap on Enter the tester says nothing and points at nothing; the one allowed answer to any question is "do what feels right". Any other help makes the run "aided".

**UAT-16 (H12): the first 90 s, unaided.**
1. Say only: "Tap Enter and do what it shows you. I can't help you."
2. Start the stopwatch at the tap on Enter. Stop when three plants are playing, or at 90 s.
3. Record: time until in XR; time to first sound (target ≤ 20 s); time to three plants playing (limit ≤ 90 s); aided or unaided; where the participant hesitated or stopped (caption, seed, pinch, placement); placement level reached; the room (bright or dim, table or none, permission allowed or declined); used a headset before, used hand tracking before (yes/no).
4. A participant passes when first sound and a three-plant loop are both reached within 90 s of Enter, unaided.

**Threshold: ≥ 4 of 5 pass.** Fewer: a bug in BUG_LOG with the stopping points (S1 if a participant never reached a loop, else S2); fix, then re-test with new first-time users before G3. With fewer than five participants the result is reported as n of N, "below sample", never as a pass.

**UAT-17 (H13): is the change heard as the room's doing?** Run only if the room signature is built (S1); a Wanderer-only build records "not run (S1 not built)".
1. Two rooms per listener that give different results: the tester checks beforehand, on the same build, that the two signatures differ in at least one of key, scale and echo (the event log with `?dev=1&flags=eventLog`, read over USB remote debugging, or the "Tuned to:" read-out on the Sound tab of the Settings panel). Equal signatures: choose another room. Alternate which room comes first.
2. Room 1: the listener plants at least three seeds and listens for two bars or more. Rooms, tuning and the captions are not mentioned.
3. Room 2: the same headset and the same garden (site data not cleared). Enter; the bed is placed again and the garden re-tunes; the listener listens for two bars or more.
4. Ask one open question and nothing else: "Did anything change? If so, why do you think it changed?" Write the answer down word for word.
5. Only then ask: "What exactly sounded different?" This second answer never changes the count.
6. Record: both rooms (size, ceiling, table or none) and both signatures; the order; the answer word for word; attributed to the room, yes or no; the difference named (pitch or key, mood or scale, echo, other, none).

Counted as attributed: the first answer gives the room, the space, its size, its walls or ceiling, or "being in here" as the cause. Not counted: "it is random", "a new day", "I moved it", "it does that every time", "don't know", or hearing no change. The app's own cues (the ripple and its captions) are part of what is tested; the tester's words are not.

**Threshold: ≥ 3 of 5 attribute the change to the room.** Fewer: a finding for Parth, not a bug: the Devpost copy must not say that listeners hear the room as the cause, and by ADR-005 the mode rule is the first to become a constant. The tempo and table-height mappings stay out of the build either way; what listeners named is logged in DECISIONS_LOG as the evidence for or against them.

Sheets go under `specs/06-release/evidence/stranger-tests/`, tagged **D**.

## 4. Judging-criteria self-score (product-owner, after UAT-final)
| Criterion | Score /10 | Evidence |
|---|---|---|
| Innovation & Creativity | | |
| Experience Design | | |
| Technical Implementation | | |
| Polish & Presentation | | |
Target: ≥8 on each; if any <8, log a decision on whether to fix (S1 only after freeze) or accept.

## 5. Sign-off
| Role | Name | Date | Signature |
|---|---|---|---|
| Representative (human) | | | ☐ |
| product-owner | | | ☐ |
| qa-engineer | | | ☐ |
**Compliance gate (HACKATHON_RULES §10; T-184 asks 10/10).** Where UAT gives the evidence: C1 = UAT-01, 02 and 08 on the Quest 3, tagged D; C4 and C9 = UAT-09; C5 = UAT-06 on the Quest 3; C6 = UAT-01 from a clean headset (§10 names UAT-02: a slip, UAT-01 is the launch); C7 = UAT-10. Outside UAT: C2 `git log --reverse`, C3 THIRD_PARTY_LICENSES, C8 the screenshots (Chinmay's Start membership still pending, DECISIONS_PENDING 7.3), C10 the Devpost confirmation, which exists only after T-185 on 17 Nov: on 16 Nov the gate can reach 9/10.

Evidence (screen recordings, perf HUD captures, stopwatch times) saved under `specs/06-release/evidence/uat-final/`, each file tagged **D** (device, human report) or **E** (emulator). The sign-off table lists every criterion left *unverified* in Emergency mode.
