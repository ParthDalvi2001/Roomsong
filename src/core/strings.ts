// ALL user-facing text (CODING_GUIDELINES §6). English only (Golden Rule 8). A caption is raised by its key.
export const STRINGS = {
  // Tuning-ripple captions (LLD §5.8). Limits: RIPPLE_CAPTION_MAX_WORDS, RIPPLE_CAPTION_MAX_CHARS; each names its surface.
  rippleTableSeeds: 'Table: seeds.',
  rippleTableColour: 'Table: colour.',
  rippleWalls: 'Walls: colour.',
  rippleCeiling: 'Ceiling: scale.',
  // The hand hint of FR-HND-15 (D-030): hands/ raises it by this key (HAND_HINT_KEY) until ui/Hints draws the icon.
  handOutOfView: 'Hand out of view',
  // The level-3 placement hint (UX §9.2): room/ raises one of the two while the ghost of the bed shows.
  placeLook: 'Look at your table, and pinch',
  placeLookGaze: 'Look at your table, and wait', // gaze mode (Settings.gazeDwell)
  // A seed let go over a full bed (UX §7): render's SeedSystem raises it (T-127).
  gardenFull: 'Garden is full',
  // The message of a user-facing failure has its error code (ErrorCode, API_SPEC §5) as its key (LLD §8).
  E_SAVE_FAILED: 'Saving unavailable',
  // A session with no sound (API_SPEC §1.10 rule 2): src/app.ts raises it. The garden still works, silent.
  E_AUDIO_CONTEXT: 'Sound unavailable',
} as const;

export type StringKey = keyof typeof STRINGS;
