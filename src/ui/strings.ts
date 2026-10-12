// The copy of the 2D page (UX §3.1; API_SPEC §1.9). English only (Golden Rule 8). Captions are not here: core's
// STRINGS is the caption table, six words at most, and a page sentence does not belong in it. Same character set as
// STRINGS. A failure message that has an error code (API_SPEC §5) has it as its key.
// Every sentence states what the app does: re-read them when the room and save wiring lands (T-128) and at release.
export const LANDING = {
  title: 'Roomsong',
  tagline: 'Grow a song on your table.',
  enter: 'Enter the garden',
  loading: 'Getting the garden ready.',
  loadFailed: 'The garden could not load. Reload the page.',
  E_XR_UNSUPPORTED: 'Roomsong needs immersive AR. Open this page in the browser of a Meta Quest 3 or 3S.',
  E_HANDS_UNAVAILABLE:
    'The garden did not open. Check that hand tracking is on in the headset: Settings, Movement tracking, Hand tracking.',
  deviceHeading: 'This device',
  features: {
    immersiveAr: {
      yes: 'Immersive AR: supported.',
      no: 'Immersive AR: not supported. Roomsong needs it.',
      unknown: 'Immersive AR: checking.',
    },
    // No `no`: a request that fails does not say why, so the page never claims that hand tracking is off.
    handTracking: {
      yes: 'Hand tracking: on.',
      unknown: 'Hand tracking: checked when you enter. Roomsong cannot start without it.',
    },
    // "not available", not "not supported", for these two: a session may simply not have been granted the feature.
    planeDetection: {
      yes: 'Plane detection: on. The garden looks for your table.',
      no: 'Plane detection: not available. You place the garden yourself and the room does not tune the song.',
      unknown: 'Plane detection: checked when you enter. Without it you place the garden yourself.',
    },
    anchors: {
      yes: 'Anchors: on. The garden can come back to the same place.',
      no: 'Anchors: not available. The garden is placed again on each visit.',
      unknown: 'Anchors: checked when you enter. Without them the garden is placed again on each visit.',
    },
  },
  accessHeading: 'Access',
  access: {
    oneHand: 'One hand',
    gazeDwell: 'Eyes only (gaze)',
    highContrast: 'High contrast',
    reducedMotion: 'Reduce motion',
  },
  helpHeading: 'Help',
  help: [
    'Sit at a table and put the controllers down. Roomsong is played with bare hands.',
    'Open a hand, palm up, and a seed comes to it.',
    'Pinch the seed, carry it over the glowing ring and let go. Where you plant sets when it plays and how high.',
    'Hold both palms out to stop and listen. Pinch to come back.',
  ],
  privacy: 'Your garden is saved on this device only. Nothing is sent anywhere.',
} as const;
