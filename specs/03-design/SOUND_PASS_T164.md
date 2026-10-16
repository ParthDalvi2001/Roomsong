# Sound pass plan: T-164 (plan half)

Owner: backend-dev, 2026-10-16. Builder: backend-dev (+ ux-designer for the listening page). It plans the T-164 row of SPRINT_PLAN (the T-144 level and limiter notes, T-151's tick, T-143's reverb tail, T-145's listening list) and Parth's verdict on today's sound, **"too boring"**. Nothing here is built. Spec text that changes is marked **[spec]** and is folded in when each item is built.

**How it was measured.** No headset, no Playwright run. A scratch Node model (`.tmp/mix.mjs`, not committed) rebuilds the five note graphs sample by sample from `src/audio/config.ts`, the real `karplus.ts` string and the Web Audio rules (automation, biquad formulas, PeriodicWave scaling). It reproduces the T-144 browser figures within 0.5 dB (Bass RMS +5.4, Pad −6.0, Choir −5.6, Pluck −16.1 dB against the Bell; solo peaks −17.0 to −9.9 dBFS against the measured −17.0 to −9.8). One solo note, ring 2, middle hue, reverb off, first second. **K** = BS.1770 K-weighted level of the loudest 400 ms, which tracks loudness better than plain RMS. The compressor figures use Chromium's static curve and make-up gain formula with a first-order attack and release, not its full kernel. Gardens are mono, with no voice cap and no reverb. Every number here is re-measured in the browser render (`tests/e2e/09-audio.spec.ts`) when it is built.

## 0. Why it sounds boring, and the fix for each

| # | Cause (measured) | Fix (section) |
|---|---|---|
| 1 | **Nothing changes.** A first session has 3 starter seeds and at most 1 daily seed (FR-MUS-08). That is 3 notes in a 16-step bar, the same notes at the same level and time every bar for 10 minutes: no swing, accents, variation or chord change. Nothing in `src/audio` varies anything (FR-MUS-11 variations are a Could and are not built). | §1, ideas 1–8 |
| 2 | **Too quiet and thin.** The starter garden (bell, pad, pluck at the new-plant height 0.55) peaks at −18.8 dBFS, K −27.9 (about −26 LUFS). A new plant sits at −10.8 dB because the height range is −24..0 dB. | §2: height floor −12 dB and the mix; +8 dB on the starter garden |
| 3 | **A loud, boomy Bass.** K +3.9 to +4.6 dB over the Bell (RMS +5.4) where UX §6 says +1. A full-height Bass is +11.3 dB louder than a garden of new plants. | §2: Bass −6 → −11.5 dB (the garden gap becomes +1.8 dB) |
| 4 | **A buried Pluck.** K −11.0 to −12.6 dB under the Bell (RMS −16), so it is heard as a click and not a note. | §2: −8 → −4 dB, then a listening check on −1 (§5) |
| 5 | **Pad and Choir have no body.** K −5.6 to −7.6 dB under the Bell; UX §6 says −2. | §2: −9 → −6.5 dB |
| 6 | **Pumping and grit when the bed is dense.** The release is 150 ms and one step at 84 BPM lasts 179 ms, so the gain recovers between steps and drops again on each one. Threshold −10 dBFS at 20:1 makes the compressor a brick wall, and 9.3 % of a full bed's samples sit in the ceiling's soft clip. T-144: a full-height Bass ducks the others by 1.4–5 dB. | §3 |
| 7 | **Harsh first-pass timbres** (T-102 values nobody listened to): an inharmonic FM bell at index 2.2 on the strike (clang), three raw saws, a nasal pulse choir (formant Q 5). | §4, the three styles |

## 1. Making it less boring (ranked: most life for the least work and CPU)

Budget: Quest 3, 24 voices for every sound (FR-MUS-07), JS ≤ 6 ms a frame. For scale, a full bed at 84 BPM triggers about 28 notes a second. Everything is synthesized at run time with no samples: noise comes from mulberry32 written out in the loop, seeded as in `karplus.ts`. "Once" means built in `init()`; every layer note is a pooled voice trigger (CODING_GUIDELINES §5).

| Rank | Idea | Numbers | Where | Work | CPU and voices |
|---|---|---|---|---|---|
| 1 | **Groove** | Swing: odd steps late by (s − 0.5) × 2 steps; s = 56 % is +21 ms at 84 BPM. Accents per step: step 0 at 0 dB, steps 4/8/12 at −1, other even steps at −3, odd steps at −5. Humanize: timing ±6 ms uniform, level ±1.5 dB, seeded per (session, bar, plant), so it is reproducible in tests | `triggerStep`, with one scratch `VoiceParams` (no allocation); the scheduler passes `bar` already | 2 h | 0 nodes, 0 voices, < 1 µs a note |
| 2 | **Tempo echo** (a delay, not the reverb) | Delay of 3 steps (dotted 8th: 536 ms at 84 BPM), feedback 0.35 (repeats at −9, −18, −27 dB), send 0.25 (−12 dB), low-pass 2.5 kHz in the loop; `delayTime` follows the tempo at the bar line. 3 plants become 9–12 audible events a bar | a second bus gain fed like the reverb send → `DelayNode` (max 2 s) ⇄ feedback gain + biquad → master. **[spec]** LLD §7.1 graph, API_SPEC §1.2 graph-shape line | 2 h | 4 nodes once, 0 voices |
| 3 | **Harmony that moves** | An engine-owned drone, root + fifth on the Pad, 2 bars a chord, an 8-bar cycle. Roots as scale degrees of the room's mode, chosen so the fifth stays in the scale. Major [0, 4, 1, 3] (C–A–D–G, I–vi–ii–V). Minor [0, 4, 1, 2] (C–B♭–E♭–F). Sus [0, 4, 2, 3] (C–B♭–F–G). Level −8 dB under a new Pad. Every note stays pentatonic, so nothing can clash (D-025) | engine; `chordDegrees`-style table in `garden/` **[spec]** API_SPEC §1.1; FR-MUS-07 lists "accompaniment" among the counted sounds **[spec]** | 3 h | 2 voices (long notes); 1 note per bar |
| 4 | **Movement over time** | Breathing filter: one master low-pass, centre 5 kHz, swept ±1 octave on an 8-bar sine. The tick sets `setTargetAtTime(f(bar), barTime, bar/3)` once a bar, so the phase is on the audio clock. Evolving pad: Pad `cutoffMul` × 2^(0.5·sin(2π·bar/16)) at trigger time. The same filter is the Listen sweep (§6) | between master gain and compressor **[spec]** LLD §7.1; Pad trigger | 2 h | 1 node once, 0 voices, 1 automation a bar |
| 5 | **Builds** | Each layer enters when plants ≥ P **or** bars played ≥ B, and fades in over 2 bars through its note gain. Groove, echo and filter: from the first note. Harmony: P 2 / B 4. Shaker or tick: P 3 / B 8. Counter-line: P 3 / B 12. Kick: P 5 / B 16. Variations: P 5 / B 16. A judge with 3 plants hears every core layer by bar 16 (46 s at 84 BPM) | engine, one table | 1 h (after 3 and 6) | 0 |
| 6 | **Soft percussion** | Felt kick: the Bass `PeriodicWave` (so small speakers carry it), pitch 140 → 55 Hz over 60 ms, 3 ms attack, τ 60 ms, steps 0 and 8, −22 dB re a full-height Bell. Shaker: one 0.25 s noise buffer rendered in `init()`, band-pass 6 kHz Q 0.7, τ 25 ms, on 8ths with accents [0, −6, −3, −6], base −30 dB, humanize ±4 ms. Tick: the same buffer, high-pass 8 kHz, τ 6 ms. Panned at the bed centre | new `voices/Perc.ts` | 3 h | 1 buffer once; 2–3 nodes a hit, about 8 hits a bar (3 a second); ≤ 2 voices |
| 7 | **Counter-line** (melody from the plants) | On empty steps, each with probability 0.25 and at most 3 a bar, play a planted pitch one octave up, −10 dB under the plant it copies. Drawn every 2 bars and repeated once, so it is a motif and not noise. Seeded | engine | 3 h | ≤ 2 voices; ≤ 1 note a second |
| 8 | **Variations** (FR-MUS-11, today Listen-only and not built) | Every 4 bars, one of: an octave echo of one plant (+12, −9 dB, 3 steps later), ghost notes (2 plants get an extra hit 2 steps later at −12 dB), a swell (+2 dB over 2 bars, then back). Seeded per session; also in play mode **[spec]** FR-MUS-11 | engine | 3 h | ≤ 2 notes per 4 bars |

All eight together add about 4 notes a second to the 28 of a full bed, and ≤ 6 voices at once. The layers are the quietest notes, so under oldest-quietest stealing the plants keep their channels. The JS estimate is < 0.1 ms a tick; it is not measured, and `stats.cpuEstimate` checks it in the build.

## 2. The mix: today and the target (relative to the Bell, dB)

Target = the UX §6 offsets (Bass +1, Pad and Choir −2, Pluck −1) by K. The single lever is `MIX_DB`, plus the height floor. Every value moves 2 dB down, so the layers of §1 and the reverb have headroom. No voice recipe changes here.

| Voice | `MIX_DB` today → new | Today, full height: peak / RMS / K | Today K at h 0.55 / h 0 | New K at full height / h 0.55 |
|---|---|---|---|---|
| Bell | −7 → **−9** | 0 / 0 / 0 (−12.3 dBFS peak a channel) | 0 / 0 | 0 / 0 |
| Bass | −6 → **−11.5** | +2.5 / **+5.4** / +3.9 | +4.6 / +4.3 | +0.4 / +1.1 |
| Pad | −9 → **−6.5** | −4.7 / −6.0 / −7.6 | −6.0 / −0.4 | −3.1 / −1.5 |
| Choir | −9 → **−6.5** | −4.1 / −5.6 / −7.2 | −5.6 / −0.5 | −2.7 / −1.1 |
| Pluck | −8 → **−4** | −1.9 / **−16.1** / −12.6 | −11.0 / −3.5 | −6.6 / −5.0 (peak +4.1: a listening check, §5) |
| Shimmer | −12 → −14 | (rings as a Bell) | | |

`HEIGHT_GAIN_DB_MIN` −24 → **−12** **[spec]** FR-MUS-05. The release (0.2–2.5 s) still makes tall plants read bigger. At height 0 the Bell lasts 40 ms (τ = 0.2 / 5) and every other voice is louder than it; this is left as it is. Also **[spec]** UX §6 mix line. The e2e solo bound in `09-audio` (−20..−8 dBFS before the limiter) still holds: the new solo peaks are −15.4 (Bass) to −10.2 (Pluck).

## 3. Limiter and compressor

| | Threshold | Knee | Ratio | Attack | Release | Chromium make-up (computed) |
|---|---|---|---|---|---|---|
| Today | −10 dB | 6 | 20 | 2 ms | 150 ms | +4.6 dB |
| **New** | **−18 dB** | **10** | **4** | **5 ms** | **300 ms** | +6.0 dB |

The ceiling stays the same (−1 dBFS, linear below 0.7). Why: a ratio of 4 over a wide knee is bus glue and not a wall. A release of 300 ms is longer than one step at every tempo (250 ms at 60 BPM), so there is no recovery between steps and no pumping at the step rate. A 5 ms attack lets the Pluck's transient through. The compressor now does the dense-bed work that the soft clip did before.

| Scene (84 BPM unless noted) | Today (mix + limiter): out peak, K, reduction mean / worst, % in ceiling knee | New (mix §2 + limiter): same |
|---|---|---|
| Starter 3, h 0.55 | −18.8 dBFS, K −27.9, 0 / 0, 0 % | −10.1, K −19.9, 0 / 0, 0 % |
| 8 plants, five voices, h 0.55 | −15.0, K −23.1, 0 / 0, 0 % | −6.8, K −17.3, 0 / 0.2, 0 % |
| The same, Bass at full height | −6.4, K −11.8 (Bass +11.3 over the garden) | −7.2, K −15.5 (+1.8), 0.1 / 0.4 |
| Full bed 80, h 1, 120 BPM, no cap | −1.1, K −8.9, 6.3 / 8.9, **9.3 %** | −1.1, K −9.2, 7.3 / 9.2, **5.1 %** |
| Listening garden (§4), 8 bars | −9.8, K −19.5, integrated −24.1 | −5.1, K −14.8, integrated −18.7, 0.2 / 0.8 |

## 4. Three sound styles to choose by ear

All three sit on §2 + §3 and carry ideas 1–6 of §1, so they differ in **mood, not in how alive they are**. Values are changes to `audio/config.ts` (new constants are marked *new*).

| | **A: Soft and warm** (felt piano, mellow pads) | **B: Bright and glassy** (bells, chimes) | **C: Deep and ambient** (low pads, slow attacks) |
|---|---|---|---|
| Bell | `BELL_FM_RATIO` 3.5 → 1 **[spec]** LLD §7; index 2.2 → 1.2; attack 4 → 8 ms (a soft electric piano) | index 2.2 → 1.6; floor 0.15 → 0.3; `BELL_RELEASE_TAU_DIV` 5 → 3.5 (long glass ring) | attack 4 → 30 ms; index → 1.2; tau div 5 → 3 |
| Pluck | *new* `PLUCK_ATTACK_S` 6 ms; *new* `PLUCK_LPF_MUL` 4 (+1 node a note); `STRING_T60_LONG_S` 2.5 → 3.5 (felt hammer) | `STRING_T60_LONG_S` → 3.0; `PLUCK_RELEASE_START_MUL` 0.5 → 0.8 (kalimba) | attack 20 ms; T60 long → 4.0; release start → 1.0 |
| Pad | open 3.5 → 2.0; Q 0.9 → 0; detune ±7 → ±4 c; attack 0.4 → 0.6 s | open 3.5 → 6; Q 0.9 → 3; detune ±7 → ±10 c (airy) | attack 0.4 → 1.2 s; hold × 1 → 1.5; tau div 4 → 2.5; open → 2.5 |
| Bass | drive 3 → 2; cutoff × 8 → 5 (round) | hold × 0.2 → 0.1; cutoff × 8 → 10 (tight) | attack 10 → 60 ms; hold × 0.2 → 0.6; tau div 25 → 8 (swell) |
| Choir | "oh" formants [450, 800, 2830], Q 5 → 4; attack 0.25 → 0.35 s | "ee" formants [300, 2200, 3000], Q → 6 | "oo" formants [350, 700, 2500]; attack → 0.8 s; hold × → 1.0; vibrato 3.5 Hz ±6 c |
| Groove | swing 56 % (+21 ms); humanize ±8 ms, ±2 dB | swing 54 % (+14 ms); ±4 ms, ±1.5 dB | swing 52 % (+7 ms); ±12 ms, ±2.5 dB (floating) |
| Tempo echo | 3 steps, feedback 0.30, LPF 2 kHz | 2 steps, feedback 0.40, LPF 6 kHz | 6 steps, feedback 0.50, LPF 1.5 kHz |
| Breathing filter | 2.5–8 kHz over 8 bars | 5–16 kHz over 4 bars | 1.5–6 kHz over 8 bars |
| Harmony | Pad drone C3, 2 bars a chord, −8 dB | Pad drone C4, 2 bars a chord, −10 dB | root on Pad, fifth on Choir, 4 bars a chord, −6 dB |
| Percussion | felt kick on steps 0 and 8, shaker on 8ths | high tick in 3-3-2 (steps 0, 3, 6, 8, 11, 14), −32 dB; soft clave (Bell, root + 2 octaves, 50 ms) on steps 4 and 12, −26 dB; kick on step 0 | heartbeat kick (step 0 at −22 dB, step 2 at −28 dB); a noise "breath" (band-pass 900 Hz, 0.6 s swell) every 2 bars, −30 dB |
| Counter-line | Pluck, +1 octave | Bell, +1 octave | Bell (30 ms attack), +1 octave, probability 0.15 |
| Reverb send | 0.28 | 0.24 | 0.35 (the top of UX §6's 20–35 %) |
| Its own mix fix (measured) | Pluck −4 → −1 (the low-pass costs 2.9 dB) | Choir −6.5 → −2.5 and Bass −11.5 → −8 (K −5.3 and −2.6 otherwise) | none |
| Page trim (voices only, measured) | +1.5 dB | 0 dB | −1.0 dB |

**The listening page** (`proto/styles/`, dev only, never shipped). This is the same 8-bar garden in each style. Wanderer (C major), 84 BPM, 0.9 s reverb, volume 0.8, head still, every layer on from bar 1 (builds off). Plants, as (voice, ring, step, height), all at hue 0.5: (bell 2 0 .55), (pad 0 0 .8), (pluck 3 3 .55), (pluck 4 6 .3), (bass 0 8 .55), (choir 2 8 .8), (bell 4 11 .3), (pluck 1 13 .55). Each style renders through the real engine into an `OfflineAudioContext` (22.9 s), is RMS-matched to ±0.5 dB, and plays from buttons A, B and C; a blind mode shuffles them as X, Y and Z. The style is chosen at build time: `audio/config.ts` picks an override object by `import.meta.env.VITE_SOUND_STYLE`, and three builds sit behind one index page. After the pick, the losing two and the switch are deleted and the winner's values become plain constants. Rendering offline means the page does not wait for T-128d.

## 5. Decisions that need Parth's ears

| Decision | Listen for | Compare |
|---|---|---|
| The style | Which one you would leave playing for 10 minutes (blind X/Y/Z first, then named) | A vs B vs C; rate each 1–5 |
| Reverb tail in large rooms (T-143) | The tail after the last note in a 2.0 s room (`forceSignature`), with the garden stopped: does it cut off or breathe out? | Full response to −60 dB (2.0 s) vs ending at −40 dB (1.33 s plus a 50 ms fade). The swap then costs about 3.7 ms instead of 5.2–6.7 ms, and the render takes 16 slices instead of 24. Take −40 dB if you cannot tell them apart |
| Stand-in plucks after a re-tune (T-143) | The first 1–2 plucks after a forced re-tune in a pluck-heavy garden: brighter or shorter than the same note a bar later? | Today (the nearest ready string, re-pitched) vs strings rendered in the order of the coming steps. Keep today's if neither is heard |
| Pluck level | Pluck and Bell on the same ring, alternating | `MIX_DB.pluck` −4 vs −1 |
| Swing | Does the groove sway or limp? | 54 % vs 58 % |
| Spatial (T-145) | Full bed, fast head turns for 30 s: buzz or grain, sound trailing the turn, crackles, ticks at note starts; a UI sound that steals starts 20–23 ms late | pass / fail |
| Bass on headset speakers (device, T-129) | Is the bass line there without headphones? | `BASS_DRIVE` 3 vs 4 |

## 6. UI sounds from the room chord, and the Listen sweep

Notes come from `chordDegrees(mode)`, the rings [r0, r1, r2], through `hzForRing`, so they are always in the room's key and follow a re-tune. A UI sound takes a pooled channel (FR-MUS-07) and is panned 0.4 m ahead of the listener (full level, centred). Levels are relative to a new plant of that voice (h 0.55).

| Sound | When | Plays | Voice, length, level | API |
|---|---|---|---|---|
| `tick` | a panel press (T-151; nothing sounds today) | r0, one octave above the Bell's | Bell, `cutoffMul` 0.5, release 0.06 s, −12 dB | `ui('tick')`; the panel system gets `engine` in configData, as T-142b does **[spec]** API_SPEC §1.10 |
| `bump` | `garden:seedBack` with `offBed`, `full` or `lost` (not `reset`) | r0 in the Bass octave | Bass, darkest hue, release 0.12 s, −8 dB | `ui('bump')` from GardenAudioSystem (T-128d); comment only **[spec]** API_SPEC §1.2 |
| `confirm` | bed placed or confirmed | r0, r1, r2 arpeggiated 40 ms apart | Pluck, release 0.6 s, −6 dB | `ui('confirm')`; comment only |
| `removeRev` / `undoFwd` | `garden:removed` / undo | r2 → r1 → r0 / r0 → r1 → r2, 50 ms apart | Bell, release 0.3 s, −10 dB | comment only |
| `placed` | a seed set into a cell | none; the plant's first note is the feedback | | comment only |
| `goodnight` | Listen auto-end at 10 min | r0 + r1 + r2 together | Pad, release 4 s, −6 dB | comment only |
| **Listen sweep** | `enterListen()` / `exitListen()` | The §1 idea 4 filter drops to 0.8–4 kHz over 16 bars; reverb send +0.07 (capped at 0.35) and master −3 dB, gliding over 1.2 s (the visual transition); back over 0.8 s on exit | (no voice) | signatures unchanged. **[spec]** UX §6 "pad bus" line → the master filter; API_SPEC §1.2 comment. If T-148 has built the dim, T-164 adds only the sweep |

## 7. Build order

| # | Step | h |
|---|---|---|
| 1 | §2 mix and height floor, §3 limiter; update the `09-audio` level pins | 2 |
| 2 | Groove (§1.1), seeded, with unit tests | 2 |
| 3 | Tempo echo (§1.2) | 2 |
| 4 | Breathing filter, evolving pad, Listen sweep (§1.4, §6) | 2 |
| 5 | Harmony drone, per-mode table (§1.3) | 3 |
| 6 | Percussion (§1.6) and the builds table (§1.5) | 4 |
| 7 | Style switch and listening page (§4); **Parth picks** | 3 |
| 8 | Fold in the winner, delete the switch, the **[spec]** edits (SRS FR-MUS-05/07/11, LLD §7 and §7.1, UX §6, API_SPEC §1.1/§1.2/§1.10) | 2 |
| 9 | UI sounds (§6) | 3 |
| 10 | Counter-line (§1.7), then variations (§1.8): cut line here if time is short | 6 |
| 11 | Listening review #2 (≥ 4/5), TC-AUD-05, `xr-perf-budget` audio check | 1 |
| | **Total** (steps 1–9: 23 h) | **30** |
