# Decisions Log — Roomsong

**Status:** Living · **Owner:** scrum-master
One line per decision: ID · Date · Decision · Why · Who · Reversible? Bigger ones get an ADR in `03-design/adr/`.

| ID | Date | Decision | Why | Who | Reversible |
|---|---|---|---|---|---|
| D-001 | 2026-10-09 | Track = **Entertainment**, Division = **New Experience** | Same $100k top prize as Gaming with a thinner field; fits code-driven art/audio; New division is not shared with polished shipped titles | human + product-owner | Until first submission draft; costly after Sprint 1 |
| D-002 | 2026-10-09 | Idea = **Roomsong** (music garden on the real table) over Shadow Friends (riskier hand-shape detection) and 8 others | Highest win-chance × buildability; targets 4 special awards; no load-bearing risky tech | human | Until end of Sprint 1 |
| D-003 | 2026-10-09 | Stack = **IWSDK WebXR + Three.js + TypeScript**, GitHub Pages (ADR-001, ADR-004) | Agents can build/test/deploy autonomously; judges open a URL | human + architect | No (after scaffold) |
| D-004 | 2026-10-09 | All audio **synthesized**, no samples (ADR-002); all persistence **local** (ADR-003) | Zero licence risk, tiny bundle; privacy by design; no outage risk | architect | Yes (costly) |
| D-005 | 2026-10-09 | Assume **one Quest 3** until confirmed; device testing is the acknowledged bottleneck; agents batch device asks into numbered scripts | Unknown headset count | scrum-master | Yes |
| D-006 | 2026-10-09 | Max **4 concurrent agents**, one per lane A/B/C + one support lane D, each in its own worktree | Parallel speed without merge chaos | scrum-master | Yes |
| D-007 | 2026-10-09 | Immovable dates: feature freeze Nov 12, code freeze Nov 15, submit Nov 17 18:00 IST | 1.5-day buffer before the Nov 18 12:00 PT deadline; judging uses the frozen build | scrum-master | No |
| D-008 | 2026-10-09 | BA role unstaffed; duties absorbed by product-owner and qa-engineer | Per the human's brief | human | Yes |
| D-009 | 2026-10-10 | **Re-plan v2 adopted** (REPLAN_2026-10-10.md): phases with gates, geometry fix, scope cut ≈55–60%, emulator-first | PM review found 2 real spec bugs and close prior art; no headset on the team; v1 scope too large | Parth (plan owner) | Partly |
| D-010 | 2026-10-10 | **Room signature** (room geometry → key/mode/tempo/reverb/starter seeds, with Wanderer fallback) is the differentiator, built as a Should-have layer gated on device evidence (ADR-005) | "Garden that sings" has prior art (Eno's Bloom, Blooming Conductor, 2025 winners); every room having its own song is the only hook without found prior art (unverified) | Parth | Yes until G2 |
| D-011 | 2026-10-10 | **Cut:** wrist twist, flick, weekly seasons, codex, controllers, service worker, gift export, Gardener, diagrams, trace script, 7 rings, bed radius options. Anchors → Should. Gaze dwell = select + Listen only | Judges see one 10-min session; these cost days and score little; twist/flick unreliable with hand tracking | Parth | Yes |
| D-012 | 2026-10-10 | Bed = **annulus 0.12–0.30 m, 5 rings, 16 steps, 80 cells**; centre 0.40 m forward; hit radius ≥4 cm provisional until the on-device pinch test | v1 disc with 7 rings had 3 untargetable rings; v1 reach exceeded the 0.75 m cap | Parth + architect | Yes (numbers tunable) |
| D-013 | 2026-10-10 | **No headset today → T-000 is top priority; H1 = headset by Oct 20; Emergency mode if none by Oct 27; submit-or-withdraw decision if none by Nov 8** | Judges test on real Quest; fps/hand feel/untested rooms cannot be verified in an emulator | Parth | — |
| D-014 | 2026-10-10 | **No GitHub for now:** local git, zip/drive sync; hosting decided by Oct 22 (GitHub Pages / Vercel / Netlify) | Parth's choice | Parth | Yes |
| D-015 | 2026-10-10 | **Developer's copy is the master**; PM's Claude proposes via `PM_PROPOSALS.md`; only the developer's Claude edits specs | Two Claudes editing two copies caused divergence (rename + rewrites on the PM's copy) | Parth | Yes |
| D-016 | 2026-10-10 | Name: **Roomsong** chosen by Parth on 2026-10-10 (was "Bloomtone"); global replace done the same day | "Bloomtone" possibly taken (unverified) and close to Eno's Bloom / Blooming Conductor; Roomsong names the differentiator and a quick search found no conflict | Parth | Yes |
| D-017 | 2026-10-10 | Max **3** concurrent agents; code review stays; one security pass + `npm audit` | Process overhead cut per PM review | Parth | Yes |
| D-018 | 2026-10-10 | **GitHub adopted:** remote `origin` = `https://github.com/ParthDalvi2001/Roomsong`, branch `main`; supersedes the "no GitHub" part of D-014 (zip sync retired; the PM clones instead). Hosting choice (T-108) still open, GitHub Pages now the default | Parth asked to push the project; the 2026 rules name a "GitHub page" for WebXR links and the research report (§9.4) recommends GitHub Pages plus a mirror; public history from ≥ 2026-09-24 is New Experience evidence | Parth | Yes |

## Retro notes
*(appended at each sprint end: 3 keep / 3 change)*
