// T-153 rough cut v0 (tests/tools/rough-cut.ts): the caption plan of a take keeps VIDEO_SCRIPT_V0's ground rules,
// and the ffmpeg command cuts the WebM and the WAV at the same point.
import { describe, expect, it } from 'vitest';

import { ffmpegArgs, MIN_CAPTION_S, plan, srt } from '../../tools/rough-cut';

/** The beats of take 2 (25 Oct, .tmp/video/beats.json), seconds on the recording. */
const TAKE_2 = [
  ['prelude', 2.5],
  ['landing', 10.5],
  ['enter', 12.9],
  ['placed', 17.4],
  ['tuned', 17.6],
  ['palm', 20.8],
  ['pinch', 23.7],
  ['plant', 31.6],
  ['note', 32.0],
  ['plant 2', 39.8],
  ['plant 3', 47.1],
  ['pull', 49.5],
  ['move', 56.4],
  ['plant 4', 66.6],
  ['palms out', 72.1],
  ['listen', 74.1],
  ['wake pose', 86.4],
  ['wake', 87.2],
  ['end', 92.6],
].map(([beat, atS]) => ({ beat: beat as string, atS: atS as number }));

describe('rough cut v0 (T-153)', () => {
  it('cuts take 2 from its landing beat, 82.1 s, every caption inside it, long enough, one at a time', () => {
    const cut = plan(TAKE_2, 92.6);
    expect([cut.startS, cut.durationS]).toEqual([10.5, 82.1]);
    expect(cut.captions.find((c) => c.text === 'Pinch. Plant. It sings.')).toMatchObject({
      fromS: 13.2,
      toS: 23.5,
    });
    // VIDEO_SCRIPT_V0 §4 item 3 (T-175): the corner says the hand is drawn, from the first beat that shows it.
    expect(cut.captions.find((c) => c.text.startsWith('Hand drawn for this recording.'))).toMatchObject({
      fromS: 10.3,
      toS: 14.3,
      place: 'bottomLeft',
    });
    for (const c of cut.captions) expect(c.toS - c.fromS).toBeGreaterThanOrEqual(MIN_CAPTION_S);
    const bottom = cut.captions.filter((c) => c.place === 'bottom');
    for (let i = 1; i < bottom.length; i++)
      expect(bottom[i]!.fromS).toBeGreaterThanOrEqual(bottom[i - 1]!.toS);
  });

  it('ends a caption where the next in its place begins, when a take brings that one sooner (take 3)', () => {
    const take3 = TAKE_2.map((b) =>
      b.beat === 'placed' ? { ...b, atS: 15.1 } : b.beat === 'pinch' ? { ...b, atS: 21.1 } : b,
    );
    const cut = plan(take3, 92.6);
    const floor = cut.captions.find((c) => c.text.startsWith('Floor size'))!;
    const pinch = cut.captions.find((c) => c.text === 'Pinch. Plant. It sings.')!;
    expect(floor.toS).toBe(pinch.fromS);
  });

  it('leaves out a caption whose beat the take lacks, and seeks the video and the track to the same second', () => {
    const cut = plan(
      TAKE_2.filter((b) => b.beat !== 'listen'),
      92.6,
    );
    expect(cut.captions.some((c) => c.text.includes('listen'))).toBe(false);
    const args = ffmpegArgs(cut, 'font.ttf');
    expect(args.filter((a, i) => args[i - 1] === '-ss')).toEqual(['10.5', '10.5']);
    expect(args[args.indexOf('-t') + 1]).toBe('82.1');
  });

  it('without drawtext: the same cut with the captions as a subtitle track, its SubRip in the cut own time', () => {
    const cut = plan(TAKE_2, 92.6);
    const args = ffmpegArgs(cut, 'font.ttf', false);
    expect(args).not.toContain('-vf');
    expect(args.join(' ')).toContain('-i captions.srt -t 82.1 -map 0:v -map 1:a -map 2:s -c:s mov_text');
    const text = srt(cut);
    expect(text.startsWith('1\n00:00:00,000 --> 00:01:22,100\nEmulator\n')).toBe(true);
    expect(text).toContain('00:00:13,200 --> 00:00:23,500\nPinch. Plant. It sings.\n');
  });
});
