# Decisions waiting for Parth

**The one file for every open decision.** All 21 questions of 25 Oct are answered (DECISIONS_LOG D-060). What is left are things only you can do; tick them off by replying with the number and "done".

## 1. Put the game online (about 10 minutes)
1. On github.com/ParthDalvi2001/Roomsong: **Settings → Pages → Source: GitHub Actions**.
2. In Terminal, in the Roomsong folder: `git checkout main && git merge --ff-only develop && git push origin main && git checkout develop` (I never push `main` myself).
3. Actions tab → deploy → **Run workflow** on `main` (the last run on main failed on a flaky test before Pages was on; run it again once if it flakes), wait for green, then open https://parthdalvi2001.github.io/Roomsong/
4. If deploy says the branch is not allowed: Settings → Environments → github-pages → allow `main`, then Actions → deploy → Run workflow.
5. Netlify mirror: by hand, from the deploy's own build, so both links serve the same files: `specs/06-release/FREEZE_AND_SUBMIT_RUNBOOK.md` §1.4 (not "Import from GitHub": that rebuilds without version.json). Send me the address it gives.
Reply **"2 done"** with the Netlify address.

## 2. Register for Playtest & React, 29 Oct 22:30 IST
Chinmay registers with his Meta Start account (Devpost → the competition → Webinars & Office Hours tab) and joins with the live link. Reply **"3 done"**.

## 3. Chinmay's Start Member screenshot, by 31 Oct
Ask him for a screenshot of the "Start Member" label next to his name on the Meta Developer Forum. Reply **"5 done"**.

## 4. Listen to style B once
https://localhost:8093/proto/styles/ in Chrome (Advanced → Proceed), tick "full garden", play B for a few minutes. Reply "B good" or what to change.

## 5. G2 review, 15 minutes (by 3 Nov)
Read `specs/08-status/G2_REVIEW_2026-11-03.md` §6: six questions with ★ recommendations; reply with numbers or "all recommended". Suggested verdict: conditional pass.

## 6. Two lines of the Devpost form (with Chinmay)
- **Target launch:** proposed "Store launch: early 2027" (copy) and "Early 2027 on the Quest store, as a web app" (form). Reply "6 ok" or your words.
- **"What excites us about VR":** must be in your and Chinmay's own words; a few sentences. Write it in the reply.

## Later
- **The headset:** tell me when you borrow one; the 1-hour script (`specs/05-testing/DEVICE_SCRIPT_S1.md`) is ready.
- **Headset day:** which room and table (at least 75 cm deep), results by mail or USB, keep it overnight?
- **12 Nov, the feature freeze:** v0.5.0 by A (you merge main and tag, the freeze build goes public) ★ or B (say "go", I tag develop, no deploy); and the self-score decision (≥ 8 is out of reach without a headset). `FEATURE_FREEZE_PREP_2026-11-12.md` §5–§6.
