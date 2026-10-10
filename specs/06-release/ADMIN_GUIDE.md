# Admin / Operator Guide — Roomsong

**Status:** Living · **Owner:** devops-engineer
For whoever operates the hosted app (the team). There is no admin UI; "admin" means hosting, flags, diagnostics and reset.

---

## 1. Hosting at a glance
- Static site on **GitHub Pages**, the submitted URL: `https://parthdalvi2001.github.io/Roomsong/` (D-022; the path is case-sensitive; live once Parth enables Pages, T-108). A Vercel or Netlify mirror serves the same build (host not chosen yet). There is no staging site (DEPLOYMENT_GUIDE §3). *Superseded (D-022, T-108):* "hosting to be chosen", "staging under `/staging/`".
- `version.json` beside `index.html` on each link reports `{ version, commit, builtAt }`. Check it first when debugging: both links must show the same values, and `commit` is the commit of `main` that is live.
- Device test pages on the same site: `/Roomsong/proto/pinch/` (TC-DEV-00) and `/Roomsong/proto/spike/` (TC-DEV-0A). Their numbered scripts are `proto/pinch/README.md` and `proto/spike/README.md`. Device runs are pending: no headset yet.
- No server, no database, no secrets, no service worker (offline mode *Cut (D-011)*).
- Team tracking page, local only and read-only: `python3 scripts/dashboard.py` → `http://127.0.0.1:4180/`.

## 2. Diagnostic flags (dev builds, or prod with `?dev=1`)
Syntax (API_SPEC §3): one `flags` parameter with a comma-separated list. Dev build: `?flags=perfHud,forceLevel=3`. Hosted build: `?dev=1&flags=perfHud,forceLevel=3`; without `dev=1` it ignores every flag. An unknown name or a bad value is ignored.
The parser is built (`src/core/flags.ts`, T-106). Each effect below arrives with the module that reads the flag.
| Flag | Effect |
|---|---|
| `perfHud` | fps, draw calls, triangles, JS ms, voice count and `maxFlashPerS` overlay |
| `fovGuide` | draws the ±25°/±20° essential-UI frame |
| `eventLog` | in-XR scrolling event log |
| `noAnchors` / `noPlanes` / `noMeshes` | simulate missing capabilities |
| `forceLevel=N` | force placement fallback level 1–4 |
| `forceSignature=wanderer` | ignore room features; use the Wanderer signature (C major pentatonic, 84 BPM, Bell/Pad/Pluck) |
| `fakeDay=+N` | pretend N days passed (growth/daily seeds) |
| `autoplant=N` | auto-plant N random seeds, max 80 (perf tests) |
| `skipOnboarding` | start as a returning user |
| `seed=<int>` | deterministic sequence for any randomised behaviour (variations are Could C1) |
| `window` | run the garden in a non-XR window even where `immersive-ar` is supported, for example in the emulator (FR-SYS-07, Should S6; the window arrives with T-114) |
| `pinchTest` / `capSpike` | *replaced by pages (T-104, T-105):* the two test pages are opened by address (§1). The flags are still parsed, and nothing reads them |

## 3. Resetting a headset to "judge state"
Quest Browser → ⋮ → Settings → Privacy → Clear browsing data → **Site data** for the origin (menu names not checked on a headset). Or in-app: Garden → New garden (hold; arrives with T-151).
- The Pages link and the mirror are two origins: a garden saved on one is not on the other. Reset the one the judge will open (the Pages link).
- Clearing site data also deletes the saved runs of the capability page (`/Roomsong/proto/spike/`). Press **Copy JSON** there first.

## 4. Reading logs on device
- *(requires headset — none on the team as of 2026-10-10)* `metavr logs --filter roomsong` (if the metavr device tooling is connected), or Quest Browser remote debugging via `chrome://inspect` over ADB. In the emulator: `?flags=eventLog` and the browser console.
- Error codes: see API_SPEC §5.

## 5. Updating the app (before the deadline only)
Follow DEPLOYMENT_GUIDE §4: a release is a push of `main` by Parth, then the mirror. After 2026-11-18 12:00 PT nothing is deployed to either link through 2026-12-11.

## 6. Uptime & incident
See DEPLOYMENT_GUIDE §6. Checklist, for both links: open the URL on a laptop → `version.json` shows the submitted `commit`? → open on the headset (when one exists) → enters XR? → if the Pages link is down, check the mirror, then with Parth's approval Actions → deploy → Run workflow → Branch: `main` (a rebuild of the same commit) → log in DECISIONS_LOG. *Superseded (T-108):* "re-run the deploy of the same tag": tags do not deploy.

## 7. Store launch (post-competition)
Use the `hz-store-pwa` skill: PWA manifest + icons (not in the repository yet: `public/` holds only the scene file), store listing assets, submission tracking.
