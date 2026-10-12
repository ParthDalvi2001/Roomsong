# UX / UI Wireframes & Design Direction — Roomsong

**Status:** Approved · **Owner:** ux-designer · **Version:** 1.2 (2026-10-11, applies plan v2.1: PLAN_AMENDMENT_2026-10-10 §6 and contract API_SPEC v1.2.1 / LLD; D-020, D-021, D-025, D-027, D-028, D-029, D-030. v1.1 applied REPLAN_2026-10-10 §3 geometry, §4 room signature, §5 scope)
Spatial wireframes are text/ASCII here; the `figma:figma-generate-design` or `ui-ux-pro-max` skills may be used to produce visual boards into `specs/03-design/figma/` (optional, T-012).
**Verified so far:** nothing in this document has been seen on a headset. Timings and event order are checked in the emulator as each task lands. Reach, pinch accuracy, legibility, tracking loss as real hands produce it, and how the missing hand models feel (D-027) wait for a device (T-105, T-129). Numbers marked provisional may change there.

---

## 1. Design principles
1. **Hands are the only instructions.** Teach with a glowing seed and an icon, never a paragraph. The app draws no hand or controller models (D-027): the player sees their real hands in passthrough, and every hand cue (hover, hints) is our own.
2. **Nothing you do can sound wrong.** Quantised pitch, limiter, gentle tempos.
3. **The room is the stage.** The table is the plot; the room's size, ceiling and volume set the key, the scale and the echo (room signature v1, D-021). The tempo is the player's. A different room is a different song. The aurora halo is the Listen visual (Must); vines on the walls are Could (C4, D-021).
4. **Calm by default, alive on touch.** Idle is slow and soft; interaction is immediate and bright. The target lights up before the pinch, and nothing changes until the release (FR-HND-16).
5. **Everything in reach, everything in view.** Far edge ≤ 0.75 m; ±25° essential FoV.
6. **Inclusive by default.** Shape-coded voices, beat ring, gaze dwell, one hand, nothing flashing above the cap (FR-UI-11).

## 2. Spatial layout (seated, top view and side view)

```
TOP VIEW (user at bottom)                      SIDE VIEW
            wall (vines, Could)                   wall
     ┌──────────────────────┐                      │  ╭vine╮ (halo always, Must; vines Could C4)
     │   ╭────────────╮     │                      │ ╱      ╲
     │  ╱  ring 4     ╲    │             bed ──── ●═══●═══● table top (0.72 m typ.)
     │ │  ╭────────╮   │   │                       ▲ 0.45 m (0.35–0.45) to bed centre
     │ │ │  hole   │   │   │   ← bed Ø 0.60 m        │    far edge 0.75 m (the reach cap)
     │ │ │ (orb ◎) │   │   │     hole Ø 0.24 m       │
     │ │  ╰────────╯   │   │              head ──── ◉  (eye height ~1.15 m seated)
     │  ╲  ring 0 ▶   ╱    │
     │   ╰────────────╯     │          Listen orb: glows in the bed's centre hole (tide origin);
     │       (wrist orbs)   │            repeated beside the dominant wrist in one-hand and gaze modes
     └──────────user────────┘          Settings orb (wrist) opens the panel: 0.55 m fwd, eye height, ≤ 0.40 m wide
```
- Bed = annulus (ring-shaped): inner radius 0.12 m, outer 0.30 m; 5 rings at 0.12 / 0.165 / 0.21 / 0.255 / 0.30 m (4.5 cm apart) × 16 steps = 80 cells. Nothing grows in the hole; it holds the tide origin and the Listen orb glow. Step 0 is on the player's right and the steps run clockwise seen from above: step 4 nearest the player, step 8 on the left, step 12 farthest (D-029). Provisional (D-020): the outer radius becomes 0.25 m (ring gap 3.25 cm) only if the T-105 outer-ring test fails.
- Targets (FR-HND-04): drawn 2.5 cm across (a cell marker, a plant's base); picked within a 4.0 cm hit radius (tunable 3.5–4.0 cm by T-105), the nearest one wins; the hover moves to a neighbour only when it is ≥ 0.5 cm closer (dead band, FR-HND-16). Inner-ring cells are ≈ 4.7 cm apart (tightest), so neighbouring hit spheres overlap by design (LLD §5.1). All provisional until the on-device pinch test (T-105).
- Bed centre: **0.45 m** forward of the head by default (D-020; nearer, down to 0.35 m, only when the surface does not reach 0.45 m), on the surface. Floating bed (L4): 0.45 m forward, 0.25 m below eye height (LLD §5.5). *The v1.1 default of 0.40 m: replaced (D-020).*
- Reach, forward of the head: near rim 0.15 m, centre 0.45 m, far rim 0.75 m, which is exactly the cap. The far half of the outer ring is therefore a full arm's reach, and a lean for short arms (computed, not measured; the T-105 outer-ring test decides, D-020). The remove zone (more than 0.35 m from the bed centre) starts 0.57 m from the head to either side and 0.10 m on the near side; on the far side it would start at 0.80 m, beyond the cap, so removal never needs the far side (LLD §4).
- Essential elements (bed, captions, orb) within ±25°H/±20°V of the forward gaze (FR-UI-03); captions and hints are clamped into that box by the FoV guard (`ui/FovGuard.ts`). Vines, halo, particles, tuning ripple can go wider.
- FoV check for the bed, computed from the heights in the sketch (eye 1.15 m, table 0.72 m), not measured. Looking at the bed centre (44° down, 0.62 m away): the rim is 26° to each side, the far rim 14° above and the near rim 27° below. Rings 0–2 are inside the box all round; on the near side ring 3 (22° below) and ring 4 (27° below) are not, and the rim at the sides is just outside. With the 0.25 m outer radius: 22° to each side, 21° below. Whether the whole bed must fit is the T-105 decision (D-020: the bed inside the IWER VR-Glasses FoV mask).

## 3. Screens / states

### 3.1 2D landing page (the only 2D screen; also the door to the garden window, §3.7)
As built in T-126 (`ui/Landing.ts`; the copy is `ui/strings.ts`):
```
┌──────────────────────────────────────────────┐
│  Roomsong                                    │
│  Grow a song on your table.                  │
│                                              │
│            [  Enter the garden  ]            │  ← single primary button
│  (status line: empty, or one sentence)       │
│                                              │
│  This device                                 │
│  ▏Immersive AR: supported.                   │
│  ▏Hand tracking: checked when you enter. …   │
│  ▏Plane detection: checked when you enter. … │
│  ▏Anchors: checked when you enter. …         │
│                                              │
│  Access                                      │
│  ☐ One hand         ☐ Eyes only (gaze)       │
│  ☐ High contrast    ☐ Reduce motion          │
│                                              │
│  ▸ Help                                      │
│  Your garden is saved on this device only.   │
│  Nothing is sent anywhere.                   │
└──────────────────────────────────────────────┘
```
- **This device** (in place of the v1.2 line "Needs: Meta Quest, hand tracking on."): four lines, for immersive AR, hand tracking, plane detection and anchors. Each says in words whether the feature is there and what the app does without it; the coloured bar beside a line only repeats that. Before the first session only immersive AR can be known, because WebXR cannot be asked about a feature without a session: the other three read "checked when you enter" and are filled in from what the session was granted. A feature that was not granted reads "not available", not "not supported": the page cannot tell the two apart.
- **Status line** under the button: "Getting the garden ready." while the world loads (Enter is disabled until then); "The garden could not load. Reload the page." if it cannot; empty otherwise.
- **A refused session:** "The garden did not open. Check that hand tracking is on in the headset: Settings, Movement tracking, Hand tracking." in the status line, with Enter still usable (FR-SYS-03). The browser does not say why it refused, so the page never claims that hand tracking is off. *v1.2 "Hand tracking is off → Settings > Movement tracking > Hand tracking": replaced.*
- **No `immersive-ar`** (a desktop or phone browser): for now Enter is disabled and the status line reads "Roomsong needs immersive AR. Open this page in the browser of a Meta Quest 3 or 3S." Once the garden window is built (Should S6) this is not an error: the same button opens it (§3.7) and the line reads "No headset: use mouse or touch."
- **Help** is a disclosure on the page, not a link: four steps (sit and put the controllers down, palm up for a seed, pinch and plant, palms out to listen). **Privacy** is the one sentence, not a link. The build's version is not printed on the page; it is read from `/version.json` (T-108). *v1.2 "Help · Privacy (local only) · v1.0.0": replaced.*
- Native controls only (mouse, touch, keyboard, visible focus ring); no animation; no image, icon or web font. While a session runs the page is hidden; when it ends the page is back with the focus on Enter. Without JavaScript the page shows one line saying that it needs it.

### 3.2 Placement states (in XR)
| State | Visual | Audio | Caption |
|---|---|---|---|
| Scanning (≤3 s) | Soft ripple on candidate surfaces | Low pad swell | none |
| Placed (L1/L2; also a bed restored from its saved anchor, FR-ROOM-07) | Bed fades in, pulses once | Confirm chord | none |
| Hit-test (L3) | Ghost bed follows gaze; pinch icon | Ticking soft | "Pinch to place" |
| Floating (L4) | Bed with gentle hover | Confirm chord | none |
| Tuning (the 4.0 s after Placed; Should S1; FR-ROOM-12, LLD §5.8) | A light ripple crosses each detected surface in turn: the table at 0.3 s (0.6 s, radial), the nearest wall at 1.5 s (1.0 s, base to top), the ceiling at 2.7 s (0.8 s); each surface flares as it "makes" its note; tuned at 4.0 s. A missing surface is skipped. L3/L4 or no surfaces: one ripple on the bed only. Reduced motion: each surface glows for 0.4 s in the same order, no sweep. | The room chord, one note per surface: the root on Pad, the middle note on Bell, the fifth on Pluck (§6). A missing surface's note rings at the bed, so the chord is always complete. The garden starts in this key | One per sweep, each naming its surface: **"Table: seeds."** in the session that hands out the starter seeds, **"Table: colour."** in every other session; **"Walls: colour."**; **"Ceiling: scale."** Each is at most 3 words and 16 characters and stays ≥ 1.2 s, from the start of its sweep to the start of the next (1.2 / 1.2 / 1.3 s). None for a missing surface; none at L3/L4. Same captions under reduced motion. *v1.1 "none (the sound is the caption)": replaced (D-021, D-028).* |

The four ripple captions are fixed by LLD §5.8: copy them, do not reword them outside its limits. They use the caption slot of §3.3, one at a time. No caption credits a surface with the key or the echo: those come from the floor area and the room volume, and no sweep shows either. The "Tuned by" read-out in Settings says it (§3.6).

### 3.3 Onboarding sequence (captions ≤ 6 words, 1 at a time, 0.6 m, slightly below the gaze)
Captions are drawn inside the scene (the projection layer), not in a separate WebXR quad layer (FR-UI-01); each stays at least 1.2 s (`CAPTION_MIN_MS`). A caption appears 8 degrees below the gaze (not below the eye line: a seated player looks down at the table), stays at that point of the room, and is held inside the FoV box when the head turns away (API_SPEC §1.9). *"Slightly below eye line": replaced (T-126).*
0. **Tune** beat (4.0 s; only the ripple's own surface captions, §3.2): the tuning ripple crosses the room's surfaces and rings the room chord; onboarding captions wait for `room:tuned`, so step 1 never overlaps a ripple caption. (Wanderer rooms: a single bed ripple + chord, no caption.)
1. "Open your hand" + palm icon → seed glides to palm (the 3 starter seeds are the signature's starter voices).
2. "Pinch, and plant it" + pinch icon → ring guides visible on the annulus; a ghost marks the cell that will get the seed (hover cue, §3.4); the seed is planted on release.
3. (after plant) no caption; tide starts; 2nd and 3rd seed arrive with no captions.
4. (after 3 plants) a hint ring around the newest plant: ↕ pull icon, ✥ drag icon. Disappears after first use. (No twist hint: twist is cut.) The remove hint shows during a drag (§3.4).
5. (4 min or 6 plants) "Rest your hands to listen" + palms-out icon.

Budget to the first sound (FR-UI-02, ≤ 20 s): session start ≤ 5 s + scanning ≤ 3 s + tuning 4.0 s = 12 s at worst, which leaves 8 s for the first seed, pinch and sweep. No slack in the worst case; unverified until the stranger test (UAT-16).

### 3.4 Shaping feedback
Nothing changes the garden before a pinch ends: everything in this table up to the release is a preview, and the release commits it (FR-HND-16, LLD §4).

| Action | Visual | Audio |
|---|---|---|
| Hover (the cue before the commit, FR-HND-16) | The one target a pinch would act on lights up before the pinch. Empty hand: the plant, seed, orb, petal or panel control brightens 20 % with a soft outline (always an outline in high contrast). Carrying a seed or dragging a plant: a ghost on the cell that a release would fill, which is the nearest free cell when the one under the hand is taken. The cue moves to a neighbour only when that one is ≥ 0.5 cm closer, so it does not flicker. It is a level, not a blink (§5, flash cap) | none |
| Pinch (on a plant) | Lifts 1 cm, glow ring. Inside the first 2 cm of hand travel (dead zone) nothing else reacts | Soft tick |
| Pull | Starts when the hand leaves the dead zone moving more up or down than sideways (a tie is a pull). Plant stretches; a faint vertical scale ladder; 25 cm of travel is the whole range. Latched until release: a pull never becomes a drag and never moves the plant. The height shown is the height saved on release (FR-HND-08) | Live note preview (quiet) |
| Drag | Starts when the hand leaves the dead zone moving more sideways than up or down; latched until release. The plant follows the hand; ghost at the cell a release would fill; guides glow; past the outer edge (> 0.35 m from centre) the ghost fades and the bed rim dims to warn. **Remove hint:** during a drag an outward arrow (✥→) glows on the bed rim on the side of the hand that holds the plant. It points sideways, never away from the player: the far side is beyond reach (§2). Shown until the first removal, like the other hints | Cell "tick" on change |
| Drag off the bed (release outside, sideways or towards the body) | Plant dissolves into petals at the release point; one **undo petal** stays there, clamped into the FoV box, for 5 s, shrinking as time runs out | Reverse chime |
| Release in the hole | Plant snaps back to where it was | `bump` (the one "no" sound, API_SPEC §1.2) |
| Undo (pinch and release on the petal, or dwell) | Petals reassemble in the original cell | Forward chime |
*Twist and flick removed (D-011): no gesture is bound to either.*

**Hand out of view (tracking loss, FR-HND-15).** There is no hand model to fade (D-027), so the cue is ours: a tint on the thing the hand held, and one icon.

| Moment | Visual | Audio |
|---|---|---|
| A hand is lost while it holds a seed, a plant or a pressed control (`hands:lost`) | The held thing freezes where it is and dims to 50 % in one step (the tint: a level, not a blink). The hover cue freezes. The **hand hint** fades in over 150 ms: the open-palm icon in a dashed ring, 4 cm across, 4 cm above the point where the hand was last seen, clamped into the FoV box | none |
| The hand is back within the 200 ms grace (`hands:found`) | Full brightness again in 100 ms; the hint fades out in 200 ms; the gesture continues | none |
| The grace runs out (`gesture:trackingLost`) | The preview is undone: a dragged plant glides back to its cell in 150 ms (ease-out), a pulled plant returns to the height it had, a carried seed returns to the supply, a pressed control is cancelled. Nothing had been committed, so nothing is lost. The hint stays until the hand is seen again, at most 5 s | none |
| An empty hand is lost | Its hover cue clears. No tint and no hint: a resting hand is out of view most of the time (one-hand mode, Listen) | none |

Grace 200 ms (tunable 150–250), glide 150 ms: `hands/config.ts`. Reduced motion: unchanged (two levels and one short glide; no sweep, no parallax). High contrast: the hint has an outline. The emulator can only lose a whole hand; single lost joints and jitter at the edge of view wait for a headset (TC-DEV-09).
**No occlusion.** With no hand mesh, plants and seeds are drawn over the real hand in passthrough, so the hover cue is the main sign of what a pinch will reach. How that feels on a headset is unverified (D-027).

### 3.5 Listen mode
- Entry: palms-out 1.5 s **or** pinch/dwell the Listen orb (the pinch acts on release over the orb). Transition 1.2 s: passthrough dims to 40% (via a dark semi-transparent dome; never fully occlude), bed glow up, the **aurora halo** rises over the bed (always; Must). The halo alone is the complete Listen visual. Vines that grow to the nearest wall over 6 s are **Could** (C4; was Should S2, D-021; not scheduled).
- Beat ring always visible. Tide becomes a soft comet. Halo and beat-ring pulses stay under the flash cap (§5): above 90 BPM anything that pulses on the beat pulses on every second beat.
- Wake: any pinch, or palm to face. Fades back in 0.8 s.
- Auto-end at 10 min: ending chord, caption "Goodnight" (the one allowed non-instruction caption), stays in XR.

### 3.6 Settings panel (UIKit, 0.40 × 0.28 m, 0.55 m forward at eye height) — tabs Sound / Access / Garden (Codex cut, D-011)
```
┌──────────────────────────────────────────────┐
│ ● Sound   ● Access   ● Garden              ✕ │
├──────────────────────────────────────────────┤
│ Sound:   Tempo   [−]  84 BPM  [+]            │
│          Volume  [−]  ▮▮▮▮▮▮▮▮▯▯  [+]        │
│          Reverb  (auto) ( small ) ( off )    │
│          Tuned by: D major · echo 0.6 s      │
│                    room 15 m², ceiling 2.7 m │
│ Access:  One hand  ⦿  Gaze dwell ○           │
│          Dwell  (0.6 s) (0.9 s) (1.2 s)      │
│          High contrast ○  Reduce motion ○    │
│          Beat ring ⦿     Bed height [-  +]   │
│          Dominant hand  (L) (R)              │
│ Garden:  Day 4 · Seeds 2 · Key D major (room)│
│          [Re-place bed] [New garden (hold)]  │
└──────────────────────────────────────────────┘
```
**Tempo is the player's** (FR-MUS-03, D-021): default 84 BPM, range 60–120, in steps of 4. The room never moves it and it never reads "(room)". *v1.1 "Tempo reads (room) while it follows the room signature": Cut (D-021).* Volume: steps of 10 %.
Tempo and Volume are steppers, not sliders (changed in v1.2): a panel control acts on a pinch released over it, or on a gaze dwell (LLD §3, FR-HND-12, FR-HND-16), and neither can drag a slider.
**Reverb:** auto follows the room (§6), small is a fixed 0.6 s, off mutes the echo (`Settings.reverb`).
**Tuned by** (US-22; read-only, two lines, not a target): line 1 is what the room set (key root, mode, echo length), line 2 is from what (floor area, ceiling height). It is the one place that credits the room with the key and the echo, because no ripple caption can (§3.2). Wanderer: "C major · echo 0.9 s" over "no room found". The echo part dims while Reverb is not on auto. The Garden line's "(room)" is dropped in a Wanderer session.
**Dwell** (shown while Gaze dwell is on): 600 / 900 / 1200 ms, default 900 (`Settings.dwellMs`, FR-HND-12).
No bed-radius control (single annulus bed); bed height ±10 cm stays.
Interaction: a control lights up on hover and acts when the pinch is released over it; moving off first cancels (FR-HND-16). In gaze mode, dwell for the chosen time. Controls ≥ 3 cm tall. Panel opens via the settings orb (wrist), by pinch / dwell; closes with ✕ or looking away 5 s.

### 3.7 Garden window (non-XR; Should S6, FR-SYS-07, US-24, LLD §11)
- The same garden in a normal browser tab, when `immersive-ar` is missing (or `?flags=window` in dev). One fixed camera at a seated eye point over a drawn table. No passthrough and no room, so the song is Wanderer and there is no tuning caption. Never the judged path: the dev bench and the demo.
- The pointer or a touch is the pinch. A seed rides the pointer: click or tap an empty cell to plant it; press and drag a plant to move it; drag it off the ring to remove it; click the petal to undo; click the centre orb to listen. Commit on release as in XR; nothing needs a hover first, so a touch works like the mouse.
- It cannot pull (a pointer on the bed has no up or down, so no height shaping) and cannot open the settings panel (no settings orb; the landing page's access toggles are its settings). The page says so in one line: "Height and settings need a headset." There is no hand-out-of-view state: a lifted finger is a release.

## 4. Gesture language (icons drawn once, reused)
| Icon | Gesture | Meaning |
|---|---|---|
| ✋ open palm up | Palm-up 0.4 s | Receive a seed |
| 🤏 | Pinch | Grab / plant / confirm. The highlighted target is the one it acts on; the action happens on release (FR-HND-16) |
| ↕ | Pull while pinched: after the first 2 cm, the hand moved more up or down than sideways (a tie is a pull) | Grow / shrink (volume + sustain) |
| ✥ | Drag while pinched: after the first 2 cm, the hand moved more sideways than up or down | Move to another cell |
| ✥→ | Drag past the bed's edge, sideways or towards the body, and release (the arrow points to the side of the holding hand) | Remove (undo petal 5 s) |
| 🙌 palms out | Both palms out 1.5 s (one palm in one-hand mode) | Listen |
| ◎ | Pinch / dwell the Listen orb | Listen (always available) |
| 🤚 palm to face | 0.6 s | Wake |
| ◉ gaze dot | Dwell 600 / 900 / 1200 ms, default 900 (gaze mode) | Select / activate; Listen via the orb |
Dominant axis (FR-HND-08/10, LLD §4): inside the 2 cm dead zone a pinched plant does not react; the larger part of the first movement beyond it decides pull or drag, and the choice holds until release. Provisional until T-105.
Removed (D-011): ↻ twist, ⤴ flick, controllers. Nothing is bound to a twist or a flick; neither does anything.
No hand or controller models are drawn (D-027): these icons and the hover cue are all the hand guidance there is. Icons and hints mirror for the dominant hand (FR-HND-13).

## 5. Art direction
- **Theme:** bioluminescent night garden; glass-like stems; soft additive glow; petals as light.
- **Palette (fixed; no seasons, D-011):** one bioluminescent set — moss #7DD181, gold #F4D35E, violet #9B5DE5, ice #48CAE4, cream #FFF8E7 — tinted per room by the signature's `paletteSeed` (hue rotation `seed % 360`°, saturation nudge −1/0/+1 step; Wanderer seed 0 = untinted). The tint is subtle (the garden stays recognisably the same palette) but two rooms are visibly different. Bed base: charcoal glass #141A1F @ 40% alpha. Passthrough stays visible.
- **Shapes:** each voice has a unique silhouette (LLD §7). Height stretches, age adds branches/blossoms, the seed's hue tints (fixed per plant).
- **Tuning ripple:** a thin, bright crest (cream → the room tint) 3–5 cm wide that travels across a surface and leaves a 1 s afterglow; the surface's note rings when the crest reaches its centre. Crest and afterglow go through the flash cap.
- **Motion:** idle sway 0.2 Hz, 1–2 cm; tide 1 bar per rotation; bloom-in 0.6 s ease-out; remove burst 0.4 s; ripple sweeps 0.6 s (table), 1.0 s (wall), 0.8 s (ceiling), starting 0.3 / 1.5 / 2.7 s after placement (§3.2); hover cue in and out 100 ms; tracking-loss glide 150 ms ease-out (§3.4). Reduced-motion halves amplitudes, replaces growth with fades and the ripple sweep with sequential 0.4 s glows; the hover cue, the tracking-loss tint and its glide stay as they are.
- **Flash cap (FR-UI-11, Must; LLD §5.9):** no element changes luminance more than 3 times in any second. A flash, up and back, is two changes, so the cap is 1.5 flashes per second per element: half of what the three-flashes rule allows. What it means for the design:
  - Once-per-bar effects are safe at every tempo: a plant's trigger flash and a beat-ring tick each fire once per bar (two changes in 2.9 s at 84 BPM).
  - Anything that pulses on every beat (the halo, the beat ring's pulse) makes two changes per beat: 2.8 per second at 84 BPM, 3.0 at 90, 4.0 at 120. Up to 90 BPM it pulses on every beat; above 90 BPM it pulses on every second beat. That is a fixed rule, not a pulse dropped now and then.
  - The tide crest keeps one brightness as it moves, so it does not count; what it lights up counts on the plant it lights.
  - The hover cue and the tracking-loss tint are levels, never blinks. Design nothing as a blink.
  - Enforced in the animation code (`render/FlashGuard.ts`), not by this document; checked by TC-E2E-15. *v1.1 "no flashing > 3 Hz": replaced by this stricter cap.*
- **Typography:** one humanist sans (system or a bundled OFL font, logged in licenses); captions 1.6 cm cap height at 0.6 m. Captions are text inside the scene (the projection layer), not a separate WebXR quad layer (FR-UI-01): they get no extra sharpness from a compositor layer, so the cap height and contrast here are minimums. Legibility on a headset is unverified.
- **Contrast:** normal ≥ 4.5:1 on dimmed backdrop; high-contrast 7:1 + outlines.

## 6. Sound direction
- **Tempo is the player's:** default 84 BPM, range 60–120 (Settings → Sound). The room does not set it in v1 (FR-MUS-03, D-021); the listening review T-103 may change the default. 16-step bar (≈2.86 s per rotation at 84). *Tempo 72 / 84 / 96 BPM from the room signature: Cut (D-021).*
- **Key and mode come from the room** (LLD §5.2, §5.8): the key root from the floor area (E, D, C or A; a bigger room sings lower), the mode from the ceiling height. **Three pentatonic modes (D-025)**, in semitones above the root: major [0, 2, 4, 7, 9], minor [0, 3, 5, 7, 10], sus [0, 2, 5, 7, 10]. None has a semitone step, so plants on neighbouring rings cannot clash. Five rings = the five degrees = one pentatonic octave, inner low → outer high. Wanderer = C major. *Dorian hexatonic and lydian hexatonic: Cut (D-025).*
- **Room chord:** one chord per mode, as ring indices. Major rooms: rings 0, 2, 3 = a major triad (C–E–G on C). Minor rooms: rings 0, 1, 3 = a minor triad (C–E♭–G). Sus rooms: rings 0, 2, 3 = a sus4 (C–F–G). Root and fifth are the same in all three; the middle note tells the modes apart. The tuning ripple plays exactly these three notes (table → wall → ceiling: root on Pad, middle note on Bell, fifth on Pluck), so the first thing heard in a room is the chord the garden will grow into. *The v1.1 chord "scale degrees 0, 2, 4" (C–E–A in Wanderer): Cut (D-025).*
- **One reverb, as long as the room** (FR-ROOM-06, LLD §7.1): a single shared reverb whose length follows the room volume in six steps, 0.3 / 0.6 / 0.9 / 1.2 / 1.6 / 2.0 s (a 3 × 4 m bedroom 0.6 s, a 5 × 5 m living room 1.2 s; Wanderer 0.9 s). One send level for every voice and every room (0.28, inside the 20–35 % range). Settings: auto follows the room, small is a fixed 0.6 s, off mutes it. The words small / medium / large are a label for the read-out and set nothing. The length is tuned to be heard, not to match the real room's echo: no copy may say it measures the room. *Three reverb sizes, and a send sized by the signature: Cut (D-021).*
- **Panning:** each plant sounds from its own place on the bed by equal-power panning, with the listener at the player's head, and a table-scale distance curve (full level up to 0.40 m, about −6 dB at 0.80 m) so near plants are a little louder than far ones. No HRTF by default: at most 2 "hero" sources, and only if a device A/B justifies them (T-129, W1). *An HRTF panner per plant: Cut (D-021).*
- Mix: Bass −6 dB, Pad −9, Choir −9, Bell −7, Pluck −8, Shimmer (Should) −12; master limiter (a compressor, then a −1 dBFS ceiling). At most 24 notes sound at once; a full bed steals the quietest, oldest note with a 20 ms fade (NFR-PERF-10).
- UI sounds: derived from the room key (tick = root, confirm = room chord, remove = reverse chime, undo = forward chime), so UI never clashes with the garden.
- Listen mode adds a very slow filter sweep on the pad bus and widens reverb. *Open since contract v1.2: the audio graph of LLD §7.1 has no pad bus and one reverb send level for every room, so neither effect has a place in it yet. Not to be built until the contract says how.*

## 7. Error & edge states
| Situation | Behaviour |
|---|---|
| Hand out of view (tracking lost, FR-HND-15) | No hand model exists to fade (D-027). What the hand held freezes and dims; back within 200 ms → the gesture continues; otherwise it is undone (a plant glides to its cell in 150 ms, a seed returns to the supply) and the hand hint shows until the hand is seen again (at most 5 s). No caption, no sound; nothing is lost (§3.4). *v1.1 "Hands fade": replaced (D-027).* |
| Seed released off-bed | Seed floats back to the supply orb with the `bump` sound |
| Cell occupied on drop | The ghost already shows the nearest free cell before the release (FR-HND-16); the release plants there + bump sound; if bed full (80), no ghost, caption "Garden is full" and seed returns |
| Plant dragged off by accident | Undo petal for 5 s at the release point, clamped into the FoV box (pinch or dwell); after that the removal is final |
| Different room than last time | Garden re-tunes in place (plants keep cells, pitches follow the new key and mode, the echo follows the new room, the tempo stays); tuning ripple plays with its surface captions (§3.2); no other caption |
| Anchor restore failed, or anchors unsupported (Must with this fallback, FR-ROOM-07; was Should S4, D-021) | Not an error. The saved anchor is tried for up to 4 s, then the bed is re-placed by the placement chain, silently; garden intact; tiny icon "re-placed" for 3 s. How reliably a headset restores an anchor is unverified (T-129, A1) |
| Save failed | Caption "Saving unavailable" once per session |
| Browser lacks a feature | Degrade: no `immersive-ar` → the garden window (§3.7, Should S6); no planes → L3/L4 and the Wanderer signature (C major pentatonic, 0.9 s echo; the tempo stays the player's); no anchors → re-place each session. *"No HRTF → stereo panning": Cut (D-021); equal-power panning is the default everywhere.* |

## 8. Accessibility specifics
- Gaze reticle: 1.2 cm dot, dwell ring fills over the chosen dwell time, 600 / 900 / 1200 ms, default 900 (`Settings.dwellMs`, FR-HND-12); dwell pauses when the head moves > 8°/s.
- One-hand: the Listen orb (bed centre) is repeated beside the dominant wrist (always visible at 20° right, or left for left-dominant) and either one toggles Listen; palm-out single hand works.
- Beat ring: 16 ticks; tide position; plants flash on trigger with their silhouette icon on the ring.
- No element changes luminance more than 3 times per second, which is at most 1.5 flashes per second (FR-UI-11; rules in §5). Tide glow ramps, never strobes. *"No flashing > 3 Hz": replaced by this stricter cap.*
- Reduced motion, in one place: tuning ripple → each surface glows 0.4 s in turn, same notes and captions (§3.2); growth → fades; amplitudes halved; particle counts halved (FR-UI-06). Hover cue, tracking-loss tint and the 150 ms glide are unchanged.
- High contrast: every hover cue is an outline as well as a glow; the hand hint and the remove hint are outlined.
