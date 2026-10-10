# Submission Checklist, Devpost Copy, and Video Script

**Status:** Living · **Owner:** product-owner (copy), devops-engineer (links), qa-engineer (final verification) · **Version:** 2.1 (2026-10-10, plan v2.1 propagated by T-113: PLAN_AMENDMENT §3/§6, D-021, D-022; v2.0 REPLAN)
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
| 2026-11-03 (G2, D-023) | **First rough video cut** (device footage if a headset exists, else emulator placeholder) | Parth + ux-designer |
| 2026-11-13 | Video capture day 1 (headset footage, all beats; emulator if Emergency mode) | Parth + ux-designer |
| 2026-11-14 | Video edit v1, screenshots, gallery images; Chinmay reviews | Parth + Chinmay + ux-designer |
| 2026-11-15 23:59 | **Code freeze.** Tag `v1.0.0-rc1`, deploy to GitHub Pages **and** the mirror (D-022); check from a second device or network that `version.json` shows the same build hash on both (T-183). | devops-engineer + Parth |
| 2026-11-16 | Full UAT on a clean headset against the prod URL (emulator UAT if no headset; mark as such). Fix only S1 bugs. | qa-engineer + Parth |
| 2026-11-17 12:00 | Tag `v1.0.0-submission`, final deploy to both hosts (same hash), lock the deploy branch | devops-engineer |
| 2026-11-17 18:00 | **Devpost submit.** Screenshot the confirmation. | Chinmay (Representative) |
| 2026-11-17, straight after | **Post-submission smoke test** from a clean browser profile (§5) | Chinmay + devops-engineer |
| 2026-11-18 → 12-11 | Hands off. Daily uptime check of both links only. No deploys to prod. | devops-engineer |

## 2. Devpost form: field-by-field

| Field | Content (draft; product-owner finalises in T-085) |
|---|---|
| **Name** | Roomsong (D-016) |
| **Tagline (≤140)** | Plant glowing seeds on your real table with a pinch. Each one sings. Every room gives your garden its own song. *(111 chars; names the input, a pinch, and the place, your real table)* |
| **Track** | Entertainment |
| **Division** | New Experience |
| **Build link** | `https://parthdalvi2001.github.io/Roomsong/` (GitHub Pages, the submitted WebXR link, D-022; live once Parth enables Pages, T-108). The mirror (Vercel or Netlify, the same build hash) is named in the description, not in this field. Both frozen until 2026-12-11 |
| **Build hash** | The short commit hash of the submitted build, as served in `version.json` on both links; quoted in "How to test" |
| **Video** | YouTube, public, **60–90 s** (the rule cap is < 3:00); device footage preferred, emulator allowed (see footage note); chapters in the YouTube description |
| **Target launch** | Q1 2027 on the Meta Horizon Store as a PWA (via the `hz-store-pwa` path) |
| **Team** | Parth · email · Developer; Chinmay · email · Product Manager (Representative). Agents are not team members. |

### 2.1 Description template (≤500 words). Fill it in with real numbers from the final build.

Sections required by plan v2.1: **How to test**, **How this meets the brief**, **Known limitations**, **What's next**, plus both links
and the build hash. "How to test" comes first: a judge who cannot start the build reads nothing else.
The template below is 496 words as written (headings, placeholders and both honesty alternatives counted); count again after filling it in.

```markdown
## How to test
Quest 3 or 3S, Meta Quest Browser, hand tracking on, controllers down, seated at a table. Open <GitHub Pages URL>,
tap Enter and allow the room and hand permissions (declining still works, with a floating garden and a default
song). Expect a glowing ring on your table and a three-plant loop within 90 seconds.
Mirror, same build: <mirror URL>. Build <hash> (/version.json on both).

## Inspiration
Instruments ask for skill before they give back joy. We wanted a song you *grow*: your hands plant it, your table
holds it, your room tunes it.

## What it does
Roomsong turns your real table into a glowing ring-shaped garden. Turn your palm up and a seed floats in. Pinch to
plant it: its place around the ring sets *when* it sings, its ring sets *how high*. Five voices, always in tune.
Pull a plant up to make it louder; drag it to move it, or off the ring to remove it.
Your room tunes the song: its size sets the key, its ceiling height the scale, its volume the echo. A ripple of
light shows it happen. In another room the same plants play a new song.
Then lean back: the lights dim, a halo rises and the garden performs, each voice coming from its plant.
It is saved and returns to its place on your table. <A new seed arrives daily; plants grow over 1, 3 and
7 days.>

## How this meets the brief
- **Entertainment:** Listen mode is music visualization in spatial audio, enjoyed leaning back.
- **Hands-first:** every step works with bare hands; there is no controller path.
- **Seated and short:** all within <0.75> m; first sound in <N> s; a session fits in 10 minutes.
- **Purposeful mixed reality:** the table is the stage, the room is the tuning.
- **Original:** all sound is synthesized live, all visuals are procedural; nothing leaves the headset.

## How we built it
Immersive Web SDK, Three.js and TypeScript in Meta Quest Browser (WebXR). Plane detection places the bed. A
deterministic, quantised function turns the room's measurements into key, scale and echo; a 4-level placement
fallback and a default song cover rooms it cannot read. Instanced procedural visuals (<N> draw calls), Web Audio
synthesis (<N> voices). <Measured N fps on Quest 3 over 10 minutes.>
To our knowledge it is the first consumer MR instrument, and the first on Quest, in which the room's geometry tunes
the music; art and research projects (MR4MR, ARCHISCORE, RoomTone) explored the idea before us.

## Known limitations
<"Tested on Quest 3 in N rooms." | "Verified in the Immersive Web Emulator; device testing: N sessions / none.">
The echo is a musical mapping of room size, not an acoustic measurement. A room with no scanned table or walls
gets the default song. Very bright or dim light can disturb hand tracking. <Other real gaps.>

## What's next
<Should-haves that missed the cut;> shared gardens (hear a friend's garden in *your* room's key) and
a Horizon Store launch in Q1 2027.
```

Separate form field (HACKATHON_RULES §5.3: hand interactions and the future of VR; Chinmay confirms the real field list in T-115).
If the form has no such field, this text goes into the description and the whole must still be ≤500 words.

```markdown
## How hands are used
100% hands-first, no controller needed: palm-up to receive, pinch to plant, pinch-pull to grow, pinch-drag to move,
drag off the ring to remove, palms-out (or a pinch on the Listen orb) to listen, palm-to-face to wake. You see your
own hands in passthrough; the app draws none. The cell or plant a pinch will act on glows first, and every action
commits when you let go. Targets are <2.5> cm wide with a <4> cm hit radius, pinch hysteresis and smoothing. If a
hand leaves the headset's view, whatever it held goes back to its place. Accessibility: one-hand mode, head-gaze
dwell for selection and Listen mode, high contrast, voices told apart by shape, a visual beat ring, reduced motion
(the tuning ripple becomes a glow sequence), and nothing flashes more than 3 times per second.

## What excites us about VR
<one honest paragraph from the team>
```

Copy rules (product-owner checks each one before the go/no-go):
- **Numbers:** angle-bracket fields are filled only with numbers measured on the final build. An fps figure appears only if
  it was measured on a headset; otherwise the sentence is removed and "Known limitations" says the frame rate is unverified.
- **Emulator versus device:** no sentence may present emulator-only behaviour as device-tested. "Known limitations" states
  what was tested on a headset, in how many rooms, and what was not (Golden Rule 11).
- **The "first" claim:** only the qualified sentence above ("to our knowledge … first consumer MR instrument … first on
  Quest"), with the antecedents acknowledged. Never "first musical garden", "first ever", "the only" or "no other app"
  (WINNING_STRATEGY §0.2). The three antecedents are cited as prior art and research, not as products; if Chinmay judges the
  names a risk, write "art and research prototypes" instead. No competitor or brand names anywhere.
- **What the room does (v1):** size → key, ceiling height → scale, volume → echo. Never write that the room sets the tempo,
  that the table sets the key, or that we measure the room's acoustics. Write "the same room gives the same key and scale";
  "always the same song" only if the two-session device check (T-129) passed.
- **Scope:** a Should-have that was not green by 2026-11-10 leaves "What it does" and moves to "What's next" (daily seed,
  growth, Shimmer voice, the browser garden window); a Could-have that was not built is not mentioned at all (vines).
  Never leave a vague sentence about a feature that is not in the build.
- **Links and hash:** the build-link field is the GitHub Pages URL; the mirror is named in the description; the build hash
  in the text equals `version.json` on both links (checked at the freeze and again in §5).
- **Track words:** "spatial audio" and "music visualization" appear in the Listen-mode sentence (track fit).
- **Tagline:** ≤140 characters, naming the input (a pinch) and the place (your real table).

### 2.2 Gallery images (6, 1920×1080, real captures, no mock-ups)
1. Hero: a garden in full bloom on a real table, halo glowing (vines on the wall only if C4 was built).
2. The tuning ripple crossing the table and wall, with its caption or the "Tuned by" read-out visible.
3. Palm-up: a seed arriving in the hand.
4. Pinch-planting close-up, with the ring-shaped bed and its 5 pitch rings visible.
5. Two rooms, two songs: the same garden on a desk and on a dining table, side by side.
6. Accessibility settings panel, high-contrast mode on.

## 3. Video script (60–90 s; the rule cap is < 3:00)

Required beats (plan v2.1): the loop inside the first 10 s · the room signature in two rooms · a day-1 versus day-3 garden ·
the hosted URL at the end · chapters in the YouTube description · device-recorded if a headset exists (else emulator, said
so on screen) · no AI-generated footage · no brands, logos or people in frame.

| Time | Chapter | Shot (headset capture preferred; emulator if Emergency mode, captioned as such) | VO / caption (English) |
|---|---|---|---|
| 0:00–0:10 | Plant | **The loop, at once:** a real table, a hand pinches the third seed into the ring, the tide sweeps, the melody plays | "Pinch. Plant. It sings." |
| 0:10–0:22 | Your room tunes it | **Tune:** the ripple crosses the table, the wall, the ceiling; each rings a note; the in-app captions show | "Your room tunes it. Its size sets the key, its ceiling the scale, its volume the echo." |
| 0:22–0:36 | Shape | The hover glow, then pull to grow, drag to move, drag off the ring to remove, undo petal | "Shape every voice with your hands. No controllers." |
| 0:36–0:52 | Listen | Palms out → Listen mode: lights dim, halo rises, the garden performs in spatial audio | "Then lean back and listen." |
| 0:52–1:08 | Two rooms | **Two rooms, two songs:** the same garden in a small room and in a large one, heard back to back | "Same garden. Different room. Different song." |
| 1:08–1:30 | Come back | **Day 1 versus day 3** (via `fakeDay`; only if S3 shipped, else the same garden restored at its spot) → one-hand, gaze dwell, beat ring, floating bed with no table → title card + **hosted URL** (last 4 s) | "It grows while you are away. Built for every pair of hands. Roomsong. Every room has its own song." |

Chapters go in the YouTube description with these times and names; the first is 0:00 and none is shorter than 10 s.
The video never shows a feature that is not in the submitted build, and never says "your table set the key" (false in v1).

Capture rules: record on Quest 3 with the in-headset recorder or `metavr` screen capture, 1080p 60 fps. If recording from the
emulator (allowed by the rules; see footage note at the top), capture the browser at 1080p 60 fps with a hand cue visible (the app draws no hand models, D-027, so an emulator capture
shows no hands unless the emulator's own overlay or our hand-visibility cue is on; settle this before any emulator capture), and caption the first such shot "captured in the Immersive Web Emulator". Use `forceSignature` and `fakeDay`
flags only to stage the two-rooms and day-3 beats; what is shown must be reachable by a judge.
Keep the frame clean: no brand names or logos (clear the table, cover screens, book spines and packaging), no faces, no
other people; hands only. Add captions burned in. Music in the video comes only from the app itself. **No AI-generated video.**

## 4. Final go/no-go (qa-engineer runs; product-owner signs)

- [ ] HACKATHON_RULES.md §10 compliance gate: every item ✅
- [ ] UAT_PLAN.md: every P0 scenario passed on the prod URL from a **clean** headset (cleared site data)
- [ ] BUG_LOG.md: zero open S1/S2 bugs
- [ ] Video: public, 60–90 s (rule cap < 3:00), plays in an incognito browser, chapters set; every required beat of §3 is in it; emulator shots (if any) are captioned as such; no brands, logos or people in frame
- [ ] Build link (GitHub Pages) opens and enters XR in Quest Browser, tested from a second device (or: emulator-only, recorded as a known gap in the description); the mirror opens too, and `version.json` shows the same build hash on both
- [ ] Description read aloud once for clarity; a word count of ≤500; no brand/competitor names; the four required sections are present (How to test, How this meets the brief, Known limitations, What's next); both links and the build hash are in the text; the only "first" wording is the qualified one (§2.1 copy rules); "Known limitations" says what was device-tested and what was emulator-only
- [ ] Every team member listed with a role (Parth: Developer; Chinmay: Product Manager, Representative)
- [ ] Representative (Chinmay) confirmed as a Start Program member before the submit day
- [ ] Submission confirmation screenshot saved to `specs/06-release/evidence/`
- [ ] `v1.0.0-submission` tag pushed. Prod deploy is now **frozen** on both hosts.
- [ ] After submitting: the post-submission smoke test (§5) passed

## 5. Post-submission smoke test (T-185; Chinmay + devops-engineer, straight after submitting)

Run from a clean browser profile (a private window, signed out of Devpost, GitHub and YouTube), on a second device or network.

- [ ] The public Devpost page opens; name, tagline, track and division are right.
- [ ] The build link on the page is the GitHub Pages URL and loads the landing page; the mirror link in the description loads too.
- [ ] `version.json` on both links shows the same build hash, and it is the hash written in the description.
- [ ] The video plays signed out (public, not unlisted or private), is 60–90 s long, and shows its chapters.
- [ ] On a headset, if one exists: Pages URL → Enter → first sound. With no headset: the same in the emulator, recorded as emulator.
- [ ] Gallery images load. Screenshots of every check saved to `specs/06-release/evidence/`.

If a check fails **before** the deadline (2026-11-18 12:00 PT): fix form text or links and repeat the test; a fault in the build
itself goes to Parth (a new deploy means a new hash on both hosts and the whole §4 list again). **After** the deadline nothing
changes (Golden Rule 10): log the fault in BUG_LOG and leave the submission as it is.
