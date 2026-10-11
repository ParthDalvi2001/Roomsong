// The page's stereo stand-in: one StereoPannerNode per plant, panned by its step. The app pans by position
// (src/audio/Spatializer.ts); the plant → voice mappings moved to src/audio/mapping.ts with T-121.
import { PAN_WIDTH, STEPS } from './config';

/** Step 0..15 → stereo pan. Step 0 is straight ahead (far side of the bed), clockwise from above: step 4 is right. */
export function panForStep(step: number): number {
  return PAN_WIDTH * Math.sin((2 * Math.PI * step) / STEPS);
}
