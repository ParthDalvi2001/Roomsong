# ADR-003 — Local-only persistence, no backend

**Status:** Accepted · **Date:** 2026-10-09

## Context
"Reason to come back" needs persistence. A backend would add accounts, privacy policy obligations, hosting cost, and a failure point during judging.

## Decision
Persist everything in the browser (IndexedDB, localStorage fallback), keyed to the origin, with the WebXR persistent anchor handle stored alongside. No network after load.

## Consequences
+ Simplest possible privacy story; no outage risk; works offline.
− A judge who clears site data or uses another headset starts fresh (acceptable; first-run is the designed path).
− Multiplayer/shared gardens deferred to post-competition (PRD Won't-have).
