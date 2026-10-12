// The events render/ emits, merged into core's EventMap (API_SPEC §2). Declarations only: no runtime code.
// PerfSampler emits it; a consumer names the payload as EventMap['perf:sample'], EventMap from core/.
export {};

declare module '../core/index.js' {
  interface EventMap {
    /** One per second. The object is reused by its emitter, so a handler copies what it keeps. */
    'perf:sample': {
      fps: number;
      draws: number;
      tris: number;
      jsMs: number;
      voices: number;
      maxFlashPerS: number;
    };
  }
}
