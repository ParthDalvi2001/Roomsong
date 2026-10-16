# Art pass plan: T-163 (design half)

Owner: ux-designer, 2026-10-16. Builder: frontend-dev. It covers the art items in the T-163 row of SPRINT_PLAN, the T-119 and T-127 notes, and a critique of the emulator pictures in `.tmp/` (`t119-*`, `t147-*`, `settings-*`). It only plans the work: nothing here is built yet. Spec text that changes is listed in §5 and is folded in when each item is built.

Baseline, read from the perf display in the `t147-*` shots (one view, 13 plants): 9 draws, about 6.9k triangles. Worst case per eye from UX §9.5 and §9.6: 6 plant draws, 25.3k triangles. Budgets: 60 draws, 150k triangles, no post-processing pass, flash cap of 3 changes per second per element.

## 0. Decision for Parth first: the plants' colours

**What is built differs from UX §5.** UX §5 asks for one bioluminescent palette (moss #7DD181, gold #F4D35E, violet #9B5DE5, ice #48CAE4, cream #FFF8E7), tinted per room by `paletteSeed`. What is built is different. A plant's hue is a step of the golden ratio round the *whole* colour wheel (`HUE_STEP` 0.618, `setHSL(hue, 0.72, 0.63)`), so pinks and reds appear (`t119-five-shapes.png`, `t119-growth-stages.png`). Nothing in `src/render` reads `paletteSeed`. The captions "Table: colour." and "Walls: colour." (FR-ROOM-12, `strings.ts`) therefore promise a change the screen never shows, which breaks the honesty rule (CLAUDE.md §4.11).

| Option | Hue on screen | Room tint | Cost | Verdict |
|---|---|---|---|---|
| **A: arc (recommended)** | `47° + hue × 220°`: the arc gold (47°) → moss (123°) → ice (190°) → violet (267°), the hues of UX §5. No pinks or reds. S 0.72, L 0.63 as now | Shifts the whole arc by `((paletteSeed % 61) − 30)°` (±30°). Saturation `0.72 + 0.06 × (((paletteSeed >>> 9) % 3) − 1)`. Wanderer (seed 0) gets no shift | 0 draws, 0 triangles: one change where the colour is set | Matches UX §5. Two rooms look different side by side, and the garden stays recognisable |
| B: keep the wheel | As built | LLD §5.8 rotates by `(h % 360)°` | 0 | Rotating a full wheel of golden-ratio hues gives every room the same rainbow, so "two rooms visibly different" fails, and so do the captions |
| C: snap to the five named colours | 4 or 5 flat colours | ±30° as in A | 0 | Rejected. Cream is already the tide, the blossoms and the high-contrast outline. Four colours for 80 plants is too few |

- Sound is not affected in any option. `plant.hue` (0..1) still sets brightness and detune (FR-MUS-05). Only the mapping from hue to on-screen colour changes, and only in render.
- The named hexes become the arc's anchor *hues*. Saturation and lightness stay at 0.72 / 0.63, so moss draws greener than #7DD181 (whose S is 0.48).
- **What else the room tints:** the five ring lines (ICE #48CAE4, 190°) shift by the same angle. In a first session the bed has no plants when "Table: colour." shows, so the lines are the only thing that can make that caption true. Cream (tide, markers, blossoms, ladder, high-contrast outline) and the charcoal bed do not change.
- **Flash cap:** a colour change bypasses FlashGuard (the T-119 blossom lesson). So the tint is applied before a plant is first drawn. A plant already on screen when `room:signature` arrives takes the tint at its next counted rise (its note), the same rule as a blossom's colours. Ring lines change once, never eased.

## 1. Critique of today's pictures (ranked, worst first)

| # | Picture | Does not read | Fix (§2) |
|---|---|---|---|
| 1 | `t119-five-shapes`, all | Off-palette pinks; no room tint, while the captions say there is one | 2.1 |
| 2 | `t119-five-shapes`, `t119-tint` | The plants look like matte plastic, not glowing glass. The head is not the light source. Short plants are darker than tall ones, because the shade ramps over the whole plant height (`vUp`) rather than stem against head | 2.2 |
| 3 | `t119-growth-a-week-later` | Stage-3 blossoms read as cream four-point stars (thorns or shuriken). They outshine the heads (on a pluck, a 3.1 cm blossom against a 1.2 cm bead). The two whorls are stacked in the same orientation | 2.4, 2.5 |
| 4 | `t119-growth-stages` | Stage 1–2 whorls in the plant's own colour almost vanish (pink on a pink stem). Being flat plates low on the stem, they are also shaded at about 0.65 | 2.2, 2.6 |
| 5 | `t119-high-contrast` | The cream "outline" is blotches on the heads' undersides and whole white pluck stems: it follows the surface angle, not the silhouette (FR-UI-05, D-044) | 2.8 |
| 6 | all | A still life between flashes. No idle sway (`PlantRenderer.ts` ~188) | 2.7 |
| 7 | `t119-five-shapes` | The choir's crown is open (an 8 mm hole from above). On short stems the jug's bulb and every foot shade as if the stem were 10 cm tall: the stem rows' normals ignore the stretch | 2.3, 2.9 |
| 8 | `t119-hover-glow` | Ice-hued plants merge with the ice ring lines (the front pluck). The hover's +20 % glow is weak, but the cell marker carries the cue | Rate only (§3) |
| 9 | (T-127, no picture) | At 10 cm the supply orb hides the far inner cells | 2.10, headset |

**Reads well, keep:** the five outlines at 44° down (lantern, cup, pin, jug, umbrella); the tide and its shade on the dark and white tables (`t119-tide-*`); the pull ladder's rings; the dimmed rim warning; the cream marker cue; low cost (9 draws).

## 2. Changes

All files are under `src/render/`. "0" means no extra draws, triangles or fill.

| # | What | File / constant | Now | Proposed | Why | Cost |
|---|---|---|---|---|---|---|
| 2.1 | Palette arc and room tint (after Parth picks A) | `config.ts` new `PALETTE_ARC_START_DEG` 47, `PALETTE_ARC_SPAN_DEG` 220, `PALETTE_SHIFT_MAX_DEG` 30, `PALETTE_SAT_STEP` 0.06. `PlantRenderer` `setHSL` (l. ~403, 405). `BedRenderer` `uLine`. `BedRenderSystem` passes `room:signature` | `setHSL(hue, 0.72, 0.63)`, whole wheel; lines ICE | §0 option A | UX §5, honest captions | 0 |
| 2.2 | Glow balance: the head is the light | `PlantRenderer` VERTEX `vUp`; `config.ts` new `PLANT_STEM_GLOW` | `vUp` = height share of stem + tallest head (head 0.68–1.0 by plant height) | `vUp = mix(position.y × PLANT_STEM_GLOW, 1.0, aHead)`, `PLANT_STEM_GLOW` 0.65. Shade is then 0.45 at the foot, 0.81 at the stem top and 1.0 on every head and whorl. Delete `TALLEST_HEAD_M` | Every head equally bright whatever its height. The heads read as lamps on glass stems. Whorls (head rows) brighten too | 0 |
| 2.3 | Stem normals follow the stretch (the jug on a short stem, every foot) | `PlantRenderer` VERTEX, 2 lines | Normals of the 10 cm reference lathe | `n = vec3(normal.x, normal.y × mix(PLANT_REFERENCE_STEM_M / stem, 1.0, aHead), normal.z)`, then turn `n` as now (the fragment already normalises) | The rim glow sits on the true edge. Needed before 2.8 | 0 |
| 2.4 | Upper whorl turned 45° | `PlantRenderer.placeWhorls`, k = 1 | Both whorls aligned | Rotate the upper whorl's x and z columns by π/4 about y | From above the two whorls make one 8-leaf rosette, not a stacked star | 0 |
| 2.5 | Rounded leaves, not points | `WHORL.segments` | 8 (four points; a 0.6 lobe gives notches at 0.4) | 16, lobe depth 0.6 kept (tips 1.0, shoulders 0.82, notches 0.4) | Leaves and petals, not thorns | +32 triangles per whorl. Worst case 160 whorls: +5,120 per eye (10,240 in all) |
| 2.6 | Whorls in the plant's own colour, made visible | `PlantRenderer.paint` whorl branch | `tint` (L 0.63, same as the stem) | `pale` (same hue, L 0.75, `PLANT_BLOSSOM_LIGHTNESS`; already computed per slot). Stage 3 stays cream | Lighter than the stem, and foreshadows the stage-3 colour. No new constant | 0 |
| 2.7 | Idle sway | `PlantRenderer` VERTEX + one uniform `uSway` (phase, radians); `config.ts` new `PLANT_SWAY_HZ` 0.2, `PLANT_SWAY_LEAN` 0.06, `PLANT_SWAY_WAVE_M` 0.6 | None | Shear about the foot along bed x: `x += lean × h × sin(uSway − 2π × dot(foot.xz, (1,1)/√2) / WAVE)`. Here h is the vertex height above the foot in metres, so 0.4 cm at the head of a 3 cm stem, 0.8 cm on a new plant, 1.1 cm on the tallest. `uSway = 2π × ((time_ms × 0.2 / 1000) % 1)` keeps precision. Reduced motion: lean 0.03. Normals not swayed | A living garden. The foot never moves, so targets, a held plant's foot and drags stay exact. Neighbours 4.5 cm apart differ by about 27° of phase, so their heads close in by 0.5 cm at most | 0 (one uniform write per frame) |
| 2.8 | High-contrast outline follows the silhouette | `PlantRenderer`: a second `InstancedMesh` per silhouette, sharing geometry, `instanceMatrix` and `count`, visible only when `uOutline` is 1. Back faces only, pushed out along the corrected normal; `config.ts` new `PLANT_OUTLINE_M` 0.0015 | Cream where `rim` is 0.55–0.75 (`PLANT_OUTLINE_FROM/FULL`) | A cream shell 1.5 mm (about 3.6 px at 0.6 m), constant, no guard element. Delete the `edge` term and both `OUTLINE_FROM/FULL` constants. Whorls get no shell | FR-UI-05: one line round each plant, no blotches, stems keep their colour | High contrast only: +5 draws per eye (+10 in all), plant triangles ×2 (worst 80 choirs: +20,160 per eye). Fill: a thin band only |
| 2.9 | Close the choir's crown | `SHAPES` choir row 4 | `[0.004, 0.010, 1]` | `[0, 0.010, 1]` | No hole from above. Same vertex count, 252 triangles | 0 |
| 2.10 | Supply orb's place | `SUPPLY_ORB_LIFT_M`, `SUPPLY_ORB_RADIUS_M` | 0.10 m, 0.03 m | Decided on the headset; see below | — | 0 |
| 2.11 | Bell lip, *only if* the bell rates < 4 | `SHAPES` bell row 7 | `[0.017, 0.026, 1]` | `[0.019, 0.024, 1]` (3.8 cm across, < 4.5) | A lantern cap, not a blob | 0 |

**Supply orb, computed** (eye 0.43 m over the bed, 0.45 m behind its centre, UX §2; the orb's edge is the ring radius plus a 1.25 cm seed). How much of the bed it hides, beyond the centre on the far side:

| Option | Lift / ring | Hidden band | Inner rings | Side effect |
|---|---|---|---|---|
| A (now) | 10 / 3 cm | 8–19 cm | ring 0 (12) and ring 1 (16.5) at steps 11–13 hidden | none |
| B | 5 / 3 cm | 1–11 cm | clears ring 0's marker (10.75) by about 0 cm | seeds 3.75 cm over the Listen orb's glow |
| C | 5 / 2.5 cm | 1–10 cm | clears by 0.6 cm; up to 5 seeds still fit (2.5 cm each) | as B |

Try A and C on the headset; until then nothing is built.

## 3. What to judge, and where

**Parth now, from emulator pictures (1–5 each; the row passes at ≥ 4, Parth and Chinmay):**
1. Palette A or B (§0). Decide from this text and `t119-five-shapes.png`; the builder then shoots the arc and three room tints (Wanderer, `0x0fe2778b`, `0xccfb3565`, from LLD §5.8) side by side.
2. Baseline ratings of today's boards, so the result can be compared: five shapes, growth stages, a week later, high contrast, the tide on both tables.
3. After the build: `t163-five-shapes` (2.2, 2.3, 2.9), `t163-growth` (2.4–2.6), `t163-high-contrast` (2.8), a 10 s sway clip at normal and reduced motion (2.7), in colour and in grey.
4. Open: the ice ring lines against ice-hued plants (keep, or line alpha 0.5 → 0.35); and the bed glass at 40 % against 65 % (UX §9.4).

**Headset only, in passthrough, on a light table (white or oak) and a dark one (walnut):**
- Do the heads read as glowing under room light at rest (0.7)? Is the flash (1.0) seen from the far ring?
- On a light table: do gold plants and cream blossoms separate from the table and the cream tide?
- The two room tints are visibly different, yet the garden is still recognisably the same.
- Sway: alive, not uneasy. With a full bed in view the whole garden moves; check for any sense of self-motion.
- The 1.5 mm outline: legible, and no shimmer on the moving edges (shimmer would read as flicker).
- The whorls can be counted at arm's length (UX §9.6).
- Supply orb A against C.

## 4. Build order (cheapest and most visible first)

| Step | Items | Hours | Gate |
|---|---|---|---|
| 1 | 2.2 glow balance, 2.3 normals | 1.0 | `npm run verify`; the five-shapes board |
| 2 | 2.9 crown, 2.4 turn, 2.6 pale whorls, 2.5 16 segments | 1.25 | The §9.5 outline test re-run; the growth board |
| 3 | 2.1 palette arc and tint (after §0; API_SPEC §1.8 first: `setPalette(seed)` on the plant and bed renderers) | 2.5 | One unit test: seed 0 → no shift, shift within ±30°; the tint board; the flash count (TC-E2E-15) |
| 4 | 2.7 sway | 1.5 | No allocation in `update`; reduced-motion lean; `xr-perf-budget` |
| 5 | 2.8 high-contrast shell | 2.0 | Draws in high contrast; `hands-first-audit` unchanged |
| 6 | Re-shoot the boards, `impeccable` critique, Parth's ratings | 1.0 | ≥ 4/5 |
| 7 | 2.11 bell (only if rated < 4); 2.10 orb (after the headset) | 0.5 | — |
| | **Total** | **≈ 9.75 h** | |

## 5. Spec contradictions, and the text that changes

Four contradictions with the specs:
1. UX §5's palette against the full colour wheel that is built.
2. UX §5 asks for a "subtle" tint, but LLD §5.8 rotates the hue by `(h % 360)°`.
3. UX §5's sway of 1–2 cm, which does not fit the stems.
4. The captions promise a colour change that the renderer does not draw.

Fold in when built:

| Where | Now | Becomes |
|---|---|---|
| UX §5 Palette | Five named colours, tint by `seed % 360` | The arc 47°→267° (gold, moss, ice, violet) at S 0.72 L 0.63. The room shifts it ±30° and nudges S by ±0.06. Ring lines shift too |
| LLD §5.8 (l. 655) | Hue rotation `(h % 360)°` | `((h % 61) − 30)°`; saturation step 0.06 |
| UX §5 Motion | "idle sway 0.2 Hz, 1–2 cm" | "idle sway 0.2 Hz, a 3.4° lean about the foot (0.4–1.1 cm at the head)". 2 cm on a 3 cm stem is a 34° lean, and two heads 4.4 cm wide on rings 4.5 cm apart would touch |
| FR-ROOM-12 captions, `strings.ts` | "Table: colour.", "Walls: colour." with no colour drawn | True once 2.1 is built. If 2.1 is cut, the captions must change |
| UX §9.5 choir table | `[0.004, 0.010, 1]` | `[0, 0.010, 1]` |
| UX §9.6 whorl | "8 segments, 32 triangles", "in the plant's colour" | 16 segments, 64 triangles; the plant's hue at L 0.75 |
| UX §8 / D-044 | High-contrast outline as built: the surface angle | A 1.5 mm cream shell round the silhouette |
