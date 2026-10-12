// Public API of the `hands` module (API_SPEC §1.4, LLD §1). Other modules import from here only, never from
// files inside the folder (CODING_GUIDELINES §3). The module's events are declared in ./events.ts (API_SPEC §2).
export {
  DRAG_DEAD_ZONE_M,
  HAND_HINT_KEY,
  HAND_HINT_MAX_MS,
  HIT_RADIUS_M,
  HOVER_DEAD_BAND_M,
  ONE_EURO_BETA,
  ONE_EURO_D_CUTOFF_HZ,
  ONE_EURO_MIN_CUTOFF_HZ,
  PALM_UP_HOLD_MS,
  PALM_UP_MAX_ANGLE_DEG,
  PINCH_DEBOUNCE_FRAMES,
  PINCH_ENTER_M,
  PINCH_LOCKOUT_MS,
  PINCH_RELEASE_M,
  REVERT_LERP_MS,
  TARGET_VISIBLE_DIAMETER_M,
  TRACKING_GRACE_MS,
} from './config.js';
export { createHandFrame } from './InputSource.js';
export type { HandFrame, InputSource } from './InputSource.js';
export { HandSampler } from './HandSampler.js';
export { HandState } from './HandState.js';
export { HandSystem } from './HandSystem.js';
export { GestureMachine } from './GestureMachine.js';
export type { GestureContext, GestureEvent, HeldGesture } from './GestureMachine.js';
export { pickTarget, stickyCell, toBedLocal } from './TargetPicker.js';
export type { PickCandidate, TargetRef } from './TargetPicker.js';
