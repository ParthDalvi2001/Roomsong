# Roomsong

A hands-first mixed-reality music garden that grows on your real table. You plant glowing seeds with a pinch, a ring of light plays them, and your real room tunes the song.

Entry for the Meta VR Start Developer Competition 2026 (Entertainment track, New Experience division). Built for Meta Quest 3 / 3S in the Meta Quest Browser with the Immersive Web SDK, Three.js, TypeScript and the Web Audio API.

- Project documents and reading order: [specs/README.md](specs/README.md)
- Current status: [specs/08-status/PROGRESS.md](specs/08-status/PROGRESS.md)
- How Claude Code works in this repo: [CLAUDE.md](CLAUDE.md)

## Run it

```bash
npm install
npm run dev        # IWSDK dev server + managed browser with the IWER emulator (Runtime / Editor toggle)
npm run verify     # typecheck + lint + unit tests + build (must be green before every commit)
npm run test:e2e   # Playwright + IWER emulator scenarios: tests/e2e/README.md
```

Scene, asset and XR-feature configuration is declarative in `iwsdk.config.json`; systems are registered in
`src/index.ts`. The scene is empty: the IWSDK starter content (robot, plant, banner, welcome panel) was removed in
T-111. IWER controls: https://iwsdk.dev/guides/02-testing-experience.html#iwer-controls

Code lives in `src/` and `tests/` (scaffolded in T-101 with `npm create @iwsdk@latest`). All code is written after 2026-09-24.
