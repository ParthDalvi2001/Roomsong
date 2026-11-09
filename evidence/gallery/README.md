# Devpost gallery drafts and app icon (T-182, 9 Nov)

Drafts for Parth and Chinmay to pick from. Six images at 1920 x 1080 in the order of SUBMISSION_CHECKLIST §2.2, and the app
icon. All are captures of the app itself in the Immersive Web Emulator (no passthrough: the grey table and the lined
walls are the emulator's room, not a real one). Two dev flags set up gardens a judge can also reach by hand:
`autoplant` (an already planted garden) and `timeLapse` (the panel's Time-lapse). Nothing was painted in.
No brands, logos or people are in any frame.

Re-shoot everything (about 3 to 5 minutes; one Playwright run on the Mac at a time; port 8081 is Parth's dev server):

```sh
E2E_PORT=8491 npm run gallery
```

This runs `tests/tools/gallery.spec.ts` and writes every file below. Add `-- -g "03 palm"` to re-shoot one picture.

| File | Checklist item | Caption (one line) |
|---|---|---|
| `01-hero-listen.png` | 1 Hero | A full garden of 40 grown plants in Listen mode, the aurora halo rising round the bed (emulator) |
| `02-tuning-ripple.png` | 2 Tuning ripple | The room tunes the garden: the ripple crosses the table under its caption "Table: seeds." (emulator) |
| `03-seed-on-palm.png` | 3 Palm up | Open your hand, palm up: the day's seed lands on it, next to the glowing cell where it goes (emulator) |
| `04-planting-close-up.png` | 4 Pinch planting | Where the seed goes: the pinch hint over the glowing cell, the five pitch rings around it (emulator) |
| `05-two-rooms.png` | 5 Two rooms | Same garden, two rooms: a small room plays E minor with a short echo, a large one A open with a long one (emulator) |
| `06-settings-high-contrast.png` | 6 Settings, high contrast | The settings panel's Access tab, high contrast switched on from the panel itself (emulator) |

Notes for picking:
- **03 shows the dev-only hand cue** (the dots and lines of the `handCue` flag, T-175). The app draws no hand (D-027): on a
  headset you see your own hand. The dots stand in for it here. If the rules' "real captures, no mock-ups" rules this
  out, **do not ship 03**. Use a headset capture with passthrough, or 04 alone.
- **04 is "the moment of planting without a hand"**, not the swap to a full garden. The emulator cannot show a pinch
  without the cue, and 01 already shows a full garden. It shows the app's own pinch hint (the looping ghost pinch)
  over the glowing cell, with the ring of light passing.
- 05 is two captures of the same 20-plant garden, each cut to its middle 960 px and set side by side with a label. The
  label is written from the signature each room produced (`sig-small-desk` and `sig-living-table`). The plant colours
  turn with room size (D-071: -15 and +15 degrees). The halves come from `.tmp/gallery/` (git-ignored).
- The white arch at the bottom of most frames is the beat ring. It is the app's own, and it is on by default.
- Replace with headset captures where a recording shows passthrough (DEVPOST_DRAFT §3.4). Never mix the two without a caption.

## App icon (`icon/`)

| File | What |
|---|---|
| `icon/icon.svg` | The source, written by hand: the ring-shaped bed seen from a seat, its five rings, the ring of light passing, and glowing plants in the app's palette (gold, moss, ice, violet). Full bleed; everything that matters is inside the central 80 % circle, so a round mask cuts nothing |
| `icon/icon-512.png`, `icon/icon-192.png` | Drawn from the SVG by the same command |
| `icon/favicon-32.png` | The favicon (the SVG also works as an SVG favicon). At 32 px the rings blur into a dark disc with coloured dots: if this icon is picked, a simpler favicon (the ring and three dots) would read better |

Not wired into the app: `index.html` still has the empty `data:,` favicon, and there is no manifest. That is Parth's
call before the feature freeze (12 Nov).
