# Devpost Submission Draft v0, Judging Scorecard, and Gap List

**Status:** Draft v0 · **Owner:** product-owner · **Date:** 2026-10-15 · Checked against `develop` at cc37db5.
**Feeds:** T-180 (final copy), T-181 (video), T-182 (gallery), T-184 (go/no-go). The rules of copy are SUBMISSION_CHECKLIST §2.1 ("Copy rules"); this file obeys them and does not replace them.
**Sources read:** HACKATHON_RULES §3, §5, §6, §10 · SUBMISSION_CHECKLIST §1 to §5 · WINNING_STRATEGY §0 to §2 · PRD §1, §3, §6 · SPRINT_PLAN v2.1 · PROGRESS (Now table, stand-ups to 15 Oct 00:46 IST) · USER_MANUAL · THIRD_PARTY_LICENSES §0 · DECISIONS_LOG · BUG_LOG.

**Markers.** `[not yet: T-nnn]` follows every claim that is false today and names the task that makes it true. `<...>` is a number or choice filled in from the final build (checklist rule "Numbers"). Before submitting, every marker is resolved: the task is done, or the sentence is cut. A sentence with an open marker never ships.

**Where the build stands (15 Oct).** 35 of 70 tasks done by the last stand-up (the brief says 36). The app today: the landing page, Enter, sound unlocked in that press, the bed placed on the table (or a ghost bed and a pinch, or floating), and the bed restored to its spot on the next visit. The parts of the loop (seed on the palm, plant, tide, five voices, spatial panning, shaping, room signature) are built and tested one by one; joining them into the app is T-128d, in progress. Nothing has run on a headset. First download about 0.7 MB (699 kB, PROGRESS 13 Oct). Zero network requests after load (TC-E2E-01). The USER_MANUAL's state marks date from 13 Oct (3ca3392) and lag the plan: T-119, T-127, T-128c and T-146 have merged since.

---

## 1. The submission text, draft v0

### 1.1 Form fields (HACKATHON_RULES §5.3; field list to be confirmed by Chinmay in T-115)

| Field | Draft | State |
|---|---|---|
| Name | Roomsong | done (D-016; a quick search, not a trademark search) |
| Tagline (≤140) | A, if the room signature ships: "Plant glowing seeds on your real table with a pinch. Each one sings. Every room gives your garden its own song." (111 characters) `[not yet: T-142, T-155]` · B, if it is cut at G2: "Plant glowing seeds on your real table with a pinch. Each one sings, and your garden grows every day you return." (112 characters) `[not yet: T-128e]` | choose at G2 (T-155) |
| Track | Entertainment | done (D-001) |
| Division | New Experience (first commit 2026-10-10, 4c831aa) | done |
| Build link | `https://parthdalvi2001.github.io/Roomsong/` `[not yet: T-108]` | Pages not live; Parth's steps in PROGRESS item 3 |
| Mirror and build hash | named in the description, not in the link field `[not yet: T-108, T-183]` | mirror not chosen |
| Video | public YouTube, 60 to 90 s `[not yet: T-153, T-181]` | not started |
| Target launch | `<team decides>`; the checklist's draft is "Q1 2027 on the store, as a web app" | needs Parth and Chinmay |
| Team | Parth · `<email>` · Developer; Chinmay · `<email>` · Product Manager (Representative). Agents are not team members | emails from the humans; Chinmay's Start membership unconfirmed (PROGRESS item 5) |
| Gallery | 6 images, §4 of this file | not started (T-182) |

### 1.2 Description (≤500 words)

Where each heading comes from:

| Heading | Source of the heading | Words (headings and placeholders counted, markers not) |
|---|---|---|
| How to test | SUBMISSION_CHECKLIST §2.1 (a required section; it comes first) | 63 |
| What it is | HACKATHON_RULES §5.3 "inspiration"; SUBMISSION_CHECKLIST §2.1 "Inspiration" and "What it does", merged to save words | 69 |
| Your first minute | the brief for this draft; PRD §3.1 (the First Five Minutes flow); its steps are the judge's path, so "How to test" points to it | 62 |
| After that | SUBMISSION_CHECKLIST §2.1 "What it does" (shaping, Listen, coming back) | 59 |
| How this meets the brief | SUBMISSION_CHECKLIST §2.1 (required); HACKATHON_RULES §3 (the theme and the design tests) | 57 |
| How we built it | HACKATHON_RULES §5.3 "how we built it"; SUBMISSION_CHECKLIST §2.1 | 90 |
| Known limitations | SUBMISSION_CHECKLIST §2.1 (required); CLAUDE.md Golden Rule 11; HACKATHON_RULES §10 C1, C5, C7 | 71 |
| What's next | HACKATHON_RULES §5.3 "future plans"; SUBMISSION_CHECKLIST §2.1 (required) | 18 |

Total: **489 words with both "Known limitations" alternatives, 481 with the one that is true today** (counted by script with the markers removed; the first draft was over 750). About 20 words of slack: every placeholder filled with a real number or name should replace words, not add them. If the form has no separate hands field (T-115), the hands text of §1.3 (140 words) cannot fit and must shrink to about 20 words inside these 500.

**The no-headset path (the brief's second path).** The rules ask for a build that launches in Quest Browser (HACKATHON_RULES §5.1) and allow emulator video (§5.2). They describe no way for a judge without a headset to test, so the draft sends that judge to the video. Today a desktop browser shows only the start page, with the line "Roomsong is played in a mixed-reality headset. Open this page in the browser of a Meta Quest 3 or 3S." The garden window (S6, T-114, not started) would let a desktop judge plant with a mouse, but PRD §6 calls it "never the judged path". No digest line says the rules changed; the weekly re-read (T-186) is due Friday 16 Oct and was not done here (no web access in this task).

```markdown
## How to test
Quest 3 or 3S, hand tracking on, controllers down, seated at a table. Space Setup lets your room tune the song [not yet: T-142, T-155].
1. In Meta Quest Browser open <GitHub Pages URL> [not yet: T-108]. Mirror: <mirror URL>. Build <hash> (/version.json) [not yet: T-183].
2. Press Enter the garden; allow hands and room.
3. Follow "Your first minute", then hold both palms out [not yet: T-148].
No headset? See the video [not yet: T-181].

## What it is
Instruments ask for skill before they give joy. We wanted a song you grow. Roomsong turns your real table into a glowing ring-shaped garden where every plant sings. Where you plant sets when it plays and how high. A sweep of light plays each plant, always in one scale [not yet: T-128d]. Your room tunes it: floor size sets the key, ceiling height the scale, room volume the echo [not yet: T-142, T-155].

## Your first minute
The ring settles on your table (no table: look at a surface and pinch). A ripple crosses table, wall and ceiling, each ringing a note [not yet: T-142]. Hold a palm up: a seed glides in [not yet: T-128d]. Pinch it with your other hand; its landing spot lights up [not yet: T-128d]. Let go: the sweep makes it sing [not yet: T-128d]. Three plants make a song within 90 seconds [not yet: T-150].

## After that
Pull a plant up to make it louder, drag to move it, drag it off the ring to remove it; 5 seconds to undo [not yet: T-128d, T-147]. Palms out: the lights dim, a halo rises, and the garden performs, music visualization in spatial audio [not yet: T-148]. It is saved and returns to its spot; each day brings a seed, and plants grow [not yet: T-128e].

## How this meets the brief
- Entertainment: a lean-back Listen mode [not yet: T-148].
- Hands-first: bare hands only; no controller path.
- Seated: the bed sits 0.45 m ahead, within reach; first sound in <N> s [not yet: T-150]; ten-minute visits [not yet: T-148].
- Purposeful MR: the table is the stage, the room the tuning [not yet: T-142, T-155].
- Original: synthesized sound, procedural visuals, offline after loading.

## How we built it
WebXR with the Immersive Web SDK, Three.js, TypeScript and Web Audio. Plane detection finds the table, with a four-step fallback: table, any surface in reach, look and pinch, or floating. A fixed mapping turns room measurements into key, scale and echo [not yet: T-128d]. <20> draw calls [not yet: T-165], 24 pooled voices, a <0.7> MB download. To our knowledge it is the first consumer MR instrument, and the first on Quest, in which the room's geometry tunes the music; art and research projects (MR4MR, ARCHISCORE, RoomTone) explored the idea before us [not yet: T-155].

## Known limitations
<"Tested on Quest <3/3S> in <N> rooms." | "No headset: built and tested only in the Immersive Web Emulator, video included.">
Quest frame rate, hand feel, target sizes and room readings are unverified on a headset [not yet: T-129, T-165]. The echo maps room size musically; it does not measure acoustics. Rooms without a scanned table or walls get the default tuning. A room near a measuring step can change scale between visits.

## What's next
<Should-haves that missed 10 Nov.> Shared gardens: a friend's garden in your room's key. <Target launch.>
```

Claims that hang on a human decision, not a task (resolve before T-180):

| Claim in the copy | Depends on | Today |
|---|---|---|
| "the bed sits 0.45 m ahead, within reach" | D-041: a restored bed may sit 0.10 m further, its far edge up to 0.85 m (PROGRESS item 31) | true for a new placement; true for a restore only with "no slack" |
| "First sound in <N> s" | PROGRESS items 23 and 26c: in a room with no table the plan measures 22 s, not 20 | the 20 s rule fails there until Parth picks a, b or c |
| The three named antecedents | PROGRESS item 16a: "keep the names" or "no names" | the no-names version is "art and research prototypes" |
| "A room near a measuring step can change scale between visits" | PROGRESS item 21 and T-129: the real drift is unmeasured | keep the sentence until the device check |
| Any "same room, same song" line | T-129 two-session check | not written anywhere above, on purpose |
| "bare hands only; no controller path" | HACKATHON_RULES §10 C1, UAT-01 on device or, in Emergency mode, in the emulator | true by design; proven only at T-184 |

### 1.3 Hand interactions and the future of VR (HACKATHON_RULES §5.3, optional field we fill; SUBMISSION_CHECKLIST §2.1)

```markdown
## How hands are used
Hands only; no controller is ever needed. Palm up to receive a seed; pinch to plant; pinch and pull to grow; pinch and drag to move; drag off the ring to remove [not yet: T-128d, T-147]. Palms out, or a pinch on the Listen orb, to listen [not yet: T-148]. You see your own hands in passthrough; the app draws none. What a pinch will act on lights up first, and every action commits when you let go [not yet: T-128d]. Targets are 2.5 cm wide with a 4 cm hit radius, pinch hysteresis and smoothing, provisional until a headset test [not yet: T-129]. A hand that leaves the headset's view loses nothing: what it held goes back [not yet: T-128d]. Accessibility: high contrast, voices told apart by shape and colour, and nothing changes brightness more than 3 times a second [not yet: T-128d]; one-hand mode, head-aimed look-and-hold, a visual beat ring and reduced motion [not yet: T-160].

## What excites us about VR
<The team writes this in its own words. A starting point for Parth and Chinmay to rewrite: "A headset can see the room you are in. Most apps treat the room as a backdrop. We wanted the room to take part: your table holds the garden and your room tunes it, so the same garden can sound different in another room.">
```

---

## 2. Judging-criteria scorecard (HACKATHON_RULES §6; 25 % each)

Scored harshly, as a judge would score the build at `develop` today, with no headset. "Nov 12" is a guess at feature freeze if the plan lands and no headset arrives; with a headset and the device script run, add about 1 to Technical and Polish.

| Criterion | Today | Nov 12 (no headset) | Evidence in the repository | Tasks that raise it most before 12 Nov |
|---|---|---|---|---|
| **Stage 1 pass/fail** | **fail** | pass | No public link (T-108 blocked on Parth); the loop does not play in the app (T-128d); Listen, the track-fit proof, is not built (T-148); no video | T-108 go-live; T-128d |
| **Innovation & Creativity** | **4** | 6 | The room signature is built and tested as parts: room measurements (T-140), the mapping (T-141, 57 rooms worked by hand in review), re-tune spread over audio ticks (T-143). Prior art is close and named (WINNING_STRATEGY §0.1). Against: no player can see or hear the room tune anything yet, and S1 is a Should gated on device evidence (PRD §6) | **T-142** tuning ripple, with `setSignature` in **T-128d**; then keep S1 at **T-155** (G2) |
| **Experience Design** | **3** | 6 | In the app (emulator): landing page with accessibility switches (T-126), Enter with sound in the same press (T-128a), placement chain with a ghost bed and a pinch, floating fallback, anchor restore (T-123, T-128c, T-162). Built, not joined: hover cue and tracking-loss recovery (T-116, T-119), seed on the palm (T-127), shaping and the undo petal (T-146), settings panel (T-151). Missing: onboarding (T-150), Listen (T-148), accessibility in the garden (T-160), pause and resume (T-152). The 20 s first-sound rule fails in a room with no table (item 23) | **T-128d** then **T-150** (first sound ≤20 s, first loop ≤90 s); **T-148** Listen |
| **Technical Implementation** | **5** | 5 | About 1,460 unit tests and 78 browser tests in the emulator (15 Oct); an 80 % coverage gate, 98 to 100 % of lines in garden, audio, save and room (T-117); content-security policy and no-network gates in `verify` (T-109); first download 699 kB (T-171); 14 draw calls by default, 20 with every effect (D-044); a 24-voice pool with stealing and a click check (T-145); a breaker round every system (T-128a); a four-level placement fallback and a default tuning for rooms it cannot read. Against, and this is half the criterion: zero device runs, fps unmeasured, planes and anchors never seen in a real room; the rules ask for ≥60 fps on Quest hardware and rooms "the developer never tested" | **T-000** headset, then **T-129** sitting 1 (runs today, about 3 h 35); **T-165** perf pass |
| **Polish & Presentation** | **2** | 5 | Strong base: one procedural art direction, every sound synthesized, honest copy rules (SUBMISSION_CHECKLIST §2.1), no brand or real person in the app's words (T-167 sweep). Against: nobody has listened to the app's own engine (T-103 waits for Parth; G0 is 17 Oct); the look is unrated (items 18, 24); no video, no gallery, no link; emulator footage shows no hands (D-027) | **T-103** then **T-164** (sound is the product); **T-153** rough cut by 3 Nov with **T-163** art pass |

The plan's own G3 bar is a self-score of at least 8 on each criterion (SPRINT_PLAN, gate criteria). Without a headset, Technical cannot pass 6 and Polish cannot pass 6: the rules ask for fps on Quest hardware and judges expect device footage. That bar needs either a headset or an accepted decision at G3, recorded in DECISIONS_LOG.

---

## 3. Gap list against SUBMISSION_CHECKLIST

State: **done** · **not done** (on track) · **at risk** (a date, a human or a headset stands in the way).

### 3.1 Timeline (§1)
| Item | State | Task |
|---|---|---|
| First rough video cut, 3 Nov (G2) | at risk: needs the loop (T-128d) and Listen (T-148); emulator footage needs a hand cue nobody owns | T-153; hand cue: **no task, add one** |
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
| Tagline ≤140, naming a pinch and the real table | done as two variants (§1.1); the choice waits for G2 | T-155, T-180 |
| Track, division | done | D-001 |
| Build link (Pages URL) | at risk: Parth's go-live steps (PROGRESS item 3); the workflows have never run a deploy on GitHub | T-108 |
| Mirror named in the description | at risk: Vercel or Netlify not chosen | T-108, T-183 |
| Build hash in "How to test" | not done; the build stamp `version.json` exists (T-108 prep) | T-183 |
| Video link | not done | T-181 |
| Target launch | not done: a human decision | **no task, add it to T-180** |
| Team: names, emails, roles | not done: emails come from the humans | T-185 |
| The real form field list | not done | T-115 (Chinmay) |

### 3.3 Description (§2.1) and its copy rules
| Item | State | Task |
|---|---|---|
| The four required sections, both links, the hash | draft v0 here (§1.2) | T-180 |
| ≤500 words | at risk: draft v0 is 481 with one limitations line, about 20 words of slack; the hands text does not fit if the form has no field for it | T-180, T-115 |
| Numbers measured on the final build (first sound, draw calls, fps only if measured on a headset) | not done | T-150, T-165, T-183 |
| What was device-tested and what was emulator-only | drafted, both alternatives | T-184 |
| The one qualified "first" sentence | drafted; true only if S1 ships; names wait for item 16a | T-155, T-180 |
| Room wording v1 (size, ceiling, volume; no tempo; no "your table set the key") | done in the draft | T-180 |
| Should-haves not green by 10 Nov moved to "What's next"; unbuilt Could-haves never named | not done; the draft names no Could | T-169 |
| "Spatial audio" and "music visualization" in the Listen sentence | done in the draft; true only after Listen | T-148 |
| Hands field | drafted (§1.3) | T-180 |
| "What excites us about VR" | not done: must be the team's own words | **no task, add it to T-180 as a human step** |
| A no-room-signature version of pitch, tagline and video, ready for G2 | not done: the pitch, tagline B and the video beats 0:10 and 0:52 all hang on S1 | **no task, add it to T-155** |

### 3.4 Gallery (§2.2: 6 images, 1920×1080, real captures)
| Item | State | Task |
|---|---|---|
| 1 Hero on a real table, halo | at risk: a real table needs passthrough, so a headset; halo needs T-148 | T-182 (T-000, T-148) |
| 2 Tuning ripple with its captions | not done | T-182 (T-142) |
| 3 Palm-up seed arriving | not done; in the app with T-128d | T-182 |
| 4 Pinch-planting close-up | at risk: the app draws no hands (D-027); an emulator capture shows no pinch | T-182; hand cue: **no task, add one** |
| 5 Two rooms, two songs | at risk: needs S1 and two rooms (or two emulator rooms with `forceSignature`, captioned) | T-182 (T-155) |
| 6 Settings panel, high contrast | not done from the app; part pictures exist (`.tmp/settings-access-high-contrast.png`) | T-182 |
| Icon | not done | T-182 |

### 3.5 Video (§3)
| Item | State | Task |
|---|---|---|
| The loop in the first 10 s | not done: needs T-128d | T-153, T-181 |
| The room signature in two rooms | at risk: S1 is gated at G2 | T-142, T-155, T-181 |
| Day 1 against day 3 (`fakeDay`) | not done: the flag exists (T-106), growth is drawn (T-119), saving across days needs T-128e | T-181 |
| Hosted URL in the last 4 s | at risk: T-108 | T-181 |
| Chapters in the YouTube description | not done | T-181 |
| Device footage, else emulator footage captioned "captured in the Immersive Web Emulator" | at risk: no headset | T-000, T-181 |
| A visible hand in emulator footage ("settle this before any emulator capture") | **not done and owned by nobody** | **no task, add one** |
| No AI footage; no brands, logos or people in frame; music only from the app; burned-in captions | not done | T-181 (TC-POL-05) |

### 3.6 Go/no-go (§4), with the compliance gate (HACKATHON_RULES §10)
| Item | State | Task |
|---|---|---|
| C1 whole flow hands-only (device, or emulator in Emergency mode with the description saying so) | at risk: no headset; the flow is not joined | T-128d, T-184 |
| C2 first commit on or after 24 Sep | **done**: 4c831aa, 2026-10-10 | — |
| C3 every third-party item licensed and listed | done for what ships (§0 closed by T-171; 63 of 65 packages permissive, the other two not built in); one dangling scaffold licence pointer left (§3 of that file) | T-170 |
| C4 no brands, logos or people (app, video, images) | done for the app's words (T-167 sweep); video and images not made | T-181, T-182 |
| C5 ≥60 fps over 10 minutes on Quest 3 (Emergency: emulator budgets, fps "unverified") | at risk: no headset | T-129, T-165 |
| C6 public HTTPS, no login | not done | T-108, T-183, T-184 |
| C7 video under 3:00, public, real footage | not done | T-181 |
| C8 the Representative is a Start member; everyone 18+ and eligible | **at risk: unconfirmed since 10 Oct** (PROGRESS item 5) | T-115 |
| C9 all text in English | done for the app (T-167); final sweep | T-184 |
| C10 submitted on time | not done | T-185 |
| P0 UAT scenarios from a clean headset | at risk: no headset | T-184 |
| Zero open S1/S2 bugs | done today (BUG_LOG: 0; BUG-004 is S3 and open) | T-168 |
| The landing page promises only what is built before it reaches a public address | at risk: it offers three switches, saving and Listen that are not in the app yet; going live early would publish false promises | T-170 (its go-live rule) |
| Test pages published with the app (`/proto/spike/`, `/proto/pinch/`, `/proto/bed/`) | open: keep and name them, or drop them from the submission build (PROGRESS item 28) | **no task, add one** |
| Every member listed with a role; confirmation screenshot; tag pushed; smoke test | not done | T-185 |

---

## 4. Video: the first 10 seconds (no script yet)

From SUBMISSION_CHECKLIST §3 (0:00 to 0:10, "the loop, at once"), SPRINT_PLAN T-153 and T-181, and WINNING_STRATEGY §3 ("lead with the room signature"):
1. **A hand pinches the third seed into the ring on a real table, the sweep of light reaches it, and it sings**: the whole loop, in one shot, inside 10 s, with the caption "Pinch. Plant. It sings." Nothing before it: no title card, no menu, no text.
2. **The hand must be seen.** On a headset the real hand shows in passthrough. In emulator footage the app draws no hand (D-027), so a hand cue must be on and the first emulator shot captioned "captured in the Immersive Web Emulator" (HACKATHON_RULES §10 C7).
3. **End the 10 s on the hook:** the first tuning ripple leaving the table for the wall (the 0:10 beat, "Your room tunes it"), so the room signature, which the strategy says leads everything, starts by second 10. The checklist (loop first) and the strategy (signature first) pull against each other; this line is the compromise. If S1 is cut at G2, end on the halo rising instead.

---

## 5. Proposed plan additions (for the driving session; not in SPRINT_PLAN yet)

| Proposal | Why | Owner, by |
|---|---|---|
| New task: **emulator capture rig**, a visible hand in emulator footage and stills (the emulator's own overlay or a capture-only switch, captioned), 1080p 60 fps | SUBMISSION_CHECKLIST §3 says "settle this before any emulator capture"; nobody owns it; without it the first 10 s of an emulator video show no pinch | ux-designer + qa-engineer, before T-153 (31 Oct) |
| New task: **test pages in the submission build**, drop `/proto/*` from it or name them in "How to test" | PROGRESS item 28 is open and no task builds either answer | devops-engineer, decide at G2, built by T-183 |
| Add to T-155: **a no-room-signature version** of the pitch, tagline (B), "first" sentence (removed) and video beats 0:10 and 0:52 | the pitch, the Innovation case and two video beats hang on S1, which is gated at G2 | product-owner, 3 Nov |
| Add to T-180: the target launch decision, the team's own "What excites us about VR", the final word count, and creating `specs/06-release/evidence/` | four checklist items with no owner | Parth + Chinmay + product-owner |
| Optional (Could): check whether the Pages URL enters in desktop Chrome with Meta's Immersive Web Emulator extension; if it does, one line for judges without a headset | the rules give no headset-free path; this costs about an hour and replaces nothing in the build | qa-engineer, after T-108 |
