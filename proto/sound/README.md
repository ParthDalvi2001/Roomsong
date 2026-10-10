# Roomsong — desktop sound prototype (T-102, Phase 0 "Prove")

A plain web page that plays the Roomsong garden loop in desktop Chrome so the music direction can be rated before
more code is built on it (gate G0: Parth ≥ 4/5, outsiders ≥ 3/5). Everything is synthesised in the browser with the
Web Audio API; there are no samples, no runtime dependencies and no network calls (ADR-002).

## Run it (the listening review uses exactly this)

```bash
cd proto/sound
npm install
npm run build && npm run preview     # → http://127.0.0.1:4173/
```

Open **http://127.0.0.1:4173/** in desktop Chrome and press **Play**. The server binds that one address and refuses
to start if the port is taken, so the URL can never show an older build: if it says "Port 4173 is already in use",
an old preview is still running; stop it (`lsof -ti tcp:4173 | xargs kill` on macOS) and run the command again.
For a second device on the same Wi-Fi, run `npx vite preview --host --port 4173 --strictPort` instead and open the
"Network" URL it prints. While developing, `npm run dev` serves http://localhost:5173/ with reload.

If `npm install` fails with `EACCES`, add `--cache "${TMPDIR:-/tmp}/roomsong-npm-cache"` (see `.claude/QUICK_START.md`).
Requirements: Node ≥ 20.19 and a current desktop Chrome (the only browser this was checked in). Use headphones
or decent speakers; laptop speakers hide the pad and the reverb tail.

## What you will hear

- Six fixed plants on a 5-ring × 16-step bed: two **pads** (low drone, slow attack), two **plucks** (string-like),
  two **bells** (FM strike with a long decay). A ring of light sweeps the bed once per bar; a plant sings when the
  ring touches it. Inner ring = low note, outer ring = high note; every note is one of the five notes of the room's
  pentatonic scale, so no two plants can clash (D-025).
- **Play** starts the loop. Listen for at least **30 seconds** (about ten bars) before judging.
- **Next room** cycles three fixed room signatures. The plants stay where they are; only the key, the scale and the
  reverb decay change (this is the "your room tunes the garden" idea; a bigger room is lower and rings longer).
  Notes that are sounding fade out at the change, so the old key never rings over the new one; the new room is
  heard from the next plant the ring touches:

  | Room | Key and scale | Ring notes, inner → outer (bell) | Reverb decay (RT60) |
  |---|---|---|---|
  | Wanderer (room unknown) | C major pentatonic | C4 D4 E4 G4 A4 | 0.9 s |
  | Small room | E minor pentatonic | E4 G4 A4 B4 D5 | 0.4 s |
  | Hall | A (below C) suspended pentatonic | A3 B3 D4 E4 G4 | 1.8 s |

- **Tempo** (72 / 84 / 96 BPM, default 84) is a separate control. **Tempo is not room-driven in v1** (D-021); it is
  here only so you can say which tempo feels right.
- Click an empty cell to plant (voices cycle bell → pad → pluck), click a plant to remove it. **Reset garden**
  restores the six fixed plants. Changes take effect on the next sweep without clicks or dropouts.

## Listening review (T-103)

Please answer two things after listening for ≥ 30 s in at least two rooms:

1. **Rating (1–5):** "If a garden you planted yourself sounded like this, would you want to keep listening and
   add more plants?" 1 = no, 3 = fine, 5 = yes, I'd leave it running.
2. **One sentence:** what would you change first (tone, tempo, reverb, how busy it is, anything)?

Things worth listening for: do the three voices feel like they belong together; is anything harsh, muddy or
clicky; does "Next room" feel like a different place or just a different key; which of 72 / 84 / 96 BPM feels
relaxed rather than sluggish or hurried.

## Verification

```bash
npm run verify                    # vitest (70 unit tests) + typecheck + vite build
node scripts/offline-check.mjs    # TC-AUD-05 in headless Chromium + a live Play check; run after a build
```

| Test case | What it checks | Where |
|---|---|---|
| TC-AUD-01 | ring 0..4 → scale degree, inner = low, all notes in the mode, degree ≥ 5 wraps an octave; the three modes are the D-025 sets and have no semitone step | `tests/theory.test.ts` |
| TC-AUD-02 | fake clock: 16 steps/bar, look-ahead 120 ms, tick 25 ms, no drift over 1000 bars, no missed steps under jitter | `tests/scheduler.test.ts` |
| TC-AUD-03 | height → gain/release and hue → cutoff/detune are monotonic and clamped; step → stereo pan | `tests/mapping.test.ts` |
| TC-AUD-04 | cap 24; the 25th voice steals the quietest note at that moment, the oldest on a tie | `tests/voicePool.test.ts` |
| TC-AUD-05 | each voice, the full mix, a 96-trigger stress case and a 24-bell overload (about +16 dBFS before the limiter) rendered offline through the real chain: peak ≤ −1 dBFS, non-silent; a plant at step 4 / 12 leans right / left | `node scripts/offline-check.mjs`, the page button, or `?selftest=1` |
| reverb | RT60 clamp 0.3–2.0 s, impulse response ≤ 2.0 s, measured RT60 within 10 % of the preset (0.400 / 0.904 / 1.808 s) | `tests/reverb.test.ts` |

Node has no Web Audio, so TC-AUD-05 runs in a browser. `scripts/offline-check.mjs` serves `dist/` on port 4174,
opens it in the Chromium that the root project's Playwright installs (run `npm install` at the repository root
once; it falls back to Google Chrome), prints the result lines, then presses Play, visits every room, changes the
tempo and fails if the output is silent, the peak passes −1 dBFS, the page logs an error or any request leaves the
page's own origin. The page also shows a live output meter with a peak hold.

## How it is built (maps onto `src/audio` for T-121)

Audio graph: voice → plant gain → equal-power stereo pan → sum bus → volume → limiter → −1 dBFS ceiling →
analyser → output; plant gain → send → **one** shared `ConvolverNode` → wet return → sum bus. It follows
NFR-PERF-10 for the voice cap, the one convolver, the impulse-response length and the scheduler timing, but not for
the panners (see Known limitations).

| File | Role |
|---|---|
| `src/types.ts` | `Cell`, `Plant`, `RoomSignature` (with `reverbRt60`), `WANDERER`, `Voice`, `VoiceParams` — names from API_SPEC §1.1/§1.2 plus the v1.2 deltas of PLAN_AMENDMENT §6.3 |
| `src/config.ts` | every tunable number, each citing its source or saying what it does |
| `src/theory.ts` | the three pentatonic modes, `degreeToMidi`, `midiToHz`, `hzForRing` |
| `src/scheduler.ts` | pure look-ahead scheduler: injectable clock, 25 ms tick, 120 ms look-ahead, anchor-based times |
| `src/mapping.ts` | plant height/hue → `VoiceParams`; step → pan |
| `src/VoicePool.ts` | 24-voice cap, oldest-quietest stealing |
| `src/karplus.ts`, `src/reverb.ts`, `src/prng.ts` | seeded, deterministic DSP buffers (pluck string, reverb impulse response from an RT60) |
| `src/voices/` | `Bell` (2-op FM), `Pad` (3 detuned saws → LPF), `Pluck` (Karplus-Strong), shared steal/fade helper |
| `src/engine.ts` | `AudioEngine`: context, master chain, the shared reverb with a scheduled impulse-response swap, per-plant slots, diff-based `syncPlants`, `setSignature` re-tune in place |
| `src/signatures.ts`, `src/garden.ts` | the three room presets and the six fixed plants |
| `src/selftest.ts`, `scripts/offline-check.mjs` | the offline TC-AUD-05 renders and their headless runner |
| `src/main.ts`, `index.html`, `src/style.css` | the page (the only DOM code) |

Rules kept: the `AudioContext` is created inside the Play click; every musical event is scheduled on
`AudioContext.currentTime` from a 25 ms `setInterval` tick with 120 ms look-ahead (no `setTimeout` and no
`requestAnimationFrame` for timing; the page's animation frame only draws); the tide display derives from the audio
clock; the tick creates nothing except the note graphs it schedules; other nodes are made at init and on plant
sync; gain changes are ramped (`setTargetAtTime`, envelope ramps); a stolen note is held and faded over 20 ms;
removed plants fade and are disconnected later.

## Known limitations (prototype)

- **Desktop stereo only, no spatialisation.** Plants are panned left/right by their step with `StereoPannerNode`
  (equal power); there is no `PannerNode`, no HRTF, no distance and no head tracking (T-145). Nothing here says how
  it will sound on a headset.
- **Tempo is not room-driven in v1**; the tempo control is for the review only.
- **Not the node layout of NFR-PERF-10 or the performance checklist.** There is one `StereoPannerNode` per plant
  (the requirement is 24 pooled equal-power `PannerNode`s), and every note builds its own small node graph
  (2 to 5 nodes, one note record and one array) inside the tick when it is scheduled, instead of re-using pooled
  voices. Only the number of sounding notes is capped at 24. Pooled voices or per-note graphs is a decision for
  T-121, once there is a device measurement.
- Only Bell, Pad and Pluck exist; the page plants nothing else, and any other voice type would play as a bell
  until T-144.
- The pluck is a Karplus-Strong string rendered to a buffer per plant (a native `DelayNode` loop cannot go above
  ~370 Hz), so re-tuning re-renders one short buffer per pluck plant (sub-millisecond each, outside the tick).
- The limiter is `DynamicsCompressor` (fast attack, ratio 20) followed by a sample-exact soft ceiling at −1 dBFS,
  not a true look-ahead brick-wall limiter; the ceiling guarantees the TC-AUD-05 bound, the compressor keeps it
  from engaging in normal play (the six-plant mix peaks near −10 dBFS). The overload render fails without the
  ceiling; it cannot show whether the compressor works, because the ceiling alone holds the same peak.
- A room change is a short cut, not a crossfade: sounding notes fade in 20 ms and the reverb return is muted for
  about 0.2 s while the one convolver gets its new impulse response.
- In a background tab Chrome throttles `setInterval` to 1 s, longer than the 120 ms look-ahead, so the loop will
  stutter when the tab is hidden; the app proper pauses audio on `visibilitychange` (FR-SYS-05).
- Only Chrome/Chromium was checked. Firefox has no `AudioParam.cancelAndHoldAtTime`, so there a note stolen during
  its attack can tick.
- The bed cells are mouse-only; Play, Stop, Next room, Reset, Tempo and Volume work from the keyboard.
- No pause/resume fades or persistence here; those belong to the real engine (T-152, T-122).
