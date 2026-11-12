// Named constants of onboarding/ (CODING_GUIDELINES §4). Each cites the requirement it comes from.

/**
 * UX §3.3: how long a step's caption is asked to stay (CaptionSystem keeps it at least CAPTION_MIN_MS). Finite, so
 * a step the player is slow to do never holds the one line of captions: ui/Hints' ghost hand stays instead.
 */
export const ONBOARD_CAPTION_MS = 5000;
/**
 * BUG-056: a palm up that finds the supply empty says so every time, not once a session: on the 10 Nov headset run
 * 53 palm-ups got no seed and, after the first, no word. At most one notice per gap while the palm stays up (a palm
 * up repeats every 400 ms), each asked to stay this long.
 */
export const NO_SEEDS_GAP_MS = 4000;
export const NO_SEEDS_SHOW_MS = 2000;
