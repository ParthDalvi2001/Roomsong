# Decisions waiting for Parth

**The one file for every open decision** (25 Oct 2026; replaces PROGRESS "Blocked on human" items 1, 3, 5, 22, 27, 28, 33–45, the G1 review's decision list and `DECISIONS_FOR_PARTH_2026-10-25.md`). Answered decisions move to `DECISIONS_LOG.md`.

**How to answer:** one message with the number and your pick, for example `1 a, 2 a, 3 a Chinmay, 4 c, 5 b`. Write your own answer anywhere instead of a letter. ★ marks my recommendation.
**Fastest:** reply `all recommended` to take every ★ at once (you can still override single ones, e.g. `all recommended, but 5 a`).

---

## Urgent (this week)

## 1. Restart the Mac
**Why:** the Mac is out of memory (swap 27 of 27.6 GB). Tests take up to 30× longer and fail at random, so I cannot verify or push safely.
- a) ★ Restart the Mac now. The agents' work is saved in their own folders; I resume them afterwards.
- b) Close the busy Chrome tab (90 % of one core for 16 hours), or quit Chrome, and try again.
- c) Leave it; I keep working on documents only.

## 2. Put the game online (GitHub Pages)
**Why:** the link answers "404 not found" today. Judges, the Playtest session (3) and the video's end card all need a live link. You do the clicks; I push.
- a) ★ Yes, this week, with the copy (mirror) on **Netlify**. Steps: you say "push develop" → GitHub → Settings → Pages → Source: **GitHub Actions** → I merge to `main` → you check the Actions tab is green. About 10 minutes.
- b) Yes, with the mirror on **Vercel** instead.
- c) Not yet (the risk: the workflows have never run on GitHub; a first failure close to the deadline costs days).

## 3. "Playtest & React" (Devpost's online session where other developers play each game on their own Quest)
**Why:** with no headset of our own, this is the only real-headset play we can get before the freeze. It needs the link live (2) and a Meta Start member in the room.
- a) ★ Yes, **29 Oct, 22:30 IST**, Chinmay attends.
- b) Yes, **27 Oct, 18:30 IST** (needs the link live within 2 days).
- c) No.

## 4. The headset
**Why:** frame rate, hand feel and room tuning cannot be checked without one. On **27 Oct** the plan switches itself to "Emergency mode" (simulator only, and the submission says so honestly).
- a) ★ Borrow a Quest 3 or 3S for one afternoon before **3 Nov** (write the date). The 1-hour test script is ready.
- b) Buy a Quest 3S (costs money; your call).
- c) No headset: Emergency mode from 27 Oct.

## 5. The sound style
**Why:** the app plays today's sound until you pick, and today's sound is the one you called boring. All three styles now have the groove, echo, moving chords and a soft answering melody (the counter-line) with small variations.
How to listen: after the restart open https://localhost:8093/proto/styles/ in Chrome (Advanced → Proceed), tick "full garden", press Play, switch A / B / C.
- a) A: soft and warm (the bass a little over the bell).
- b) ★ B: bright and glassy; bass and bell are level by measurement, the most even mix. Your ear decides: pick by listening.
- c) C: deep and ambient (the bass 5 dB over the bell).
- d) Keep today's sound.
Also say "boring" or "not boring" for the one you pick.

---

## The look and the words

## 6. Plant colours
- a) ★ A: plants on the design's arc (gold → moss → ice → violet), shifted a little per room. Costs nothing to draw.
- b) B: keep today's full colour wheel (pinks and reds; every room looks the same).
- c) C: only the five named colours (too few for 80 plants).

## 7. The ripple captions "Table: colour." / "Walls: colour."
**Why:** nothing tints the room, so the captions promise something that does not happen.
- a) ★ Honest words now: "Table: a note." / "Walls: a note." ("Table: seeds." and "Ceiling: scale." stay). Ready; I merge it in minutes.
- b) Build the room tint instead (about half a day; needs 6 = a).

## 8. The beat's light wedge
**Why:** in the laptop view it is blown-out white with a jagged edge and hides the plants.
- a) ★ Softer: brightness 0.45 (was 0.7), one full step wide (was half).
- b) Keep it as designed.
- c) Your own numbers.

## 9. The words players read (27 proposals in `.tmp/cards/T-167-report.md`)
The main ones: "Hand out of view" → "Bring your hand back into view"; "Re-place bed" → "Place the garden again"; "New garden" → "New garden (erases this one)"; "Look and hold" → "Look to select"; "Sound unavailable" → "No sound. Leave and enter again."; a help line on the first page that says the settings orb exists.
- a) ★ OK all 27.
- b) OK all except the numbers you write.
- c) None.

## 10. The three test pages (device check, pinch test, garden preview) published with the app
- a) ★ Keep them until the headset test, then remove them from the submission build.
- b) Remove them now.
- c) Keep them and name them in "How to test".

## 11. Laptop mode for judges with no headset (a click is a pinch)
- a) ★ Yes, as one clearly labelled "preview" line after the headset steps.
- b) No, headset only.

---

## How it behaves

## 12. The room with no table: the first sound comes at about 22 s (the goal is 20 s)
- a) ★ Wait 6 s for a surface scan instead of 10 s.
- b) Keep 10 s.

## 13. "Hold New garden" erases the garden with no way back
- a) ★ Keep one backup of the old garden (about 10 lines).
- b) Leave it as is.

## 14. A room with walls but only a low coffee table
**Why:** since the coffee-table fix the bed floats there (a seated player cannot reach a 0.4 m table), and a floating bed ignores the room, so the room's sound is lost although the walls were scanned.
- a) ★ Keep the room's sound from the walls whenever they were scanned.
- b) A floating bed always gets the default sound.

## 15. The UI click sound ("tick") level
- a) ★ Keep −10 dB (audible in a quiet room).
- b) −12 dB, as the sound plan says (quieter).

---

## Reviews and process

## 16. The 24 Oct progress review (G1, `specs/08-status/G1_REVIEW_2026-10-24.md`)
The simulator side meets 10 of 10 checks; the 3 headset checks could not run.
- a) ★ Conditional pass. The conditions are items 1–5 above; the "room tunes the song" feature stays in, with the final call on **3 Nov** (G2); the draw-call target reads "≤ 30 for both eyes" (we measure 6–12 per eye).
- b) Pass.
- c) Fail.

## 17. The video (`specs/06-release/VIDEO_SCRIPT_V0.md`)
- a) ★ OK all: the two rooms early (at 0:20), captions only (no voice-over), no personal name or handle on the end card (only the project link), a hand drawn only for recording ready by 31 Oct, and you choose the main room by ear.
- b) Answer each yourself.

## 18. Install ffmpeg (a free video tool) for the rough cut
**Why:** with it I make the first rough cut of the video from the simulator (82 s, captions, the rendered sound).
- a) ★ Run `brew install ffmpeg` in Terminal (about 2 minutes), then reply "ffmpeg done".
- b) Skip the rough cut for now.

## 19. Chinmay's Devpost and Meta Start registration
**Why:** he submits as the team's Representative; the rules need it by submission day.
- a) ★ Ask Chinmay to send a screenshot of the "Start Member" label on the Meta Developer Forum by 31 Oct.
- b) Already done (send the screenshot when you can).

## 20. A test leak left in an old agent folder
An agent's deliberate test change (`.claude/worktrees/agent-ad9c8a119ef3cd0e6/src/access/Reticle.ts`) was never committed and cannot reach the game; its undo was declined, so I did not touch it.
- a) ★ "yes, revert" and I undo it and delete that old folder.
- b) Leave it.

## 21. Two packages the build no longer uses (`@pmndrs/uikit-horizon`, `@pmndrs/uikit-lucide`)
- a) ★ Remove them from package.json (smaller install; the built game is unchanged).
- b) Keep them.

---

## Later (no answer needed now)
- **Headset day:** which room and table (at least 75 cm deep), your own or a borrowed headset, results by mail or USB, keep it overnight? (`DEVICE_SCRIPT_S1.md`)
- **Listen to a key change** on the headset (rate 1–5: same instrument after the change, the short gap, the echo drop, any click).
