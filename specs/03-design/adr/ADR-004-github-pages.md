# ADR-004 — GitHub Pages hosting with a staging path

**Status:** Accepted · **Date:** 2026-10-09

## Context
The contest explicitly suggests GitHub Pages for IWSDK entries and requires the build to remain available and unchanged through judging.

## Decision
Deploy production from `main` (tagged) to `https://<org>.github.io/roomsong/`, staging from `develop` to `/staging/`. CI via GitHub Actions. A Vercel mirror is prepared as a cold standby, used only if the primary fails during judging.

## Consequences
+ Free, simple, HTTPS, judge-friendly; a single frozen artefact.
− Base-path configuration in Vite must be correct for both paths (T-006 verifies).
− Service worker must be scoped per path to avoid staging/prod cache collisions.
