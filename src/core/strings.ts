// ALL user-facing text (CODING_GUIDELINES §6). English only (Golden Rule 8). A caption is raised by its key.
export const STRINGS = {
  // Tuning-ripple captions (LLD §5.8). Limits: RIPPLE_CAPTION_MAX_WORDS, RIPPLE_CAPTION_MAX_CHARS; each names its surface.
  rippleTableSeeds: 'Table: seeds.',
  rippleTableColour: 'Table: colour.',
  rippleWalls: 'Walls: colour.',
  rippleCeiling: 'Ceiling: scale.',
  // The level-3 placement hint (UX §9.2): room/ raises one of the two while the ghost of the bed shows.
  placeLook: 'Look at your table, and pinch',
  placeLookGaze: 'Look at your table, and wait', // gaze mode (Settings.gazeDwell)
  // UX §3.5: the end of a Listen that ran its 10 minutes, the one caption that is not an instruction (T-148).
  goodnight: 'Goodnight',
  // A seed let go over a full bed (UX §7): render's SeedSystem raises it (T-127).
  gardenFull: 'Garden is full',
  // The supply is empty at a palm up (UX §3.3; a new seed each day): onboarding/ raises it once a session.
  seedsTomorrow: 'More seeds tomorrow',
  // The session's first removal (UX §7, the undo petal): onboarding/ raises it once, for the petal's 5 s.
  undoHint: 'Pinch the petal to undo',
  // The onboarding captions (UX §3.3, T-150): onboarding/ raises them, one per step. The `Click` twins are the
  // garden window's (FR-SYS-07), where a click or a tap is the pinch and the Listen orb is the way to Listen.
  onboardPalm: 'Open your hand, palm up', // the seed needs the palm within PALM_UP_MAX_ANGLE_DEG of up
  onboardPlant: 'Pinch the seed, drop it here', // the pinch is on the seed in the palm, the drop on the cell
  onboardPlantClick: 'Click or tap to plant',
  onboardPlantGaze: 'Look at a cell to plant', // gaze mode (Settings.gazeDwell): a dwell on a free cell plants (T-160)
  onboardListen: 'Show your palms to listen', // both palms out towards the garden (hands/ palmsOut)
  onboardListenClick: 'Click the orb to listen',
  // The message of a user-facing failure has its error code (ErrorCode, API_SPEC §5) as its key (LLD §8).
  E_SAVE_FAILED: 'Saving unavailable',
  // A session with no sound (API_SPEC §1.10 rule 2): src/app.ts raises it. The garden still works, silent.
  E_AUDIO_CONTEXT: 'Sound unavailable',
} as const;

export type StringKey = keyof typeof STRINGS;
