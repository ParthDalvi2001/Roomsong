// The copy of the 2D page (UX §3.1; API_SPEC §1.9). English only (Golden Rule 8). Captions are not here: core's
// STRINGS is the caption table, six words at most, and a page sentence does not belong in it. Same character set as
// STRINGS. A failure message that has an error code (API_SPEC §5) has it as its key.
// Every sentence states what the app does. The wording is UX §9.7 (applied in T-128a): a visitor's words in the
// text, the browser's feature names only in the keys. Re-read against the working app once the save and the room
// were wired (T-128e, emulator: every line held, none changed); re-read them again at release.
export const LANDING = {
  title: 'SonicSpace',
  tagline: 'Grow a song on your table.',
  enter: 'Enter the garden',
  loading: 'Getting the garden ready.',
  loadFailed: 'The garden could not load. Reload the page.',
  E_XR_UNSUPPORTED:
    'SonicSpace is played in a mixed-reality headset. Open this page in the browser of a Meta Quest 3 or 3S.',
  // The garden window (LLD §11): a browser with no mixed reality, or the `window` flag.
  window: 'The garden opens in this tab: a click or a tap is a pinch. Height and settings need a headset.',
  close: 'Close the garden',
  E_HANDS_UNAVAILABLE:
    'The garden did not open. Say yes when the headset asks, and check that hand tracking is on: Settings, Movement tracking, Hand tracking.',
  deviceHeading: 'This device',
  features: {
    immersiveAr: {
      yes: 'Mixed reality: supported.',
      no: 'Mixed reality: not supported. SonicSpace needs it.',
      unknown: 'Mixed reality: checking.',
    },
    // No `no`: a request that fails does not say why, so the page never claims that hand tracking is off.
    handTracking: {
      yes: 'Hand tracking: on.',
      unknown: 'Hand tracking: checked when you enter. SonicSpace cannot start without it.',
    },
    // "not available", not "not supported", for these two: a session may simply not have been granted the feature.
    planeDetection: {
      yes: 'Table detection: on. The garden looks for your table.',
      no: 'Table detection: not available. The garden asks you where to put it, or floats in front of you.',
      unknown:
        'Table detection: checked when you enter. Without it the garden asks you where to put it, or floats in front of you.',
    },
    anchors: {
      yes: 'Saved position: on. The garden can come back to the same spot.',
      no: 'Saved position: not available. The garden is placed again on each visit.',
      unknown: 'Saved position: checked when you enter. Without it the garden is placed again on each visit.',
    },
  },
  accessHeading: 'Accessibility',
  access: {
    oneHand: 'One hand',
    gazeDwell: 'No hands: look to select',
    highContrast: 'High contrast',
    reducedMotion: 'Reduce motion',
  },
  // D-085 (Parth, 10 Nov): no guide on any visit while ticked; the setting is `hintsEnabled`, inverted
  skipTutorial: 'Skip tutorial',
  skipTutorialOn: 'skip tutorial',
  // FR-UI-12: what is on, after the heading in the closed section's summary: "Accessibility: look to select, one hand".
  accessOn: {
    gazeDwell: 'look to select',
    oneHand: 'one hand',
    highContrast: 'high contrast',
    reducedMotion: 'reduce motion',
  },
  helpHeading: 'Help',
  help: [
    'Sit at a table and put the controllers down. SonicSpace is played with bare hands.',
    'Open a hand, palm up, and a seed comes to it.',
    'Pinch the seed, carry it over the glowing ring and let go. Where you plant it sets when it sounds and which note it sings.',
    'Hold your palms out, facing away from you, to sit back and listen. Pinch to come back.',
    // T-167: nothing else tells the player the settings orb exists. The orb rides the hand that is not the main hand.
    'For settings, turn the back of your left hand towards your face (the right hand if your main hand is the left) and pinch the small orb over it. In the one-hand and no-hands modes it waits in front of you instead.',
  ],
  privacy:
    'Your garden is saved in this browser, on this device only. What the headset shares about your room and your hands stays on the device: nothing is sent anywhere.',
} as const;

// The words of the settings panel (UX §3.6; T-151). The same character set, so no middle dot, no superscript and
// no multiplication sign: the panel writes "sq m" and joins with commas. The numbers are put in by ui/Panel.ts.
// "Look to select", not "Gaze dwell": the reticle follows the head, not the eyes (UX §9.7); not "Look and hold":
// "hold" also means New garden's hold (T-167).
export const PANEL = {
  tabs: { sound: 'Sound', access: 'Access', garden: 'Garden' },
  close: 'x',
  minus: '-',
  plus: '+',
  on: 'on',
  off: 'off',
  tempo: 'Speed',
  bpm: 'BPM',
  volume: 'Volume',
  percent: '%',
  reverb: 'Echo',
  reverbs: { auto: 'room', small: 'small', off: 'off' }, // one word for one thing: the echo
  mono: 'Mono',
  tunedBy: 'Tuned to:',
  echo: 'echo',
  seconds: 's',
  room: 'room',
  squareMetres: 'sq m',
  ceiling: 'ceiling',
  metres: 'm',
  noRoom: 'no room found',
  keys: { '-3': 'A', '0': 'C', '2': 'D', '4': 'E' },
  modes: { majorPent: 'major', minorPent: 'minor', susPent: 'sus' },
  oneHand: 'One hand',
  gazeDwell: 'Look to select',
  holdTime: 'Look time',
  highContrast: 'High contrast',
  reducedMotion: 'Reduce motion',
  beatRing: 'Beat ring',
  mainHand: 'Main hand',
  hands: { left: 'L', right: 'R' },
  day: 'Day',
  seeds: 'Seeds left',
  key: 'Key',
  fromRoom: '(room)',
  bedHeight: 'Height',
  // 10 Nov: the Garden tab's actions are buttons that carry their own words, short enough for 8 cm
  replaceBed: 'Move', // Parth, 10 Nov on the headset: "Place again" did not fit; a label now says what moves
  replaceBedLabel: 'Garden spot',
  newGarden: 'New garden',
  newGardenHint: 'Hold to erase this garden',
  bringBack: 'Bring back', // D-060 item 13: the same button, for RESTORE_WINDOW_MS after a New garden
  bringBackHint: 'Hold for the old garden',
  timeLapse: 'Time-lapse', // T-174: the demo switch; "(demo)" does not fit the row at a readable size
  exit: 'Exit', // D-067: leaves the session; the garden is saved and Enter brings it back
  exitLabel: 'Done for now',
  // T-193: the Garden tab's way to the Seeds page, and that page's one line. A palm-up hands out a seed at once; the
  // page sets the kind of the next one.
  seedsPage: 'Seeds',
  nextSeed: 'Your next seed',
  pickSeed: 'Choose the kind of your next seed',
  skipGuide: 'Skip tutorial', // D-084, renamed by Parth 10 Nov (D-085): ends the guide; shown while it runs
  // 10 Nov (Parth: a new player does not know what "Time-lapse" does): the description row under the header says what
  // the control that is pointed at does, keyed by control id; ui/Panel.ts looks an id up whole, then by the part
  // before ':'. A swatch's line is its kind's name, ': ', then `seed`.
  describe: {
    default: 'Point at a setting to see what it does.',
    gazeDefault: 'Look at a setting to see what it does.',
    'tab:sound': 'Sound: volume, speed, echo and mono.',
    'tab:access': 'Access: play with one hand, with no hands, or with stronger colours.',
    'tab:garden': 'Garden: seeds, height, time-lapse, moving and leaving.',
    close: 'Close the settings. They also close when you look away.',
    volume: 'Volume: how loud the garden plays.',
    tempo: 'Speed: how fast the ring of light sweeps the garden, in beats per minute.',
    reverb: 'Echo: Room uses the echo of your real room. Small is a short echo. Off has none.',
    mono: 'Mono: the same sound in both ears, for one earbud or hearing in one ear.',
    oneHand: 'One hand: play with one hand. Pinch the seed off your own palm and carry it.',
    gazeDwell: 'Look to select: no hands needed. Look at something and hold your gaze to choose it.',
    dwell: 'Look time: how long to hold your gaze before it selects.',
    highContrast: 'High contrast: stronger colours and outlines, easier to see.',
    reducedMotion: 'Reduce motion: less sway, no blooming or flying animations, steady glows.',
    beatRing: 'Beat ring: a ring of light that pulses on every beat, so you can see the rhythm.',
    hand: 'Main hand: the hand you pinch with. The settings orb rides your other hand.',
    seeds: 'Seeds: choose the kind of your next seed, from the Classic or Calm sounds.',
    height: 'Height: raise or lower the garden over the table, 2 cm a step.',
    timeLapse:
      'Time-lapse: a quick demo of the garden growing, one day every 4 seconds. Switch it off to go back.',
    replaceBed: 'Move: put the garden somewhere else. Look at the new spot and pinch.',
    exit: 'Exit: leave the garden. It is saved, and Enter brings it back.',
    newGarden: 'New garden: hold to erase this garden and start again with three new seeds.',
    bringBack: 'Bring back: hold to bring back the garden you just erased.',
    'lib:old': 'Classic: bell, pluck, choir, pad and bass.',
    'lib:new': 'Calm: softer sounds: bowl, chime, flute, reed and hum.',
    seed: 'your next seed will play this sound.',
  },
} as const;
