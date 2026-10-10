# Pinch-accuracy test (T-105, TC-DEV-00)

**Status: emulator only. The device run is pending (no headset yet).** Nothing below has been seen on a headset.

It answers two questions, in two runs of about five minutes each on a Quest 3 or 3S:

1. What is the smallest target spacing people hit on the first try? (cell size and hit radius, FR-HND-04)
2. Is the bed's outer ring at 0.30 m hit on the first try? (D-020: keep 0.30 m, or shrink to 0.25 m)

## Device script for Parth

1. On the headset: hand tracking on, and Space Setup done with your table marked as a table.
2. Put the controllers away. Sit at the table with your belly at its edge, facing it.
3. In Meta Quest Browser open `<site>/proto/pinch/`.
4. Pinch **Start**. Allow hand tracking and spatial data if asked. Keep facing the table while it starts.
5. Dots appear on the table about 45 cm ahead. One glows yellow: pinch it, thumb and index finger, either hand.
6. Keep the other hand open or in your lap: if its thumb and finger drift together, that counts as a pinch.
7. One pinch per dot. Do not correct a miss. High tick and green = hit; low tone and red = miss.
8. The next dot lights by itself. Four rounds of 20: grids of 3, 4 and 5 cm, then the real bed ring.
9. A grey dot means the headset lost your hands. Bring a hand back into view and carry on.
10. Do not open the system menu with a pinch: it counts as a pinch. To stop early, pinch the big blue dot on your left.
11. Back on the page: press **Copy JSON** and paste it to Claude, with the headset model and the lighting.
12. Do it all once more at `<site>/proto/pinch/?beta=10` and send that JSON too. This second run is required.

If time allows: a run with `?beta=20`, and one away from any table (floating dots). `?seed=1` repeats the same
dot order. Nothing is sent anywhere; the result exists only on that page.

## Reading the result

**Decide on the "First try unfiltered" column**, or on "First try" of the `?beta=` run where it is highest. Do
not decide on the "Rate" of the first run alone. That run uses the sheet's filter (1 Hz, beta 0), and its judged
point trails a moving hand. Modelled, not measured: after a 30 cm reach of half a second it is about 4 cm behind
100 ms after the hand stops and about 2 cm behind after 200 ms; half the ring gap is 2.25 cm. A brisk pinch then
misses through the filter, not through the size of the bed.

| Look at | Rule |
|---|---|
| "First try unfiltered" of the 3, 4 and 5 cm grids | The smallest spacing with at least 18 of 20 is the cell size we can use. If 5 cm fails too: file an S1 and re-plan the ring (TEST_PLAN TC-DEV-00). |
| The same for the interior dots only | Grid rates flatter the edge dots: on the 3 cm grid an interior dot captures 9.0 cm2, a side dot 16.2 and a corner dot 26.5. Count the interior dots separately: in the JSON `target` is row x 5 + column, and the interior dots have row and column 1 to 3. |
| "First try unfiltered" of "bed outer ring" | At least 9 of 10: the outer radius stays 0.30 m. Fewer: 0.25 m (D-020). With 8 or 9, run it once more. |
| "First try unfiltered" of "bed inner ring" | Fewer than 9 of 10: the inner ring's 4.7 cm spacing is too tight; the fallback is 12 steps (LLD 5.1). |
| "First try" below "First try unfiltered" | That gap is the filter trailing the hand. It is a filter decision (FR-HND-03: the value of beta), not a geometry one, and no reason to shrink the bed or widen the cells. The `?beta=10` run should close most of it. |
| The line under the table | Which surface was used (table, plane or floating) and whether the bed's outer edge fits the 25 by 20 degree guideline from where your head was. |
| Median and max ms, pinch-to-sound | Report only (TC-PERF-07). "n/a" means the browser gave no audio timestamp. |
| `target` of the bed trials in the JSON | It is ring x 16 + step (ring 0 inner, 4 outer). Step 0 is to your right, 4 farthest, 8 left, 12 nearest to you. Misses bunched at steps 10 to 14 mean the near edge is the problem (it is 15 cm from your head, maybe past the table edge), not the far reach. |
| `heightM` of the trials in the JSON | The unfiltered pinch point above the surface. A steady 3 cm or more means the detected plane lies below the real table top. |

A first-try hit: the first pinch that begins 150 ms or more after a dot lights is within 4 cm of that dot,
measured along the surface, and no other dot is nearer. Anything else is a miss; the test moves on either way.
A pinch sooner than 150 ms after the dot lit was not aimed at that dot and is not a trial.

This page judges a joint-distance pinch at its START. The game commits on RELEASE over the hovered cell
(FR-HND-02, FR-HND-16).

## Emulator

`E2E_PORT=8092 npx playwright test 03-pinch` runs the page in IWER: one hit, one miss, the finish dot and the
results in the table room, and the surface choice in a room with a worktop and in a room with no planes. The
emulated hand snaps shut in one frame, which moves its pinch point 7.7 cm; the default filter cannot follow
that, so the test runs with `?beta=100`. `04-built-page-policy` loads the built page under its Content Security
Policy. Unit tests: `npx vitest run tests/unit/proto-pinch`.

Emulator, software rendering: 2 draw calls a frame (one per eye); 832 triangles in a grid block (measured) and
2592 in the bed block (computed: 81 discs x 16 triangles x 2 eyes).
