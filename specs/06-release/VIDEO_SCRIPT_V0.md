# Video Script v0 and Shot List (T-153)

**Status:** v0 · **Owner:** product-owner (copy), Chinmay + ux-designer (capture and cut) · **Date:** 2026-10-15 · Checked against `develop` at c9c523d.
**Feeds:** T-153 (rough cut by 31 Oct), T-181 (final cut, 13 and 14 Nov), T-182 (gallery stills come from these takes).
**Sources read:** SPRINT_PLAN T-153, T-181 and the feature rows · DEVPOST_DRAFT §1.1, §1.2, §3.5, §4, §5 · SUBMISSION_CHECKLIST §3 · HACKATHON_RULES §5.2, §10 C4 and C7, §11 · UX_WIREFRAMES §3.3, §3.5, §9.6 · LLD §5.8 (ripple table) · PRD §6 · D-027, D-048 · `tests/e2e/README.md` · `tests/fixtures/rooms/` · `src/core/flags.ts`.
**Relation to SUBMISSION_CHECKLIST §3.** That table is the earlier outline. This file replaces its beat order once Chinmay agrees (decision 1 in §5). Its capture rules still apply.

**Ground rules for every cut**
- 75 s (60 to 90 s allowed; the rule cap is under 3:00). Cuts land on a downbeat: one bar is 2.86 s at 84 BPM (`DEFAULT_TEMPO_BPM`), so a time code may move by up to half a bar.
- Captions are burned in, bottom centre, at least 48 px tall at 1080p, at most two lines, each on screen at least 1.5 s. Captions only, no voice-over (decision 2): the app's music is the product and the only sound in the video.
- No brands, logos, faces or people in frame: no browser bar, no emulator panel (it shows headset names and pictures), no desktop. The canvas only.
- `fakeDay`, `autoplant` and `skipOnboarding` work only in a dev build (`import.meta.env.DEV`; `src/core/flags.ts`). Capture from the dev server at the release commit. Each flag only stages a moment a judge can reach without it.
- Never shown or said: a feature that is not in the submitted build; "your table sets the key" (false in v1); any frame-rate figure from the emulator; "same room, same song" (unmeasured, DEVPOST_DRAFT §1.2).

Criteria: **IC** Innovation & Creativity · **ED** Experience Design · **TI** Technical Implementation · **PP** Polish & Presentation (25 % each). Special awards: **FFM** First Five Minutes · **RCB** Reason to Come Back · **AF** Accessibility Forward · **BOC** Boldest Original Concept.

---

## 1. The 75-second script (room signature in)

| # | Time | On screen | Caption (burned in) | Sound | Claim it proves → criterion |
|---|---|---|---|---|---|
| B1 | 0:00–0:10 | No title, no menu. Seated view of the glowing ring on the table, two plants already singing as the light sweeps round. A hand opens palm up, a seed glides onto it; the other hand pinches it, carries it over the ring, and the cell it will land in lights up; release; the sweep reaches the new plant within a bar and it sings. At 0:09.5 a ripple of light leaves the table. | 0:01 "Pinch. Plant. It sings." (plus the emulator line, §4) | The loop from the first frame: two plants (Pad, Bell), then the third (Pluck) joins on its first note | The whole loop, hands only, in under 10 s → ED, FFM; hands-first (Stage 1) |
| B2 | 0:10–0:20 | A new session in the same room. The tuning ripple crosses the table, climbs the nearest wall, sweeps the ceiling; the app's own captions show ("Table: colour.", "Walls: colour.", "Ceiling: scale."). The view follows it up, then back down to the bed, now re-tuned and playing. | 0:15 "Your room tunes it." · 0:17 "Floor size sets the key. Ceiling height, the scale. Room volume, the echo." | Three chord tones at 0.3, 1.5 and 2.7 s (root, third, fifth), then the garden in the room's key with its echo | The room's geometry chooses the music → IC, BOC; scene understanding used for a reason → TI |
| B3 | 0:20–0:32 | **Two rooms, two songs.** The same garden in a small room (desk against the wall, low ceiling), two bars; hard cut on the downbeat; the same garden in a large room (big table, high ceiling), two bars. A corner label on each. | 0:21 "Same garden. Different room. Different song." · labels "Small room: E minor, dry" then "Large room: A, open, long echo" | E minor pentatonic with a 0.3 s echo, then A open (sus) pentatonic with a 2.0 s echo; the large room's tail rings into the cut | The signature is real and audible, not a colour change → IC, BOC, TI |
| B4 | 0:32–0:44 | Back in the large room. A hand hovers over a plant (it glows: what a pinch will act on), pinches and pulls it up (it grows taller and louder), drags another one ring outward (a higher note), drags a third off the ring and lets go: it is gone, and the undo petal shrinks over 5 s. | 0:33 "Shape every voice with your hands." · 0:38 "No controllers." | The pulled plant louder and longer, the dragged plant's new pitch on its next step, a gap where the removed one was | Hands-only shaping, hover cue, undo → ED, TI; hands-first (Stage 1) |
| B5 | 0:44–0:54 | Both palms out, held. The room dims (never black), the bed glows up, the aurora halo rises over it; the sweep turns into a soft comet; the view lifts gently to take in the halo. | 0:46 "Then lean back and listen." | The garden performs: the Listen sweep, the nearest plants brought forward, voices spread left and right | A lean-back, music-visualization mode with spatial audio → Entertainment track fit (PP "clearly relevant to the track"), ED |
| B6 | 0:54–1:04 | The same garden, same framing: tag "Day 1", the plants bare, one bar. Hard cut: tag "Day 3". As the sweep reaches each plant, two leaf whorls unfurl on its stem; new seeds wait by the orb. | 0:58 "It grows while you are away." · 1:01 "A new seed every day." | Day 1 plain; day 3 each grown plant's first note carries the octave shimmer, so the growth is heard as it is seen | Saved, restored to its spot, and grown → RCB, ED, TI |
| B7 | 1:04–1:11 | Three short shots (about 2.3 s each), each with a small label: one hand takes the seed off its own palm and plants it; a head-aimed look-and-hold ring fills on the Listen orb and Listen starts; a room with no table, the bed floating in front of the player, still playing. | 1:04 "Built for every pair of hands." · labels "One hand", "Look and hold", "No table needed" | The garden carries on under the cuts; the dwell ring's tick | One-hand mode, gaze dwell, a fallback for rooms with no table → AF, ED, TI |
| B8 | 1:11–1:15 | End card over a dimmed still of the halo: "Roomsong", the tagline, the hosted URL in large type, the honesty line (§4). | "Roomsong" · "Every room has its own song." · `parthdalvi2001.github.io/Roomsong` (decision 3) | The last bar fades out on the room chord | A judge can open it now → Stage 1 (a working link), PP |

**YouTube chapters** (each at least 10 s; the first at 0:00): `0:00 Plant` · `0:10 Your room tunes it` · `0:20 Two rooms` · `0:32 Shape` · `0:44 Listen` · `0:54 Come back` · `1:04 Every pair of hands`.

**Changes from SUBMISSION_CHECKLIST §3, and why**
- Two rooms moves from 0:52 to 0:20, straight after the tune: WINNING_STRATEGY leads with the room signature, and the claim (B2) and its proof (B3) land as one idea before a judge's attention drops.
- Accessibility gets its own chapter (B7), aimed at Accessibility Forward; "Come back" (B6) keeps only day 1 against day 3.
- The URL card is the last 4 s, inside the last chapter, so no chapter is shorter than 10 s.

---

## 2. The version with no room signature (S1 cut at G2, T-155)

| Beat | Change |
|---|---|
| B1 | Unchanged except its last half second: no ripple; end on the third plant singing. |
| B2 + B3 → **B2'** (0:10–0:32) | **"Your first minute"**, one unedited take with a corner timer from the garden's first frame: the bed settles on the table (or, in a second short shot, look at a surface and pinch), "Open your hand", the seed glides in, pinch, plant, first note, three plants and a loop. Caption: "Unedited. First note at <N> s. A loop by <M> s." (numbers measured from the take; in the emulator say "emulator time"). Sound: the default ("Wanderer") tuning. Proves → ED, FFM, TI. Needs T-150 (onboarding). |
| B4 to B7 | Unchanged. |
| B8 | Tagline B: "A garden that grows every day you return." (DEVPOST_DRAFT §1.1, tagline B). |
| Chapters | `0:00 Plant` · `0:10 Your first minute` · `0:32 Shape` · `0:44 Listen` · `0:54 Come back` · `1:04 Every pair of hands`. |
| Words never used | "tunes", "room signature", "different room, different song", "echo of your room". |

If S3 (daily seed and growth) is also cut, B6 becomes "the same garden, restored to its spot the next day" (SUBMISSION_CHECKLIST §3) and its captions become "It is saved where you left it." The chapter keeps its name.

---

## 3. Shot list for emulator capture

### 3.1 What the emulator gives us today, and what it does not
- **No hands are drawn.** The app draws no hand or controller models (D-027: the SDK's models are switched off so nothing is fetched from a CDN, and passthrough shows the real hands on a headset). The emulator's hands are fixed shapes moved as a whole, with no joint animation (e2e README). Emulator footage today shows seeds and plants moving with **no hand at all**. Every shot that shows a pinch, a palm or a drag needs the hand cue of the capture rig (3.2).
- **No real room.** What the emulator draws behind the bed is its own synthetic room, built from our room fixture. The table will not look like a real table. Check what it draws in the rig; if it is only flat planes, that is the honest look of emulator footage and the captions say so (§4).
- **Room fixtures load only under Playwright.** The e2e helper (`tests/e2e/support/iwer.ts`) serves the fixture by answering the emulator's room download. There is no way yet to load a fixture in a browser by hand.
- **Too slow and silent for capture as it is.** Playwright's headless shell draws on a software renderer, too slow for 60 fps at 1080p, and Playwright's recorded video has no sound.
- **Anchors restore every time** (e2e README, quirk 5). For B3 the emulator's stored anchors must be cleared before the second room, or the bed restores to the first room's spot.

### 3.2 The capture rig (a proposal from DEVPOST_DRAFT §5; no task exists yet, decision 4)
Marked `[needs RIG]` below. It needs, in this order:
1. **A hand cue drawn for the recording only:** a dev-only flag (named in API_SPEC §3 before any code, the contract-first rule) that draws the emulated hand's 25 joints as plain procedural dots and lines. Original and local, so it keeps D-027 and Golden Rules 8 and 9; never in the production build. Use the emulator's own overlay instead only if it exists and keeps its panel out of frame.
2. **Fixtures in a headed browser with the GPU**, at 1920×1080 and 60 fps, with the room fixture served the same way the e2e helper does it.
3. **The app's own audio recorded clean** and in sync (a dev-only tap on the master output, or the system audio), never a microphone.
4. **Scripted head and hand paths** so every take repeats: the existing `palm-up.json` and `pinch.json`, plus the new paths named in 3.3.
5. **A clean frame:** the canvas only, one eye's view (not side-by-side stereo; check in the rig), no emulator panel, no browser bar.
6. **Clearing the emulator's stored anchors** between sessions on demand (for S03a and S03b).

### 3.3 Shots

Seated camera, unless a shot says otherwise: the head 0.46 m above the table top, the bed centre 0.45 m ahead, pitched down about 45°, the whole ring in frame. Head moves are scripted, eased, never faster than 40° a second. "Used" is the length in the cut; "take" is what to record (at least three takes each). The hero garden is grown in `sig-living-table` and kept in the same browser profile for every later shot; autoplanted plants are not saved until the next change (T-128e), so plant or shape one by hand before closing a take that later shots need.

| Shot | Beat | Room fixture | Flags | Hands | Camera | Used / take | Hand cue | Blocked by |
|---|---|---|---|---|---|---|---|---|
| S01 Plant | B1 | `sig-living-table` (A, open, 2.0 s; level-1 table) | `autoplant=2,skipOnboarding` (check a seed still comes to the palm) | Left palm up and held until the seed lands (`palm-up.json` pattern); right open, pinch the seed off the left palm, carry 15 cm to a free cell front-right, release (new path `plant-third`) | Seated, still | 10 s / 20 s | yes | `[needs T-128d]` `[needs RIG]` |
| S02 Tune | B2 | `sig-living-table`, the hero garden restored | none | none in frame | Starts on the bed; follows the ripple: up to the nearest wall by 1.5 s (pitch 0°, yaw to that wall, read from the fixture), the ceiling by 2.7 s (pitch +45°), back on the bed by 4.5 s; then still | 10 s / 15 s | no | `[needs T-142]` `[needs T-142b]` (chord tones) `[needs T-128d]` (`setSignature`) `[needs T-128e]` (restore; else `autoplant`) `[needs RIG]` |
| S03a Small room | B3 | `sig-small-desk` (E minor, 0.3 s; desk against the front wall) | none; stored anchors cleared first | none | Seated, still; the wall right behind the bed shows how small the room is | 6 s / whole session start, 15 s | no | `[needs T-128d]` `[needs T-128e]` (the same garden in a new room) `[needs RIG]` |
| S03b Large room | B3 | `sig-living-table` | none; stored anchors cleared first | none | Seated, pitched down 30° so the depth of the room shows | 6 s / 15 s | no | as S03a |
| S04 Shape | B4 | `sig-living-table`, hero garden of at least 6 plants | none | Right hand: hover over a Bell plant 2 s; pinch and pull up 6 cm (new `hover-pull`); pinch another and drag one ring outward (new `drag-ring`); pinch a third and drag past the ring's outer edge (0.30 m), release (new `drag-off`) | Seated, still | 12 s / 30 s | yes | `[needs T-128d]` (shaping in the app) `[needs RIG]`; the live audio preview (the part T-147 left, T-164) for the final cut only |
| S05 Listen | B5 | `sig-living-table`, at least 6 plants | none | Both palms out, held 1.5 s, then lowered out of frame (new `palms-out`) | Starts seated; tilts up to −15° as the halo rises, at most 10° a second; holds | 10 s / 30 s | yes (first 3 s) | `[needs T-148]` `[needs T-128d]` `[needs RIG]`; T-163 and T-164 for the final cut |
| S06a Day 1 | B6 | `sig-living-table`, hero garden all planted that day | none | none | Close: pitched down 50°, the ring fills about 70 % of the frame; exact pose saved for S06b | 4 s / 10 s | no | `[needs T-128d]` `[needs T-128e]` `[needs RIG]` |
| S06b Day 3 | B6 | same profile, reloaded | `fakeDay=+3` (stage 2: two whorls; two days later shows only one) | none | the same pose as S06a, to the centimetre | 6 s / 10 s | no | `[needs T-128e]` (the visit and growth at session start) `[needs RIG]` |
| S07a One hand | B7 | `sig-living-table` | one-hand mode on (the panel or the landing switch) | One hand: palm up, the seed lands, the same hand pinches it off its own palm (D-048), carries and plants (new `one-hand`) | Seated, still | 2.3 s / 10 s | yes | `[needs T-160]` `[needs T-128d]` `[needs RIG]` |
| S07b Look and hold | B7 | `sig-living-table` | gaze dwell on | none | Head turns to the Listen orb and holds until the ring fills and Listen starts | 2.3 s / 10 s | no | `[needs T-160]` `[needs T-148]` `[needs RIG]` |
| S07c No table | B7 | `none` (no planes: the bed floats, default tuning) | none | none | Seated; the bed in front at its floating height | 2.3 s / 20 s (includes the wait before it floats) | no | `[needs T-128d]` (sound) `[needs RIG]`; placement itself is done (T-128c) |
| S08 End card | B8 | none (made in the editor over a still from S05) | none | none | none | 4 s | no | `[needs T-108]` for the live URL; S05 for the still |
| S02' First minute (no-signature version only) | B2' | `table` (level-1 table) | none (onboarding on) | `palm-up` then `plant-third` timed as a first-time player | Seated, still, one continuous take | 22 s / 60 s | yes | `[needs T-150]` `[needs T-128d]` `[needs RIG]` |

**What unblocks what.** Nothing in XR can be shot usefully today: every shot needs the RIG, and the loop needs T-128d (in progress). Once both are in: S01, S04, S07c. Then T-142 and T-142b: S02. T-128e: S03a, S03b, S06a, S06b. T-148: S05. T-160: S07a, S07b. T-108: the real URL on S08. **For the rough cut (31 Oct),** a shot that is still blocked goes in as a black slate of its exact length, with the beat name and its `[needs T-nnn]`, so the timing of the cut is real from v0.

---

## 4. What the screen must say about emulator footage (Golden Rule 11; HACKATHON_RULES §10 C7)

1. **First emulator shot (0:00 to 0:04), bottom left, at least 32 px:** "Recorded in the Immersive Web Emulator. No headset yet." It stays 4 s and never covers the caption of B1.
2. **A small corner tag on every emulator shot** for the rest of the video: "Emulator". In a cut that mixes in headset footage, every shot carries its source: "Emulator" or "On headset".
3. **The first shot with the hand cue:** "Hand drawn for this recording. On a headset you see your own hands."
4. **B3 labels** say the rooms are test rooms: "Emulated small room" and "Emulated large room", before the key and echo.
5. **B6 day-3 tag:** "Day 3 (days skipped with a test switch)". The switch is a dev flag; the growth it shows is the growth a returning player gets.
6. **End card, below the URL:** "Recorded in an emulator. Not yet tested on a headset. See the description." If a headset arrives, it becomes what is true: "Recorded on Quest 3 / emulator. Tested on a headset in <N> rooms." The wording matches the Devpost "Known limitations" line word for word (DEVPOST_DRAFT §1.2).
7. **The YouTube description** repeats it in one sentence above the chapters: "All footage was recorded in the Immersive Web Emulator with emulated hands and rooms; the hands are drawn for the recording; nothing was tested on a headset." It also carries the URL, the chapter list and "No AI-generated footage; all sound is the app's own."
8. **Never on screen from emulator footage:** a frame-rate figure, "runs smoothly on Quest", "tested in real rooms", a real room's name or photo, or any number not measured in the final build.

---

## 5. Decisions for Parth and Chinmay

1. **Beat order (Chinmay):** two rooms at 0:20, right after the tune, instead of 0:52 (SUBMISSION_CHECKLIST §3). Recommended.
2. **Captions only, no voice-over (Chinmay):** keeps the app's music the only sound and keeps a team member's voice out. Recommended.
3. **The URL on the end card (Parth and Chinmay):** `parthdalvi2001.github.io/Roomsong` shows a host's name and a person's handle on screen. The rules require a link, and judges type it, so the recommendation is to show it; the other choice is "Link in the description" only, which breaks T-181's "hosted URL at the end".
4. **The capture rig (Parth):** a proposal only; no task exists. Proposed: a new task, ux-designer + qa-engineer, the flag named in API_SPEC §3 first, done by 24 Oct so T-153 can shoot from 26 Oct. Without it, B1, B4, B5 and B7a show seeds moving with no hand.
5. **The hero room (Parth, a listening call):** `sig-living-table` has a 2.0 s echo, which may blur the first 10 s. If it does, shoot B1 and B4 in `sig-kitchen-counter` (D major, 0.6 s) and keep the living room for B3, B5 and B8.
