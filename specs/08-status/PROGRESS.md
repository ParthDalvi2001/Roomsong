# PROGRESS — Single Source of Truth (Claude updates this after every task)

**Last updated:** 2026-10-10 18:30 IST (plan v2.1; implementation running as an ultracode workflow run on Opus 5.5, D-024)
**Phase:** 0 Prove (Oct 10–17) · **Next gate:** G0 Oct 17 (D-023) · **Headset gate H1:** Oct 20 · **Plan:** v2.1
**Deadline:** 2026-11-18 12:00 PT · **Submit target:** 2026-11-17 18:00 IST · **Days left:** 39

> **Read first this session:** `specs/08-status/REPLAN_2026-10-10.md` (v2 decisions), `specs/08-status/PLAN_AMENDMENT_2026-10-10.md` (v2.1 deltas) and `specs/07-workflow/SPRINT_PLAN.md` v2.1.
> **Push hold (Parth, 2026-10-10 19:15 IST):** no pushes to GitHub, `develop` included, until Phase 0 is finished **and** Parth has been told and says go. Commit and merge locally only. Last pushed commit: `118657b`.
> **This folder is the master copy.** The PM (Chinmay) works on a copy; his proposals go to `PM_PROPOSALS.md`, never into spec files.

---

## Now (what is being worked on / next up)
| Task | Owner | Status | Note |
|---|---|---|---|
| **T-000 Get a Quest 3/3S by Oct 20** | Parth + Chinmay | **todo (critical)** | no headset on the team; everything device-side waits on this |
| T-100 Local git init + GitHub remote | devops-engineer | **done** | pushed by Parth 2026-10-10 18:05 IST: `main` (115b9c1) and `develop` (41d5438) on github.com/ParthDalvi2001/Roomsong (D-018) |
| T-101 Scaffold IWSDK + tooling | devops-engineer | **done** | merged to `develop` (541235b); verify green ≈19 s; follow-up T-111 (strip starter content) |
| T-102 Desktop sound prototype | backend-dev | **done** | merged to `develop` (1d32497) after independent review and fix; 70 unit tests + headless render check green; **ready for the listening review (T-103)** |
| T-111 Strip starter content | frontend-dev | **doing** | pulled into Phase 0 (D-024); network-free empty scene |
| T-107 Emulator/e2e pipeline | qa-engineer | **doing** | follows T-111 in the same branch |
| T-113 Spec propagation v2.1 | software-architect first, then PO/UX/QA/devops | **doing** | contract stage (API_SPEC v1.2 + LLD) running; propagation next (PLAN_AMENDMENT §6) |
| T-106 `core/` module | software-architect | todo | starts as soon as the contract stage lands |
| T-108 Hosting: GitHub Pages + mirror (D-022) | Parth + devops-engineer | **blocked on human** | Parth enables Pages + picks the mirror; then devops runs PoC D1 |

## Blocked on human (answer in one message; Claude files the results)
1. **Headset plan (T-000):** which option and by when? (a) buy Quest 3S, (b) borrow, (c) rent. Write the expected date.
2. ~~Name~~ — done: **Roomsong** (D-016, renamed 2026-10-10).
3. **Hosting (T-108, D-022):** on github.com/ParthDalvi2001/Roomsong open Settings → Pages → Source: **GitHub Actions**; then say whether the mirror is **Vercel** or **Netlify** (free account in your name). Devops does the rest (PoC D1).
4. **Listening review #0 (T-103) — READY NOW:** open **http://127.0.0.1:4173/** in desktop Chrome with headphones (Claude is serving it; if it is down: `cd proto/sound && npm run build && npm run preview`). Press Play, listen ≥30 s, press **Next room** twice, try the three tempos. Then rate 1–5: "If a garden you planted yourself sounded like this, would you keep listening and add more plants?" plus one sentence on what to change first. Also say whether Next room feels like a new room or like a dropout (it is a 20 ms cut, not a crossfade). Ask Chinmay + 2 others the same. Gate G0: Parth ≥4, outsiders ≥3.
5. Confirm Chinmay is registered on Devpost and in the Meta VR Start Program (he submits as Representative).
6. ~~Research → plan~~ — **applied as plan v2.1** on your "refactor the plan" instruction (PLAN_AMENDMENT_2026-10-10.md, D-019–D-023). Reversible row by row: name any row to revert. Propagation into the other spec files is T-113 (after the reset).
7. ~~Push to GitHub~~ — done 2026-10-10 (`main` + `develop` on GitHub). Note: GitHub picked **`develop` as the default branch**; if you want visitors and the Pages link to see `main`, change it in Settings → General → Default branch (optional).
8. **One-time Mac fix:** run `sudo chown -R $(id -u):$(id -g) ~/.npm` — root-owned npm cache files make `npm install` fail unless a `--cache` workaround is used (seen in T-101).
9. **Tooling decisions from T-101:** (a) if you want Claude to use the IWSDK MCP servers (browser snapshots, emulated XR input), add `mcp__iwsdk-runtime__*` and `mcp__iwsdk-reference__*` to the allow list and `enabledMcpjsonServers` in `.claude/settings.json` — `npx @iwsdk/cli adapter sync` tried to do this and the agent reverted it; Claude does not edit that file. (b) `@meta-quest/metavr` was left out of devDependencies (Meta SDK licence + telemetry); say if you want it back.
10. ~~G0 decision~~ — done in v2.1: **G0 Oct 17, G1 Oct 24, G2 Nov 3** (D-023); freezes unchanged. Claude's weekly limit resets **Oct 13 13:30 IST**; say "continue" after it and the loop resumes from this file (T-102 from its WIP, then T-106/T-107, T-113, T-104/T-105).
11. ~~Ponytail plugin~~ — **installed 2026-10-10 19:50 IST** (`ponytail@ponytail` 5.1.0, user scope, enabled) with the terminal commands `claude plugin marketplace add DietrichGebert/ponytail` and `claude plugin install ponytail@ponytail`, after Parth ran the install himself and `/plugin` turned out to be unavailable in the VSCode extension. Its hooks load from the next session start. Do not restart while workflows are running.
12. **Token-optimizer hooks (optional, not recommended as a set):** `npx claude-token-optimizer hooks install --all`, then paste the block from `npx claude-token-optimizer hooks settings` into `.claude/settings.json`. Caution: its read guard blocks any file over 50 KB and its stop-path guard re-runs a turn when a reply names a missing path. If you want any, take only `pre-tool-bash-guard` and `pre-tool-read-guard`. Do **not** run `cto init`: it appends a second, conflicting session protocol to CLAUDE.md.

## Phase 0 task board
| ID | Status | ID | Status | ID | Status |
|---|---|---|---|---|---|
| T-000 | todo (critical) | T-104 | todo | T-108 | blocked (human) |
| T-100 | done | T-105 | todo | T-109 | todo |
| T-101 | done | T-106 | todo | T-110 | todo |
| T-102 | done | T-107 | doing | T-111 | doing |
| T-113 | doing (contract) | T-115 | todo (Chinmay) | | |
| T-103 | blocked (needs T-102) | | | | |

## Gates
| Gate | Date | Result | Notes |
|---|---|---|---|
| G0 | Oct 17 (was Oct 15, D-023) | — | |
| H1 headset | Oct 20 | — | |
| G1 | Oct 24 (was Oct 22, D-023) | — | |
| G2 | Nov 3 (was Nov 1, D-023) | — | |
| G3 freeze | Nov 12 | — | |

## Test status
| Suite | Last run | Result | Coverage |
|---|---|---|---|
| unit | — | — | — |
| e2e (emulator) | — | — | — |
| device | — | **no headset** | — |

## Perf (latest)
emulator: draws — · tris — · JS ms — · heap — · bundle: dist 7.9 MB, main chunk 6.6 MB / **1.7 MB gzip** before any app code (scaffold baseline, T-101) · **device fps: no headset**

## Judging self-scores (/10)
| Gate | Innovation | Experience | Technical | Polish | By |
|---|---|---|---|---|---|
| — | | | | | |

## Stand-ups
### 2026-10-10
- Done: PM review verified (grid + reach bugs confirmed by math; prior art confirmed); REPLAN v2 approved by Parth; specs being updated by 3 agents; SPRINT_PLAN v2 written; product discovery research delivered (`specs/09-research/`, not yet applied to the plan); repo initialised with `origin` set; push to GitHub pending Parth (T-100, D-018); T-101 IWSDK scaffold merged to `develop`, verify green.
- **Interruption 2026-10-10 ≈15:30 IST:** the Claude account hit its weekly usage limit; all three running agents (T-102, T-106, T-107) stopped mid-task. Resets **Oct 13 13:30 IST**. Phase 0 loses ≈3 working days; G0 (Oct 15) is at risk.
- **20:00 IST — T-102 merged** (develop 1d32497). Review found 3 major + 6 minor; all majors fixed (root lint with a built prototype, a limiter test that could not fail, magic numbers). Deferred to T-121: pooled voices/panners per NFR-PERF-10. Measured: peaks ≤ −1.30 dBFS under a 24-bell overload, RT60 0.400/0.904/1.808 s for the three presets, scheduler tick 0.01–0.03 ms. A stale preview server from the interrupted agent (pid 79559, port 4173) was stopped.
- **19:10 IST — token tools (Parth's request):** `claude-token-optimizer` 2.3.20 run read-only (measure, audit, compress): CLAUDE.md slimmed 1,931 → 1,380 tokens; nothing else to compress. Ponytail plugin and optimizer hooks not installed (safety layer refuses third-party code in the harness); lean-code and lean-context rules added to CLAUDE.md instead (D-026).
- **18:30 IST — implementation restarted** ("Start implementation", ultracode on, Opus 5.5; D-024): workflow 1 = T-102 resume + T-111 → T-107; workflow 0 = T-113 contract stage. D-025 modes.
- **Plan amended to v2.1** on Parth's instruction ("start refactor the plan"): research applied, GitHub adopted, gates shifted (G0 Oct 17 / G1 Oct 24 / G2 Nov 3), agent cap 2 — `PLAN_AMENDMENT_2026-10-10.md`, D-019–D-023. Spec propagation = T-113.
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
