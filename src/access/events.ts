// The event access/ emits, merged into core's EventMap (API_SPEC §2). Declarations only: no runtime code.
export {};

declare module '../core/index.js' {
  interface EventMap {
    /**
     * StillnessSystem (P-016, T-173), on a change only: the garden opened or closed, or, while it is open, the
     * plant the gaze line rests on changed (`plantId`, '' for none; always '' when closed). The object is reused by
     * its emitter.
     */
    'stillness:changed': { isOpen: boolean; plantId: string };
  }
}
