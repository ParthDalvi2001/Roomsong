# Quick start — Roomsong commands (on demand; not auto-loaded)

```bash
npm install --cache "${TMPDIR:-/tmp}/roomsong-npm-cache" --no-audit --no-fund   # the --cache flag is needed until `sudo chown -R $(id -u):$(id -g) ~/.npm` has been run once
npm run dev        # IWSDK dev server + IWER emulator at https://localhost:8081 (stop: npm run dev:down)
npm run verify     # typecheck + lint + unit tests + build; must be green before every commit
npm run test:e2e   # Playwright + IWER emulated XR
npm run build      # production build → dist/
npx claude-token-optimizer@2.3.20 audit   # token check of the always-loaded instructions (target: keep CLAUDE.md small)
```

- Sound prototype (T-102): `cd proto/sound && npm install && npm run dev`.
- Git: work on `develop` through feature branches or agent worktrees, squash-merged after verify and review. `main` is release-only and pushed by Parth.
- Two dev servers at once clash on port 8081: give the second one another port.
