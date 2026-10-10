# Release & Deployment Guide — Roomsong

**Status:** Approved · **Owner:** devops-engineer
Environments: Local → Staging (`develop` → `/staging/` or preview URL) → Production (`main` tag → public URL). Hosting: **to be chosen in Phase 1 (by 2026-10-22)** — see §1. Rollback = redeploy the previous tag.

---

## 1. Hosting decision (deferred to Phase 1, by Oct 22)
The repo's remote is GitHub (`ParthDalvi2001/Roomsong`, set 2026-10-10, D-018); hosting is still to be chosen (T-108), with GitHub Pages as the default. The judges need a **public HTTPS URL** (WebXR requires HTTPS), so hosting must be live before G1. All three options are free static hosting with HTTPS; none needs secrets or a server.
| Option | Needs | Staging | Prod | Lock after submission |
|---|---|---|---|---|
| **A. GitHub Pages** (default if chosen; ADR-004) | GitHub repo created + history pushed; `gh` optional; the two workflows in §2; `scripts/deploy.mjs` | `develop` → `/staging/` sub-path | `v*` tag → root | Branch/environment protection on `gh-pages`; disable tag trigger |
| **B. Vercel** | Vercel account; either Git integration (GitHub/GitLab) or `vercel` CLI from the local repo (no GitHub needed) | Every `vercel` deploy = preview URL; `develop` auto-preview if Git-linked | `vercel --prod` (or `main` tag via Git integration) | Disable auto-deploys in the project settings; keep the last prod deployment pinned |
| **C. Netlify** | Netlify account; `netlify` CLI (`netlify deploy --dir=dist`) or Git integration | Deploy previews / branch deploys | `netlify deploy --prod` | Lock the published deploy ("Lock to stop auto publishing") |
Decision criteria: (1) can the human run it without a GitHub account today — B/C yes via CLI, A no; (2) sub-path `base` complexity — A needs it, B/C do not; (3) originality evidence — A gives public history for free, B/C need the local git log + zips. Record the choice in DECISIONS_LOG and fill ENVIRONMENT_SETUP §7. Everything from §2 onward is written for Option A and applies **once hosting is chosen**; §5–§8 apply to any option.

### 1.1 Option A — GitHub Pages one-time setup (T-006; only if chosen)
1. Create the GitHub repo (`roomsong`, public or private; Pages works for both on paid plans; **public recommended** for simplicity and as originality evidence). Push the full local history (`git remote add origin … && git push -u origin main develop --tags`).
2. Settings → Pages → Source: **GitHub Actions**.
3. Branch protection: `main` requires PR + green `verify`; `gh-pages` is written only by CI.
4. Add `.github/workflows/ci.yml` (verify on every PR/push) and `.github/workflows/deploy.yml` (see §2).
5. Vite `base` per env: prod `/roomsong/`, staging `/roomsong/staging/`. (No service worker — *Cut (D-011)* — so only asset paths depend on `base`.)

### 1.2 Option B — Vercel (6-line note; only if chosen)
1. `npm i -g vercel && vercel login`; from the repo root `vercel link` (creates the project; no GitHub needed).
2. Build settings: framework "Other", build `npm run build`, output `dist`; `base` stays `/`.
3. Staging = `vercel` (preview URL per deploy; paste it in PROGRESS); prod = `vercel --prod` after the human's approval, tagged locally first.
4. `version.json` is emitted by the build exactly as in Option A; `ci.yml` (verify/audit/size) runs only if Git-linked, otherwise `npm run verify` locally is the gate.
5. Freeze/lock: project Settings → Git → disable auto-deploy (if linked); never run `vercel --prod` after 2026-11-18 12:00 PT except to re-promote the identical deployment.
6. Uptime: the §6 cron becomes a local/`cron-job.org` check of `<prod-url>/version.json` if no GitHub Actions.

## 2. Workflows — Option A (default if chosen; *once hosting is chosen*)
```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run verify
      - run: npm audit --audit-level=high
      - run: node scripts/size-check.mjs   # fails if dist > 4 MB gz
```
```yaml
# .github/workflows/deploy.yml
name: deploy
on:
  push:
    branches: [develop]      # → staging
    tags: ['v*']             # → production
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: |
          if [[ "$GITHUB_REF" == refs/tags/* ]]; then npm run build -- --base=/roomsong/ ; mkdir -p out && cp -r dist/* out/ ;
          else npm run build -- --base=/roomsong/staging/ ; mkdir -p out/staging && cp -r dist/* out/staging/ ; fi
      # NOTE: Pages deploys replace the whole site. To keep prod + staging together, the job must fetch the
      # current gh-pages content and merge: see scripts/deploy.mjs (T-006) which handles both paths safely.
      - uses: actions/upload-pages-artifact@v3
        with: { path: out }
      - uses: actions/deploy-pages@v4
```
`scripts/deploy.mjs` (T-006) implements: checkout current `gh-pages` → replace only the target path → push. Document its exact behaviour there.

## 3. Staging deploy (daily, automated; *once hosting is chosen*)
Merge to `develop` → CI → staging URL (Option A: `/staging/`; B/C: preview URL). Smoke: open on headset (when available; otherwise in Chrome with the Immersive Web Emulator extension), run UAT-01. Record result in PROGRESS.md.

## 4. Production release procedure (*once hosting is chosen*)
1. All of: `npm run verify` green on `main`; e2e green; device suite TC-DEV-01..09 passed **(requires headset — in Emergency mode record them as unverified, per TEST_PLAN §2)**; BUG_LOG open S1/S2 = 0.
2. Update `RELEASE_NOTES.md` (version, date, changes, known issues, build hash).
3. Human approves: *"Deploy vX.Y.Z to prod"*.
4. `git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z` → CI deploys to root.
5. Verify from a **second device/network**: URL loads, enters XR, hash in `/version.json` matches.
6. Record evidence in `specs/06-release/evidence/<version>/` (screenshot of Pages run, version.json).

## 5. Freeze policy (contest rule: no changes after the deadline)
- **Code freeze:** 2026-11-15 23:59 IST → tag `v1.0.0-rc1`. Only S1 fixes, each re-tagged (`rc2`…).
- **Submission tag:** `v1.0.0-submission` on 2026-11-17 by 12:00 IST → prod deploy → **lock**: protect `gh-pages` from further pushes; disable the deploy workflow on tags until 2026-12-12 (comment out `tags:` trigger in a commit on `develop` only, or use an environment protection rule requiring the human's approval).
- From 2026-11-18 12:00 PT: **no production deploys**, no content changes, no "quick fixes". Staging may continue for post-contest work only on `develop` under `/staging/`.

## 6. Uptime during judging (2026-11-18 → 2026-12-11)
- `.github/workflows/uptime.yml`: cron every 6 h → `curl -fsS <prod-url>/version.json` → fail = notification (GitHub issue auto-created).
- Human also opens the URL on the headset twice a week.
- If down: redeploy the **same tag** (identical artefact) or switch DNS/README link to the Vercel mirror of the same build; log in DECISIONS_LOG. Never change code.

## 7. Rollback (*once hosting is chosen*)
`git checkout vPREV && git tag -f v1.0.0-hotfix-rollback && push` is **not** used after the deadline. Before the deadline: redeploy the previous tag via the deploy workflow (`workflow_dispatch` with a `ref` input, added in T-006).

## 8. Evidence to keep (contest: "retain a copy of your entry")
- Git tag `v1.0.0-submission` + a zip of `dist/` + `specs/` snapshot + video file + Devpost confirmation screenshot → `specs/06-release/evidence/submission/` and an offline copy on the human's machine.
