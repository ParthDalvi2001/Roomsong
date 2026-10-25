# Decisions waiting for Parth

**The one file for every open decision.** All 21 questions of 25 Oct are answered (DECISIONS_LOG D-060). What is left are things only you can do; tick them off by replying with the number and "done".

## 1. Put the game online (about 10 minutes)
1. On github.com/ParthDalvi2001/Roomsong: **Settings → Pages → Source: GitHub Actions**.
2. In Terminal, in the Roomsong folder: `git checkout main && git merge --ff-only develop && git push origin main && git checkout develop` (I never push `main` myself).
3. Actions tab: wait for `ci` and `deploy` to go green, then open https://parthdalvi2001.github.io/Roomsong/
4. If deploy says the branch is not allowed: Settings → Environments → github-pages → allow `main`, then Actions → deploy → Run workflow.
5. Netlify mirror: log in to netlify.com with GitHub, "Add new site → Import from GitHub → Roomsong", branch `main`, build command `npm run build`, publish folder `dist`. Send me the address it gives.
Reply **"2 done"** with the Netlify address.

## 2. Register for Playtest & React, 29 Oct 22:30 IST
Chinmay registers with his Meta Start account (Devpost → the competition → Webinars & Office Hours tab) and joins with the live link. Reply **"3 done"**.

## 3. Chinmay's Start Member screenshot, by 31 Oct
Ask him for a screenshot of the "Start Member" label next to his name on the Meta Developer Forum. Reply **"5 done"**.

## 4. Listen to style B once
https://localhost:8093/proto/styles/ in Chrome (Advanced → Proceed), tick "full garden", play B for a few minutes. Reply "B good" or what to change.

## Later
- **The headset:** tell me when you borrow one; the 1-hour script (`specs/05-testing/DEVICE_SCRIPT_S1.md`) is ready.
- **Headset day:** which room and table (at least 75 cm deep), results by mail or USB, keep it overnight?
