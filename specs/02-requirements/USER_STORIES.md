# User Stories & Use Cases — Roomsong

**Status:** Approved · **Owner:** product-owner · **Version:** 2.1 (2026-10-10, plan v2.1 propagated by T-113: D-019–D-028, see `08-status/PLAN_AMENDMENT_2026-10-10.md` §6; v2.0 D-010/D-011, see `08-status/REPLAN_2026-10-10.md`)
Format: `US-xx` · *As a … I want … so that …* · Acceptance criteria (Given/When/Then) · Links to SRS IDs · Priority (M/S/C per PRD §6 v2).
IDs are stable: cut stories stay in place marked *Cut (D-011)*. Device behaviour in any story is unverified until a headset exists (UC-6); the emulator verifies logic and timing only.

---

## Epic E1 — Start & Place (First Five Minutes)

**US-01 Enter with hands only** (M) — FR-SYS-01, FR-HND-01
*As a judge, I want to open the link and be in the garden with my hands in seconds, so that I never think about controllers.*
- Given a Quest 3 with hand tracking enabled, when I open the URL and tap Enter, then within 5 s I see passthrough, my own real hands (the app draws no hand models, D-027), and the bed appearing.
- Given no controllers paired, then every later step is completable.

**US-02 Bed finds my table** (M) — FR-ROOM-01..03
*As a player, I want the garden to appear on the table in front of me, so that it feels part of my room.*
- Given a detected table plane within 1.2 m, then the bed (annulus 0.12–0.30 m) is centred on it within 3 s, 0.35–0.45 m ahead of the head (default 0.45 m, D-020), so the far edge is ≤0.75 m reach.
- Given no table but a counter at 0.9 m, then the bed uses it.
- Given no planes, then a gaze hit-test preview appears and a pinch places it; after 10 s with no pinch, a floating bed appears.
- Given nothing works, then a floating bed appears and the experience proceeds.

**US-03 First seed, first sound** (M) — FR-HND-05, FR-HND-16, FR-UI-01, FR-UI-02
*As a new player, I want to make a sound within 20 seconds without reading, so that I immediately understand.*
- Given the bed is placed, when I turn my palm up, then a seed lands in my palm and a one-line caption says "Pinch, and plant it."
- When I hold the pinched seed over the bed, then the cell that will get the plant is highlighted before I let go (hover cue, FR-HND-16).
- When I release over the bed, then the plant grows in on that highlighted cell, one of the 80 cells (5 rings × 16 steps), and sings when the tide next crosses it.
- Then ≤20 s elapsed since Enter (measured in UAT; on device once a headset exists, in the emulator until then).

**US-04 Three plants make a loop** (M) — FR-MUS-01..03
- Given one plant, then two more seeds arrive automatically (different voices); after the third plant, guides fade and the loop plays continuously.
- Given first-time users with no help, then at least 4 of 5 reach first sound and this 3-plant loop within the first 90 s (stranger test UAT-16).

## Epic E2 — Shape the garden

**US-05 Grow a plant** (M) — FR-HND-08, FR-MUS-05
- Given a plant, when I pinch it and pull up 10 cm, then its height rises by 0.4 from the height it had (10 cm of the 25 cm range, clamped at 1; FR-HND-08), its visual grows, and its sound is louder with a longer tail.
- Given a pull, then the plant never changes cell, and the height I see while pulling is the height that is saved on release.

**US-06 Recolour a voice** — *Cut (D-011)* — FR-HND-09 (Cut)
*Reason: wrist twist is the least reliable hand-tracking gesture, is impossible one-handed-while-pinching and via gaze-dwell, and hue is not load-bearing for any judging criterion. Hue is fixed at seed creation; a settings control is C3.*

**US-07 Move a plant** (M) — FR-HND-10, FR-HND-16
- When I drag a plant 2+ cm (mostly sideways; the larger direction of the first 2 cm decides drag or pull) and release, then it lands on the highlighted cell: the nearest cell, and if that is occupied, the nearest free cell with a soft "bump" sound.

**US-08 Remove with undo** (M) — FR-HND-11, FR-MUS-12
*(v2: flick replaced by drag-off; no velocity threshold, works one-handed and by gaze-dwell.)*
- When I drag a plant and release it with the pinch position more than 5 cm beyond the bed's outer edge (sideways or towards me; the far side is beyond reach), then it dissolves into petals with a short reverse sound and a glowing undo petal remains for 5 s; pinching it restores the plant to its exact cell, height and hue.
- When I release a plant anywhere on the bed, then it is never removed (it re-snaps per US-07). When I release it more than 3 cm inside the centre hole, then it returns to its own cell (FR-HND-10). *(The v2.0 "centre hole removes" wording is corrected to match SRS and the contract.)*
- Given reduced motion, then the petal dissolve is a fade.

**US-09 Change tempo** (S) — FR-MUS-03, Settings Sound tab
- When I set tempo to 60, then the tide slows and all scheduled notes follow without glitches.
- Given any room, then the tempo is the one I set (default 84 BPM, range 60–120); the room never changes it (D-021).

## Epic E3 — Listen (the payoff)

**US-10 Lean back and listen** (M) — FR-HND-06, FR-HND-07, FR-ROOM-04, FR-MUS-06, FR-UI-11
- When I hold both palms out for 1.5 s, or pinch/dwell on the Listen orb, then lights dim, an aurora halo rises over the bed, and each plant's sound comes from its position (equal-power panning with the listener at my head, FR-MUS-06), in the echo my room set.
- Given any room, then the halo alone is the complete experience. Vines of light toward the nearest wall are Could (C4; was S2, D-021) and appear only if built.
- Given any tempo, then nothing in the scene flashes more than 3 times per second (FR-UI-11).
- When I pinch or face my palm toward me, then Listen mode exits within 500 ms.
- Given 10 minutes in Listen mode, then it ends by itself with a gentle chord.

**US-11 It keeps evolving** (C — C1) — FR-MUS-11
- Given Listen mode for 2 minutes, then at least 3 variations have occurred (log shows them), and nothing clips (limiter).

## Epic E4 — Come back tomorrow

**US-12 My garden is still here** (M — M5, anchor included; the anchor was S4, D-021) — FR-PER-01, FR-ROOM-07
- Given I planted yesterday, when I return, then the garden (every plant's cell, height, hue, age) restores from local save within 4 s (M5).
- Given persistent anchors are supported and the saved anchor resolves within 4 s, then the bed returns to the same physical spot and keeps its room signature (FR-ROOM-07).
- Given anchors are unsupported or the anchor does not resolve, then the bed is re-placed on the table by the fallback chain with the garden kept, and a new anchor is made in the background; this is a complete experience, not an error. *(Restore reliability is unverified until the device test T-129.)*
- Given I return in a different room, then the garden is preserved and re-placed by the fallback chain (and re-tuned, US-23).

**US-13 It grew overnight and I got a seed** (S — S3) — FR-MUS-08, FR-MUS-09
- Given 24 h passed, then plants show stage-1 growth (stages at 1/3/7 days), an octave shimmer is audible for plants ≥3 days old, and exactly one new seed is waiting.
- Given the `fakeDay` flag, then any day can be shown for the video.

**US-14 Seasons** — *Cut (D-011)* — FR-MUS-10 (Cut)
*Reason: the room signature (US-22) now decides the musical mode; a calendar-driven mode would fight it, and a judge cannot see a weekly change in a 10-minute session.*

## Epic E5 — Accessible for every pair of hands

**US-15 One hand only** (M) — FR-UI-09
- Given one-hand mode on, then Listen mode is enterable with one palm or the Listen orb, and every story above passes with one hand.

**US-16 Eyes only** (M) — FR-HND-12
*(v2: gaze-dwell = select + Listen; no sliders. Dwell sliders for pull are C2.)*
- Given gaze-dwell mode, then I can place the bed (hit-test preview + dwell), select a plant, and enter and exit Listen mode using head gaze and dwell only, with no pinch.
- Given gaze-dwell mode, then every settings control is a toggle or stepper reachable by dwell (no sliders).
- Given gaze-dwell mode, then the dwell time is 900 ms by default and can be set to 600 or 1200 ms (FR-HND-12).
- Given gaze-dwell mode, then a full session (bed placed, seeds auto-planted into free cells on dwell-select of the bed, Listen mode) is completable with no hand tracking at all.

**US-17 See the beat** (M) — FR-UI-07, FR-UI-11
- Given sound off, then I can still tell which plant plays when, from the beat ring and flashes.
- Given any tempo up to 120 BPM, then no element changes brightness more than 3 times per second (FR-UI-11); above 90 BPM anything that pulses per beat pulses on every second beat.

**US-18 High contrast / reduced motion** (M) — FR-UI-05, FR-UI-06
- Given high contrast, then captions reach 7:1 and all targets have outlines. Given reduced motion, then no parallax effects, the halo/vines fade instead of growing, and the tuning ripple becomes a glow sequence (US-22).

## Epic E6 — Robust & fast

**US-19 60+ fps always** (M) — NFR-PERF-01 — **requires headset (none yet; see UC-6)**
- Given 24 plants, Listen mode, halo (and vines if present), then the perf HUD shows ≥72 fps for 10 minutes on Quest 3, never below 60.
- Until a headset exists: given the same scene in the emulator, then draw calls, triangles and JS ms per frame stay within the HLD §7 budgets (a proxy, not a pass).

**US-20 Pause and resume** (M) — FR-SYS-05
- When I press the Quest button and come back, then audio fades out/in and the tide continues from where it was.

## Epic E7 — Submission

**US-21 Judge can test it** (M) — HACKATHON_RULES §5
- Given the Devpost link, when a judge opens it on a clean headset, then it works with no login and matches the video.
- Given the two links in the description (GitHub Pages, the submitted URL, and its mirror; D-022), then both serve the same build hash.
- Given the video was recorded from the emulator (Emergency mode), then the description says so and claims nothing that was not device-tested.

## Epic E8 — Your room has its own song (S1, D-010; gated on device spike T-104)

**US-22 The room tunes my garden** (S — S1) — FR-ROOM-10, FR-ROOM-11, FR-ROOM-12
*As a player, I want my room to decide how my garden sounds, so that the song feels like it belongs to this place and not to a menu.*
- Given the bed is placed and room features are available, when the session starts, then a room signature is computed by a pure function and applied before the first seed appears. In v1 the room sets exactly three things (FR-ROOM-11, D-021): the **key root** from the floor area (a bigger room has a lower root), the **mode** from the ceiling height (major, minor or sus pentatonic) and the **echo** from the room volume (six steps, 0.3–2.0 s; FR-ROOM-06).
- Given any room, then the room does not change the tempo, and the table does not set the key: table and wall measurements only pick the starter seeds of a new garden and the colour tint.
- Given the same room measured twice with up to ±5 cm (lengths) or ±0.3 m² (areas) of noise, and no measurement within that tolerance of a bucket boundary, then the signature is identical; only a measurement on a boundary may flip one step (FR-ROOM-11).
- Given the same room entered facing a different way, then the room features are identical (FR-ROOM-10).
- When the signature is applied, then within 5 s of placement a tuning ripple crosses the table, then the nearest wall, then the ceiling (each detected surface in turn), each surface rings one note of the room chord in sequence, and each shows a caption of at most 3 words that names the surface and is true for v1 (FR-ROOM-12). No caption says a surface set the key or the echo.
- Given reduced motion, then surfaces glow in sequence without the sweep, and the notes and captions still play.
- Given detection level ≥3 or no feature known, then the "Wanderer" signature applies (C major pentatonic, 84 BPM, 0.9 s medium reverb, Bell/Pad/Pluck) and a single chord plays over the bed with no caption; the experience never blocks.
- Given the Sound tab, then a short "Tuned by" line shows what the room set and from what (for example "D major · echo 0.6 s · room 15 m², ceiling 2.7 m") so the result reads as caused, not random.

**US-23 Different room, different song** (S — S1) — FR-ROOM-13, FR-PER-01
*As a returning player, I want the same garden to re-tune itself when I take it to another room, so that there is a reason to carry it with me.*
- Given a saved garden, when I start a session in a room with a different signature, then every plant keeps its cell, height and hue, pitches follow the new key and mode, the echo follows the new room, the tempo does not change, and the tuning ripple plays.
- Given the same room as last time, then the song is unchanged (the same signature) and the ripple plays as it does in every session. *(The v2.0 "short confirming ripple" is dropped: the signature is never stored, so two sessions are not compared; FR-ROOM-13.)*
- Given three distinct rooms (the fixture rooms of LLD §5.8: a small desk room, a kitchen counter, a living-room table), then three signatures result that differ in key root, mode or echo (TC-SIG-03).
- Given listeners who hear the same garden in two different rooms and are not told why it changed, then at least 3 of 5 attribute the change to the room (stranger test UAT-17). If they do not, the mode rule is the first to become a constant (ADR-005).
- Given the `forceSignature=wanderer` flag, then the Wanderer signature is applied regardless of room (for the video and for tests).

## Epic E9 — No headset needed to try it (S6, D-021)

**US-24 Garden window** (S — S6) — FR-SYS-07
*As someone without a headset I can open the link in a normal browser and plant with the mouse, so I can try or demo the garden.*
- Given a browser with no `immersive-ar` support (or `?flags=window` in dev), when I open the link and click Enter, then the same garden appears on a virtual table under a fixed camera, with sound.
- When I click or tap an empty cell, then a seed is planted there and sounds on the next sweep (TC-E2E-14).
- Then I can drag a plant to move it, drag it off the bed to remove it, click the undo petal to restore it, and click the centre orb to listen; the garden is saved as on a headset.
- Given a mouse or a touch, then I cannot change a plant's height (a pointer on the bed has no up or down) and cannot open the settings panel in v1 (LLD §11); the page says so.
- Given the garden window, then the room does not tune the song (Wanderer), and it is never presented as the judged experience.

---

## Use cases (narrative)

### UC-1 "The bus-stop moment" (≤10 min)
Primary actor: Unwinder. Precondition: returning user. Flow: Enter (3 s) → garden restores (bloom) → today's seed → plant it where it feels right → tweak two plants → palms out → listen 4 min → remove headset. Postcondition: state saved; growth timestamp updated. Success: a complete, satisfying moment in 6–8 minutes.

### UC-2 "The judge's room" (untested room)
Primary actor: Judge. Precondition: unknown room, possibly no Space Setup. Flow: Enter → no table plane → hit-test preview on the desk → pinch → bed placed → **tuning ripple** (if planes exist: table, then wall, then ceiling each ring a note of the room chord within 5 s, each with its short caption; if not: the Wanderer chord plays once over the bed) → onboarding → first sound at 15 s → explores shaping (pull, drag, drag-off + undo) → palms out → no walls detected → aurora halo → exits. Success: no dead ends, no text walls, the Tune beat reads as "my room tuned this", 72 fps throughout (device-verified only once a headset exists).

### UC-3 "Limited mobility, one hand, eyes"
Primary actor: Accessibility-first player. Precondition: gaze-dwell + one-hand on (settable from the 2D page before entering, and in-XR). Flow: everything via dwell. Success: full loop and Listen mode reachable without a pinch.

### UC-4 "Hand tracking lost mid-pinch"
Flow (FR-HND-15): tracking drops while dragging → a hint shows at once and the plant freezes for 200 ms → tracking back in time: the drag continues → otherwise the plant glides back to its cell over 150 ms (a carried seed returns to the supply, a pulled plant to its earlier height), selection clears, no audio artefacts → tracking resumes → the hint goes, normal. Success: no crash, state consistent (NFR-REL-02; TC-HND-07, TC-E2E-16). Real tracking loss is device-only; the emulator test uses a hand-loss fixture.

### UC-5 "Corrupt save"
Flow: IndexedDB record fails schema validation → backup copy written → new garden starts with a one-line notice → no crash (FR-PER-02).

### UC-6 "No headset on the team" (process use case; REPLAN §1, §6)
Primary actor: the team. Precondition: no Quest headset in hand (true on 2026-10-10); acquisition is T-000.
Flow (emulator-first verification): every story is built and verified in the emulator (IWER + Immersive Web Emulator extension, Playwright e2e) against emulator budgets (draw calls, triangles, JS ms) → the device-capability spike page (T-104: planes, labels, hit-test, anchors available in Quest Browser?) and the pinch-accuracy page (T-105: 3/4/5 cm grids, ≥90% first-try) are **built and ready** → the day a headset arrives they run first, then the device checks of G1 → if no headset by 2026-10-27, Emergency mode: the video is recorded from the emulator (allowed by the rules; device footage strongly preferred) and the Devpost description states what was device-tested → if no headset by 2026-11-08, the human decides submit-anyway vs withdraw.
**What stays unverified without a headset:** US-19 fps (M7), real pinch accuracy and hit radius (cell size), palms-out/wake pose reliability, plane and label availability (the gate for S1, US-22/23), persistent-anchor restore (M5), real tracking loss and joint jitter (FR-HND-15), whether the platform delivers `select` events for hands (FR-HND-02), behaviour in untested rooms (6-room matrix) and the stranger tests UAT-16/17, Quest 3S narrower-FoV layout, cold-start time on device, and the compliance gate items C1, C5 and C7 that require device evidence.
Success: nothing in the backlog is marked Done-on-device without device evidence; PROGRESS.md carries a visible "unverified on device" list until it is empty.
