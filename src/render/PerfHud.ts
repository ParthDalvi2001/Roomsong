// The performance read-out (NFR-PERF-03/04/05, LLD §9): PerfSampler emits `perf:sample` once a second, and
// PerfHud draws the latest one on a small panel in the scene when the `perfHud` flag is on. The panel is in the
// scene, not in the page, because a page element does not show inside an immersive session.
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';

import { bus, flags } from '../core/index.js';

import {
  BED_BASE_COLOUR,
  CREAM,
  FLASH_CAP_PER_S,
  PERF_HUD_HEIGHT_M,
  PERF_HUD_PX_PER_M,
  PERF_HUD_TEXT_SHARE,
  PERF_HUD_WIDTH_M,
  PERF_SAMPLE_MS,
} from './config.js';

import type { FlashGuard } from './FlashGuard.js';
import type { EventMap, Flags } from '../core/index.js';
import type { Object3D } from 'three';

type PerfSample = EventMap['perf:sample'];
/** The part of `WebGLRenderer.info` the sampler reads: the draw calls and triangles of the last render. */
export interface RenderInfo {
  render: { calls: number; triangles: number };
}

const hex = (colour: number): string => `#${colour.toString(16).padStart(6, '0')}`;

export class PerfSampler {
  private readonly sample: PerfSample = { fps: 0, draws: 0, tris: 0, jsMs: 0, voices: 0, maxFlashPerS: 0 };
  private sinceMs = Number.NaN;
  private frames = 0;
  private jsSumMs = 0;

  constructor(
    private readonly info: RenderInfo,
    private readonly guard: FlashGuard,
  ) {}

  /**
   * Call once per frame, after the render. `jsMs` is the script time of this frame; `voices` the sounding voices
   * (audio's count). Every PERF_SAMPLE_MS it emits `perf:sample`: fps and the mean `jsMs` over that time, the
   * last frame's draw calls and triangles, and the flash guard's peak.
   */
  frame(nowMs: number, jsMs: number, voices = 0): void {
    if (this.sinceMs !== this.sinceMs) {
      this.sinceMs = nowMs; // the first frame only starts the clock
      return;
    }
    this.frames++;
    this.jsSumMs += jsMs;
    const elapsedMs = nowMs - this.sinceMs;
    if (elapsedMs < PERF_SAMPLE_MS) return;
    const sample = this.sample;
    sample.fps = (this.frames * 1000) / elapsedMs;
    sample.jsMs = this.jsSumMs / this.frames;
    sample.draws = this.info.render.calls;
    sample.tris = this.info.render.triangles;
    sample.voices = voices;
    sample.maxFlashPerS = this.guard.takePeak();
    this.sinceMs = nowMs;
    this.frames = this.jsSumMs = 0;
    bus.emit('perf:sample', sample);
  }
}

/** The HUD's lines for a sample. Developer text behind a dev flag, so it is not in core/strings. */
export function perfLines(sample: Readonly<PerfSample>): string[] {
  return [
    `${sample.fps.toFixed(0)} fps  ${sample.jsMs.toFixed(1)} ms`,
    `draws ${sample.draws}  tris ${sample.tris}`,
    `voices ${sample.voices}  flash ${sample.maxFlashPerS}/${FLASH_CAP_PER_S}`,
  ];
}

export class PerfHud {
  /** The panel. Whoever creates the HUD places it. */
  readonly mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly context: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  private readonly stop: () => void;

  constructor(parent: Object3D) {
    const canvas = document.createElement('canvas');
    canvas.width = PERF_HUD_WIDTH_M * PERF_HUD_PX_PER_M;
    canvas.height = PERF_HUD_HEIGHT_M * PERF_HUD_PX_PER_M;
    this.context = canvas.getContext('2d')!;
    this.texture = new CanvasTexture(canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(
      new PlaneGeometry(PERF_HUD_WIDTH_M, PERF_HUD_HEIGHT_M),
      new MeshBasicMaterial({ map: this.texture, toneMapped: false }),
    );
    this.stop = bus.on('perf:sample', (sample) => this.show(sample));
    parent.add(this.mesh);
  }

  dispose(): void {
    this.stop();
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.texture.dispose();
  }

  /** Once a second, not per frame: it builds strings and uploads the small texture. */
  private show(sample: Readonly<PerfSample>): void {
    const { context } = this;
    const { width, height } = context.canvas;
    const lines = perfLines(sample);
    const lineHeight = height / (lines.length + 1); // the lines' middles divide the panel evenly
    context.fillStyle = hex(BED_BASE_COLOUR);
    context.fillRect(0, 0, width, height);
    context.fillStyle = hex(CREAM);
    context.font = `${Math.round(lineHeight * PERF_HUD_TEXT_SHARE)}px monospace`;
    context.textBaseline = 'middle';
    // The last argument squeezes a line that is too long into the panel instead of cutting it off.
    lines.forEach((line, i) =>
      context.fillText(line, lineHeight / 2, lineHeight * (i + 1), width - lineHeight),
    );
    this.texture.needsUpdate = true;
  }
}

/** The HUD when the `perfHud` flag is on (API_SPEC §3), else null. */
export function createPerfHud(parent: Object3D, f: Flags = flags): PerfHud | null {
  return f.perfHud ? new PerfHud(parent) : null;
}
