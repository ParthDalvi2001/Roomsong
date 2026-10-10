# ADR-004 — GitHub Pages hosting with a mirror (no staging path)

**Status:** Accepted · **Date:** 2026-10-09 · **Confirmed 2026-10-10 by D-022** (GitHub Pages + mirror) and amended by T-108 (as built: no staging path)

## Context
The contest explicitly suggests GitHub Pages for IWSDK entries and requires the build to remain available and unchanged through judging. The 2026 rule text names a "GitHub page" for WebXR links; the most common failure of the 2025 edition was the wrong link (D-022).

## Decision
GitHub Pages is the submitted URL: `https://parthdalvi2001.github.io/Roomsong/`, a sub-path with a case-sensitive name. Every push to `main` is built and published by GitHub Actions (`.github/workflows/deploy.yml`). `main` is release and is pushed only by Parth; `develop` is work. A Vercel or Netlify mirror (host not chosen yet) serves the same build, proven by the same `version.json` on both links; it is named in the Devpost description and is the fallback if Pages fails during judging. Procedure: DEPLOYMENT_GUIDE.

*Superseded (D-022, T-108):* "Deploy production from `main` (tagged) to `https://<org>.github.io/roomsong/`, staging from `develop` to `/staging/`", and the Vercel mirror as a cold standby used only on failure. There is no staging path, no `gh-pages` branch and no tag trigger.

## Consequences
+ Free, simple, HTTPS, judge-friendly; a single frozen artefact.
+ The public history on GitHub is evidence for the New Experience division (D-018).
− **Sub-path.** The site lives under `/Roomsong/`, a mirror at its root. The build uses a relative base (`base: './'` in `vite.config.ts`), so one `dist/` serves both with no per-host setting; a root-absolute URL (`/…`) in app code would break under the sub-path. Proven locally under `/Roomsong/` (T-108); not yet on GitHub.
− **Two links to keep equal.** The mirror must receive the same `dist/`, never a rebuild; equality is checked at the code freeze and at submission (DEPLOYMENT_GUIDE §1.2, §5).
− **No hosted staging.** A change is first hosted when it reaches `main`; before that it is checked on the dev server or with `npm run preview` on the LAN.
− Pages cannot set response headers: no COOP/COEP, so nothing may need `SharedArrayBuffer` (PoC D1), and the Content Security Policy is a meta tag (SECURITY_PLAN §5).
− *Superseded (T-108):* "Base-path configuration in Vite must be correct for both paths (T-006 verifies)": the base is relative and there is one path.
− *Superseded (D-011):* "Service worker must be scoped per path": there is no service worker.
