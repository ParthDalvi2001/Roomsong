# CLAUDE.md — Roomsong (Meta VR Start Developer Competition 2026)

> Claude Code loads this file automatically at the start of every session. It defines how you work in this repo.
> Every document lives under `specs/`. Read `specs/README.md` for the map. **This folder is the master copy** (D-015).

## 1. What we are building (one paragraph)

**Roomsong** (formerly Bloomtone; renamed 2026-10-10, D-016) is a hands-first mixed-reality **music garden that grows on your real table**.
You plant glowing seeds with a pinch into a ring-shaped bed. Each plant is a musical voice. A slow ring of light sweeps
the bed; when it touches a plant, the plant blooms and sings. Where you plant sets *when* it plays (16 steps around)
and *how high* (5 rings outward). **Your real room tunes the garden**: table height, room size and walls set the song's
key, mode, tempo and echo, so every room has its own song (the "room signature", gated on device evidence). Then you
rest your hands and the room performs in spatial audio. The garden is saved locally and gives you a new seed each day.
- **Track:** Entertainment · **Division:** New Experience (all code written after 2026-09-24)
- **Platform:** Meta Quest 3 / 3S via Meta Quest Browser (WebXR). FoV-aware for narrower devices.
- **Stack:** Immersive Web SDK (IWSDK) + Three.js + TypeScript + Vite + Web Audio API. Static hosting (to be chosen).
- **Hard deadline:** **2026-11-18 12:00 PT**. Internal: feature freeze Nov 12 · code freeze Nov 15 · **submit Nov 17 ≤18:00 IST**.

## 2. Current reality (read before anything else)
- **No Quest headset on the team as of 2026-10-10.** Build emulator-first (IWER + Playwright). Anything device-dependent
  (fps, hand feel, real rooms) is `done-pending-device`. Getting a headset is **T-000**, the top priority. Gates: H1 Oct 20 / Emergency mode Oct 27.
- **GitHub:** `https://github.com/ParthDalvi2001/Roomsong`, branch `main` (D-018, 2026-10-10; supersedes the "no GitHub" part of D-014; zip sync retired). Hosting chosen by Oct 22 (GitHub Pages is the default, ADR-004).
- **Two humans:** Parth (developer, plan owner; this machine, macOS) and Chinmay (PM, Devpost Representative; Windows).
  Chinmay's Claude works on a copy and may only **propose** via `specs/08-status/PM_PROPOSALS.md`. Only this Claude edits specs.

## 3. Session start protocol (do this EVERY session, without being asked)
1. Read `specs/08-status/PROGRESS.md`. It is the single source of truth for where we are.
2. Read `specs/08-status/REPLAN_2026-10-10.md` once per session (approved decisions) and `specs/07-workflow/AUTOPILOT.md`.
3. If the user gave a specific instruction, do it, then return to the loop. If the user said "continue", "go", "/autopilot" or nothing specific, run the **Autopilot loop**.
4. Never re-plan from scratch. The plan is `specs/07-workflow/SPRINT_PLAN.md` v2. Amend it, don't replace it.
5. If `PM_PROPOSALS.md` has new entries, summarise them for Parth and ask approve/reject before applying.

## 4. Golden rules (non-negotiable; from the contest rules and the re-plan)
1. **Hands-first.** Every feature completable with hands only. Never require a controller (controllers are cut). Stage-1 pass/fail.
2. **Seated, 2 ft radius.** Bed centre 0.35–0.45 m in front of the head; far edge ≤ **0.75 m**.
3. **Bed geometry:** annulus **0.12–0.30 m**, **5 rings**, **16 steps**, **80 cells**, hit radius ≥4 cm (provisional until the on-device pinch test).
4. **≤10-minute satisfying session, ≤5 s cold start, clean pause/resume.** First sound ≤20 s, first loop ≤90 s.
5. **≥60 fps on Quest 3 at all times, target 72.** Emulator budgets (draws ≤60, tris ≤150k, JS ≤6 ms) enforced now; device fps once a headset exists.
6. **FoV-aware.** Essential UI within ±25° horizontal / ±20° vertical.
7. **Passthrough must be purposeful.** The table is the stage; the room tunes the music; always a fallback when scene data is missing (L4 floating bed, "Wanderer" signature, aurora halo).
8. **Original assets only.** Procedural visuals, synthesized audio, or CC0 logged in `specs/06-release/THIRD_PARTY_LICENSES.md`. No brands, logos, real people, third-party IP. English only.
9. **No thin wrappers.** No LLM or API is load-bearing. Fully offline once loaded.
10. **Nothing changes after the deadline.** The deployed build is frozen at submission.
11. **Honesty in the submission.** The Devpost text says what was device-tested and what was not.

## 5. Team = Claude subagents (max 3 concurrent, one per lane A/B/C)
Roles in `.claude/agents/`: `product-owner`, `scrum-master`, `ux-designer`, `software-architect`, `frontend-dev`, `backend-dev`,
`fullstack-dev`, `devops-engineer`, `qa-engineer`. Route by owner in `specs/07-workflow/SPRINT_PLAN.md`. Worktree per agent. Never two agents on one module.

## 6. Skills
Stage-to-skill mapping: `specs/07-workflow/SKILLS_SETUP.md`. Project skills in `.claude/skills/`:
`autopilot` · `hands-first-audit` · `xr-perf-budget` · `submission-pack`.
Always invoke `hz-quest-verify-first` (Meta agentic-tools) before writing Quest- or WebXR-specific code.

## 7. Engineering standards
- `specs/04-development/CODING_GUIDELINES.md` (all MUSTs) · `specs/04-development/API_SPEC.md` (change spec first) · `specs/05-testing/TEST_PLAN.md`.
- A task is done only when `npm run verify` is green and its tests pass; interaction tasks pass `hands-first-audit`; render/audio tasks pass `xr-perf-budget`.
- Bugs → `specs/05-testing/BUG_LOG.md`. Decisions → `specs/08-status/DECISIONS_LOG.md`.

## 8. Commands (after scaffolding, T-101)
```bash
npm run dev        # IWSDK dev server (emulator panel in the browser; LAN HTTPS for a headset later)
npm run verify     # typecheck + lint + unit tests + build; must be green before every commit
npm run test:e2e   # Playwright + IWER emulated XR
npm run build      # production build → dist/
```

## 9. When you must stop and ask Parth
Only for things Claude physically cannot do or must not decide (AUTOPILOT §5): headset tests, accounts, hosting/pushing/deploying prod,
listening/visual ratings, dropping a Must, submitting. Put them in `PROGRESS.md` → **Blocked on human** as one numbered list, then keep working on unblocked tasks.
