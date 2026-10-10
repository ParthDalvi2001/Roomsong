---
name: hands-first-audit
description: Audit a Roomsong interaction change against the contest's hard hands-first rule and our seated/FoV/accessibility guidelines before the task is closed. Use after implementing or changing any gesture, target, UI control, onboarding step, or accessibility mode.
---

# Hands-first audit

Run this checklist on the changed feature. Every item must be ✅ or have a BUG filed. Paste the filled table into the PR/report.

| # | Check | Source | ✅/❌ |
|---|---|---|---|
| 1 | Completable with **hands only**, no controller ever paired (trace the full path: discover → do → confirm → undo) | Rules: hard requirement | |
| 2 | Works with **one hand** (one-hand mode) | FR-UI-09 | |
| 3 | Works with **gaze dwell only** (no pinch) or has a documented dwell equivalent | FR-HND-12 | |
| 4 | Every target has hit radius ≥ 4 cm; nearest-wins; no overlapping ambiguous targets | FR-HND-04 | |
| 5 | Pinch uses hysteresis (1.5 cm start / 3.0 cm end); positions are 1€-filtered | FR-HND-02/03 | |
| 6 | All targets within 0.35–0.75 m of the head; nothing requires standing, leaning > 2 ft, or turning > 90° | Seated guideline | |
| 7 | Essential UI/targets inside ±25°H / ±20°V (checked with `?flags=fovGuide`) | NFR-FOV-01 | |
| 8 | Tracking loss mid-gesture reverts cleanly; no stuck states | NFR-REL-02 | |
| 9 | Feedback on hover/pinch/commit is visible **and** audible; visible-only still works with sound off (beat ring / flashes) | FR-UI-07 | |
| 10 | Instruction is an icon + ≤6-word caption, shown once; no text walls | FR-UI-01 | |
| 11 | No flashing > 3 Hz; reduced-motion variant exists if motion was added | FR-UI-06, NFR-ACC-01 | |
| 12 | Thresholds live in `hands/config.ts` with SRS IDs; strings in `strings.ts` | CODING_GUIDELINES §4/§6 | |
| 13 | Unit tests cover the state transitions; e2e or device step exists | TEST_PLAN | |
| 14 | If the feature needs a real headset to judge feel → listed as a numbered device step | AUTOPILOT §5 | |

Verdict: **PASS** / **PASS pending device** / **FAIL (BUG-xxx)**.
