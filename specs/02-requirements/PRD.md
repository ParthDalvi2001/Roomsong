# Product Requirements Document (PRD) — Roomsong

**Status:** Approved · **Owner:** product-owner · **Version:** 2.0 (2026-10-10; v1 2026-10-09)
**Related:** BRD.md · SRS.md · USER_STORIES.md · 03-design/UX_WIREFRAMES.md · 08-status/REPLAN_2026-10-10.md (change sheet, D-010/D-011)

---

## 1. Product vision
> *Your table is the stage. Your hands are the gardener. Your room writes the key.*

Roomsong is a hands-first mixed-reality **music garden**. You plant glowing seeds on your real table;
each plant is a musical voice; *where* you plant decides *when* and *how high* it sings. A slow tide of light
sweeps the garden and plays it. Then you lean back and your room performs the song you grew under an aurora halo
(with vines of light on your real walls where walls are detected). **Every room has its own song:** the room's
geometry (table, floor, walls, ceiling) is read once per session and tunes the garden's key, mode, tempo and reverb,
so the same garden re-tunes itself when you take it to a different room. The garden is saved locally, re-places itself
on your table, and offers a new seed every day.

## 2. Core concepts (glossary)

| Term | Meaning |
|---|---|
| **Bed** | The ring-shaped (**annulus**) garden plot anchored to the table. Inner radius **0.12 m**, outer radius **0.30 m**; nothing is plantable inside 0.12 m (the centre holds the tide origin and the Listen orb glow). Bed centre sits **0.40 m** in front of the head (range 0.35–0.45 m), so the far edge is ≤0.75 m (seated reach cap). |
| **Ring** | The bed is divided into **5 concentric pitch rings** at radii 0.12 / 0.165 / 0.21 / 0.255 / 0.30 m (gap 4.5 cm). Ring r ∈ 0..4 = scale degree r (inner = low, outer = high); 5 degrees = one pentatonic octave. |
| **Step** | The bed is divided into **16 angular steps** (like a 16-step sequencer). One full sweep of the tide = one bar. |
| **Cell** | One (ring, step) position: **80 cells** (5 × 16). Inner-ring cell spacing ≈ 4.7 cm, so the ≥4 cm hit radius fits (provisional; the on-device pinch-accuracy test T-105 sets the final cell size). Positions with radius < 0.09 m or > 0.35 m are "off-bed". |
| **Tide** | The glowing arc that sweeps around the bed at the current tempo. A plant sings when the tide crosses its step. |
| **Seed** | An unplanted voice. Has a **voice type** and a **hue** (set at seed creation). |
| **Plant** | A planted seed. Has position (ring, step), **height** (0–1 → volume + sustain), **hue** (timbre variation, fixed at creation), and **age**. |
| **Voice types (5 + 1)** | Must: Bell, Pad, Pluck, Bass, Choir. Should: Shimmer (6th, S5). Each has a distinct **shape silhouette** and base timbre, so voices are identifiable without colour. |
| **Room features** | What the app reads from the room at session start: table height (m), table area (m²), floor area (m²), wall count, ceiling height (m), largest wall width (m), detection level (1–4). Unknown fields take defaults. |
| **Room signature** | A pure, deterministic, **quantised** function of the room features → `{ keyRoot, mode, tempo, reverbSize, starterVoices[3], paletteSeed }`. The same room always gives the same song; small detection noise never changes it. Fallback **"Wanderer"** signature (detection level ≥3 or features unknown): C major pentatonic, 84 BPM, medium reverb, Bell/Pad/Pluck. |
| **Tuning ripple** | The "this surface made this note" moment: on placement a light ripple crosses each detected surface in turn (table → nearest wall → ceiling if any) and each rings one note of the room chord, audible ≤5 s after placement. Reduced motion: surfaces glow in sequence without the sweep. |
| **Re-tune** | On each session start the signature is recomputed; a different room re-tunes the garden in place (plants keep their cells; pitches follow the new mode). |
| **Listen mode** | Lean-back performance mode: lights dim, an **aurora halo** rises over the bed (vines of light to the nearest wall when walls are detected, S2), interaction is paused except the "wake" gesture. Entered by palms-out or the **Listen orb**. |
| **Season** | *Cut (D-011)*: the room decides the mode, not the calendar. Palette = one fixed bioluminescent set, tinted by `paletteSeed`. |
| **Codex** | *Cut (D-011)*: no collection panel this competition. |

## 3. User flows

### 3.1 First launch (the "First Five Minutes")
1. Open URL in Quest Browser → tap **Enter** (the only button in 2D) → passthrough + hands appear. *(≤5 s)*
2. **Room scan**: the bed fades in on the nearest suitable surface in front of the user (fallback chain, FR-ROOM). *(≤3 s)*
3. **Tune** *(S1; ≤5 s after placement)*: the room signature is computed from the room features, and the **tuning ripple** crosses the table, then the nearest wall, then the ceiling (if detected), each surface ringing one note of the room chord. Where no surfaces are detected, the Wanderer chord plays once over the bed. Caption (≤6 words): *"Your room tunes the garden."* If S1 is gated out, this step is a single soft confirmation chord.
4. **Invitation**: a seed glows near the user's dominant hand with a gentle pull-toward-hand animation. Caption: *"Open your hand."* *(Captions are ≤6 words; icons otherwise.)*
5. Palm-up → seed lands in palm. Caption: *"Pinch, and plant it."*
6. Pinch → the bed shows ring/step guides (soft annulus grid) and a ghost preview that snaps. Release over the bed → plant grows in; the tide starts; **first sound within 20 s of launch.**
7. Two more seeds arrive in sequence (different voices). After 3 plants, the guides fade and the garden is "alive" → *first loop ≤90 s.*
8. A gesture hint ring appears once near a plant: pull-up icon, drag icon. After the user tries one, hints never show again (unless re-enabled in settings).
9. At ~4 minutes, or after 6 plants: soft prompt *"Rest your hands to listen"* with a palms-out icon and the Listen orb → Listen mode.

### 3.2 Returning session
1. Enter → the garden restores from local save and is re-placed via the fallback chain (or at its anchored location if persistent anchors are available and resolve, S4) with a short chord. "Grown overnight" bloom animation when growth stages apply (S3).
2. **Re-tune** (S1): the room signature is recomputed. Same room → same song, a short confirming ripple. Different room → the garden re-tunes in place (plants keep their cells; pitches follow the new mode) and the full tuning ripple plays: *same garden, new song.*
3. Today's new seed floats in (S3). Growth summary (icons: +branches, days). No text walls.
4. If the anchor fails or the user is in a new room → the bed is re-placed via the fallback chain, garden preserved.

### 3.3 Shaping flow (any time)
- Pinch a plant → it lifts slightly and glows (selected).
- **Pull up/down** while pinched → height (volume + sustain). Vertical range 0–0.25 m above the bed.
- **Drag** while pinched → move to another ring/step (re-snaps to the nearest free cell).
- **Drag off the bed** (release with the pinch position beyond the outer edge + 5 cm, or inside the centre hole − 3 cm) → remove (plant dissolves into petals; a short reverse sound). Undo petal floats for 5 s; pinch it to restore.
- *Twist wrist (hue) — Cut (D-011): hue is fixed at seed creation; a settings control for hue is C3.*
- *Flick (prune) — Cut (D-011): replaced by drag-off, which needs no velocity threshold and is one-hand and gaze-dwell friendly.*

### 3.4 Listen mode
- Enter: **both palms facing away** from face, held 1.5 s, **or** a pinch/dwell on the **Listen orb** at the bed centre (or the settings toggle). One-hand mode: one palm suffices.
- Lights dim to 40%, bed glows brighter, an **aurora halo** rises over the bed, pulsing with the music (Must, default). Where wall planes are detected, **vines of light grow from the bed to the nearest wall** along the plane (S2); the halo remains the fallback. Spatial audio: each plant's sound is positioned at the plant; reverb size follows the room signature.
- Arrangement variations (octave echo, counter-rhythm every 4 bars): C1, only if G2 passes with slack.
- Exit: any pinch or the **wake** gesture (palm toward face), or after 10 minutes auto-fade to a gentle ending chord.

### 3.5 Settings (a small floating panel, summoned by looking at the wrist orb and pinching, or gaze-dwell)
Tabs: **Sound** (tempo 60–120 BPM, master volume, reverb size auto/off, "Tuned by" read-out of the room signature), **Access** (one-hand, gaze dwell, high contrast,
reduced motion, visual beat ring, bed height ±10 cm, left/right dominant hand), **Garden** (re-place bed, re-tune, new garden, about).
*Codex tab — Cut (D-011).* No sliders are required for gaze-dwell: every Access control is a toggle or a stepper.

## 4. Functional requirements (summary; full detail in SRS.md)

| Area | Key requirements |
|---|---|
| Hands | Pinch, pull, drag, drag-off (remove + undo), palm-up, palms-out, wake; hit radius ≥4 cm (provisional, T-105); hysteresis; smoothing; left/right; one-hand mode. *Twist, flick, controllers: Cut (D-011)* |
| Room | Fallback chain table → any horizontal surface 0.5–1.1 m → hit-test placement → floating bed; bed centre 0.35–0.45 m ahead, reach ≤0.75 m; **room features → room signature → tuning ripple → re-tune** (FR-ROOM-10..13, S1, gated on device spike T-104); wall planes for vines (S2) with halo fallback (Must) |
| Music | 5 voices Must (+ Shimmer S5), 5 rings, 16 steps, 80-cell annulus, scale quantisation to the room's mode, tempo from signature (user-adjustable), swing off, limiter, HRTF spatial audio, reverb sized by the signature |
| Growth | Daily seed and growth stages 0/1/3/7 days with `fakeDay` for the video (S3). *Weekly season, codex: Cut (D-011)* |
| Persistence | Local (IndexedDB), automatic, resilient to corrupt saves (Must); persistent-anchor restore (S4) with re-place fallback |
| Accessibility | Gaze dwell (select + Listen; no sliders), one-hand, high contrast, reduced motion, visual beat ring, adjustable height, shape-coded voices |
| Perf | ≥72 fps target, ≥60 fps floor on Quest 3 (**verified only once a headset exists**); emulator budgets (draw calls, triangles, JS ms) enforced meanwhile |
| Onboarding | ≤6-word captions, ≤20 s to first sound, Tune beat ≤5 s after placement, ≤90 s to first loop |

## 5. Non-functional requirements (summary)
Performance, startup, robustness, privacy (no network after load, no PII), accessibility, content policy, FoV-aware UI. Full list in SRS.md §4.

## 6. MoSCoW

*v2 (D-011, REPLAN §5). Scope cut ≈55–60% against v1 because the team has one developer, no headset yet, and 39 days. IDs below are the v2 set; the v1 M/S/C items they replace are listed under "Cut" so nothing is silently dropped.*

### Must have (ship or we fail)
- M1 Enter XR hands-only; placement chain L1 table → L2 any surface 0.5–1.1 m → L3 hit-test → L4 floating bed. Reach ≤0.75 m.
- M2 Palm-up seed → pinch-carry → plant → snap (5×16 annulus, 80 cells) → tide plays; **5 voices** (Bell, Pad, Pluck, Bass, Choir); scale quantised; limiter; HRTF spatial audio.
- M3 Shaping: **pull** (height = volume + sustain), **drag** (move cell), **drag off the bed** to remove (with 5 s undo petal). *(Twist, flick: cut.)*
- M4 Listen mode: palms-out **or Listen orb**; dim; **aurora halo** over the bed; auto-end 10 min; wake by pinch/palm-to-face.
- M5 Local save/restore (IndexedDB); corrupt-save safety.
- M6 Onboarding: ≤6-word captions, first sound ≤20 s, 3-plant loop ≤90 s.
- M7 Perf: ≥72 fps target / ≥60 floor on Quest 3 (**verified only once a headset exists**); emulator budgets (draws/tris/JS ms) enforced meanwhile.
- M8 Accessibility: **one-hand mode**, **high contrast**, **beat ring**, **reduced motion**; **gaze-dwell select + Listen** (no sliders).
- M9 FoV-safe layout; seated reach.

### Should have (strongly expected for a winning entry)
- S1 Room signature + tuning ripple + re-tune (§2, FR-ROOM-10..13) — **gated on the device capability spike T-104** (planes/labels available in Quest Browser). This is the differentiator; it is a Should only because it cannot be verified without a headset.
- S2 Vines of light to the nearest wall in Listen mode (the halo remains the fallback).
- S3 Daily seed + overnight growth stages (0/1/3/7 days) with `fakeDay` for the video.
- S4 Persistent anchor restore (fallback = re-place by chain).
- S5 Shimmer voice (6th).

### Could have (only if G2 on 2026-11-01 passes with slack)
- C1 Listen-mode arrangement variations
- C2 Gaze-dwell sliders for pull (height)
- C3 Hue shaping via a settings control

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
| Q1 | Persistent anchors API availability in current Quest Browser; fallback if unavailable | software-architect | T-003 |
| Q2 | Mesh detection vs plane detection for table top on 3S | software-architect | T-003 |
| Q3 | Headset count for testing | human | ASAP (superseded by Q5) |
| Q4 | Final app name: "Roomsong" may be taken (unverified); the human picks a new name from the shortlist, then one global replace | human (Parth) | G0 (2026-10-15) |
| Q5 | **Headset: none on the team today.** Acquisition date and source (T-000). Gates: H1 in hand by 2026-10-20; Emergency mode (emulator-only verification, emulator video) from 2026-10-27; submit-or-withdraw decision 2026-11-08. Until then M7, hand feel, untested-room behaviour and S1's gate (T-104) are **unverified**. | human (Parth) | 2026-10-15 (plan with a date) |
| Q6 | **Hosting:** no GitHub yet; local git only. Judges need a public HTTPS URL that stays unchanged until 2026-12-11. Options: GitHub Pages (later), Vercel, Netlify. Decision in Phase 1; team sync by zip/drive until then. | human (Parth) + devops-engineer | G1 (2026-10-22) |
