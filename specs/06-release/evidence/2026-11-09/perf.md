# Perf numbers on 9 Nov 2026 (evidence row 3)

**Source:** PROGRESS.md "Perf (latest)" at `develop` 764b6c1 (the device part written in 2ed6cf7, 9 Nov; the emulator
part in 3e42c1a, 25 Oct, and 36b71de, 23 Oct). **D** = a human's headset report, **E** = the emulator.

| Measure | Value | Budget (golden rule 5) | Where and when |
|---|---|---|---|
| Frame rate | about **90 fps**, low 88 (first run low 67) | ≥ 60, target 72 | D, Quest 3S, the dev server with the recorder, 7 Nov (Parth) |
| Frame rate | **90 fps** | ≥ 60, target 72 | D, Quest 3, the live site (build 4bc6c7c), 8 Nov (Chinmay) |
| Draws, triangles, JS on the headset | 11 draws, about 5k triangles, JS under 2 ms | 60, 150k, 6 ms | D, Quest 3S, 7 Nov |
| Worst frame, draws | **48** (both eyes, the counter room with the vine) | ≤ 60 | E, 25 Oct (`26-worst-frame`) |
| Worst frame, triangles | **103 972** | ≤ 150k | E, 25 Oct |
| JS per frame | **2.03 ms** | ≤ 6 ms | E, 25 Oct (`26-worst-frame`) |
| Heap over 5 min | **+1.13 %** (36.56 → 36.97 MB after a full collection) | stable | E, 23 Oct (`27-heap`) |
| Voices | ≤ 24 | — | E |
| First-load bundle | **743.6 kB gzip** | 4 000 kB (check-size) | E, 23 Oct |
| Lights, shadows, post-processing | 0, none, none | — | E |

**Not measured yet** (compliance C5; evidence row 20): a 10-minute session with 24+ plants and Listen on a headset
(TC-DEV-07), the built page's frame rate and 5 s cold start on the Quest 3S (TC-DEV-12), and every number on the freeze
build. The emulator numbers predate the 9 Nov merges (D-071 tint, T-147b sounds).
