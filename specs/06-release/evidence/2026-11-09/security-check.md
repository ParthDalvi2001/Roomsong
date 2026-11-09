# Security check of 9 Nov 2026 (evidence row 5)

**Source (not copied):** [BUG_LOG](../../../05-testing/BUG_LOG.md) BUG-046 to BUG-048 ("Found by: security check 9 Nov"),
DECISIONS_LOG D-072, API_SPEC v1.2.65 §3 and §4. All three fixes and the stricter build check are in the merge
**e3246ec** on `develop` (9 Nov). None is S1 or S2; open S1/S2 after it: 0.

| Bug | Sev | Finding | Fix (commit) | Checked by |
|---|---|---|---|---|
| BUG-046 | S4 | On the live site a `?dev=1` link with `fakeDay` or `autoplant` saved to the player's real garden (`fakeDay=3650` wrote `lastVisitAt` ten years ahead: no growth and no daily seed until New garden) | A production build saves nothing in a session with `fakeDay` ≠ 0 or `autoplant` > 0; one warning in the log (D-072) — 9b2b690 | unit `app.test.ts` "D-072 (BUG-046)"; emulator 10-persistence, 22-save-restore. Not seen on a headset |
| BUG-047 | S4 | Any message on the BroadcastChannel `roomsong` stopped this tab's saving; github.io is one origin for every Pages project of the account, so another project's page could turn saving off | Only a message whose data is exactly `'opened'` stops it — 9b2b690 | unit `app.test.ts` "BUG-047"; emulator two-tab spec |
| BUG-048 | S4 | The dev server's `/__rec` wrote any request body (up to 1 MB, any method) from any LAN host into `.tmp/headset/rec.jsonl` | Only a POST within 1 MB of recorder lines (numeric `t`, string `kind`) is written, else 400 — e767032 | unit `tests/unit/policy/rec-endpoint.test.ts`; the dev server by hand. Dev only: not in the published site |

**Also from the check:** `scripts/check-dist.mjs` now fails a build that holds recorder code, source maps, `eval(` or
`new Function` in JS, or any file under `dist/proto/` (7e7c931); the licence list got the chunk names of a fresh 9 Nov
build (1f6af96). The standing gates from T-109 (the page's content policy, the no-network and remote-URL sweep,
`npm audit` in verify) still run in every `npm run verify`.
