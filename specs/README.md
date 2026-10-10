# specs/ — Project Documentation Index

All non-code project documents for **Roomsong**, our entry to the Meta VR Start Developer Competition 2026.
Code lives outside this folder (`src/`, `tests/`, `public/`). Claude agent and skill configs live in `.claude/`.

## Reading order (for humans and for Claude)

| # | Read this | Why |
|---|-----------|-----|
| 1 | [00-hackathon/HACKATHON_RULES.md](00-hackathon/HACKATHON_RULES.md) | Every rule, date and requirement, digested into a checklist |
| 2 | [00-hackathon/WINNING_STRATEGY.md](00-hackathon/WINNING_STRATEGY.md) | Which track, why, the idea, and how it maps to every judging point |
| 3 | [07-workflow/E2E_WORKFLOW.md](07-workflow/E2E_WORKFLOW.md) | The full end-to-end flow: phases, gates and owners |
| 4 | [07-workflow/AUTOPILOT.md](07-workflow/AUTOPILOT.md) | How Claude runs the project without repeated instructions |
| 5 | [08-status/PROGRESS.md](08-status/PROGRESS.md) | Where we are right now |
| 6 | [08-status/REPLAN_2026-10-10.md](08-status/REPLAN_2026-10-10.md) | The approved re-plan: what changed from v1 and why |

## Folder map

```
specs/
├── README.md                         ← you are here
├── 00-hackathon/
│   ├── HACKATHON_RULES.md            all official rules, digested + compliance checklist
│   ├── WINNING_STRATEGY.md           track choice, idea, judging-criteria map, competitor analysis
│   └── SUBMISSION_CHECKLIST.md       Devpost form fields, video script, final go/no-go
├── 01-team/
│   └── TEAM_CHARTER.md               roles → Claude subagents, RACI, ceremonies, Definition of Done
├── 02-requirements/
│   ├── BRD.md                        business requirements (goals, scope, audience, success metrics)
│   ├── PRD.md                        product requirements (features, flows, MoSCoW)
│   ├── SRS.md                        system requirements (functional + non-functional)
│   └── USER_STORIES.md               epics, user stories, acceptance criteria, use cases
├── 03-design/
│   ├── HLD.md                        high-level architecture, stack, perf budgets, deployment topology
│   ├── LLD.md                        modules, ECS components/systems, data schemas, algorithms
│   ├── UX_WIREFRAMES.md              journeys, spatial layouts, gestures, states, errors, art + audio direction
│   ├── SECURITY_PLAN.md              threat model, privacy, permissions, data handling, compliance
│   └── adr/                          Architecture Decision Records
├── 04-development/
│   ├── API_SPEC.md                   internal module APIs, event bus, storage schema, URL params
│   ├── CODING_GUIDELINES.md          clean-code rules, TypeScript/XR style, Git, PR review
│   └── ENVIRONMENT_SETUP.md          local setup, headset setup, emulator, troubleshooting
├── 05-testing/
│   ├── TEST_PLAN.md                  strategy, test cases (unit/integration/e2e/device/perf)
│   ├── UAT_PLAN.md                   acceptance scenarios mirroring the judges' process
│   └── BUG_LOG.md                    live defect ledger
├── 06-release/
│   ├── DEPLOYMENT_GUIDE.md           staging/prod deploy, freeze, rollback
│   ├── RELEASE_NOTES.md              per-version notes
│   ├── USER_MANUAL.md                player-facing help
│   ├── ADMIN_GUIDE.md                operator guide (hosting, debug flags, reset)
│   └── THIRD_PARTY_LICENSES.md       every external asset/library and its licence
├── 07-workflow/
│   ├── E2E_WORKFLOW.md               phase-by-phase lifecycle with entry/exit gates
│   ├── SPRINT_PLAN.md                calendar + full task backlog (IDs, owners, acceptance)
│   ├── AUTOPILOT.md                  the self-driving work loop protocol
│   └── SKILLS_SETUP.md               install every skill/MCP + which skill each stage uses
├── 08-status/
    ├── PROGRESS.md                   live state (Claude updates after every task)
    ├── DECISIONS_LOG.md              running log of decisions
    ├── REPLAN_2026-10-10.md          approved re-plan v2 (geometry fix, room signature, scope cuts, gates, headset reality)
    ├── PLAN_AMENDMENT_2026-10-10.md  v2.1 change sheet (research applied, GitHub + hosting, usage-limit slip, propagation table for T-113)
    └── PM_PROPOSALS.md               the only channel for the PM's proposed changes (this folder is the master copy)
└── 09-research/
    ├── reports/                      product discovery research report (2026-10-10; findings not yet applied to the plan)
    └── research_notes/               the eight evidence notes behind the report
```

## Conventions

- Every document has a **Status** line: `Draft`, `Approved`, or `Living`. Living docs are updated continuously.
- IDs are stable and cross-referenced: `BR-x` (business), `FR-x` (functional), `NFR-x` (non-functional),
  `US-x` (user story), `T-x` (task), `TC-x` (test case), `BUG-x`, `ADR-x`, `D-x` (decision).
- When code and spec disagree, the spec wins. Fix the code, or update the spec first in the same PR with a reason.
