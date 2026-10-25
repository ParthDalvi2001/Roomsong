// `npm run video:audio` (T-153 rough cut v0): the sound track of the judge video's emulator take. Playwright's
// recorder takes no sound, so the take (tests/tools/video.spec.ts) logs every call the app made on its audio engine,
// with the engine's audio clock, to .tmp/video/engine-calls.json. This replays them on a fresh engine in an
// OfflineAudioContext, each at its own audio time, the engine ticked every 25 ms of audio time as renders.spec.ts
// ticks it, and writes .tmp/video/first-loop-audio.wav (48 kHz, 16-bit) from the recording's first frame: silence
// until the audio clock's 0 (the Enter click), so the track lines up with first-loop.webm. Not a recording: the
// same engine and the same calls, rendered; desktop Chromium, not a headset. Run apart: VIDEO_TRACK=1.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { test } from '@playwright/test';

import { TICK_MS } from '../../src/audio/config';

const VIDEO = fileURLToPath(new URL('../../.tmp/video/', import.meta.url));
const SAMPLE_RATE = 48000;
/** An OfflineAudioContext suspends on render quanta of 128 frames, and takes one suspend per quantum. */
const QUANTUM = 128;

interface Take {
  preRollS: number;
  endS: number;
  calls: { m: string; args: unknown[]; audioS: number; atS: number }[];
}

test.skip(process.env.VIDEO_TRACK !== '1', 'the video track: npm run video:audio');
test.beforeEach(({ page }) => page.goto('/proto/styles/'));

test("the take's track: the engine's calls replayed on the offline clock, aligned to the WebM", async ({
  page,
}) => {
  const take = JSON.parse(readFileSync(`${VIDEO}engine-calls.json`, 'utf8')) as Take;
  if (!Number.isFinite(take.preRollS))
    throw new Error('engine-calls.json has no audio clock: was the take entered?');
  const { wav, peakDbfs, lufs, replayed } = await page.evaluate(
    async ({ take, sampleRate, quantum, tickS }) => {
      const engineUrl = '/src/audio/AudioEngine.ts';
      const measureUrl = '/tests/renders/measure.ts';
      const { Engine } = (await import(
        /* @vite-ignore */ engineUrl
      )) as typeof import('../../src/audio/AudioEngine');
      const M = (await import(/* @vite-ignore */ measureUrl)) as typeof import('./measure');

      const seconds = take.endS - take.preRollS;
      const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
      const engine = new Engine();
      const methods = engine as unknown as Record<string, (...args: unknown[]) => void>;
      // init, resume and suspend are the context's life, which the render owns. shortcut: resume()'s 2.5 s start
      // fade is not played (an offline context cannot resume); the take's first sound comes seconds after it.
      const isReplayed = (m: string) => m !== 'init' && m !== 'resume' && m !== 'suspend';
      // chordTone and ui play only in a running context; an offline one reads 'suspended' (as renders.spec.ts).
      const call = ({ m, args }: Take['calls'][number]) => {
        Object.defineProperty(ctx, 'state', { value: 'running', configurable: true });
        methods[m]!(...args);
        delete (ctx as { state?: unknown }).state;
      };
      const first = take.calls.findIndex((c) => c.m === 'init');
      const before = first < 0 ? take.calls : take.calls.slice(0, first);
      for (const c of before) if (isReplayed(c.m)) call(c);
      await engine.init(ctx as unknown as AudioContext);

      // One suspend per quantum: the calls due in it, in their order, then the tick.
      const due = new Map<number, (() => void)[]>();
      const at = (s: number, run: () => void) => {
        const q = Math.max(1, Math.ceil((s * sampleRate) / quantum));
        if (q * quantum >= ctx.length) return;
        const list = due.get(q) ?? [];
        list.push(run);
        due.set(q, list);
      };
      let replayed = 0;
      for (const c of first < 0 ? [] : take.calls.slice(first + 1)) {
        if (!isReplayed(c.m)) continue;
        at(c.audioS, () => call(c));
        replayed++;
      }
      engine.tick();
      for (let k = 1; k * tickS < seconds; k++) at(k * tickS, () => engine.tick());
      for (const [q, runs] of due) {
        void ctx.suspend((q * quantum) / sampleRate).then(() => {
          for (const run of runs) run();
          void ctx.resume();
        });
      }

      const buffer = await ctx.startRendering();
      // The recording's first frame to the audio clock's 0 is silence.
      const lead = Math.round(take.preRollS * sampleRate);
      const ch = [0, 1].map((i) => {
        const out = new Float32Array(lead + buffer.length);
        out.set(buffer.getChannelData(i), lead);
        return out;
      });
      const { peakDbfs, lufs } = M.measure(ch, sampleRate);
      const bytes = M.wavBytes(ch, sampleRate);
      let ascii = '';
      for (let i = 0; i < bytes.length; i += 0x8000)
        ascii += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return { wav: btoa(ascii), peakDbfs, lufs, replayed };
    },
    { take, sampleRate: SAMPLE_RATE, quantum: QUANTUM, tickS: TICK_MS / 1000 },
  );
  writeFileSync(`${VIDEO}first-loop-audio.wav`, Buffer.from(wav, 'base64'));
  console.log(
    `video track: ${VIDEO}first-loop-audio.wav, ${take.endS.toFixed(1)} s, silent to ${take.preRollS.toFixed(2)} s; ` +
      `${replayed} calls replayed; peak ${peakDbfs.toFixed(1)} dBFS, ${lufs.toFixed(1)} LUFS (offline render, desktop Chromium)`,
  );
});
