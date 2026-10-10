// Prototype page (DOM only here; the engine never touches the DOM). Play creates the AudioContext inside the click.
import {
  CEILING_DBFS,
  CELL_RADIUS_PX,
  CENTRE_LABEL_DROP_PX,
  DEFAULT_TEMPO,
  DEFAULT_VOLUME,
  GRID_SIZE_PX,
  HUE_GOLDEN_STEP,
  METER_FLOOR_DB,
  NEW_PLANT_HEIGHT,
  RING_RADIUS_PX,
  RINGS,
  SEMITONES_PER_OCTAVE,
  STEPS,
  TEMPO_OPTIONS,
  TIDE_OVERHANG_PX,
} from './config';
import { AudioEngine } from './engine';
import { FIXED_PLANTS } from './garden';
import { formatSelfTest, runSelfTest } from './selftest';
import { PRESETS, nextPresetIndex, type SignaturePreset } from './signatures';
import { degreeToMidi, VOICE_OCTAVE } from './theory';

import type { Plant, VoiceType } from './types';

import './style.css';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GRID_CENTRE = GRID_SIZE_PX / 2;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const VOICE_CYCLE: readonly VoiceType[] = ['bell', 'pad', 'pluck'];

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}

const ui = {
  play: byId<HTMLButtonElement>('play'),
  stop: byId<HTMLButtonElement>('stop'),
  next: byId<HTMLButtonElement>('next'),
  reset: byId<HTMLButtonElement>('reset'),
  tempo: byId<HTMLSelectElement>('tempo'),
  volume: byId<HTMLInputElement>('volume'),
  presetName: byId('preset-name'),
  presetBlurb: byId('preset-blurb'),
  ringNotes: byId('ring-notes'),
  grid: byId<HTMLElement>('grid'),
  meterBar: byId('meter-bar'),
  meterText: byId('meter-text'),
  peakHold: byId('peak-hold'),
  status: byId('status'),
  selftestRun: byId<HTMLButtonElement>('selftest-run'),
  selftest: byId<HTMLPreElement>('selftest'),
};

let plants: Plant[] = [...FIXED_PLANTS];
let presetIndex = 0;
let engine: AudioEngine | null = null;
let playing = false;
let startedAt = 0;
let peakHoldDb = -Infinity;
let lastStep = -1;

const cellEls: SVGCircleElement[][] = [];
let tideRay: SVGLineElement;

function currentPreset(): SignaturePreset {
  return PRESETS[presetIndex] as SignaturePreset;
}

function midiName(midi: number): string {
  const pitchClass = ((midi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
  return `${NOTE_NAMES[pitchClass]}${Math.floor(midi / SEMITONES_PER_OCTAVE) - 1}`; // MIDI 60 = C4
}

function plantAt(ring: number, step: number): Plant | undefined {
  return plants.find((p) => p.cell.ring === ring && p.cell.step === step);
}

function buildGrid(): void {
  const svg = ui.grid;
  for (let r = 0; r < RINGS; r++) {
    const guide = document.createElementNS(SVG_NS, 'circle');
    guide.setAttribute('cx', String(GRID_CENTRE));
    guide.setAttribute('cy', String(GRID_CENTRE));
    guide.setAttribute('r', String(RING_RADIUS_PX[r]));
    guide.setAttribute('class', 'ring-guide');
    svg.appendChild(guide);
  }
  tideRay = document.createElementNS(SVG_NS, 'line');
  tideRay.setAttribute('x1', String(GRID_CENTRE));
  tideRay.setAttribute('y1', String(GRID_CENTRE));
  tideRay.setAttribute('x2', String(GRID_CENTRE));
  tideRay.setAttribute('y2', String(GRID_CENTRE - (RING_RADIUS_PX[RINGS - 1] as number) - TIDE_OVERHANG_PX));
  tideRay.setAttribute('class', 'tide');
  svg.appendChild(tideRay);
  for (let r = 0; r < RINGS; r++) {
    const row: SVGCircleElement[] = [];
    for (let s = 0; s < STEPS; s++) {
      const angle = (s / STEPS) * Math.PI * 2 - Math.PI / 2;
      const radius = RING_RADIUS_PX[r] as number;
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', (GRID_CENTRE + Math.cos(angle) * radius).toFixed(1));
      c.setAttribute('cy', (GRID_CENTRE + Math.sin(angle) * radius).toFixed(1));
      c.setAttribute('r', String(CELL_RADIUS_PX));
      c.addEventListener('click', () => toggleCell(r, s));
      const title = document.createElementNS(SVG_NS, 'title');
      title.textContent = `ring ${r} · step ${s}`;
      c.appendChild(title);
      svg.appendChild(c);
      row.push(c);
    }
    cellEls.push(row);
  }
  const label = document.createElementNS(SVG_NS, 'text');
  label.setAttribute('x', String(GRID_CENTRE));
  label.setAttribute('y', String(GRID_CENTRE + CENTRE_LABEL_DROP_PX));
  label.setAttribute('class', 'centre-label');
  label.textContent = 'tide';
  svg.appendChild(label);
}

function redrawCells(): void {
  for (let r = 0; r < RINGS; r++) {
    for (let s = 0; s < STEPS; s++) {
      const p = plantAt(r, s);
      const el = (cellEls[r] as SVGCircleElement[])[s] as SVGCircleElement;
      el.setAttribute('class', `cell${p ? ` plant ${p.voice}` : ''}${s === lastStep ? ' now' : ''}`);
    }
  }
}

function toggleCell(ring: number, step: number): void {
  const existing = plantAt(ring, step);
  if (existing) {
    plants = plants.filter((p) => p !== existing);
  } else {
    const idx = ring * STEPS + step;
    const voice = VOICE_CYCLE[plants.length % VOICE_CYCLE.length] as VoiceType;
    plants = [
      ...plants,
      {
        id: `p-${ring}-${step}`,
        voice,
        cell: { ring, step },
        height: NEW_PLANT_HEIGHT,
        hue: (idx * HUE_GOLDEN_STEP) % 1,
        plantedAt: Date.now(),
      },
    ];
  }
  engine?.syncPlants(plants);
  redrawCells();
}

function showPreset(): void {
  const p = currentPreset();
  ui.presetName.textContent = p.name;
  ui.presetBlurb.textContent = p.blurb;
  const sig = p.signature;
  const parts: string[] = [];
  for (let r = 0; r < RINGS; r++) {
    const bell = midiName(degreeToMidi(sig.keyRoot, sig.mode, r, VOICE_OCTAVE.bell));
    const pad = midiName(degreeToMidi(sig.keyRoot, sig.mode, r, VOICE_OCTAVE.pad));
    parts.push(`ring ${r}: ${bell} (pad ${pad})`);
  }
  ui.ringNotes.textContent = parts.join(' · ');
}

/** The tempo control is separate from the room (D-021); anything that is not one of the options means the default. */
function selectedTempo(): number {
  const bpm = Number(ui.tempo.value);
  return TEMPO_OPTIONS.some((t) => t === bpm) ? bpm : DEFAULT_TEMPO;
}

function buildTempoOptions(): void {
  for (const bpm of TEMPO_OPTIONS) {
    const opt = document.createElement('option');
    opt.value = String(bpm);
    opt.textContent = `${bpm} BPM`;
    opt.selected = bpm === DEFAULT_TEMPO;
    ui.tempo.appendChild(opt);
  }
}

function setButtons(): void {
  ui.play.disabled = playing;
  ui.stop.disabled = !playing;
}

async function onPlay(): Promise<void> {
  ui.play.disabled = true; // one start at a time, also while the context is still opening
  const fresh = engine === null;
  const e = engine ?? new AudioEngine();
  engine = e; // set before the await, so Next room, Tempo and planting reach it while the context opens
  try {
    if (fresh) {
      e.setSignature(currentPreset().signature);
      e.setTempo(selectedTempo());
      await e.init(); // creates the AudioContext inside the click: autoplay policy
      e.setVolume(Number(ui.volume.value), true);
      e.syncPlants(plants);
    } else {
      await e.resume();
    }
  } catch (err) {
    if (fresh) {
      engine = null; // the next Play starts from scratch
      void e.dispose().catch(() => undefined);
    }
    ui.status.textContent = `Audio could not start: ${err instanceof Error ? err.message : String(err)}`;
    setButtons();
    return;
  }
  e.start();
  playing = true;
  startedAt = e.clock.now();
  peakHoldDb = -Infinity;
  setButtons();
}

function onStop(): void {
  engine?.stop();
  playing = false;
  setButtons();
}

function onNext(): void {
  presetIndex = nextPresetIndex(presetIndex);
  showPreset();
  engine?.setSignature(currentPreset().signature);
}

function onReset(): void {
  plants = [...FIXED_PLANTS];
  engine?.syncPlants(plants);
  redrawCells();
}

async function onSelfTest(): Promise<void> {
  ui.selftest.textContent = 'rendering…';
  try {
    const r = await runSelfTest();
    ui.selftest.textContent = formatSelfTest(r);
  } catch (e) {
    ui.selftest.textContent = `TC-AUD-05 ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }
}

function fmtDb(db: number): string {
  return db === -Infinity || db <= METER_FLOOR_DB ? '−∞' : db.toFixed(1);
}

function frame(): void {
  if (engine && playing) {
    const phase = engine.clock.barPhase();
    const step = engine.clock.stepIndex();
    tideRay.setAttribute('transform', `rotate(${(phase * 360).toFixed(2)} ${GRID_CENTRE} ${GRID_CENTRE})`);
    if (step !== lastStep) {
      lastStep = step;
      redrawCells();
    }
    const db = engine.peakDb();
    if (db > peakHoldDb) peakHoldDb = db;
    const pct = Math.max(0, Math.min(1, (db - METER_FLOOR_DB) / -METER_FLOOR_DB)) * 100;
    ui.meterBar.style.width = `${pct.toFixed(1)}%`;
    ui.meterBar.classList.toggle('hot', db > CEILING_DBFS);
    ui.meterText.textContent = `${fmtDb(db)} dBFS`;
    ui.peakHold.textContent = `${fmtDb(peakHoldDb)} dBFS`;
    const elapsed = engine.clock.now() - startedAt;
    ui.status.textContent =
      `bar ${engine.clock.barIndex() + 1} · step ${step + 1}/${STEPS} · ${elapsed.toFixed(0)} s · ` +
      `${selectedTempo()} BPM · voices ${engine.stats.voices} · tick ${engine.stats.cpuEstimate.toFixed(2)} ms · ` +
      `${plants.length} plants`;
  }
  requestAnimationFrame(frame);
}

buildGrid();
buildTempoOptions();
redrawCells();
showPreset();
setButtons();
ui.volume.value = String(DEFAULT_VOLUME);
ui.play.addEventListener('click', () => {
  void onPlay();
});
ui.stop.addEventListener('click', onStop);
ui.next.addEventListener('click', onNext);
ui.reset.addEventListener('click', onReset);
ui.tempo.addEventListener('change', () => engine?.setTempo(selectedTempo()));
ui.volume.addEventListener('input', () => engine?.setVolume(Number(ui.volume.value)));
ui.selftestRun.addEventListener('click', () => {
  void onSelfTest();
});
requestAnimationFrame(frame);

if (new URLSearchParams(location.search).has('selftest')) {
  void onSelfTest();
}
