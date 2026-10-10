# PROGRESS — Single Source of Truth (Claude updates this after every task)

**Last updated:** 2026-10-10 18:30 IST (plan v2.1; implementation running as an ultracode workflow run on Opus 5.5, D-024)
**Phase:** 0 Prove (Oct 10–17) · **Next gate:** G0 Oct 17 (D-023) · **Headset gate H1:** Oct 20 · **Plan:** v2.1
**Deadline:** 2026-11-18 12:00 PT · **Submit target:** 2026-11-17 18:00 IST · **Days left:** 39

> **Read first this session:** `specs/08-status/REPLAN_2026-10-10.md` (v2 decisions), `specs/08-status/PLAN_AMENDMENT_2026-10-10.md` (v2.1 deltas) and `specs/07-workflow/SPRINT_PLAN.md` v2.1.
> **ONE DRIVER (Parth said "continue" at 21:40 IST):** the session started at 21:39 (Claude process 97502) is the only driver. The 20:54 copy (80719) was asked to stand down; its T-105 agent is still alive and is left alone. Ultracode is on again (D-024): work runs as workflows. Running: T-104 and T-108 prep (build, review, fix), T-109 (review, fix), the UX, test and release docs of T-113 (write, critique, fix), and T-105 under the older copy.
> **Live tracking page (Parth, 21:00 IST):** http://127.0.0.1:4180/ shows phases, every task, agents, decisions and what needs Parth. Start it with `python3 scripts/dashboard.py` if it is down. It reads this file, SPRINT_PLAN, DECISIONS_LOG, BUG_LOG, git and the agent logs, so keeping those current keeps the page current.
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
| T-111 Strip starter content | frontend-dev | **done** | develop 28ddf1e; no runtime network; SDK input models off (D-027) |
| T-107 Emulator/e2e pipeline | qa-engineer | **done** | develop 28ddf1e; `npm run test:e2e` 6 tests ≈33 s; TC-E2E-01 ×3 green |
| T-113 Spec propagation v2.1 | UX / QA / devops | **doing** | contract (9592fd9) and requirements docs (8b84927) done; UX, test and release docs being written, then two critics and a fix pass |
| T-106 `core/` module | software-architect | **done** | develop 6541342 after independent review and fix; 45 unit tests; API_SPEC v1.2.1 |
| T-104 Capability spike page | software-architect | **doing** | build, review, fix in the 21:45 workflow |
| T-105 Pinch-accuracy page | frontend-dev | todo | agent stopped at 22:00 with nothing written (file writes declined); its worktree is ready to resume |
| T-109 Security + policy gates | software-architect | **doing** | built (lane ac313b6); independent review and fix running in the 21:45 workflow |
| T-108 CI + Pages deploy prep | devops-engineer | **doing** | build, review, fix in the 21:45 workflow; going live still needs Parth |
| T-108 Hosting: GitHub Pages + mirror (D-022) | Parth + devops-engineer | **blocked on human** | Parth enables Pages + picks the mirror; then devops runs PoC D1 |

## Blocked on human (answer in one message; Claude files the results)
0. **Autopilot is stopped and needs you: say "go".** Since the 20:54 restart, agents' permission prompts are being declined with "stop and wait": first a read by the T-109 reviewer (21:50), then the first three file writes of the pinch page agent (T-105, 22:00). Both agents stopped and wrote nothing. No agent is running. Agents cannot build without writing files, so nothing moves until you either (a) say "go" and approve the write prompts that appear, or (b) switch this session's permission mode so file edits inside the project are allowed without asking. Waiting: T-109 review and merge, T-105, T-104, T-108 prep, and the UX, test and release docs.
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
13. **Licence decision (from T-111):** `@drawcall/uikitml` 0.1.8, which IWSDK pulls in for its UI panels, declares no licence anywhere (npm, tarball, repository). Choose: (a) ask the IWSDK team or the maintainer to declare one (Chinmay can post in the Meta Start Discord), or (b) accept and disclose it in the Devpost text. It cannot be removed without dropping IWSDK's UI kit.
14. **FYI, no action unless you disagree (D-027):** the app draws no virtual hands or controllers. In passthrough you see your real hands. How that feels can only be judged on a headset.
15. **Confirm two design calls (D-028); reply "ok" or say which to change:** (a) the echo length follows room volume directly, so a bedroom and a living room sound clearly different; the cost is that about 1 room in 6 can land on a different echo step on another day. (b) Hand smoothing stays at its starting value until the headset test tunes it; until then a dragged plant trails the hand by about 3 cm.
16. **From the requirements update (T-113), four small calls:** (a) the Devpost text may name three earlier works (MR4MR, ARCHISCORE, RoomTone) to back the "first on Quest" wording; the rules ban brand names, so say "keep the names" or "no names" (a no-names version is written). (b) A plant released in the centre hole goes back to its cell instead of being removed: ok? (c) The tuning ripple plays every session, since the room's song is never stored: ok? (d) The copy says "same key and scale in the same room", not "same song", until the headset test shows the echo is stable.

## Phase 0 task board
| ID | Status | ID | Status | ID | Status |
|---|---|---|---|---|---|
| T-000 | todo (critical) | T-104 | doing | T-108 | doing (prep) |
| T-100 | done | T-105 | doing | T-109 | doing |
| T-101 | done | T-106 | done | T-110 | todo |
| T-102 | done | T-107 | done | T-111 | done |
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
| unit | 2026-10-10 21:30 | root 45/45 pass (core module) · prototype `proto/sound` 70/70 pass + headless render check pass | not measured |
| e2e (emulator) | 2026-10-10 20:20 | 6/6 pass, ≈33 s · TC-E2E-01 (table+hands, none+hands, table+controllers): session active 2.7–3.1 s after load, 0 console errors, 0 requests off localhost | — |
| device | — | **no headset** | — |

## Perf (latest)
emulator: draws — · tris — · JS ms — · heap — · bundle: dist 7.36 MB in 12 files, main chunk 6.57 MB / **1.68 MB gzip** (budget 4 MB gzip) with the empty scene (T-111; was 7.9 MB) · prototype audio: scheduler tick 0.01–0.03 ms, peak ≤ −1.30 dBFS under a 24-bell overload · **device fps: no headset**

## Judging self-scores (/10)
| Gate | Innovation | Experience | Technical | Polish | By |
|---|---|---|---|---|---|
| — | | | | | |

## Stand-ups
### 2026-10-10
- **21:45 IST — another restart (21:39); Parth said "continue".** The hold from the declined permission prompt is lifted. Agents now keep every scratch file inside the repository (`.tmp/`) and get their task cards in the prompt, so no permission prompt should appear. Two workflows launched: code (T-104, T-108 prep, T-109 review) and docs (T-113 UX, tests, release).
- **21:30 IST — T-106 core module merged** (develop 6541342): review found no functional bug, 3 major points (contract drift, frozen flags in tests, a missing allocation test), all fixed; API_SPEC is now v1.2.1. Live tracking page added at http://127.0.0.1:4180/ (`python3 scripts/dashboard.py`). The 20:54 session restart stopped two agents; both were resumed with their context.
- Done: PM review verified (grid + reach bugs confirmed by math; prior art confirmed); REPLAN v2 approved by Parth; specs being updated by 3 agents; SPRINT_PLAN v2 written; product discovery research delivered (`specs/09-research/`, not yet applied to the plan); repo initialised with `origin` set; push to GitHub pending Parth (T-100, D-018); T-101 IWSDK scaffold merged to `develop`, verify green.
- **Interruption 2026-10-10 ≈15:30 IST:** the Claude account hit its weekly usage limit; all three running agents (T-102, T-106, T-107) stopped mid-task. Resets **Oct 13 13:30 IST**. Phase 0 loses ≈3 working days; G0 (Oct 15) is at risk.
- **20:50 IST — contract v1.2 committed** (develop 9592fd9, D-028): 4 agents, 1.36 M tokens, 99 min; reviewers raised 11 major findings, all resolved. Prototype presets aligned to values the contract can produce (small room 0.3 s, hall 2.0 s). Round 2 launched: T-104, T-105, T-109, T-108 prep; then T-106 and the T-113 propagation.
- **20:35 IST — three copies of the session found driving the repo at once** (restarts at 20:19 and 20:25 left older copies alive). The oldest copy (61611, the ultracode run) stood down: workflows stopped, no files left behind. See the ONE DRIVER banner at the top.
- **20:20 IST — session restarted by Parth (ponytail now active; ultracode off).** The round-2 workflow (T-104/105/108/109) died 4 minutes in with nothing written; nothing lost. Contract v1.2 committed (9592fd9, D-028). Back to the 2-agent cap (D-023): T-106 and T-105 relaunched; T-104, T-109, T-108, T-113 propagation queue behind them.
- **20:25 IST — T-111 + T-107 merged** (develop 28ddf1e) after review (1 blocker, 2 major) and fix. The blocker: IWSDK itself fetched hand models from a CDN at session start (BUG-001); fixed by switching SDK input models off (D-027). e2e guard now covers HTTP and WebSocket with hands and controllers. Workflow 1 total: 7 agents, 1.64 M tokens, 93 min.
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
