// The 24 pooled voice channels (LLD §7.1, NFR-PERF-10): input → equal-power PannerNode → dry bus, and input →
// the shared reverb send, taken before the pan so the reverb stays wide. Built once; a note only moves a panner.
// No HRTF: at most two "hero" panners may be added, and only after a device A/B (T-129, W1).
import { PAN_REF_DISTANCE_M, PAN_ROLLOFF, VOICE_CAP } from './config.js';

import type { Mat4 } from '../core/index.js';

export class Spatializer {
  /** The input of each voice channel: a voice connects its note here. */
  readonly inputs: GainNode[] = [];
  private readonly panners: PannerNode[] = [];
  private readonly listener: AudioListener;

  constructor(ctx: BaseAudioContext, dry: AudioNode, send: AudioNode) {
    this.listener = ctx.listener;
    for (let i = 0; i < VOICE_CAP; i++) {
      const input = ctx.createGain();
      const panner = ctx.createPanner();
      panner.panningModel = 'equalpower';
      // Table-scale curve: gain 1 up to 40 cm from the head, about −6 dB at 80 cm. The default reference of 1 m
      // would give no distance cue on a table (MDN: PannerNode.refDistance, 'inverse' distanceModel).
      panner.distanceModel = 'inverse';
      panner.refDistance = PAN_REF_DISTANCE_M;
      panner.rolloffFactor = PAN_ROLLOFF;
      input.connect(panner).connect(dry);
      input.connect(send);
      this.inputs.push(input);
      this.panners.push(panner);
    }
  }

  /** Move channel `i` to a world position at audio time `time`: the start of its next note, when it is silent. */
  place(i: number, x: number, y: number, z: number, time: number): void {
    const p = this.panners[i] as PannerNode;
    p.positionX.setValueAtTime(x, time);
    p.positionY.setValueAtTime(y, time);
    p.positionZ.setValueAtTime(z, time);
  }

  /** The listener is the head (LLD §7.1): position, forward (−Z) and up (+Y) of a column-major matrix. No allocation. */
  setListenerPose(head: Mat4): void {
    const x = head[12] as number;
    const y = head[13] as number;
    const z = head[14] as number;
    const fx = -(head[8] as number);
    const fy = -(head[9] as number);
    const fz = -(head[10] as number);
    const ux = head[4] as number;
    const uy = head[5] as number;
    const uz = head[6] as number;
    // A value that is not finite makes an AudioParam throw, every frame.
    if (!Number.isFinite(x + y + z + fx + fy + fz + ux + uy + uz)) return;
    const l = this.listener;
    if (l.positionX === undefined) {
      // Firefox: the listener has no AudioParams, only these two methods (MDN: AudioListener).
      l.setPosition(x, y, z);
      l.setOrientation(fx, fy, fz, ux, uy, uz);
      return;
    }
    l.positionX.value = x;
    l.positionY.value = y;
    l.positionZ.value = z;
    l.forwardX.value = fx;
    l.forwardY.value = fy;
    l.forwardZ.value = fz;
    l.upX.value = ux;
    l.upY.value = uy;
    l.upZ.value = uz;
  }
}
