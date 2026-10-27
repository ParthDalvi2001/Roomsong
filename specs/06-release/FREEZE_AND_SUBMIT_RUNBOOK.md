# Freeze and Submit Runbook — Roomsong (T-183, T-185, T-187)

**Status:** Approved for use · **Owner:** devops-engineer · **Written:** 2026-10-27
The click-by-click order for the code freeze (15 Nov) and the submit day (17 Nov). The rules behind each step are in
[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) (cited as "Guide §n"); this file does not repeat them.
**Parth** pushes `main`, pushes tags and clicks GitHub, Netlify and Devpost. **Claude** prepares `develop`, checks and
records. Claude never pushes `main` and never creates or pushes a `v1.0.0*` tag (AUTOPILOT §1/§5).

| When | What | Task |
|---|---|---|
| 15 Nov, by 23:59 IST | Code freeze: `v1.0.0-rc1` on Pages and Netlify, the same build on both | T-183 |
| 16 Nov | UAT on the live link, go/no-go (SUBMISSION_CHECKLIST §4) | T-184 |
| 17 Nov, by 12:00 IST | Tag `v1.0.0-submission`; Chinmay submits by 18:00 IST; lock | T-185 |
| 18 Nov 12:00 PT (19 Nov 01:30 IST) → 11 Dec | Deadline, then judging: no change to either link | T-187 |

`<mirror>` below is the Netlify address, for example `https://roomsong.netlify.app` (Guide §1.2; D-060).
All Terminal commands run in `~/Documents/test-pro/Roomsong`.

---

## 1. Code freeze, 15 Nov (T-183)

### 1.1 Ready on `develop` (Claude)
1. Guide §4 step 1: the `develop` commit has a green `ci` run (verify, e2e, audit); BUG_LOG has no open S1/S2.
2. Guide §4 step 2: `package.json` `version` = `1.0.0` (it stays `1.0.0` for every rc and the submission: the
   `commit` in `version.json` tells the builds apart); the `v1.0.0-rc1` entry in `RELEASE_NOTES.md`.
3. Claude asks Parth's go, Parth pushes `develop`, and Claude waits for its `ci` to go green. A red step that is a known
   timing test on GitHub's machines (`VineRenderer.heap`, `HandSystem` "no allocation", `08-landing` TC-E2E-11):
   run page → **Re-run failed jobs**, once. Red again: stop and tell Claude.
4. Claude writes the green commit's full hash in PROGRESS.md. Call it `<C>`. Nothing more is committed to `develop` until
   step 1.2.1 is done.

### 1.2 Publish to Pages (Parth)
1. Terminal: `git fetch origin && git checkout main && git merge --ff-only <C> && git push origin main && git checkout develop`
2. github.com/ParthDalvi2001/Roomsong → **Actions**. Wait for the `deploy` run of `<C>` to go green (about 3 minutes;
   `ci` runs beside it). Red: §5.
3. Open `https://parthdalvi2001.github.io/Roomsong/` and check the landing page shows.

### 1.3 Tag the freeze (Parth)
1. Terminal: `git tag -a v1.0.0-rc1 -m "Code freeze" <C> && git push origin v1.0.0-rc1`
   A tag is a label: it publishes nothing (Guide §5).

### 1.4 Put the same build on Netlify (Parth, the same day: the build is kept for 1 day, Guide §1.2)
1. Actions → the green `deploy` run → scroll to **Artifacts** → click **github-pages**. It downloads `github-pages.zip`.
2. Make a folder `~/Roomsong-release/v1.0.0-rc1/` and move the zip into it. Double-click the zip: it gives
   `artifact.tar`. Double-click that: it gives a folder (`artifact`) with `index.html`, `assets`, `proto`, `LICENSES`
   and `version.json` in it. That folder is the site.
   (Terminal instead: `cd ~/Roomsong-release/v1.0.0-rc1 && mkdir site && tar -xf artifact.tar -C site`.)
3. **First time only:** app.netlify.com → **Add new project** (older screens: "Add new site") → **Deploy manually** →
   drag the site folder onto the box. When it says Published, Project configuration → **Change project name** →
   `roomsong` (or the nearest free name). Send Claude the address.
   *Never use "Import from Git":* Netlify would build on its own, with no `version.json` and another `builtAt`, so it is
   not the same build (Guide §1.2 step 1). If a project was made that way already: Project configuration → General →
   Danger zone → **Delete project**, then do this step.
4. **Every later upload:** the project → **Deploys** → drag the site folder onto "Drag and drop your project output
   folder here".
5. Netlify's free plan has a monthly allowance and every upload uses some of it: upload only the builds this file names.

### 1.5 The same build on both links (Parth, from his phone on mobile data, Wi-Fi off; Claude repeats from the Mac)
1. Open both, on the phone:
   - `https://parthdalvi2001.github.io/Roomsong/version.json?nocache=1`
   - `<mirror>/version.json?nocache=1`
2. Both show the same `commit` and the same `builtAt`, and `commit` = `<C>`. Pages may show the old file for about 10
   minutes after a deploy; change the number after `nocache=` or wait.
3. Claude checks the same from the Mac against the tag: `git fetch origin --tags && git rev-parse 'v1.0.0-rc1^{commit}'`
   must print the `commit` of both links. Claude records the result in PROGRESS.md (T-183).
4. Both landing pages open; `/Roomsong/proto/pinch/` and `/Roomsong/proto/spike/` open too (Guide §1.1 step 5).

### 1.6 Uptime watch (Parth, once; T-187)
1. `uptime.yml` is on `main` already (it came with the go-live push; Actions → **uptime** lists runs on `main`). It stays
   there: GitHub runs schedules from `main` only.
2. Settings → Secrets and variables → Actions → **Variables** tab → **New repository variable** → Name `MIRROR_URL`,
   Value `<mirror>/` → Add variable.
3. Actions → **uptime** → **Run workflow** → Branch `main` → Run. It goes green and its log shows two lines ending in
   "200, Roomsong", one per link. "no mirror yet" means step 2 is missing.

### 1.7 Evidence (Guide §8)
1. Parth: a screenshot of the green `deploy` run, and `github-pages.zip`, into `specs/06-release/evidence/v1.0.0-rc1/`
   (the zip is git-ignored: also copy it to the offline drive).
2. Claude: both `version.json` files as served into the same folder; the build hash into `RELEASE_NOTES.md`; commit on
   `develop`.

### 1.8 An S1 fix after the freeze (the only change allowed, Guide §5)
Fix on `develop`, then 1.1 to 1.7 again with `rc2` (then `rc3`…). Both links get the new build; the old rc stays
tagged. Nothing but S1 fixes is merged after 15 Nov.

---

## 2. Submit day, 17 Nov (T-185)

1. **Nothing new is built today.** Claude checks once more that both links serve the last rc (§1.5 with that tag) and
   that `origin/main` is that commit: `git fetch origin && git rev-parse origin/main`.
2. Parth, by 12:00 IST, on the commit both links serve:
   `git tag -a v1.0.0-submission -m "Submitted build" <the last rc's commit> && git push origin v1.0.0-submission`
3. Chinmay submits on Devpost by 18:00 IST (SUBMISSION_CHECKLIST §2 and §4): the Pages URL in the build link field,
   `<mirror>` in the description, the short hash (first 7 characters of `commit`) as the build hash.
4. Straight after: SUBMISSION_CHECKLIST §5, the post-submission smoke test from a private window on another device
   or network.
5. Lock (§3) the same evening.
6. Evidence: Guide §8, the submission row (tag, zip, `specs/` snapshot, video, Devpost confirmation screenshot) into
   `specs/06-release/evidence/submission/` and the offline drive.

## 3. Lock (Parth, 17 Nov after submitting; Guide §5)
1. Settings → Branches → **Add classic branch protection rule** → Branch name pattern `main` → tick **Lock branch** and
   **Do not allow bypassing the above settings** → Create. A push to `main` now fails, so nothing deploys.
2. Settings → Environments → **github-pages** → tick **Required reviewers** → add `ParthDalvi2001` → leave
   "Prevent self-review" unticked → **Save protection rules**. A manual deploy now waits for his click.
3. Actions → **deploy** (left list) → **⋯** (top right) → **Disable workflow**. The second lock; it is undone from the
   same menu (§5, after the deadline).
4. Netlify: no upload from now on. Leave the project as it is.
5. The repository is public, so 1 and 2 are on the free plan. If GitHub refuses either, 3 alone is the lock.
6. Claude records the lock with its time in DECISIONS_LOG and PROGRESS.md.

## 4. From the deadline to 11 Dec (golden rule 10)
- No push to `main`, no deploy, no Netlify upload, no settings change on either link. Work on `develop` may go on: it
  publishes nothing.
- The `uptime` workflow checks both links daily; a failed run emails Parth. The daily `version.json` check by hand and
  what to do if a link is down: Guide §6.

---

## 5. If a deploy fails
| What you see | What to do |
|---|---|
| `deploy` → step "Run actions/deploy-pages" → "Creating Pages deployment failed … Not Found" | Pages is off. Settings → Pages → Source: **GitHub Actions**, then the run page → **Re-run all jobs** |
| "Branch "main" is not allowed to deploy to github-pages" | Guide §1.1 step 6, then **Re-run all jobs** |
| `build` → "Run npm run verify" red on a timing or heap test (`… allocate nothing`, `expected 0.10… to be less than 0.1`) | GitHub's machines are slower than the Mac. **Re-run failed jobs**, once. Red again on the same test: stop, tell Claude (BUG_LOG) |
| `build` red on anything else | Stop. Nothing was published; the site still serves the last good build. Claude fixes on `develop` (Guide §7, before the deadline) |
| `deploy` says "Waiting" with a **Review deployments** button | The lock of §3 step 2 is on. Click it → tick github-pages → **Approve and deploy**, only if this deploy is meant |
| Netlify upload fails, or the mirror's `version.json` differs from Pages' | Drag the same site folder again (§1.4 step 4). The Pages artifact is gone after 1 day: the copy in `evidence/<version>/` is the one to upload |
| The artifact is gone and there is no copy | Actions → deploy → **Run workflow** → Branch `main` (a rebuild: the same `commit`, a new `builtAt`, Guide §2), then §1.4 and §1.5 for both links |
| Pages' `version.json` still shows the old commit | Wait 10 minutes and use a new `nocache=` number; Settings → Pages shows when the site was last deployed |
| A link is down after the deadline | Guide §6 only: the identical build, Parth's approval, a log entry. Undo §3 step 3 first if `deploy` must run, and redo it after |
