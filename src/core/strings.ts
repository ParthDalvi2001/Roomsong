// ALL user-facing text (CODING_GUIDELINES §6). English only (Golden Rule 8). A caption is raised by its key.
export const STRINGS = {
  // Tuning-ripple captions (LLD §5.8). Limits: RIPPLE_CAPTION_MAX_WORDS, RIPPLE_CAPTION_MAX_CHARS; each names its surface.
  rippleTableSeeds: 'Table: seeds.',
  rippleTableNote: 'Table: a note.', // a later session: the table rings the chord's root (LLD §5.8); no room tint is drawn
  rippleWalls: 'Walls: a note.', // the wall rings the chord's middle note
  // The ceiling's height sets the mode, which its caption names (D-071), and it rings the fifth.
  rippleCeilingMinor: 'Ceiling: minor mood.',
  rippleCeilingMajor: 'Ceiling: major mood.',
  rippleCeilingOpen: 'Ceiling: open mood.', // susPent
  // The level-3 placement hint (UX §9.2): room/ raises one of the two while the ghost of the bed shows.
  placeLook: 'Look at your table, and pinch',
  placeLookGaze: 'Look at your table, and wait', // gaze mode (Settings.gazeDwell)
  // FR-ROOM-14 (D-068): the room read found no plane at all, so the song is Wanderer's; room/ raises it once a session.
  noRoomScan: 'No room scan: run Space Setup',
  // UX §3.5: the end of a Listen that ran its 10 minutes, the one caption that is not an instruction (T-148).
  goodnight: 'Goodnight',
  // A seed let go over a full bed (UX §7): render's SeedSystem raises it (T-127).
  gardenFull: 'Garden full. Remove a plant first.',
  // The supply is empty at a palm up (UX §3.3; a new seed each day): onboarding/ raises it once a session.
  seedsTomorrow: 'More seeds tomorrow',
  // The session's first removal (UX §7, the undo petal): onboarding/ raises it once, for the petal's 5 s.
  undoHint: 'Pinch the petal to undo',
  undoHintGaze: 'Look at the petal to undo', // gaze mode (Settings.gazeDwell): a dwell on the petal undoes (T-160)
  undoHintClick: 'Click the petal to undo', // the garden window (FR-SYS-07): a click is the pinch
  // The tutorial's end (UX §3.3 step 6): the settings orb rides the back of the non-dominant hand; once a session.
  settingsHint: 'Turn a hand over for settings',
  settingsHintLook: 'Look for the settings orb', // one-hand or gaze mode: the orb waits in the view box (FR-UI-09, FR-HND-12)
  // The onboarding captions (UX §3.3, T-150): onboarding/ raises them, one per step. The `Click` twins are the
  // garden window's (FR-SYS-07), where a click or a tap is the pinch and the Listen orb is the way to Listen.
  onboardPalm: 'Open your hand, palm up', // the seed needs the palm within PALM_UP_MAX_ANGLE_DEG of up
  onboardPlant: 'Pinch the seed, drop it here', // the pinch is on the seed in the palm, the drop on the cell
  onboardPlantClick: 'Click or tap to plant',
  onboardPlantGaze: 'Look at a cell to plant', // gaze mode (Settings.gazeDwell): a dwell on a free cell plants (T-160)
  onboardListen: 'Show your palms to listen', // both palms out towards the garden (hands/ palmsOut)
  onboardListenClick: 'Click the orb to listen',
  // The message of a user-facing failure has its error code (ErrorCode, API_SPEC §5) as its key (LLD §8).
  E_SAVE_FAILED: 'This garden cannot be saved',
  // A session with no sound (API_SPEC §1.10 rule 2): src/app.ts raises it. The garden still works, silent.
  E_AUDIO_CONTEXT: 'No sound. Leave and enter again.',
  // T-152: back from a pause, the browser kept the context suspended (it wants a gesture): the first pinch or palm
  // up resumes it. src/app.ts raises it after the same grace as "No sound. Leave and enter again.".
  soundResume: 'Pinch to resume sound',
  soundResumeClick: 'Click to resume sound', // the garden window: a click is the pinch
  // A session with controllers in the hands and no hand tracked for 2 s: hands/ HandSystem raises it until a hand is
  // seen. The landing page's Help says the same ("put the controllers down").
  putControllersDown: 'Put the controllers down',
  // The ten seed kinds and the two libraries of the seed picker (T-193, D-076). garden's SEED_KINDS names a kind by its
  // key here. Placeholder names: these twelve lines are the one place to rename them; no other file holds the words.
  kindBell: 'Chimecap',
  kindPluck: 'Plinkstem',
  kindChoir: 'Chantleaf',
  kindPad: 'Sighpetal',
  kindBass: 'Thumpbulb',
  kindBowl: 'Humbloom',
  kindChime: 'Tinglet',
  kindFlute: 'Whisperwort',
  kindReed: 'Swellroot',
  kindHum: 'Thrumsprout',
  libOld: 'Old',
  libNew: 'New',
  // The Seeds page of the settings board (UX §3.6): its one line of text, and the caption ui/ holds up while the
  // board is open and has not been seen yet (it opens above a head that looks down at the palm).
  pickSeed: 'Pick a seed',
  pickSeedLookUp: 'Look up to pick a seed',
} as const;

export type StringKey = keyof typeof STRINGS;
