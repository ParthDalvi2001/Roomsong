# Admin / Operator Guide — Roomsong

**Status:** Living · **Owner:** devops-engineer
For whoever operates the hosted app (the team). There is no admin UI; "admin" means hosting, flags, diagnostics and reset.

---

## 1. Hosting at a glance
- Static site; hosting **to be chosen in Phase 1 (by 2026-10-22)** — GitHub Pages (default if chosen), Vercel or Netlify (DEPLOYMENT_GUIDE §1). Prod at the site root, staging under `/staging/` (Pages) or a preview URL (Vercel/Netlify).
- `version.json` at each root reports `{ version, commit, builtAt }`. Check it first when debugging.
- No server, no database, no secrets, no service worker (offline mode *Cut (D-011)*).

## 2. Diagnostic flags (dev builds, or prod with `?dev=1`)
| Flag | Effect |
|---|---|
| `perfHud` | fps, draw calls, triangles, JS ms, voice count overlay |
| `fovGuide` | draws the ±25°/±20° essential-UI frame |
| `eventLog` | in-XR scrolling event log |
| `noAnchors` / `noPlanes` / `noMeshes` | simulate missing capabilities |
| `forceLevel=N` | force placement fallback level 1–4 |
| `forceSignature=wanderer` | ignore room features; use the Wanderer signature (C major pentatonic, 84 BPM, Bell/Pad/Pluck) |
| `fakeDay=+N` | pretend N days passed (growth/daily seeds) |
| `autoplant=N` | auto-plant N random seeds, max 80 (perf tests) |
| `skipOnboarding` | start as a returning user |
| `seed=<int>` | deterministic sequence for any randomised behaviour (variations are Could C1) |
| `pinchTest` / `capSpike` | open the pinch-accuracy page (TC-DEV-00) / device capability spike page (TC-DEV-0A) — device only |

## 3. Resetting a headset to "judge state"
Quest Browser → ⋮ → Settings → Privacy → Clear browsing data → **Site data** for the origin. Or in-app: Garden → New garden (hold).

## 4. Reading logs on device
- *(requires headset — none on the team as of 2026-10-10)* `metavr logs --filter roomsong` (if the metavr device tooling is connected), or Quest Browser remote debugging via `chrome://inspect` over ADB. In the emulator: `?flags=eventLog` and the browser console.
- Error codes: see API_SPEC §5.

## 5. Updating the app (before the deadline only)
Follow DEPLOYMENT_GUIDE §4. After 2026-11-18 12:00 PT nothing is deployed to prod until 2026-12-12.

## 6. Uptime & incident
See DEPLOYMENT_GUIDE §6. Checklist: open URL on laptop → `version.json` OK? → open on headset → enters XR? → if not, re-run the deploy of the same tag → log in DECISIONS_LOG.

## 7. Store launch (post-competition)
Use the `hz-store-pwa` skill: PWA manifest + icons (already in `public/`), store listing assets, submission tracking.
