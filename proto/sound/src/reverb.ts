// The page's reverb decay clamp. The impulse response itself moved to src/audio/Reverb.ts with T-121; the clamp
// stays here until garden/ owns the bounds (T-141).
import { REVERB_RT60_MAX_S, REVERB_RT60_MIN_S } from './config';

/** RT60 in seconds inside the 0.3..2.0 clamp (FR-ROOM-06); anything that is not a number counts as the shortest room. */
export function clampRt60(rt60: number): number {
  if (!(rt60 > REVERB_RT60_MIN_S)) return REVERB_RT60_MIN_S;
  return rt60 > REVERB_RT60_MAX_S ? REVERB_RT60_MAX_S : rt60;
}
