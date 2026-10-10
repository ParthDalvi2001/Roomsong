// Named constants of the device capability spike page (T-104, TC-DEV-0A).

/** All requested as optional: the session then starts whatever is declined, and reports what it granted. */
export const FEATURES = [
  'hand-tracking',
  'plane-detection',
  'mesh-detection',
  'hit-test',
  'anchors',
  'layers',
  'local-floor',
  'bounded-floor',
];

/** localStorage: the persistent-anchor handle of the last visit, and every run's results. Never sent anywhere. */
export const ANCHOR_KEY = 'roomsong.spike.anchor';
export const RUNS_KEY = 'roomsong.spike.runs';

/** A browser promise or an XR frame that has not come after this long counts as failed, with that as its reason. */
export const STEP_TIMEOUT_MS = 3000;
/** The session request waits for a person answering the headset's prompts, so it gets longer. */
export const SESSION_REQUEST_TIMEOUT_MS = 60_000;
/** One timer ends the session this long after it started, whatever the probe is doing. */
export const RUN_LIMIT_MS = 45_000;

/** Frame rate: the session's first second (its start-up) is left out, then the bare loop is counted this long. */
export const SETTLE_MS = 1000;
export const FPS_WINDOW_MS = 5000;

/** Hit-test: results exist from the frame after the request; the ray gets this long to hit something. */
export const HIT_WAIT_MS = 1000;
/** From the head, 60 degrees below straight ahead: a seated user's table top, about half a metre away. */
export const HIT_RAY = { x: 0, y: -0.86, z: -0.5 };

/** The test anchor is created this far in front of the head. */
export const ANCHOR_AHEAD_M = 0.5;
/** An anchor can take a few frames to show in trackedAnchors: it is looked for on this many frames. */
export const TRACKED_FRAMES = 10;

/** Pinch: the window for one pinch, and how long it stays open after the release to catch a late `select`. */
export const PINCH_WINDOW_MS = 8000;
export const AFTER_RELEASE_MS = 500;
/** The whole view turns faintly green while the probe waits for the pinch. */
export const PINCH_TINT = 0.25;
/** The click a pinch plays. */
export const CLICK_HZ = 1000;
export const CLICK_S = 0.04;
export const CLICK_GAIN = 0.5;

/** Polyphony sweep: voices per step and the length of a step. */
export const VOICE_STEPS = [8, 16, 24, 32, 48, 64];
export const VOICE_STEP_MS = 2000;
export const VOICE = 'sawtooth oscillator > lowpass filter > equal-power panner';
/** Voices sit on a pentatonic scale over four octaves from this pitch, each lowpassed at the cutoff. */
export const VOICE_BASE_HZ = 110;
export const VOICE_CUTOFF_HZ = 1200;
export const PENTATONIC = [0, 2, 4, 7, 9];
/** Each voice plays at this divided by the number of voices, so the sum cannot clip: crackle is underrun. */
export const VOICES_PEAK = 0.8;
