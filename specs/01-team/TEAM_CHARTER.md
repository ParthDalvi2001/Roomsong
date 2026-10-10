# Team Charter — Roles, Agents, RACI, Ceremonies, Definition of Done

**Status:** Approved · **Owner:** scrum-master

Every role below is a **Claude subagent** defined in `.claude/agents/<role>.md`. Two humans are on the team
(see §5): **Parth** (developer, plan owner; "the human" in AUTOPILOT unless a task says Representative) and
**Chinmay** (PM, Devpost Representative). They do the things only a person can do: wear the headset (once one exists),
own accounts, approve spec changes and pushes, review sound and copy, record video and press Submit.
*v2 2026-10-10: §5 and §6 updated per `08-status/REPLAN_2026-10-10.md` §2 and §7.*

---

## 1. Roles → agents

| Role (from the brief) | Agent file | Owns | Primary skills it loads |
|---|---|---|---|
| Product Owner / Product Manager | `product-owner` | Vision, scope, MoSCoW, acceptance, Devpost copy, rule compliance | `agent-skills:spec-driven-development`, `agent-skills:idea-refine` |
| Project Manager / Scrum Master | `scrum-master` | Sprint plan, task dispatch, parallelism, blockers, PROGRESS.md, DECISIONS_LOG.md | `agent-skills:planning-and-task-breakdown`, `autopilot` (project skill) |
| Business Analyst | *(not staffed, per the brief)* | BA duties are folded into product-owner (requirements) and qa-engineer (acceptance) | — |
| UX/UI Designer | `ux-designer` | Journeys, spatial layout, gesture design, onboarding, art direction, sound direction, accessibility | `hz-immersive-designer`, `frontend-design`, `motion-design`, `ui-ux-pro-max` |
| Software Architect | `software-architect` | HLD/LLD, ADRs, module boundaries, API_SPEC, perf budgets, tech risk | `hz-quest-verify-first`, `hz-iwsdk-webxr`, `agent-skills:api-and-interface-design`, `archify` |
| Frontend Developer | `frontend-dev` | Rendering, shaders, spatial UI, hand interaction systems, onboarding flow | `hz-iwsdk-webxr`, `threejs-*`, `agent-skills:frontend-ui-engineering`, `xr-perf-budget` |
| Backend Developer | `backend-dev` | Audio engine, sequencer, music theory, persistence, growth simulation, anchor storage | `agent-skills:test-driven-development`, `agent-skills:source-driven-development` |
| Full-Stack Developer | `fullstack-dev` | Cross-cutting features (room placement + fallback chain, accessibility modes, settings), integration glue | `hz-iwsdk-webxr`, `agent-skills:incremental-implementation` |
| DevOps Engineer | `devops-engineer` | Scaffold, CI, static-host deploy (host chosen by Oct 22), environments, freeze, uptime, `npm run verify` | `agent-skills:ci-cd-and-automation`, `agent-skills:shipping-and-launch`, `hz-store-pwa` |
| QA Engineer / Tester | `qa-engineer` | Test plan, unit/e2e tests, emulator runs, device test scripts for the human, BUG_LOG, UAT, hands-first audit | `agent-skills:test-driven-development`, `browser-testing-with-devtools`, `hands-first-audit`, `hz-vr-debug` |

The **main Claude session** acts as **engineering manager**: it reads PROGRESS.md, dispatches agents, merges
their work and talks to the human. It does not write feature code itself unless a task is trivial.

## 2. RACI (R = does the work, A = accountable/signs off, C = consulted, I = informed)

| Deliverable | PO | SM | UX | Arch | FE | BE | FS | DevOps | QA | Human |
|---|---|---|---|---|---|---|---|---|---|---|
| BRD / PRD / User stories | **R/A** | C | C | C | I | I | I | I | C | A |
| SRS | C | I | I | **R/A** | C | C | C | C | C | I |
| UX wireframes & art/sound direction | C | I | **R/A** | C | C | C | I | I | C | C |
| HLD / LLD / ADRs / API spec | C | I | C | **R/A** | C | C | C | C | I | I |
| Security plan | I | I | I | **R/A** | I | C | I | C | C | I |
| Scaffold, CI, deploy | I | I | I | C | I | I | I | **R/A** | C | A (push) |
| Rendering, hands, UI code | I | I | C | C | **R** | I | C | I | C | I |
| Audio, sequencer, persistence code | I | I | C | C | I | **R** | C | I | C | I |
| Room placement, accessibility, settings | I | I | C | C | C | C | **R** | I | C | I |
| Tests, bug log, UAT | C | I | I | I | C | C | C | C | **R/A** | R (device) |
| Device testing | I | I | C | I | C | C | C | I | R (scripts) | **R** |
| Sprint plan, PROGRESS, decisions | C | **R/A** | I | C | I | I | I | I | I | I |
| Video, screenshots, Devpost copy | **R/A** | I | R | I | I | I | I | C | C | **R** |
| Final submission | A | I | I | I | I | I | I | R (freeze) | R (go/no-go) | **R** |

## 3. Ceremonies (adapted for an agent team; all are automated unless noted)

| Ceremony | When | What happens | Written to |
|---|---|---|---|
| Session start | Every Claude session | Read PROGRESS.md, pick up the loop | — |
| Daily stand-up | First action of each calendar day | scrum-master writes 5 lines: done yesterday, today, blockers, risk, fps | `08-status/PROGRESS.md` §Stand-ups |
| Sprint planning | Sprint start dates in SPRINT_PLAN | scrum-master confirms the sprint's tasks are still right, re-orders, splits | `07-workflow/SPRINT_PLAN.md` |
| Device test hand-off | Whenever ≥3 tasks need headset verification | qa-engineer writes a numbered test script for the human | `08-status/PROGRESS.md` §Blocked on human |
| Sprint review | Sprint end | product-owner scores the build against the 4 judging criteria (1–10 each) | `08-status/PROGRESS.md` §Sprint reviews |
| Retro | Sprint end | scrum-master records 3 keep / 3 change | `08-status/DECISIONS_LOG.md` |
| Listening review | Weekly (Fridays) | **Human** listens to a 5-minute garden and rates "would I come back?" | PROGRESS.md |

## 4. Definition of Done (a task is Done only when ALL are true)

1. Acceptance criteria in SPRINT_PLAN / USER_STORIES are met.
2. Code follows `04-development/CODING_GUIDELINES.md`; `npm run verify` is green (typecheck, lint, unit tests, build).
3. New logic has unit tests; new user-facing behaviour has an e2e or emulator test, or a device test script.
4. **Hands-first audit** passed for any interaction task (`.claude/skills/hands-first-audit`).
5. **Perf budget** check passed for any rendering/audio task (`.claude/skills/xr-perf-budget`).
6. Docs updated if behaviour or interfaces changed (API_SPEC, LLD, USER_MANUAL).
7. Reviewed by a second agent (`agent-skills:code-reviewer`) with no open blocking comments.
8. Committed on a `feat/T-xxx-*` branch with a Conventional Commit message; merged to `main`.
9. PROGRESS.md updated; BUG_LOG updated if bugs were found.
10. If it needs the headset: listed under "Blocked on human" with a test script, and marked **Done (pending device)** until the human confirms.

## 5. The humans' standing responsibilities (v2: split between Parth and Chinmay)

### 5.1 Parth — developer, plan owner
| Responsibility | Why only this person can |
|---|---|
| Runs the master copy of this repo and the developer's Claude Code; **approves every spec change** (REPLAN, DECISIONS_LOG) | Plan ownership; one source of truth |
| Writes and merges all code; approves `git push` to `main` and prod deploys | Safety; single developer |
| **Headset acquisition (T-000)** and, once a headset exists, wears it and runs device test scripts; replies with pass/fail per numbered step; records device video and screenshots | Physical |
| Hosting decision (Phase 1) and account for it | Account ownership |
| Rates the desktop sound prototype at G0 (≥4/5 required) and co-rates the weekly listening review | Taste |
| Decides Emergency mode (Oct 27) and submit-or-withdraw (Nov 8) if no headset | Plan ownership |
| Picks the final product name from the shortlist | Decision |

### 5.2 Chinmay — PM, Devpost Representative
| Responsibility | Why only this person can |
|---|---|
| Meta developer account with Developer Access, **Start Program membership**, Devpost account; **fills and submits the Devpost form** | Legal: the Representative must submit and be a Start member |
| Research: prior art, rival entries, Devpost Updates/FAQ; **weekly rule check (T-090)** logged in PROGRESS.md | Context; judgement |
| Listening reviews (weekly) and visual reviews of builds and video cuts; "would I come back?" rating | Taste |
| Copy review: tagline, description, hands paragraph, video captions (English, no brands, no unverified claims) | Second pair of eyes |
| Recruits the 2 outside raters for G0 and the outsider scores for G2 | People |
| Runs his own Claude Code on a **working copy**; proposes changes only via `specs/08-status/PM_PROPOSALS.md` (or a pasted note) | Working agreement §6 |
| Confirms room setups available for testing and, if he obtains a headset first, becomes the device tester until Parth has one | Context |

## 6. Working agreements

- **Developer's copy is master.** Parth's repo is the single source of truth for `specs/` and code. Chinmay's copy is a working copy. Until GitHub hosting exists the two sync by zip/drive; local `git` history on the master is the competition-window proof.
- **PM proposes, developer applies.** PM-side changes go into `specs/08-status/PM_PROPOSALS.md` (or a pasted note), never directly into spec files. Parth's Claude Code applies approved proposals; rejected or unverified ones are recorded as open in REPLAN §9 / DECISIONS_LOG.
- **Parallel by default, capped.** The scrum-master dispatches independent tasks in parallel, each agent in its own git worktree. **Max 3 concurrent agents** (lanes A/B/C; lane D on demand) to keep merges and review manageable for one developer.
- **One owner per file set.** Module ownership is in LLD §2. Cross-module changes go through the owner or the architect.
- **Spec first.** Interface changes update `API_SPEC.md` in the same PR.
- **No silent scope growth.** New ideas go to PRD §6 via the product-owner with a MoSCoW rating and a swap-out; they do not enter a phase without one. Nothing moves Should → Must without Parth's approval.
- **Honest status.** Red is red. A task that is 90% done is "In progress". Anything needing a headset is "Done (pending device)" until device evidence exists.
