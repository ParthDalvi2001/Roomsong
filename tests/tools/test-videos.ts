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
/** Room tour: below this two stills count as the same picture, below NEAR_PCT as nearly the same. */
const SAME_PCT = 0.5;
const NEAR_PCT = 2;

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

/** A still as 160 x 64 grey levels, through ffmpeg, without the label in its top part (each room's own words). */
function grey(path: string): Buffer {
  const vf = 'crop=iw:ih*0.72:0:ih*0.28,scale=160:64,format=gray';
  const args = ['-v', 'error', '-i', path, '-vf', vf, '-f', 'rawvideo', '-'];
  return spawnSync(FFMPEG, args, { maxBuffer: 1 << 20 }).stdout;
}

/** How far apart two stills are: the mean difference of their grey levels, in % of full scale. */
function apart(a: Buffer, b: Buffer): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i]! - b[i]!);
  return (100 * sum) / (a.length * 255);
}


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
    return `| ${r.n} | ${r.room} | ${r.stands} | ${r.size} | ${r.placedLevel ?? 'none'} | ${height} | ${sound} | ${palette} | ${files} |`;
  });

  // Every pair of rooms: how far apart their pictures are, and whether their numbers (and fixtures) are the same.
  const numbers = (r: Tour) =>
    JSON.stringify([r.signature, r.palette, r.placedLevel, r.bed === null ? null : r.bed.y.toFixed(2)]);
  const fixture = (r: Tour) => readFileSync(`${ROOT}tests/fixtures/rooms/${r.room}.json`, 'utf8');
  const stills = rooms.map((r) => ({
    room: grey(`${OUT}${r.n}-room.png`),
    garden: grey(`${OUT}${r.n}.png`),
  }));
  const pairs: string[] = [];
  const loud: string[] = [];
  const overviews: number[] = [];
  const gardens: number[] = [];
  rooms.forEach((a, i) => {
    rooms.slice(i + 1).forEach((b, k) => {
      const j = i + 1 + k;
      const room = apart(stills[i]!.room, stills[j]!.room);
      const garden = apart(stills[i]!.garden, stills[j]!.garden);
      overviews.push(room);
      gardens.push(garden);
      const isSameNumbers = numbers(a) === numbers(b);
      const pair = `${a.room} and ${b.room}`;
      if (room < SAME_PCT && fixture(a) !== fixture(b))
        loud.push(`${pair}: different rooms, the same overview (${room.toFixed(2)} %)`);
      if (garden < SAME_PCT && !isSameNumbers)
        loud.push(`${pair}: different numbers, the same garden still (${garden.toFixed(2)} %)`);
      if (room < NEAR_PCT || garden < NEAR_PCT || isSameNumbers) {
        const why = isSameNumbers
          ? 'the same level, bed height, signature and palette'
          : 'their numbers differ';
        pairs.push(`| ${pair} | ${room.toFixed(2)} % | ${garden.toFixed(2)} % | ${why} |`);
      }
    });
  });
  for (const line of loud) console.error(`ROOM TOUR, SHOULD DIFFER: ${line}`);
  if (loud.length > 0) process.exitCode = 1;
  const spread = (values: number[]) => {
    const sorted = [...values].sort((x, y) => x - y);
    const at = (k: number) => sorted[k]!.toFixed(2);
    return `${at(0)} % for the most alike pair, ${at(sorted.length >> 1)} % median, ${at(sorted.length - 1)} % most`;
  };

  writeFileSync(
    `${OUT}README.md`,
    [
      '# Room tour (emulator footage)',
      '',
      `Made by \`npm run test:room-tour\` on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from`,
      '`tests/tools/room-tour.spec.ts`: each room fixture of `tests/fixtures/rooms`, twenty plants (`autoplant=20`), no',
      "tutorial. IWER draws none of a fixture's planes, so the tour draws them (tests/tools/room-planes.ts): the floor",
      'dark, each wall its own light tone, the ceiling as an outline, the table or counter as a slab on four legs. These',
      'are the planes the game reads; nothing else is drawn. A label over each picture says what the room is and what',
      'the game made of it. `<n>.mp4`: 10 s of the tide from `room:tuned`, a seated head 40 cm over the bed and 42 cm',
      'back. `<n>.png`: that view, 4 s in. `<n>-room.png`: the overview, 7.5 m from the middle of the room towards its',
      'back right corner, 35 degrees down, the same for every room, so the sizes compare; from outside, the near walls',
      'are not drawn. No passthrough, software rendering. Palette: the turn of the colour arc and the saturation',
      '(src/render/palette.ts).',
      '',
      '| # | Room | Stands for | Size | Level | Bed height | Signature | Palette | Files |',
      '|---|---|---|---|---|---|---|---|---|',
      ...rows,
      '',
      '## Do the outputs differ?',
      '',
      `Each still against every other one (${overviews.length} pairs): the mean grey-level difference below the label,`,
      `in % of full scale. Overviews: ${spread(overviews)}. Garden stills: ${spread(gardens)}. Under ${SAME_PCT} % is`,
      `the same picture, under ${NEAR_PCT} % nearly the same. The pairs nearly the same in a picture, or the same in`,
      'every number:',
      '',
      '| Pair | Overview | Garden still | Why |',
      '|---|---|---|---|',
      ...(pairs.length > 0 ? pairs : ['| none | | | |']),
      '',
      loud.length === 0
        ? 'No two rooms that should differ gave the same picture.'
        : `**Rooms that should differ gave the same picture:** ${loud.join('; ')}.`,
      '',
    ].join('\n'),
  );
  console.log(`room tour: ${OUT}`);
}

interface Tour {
  n: number;
  room: string;
  stands: string;
  size: string;
  placedLevel: number | null;
  bed: { y: number } | null;
  signature: { keyRoot: number; mode: string; tempo: number; reverbRt60: number; reverbSize: string } | null;
  palette: { shiftDeg: number; saturation: number } | null;
}
