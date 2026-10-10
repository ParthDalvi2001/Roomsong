# Submission Checklist, Devpost Copy, and Video Script

**Status:** Living · **Owner:** product-owner (copy), devops-engineer (links), qa-engineer (final verification) · **Version:** 2.0 (2026-10-10, REPLAN)
**Target submit time:** 2026-11-17 18:00 IST (about 1.5 days of buffer before 2026-11-18 12:00 PT) · **Representative:** Chinmay

> **Footage note (REPLAN §6):** the rules (HACKATHON_RULES §5.2) allow video "via XR Simulator or an equivalent emulator",
> so emulator footage is a legal fallback. **Device footage is strongly preferred** and is what judges expect in the
> Entertainment track; if no headset exists by 2026-10-27 (Emergency mode) the video is cut from emulator captures and
> the description says plainly what was device-tested. Never mix the two without a caption.

---

## 1. Timeline to submission

| Date (IST) | Milestone | Owner |
|---|---|---|
| 2026-11-12 | Feature freeze. Only bug fixes after this. | scrum-master |
| 2026-11-01 (G2) | **First rough video cut** (device footage if a headset exists, else emulator placeholder) | Parth + ux-designer |
| 2026-11-13 | Video capture day 1 (headset footage, all beats; emulator if Emergency mode) | Parth + ux-designer |
| 2026-11-14 | Video edit v1, screenshots, gallery images; Chinmay reviews | Parth + Chinmay + ux-designer |
| 2026-11-15 23:59 | **Code freeze.** Tag `v1.0.0-rc1`, deploy to prod (host per Q6). | devops-engineer |
| 2026-11-16 | Full UAT on a clean headset against the prod URL (emulator UAT if no headset; mark as such). Fix only S1 bugs. | qa-engineer + Parth |
| 2026-11-17 12:00 | Tag `v1.0.0-submission`, final prod deploy, lock the deploy branch | devops-engineer |
| 2026-11-17 18:00 | **Devpost submit.** Screenshot the confirmation. | Chinmay (Representative) |
| 2026-11-18 → 12-11 | Hands off. Daily uptime check only. No deploys to prod. | devops-engineer |

## 2. Devpost form: field-by-field

| Field | Content (draft; product-owner finalises in T-085) |
|---|---|
| **Name** | Roomsong *(working title; the human renames from the shortlist, then global replace)* |
| **Tagline (≤140)** | Plant glowing seeds on your real table with a pinch. Each one sings. Every room gives your garden its own song. *(111 chars)* |
| **Track** | Entertainment |
| **Division** | New Experience |
| **Build link** | Public HTTPS URL on the host chosen in Phase 1 (GitHub Pages / Vercel / Netlify, PRD Q6); frozen until 2026-12-11 |
| **Video** | YouTube, public, < 3:00; device footage preferred, emulator allowed (see footage note) |
| **Target launch** | Q1 2027 on the Meta Horizon Store as a PWA (via the `hz-store-pwa` path) |
| **Team** | Parth · email · Developer; Chinmay · email · Product Manager (Representative). Agents are not team members. |

### 2.1 Description template (≤500 words). Fill it in with real numbers from the final build.

```markdown
## Inspiration
Most people never compose music, because instruments ask for skill before they give back joy.
We wanted the opposite: a song you *grow*, where your hands do the planting and your real room picks the key.
Generative "tap to bloom" music and room-as-instrument apps exist; we wanted a garden that is *composed on a
table*, *kept across days*, and *tuned by the room it is in*.

## What it does
Roomsong turns your real table into a glowing ring-shaped garden bed. When the bed settles, a ripple of light
crosses your table, your nearest wall and your ceiling, and each one rings a note: your room's size and shape have
just chosen the garden's key, mood, tempo and echo. The same room always gives the same song. A different room
re-tunes the same plants into a new one.
Turn your palm up and a seed floats into it. Pinch to plant it: where you place it around the ring sets *when* it
sings, and which of the 5 rings it lands on sets *its pitch*. Five voices (bell, pad, pluck, bass, choir), always in
tune. Pull a plant up to make it louder and longer; drag it to move it; drag it off the ring to remove it (with a
5-second undo). Then rest your hands and lean back. The lights dim, a glow rises over the garden <and vines of light
climb your wall if one is near>, and the garden performs in spatial audio, each sound coming from where that plant
sits in your room.
Your garden is saved on the headset and comes back to your table. <A new seed arrives each day and plants grow
over 1, 3 and 7 days,> so there is a reason to come back for five quiet minutes, and a reason to carry it to another room.

## How hands are used
100% hands-first, no controller needed: palm-up to receive, pinch to plant, pinch-pull to grow, pinch-drag to move,
drag off the ring to remove, palms-out (or a pinch on the Listen orb) to listen, palm-to-face to wake. Every target
has a ≥<N> cm hit radius, pinch hysteresis and smoothing for stable tracking. Accessibility: one-hand mode, head-gaze
dwell for selection and Listen mode, high-contrast and colour-blind-safe voice shapes, a visual beat ring, reduced motion
(the tuning ripple becomes a glow sequence).

## How we built it
Immersive Web SDK + Three.js + TypeScript, running in Meta Quest Browser via WebXR.
Plane detection places the bed on your table; the room's detected features (table height and area, floor area, wall
count, ceiling height) feed a deterministic, quantised function that returns the room signature: key, mode, tempo,
reverb size, starter voices and palette tint. A 4-level placement fallback (table → any surface → hit-test → floating bed)
and a "wanderer" signature mean it works, and sings, in any room. All visuals are procedural shaders with GPU instancing
(<N> draw calls), and every sound is synthesized live with the Web Audio API with HRTF panning: no samples, no
third-party services. Measured <N> fps on Quest 3 across a 10-minute session.
**Honesty line (fill in at submit):** <"Tested on Quest 3 in N rooms" | "Built and verified in the Immersive Web
Emulator; device testing was limited to N sessions / not possible before the deadline">.

## Challenges
<real challenges from DECISIONS_LOG / BUG_LOG, e.g. stable pinch placement, quantising the signature so noise never
re-tunes a room, perf, room variety, building without a headset>

## What's next
Shared gardens (visit a friend's garden and hear it in *your* room's key), more voices, and a Horizon Store launch in Q1 2027.

## What excites us about VR
<one honest paragraph from the team>
```

Copy rules: no competitor or brand names; no "first ever" / "no other app" claims (REPLAN §9: unverified);
angle-bracket fields are filled only with numbers measured on the final build; remove any sentence about a feature
that was cut at G2 (vines, daily seed, growth) rather than leaving it vague.

### 2.2 Gallery images (6, 1920×1080, real captures, no mock-ups)
1. Hero: a garden in full bloom on a real table, halo glowing (vines on the wall if S2 shipped).
2. The tuning ripple crossing the table and wall, with the "Tuned by" read-out visible.
3. Palm-up: a seed arriving in the hand.
4. Pinch-planting close-up, with the ring-shaped bed and its 5 pitch rings visible.
5. Two rooms, two songs: the same garden on a desk and on a dining table, side by side.
6. Accessibility settings panel, high-contrast mode on.

## 3. Video script (target 2:30, hard cap 2:55)

| Time | Shot (headset capture preferred; emulator if Emergency mode, captioned as such) | VO / caption (English) |
|---|---|---|
| 0:00–0:08 | Hero: a garden blooming on a kitchen table, halo glowing, music swelling | "I grew this song on my kitchen table." |
| 0:08–0:20 | Cold launch → the ring-shaped bed settles on the table | "No controllers. No tutorial." |
| 0:20–0:35 | **Tune:** the ripple crosses the table, then the wall, then the ceiling; each rings a note; the "Tuned by" line appears | "Your room picks the key. This table made that note." |
| 0:35–0:50 | Palm-up → the first seed floats in → pinch-plant three seeds; the tide sweeps; the first melody plays | "Open your hand. Where you plant is when it sings. How far out is how high." |
| 0:50–1:10 | Pull to grow, drag to move, drag off the ring to remove, undo petal | "Shape every voice with your hands." |
| 1:10–1:35 | Palms out → listen mode: lights dim, halo rises, spatial audio (vines on the wall if S2 shipped) | "Then lean back. Your room becomes the concert hall." |
| 1:35–2:00 | **Two rooms, two songs:** the same garden carried from a small desk to a dining table; the ripple re-tunes it; both songs heard back to back | "Same garden. Different room. Different song." |
| 2:00–2:15 | Fallback: no table (floating bed), no walls (wanderer key) in a sparse room or airplane-style seat | "Works on any table, in any room, even without one." |
| 2:15–2:30 | Accessibility montage: one-hand, gaze dwell, high contrast, beat ring; (if S3 shipped: next-day growth + new seed, via `fakeDay`) | "Built for every pair of hands." |
| 2:30–2:40 | Title card + URL | "Roomsong. Every room has its own song." |

Capture rules: record on Quest 3 with the in-headset recorder or `metavr` screen capture, 1080p 60 fps. If recording from the
emulator (allowed by the rules; see footage note at the top), capture the browser at 1080p 60 fps with the emulator's hand
overlay visible, and caption the first such shot "captured in the Immersive Web Emulator". Use `forceSignature` and `fakeDay`
flags only to stage the two-rooms and next-day beats; what is shown must be reachable by a judge.
Add captions burned in. Music in the video comes only from the app itself. **No AI-generated video.**

## 4. Final go/no-go (qa-engineer runs; product-owner signs)

- [ ] HACKATHON_RULES.md §10 compliance gate: every item ✅
- [ ] UAT_PLAN.md: every P0 scenario passed on the prod URL from a **clean** headset (cleared site data)
- [ ] BUG_LOG.md: zero open S1/S2 bugs
- [ ] Video: public, < 3:00, plays in an incognito browser; emulator shots (if any) are captioned as such
- [ ] Build link opens and enters XR in Quest Browser, tested from a second device (or: emulator-only, recorded as a known gap in the description)
- [ ] Description read aloud once for clarity; a word count of ≤500; no brand/competitor names; no unverified "first/only" claims; the honesty line about device testing is filled in
- [ ] Every team member listed with a role (Parth: Developer; Chinmay: Product Manager, Representative)
- [ ] Representative (Chinmay) confirmed as a Start Program member before the submit day
- [ ] Submission confirmation screenshot saved to `specs/06-release/evidence/`
- [ ] `v1.0.0-submission` tag pushed. Prod deploy is now **frozen**.
