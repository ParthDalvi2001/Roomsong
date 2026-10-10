# Business Requirements Document (BRD) — Roomsong

**Status:** Approved · **Owner:** product-owner · **Version:** 2.0 (2026-10-10; v1 2026-10-09; change sheet `08-status/REPLAN_2026-10-10.md`)

---

## 1. Purpose
Win a top prize in the **Meta VR Start Developer Competition 2026** (Entertainment track, New Experience
division) by shipping a polished, hands-first, mixed-reality music experience for Meta Quest within the
entry window (2026-09-24 → 2026-11-18 12:00 PT).

## 2. Business goals (prioritised)

| ID | Goal | Measure of success |
|---|---|---|
| BR-1 | Win **Best New Entertainment Experience** ($100k) or runner-up ($50k) | Placement in the Entertainment track |
| BR-2 | Be a credible candidate for ≥3 special awards: Best First Five Minutes, Best Reason to Come Back, Best Accessibility Forward, Boldest Original Concept | Each has a dedicated, demonstrable feature set in the build and ≥10 s in the video |
| BR-3 | Pass Stage-1 judging with zero risk | Compliance gate (HACKATHON_RULES §10) 10/10 ✅ before submit |
| BR-4 | Score ≥8/10 on each of the four judging criteria in our own sprint-review scoring by 2026-11-12 | Sprint review scores in PROGRESS.md |
| BR-5 | Produce a product that is launch-ready for the Meta Horizon Store (PWA) in Q1 2027 | A store-readiness checklist (`hz-store-pwa`) is ≥80% complete at submission |

## 3. Scope

### In scope
- A WebXR app (IWSDK) for Meta Quest 3 / 3S running in Meta Quest Browser, hands-only.
- Core loop: room tunes the garden (room signature, Should) → receive seed → plant on table → tide plays plants → shape plants → listen mode (aurora halo; wall vines where walls exist).
- Persistence across sessions (local save, re-placed garden; growth over time and daily seed as Should). *Weekly seasons: cut (D-011).*
- Accessibility modes (one-hand, gaze-dwell, high contrast, reduced motion, visual beat).
- Submission materials: deployed build, <3-min video, Devpost copy, gallery images.

### Out of scope (this competition)
- Multiplayer / shared gardens, accounts, cloud sync, monetisation, controller-optimised UX,
  non-Meta headsets, native app packaging, localisation beyond English.

## 4. Target audience

| Persona | Who | What they want | Design implication |
|---|---|---|---|
| **The Judge** (primary during the contest) | A Meta or industry expert evaluating 100s of entries, maybe 10 minutes each, in an untested room | Launch instantly, understand in seconds, see something new, see the room matter, no bugs | ≤5 s cold start, zero-text onboarding, robust room fallback, perfectly stable |
| **The Unwinder** | An adult who puts on the headset for 5–15 min in the evening | Calm, beautiful, a sense of making something | Low-stress music (always in tune), soft visuals, a wind-down arc |
| **The Non-musician creator** | Someone who always wanted to make music but never learned | Feel creative without theory | Scale quantisation, position = music, instant feedback |
| **The Accessibility-first player** | Limited mobility, one hand, low vision, or deaf/hard of hearing | Full participation | Gaze dwell, one-hand, high contrast, visual beat ring |

## 5. Success metrics (measured in our own testing before submit)

| Metric | Target |
|---|---|
| Time from launch to first sound (clean headset) | ≤ 20 s |
| Time to first complete loop (≥3 plants playing) | ≤ 90 s |
| Sustained frame rate on Quest 3, 10-minute session | ≥ 72 fps (never below 60) |
| Rooms tested (different tables / no table) | ≥ 6, all playable |
| Crash-free sessions in UAT | 100% |
| "Would I come back tomorrow?" (human listening review, 1–5) | ≥ 4 |
| Gestures recognised correctly on first try (device test) | ≥ 90% |

## 6. Constraints

- **Time:** 39 days from 2026-10-10. Gates G0 Oct 15 / G1 Oct 22 / G2 Nov 1 / G3 Nov 12 (feature freeze); code freeze 2026-11-15; submit 2026-11-17 ≤18:00 IST.
- **Team:** two humans (Parth: developer and plan owner; Chinmay: PM and Devpost Representative) + Claude agents, max 3 concurrent. One developer writes all code.
- **No headset on the team today (critical).** Acquisition is task **T-000**, the project's top priority. Until a headset exists everything is emulator-verified only; fps, hand feel, plane availability and untested-room behaviour are unverified. Gates: headset by 2026-10-20 (H1); Emergency mode (emulator video, honest description) from 2026-10-27; submit-or-withdraw decision 2026-11-08.
- **No GitHub yet.** Local `git` only for history and competition-window proof; team sync by zip/drive. Hosting (GitHub Pages / Vercel / Netlify) is decided in Phase 1; judges need a public HTTPS URL frozen until 2026-12-11.
- **Budget:** $0 external beyond the headset. Free tiers only (hosting, YouTube).
- **Legal:** contest rules (HACKATHON_RULES.md). Original or CC0 assets only. No brands, no identifiable people, English only, 10+ rating. No unverified "first ever" claims in copy.
- **Platform:** Meta Quest Browser WebXR capabilities (hands, passthrough, planes, meshes, anchors, hit-test); availability of planes/labels is confirmed only by the device spike T-104.
- **Developer environments:** macOS (Parth) and Windows 11 (Chinmay); no macOS-only tooling steps.

## 7. Assumptions
- Meta Quest Browser supports WebXR hand tracking, plane/mesh detection, hit-test and persistent anchors on Quest 3/3S (**unverified until the device spike T-104 runs on a real headset**; the room signature S1 ships only if planes/labels are available; anchors are a Should with a re-place fallback).
- A headset will be obtained by 2026-10-20 (H1). If not, the plan degrades per the headset gates in §6 rather than failing silently.
- The emulator (IWER + Immersive Web Emulator) is a faithful enough proxy for logic, layout and budgets, but not for fps, hand feel or room detection.
- Judges will test with hand tracking enabled and will likely have run Space Setup, but we never depend on it: every room gets a song (Wanderer fallback) and a bed (placement chain).
- Judges will accept emulator footage in the video (rules §5.2 allow it) but will score device footage higher; we treat device footage as strongly preferred.
- A free static host (GitHub Pages, Vercel or Netlify) is sufficient and stable for hosting through 2026-12-11; the choice is made by G1 and does not affect the build.
- The working title "Roomsong" may be taken (unverified); the human renames from the shortlist before copy is finalised.
- Prior art (generative "bloom" apps, a hands-only MR musical garden on the store, 2025's instrument-style winner) exists and is known to judges; our originality case rests on the room signature plus the table sequencer, not on "a musical garden" alone.

## 8. Risks (business level)
See WINNING_STRATEGY.md §3 for the full register. Top four: **no headset** (critical), being read as "another music app", deadline slip, room-detection failure in judges' rooms (planes unavailable → Wanderer fallback).

## 9. Stakeholders & sign-off

| Stakeholder | Role | Sign-off |
|---|---|---|
| Parth (developer, plan owner) | Final authority on scope and specs | ✅ (REPLAN 2026-10-10) |
| Chinmay (PM, Devpost Representative) | Copy, research, rule checks; submits the entry | ☐ |
| product-owner agent | Author | ✅ |
