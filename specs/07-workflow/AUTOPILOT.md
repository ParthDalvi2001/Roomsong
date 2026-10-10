# AUTOPILOT — The Self-Driving Work Loop

**Status:** Approved · **Owner:** scrum-master · **Invoke:** `/autopilot` (project skill) or just say "continue" / "go".
Purpose: the human should never need to repeat instructions. This document tells Claude exactly what to do, in what order, with which agent and skill, and when to stop and ask.

---

## 1. Standing authorisations (granted by the human when they run `/autopilot` or say "continue")
By running autopilot the human authorises Claude to, without asking again:
- Read/modify any file in this repo; create branches and git worktrees; make **local commits** on feature branches; **merge to `develop`** after review + verify.
- Install npm dev dependencies that follow CODING_GUIDELINES §12 (log them).
- Run tests, emulators, builds, Playwright, MCP tools (`iwsdk-runtime`, `metavr`), and deploy to **staging**.
- Spawn subagents (max **3** concurrent, D-017) and let them do the above.
- While there is no remote (D-014): "merge to develop" means a local merge; "staging deploy" means a local `npm run build` + `vite preview` smoke until hosting is chosen (T-108).

Claude must still ask before: `git push` to `main`, merging to `main`, **prod deploys**, deleting branches/worktrees with unmerged work, adding a **runtime** dependency, dropping a Must-have, or anything in §5.

## 2. Session start (every time)
1. Read `specs/08-status/PROGRESS.md` (§Now, §Blocked on human, §Stand-ups).
2. Read `specs/07-workflow/SPRINT_PLAN.md` for the current sprint only.
3. If a new calendar day: write today's stand-up (5 lines) in PROGRESS.md.
4. If the human's message contains a device test report → file bugs (BUG_LOG), update task statuses, then continue the loop.
5. If the human gave a specific instruction → do it (via the right agent), update PROGRESS, then continue the loop.
6. Otherwise → **§3 loop**.

## 3. The loop (repeat until the sprint's tasks are done or a §5 stop)

```
SELECT   pick up to 4 tasks: status=todo, all deps done, different lanes, highest sprint priority (table order).
DISPATCH for each task → Agent(subagent_type=<owner role>, isolation=worktree) with the task card (§4).
WAIT     agents run in parallel. Meanwhile the main session: updates PROGRESS §Now, answers the human.
INTEGRATE for each finished agent: read its report → run `npm run verify` on its branch → run review
         (`agent-skills:review`) → if interaction task: hands-first-audit; if render/audio: xr-perf-budget
         → fix or send back once → merge to develop (squash) → delete worktree → mark done / done-pending-device.
RECORD   PROGRESS.md (status, numbers), BUG_LOG (bugs), DECISIONS_LOG (decisions), RELEASE_NOTES (notable).
CHECK    if ≥3 tasks are done-pending-device OR sprint end → write a device script and add to §Blocked on human.
         if sprint end → sprint review (self-score) + retro + staging deploy + next sprint planning.
LOOP
```

## 4. Task card (what the main session gives every agent; copy verbatim and fill)
```
TASK: T-xxx <title>
ROLE: <agent name>. Read .claude/agents/<role>.md first.
READ FIRST: CLAUDE.md; specs/04-development/CODING_GUIDELINES.md; the spec sections: <list FR/NFR/US/LLD §>;
            specs/04-development/API_SPEC.md §<n>.
SKILLS TO LOAD: <from SKILLS_SETUP stage table, e.g. hz-quest-verify-first, hz-iwsdk-webxr, agent-skills:test-driven-development>
ACCEPTANCE: <copy from SPRINT_PLAN>
BRANCH: feat/T-xxx-<slug> (you are in a worktree; do not touch other worktrees)
DO: TDD for logic; implement; `npm run verify` green; add/adjust tests; update docs if interfaces changed;
    commit with Conventional Commits + attribution trailer; do NOT push; do NOT merge.
REPORT BACK (≤25 lines): what changed (files), tests added, verify output summary, perf numbers if relevant,
    anything needing the human (device test steps), open questions, suggested follow-ups (as T-xxx proposals).
```

## 5. Hard stops → ask the human (write it under PROGRESS §Blocked on human, then keep working on unblocked tasks)
1. On-headset verification (any `done-pending-device` task). Provide a **numbered script**; ask for pass/fail per step + fps.
2. Accounts: GitHub repo creation, Meta Start membership, Devpost registration, YouTube upload.
3. `git push` to `main`, merge to `main`, **prod deploy**, tag creation for `v1.0.0*`.
4. Listening/visual reviews (taste calls): ask for a 1–5 rating + one sentence.
5. Any decision that drops a **Must** or changes the idea/track/division.
6. Spending money, or anything irreversible or outward-facing (publishing, submitting).
7. Three consecutive failed attempts at the same task → stop that task, write what was tried, move on.

## 6. Parallelism rules
- Max 3 agents at once: one per lane (A/B/C); lane D agents only when a lane is idle. Never two agents on the same module folder.
- **No headset (D-013):** tasks whose acceptance needs a device finish as `done-pending-device`; the loop keeps selecting emulator-verifiable work. Device scripts accumulate in PROGRESS §Blocked on human until T-000 is resolved.
- Worktree per agent: `git worktree add ../wt-T-xxx -b feat/T-xxx-slug develop`. Clean up after merge.
- Integration order when several finish together: C (backend/garden/audio) → B (hands/render/ui) → A (room/integration) → D.
- If a merge conflicts: the main session resolves it following API_SPEC; if it can't in 2 tries, it re-dispatches the later task on top of the merged `develop`.

## 7. Time-boxing & scope control
- A task that exceeds **2× its sprint-day estimate** (default: 1 day) gets split or descoped by the scrum-master with a DECISIONS_LOG entry.
- Sprint end with unfinished Musts → next sprint's Should/Could tasks are pushed down, never the Musts.
- Nov 12 feature freeze and Nov 15 code freeze are immovable. From Nov 12, the loop only selects `fix/` tasks and release tasks.

## 8. Daily rhythm (when the human is active)
- Morning: Claude posts stand-up + the device script (if any) + exactly the questions it needs answered.
- Human answers in one message; Claude files results and continues.
- Evening: Claude posts a 5-line summary (done / fps / open S1-S2 / next / blocked).

## 9. What "continue" means in each phase
| Phase | "continue" → Claude does |
|---|---|
| Phase 0 Prove | T-100 → T-101 → (T-106, T-107, T-104, T-105, T-109 in parallel) with T-102 running in lane C from the start; asks Parth for T-000/T-103/T-108 items |
| Phases 1–3 | §3 loop over SPRINT_PLAN v2 (T-120+); gate reviews at G1/G2/G3 via scrum-master |
| Phase 3 end | bug bash loop: pick S1 → S2 → S3; regression; freeze gate |
| Phase 4 Release | release tasks in order (T-180+); prepares copy and scripts; asks for recordings/uploads |
| Watch | uptime check; no code changes to prod |

## 10. Anti-patterns (never do these)
- Re-planning the project from scratch, rewriting specs wholesale, or re-asking already-answered questions (check PROGRESS/DECISIONS first).
- Marking device behaviour as verified without a human report.
- Working on two Musts in one giant branch. One task = one branch = one PR.
- Pushing to `main` or deploying prod without explicit approval.
- Adding text walls, brands, or any non-English string to the app.
