// The page's Pluck: one string per plant, at the plant's exact damping and with the plant's own noise seed.
// The app's Pluck (src/audio/voices/Pluck.ts) shares strings between plants in four damping steps; that would
// change what this page plays while it is being rated (T-103), so the page keeps its own buffers and shares the
// string render, the damping curve and the note itself.
import { renderKarplusStrong } from '../../../../src/audio/karplus';
import { playString, pluckDamping } from '../../../../src/audio/voices/Pluck';
import { PLUCK_BUFFER_S } from '../config';

import type { NoteRef } from '../../../../src/audio/voices/note';
import type { Voice, VoiceParams } from '../types';

export class Pluck implements Voice {
  private buffer: AudioBuffer | null = null;
  private bufferHz = 0;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly ref: NoteRef,
    private readonly seed: number,
  ) {}

  /** Render the string for this plant's pitch and hue. Called by the engine on sync and re-tune, never in the tick. */
  prepare(p: VoiceParams): void {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(sr * PLUCK_BUFFER_S), sr);
    renderKarplusStrong(buf.getChannelData(0), sr, p.hz, pluckDamping(p.cutoffMul), this.seed);
    this.buffer = buf;
    this.bufferHz = p.hz;
  }

  trigger(time: number, p: VoiceParams, out: AudioNode): void {
    if (this.buffer === null) this.prepare(p); // fallback only; the engine prepares ahead of time
    playString(this.ctx, this.buffer as AudioBuffer, this.bufferHz, time, p, out, this.ref.note);
  }

  dispose(): void {
    this.buffer = null;
  }
}
