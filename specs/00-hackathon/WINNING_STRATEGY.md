# Winning Strategy — Track, Idea, and Scoring Map

**Status:** Approved · **Owner:** product-owner · **Version:** 2.0 (2026-10-10; v1 2026-10-09)
**Decision record:** D-001, D-002, D-003, D-010 (room signature), D-011 (scope cut) in `08-status/DECISIONS_LOG.md`
**Change sheet:** `08-status/REPLAN_2026-10-10.md`

> v2 changes in one line: the garden stays the base; the **room signature** ("every room has its own song") becomes the
> differentiator; twist/flick/seasons/Codex are cut; we state our odds and the prior art honestly.

---

## 0. Fact check & prior art (read before writing any pitch copy)

### 0.1 What already exists (found in a quick search on 2026-10-09/10; not exhaustive)

| Prior art | What it is | What it shares with us | **What we add over it** |
|---|---|---|---|
| **Bloom** (Eno & Chilvers, 2008, mobile) and **Bloom: Open Space** (2018, HoloLens) | Generative ambient music; tap (or, on HoloLens, **pinch**) to place a blooming note that repeats; always in tune | Pinch-to-bloom, repeating notes, "you cannot play a wrong note", the calm aesthetic | Position on a *real table* sets pitch and timing (a readable sequencer, not free placement); plants are shaped by hand; the garden persists and grows across days; **the room's geometry decides the key, tempo and reverb** |
| **Blooming Conductor** (Meta store, 2026) | Hands-only musical garden with an MR mode | A garden that makes music, hands-first, mixed reality. **This is the closest shipped neighbour; we must not pretend it does not exist** | Room signature (the room, not a menu, tunes the song); radial sequencer on a table (position = when + pitch); persistence and overnight growth; a seated, lean-back Listen mode that uses walls; a full accessibility set (one-hand, gaze-dwell, visual beat) |
| **Inkphony** (2025 Lifestyle winner, $100k) | "Everything around you becomes an instrument": surfaces in your room are played live | Room surfaces are musical; passthrough is purposeful | We are a *garden that composes and grows over days*, not an instrument you perform live. The room sets the song's key once (quantised), rather than being a drum you hit |
| **(m)ORPH Mixed** (2025 Entertainment, honourable mention) | Audio-reactive MR visuals | Music + MR visuals in the Entertainment track | Ours is an authoring loop (plant, shape, listen), not visualisation of existing audio |
| **OpenSoundLab** (2025 Judges' Choice) | Modular synthesis in VR | Serious sound design in XR | We target non-musicians with a 60-second mastery curve; scale quantisation, no patching |
| 2026 rival repos: `xkazm04/garden-vr`, `najmunnaharhira/Meta-VR-Start-Developer-Competition-2026` | Public repos building "daily garden" style entries for this competition | Daily-return garden mechanics; "grow something on your table" | A *musical* garden with a readable sequencer, and the room signature. **Convergent risk is real: "daily garden" alone will not be original in this field** |

### 0.2 Claims we may and may not make
- **May say:** "a garden that composes, grows over days, and is tuned by the room you are in"; "we found no shipped app that derives the song's key and tempo from room geometry in a quick search (unverified)".
- **May NOT say (as a fact):** "no shipped app derives music from room geometry"; "first ever"; "the only". Unverified claims in Devpost copy are a presentation risk, and judges who know *Blooming Conductor* or *Bloom: Open Space* will dock us for it.
- The Devpost description names the difference from *Bloom* and the instrument-style winners explicitly; it does not name competitor products (no brand names, rules §4).

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

## 2. The idea: **Roomsong, a music garden on your real table, tuned by your room**

### One-liner (tagline, ≤140 chars)
> *Plant glowing seeds on your real table with a pinch. Each one sings. Every room gives your garden its own song.* *(111 chars)*

### The differentiator, in one sentence
**Every room has its own song.** Your table's height and size, the floor area, the walls and the ceiling are read once
at session start and turned, deterministically, into the garden's key, mode, tempo, reverb and starter voices (the
**room signature**, PRD §2, SRS FR-ROOM-10..13). The same room always gives the same song; a different room re-tunes
the garden in place. The garden is the base; the room signature is why this entry is not "another music app".

### The concept in 5 beats
0. **Tune.** The bed settles onto your table and, within 5 s, a light ripple crosses the table, then the nearest
   wall, then the ceiling. Each surface rings one note of the room's chord: *this surface made this note.* Rooms with
   no detectable surfaces get the "Wanderer" signature (C major pentatonic, 84 BPM) and still play.
1. **Seed.** Turn your palm up, and today's seed floats into it. Each seed is a musical voice (bell, pad, pluck, bass, choir).
2. **Plant.** Pinch the seed and set it into a ring-shaped **garden bed anchored to your real table** (5 pitch rings, 16 steps,
   80 cells). The bed is a *radial music box*: angle around the ring = **when** it plays, distance from centre = **pitch**.
   Plants snap to the room's scale, so it always sounds good.
3. **Shape.** Pinch-and-pull a plant up to grow it (longer and louder). Drag it to another cell. Drag it off the bed to remove it
   (an undo petal floats for 5 s). A slow **tide of light** sweeps around the ring, and each plant it touches blooms and plays.
4. **Listen.** Turn your palms out (or dwell on the Listen orb) and lean back. The lights dim, an **aurora halo** rises over the bed,
   and the garden performs. Sounds come from where each plant physically is (HRTF spatial audio); where a wall is detected,
   vines of light climb it (Should-have).

**Come back tomorrow:** the garden is saved locally and re-placed on your table; one new seed arrives each day and plants
show growth stages at 1/3/7 days (Should-have). Take it to a different room and it re-tunes: *same garden, new song.*

### Why this wins (judging-criteria map, 25% each)

| Judging criterion | How Roomsong scores | Honest gap |
|---|---|---|
| **Innovation & Creativity** | The *position in your real room* **is** the composition, and the *room itself* **is** the key. Scene understanding (planes, room geometry) drives the music, not just the placement. Repeat use: a different room, or tomorrow's seed, gives a new song. | A musical garden is not new (§0). Without the room signature we are a polished variant of known ideas. |
| **Experience Design** | Seated by design (the bed sits 0.40 m in front of you on your table). No text-wall onboarding: the first seed floats to your hand; first sound ≤20 s. **Purposeful passthrough**: the table is the stage and its geometry tunes the song; walls carry vines when present. FoV-aware: the bed fits within ±25°. | The "Tune" beat must read as *caused by the room*, not as random; the tuning ripple exists for that reason. |
| **Technical Implementation** | Hand tracking (pinch, pull, drag, palm-up/out poses), plane detection (table, walls, ceiling), hit-test fallback, HRTF spatial audio, instanced rendering within budget, a **4-level placement chain** and a **Wanderer fallback** so it works in rooms we never tested. | **Unverified on device until a headset exists** (fps, hand feel, plane availability). |
| **Polish & Presentation** | A cohesive bioluminescent art direction tinted per room, every sound synthesized in real time (no licensing risk), and a video with a true demo: *"two rooms, two songs."* | Emulator footage, if that is all we have, looks flat next to device captures. |

### Special awards we target (priority order; a single build can be considered for all)
1. **Boldest Original Concept (primary):** "the room writes the key; your hands write the song." It falls apart on a flat screen and in a room-less app.
2. **Best Reason to Come Back (secondary):** a saved garden that re-places itself, a daily seed, growth stages, and a new song in every room you take it to. Never punishing.
3. **Best First Five Minutes:** first sound within 20 s of launch, the Tune beat within 5 s, first loop within 90 s, no text instructions.
4. **Best Accessibility Forward:** one-hand mode, head-gaze dwell (select + Listen for limited mobility), high-contrast mode, voices told apart by **shape plus colour**, visual beat ring for deaf and hard-of-hearing players, reduced-motion mode (ripple becomes a glow sequence), adjustable bed height.
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
| The room signature feels random, not caused | Medium | High | The **tuning ripple**: each detected surface visibly rings one note of the chord within 5 s of placement; the signature is quantised so the same room always gives the same song; a settings line shows "Tuned by: table 0.72 m, 3 walls" style facts. |
| Convergent "daily garden" entries (2026 repos) | Medium | Medium | Music + room signature as the hook; do not sell the daily seed as the headline. |
| Planes unavailable in the judge's room (no Space Setup, 3S, browser flag) | High | Medium | Fallback chain for placement, and the **Wanderer** signature for tuning: always a song, never a dead end. Device spike T-104 decides whether S1 ships at all. |
| No table plane detected in a judge's room | High | High | Fallback chain: table plane → any horizontal plane at 0.5–1.1 m → hit-test placement → floating bed. Every level is fully playable. |
| WebXR perf dips below 60 fps | Medium | High | Hard budgets (HLD §7), instancing, perf HUD, emulator draw/tri/JS-ms budgets now; device perf runs the moment a headset exists; Fixed Foveation. |
| Hand-tracking jitter makes placement fiddly | Medium | High | Snap-to-cell annulus (5×16), ≥4 cm hit radius (provisional; T-105 sets the final size), pinch hysteresis, a 1€ filter on the hand ray. |
| Sounds bad or out of tune | Low | High | All pitches quantised to the room's pentatonic mode; a mix limiter; desktop sound prototype rated at G0 (Oct 15); weekly listening review. |
| Name "Roomsong" is taken | Unverified | Medium | Human picks a new name from the shortlist; one global replace. |
| Deadline slip | Medium | Critical | Gates G0–G3 (REPLAN §6); feature freeze 2026-11-12, code freeze 2026-11-15, submit 2026-11-17. Scope already cut ≈55–60% (D-011). |
| Link breaks during judging | Low | Critical | Hosting chosen in Phase 1 (GitHub Pages / Vercel / Netlify); separate prod (frozen) and staging deploys, with an uptime check task until 2026-12-11. |

## 4. Positioning lines (reuse everywhere: video, description, gallery)
- "Your table is the stage. Your hands are the gardener. Your room writes the key."
- "Every room has its own song."
- "Compose without knowing music: where you plant is what you hear."
- "Five minutes a night. A garden that remembers you, and re-tunes wherever you take it."
