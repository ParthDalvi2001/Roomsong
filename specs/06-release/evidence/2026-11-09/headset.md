# Headset results of 7–8 Nov 2026 (evidence row 4)

**Source (not copied):** [TEST_PLAN §4.6](../../../05-testing/TEST_PLAN.md), "Device status, 9 Nov 2026 (T-188)", one line
per TC-DEV row and the "Still to run" list; written in f362cac (T-188), last changed fe454fa (9 Nov).

| Run | Headset | Build | Who |
|---|---|---|---|
| 7 Nov | Quest 3S, OculusBrowser 156 | the dev server over the LAN with the recorder (`?rec=1`) | Parth |
| 8 Nov | Quest 3 | the live site, build 4bc6c7c | Chinmay |

- **Seen working on a headset:** Enter with hands (immersive-ar with hand tracking), seeds, planting, sound, save and
  reload, pulls and moves, settings orb, Listen and wake, Exit and re-entry, the daily seed, one-hand mode, room tuning
  after Space Setup (table 0.56 m, 8 walls, ceiling 2.18 m → minorPent, key 2), about 90 fps; 3 seeds planted 35 s
  after Enter (7 Nov, the first at 18.5 s) and by 62 s (8 Nov).
- **Bugs these runs found and fixed:** BUG-021 to BUG-033 ([BUG_LOG](../../../05-testing/BUG_LOG.md)).
- **Not on a headset yet** (the full list is TEST_PLAN §4.6 "Still to run"): the undo petal, a move by sight, a
  hands-free run, a brand-new garden's tutorial, Day 2, the built page's start time and frame rate on the 3S, "No room
  scan", the `?access=` links, the BUG-040 fix, hands out of view mid-move, two rooms by ear, the pinch and capability
  pages, and every 9 Nov merge.
- **Next:** [HEADSET_RUN_2026-11-10.md](../../../05-testing/HEADSET_RUN_2026-11-10.md) (31cfe6e, 312af09), on the
  live site once Parth has pushed `main`; its results go back into TEST_PLAN §4.6 (evidence row 7).
