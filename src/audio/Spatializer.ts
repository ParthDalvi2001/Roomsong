// The 24 pooled voice channels (LLD §7.1, NFR-PERF-10): input → equal-power PannerNode → dry bus, and input →
// the shared reverb send, taken before the pan so the reverb stays wide. Built once; a note only moves a panner.
// No HRTF: at most two "hero" panners may be added, and only after a device A/B (T-129, W1).
import { LISTEN_FOCUS_REF_M, PAN_REF_DISTANCE_M, PAN_ROLLOFF, PARAM_SMOOTH_S, VOICE_CAP } from './config.js';

import type { Mat4 } from '../core/index.js';

export class Spatializer {
  /** The input of each voice channel: a voice connects its note here. */
  readonly inputs: GainNode[] = [];
  private readonly panners: PannerNode[] = [];
  private readonly listener: AudioListener;
  /** The listener's nine AudioParams: position, forward, up. Empty where it has none (Firefox). */
  private readonly params: AudioParam[];
  /** The pose of the last call, in the order of `params`. */
  private readonly pose = new Float64Array(9);
  private posed = false;
  /** Listen mode (T-148): the nearer a note to the head, the more of it; off, every note at full level. */
  isFocused = false;
  /** Each channel input's level as last set. */
  private readonly levels = new Float64Array(VOICE_CAP).fill(1);

  constructor(
    private readonly ctx: BaseAudioContext,
    dry: AudioNode,
    send: AudioNode,
  ) {
    const l = (this.listener = ctx.listener);
    this.params =
      l.positionX === undefined
        ? []
        : [l.positionX, l.positionY, l.positionZ, l.forwardX, l.forwardY, l.forwardZ, l.upX, l.upY, l.upZ];
    // k-rate: Chromium pans every sample of every panner while an a-rate listener or panner parameter is automated,
    // about three times the graph's cost while the head moves (T-145). k-rate moves a pan once a render quantum.
    for (const p of this.params) p.automationRate = 'k-rate';
    for (let i = 0; i < VOICE_CAP; i++) {
      const input = ctx.createGain();
      const panner = ctx.createPanner();
      panner.panningModel = 'equalpower';
      // Table-scale curve: gain 1 up to 40 cm from the head, about −6 dB at 80 cm. The default reference of 1 m
      // would give no distance cue on a table (MDN: PannerNode.refDistance, 'inverse' distanceModel).
      panner.distanceModel = 'inverse';
      panner.refDistance = PAN_REF_DISTANCE_M;
      panner.rolloffFactor = PAN_ROLLOFF;
      for (const p of [
        panner.positionX,
        panner.positionY,
        panner.positionZ,
        panner.orientationX,
        panner.orientationY,
        panner.orientationZ,
      ]) {
        p.automationRate = 'k-rate';
      }
      input.connect(panner).connect(dry);
      input.connect(send);
      this.inputs.push(input);
      this.panners.push(panner);
    }
  }

  /**
   * Move channel `i` to a world position at audio time `time`: a render-quantum start, when the channel is silent
   * (the position is k-rate: it changes only at a quantum's start; VoicePool picks the one at or before the note).
   * Its level is set there too, so a change of focus never steps a note that sounds.
   */
  place(i: number, x: number, y: number, z: number, time: number): void {
    const p = this.panners[i] as PannerNode;
    p.positionX.setValueAtTime(x, time);
    p.positionY.setValueAtTime(y, time);
    p.positionZ.setValueAtTime(z, time);
    let level = 1;
    // Only once there is a head to measure from: before the first pose the listener sits on the floor.
    if (this.isFocused && this.posed) {
      // From the head as last posed (the glide's target): (LISTEN_FOCUS_REF_M / distance)², at most 1.
      const dx = x - (this.pose[0] as number);
      const dy = y - (this.pose[1] as number);
      const dz = z - (this.pose[2] as number);
      const distanceSq = dx * dx + dy * dy + dz * dz;
      if (distanceSq > LISTEN_FOCUS_REF_M * LISTEN_FOCUS_REF_M) {
        level = (LISTEN_FOCUS_REF_M * LISTEN_FOCUS_REF_M) / distanceSq;
      }
    }
    if (level === this.levels[i]) return;
    this.levels[i] = level;
    (this.inputs[i] as GainNode).gain.setValueAtTime(level, time);
  }

  /**
   * The listener is the head (LLD §7.1): position, forward (−Z) and up (+Y) of a column-major matrix. The first pose
   * is set (the listener sat on the floor: there is nothing to glide from); after it the listener glides from the
   * audio clock's now, because a value written once a frame steps all 24 pans 72 times a second, a zipper on a held
   * note. No allocation.
   */
  setListenerPose(head: Mat4): void {
    const n = this.pose;
    readPose(head, n);
    // A value that is not finite makes an AudioParam throw, every frame.
    for (let i = 0; i < 9; i++) if (!Number.isFinite(n[i])) return;
    if (this.params.length === 0) {
      // Firefox: the listener has no AudioParams, only these two methods (MDN: AudioListener). They step.
      const l = this.listener;
      l.setPosition(n[0] as number, n[1] as number, n[2] as number);
      l.setOrientation(
        n[3] as number,
        n[4] as number,
        n[5] as number,
        n[6] as number,
        n[7] as number,
        n[8] as number,
      );
      this.posed = true;
      return;
    }
    const now = this.ctx.currentTime;
    for (let i = 0; i < 9; i++) {
      const p = this.params[i] as AudioParam;
      if (this.posed) p.setTargetAtTime(n[i] as number, now, PARAM_SMOOTH_S);
      else p.value = n[i] as number;
    }
    this.posed = true;
  }
}

/** Position, forward (−Z axis) and up (Y axis) of a column-major matrix, in the listener's parameter order. */
function readPose(head: Mat4, out: Float64Array): void {
  out[0] = head[12] as number;
  out[1] = head[13] as number;
  out[2] = head[14] as number;
  out[3] = -(head[8] as number);
  out[4] = -(head[9] as number);
  out[5] = -(head[10] as number);
  out[6] = head[4] as number;
  out[7] = head[5] as number;
  out[8] = head[6] as number;
}
