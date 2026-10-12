# Coding Guidelines & Style Guide — Roomsong

**Status:** Approved · **Owner:** software-architect · Enforced by ESLint/Prettier/tsc in `npm run verify` and by code review.
Agents: read this fully before your first commit. Reviewers: reject PRs that violate any **MUST**.

---

## 1. Principles
1. **Clarity over cleverness.** Code is read by other agents and a human under deadline pressure.
2. **Small, pure, tested.** Domain logic (garden, theory, snapping, growth) is pure functions with unit tests.
3. **No surprises in the frame loop.** Hot paths allocate nothing, throw nothing, and early-out.
4. **Spec is the source of truth.** If the code needs to differ from API_SPEC/LLD, update the spec in the same PR.
5. **Delete more than you add.** Dead code, unused flags and TODOs older than one sprint are removed.

## 2. Language & tooling
- **TypeScript strict** (`strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `exactOptionalPropertyTypes: true`).
- **MUST NOT** use `any`. Use `unknown` + narrowing. `// eslint-disable` requires a reason comment and reviewer approval.
- ESLint: `@typescript-eslint/recommended-type-checked`, `import/order`, `no-floating-promises`, `prefer-const`, `eqeqeq`, `no-restricted-syntax` for `setTimeout` in `audio/` (use the scheduler).
- Prettier: 2-space, single quotes, semicolons, 110 columns, trailing commas `all`.
- Node ≥ 20.19. npm (lockfile committed).

## 3. Project structure & naming
- Folders are modules with one owner (LLD §2). Public API via `index.ts` only; **MUST NOT** deep-import another module's internals.
- Files: `PascalCase.ts` for classes/systems/components, `camelCase.ts` for function modules, `*.test.ts` beside the mirror path in `tests/unit/`.
- Names: `PascalCase` types/classes, `camelCase` functions/vars, `UPPER_SNAKE` true constants, `IFoo` **not** used (no I-prefix). Booleans read as predicates: `isTracked`, `hasSeed`, `canPlant`.
- Units in names when ambiguous: `heightM`, `durationMs`, `angleRad`, `gainDb`. Default units: **metres, seconds (audio), milliseconds (wall-clock), radians**.
- One export per concept. No default exports except Vite entry files.

## 4. Functions & modules
- Functions ≤ 40 lines, ≤ 4 params (use an options object beyond 3). Cyclomatic complexity ≤ 10.
- Prefer pure functions. Side effects live in Systems and adapters only.
- Early return over nested `if`. No `else` after `return`.
- **Result types, not exceptions, for expected failures** (`Result<T>` in API_SPEC). Exceptions are for bugs.
- Magic numbers **MUST** be named constants in a `config.ts` for the module (thresholds, radii, timings), with a comment citing the SRS ID.

## 5. Performance rules (hot paths = any `update()`, scheduler tick, gesture evaluation)
- **MUST NOT** allocate in hot paths: no `new Vector3()`, no array literals, no closures, no spread, no `map/filter`. Use module-level scratch vectors and `core/pool.ts`.
- Use `for` loops over typed arrays/arrays; no iterators in hot paths.
- Dirty-flag everything: render systems update only changed instances.
- Three.js: reuse geometries/materials; `InstancedMesh` for plants; set `matrixAutoUpdate = false` on static objects; dispose on removal.
- Shaders: keep fragment work minimal; no dynamic branching on uniforms per pixel if avoidable; no full-screen passes.
- Audio: build nodes once; parameter changes via `setTargetAtTime`; never create nodes inside the scheduler tick except voice triggers from the pool.
- Measure before optimising; attach a `perf:sample` before/after in the PR description for any rendering/audio change.

## 6. XR-specific rules
- All world positions are in the XR reference space; convert to bed-local only via the inverse (cached) of the bed's pose. `BedAnchor` has no pose field: the pose is the transform of the entity that carries it, `entity.object3D.matrixWorld` (LLD §3). `object3D` is optional on an entity: null-check it.
- Never assume planes, meshes, anchors or a second hand exist. Every adapter has a `supported()` and the caller handles `false`.
- Essential UI goes through `ui/FovGuard` (NFR-FOV-01). Captions through `ui/Captions` only.
- Strings: `core/strings.ts` `STRINGS` is the caption table (everything a `Caption.key` may name, at most six words each); the 2D page's copy lives in `ui/strings.ts`; no user-facing text anywhere else (API_SPEC §1.0).
- Gesture thresholds only in `hands/config.ts`. Any tuned value from a device session is committed with the date and device in a comment.
- Flash cap (FR-UI-11): every brightness animation goes through `render/FlashGuard`; no element changes luminance more than 3 times per second. No camera-locked parallax in reduced-motion mode.

## 7. Error handling & logging
- Use `core/log.ts` (`log.debug/info/warn/error(scope, msg, data?)`). No bare `console.*` outside `log.ts`.
- Systems wrap `update` with the circuit breaker (LLD §8). Never swallow errors silently; log with the error code (API_SPEC §5).
- User-facing failures map to a caption key, not raw messages.

## 8. Comments & docs
- Comment **why**, not what. Public functions get a one-line JSDoc with units and the SRS/FR ID they implement.
- Keep comment density similar to surrounding code; no banner comments.
- `TODO(T-xxx):` must reference a task ID; a unit test in verify fails on a bare `TODO` (`tests/unit/policy/todo.test.ts`).

## 9. Testing rules (see TEST_PLAN for cases)
- TDD for domain logic: write the failing test first (`agent-skills:test-driven-development`).
- Unit tests: Vitest, deterministic, no timers (use fake timers), no randomness without a seed.
- Coverage gate: `npm run test:coverage` fails when `garden/`, `audio/`, `persistence/` or `room/` is under 80 % (lines, functions, statements, branches; the whole folder; thresholds and the one named exception in `vitest.config.ts`). Run it before handing back a task that touches one of the four folders; CI runs it on every push. Code that needs a real browser API goes in its own file and is excluded there by name with its reason, never by folder.
- e2e: Playwright + IWER; each scenario ≤ 60 s; uses `?flags=` to force paths (`forceLevel`, `fakeDay`).
- Never mark a device-only behaviour as verified without a human device report in PROGRESS.md.

## 10. Git workflow
- **Trunk-based with short-lived branches.** `main` = releasable; `develop` = integration (CI only, publishes nothing). Branch names: `feat/T-012-pinch-detector`, `fix/BUG-007-undo-petal`, `chore/ci-cache`, `docs/adr-005`.
- Agents work in **git worktrees** under `.claude/worktrees/` so parallel tasks never collide.
- Commit often; each commit builds. **Conventional Commits**: `feat(hands): add pinch hysteresis (FR-HND-02)`; types: `feat fix perf refactor test docs chore ci`. Scope = module. Reference FR/NFR/T/BUG IDs in the body.
- Every commit message ends with the attribution trailer the harness provides.
- Rebase onto `develop` before merge; squash-merge PRs; delete branches after merge.
- `git push` and merges to `main` require the human's approval (AUTOPILOT §5). Merges to `develop` may be done by the scrum-master once review + verify are green.

## 11. Pull requests
- Title = Conventional Commit summary. Body template:
  ```
  ## What
  ## Why (FR/NFR/US IDs)
  ## How to test (commands + device steps if any)
  ## Perf (before/after perf:sample for render/audio changes)
  ## Checklist
  - [ ] npm run verify green  - [ ] tests added  - [ ] spec updated  - [ ] hands-first audit (if interaction)  - [ ] perf budget (if render/audio)
  ```
- Review by `agent-skills:code-reviewer` (five axes) and, for `room/`, `hands/`, `persistence/`, also `agent-skills:security-auditor` once per sprint.
- Reviewer rejects on: any **MUST** violation, missing tests, allocation in hot path, untracked string, magic number, spec drift.
- PR descriptions end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## 12. Dependencies
- Adding a runtime dependency requires an ADR-lite note in DECISIONS_LOG (size, license, why not hand-rolled). Budget: ≤ 4 MB gzipped total.
- Licenses allowed: MIT, BSD, Apache-2.0, ISC, CC0, OFL (fonts). Log in THIRD_PARTY_LICENSES.md.

## 13. Definition of clean (quick checklist before you open a PR)
- [ ] Names say what things are; units are explicit
- [ ] No `any`, no unused exports, no dead code, no bare TODO
- [ ] Hot paths allocation-free; dirty flags used
- [ ] Constants named and cited; strings in `strings.ts`
- [ ] Tests written first for logic; e2e/device step for behaviour
- [ ] Spec updated; PR template filled; perf numbers attached if relevant
