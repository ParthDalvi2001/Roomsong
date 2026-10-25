# The render tool: listening files on Windows

`npm run audio:renders` plays the app's own sound engine offline in a browser and writes WAV files you can listen to, with their loudness numbers. No headset is needed. These steps are for Windows and PowerShell, from a clean clone. They were written on a Mac and have not been run on Windows yet: if a step looks different, do the nearest thing and tell Parth what you saw.

## 1. Once: install

1. Install **Git for Windows** and **Node.js 24** (the repository's `.nvmrc` says 24; `package.json` also accepts 20.19 or later in 20, 22.12 or later in 22, and 24). With nvm-windows: `nvm install 24`, then `nvm use 24`. Check with `node -v`.
2. Open **PowerShell** (not Command Prompt) and get the code, on the `main` branch:
   ```powershell
   git clone -b main https://github.com/ParthDalvi2001/Roomsong.git
   cd Roomsong
   ```
3. Install the packages exactly as locked: `npm ci`
4. Install the test browser: `npx playwright install chromium`

## 2. Every time: before a render

- **Nothing to build.** The tool starts its own dev server (`npx vite --port <E2E_PORT> --strictPort`, `tests/renders/playwright.config.ts` lines 19–26), opens `/proto/styles/` on it, and stops it at the end.
- **Stop `npm run dev` first** if it is running in another window (Ctrl+C there, or `npx iwsdk dev down`). One folder can have only one IWSDK dev runtime; a second one stops with `RuntimeOwnerError`: "This workspace already has a dev runtime."
- **Pick a free port** (8081 by default). In PowerShell: `$env:E2E_PORT="8097"`. The server will not move to another port by itself: if 8097 is taken, choose another number.
- The server's self-signed HTTPS certificate is already accepted by the tool: there is no browser warning to click through.

## 3. The commands

The five-voice reference renders (P-023), every style in four rooms: `npm run audio:renders -- -g P-023`

One style only (faster: 4 renders instead of 16), in PowerShell:

```powershell
$env:STYLE="B"
npm run audio:renders -- -g P-023
Remove-Item Env:STYLE
```

`STYLE` is `A`, `B` or `C`, or `null` for the engine with no style (the old sound). Without `STYLE` all four are rendered. Each render is 60 s of audio; a group may take several minutes (its time limit is 20 minutes).

The other groups, the same way with `-g`: `"UI sounds"`, `"Listen sweep"`, `P-026` (blind A/B/X pairs of the echo), `P-027` (stalls and a voice steal). With no `-g` every group runs.

## 4. What it writes, in `.tmp\renders\`

- `p023-<style>-<room>.wav`: style `today` (no style), `A`, `B` or `C`; room `wanderer`, `small`, `medium` or `large`. 48 kHz.
- `p023.json` (the numbers) and `STYLES.md` (a table per group: loudness in LUFS, peak, the Bass against the Bell). A run of one group rewrites only that group's section.
- Other groups: `plant-<voice>.wav`, `ui-<sound>.wav` and `ui.json`; `listen-sweep.wav`, `listen-reach.wav` and `listen.json`; `abx-<n>-X.wav`, `abx-<n>-Y.wav`, `abx-key.json` (which is which: do not open it before listening) and `p026.json`; `p027-base.wav`, `p027-stall-<ms>.wav`, `p027-steal.wav` and `p027.json`.
- `artifacts\`: Playwright's own files, only useful when something failed.

## 5. If something goes wrong

- "This workspace already has a dev runtime": a dev server is still running in this folder; stop it (section 2).
- "Cannot establish this process birth identity … on Windows, verify PowerShell is available": run the command from PowerShell.
- A port error, or a time-out waiting for the server: set another `E2E_PORT` and run again.
- The run says the browser is missing: `npx playwright install chromium`, then run again.

## 6. P-029 listening-test clips (APP_LIKE=1)

Commands added when the change lands.
