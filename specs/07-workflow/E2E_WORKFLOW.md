# End-to-End Workflow — From Idea to Submitted Entry

**Status:** Approved · **Owner:** scrum-master
This is the lifecycle every piece of work follows. Phases have **entry gates** (what must be true to start) and **exit gates** (what must be true to leave). The calendar lives in SPRINT_PLAN.md; the per-task loop lives in AUTOPILOT.md.

---

## 0. The whole flow on one page

```
 PHASE 0          PHASE 1            PHASE 2            PHASE 3             PHASE 4           PHASE 5          PHASE 6
 Discover &  ──►  Design &      ──►  Build (sprints ──► Harden          ──► Release        ──► Submit      ──► Judging
 Specify          Architect          1–4, parallel)     (sprint 5)          candidate          (Nov 17)         watch
 Oct 9–11         Oct 9–12           Oct 12–Nov 8       Nov 9–12            Nov 13–16          Nov 17           Nov 18–Dec 11
 PO, SM, Arch     UX, Arch, DevOps   FE, BE, FS, QA     all + human         DevOps, QA, PO     human            DevOps
 ────────────     ──────────────     ──────────────     ─────────────       ──────────────     ──────────       ──────────
 gate: idea +     gate: HLD/LLD/     gate: each task    gate: feature       gate: code freeze  gate: go/no-go   gate: prod frozen
 rules digested   API approved       meets DoD          freeze, 0 S1/S2     tag, UAT final     10/10 compliance uptime checks
```

## Phase 0 — Discover & Specify (done 2026-10-09; sign-off T-008)
**Inputs:** contest pages, team brief. **Outputs:** HACKATHON_RULES, WINNING_STRATEGY, BRD, PRD, SRS, USER_STORIES, TEAM_CHARTER.
**Exit gate:** human has read WINNING_STRATEGY + PRD and replied "approved" (or listed changes); open questions Q1–Q4 have owners.

## Phase 1 — Design & Architect (Oct 9–12)
**Activities:** HLD/LLD/ADRs/API_SPEC (architect), UX_WIREFRAMES + icon set (ux), SECURITY_PLAN (architect + security-auditor), ENVIRONMENT_SETUP + scaffold + CI (devops), capability spike on device (T-003).
**Exit gate:** `npm run verify` green on the scaffold; preview build checked; T-003 findings recorded (which XR features actually work); specs updated accordingly.

## Phase 2 — Build (Sprints 1–4, Oct 12 → Nov 8)
Each sprint: **plan → parallel build → integrate → test → device test → review → retro**.
- **Plan** (scrum-master, day 1): confirm sprint tasks, dependencies, and the lanes (at most 2 agents at once, D-023).
- **Build** (agents in worktrees): per-task loop in AUTOPILOT §3. TDD for logic; spec-first for interfaces.
- **Integrate** (fullstack/scrum-master): merge lanes into `develop` daily; e2e must stay green.
- **Test** (qa): e2e suite nightly; write the device script for the sprint.
- **Device test** (human): run the script; report pass/fail per step; listening review on Fridays.
- **Review** (product-owner): judging-criteria self-score; adjust scope via MoSCoW.
- **Retro** (scrum-master): 3 keep / 3 change → DECISIONS_LOG.
**Sprint exit gate:** all sprint tasks Done per DoD (or explicitly moved), e2e green, device script ≥90% pass, no open S1, perf within budget, release notes drafted, preview build checked.

## Phase 3 — Harden (Sprint 5, Nov 9–12)
No new features. Bug bash, regression (e2e + full device suite), content/policy sweep, help page, release notes.
**Exit gate (Feature freeze, Nov 12):** BUG_LOG open S1/S2 = 0; TC-DEV-01..11 pass; self-score ≥8/10 on each criterion or an accepted decision.

## Phase 4 — Release candidate (Nov 13–16)
Video capture and edit, gallery images, Devpost copy, push `main` → deploy, then tag `v1.0.0-rc1`, UAT-final on prod from a clean headset, compliance gate.
**Exit gate (Code freeze, Nov 15 23:59 IST):** rc build deployed and tagged; after this only S1 fixes, each re-tagged and re-UAT'd.

## Phase 5 — Submit (Nov 17)
Go/no-go (SUBMISSION_CHECKLIST §4) → push `main` → deploy, then tag `v1.0.0-submission` → verify from a second device → human submits on Devpost → evidence archived → prod locked.
**Exit gate:** Devpost confirmation screenshot in `specs/06-release/evidence/submission/`.

## Phase 6 — Judging watch (Nov 18 → Dec 11)
Uptime cron + twice-weekly manual check. **No changes to prod.** Post-competition work continues on `develop` only.

## Hand-offs between roles (who gives what to whom)

| From → To | Artefact | Where |
|---|---|---|
| product-owner → architect | PRD/SRS with IDs | 02-requirements |
| architect → devs | LLD, API_SPEC, ADRs | 03-design, 04-development |
| ux-designer → frontend/fullstack | wireframes, icons, captions, palettes, motion specs | 03-design/UX_WIREFRAMES, `public/icons` |
| devs → qa | PR with "How to test" + e2e/device notes | PR template |
| qa → human | numbered device script | PROGRESS.md §Blocked on human |
| human → qa | pass/fail per step, fps, notes | PROGRESS.md (human types it; qa files bugs) |
| qa → scrum-master | test status + open bugs | PROGRESS.md §Test status, BUG_LOG |
| scrum-master → everyone | next tasks, lanes | PROGRESS.md §Now |
| product-owner → human | Devpost copy, video script | 00-hackathon/SUBMISSION_CHECKLIST |
| devops → human | deploy request, URLs, freeze status | PROGRESS.md §Blocked on human |

## Quality gates summary
| Gate | Checked by | Tool |
|---|---|---|
| Verify (types, lint, unit, build, size) | CI + every agent before commit | `npm run verify` |
| Hands-first audit | qa / the implementing agent | `.claude/skills/hands-first-audit` |
| Perf budget | frontend / backend | `.claude/skills/xr-perf-budget` |
| Code review (5 axes) | `agent-skills:code-reviewer` | `agent-skills:review` |
| Security | `agent-skills:security-auditor` | once per sprint + T-014/T-079 |
| Device suite | human | TEST_PLAN §4.6 |
| Compliance gate | product-owner | HACKATHON_RULES §10 |
| Go/no-go | qa + product-owner + human | SUBMISSION_CHECKLIST §4 |
