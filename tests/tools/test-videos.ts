// `npm run test:videos`: the shaky-hands spec (tests/e2e/30-shaky-hands.spec.ts) run once more and recorded, the ghost
// hands drawn (the dev-only `handCue` flag) and each scene's title over the picture; then test-videos/<n>.mp4 per scene,
// in the table's order (H.264, plays on a Mac), and test-videos/README.md with what to watch and whether it passed.
// Emulator footage only: IWER's hands with the noise of the first Quest 3S sessions, software rendering at 20-30 fps.
// Node runs this file as it is (Node 24 strips the types). Its Playwright run uses E2E_PORT, 8097 unless set.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type Table = typeof import('../e2e/support/shaky-table');

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = `${ROOT}test-videos/`;
const RESULTS = `${ROOT}.tmp/test-videos-artifacts/results.json`;
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

interface Result {
  status: string;
  duration: number;
  annotations: { type: string; description?: string }[];
  attachments: { name: string; path?: string }[];
  errors: { message?: string }[];
}
interface Suite {
  specs?: { title: string; tests: { results: Result[] }[] }[];
  suites?: Suite[];
}

const tableUrl = new URL('../e2e/support/shaky-table.ts', import.meta.url).href;
const { SHAKY_SCENARIOS } = (await import(tableUrl)) as Table;

const run = spawnSync(
  'npx',
  ['playwright', 'test', '--config', 'tests/tools/playwright.test-videos.config.ts'],
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, SHAKY_VIDEO: '1' },
  },
);
if (run.error) throw run.error; // a failed scene is not an error here: its video says how it failed

const byNumber = new Map<number, Result>();
const walk = (suite: Suite): void => {
  for (const spec of suite.specs ?? []) {
    const result = spec.tests[0]?.results.slice(-1)[0];
    if (result !== undefined) byNumber.set(Number.parseInt(spec.title, 10), result);
  }
  suite.suites?.forEach(walk);
};
walk(JSON.parse(readFileSync(RESULTS, 'utf8')) as Suite);

mkdirSync(OUT, { recursive: true });
const rows: string[] = [];
for (const s of SHAKY_SCENARIOS) {
  const result = byNumber.get(s.n);
  const video = result?.attachments.find((a) => a.name === 'video')?.path;
  const startS = Number(result?.annotations.find((a) => a.type === 'startMs')?.description ?? 0) / 1000;
  let made = 'no video';
  if (video !== undefined) {
    // From the scene's start (the page loading and the session's entry are cut), H.264 in yuv420p for QuickTime.
    const args = ['-y', '-loglevel', 'error', '-ss', startS.toFixed(2), '-i', video];
    args.push(
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
    );
    args.push('-an', `${OUT}${s.n}.mp4`);
    const ffmpeg = spawnSync(FFMPEG, args, { stdio: 'inherit' });
    made = ffmpeg.status === 0 ? `${s.n}.mp4` : `ffmpeg failed (${ffmpeg.status})`;
  }
  // A test.fail scene that failed is "passed" to Playwright.
  const failedAsExpected = `failed, as expected (${s.newBug?.split(':')[0]} not fixed)`;
  const status =
    result === undefined
      ? 'not run'
      : s.newBug !== undefined && result.status === 'passed'
        ? failedAsExpected
        : result.status;
  rows.push(`| ${s.n} | ${made} | ${s.title}. ${s.watch} | ${s.bug} | ${status} |`);
}

writeFileSync(
  `${OUT}README.md`,
  [
    '# Shaky-hands test videos (emulator footage)',
    '',
    `Made by \`npm run test:videos\` on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC.`,
    'Each video is one scene of `tests/e2e/30-shaky-hands.spec.ts`, from its start to its end. The dots and lines are',
    "the pretend hands (the dev-only `handCue` flag): IWER's emulated hands, moved with the tracking drops, drift, depth",
    'error and finger shift measured on the first Quest 3S sessions (`tests/e2e/support/shaky-noise.ts`). A hand that',
    'blinks out is a tracking drop. Software rendering at 20 to 30 frames a second. None of this is a headset.',
    'Scenes 12 and 13 found two bugs (BUG-032, BUG-033), now fixed in the emulator: they pass as plain tests.',
    '',
    '| # | Video | What to watch for | Bug | Result |',
    '|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n'),
);
console.log(`test videos: ${OUT}`);
