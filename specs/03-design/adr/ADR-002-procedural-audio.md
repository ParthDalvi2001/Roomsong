# ADR-002 — Procedural (synthesized) audio, no samples

**Status:** Accepted · **Date:** 2026-10-09

## Context
Music is the core of the product. Sample libraries bring licensing risk (contest rule: originality, proof of license on request) and download weight (≤4 MB budget). Judges also reward "entrant-built" cores.

## Decision
All sound is synthesized at runtime with the Web Audio API: six voice synthesizers, procedural reverb impulse responses, UI sounds derived from the current scale. No audio files ship.

## Consequences
+ Zero licensing exposure, tiny bundle, infinite timbre variation from hue/height.
+ Deterministic, testable (unit tests on parameter mapping; offline rendering tests on envelopes).
− Requires careful mixing and limiting to sound good; weekly human listening review is mandatory.
− Voice CPU budget (≤24 voices, ≤15% CPU) enforced via pooling and stealing.
