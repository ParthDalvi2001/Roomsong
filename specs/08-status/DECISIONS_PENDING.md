# Decisions waiting for Parth

**The one file for every open decision** (updated 9 Nov, after the plan sweep). Reply with the number and your answer, or "done". Answered ones go to DECISIONS_LOG.

## 1. Push main again before the headset run (one line, for the live site)
Done once: `main` 5c676b6 went live on 9 Nov 10:48 (the BUG-040 fix, the test pages out). The headset sheet (items 4 and 8) checks the afternoon's work too: the room colours (T-190), the shaping sounds (T-147b), BUG-042 to 045. When Claude says local `main` is ready (after one full browser run on today's merges), say "push", then in Terminal: `cd /Users/parth_baller/Documents/test-pro/Roomsong && git push origin main`.

## 2. The name: Roomsong or SonicSpace (Parth, 9 Nov: "wait, I will tell")
★ **Keep Roomsong.** The name check (RND_2026-11-08 §3) found no SonicSpace app or registered mark, but "Sonic" reads as SEGA's game in a games contest, and the name drops "room", the core idea. If SonicSpace: the rename branch is ready (title, landing page); the video, gallery and the `/Roomsong/` link must change too.

## 4. Headset checks (you or Chinmay, on the live link)
**Use the one sheet: `specs/05-testing/HEADSET_RUN_2026-11-10.md`** (about 25 minutes in five short sessions, plus 2 minutes tomorrow for Day 2; tick boxes; send a photo of it). It covers everything below and items 8.
1. Open the link over a phone hotspot. 2. "No room scan" message: once unscanned, once after Space Setup. 3. Undo a plant (undo petal). 4. Drag a plant by looking at it. 5. Listen: both palms out 1.5 s. 6. A no-pinch run: the link with `?access=gaze`. 7. Tomorrow: Garden tab says Day 2. 8. A 10 s Quest video with sound. Optional: the voice test (RND_2026-11-08 §1).

## 3. Before 12 Nov: read the Devpost pages in a browser (5 minutes)
The site refuses automated reads (HTTP 403 on 8 and 9 Nov), so the last check against the live rules is 27 Oct. You or Chinmay: open Rules, Updates, FAQs and Special Awards on https://start-developer-competition-26.devpost.com/ and tell me anything new (deadline, fields, video, awards). HACKATHON_RULES §12.

## 8. Listen and look (on the headset, after the next push of main)
1. The sound while shaping (T-147b): pinch a plant (a soft tick), pull it slowly up and down (its own note follows), drop one in the centre hole (one low bump). Rate 1–5; too quiet or too loud? 2. The room colours (T-190): rate the tint 1–5 and read the ceiling caption ("Ceiling: minor mood."). 3. One-hand mode with a seed on the palm: open settings, look at Exit and pinch: the panel closes (BUG-042).

## 5. Before 12 Nov: a new person plays it
Someone who has never seen Roomsong plays the first five minutes on a headset while you watch, without help. Tell me what got stuck. This is the evidence for "Best First Five Minutes".

## 6. 12 Nov feature freeze: how to tag
**Answered 9 Nov 13:10 IST: A** (Parth: "a"), and move the freeze forward to today since the driver's side is done (Parth: "move to next stage"). Steps run once the full check passes.
★ **A:** you push `main` and tag v0.5.0 (the freeze build is the live one). **B:** say "go", I tag `develop`, no deploy. FEATURE_FREEZE_PREP_2026-11-12 §5–§6. After the freeze: only bug fixes.
With it, the G3 verdict: ★ **conditional pass** (the conditions: the new-person test, item 5, and your call on any self-score below 8). It also closes G2, never held on 3 Nov.

## 7. Old items of 25 Oct, still open
1. **Mirror (T-108).** ★ **"No mirror":** Pages is the submitted link and live since 8 Nov; a mirror adds two hand steps (a Netlify upload and a same-build check) on 15 and 17 Nov, the busiest days. The runbook and the uptime watch already work without one. **Or** Netlify by 14 Nov (free account; you drag the site folder at T-183 and T-185): send its address.
3. **Chinmay, by 12 Nov (T-115):** (a) a screenshot of his Meta Horizon Start membership (the Representative must be a member); (b) open the Devpost "Enter a submission" form without submitting and send a photo of its fields, so the text fits them; (c) if the rules or form ask for prize papers (W-8BEN, bank), start them now.
4. **Rate the music (T-164).** During the headset run, after A5: the song itself (style B, the app's sound since 25 Oct), 1 to 5 and one sentence. 4 or more closes the sound pass; below 4, say what is worst (fixes only after 12 Nov).
6. **Devpost (T-180):** the target launch line (★ "early 2027 on the Meta Horizon Store" if you both agree, else it is cut) and "What excites us about VR", two sentences each in your and Chinmay's own words, by 14 Nov.
(7.2 and 7.5 closed 9 Nov: the G2 questions are settled by events or folded into items 5 and 6 above; SPRINT_PLAN T-155.)

## 9. Video and final check (Chinmay, with you)
1. **Dry run on 11 or 12 Nov:** check that the Quest's own capture records the room (passthrough) and the app's sound at 1080p. Plan: `specs/06-release/VIDEO_SCRIPT_V1.md` (88 s, the first minute in one take).
2. **End-card link:** ★ the GitHub Pages address (it shows your GitHub name), or the mirror if one exists by 14 Nov.
3. **Final check on 16 Nov:** ★ Chinmay runs it on his Quest 3 (two checks need a Quest 3). The cold-start rule "in XR within 5 s": ★ count from pressing Enter.

## 10. Gallery: the six pictures (Chinmay, with you; T-182)
Drafts: six emulator shots and the icon in `evidence/gallery/`. The checklist wants real captures on a real table.
★ **A:** keep the drafts as the fallback, and on 13–14 Nov take stills from the headset video for shots 1, 3, 4 and 5 (garden on the table, seed on the palm, the pinch, two rooms); pick the six by 15 Nov. **B:** submit the six drafts as they are.

## Dates
- 13–14 Nov: video (Chinmay). Devpost text: I draft it, aimed at Best First Five Minutes.
- 15 Nov: code freeze. 16 Nov: final check. 17 Nov by 18:00 IST: Chinmay submits.
