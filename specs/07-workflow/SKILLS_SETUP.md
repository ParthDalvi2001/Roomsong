# Skills, Plugins & MCP Setup — What Claude Uses at Each Stage

**Status:** Living · **Owner:** devops-engineer
Section 1 installs everything once. Section 2 is the checklist. Section 3 maps every stage/task type to the skills Claude must load. Section 4 maps skills to agents.

---

## 1. Install (one-time, run from the repo root)

### 1.1 Already installed on this machine (verified 2026-10-09)
Plugins: `agent-skills@addy-agent-skills`, `frontend-design@claude-plugins-official`, `impeccable`, `ui-ux-pro-max`, `fastapi-skills` (not needed), `gsap-skills` (not needed), `genjutsu`.
User skills: `archify`, `design-dna`, `motion-design`, `threejs-fundamentals/geometry/materials/shaders/lighting/textures/loaders/animation/interaction/postprocessing`.
Built-ins: `code-review`, `simplify`, `security-review`, `browser-testing-with-devtools` (via agent-skills), `claude-api` (not needed).

### 1.2 Meta VR tooling (required)
```bash
# metavr CLI: device management, docs search, perf tooling, screenshots, MCP server
curl -fsSL https://developers.meta.com/horizon/install-cli/ | sh
exec $SHELL -l && metavr --version && metavr update
metavr mcp install claude-code          # registers the metavr MCP server (40+ tools) for Claude Code
```
Inside Claude Code (interactive):
```
/plugin marketplace add meta-quest/agentic-tools
/plugin install meta-vr@meta-vr
```
This installs the `hz-*` and `metavr-cli` skills (full list: https://github.com/meta-quest/agentic-tools).

### 1.3 IWSDK agent tooling (after T-004 scaffold)
```bash
npx @iwsdk/cli adapter sync             # writes .mcp.json with iwsdk-runtime (+ metavr, + iwsdk-reference if installed)
npm i -D @iwsdk/reference && npx @iwsdk/cli reference warmup   # optional: local IWSDK API reference MCP
```
Enable AI in `vite.config.ts` per https://iwsdk.dev/ai/. Start with `npm run dev` (collaborate mode) or `iwsdk dev up --mode agent` (*superseded (T-107): e2e is `npm run test:e2e`*).

### 1.4 GitHub CLI (**optional** — only once hosting is chosen, and only if GitHub Pages wins; DEPLOYMENT_GUIDE §1)
```bash
brew install gh && gh auth login          # macOS
winget install GitHub.cli                 # Windows 11 (PowerShell), then: gh auth login
```
Not needed for Phase 0: the repo is local-only (ENVIRONMENT_SETUP §2.1).

### 1.5 Windows 11 note
The metavr installer on Windows is `iwr -useb https://developers.meta.com/horizon/install-cli/windows/ | iex` in PowerShell (ENVIRONMENT_SETUP §1.1); the `/plugin` steps and `npx @iwsdk/cli adapter sync` are identical.

### 1.6 Project skills (already in this repo: `.claude/skills/`)
`autopilot` · `hands-first-audit` · `xr-perf-budget` · `submission-pack`. Nothing to install.

## 2. Checklist (devops-engineer ticks in PROGRESS when done)
- [ ] `metavr --version` prints a version
- [ ] `metavr mcp install claude-code` done; `/mcp` in Claude Code lists `metavr`
- [ ] `/plugin install meta-vr@meta-vr` done; `hz-quest-verify-first` appears in the skills list
- [ ] `.mcp.json` contains `iwsdk-runtime` (after scaffold)
- [ ] `gh auth status` OK — *optional; only once GitHub Pages is chosen as hosting*
- [ ] `.claude/agents/*.md` (9 agents) and `.claude/skills/*` (4 skills) present
- [ ] Immersive Web Emulator extension installed in Chrome (emulator-first; ENVIRONMENT_SETUP §6)

## 3. Stage → skills map (Claude loads these automatically per task type)

| Stage / task type | Load these skills (in this order) | Notes |
|---|---|---|
| Session start / any task | `agent-skills:using-agent-skills` (meta), then the row below | |
| Writing/updating specs (BRD/PRD/SRS/stories) | `agent-skills:spec-driven-development`, `agent-skills:idea-refine` | product-owner |
| Planning / backlog / splitting | `agent-skills:planning-and-task-breakdown`, `agent-skills:plan` | scrum-master |
| Architecture / HLD / LLD / API | `hz-quest-verify-first`, `hz-iwsdk-webxr`, `agent-skills:api-and-interface-design`, `agent-skills:documentation-and-adrs`, `archify` (diagrams) | architect |
| **Any Quest/WebXR-specific code** | **`hz-quest-verify-first` (mandatory first)**, `hz-iwsdk-webxr`, `metavr-cli` (docs search) | all devs |
| Scaffolding the project | `hz-new-project-creation`, `hz-iwsdk-webxr` | devops |
| Hands / gestures / interaction | `hz-quest-verify-first`, `hz-iwsdk-webxr`, `hz-immersive-designer`, `threejs-interaction`, `agent-skills:test-driven-development`, then **`hands-first-audit`** before closing | frontend/fullstack |
| Room / planes / anchors / placement | `hz-quest-verify-first`, `hz-iwsdk-webxr`, `agent-skills:source-driven-development` | fullstack |
| Rendering / shaders / particles | `threejs-fundamentals`, `threejs-geometry`, `threejs-materials`, `threejs-shaders`, `threejs-lighting`, `threejs-animation`, `motion-design`, then **`xr-perf-budget`** | frontend |
| Audio / sequencer / voices | `agent-skills:test-driven-development`, `agent-skills:source-driven-development` (Web Audio docs), then **`xr-perf-budget`** (audio section) | backend |
| Persistence / growth / room signature (pure logic; seasons *Cut (D-011)*) | `agent-skills:test-driven-development`, `agent-skills:incremental-implementation` | backend |
| Spatial UI / panel / captions / landing | `hz-immersive-designer`, `agent-skills:frontend-ui-engineering`, `ui-ux-pro-max`, `frontend-design`, `impeccable` (critique) | frontend/ux |
| Art direction / palettes / motion | `design-dna`, `frontend-design`, `motion-design`, `impeccable`, `genjutsu:paint` (optional) | ux |
| Accessibility modes | `hz-immersive-designer`, `agent-skills:frontend-ui-engineering`, `hands-first-audit` | fullstack |
| Tests (unit/e2e) / emulator stage | `agent-skills:test-driven-development`, `agent-skills:test`, `browser-testing-with-devtools` (Chrome DevTools MCP), IWSDK `iwsdk-runtime` MCP tools, `hz-xr-simulator-install-and-configure`, `hz-xr-simulator-control` | qa. **Note:** Meta XR Simulator (the `hz-xr-simulator-*` skills) targets **OpenXR apps**; WebXR testing for this project uses **IWER + the Immersive Web Emulator browser extension** (ENVIRONMENT_SETUP §6). Load the simulator skills only to confirm that limit or if a native wrapper is ever considered |
| Debugging a failure | `agent-skills:debugging-and-error-recovery`, `hz-vr-debug` (device only), `hz-xr-simulator-control` (OpenXR only — see above) | any |
| **No device** (status as of 2026-10-10; T-000 open) | **Still apply:** `hz-quest-verify-first`, `hz-iwsdk-webxr`, `iwsdk-runtime` MCP, `browser-testing-with-devtools`, `xr-perf-budget` (draw/tri/JS budgets in the emulator), `hands-first-audit`, `metavr-cli` **docs search only**. **Wait for a headset:** `hz-vr-debug`, `hz-perfetto-debug`, `metavr` device commands (`device list/connect`, `logs`, `screenshot`, perf traces), OVR Metrics. Any result from the first group is tagged **E** (emulator); nothing is "device-verified" until a human report exists | all |
| Performance work | `agent-skills:performance-optimization`, `hz-perfetto-debug`, `metavr-cli` (perf tooling), `xr-perf-budget` | frontend/qa |
| Code review (every PR) | `agent-skills:review` / `code-review`, `agent-skills:code-simplification` / `simplify` | code-reviewer |
| Security | `agent-skills:security-and-hardening`, `security-review` | security-auditor |
| CI/CD / deploy / freeze | `agent-skills:ci-cd-and-automation`, `agent-skills:shipping-and-launch`, `agent-skills:ship`, `agent-skills:git-workflow-and-versioning` | devops |
| Store/PWA prep (post-contest) | `hz-store-pwa`, `hz-store-submit` | devops |
| Submission package | **`submission-pack`** (project skill), `agent-skills:documentation-and-adrs` | product-owner |
| Context hygiene when output quality drops | `agent-skills:context-engineering` | main session |

## 4. Agent → default skills (also listed in each `.claude/agents/*.md`)
| Agent | Always loads |
|---|---|
| product-owner | spec-driven-development, idea-refine, submission-pack |
| scrum-master | planning-and-task-breakdown, autopilot, git-workflow-and-versioning |
| ux-designer | hz-immersive-designer, frontend-design, motion-design, ui-ux-pro-max, design-dna |
| software-architect | hz-quest-verify-first, hz-iwsdk-webxr, api-and-interface-design, documentation-and-adrs, archify |
| frontend-dev | hz-quest-verify-first, hz-iwsdk-webxr, threejs-*, frontend-ui-engineering, xr-perf-budget, hands-first-audit |
| backend-dev | test-driven-development, source-driven-development, incremental-implementation, xr-perf-budget |
| fullstack-dev | hz-quest-verify-first, hz-iwsdk-webxr, incremental-implementation, hands-first-audit |
| devops-engineer | ci-cd-and-automation, shipping-and-launch, hz-new-project-creation, hz-store-pwa |
| qa-engineer | test-driven-development, browser-testing-with-devtools, debugging-and-error-recovery, hz-vr-debug, hands-first-audit |

## 5. MCP servers used
| Server | Provides | Used by |
|---|---|---|
| `metavr` | device list/connect, deploy, logs, screenshots, perf traces (**device commands wait for a headset**), docs search, asset search (usable now) | devops, qa, devs |
| `iwsdk-runtime` | Playwright-managed browser: snapshots, screenshots, emulated XR input (hands/controllers), scene + ECS inspection, reload | qa, frontend, fullstack |
| `iwsdk-reference` (optional) | semantic search over IWSDK API | architect, devs |
| `chrome-devtools` (already configured) | console, network, performance traces, Lighthouse for the 2D landing page | qa |
| `figma` / `stitch` (optional) | wireframe boards | ux |
