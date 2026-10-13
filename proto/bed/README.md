# Bed preview (T-125, T-119)

**Status: desktop browser and emulator only. Nothing here has been seen on a headset.** How it looks is for
Parth to rate; frame rate on a Quest is unknown.

What the garden will look like, drawn by the app's own renderers (`src/render/`): the ring-shaped bed, a garden
of sample plants and the tide sweeping at 84 beats per minute. No sound, no hands, nothing to pinch: it is a
picture that moves, with a few switches for the things the app's hands and visits will do.

## Open it

1. In the repository folder run `npm run dev` (stop it later with `npm run dev:down`).
2. In Chrome open `https://localhost:8081/proto/bed/`. Accept the certificate warning once (Advanced, Proceed).
3. You are looking at the bed as if seated at the table. Drag to look around, scroll to move closer.
4. The line under the button shows frames per second, draw calls, triangles and script time, once a second.
5. For the same numbers on a panel beside the bed, open `https://localhost:8081/proto/bed/?flags=perfHud`.

## What to look at (T-119)

1. **Garden** (the list): the 13 sample plants; the five shapes, each on a short, a middling and a tall stem
   (the jug is Bass, the umbrella is Choir); growth, with a reed, a jug and an umbrella at four ages from left
   to right (new, one day, three days, a week); a full bed of all five shapes; an empty bed.
2. **A week passes** (the button): every plant becomes a week older. Each one keeps its look until the tide
   next reaches it, then unfurls: leaf whorls grow on the stem and open into cream blossoms, and the plant
   turns lighter. Choose the garden again to start over.
3. **Bright table**: a white table under the bed. The tide's light has a dark band running just ahead of it,
   so the sweep shows on a white table as well as on a dark one.
4. **The pointer over the bed** stands in for a hand: the ring on the cell under it lights up, which is where
   a seed would land. With **Glow the plant under the pointer** ticked, a plant on that cell is drawn brighter,
   as when an empty hand is about to pinch it.
5. **Dim the nearest plant**: what a plant looks like while the hand that held it is out of view.
6. **Reduced motion**: a plant that grew shows its new stage at once instead of unfurling. Nothing else on
   this page changes with it.
7. **High contrast**: every plant gets a cream outline.

## See it in the emulator (the headset view, in the browser)

1. On the same page press the page's own **Enter XR** button, under the switches.
2. The page seats the emulated head at 1.15 m and points it at the bed, so the bed is in the middle of the
   view, on the emulator's grey table. The view is fixed there; to look around, use the plain view.
3. Leave with the emulator's exit button; the page goes back to the plain view. There is no pointer in the
   session, so no hover cue.

## What is not in this preview

Sound; planting, pulling, dragging and removing; the tuning ripple; the halo and Listen mode. The bed is placed
0.45 m ahead at 0.72 m, not on a detected table (that is `room/`, wired in T-128). The hover, the tint and the
visit are switches here; in the app the hands and the garden call them (T-128d).

## Checks

`E2E_PORT=8111 npx playwright test 07-bed` loads the page in headless Chromium with the emulator. For T-125:
plain view and emulated session, no console error, nothing requested off localhost, a drawn canvas, at most 15
draw calls, and fixed foveation "medium" asked of the session; a full bed (`?flags=autoplant=80`) under the flash
cap over two bars; the built page under its Content Security Policy. For T-119: the tide's crest against its
shade on a dark and on a white table (at least 3 to 1); a full bed of all five shapes, blooming, with a
flickering hover, a glow and a tint, for its draw calls, triangles and the flash cap, in the plain view and in
the session; and the pictures in `.tmp/` (`t119-*.png`, with `bed-plain.png` and `bed-emulator.png`).
Unit tests: `npx vitest run tests/unit/render`.

Measured in that run (headless Chromium, software rendering, 2026-10-12, T-119; with the HUD panel on, which is
one draw call per eye; the plain view also draws the page's table, one more):

| Garden | View | Draw calls | Triangles |
|---|---|---|---|
| 13 sample plants, three shapes | plain page | 8 | 5,876 |
| 13 sample plants, three shapes | emulated session, both eyes | 14 | 11,748 |
| full bed, 80 plants, three shapes | plain page | 8 | 18,220 |
| full bed, 80 plants, three shapes | emulated session, both eyes | 14 | 36,436 |
| full bed, 80 plants, all five shapes, a week old (160 blossoms) | plain page | 11 | 24,868 |
| full bed, 80 plants, all five shapes, a week old (160 blossoms) | emulated session, both eyes | 20 | 49,732 |

Per eye, the bed, the plants and the tide are at most 9 draw calls: the glass and its markers 2, one per shape
that grows on the bed (up to 5), the whorls 1 once any plant is a day old, the tide 1. A session with both eyes
is twice that: 18, and 20 with the HUD panel. That is over the 15 that T-125 set for itself and inside the
budget of 60 (NFR-PERF-03).

Tide, crest against the darkest point of its shade, as a luminance ratio on the plain page: 10.4 on the dark
table, 7.3 on the white one (pass mark 3, UX §9.4). Crest against the bed away from the tide on the white table:
2.5, which is what it was before the shade.
