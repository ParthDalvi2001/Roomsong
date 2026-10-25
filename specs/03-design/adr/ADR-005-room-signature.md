# ADR-005 — Room signature: the room's geometry decides the garden's reverb decay, key root and mode

**Status:** Accepted · **Date:** 2026-10-10 · **Decision:** D-010 (REPLAN_2026-10-10 §4) · **Priority:** Should (S1), gated · **Amended:** 2026-10-10 (D-021, D-025)

## Context
Prior art is close ("garden that sings": Eno's *Bloom*, *Blooming Conductor*, 2025 winners, 2026 "daily garden" repos). The re-plan needs one hook that is ours and that only an MR headset can deliver: the **room itself** tunes the instrument. We also have no headset on the team (REPLAN §1), so whatever we add must not put the Must path at risk and must be testable without a device. Plane detection and plane labels on Quest are not yet verified by us (capability spike T-104 pending; see HLD §10).

## Decision
*Superseded by the Amendment of 2026-10-10 at the end: the bucket mapping in point 1, the Wanderer values in point 2, the chord degrees in point 4, the first Gate criterion, and the two Consequences lines marked below. Until the amendment the title read "…decides the garden's key, mode, tempo and reverb". Everything else stands.*
1. Add a **pure, deterministic, quantised** function `roomSignature(features: RoomFeatures): RoomSignature` in `garden/signature.ts` (API_SPEC §1.1; algorithm LLD §5.8). Inputs are bucketed (table height → key root; floor area → mode and reverb size; wall count → tempo 72/84/96; table area, ceiling height, largest wall width → hash only); a 32-bit FNV-1a hash of the bucket tuple selects the three starter voices and the palette seed. No floats enter the hash, so the same room always gives the same song and small detection noise (±5 cm, ±0.3 m²) cannot change it away from a bucket boundary.
2. `room/RoomFeatures.ts` derives the features from the planes/meshes the PlacementSolver already queried (no extra XR feature requests); unknown fields default; placement level ≥ 3 (or `?flags=forceSignature=wanderer`) yields the fixed **Wanderer** signature (C major pentatonic, 84 BPM, medium reverb, Bell/Pad/Pluck, seed 0).
3. The signature is **recomputed every session and never persisted** (FR-ROOM-13): plants keep their cells, pitches follow the room. The "two rooms, two songs" effect falls out of this with no comparison logic.
4. The payoff is the **tuning ripple** (`render/TuningRipple.ts`, FR-ROOM-12): table → nearest wall → ceiling each ring one chord tone (degrees 0, 2, 4) within 4 s of placement, scheduled on the audio clock.
5. Weekly **seasons are removed** (D-011); the room decides the mode. The palette is one fixed bioluminescent set tinted by `paletteSeed`.

### Gate
The feature ships only if the device spike (T-104 / TC-DEV-0A; T-129 P1, M1) on the team's headset shows, in the Meta Quest Browser `immersive-ar` session, the inputs v1 needs: **a floor area** (a floor plane, or at least two wall planes that are not parallel) **or mesh bounds**, which give the key root and the decay, and **a ceiling plane**, which gives the mode. A table or a wall plane alone is not enough in v1: it moves only the starter seeds and the tint, and the sound is the Wanderer's. Partial evidence ships partially, and the Devpost copy claims only what the spike confirmed (floor area or mesh: key and echo; ceiling: scale). If the spike fails, or no headset exists by the Emergency-mode date (REPLAN §6), the app ships **Wanderer-only**: the pure function, its unit tests (TC-SIG-01..04) and the bed-only ripple stay in the codebase for later; no room-derived music is claimed in the Devpost copy (REPLAN §9). *(As first written, the Gate passed on "at least a table/desk or wall plane"; superseded 2026-10-10.)*

## Consequences
+ A differentiator that is testable on the desktop (pure function, deterministic fixtures) and demoable in the emulator (IWER synthetic planes), so it is not blocked on hardware.
+ Zero new runtime permissions or XR features beyond those already requested (FR-SYS-02).
+ The Must path is untouched: at every placement level the garden plays, in Wanderer at L3/L4.
− One more pipeline step before the first note (features → signature → `setSignature`), bounded at 3 s by FR-ROOM-10 and run in parallel with placement.
− Users who take the garden to a different room hear a different key, scale or echo; accepted (it is the point) and documented in the manual. Boundary flapping in the same room is mitigated by wide buckets; hysteresis is deferred until observed on device. *(v1.1 wording, superseded: "Users who move their table between sessions may hear a different key".)*
− The reverb from the room can be overridden by the user in Settings (auto / small / off); the override is per garden and wins over the signature. The tempo is the user's alone in v1. *(v1.1 wording, superseded: "Tempo/reverb from the room can be overridden".)*

## Amendment 2026-10-10 (D-021, D-025)
Plan v2.1 applied the product discovery research (PLAN_AMENDMENT_2026-10-10 §3 and §6.3). The decision itself stands: a pure, quantised `roomSignature()`, the Wanderer fallback, recomputation every session, the tuning ripple. What the function maps is narrowed. Where this section and the text above differ, this section wins. Algorithm, constants and three worked rooms: LLD §5.8. Types: API_SPEC §1.1 (v1.2).

### What v1 maps
| Output | From | Rule |
|---|---|---|
| Reverb decay `reverbRt60` | room volume (floor area × ceiling height, else the global-mesh bounds) | Sabine with a fixed absorption area: RT60 = 0.161 · V / A, A = 10 m², quantised to 0.3 / 0.6 / 0.9 / 1.2 / 1.6 / 2.0 s (clamp 0.3–2.0, FR-ROOM-06). A is tuned for an audible musical range; it does not predict the real room |
| Key root | floor area | a bigger room has a lower root: < 8 m² E · 8–17 D · 17–34 C · ≥ 34 A |
| Mode | ceiling height | < 2.60 m minorPent · 2.60–2.90 majorPent · ≥ 2.90 susPent |
| Room chord | mode | major triad / minor triad / sus4 (`chordDegrees(mode)`), replacing the fixed degrees 0, 2, 4 |
| Tempo | nothing | the constant 84 BPM; the field stays in the type |
| Starter voices, palette seed | a hash of every bucket | table height, table area, wall count and largest wall width feed only this hash |

`reverbSize` stays as a three-way label derived from `reverbRt60`, for the Settings UI. One shared reverb replaces the three sizes. Wanderer = C majorPent, 84 BPM, `reverbRt60` 0.9 s (medium), Bell/Pad/Pluck, seed 0.
The modes are three anhemitonic pentatonic sets (D-025): `majorPent [0,2,4,7,9]`, `minorPent [0,3,5,7,10]`, `susPent [0,2,5,7,10]`. `dorianHex` and `lydianHex` are *Cut (D-025)*: their first five degrees contain a semitone, so two plants on adjacent rings could clash.

### What is validate-first, and why
- **Table height → key or register, and anything → tempo** (the v1.1 rules `tableHeight → keyRoot` and `wallCount → tempo`). The research found no evidence that a listener hears either as caused by the room (§8, row "Table height → register; room volume → tempo"; note 06, KQ6). A mapping nobody hears as causal reads as a random preset, and that is the main risk to the Innovation score. They are tested before they are built: stranger test H13 (UAT-17: in two rooms, at least 3 of 5 listeners attribute the change to the room). Until then they move nothing audible. Table height stays a hash input, so turning the rule on later needs no new feature.
- **Reverb decay and key root are kept** because they have a basis: reverberation time is the main cue a listener uses for room size, and "bigger is lower" is the pitch polarity listeners expect (research §3, row "Room → music mapping").
- **The mode rule has no such basis.** It is in v1 because the plan asks for the mode to vary with the room, and ceiling height is the one feature left that is independent of floor area and not on the hash-only list. It is the first rule to become a constant if H13 shows it confuses.
- **Device facts are still unverified.** Whether the Quest Browser gives a floor plane, a ceiling plane or mesh bounds in a judge's room is unknown until T-104 and T-129 (P1, M1). Without a floor area or a volume, key root and decay stay at their defaults, and only the mode, the seeds and the tint can differ.

### Consequences
+ Three mappings, each explainable in one sentence and demonstrable in two rooms.
+ One reverb driven by one number costs less than three convolvers (NFR-PERF-10).
+ No semitone clash is possible in any mode.
+ The tempo belongs to the listener (Settings, 60–120 BPM): a new room never speeds the song up or slows it down.
− Two rooms of similar size and ceiling height now sound alike apart from seeds and tint. v1.1 would also have changed the key with the table and the tempo with the walls.
− The decay is a musical value, not a measurement. The copy may say "the size of your room sets the echo"; it must not say we measure the room's reverberation.
− The tuning-ripple captions cannot credit the table or a wall with the key or the echo: "Your table set the key" is false in v1. The true captions are in LLD §5.8 (table: the seeds of a new garden, the colour in every other session; walls: the colour; ceiling: the scale).
− The key root needs a measured floor area, and the decay needs that or the mesh bounds: one more thing the device spike has to confirm before the Devpost text claims it.
− Build order changes: after the core payoff is green, with go/no-go at G2 and "build it, with the Wanderer fallback" as the default (SPRINT_PLAN v2.1). The Gate above still decides what is claimed.

### Review round 2026-10-10 (two independent reviews of this amendment)
The table above is as corrected by the review. What changed, and why:
- **Reverb formula: a fixed absorption area.** The first form of this amendment used RT60 = 0.161 · V / (α · S) with α = 0.10. The review computed that it used only the middle of the clamp: more than nine ordinary rooms in ten landed on 0.9 or 1.2 s, a bedroom and a living room got the same decay, and 0.3 s and 2.0 s could not be reached in a home. That is a property of Sabine with any single α (the decay then grows only with the room's linear size), not of the value 0.10. Decision: keep Sabine and make the absorption area itself the named constant, A = 10 m², so the decay is proportional to the volume and homes use the whole 0.3–2.0 s. Rejected: keeping α · S and only correcting the text (the main cue for room size would barely vary between homes), and re-spacing the steps on the old formula 0.15 s apart (it uses the range but leaves margins of 0.06 s). Cost accepted: five decay boundaries now lie inside the range of homes, so about 17 % of ordinary rooms are within the worst-case test tolerance of one (7.5 % before); a flip is one step and leaves key and mode alone. This is the architect's call inside what sheet 6.3 fixes (Sabine, a named absorption constant, quantised, clamped 0.3–2.0). It is reversible by one constant and one line, and it is listed for Parth to confirm.
- **Features that do not depend on the user's heading.** Floor area and mesh volume fall back to the footprint rectangle (the minimum-area bounding rectangle), not to an axis-aligned box, which changed the key with the way the user faced at session start.
- **Anchors keep the signature.** The placement level is saved with the anchor handle; without it every returning session would have been Wanderer. For the same reason point 2 of the Decision changes in one detail: `room/RoomFeatures.ts` reads the planes and meshes itself instead of reusing what the PlacementSolver queried, because a bed restored from an anchor never runs the solver. There are still no extra XR feature requests.
- **Captions.** Three short captions, each on screen for at least 1.2 s: "Table: seeds." only in the session that issues the starter seeds and "Table: a note." otherwise, "Walls: a note.", "Ceiling: mood.".
- **Device fact, from Meta's documentation, still to be confirmed on our headset.** The Quest Browser's planes are the surfaces the user defined in the headset's room setup (https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/). We infer that the same room gives the same inputs in every session until the user redoes the setup, which is why v1 has no hysteresis; T-129 checks it.
- **Title, Gate and two Consequences lines** of the original text corrected in place, with the old wording kept in a note.
