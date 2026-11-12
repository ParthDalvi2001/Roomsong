// D-087 (12 Nov): the strict guide. While the first-run guide runs, a hand or a look may do only what its step shows;
// onboarding/ writes the lock at every step, hands/, access/ and ui/ read it. No guide: null, everything allowed.

/** What a hand or a look may do at one step of the guide. */
export interface GuideLock {
  /**
   * The Interactable kinds a pinch or a look may act on ('cell': a look at a free cell, gaze mode's plant). The
   * guide's own Skip button (GUIDE_SKIP_ID) always may.
   */
  readonly kinds: readonly string[];
  /** A palm up asks the garden for a seed. */
  readonly palmUp: boolean;
  /** Palms out enters Listen. The wake out of Listen is never locked. */
  readonly palmsOut: boolean;
  /** A held plant may only be pulled ('pull') or only dragged ('drag'); null when either may. */
  readonly shape: 'pull' | 'drag' | null;
}

/** The guide's Skip button's Interactable id (kind 'panel'): it can be pressed at every step. */
export const GUIDE_SKIP_ID = 'skipGuide';

/** The lock of the step the guide is at; null while no guide runs. Only onboarding/ writes it. */
export const guide: { lock: GuideLock | null } = { lock: null };

/** A pinch or a look may act on this Interactable now. Creates nothing. */
export function guideAllows(kind: string, id: string): boolean {
  const lock = guide.lock;
  return lock === null || id === GUIDE_SKIP_ID || lock.kinds.includes(kind);
}
