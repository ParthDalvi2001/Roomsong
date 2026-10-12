# Bed preview (T-125)

**Status: desktop browser and emulator only. Nothing here has been seen on a headset.** How it looks is for
Parth to rate; frame rate on a Quest is unknown.

What the garden will look like, drawn by the app's own renderers (`src/render/`): the ring-shaped bed, 13 sample
plants in the three shapes (bell, pad, pluck) and the tide sweeping at 84 beats per minute. No sound, no hands,
nothing to pinch: it is a picture that moves.

## Open it

1. In the repository folder run `npm run dev` (stop it later with `npm run dev:down`).
2. In Chrome open `https://localhost:8081/proto/bed/`. Accept the certificate warning once (Advanced, Proceed).
3. You are looking at the bed as if seated at the table. Drag to look around, scroll to move closer.
4. The line under the button shows frames per second, draw calls, triangles and script time, once a second.
5. For the same numbers on a panel beside the bed, open `https://localhost:8081/proto/bed/?flags=perfHud`.

## See it in the emulator (the headset view, in the browser)

1. On the same page press the page's own **Enter XR** button, top left under the text.
2. The page seats the emulated head at 1.15 m and points it at the bed, so the bed is in the middle of the
   view, on the emulator's grey table. The view is fixed there; to look around, use the plain view.
3. Leave with the emulator's exit button; the page goes back to the plain view.

## What is not in this preview

Sound; planting, pulling, dragging and removing; the hover cue; the tuning ripple; the halo and Listen mode;
growth with age. The bed is placed 0.45 m ahead at 0.72 m, not on a detected table (that is `room/`, wired in
T-128). The plain view puts the bed on a dark table; over a light table the tide's light is fainter (see the
emulator view).

## Checks

`E2E_PORT=8111 npx playwright test 07-bed` loads the page in headless Chromium with the emulator: plain view and
emulated session, no console error, nothing requested off localhost, a drawn canvas, at most 15 draw calls, and
fixed foveation "medium" asked of the session. A second run fills the bed (`?flags=autoplant=80`) and watches the
flash cap over two bars; a third loads the built page under its Content Security Policy. It saves
`.tmp/bed-plain.png` and `.tmp/bed-emulator.png`. Unit tests: `npx vitest run tests/unit/render`.

Measured in that run (headless Chromium, software rendering, 2026-10-12, after the review fixes; with the HUD
panel on, which is one draw call per eye):

| Garden | View | Draw calls | Triangles |
|---|---|---|---|
| 13 sample plants | plain page | 8 | 5,864 |
| 13 sample plants | emulated session, both eyes | 14 | 11,724 |
| full bed, 80 plants | plain page | 8 | 18,208 |
| full bed, 80 plants | emulated session, both eyes | 14 | 36,412 |
