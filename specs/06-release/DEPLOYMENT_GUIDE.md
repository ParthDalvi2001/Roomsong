# Release & Deployment Guide — Roomsong

**Status:** Approved · **Owner:** devops-engineer
Environments: Local → Production (`main` → GitHub Pages) plus a mirror of the same build (D-022). There is no hosted staging (T-108; §3). `main` = release, pushed only by Parth; `develop` = work. Rollback: §7.
**State on 2026-10-11:** the workflows are merged (T-108 preparation, `develop` 698ff68 + 408f3fd) and proven locally only; they have never run on GitHub. Pages is not enabled and the mirror host is not chosen: both wait for Parth (PROGRESS → Blocked on human).

---

## 1. Hosting decision (D-022, 2026-10-10; ADR-004)
- **Submitted URL: GitHub Pages**, `https://parthdalvi2001.github.io/Roomsong/`. It is a sub-path, and Pages paths are case-sensitive: capital `R`. The rule text names a "GitHub page" for WebXR links, and WebXR needs HTTPS, which Pages gives.
- **Mirror: Vercel or Netlify** (Parth picks; not chosen yet), serving **the same build**, as insurance against an outage or a wrong link. It is named in the Devpost description, not in the build-link field (SUBMISSION_CHECKLIST §2).
- **Branches** (repository on GitHub, D-018): `main` is release, `develop` is work. Every deploy is a push to `main`, published by GitHub Actions (§2). Agents never push `main`.
- **Same-build proof:** every published build carries `version.json` = `{ version, commit, builtAt }` (`scripts/write-version.mjs`). The same `commit` and `builtAt` on both links prove one build; `commit` equal to `git rev-parse main` proves which one.
- **No secrets, no server.** Assets use a relative base (`base: './'` in `vite.config.ts`), so one `dist/` works under `/Roomsong/` and at a mirror's root with no per-host setting. There is no service worker (*Cut (D-011)*).
- **PoC D1 (pending go-live):** the build from `main` loads at the Pages URL with no 404 and without `SharedArrayBuffer` (Pages cannot send the COOP/COEP headers that it needs).
- *Superseded (D-022, T-108):* the comparison of GitHub Pages, Vercel and Netlify that stood here, the `gh-pages` branch, the `/staging/` path, the `v*` tag trigger and `scripts/deploy.mjs`. None of them is in the repository.

### 1.1 GitHub Pages go-live, first time (T-108; was "Option A")
The order matters. Step 1 needs Parth's go; steps 2, 3 and 6 are his to do.
1. Push `develop`; wait for a green `ci` run in the Actions tab. This is the dry run on GitHub's Linux machines.
2. github.com/ParthDalvi2001/Roomsong → Settings → Pages → Source: **GitHub Actions**. Do this **before** `main` is pushed.
3. Parth: `git checkout main && git merge --ff-only develop && git push origin main && git checkout develop`.
4. Actions tab: wait for `ci` and `deploy` to go green.
5. Open the site and `https://parthdalvi2001.github.io/Roomsong/version.json`: `commit` must equal `git rev-parse main`. Open `/Roomsong/proto/pinch/` and `/Roomsong/proto/spike/` too.
6. If `deploy` says the branch is not allowed: Settings → Environments → `github-pages` → Deployment branches → allow `main`, then Actions → deploy → Run workflow → Branch: `main`. Leave **only** `main` allowed (§2, manual runs).

Do the first push days before the link is needed. Not proven until that first run: the Linux runner (WebGL2 on software rendering, speed) and that the `github-pages` environment accepts `main`.

### 1.2 Mirror (Vercel or Netlify; was "Option B — Vercel"; not set up yet)
1. Parth creates the account and names the host (T-108). No Git link and no build on the host: a mirror that rebuilds has another `builtAt` and is not the same build.
2. The mirror gets the `dist/` that Pages got: the `github-pages` artifact of the `deploy` run (Actions → the run → Artifacts). The upload action keeps it **1 day** by default and `deploy.yml` does not raise that, so download it the same day.
3. Unpack it and upload the folder as a static site, with no build step. Nothing in the repository does this yet; the exact commands are written here once the host is chosen.
4. Check: `<mirror>/version.json` equals `https://parthdalvi2001.github.io/Roomsong/version.json`, field by field.
5. After submission nothing is uploaded again (§5).

## 2. Workflows (merged with T-108)
Read the files: they are short and commented. This section says what they do, not how.
| File | Runs on | Does |
|---|---|---|
| `.github/workflows/ci.yml` | push and pull request to `develop` or `main` | `npm ci` → `npm run verify` → `npx playwright install --with-deps chromium` → `npm run test:e2e` → `npm run audit`. A failed run keeps the Playwright report as an artifact for 7 days |
| `.github/workflows/deploy.yml` | push to `main`; by hand (Actions → deploy → Run workflow) | job `build`: `npm ci` → `npm run verify` → `node scripts/write-version.mjs` → upload `dist/` as the Pages artifact. Job `deploy`: publishes that artifact to the `github-pages` environment, only when the run is on `main` |
| `scripts/write-version.mjs` | inside `deploy`, after the build | writes `dist/version.json` = `{ version (from package.json), commit (git rev-parse HEAD), builtAt (ISO time) }`; fails if `dist/index.html` is missing |

- `npm run verify` = typecheck, lint, unit tests, build, `scripts/check-dist.mjs` (page policy and remote URL strings, SECURITY_PLAN §5; licence texts present, no code of `@drawcall/uikitml`) and `scripts/check-size.mjs` (first load ≤ 4000 kB gzip, FR-SYS-06). `npm run audit` = `npm audit --omit=dev --audit-level=high`; CI runs it, verify does not.
- **Licences in the build (T-171; THIRD_PARTY_LICENSES.md).** `vite.config.ts` swaps `@drawcall/uikitml` (no licence) for `build/stubs/uikitml.js`, a stub whose functions throw `UIKitMLRemovedError`, and writes `dist/LICENSES/`: the licence file of each package whose code ships, read from `node_modules`, plus the texts committed in `LICENSES/`. The site publishes them at `/Roomsong/LICENSES/`.
- Node comes from `.nvmrc` (`24`). Action pins, majors only, all confirmed to exist on 2026-10-10: `actions/checkout@v5`, `actions/setup-node@v5`, `actions/upload-pages-artifact@v4`, `actions/deploy-pages@v4`, `actions/upload-artifact@v4`. The last two still declare Node 20: bump them if a runner refuses them.
- Permissions: `contents: read` everywhere; only the `deploy` job has `pages: write` and `id-token: write`. No secrets: Pages uses the built-in token.
- One deploy at a time; a running one is never cancelled, so the site is not left half published.
- **`deploy` does not wait for `ci`.** It runs verify itself, but not the e2e suite and not the audit. Merge into `main` only a `develop` commit whose `ci` run is green.
- **A manual run builds the branch chosen in the Run workflow box,** which opens on the default branch, `main`. The `deploy` job publishes only when the run is on `main` (`if: github.ref == 'refs/heads/main'`); a run from another branch builds and publishes nothing. The `github-pages` environment's branch rule is a second guard (§1.1 step 6).
- A manual run is a **rebuild** of that commit: the same `commit`, a new `builtAt`.
- The Pages upload drops dotfiles, so a `.well-known/` folder would not ship.
- Published with the app, from the same build: the device test pages `/Roomsong/proto/pinch/` (TC-DEV-00) and `/Roomsong/proto/spike/` (TC-DEV-0A). Their device scripts are `proto/pinch/README.md` and `proto/spike/README.md`. The garden preview `/Roomsong/proto/bed/` (T-125) is published the same way; it is a flat page for looking at the bed, plants and tide, not a device test.
- *Superseded (T-108):* the YAML that stood here (checkout and setup-node `@v4`, Node 22, a `v*` tag trigger, `scripts/size-check.mjs`, a `/staging/` build), and `scripts/deploy.mjs` with the `deploy:staging` / `deploy:prod` npm scripts, which are deleted.

## 3. Staging (superseded by T-108: there is no hosted staging)
A push to `develop` runs `ci` and publishes nothing. To look at a production build before a release:
1. `npm run build && npm run preview`. It prints a `Network:` address (HTTPS, self-signed certificate, port 4173 or the next free one).
2. Headset on the same Wi-Fi, when one exists: open that address and accept the certificate once. Until then: Chrome with the Immersive Web Emulator extension (not yet tried against the built page's Content Security Policy).
3. Run UAT-01 and record the result in PROGRESS.md as emulator or device.

The first hosted copy of any change is production. The device test pages can be run from this LAN address before go-live (`proto/spike/README.md` step 1).

## 4. Production release procedure
1. All of: the `ci` run of the `develop` commit to release is green (verify, e2e, audit); device suite TC-DEV-01..09 passed **(requires headset — in Emergency mode record them as unverified, per TEST_PLAN §2)**; BUG_LOG open S1/S2 = 0.
2. On `develop`: set `version` in `package.json` (it is what `version.json` reports) and update `RELEASE_NOTES.md` (version, date, changes, known issues).
3. Human approves: *"Deploy vX.Y.Z to prod"*.
4. Parth: `git checkout main && git merge --ff-only develop && git push origin main && git checkout develop` → `deploy.yml` publishes.
5. Verify from a **second device/network**: the URL loads, enters XR (on a headset, when one exists), and `commit` in `/Roomsong/version.json` equals `git rev-parse main`.
6. Tag that commit: `git tag -a vX.Y.Z -m "..." <commit> && git push origin vX.Y.Z`. A tag is a label: it deploys nothing. `v1.0.0*` tags need Parth's explicit approval.
7. Mirror: §1.2 steps 2–4, the same day.
8. Record evidence (§8) and write the build hash into `RELEASE_NOTES.md`.

## 5. Freeze policy (contest rule: no changes after the deadline)
Tags mark commits on `main`; none of them triggers a deploy (§2).
- **Feature freeze:** 2026-11-12 → tag `v0.5.0` (T-169).
- **Code freeze:** 2026-11-15 23:59 IST → tag `v1.0.0-rc1`; publish to Pages **and** the mirror; check from a second device or network that `version.json` is the same on both links (T-183). Only S1 fixes after this, each re-tagged (`rc2`…) and published to both.
- **Submission tag:** `v1.0.0-submission` on 2026-11-17 by 12:00 IST, on the commit that both links serve (T-185) → **lock**:
  1. Settings → Branches → protect `main` (lock it: no pushes). No push to `main` means no automatic deploy.
  2. Settings → Environments → `github-pages` → Required reviewers: Parth. A manual run then waits for his click.
  3. Mirror: no upload after this point.

  Both settings live on github.com, not in the repository, and have not been tried; whether they are free depends on the repository's visibility and plan. Check at go-live.
- From 2026-11-18 12:00 PT through 2026-12-11: **no production deploys** on either link, no content changes, no "quick fixes". Work may continue on `develop`: it publishes nothing.
- *Superseded (T-108):* protecting `gh-pages`, disabling a tag trigger, and post-contest staging under `/staging/`.

## 6. Uptime during judging (2026-11-18 → 2026-12-11; T-187)
- **Both links, daily:** `curl -fsS https://parthdalvi2001.github.io/Roomsong/version.json` and `curl -fsS <mirror>/version.json`. Both answer, and both show the submitted `commit`.
- `.github/workflows/uptime.yml` is built (`uptime.yml`, 25 Oct): daily, HTTP 200 and the page title on both links, a failed run emails the owner (no issue is opened); it does not compare `version.json`'s `commit`, which stays the by-hand check of bullet 1; the mirror is the repository variable `MIRROR_URL`. GitHub runs schedules from the default branch only, which is `main`: `uptime.yml` must be on `main` before the submission lock.
- Human also opens the Pages URL on the headset twice a week (when one exists).
- If the Pages link is down:
  1. Check the mirror. If it is up, the entry is still reachable through the link in the Devpost description; point the README link at it.
  2. Publish `main` again: Actions → deploy → Run workflow → Branch: `main`, with Parth's approval. This is a rebuild of the submitted commit (§2): the same `commit`, a new `builtAt`.
  3. Log it in DECISIONS_LOG with times. Never change code.
- **Open (plan owner):** the workflow cannot publish the identical artefact again after one day, because the `github-pages` artifact has expired (§1.2). The mirror holds the identical `dist/`; the Pages route is a rebuild.

## 7. Rollback
`deploy.yml` builds the head of the branch it runs on, publishes only from `main`, and has no `ref` input. *Superseded (T-108):* "redeploy the previous tag via `workflow_dispatch` with a `ref` input, added in T-006".
- **Before the deadline:** `git revert` the bad commit on `develop`, wait for a green `ci`, then §4 steps 3–5. `main` only moves forward: no force-push, no moved tag.
- **After the deadline:** no rollback. Only §6.

## 8. Evidence to keep (contest: "retain a copy of your entry")
- Per release, under `specs/06-release/evidence/<version>/` (the folder is created at the first release): `version.json` as served by both links, a screenshot of the `deploy` run, and a zip of the published `dist/` (the downloaded `github-pages` artifact). Zips and videos there are git-ignored: keep them on Parth's machine and in one offline copy.
- Submission: Git tag `v1.0.0-submission` + that zip + a `specs/` snapshot + the video file + the Devpost confirmation screenshot → `specs/06-release/evidence/submission/` and the offline copy.
