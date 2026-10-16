# PM Proposals — Chinmay → Parth (the only way changes enter the master copy)

**Rule (D-015):** the developer's folder is the master. Chinmay (and his Claude Code) write proposals here, one entry each.
Parth's Claude summarises new entries at session start; Parth approves or rejects; only then are spec files edited.
Do not edit any other file under `specs/` from the PM's copy. To send: paste this file's new entries into chat, or share the file.

## How to write an entry
```
### P-0xx — <short title>            (date, author)
**Change:** what should change (file + section if known).
**Why:** evidence or reasoning (links welcome).
**Impact:** effort (XS/S/M/L), risk, which gate it affects.
**Status:** proposed | approved (D-0xx) | rejected (reason)
```

## Entries

### P-001 — Rename Bloomtone → Roomsong (2026-10-09, Chinmay's Claude)
**Change:** global rename across specs.
**Why:** possible conflicts with bloomtone.live, a song, Eno's *Bloom*, *Blooming Conductor*.
**Impact:** XS.
**Status:** partially approved as D-016 — a rename will happen; final name chosen by Parth from a shortlist (see chat 2026-10-10).

### P-002 — Room signature pivot (2026-10-09, Chinmay's Claude)
**Status:** approved as **D-010** (as a Should-have layer, gated on device evidence; ADR-005).

### P-003 — Scope cuts + gated phases (2026-10-09, Chinmay's Claude)
**Status:** approved as **D-009 / D-011 / D-013** with amendments (daily seed + growth kept as Should; anchors Should; gaze dwell = select + Listen).

### P-004 — Grid and reach geometry fixes (2026-10-09, Chinmay's Claude)
**Status:** approved as **D-012** (annulus 0.12–0.30 m, 5 rings, 16 steps; bed centre 0.40 m).

### P-005 — Make CI green on develop (2026-10-14, Chinmay's Claude)
**Change:** stabilise the timing assert in `tests/unit/hands/HandSystem.test.ts` (~line 629) that fails under CI load.
**Why:** develop's CI was red at `test:coverage` on 13 Oct.
**Impact:** XS.
**Status:** resolved (CI green since 14 Oct, per Chinmay's 16 Oct update)

### P-006 — Fix the `proto/sound` type check (2026-10-14, Chinmay's Claude)
**Change:** add the `garden:*` events to `EventMap` in `proto/sound` so `npm run build` there passes (25 `tsc` errors).
**Why:** only `npx vite build` works; the G0 prototype should build cleanly.
**Impact:** XS, G0.
**Status:** approved (D-056, group A: may be built)

### P-007 — Windows-safe paths in tests (2026-10-14, Chinmay's Claude)
**Change:** normalise `\` to `/` in `tests/unit/index.test.ts` and `tests/unit/policy/todo.test.ts` (3 tests).
**Why:** the PM runs on Windows and cannot get a green `verify`.
**Impact:** XS.
**Status:** approved (D-056, group A: may be built)

### P-008 — Enable GitHub Pages now (2026-10-14, Chinmay's Claude)
**Change:** turn on Pages for the repo and keep a mirror.
**Why:** every `github.io` link returned 404 on 14 Oct; the submitted URL depends on it.
**Impact:** XS (settings; Parth's action, PROGRESS item 3 / T-108).
**Status:** proposed

### P-009 — Break the static loop (2026-10-14, Chinmay's Claude)
**Change:** give each plant a seeded cycle length (1, 2, 3 or 5 bars) or a 10–15 % skip chance; raise FR-MUS-11 to Should and apply it outside Listen mode.
**Why:** consecutive bars correlate at 0.97–1.00 in the prototype renders; cycles of 1/2/3/5 bars repeat only every 30 bars (86 s at 84 BPM).
**Impact:** S, G0/G1.
**Status:** approved (D-056, group B: may be built)

### P-010 — Reverb pre-delay and room damping (2026-10-14, Chinmay's Claude)
**Change:** 5–25 ms of pre-delay inside the generated impulse response, scaled by room size; `IR_LPF_COEF_END` per room.
**Why:** clearer attacks, less mud; rooms differ in tone, not only RT60.
**Impact:** S.
**Status:** approved (D-056, group A: may be built)

### P-011 — High-pass the reverb send (2026-10-14, Chinmay's Claude)
**Change:** one `BiquadFilterNode` (high-pass, ~200 Hz) on the shared send.
**Why:** Hall has 69 % of its power in 100–250 Hz.
**Impact:** XS–S; NFR-PERF-10 gains one node.
**Status:** approved (D-056, group A: may be built)

### P-012 — Instant, in-key interaction sounds (2026-10-14, Chinmay's Claude)
**Change:** `placed` plays the new plant's own voice and note quietly at once; all UI sounds tuned to the room's key.
**Why:** a plant can wait up to one bar (2.9 s at 84 BPM) before it sounds; out-of-key UI breaks the music.
**Impact:** S.
**Status:** approved (D-056, group B: may be built)

### P-013 — Seeded per-note level variation (2026-10-14, Chinmay's Claude)
**Change:** ±1.5 dB per note from a per-session seed; timing stays on the grid.
**Why:** the loop sounds mechanical.
**Impact:** XS.
**Status:** approved (D-056, group A: may be built)

### P-014 — Start and accessibility polish (2026-10-14, Chinmay's Claude)
**Change:** a quiet root drone while there are fewer than 3 plants; a 2–3 s fade-in at session start; a mono audio switch in Settings; an aliasing check of Bell FM at its top notes.
**Why:** silent start, unclear home note, startle risk; Quest's hearing setting only adjusts balance.
**Impact:** S.
**Status:** approved (D-056, group B: may be built)

### P-015 — Listening-based growth, 5 levels, time-lapse demo (2026-10-14, Chinmay's Claude)
**Change:** 5 growth levels (seed, sprout, growing, flowering, fruiting) reached by listening hours (2, 12, 72, 432 h, small steps at each doubling); each level adds one sound layer; a seeded 4-note tune per seed; a persisted listening counter (schema bump); a labelled "Time-lapse (demo)" switch in the submitted build.
**Why:** growth is days-only and silent today, so judges never meet it; pitch: "your room tunes it, your listening grows it".
**Impact:** M; FR-MUS-09, FR-PER-01/02, API_SPEC `GrowthDelta`, the renderer; G2.
**Status:** rejected for this submission (D-056: Parth skips the rest of the PM plan)

### P-016 — Stillness opens the garden (2026-10-14, Chinmay's Claude)
**Change:** a still head facing the bed for ~8 s → halo brighter, reverb slightly wider, growth counted ×2; the gazed plant +2 dB.
**Why:** gives "listening" a real input with no gesture; strengthens Listen mode and accessibility.
**Impact:** S; G2.
**Status:** approved (D-056, group B: may be built)

### P-017 — Clap-to-tune spike (2026-10-14, Chinmay's Claude)
**Change:** a 1-day timeboxed headset test: mic in an immersive session, clap detection, RT60 from T20, fallback to the Sabine estimate.
**Why:** measures the real room's echo, the strongest proof of the differentiator.
**Impact:** M if adopted, high risk; needs a decision against D-021.
**Status:** rejected for this submission (D-056: Parth skips the rest of the PM plan)

### P-018 — Listen-mode arc (2026-10-14, Chinmay's Claude)
**Change:** shape FR-MUS-11's variations into a 10-minute dawn → day → dusk → night arc ending on the existing chord.
**Why:** Listen mode is the track-fit proof; an arc reads as a performance.
**Impact:** S–M.
**Status:** rejected for this submission (D-056: Parth skips the rest of the PM plan)

### P-019 — Decide on duplicate note sets (2026-10-14, Chinmay's Claude)
**Change:** keep the 12 key+mode pairs that give 8 note sets, or change the mode table so neighbouring room types never share one.
**Why:** E minor = A suspended; E suspended = D major; D suspended = C major (the default) = A minor; typical homes land on 4 sets (16 Oct update §4.9).
**Impact:** XS decision.
**Status:** rejected for this submission (D-056: Parth skips the rest of the PM plan)

### P-020 — Headset test list (2026-10-14, Chinmay's Claude)
**Change:** run the 8 device sound tests of the 14 Oct doc §7.
**Status:** superseded by the 16 Oct update §7 (additions to DEVICE_SCRIPT_S1)

### P-021 — Garden backup code (2026-10-14, Chinmay's Claude)
**Change:** export and import the saved garden as a short code or file.
**Why:** long growth means a garden worth keeping; one browser's storage holds it all.
**Impact:** M, after the submission.
**Status:** rejected for this submission (D-056: Parth skips the rest of the PM plan)

### P-022 — Verify and fix reverb level across rooms (2026-10-16, Chinmay's Claude)
**Change:** render the reverb's wet output alone at all six RT60 steps; if wet level rises with RT60, lower the send by `−10·log10(RT60/0.3)` dB, or use a fixed-energy IR with `normalize = false`, or document "bigger rooms are wetter" as intended.
**Why:** `normalize = true` with an IR one RT60 long predicts +8.2 dB from 0.3 s to 2.0 s; the WAVs show about +6.5 dB. *(Driver, 17 Oct: confirmed in code: `AudioEngine.ts` sets `convolver.normalize = true`, and `impulseLength` is one RT60 long, capped at 2.0 s.)*
**Impact:** S; Reverb.ts, AudioEngine.ts, reverb.test.ts, LLD §7; before T-164 sets mix levels.
**Status:** approved (D-056, group A: may be built)

### P-023 — Five-voice reference renders (2026-10-16, Chinmay's Claude)
**Change:** 60 s, 48 kHz WAV renders of the five-voice mix (Wanderer plus three signatures) with loudness, peak and L/R numbers; references within ±0.5 dB, before and after T-164.
**Why:** the real mix has never been heard or measured; the Bass is about 5 dB above the Bell.
**Impact:** S; tooling; headset week.
**Status:** approved (D-056, group B: may be built)

### P-024 — Developer audio capture switch and health log (2026-10-16, Chinmay's Claude)
**Change:** a developer-only switch that taps the master output with an AudioWorklet into a 48 kHz WAV, plus a once-a-second log (context state, sample rate, latencies, dropouts if available, tick timing, voice count).
**Why:** DEVICE_SCRIPT_S1 cannot measure any audio on the Quest; the Quest recorder is lossy.
**Impact:** S–M; debug-only; headset week.
**Status:** approved (D-056, group B: may be built)

### P-025 — Pass rules for T-164 UI sounds (2026-10-16, Chinmay's Claude)
**Change:** UI sounds start at the current audio time; −10 to +3 LU relative to the music; partials inside the room's chord; ≤ 70 ms from pinch to sound.
**Why:** feedback lagging 70–100 ms is rated worse; the scheduler's look-ahead alone is 95–120 ms.
**Impact:** XS (rules); with T-164.
**Status:** approved (D-056, group A: may be built)

### P-026 — Same-key room renders for an ABX test (2026-10-16, Chinmay's Claude)
**Change:** same-key, same-seed renders that change only the reverb, plus pairs 1.2 vs 1.6 s and 1.6 vs 2.0 s.
**Why:** proves "the room changes the sound" before the Devpost copy claims it.
**Impact:** S; tooling; before G2.
**Status:** approved (D-056, group B: may be built)

### P-027 — Scheduler and voice-steal stress renders (2026-10-16, Chinmay's Claude)
**Change:** offline renders with injected main-thread stalls of 50/95/120/200 ms; a steal in a near-silent bed; a solo Bell at its top notes.
**Why:** the −34.7 dB residual after a steal, Bell aliasing and the C♯6/D6 partial clash are untested.
**Impact:** S; tests only; headset week.
**Status:** approved (D-056, group B: may be built)

### P-028 — A testable, durable listening clock (if P-015 is adopted) (2026-10-16, Chinmay's Claude)
**Change:** count monotonic visible session time with a cap per tick; the time-lapse switch never writes the real counter; Playwright-clock e2e tests; call `navigator.storage.persist()`.
**Why:** `AudioContext.currentTime` cannot be faked in e2e tests; a multi-year garden lives in best-effort storage.
**Impact:** S; with P-015.
**Status:** rejected for this submission (D-056: Parth skips the rest of the PM plan)
