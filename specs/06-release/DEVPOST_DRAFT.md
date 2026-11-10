# Devpost Submission Draft, Judging Scorecard, and Gap List

**The name is SonicSpace** (D-069, Parth and Chinmay, 9 Nov): the title here, every link (the `/SonicSpace/` path, live once Parth renames the repository), the in-app title and the video say it together, so judges see one name. Until the rename the live link is still `/Roomsong/`.

**Status:** Draft v3.2 of the text (T-180, 10 Nov: D-078 to D-081, BUG-055, BUG-056, T-193 and the track framing of HACKATHON_RULES §14; checked against `develop` ab391b1, live `main` 00d0d52; the "What changed on 10 Nov (v3.2)" paragraph under §1.2 says what and why; everything else in this header is as of v3.1). Draft v3.1 (9 Nov afternoon: the day's later merges and the two G3 decision markers; v3 was the same morning, checked against 2ed6cf7; v2 27 Oct at 7b3eadc; v1 17 Oct at dca03de; v0 15 Oct at cc37db5) · **Owner:** product-owner · **Date:** 2026-11-09 · Checked against `develop` at 359799f; the live site serves `main` 5c676b6. §1 is the copy to submit; §2 to §5 are mostly as of 17 Oct and are not submission copy. The submission dry run of 9 Nov (`SUBMISSION_DRY_RUN_2026-11-09.md`) holds the current state of every submission item.
**Feeds:** T-180 (final copy), T-181 (video), T-182 (gallery), T-184 (go/no-go). The rules of copy are SUBMISSION_CHECKLIST §2.1 ("Copy rules"); this file obeys them and does not replace them.
**Sources read (9 Nov):** RND_2026-11-08 §2 (the target award, Best First Five Minutes, and its wording advice) · HACKATHON_RULES §3, §5.3, §6, §10 · DEVPOST_CLAIMS_CHECK_2026-10-25 (method and verdicts) · SUBMISSION_CHECKLIST §2.1 · PROGRESS (9 Nov 01:45 IST: Now, Test status, Perf) · DECISIONS_LOG D-061 to D-070 · DECISIONS_PENDING (9 Nov) · BUG_LOG (open S1/S2: 0) · the words players see (`src/core/strings.ts`, `src/ui/strings.ts`) · `src/hands/config.ts`.

**Markers.** `[not yet: T-nnn]` follows every claim that is false today and names the task that makes it true. Open on 9 Nov: the mirror (T-108: Netlify chosen, project `sonicspace`, D-069; the address comes from Parth), the freeze build's hash (T-183) and the video link (T-181); outside the description, the gallery (T-182) and "What excites us about VR" (Parth and Chinmay, DECISIONS_PENDING 7.6). The target launch line was agreed on 9 Nov (D-069). `<...>` is filled on submission day. A sentence with an open marker never ships: the task is done, or the sentence is cut. With no mirror, step 1's parenthesis becomes "(build <hash>, /version.json)". `[decide 14 Nov: …]` marks a sentence whose wording waits on an outcome due 14 Nov (FEATURE_FREEZE_PREP_2026-11-12 §5.1, decisions 1 and 2, Parth's accept-with-actions); it names both wordings, is settled that day and never ships.

**Tags.** **D** = seen on a headset: Parth's Quest 3S (7 Nov, development build) or Chinmay's Quest 3 (8 Nov, the live site). **E** = emulator only (IWER in desktop Chromium, the browser tests). The copy writes only D facts as tested; every E number in it carries "(emulator)".

**Where the build stands (9 Nov, develop 359799f, live 5c676b6; the afternoon's merges are the second-last row below).** Headsets in hand since 7 Nov; Emergency mode (D-013) no longer applies. The live link https://parthdalvi2001.github.io/Roomsong/ (GitHub Pages) has been up since 8 Nov; after the repository rename (D-069) it is https://parthdalvi2001.github.io/SonicSpace/. New since the 27 Oct pass: a hand may take the seed off its own palm, for every player (D-062); a plant's target at its head and an 11 cm pull (D-063); a pinch that touches nothing takes the panel control or plant in line with the eye and fingers (D-066); Exit on the Garden tab, one press (D-067); "No room scan: run Space Setup", once a session in a room with no plane (D-068); the `?access=` links `gaze`, `onehand`, `contrast`, `reduce`, combinable with commas, saved like a ticked box and switched off on the Access tab (D-070); the Garden tab counts days by calendar day (BUG-037); the guide no longer moves on with nothing planted (D-061, BUG-022). Open S1/S2 bugs: 0.

| Fact | Tag | Source |
|---|---|---|
| Entered with hands; palm-up seed; planting with sound; save and reload; pulls and moves; resume after taking the headset off; Listen (how it was started is not recorded; the palms-out pose is DECISIONS_PENDING 4 step 5); settings; Exit and re-entry; room tuning after Space Setup (Parth's room gave a minor pentatonic key) | D (Quest 3S, 7 Nov, dev build) | PROGRESS Now (T-000), Test status "device" |
| Three seeds planted 35 s after Enter, the first at 18.5 s (recorder, xr:sessionStart to the third plant in garden:changed) | D (Quest 3S, 7 Nov) | D-062, BUG-023 |
| About 90 fps (low 88), 11 draw calls, about 5k triangles, JS under 2 ms | D (Quest 3S, dev build, with the recorder) | PROGRESS Perf |
| 90 fps; Exit; save; daily seed; one-hand mode; room read after Space Setup; three seeds planted by 62 s; an unscanned room plays the default song | D (Quest 3, 8 Nov, live site) | PROGRESS Now (T-000), Perf; D-068 |
| First sound 15.0–17.8 s from Enter; first loop 34.4 s (test-speed hands) | E | G1, 24 Oct; T-150 |
| Worst frame 48 draws (both eyes), 103,972 triangles, JS 2.03 ms; download 743.6 kB gzip | E | PROGRESS Perf (23 and 25 Oct) |
| Not yet on a headset: the undo petal, a drag by sight, a hands-free (look-to-select) run, Day 2, the built page's cold start and frame rate on Quest 3S, the "No room scan" message, the access links | E | PROGRESS Test status; DECISIONS_PENDING 4 |
| In neither list, so never written as tested: stillness, Time-lapse, high contrast, reduce motion, the beat ring, the ripple and its captions, a bed restored to its saved place, the laptop preview | E | — |
| Merged 9 Nov after the v3 pass, on no headset and not on the live site until Parth pushes `main` (DECISIONS_PENDING 1, 6 A): the plants' tint follows room size, small rooms warmer, big rooms cooler, and the ceiling caption names the mood ("Ceiling: minor mood.") (T-190, D-071); sound while shaping: a tick on a plant pinch, the plant's own note while it is pulled, a bump when a drop lands in the hole (T-147b); a look-and-pinch at a settings control works with a seed on that palm (BUG-042); the laptop preview takes a plant by its drawn head and keeps a held plant under the pointer (BUG-044, BUG-049); test flags that fake time or plant (`fakeDay`, `autoplant`) save nothing on the live site (D-072, BUG-046) | E (unit and emulator; the shaping sounds not listened to, API v1.2.62) | DECISIONS_LOG D-071, D-072; BUG_LOG; API_SPEC v1.2.61–v1.2.66; the headset sheet HEADSET_RUN_2026-11-10 (DECISIONS_PENDING 8) |
| Seed pick and catch after the BUG-055 fixes: the palm seed comes at once, the pinch takes it within about 0.8 s, 4 seeds planted in 10 s, none flew back; "No seeds left. More tomorrow." at long palm-ups with the supply empty (BUG-056); "Place the garden again" showed the ghost and landed the bed on the table 0.57 m ahead, 3 s after the press (D-079, T-194); the Time-lapse toggle pressed and working; 90 fps median | D (Quest 3, 10 Nov about 00:06 to 01:40, Parth, dev server with the recorder; which room is not recorded) | TEST_PLAN §4.6 TC-DEV-02, 03, 15; PROGRESS header 01:50; D-078, D-079; BUG_LOG |
| Ten seed kinds in two libraries, Classic and Calm (T-193, D-076, D-081 names); every palm-up hands out the next seed at once, and the Seeds page (Garden tab) optionally sets the next seed's kind (D-080); the settings board's one grid and one look (D-081) | E (unit and emulator; develop only, not on the live site; Parth's one headset try of 10 Nov 06:20 was of the picker before D-080 changed it) | DECISIONS_LOG D-080, D-081; SPRINT_PLAN T-193; API v1.2.75, v1.2.76 |
| No stranger has played it yet; a new person's first five minutes is the evidence that counts for the award | — | DECISIONS_PENDING 5; RND §2 |

---

## 1. The submission text, draft v3.2 (10 Nov)

### 1.1 Form fields (HACKATHON_RULES §5.3; field list to be confirmed by Chinmay in T-115)

| Field | Draft | State |
|---|---|---|
| Name | SonicSpace | done (D-069, Parth and Chinmay 9 Nov; the SEGA "Sonic" association flagged and accepted; a quick search, not a trademark search) |
| Tagline (≤140) | **A:** "Plant glowing seeds on your real table with a pinch. Each one sings. Every room gives your garden its own song." (111 characters) · fallback B, only if S1 is cut: "Plant glowing seeds on your real table with a pinch. Each one sings, and your garden grows every day you return." (112 characters) | A chosen 27 Oct (D-060 (16)); room tuning seen on both headsets after Space Setup (D). "Every room" assumes a scan: an unscanned room plays the default song, which "How to test" says. `[decide 14 Nov: two rooms sound different on a headset (TC-DEV-13) → A; they do not → B, the "hear your room" claim goes]` · Offered 10 Nov for the track's "lean-back" (HACKATHON_RULES §14), not chosen: A2 "Plant glowing seeds on your real table with a pinch, then sit back as each one sings. Every room gives your garden its own song." (128 characters); a tagline change is Parth and Chinmay's (D-060 (16)) |
| Track | Entertainment | done (D-001) |
| Division | New Experience (first commit 2026-10-10, 4c831aa) | done |
| Build link | `https://parthdalvi2001.github.io/SonicSpace/` | live once Parth renames the repository (D-069); `/Roomsong/` live since 8 Nov (serves 5c676b6 on 9 Nov afternoon, without the afternoon's merges); the freeze build goes live when Parth pushes `main` and tags v0.5.0 (DECISIONS_PENDING 6 A); the submitted build is the code-freeze build on the same link (T-183) |
| Mirror and build hash | named in "How to test", not in the link field `[not yet: T-108, T-183]` | Netlify chosen (D-060 (2), D-069), project `sonicspace`, not live: the address comes from Parth; the hash at T-183 |
| Video | public YouTube, 60 to 90 s `[not yet: T-181]` | VIDEO_SCRIPT_V1 (88.6 s, from the live site with no flags; the first minute in one take for the award, RND §2): capture dry run 11–12 Nov (DECISIONS_PENDING 9.1), shoot 13 Nov, retakes 14 Nov (Chinmay; Parth's 3S as backup); a Quest recording with sound is still untried (DECISIONS_PENDING 4 step 8) |
| Target launch | "Early 2027 on the Meta Horizon Store, as a web app." | agreed by Parth and Chinmay, 9 Nov (D-069) |
| Team | Parth · `<email>` · Developer; Chinmay · `<email>` · Product Manager (Representative). Agents are not team members | emails from the humans (T-185); Chinmay's Start Member screenshot still open (DECISIONS_PENDING 7.3) |
| Gallery | 6 images, §3.4 of this file `[not yet: T-182]` | six emulator drafts and an icon re-shot 9 Nov (T-182; `evidence/gallery/`, git-ignored, so on Parth's Mac only; 05 shows the D-071 tint; 03 shows the dev-only hand cue). ★ DECISIONS_PENDING 10 A: stills from the headset video for 1, 3, 4 and 5 on 13–14 Nov, the drafts as fallback, captioned "(emulator)" |

### 1.2 Description (≤500 words)

Where each heading comes from:

| Heading | Source of the heading | Words |
|---|---|---|
| How to test | SUBMISSION_CHECKLIST §2.1 (required; it comes first); the T-180 brief of 9 Nov (Space Setup first, a table, hands only, the access links) | 104 |
| Your first minute | RND_2026-11-08 §2 (second, with times, for Best First Five Minutes); PRD §3.1; "How to test" points to it | 76 |
| What it is | HACKATHON_RULES §5.3 "inspiration"; SUBMISSION_CHECKLIST §2.1 "Inspiration" and "What it does", merged | 71 |
| After that | SUBMISSION_CHECKLIST §2.1 "What it does" (shaping, seed kinds, coming back) | 44 |
| How this meets the brief | SUBMISSION_CHECKLIST §2.1 (required); HACKATHON_RULES §3 (the theme and the design tests), §14 (the track's "lean-back": both halves) | 60 |
| How we built it | HACKATHON_RULES §5.3 "how we built it"; SUBMISSION_CHECKLIST §2.1; IWSDK named (rule check 23 Oct) | 45 |
| Known limitations | SUBMISSION_CHECKLIST §2.1 (required: what was tested on a headset, in how many rooms, and what was not); CLAUDE.md Golden Rule 11; HACKATHON_RULES §10 C1, C5 | 79 |
| What's next | HACKATHON_RULES §5.3 "future plans"; SUBMISSION_CHECKLIST §2.1 (required) | 16 |

**Total on 10 Nov (v3.2): 495 words of 500**, by the counting rule below (script re-run on v3.1 first: 497, as recorded). The newcomers wording of the Known-limitations marker adds 3 (498); a filled `<mirror URL>` takes 1 off, no mirror 3. The v3.1 paragraph that follows is the record of the rule.

**What changed on 10 Nov (v3.2), and why.** (1) Track framing (HACKATHON_RULES §14: Entertainment's examples are music visualization and spatial audio, its word "lean-back"): "How this meets the brief" now shows both halves, "plant a song in two minutes, then palms out for Listen and lean back: the ring of light plays it, music visualization, spatial audio panned from each plant" ("two minutes" holds with room to spare: 35 s and 62 s on the headsets, D). Listen's sentence left "After that" so it is said once (the halo went with it; the hands field keeps how Listen starts and ends). (2) Originality: "As far as we know, no earlier consumer MR instrument lets room geometry tune the music." became "We found no app where the room sets the key." and moved to "What it is", after the room sentence (−4). Backing: the Takeaway lines of research note 03 (no shipped Quest music app derives key, tempo or mode from the room; on Quest, HoloLens, Vision Pro, iOS and Android none found; the nearest are an installation, an unreleased prototype and research). No "first". **Bloom (Eno and Chilvers) is not named:** SUBMISSION_CHECKLIST §2.1 ("names no earlier project … No competitor or brand names anywhere"), WINNING_STRATEGY §0.2 ("does not name competitor products") and HACKATHON_RULES §10 C4 (no real people) all forbid it; if Parth and Chinmay want the nod, the unnamed form is "Inspired by generative apps where a tap blooms into a looping tune." (+12 words: cut elsewhere first), a call for Parth and Chinmay, not yet in DECISIONS_PENDING (★ leave it out). (3) T-193, D-080, D-081 (all E): "Ten seed kinds, Classic and Calm; the Seeds page picks the next." in "After that"; step 4 names Seeds; "ten seed kinds, Seeds page, settings redesign" open the "Emulator only so far" list (Golden Rule 11). "A sixth voice." left "What's next": the build has ten voices now (−3). (4) D-079 (D, Quest 3, 10 Nov 01:38): step 4 gains "Place the garden again (look, pinch)", a judge's way out of a badly placed bed; "re-placing the bed" joins the tested list. (5) BUG-055, D-078 and BUG-056 (D, Quest 3, 10 Nov): "seeds" was already in the tested list; "no-seeds notice" joins it; the hands field says what changed. (6) Time-lapse moves to the tested list (TC-DEV-15, 10 Nov, D). Paid for by: "never quite repeating" (the melody's variation is in "After that"), "off the ring to remove" (in the hands field), "bare hands" in the brief ("Hands-first" says it), the access links' "saved until switched off (settings, Access tab)" (moved to the hands field), the laptop line's parenthesis ("any desktop browser opens a flat preview"), "The echo follows room size, not measured acoustics." (no sentence says we measure; the rule is "never write that", not "write that we do not"), and four "the" in the emulator list. The hands field: palm-up gives the next seed at once (D-080, E); the settings sentence names the board's grid (D-081, E), Seeds and Place the garden again; "Our headset runs changed five things" adds the BUG-055 catch (D), the BUG-056 notice (D) and the re-place by look (D); the access links' "stay on until switched off" (D-070, E). Not touched: the tagline (A still reads "Each one sings", the active half only; a both-halves form within 140 is in the Tagline row), "Your first minute", the launch line (D-069, the humans' own words since 9 Nov) and the "What excites us" placeholder.

**Total on 9 Nov afternoon (v3.1): 497 words of 500**; the evening's rename (D-069: SonicSpace for Roomsong, the `/SonicSpace/` link, the launch line's marker gone) swaps word for word and leaves 497 (counted by script: every whitespace-separated token, headings with their `##` and placeholders as written; `[not yet: …]` and `[decide 14 Nov: …]` markers and list numbers not, a marker deleted with the space before it, so the punctuation after it joins the word before, as the shipped text reads). Recounted this way the morning's v3 is 497 too, not the 498 it said (one token in "How to test" not traced); left as separate tokens, the four `;`, `).` and `.` after markers would make v3.1 501, which no word counter does. A filled `<mirror URL>` takes 1 word off (496); no mirror takes 3 off ("(mirror <mirror URL>;"). The stranger wording of the first decide marker adds 3 (500); the room wording of the second takes 8 off. Any other word added must replace one. The 27 Oct count took `<GitHub Pages URL>` as one token: by this rule the 27 Oct text was 502.

**What changed on 9 Nov afternoon (v3.1), and why.** Merged into develop after v3, all E (unit and emulator; on no headset, not on the live site until Parth's push of `main`): (1) T-190, D-071: "room volume the echo" becomes "room volume the echo and tint" (+2; the palette's turn follows the decay step, which follows room volume: `rawDecay(roomVolume, …)` in `garden/signature.ts`); "room tints" joins "Emulator only so far" (+2). The ceiling caption's mood ("Ceiling: minor mood.") is not written: "each ringing a note" stays true and the caption shows itself. (2) T-147b: "shaping sounds" joins "Emulator only so far" (+2; nobody has listened, API v1.2.62); the hands field says what they are. (3) BUG-042: the hands field's look-and-pinch sentence adds "even while a seed rests on your palm". (4) BUG-044, BUG-049: the laptop paragraph below; the copy's laptop line was true before and after. (5) D-072: no copy change: the copy names no test flag, Time-lapse is a panel switch (T-174), not `fakeDay`, and VIDEO_SCRIPT_V1 records from the live site with no flags. (6) FEATURE_FREEZE_PREP §5.1 decisions 2 and 1: "Tested hands-only by the team" (+3; true today: no stranger has played) with a decide marker for a stranger's run, and a decide marker on "Your room tunes it" and tagline A for TC-DEV-13. Paid for by (7) "fallbacks end in a floating bed" for "a four-step fallback ends in a floating bed" (−2), the two fps clauses merged into "about 90 fps on Quest 3 (live site) and Quest 3S (development build)" (−2; the Quest 3's 90 is within "about"), "the no-scan notice" for 'the "No room scan" notice' (−2) and "A borderline room may change scale" for "A room near a measuring step can change scale" (−3; "measuring step" was jargon).

**Brand sweep, 9 Nov (T-191, TEST_PLAN §4.8 TC-POL-05).** "JavaScript under 2 ms a frame" became "code under 2 ms a frame" (JavaScript is a trademark; a word for a word, still 497). "Three.js" and "TypeScript" stay in "How we built it" until Parth decides (★ keep: the rules ask how it was built, and a tool list with no logo or slogan is not advertising; the other way is "a 3D library, a typed language", which says less). The "not wireless headphones" and "a desktop browser" of the rule check (HACKATHON_RULES §12 gap 6) were already in v3.1.

**What changed on 9 Nov morning (v3), and why.** (1) "Your first minute" is second, with times (RND §2): first sound "15–18 s after Enter (emulator)" (E); "within 90 s; on our headsets, 35 s (Quest 3S) and 62 s (Quest 3)" (D); "No account, no controllers." ("no menus" left out: the settings panel exists, though the first minute never needs it). "Pinch it with your other hand" is "Pinch it" (D-062: either hand). "the sweep" is "a sweep of light" (the section now comes before "What it is"). The no-table fallback went (−7). (2) "How to test": Space Setup first with its reason, "or you hear a default song" (D on the Quest 3); hands only; the live link, no marker; Settings, Time-lapse and Exit in one step (D-067); the four access links (D-070). Cut: the stillness step (no device result, and whether a seated head holds under 8°/s is a device question) and "then hold both palms out" ("After that" has it). The laptop line is shorter; the preview stays (D-060 (11)). (3) "Known limitations" opens with what ran on which headset, in how many rooms, hands only, and what is emulator only (the checklist's copy rule, Golden Rule 11); "A room with no Space Setup gets the default tuning" is now in "How to test". (4) "How we built it": fps only as measured on a headset (checklist rule "Numbers"); the emulator's 48 draws and the 0.75 MB went; the device's 11 draws and 5k triangles stay out of the copy because they were taken with a small garden and would read against the emulator's worst frame; "A fixed mapping …" cut ("What it is" says what the room sets). (5) "How this meets the brief" is one paragraph; "Built with the Immersive Web SDK (IWSDK)" now opens "How we built it" (the name stays); "first sound …" moved to "Your first minute"; "ten-minute visits" cut. (6) "After that": "Saved, it returns to its spot" became "It saves" (a restored bed place has no device result); "the lights dim" cut. (7) "always in scale" cut. Not said, on purpose: anything about voice (RND §1); the wall vine; "Bring back the old garden" (in the hands field). History before 9 Nov: this file's git log (v2 is d96f479).

**The laptop preview (for a reader with no headset; as of 27 Oct, the picks fixed 9 Nov).** The rules ask for a build that launches in Quest Browser (HACKATHON_RULES §5.1) and allow emulator video (§5.2); the FAQ says judges play on a Quest 3 or 3S (§11). Since T-114b anyone without a headset can try the garden: on a browser with no mixed reality the landing page says "The garden opens in this tab: a click or a tap is a pinch." and Enter opens laptop mode. What it is: the same garden, sound, guide and save, seen from a fixed seat over a drawn table; the seed follows the pointer and a click on a free cell plants it; a press on a plant, at its drawn head or its foot, and a drag moves it, or removes it off the ring (until 9 Nov a press on a drawn head took nothing and a held plant could jump along the ray: BUG-044, BUG-049, fixed in unit tests, BUG-044 also in the emulator); a click on the petal undoes; a click on the centre orb starts Listen and a click ends it. What it is not: mixed reality (no passthrough, no real table), the room signature (always the default "Wanderer" tuning, with no room tint), hand poses (no palm up, no palms out), pull (a plant cannot be made taller or shorter), the settings panel (the landing page's switches stand in) or look-and-hold. It is tested only in desktop Chromium by the browser tests (TC-E2E-14 and the laptop timing of T-150). PRD §6 calls S6 "never the judged path", so the copy offers it as a preview after the headset steps, beside the video. The weekly rule check of 27 Oct (T-186) found the rules unchanged; a Devpost manager sent the open "plain Three.js by URL?" question to the Meta developer forum without a ruling, so "Built with the Immersive Web SDK (IWSDK)" stays in the copy (the Rules' link route names apps "built with IWSDK (WebXR)").

```markdown
## How to test
Quest 3 or 3S. Run Space Setup first, or you hear a default song. Sit at a table. Hands only: hand tracking on, controllers down. Headset speakers, not wireless headphones.
1. In Meta Quest Browser open https://parthdalvi2001.github.io/SonicSpace/ (mirror <mirror URL> [not yet: T-108, Netlify chosen, the address comes from Parth]; build <hash>, /version.json [not yet: T-183]).
2. Press Enter the garden; allow hands and room.
3. Follow "Your first minute".
4. Settings: turn a hand over, pinch its orb. Garden tab: Seeds, Place the garden again (look, pinch), Time-lapse (a week in 30 s), Exit.
Accessibility links: ?access=gaze (no hands), onehand, contrast or reduce, comma-joined.
No headset? Watch the video [not yet: T-181]; any desktop browser opens a flat preview.

## Your first minute
Press Enter. The ring settles on your table. A ripple crosses table, wall and ceiling, each ringing a note. Hold a palm up: a seed glides in. Pinch it; its landing spot lights up. Let go: a sweep of light makes it sing, 15–18 s after Enter (emulator). Three pinches make a song within 90 s; on our headsets, 35 s (Quest 3S) and 62 s (Quest 3). No account, no controllers.

## What it is
Instruments ask for skill before they give joy. We wanted a song you grow. SonicSpace turns your real table into a glowing ring garden where every plant sings. Where you plant sets when it plays and how high. Your room tunes it: floor size sets the key, ceiling height the scale, room volume the echo and tint. [decide 14 Nov: two rooms sound different on a headset (TC-DEV-13) → keep this sentence; they do not → "Room size and height set the key, scale, echo and tint." (−8 words), tagline B, and no "another room, another song" in the video (V3) or in What excites us] We found no app where the room sets the key.

## After that
Pull a plant up for louder, drag to move or remove it; 5 seconds to undo. Ten seed kinds, Classic and Calm; the Seeds page picks the next. It saves; each day brings a seed, plants grow and the melody varies.

## How this meets the brief
Entertainment: plant a song in two minutes, then palms out for Listen and lean back: the ring of light plays it, music visualization, spatial audio panned from each plant. Hands-first, seated: the bed about 0.45 m ahead. Purposeful MR: the table is the stage, the room the tuning. Original: synthesized sound, procedural visuals, offline.

## How we built it
Immersive Web SDK (IWSDK, WebXR), Three.js, TypeScript, Web Audio. Plane detection finds the table; fallbacks end in a floating bed. Measured: about 90 fps on Quest 3 (live site) and Quest 3S (development build), code under 2 ms a frame.

## Known limitations
Tested hands-only by the team on Quest 3S and Quest 3, one room each: entering, seeds, planting, sound, pulls, moves, Listen, settings, re-placing the bed, Time-lapse, Exit, save, resume, one-hand mode, daily seed, no-seeds notice, room tuning. [decide 14 Nov: no stranger has played (DECISIONS_PENDING 5) → keep "by the team"; one played unaided → "by the team and <n> newcomers" (+3 words: 498 in all)] Emulator only so far: ten seed kinds, Seeds page, settings redesign, undo, drag by sight, hands-free mode, day 2, access links, shaping sounds, room tints, no-scan notice, live site on 3S. A borderline room may change scale between visits.

## What's next
Shared gardens: a friend's garden in your room's key. Store launch: early 2027.
```

Conditional rewrites (outside the count; apply only if the condition happens):
- **If S1 is cut (G2 answers still open, DECISIONS_PENDING 7.5; unlikely now that both headsets tuned to their rooms):** tagline B; cut "Run Space Setup first, or you hear a default song.", "A ripple crosses … a note.", "Your room tunes it: … tint.", "We found no app where the room sets the key.", "room tuning" from the tested list and "A borderline room …"; "Purposeful MR: the table is the stage." Frees about 50 words.
- **As the headset checks pass (DECISIONS_PENDING 4 and 8, the sheet HEADSET_RUN_2026-11-10; "shaping sounds" and "room tints" need the freeze build live first, DECISIONS_PENDING 1):** move each item from "Emulator only so far" to the tested list (the same words, so the count holds); a check that fails stays in "Emulator only" or goes to "Known limitations" in plain words.
- **On the freeze build (T-183, T-184):** re-measure fps on both headsets on the live freeze build; if the Quest 3S runs it, "(development build)" becomes "(live site)" and the two clauses merge; re-measure the first sound (15–18 s, 24 Oct) and change it only if it moved. A stranger's first five minutes (DECISIONS_PENDING 5) may give a third seed time: add it only as measured, in place of a word.

Claims, tagged D (seen on a headset) or E (emulator only):

| Claim in the copy | Tag | Backing, and what would change it |
|---|---|---|
| "Run Space Setup first, or you hear a default song." | D | Chinmay's Quest 3: an unscanned room played the default song; both headsets tuned to the room after Space Setup |
| "Hands only", "bare hands", "Tested hands-only" | D | both headsets, 7–8 Nov; UAT-01 on the freeze build at T-184 (C1) |
| Step 4: settings by turning a hand over; Seeds; Place the garden again (look, pinch); Time-lapse; Exit | D for settings, Place the garden again, Time-lapse and Exit; E for Seeds | PROGRESS device row; TC-DEV-15 and TC-DEV-02, Parth on a Quest 3, 10 Nov (the re-place landed the bed 0.57 m ahead 3 s after the press, at level 3); Seeds is D-080, emulator only |
| "plant a song in two minutes, then palms out for Listen and lean back: the ring of light plays it" | D | three seeds by 35 s (Quest 3S) and 62 s (Quest 3); Listen on the Quest 3S, 7 Nov; the track's "lean-back" (HACKATHON_RULES §14) |
| "Ten seed kinds, Classic and Calm; the Seeds page picks the next." | E | T-193 (D-076), names D-081, the optional pick D-080; in "Emulator only so far" as "ten seed kinds, Seeds page" |
| "re-placing the bed", "no-seeds notice" in the tested list | D | D-079 (Quest 3, 10 Nov 01:38); BUG-056 "Verified on device" (Parth, Quest 3, 10 Nov 01:40) |
| "settings redesign" in "Emulator only so far"; hands field "each row a label with its control beside it, every switch saying on or off" | E | D-081, API v1.2.76; the board's lower edge near the table (3.8 cm) is a headset check |
| Hands field: "a palm need not be flat to get a seed, and a seed let go over the centre or just past the rim plants on the nearest ring" | D | BUG-055, D-078: TC-DEV-03, Parth on a Quest 3, 10 Nov (4 seeds in 10 s, none flew back); the 50° palm angle and the pinch filter still want a headset rating (BUG_LOG) |
| Hands field: "Palm up and the next seed comes at once"; "choose the next seed's kind, if you like" | D for the palm seed (TC-DEV-03); E for the pick | D-080: every palm-up hands out the next seed; the Seeds page is optional |
| Access links, "stay on until switched off on the Access tab" (hands field since v3.2) | E | D-070, `08-landing`; DECISIONS_PENDING 4 step 6 tries `?access=gaze` |
| "15–18 s after Enter (emulator)" | E | G1, 24 Oct, test-speed hands; real hands are slower |
| "within 90 s; on our headsets, 35 s (Quest 3S) and 62 s (Quest 3)" | D | D-062, RND §2; 90 s is the design bound (PRD M6). The 35 s is measured from Enter in the recorder (7 Nov); the 62 s is Chinmay's "all 3 by 62 s" (8 Nov), its start as he reported it |
| "No account, no controllers." | D | — |
| "spatial audio panned from each plant" | E | equal-power panning, no HRTF (claims check row 25); the track's words (checklist rule "Track words") |
| "Measured: about 90 fps on Quest 3 (live site) and Quest 3S (development build), code under 2 ms a frame" (JavaScript until T-191: a trademark) | D | PROGRESS Perf (Quest 3 90 fps, 3S about 90, low 88); a 10-minute sustained run on the freeze build is C5 at T-184 |
| "one room each" | D, assumed | the records name one room for each headset (Parth's, Chinmay's); the 10 Nov Quest 3 runs (Parth, dev server) name no room; **Parth to confirm** |
| The "Emulator only so far" list | E | PROGRESS device row "Not yet"; DECISIONS_PENDING 4; "shaping sounds" (T-147b) and "room tints" (D-071) added 9 Nov afternoon, DECISIONS_PENDING 8; "ten seed kinds, Seeds page, settings redesign" added 10 Nov (T-193, D-080, D-081: emulator only until a headset run, Golden Rule 11) |
| "Tested hands-only by the team" | D | FEATURE_FREEZE_PREP §5.1 decision 2: no stranger has played (DECISIONS_PENDING 5); the decide marker swaps in "by the team and <n> newcomers" only for an unaided run seen by Parth or Chinmay |
| "room volume the echo and tint" | E for the tint | D-071: the palette turn follows the decay step (small rooms warmer, halls cooler; rooms of one size share a tint); gallery 05 shows it in the emulator; on a headset one room each, so no tint was ever compared; Parth's 1–5 is DECISIONS_PENDING 8.2. Under the second decide marker with tagline A |
| Hands field: "Shaping has sound: a tick …, its own note following as you pull, a low bump …" | E | T-147b, API v1.2.62 (the note 6 dB under the plant, throttled 0.15 s; a bump on a drop in the hole or where it cannot land); not listened to; DECISIONS_PENDING 8.1 |
| Hands field: "even while a seed rests on your palm" | E | BUG-042, API v1.2.63: a panel control on the eye line wins over the palm seed; a plant on the line does not; DECISIONS_PENDING 8.3 |
| "the bed about 0.45 m ahead" | E | `BED_CENTRE_DEFAULT_M` 0.45; "about" covers a restored bed (D-041); not measured on a headset |
| "Store launch: early 2027." (and the Target launch field) | — | agreed by Parth and Chinmay, 9 Nov (D-069) |
| ~~"A sixth voice."~~ (cut 10 Nov) | — | false since T-193: the build has ten voices |
| "A borderline room may change scale between visits" | E | the T-129 drift check never ran; keep the sentence ("borderline": a room close to a step of key, scale or echo; with D-071 its tint can turn too, not written) |
| "We found no app where the room sets the key." (until 10 Nov: "As far as we know, no earlier consumer MR instrument lets room geometry tune the music.") | — | research note 03, Takeaway lines: no shipped Quest music app derives key, tempo or mode from the room; none found on Quest, HoloLens, Vision Pro, iOS or Android (the nearest: an installation, an unreleased prototype, research). "We found" is the qualifier; no names, no "first", never "first musical garden"; stands only while S1 ships. SUBMISSION_CHECKLIST §2.1 still quotes the old sentence "word for word": to be brought in line by whoever edits that file |
| "Headset speakers, not wireless headphones" ("not Bluetooth" until 9 Nov: a trademark) | — | D-057; an instruction with no reason given (claims check row 2) |
| Laptop preview | E | D-060 (11); TC-E2E-14, desktop Chromium only |
| Any "same room, same song" line | — | not written, on purpose (T-129) |

### 1.3 Hand interactions and the future of VR (HACKATHON_RULES §5.3, optional field we fill; SUBMISSION_CHECKLIST §2.1)

```markdown
## How hands are used
Hands only; no controller is ever needed. Palm up and the next seed comes at once; pinch it with either hand to plant; pinch and pull for louder; pinch and drag to move; drag off the ring to remove. Shaping has sound: a tick when you pinch a plant, its own note following as you pull, a low bump if you let go where it cannot land. Palms out, or a pinch on the Listen orb, to listen; a palm turned to your face, or any pinch, to come back. Turn a hand over and pinch the small orb on its back for settings: each row a label with its control beside it, every switch saying on or off. Its Garden tab holds Seeds (choose the next seed's kind, if you like), Place the garden again (a ghost ring shows where you look; pinch to put the bed there) and Exit, one pinch; Enter brings the same garden back. You see your own hands in passthrough; the app draws none. What a pinch will act on lights up first, and every action commits when you let go. Targets are 2.5 cm wide with a 4 cm hit radius, pinch hysteresis and smoothing. Our headset runs changed five things: a plant's target now sits at its head, where you see it; a pinch that touches nothing takes the control or plant in line with your eye and fingers, so the settings panel works without reaching, even while a seed rests on your palm; a palm need not be flat to get a seed, and a seed let go over the centre or just past the rim plants on the nearest ring; a palm up with no seeds left says so; and you can move the whole garden by looking. A removal can be undone for 5 seconds; New garden needs a 1.5-second hold and can be brought back for 10. A hand that leaves the headset's view loses nothing: what it held goes back. Accessibility: high contrast, voices told apart by shape, and nothing changes brightness more than 3 times a second; one-hand mode (tried on a Quest 3), a visual beat ring, reduced motion, and head-aimed "Look to select", which places the garden, plants, undoes, listens and works the settings but cannot move or remove a plant. Four of these can be switched on by a link (see How to test); they stay on until switched off on the Access tab.

## What excites us about VR
<The team writes this in its own words. A starting point for Parth and Chinmay to rewrite: "A headset can see the room you are in. Most apps treat the room as a backdrop. We wanted the room to take part: your table holds the garden and your room tunes it, so the same garden can sound different in another room.">
```

Changed on 9 Nov (T-180): "pinch it with either hand" (D-062); Exit and coming back (D-067); "none is tuned on a headset yet" replaced by the two changes the headset runs made (D-063, D-066; the values in `hands/config.ts` are unchanged and its header still calls them provisional, so the text does not say "tuned"); one-hand mode marked as tried on a Quest 3 (D); the link sentence (D-070). Undo and Look to select are described, not claimed as tested ("Known limitations" says so). 9 Nov afternoon (v3.1): the shaping-sound sentence (T-147b) and "even while a seed rests on your palm" (BUG-042), both E and both covered by "Emulator only so far" or the claims table. 319 words by the same script (283 in v3); no limit is known for this field (T-115). If the form has no separate hands field, this text cannot fit: the description has 3 words of slack. 10 Nov (v3.2): the palm seed at once and the optional Seeds pick (D-080, E); the settings board's rows and switches (D-081, E); Seeds and Place the garden again on the Garden tab (D-079, D); "Our headset runs changed five things" adds the BUG-055 catch (D), the BUG-056 notice (D) and moving the garden by looking (D); the access links stay on until switched off (moved from How to test). 416 words; the description has 5 words of slack.

Changed from v0: "voices told apart by shape and colour" is now "by shape", because a plant's colour follows its place in the seed sequence, not its voice (ART_PASS_T163 §0).

---

## 2. Judging-criteria scorecard (HACKATHON_RULES §6; 25 % each)

**Superseded on 9 Nov; kept as the 17 Oct record.** Since 7–8 Nov two headsets have run the build (the D rows at the top), so "zero device runs", "fps unmeasured" and "no hand has tried any of it" no longer hold, and the "no headset" column below is moot. The current self-score is the one in PROGRESS, re-scored at the next sprint review.

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

State: **done** · **not done** (on track) · **at risk** (a date, a human or a headset stands in the way). Rows the headsets or the live site changed are as of 9 Nov; the rest are as of 17 to 27 Oct and are re-checked at T-184. **Superseded for the current state by `SUBMISSION_DRY_RUN_2026-11-09.md`** (9 Nov afternoon: every item ✓, ✗ or ⏳ with its owner and date); this list stays as the record.

### 3.1 Timeline (§1)
| Item | State | Task |
|---|---|---|
| First rough video cut, 3 Nov (G2) | at risk: the loop and Listen are in the app now (T-128d, T-148), but emulator footage needs a visible hand and nobody owns the capture rig (PROGRESS items 32 (7), 33 (4)) | T-153; capture rig: **no task, add one** |
| Feature freeze, 12 Nov | not done | T-169 |
| Video capture, 13 Nov | not done; headsets in hand (Chinmay records 13–14 Nov); a Quest recording with sound is untried (DECISIONS_PENDING 4 step 8) | T-181 |
| Video edit, screenshots, gallery, 14 Nov | not done | T-181, T-182 |
| Code freeze, 15 Nov: tag rc1, deploy to Pages and the mirror, same hash | not done; Pages live since 8 Nov; the mirror waits on Parth (DECISIONS_PENDING 7.1) | T-183 (T-108) |
| Clean UAT, 16 Nov | not done; on a headset now (Emergency mode no longer applies) | T-184 |
| Tag `v1.0.0-submission`, lock `main`, review on the `github-pages` environment, 17 Nov 12:00 | not done | T-185 |
| Submit, 17 Nov 18:00 IST; confirmation screenshot | not done; `specs/06-release/evidence/` does not exist yet | T-185 |
| Post-submission smoke test | not done | T-185 |
| Uptime checks to 11 Dec | built (`uptime.yml`, 25 Oct); must be on `main` before the lock; `MIRROR_URL` to set when the mirror is chosen | T-187 |

### 3.2 Form fields (§2)
| Item | State | Task |
|---|---|---|
| Name | done | D-016 |
| Tagline ≤140, naming a pinch and the real table | done: A chosen (D-060 (16)), room tuning seen on both headsets after Space Setup; B only if S1 is cut | T-155, T-180 |
| Track, division | done | D-001 |
| Build link (Pages URL) | done: live since 8 Nov, deploy green (45518e5 on 9 Nov); the freeze build replaces it at T-183 | T-108, T-183 |
| Mirror named in the description | at risk: Netlify chosen (D-060 (2), D-069; project `sonicspace`) but not live; the address comes from Parth | T-108, T-183 |
| Build hash in "How to test" | not done; the build stamp `version.json` exists (T-108 prep) | T-183 |
| Video link | not done | T-181 |
| Target launch | done: "Early 2027 on the Meta Horizon Store, as a web app.", agreed 9 Nov (D-069) | T-180 |
| Team: names, emails, roles | not done: emails come from the humans | T-185 |
| The real form field list | not done | T-115 (Chinmay) |

### 3.3 Description (§2.1) and its copy rules
| Item | State | Task |
|---|---|---|
| The four required sections, both links, the hash | draft v3 here (§1.2, 9 Nov); the Pages link is real; the mirror and hash are placeholders | T-180, T-183 |
| ≤500 words | done at 495 (10 Nov, v3.2, by the same script); 5 words of slack; the hands text does not fit if the form has no field for it | T-180, T-115 |
| Numbers measured on the final build (first sound, fps only if measured on a headset) | not done: fps measured on headsets on 7–8 Nov (Quest 3 live site, Quest 3S dev build), first sound in the emulator (24 Oct); the freeze build's not yet | T-183, T-184 |
| What was device-tested and what was emulator-only | drafted 9 Nov in "Known limitations" (two headsets, one room each, tested and emulator-only lists) | T-184 |
| The one qualified sentence on the room signature | "We found no app where the room sets the key." (10 Nov; was "As far as we know, no earlier consumer MR instrument lets room geometry tune the music", 25 Oct; no names, no "first"); true only if S1 ships | T-155, T-180 |
| Room wording v1 (size, ceiling, volume; no tempo; no "your table set the key"; no measured acoustics) | done in the draft; the echo stays a mapping of room size (P-017, which would have measured it, was skipped by D-056) | T-180 |
| Should-haves not green by 10 Nov moved to "What's next"; unbuilt Could-haves never named | not done; the draft names no Could. S3 (daily seed, growth) and S6 (laptop mode) are built now | T-169 |
| "Music visualization" in the Listen sentence; "spatial audio" | both in: "music visualization, spatial audio panned from each plant" (27 Oct), the caveat "panned" in the words, since the app pans each voice equal-power with no HRTF (`audio/Spatializer.ts`) | T-180 |
| Laptop mode in "How to test" | done: offered as a labelled preview (D-060 (11)), shortened 9 Nov | T-180 |
| Hands field | drafted (§1.3), updated 9 Nov with the headset changes (D-062, D-063, D-066, D-067) | T-180 |
| "What excites us about VR" | not done: must be the team's own words | **no task, add it to T-180 as a human step** |
| A no-room-signature version of pitch, tagline and video, ready for G2 | done 27 Oct: tagline B, the video's version (VIDEO_SCRIPT_V0 §2) and the description's cut list ("Conditional rewrites" under the copy, §1.2) | T-155 |

### 3.4 Gallery (§2.2: 6 images, 1920×1080, real captures)
| Item | State | Task |
|---|---|---|
| 1 Hero on a real table, halo | not done; headsets in hand; whether a Quest capture shows passthrough is untried (DECISIONS_PENDING 4 step 8) | T-182 |
| 2 Tuning ripple with its captions | not done; the ripple and its captions are in the app (T-142) | T-182 |
| 3 Palm-up seed arriving | not done; in the app (T-128d) | T-182 |
| 4 Pinch-planting close-up | at risk: the app draws no hands (D-027), so only a headset capture with passthrough shows the pinch (untried) | T-182; capture rig: **no task, add one** |
| 5 Two rooms, two songs | at risk: needs S1 and two rooms (or two emulator rooms with `forceSignature`, captioned); until the plant colours are chosen (item 34) the two rooms look alike | T-182 (T-155, T-163) |
| 6 Settings panel, high contrast | not done; the panel is in the app (T-128d); high contrast leaves the seed, orb and petal without an outline (BUG-008) | T-182 |
| Icon | not done | T-182 |

### 3.5 Video (§3)
| Item | State | Task |
|---|---|---|
| The loop in the first 10 s | not done: the loop plays in the app (T-128d); the capture needs a visible hand | T-153, T-181 |
| The room signature in two rooms | at risk: S1 is gated at G2; the ripple and its chord are built (T-142, T-142b) | T-155, T-181 |
| Day 1 against day 3 (`fakeDay`) | not done; possible now: growth is drawn (T-119) and saved across days (T-128e, TC-E2E-06) | T-181 |
| Hosted URL in the last 4 s | not done; the URL is live (8 Nov) | T-181 |
| Chapters in the YouTube description | not done | T-181 |
| Device footage, else emulator footage captioned "captured in the Immersive Web Emulator" | not done; device footage possible now; a 10 s Quest recording with sound is the first check (DECISIONS_PENDING 4 step 8). For Best First Five Minutes, show the first 60 s without cuts (RND §2) | T-181 |
| A visible hand in emulator footage ("settle this before any emulator capture") | **not done and owned by nobody** (PROGRESS items 32 (7), 33 (4)) | **no task, add one** |
| The app's own sound in the video is the chosen style | at risk: no style picked (item 35); the sound in the app today was called "too boring" (D-051) | T-164 |
| No AI footage; no brands, logos or people in frame; music only from the app; burned-in captions | not done | T-181 (TC-POL-05) |

### 3.6 Go/no-go (§4), with the compliance gate (HACKATHON_RULES §10)
| Item | State | Task |
|---|---|---|
| C1 whole flow hands-only (device, or emulator in Emergency mode with the description saying so) | partly: hands only on Quest 3S and Quest 3 (7–8 Nov, D: enter, plant, shape, Listen, settings, Exit, save); undo, a hands-free run and Day 2 not yet on a headset; UAT-01 on the freeze build | T-184 |
| C2 first commit on or after 24 Sep | **done**: 4c831aa, 2026-10-10 | — |
| C3 every third-party item licensed and listed | done for what ships (§0 closed by T-171; 63 of 65 packages permissive, the other two not built in); no package added since 15 Oct (package files unchanged from cc37db5 to dca03de); one dangling scaffold licence pointer left (§3 of that file) | T-170 |
| C4 no brands, logos or people (app, video, images) | done for the app's words (T-167 sweep); the words added since (the first-minute hints, laptop mode, look-and-hold) read for this draft on 17 Oct: no brand, no person; video and images not made | T-181, T-182 |
| C5 ≥60 fps over 10 minutes on Quest 3 | partly: 90 fps on Quest 3 (live site, 8 Nov) and about 90 on Quest 3S (dev build, 7 Nov), not over a timed 10 minutes; the freeze build on both | T-184 |
| C6 public HTTPS, no login | partly: the Pages link is public HTTPS with no login since 8 Nov; UAT-02 on a clean headset with the freeze build | T-183, T-184 |
| C7 video under 3:00, public, real footage | not done | T-181 |
| C8 the Representative is a Start member; everyone 18+ and eligible | **at risk: unconfirmed since 10 Oct** (PROGRESS items 5 and 32 (13)) | T-115 |
| C9 all text in English | done for the app (T-167; the words added since read on 17 Oct); final sweep | T-184 |
| C10 submitted on time | not done | T-185 |
| P0 UAT scenarios from a clean headset | not done; headsets in hand | T-184 |
| Zero open S1/S2 bugs | done on 9 Nov: BUG_LOG "Open S1/S2 count: 0" (BUG-032 and BUG-033 fixed in the emulator, device check pending) | T-168 |
| The landing page and the app promise only what is built, before a public address | mostly true now: the four switches, saving and Listen are in the app (T-160, T-128e, T-148). Still false: the ripple captions "Table: colour." and "Walls: colour." (nothing tints until item 34). Still missing: the help line that names the settings orb | T-163, T-170 (its go-live rule) |
| Test pages published with the app (`/proto/spike/`, `/proto/pinch/`, `/proto/bed/`) | done: dropped from the submission build (D-060 (10)); `scripts/check-dist.mjs` fails a build that has them; a LAN preview still builds them with `ROOMSONG_PROTO=1` | T-189 |
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
