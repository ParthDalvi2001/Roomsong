// The one seam between an input device and the gesture machine (FR-SYS-07, API_SPEC §1.4). hands/ owns the
// interface and the WebXR implementation (HandSampler); window/ implements it for a pointer (LLD §11).
import { Vector3 } from '@iwsdk/core';

import type { Hand, Vec3 } from '../core/index.js';

export interface HandFrame {
  hand: Hand;
  tracked: boolean;
  /** The hold signal: thumb tip to index tip with hysteresis, debounce and lockout. A pinch on a plant uses it. */
  pinch: boolean;
  /**
   * The tap signal: the platform's own pinch classifier (selectstart..selectend). Discrete actions use it.
   * A source with no platform classifier reports select = pinch (LLD §4, Pinch signal).
   */
  select: boolean;
  /** World; 1-euro filtered. */
  pinchPos: Vec3;
  /** World; where a delivered seed rests (a hand: just above the palm; a pointer: LLD §11). */
  palmPos: Vec3;
  /** World, unit length; points out of the palm. */
  palmNormal: Vec3;
  /** Of the pinch point, world, metres per second. */
  velocity: Vec3;
}

export interface InputSource {
  /** The hands this source reports: WebXR = both, pointer = one. */
  readonly hands: readonly Hand[];
  /** Fills `out` for this frame; creates no objects (hot path). */
  sample(hand: Hand, timeMs: number, out: HandFrame): void;
}

// A Vector3, not { x, y, z }: once IWSDK is loaded, V8 boxes each fraction stored into a plain literal, as
// some literal of that shape there holds a non-number (T-165; measured in HandSampler.test, PointerSource.heap.test).
const zero = (): Vec3 => new Vector3();

/** An untracked, zeroed frame: the caller keeps one per hand and passes it to `sample` every frame. */
export function createHandFrame(hand: Hand): HandFrame {
  return {
    hand,
    tracked: false,
    pinch: false,
    select: false,
    pinchPos: zero(),
    palmPos: zero(),
    palmNormal: zero(),
    velocity: zero(),
  };
}
