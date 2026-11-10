// The events ui/ emits, merged into core's EventMap (API_SPEC §2). Declarations only: no runtime code.
// A consumer names a payload as EventMap['panel:open'], EventMap from core/.
export {};

declare module '../core/index.js' {
  interface EventMap {
    /** D-084: the settings board opened or closed, by pinch, gaze or look-away; once per change. */
    'panel:open': { open: boolean };
  }
}
