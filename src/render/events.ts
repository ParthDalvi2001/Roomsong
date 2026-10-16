// The events render/ emits, merged into core's EventMap (API_SPEC §2). Declarations only: no runtime code.
// A consumer names a payload as EventMap['perf:sample'], EventMap from core/.
export {};

declare module '../core/index.js' {
  interface EventMap {
    /** PerfSampler, one per second. The object is reused by its emitter, so a handler copies what it keeps. */
    'perf:sample': {
      fps: number;
      draws: number;
      tris: number;
      jsMs: number;
      voices: number;
      maxFlashPerS: number;
    };
    /** TuningRippleSystem, RIPPLE_TUNED_MS after the room:features its ripple started on (FR-ROOM-12). */
    'room:tuned': Record<string, never>;
  }
}
