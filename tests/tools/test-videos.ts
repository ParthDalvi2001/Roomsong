// `npm run test:videos`: the shaky-hands spec (tests/e2e/30-shaky-hands.spec.ts) run once more and recorded, the ghost
// hands drawn (the dev-only `handCue` flag) and each scene's title over the picture; then test-videos/<n>.mp4 per scene,
// in the table's order (H.264, plays on a Mac), and test-videos/README.md with what to watch and whether it passed.
// Emulator footage only: IWER's hands with the noise of the first Quest 3S sessions, software rendering at 20-30 fps.
// `npm run test:room-tour` (--rooms): tests/tools/room-tour.spec.ts instead, into room-tour/: per room <n>.mp4 (10 s of
// the tide), <n>.png and <n>-room.png, and README.md with each room's placement and signature.
// Node runs this file as it is (Node 24 strips the types). Its Playwright run uses E2E_PORT, 8097 unless set.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type Table = typeof import('../e2e/support/shaky-table');

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const IS_TOUR = process.argv.includes('--rooms');
const OUT = `${ROOT}${IS_TOUR ? 'room-tour' : 'test-videos'}/`;
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
    env: { ...process.env, ...(IS_TOUR ? { ROOM_TOUR: '1' } : { SHAKY_VIDEO: '1' }) },
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

/** Its recording from its startMs (the page loading and the session's entry cut), H.264 in yuv420p for QuickTime. */
function toMp4(result: Result | undefined, name: string): string {
  const video = result?.attachments.find((a) => a.name === 'video')?.path;
  if (video === undefined) return 'no video';
  const mark = (type: string) => result!.annotations.find((a) => a.type === type)?.description;
  const args = [
    '-y',
    '-loglevel',
    'error',
    '-ss',
    (Number(mark('startMs') ?? 0) / 1000).toFixed(2),
    '-i',
    video,
  ];
  const durationMs = mark('durationMs');
  if (durationMs !== undefined) args.push('-t', (Number(durationMs) / 1000).toFixed(2));
  args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p');
  args.push('-movflags', '+faststart', '-an', `${OUT}${name}`);
  const ffmpeg = spawnSync(FFMPEG, args, { stdio: 'inherit' });
  return ffmpeg.status === 0 ? name : `ffmpeg failed (${ffmpeg.status})`;
}

mkdirSync(OUT, { recursive: true });
if (IS_TOUR) {
  writeTour();
  process.exit(0);
}
const rows: string[] = [];
for (const s of SHAKY_SCENARIOS) {
  const result = byNumber.get(s.n);
  const made = toMp4(result, `${s.n}.mp4`);
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

/** The room tour's videos and README: one row per room, from .tmp/room-tour/<n>.json (room-tour.spec.ts). */
function writeTour(): void {
  const KEYS: Record<number, string> = { [-3]: 'A', 0: 'C', 2: 'D', 4: 'E' };
  const dir = `${ROOT}.tmp/room-tour/`;
  const rooms = readdirSync(dir)
    .map((file) => JSON.parse(readFileSync(`${dir}${file}`, 'utf8')) as Tour)
    .sort((a, b) => a.n - b.n);
  const rows = rooms.map((r) => {
    const made = toMp4(byNumber.get(r.n), `${r.n}.mp4`);
    const s = r.signature;
    const sound =
      s === null
        ? 'none heard'
        : `${KEYS[s.keyRoot] ?? s.keyRoot} ${s.mode}, ${s.tempo} BPM, echo ${s.reverbRt60} s ${s.reverbSize}`;
    const palette =
      r.palette === null ? '' : `${r.palette.shiftDeg} deg, sat ${r.palette.saturation.toFixed(2)}`;
    const height = r.bed === null ? '' : `${r.bed.y.toFixed(2)} m`;
    const files = `${made}, ${r.n}.png, ${r.n}-room.png`;
    return `| ${r.n} | ${r.room} | ${r.stands} | ${r.placedLevel ?? 'none'} | ${height} | ${sound} | ${palette} | ${files} |`;
  });
  writeFileSync(
    `${OUT}README.md`,
    [
      '# Room tour (emulator footage)',
      '',
      `Made by \`npm run test:room-tour\` on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from`,
      '`tests/tools/room-tour.spec.ts`: each room fixture of `tests/fixtures/rooms`, twenty plants (`autoplant=20`), no',
      'tutorial. The video is 10 s of the tide from `room:tuned`, a seated head 40 cm over the bed and 42 cm back;',
      "`<n>.png` is 4 s in; `<n>-room.png` is from further back and higher, with the fixture's planes drawn by the tour",
      '(tests/tools/room-planes.ts: floor and walls see-through, furniture pale, no ceiling), since IWER draws none of',
      "them: the video and `<n>.png` show only the app over IWER's grey backdrop (the table room's grey table is",
      "IWER's own). No passthrough, software rendering. Bed height: metres over the floor. Palette: the turn of the",
      "plants' colour arc and their saturation (src/render/palette.ts).",
      '',
      '| # | Room | Stands for | Level | Bed height | Signature | Palette | Files |',
      '|---|---|---|---|---|---|---|---|',
      ...rows,
      '',
    ].join('\n'),
  );
  console.log(`room tour: ${OUT}`);
}

interface Tour {
  n: number;
  room: string;
  stands: string;
  placedLevel: number | null;
  bed: { y: number } | null;
  signature: { keyRoot: number; mode: string; tempo: number; reverbRt60: number; reverbSize: string } | null;
  palette: { shiftDeg: number; saturation: number } | null;
}
