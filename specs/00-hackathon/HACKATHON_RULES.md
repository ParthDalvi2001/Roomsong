# Hackathon Rules — Digest & Compliance Checklist

**Status:** Approved · **Source:** https://start-developer-competition-26.devpost.com (Overview, Rules, Judging,
Special Awards and Resources pages, read 2026-10-09; all of them plus Dates, FAQs and Updates re-read 2026-10-15, T-186:
rule text unchanged, see §11; last read live 2026-10-27; 2026-11-08 and 2026-11-09 the site answered HTTP 403, see §12) · **Owner:** product-owner

> These rules are a legal contract. When this digest and the official rules differ, the official rules win.
> Re-check the Devpost **Updates** and **FAQs** tabs every week (task T-090 in the sprint plan).

---

## 1. The contest at a glance

| Item | Detail |
|---|---|
| Name | Meta VR Start Developer Competition 2026 |
| Sponsor | Meta Platforms, Inc. (Devpost is the platform) |
| Total prizes | Up to **$1,000,000 USD** cash |
| Entry period | **2026-09-24 10:00 PT → 2026-11-18 12:00 PT** (= 20:00 UTC = **2026-11-19 01:30 IST**) |
| Judging | ~2026-11-18 → ~2026-12-09 (Rules). Devpost schedule: **2026-11-23 09:00 PST → 2026-12-09 19:00 PST** ([dates](https://start-developer-competition-26.devpost.com/details/dates), read 2026-10-15) |
| Winners announced | ~2026-12-11 (Devpost schedule: 10:00 PST) |
| Participants | **5,595** registered (Devpost header in Parth's screenshots, 2026-11-10; 4,142 on 27 Oct, 3,724 on 23 Oct, 3,390 on 19 Oct, 3,100 on 15 Oct, 2,600+ in early Oct). Last year: 2,900 developers, 650+ submissions |
| Build for | Meta VR devices: **Meta Quest** and **Meta VR Glasses** |
| Theme | **Hands-first** Entertainment, Gaming, or Productivity experiences |

## 2. Eligibility (true at the start of the entry period; Developer Access and the Representative's Start membership only by the time of submission, Rules §2(c)–(d))

- [ ] Every team member is **18+** and has reached the age of majority where they live.
- [ ] No member lives in Brazil, Quebec, or a sanctioned region (Crimea, Russia, Cuba, Iran, North Korea, Syria, or OFAC-listed). **India is eligible.**
- [ ] Every member has an active **Meta account with Developer Access**. For a team, at least one member has admin control of the shared developer account.
- [ ] The person who submits (the **Representative**) is a **Meta VR Start Program member** by the time of submission. Apply at https://developers.meta.com/vr/discover/programs/start/ (about 5 minutes).
- [ ] No member is a Meta employee, a family or household member of one, a government official, or otherwise conflicted.
- [ ] The project has **never received Meta funding** (for example a Start Lifestyle RFP or other Meta development funding).
- [ ] No member is bound by an agreement that blocks participation. Check employment contracts and IP assignment clauses.

### Entry limits
- Each individual may submit **one** Entry, either solo or as a Team Representative.
- A person may be a **non-Representative member of several teams**. That does not count as an entry.
- A person **cannot** both submit solo and act as a Team Representative.
- Our setup: **one Representative** submits one entry, and every other member is listed on the form.

## 3. What must be built

| Requirement | Our answer |
|---|---|
| A VR/MR application for Meta VR devices | WebXR (IWSDK) app running in Meta Quest Browser |
| Aligns with ≥1 track | **Entertainment** |
| One division | **New Experience**: conceived and built after 2026-09-24, with no pre-existing codebase |
| **Hands-first** (HARD): fully usable end-to-end with hands, no controller ever paired | Hands only by design; controller support is *Cut (D-011)* |
| Seated (guideline): "airplane seat test", everything works in a 2 ft radius | Garden bed sits on the table in front of you |
| Easy in/out (guideline): fast cold start, clean pause/resume, satisfying in ≤10 min; "one bus stop test" | Session = plant, shape, listen (3–8 min). Autosave on every action |
| Original, not a wrapper (guideline): "take it away test" | No third-party service at all; everything is entrant-built |
| Permitted tools: public or Start-released SDKs only | IWSDK (public npm), Three.js (MIT), Web Audio (browser) |
| Third-party assets must be properly licensed | Procedural or CC0 only, logged in `06-release/THIRD_PARTY_LICENSES.md` |

**Suggested SDK note (WebXR):** Node.js ≥ 20.19.0, IWSDK via `npm create @iwsdk@latest`.

## 4. Content restrictions (any violation can disqualify)

- [ ] Complies with: Meta VR Start Program Terms, Community Standards, Code of Conduct in VR, Developer App Policies, Developer Content Guidelines, and all Developer Policies.
- [ ] Rated for **10+** under the Meta content guidelines (we target 10+).
- [ ] No malware, spyware or harmful code.
- [ ] Nothing false, deceptive, defamatory, harassing, profane, obscene, adult, hateful or injurious.
- [ ] **No identifiable person** other than the entrants (no real faces or voices of anyone else).
- [ ] No infringement of copyright, trademark, privacy or publicity rights.
- [ ] **No commercial advertising**: no corporate logos, brand names, slogans, branded products or commercial artwork.
- [ ] No implied association between Meta and any person or product.
- [ ] **English**. The app and every submission material are in English (or have English subtitles).
- [ ] Free of charge, and accessible to judges until the winner announcement.

## 5. Submission (three things: build, video, form)

### 5.1 Build access (WebXR path)
- [ ] Public HTTPS link (GitHub Pages; Vercel is an acceptable alternative) that launches in Quest Browser.
- [ ] Stays online, unchanged, until at least **2026-12-11** (winner announcement). We keep it until 2027-01-31.
- [ ] **Do not modify after the deadline.** Judging uses the state at the deadline, and modified projects may be disqualified.
- [ ] Works on first launch with no login, no paywall and no setup beyond granting browser permissions.

### 5.2 Demo video
- [ ] **Under 3:00.** Judges may stop at 3:00, so put the best material first.
- [ ] Footage of the project as viewed **on a Meta VR device**, or via XR Simulator or an equivalent emulator.
- [ ] Uploaded **publicly** to YouTube or Vimeo.
- [ ] Real footage that honestly represents the experience. **No AI-generated video carrying the pitch.**
- [ ] Lead with the story and what makes the project distinct.

### 5.3 Devpost form
- [ ] Submission name
- [ ] Tagline (≤140 characters)
- [ ] Track: Entertainment
- [ ] Division: New Experience
- [ ] Description: inspiration, how we built it, future plans (≤500 words suggested)
- [ ] How hand interactions are implemented, and what excites us about the future of VR (optional, but **we fill it**)
- [ ] Target launch date (not yet published)
- [ ] Name, email and role of each team member
- [ ] Link to the build (GitHub Pages URL)
- [ ] Video link
- [ ] Screenshots / gallery images (strongly recommended; part of Polish & Presentation)

Full form copy and the video script are in [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md).

## 6. Judging

### Stage 1: Pass/Fail viability
"Reasonably fits the theme and reasonably applies the required tools and features."
**Failure modes we must avoid:** needs a controller · will not launch · wrong track fit · link down · video missing or private.

### Stage 2: Four equally weighted criteria (25% each)

| Criterion | What judges look for (official wording, condensed) |
|---|---|
| **Innovation & Creativity** | Originality, creative ambition, relevance to the track. Uniquely leverages Meta device capabilities (spatial depth, hands-first, gaze, passthrough, scene understanding, persistent anchors) **to drive repeat usage**. |
| **Experience Design** | Design, mechanics and user journey for the audience; seated, hands-first, context-specific. Intuitive navigation from entry, clear onboarding, **habit-forming purpose**. **Purposeful passthrough**: the real room meaningfully changes the experience (a table becomes the play surface, walls host content, UI adapts to the space). **FoV-aware**: essential UI inside a narrow, comfortable FoV that adapts across devices. |
| **Technical Implementation** | Expertise, reliability, strategic use of platform tools: gaze interactions, hand tracking, passthrough, spatial anchoring, FoV-aware design. **≥60 fps on Quest hardware**, solid and bug-free. With passthrough: correct scene understanding, content anchored to detected planes, surfaces and room geometry, **holding up in rooms the developer never tested**. |
| **Polish & Presentation** | UI/UX, art direction, sound design. Performant, visually cohesive, clearly relevant to the track. High-quality text, images and video. Honest gameplay footage. |

- AI tools may assist judging, but humans make the final decisions. **Write the description so both an AI and a human summary land the key points.**
- Ties are broken by a judges' vote.

## 7. Prizes (one prize per entry maximum)

| Prize | New Experience | Adapted / Updated |
|---|---|---|
| Best Gaming (winner / runner-up) | $100,000 / $50,000 | $100,000 / $50,000 |
| **Best Entertainment** (winner / runner-up) | **$100,000 / $50,000** | $100,000 / $50,000 |
| Best Productivity (winner / runner-up) | $70,000 / $35,000 | $70,000 / $35,000 |

**Special awards** (open to every track and division, $25,000 each, 1 winner):
Best Social & Multiplayer · Best Agentic Interaction · **Best Reason to Come Back** · **Best First Five Minutes** ·
**Best Accessibility Forward** · **Boldest Original Concept** · plus **Judge's Choice** ($20,000 × 2).
(Bold = awards our design deliberately targets.)

Prize logistics: paid to the Representative, who splits it within the team. A bank account and winner documents
(including government ID) may be required. Taxes are the winner's responsibility; non-US winners receive Form 1042-S and may face US withholding.

## 8. Rights you grant by entering
- You keep your IP. Meta gets a perpetual, worldwide licence to use the entry for evaluation and promotion, plus publicity rights to entrants' names and likenesses.
- **Keep a full copy of everything submitted.** Meta will not provide one. Our Git tag `v1.0.0-submission` plus `specs/06-release/` serve as that record.
- Meta may ask for proof of ownership or licence of any asset. Keep `THIRD_PARTY_LICENSES.md` accurate.

## 9. Support channels
- Meta Developer Forum (competition events, office hours): log in with your Start-membership account.
- Weekly live sessions and webinars (Updates tab). Recommended: "Kill Your Darlings: Scope Your Build".
- Contact: MetaHorizonStart@meta.com

## 10. Compliance gate (product-owner signs this before submission)

| # | Check | Evidence | ✅ |
|---|---|---|---|
| C1 | Entire flow completed with hands only on a real Quest 3 (and 3S if available). **Emergency mode (no headset, D-013):** completed hands-only in the emulator with emulated hand input, and the Devpost description states that device testing was not possible | UAT-01 recording (tagged D or E) | ☐ |
| C2 | Git history shows the first commit on or after 2026-09-24 | `git log --reverse \| head` | ☐ |
| C3 | Every third-party asset is licensed and listed | THIRD_PARTY_LICENSES.md | ☐ |
| C4 | No brands, logos or real people anywhere (app, video, images) | QA visual sweep TC-POL-05 | ☐ |
| C5 | ≥60 fps sustained across a 10-minute session on Quest 3 (OVR Metrics / perf HUD). **Emergency mode:** emulator budgets met (draws ≤60, tris ≤150k, JS ≤6 ms, heap stable) and fps recorded as *unverified* in the sign-off | Perf report (D or E) | ☐ |
| C6 | URL is public, HTTPS, launches with no login | UAT-02 on a clean headset | ☐ |
| C7 | Video < 3:00, public, real footage of the project (device strongly preferred; the rules also accept XR Simulator / equivalent emulator footage — if used, the description says so) | YouTube link | ☐ |
| C8 | Representative is a Start member; every member is 18+ and eligible | Screenshots | ☐ |
| C9 | All text is in English | QA sweep | ☐ |
| C10 | Submitted before 2026-11-18 12:00 PT. Our target is **2026-11-17 18:00 IST** | Devpost confirmation | ☐ |

## 11. FAQ answers that affect us
Source: https://start-developer-competition-26.devpost.com/details/faqs (read 2026-10-15). FAQs explain the Rules; the Rules win.
- **No headset needed to enter:** "you are not required to own a Meta Quest headset to compete." There is no hardware from Start either: "The Start program does not currently provide devkits or hardware."
- **Judges play on device:** "Judges will review apps on a Meta Quest 3 or Quest 3S." "Prioritize performance for Quest 3 and 3s." So C1 and C5 are judged on hardware even if we only reach Emergency mode.
- **Late membership is fine:** Developer Access and Start membership enabled after 2026-09-24 count, "by the time you submit".
- **Check membership:** log in to the Developer Forum (https://communityforums.atmeta.com/category/horizon-developer-forum); a "Start Member" or "Start Partner" flair next to the name confirms it (evidence for C8). "Meta Horizon Start" is the old name of the same program.
- **Edits before the deadline are allowed:** the app and the form (track, division) may change until 2026-11-18 12:00 PT; no changes from then until the winner announcement (~2026-12-11).
- **WebXR link:** a URL is required; GitHub Pages or any host (Vercel, Digital Ocean, AWS, Azure). No third-party devices.

## 12. Weekly rule check, 2026-11-09 (T-186)
**Site unreachable on 9 Nov:** the Overview, `/rules` and `/updates` pages each answered HTTP 403 to one automated fetch (as on 8 Nov); not retried. So there is **no live comparison**: dates, fields, limits, video and hosting rules, hands-first, judging and the special awards stand as read on 27 Oct, and the special award **criteria wording is still not recorded**. The last live read is now 13 days old, past the weekly cadence. **A human (Parth or Chinmay, logged in) reads Rules, Updates, FAQs and the Special Awards page in a browser before the feature freeze on 12 Nov**, records any change here, and copies the award criteria for Best First Five Minutes, Reason to Come Back, Accessibility Forward and Boldest Original Concept into §7.

**The Devpost draft checked against this file and SUBMISSION_CHECKLIST §2 (our files only; `DEVPOST_DRAFT.md` v3, develop 8a525d4).**
Pass: name; tagline A has 111 characters (limit 140) and names the pinch and the real table; Entertainment / New Experience, first commit 2026-10-10; the description has 498 words of 500 (recounted by the same counting rule as the draft); it covers inspiration, how we built it and future plans, and opens with How to test; How this meets the brief, Known limitations and What's next are all there; "music visualization" and "spatial audio" are in the Listen sentence; the room wording follows v1 (no tempo, no "table sets the key", "not measured acoustics"); there is no "first ever" or "the only" claim; the video is planned at 60 to 90 s on public YouTube (limit: under 3:00); the build link is public HTTPS with no login; Known limitations separates what ran on a headset from what ran only in the emulator.
Gaps:
1. **Still open, each with a task:** mirror URL (T-108, DECISIONS_PENDING 7.1), build hash (T-183), video link (T-181), gallery (T-182), team emails (T-185), target launch and "What excites us about VR" (team's words, DECISIONS_PENDING 7.6), the real form field list (T-115, Chinmay).
2. **"Store launch: early 2027." in What's next has no `[not yet]` marker**, but the launch date is not agreed (DECISIONS_PENDING 7.6), so it could ship unagreed. Mark it, or cut it (−3 words).
3. **Numbers are not from the final build:** the fps come from the dev build and from live 45518e5, and the first sound from the emulator on 24 Oct. Re-measure at T-183/T-184 (checklist rule "Numbers").
4. **"one room each" is assumed**; Parth confirms it (checklist rule: say in how many rooms).
5. **The "first" sentence differs from the checklist rule:** §2.1 wants the antecedents acknowledged ("art and research prototypes"). The draft's sentence from 25 Oct names none and does not acknowledge them. ★ Keep the draft's wording ("no earlier consumer MR instrument") and amend the checklist rule to match.
6. **Brand-like names in How to test:** "Bluetooth" (a trademark) and "desktop Chromium". The checklist says no brand names anywhere. Low risk (these are instructions, not advertising). ★ "not wireless headphones" (+1 word) and "a desktop browser" (+1 word) bring the description to exactly 500.
7. **The hands field is 283 words**, and no limit is known for it. If the form has no separate hands field, the text cannot fit in the description (2 words of slack). Settled by T-115.
8. Minor: "the bed about 0.45 m ahead" is a design value with no "(emulator)" or "by design" tag; the draft's own tag rule asks for one. Accept it as a design value or tag it.
Affects: `specs/06-release/DEVPOST_DRAFT.md` (gaps 2, 5 to 8) and `SUBMISSION_CHECKLIST.md` §2.1 (gap 5). The video script is unaffected (no new rule text).

## 13. Rule check, 2026-11-10 (T-186), from Parth's browser screenshots
**Source:** Parth's screenshots of the Dates page, the FAQs, the Rules (whole page) and the Updates, read with macOS text recognition (the site still refuses automated reads, §12). **No rule change since 27 Oct.** Dates, eligibility, entry requirements (WebXR: a link, GitHub Pages or any host), the video (under 3:00, public on YouTube or Vimeo, device or emulator footage), the text description (inspiration, how it was built, future plans, target launch date), track and division, the content and originality rules, judging (Stage 1 pass/fail, four criteria at 25% each, AI may assist, humans decide) and the prizes all read as in §1 to §7.
- **Dates in IST** (Dates page, GMT+5:30): submissions close **19 Nov 01:30**; judging 23 Nov 22:30 to 10 Dec 08:30; winners 11 Dec 23:30.
- **Participants:** 5,595 (was 4,142 on 27 Oct).
- **Clauses to act on:**
  - Rules §3: an entry "generated by a macro, bot, or other automated means will not be accepted". Chinmay fills in and submits the form himself; no agent or browser automation touches the Devpost form.
  - Rules §3: "Purported proof of entry (such as … a screenshot …) does not constitute proof of actual entry". After submitting, check that the project shows as submitted under **My projects**; the screenshot is our own record only.
  - FAQs: the app and the form may change until the deadline (bug fixes included); after it, nothing changes and the app stays available until the winner announcement (Rules §4).
  - Rules §6, Technical Implementation, names "scene understanding (MRUK)". MRUK is Meta's Unity scene kit; in WebXR, plane detection does that job, so the copy says "WebXR plane detection".
  - Form problems: support@devpost.com (FAQs).
- **Updates since 27 Oct** (events and advice, no rule text): "Upcoming Events: Week 6 and Tips to help your entry stand out" ("Finish the core experience … Test with fresh eyes. Ask someone new to try your build without coaching") and "Upcoming Events Week 7 | Preparing your Submission" (events 9–13 Nov, including a packaging workshop recording).
- **Special award wording** (Rules §7, the table; §12 asked for it):
  - Best Reason to Come Back: "Spotlights thoughtful progression and reward design: something to work toward, visible growth between sessions, and a loop that pulls the user back tomorrow. Rewards experiences built for longevity, not a one-time demo."
  - Best First Five Minutes: "Spotlights the craft of the opening: how fast the experience explains itself, teaches controller-free interaction without a wall of text, and delivers a payoff before the user takes the headset off."
  - Best Accessibility Forward Experience: "Pushes the envelope on accessible XR design—voice alternatives for hand interactions, eyes-only navigation for limited mobility, high-contrast modes, or experiences inclusive by default."
  - Boldest Original Concept: "Rewards the idea that couldn't exist anywhere else. A concept whose core loop depends on presence, spatial depth, real-world scale, or eyes and hands. Judged on originality and on whether the experience would fall apart on any other platform."
  - Judge's Choice: "Awarded at judges' discretion for standout entries that don't fit neatly into a single track or category."
- **Not in the screenshots:** the Special Awards tab itself (its text may be longer than the Rules table) and the submission form's field list (T-115, Chinmay).
