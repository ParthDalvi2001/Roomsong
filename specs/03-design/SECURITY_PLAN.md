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
| Anchor handle (opaque UUID from the browser) and its placement level | IndexedDB / localStorage (the fallback), origin-scoped: it is part of the garden state | Same | **No** |
| Room geometry (planes/meshes) | Memory only, per session | Discarded on exit | **No** |
| Hand joint data | Memory only, per frame | Discarded | **No** |
| Crash/log data | Console only (dev builds show an overlay) | None | **No** |

No telemetry, analytics, cookies, fingerprinting or third-party embeds. Privacy statement on the landing page: *"Everything stays on your headset."*

## 4. Supply chain
- Dependencies pinned with a lockfile; `npm audit` runs in CI (fail on high/critical).
- No runtime CDN scripts; all code is bundled. Fonts (if any) are bundled, not fetched.
- GitHub Actions use pinned major versions; every job has `contents: read`, and only the `deploy` job adds `pages: write` and `id-token: write`. There is no `gh-pages` branch.

## 5. Web hardening
As built by T-109 (merged 2026-10-10, `develop` f3ac045). Checked on the built pages in headless Chromium and in the emulator; nothing here has run on a headset or on the hosted site yet.
- HTTPS only (GitHub Pages, and the mirror). *Superseded (D-011):* "Service worker scope limited to the app path": there is no service worker.
- `Content-Security-Policy` via `<meta http-equiv>` on every built page (the app and the two device test pages under `proto/`), added by `vite.config.ts` at build time only:
  `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' data:; style-src-attr 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'`
  - No remote host is allowed anywhere. Blocked: `eval`, inline scripts and event handlers, `<style>` elements, every other host, all `blob:` URLs.
  - Four relaxations, each there because the built page reports a violation without it: `'wasm-unsafe-eval'` (UIKit's layout engine is WebAssembly), `connect-src data:` (that binary is read from a `data:` URL in the bundle), `style-src-attr 'unsafe-inline'` (the `style` attribute on `<body>`), `img-src data:` (the empty favicon).
  - The SDK has `blob:` paths the app does not use yet (font worker, glTF textures, Draco and KTX2 workers). The first feature that needs one needs a reasoned change in two places: `vite.config.ts` and `scripts/check-dist.mjs`, which holds its own copy of the string.
  - The dev server carries no policy, on purpose: its emulator needs inline scripts and a WebSocket.
  - *Superseded (T-109):* the draft policy that stood here (`style-src 'self' 'unsafe-inline'`, `worker-src 'self'`, `media-src 'self'`, "removed in T-014").
- Not set: `Referrer-Policy` and `X-Content-Type-Options`. *Superseded (T-109):* "via meta where applicable". `X-Content-Type-Options` cannot be set from a meta tag and GitHub Pages lets a site set no response headers; no referrer meta tag is in the pages.
- No `eval`: the policy blocks it, and no built file contains `eval` or `new Function` (zod, which probed for it, left the build with T-171). No `innerHTML` with dynamic content: none in `src/` or the test pages today, kept by review, not by a gate. User-controlled text: none (no text input anywhere).

Gates (NFR-SEC-01, Golden Rule 9). `npm run verify` runs the first four; CI runs all seven (DEPLOYMENT_GUIDE §2).
| Gate | Runs in | Fails when |
|---|---|---|
| `scripts/check-dist.mjs` | verify | a built page does not carry exactly the policy above, or holds an inline script, event handler or `<style>` element; a file in `dist/` holds a remote URL string that is not in `scripts/check-dist.allowlist.json` with the reason it is never requested; a listed string is no longer in `dist/` |
| TC-PER-03, `tests/unit/policy/no-network.test.ts` | verify (unit) | code in `src/` names `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `RTCPeerConnection` or `WebTransport`, or holds a URL literal |
| `tests/unit/policy/todo.test.ts` | verify (unit) | a `TODO` or `FIXME` has no task or bug id on its line |
| TC-PERF-05, `scripts/check-size.mjs` | verify | the first load of `index.html` is over 4000 kB gzip (FR-SYS-06; about 1970 kB on 2026-10-10) |
| `tests/e2e/04-built-page-policy.spec.ts`, `02-spike.spec.ts` | `npm run test:e2e` | a built page (app, pinch page, capability page) reports a policy violation |
| TC-E2E-01 network guard | `npm run test:e2e` | an HTTP(S) request or a WebSocket leaves localhost in an emulated session, with hands or with controllers (dev page; BUG-001, D-027) |
| `npm run audit` | CI only | a production dependency has an advisory of high severity or above (0 on 2026-10-10) |

Known limits, stated in the files: the URL sweep sees a host that SDK code joins from pieces only as its fixed head, and the `src/` check does not see a name split inside a word. In both cases the policy still blocks the request in the browser.

## 6. Integrity during judging
- `main` is locked at submission and the `github-pages` environment requires Parth's review (DEPLOYMENT_GUIDE §5). Every deploy is a push to `main` built by `deploy.yml`; tags are labels and deploy nothing.
- The submission tag `v1.0.0-submission` is immutable; the deployed hash is recorded in RELEASE_NOTES.md and `specs/06-release/evidence/`.
- Daily uptime check (manual or a GitHub Actions cron hitting the URL) through 2026-12-11.

## 7. Threat model (STRIDE-lite)

| Threat | Risk | Control |
|---|---|---|
| Tampered hosted bundle | Low | `main` locked, deploys only through `deploy.yml`, `version.json` commit recorded |
| Malicious dependency | Low–Med | Lockfile, audit in CI, minimal deps |
| XSS | Very low (no dynamic text) | CSP, no innerHTML |
| Data exposure | None (no data leaves) | Architecture |
| DoS of hosting | Low | GitHub Pages plus a Vercel or Netlify mirror of the same build, both live and both named in the Devpost text (D-022) |
| Policy violation (content) | Med (disqualification) | Compliance gate; no brands/people; 10+ rating; QA sweep |

## 8. Compliance mapping
- Meta Developer Policies / Content Guidelines: no prohibited content; privacy by design (no data collection) satisfies data-use policies.
- Contest rules §4: no malware, nothing deceptive; originality proven via Git history and license log.

## 9. Incident response (during judging)
If the prod URL is down: devops-engineer verifies within 1 h, re-runs `deploy` on `main` (a rebuild of the submitted commit: same `commit`, new `builtAt`) or points to the mirror, which holds the identical `dist/`; log it in DECISIONS_LOG with timestamps. No functional changes are ever made after the deadline.
