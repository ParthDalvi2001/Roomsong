# Architecture map — where things live (detail: `specs/03-design/LLD.md` §1; contracts: `specs/04-development/API_SPEC.md`)

| Path | What | Owner |
|---|---|---|
| `src/index.ts` | IWSDK entry: `World.create`, register systems | software-architect |
| `src/core/` | event bus, clock, settings, flags, strings, log, pool | software-architect |
| `src/room/` | placement chain L1–L4, plane/mesh/hit-test adapters, anchors, room features | fullstack-dev |
| `src/hands/` | hand sampling, 1€ filter, poses, gesture machine, target picker | frontend-dev |
| `src/garden/` | pure model and rules, snap, growth, seeds, room signature | backend-dev |
| `src/audio/` | engine, scheduler, voices, voice pool, spatializer, reverb, theory | backend-dev |
| `src/persistence/` | IndexedDB store, schema, migrations | backend-dev |
| `src/render/` | bed, instanced plants, tide, tuning ripple, halo, particles, perf HUD | frontend-dev |
| `src/ui/` | landing page, captions, hints, settings panel, FoV guard | frontend-dev |
| `src/access/` · `src/onboarding/` | gaze dwell, one-hand, contrast, motion, beat ring · first-five-minutes flow | fullstack-dev |
| `tests/unit/` · `tests/e2e/` · `tests/fixtures/` | Vitest (mirrors `src/`) · Playwright + IWER · rooms, hand paths, saved states | qa-engineer |
| `proto/` | throwaway prototypes: `sound/` (T-102), `spike/` (T-104), `pinch/` (T-105) | per task |
| `iwsdk.config.json` · `vite.config.ts` · `public/` | XR features and scene · build · static assets | devops-engineer |
| `specs/` | every document (map: `specs/README.md`); status in `specs/08-status/` | main session |
| `.claude/` | role agents, skills (autopilot, audits, `iwsdk-*`), IWSDK path rules | main session |

Rules of the road: `core` is the base and depends on nothing; `garden` is pure (no DOM, no three.js); modules import each other only through `index.ts` and talk through the event bus; no allocations in per-frame paths.
