# Environment & Setup Guide — Roomsong

**Status:** Living · **Owner:** devops-engineer
Covers: local dev (macOS **and Windows 11**), emulator-first workflow, headset setup (when available), agent tooling (metavr + iwsdk MCP), hosting options, troubleshooting.
Exact dependency versions are recorded in §9 by task T-004 after scaffolding. Device capability results (T-104 / TC-DEV-0A) and the pinch-accuracy result (T-105 / TC-DEV-00) are also recorded in §9 once a headset exists.

---

## 1. Prerequisites (macOS; verified on the developer's machine 2026-10-09)
| Tool | Required | Found |
|---|---|---|
| Node.js | ≥ 20.19.0 (22 LTS recommended) | v24.14.0 ✅ |
| npm | ≥ 10 | 11.9.0 ✅ |
| Git | any recent | 2.50.1 ✅ |
| GitHub CLI `gh` | **optional** — only once hosting is chosen (Phase 1, by Oct 22) and only if GitHub Pages wins | ❌ not installed; `brew install gh && gh auth login` *if* needed |
| Chrome | for emulator/e2e | assumed ✅ |
| `metavr` CLI | docs search now; device tooling once a headset exists | install in §4 |

Hardware: **no Quest headset on the team as of 2026-10-10** (acquisition = T-000, highest priority). When one arrives: Meta Quest 3 (primary) with **Developer Mode** enabled; same Wi-Fi as the dev machine. USB-C cable optional (ADB). Until then everything runs emulator-first (§6).

### 1.1 Windows 11 (PM's machine; same project, same scripts)
Open **PowerShell** (not cmd) as a normal user. Either package manager works:
```powershell
# winget (built into Windows 11)
winget install OpenJS.NodeJS.LTS          # Node 22 LTS + npm
winget install Git.Git
# — or — Chocolatey (if already installed)
choco install nodejs-lts git -y
```
Close and reopen PowerShell, then check `node -v` (≥ 20.19, expect 22.x), `npm -v` (≥ 10), `git --version`.
```powershell
# metavr CLI (PowerShell installer)
iwr -useb https://developers.meta.com/horizon/install-cli/windows/ | iex
metavr --version; metavr update
metavr mcp install claude-code
```
- Paths: metavr installs under `%LOCALAPPDATA%\metavr\bin` (added to the user PATH by the installer; reopen the terminal). The repo can live anywhere without spaces, e.g. `C:\dev\roomsong`. Use forward slashes or quoted paths in npm scripts; never hard-code a drive letter in the repo.
- Git on Windows: `git config --global core.autocrlf input` so files stay LF (the repo's `.gitattributes`/Prettier enforce LF).
- Everything else is identical: `npm install`, `npm run dev`, `npm run verify`, `npm run test:e2e`. The IWSDK dev server prints a LAN URL exactly as on macOS; Windows Firewall will ask once to allow Node on private networks — allow it.
- Chrome + the Immersive Web Emulator extension (§6) work the same on Windows. `gh` is optional here too (`winget install GitHub.cli` only if GitHub Pages is chosen).

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
    "test:e2e": "playwright test",
    "verify": "npm run typecheck && npm run lint && npm run test && npm run build",
    "deploy:staging": "node scripts/deploy.mjs staging",
    "deploy:prod": "node scripts/deploy.mjs prod"
  }
}
```
(`deploy:*` scripts are placeholders until hosting is chosen — §7. `--foreground` keeps `npm run dev` attached; without it `iwsdk dev up` detaches and you stop it with `npm run dev:down`. The scaffold's own extras are kept: `dev:runtime` (plain `vite`, no managed browser), `dev:down`, `dev:status`, `reference:status`, `reference:warmup`.)

### 2.1 No GitHub yet — local git + zip sync (REPLAN §1)

> **Superseded 2026-10-10 (D-018):** the repo is now on GitHub — `origin` = `https://github.com/ParthDalvi2001/Roomsong`, branch `main`. Zip sync is retired; the PM clones the repo (`git clone https://github.com/ParthDalvi2001/Roomsong.git`) and pulls before proposing. The notes below are kept for history.
- There is **no remote** for now. `git init` locally (above), **commit often** (at least per task; the first empty commit is the competition-window start proof), tag phase gates locally (`git tag g0`, `g1`, …).
- **The developer's copy (Parth's machine) is the master.** The PM works on a *working copy*; PM changes are proposals in `specs/08-status/PM_PROPOSALS.md` or a pasted note, never direct edits to the master.
- Share by zip or drive: `git archive --format=zip -o roomsong-$(git rev-parse --short HEAD).zip HEAD` (PowerShell: same command; `$(git rev-parse --short HEAD)` works there too). Unzip into a fresh folder; never merge zips back by hand — the master applies approved changes.
- Keep a dated backup zip of the whole repo (incl. `.git/`) off-machine at every gate; it doubles as the "retain a copy of your entry" evidence.
- When hosting is chosen (§7) the remote is added with `git remote add origin …` and the full local history is pushed, so nothing is lost.

## 3. Running locally
```bash
npm run dev            # IWSDK dev server (HTTPS). Note the LAN URL it prints, e.g. https://192.168.1.20:5173
```
- **In the emulator (IWER):** the dev server opens a browser with the IWER panel; toggle hands, planes, etc. This is the default way to run the app until a headset exists (§6).
- **On the headset (when available):** open Meta Quest Browser → the LAN URL → accept the self-signed cert once → Enter.
- Dev flags: append `?flags=perfHud,fovGuide` (API_SPEC §3); `forceLevel=N`, `forceSignature=wanderer`, `pinchTest`, `capSpike` for the test pages.

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
Enable AI in `vite.config.ts` per https://iwsdk.dev/ai/ (T-005). Agent mode: `iwsdk dev up --mode agent` (headless) for unattended e2e.

## 5. When a headset is available (human, once; T-000 first)
No headset exists on the team as of 2026-10-10. The day one arrives:
1. Meta Horizon app → Devices → Developer Mode **on**. Reboot headset.
2. Headset Settings → Movement tracking → **Hand tracking on**, auto-switch on.
3. Run **Space Setup** once in your main test room (for L1 placement); also test a room *without* Space Setup (L3/L4).
4. Quest Browser → Settings → allow WebXR features when prompted.
5. Optional: `metavr device list` to confirm the dev machine sees the headset (Wi-Fi ADB: `metavr device connect <ip>`).
6. Run the two Phase-0 pages first and record results in §9: `?flags=capSpike` (TC-DEV-0A device capability spike → gates the room signature) and `?flags=pinchTest` (TC-DEV-00 pinch accuracy → sets the cell size). Then the device script for G1 (TEST_PLAN §4.6).

## 6. Emulator-first workflow (default until a headset exists)
| Tool | What it emulates | When to use |
|---|---|---|
| **IWSDK dev server + IWER panel** (`npm run dev`) | Hands (joint poses, pinch), head pose, planes (incl. labelled table/wall/floor sets), hit-test, anchors (session-scoped), visibility change | Daily development; manual checks of flows and Listen mode; `perf:sample` for draw/tri budgets |
| **Immersive Web Emulator** (Chrome extension by Meta) | Same device profiles as IWER inside Chrome DevTools: hands/controllers, room planes, hit-test, headset movement | Reviewing a built site (`npm run preview` or staging) without the dev server; PM's reviews on Windows |
| **Playwright agent mode** (`iwsdk dev up --mode agent`, `npm run test:e2e`) | Headless IWER driven by scripts and the `iwsdk-runtime` MCP: emulated hand paths from `tests/fixtures/handPaths`, plane fixtures from `tests/fixtures/rooms`, forced levels via `?flags=forceLevel=N`, fake clock | e2e suite (TEST_PLAN §4.5), agents' unattended checks, CI |
Config in `playwright.config.ts`; scenarios in `tests/e2e/`; screenshots on failure → `tests/e2e/__artifacts__/`.
What the emulator **cannot** tell you: real fps / JS ms on the Quest, hand-tracking feel and first-try success, real room-detection quality (plane/label availability, persistent anchors), spatial-audio feel. Those stay *unverified* until §5 happens (TEST_PLAN §1.1). Meta XR Simulator (`hz-xr-simulator-*` skills) targets OpenXR apps, not WebXR; it is not used for this project.

## 7. Environments & hosting (decision deferred to Phase 1, by 2026-10-22)
| Env | How | URL |
|---|---|---|
| Local | `npm run dev` | `https://<lan-ip>:5173` |
| Staging | *once hosting is chosen* (branch `develop` → auto-deploy) | `<host>/staging/` or a preview URL |
| Prod | *once hosting is chosen* (tag `vX.Y.Z` on `main`) | public HTTPS URL for the judges |
Secrets: none needed with any option below.
Hosting options (all free, static, HTTPS — WebXR requires HTTPS):
| Option | Needs | Pros | Cons |
|---|---|---|---|
| **GitHub Pages** (ADR-004, default if chosen) | GitHub repo (public recommended), `gh` optional, the workflows in DEPLOYMENT_GUIDE §2 | History + Actions + Pages in one place; originality evidence; custom `scripts/deploy.mjs` keeps prod + `/staging/` together | Needs the GitHub repo first; sub-path `base` handling; single site per repo |
| **Vercel** | Vercel account, repo on GitHub/GitLab or `vercel` CLI deploys from the local repo | Zero-config static deploy, preview URL per branch/deploy, `vercel --prod` promotes; no sub-path base issues | Project URL on `vercel.app`; branch previews are the "staging" |
| **Netlify** | Netlify account, `netlify` CLI or Git integration, `netlify deploy --prod` | Drag-and-drop or CLI deploy of `dist/`; deploy previews; simple redirects/headers file | Same as Vercel; separate dashboard to lock after submission |
Decision at Phase 1 (G1, Oct 22) — record in DECISIONS_LOG; then fill the Staging/Prod rows above and DEPLOYMENT_GUIDE §1.

## 8. Troubleshooting
| Symptom | Fix |
|---|---|
| Headset shows "not secure" and won't enter XR | Accept the cert once; or use `mkcert` for a trusted LAN cert (documented in T-004) |
| `Enter` does nothing | Hand tracking off; or `immersive-ar` unsupported in this browser version → check `navigator.xr.isSessionSupported` message on the landing page |
| No planes detected | Space Setup not run → expect L3/L4; test via `?flags=forceLevel=3` |
| Audio silent | AudioContext not resumed: Enter must be a real tap; check `E_AUDIO_CONTEXT` in overlay |
| Low fps | Open `?flags=perfHud`; compare against HLD §7 budgets; run `xr-perf-budget` skill |
| Anchor never restores | `?flags=noAnchors` to confirm fallback works; file BUG with browser version (anchors are Should S4; re-place by chain is the fallback) |
| Staging and prod assets 404 (GitHub Pages option) | Vite `base` must match the deploy path: `npm run build -- --base=/roomsong/staging/` for staging (no service worker — *Cut (D-011)* — so no scope issue) |
| IWER panel shows no planes | Pick a room profile with planes in the IWER panel, or load a `tests/fixtures/rooms/*.json` set via the `iwsdk-runtime` MCP; `?flags=forceLevel=1` for L1 |
| Windows: `npm run dev` blocked / no LAN URL | Allow Node through Windows Firewall (private networks); check `ipconfig` for the adapter IP |
| Windows: `metavr` not found after install | Reopen PowerShell; confirm `%LOCALAPPDATA%\metavr\bin` is on PATH |
| `npm install` fails with `EACCES` on `~/.npm/_cacache` (seen on the dev Mac 2026-10-10) | Root-owned cache files from an old npm: one-time `sudo chown -R $(id -u):$(id -g) ~/.npm`; or work around with `npm install --cache /tmp/npm-cache` |
| `npm run test:e2e` says the browser is missing | `npx playwright install chromium` (Playwright 1.64 needs chromium build 1248) |

## 9. Pinned versions (filled by T-101 on 2026-10-10) and device results (filled by T-104 / T-105 once a headset exists)
All versions in `package.json` are exact (no `^`/`~`); `package-lock.json` is committed. Verified with Node 24.14.0 / npm 11.9.0 (`.nvmrc` says 22.12.0, the scaffold's recommended LTS; both work).
| Package | Version | Notes |
|---|---|---|
| @iwsdk/core · @iwsdk/cli · @iwsdk/vite-plugin-dev · @iwsdk/reference | 1.0.1 | scaffolder `@iwsdk/create` 1.0.1; `reference` is optional (local API MCP; `npm run reference:warmup` downloads its model) |
| three | 0.181.0 | installed as the `super-three` fork via npm alias `npm:super-three@0.181.0` + `overrides` (IWSDK requirement); `@types/three` 0.181.0 |
| @pmndrs/uikit · uikit-horizon · uikit-lucide | 1.0.76 | declared by the scaffold so Vite `dedupe` resolves one copy; spatial UI |
| vite | 7.3.7 | scaffold line (`^7.1.4`); Vite 8 exists but the IWSDK plugin targets 7 |
| vitest | 5.0.3 | `vitest.config.ts`, node environment, `tests/unit/**/*.test.ts` |
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
| Planes + semantic labels (labels seen) | _tbd_ | _tbd_ | **gates room signature (S1)** |
| Mesh detection | _tbd_ | _tbd_ | |
| Hit-test | _tbd_ | _tbd_ | |
| Anchors + persistent handles (restore after re-enter) | _tbd_ | _tbd_ | |
| Layers | _tbd_ | _tbd_ | |

### 9.2 Pinch-accuracy result (TC-DEV-00, T-105) — *requires headset — none on the team as of 2026-10-10*
| Grid spacing | First-try success (n/20) | Pinch-to-sound latency median / max (ms) |
|---|---|---|
| 3 cm | _tbd_ | _tbd_ |
| 4 cm | _tbd_ | _tbd_ |
| 5 cm | _tbd_ | _tbd_ |
Chosen cell size / hit radius: _tbd_ (smallest spacing with ≥90%; provisional 4 cm until then). Decision logged in DECISIONS_LOG.
