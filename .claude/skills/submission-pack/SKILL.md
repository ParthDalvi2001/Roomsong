---
name: submission-pack
description: Assemble and verify Roomsong's final Devpost submission package: compliance gate, Devpost form copy with real numbers, video script check, gallery images list, build link verification, evidence archive, and the go/no-go. Use during the Release phase (T-180..T-187) or when the user says "prepare submission".
---

# Submission pack

Work through `specs/00-hackathon/SUBMISSION_CHECKLIST.md` and `specs/00-hackathon/HACKATHON_RULES.md` §5–§10. Produce a single report the human can act on.

## 1. Compliance gate (HACKATHON_RULES §10)
Fill C1–C10 with evidence paths under `specs/06-release/evidence/`. Any ❌ → stop and list the fix.

## 2. Devpost copy
- Name, tagline (count chars ≤140), track = Entertainment, division = New Experience.
- Description from SUBMISSION_CHECKLIST §2.1 with **real numbers** (fps, draw calls, rooms tested, time-to-first-sound) pulled from PROGRESS.md; word count ≤500 (run `wc -w`).
- Hand-interaction paragraph; "what excites us" paragraph (ask the human for one honest sentence if missing).
- Team members: name/email/role (ask the human; never invent).
- Target launch date: Q1 2027 (Horizon Store PWA) unless changed.

## 3. Video
Confirm: length < 3:00 (`ffprobe` if the file is local), public YouTube/Vimeo link opens in an incognito session, real device footage, captions burned in, no AI-generated video, leads with the hook, no brands/people.

## 4. Build link
`curl -fsS <prod>/version.json` matches tag `v1.0.0-submission`; open from a second device; enters XR hands-only (human confirms). Link is free, no login.

## 5. Gallery
6 images per SUBMISSION_CHECKLIST §2.2, 1920×1080, real captures.

## 6. Evidence archive
`specs/06-release/evidence/submission/`: dist zip, specs snapshot zip, video file, version.json, Pages run screenshot, and (after submit) the Devpost confirmation screenshot. Remind the human to keep an offline copy.

## 7. Go/no-go
Print the SUBMISSION_CHECKLIST §4 list with ✅/❌ and a one-line recommendation. The human submits; Claude never submits.
