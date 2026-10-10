# Defect / Bug Tracking Log — Roomsong

**Status:** Living · **Owner:** qa-engineer
Severity: S1 blocks core loop/crash · S2 major, workaround exists · S3 minor/visual · S4 cosmetic.
Status: Open · In progress · Fixed (PR) · Verified (device/e2e) · Won't fix (reason) · Duplicate.
Rule: every bug found anywhere (agent, e2e, device, UAT) gets a row within the same session it was found. Fixes reference `fix/BUG-xxx-*` branches.

| ID | Date | Sev | Area | Title | Repro (short) | Found by | Owner | Status | Fix / Notes |
|---|---|---|---|---|---|---|---|---|---|
| BUG-001 | 2026-10-10 | S2 | core / input | IWSDK 1.0.1 downloads hand and controller models from cdn.jsdelivr.net when an input source joins an XR session (Golden Rules 8/9) | `npm run test:e2e` before the fix: TC-E2E-01 lists `generic-hand/left.glb` and `right.glb` | frontend-dev + qa-engineer (T-111/T-107, emulator) | qa-engineer | **Verified (e2e)** | Fixed in `28ddf1e`: `XRInputVisualAdapter.createVisual` returns no visual in `src/index.ts` (D-027). Guard: TC-E2E-01 asserts zero HTTP/WebSocket requests off localhost with hands and with controllers; proven by mutation. Not verifiable on a headset yet. |
| BUG-002 | 2026-10-10 | S4 | dev tooling | The dev emulator downloads its `living_room` room capture from www.unpkg.com on every dev page load (`dev.emulator.environment`) | `npm run dev` offline: uncaught "Failed to fetch" | frontend-dev (T-111) | devops-engineer | **Won't fix (dev only)** | Not in `dist/`. e2e answers that request locally with a room fixture. Removing the setting disables the emulated room. |
| BUG-003 | 2026-10-10 | S3 | tests / e2e | TC-E2E-01 fails on timing when the machine is busy: load to session took 5053–5256 ms against a 5000 ms limit (three reports from three agents; 2.6–3.8 s when quiet) | run `npm run test:e2e` while two other agents run tests | frontend-dev, software-architect, devops-engineer (emulator) | main session | **Fixed** | The emulator limit is now 10 s (`SESSION_ENTRY_LIMIT_MS`); it measured the host, not the product. The 5 s product limit (FR-SYS-06) is a device check, TC-DEV-01. |

## Open S1/S2 count: 0

## Triage notes
- Daily: scrum-master checks that no S1 is older than 24 h and no S2 older than 72 h.
- After feature freeze (2026-11-12): only S1/S2 fixes. After code freeze (2026-11-15): only S1.
