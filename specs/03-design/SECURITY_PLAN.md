# Security & Access Control Plan — Roomsong

**Status:** Approved · **Owner:** software-architect · Reviewed by: `agent-skills:security-auditor` (T-014)

---

## 1. Scope & posture
Roomsong is a **static, client-only WebXR app** with **no accounts, no server, no network calls after load, and no personal data**.
The security goal is therefore: (a) nothing can be injected into what judges run, (b) nothing leaves the device, (c) the hosted artefact is immutable during judging.

## 2. Authentication & authorization
- **None required.** There are no users, roles or sessions. The app is free and public, as the contest requires.
- Browser permissions requested: WebXR (hands, planes, meshes, anchors, hit-test). Camera passthrough is handled by the OS; the app never receives camera pixels (we do not use Passthrough Camera Access).

## 3. Data handling

| Data | Where | Retention | Leaves device? |
|---|---|---|---|
| Garden state (plants, seeds, settings) | IndexedDB / localStorage, origin-scoped | Until the user chooses "New garden" or clears site data | **No** |
| Anchor handle (opaque UUID from the browser) | IndexedDB | Same | **No** |
| Room geometry (planes/meshes) | Memory only, per session | Discarded on exit | **No** |
| Hand joint data | Memory only, per frame | Discarded | **No** |
| Crash/log data | Console only (dev builds show an overlay) | None | **No** |

No telemetry, analytics, cookies, fingerprinting or third-party embeds. Privacy statement on the landing page: *"Everything stays on your headset."*

## 4. Supply chain
- Dependencies pinned with a lockfile; `npm audit` runs in CI (fail on high/critical).
- No runtime CDN scripts; all code is bundled. Fonts (if any) are bundled, not fetched.
- GitHub Actions use pinned major versions; the deploy job has `contents: write` only to `gh-pages`.

## 5. Web hardening
- HTTPS only (GitHub Pages). Service worker scope limited to the app path.
- `Content-Security-Policy` via `<meta http-equiv>`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; media-src 'self'`.
  (`unsafe-inline` for styles only if UIKit requires; otherwise removed in T-014.)
- `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff` via meta where applicable.
- No `eval`, no `innerHTML` with dynamic content. User-controlled text: none (no text input anywhere).

## 6. Integrity during judging
- `main` and `gh-pages` protected; deploys only via CI from tagged commits after 2026-11-15.
- The submission tag `v1.0.0-submission` is immutable; the deployed hash is recorded in RELEASE_NOTES.md and `specs/06-release/evidence/`.
- Daily uptime check (manual or a GitHub Actions cron hitting the URL) through 2026-12-11.

## 7. Threat model (STRIDE-lite)

| Threat | Risk | Control |
|---|---|---|
| Tampered hosted bundle | Low | Protected branches, CI-only deploys, hash recorded |
| Malicious dependency | Low–Med | Lockfile, audit in CI, minimal deps |
| XSS | Very low (no dynamic text) | CSP, no innerHTML |
| Data exposure | None (no data leaves) | Architecture |
| DoS of hosting | Low | GitHub Pages; fallback plan: Vercel mirror prepared but **not** switched during judging unless the primary is down (record in DECISIONS_LOG) |
| Policy violation (content) | Med (disqualification) | Compliance gate; no brands/people; 10+ rating; QA sweep |

## 8. Compliance mapping
- Meta Developer Policies / Content Guidelines: no prohibited content; privacy by design (no data collection) satisfies data-use policies.
- Contest rules §4: no malware, nothing deceptive; originality proven via Git history and license log.

## 9. Incident response (during judging)
If the prod URL is down: devops-engineer verifies within 1 h, re-deploys the **same tagged artefact** (no code change) or activates the mirror; log it in DECISIONS_LOG with timestamps. No functional changes are ever made after the deadline.
