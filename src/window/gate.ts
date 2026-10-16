/// <reference types="webxr" />
// The garden window's mode gate (FR-SYS-07, LLD §11). In a file of its own that loads neither three nor
// @iwsdk/core, so the boot may import it (API_SPEC §1.10 rule 1), as it imports ui/Landing.js.
import { log } from '../core/index.js';

/**
 * Whether the garden window opens: with the `window` flag, or when the browser has no WebXR, no `immersive-ar`,
 * or cannot say (a rejected question, logged). `xr` is `navigator.xr`.
 */
export function shouldOpenWindow(isForced: boolean, xr: XRSystem | undefined): Promise<boolean> {
  if (isForced || xr === undefined) return Promise.resolve(true);
  return xr.isSessionSupported('immersive-ar').then(
    (isSupported) => !isSupported,
    (error: unknown) => {
      log.warn('window', 'isSessionSupported rejected: the garden window opens', error);
      return true;
    },
  );
}
