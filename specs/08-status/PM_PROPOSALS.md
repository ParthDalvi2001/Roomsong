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
