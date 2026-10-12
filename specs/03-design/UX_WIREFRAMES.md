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
- Bed = annulus (ring-shaped): inner radius 0.12 m, outer 0.30 m; 5 rings at 0.12 / 0.165 / 0.21 / 0.255 / 0.30 m (4.5 cm apart) × 16 steps = 80 cells. Nothing grows in the hole; it holds the tide origin and the Listen orb glow. Step 0 is on the player's right and the steps run clockwise seen from above: step 4 nearest the player, step 8 on the left, step 12 farthest (D-029). The drawn glass reaches one marker radius (1.25 cm) past the inner and the outer ring, as a visual rim only: nothing is planted or picked there. Provisional (D-020): the outer radius becomes 0.25 m (ring gap 3.25 cm) only if the T-105 outer-ring test fails.
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

### 3.6 Settings panel (0.40 × 0.28 m, 0.55 m forward at eye height; as built in T-151 it is drawn on a canvas, not with UIKit, bed height sits on the Garden tab in 2 cm steps, volume reads as a per cent, and the tab is named "Access") — tabs Sound / Access / Garden (Codex cut, D-011)
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

## 9. Design answers, 2026-10-12
Seven questions the builders and reviewers raised, settled so the next tasks do not have to guess. Written against the code on `develop` at `bfe0e20` (`src/hands/`, `src/room/`, `src/render/`, `src/ui/`). Nothing here has been seen on a headset: every answer says what the emulator can show and what the device run (T-129) has to confirm. Sections 1 to 8 are not edited by this section; where an answer changes a sentence above, **Replaces** quotes it, and the driver folds it in. Numbers marked *computed* come from the seated sketch of §2 (eye 1.15 m, table 0.72 m, bed centre 0.45 m ahead), not from a measurement.

### 9.1 One-hand seed pick-up (T-160)
**Decision.** In one-hand mode a delivered seed rests at the fingertips of the hand that asked for it, at that hand's own pinch point, not above its palm. The same hand closes thumb and index on it, carries it and lets go over a cell: the carry and the planting are unchanged. This is the rule the garden window already has for a pointer (LLD §11), so there is no new gesture and the gesture machine does not change.

**Numbers and text.**
- Asking is unchanged: palm up within 35° for 400 ms (FR-HND-05).
- Rest point: `HandFrame.pinchPos` (the filtered midpoint of thumb tip and index tip), in place of the point 3 cm above the palm (`PALM_REST_OFFSET_M`). The seed is drawn 2.5 cm across with a 4.0 cm hit radius; at the pinch point its distance to the pinch is 0, so the pinch cannot miss it.
- Stepping aside: while a plant, the orb, an undo petal or a panel control is within 4.0 cm (`HIT_RADIUS_M`) of the fingertips, the seed rests above the palm instead, so a pinch there acts on that target. It returns to the fingertips once nothing is within 4.5 cm (`HIT_RADIUS_M + HOVER_DEAD_BAND_M`). Each hop is a 100 ms glide, ease-out. Without this rule a waiting seed would take every pinch and no plant could be shaped until it was planted.
- Either hand may ask; the seed rests at the fingertips of the hand that did. Icons mirror for the dominant hand as everywhere (FR-HND-13).
- Captions unchanged: "Open your hand", then "Pinch, and plant it". No new caption, no new icon.
- Gaze only: there is no pick-up. A dwell on a free cell plants the next seed there (US-16), as before.

**Needs from the code.**
- `hands/` (T-160; API_SPEC §1.4 first): with `Settings.oneHand` on, `palmPos` is the pinch point, with the stepping-aside rule above. The contract's comment on `palmPos` gains "one-hand mode: the pinch point".
- `window/PointerSource` (T-114): the same rule in LLD §11's words. Whichever of the two lands second reuses the first one's function.
- `render/`, `onboarding/`, `garden/`: nothing. A delivered seed is already drawn at `palmPos` and picked there as an ordinary target (LLD §4).
- Tests (T-160): one unit case (the rest point with and without a target within 4.0 cm) and one emulator case beside TC-E2E-07: with one-hand mode on, a single emulated hand goes palm up for 400 ms, pinches, moves over a cell, releases, and one plant exists.

**Inside the rules.** Hands only, and one hand is enough for the whole loop. Gaze-only users are not affected. Reach and view box: the seed is in the player's own hand, as today. Flash limit: nothing changes brightness (the hover cue is a level). Reduced motion: the 100 ms hop stays, like the 150 ms tracking-loss glide.

**Emulator / headset.** The emulator shows the whole flow with one emulated hand, the stepping-aside rule and the event order. Only a headset shows whether a real open hand's pinch point is steady enough to rest a seed on (the filter trails a moving hand by about 3 cm at 0.2 m/s with beta 0), whether the platform's classifier sees a pinch made palm up (`select`), and whether a seed drawn over the fingers with no occlusion reads as lying between them (TC-DEV-06).

**Rejected.** A seed stand on the table beside the bed: every free spot there is either in the remove zone or outside the view box, and it is one more place to learn.

**Replaces.** Nothing. Adds one sentence to the One-hand bullet of §8: "A delivered seed rests at the fingertips of the hand that asked for it (§9.1)." Step 1 of §3.3 gains "(one-hand mode: to the fingertips)" after "seed glides to palm".

### 9.2 Placement level 3: the wait and the confirm (T-128)
**Decision.** The moment level 3 starts, a ghost of the bed shows where the bed will land and one caption says what to do. The bed lands where the ghost is, in all three endings: a pinch, a dwell in gaze mode, or the 10 s running out. So nothing jumps at the end of the wait and no pinch is ignored.

**Numbers and text.**
- Start: `room:placementLevel { level: 3 }`, at most 3 s after the session starts (at once in a session without plane detection). Ghost and caption fade in over 300 ms. A session without hit-test never enters level 3 and shows neither.
- Caption, hands: **"Look at your table, and pinch"** (6 words) with the pinch icon. Gaze mode: **"Look at your table, and wait"** (6 words) with the gaze-dot icon. It sits in the caption slot of §3.3 (0.6 m ahead, 8° below the gaze, held in the view box by the FoV guard) and stays until the bed is placed. Keys `placeLook` and `placeLookGaze` in `core/strings.ts`.
- Ghost: the bed's own glass with its five ring lines and nothing else: no cell markers, no plants. Its pose is exactly the pose a confirm in this frame would give:
  - gaze on a usable spot (a hit at least 0.25 m below the eyes and at least 0.5 m above the floor, D-034): on that surface, its centre pulled to 0.35–0.45 m from the head by the solver's own clamp;
  - anything else (no hit, a wall, the floor): the floating bed, 0.45 m ahead and 0.25 m below eye height.
  It follows with a 100 ms ease, so hit-test jitter does not shake it, and keeps one brightness: a level, never a pulse.
- Confirm, hands: a pinch of either hand, anywhere, acting on its release (`gesture:release` with `target: null`; there is nothing else to pinch yet). The bed is placed where the ghost is: on the surface (level 3), or floating (level 4) when the gaze is on nothing usable.
- Confirm, gaze mode: the ghost is the dwell target. It confirms after resting on a usable spot for `Settings.dwellMs` (600 / 900 / 1200 ms) with the head moving less than 8°/s (the §8 rule), the reticle's ring filling as for any target. A dwell never places a floating bed; that comes from the time-out only, so a moment of sitting still does not cost the table. A pinch works in gaze mode too.
- Time-out: 10 s after level 3 began (`HIT_TEST_TIMEOUT_MS`) the bed is placed where the ghost is at that moment: on the surface when the gaze is on a usable spot (level 3), floating otherwise (level 4).
- Placed, in all three endings: the ghost stops following, the cell markers fade in, one pulse and the confirm chord (the Placed row of §3.2), and the caption is withdrawn. No error text and no "no" sound: a floating bed is a complete garden (FR-ROOM-02).
- Cost: 0 new draw calls and 0 new geometry. The ghost is the bed's first mesh (1 draw call), shown before the bed is placed instead of after.

**Needs from the code.**
- `room/PlacementSolver` (T-128; API_SPEC §1.3 first): a read-only preview, the pose and the level (3 or 4) that a confirm in this frame would give; nothing outside level 3.
- `room/PlacementSolver` (T-128; FR-ROOM-01 (3) and LLD §5.5 first): a confirm with no usable spot places the floating bed at once, and a wait that runs out over a usable spot uses that spot. Today the first is ignored for up to 10 s and the second floats above the table the user is looking at.
- `room/RoomSystem` (T-128): calls `confirm()` on `gesture:release` with `target: null` while level 3 runs.
- `render/BedRenderer` (T-128): its glass is shown at the preview pose with the markers hidden until `room:bedPlaced`.
- `ui/` (T-128): raises the caption on `room:placementLevel { level: 3 }` and withdraws it on `room:bedPlaced`; the two keys above.
- `access/GazeDwell` (T-160): the ghost as a dwell target; it calls `confirm()`.

**Inside the rules.** Hands only; either hand, so one hand is enough. Gaze only: the dwell, with no pinch anywhere. Reach: the solver's clamp holds the centre to 0.35–0.45 m and the far edge to 0.75 m at every level, and the ghost shows that clamped pose. View box: the caption is held in it; the ghost is the bed and is in view as far as the bed is (§2). Flash limit: the ghost and the caption are levels; the placed pulse is one pulse. Reduced motion: unchanged; the ghost is an aiming cue like the gaze reticle, with no sweep and no parallax.

**Emulator / headset.** The emulator, with `forceLevel=3` and a stubbed hit: the caption text and when it shows and goes, the ghost's pose equal to the placed pose, a pinch on a usable spot (level 3), a pinch on nothing usable (level 4 at once), no pinch (placed at 10 s where the ghost is), a dwell with no pinch event, the draw-call count and the flash count. Only a headset shows what hit-test meets in a room without Space Setup (already on the T-129 list), whether a bed resting on the real table and a floating one can be told apart by depth alone (if not: ring lines cream while floating, through the existing `uLine` uniform), how much the hit point shakes, and whether a stranger follows the caption (UAT-16, the room with no scanned table).

**Not decided here: the first-sound budget (for Parth).** FR-UI-02 allows 20 s. Before the first seed can be asked for, level 3 spends: cold start up to 5 s + plane wait 3 s + the time to the confirm + the bed ripple 4.0 s. With a confirm 3 s after the hint that is 15 s, which leaves 5 s for the first seed where §3.3 counts 8. With the full 10 s it is 22 s. The design above shortens the usual case and cannot shorten the worst one: that takes a shorter level-3 wait (FR-ROOM-01) or a shorter ripple for a bed-only room (LLD §5.8), or FR-UI-02 scoped to rooms where a table is found.

**Rejected.** A countdown ring on the ghost: one more animated element, and a hurry the app does not need once the bed lands where the ghost is.

**Replaces.** In §3.2, the Hit-test (L3) row: Visual "Ghost bed follows gaze; pinch icon" becomes "Ghost bed where the bed will land: on the surface under the gaze, else floating (§9.2); pinch icon", and Caption "Pinch to place" becomes "Look at your table, and pinch" (gaze mode: "Look at your table, and wait"). In §3.3, "session start ≤ 5 s + scanning ≤ 3 s + tuning 4.0 s = 12 s at worst" becomes "session start ≤ 5 s + scanning ≤ 3 s + tuning 4.0 s = 12 s when a table is found (levels 1 and 2); at level 3 add the time to the confirm, up to 10 s (§9.2)".

### 9.3 The undo petal (T-146, T-147)
**Decision.** The petal waits where the plant stood: over the removed plant's own cell, not at the release point. It is then a thing on the bed, always within reach, never two on one spot, and it says which plant it brings back. `render/` draws it. No view-box clamp is needed, so `clampToFov` stays in `ui/` and nothing moves to `core/`.

**Numbers.**
- Place: the centre of the removed plant's cell, 3 cm above the bed, fixed in the room for its whole life. One petal per removed plant; several can be alive at once, each over its own cell.
- Arrival: the plant dissolves at the release point as before, the burst's petals drift to the cell in 400 ms (the remove burst's time) and one stays. The drift leads the eye from the hand back to the bed.
- Look: one petal of the burst, in the plant's own colour at the rest brightness 0.7, constant. Drawn 2.5 cm across at the start and shrinking in a straight line to 1.0 cm at 5 000 ms. The cell's own marker ring (2.5 cm, already drawn) lies under it, so the shrinking has a fixed size to be read against. It fades out over the last 300 ms: one luminance change in its life. Nothing blinks and nothing speeds up near the end.
- Target: hit radius 4.0 cm for the whole 5 s, however small it is drawn. Lifted 3 cm, it is at least 5.6 cm from a neighbouring plant's foot even on the inner ring, so the nearest target is never in doubt.
- Taking it: a pinch released on it (the existing `press`), with either hand, or a gaze dwell of `Settings.dwellMs`. The hover cue is the existing one (20 % brighter with an outline). Undo itself is unchanged: the petals reassemble in the cell, forward chime.
- If a seed is planted into that cell meanwhile, the petal stays and an undo puts the plant on the nearest free cell (D-031).
- View box, *computed*: with the gaze on the bed centre the petal is inside ±25°/±20° for 68 of the 80 cells. For the other 12 (ring 4, steps 0 to 8; ring 3, steps 1, 4 and 7) it is outside by at most 7.2°. These are the near-side and side-rim cells whose plants §2 already lists as outside the box, and the T-105 decision on the outer radius settles both together.
- Reach: on the bed, so at most 0.75 m from the head, measured level.

**Needs from the code.**
- `render/` (T-146: the petal and its `Interactable { kind: 'undo' }`; T-147: the drift): on `garden:removed`, a petal at `cellCentre(undoToken.plant.cell)` plus 3 cm, until `expiresAt` or the undo. One more draw call at most, shared with the burst's particles.
- `garden/GardenSystem` (T-128): keeps the 5 s life, as planned. `hands/`: nothing, PRESSED on an undo target exists. `access/GazeDwell` (T-160): the petal is a dwell target like any `Interactable`. `ui/`: nothing.
- To fold in outside this document: API_SPEC §2, `garden:removed`, "render (undo petal at the release point)" becomes "at the removed plant's cell"; the T-146 row's open choice (move `clampToFov` to `core/`, or let `ui/` draw the petal) falls away.

**Inside the rules.** Hands only; one hand; gaze only by dwell (the longest dwell, 1 200 ms, fits in the 5 s). Reach as above. View box as computed above: not strict for 12 cells, which is the one open point of this answer. If the petal has to be strictly inside the box for every cell, say so before T-146 starts: the answer is then the rejected one below. Flash limit: constant brightness and one fade. Reduced motion: no drift; the petal fades in at the cell over 150 ms; the shrinking stays (1.5 cm over 5 s). High contrast: the marker ring under it at full strength as its outline.

**Emulator / headset.** The emulator shows the petal's place for every cell, its life against a fake clock, pinch and dwell, several petals at once, and the flash count. Only a headset shows whether a 1.0 to 2.5 cm petal among plants is found in time by someone who did not mean to remove a plant, and whether 4.0 cm is enough to pinch it on the far rings.

**Rejected.** The petal at the release point, clamped into the view box by `ui/`: it needs the head pose, a floor so that it never lands inside the table, and a rule for two petals on one spot, and it cannot say which plant it brings back.

**Replaces.** In §3.4, "Plant dissolves into petals at the release point; one **undo petal** stays there, clamped into the FoV box, for 5 s, shrinking as time runs out" becomes "Plant dissolves into petals at the release point; the petals drift back to the plant's cell and one **undo petal** waits 3 cm above it for 5 s, shrinking as time runs out (§9.3)". In §7, "Undo petal for 5 s at the release point, clamped into the FoV box (pinch or dwell)" becomes "Undo petal for 5 s over the plant's own cell (pinch or dwell; §9.3)".

### 9.4 The sweep of light on a bright table (follow-up of T-125, before the T-163 review)
**Decision.** One rule: the light travels with its own shade. The wedge keeps its cream light at the strength it has, and a charcoal band is added directly ahead of the crest. On a dark table the band cannot be seen; on a light table it is the dark edge the crest stands against. The light is never made brighter: a light table is already near white, so more light adds nothing there and washes out the plants everywhere else.

**Numbers.**
- Light, unchanged (`render/config.ts`): cream, peak 0.7 (`TIDE_PEAK`), rising over the 0.5 step ahead of the crest, trailing 3 steps behind it, falloff power 2.
- Shade, new: the bed's own charcoal (#141A1F). It runs from 1.0 step ahead of the crest to the crest: cover 0 at 1.0 step ahead, 0.6 at 0.5 step ahead, 0 at the crest, in straight lines. Across the bed it has the light's own profile (nothing at the two glass edges, full between ring 0 and ring 4). New constants `TIDE_SHADE_STEPS = 1` and `TIDE_SHADE_COVER = 0.6`.
- How the two combine: what is drawn = the light + what lies under it × (1 − cover). Where the cover is 0 this is today's additive light, so the crest and its tail look as they do now.
- Contrast, *computed* for the bed glass at 40 % over four table colours, as luminance ratios. Today, crest against the bed around it: white 2.5, light (#E8E4DA) 3.1, grey (#808080) 7.2, the preview's dark table (#2B2622) 10.3. With the shade, crest against the shade's darkest point: 8.0, 8.9, 12.8, 10.9. Those figures blend the encoded colour values, as the browser canvas does. If a headset blends in linear light they are 1.6, 2.0, 4.6, 11.0 today and 3.5, 4.3, 7.7, 11.6 with the shade.
- Pass mark: crest to the shade's darkest point at least 3:1 on a white table and on the dark one, measured on the preview page.
- Cost: the wedge grows from 3.5 to 4 steps of arc, 96 triangles in place of 84, still one mesh and one draw call when its blend carries light and cover together; one more draw call per eye if the builder needs a second mesh (16 in a session with both eyes where 14 are measured today, of a budget of 60).
- Plants stand above the wedge and are not darkened by it. Their trigger flash is unchanged (0.7 to 1.0 and back).

**Needs from the code.**
- `render/TideRenderer` and `render/config.ts`: the shade as above; showing and hiding the wedge fades light and shade together, through the one FlashGuard element it has.
- `proto/bed`: a way to set the table to white, so the pass mark can be checked.
- Test: in `07-bed`, the luminance at the crest and half a step ahead of it, on both tables.

**Inside the rules.** Hands, one hand, gaze, reach and view box are not touched. Flash limit: the wedge still moves at one brightness, which the cap does not count (LLD §5.9). Counted the hard way, at one fixed spot of the bed on a white table, a spot goes darker, brighter and back once per bar; the three changes begin within one step of each other and bars are at least 2.0 s apart (120 BPM), so no second holds more than 3. On a dark table the shade's swing is 0.01 of full scale, below `FLASH_MIN_DELTA`. Reduced motion and high contrast: the same wedge.

**Emulator / headset.** The emulator shows both tables on the preview page, the pass mark, the draw calls and the flash count. Only a headset shows how bright a real light table arrives in passthrough, whether the compositor honours the canvas's cover and in which space it blends (the two rows of figures above), and so whether 0.6 is enough.

**For Parth's eye, not decided here.** A darker bed glass (40 % to 65 %) would also help the markers and the ring lines on a light table (crest against bed 5.4 on white, 2.6 if blended in linear light), but it hides more of the real table and changes the look he is rating now.

**Rejected.** A dark layer of the wedge's own shape under it: it darkens exactly where the light is, so on white the crest drops from 2.5 to 2.2 against the bed.

**Replaces.** Nothing. Adds to the flash-cap bullet of §5 that begins "The tide crest keeps one brightness as it moves": "A charcoal shade leads the crest by half a step, so the crest has a dark edge on any table (§9.4)."

### 9.5 Shapes for Bass and Choir (follow-up of T-125; T-163 polishes)
**Decision.** Bass is a jug: a low, broad bulb that sits on the bed itself, with a thin neck and a small cap. It is the only plant whose weight is at the ground. Choir is an umbrella: a canopy of three rounded petals that hangs over the top of the stem, open underneath, the pad's cup turned upside down. Both are two more rows in the table the renderer already has (an outline turned round the stem, with or without lobes), so no new kind of geometry is needed.

**Numbers.** In the form of `SHAPES` in `render/PlantRenderer.ts`: radius in metres, then height, then head (1) or stem (0). A stem row's height is a share of the stem; a head row's is metres above the stem's top.
```
Bass   segments 12, lobes 0, 216 triangles, 4.0 cm across
  [0.0125, 0,    0]   foot, 2.5 cm across like every plant
  [0.020,  0.06, 0]   the bulb: the lowest 30 % of the stem
  [0.020,  0.16, 0]
  [0.011,  0.24, 0]
  [0.005,  0.30, 0]   neck
  [0.004,  1,    0]
  [0.009,  0.003, 1]  cap, 2.2 cm across and 1.7 cm tall
  [0.011,  0.008, 1]
  [0.008,  0.014, 1]
  [0,      0.017, 1]

Choir  segments 18, lobes 3, 252 triangles, 4.2 cm across
  [0.0125, 0,    0]   foot
  [0.004,  0.08, 0]
  [0.004,  1,    0]
  [0.004,  0.010, 1]  crown: the stem runs 1 cm up into the canopy
  [0.013,  0.006, 1]
  [0.020, -0.006, 1]  the canopy hangs below the stem's top
  [0.021, -0.016, 1]
  [0.019, -0.024, 1]  open rim, 2.4 cm below the stem's top
```
- The bass bulb stretches with the stem: 0.9 cm tall on the shortest stem (3 cm), 2.7 cm on a new plant (9 cm), 4.2 cm on the tallest (14 cm); always 4.0 cm across, so broader than it is tall on every stem but the very tallest, where the two are about equal. The choir's canopy keeps its shape; its rim is 0.6 cm above the bed on the shortest stem.
- Triangles of the three shapes as built, from their tables: Bell 240, Pad 200, Pluck 112. Both new shapes are under the 280 asked for. A bed of 80 choirs is 20,160 triangles in one eye (80 bells: 19,200), of a budget of 150,000.
- Draw calls: two more instanced meshes, 5 for the plants in place of 3: 18 in a session with both eyes where 14 are measured today, of 60.
- Telling them apart by outline alone, *computed*: the share of two side outlines that coincides (1.00 = the same outline), the worst of three stem heights. Bass against Bell 0.42, Pad 0.51, Pluck 0.24, Choir 0.42. Choir against Bell 0.40, Pad 0.51, Pluck 0.25. The three existing shapes among themselves: Bell and Pad 0.64, Bell and Pluck 0.36, Pad and Pluck 0.30. So neither new shape is closer to anything than Bell and Pad already are to each other.
- In words, for a reviewer with the hue turned off: Bell a lantern (a bulb under a cap), Pad an open cup, Pluck a pin, Bass a jug on the ground, Choir an umbrella. From the seated view, 44° down: Bell a round cap, Pad a scalloped cup with its inside showing, Pluck a bead, Bass a round bulb on the glass with a small cap above it, Choir a closed three-sided dome.
- Lobes: the choir uses the lobe depth the pad has (`PLANT_LOBE_DEPTH` 0.3). No new constant.
- Shimmer (Should, S5) keeps the pluck's shape. If it ships it needs its own; not designed here.

**Needs from the code.**
- `render/PlantRenderer.ts`: the two rows in `SHAPES`, and `SHAPE_OF` bass and choir pointing at them. A head row with a negative height is new: the shader's arithmetic already places it, the type's comment needs the word.
- Tests: the mesh count in `PlantRenderer.test.ts` (3 becomes 5), and one unit case for the outline figures above, worked from the tables with no rendering.
- `proto/bed`: the five in a row, so they can be looked at.
- To fold in outside this document: LLD §7, Choir's silhouette "Cluster of three rounded petals" becomes "Canopy of three rounded petals hanging over the top of the stem"; Bass's "Low, broad bulb" stays.

**Inside the rules.** Hands, reach, view box and the flash limit are not touched: every foot is still 2.5 cm across, the hit radius is unchanged, nothing is wider than the 4.5 cm between two rings, and the shapes take the same brightness from the same guard. Colour-blind users: the figures above use the outline only, never the hue (FR-UI-08).

**Emulator / headset.** The emulator shows the five side by side from the seated camera, in colour and in grey, with the triangle and draw-call counts. Only a headset shows whether they can be named at arm's length through the lenses, and from above whether the choir's three sides read against the pad's five scallops; if they do not, deepen the choir's lobes to 0.5 (then a number per shape). How they look is Parth's rating (1 to 5).

**Rejected.** Choir as a closed three-lobed bud on top of the stem: its side outline coincides with the pad's by 0.83 and with the bell's by 0.74, and the lobes show only from straight above.

**Replaces.** Nothing in §5. The Shapes bullet stays true: "each voice has a unique silhouette (LLD §7)".

### 9.6 Growth you can see (T-161, the drawing half)
**Decision.** A plant's age is counted in leaf whorls on its stem: none on the day it is planted, one after a day, two after three days; after a week the two whorls open into cream blossoms and the plant's colour turns lighter. The plant's own shape and width never change with age, so the five silhouettes stay as readable in the first session as they are in the preview. The bloom-in is not a separate show: each grown plant unfurls on its own first note of the session, as the sweep of light first reaches it.

**Numbers.**

| Stage | Age | Whorls on the stem | Colour |
|---|---|---|---|
| 0 | under 1 day | none | the plant's own (lightness 0.63, `PLANT_LIGHTNESS`) |
| 1 | 1 day | one, at 0.40 of the stem | the same |
| 2 | 3 days | two, at 0.40 and 0.60 of the stem | the same |
| 3 | 7 days | the same two, opened: cream, 1.3 times as wide | lighter: lightness 0.75, same hue |

- A whorl: a flat ring of four leaves round the stem, 2.4 cm across and 0.3 cm thick (an outline turned round the stem like the plants: 8 segments, 4 lobes, 32 triangles), in the plant's colour and at the plant's brightness. A blossom is the same whorl in cream at 3.1 cm.
- Heights, *computed*: the two whorls are 0.6 cm apart on the shortest stem (3 cm), 1.8 cm on a new plant's (9 cm), 2.8 cm on the tallest (14 cm). Both are above the bass's bulb, which ends at 0.30 of the stem. Under the choir's canopy the upper whorl is hidden on stems shorter than about 6 cm and both on stems shorter than about 4 cm: a choir pulled that low shows its age only at stage 3, by its colour.
- Cost: one more instanced mesh for all whorls of all voices: 1 draw call per eye, at most 160 whorls, 5,120 triangles in one eye. No new FlashGuard element: a whorl takes the brightness its plant was granted.
- The stage is what `garden/` already computes (`stageFor`: 1, 3 and 7 days). It changes only when a session starts (`applyVisit`), never while the player watches, except in the bloom-in.

**The bloom-in.**
- When the bed appears, a plant that grew since the last visit (`garden:grown`, `from` and `to`) is drawn at its old stage.
- It unfurls when the tide's crest first reaches its step in that session: on its own first note. The whole garden has bloomed within one bar (2.86 s at 84 BPM), in the order it plays, at most five plants in the same moment (one step). From stage 2 on that note carries the octave shimmer (FR-MUS-09), so the growth is heard in the same instant it is seen. No new sound.
- What moves, over 600 ms, ease-out (the bloom-in time of §5): each new whorl grows from nothing to 2.4 cm; at stage 3 the whorls widen to 3.1 cm and turn cream while the plant's colour goes from lightness 0.63 to 0.75, one way. A plant that skipped stages (a week away) does it in one bloom.
- Luminance: the bloom asks the guard for nothing. The plant's ordinary trigger flash (0.7 to 1.0 and back) is the only swing: two changes, as on every bar. The stage-3 colour rises while the flash rises and then stays, so the plant goes up, and down to a level a little above the old one: still two.
- Safety net: a grown plant that no crest has reached 10 s after the bed was placed takes its new stage then, without waiting. That is longer than the tuning (4.0 s) plus the slowest bar (4.0 s at 60 BPM), so it only acts when no tide is running.
- Reduced motion: no unfurling. The new stage appears at once, whorls at full size and the colour changed, on the same trigger: a cut on the plant's own flash.
- `fakeDay` (`?flags=fakeDay=+1`, `+3`, `+7`) produces the same deltas at session start, so the bloom-in can be filmed and tested without waiting a day.

**Needs from the code.**
- `render/PlantRenderer` (T-161, drawing half; API_SPEC §1.8 first): the whorl mesh; `setState` also takes `lastVisitAt`, so it can ask `stageFor` for each plant's stage; the pending blooms from `garden:grown`, started in `update` when a step's light first rises; the stage-3 lightness in the instance colour.
- `garden/` (T-161, built): `applyVisit` and `stageFor` as they are. `GardenSystem` emits `garden:grown` once per session (T-128).
- `audio/`: nothing new; the octave shimmer from 3 days on is FR-MUS-09's own.
- `proto/bed`: one plant per stage in a row, so the four can be looked at.
- Tests: TC-E2E-06 with `fakeDay`, and the flash count of TC-E2E-15 during a bloom-in with a full bed.

**Inside the rules.** Hands, reach and view box are not touched: nothing here is a target, and a whorl or a blossom (at most 3.1 cm across) is narrower than the 4.5 cm between two rings. One hand and gaze only: nothing to do, it plays by itself. Flash limit and reduced motion: as above. Colour-blind users: the stage is a count (0, 1, 2), and stage 3 differs by size (3.1 against 2.4 cm) and by lightness, not by hue.

**Emulator / headset.** The emulator shows the four stages side by side, the bloom-in during the first bar after a `fakeDay` reload, the reduced-motion cut, the draw calls and the flash count. Only a headset shows whether a 2.4 cm whorl can be counted at arm's length, and whether cream blossoms stand out over a light table: at rest brightness cream is close to a white table's glass, the same weakness as §9.4.

**Rejected.** Growing the plant's width with age (0.70, 0.85, 1.00): it makes every plant of the first session, the one a judge sees, 30 % narrower and harder to tell apart, to show a change that only exists from the second day on.

**Replaces.** In §5, Motion: "replaces growth with fades" becomes "shows a grown plant's new stage at once, on its own trigger (§9.6)". In §8, Reduced motion: "growth → fades" becomes "growth → the new stage at once, on the plant's own trigger (§9.6)". The plants are opaque and cannot cross-fade without a second, transparent pass. The Shapes bullet of §5, "age adds branches/blossoms", stays true: the whorls are the branches.

### 9.7 The words on the landing page (T-128's re-read; T-167 proofreads)
**Decision.** The copy in `ui/strings.ts` is honest in tone and mostly right. Fifteen strings change, in the eleven rows below: the browser's feature names become words a visitor knows, one access label stops promising eye control, the two fallback lines for a room without table detection stop promising what may not ship or may not happen, and the privacy line names the room. Nothing breaks the English-only rule, and the only brand on the page is the device's name.

**Where the page stands today.** On `develop` at `bfe0e20` Enter opens an empty session: no bed, no seed, no sound. Every Help step, the four access checkboxes and the table and anchor lines of "This device" describe the app after T-128 (bed, seeds, save), T-148 (Listen), T-160 (the access modes) and T-162 (the saved position). That is the plan and not a fault of the copy, but the page must not reach a public address before those are in, and a mode that is cut takes its checkbox with it.

**Replacements** (key in `LANDING`, the text today, why, the new text).

| Key | Today | Why | New text |
|---|---|---|---|
| `E_XR_UNSUPPORTED` | "Roomsong needs immersive AR. Open this page in the browser of a Meta Quest 3 or 3S." | "Immersive AR" is the browser feature's name, not a word a visitor on a laptop knows | "Roomsong is played in a mixed-reality headset. Open this page in the browser of a Meta Quest 3 or 3S." |
| `features.immersiveAr` (three lines) | "Immersive AR: supported." / "Immersive AR: not supported. Roomsong needs it." / "Immersive AR: checking." | the same | "Mixed reality: supported." / "Mixed reality: not supported. Roomsong needs it." / "Mixed reality: checking." |
| `features.planeDetection.yes` | "Plane detection: on. The garden looks for your table." | the label is a developer's term | "Table detection: on. The garden looks for your table." |
| `features.planeDetection.no` | "Plane detection: not available. You place the garden yourself and the room does not tune the song." | "the room does not tune the song" promises that it otherwise does: the room signature is a Should (S1), gated on the device run, and not wired today. "You place the garden yourself" is untrue when hit-test is missing too: the bed then floats | "Table detection: not available. The garden asks you where to put it, or floats in front of you." |
| `features.planeDetection.unknown` | "Plane detection: checked when you enter. Without it you place the garden yourself." | the same two points | "Table detection: checked when you enter. Without it the garden asks you where to put it, or floats in front of you." |
| `features.anchors` (three lines) | "Anchors: on. The garden can come back to the same place." / "Anchors: not available. The garden is placed again on each visit." / "Anchors: checked when you enter. Without them the garden is placed again on each visit." | "Anchors" is a developer's term | "Saved position: on. The garden can come back to the same spot." / "Saved position: not available. The garden is placed again on each visit." / "Saved position: checked when you enter. Without it the garden is placed again on each visit." |
| `accessHeading` | "Access" | reads as signing in | "Accessibility" |
| `access.gazeDwell` | "Eyes only (gaze)" | promises eye control; the reticle follows the head (FR-HND-12), and the headset has no eye tracking | "No hands: look and hold" |
| `help[2]` | "Pinch the seed, carry it over the glowing ring and let go. Where you plant sets when it plays and how high." | "how high" can be the note or the plant | "Pinch the seed, carry it over the glowing ring and let go. Where you plant it sets when it sounds and which note it sings." |
| `help[3]` | "Hold both palms out to stop and listen. Pinch to come back." | "stop" reads as stopping the music; in one-hand mode one palm is enough | "Hold your palms out, facing away from you, to sit back and listen. Pinch to come back." |
| `privacy` | "Your garden is saved on this device only. Nothing is sent anywhere." | true, but silent on the room, which is the first worry of a visitor the headset has just asked for a room permission; and the save is this browser's | "Your garden is saved in this browser, on this device only. What the headset shares about your room and your hands stays on the device: nothing is sent anywhere." |

- Kept as they are: `title`, `tagline`, `enter`, `loading`, `loadFailed`, `deviceHeading`, both `features.handTracking` lines, `access.oneHand`, `access.highContrast`, `access.reducedMotion`, `helpHeading`, `help[0]`, `help[1]`, and the no-JavaScript line of `index.html`.
- `E_HANDS_UNAVAILABLE` is kept, with one thing unverified: the menu path "Settings, Movement tracking, Hand tracking" has never been read off a headset. T-129 reads it there.
- Missing, suggested as one more Help step before the last, once T-146 is in: "Pinch a plant and pull it up or down to make it louder or softer. Drag it to move it, or off the ring to remove it."
- When the room signature ships with its device evidence, `features.planeDetection.yes` may end "The garden looks for your table, and the room tunes the song." Not before.

**Needs from the code.**
- `ui/strings.ts` (T-128, which already has "re-read every sentence on the landing page" in its row): the texts above. No key changes name, so `ui/Landing.ts` is untouched.
- `tests/e2e/08-landing.spec.ts` and `tests/unit/ui/Landing.test.ts` quote some of these sentences word for word and follow the text.
- To fold in outside this document: USER_MANUAL uses some of the old words (T-167).

**Inside the rules.** English only, the character set of the caption table. Brands: "Meta Quest 3 or 3S" is the device's name and the only one. The page stays native controls with no image, icon or animation, so hands, reach, view box, flash limit and reduced motion do not apply to it; the access labels now say what each mode asks of the body (one hand; no hands, look and hold).

**Emulator / headset.** The emulator shows every line in every state of the page (`08-landing`). Only a headset shows the real menu path for hand tracking, whether "Table detection: on" is what a user who ran the room scan sees, and whether the privacy line matches what the headset's own permission prompt says it shares.

**Rejected.** Keeping the browser's feature names because they match the developer documentation: the page is read by a visitor, and the developer's names stay where they belong, in the keys.

**Replaces.** In §3.1: in the wireframe, "Immersive AR: supported." becomes "Mixed reality: supported.", "Plane detection:" becomes "Table detection:", "Anchors:" becomes "Saved position:", the heading "Access" becomes "Accessibility", and "Eyes only (gaze)" becomes "No hands: look and hold"; the privacy lines become the new sentence. In the bullets, the status line "Roomsong needs immersive AR. Open this page in the browser of a Meta Quest 3 or 3S." becomes "Roomsong is played in a mixed-reality headset. Open this page in the browser of a Meta Quest 3 or 3S.", and "four lines, for immersive AR, hand tracking, plane detection and anchors" becomes "four lines, for mixed reality, hand tracking, table detection and the saved position".
