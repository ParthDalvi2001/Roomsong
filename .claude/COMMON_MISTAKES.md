# Common mistakes — read before your first commit (all of these have already cost us time)

1. **Uncommitted work is lost work.** On 2026-10-10 a usage limit killed three agents mid-task. Commit after every milestone (WIP commits are fine).
2. **Agents cannot push `main`, edit `.claude/settings.json` or `~/.ssh`, or install plugins.** The session's safety layer refuses. Do not look for a way round: put the exact command for Parth in your report.
3. **`npm install` fails with EACCES** on the default cache. Use the `--cache` flag from `.claude/QUICK_START.md`. Never `sudo`.
4. **No runtime network.** The IWSDK starter scene fetched models from a CDN; that breaks Golden Rule 9 and makes e2e flaky. Nothing in `src/` or `public/` may load from another host.
5. **Specs win over code.** Change `API_SPEC.md` first. Until T-113 is merged, `specs/08-status/PLAN_AMENDMENT_2026-10-10.md` §6 overrides older numbers (bed centre 0.45 m, pinch thresholds, one reverb, equal-power panners).
6. **Modes are pentatonic sets** (`majorPent`, `minorPent`, `susPent`). `dorianHex` / `lydianHex` are cut (D-025): their adjacent rings clash.
7. **Never report device behaviour as verified.** There is no headset; say "emulator" every time.
8. **`rm -rf` is denied** by project settings. Use a fresh directory name or `git worktree remove`.
9. **Do not read huge files whole** (`package-lock.json`, the 257 KB research report). Grep, or read the section you need.
10. **Agent worktrees start from `main`, not `develop`.** First command in a fresh worktree: `git merge --ff-only develop`. Stop any dev or preview server you start; a leftover one served a stale build for hours.
11. **The IWSDK entry file is `src/index.ts`**, not `main.ts`; `npm run dev` is `iwsdk dev up --foreground`.
