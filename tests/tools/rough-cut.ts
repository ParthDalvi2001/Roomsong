// `npm run video:cut` (T-153 rough cut v0): the judge video's rough cut from the emulator take. Reads
// .tmp/video/beats.json (npm run video:capture), trims the take from its "landing" beat to its end, lays the
// rendered track (.tmp/video/first-loop-audio.wav, npm run video:audio) under it, and burns in the captions of
// VIDEO_SCRIPT_V0 §1 at their beats with §4's emulator lines, into .tmp/video/rough-cut-v0.mp4. With no ffmpeg on
// the PATH it writes the exact command to .tmp/video/rough-cut.sh and stops. Node runs this file as it is (Node 24
// strips the types); FONT=<path> picks another font file.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export interface Beat {
  beat: string;
  atS: number;
}
export type Place = 'bottom' | 'bottomLeft' | 'topRight';
export interface Caption {
  text: string;
  fromS: number;
  toS: number;
  place: Place;
}
export interface Cut {
  startS: number;
  durationS: number;
  captions: Caption[];
}

/** VIDEO_SCRIPT_V0 ground rules: a caption stays at least this long; the cut runs 60 to 90 s. */
export const MIN_CAPTION_S = 1.5;
export const CUT_MIN_S = 60;
export const CUT_MAX_S = 90;
/** The cut starts on this beat of the take: the take's own page (the prelude before it is not shown). */
export const START_BEAT = 'landing';

/** Each caption: its text (a newline splits its two lines), the beat it comes on and how long after it, and either
 *  how long it stays or the beat it goes on (and how long past it). §1 B2, B1, B4, B5; §4 items 1, 2 and 6. */
const SCRIPT: {
  text: string;
  beat: string;
  afterS?: number;
  holdS?: number;
  until?: string;
  untilAfterS?: number;
  place?: Place;
}[] = [
  { text: 'Your room tunes it.', beat: 'placed', holdS: 2 },
  {
    text: 'Floor size sets the key.\nCeiling height, the scale. Room volume, the echo.',
    beat: 'placed',
    afterS: 2.2,
    holdS: 4,
  },
  { text: 'Pinch. Plant. It sings.', beat: 'pinch', until: 'note', untilAfterS: 2 }, // on while its first note rings
  { text: 'Shape every voice with your hands.', beat: 'pull', until: 'move' },
  { text: 'No controllers.', beat: 'move', holdS: 3 },
  { text: 'Then lean back and listen.', beat: 'listen', afterS: 0.5, holdS: 4 },
  // §4 item 3: the first shot with the hand cue (the `handCue` flag, T-175) says it is drawn for the recording
  {
    text: 'Hand drawn for this recording. On a headset you see your own hands.',
    beat: 'palm',
    holdS: 4,
    place: 'bottomLeft',
  },
];
const EMULATOR_LINE = 'Recorded in the Immersive Web Emulator. No headset yet.'; // §4 item 1, the first 4 s
const EMULATOR_LINE_S = 4;
const EMULATOR_TAG = 'Emulator'; // §4 item 2, the whole cut
// §4 item 6, in two lines: in one it is wider than the frame at 52 px
const HONESTY_LINE = 'Recorded in an emulator. Not yet tested on a headset.\nSee the description.';
const HONESTY_S = 4;

/** The cut of a take: where it starts and how long it runs, and every caption in the cut's own seconds. */
export function plan(beats: readonly Beat[], endS: number): Cut {
  const atOf = (name: string) => beats.find((b) => b.beat === name)?.atS;
  const startS = atOf(START_BEAT);
  if (startS === undefined) throw new Error(`the take has no "${START_BEAT}" beat`);
  const durationS = Math.round((endS - startS) * 10) / 10;
  const captions: Caption[] = [
    { text: EMULATOR_TAG, fromS: 0, toS: durationS, place: 'topRight' },
    { text: EMULATOR_LINE, fromS: 0, toS: EMULATOR_LINE_S, place: 'bottomLeft' },
  ];
  for (const line of SCRIPT) {
    const on = atOf(line.beat);
    const off = line.until === undefined ? undefined : atOf(line.until);
    if (on === undefined || (line.until !== undefined && off === undefined)) continue; // a beat the take lacks
    const fromS = on + (line.afterS ?? 0) - startS;
    const toS =
      off !== undefined ? off + (line.untilAfterS ?? 0) - startS : fromS + (line.holdS ?? MIN_CAPTION_S);
    captions.push({ text: line.text, fromS: round(fromS), toS: round(toS), place: line.place ?? 'bottom' });
  }
  captions.push({
    text: HONESTY_LINE,
    fromS: round(durationS - HONESTY_S),
    toS: durationS,
    place: 'bottom',
  });
  check(captions, durationS);
  return { startS, durationS, captions };
}

const round = (s: number) => Math.round(s * 10) / 10;

/** The ground rules a caption plan keeps: inside the cut, on long enough, and one caption at a time in each place. */
function check(captions: readonly Caption[], durationS: number): void {
  for (const c of captions) {
    if (c.fromS < 0 || c.toS > durationS) throw new Error(`"${c.text}" runs outside the cut`);
    if (c.toS - c.fromS < MIN_CAPTION_S) throw new Error(`"${c.text}" is on for under ${MIN_CAPTION_S} s`);
  }
  for (const place of ['bottom', 'bottomLeft', 'topRight'] as const) {
    const here = captions.filter((c) => c.place === place).sort((a, b) => a.fromS - b.fromS);
    for (let i = 1; i < here.length; i++) {
      if (here[i]!.fromS < here[i - 1]!.toS)
        throw new Error(`"${here[i]!.text}" comes on over "${here[i - 1]!.text}"`);
    }
  }
}

/** Where each place puts its text, and how big (§1 ground rules: bottom centre, at least 48 px tall at 1080p). */
const LOOK: Record<Place, string> = {
  bottom: 'fontsize=52:x=(w-text_w)/2:y=h-text_h-72',
  bottomLeft: 'fontsize=34:x=48:y=h-text_h-48',
  topRight: 'fontsize=30:x=w-text_w-40:y=36',
};

/** ffmpeg's arguments for a cut, run in the folder of the take; caption i's text is in captions/<i>.txt. */
export function ffmpegArgs(cut: Cut, font: string): string[] {
  const drawtext = cut.captions.map(
    (c, i) =>
      `drawtext=fontfile=${font}:textfile=captions/${i}.txt:fontcolor=white:box=1:boxcolor=black@0.55:` +
      // [from, to): between() holds both ends, so a caption and the one after it would share a frame
      `boxborderw=16:line_spacing=10:${LOOK[c.place]}:enable='gte(t,${c.fromS})*lt(t,${c.toS})'`,
  );
  return [
    '-y',
    ['-ss', `${cut.startS}`, '-i', 'first-loop.webm'],
    ['-ss', `${cut.startS}`, '-i', 'first-loop-audio.wav'],
    ['-t', `${cut.durationS}`, '-map', '0:v', '-map', '1:a', '-vf', drawtext.join(',')],
    ['-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18'],
    ['-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'rough-cut-v0.mp4'],
  ].flat();
}

function main(): void {
  const dir = fileURLToPath(new URL('../../.tmp/video/', import.meta.url));
  const sheet = JSON.parse(readFileSync(`${dir}beats.json`, 'utf8')) as { beats: Beat[]; endS?: number };
  const endS = sheet.endS ?? sheet.beats.find((b) => b.beat === 'end')?.atS;
  if (endS === undefined) throw new Error('beats.json has no end');
  const cut = plan(sheet.beats, endS);
  if (cut.durationS < CUT_MIN_S || cut.durationS > CUT_MAX_S)
    console.warn(`rough cut: ${cut.durationS} s, outside the script's ${CUT_MIN_S} to ${CUT_MAX_S} s`);
  mkdirSync(`${dir}captions`, { recursive: true });
  cut.captions.forEach((c, i) => writeFileSync(`${dir}captions/${i}.txt`, c.text));
  const font = process.env.FONT ?? '/System/Library/Fonts/Helvetica.ttc';
  if (!existsSync(font)) console.warn(`rough cut: no font at ${font}; set FONT=<a .ttf or .ttc>`);
  const args = ffmpegArgs(cut, font);
  const quoted = args.map((a) => (/^[\w./:+@=-]+$/.test(a) ? a : `"${a}"`)).join(' ');
  const command = `cd "${dir}" && ffmpeg ${quoted}`;
  writeFileSync(
    `${dir}rough-cut.sh`,
    `#!/bin/sh\n# npm run video:cut wrote this from beats.json\n${command}\n`,
  );
  console.log(`rough cut: from ${cut.startS} s for ${cut.durationS} s, ${cut.captions.length} captions`);
  for (const c of cut.captions)
    console.log(`  ${c.fromS}-${c.toS} s ${c.place}: ${c.text.replace('\n', ' / ')}`);
  if (spawnSync('ffmpeg', ['-version']).error !== undefined) {
    console.log(`rough cut: no ffmpeg on the PATH. The command, also in ${dir}rough-cut.sh:\n${command}`);
    return;
  }
  if (!existsSync(`${dir}first-loop-audio.wav`))
    throw new Error('no first-loop-audio.wav: npm run video:audio');
  const run = spawnSync('ffmpeg', args, { cwd: dir, stdio: 'inherit' });
  if (run.status !== 0) throw new Error(`ffmpeg ended with ${run.status}`);
  console.log(`rough cut: ${dir}rough-cut-v0.mp4`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) main();
