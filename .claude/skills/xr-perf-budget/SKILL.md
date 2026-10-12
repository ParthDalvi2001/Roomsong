---
name: xr-perf-budget
description: Check a Roomsong rendering or audio change against the Quest performance budgets (72 fps target, 60 floor, draw calls, triangles, JS ms, allocations, voices, bundle size) before the task is closed. Use after any change in src/render, src/audio, shaders, particles, instancing, or anything touching the frame loop or scheduler.
---

# XR performance budget check

Budgets come from `specs/03-design/HLD.md` §7. Fill the table with **measured** numbers (emulator via `perf:sample` / `renderer.info`; device via `?flags=perfHud`, OVR Metrics or `metavr` perf tooling). "Looks fine" is not a number.

## 1. Measure
- Emulator: run with `?flags=perfHud,autoplant=80` and enter Listen mode; read `perf:sample` (draws, tris, jsMs, voices). For heap: CDP `Performance.getMetrics` before/after a 5-min soak (`TC-E2E-10`).
- Device (if a human is available): perf HUD min/typical fps over 2 minutes in the same scenario.

## 2. Table
| Metric | Budget | Before | After | ✅/❌ |
|---|---|---|---|---|
| fps (device) | ≥72 typical, ≥60 min | | | |
| Draw calls | ≤60 | | | |
| Triangles | ≤150k | | | |
| JS ms/frame | ≤6 | | | |
| Per-frame allocations in hot paths | 0 (inspect code; CDP allocation sampling if unsure) | | | |
| Active voices / audio CPU | ≤24 / ≤15% | | | |
| Heap delta over 5-min soak | ≤5% | | | |
| Bundle (gz) | ≤4 MB | | | |
| Full-screen post-processing passes | 0 | | | |
| Fixed foveation | level 2 set when available | | | |

## 3. Code checks (tick)
- [ ] InstancedMesh for repeated geometry; per-instance attributes, not per-object materials
- [ ] Geometries/materials reused; `dispose()` on removal; `matrixAutoUpdate=false` on statics
- [ ] Dirty flags: only changed instances/uniforms updated
- [ ] No `new Vector3/Array/closure/spread/map/filter` in `update()` or scheduler tick
- [ ] Alpha-blended overdraw minimal (small glow sprites; no large transparent planes stacked)
- [ ] Audio: nodes built once; `setTargetAtTime`; pooled panners, channel strips, note records and Pluck strings; the tick creates a note's single-use sources and envelope and, while a string or a response is waiting, renders one bounded slice of it (LLD §7), nothing else
- [ ] Particle counts capped and halved in reduced-motion

## 4. Verdict
**PASS** / **PASS pending device fps** / **FAIL** with the plan (what to cut, expected gain). Attach the table to the PR.
