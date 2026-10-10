# PROGRESS — Single Source of Truth (Claude updates this after every task)

**Last updated:** 2026-10-10 (re-plan v2 applied; research delivered; repo on GitHub; Phase 0 continues on "continue")
**Phase:** 0 Prove (Oct 10–15) · **Next gate:** G0 Oct 15 · **Headset gate H1:** Oct 20
**Deadline:** 2026-11-18 12:00 PT · **Submit target:** 2026-11-17 18:00 IST · **Days left:** 39

> **Read first this session:** `specs/08-status/REPLAN_2026-10-10.md` (approved decisions) and `specs/07-workflow/SPRINT_PLAN.md` v2.
> **This folder is the master copy.** The PM (Chinmay) works on a copy; his proposals go to `PM_PROPOSALS.md`, never into spec files.

---

## Now (what is being worked on / next up)
| Task | Owner | Status | Note |
|---|---|---|---|
| **T-000 Get a Quest 3/3S by Oct 20** | Parth + Chinmay | **todo (critical)** | no headset on the team; everything device-side waits on this |
| T-100 Local git init + GitHub remote | devops-engineer | **done (push pending)** | 2 commits on `main`, `origin` = `github.com/ParthDalvi2001/Roomsong`; **Parth runs the push** (item 7 below) (D-018) |
| T-101 Scaffold IWSDK + tooling | devops-engineer | todo | next on "continue" |
| T-102 Desktop sound prototype | backend-dev | todo | parallel with T-101 (lane C) |
| T-108 Hosting + name decision | Parth | **blocked on human** | see below |

## Blocked on human (answer in one message; Claude files the results)
1. **Headset plan (T-000):** which option and by when? (a) buy Quest 3S, (b) borrow, (c) rent. Write the expected date.
2. ~~Name~~ — done: **Roomsong** (D-016, renamed 2026-10-10).
3. **Hosting (T-108):** the GitHub repo now exists, so **GitHub Pages** is the default (ADR-004; the research report §9.4 recommends Pages as the submitted URL plus a Vercel/Netlify mirror of the same build). Confirm, or pick Vercel/Netlify.
4. **Listening review #0 (T-103):** when T-102 is ready, open the link in Chrome, rate 1–5 with one sentence; ask Chinmay + 2 others to do the same.
5. Confirm Chinmay is registered on Devpost and in the Meta VR Start Program (he submits as Representative).
6. **Research → plan (new):** the product discovery report (`specs/09-research/reports/`) is delivered but **not yet applied**. Approve or reject its deltas (report §15 master decision table): buy a Quest 3S by Oct 13; bed centre 0.45 m default; room-signature v1 = reverb + root/register + mode only, built after the core loop is green on device; anchors → Must, vines → Could; non-XR "garden window" bench; extra PoCs (E0/D1/U1 emulator, P2/W1/G1 device); video 60–90 s in two rooms; "first in a consumer MR instrument" wording. Say "apply the research" or list the rows you reject.
7. **Push to GitHub (T-100):** from the repo root run `git push -u origin main` (your GitHub credentials are already in the macOS keychain). Claude's project settings (`.claude/settings.json` → deny `git push*main*`) block agent pushes to `main`, so Claude cannot do this step. Say if you want that rule relaxed.

## Phase 0 task board
| ID | Status | ID | Status | ID | Status |
|---|---|---|---|---|---|
| T-000 | todo (critical) | T-104 | todo | T-108 | blocked (human) |
| T-100 | done (push pending) | T-105 | todo | T-109 | todo |
| T-101 | todo | T-106 | todo | T-110 | todo |
| T-102 | todo | T-107 | todo | | |
| T-103 | blocked (needs T-102) | | | | |

## Gates
| Gate | Date | Result | Notes |
|---|---|---|---|
| G0 | Oct 15 | — | |
| H1 headset | Oct 20 | — | |
| G1 | Oct 22 | — | |
| G2 | Nov 1 | — | |
| G3 freeze | Nov 12 | — | |

## Test status
| Suite | Last run | Result | Coverage |
|---|---|---|---|
| unit | — | — | — |
| e2e (emulator) | — | — | — |
| device | — | **no headset** | — |

## Perf (latest)
emulator: draws — · tris — · JS ms — · heap — · bundle — · **device fps: no headset**

## Judging self-scores (/10)
| Gate | Innovation | Experience | Technical | Polish | By |
|---|---|---|---|---|---|
| — | | | | | |

## Stand-ups
### 2026-10-10
- Done: PM review verified (grid + reach bugs confirmed by math; prior art confirmed); REPLAN v2 approved by Parth; specs being updated by 3 agents; SPRINT_PLAN v2 written; product discovery research delivered (`specs/09-research/`, not yet applied to the plan); repo initialised with `origin` set; push to GitHub pending Parth (T-100, D-018).
- Today: finish spec propagation; then T-100/T-101/T-102 on "continue".
- Blockers: headset (T-000), name, hosting.
- Risk: **no headset** = device criteria unverifiable; rule check (T-186) done Oct 9, no changes.
- fps: n/a
### 2026-10-09
- Done: v1 specs, CLAUDE.md, agents, skills. Blockers: approvals. (superseded by v2)

## Weekly rule check log (T-186)
- 2026-10-09 — Overview/Rules/Judging/Special Awards/Resources read; digest written. No changes since.

## Open questions
Q1 anchors + Q2 planes/labels on 3S (T-104, needs headset) · Q4 name (resolved: Roomsong) · Q5 headset (T-000) · Q6 hosting (T-108) · Q7 room-signature go/no-go (G1/G2)
