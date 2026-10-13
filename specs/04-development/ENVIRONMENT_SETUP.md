# Environment & Setup Guide — Roomsong

**Status:** Living · **Owner:** devops-engineer
Covers: local dev (macOS **and Windows 11**), emulator-first workflow, headset setup (when available), agent tooling (metavr + iwsdk MCP), hosting, troubleshooting.
Exact dependency versions are recorded in §9 by task T-004 after scaffolding. Device capability results (T-104 / TC-DEV-0A) and the pinch-accuracy result (T-105 / TC-DEV-00) are also recorded in §9 once a headset exists.

---

## 1. Prerequisites (macOS; verified on the developer's machine 2026-10-09)
| Tool | Required | Found |
|---|---|---|
| Node.js | ≥ 20.19.0 (24 recommended: `.nvmrc`) | v24.14.0 ✅ |
| npm | ≥ 10 | 11.9.0 ✅ |
| Git | any recent | 2.50.1 ✅ |
| GitHub CLI `gh` | optional: handy for watching Actions runs; nothing in the repository needs it | ✅ installed and signed in (2026-10-10) |
| Chrome | for emulator/e2e | assumed ✅ |
| `metavr` CLI | docs search now; device tooling once a headset exists | install in §4 |

Hardware: **no Quest headset on the team as of 2026-10-10** (acquisition = T-000, highest priority). When one arrives: Meta Quest 3 (primary) with **Developer Mode** enabled; same Wi-Fi as the dev machine. USB-C cable optional (ADB). Until then everything runs emulator-first (§6).

### 1.1 Windows 11 (PM's machine; same project, same scripts)
Open **PowerShell** (not cmd) as a normal user. Either package manager works:
```powershell
# winget (built into Windows 11)
winget install OpenJS.NodeJS.LTS          # Node LTS + npm (24.x expected; any ≥ 20.19 works)
winget install Git.Git
# — or — Chocolatey (if already installed)
choco install nodejs-lts git -y
```
Close and reopen PowerShell, then check `node -v` (≥ 20.19, expect 24.x), `npm -v` (≥ 10), `git --version`.
```powershell
# metavr CLI (PowerShell installer)
iwr -useb https://developers.meta.com/horizon/install-cli/windows/ | iex
metavr --version; metavr update
metavr mcp install claude-code
```
- Paths: metavr installs under `%LOCALAPPDATA%\metavr\bin` (added to the user PATH by the installer; reopen the terminal). The repo can live anywhere without spaces, e.g. `C:\dev\roomsong`. Use forward slashes or quoted paths in npm scripts; never hard-code a drive letter in the repo.
- Git on Windows: `git config --global core.autocrlf input` so files stay LF (the repo's `.gitattributes`/Prettier enforce LF).
- Everything else is identical: `npm install`, `npm run dev`, `npm run verify`, `npm run test:e2e`. The IWSDK dev server prints a LAN URL exactly as on macOS; Windows Firewall will ask once to allow Node on private networks — allow it.
- Chrome + the Immersive Web Emulator extension (§6) work the same on Windows. `gh` is optional here too (`winget install GitHub.cli`).

## 2. Repository bootstrap (T-004, devops-engineer)
```bash
cd <repo root>
git init -b main && git commit --allow-empty -m "chore: repo init (competition window start proof)"
# Scaffold IWSDK app into a scratch folder then hoist (done 2026-10-10, T-101; @iwsdk/create 1.0.1 is fully non-interactive):
npm create @iwsdk@latest roomsong -- --yes --target ar --language ts --grabbing --no-physics \
  --scene-understanding --environment-raycast --no-git --no-install --skip-reference-warmup
# = TypeScript, Mixed reality (AR), grabbing=YES, physics=NO, scene-understanding=YES (anchors + planes + meshes),
#   environment-raycast=YES (hit-test), locomotion is not offered for AR, git=NO, install later at the repo root.
# The CLI has no per-feature required/optional flags: XR feature states live in iwsdk.config.json → world.xr.features
# (schema: boolean = optional, { "required": true } = required). Set there: handTracking {required:true};
# anchors, planeDetection, meshDetection, hitTest, layers = true (optional).
# Hoist everything except CLAUDE.md, README.md, .gitignore, .claude/settings.json (merge by hand); drop the
# Cursor/Codex/Copilot/OpenCode guidance folders. The scaffold also adds `@meta-quest/metavr` as a devDependency —
# removed in T-101 (metavr is installed system-wide by a human, §4; re-add only by decision).
```
Then add: `vitest`, `@playwright/test`, `eslint` + `@typescript-eslint`, `prettier`, `eslint-plugin-import`, `typescript` (if not present).
Add scripts to `package.json`:
```json
{
  "scripts": {
    "dev": "iwsdk dev up --foreground",
    "build": "vite build",
    "preview": "vite preview --host",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "verify": "npm run typecheck && npm run lint && npm run test && npm run build && node scripts/check-dist.mjs && node scripts/check-size.mjs",
    "audit": "npm audit --omit=dev --audit-level=high"
  }
}
```
(As in `package.json` on 2026-10-11. `verify` gained the two `dist/` gates and `audit` was added by T-109 (SECURITY_PLAN §5); CI runs `audit`, verify does not. *Superseded (T-108):* `deploy:staging` / `deploy:prod` and `scripts/deploy.mjs` are deleted: a deploy is a push to `main` (§7). `--foreground` keeps `npm run dev` attached; without it `iwsdk dev up` detaches and you stop it with `npm run dev:down`. The scaffold's own extras are kept: `dev:runtime` (plain `vite`, no managed browser), `dev:down`, `dev:status`, `reference:status`, `reference:warmup`.)

### 2.1 Repository on GitHub (was "No GitHub yet — local git + zip sync", REPLAN §1; superseded by D-018)

- `origin` = `github.com/ParthDalvi2001/Roomsong` (D-018, 2026-10-10). The PM clones it (`git clone https://github.com/ParthDalvi2001/Roomsong.git`) and pulls before proposing.
- Branches: `main` = release, pushed only by Parth; every push to it publishes the site (§7). `develop` = work. GitHub's default branch is `main` (set 2026-10-10). Agents work on `develop` through worktrees or feature branches and never push `main`.
- Hosting is decided: GitHub Pages plus a mirror (D-022, §7).
- **The developer's copy (Parth's machine) is the master** (D-015). The PM's changes are proposals in `specs/08-status/PM_PROPOSALS.md` or a pasted note, never direct edits to the master.
- **Commit often** (at least per task). Keep a dated backup zip of the whole repo (incl. `.git/`) off-machine at every gate; it doubles as the "retain a copy of your entry" evidence.
- *Superseded (D-018), kept for history:* "There is no remote for now"; gate tags kept only locally; sharing by `git archive` zip; "when hosting is chosen the remote is added and the full local history is pushed" (done 2026-10-10).

## 3. Running locally
```bash
npm run dev            # IWSDK dev server + emulator, HTTPS: https://localhost:8081 (it prints the LAN URL, e.g. https://192.168.1.20:8081)
npm run dev:runtime    # the same page from plain vite, no managed browser; another port: npm run dev:runtime -- --port 8082
npm run verify         # typecheck, lint, unit tests, build, dist gates; green before every commit
npm run test:coverage  # unit tests with the coverage gate (NFR-MAINT-01); about 15 s
npm run test:e2e       # emulator suite (§6); E2E_PORT=8091 npm run test:e2e when 8081 is taken
npm run build && npm run preview    # the production build on the LAN, HTTPS, port 4173 or the next free one
python3 tracker/server.py        # team tracking page, http://127.0.0.1:4180/ (read-only; DASHBOARD_PORT changes the port)
```
- **In the emulator (IWER):** the dev server opens a browser with the IWER panel; toggle hands, planes, etc. This is the default way to run the app until a headset exists (§6).
- **The dev emulator downloads its room** (`living_room`, from unpkg.com) on every dev page load (`dev.emulator.environment` in `iwsdk.config.json`). Offline that is an uncaught "Failed to fetch" and no emulated room. It is dev tooling, not in `dist/` (BUG-002, won't fix).
- **On the headset (when available):** open Meta Quest Browser → the LAN URL → accept the self-signed cert once → Enter. Not yet tried: no headset.
- **Device test pages:** `/proto/pinch/` and `/proto/spike/` on the dev server, on the preview and on the hosted site (§5 step 6).
- Dev flags: append `?flags=perfHud,fovGuide` (API_SPEC §3); `forceLevel=N`, `forceSignature=wanderer`, `window` (the garden window, FR-SYS-07, arrives with T-114). A built page ignores flags unless the URL also has `dev=1`: `?dev=1&flags=perfHud`. *Superseded (T-104, T-105):* `pinchTest`, `capSpike` "for the test pages": they are pages now.

## 4. Agent tooling (one-time; also listed in 07-workflow/SKILLS_SETUP.md)
```bash
# Meta VR CLI (device mgmt, docs search, perf, screenshots)
curl -fsSL https://developers.meta.com/horizon/install-cli/ | sh
metavr --version && metavr update
metavr mcp install claude-code            # registers the metavr MCP server for Claude Code
# Inside Claude Code:
#   /plugin marketplace add meta-quest/agentic-tools
#   /plugin install meta-vr@meta-vr
# IWSDK AI tooling (Playwright-managed browser + MCP):
npx @iwsdk/cli adapter sync               # writes .mcp.json for Claude with iwsdk-runtime (+ metavr if installed)
npx @iwsdk/cli reference warmup           # optional: local IWSDK API reference server
```
Enable AI in `vite.config.ts` per https://iwsdk.dev/ai/ (T-005). *Superseded (T-107):* agent mode for e2e; the suite is `npm run test:e2e` (§6).

## 5. When a headset is available (human, once; T-000 first)
No headset exists on the team as of 2026-10-10. The day one arrives:
1. Meta Horizon app → Devices → Developer Mode **on**. Reboot headset.
2. Headset Settings → Movement tracking → **Hand tracking on**, auto-switch on.
3. Run **Space Setup** once in your main test room (for L1 placement); also test a room *without* Space Setup (L3/L4).
4. Quest Browser → Settings → allow WebXR features when prompted.
5. Optional: `metavr device list` to confirm the dev machine sees the headset (Wi-Fi ADB: `metavr device connect <ip>`).
6. Run the two Phase-0 pages first and record results in §9: `<site>/proto/spike/` (TC-DEV-0A device capability spike → gates the room signature; script `proto/spike/README.md`, four runs: allow, reload, browser restart, decline) and `<site>/proto/pinch/` (TC-DEV-00 pinch accuracy → sets the cell size and the outer radius, D-020; script `proto/pinch/README.md`, a second run with `?beta=10` is required). `<site>` is `https://parthdalvi2001.github.io/Roomsong` once Pages is live, and the `npm run preview` LAN address before that. *Superseded (T-104, T-105):* `?flags=capSpike` and `?flags=pinchTest`. Then the device script for G1 (TEST_PLAN §4.6).

## 6. Emulator-first workflow (default until a headset exists)
| Tool | What it emulates | When to use |
|---|---|---|
| **IWSDK dev server + IWER panel** (`npm run dev`) | Hands (joint poses, pinch), head pose, planes (incl. labelled table/wall/floor sets), meshes, hit-test, anchors and persistent handles (*was "session-scoped"*: IWER keeps them in `localStorage` and always restores them), visibility change | Daily development; manual checks of flows and Listen mode; `perf:sample` for draw/tri budgets |
| **Immersive Web Emulator** (Chrome extension by Meta) | Same device profiles as IWER inside Chrome DevTools: hands/controllers, room planes, hit-test, headset movement | Reviewing a built site (`npm run preview` or the Pages site; *staging: superseded, T-108*) without the dev server; PM's reviews on Windows |
| **Playwright e2e** (`npm run test:e2e`; *was "agent mode"*) | Playwright's headless Chromium (WebGL2 on SwiftShader, software) against plain `vite` with `IWSDK_DEV_OPEN=false` on `E2E_PORT` (default 8081), and the production build under `vite preview` on `E2E_PORT` + 1000. `tests/e2e/support/iwer.ts` loads the room fixtures (`tests/fixtures/rooms`: `table`, `counter`, `none`, `tiny`, `large`, `no-walls`) and plays the hand paths (`tests/fixtures/handPaths`: `pinch`, `palm-up`) through IWER's remote control | e2e suite (TEST_PLAN §4.5), agents' unattended checks, CI. Stop `npm run dev` in the same worktree first. *Superseded (T-107):* `iwsdk dev up --mode agent` and the `iwsdk-runtime` MCP as the e2e driver (no port option, a second managed browser) |

Config in `playwright.config.ts`; scenarios, helper and fixture formats in `tests/e2e/README.md`; screenshots and traces of failures → `tests/e2e/__artifacts__/`, HTML report → `playwright-report/`. On 2026-10-11: 51 tests, about 5 min.
- **The suite never leaves localhost and never reuses a running server.** The helper blocks and records every request to another host. One is answered locally: the dev emulator's room download (BUG-002, §3) gets the room fixture, so runs are the same online and offline.
- **Emulator time limit: a session within 10 s of load** (`SESSION_ENTRY_LIMIT_MS`, BUG-003). On software rendering that time measures the host. The 5 s product limit (FR-SYS-06) is a device check, TC-DEV-01.

What the emulator **cannot** tell you: real fps / JS ms on the Quest, hand-tracking feel and first-try success, real room-detection quality (plane/label availability, persistent anchors), spatial-audio feel; also the order of `select` events, which way a plane's normal points, joint jitter and the loss of single joints (`tests/e2e/README.md`, E0). Those stay *unverified* until §5 happens (TEST_PLAN §1.1). Meta XR Simulator (`hz-xr-simulator-*` skills) targets OpenXR apps, not WebXR; it is not used for this project.

## 7. Environments & hosting (decided 2026-10-10, D-022; was "decision deferred to Phase 1")
| Env | How | URL |
|---|---|---|
| Local | `npm run dev` | `https://localhost:8081` (LAN: `https://<lan-ip>:8081`; *was 5173*) |
| Local, built | `npm run build && npm run preview` | `https://<lan-ip>:4173`, or the next free port |
| Staging | *none (T-108):* a push to `develop` runs CI and publishes nothing | — |
| Prod | push to `main` (Parth) → `.github/workflows/deploy.yml` | `https://parthdalvi2001.github.io/Roomsong/` (case-sensitive; live once Parth enables Pages, T-108) |
| Mirror | the same `dist/` uploaded to Vercel or Netlify (host not chosen yet) | _tbd_ |

Secrets: none. Every row also serves the device test pages at `…/proto/pinch/` and `…/proto/spike/`.
Hosting = **GitHub Pages as the submitted URL, plus a mirror of the same build** (D-022, ADR-004). `version.json` on both links proves the same build. Procedure, workflows, freeze and uptime: DEPLOYMENT_GUIDE §1–§6.
*Superseded (D-022):* the comparison of GitHub Pages, Vercel and Netlify that stood here, and "Decision at Phase 1 (G1, Oct 22)". *Superseded (T-108):* staging from `develop`, prod from a `vX.Y.Z` tag, `scripts/deploy.mjs`.

## 8. Troubleshooting
| Symptom | Fix |
|---|---|
| Headset shows "not secure" and won't enter XR | Accept the cert once; or use `mkcert` for a trusted LAN cert (documented in T-004) |
| `Enter` does nothing | Hand tracking off; or `immersive-ar` unsupported in this browser version → check `navigator.xr.isSessionSupported` message on the landing page |
| No planes detected | Space Setup not run → expect L3/L4; test via `?flags=forceLevel=3` |
| Audio silent | AudioContext not resumed: Enter must be a real tap; check `E_AUDIO_CONTEXT` in overlay |
| Low fps | Open `?flags=perfHud`; compare against HLD §7 budgets; run `xr-perf-budget` skill |
| Anchor never restores | `?flags=noAnchors` to confirm fallback works; file BUG with browser version (anchors are Must M5 since D-021, *was Should S4*; re-placing by the fallback chain is the fallback) |
| The Pages site or its assets 404 | The path is case-sensitive: `/Roomsong/`, capital R. The build uses a relative base (`base: './'`), so no `--base` flag is needed. There is no service worker (*Cut (D-011)*), so no scope issue. *Superseded (T-108):* `--base=/roomsong/staging/` |
| IWER panel shows no planes | Pick a room profile with planes in the IWER panel, or load a `tests/fixtures/rooms/*.json` set via the `iwsdk-runtime` MCP; `?flags=forceLevel=1` for L1 |
| Windows: `npm run dev` blocked / no LAN URL | Allow Node through Windows Firewall (private networks); check `ipconfig` for the adapter IP |
| Windows: `metavr` not found after install | Reopen PowerShell; confirm `%LOCALAPPDATA%\metavr\bin` is on PATH |
| `npm install` fails with `EACCES` on `~/.npm/_cacache` (seen on the dev Mac 2026-10-10) | Root-owned cache files from an old npm. Work around (the command in `.claude/QUICK_START.md`): `npm install --cache "${TMPDIR:-/tmp}/roomsong-npm-cache" --no-audit --no-fund`. Agents never use `sudo`; Parth can fix it for good once with `sudo chown -R $(id -u):$(id -g) ~/.npm` |
| `npm run test:e2e` says the browser is missing | `npx playwright install chromium` (Playwright 1.64 needs chromium build 1248) |
| An agent's new worktree lacks the latest work | Agent worktrees start from `main`, not `develop`. First command in a new worktree: `git merge --ff-only develop` |
| After a VSCode reload, agents' file edits come back "declined" although nobody declined | The reload left the old Claude process running with no window (parent pid 1); it declines its agents' permission prompts. Find it with `ps -axo pid,ppid,lstart,command \| grep native-binary/claude` and stop it (`kill <pid>`) once its agents have handed back. Only the newest session drives |
| The page shows an old build | A preview server from an earlier build is still running, perhaps from another worktree. Find it (`lsof -nP -iTCP:4173 -sTCP:LISTEN`), stop it, then `npm run build && npm run preview` and read the port it prints |
| `Port 8081 is already in use`, or e2e cannot start its server | Two dev servers on one port. e2e: `E2E_PORT=8091 npm run test:e2e` (it also takes `E2E_PORT` + 1000 for the built page). Dev: stop the other server (`npm run dev:down`) or `npm run dev:runtime -- --port 8082`. One IWSDK dev server per worktree |
| `npm run dev` offline: uncaught "Failed to fetch" | The dev emulator's room download (BUG-002, dev only, won't fix). e2e is not affected: it answers that request locally |

## 9. Pinned versions (filled by T-101 on 2026-10-10) and device results (filled by T-104 / T-105 once a headset exists)
All versions in `package.json` are exact (no `^`/`~`); `package-lock.json` is committed. Verified with Node 24.14.0 / npm 11.9.0 (`.nvmrc` says `24` since T-108, *was 22.12.0*; CI takes its Node from it; the build was reproduced on Node 22 and 24).
| Package | Version | Notes |
|---|---|---|
| @iwsdk/core · @iwsdk/cli · @iwsdk/vite-plugin-dev · @iwsdk/reference | 1.0.1 | scaffolder `@iwsdk/create` 1.0.1; `reference` is optional (local API MCP; `npm run reference:warmup` downloads its model) |
| three | 0.181.0 | installed as the `super-three` fork via npm alias `npm:super-three@0.181.0` + `overrides` (IWSDK requirement); `@types/three` 0.181.0 |
| @pmndrs/uikit · uikit-horizon · uikit-lucide | 1.0.76 | declared by the scaffold; `@pmndrs/uikit` is still deduped for IWSDK, the other two are no longer bundled or pre-bundled (T-171: IWSDK's spatial UI is off and `@drawcall/uikitml` is replaced by a stub) |
| vite | 7.3.7 | scaffold line (`^7.1.4`); Vite 8 exists but the IWSDK plugin targets 7 |
| vitest | 5.0.3 | `vitest.config.ts`, node environment, `tests/unit/**/*.test.ts`; 30 s per test |
| @vitest/coverage-v8 | 5.0.3 | the coverage gate, `npm run test:coverage` (T-117) |
| @playwright/test | 1.64.0 | chromium build 1248 (`npx playwright install chromium`); `playwright.config.ts` boots `vite` on 8081 |
| typescript | 5.9.3 | **not 7.x**: typescript-eslint 8.71 supports `<6.1` only |
| eslint | 9.39.5 | **not 10.x**: eslint-plugin-import 2.32 peers with `^9` only; flat config `eslint.config.mjs` |
| @eslint/js 9.39.5 · typescript-eslint 8.71.1 · eslint-plugin-import 2.32.0 · eslint-import-resolver-typescript 4.4.5 · eslint-config-prettier 10.1.8 · globals 17.13.0 | — | lint stack |
| prettier | 3.9.10 | `.prettierrc`: 110 cols, single quotes, semis, trailing commas |
| @types/node | 24.19.2 | matches Node 24; used by config files and scripts |
`npm run verify` on the scaffold: typecheck ≈2 s · lint ≈6 s · unit ≈1 s · build ≈9 s (dist 7.9 MB, main chunk 6.6 MB / 1.7 MB gzip, before any app code).
Browser: Meta Quest Browser version _tbd_ (record from `navigator.userAgent` on the device in TC-DEV-0A).

### 9.1 Device capability spike results (TC-DEV-0A, T-104) — *requires headset — none on the team as of 2026-10-10*
| Capability | Quest 3 | Quest 3S | Notes |
|---|---|---|---|
| `navigator.userAgent` | _tbd_ | _tbd_ | |
| Hands (joint count) | _tbd_ | _tbd_ | |
| Order of `select` / `selectstart` / `selectend` on one pinch | _tbd_ | _tbd_ | `hands.pinchEvents` (FR-HND-02) |
| Planes + semantic labels (labels seen) | _tbd_ | _tbd_ | **gates room signature (S1)** |
| Mesh detection | _tbd_ | _tbd_ | |
| Hit-test | _tbd_ | _tbd_ | |
| Anchors + persistent handles (restore after re-enter) | _tbd_ | _tbd_ | |
| Layers | _tbd_ | _tbd_ | |
| Permission decline: what `detectedPlanes` and `detectedMeshes` return | _tbd_ | _tbd_ | `permission`, run 4 |
| Frame rates offered, current rate; fixed foveation and whether a write sticks; fps of an empty loop over 5 s | _tbd_ | _tbd_ | `frameRate` |
| Audio: context state, base and output latency, pinch-to-sound (software path), underruns per step, crackle step | _tbd_ | _tbd_ | `audio`, `human` |

### 9.2 Pinch-accuracy result (TC-DEV-00, T-105) — *requires headset — none on the team as of 2026-10-10*
| Round | First try, default run (filtered / unfiltered) | First try, `?beta=10` run (filtered / unfiltered) | Pinch-to-sound latency median / max (ms) |
|---|---|---|---|
| 3 cm grid (n/20) | _tbd_ | _tbd_ | _tbd_ |
| 4 cm grid (n/20) | _tbd_ | _tbd_ | _tbd_ |
| 5 cm grid (n/20) | _tbd_ | _tbd_ | _tbd_ |
| Bed outer ring (n/10) | _tbd_ | _tbd_ | _tbd_ |
| Bed inner ring (n/10) | _tbd_ | _tbd_ | _tbd_ |
Chosen cell size / hit radius: _tbd_ (smallest spacing with ≥90%; provisional 4 cm until then). Decision logged in DECISIONS_LOG.
