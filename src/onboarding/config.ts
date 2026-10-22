// Named constants of onboarding/ (CODING_GUIDELINES §4). Each cites the requirement it comes from.

/**
 * UX §3.3: how long a step's caption is asked to stay (CaptionSystem keeps it at least CAPTION_MIN_MS). Finite, so
 * a step the player is slow to do never holds the one line of captions: its icon (ui/Hints) stays instead.
 */
export const ONBOARD_CAPTION_MS = 5000;
/** UX §3.3 step 4: the grow and move hints come once the bed holds this many plants. */
export const HINT_RING_AFTER_PLANTS = 3;
/**
 * UX §3.3 step 5: "Show your palms to listen" comes once the grow and move gates are earned (a pull and a drag), or
 * 4 minutes after the tutorial began, or at 6 plants (more than day 1 has: a later visit's net).
 */
export const LISTEN_AFTER_MS = 240_000;
export const LISTEN_AFTER_PLANTS = 6;
/** UX §3.3 step 5: how long the Listen step's icon stays when the player does not listen: a second chance for one who
 *  looked at the plants during the caption. No requirement fixes it. */
export const LISTEN_STEP_MS = 30_000;
/** D-053: a gate step (palm to move) that makes no progress for this long gives way to the next: no one is stuck. */
export const STEP_STALL_MS = 60_000;
