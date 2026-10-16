// The sound-style listening page (T-164, specs/03-design/SOUND_PASS_T164.md §4): one garden played by the app's
// own audio engine (src/audio) in style A, B or C, switched live, so Parth can pick one by ear. A desktop page for a
// mouse, no XR, nothing sent anywhere; dev only, never built into the site. It loads the engine class itself, as
// tests/e2e/09-audio.spec.ts does: setStyle is not in the contract (API_SPEC §1.2) until a style is picked.
import { Engine } from '../../../src/audio/AudioEngine.js';
import { WANDERER } from '../../../src/garden/index.js';

import type { SoundStyle } from '../../../src/audio/styles.js';
import type { Plant, VoiceType } from '../../../src/garden/index.js';

const BPM = 84;
const BAR_S = (4 * 60) / BPM;
const VOLUME = 0.8;
/**
 * SOUND_PASS_T164.md §4 "page trim": what levels the three styles to the same loudness here (measured by the plan
 * on the voices), so the louder one does not win by being louder.
 */
const TRIM_DB: Readonly<Record<SoundStyle, number>> = { A: 1.5, B: 0, C: -1 };
/** Column-major: the bed centre 0.45 m ahead on a 0.74 m desk, and a still head at 1.20 m looking at it. */
const BED = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1];
const HEAD = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.2, 0, 1];
const REFRESH_MS = 250;

const plant = (voice: VoiceType, ring: number, step: number, height: number): Plant => ({
  id: `${voice}-${ring}-${step}`,
  voice,
  cell: { ring, step },
  height,
  hue: 0.5,
  plantedAt: 0,
});
/** The Wanderer's three starter seeds (bell, pad, pluck), planted at a new plant's height. */
const STARTER: readonly Plant[] = [
  plant('bell', 2, 0, 0.55),
  plant('pad', 0, 0, 0.55),
  plant('pluck', 3, 3, 0.55),
];
/** The plan's listening garden (§4): (voice, ring, step, height). */
const FULL: readonly Plant[] = [
  plant('bell', 2, 0, 0.55),
  plant('pad', 0, 0, 0.8),
  plant('pluck', 3, 3, 0.55),
  plant('pluck', 4, 6, 0.3),
  plant('bass', 0, 8, 0.55),
  plant('choir', 2, 8, 0.8),
  plant('bell', 4, 11, 0.3),
  plant('pluck', 1, 13, 0.55),
];

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const playButton = $<HTMLButtonElement>('play');
const full = $<HTMLInputElement>('full');
const status = $<HTMLParagraphElement>('status');
const styleButtons = (['A', 'B', 'C'] as const).map((s) => [s, $<HTMLButtonElement>(`style-${s}`)] as const);

let style: SoundStyle = 'A';
let playing: { engine: Engine; ctx: AudioContext; startedAt: number } | null = null;
let busy = false;

const garden = (): readonly Plant[] => (full.checked ? FULL : STARTER);
const volumeFor = (s: SoundStyle): number => Math.min(1, VOLUME * Math.pow(10, TRIM_DB[s] / 20));

async function play(): Promise<void> {
  // The context is made in the click, so the browser lets it start (autoplay rules).
  const ctx = new AudioContext();
  const engine = new Engine();
  engine.setTempo(BPM);
  engine.setReverb('auto');
  engine.setSignature(WANDERER);
  engine.setStyle(style);
  engine.setVolume(volumeFor(style));
  await engine.init(ctx);
  engine.setListenerPose(HEAD);
  engine.syncPlants(garden(), BED);
  playing = { engine, ctx, startedAt: ctx.currentTime };
}

async function stop(): Promise<void> {
  const p = playing;
  playing = null;
  if (p === null) return;
  await p.engine.suspend(); // the master fades out, then the engine's tick stops
  await p.ctx.close();
}

playButton.addEventListener('click', () => {
  if (busy) return;
  busy = true;
  const next = playing === null ? play() : stop();
  next
    .catch((error: unknown) => {
      playing = null;
      status.textContent = `The sound could not start: ${String(error)}`;
    })
    .finally(() => {
      busy = false;
      render();
    });
});

for (const [s, button] of styleButtons) {
  button.addEventListener('click', () => {
    style = s;
    playing?.engine.setStyle(s);
    playing?.engine.setVolume(volumeFor(s));
    render();
  });
}

full.addEventListener('change', () => {
  playing?.engine.syncPlants(garden(), BED);
  render();
});

function render(): void {
  playButton.textContent = playing === null ? 'Play' : 'Stop';
  for (const [s, button] of styleButtons) button.setAttribute('aria-pressed', String(s === style));
  const p = playing;
  if (p === null) {
    if (!status.textContent?.startsWith('The sound')) status.textContent = 'Stopped.';
    return;
  }
  const { stats } = p.engine;
  const bar = Math.floor(Math.max(0, p.ctx.currentTime - p.startedAt) / BAR_S) + 1;
  status.dataset.notes = String(stats.triggers);
  status.textContent =
    `Playing style ${style}, ${garden().length} plants, bar ${bar}. ` +
    `Voices ${stats.voices} of 24, tick ${stats.cpuEstimate.toFixed(3)} ms, ${stats.triggers} plant notes.`;
}

setInterval(render, REFRESH_MS); // the read-out only: the music runs on the audio clock
render();
