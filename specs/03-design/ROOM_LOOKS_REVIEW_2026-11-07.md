# Room looks review (2026-11-07, ux-designer)

**Basis:** code and specs only. The QA room tour (`agent-acae589f617dc4080/room-tour/`) did not exist on either check today, so no image is quoted here. Re-check §2 against its stills when they land. Signatures below are worked out from `signature.ts` and the fixtures; they match the three fixtures that state an expected result (desk, kitchen, living).

## 1. What a room changes today
| Lever | Where | Range | Noticed? |
|---|---|---|---|
| Plant, seed, petal, vine hue: the arc turns | `render/palette.ts:31`, `render/config.ts:94` | ±15° on a 220° arc (47°→267°), from the **hash** | No, not one room at a time: the plants' own hues already spread over 220°, so a turned garden is still "gold to violet". Side by side, only past about 10° |
| Plant saturation | `palette.ts:32`, `config.ts:95` | 0.72 ± 0.06 (3 steps, hash) | No |
| Ring lines (ICE 190°) | `BedRenderer.ts:175-179` | 175°–205° | Side by side only. The one flat colour that shows the turn |
| Ripple afterglow | `TuningRipple.ts:169-170` | as the ring lines | Side by side only |
| Which surfaces ripple, and their captions | `RenderSystems.ts:558-560`, `strings.ts:4-7` | table / wall / ceiling, each on or off | Yes. It lights the real surfaces. Same words in every room. The ceiling sweep, 1.2–1.8 m over a seated head, is likely out of view while the head looks down at the bed (check on the headset) |
| Wall vine | `VineRenderer.ts:101`, `config.ts:290-292` | only if a wall is ≤ 1.5 m from the bed; length 0–1.2 m with the plant count (`:140`) | Yes, where it grows: 4 of the 11 rooms (tiny, desk, counter, kitchen). **Not** the main living-room fixture `table` (wall 1.75 m away) |
| Aurora halo (Listen payoff) | `HaloRenderer.ts:74,129-131`, `config.ts:227` | fixed moss/ice/violet, 0.22 m tall | Identical in every room |
| Key root (floor area) | `signature.ts:112`, `garden/config.ts:57-58` | E / D / C / A (+4…−3 semitones) | Only side by side or by trained ears |
| Mode (ceiling height) | `signature.ts:113`, `garden/config.ts:62-63` | minor < 2.6 m ≤ major < 2.9 m ≤ sus | Yes: the clearest audible lever. Most homes (2.4–2.5 m) are minor |
| Echo (room volume) | `signature.ts:115-116`, `garden/config.ts:40-49` | 0.3 / 0.6 / 0.9 / 1.2 / 1.6 / 2.0 s; same wetness everywhere (`audio/config.ts:100,129`); pre-delay 5–25 ms (`:135`) | 0.3 vs 2.0 s: yes. Neighbouring steps: hardly. Rooms of 12–18 m² all land on 0.6 s |
| Starter voices (hash) | `signature.ts:134`, `garden/config.ts:80-87` | 6 sets of 3 | Yes (shapes), first garden only (`GardenSystem.ts:281`) |
| Chord tones at the real surfaces | `RenderSystems.ts:568-570` | 3 notes, placed at the table, the wall and the ceiling | Yes, mildly (direction) |
| Settings read-out | `ui/Panel.ts:222-246,532` | "Key D minor (from room)", "Echo 0.6 s" | Only if the panel is opened |
| Tempo | `signature.ts:36` | always 84 BPM (D-021) | (nothing) |

## 2. How distinct the 11 rooms are
| Room | Key, mode, echo | Arc turn, saturation | Starters | Vine |
|---|---|---|---|---|
| none (Wanderer) | C major, 0.9 s | 0°, 0.72 | bell/pad/pluck | none |
| no-walls | **C major, 0.9 s, the Wanderer's sound** | +7°, 0.78 | bell/choir/bass | none |
| table | C minor, 0.6 s | **+15°**, 0.78 | pluck/bell/choir | none |
| tiny | E minor, 0.3 s | −7°, 0.66 | bell/pad/pluck | yes |
| sig-small-desk | E minor, 0.3 s | **+1°**, 0.72 | pluck/choir/bass | yes |
| floor, low-table | D minor, 0.6 s | −3°, 0.72 | bell/choir/bass | none |
| counter | D minor, 0.6 s | **+13°**, 0.66 | pad/pluck/bass | yes |
| sig-kitchen-counter | D major, 0.6 s | **−2°**, 0.66 | pad/pluck/bass | yes |
| large | A sus, 2.0 s | **−13°**, 0.72 | pluck/bell/choir | none |
| sig-living-table | A sus, 2.0 s | −7°, 0.78 | bell/pad/choir | none |

**Sound:** 6 distinct songs out of 11 rooms; the extremes (E minor 0.3 s against A sus 2.0 s) really are different songs. **Look:** the rooms barely differ. Because the hash sets the turn, it bears no relation to the room: the desk (+1°), the kitchen (−2°) and the floor rooms (−3°) look like the Wanderer, `table` and `counter` look alike (+15°, +13°), and the two "signature rooms" made for a contrast, desk and living, are 8° apart. A room changes the look through where the bed sits, whether a vine grows, and the ripple. The halo, the payoff, never changes.

**What the design meant:** UX §0.3 "A different room is a different song"; UX §5 "The tint is subtle … but two rooms are visibly different"; ART_PASS_T163 §4 "The two room tints are visibly different, yet the garden is still recognisably the same"; design law 4 "table = stage, walls = vines, room size = reverb"; PRD S1 "This is the differentiator"; D-060 (17) "two rooms at 0:20" in the video. The sound keeps the first promise. The look keeps none of them dependably.

## 3. Proposals (smallest first)
| # | Change | Why a judge notices | Cost, risk | Perf | Rating |
|---|---|---|---|---|---|
| 0 | No code: the video's two-room shot uses **table (+15°, C minor 0.6 s) against large (−13°, A sus 2.0 s)**, 28° apart, not desk against living (8°) | The 0:20 shot is where most judges see the hook | storyboard line | none | Parth's eye on the cut |
| 1 | `VINE_WALL_MAX_M` 1.5 → **2.0 m** (`render/config.ts:290`) | A dining or work table often stands 1.5–2 m from a wall; the real wall then answers (law 4). `table`, `floor` and `low-table` gain a vine on the wall in front | 1 constant; one vine test re-read. A thin vine (8 mm) at 2 m may read as a thread | +1 draw per view in those rooms; 0 per-frame JS | headset look 1–5 |
| 2 | **Ceiling caption names the mode:** "Ceiling: minor mood." / "Ceiling: major mood." / "Ceiling: open mood." for `rippleCeiling` (`strings.ts:7`; key chosen by `signature.mode` at `RenderSystems.ts:560`) | It says what this room did, in one session and in their own room; true, since the ceiling sets the mode (PRD §2). 3 words, inside the slot that already exists, so it never meets the onboarding hint at `room:tuned` | 2 files + 1 test; low risk | 0 | Parth reads the copy |
| 3 | **Halo takes the room's turn:** moss/ice/violet turned by `shiftDeg`, as the ring lines are (`HaloRenderer.ts:129-131` + one `room:signature` hook in `HaloSystem.ts:70`) | The Listen payoff (minute 5) is then the room's colour, not the same in every room | 2 files; set once before Listen, so no flash | 0 draws, 0 triangles, set-up only | visual 1–5 |
| 4 ★ | **The turn follows room size, not the hash:** decay step 0–5 → −15, −9, −3, +3, +9, +15° (small rooms warm toward gold, halls cool toward ice and violet); saturation stays hashed; Wanderer 0°. Stays on 32°–282°: no pinks or reds (D-060). Route: `setPalette` takes the decay too (`palette.ts` + 6 call sites in `RenderSystems.ts`, API_SPEC §1.8 first), or `signature.ts` sets `paletteSeed % 31` from the step (1 file, but it ties the hash to `palette.ts`) | Every two rooms of different size now differ by 6–30°, the desk and the living room by 30°, and the difference has a meaning the video can say ("small room, warm; big room, cool"). Plants, seeds, vine, ring lines, afterglow (and the halo with #3) all follow | 2–8 files plus seeds pinned in the signature and palette tests and the LLD §5.8 examples; medium test churn, low run-time risk. Rooms of one size now share a tint (accepted: legibility over variety) | 0 (set-up only) | the ART_PASS §4 tint board, Parth 1–5 |

**★ #4:** it is the only proposal that makes the look follow the room, and Parth asked how the rooms look. Ship #2 with it: #2 is the cheapest way for a judge in one room to hear the hook. Drop #1 if the headset shows a thread. Not proposed: an echo send that grows with room size (it reverses D-021 and needs a listening pass), and moving the ceiling sweep into view (too large for the 12 Nov freeze).
