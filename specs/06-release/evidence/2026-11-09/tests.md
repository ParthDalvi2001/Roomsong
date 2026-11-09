# Test results on 9 Nov 2026 (evidence row 2)

| Suite | Commit | Run | Result | Source |
|---|---|---|---|---|
| Unit, inside `npm run verify` | `develop` df96f04 (the BUG-051 merge, 9 Nov 13:42 IST) | 9 Nov | **1 986 tests pass** | the driving session's verify run on df96f04. PROGRESS "Test status" still shows the 8 Nov run: 1 959 at 1f91c40 |
| Unit, 8 Nov (for comparison) | 1f91c40 | 8 Nov | 1 959 pass; typecheck, lint, build, check-dist, check-size green; audit 0 | PROGRESS "Test status", unit row (2ed6cf7) |
| Browser (Playwright + IWER, the full suite) | 1f91c40 | 8 Nov, 23 min | **132 passed, 1 flaky, 6 skipped** | PROGRESS "Test status", e2e row (2ed6cf7) |
| Coverage | — | 20 Oct | 96.0 % of lines (`npm run test:coverage`) | PROGRESS "Test status" |

- The flaky test: `06-room` T-128c c1 timed out waiting for 2 perf samples in the full run; it passes alone 10 of 10
  ([BUG-039](../../../05-testing/BUG_LOG.md)).
- Not covered here: no full browser run on the 9 Nov merges had finished when this was written (one was running). The
  freeze commit's own results go into `../v1.0.0-rc1/tests.md` (evidence row 18).
- Device results are not test-suite results: see [`headset.md`](headset.md).
