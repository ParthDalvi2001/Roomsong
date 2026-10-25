# CLAUDE.md — Roomsong (Meta VR Start Developer Competition 2026)

Loaded into every session and agent. Documents live under `specs/` (map: `specs/README.md`; this folder is the master copy, D-015).
On demand: commands `.claude/QUICK_START.md` · where things live `.claude/ARCHITECTURE_MAP.md` · **read before your first commit:** `.claude/COMMON_MISTAKES.md`.

## 1. Product
**Roomsong**: a hands-first mixed-reality music garden on your real table. Pinch to plant glowing seeds in a ring-shaped bed; a ring of light sweeps it and each plant sings. Where you plant sets when it plays (16 steps) and how high (5 rings). The real room tunes the song (room size and volume set key, mode and echo: the "room signature", gated on device evidence). Saved locally; a new seed each day.
- Track Entertainment · Division New Experience (all code after 2026-09-24) · Meta Quest 3 / 3S in Meta Quest Browser (WebXR).
- Stack: IWSDK + Three.js + TypeScript + Vite + Web Audio. Hosting: GitHub Pages + a mirror (D-022).
- **Deadline 2026-11-18 12:00 PT.** Feature freeze Nov 12 · code freeze Nov 15 · submit Nov 17 ≤18:00 IST.

## 2. Reality
- **No Quest headset** (T-000 is the top priority; H1 Oct 20, Emergency mode Oct 27). Emulator-first (IWER + Playwright); device-dependent work is `done-pending-device`.
- Repo `github.com/ParthDalvi2001/Roomsong`: `main` = release (never pushed by agents), `develop` = work.
- Humans: Parth (developer, plan owner, this Mac) and Chinmay (PM, Devpost Representative). Chinmay's Claude only proposes via `specs/08-status/PM_PROPOSALS.md`; only this Claude edits specs.

## 3. Session start (every session, unasked)
1. Read `specs/08-status/PROGRESS.md` (single source of truth), then once per session `REPLAN_2026-10-10.md` and `PLAN_AMENDMENT_2026-10-10.md` (same folder) and `specs/07-workflow/AUTOPILOT.md`.
2. A specific instruction → do it, then return to the loop. "continue" / "go" / `/autopilot` / nothing → run the Autopilot loop.
3. Never re-plan from scratch: amend `specs/07-workflow/SPRINT_PLAN.md` (v2.1).
4. New entries in `PM_PROPOSALS.md` → summarise for Parth and ask before applying.

## 4. Golden rules (non-negotiable)
1. **Hands-first.** Everything completable with hands only; no controllers. Stage-1 pass/fail.
2. **Seated reach.** Bed centre 0.35–0.45 m ahead of the head; far edge ≤ 0.75 m.
3. **Bed:** annulus 0.12–0.30 m, 5 rings × 16 steps = 80 cells, hit radius ≥ 4 cm (provisional until the device pinch test).
4. **Session:** ≤ 10 min and satisfying, ≤ 5 s cold start, clean pause/resume, first sound ≤ 20 s, first loop ≤ 90 s.
5. **≥ 60 fps on Quest 3 at all times, target 72.** Emulator budgets now: draws ≤ 60, tris ≤ 150k, JS ≤ 6 ms.
6. **FoV:** essential UI within ±25° horizontal / ±20° vertical.
7. **Purposeful passthrough**, always with a fallback when scene data is missing (floating bed, "Wanderer" signature, aurora halo).
8. **Original assets only:** procedural, synthesized, or CC0 logged in `specs/06-release/THIRD_PARTY_LICENSES.md`. No brands, logos, real people, third-party IP. English only.
9. **No thin wrappers:** no load-bearing LLM or API; fully offline once loaded.
10. **Frozen at submission.** Nothing changes after the deadline.
11. **Honest submission:** say what was device-tested and what was not.

## 5. How we work
- Roles in `.claude/agents/`, routed by owner in SPRINT_PLAN. Worktree per agent; never two agents on one module. Max 2 agents at once (D-023); more only when Parth opts in (D-024).
- Standards: `specs/04-development/CODING_GUIDELINES.md` (all MUSTs) · `specs/04-development/API_SPEC.md` (change the spec first) · `specs/05-testing/TEST_PLAN.md`.
- **Lean code (D-026):** the smallest complete change; reuse what exists before adding; no unrequested abstractions, options or dependencies; one small test for new non-trivial logic; never cut validation, error handling or accessibility.
- **Lean context (D-026):** grep or read sections, never whole large files (lock files, the research report); scope every search to a path; keep reports short.
- Done = `npm run verify` green and tests pass; interaction tasks pass `hands-first-audit`, render/audio tasks pass `xr-perf-budget`. Before IWSDK or WebXR code, load the `iwsdk-dev` skill (and `hz-quest-verify-first` if installed).
- Bugs → `specs/05-testing/BUG_LOG.md`. Decisions → `specs/08-status/DECISIONS_LOG.md`.

## 6. Stop and ask Parth only for
headset tests, accounts, pushing `main` or prod deploys, listening and visual ratings, dropping a Must, spending money, submitting (AUTOPILOT §5). List them in `specs/08-status/DECISIONS_PENDING.md` (one file: question, options, ★ recommendation), then keep working on unblocked tasks.
