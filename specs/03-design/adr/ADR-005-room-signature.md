# ADR-005 — Room signature: the room's geometry decides the garden's key, mode, tempo and reverb

**Status:** Accepted · **Date:** 2026-10-10 · **Decision:** D-010 (REPLAN_2026-10-10 §4) · **Priority:** Should (S1), gated

## Context
Prior art is close ("garden that sings": Eno's *Bloom*, *Blooming Conductor*, 2025 winners, 2026 "daily garden" repos). The re-plan needs one hook that is ours and that only an MR headset can deliver: the **room itself** tunes the instrument. We also have no headset on the team (REPLAN §1), so whatever we add must not put the Must path at risk and must be testable without a device. Plane detection and plane labels on Quest are not yet verified by us (capability spike T-104 pending; see HLD §10).

## Decision
1. Add a **pure, deterministic, quantised** function `roomSignature(features: RoomFeatures): RoomSignature` in `garden/signature.ts` (API_SPEC §1.1; algorithm LLD §5.8). Inputs are bucketed (table height → key root; floor area → mode and reverb size; wall count → tempo 72/84/96; table area, ceiling height, largest wall width → hash only); a 32-bit FNV-1a hash of the bucket tuple selects the three starter voices and the palette seed. No floats enter the hash, so the same room always gives the same song and small detection noise (±5 cm, ±0.3 m²) cannot change it away from a bucket boundary.
2. `room/RoomFeatures.ts` derives the features from the planes/meshes the PlacementSolver already queried (no extra XR feature requests); unknown fields default; placement level ≥ 3 (or `?flags=forceSignature=wanderer`) yields the fixed **Wanderer** signature (C major pentatonic, 84 BPM, medium reverb, Bell/Pad/Pluck, seed 0).
3. The signature is **recomputed every session and never persisted** (FR-ROOM-13): plants keep their cells, pitches follow the room. The "two rooms, two songs" effect falls out of this with no comparison logic.
4. The payoff is the **tuning ripple** (`render/TuningRipple.ts`, FR-ROOM-12): table → nearest wall → ceiling each ring one chord tone (degrees 0, 2, 4) within 4 s of placement, scheduled on the audio clock.
5. Weekly **seasons are removed** (D-011); the room decides the mode. The palette is one fixed bioluminescent set tinted by `paletteSeed`.

### Gate
The feature ships only if the device spike (T-104 / TC-DEV-0A) on the team's headset shows **plane detection with usable extents, or plane labels** (at least a table/desk or wall plane) available in the Meta Quest Browser `immersive-ar` session. If the spike fails, or no headset exists by the Emergency-mode date (REPLAN §6), the app ships **Wanderer-only**: the pure function, its unit tests (TC-SIG-01..04) and the bed-only ripple stay in the codebase for later; no room-derived music is claimed in the Devpost copy (REPLAN §9).

## Consequences
+ A differentiator that is testable on the desktop (pure function, deterministic fixtures) and demoable in the emulator (IWER synthetic planes), so it is not blocked on hardware.
+ Zero new runtime permissions or XR features beyond those already requested (FR-SYS-02).
+ The Must path is untouched: at every placement level the garden plays, in Wanderer at L3/L4.
− One more pipeline step before the first note (features → signature → `setSignature`), bounded at 3 s by FR-ROOM-10 and run in parallel with placement.
− Users who move their table between sessions may hear a different key; accepted (it is the point) and documented in the manual. Boundary flapping on the same table is mitigated by wide buckets; hysteresis is deferred until observed on device.
− Tempo/reverb from the room can be overridden by the user in Settings; the override is per garden and wins over the signature.
