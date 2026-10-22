# Emulator e2e — Playwright + IWER (T-107)

Everything here runs in **IWER**, the WebXR emulator the IWSDK dev plugin injects into the dev page. It proves
flows and emulator behaviour. It proves nothing about a headset: results are tagged **E**, never **D** (TEST_PLAN §1.1).

## Run

```bash
npm run test:e2e                    # starts its own dev server on https://localhost:8081, headless Chromium, about 2.8 min
E2E_PORT=8091 npm run test:e2e      # a second agent or worktree picks another port
npx playwright test 01-enter        # one file
```

- Stop `npm run dev` in this worktree first: IWSDK allows one dev server per worktree, and the tests never reuse a
  running server (one on the same port may belong to another worktree and serve other code).
- Missing browser: `npx playwright install chromium`.
- Screenshots, traces of failed tests: `tests/e2e/__artifacts__/` (git-ignored). HTML report: `playwright-report/`.
- Rules for new scenarios: wait on state or on `xrFrames`, no fixed sleeps, ≤ 60 s each, one worker.

## How it works

- **Server:** plain `vite` (not `iwsdk dev up`, which has no port option and opens a managed browser).
- **Browser:** Playwright's headless shell. WebGL2 runs on SwiftShader (software) with no extra flags.
- **Network:** `openApp` aborts and records every HTTP(S) request and every WebSocket that would leave localhost,
  so runs are the same online and offline. The emulator's room (`dev.emulator.environment` in `iwsdk.config.json`)
  comes from the dev server, `/__emulator/rooms/<name>.json`, served by the dev plugin in `vite.config.ts` from the
  `table` fixture (BUG-002: nothing from unpkg.com); the helper answers that request with the test's own fixture.
- **Enter:** `xr.offer` is `"none"` (API_SPEC §1.10 rule 2, T-128a): the app offers no session, so the
  emulator's own "Enter XR" button and `iwsdk xr enter` have nothing to grant. `enterXR` selects hands (IWER
  starts on controllers; `enterXR(page, 'controller')` keeps them) and presses the page's own "Enter the garden"
  button, the only way in, which is also what starts the audio. It fails if the emulator reports an offered
  session.

## Helper — `support/iwer.ts`

| Function | Does |
|---|---|
| `openApp(page, room)` | Opens `/` with the room fixture as the emulated room; resolves when the emulator holds exactly its planes and meshes; returns the off-host URLs it blocked |
| `enterXR(page, input = 'hand')` | Enters the session as above; the press waits for the world (`WORLD_READY_MS`); resolves on the first XR frame with IWER's session status; fails if not active `SESSION_ENTRY_LIMIT_MS` (10 s in the emulator, BUG-003; the 5 s product limit is a device check) after the click |
| `xrFrames(page, n)` | Resolves after `n` more XR frames: the way to give the app time to react without a sleep; fails if the session has ended |
| `playHandPath(page, path)` | Plays a hand path through IWER's remote control; returns the `selectstart`/`selectend` events and the final palm direction and pinch gap |
| `probeCapabilities(page)` | Measures the table below through WebXR in the running session |

## Fixtures — `tests/fixtures/`

Metres, y up, floor at y = 0, the user at the origin looking down −z (IWER's head starts at 0, 1.6, 0).

**`rooms/*.json`** — `planes[]: { label, facing, center, size }`, optional `meshes[]: { label, vertices, indices }`.
`facing` is the side the room is on (`+y` = faces up). `size` is width × depth for horizontal planes and
width × height for walls. Planes are axis-aligned rectangles.

| Room | Planes | For |
|---|---|---|
| `table` | table 1.2 × 0.8 at 0.74 m, floor 18 m², ceiling 2.5 m, 4 walls, + floor mesh | Level 1, the default room |
| `counter` | worktop 2.4 × 0.6 at 0.92 m labelled `other`, floor 12 m², ceiling 2.4 m, 4 walls | Level 2 (no table label) |
| `none` | nothing | Levels 3–4, Wanderer |
| `tiny` | table 0.8 × 0.6 at 0.72 m, floor 5 m², ceiling 2.2 m, 4 walls | Small table, short reverb |
| `large` | table 2.4 × 2 at 0.75 m, 1.1 m away, floor 42 m², ceiling 3 m, 4 walls | Re-centre, long reverb |
| `no-walls` | the `table` room's table and floor only | Halo without vines, missing surfaces |
| `sig-small-desk` | table 1.4 × 0.7 at 0.74 m, floor 5.6 m², ceiling 2.4 m, 4 walls | Signature room: E minor pentatonic, 0.3 s echo (TC-SIG-03) |
| `sig-kitchen-counter` | worktop 3.2 × 0.6 at 0.92 m labelled `other`, floor 15.12 m², ceiling 2.7 m, 4 walls | Signature room: D major pentatonic, 0.6 s echo; level 2 |
| `sig-living-table` | table 1.2 × 0.8 at 0.75 m, floor 42 m², ceiling 3 m, 4 walls | Signature room: A suspended pentatonic, 2.0 s echo |

The three `sig-*` rooms are read by the unit tests of `room/RoomFeatures` today. They are not in `ROOMS` in `support/iwer.ts`; `readRoom(name)` takes any name.

**`handPaths/*.json`** — `hand`, `frames[]: { t, position, orientation, pinch }`. The hand moves in a straight line
to each frame and arrives at `t` ms; `pinch` (0–1) is set on arrival; `orientation` is degrees, roll 0 = palm down.
`position` is IWER's hand origin: with no rotation the closed pinch is 2.5 cm below and 1.2 cm in front of it.
IWER hands are fixed shapes moved as a whole; there are no per-joint recordings.

| Path | What happens |
|---|---|
| `pinch` | Right hand still above the table; pinch closes at 200 ms, opens at 500 ms |
| `palm-up` | Right hand turns palm up in 300 ms and holds 700 ms (FR-HND-05: 400 ms within 35°) |

Other paths and the three signature rooms are added by the tasks that need them.

## E0 — what the emulator supports (IWER 2.5.0, measured 2026-10-10)

Asserted on every run by `00-emulator.spec.ts` with the `table` room:

| Capability | Result | Detail |
|---|---|---|
| Session | yes | `immersive-ar`; granted: anchors, bounded-floor, hand-tracking, hit-test, local, local-floor, mesh-detection, plane-detection, viewer |
| Planes | yes | `frame.detectedPlanes`; all 7 fixture planes come back with the same label, centre, size and facing |
| Semantic labels | yes | On planes and meshes: table, floor, ceiling, wall, couch, door, window, shelf, bed, screen, lamp, plant, wall art, global mesh, other. **No `desk`** |
| Meshes | yes | `frame.detectedMeshes` with vertices, indices and label (fixture: 2 triangles) |
| Hit-test | yes | `requestHitTestSource` + `getHitTestResults`; a ray from the head hits the table top at y = 0.74. With `none` there is nothing to hit |
| Anchors | yes | `frame.createAnchor`, tracked on the next frame |
| Persistent handles | yes | `requestPersistentHandle` → `restorePersistentAnchor` → `deletePersistentAnchor` in one session; stored in `localStorage` |
| Hand joints | yes | 25 joints per hand with poses |
| Pinch | yes | Thumb–index gap 94 mm open, 2 mm pinched (spec: enter < 20, release > 32); events `select`, `selectstart`, then `selectend` |

Where the emulator differs from what the app should expect on a headset (all of these need a device check):

1. **`select` arrives at pinch start**, before `selectstart`; per IWER's source any pinch value above 0 starts it.
   Use `selectstart`/`selectend` or the joint distance; never rely on `select` meaning "released".
2. **Plane +Y points away from the room** (a table top has +Y down), in the fixtures and in the emulator's own
   living room (all 17 planes). A plane can only be hit-tested from its −Y side. Room code must not depend on the
   sign of a plane's normal.
3. **`plane.orientation` comes from the label, not the pose** (`other` has none), and `lastChangedTime` changes
   every frame (IWER source). Derive orientation from the pose; do not re-process planes on `lastChangedTime`.
4. **Hands never jitter or lose single joints**, and the emulated hand source also carries a gamepad with one
   pinch button. Tracking loss can only be emulated for a whole hand.
5. **Persistent handles restored every time here.** To exercise a failed restore (FR-ROOM-07), a test has to
   store an unknown handle or clear IWER's `localStorage` key before the session starts. `deletePersistentAnchor`
   leaves the anchor in IWER's `localStorage`: a deleted handle restores again after a reload, and in the next
   session of the same page, so `AnchorStore.clear()` cannot be used to force a failed restore (T-162).

## Network guard (Golden Rule 9)

Every `TC-E2E-01` case asserts that the list from `openApp` is empty after the session's first frames: `table` and
`none` with hands, `table` with controllers. IWSDK 1.0.1 would request a hand or controller model from
`cdn.jsdelivr.net` when an input source joins; `src/app.ts` turns those models off, and the guard goes red if
that line is removed or any other request or WebSocket leaves localhost (checked by mutation, 2026-10-10).
This guard runs against the dev page. The production build is covered by `04-built-page-policy.spec.ts`, which adds the emulator as an init script and loads each built page under the Content Security Policy.
