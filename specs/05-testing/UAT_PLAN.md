# User Acceptance Testing (UAT) Plan — Roomsong

**Status:** Approved · **Owner:** qa-engineer · **Sign-off:** the human (Representative) and product-owner
UAT mirrors **how judges will test**: an unknown room, a clean headset, ≤10 minutes, hands only, then the video and the Devpost page.

> **No headset on the team as of 2026-10-10** (REPLAN §1; acquisition = T-000, H1 = Oct 20, Emergency mode if none by Oct 27). Every scenario below that says "headset", "room", "fps" or "feel" is **unverified until a human runs it on a real Quest**. The emulator can rehearse the flows and events but cannot sign off a device criterion; see TEST_PLAN §1.1 and the Emergency-mode variant in §2.1 below.

---

## 1. When
- UAT-dry-run: end of Phase 3 (2026-11-11, before the G3 feature freeze) on staging (or the local emulator build if hosting is not yet live).
- UAT-final: 2026-11-16 (clean-headset UAT, REPLAN §6 Phase 4) on the **production URL** after code freeze. Only S1 fixes allowed afterwards (re-run affected scenarios).

## 2. Setup for every UAT run
1. Quest 3 (and 3S if available), hand tracking on, **controllers out of reach** — *when a headset is available*.
2. Quest Browser → Settings → clear site data for the app origin (simulates a judge's first run).
3. Use a room the team has **not** tuned in (ask a friend's room, or rearrange furniture). Do at least one run without Space Setup.
4. Start a stopwatch at the moment you tap Enter.

### 2.1 Emergency-mode variant (no headset by 2026-10-27, REPLAN §6)
Run UAT in the emulator (IWER panel or Playwright agent mode, `iwsdk-runtime` MCP input), with a desktop browser and a clean profile instead of steps 1–3 above. Record the same stopwatch times and pass/fail per scenario, tagged **E** in the evidence folder. The following criteria **cannot** be verified and must be listed as *unverified* in the sign-off table and in the Devpost description:
- Frame rate (UAT-06 fps, audio clicks under device load).
- Hand-tracking feel and first-try success rates (UAT-01 "never needed text", UAT-02 ≥9/10, UAT-08 one-hand/gaze on real joints).
- Real room detection: vines on a real wall (UAT-03), anchor restore in place (UAT-04), no-table rooms (UAT-05), room-to-room signature difference in real rooms (UAT-15).
- Quest-button pause/resume on the real OS (UAT-07); Quest 3S (UAT-13); spatial audio localisation by turning the head.
Everything else (flows, timings with emulated input, save/restore, accessibility flags, content/policy sweep, Devpost page/video) is verified in the emulator and marked **E**. The video, if recorded from the emulator, must say so on the Devpost page.

## 3. Scenarios (P0 must all pass; P1 should pass)

| ID | Pri | Scenario (acts like a judge) | Pass criteria |
|---|---|---|---|
| UAT-01 | P0 | Open link, tap Enter, follow only what the app shows | In XR ≤5 s; first sound ≤20 s; three plants playing ≤90 s; never needed a controller or text |
| UAT-02 | P0 | Explore shaping with no hints beyond the app's own icons | **Pull** (height), **drag** (move to another cell), **drag off the bed** (remove), **undo** (petal within 5 s) all discovered or triggered within 3 min; each works first try ≥9/10 (twist/flick *Cut (D-011)*) |
| UAT-03 | P0 | Rest hands / palms out, or pinch the Listen orb | Listen mode in ≤2 s; dim; **aurora halo** over the bed by default; vines to a real wall when walls are detected (Should S2); sound localised to plants; exit by pinch |
| UAT-04 | P0 | Leave XR, return later (same room) | Garden restores in place ≤4 s; growth/seed logic sensible |
| UAT-05 | P0 | Run in a room with **no table** and no Space Setup | Hit-test or floating bed; full loop playable; nothing feels broken |
| UAT-06 | P0 | 10-minute session with ≥20 plants + Listen | No crash; fps HUD never <60 (dev flag run), typical ≥72; no audio clicks |
| UAT-07 | P0 | Pause with the Quest button for 30 s, resume | Audio fades/returns; tide continues; state intact |
| UAT-08 | P0 | Accessibility: one-hand mode; then gaze-dwell mode | Full loop + Listen in each mode with no pinch (gaze) / one hand |
| UAT-09 | P0 | Content & policy sweep (watch for text, logos, people) | None present; all text English; nothing above 10+ |
| UAT-10 | P0 | Open the Devpost page and the video on a laptop as a judge | Video <3:00, public, honest footage; description ≤500 words, matches the build; link works |
| UAT-11 | P1 | High contrast + reduced motion | Readable captions (7:1), outlines, no parallax, vines fade |
| UAT-12 | P1 | Controllers (bonus) | *Cut (D-011)* — controller support removed from scope |
| UAT-13 | P1 | Quest 3S | UAT-01, 03, 06 pass |
| UAT-14 | P1 | "Would I come back tomorrow?" | Human rating ≥4/5 after UAT-03 |
| UAT-15 | P1 (Should S1, gated on TC-DEV-0A) | Place the bed; then repeat in a second, different room | Tuning ripple crosses the table/wall/ceiling and is **audible ≤5 s** after placement; the two rooms give **audibly distinct** key/tempo (tester names the difference unprompted); re-entering room 1 re-tunes the garden in place with no plant moved |

## 4. Judging-criteria self-score (product-owner, after UAT-final)
| Criterion | Score /10 | Evidence |
|---|---|---|
| Innovation & Creativity | | |
| Experience Design | | |
| Technical Implementation | | |
| Polish & Presentation | | |
Target: ≥8 on each; if any <8, log a decision on whether to fix (S1 only after freeze) or accept.

## 5. Sign-off
| Role | Name | Date | Signature |
|---|---|---|---|
| Representative (human) | | | ☐ |
| product-owner | | | ☐ |
| qa-engineer | | | ☐ |
Evidence (screen recordings, perf HUD captures, stopwatch times) saved under `specs/06-release/evidence/uat-final/`, each file tagged **D** (device, human report) or **E** (emulator). The sign-off table lists every criterion left *unverified* in Emergency mode.
