---
name: autopilot
description: Run Roomsong's self-driving work loop: read PROGRESS, select up to 3 parallel tasks from SPRINT_PLAN, dispatch them to the right role agents in worktrees, integrate (verify, review, audits, merge to develop), record status, and batch anything needing the human into one numbered list. Use when the user says /autopilot, "continue", "go", "next", or gives no specific instruction.
---

# Autopilot

Follow `specs/07-workflow/AUTOPILOT.md` exactly. This skill is the short form.

## 0. Preconditions
- Read `CLAUDE.md`, `specs/08-status/PROGRESS.md`, current sprint in `specs/07-workflow/SPRINT_PLAN.md`.
- If the user's message contains device results or an instruction, handle it first (file bugs / update statuses / do the instruction), then continue.
- New calendar day → write the stand-up in PROGRESS.md.

## 1. Select
Up to 3 tasks: `todo`, all deps `done`, different lanes (A fullstack · B frontend · C backend · D support), in backlog order. If the sprint is in freeze (≥ Nov 12), select only `fix/` and release tasks.

## 2. Dispatch (parallel, one Agent call per task, same message)
`Agent(subagent_type=<owner>, isolation="worktree", run_in_background=true, prompt=<task card from AUTOPILOT §4>)`. Mark tasks `doing` in SPRINT_PLAN + PROGRESS §Now.

## 3. Integrate each finished agent
1. Read its report. 2. In its worktree: `npm run verify`. 3. `agent-skills:review` (code-reviewer). 4. If interaction task → `hands-first-audit`; if render/audio → `xr-perf-budget`. 5. Fix small issues or send back once with precise notes. 6. Squash-merge to `develop`; remove worktree. 7. Status → `done` or `done-pending-device`.

## 4. Record
PROGRESS.md (statuses, test/perf numbers, stand-up), BUG_LOG.md, DECISIONS_LOG.md, RELEASE_NOTES.md (notable). Keep "Blocked on human" as one numbered list.

## 5. Check gates
≥3 `done-pending-device` → ask qa-engineer for a device script → post it. Sprint end → review (self-score) + retro + staging deploy + next sprint planning via scrum-master.

## 6. Stop conditions (ask the human; keep working on unblocked tasks meanwhile)
Device verification · accounts · push/merge to `main` · prod deploy · `v1.0.0*` tags · taste reviews · dropping a Must · 3 failed attempts on one task.

## 7. Finish the turn
End with a ≤10-line summary: done · in progress · fps/perf · open S1/S2 · **Blocked on human (numbered)** · next.
