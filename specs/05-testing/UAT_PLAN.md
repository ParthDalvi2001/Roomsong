# User Acceptance Testing (UAT) Plan — Roomsong

**Status:** Approved · **Owner:** qa-engineer · **Sign-off:** the human (Representative) and product-owner · **Version:** 1.2 (2026-10-10, plan v2.1 propagated by T-113: `08-status/PLAN_AMENDMENT_2026-10-10.md` §6, D-019–D-028)
UAT mirrors **how judges will test**: an unknown room, a clean headset, ≤10 minutes, hands only, then the video and the Devpost page.

> **No headset on the team as of 2026-10-10** (REPLAN §1; acquisition = T-000, H1 = Oct 20, Emergency mode if none by Oct 27). Every scenario below that says "headset", "room", "fps" or "feel" is **unverified until a human runs it on a real Quest**. The emulator can rehearse the flows and events but cannot sign off a device criterion; see TEST_PLAN §1.1 and the Emergency-mode variant in §2.1 below. Plan v2.1 adds two stranger tests (UAT-16, UAT-17; §3.1): they need a headset and people from outside the team, and nothing about them is verified today.

---

## 1. When
- UAT-dry-run: end of Phase 3 (2026-11-11, before the G3 feature freeze) on a preview of the `develop` build opened on the headset over Wi-Fi (`npm run build`, `npm run preview`; this route is not yet checked on a headset), or on the hosted site if it already carries that build; in the emulator if there is no headset. *"On staging": replaced; the site is published from `main` only (D-022).*
- UAT-final: 2026-11-16 (clean-headset UAT, REPLAN §6 Phase 4) on the **production URL** after code freeze (GitHub Pages, D-022; `version.json` must name the release commit; UAT-01 once more on the mirror). Only S1 fixes allowed afterwards (re-run affected scenarios).
- Stranger tests UAT-16 and UAT-17 (T-166): during Phase 3 (Nov 4–11), before the G3 feature freeze, so that a missed threshold can still change the build.

## 2. Setup for every UAT run
1. Quest 3 (and 3S if available), hand tracking on, **controllers out of reach** — *when a headset is available*.
2. Quest Browser → Settings → clear site data for the app origin (simulates a judge's first run).
3. Use a room the team has **not** tuned in (ask a friend's room, or rearrange furniture). Do at least one run without Space Setup.
4. Start a stopwatch at the moment you tap Enter.

### 2.1 Emergency-mode variant (no headset by 2026-10-27, REPLAN §6)
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
| UAT-01 | P0 | Open link, tap Enter, follow only what the app shows | In XR ≤5 s; first sound ≤20 s; three plants playing ≤90 s; never needed a controller or text |
| UAT-02 | P0 | Explore shaping with no hints beyond the app's own icons; then hide a hand in the middle of a drag | **Pull** (height), **drag** (move to another cell), **drag off the bed** (remove), **undo** (petal within 5 s) all discovered or triggered within 3 min; each works first try ≥9/10 (twist/flick *Cut (D-011)*); the highlighted cell is the cell the plant lands in (hover cue, FR-HND-16); with the hand hidden a hint shows and the plant returns to its cell, nothing lost or doubled (FR-HND-15) |
| UAT-03 | P0 | Rest hands / palms out, or pinch the Listen orb | Listen mode in ≤2 s; dim; **aurora halo** over the bed by default: the halo alone is a pass; vines to a real wall when walls are detected (*Could C4, D-021; was Should S2: only if built*); sound localised to plants; exit by pinch |
| UAT-04 | P0 (**Must**, M5, D-021) | Leave XR, return later (same room): once after reloading the page, once after closing the browser | Garden restores **in place from the persistent anchor** ≤4 s, in the same key and scale as before; growth/seed logic sensible. If the anchor does not come back, the bed is re-placed by the fallback chain with every plant kept: still a pass for this scenario, recorded as "re-placed", and the restore count n/N goes into the evidence and the Devpost limitations. A lost, emptied or doubled garden is a fail |
| UAT-05 | P0 | Run in a room with **no table** and no Space Setup | Hit-test or floating bed; full loop playable; nothing feels broken |
| UAT-06 | P0 | 10-minute session with ≥20 plants + Listen | No crash; fps HUD never <60 (dev flag run), typical ≥72; no audio clicks |
| UAT-07 | P0 | Pause with the Quest button for 30 s, resume | Audio fades/returns; tide continues; state intact |
| UAT-08 | P0 | Accessibility: one-hand mode; then gaze-dwell mode | Full loop + Listen in each mode with no pinch (gaze) / one hand |
| UAT-09 | P0 | Content & policy sweep (watch for text, logos, people) | None present; all text English; nothing above 10+ |
| UAT-10 | P0 | Open the Devpost page and the video on a laptop as a judge | Video 60–90 s (the rule cap is <3:00), public, honest footage (emulator shots captioned as such); description ≤500 words, matches the build; the GitHub Pages link and the mirror both work and show the same build hash (`version.json`) |
| UAT-11 | P1 | High contrast + reduced motion | Readable captions (7:1), outlines, no parallax, the tuning ripple glows in sequence instead of sweeping, vines fade (only if vines are built) |
| UAT-12 | P1 | Controllers (bonus) | *Cut (D-011)* — controller support removed from scope |
| UAT-13 | P1 | Quest 3S | UAT-01, 03, 06 pass |
| UAT-14 | P1 | "Would I come back tomorrow?" | Human rating ≥4/5 after UAT-03 |
| UAT-15 | P1 (Should S1, gated on TC-DEV-0A) | Place the bed; then repeat in a second, different room (different in size or ceiling height); then once more in the first room | Tuning ripple crosses the table/wall/ceiling and is **audible ≤5 s** after placement, with one short caption naming each surface; the two rooms give an **audibly distinct key, scale or echo** (tester names the difference unprompted; *"key/tempo": replaced, D-021: the room does not set the tempo*); re-entering room 1 re-tunes the garden in place with no plant moved and gives the same key and scale as the first time (the echo may sit one step off in a room near a boundary: record it) |
| UAT-16 | P0 (FR-UI-02, M6) | **Stranger test H12** (§3.1): five first-time users, one at a time, are told only "tap Enter and do what it shows you" | **≥ 4 of 5** reach first sound and a 3-plant loop within the first 90 s, unaided |
| UAT-17 | P1 (Should S1; only if the room signature is built) | **Stranger test H13** (§3.1): each listener hears the same garden in two different rooms and is not told why it changed | **≥ 3 of 5** attribute the change in the song to the room, in their own words |

### 3.1 Stranger tests (UAT-16, UAT-17; T-166; hypotheses H12 and H13 of plan v2.1)
*Requires a headset and people from outside the team: unverified until run.*

- **Participants.** Five per test; the same five may do both, UAT-16 first. A first-time user has never seen Roomsong, its video or its page and is not on the team. At least three are strangers to the team; the others may be friends or family who know nothing about it. A person is a first-time user once: a re-test after a fix needs new people. A participant is a code (P1..P5): no name, photo, voice or video of a person is kept, and nobody appears in the submission video (Golden Rule 8).
- **Rooms.** At least three different rooms over the five sessions, none of them a room the team tuned in: one bright and one dim; at least one with no scanned table; at least one session with the room permission declined (T-166). The tester sets these up beforehand and does not mention them.
- **Setup for every participant.** §2 steps 1–2 (controllers out of reach, site data cleared, so each starts a new garden). Note the build hash from `version.json`. The tester may fit the headset and bring up the page with the Enter button. From the tap on Enter the tester says nothing and points at nothing; the one allowed answer to any question is "do what feels right". Any other help makes the run "aided".

**UAT-16 (H12): the first 90 s, unaided.**
1. Say only: "Tap Enter and do what it shows you. I can't help you."
2. Start the stopwatch at the tap on Enter. Stop when three plants are playing, or at 90 s.
3. Record: time until in XR; time to first sound (target ≤ 20 s); time to three plants playing (limit ≤ 90 s); aided or unaided; where the participant hesitated or stopped (caption, seed, pinch, placement); placement level reached; the room (bright or dim, table or none, permission allowed or declined); used a headset before, used hand tracking before (yes/no).
4. A participant passes when first sound and a three-plant loop are both reached within 90 s of Enter, unaided.

**Threshold: ≥ 4 of 5 pass.** Fewer: a bug in BUG_LOG with the stopping points (S1 if a participant never reached a loop, else S2); fix, then re-test with new first-time users before G3. With fewer than five participants the result is reported as n of N, "below sample", never as a pass.

**UAT-17 (H13): is the change heard as the room's doing?** Run only if the room signature is built (S1); a Wanderer-only build records "not run (S1 not built)".
1. Two rooms per listener that give different results: the tester checks beforehand, on the same build, that the two signatures differ in at least one of key, scale and echo (the event log with `?dev=1&flags=eventLog`, read over USB remote debugging, or the Garden line of the Settings panel). Equal signatures: choose another room. Alternate which room comes first.
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
Evidence (screen recordings, perf HUD captures, stopwatch times) saved under `specs/06-release/evidence/uat-final/`, each file tagged **D** (device, human report) or **E** (emulator). The sign-off table lists every criterion left *unverified* in Emergency mode.
