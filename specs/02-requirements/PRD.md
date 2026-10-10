# Product Requirements Document (PRD) — Roomsong

**Status:** Approved · **Owner:** product-owner · **Version:** 2.1 (2026-10-10, plan v2.1 propagated by T-113: D-019–D-028; v2.0 2026-10-10; v1 2026-10-09)
**Related:** BRD.md · SRS.md · USER_STORIES.md · 03-design/UX_WIREFRAMES.md · 08-status/REPLAN_2026-10-10.md (v2 change sheet, D-010/D-011) · 08-status/PLAN_AMENDMENT_2026-10-10.md (v2.1 sheet, §6)

---

## 1. Product vision
> *Your table is the stage. Your hands are the gardener. Your room writes the key.*

Roomsong is a hands-first mixed-reality **music garden**. You plant glowing seeds on your real table;
each plant is a musical voice; *where* you plant decides *when* and *how high* it sings. A slow tide of light
sweeps the garden and plays it. Then you lean back and your room performs the song you grew under an aurora halo
(vines of light on your real walls are a Could, C4). **Every room has its own song:** the room's
geometry is read once per session and tunes the garden's key, mode and echo (v1, D-021: room size sets the key, ceiling
height the mode, room volume the echo; the tempo is the player's), so the same garden re-tunes itself when you take it
to a different room. The garden is saved locally, returns to its anchored spot on your table (or is re-placed there),
and offers a new seed every day.

## 2. Core concepts (glossary)

| Term | Meaning |
|---|---|
| **Bed** | The ring-shaped (**annulus**) garden plot anchored to the table. Inner radius **0.12 m**, outer radius **0.30 m**; nothing is plantable inside 0.12 m (the centre holds the tide origin and the Listen orb glow). Bed centre sits **0.45 m** in front of the head by default (range 0.35–0.45 m; FR-ROOM-03, D-020), which puts the far edge exactly on the 0.75 m seated reach cap. |
| **Ring** | The bed is divided into **5 concentric pitch rings** at radii 0.12 / 0.165 / 0.21 / 0.255 / 0.30 m (gap 4.5 cm). Ring r ∈ 0..4 = scale degree r (inner = low, outer = high); 5 degrees = one pentatonic octave. |
| **Step** | The bed is divided into **16 angular steps** (like a 16-step sequencer). One full sweep of the tide = one bar. |
| **Cell** | One (ring, step) position: **80 cells** (5 × 16). Inner-ring cell spacing ≈ 4.7 cm. A target is drawn **2.5 cm** wide and picked within a **4.0 cm** hit radius; the nearest target wins (FR-HND-04; provisional: the on-device pinch-accuracy test T-105 sets the final cell size and may tune the radius to 3.5 cm). Positions with radius < 0.09 m or > 0.35 m are "off-bed". |
| **Tide** | The glowing arc that sweeps around the bed at the current tempo. A plant sings when the tide crosses its step. |
| **Seed** | An unplanted voice. Has a **voice type** and a **hue** (set at seed creation). |
| **Plant** | A planted seed. Has position (ring, step), **height** (0–1 → volume + sustain), **hue** (timbre variation, fixed at creation), and **age**. |
| **Voice types (5 + 1)** | Must: Bell, Pad, Pluck, Bass, Choir. Should: Shimmer (6th, S5). Each has a distinct **shape silhouette** and base timbre, so voices are identifiable without colour. |
| **Mode** | The five notes the rings play. One of three pentatonic sets (D-025), in semitones above the key root: **major** `[0,2,4,7,9]`, **minor** `[0,3,5,7,10]`, **sus** `[0,2,5,7,10]`. No two notes are a semitone apart, so any two plants sound good together. *The six-note modes `dorianHex` and `lydianHex`: Cut (D-025).* |
| **Room features** | What the app reads from the room at session start: table height (m), table area (m²), floor area (m²), wall count, ceiling height (m), largest wall width (m), room volume (m³), detection level (1–4). They do not depend on which way the player faces. Unknown fields take defaults. |
| **Room signature** | A pure, deterministic, **quantised** function of the room features → `{ keyRoot, mode, tempo, reverbRt60, reverbSize, starterVoices[3], paletteSeed }`. **In v1 the room sets exactly three things (D-021, D-028):** the **key root** from floor area (a bigger room has a lower root: E, D, C, A), the **mode** from ceiling height, and the **echo** from room volume (reverb decay in six steps, 0.3–2.0 s; FR-ROOM-06). **The room does not set the tempo** (`tempo` is the constant 84 BPM in v1; the speed is the player's setting) and **the table does not set the key**: table and wall measurements only pick the starter voices and the colour tint, through a hash. `reverbSize` is a label for the Settings read-out. Buckets: LLD §5.8. The same room gives the same song; detection noise changes it only when a value sits on a bucket boundary (FR-ROOM-11). Fallback **"Wanderer"** signature (detection level ≥3 or no feature known): C major pentatonic, 84 BPM, 0.9 s (medium) reverb, Bell/Pad/Pluck. Tempo-from-room and table-height mappings are validate-first (UAT-17), not in v1. |
| **Tuning ripple** | The "your room tunes the garden" moment: on placement a light ripple crosses each detected surface in turn (table at 0.3 s → nearest wall at 1.5 s → ceiling at 2.7 s, if any) and each rings one note of the room chord (a triad per mode), with a caption of at most 3 words that names the surface and says only what it sets in v1 (LLD §5.8). The chord is complete 4.0 s after placement (budget ≤5 s). No caption credits a surface with the key or the echo. Reduced motion: surfaces glow in sequence without the sweep. |
| **Re-tune** | On each session start the signature is recomputed; a different room re-tunes the garden in place (plants keep their cells; pitches follow the new key and mode; the echo follows the new room; the tempo does not change). |
| **Listen mode** | Lean-back performance mode: lights dim, an **aurora halo** rises over the bed (vines of light to the nearest wall are Could, C4; was S2, D-021), interaction is paused except the "wake" gesture. Entered by palms-out or the **Listen orb**. This mode is the proof of the Entertainment-track fit. |
| **Hover cue** | The highlight on the target a pinch would act on (a cell ghost or a plant glow), shown before anything is committed; actions commit on pinch release (FR-HND-16). |
| **Garden window** | The same garden in a normal browser tab, for anyone without a headset: fixed camera, pointer or touch as the pinch (S6, FR-SYS-07). The dev bench and demo; never the judged path. |
| **Season** | *Cut (D-011)*: the room decides the mode, not the calendar. Palette = one fixed bioluminescent set, tinted by `paletteSeed`. |
| **Codex** | *Cut (D-011)*: no collection panel this competition. |

## 3. User flows

### 3.1 First launch (the "First Five Minutes")
1. Open URL in Quest Browser → tap **Enter** (the only button in 2D) → passthrough appears and the player sees their own real hands; the app draws no hand models (D-027). *(≤5 s)*
2. **Room scan**: the bed fades in on the nearest suitable surface in front of the user (fallback chain, FR-ROOM). *(≤3 s)*
3. **Tune** *(S1; ≤5 s after placement)*: the room signature is computed from the room features (v1: key root, mode and echo; §2), and the **tuning ripple** crosses the table, then the nearest wall, then the ceiling (if detected), each surface ringing one note of the room chord with its own caption (≤3 words, one at a time; texts and timing in LLD §5.8, FR-ROOM-12). Where no surfaces are detected, the Wanderer chord plays once over the bed with no caption. *The single caption "Your room tunes the garden." is replaced by the per-surface captions (D-028).* If S1 is gated out, this step is a single soft confirmation chord.
4. **Invitation**: a seed glows near the user's dominant hand with a gentle pull-toward-hand animation. Caption: *"Open your hand."* *(Captions are ≤6 words; icons otherwise.)*
5. Palm-up → seed lands in palm. Caption: *"Pinch, and plant it."*
6. Pinch → the bed shows ring/step guides (soft annulus grid) and the **hover cue**: a ghost on the cell that will get the plant, shown before anything is committed (FR-HND-16). Release over the bed → the plant grows in on that cell; the tide starts; **first sound within 20 s of launch.**
   - *If a hand leaves the headset's view mid-gesture (FR-HND-15):* what it held freezes for 200 ms. Hand back in time → the gesture continues. Otherwise the carried seed returns to the supply (a dragged plant returns to its cell), and a hint shows until the hand is seen again. Nothing is lost.
7. Two more seeds arrive in sequence (different voices). After 3 plants, the guides fade and the garden is "alive" → *first loop ≤90 s.*
8. A gesture hint ring appears once near a plant: pull-up icon, drag icon. After the user tries one, hints never show again (unless re-enabled in settings).
9. At ~4 minutes, or after 6 plants: soft prompt *"Rest your hands to listen"* with a palms-out icon and the Listen orb → Listen mode.

### 3.2 Returning session
1. Enter → the garden restores from local save at its anchored spot (M5, FR-ROOM-07; restore reliability is validate-first on device). If anchors are unsupported or the restore does not resolve within 4 s, the bed is re-placed via the fallback chain and the garden is kept. "Grown overnight" bloom animation when growth stages apply (S3).
2. **Re-tune** (S1): the room signature is recomputed every session and the tuning ripple plays. Same room → same song. Different room → the garden re-tunes in place (plants keep their cells; pitches follow the new key and mode; the echo follows the room; the tempo stays): *same garden, new song.* *(The "short confirming ripple" for the same room is dropped: the signature is never stored, so sessions are not compared; FR-ROOM-13.)*
3. Today's new seed floats in (S3). Growth summary (icons: +branches, days). No text walls.
4. If the anchor fails or the user is in a new room → the bed is re-placed via the fallback chain, garden preserved.

### 3.3 Shaping flow (any time)
- **Hover cue** (FR-HND-16): the plant or cell a pinch would act on glows before the pinch; it switches to a neighbour only when that one is at least 0.5 cm closer, so it does not flicker.
- Pinch a plant → it lifts slightly and glows (selected). Nothing changes in the garden until the pinch is released.
- **Pull up/down** while pinched → height (volume + sustain). The height changes with the hand's vertical travel since the pinch started, from the height the plant already had; 0.25 m of travel covers the full range (FR-HND-08).
- **Drag** while pinched → move to another ring/step (the ghost shows the free cell it will land on). After a 2 cm dead zone the larger direction of the movement decides pull or drag, and it stays that until release.
- **Drag off the bed** (release with the pinch position beyond the outer edge + 5 cm; sideways or towards the body, since the far side is beyond reach) → remove (plant dissolves into petals; a short reverse sound). Undo petal floats for 5 s; pinch it to restore. A release inside the centre hole returns the plant to its cell (FR-HND-10).
- **Hands out of view** (FR-HND-15): the held plant freezes for 200 ms, then returns to where it was (cell or height); a hint shows until the hand is back.
- *Twist wrist (hue) — Cut (D-011): hue is fixed at seed creation; a settings control for hue is C3.*
- *Flick (prune) — Cut (D-011): replaced by drag-off, which needs no velocity threshold and is one-hand and gaze-dwell friendly.*

### 3.4 Listen mode
- Enter: **both palms facing away** from face, held 1.5 s, **or** a pinch/dwell on the **Listen orb** at the bed centre (or the settings toggle). One-hand mode: one palm suffices.
- Lights dim to 40%, bed glows brighter, an **aurora halo** rises over the bed, pulsing with the music (Must, default). Vines of light from the bed to the nearest wall are Could (C4; was S2, D-021); the halo is the complete Listen visual. Spatial audio: each plant's sound is positioned at the plant (equal-power panning, the listener at the player's head; NFR-PERF-10); the one shared reverb takes its length from the room signature. No element flashes more than 3 times per second (FR-UI-11).
- Arrangement variations (octave echo, counter-rhythm every 4 bars): C1, only if G2 passes with slack.
- Exit: any pinch or the **wake** gesture (palm toward face), or after 10 minutes auto-fade to a gentle ending chord.

### 3.5 Settings (a small floating panel, summoned by looking at the wrist orb and pinching, or gaze-dwell)
Tabs: **Sound** (tempo 60–120 BPM, the player's own setting, not the room's; master volume; reverb auto/small/off; "Tuned by" read-out of what the room set), **Access** (one-hand, gaze dwell with a dwell time of 600/900/1200 ms, high contrast,
reduced motion, visual beat ring, bed height ±10 cm, left/right dominant hand), **Garden** (re-place bed, re-tune, new garden, about).
*Codex tab — Cut (D-011).* No sliders are required for gaze-dwell: every Access control is a toggle or a stepper.

## 4. Functional requirements (summary; full detail in SRS.md)

| Area | Key requirements |
|---|---|
| Hands | Pinch, pull, drag, drag-off (remove + undo), palm-up, palms-out, wake; targets 2.5 cm visible with a 4.0 cm hit radius (provisional, T-105); **hover cue and commit on release (FR-HND-16); tracking-loss recovery (FR-HND-15)**; hysteresis; smoothing; left/right; one-hand mode. *Twist, flick, controllers: Cut (D-011)* |
| Room | Fallback chain table → any horizontal surface 0.5–1.1 m → hit-test placement → floating bed; bed centre 0.35–0.45 m ahead (default 0.45 m, D-020), reach ≤0.75 m; persistent anchor with re-placement fallback (Must, FR-ROOM-07); **room features → room signature v1 → tuning ripple → re-tune** (FR-ROOM-10..13, S1, gated on device evidence T-104/T-129); halo (Must); wall vines (Could, C4) |
| Music | 5 voices Must (+ Shimmer S5), 5 rings, 16 steps, 80-cell annulus, scale quantisation to the room's mode (three pentatonic sets, D-025), tempo set by the player (default 84 BPM; not by the room in v1), swing off, limiter, spatial audio by equal-power panning and one reverb whose length follows the signature (NFR-PERF-10) |
| Growth | Daily seed and growth stages 0/1/3/7 days with `fakeDay` for the video (S3). *Weekly season, codex: Cut (D-011)* |
| Persistence | Local (IndexedDB), automatic, resilient to corrupt saves (Must); persistent-anchor restore with re-place fallback (Must, M5; was S4, D-021) |
| Accessibility | Gaze dwell (select + Listen; no sliders), one-hand, high contrast, reduced motion, visual beat ring, adjustable height, shape-coded voices, flashing cap of 3 luminance changes per second (FR-UI-11) |
| Perf | ≥72 fps target, ≥60 fps floor on Quest 3 (**verified only once a headset exists**); emulator budgets (draw calls, triangles, JS ms) enforced meanwhile; rendering rules (NFR-PERF-09) and audio graph shape (NFR-PERF-10) |
| Onboarding | ≤6-word captions (ripple captions ≤3 words), ≤20 s to first sound, Tune beat ≤5 s after placement, ≤90 s to first loop |
| Garden window | The same garden in a non-XR browser tab with a pointer (S6, FR-SYS-07); a pointer cannot pull (height) or open the settings panel in v1 |

## 5. Non-functional requirements (summary)
Performance, startup, robustness, privacy (no network after load, no PII), accessibility, content policy, FoV-aware UI. Full list in SRS.md §4.

## 6. MoSCoW

*v2 (D-011, REPLAN §5). Scope cut ≈55–60% against v1 because the team has one developer, no headset yet, and 39 days. IDs below are the v2 set; the v1 M/S/C items they replace are listed under "Cut" so nothing is silently dropped.*
*v2.1 (D-021, PLAN_AMENDMENT §6.1): M3, M5 and M7 gain items; S1 is narrowed; S2 moves to C4; S4 moves to M5; S6 is new. Moved items stay in place, marked.*

### Must have (ship or we fail)
- M1 Enter XR hands-only; placement chain L1 table → L2 any surface 0.5–1.1 m → L3 hit-test → L4 floating bed. Reach ≤0.75 m.
- M2 Palm-up seed → pinch-carry → plant → snap (5×16 annulus, 80 cells) → tide plays; **5 voices** (Bell, Pad, Pluck, Bass, Choir); scale quantised; limiter; spatial audio (equal-power panning; ≤2 HRTF sources only after a device A/B, NFR-PERF-10).
- M3 Shaping: **pull** (height = volume + sustain), **drag** (move cell), **drag off the bed** to remove (with 5 s undo petal); **hover cue** with commit on release (FR-HND-16) and **tracking-loss recovery** (FR-HND-15) *(added v2.1)*. *(Twist, flick: cut.)*
- M4 Listen mode: palms-out **or Listen orb**; dim; **aurora halo** over the bed; auto-end 10 min; wake by pinch/palm-to-face.
- M5 Local save/restore (IndexedDB); corrupt-save safety; **persistent anchor restore with re-placement fallback** (FR-ROOM-07; was S4, D-021; restore reliability is validate-first on device).
- M6 Onboarding: ≤6-word captions, first sound ≤20 s, 3-plant loop ≤90 s.
- M7 Perf: ≥72 fps target / ≥60 floor on Quest 3 (**verified only once a headset exists**); emulator budgets (draws/tris/JS ms) enforced meanwhile; **rendering rules** (NFR-PERF-09) and the **flashing cap** (FR-UI-11) *(added v2.1)*.
- M8 Accessibility: **one-hand mode**, **high contrast**, **beat ring**, **reduced motion**; **gaze-dwell select + Listen** (no sliders).
- M9 FoV-safe layout; seated reach.

### Should have (strongly expected for a winning entry)
- S1 Room signature **v1** + tuning ripple + re-tune (§2, FR-ROOM-10..13) — **narrowed (D-021):** the room sets the reverb decay, the key root and the mode, nothing else; tempo-from-room and table-height mappings are validate-first (UAT-17), not in v1. Built after the core payoff is green. **Gated on device evidence** (capability spike T-104, device script T-129; planes/labels available in Quest Browser); go/no-go at G2, default = build with the Wanderer fallback. This is the differentiator; it is a Should only because it cannot be verified without a headset.
- S2 *Moved to C4 (D-021)* — vines of light to the nearest wall in Listen mode.
- S3 Daily seed + overnight growth stages (0/1/3/7 days) with `fakeDay` for the video.
- S4 *Moved to M5 (D-021)* — persistent anchor restore (fallback = re-place by chain).
- S5 Shimmer voice (6th).
- S6 **Garden window** *(new, D-021)*: the same garden in a non-XR browser tab, pointer or touch as the pinch (FR-SYS-07, US-24). The headset-free dev bench and demo; never the judged path.

*Scope rule (v2.1):* a Should that is not green by 2026-11-10 goes into "What's next" in the Devpost copy, never into the build.

### Could have (nothing starts until Phase 4 is green; G2 is 2026-11-03, D-023)
- C1 Listen-mode arrangement variations
- C2 Gaze-dwell sliders for pull (height)
- C3 Hue shaping via a settings control
- C4 Vines of light to the nearest wall in Listen mode (was S2, D-021); the aurora halo (M4) is the complete Listen visual without them

### Cut (won't do this competition; D-011)
- Wrist twist (v1 M3 hue); flick (v1 M3 prune); weekly seasons and Seed Codex (v1 S1); controller support (v1 S4); "Gift" image export (v1 S5); "Gardener" rule-based helper (v1 C1); microgesture pitch nudges (v1 C2); windowsill layout (v1 C3); offline service worker; diagrams task; traceability script; 7 rings; bed radius options (single 0.12–0.30 m bed; height ±10 cm stays).
- Multiplayer, accounts, cloud, LLM features, monetisation, custom samples, MIDI export (unchanged from v1).

### Swap-out rule
Any new feature request enters this list with a MoSCoW rating **and** names the item of equal or larger size it replaces. Nothing moves from Should to Must without the human (Parth) approving in DECISIONS_LOG.

## 7. Content rating & policy
Target **10+**. No violence, no text chat, no user-generated text shown to others, no external links beyond the help page. Content Guidelines compliant.

## 8. Open questions

| # | Question | Owner | Due |
|---|---|---|---|
| Q1 | Persistent anchors: availability and restore reliability in the current Quest Browser. Anchors are now Must with a re-placement fallback (M5, D-021), so the open part is device reliability only | software-architect | T-104 / T-129 (needs a headset) |
| Q2 | Mesh detection vs plane detection for table top on 3S; plane labels in Quest Browser | software-architect | T-104 (needs a headset) |
| Q3 | Headset count for testing | human | ASAP (superseded by Q5) |
| Q4 | **Resolved (D-016):** the name is Roomsong | human (Parth) | done 2026-10-10 |
| Q5 | **Headset: none on the team today.** Acquisition date and source (T-000). Gates: H1 in hand by 2026-10-20; Emergency mode (emulator-only verification, emulator video) from 2026-10-27; submit-or-withdraw decision 2026-11-08. Until then M7, hand feel, untested-room behaviour, anchor restore (M5) and S1's gate (T-104) are **unverified**. Plan v2.1 recommends buying a Quest 3S now (PLAN_AMENDMENT §3); Parth has not yet chosen. | human (Parth) | 2026-10-17 (G0; plan with a date) |
| Q6 | **Resolved (D-018, D-022):** the repository is on GitHub; GitHub Pages is the submitted URL, plus a Vercel or Netlify mirror of the same build hash, both unchanged until 2026-12-11. Still to do: Parth enables Pages and picks the mirror (T-108). | human (Parth) + devops-engineer | T-108 |
| Q7 | Room signature go/no-go (S1): in or out, on T-129 device evidence; default = in with the Wanderer fallback | scrum-master + Parth | G2 (2026-11-03) |
| Q8 | Two contract calls wait for Parth's "ok" (D-028): the echo follows room volume directly (about 1 room in 6 can land on a neighbouring echo step on another day), and hand smoothing stays at its starting value until the headset test (a dragged plant trails the hand by about 3 cm) | human (Parth) | G0 (2026-10-17) |
