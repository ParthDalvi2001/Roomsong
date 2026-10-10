# Winning Strategy — Track, Idea, and Scoring Map

**Status:** Approved · **Owner:** product-owner · **Version:** 2.1 (2026-10-10, plan v2.1 propagated by T-113; v2.0 2026-10-10; v1 2026-10-09)
**Decision record:** D-001, D-002, D-003, D-010 (room signature), D-011 (scope cut), D-019–D-028 (plan v2.1 and contract v1.2) in `08-status/DECISIONS_LOG.md`
**Change sheets:** `08-status/REPLAN_2026-10-10.md` (v2) · `08-status/PLAN_AMENDMENT_2026-10-10.md` (v2.1)

> v2 changes in one line: the garden stays the base; the **room signature** ("every room has its own song") becomes the
> differentiator; twist/flick/seasons/Codex are cut; we state our odds and the prior art honestly.
> v2.1 changes in one line: the room sets **key, mode and echo** (not tempo; the table does not set the key); the bed sits at
> 0.45 m; anchors are Must; **Listen mode is our proof of track fit**; the one allowed "first" wording is in §0.2.

---

## 0. Fact check & prior art (read before writing any pitch copy)

### 0.1 What already exists (found in a quick search on 2026-10-09/10; not exhaustive)

| Prior art | What it is | What it shares with us | **What we add over it** |
|---|---|---|---|
| **Bloom** (Eno & Chilvers, 2008, mobile) and **Bloom: Open Space** (2018, HoloLens) | Generative ambient music; tap (or, on HoloLens, **pinch**) to place a blooming note that repeats; always in tune | Pinch-to-bloom, repeating notes, "you cannot play a wrong note", the calm aesthetic | Position on a *real table* sets pitch and timing (a readable sequencer, not free placement); plants are shaped by hand; the garden persists and grows across days; **the room's geometry decides the key, mode and echo** |
| **Blooming Conductor** (Meta store, 2026) | Hands-only musical garden with an MR mode | A garden that makes music, hands-first, mixed reality. **This is the closest shipped neighbour; we must not pretend it does not exist** | Room signature (the room, not a menu, tunes the song); radial sequencer on a table (position = when + pitch); persistence and overnight growth; a seated, lean-back Listen mode in the echo of your own room; a full accessibility set (one-hand, gaze-dwell, visual beat) |
| **Inkphony** (2025 Lifestyle winner, $100k) | "Everything around you becomes an instrument": surfaces in your room are played live | Room surfaces are musical; passthrough is purposeful | We are a *garden that composes and grows over days*, not an instrument you perform live. The room sets the song's key once (quantised), rather than being a drum you hit |
| **(m)ORPH Mixed** (2025 Entertainment, honourable mention) | Audio-reactive MR visuals | Music + MR visuals in the Entertainment track | Ours is an authoring loop (plant, shape, listen), not visualisation of existing audio |
| **OpenSoundLab** (2025 Judges' Choice) | Modular synthesis in VR | Serious sound design in XR | We target non-musicians with a 60-second mastery curve; scale quantisation, no patching |
| **MR4MR** (research paper, 2022), **ARCHISCORE** (art project), **RoomTone** (open prototype) | Art, research and prototype work in which a room or its geometry drives music (research report §15) | The idea that a room can shape music. **They are why we never say "never done"** | A shipped, consumer, hands-first MR instrument on Quest in which the room tunes a garden the player composes and keeps |
| 2026 rival repos: `xkazm04/garden-vr`, `najmunnaharhira/Meta-VR-Start-Developer-Competition-2026` | Public repos building "daily garden" style entries for this competition | Daily-return garden mechanics; "grow something on your table" | A *musical* garden with a readable sequencer, and the room signature. **Convergent risk is real: "daily garden" alone will not be original in this field** |

### 0.2 Claims we may and may not make
- **May say:** "a garden that composes, grows over days, and is tuned by the room you are in".
- **The one "first" wording allowed (plan v2.1):** "to our knowledge, the first consumer MR instrument, and the first on Quest, in which the room's geometry tunes the music", always with "to our knowledge" and with the art and research antecedents acknowledged (MR4MR, ARCHISCORE, RoomTone). The research rates the underlying finding medium to high confidence; it is not proof, so the qualifier is never dropped.
- **May NOT say:** "first musical garden" (a hands-only MR musical garden has shipped, §0.1); "first ever"; "the only"; "no shipped app derives music from room geometry" as a bare fact. Unverified claims in Devpost copy are a presentation risk, the 2026 rules name false or misleading content as a ground for disqualification, and judges who know *Blooming Conductor* or *Bloom: Open Space* will dock us for it.
- **May NOT say about the build (false in v1):** that the room sets the tempo; that the table sets the key ("your table set the key"); that we measure or predict the room's acoustics (the echo length is a musical mapping of room volume, LLD §5.8); that device behaviour was verified when it was only run in the emulator.
- **"The same room always gives the same song":** the key and the mode are stable; the echo can move one step between visits in about 1 room in 6 (LLD §5.8). Until the device check T-129 compares two sessions in one room, copy says "the same room gives the same key and scale".
- The Devpost description names the difference from generative "tap to bloom" music and the instrument-style winners explicitly; it does not name competitor products (no brand names, rules §4). The three antecedents are cited as prior art and research, not as products; if the Representative judges even that a risk, the copy says "art and research prototypes" without names.

### 0.3 Honest odds
- Last year: 650+ submissions for 6 track prizes, 8 special awards and 2 Judges' Choice. **Base rate ≈ 1% per entry** for a track prize, ≈ 2.5% for any prize at all.
- With top execution (shipped, stable on device, a clear hook, a strong video) we estimate a **realistic target band of 8–15% for any prize**, mostly via a special award (Boldest Original Concept or Reason to Come Back) or Entertainment runner-up. A $100k track win is possible but is not the planning assumption.
- **Without a headset, the band collapses** toward the base rate: fps, hand feel and untested-room behaviour cannot be verified, and the video is emulator footage. Headset acquisition (T-000) is therefore the single highest-value task on the project.

## 1. Which track? → **Entertainment, New Experience division** (unchanged from v1)

| Track | Top prize | Expected competition | Fit with an AI-assisted team | Verdict |
|---|---|---|---|---|
| Gaming | $100k | **Highest.** Most of last year's 650+ entries were games, and studio-quality competitors enter here | Games need lots of art, animation and level design, the slowest work for an AI-assisted team | ❌ Too crowded |
| **Entertainment** | **$100k** | **Medium.** Fewer polished entries; "media experience" is hard to do well, so a strong entry stands out | Music visualization and procedural visuals are *code*, which Claude and Three.js shaders handle well | ✅ **Best expected value** |
| Productivity | $70k | Medium, but many entries become "floating panels", which judges have seen many times | Easier to build, but a 30% lower prize ceiling, and hard to stand out | ⚠️ Lower ceiling |

**Division: New Experience.** We have no pre-existing project, and the New division is not shared with
studios polishing shipped titles. Prize money is identical across divisions.

**Why Entertainment wins on expected value:** the same $100k top prize as Gaming, with a thinner field.
Its definition ("music visualization, spatial audio, immersive storytelling, content consumed in any
environment") also suits what an AI-assisted web team builds best: procedural, shader-driven, audio-reactive work.

**Our proof of track fit is Listen mode** (PRD M4): the player stops interacting, leans back, and the garden performs as
music visualization (halo, beat ring, plants lighting as they sing) in spatial audio. Planting is how the content is made;
Listen mode is how it is consumed. Copy and video use the track's own words, "spatial audio" and "music visualization",
and the video gives Listen mode its own beat. Without Listen mode the entry reads as a creative tool, the wrong track.

## 2. The idea: **Roomsong, a music garden on your real table, tuned by your room**

### One-liner (tagline, ≤140 chars)
> *Plant glowing seeds on your real table with a pinch. Each one sings. Every room gives your garden its own song.* *(111 chars)*

### The differentiator, in one sentence
**Every room has its own song.** The room is read once at session start and turned, deterministically, into three
things (the **room signature v1**, PRD §2, SRS FR-ROOM-10..13, D-021): the room's **size** sets the key (a bigger room
sings lower), its **ceiling height** sets the mode (major, minor or sus pentatonic) and its **volume** sets the echo.
The table and the walls pick the starter voices and the colour tint. The tempo is the player's; the room does not set
it. The same room gives the same key and scale; a different room re-tunes the garden in place. The garden is the base;
the room signature is why this entry is not "another music app".

### The concept in 5 beats
0. **Tune.** The bed settles onto your table and, within 5 s, a light ripple crosses the table, then the nearest
   wall, then the ceiling. Each surface rings one note of the room's chord and shows a three-word caption that is true
   for v1 (LLD §5.8): *your room tunes the garden.* Rooms with
   no detectable surfaces get the "Wanderer" signature (C major pentatonic, 84 BPM) and still play.
1. **Seed.** Turn your palm up, and today's seed floats into it. Each seed is a musical voice (bell, pad, pluck, bass, choir).
2. **Plant.** Pinch the seed and set it into a ring-shaped **garden bed anchored to your real table** (5 pitch rings, 16 steps,
   80 cells). The bed is a *radial music box*: angle around the ring = **when** it plays, distance from centre = **pitch**.
   Plants snap to the room's scale, so it always sounds good.
3. **Shape.** Pinch-and-pull a plant up to grow it (longer and louder). Drag it to another cell. Drag it off the bed to remove it
   (an undo petal floats for 5 s). A slow **tide of light** sweeps around the ring, and each plant it touches blooms and plays.
4. **Listen.** Turn your palms out (or dwell on the Listen orb) and lean back. The lights dim, an **aurora halo** rises over the bed,
   and the garden performs. Sounds come from where each plant physically is (spatial audio), in an echo as long as your
   room is large. This is the Entertainment beat (§1). Vines of light on a wall are a Could-have (C4, D-021).

**Come back tomorrow:** the garden is saved locally and returns to its spot on your table (anchored; re-placed if the
anchor does not resolve); one new seed arrives each day and plants
show growth stages at 1/3/7 days (Should-have). Take it to a different room and it re-tunes: *same garden, new song.*

### Why this wins (judging-criteria map, 25% each)

| Judging criterion | How Roomsong scores | Honest gap |
|---|---|---|
| **Innovation & Creativity** | The *position in your real room* **is** the composition, and the *room itself* **is** the key. Scene understanding (planes, room geometry) drives the music, not just the placement. Repeat use: a different room, or tomorrow's seed, gives a new song. | A musical garden is not new (§0). Without the room signature we are a polished variant of known ideas. |
| **Experience Design** | Seated by design (the bed centre sits 0.45 m in front of you on your table by default, its far edge on the 0.75 m reach cap). No text-wall onboarding: the first seed floats to your hand; first sound ≤20 s. A hover cue shows what a pinch will act on before it commits, and a hand that leaves view loses nothing. **Purposeful passthrough**: the table is the stage and the room's geometry tunes the song. FoV-aware: the bed fits within ±25°. | The "Tune" beat must read as *caused by the room*, not as random; the tuning ripple exists for that reason. |
| **Technical Implementation** | Hand tracking (pinch, pull, drag, palm-up/out poses, tracking-loss recovery), plane detection (table, walls, ceiling), hit-test fallback, persistent anchors with a re-placement fallback, spatial audio (24 pooled equal-power panners, one reverb whose length follows the room), instanced rendering within budget, a **4-level placement chain** and a **Wanderer fallback** so it works in rooms we never tested. | **Unverified on device until a headset exists** (fps, hand feel, plane availability, anchor restore). Everything in this row is emulator-verified only today. |
| **Polish & Presentation** | A cohesive bioluminescent art direction tinted per room, every sound synthesized in real time (no licensing risk), and a video with a true demo: *"two rooms, two songs."* | Emulator footage, if that is all we have, looks flat next to device captures. |

### Special awards we target (priority order; a single build can be considered for all)
1. **Boldest Original Concept (primary):** "the room writes the key; your hands write the song." It falls apart on a flat screen and in a room-less app.
2. **Best Reason to Come Back (secondary):** a saved garden that returns to its spot, a daily seed, growth stages, and a new song in every room you take it to. Never punishing.
3. **Best First Five Minutes:** first sound within 20 s of launch, the Tune beat within 5 s, first loop within 90 s, no text instructions; checked with strangers (UAT-16: at least 4 of 5 unaided).
4. **Best Accessibility Forward:** one-hand mode, head-gaze dwell (select + Listen for limited mobility), high-contrast mode, voices told apart by **shape plus colour**, visual beat ring for deaf and hard-of-hearing players, reduced-motion mode (ripple becomes a glow sequence), a flashing cap (nothing changes brightness more than 3 times per second), adjustable bed height.
5. **Judge's Choice:** a backup path.

### Why not something else?
- **Spatial cinema / video player:** fails the "take it away test" (it's just the video) and has IP risk.
- **Music-instrument-in-your-room:** 2025's Lifestyle winner was this ("everything around you becomes an instrument").
  Our difference: a *garden that composes and grows over days*, tuned once by the room, not an instrument you play live. Say so explicitly in the description.
- **A plain daily garden:** at least two public 2026 repos are building one (§0.1). Without music and the room signature we would be one of several.
- **Multiplayer co-watching:** network infrastructure, moderation and policy load are too high for 5.5 weeks.
- **LLM companion:** a wrapper risk ("take it away test"). The rule-based "Gardener" helper is cut (D-011).

## 3. Risks and how we neutralise them

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **No headset on the team** | **Certain today** | **Critical** | T-000 headset acquisition is the top task. Emulator-first (IWER + Immersive Web Emulator); device-spike and pinch-test pages ready to run the day a headset arrives. Gates: H1 headset by Oct 20; Emergency mode from Oct 27 (emulator video, honest description); submit-or-withdraw decision Nov 8. |
| Judges see it as "another music app" | High | High | Lead every piece of copy and the video with the room signature ("two rooms, two songs"). Name the difference from generative-bloom apps and live instruments in the description. |
| The room signature feels random, not caused | Medium | High | The **tuning ripple**: each detected surface visibly rings one note of the chord within 5 s of placement; the signature is quantised so the same room gives the same key and scale; v1 keeps the two best-evidenced mappings (size → key, volume → echo) plus ceiling → mode, which has no such evidence yet, and leaves tempo and table height out; each ripple caption names its surface and is true; a settings line shows what the room set and from what; the stranger test UAT-17 checks it (at least 3 of 5 attribute the change to the room), and the mode rule is the first to become a constant if it fails. |
| Convergent "daily garden" entries (2026 repos) | Medium | Medium | Music + room signature as the hook; do not sell the daily seed as the headline. |
| Planes unavailable in the judge's room (no Space Setup, 3S, browser flag) | High | Medium | Fallback chain for placement, and the **Wanderer** signature for tuning: always a song, never a dead end. Device evidence (T-104, T-129) decides at G2 whether S1 ships; the default is to build it with the Wanderer fallback. |
| No table plane detected in a judge's room | High | High | Fallback chain: table plane → any horizontal plane at 0.5–1.1 m → hit-test placement → floating bed. Every level is fully playable. |
| WebXR perf dips below 60 fps | Medium | High | Hard budgets (HLD §7), instancing, perf HUD, emulator draw/tri/JS-ms budgets now; device perf runs the moment a headset exists; Fixed Foveation. |
| Hand-tracking jitter makes placement fiddly | Medium | High | Snap-to-cell annulus (5×16), 2.5 cm targets with a 4.0 cm hit radius (provisional; T-105 sets the final size), a hover cue with a 0.5 cm dead band and commit on release, pinch hysteresis (2.0 / 3.2 cm), a 1€ filter on the pinch point (tuned on device), tracking-loss recovery. |
| Sounds bad or out of tune | Low | High | All pitches quantised to one of three pentatonic modes with no semitone clashes (D-025); a mix limiter; desktop sound prototype rated at G0 (Oct 17); weekly listening review. |
| Name "Roomsong" is taken | Low (resolved, D-016) | Medium | Roomsong was chosen on 2026-10-10 after a quick search found no conflict; that is not a trademark search. |
| The Claude usage limit runs out again | Medium | High | 2 agents at once by default, narrow task cards, the reset day used for integration and human tests (D-023). |
| Persistent anchors are unreliable on device (now a Must) | Unverified | Medium | Re-placement by the chain is the built-in fallback and keeps the garden; device check A1 in T-129. |
| Deadline slip | Medium | Critical | Gates G0 Oct 17 / G1 Oct 24 / G2 Nov 3 / G3 Nov 12 (D-023); feature freeze 2026-11-12, code freeze 2026-11-15, submit 2026-11-17. Scope already cut ≈55–60% (D-011). |
| Link breaks during judging | Low | Critical | GitHub Pages is the submitted URL, with a Vercel or Netlify mirror of the same build hash named in the Devpost text (D-022); separate prod (frozen) and staging deploys; a post-submission smoke test from a clean browser profile; uptime checks on both links until 2026-12-11. |

## 4. Positioning lines (reuse everywhere: video, description, gallery)
- "Your table is the stage. Your hands are the gardener. Your room writes the key."
- "Every room has its own song."
- "Compose without knowing music: where you plant is what you hear."
- "Five minutes a night. A garden that remembers you, and re-tunes wherever you take it."
- "Then lean back. Your garden performs in the echo of your own room." (the Listen-mode line: track fit)
