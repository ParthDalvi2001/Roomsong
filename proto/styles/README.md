# Sound styles: pick one by ear (T-164)

**Status: desktop browser only. Nothing here has been heard on a headset.** Which style wins is Parth's call.

Parth's verdict on the sound was "too boring" (D-051). This page plays one garden through the app's own sound
engine (`src/audio`) in three styles, and you switch between them while it plays. All three share what makes the
garden less boring (`specs/03-design/SOUND_PASS_T164.md` §1 to §3): a swing and accents on every note, a little
human unevenness, an echo in time with the tempo, a filter that slowly breathes, chords that move under the
plants, and soft percussion that comes in as the garden grows. They differ in mood only. Everything is
synthesised in the browser: no samples, nothing loaded from anywhere.

## Open it

1. In the repository folder run `npm run dev` (stop it later with `npm run dev:down`).
2. In Chrome open **https://localhost:8081/proto/styles/**. Accept the certificate warning once (Advanced,
   Proceed).
3. Press **Play**, then press **A**, **B** or **C** at any time. Use headphones or decent speakers.
4. Tick **The fuller garden** for 8 plants of all five voices; untick it for the 3 starter seeds (bell, pad,
   pluck) a first visit starts with. The change is heard from the next notes.
5. Press **Stop**. Play again starts from the first bar.

| Style | In one line |
|---|---|
| **A** | Soft and warm: a felt piano, mellow pads, a gentle swing, a soft kick and shaker. |
| **B** | Bright and glassy: bells and chimes, a tight groove, a high tick and a wooden clave. |
| **C** | Deep and ambient: low pads, slow attacks, long echoes, a slow heartbeat kick. |

The layers take voices from the same 24 as the plants: at a chord change about 6 in A and B (the new chord and
the old one's tail, 4, with the kick and the shaker or tick) and about 7 in C (two overlapping kicks and the
breath). The line under the buttons shows the bar, the voices in use (at most 24, shared by everything), the engine's
time per tick and the plant notes played.

## What to listen for (rate each 1 to 5)

1. **Would you leave it playing for 10 minutes?** That is the pick. Listen to each for at least 8 bars (about
   23 s): the chords go round once in 8 bars (16 in C).
2. **Does it still sound boring?** Compare with the app as it is today (the app has not changed yet: it plays
   today's sound until a style is picked).
3. **The groove**: does it sway, or limp?
4. **The starter garden** (3 plants): the chords and the shaker are there from the start, the kick comes in at
   bar 16 (about 46 s). Does it grow, or does the kick arrive too late?
5. **Anything harsh**: a click, a clang, a boom, the sound pumping in the fuller garden.

The three are levelled to about the same loudness (the plan's page trim: A +1.5 dB, B 0, C −1 dB), so the
louder one should not win for being louder. There is no blind mode: the letters are not shuffled.

## How it works

The page builds the engine (`Engine` from `src/audio/AudioEngine.ts`) in the Play click, tunes it to the
Wanderer signature (C major, 0.9 s reverb) at 84 beats per minute, holds the head still in front of the bed, and
calls `setStyle('A' | 'B' | 'C')` when you press a letter. `setStyle` is not in the contract (API_SPEC §1.2):
after the pick the winner's values become the engine's constants and the switch goes (plan §7 step 8). This page
is never built into the site.

## Checks

`E2E_PORT=8131 npx playwright test 21-styles` loads the page in headless Chromium, plays, switches to B and C and
to the fuller garden, stops, and fails on any console error or request off localhost. Unit tests:
`npx vitest run tests/unit/audio`.
