// The copy of the 2D page (UX §3.1; API_SPEC §1.9). English only (Golden Rule 8). Captions are not here: core's
// STRINGS is the caption table, six words at most, and a page sentence does not belong in it. Same character set as
// STRINGS. A failure message that has an error code (API_SPEC §5) has it as its key.
// Every sentence states what the app does. The wording is UX §9.7 (applied in T-128a): a visitor's words in the
// text, the browser's feature names only in the keys. Re-read against the working app once the save and the room
// were wired (T-128e, emulator: every line held, none changed); re-read them again at release.
export const LANDING = {
  title: 'Roomsong',
  tagline: 'Grow a song on your table.',
  enter: 'Enter the garden',
  loading: 'Getting the garden ready.',
  loadFailed: 'The garden could not load. Reload the page.',
  E_XR_UNSUPPORTED:
    'Roomsong is played in a mixed-reality headset. Open this page in the browser of a Meta Quest 3 or 3S.',
  // The garden window (LLD §11): a browser with no mixed reality, or the `window` flag.
  window: 'The garden opens in this tab: a click or a tap is a pinch.',
  close: 'Close the garden',
  E_HANDS_UNAVAILABLE:
    'The garden did not open. Check that hand tracking is on in the headset: Settings, Movement tracking, Hand tracking.',
  deviceHeading: 'This device',
  features: {
    immersiveAr: {
      yes: 'Mixed reality: supported.',
      no: 'Mixed reality: not supported. Roomsong needs it.',
      unknown: 'Mixed reality: checking.',
    },
    // No `no`: a request that fails does not say why, so the page never claims that hand tracking is off.
    handTracking: {
      yes: 'Hand tracking: on.',
      unknown: 'Hand tracking: checked when you enter. Roomsong cannot start without it.',
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
    gazeDwell: 'No hands: look and hold',
    highContrast: 'High contrast',
    reducedMotion: 'Reduce motion',
  },
  helpHeading: 'Help',
  help: [
    'Sit at a table and put the controllers down. Roomsong is played with bare hands.',
    'Open a hand, palm up, and a seed comes to it.',
    'Pinch the seed, carry it over the glowing ring and let go. Where you plant it sets when it sounds and which note it sings.',
    'Hold your palms out, facing away from you, to sit back and listen. Pinch to come back.',
  ],
  privacy:
    'Your garden is saved in this browser, on this device only. What the headset shares about your room and your hands stays on the device: nothing is sent anywhere.',
} as const;

// The words of the settings panel (UX §3.6; T-151). The same character set, so no middle dot, no superscript and
// no multiplication sign: the panel writes "sq m" and joins with commas. The numbers are put in by ui/Panel.ts.
// "Look and hold", not "Gaze dwell": the reticle follows the head, not the eyes (UX §9.7).
export const PANEL = {
  tabs: { sound: 'Sound', access: 'Access', garden: 'Garden' },
  close: 'x',
  minus: '-',
  plus: '+',
  on: 'on',
  off: 'off',
  tempo: 'Tempo',
  bpm: 'BPM',
  volume: 'Volume',
  percent: '%',
  reverb: 'Reverb',
  reverbs: { auto: 'auto', small: 'small', off: 'off' },
  mono: 'Mono',
  tunedBy: 'Tuned by:',
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
  gazeDwell: 'Look and hold',
  holdTime: 'Hold time',
  highContrast: 'High contrast',
  reducedMotion: 'Reduce motion',
  beatRing: 'Beat ring',
  mainHand: 'Main hand',
  hands: { left: 'L', right: 'R' },
  day: 'Day',
  seeds: 'Seeds',
  key: 'Key',
  fromRoom: '(room)',
  bedHeight: 'Bed height',
  centimetres: 'cm',
  replaceBed: 'Re-place bed',
  start: 'start',
  newGarden: 'New garden',
  hold: 'hold',
} as const;
