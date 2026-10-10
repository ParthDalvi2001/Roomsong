# UX / UI Wireframes & Design Direction — Roomsong

**Status:** Approved · **Owner:** ux-designer · **Version:** 1.1 (2026-10-10, applies REPLAN_2026-10-10 §3 geometry, §4 room signature, §5 scope)
Spatial wireframes are text/ASCII here; the `figma:figma-generate-design` or `ui-ux-pro-max` skills may be used to produce visual boards into `specs/03-design/figma/` (optional, T-012).

---

## 1. Design principles
1. **Hands are the only instructions.** Teach with a glowing seed and an icon, never a paragraph.
2. **Nothing you do can sound wrong.** Quantised pitch, limiter, gentle tempos.
3. **The room is the stage.** The table is the plot; the walls are the vines; the room's shape is the key, mode, tempo and reverb (room signature). A different room is a different song.
4. **Calm by default, alive on touch.** Idle is slow and soft; interaction is immediate and bright.
5. **Everything in reach, everything in view.** 2 ft radius; ±25° essential FoV.
6. **Inclusive by default.** Shape-coded voices, beat ring, gaze dwell, one hand.

## 2. Spatial layout (seated, top view and side view)

```
TOP VIEW (user at bottom)                      SIDE VIEW
            wall (vines, Should)                  wall
     ┌──────────────────────┐                      │  ╭vine╮ (halo always; vines if a wall)
     │   ╭────────────╮     │                      │ ╱      ╲
     │  ╱  ring 4     ╲    │             bed ──── ●═══●═══● table top (0.72 m typ.)
     │ │  ╭────────╮   │   │                       ▲ 0.40 m (0.35–0.45) to bed centre
     │ │ │  hole   │   │   │   ← bed Ø 0.60 m        │    far edge 0.65–0.75 m
     │ │ │ (orb ◎) │   │   │     hole Ø 0.24 m       │
     │ │  ╰────────╯   │   │              head ──── ◉  (eye height ~1.15 m seated)
     │  ╲  ring 0 ▶   ╱    │
     │   ╰────────────╯     │          Listen orb: glows in the bed's centre hole (tide origin);
     │        (wrist orb)   │            one-hand/gaze: also the wrist orb, 20° to the dominant side
     └──────────user────────┘          Panel: 0.55 m fwd, eye height, ≤ 0.40 m wide
```
- Bed = annulus (ring-shaped): inner radius 0.12 m, outer 0.30 m; 5 rings at 0.12 / 0.165 / 0.21 / 0.255 / 0.30 m (4.5 cm apart) × 16 steps = 80 cells. Nothing grows in the hole; it holds the tide origin and the Listen orb glow.
- Inner-ring cells are ≈ 4.7 cm apart (tightest); hit radius ≥ 4 cm provisional until the on-device pinch test (T-105).
- Bed centre: 0.40 m forward of the head (0.35–0.45 m), on the surface. Far edge ≤ 0.75 m.
- Essential elements (bed, captions, orb) within ±25°H/±20°V. Vines, halo, particles, tuning ripple can go wider.

## 3. Screens / states

### 3.1 2D landing page (the only 2D screen)
```
┌──────────────────────────────────────────┐
│  ✿ Roomsong                              │
│  Grow a song on your table.               │
│                                           │
│          [  Enter the garden  ]           │  ← single primary button
│                                           │
│  Access:  ☐ One hand   ☐ Eyes only (gaze) │
│           ☐ High contrast ☐ Reduce motion │
│  Needs: Meta Quest, hand tracking on.     │
│  Help · Privacy (local only) · v1.0.0     │
└──────────────────────────────────────────┘
```
Errors: "Hand tracking is off → Settings > Movement tracking > Hand tracking" shown inline if the feature is rejected.

### 3.2 Placement states (in XR)
| State | Visual | Audio | Caption |
|---|---|---|---|
| Scanning (≤3 s) | Soft ripple on candidate surfaces | Low pad swell | none |
| Placed (L1/L2) | Bed fades in, pulses once | Confirm chord | none |
| Hit-test (L3) | Ghost bed follows gaze; pinch icon | Ticking soft | "Pinch to place" |
| Floating (L4) | Bed with gentle hover | Confirm chord | none |
| Tuning (≤ 4 s after Placed, Should S1) | A light ripple crosses the table, then sweeps up the nearest wall, then the ceiling (if detected); each surface flares as it "makes" its note. L3/L4 or no walls: ripple on the bed only. Reduced motion: surfaces glow in turn, no sweep. | Three room-chord tones (degrees 0, 2, 4 on Pad, Bell, Pluck) in sequence; the garden starts in this key | none (the sound is the caption) |

### 3.3 Onboarding sequence (captions ≤ 6 words, 1 at a time, 0.6 m, slightly below eye line)
0. **Tune** beat (≤ 4 s, no caption): the tuning ripple crosses the room's surfaces and rings the room chord; captions wait for `room:tuned` so the first words land on silence. (Wanderer rooms: a single bed ripple + chord.)
1. "Open your hand" + palm icon → seed glides to palm (the 3 starter seeds are the signature's starter voices).
2. "Pinch, and plant it" + pinch icon → ring guides visible on the annulus.
3. (after plant) no caption; tide starts; 2nd and 3rd seed arrive with no captions.
4. (after 3 plants) a hint ring around the newest plant: ↕ pull icon, ✥ drag icon. Disappears after first use. (No twist hint: twist is cut.)
5. (4 min or 6 plants) "Rest your hands to listen" + palms-out icon.

### 3.4 Shaping feedback
| Action | Visual | Audio |
|---|---|---|
| Hover | Plant brightens 20%, soft outline (always outline in high contrast) | none |
| Pinch | Lifts 1 cm, glow ring | Soft tick |
| Pull | Plant stretches; a faint vertical scale ladder | Live note preview (quiet) |
| Drag | Ghost at the snap cell; guides glow; past the outer edge (> 0.35 m from centre) the ghost fades and the bed rim dims to warn | Cell "tick" on change; soft falling tone when the ghost leaves the bed |
| Drag off the bed (release outside) | Plant dissolves into petals at the release point; one **undo petal** stays there for 5 s, shrinking as time runs out | Reverse chime |
| Release in the hole | Plant snaps back to where it was | Soft "no" tone |
| Undo (pinch or dwell the petal) | Petals reassemble in the original cell | Forward chime |
*Twist and flick removed (D-011).*

### 3.5 Listen mode
- Entry: palms-out 1.5 s **or** pinch/dwell the Listen orb. Transition 1.2 s: passthrough dims to 40% (via a dark semi-transparent dome; never fully occlude), bed glow up, the **aurora halo** rises over the bed (always; Must); vines grow to the nearest wall over 6 s when a wall is known (Should).
- Beat ring always visible. Tide becomes a soft comet.
- Wake: any pinch, or palm to face. Fades back in 0.8 s.
- Auto-end at 10 min: ending chord, caption "Goodnight" (the one allowed non-instruction caption), stays in XR.

### 3.6 Settings panel (UIKit, 0.40 × 0.28 m, 0.55 m forward at eye height) — tabs Sound / Access / Garden (Codex cut, D-011)
```
┌──────────────────────────────────────────────┐
│ ● Sound   ● Access   ● Garden              ✕ │
├──────────────────────────────────────────────┤
│ Sound:   Tempo  [60 ───●──── 120]  84 (room) │
│          Volume [────────●──]                │
│          Reverb  (auto) ( small ) ( off )    │
│ Access:  One hand  ⦿  Gaze dwell ○           │
│          High contrast ○  Reduce motion ○    │
│          Beat ring ⦿     Bed height [-  +]   │
│          Dominant hand  (L) (R)              │
│ Garden:  Day 4 · Seeds 2 · Key C major (room)│
│          [Re-place bed] [New garden (hold)]  │
└──────────────────────────────────────────────┘
```
Tempo and Reverb read "(room)" while they follow the room signature; moving the slider overrides for this garden. No bed-radius control (single annulus bed); bed height ±10 cm stays.
Interaction: pinch on controls; in gaze mode, dwell 900 ms. Controls ≥ 3 cm tall. Panel opens via wrist orb pinch / dwell; closes with ✕ or looking away 5 s.

## 4. Gesture language (icons drawn once, reused)
| Icon | Gesture | Meaning |
|---|---|---|
| ✋ open palm up | Palm-up 0.4 s | Receive a seed |
| 🤏 | Pinch | Grab / plant / confirm |
| ↕ | Pull while pinched | Grow / shrink (volume + sustain) |
| ✥ | Drag while pinched | Move to another cell |
| ✥→ | Drag past the bed's edge and release | Remove (undo petal 5 s) |
| 🙌 palms out | Both palms out 1.5 s (one palm in one-hand mode) | Listen |
| ◎ | Pinch / dwell the Listen orb | Listen (always available) |
| 🤚 palm to face | 0.6 s | Wake |
| ◉ gaze dot | Dwell 900 ms (gaze mode) | Select / activate; Listen via the orb |
Removed (D-011): ↻ twist, ⤴ flick, controllers.

## 5. Art direction
- **Theme:** bioluminescent night garden; glass-like stems; soft additive glow; petals as light.
- **Palette (fixed; no seasons, D-011):** one bioluminescent set — moss #7DD181, gold #F4D35E, violet #9B5DE5, ice #48CAE4, cream #FFF8E7 — tinted per room by the signature's `paletteSeed` (hue rotation `seed % 360`°, saturation nudge −1/0/+1 step; Wanderer seed 0 = untinted). The tint is subtle (the garden stays recognisably the same palette) but two rooms are visibly different. Bed base: charcoal glass #141A1F @ 40% alpha. Passthrough stays visible.
- **Shapes:** each voice has a unique silhouette (LLD §7). Height stretches, age adds branches/blossoms, the seed's hue tints (fixed per plant).
- **Tuning ripple:** a thin, bright crest (cream → the room tint) 3–5 cm wide that travels across a surface and leaves a 1 s afterglow; the surface's note rings when the crest reaches its centre.
- **Motion:** idle sway 0.2 Hz, 1–2 cm; tide 1 bar per rotation; bloom-in 0.6 s ease-out; remove burst 0.4 s; ripple sweeps 0.6–1.0 s. Reduced-motion halves amplitudes, replaces growth with fades and the ripple sweep with sequential glows.
- **Typography:** one humanist sans (system or a bundled OFL font, logged in licenses); captions 1.6 cm cap height at 0.6 m.
- **Contrast:** normal ≥ 4.5:1 on dimmed backdrop; high-contrast 7:1 + outlines.

## 6. Sound direction
- Tempo 72 / 84 / 96 BPM from the room signature (Wanderer default 84), 16-step bar (≈2.86 s per rotation at 84). Everything in the room's key and mode (major pentatonic, dorian hexatonic or lydian hexatonic; LLD §5.8). Five rings = one pentatonic octave, inner low → outer high.
- **Room chord:** scale degrees 0, 2, 4 of the room mode (= rings 0, 2, 4): C–E–A in Wanderer, a minor triad in dorian rooms, a major triad in lydian rooms. The tuning ripple plays exactly these three notes (table → wall → ceiling), so the first thing heard in a room is the chord the garden will grow into.
- Mix: Bass −6 dB, Pad −9, Choir −9, Bell −7, Pluck −8, Shimmer (Should) −12; reverb send 20–35% sized by the signature (small/medium/large); master limiter.
- UI sounds: derived from the room key (tick = root, confirm = room chord, remove = reverse chime, undo = forward chime), so UI never clashes with the garden.
- Listen mode adds a very slow filter sweep on the pad bus and widens reverb.

## 7. Error & edge states
| Situation | Behaviour |
|---|---|
| Hand tracking lost | Hands fade; in-flight gesture reverts; caption none; resume silently |
| Seed released off-bed | Seed floats back to the supply orb with a soft "no" tone |
| Cell occupied on drop | Snap to nearest free cell + bump sound; if bed full (80), caption "Garden is full" and seed returns |
| Plant dragged off by accident | Undo petal for 5 s at the release point (pinch or dwell); after that the removal is final |
| Different room than last time | Garden re-tunes in place (plants keep cells, pitches follow the new key); tuning ripple plays; no caption |
| Anchor restore failed (Should) | Bed re-placed silently; garden intact; tiny icon "re-placed" for 3 s |
| Save failed | Caption "Saving unavailable" once per session |
| Browser lacks a feature | Degrade: no planes → L3/L4 and the Wanderer signature (C major pentatonic, 84 BPM); no anchors → re-place each session; no HRTF → stereo panning |

## 8. Accessibility specifics
- Gaze reticle: 1.2 cm dot, dwell ring fills over 900 ms; dwell pauses when the head moves > 8°/s.
- One-hand: Listen orb (always visible at 20° right, or left for left-dominant) toggles Listen; palm-out single hand works.
- Beat ring: 16 ticks; tide position; plants flash on trigger with their silhouette icon on the ring.
- No flashing > 3 Hz anywhere. Tide glow ramps, never strobes.
