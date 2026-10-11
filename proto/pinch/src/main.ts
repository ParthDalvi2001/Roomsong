/// <reference types="webxr" />
// T-105 pinch-accuracy test page (TC-DEV-00): the XR session, the hand joints, drawing, the feedback tones and
// the results. The logic is in trials.ts and in the app's own pinch detector and filter (src/hands/), all
// unit-tested; this file joins it to the browser.
// Hands only: an input source without hand joints (a controller) is ignored. Nothing is sent anywhere.
import {
  CircleGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

import { OneEuroFilter } from '../../../src/hands/OneEuroFilter.js';
import { PinchMachine } from '../../../src/hands/poses/pinch.js';

import {
  BED_CENTRE_AHEAD_M,
  BED_RINGS,
  BED_STEPS,
  COLOURS,
  FINISH_LEFT_M,
  FINISH_SCALE,
  FLOATING_BELOW_HEAD_M,
  FOV_HALF_HORIZONTAL_DEG,
  FOV_HALF_VERTICAL_DEG,
  HIT_RADIUS_M,
  HIT_TONE,
  HORIZONTAL_MIN_UP,
  MISS_TONE,
  ONE_EURO_BETA,
  ONE_EURO_BETA_MAX,
  ONE_EURO_D_CUTOFF_HZ,
  ONE_EURO_MIN_CUTOFF_HZ,
  PINCH_DEBOUNCE_FRAMES,
  PINCH_ENTER_M,
  PINCH_LOCKOUT_MS,
  PINCH_RELEASE_M,
  SURFACE_MAX_HEIGHT_M,
  SURFACE_MIN_HEIGHT_M,
  SURFACE_WAIT_MS,
  TARGET_DIAMETER_M,
  TONE_GAIN,
} from './config.js';
import { bedFov, plan, Run, summarize, type PinchSample } from './trials.js';

const TEXT = {
  noXr: 'This browser has no WebXR. Open this page in Meta Quest Browser.',
  starting: 'Starting. Allow hand tracking and spatial data if the headset asks.',
  running: 'The test is running in the headset.',
  failed: 'The session did not start:',
  copied: 'Copied.',
  copyFailed: 'Copy failed. Select the text below and copy it by hand.',
  noSurface: 'The session ended before the test began. No trials.',
  columns: [
    'Block',
    'Trials',
    'First try',
    'Rate',
    'First try unfiltered',
    'Median ms',
    'Max ms',
    'Mean miss cm',
    'Pinch-to-sound median ms',
    'Pinch-to-sound max ms',
  ],
  ended: { complete: 'all trials done', finish: 'finish target pinched', exit: 'session left early' },
} as const;

interface Surface {
  kind: 'table' | 'plane' | 'floating';
  /** The plane's semantic label; empty for the floating surface or an unlabelled plane. */
  label: string;
  heightM: number;
  headAboveM: number;
}

interface Hand {
  sample: PinchSample;
  tracked: boolean;
  machine: PinchMachine;
  u: OneEuroFilter;
  v: OneEuroFilter;
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const startButton = byId<HTMLButtonElement>('start');
const statusLine = byId('status');
const resultsSection = byId('results');
const jsonBlock = byId('json');
const round = (value: number, digits = 1) => Number(value.toFixed(digits));

// One draw call: every target of the block on show plus the finish target.
const dots = new InstancedMesh(
  new CircleGeometry(TARGET_DIAMETER_M / 2, 16).rotateX(-Math.PI / 2),
  new MeshBasicMaterial({ toneMapped: false }),
  BED_RINGS * BED_STEPS + 1,
);
dots.count = 0;
dots.frustumCulled = false; // the instances lie far outside the one disc the bounds are computed from
const scene = new Scene().add(dots);
const camera = new PerspectiveCamera();
const colour = {
  idle: new Color(COLOURS.idle),
  lit: new Color(COLOURS.lit),
  paused: new Color(COLOURS.paused),
  hit: new Color(COLOURS.hit),
  miss: new Color(COLOURS.miss),
  finish: new Color(COLOURS.finish),
};

// The bed frame, set once per session by findSurface: the centre on the surface and two unit vectors along it.
const centre = new Vector3();
const right = new Vector3();
const forward = new Vector3();
// Scratch for the frame loop.
const scratch = new Vector3();
const quaternion = new Quaternion();
const matrix = new Matrix4();

let renderer: WebGLRenderer | null = null;
let audio: AudioContext | null = null;
let run: Run | null = null;

/** A number in [0, max] from the URL, else the fallback. */
function urlNumber(name: string, max: number, fallback: number): number {
  const text = new URLSearchParams(location.search).get(name) ?? '';
  return /^\d+(\.\d+)?$/.test(text) && Number(text) <= max ? Number(text) : fallback;
}

/** World x and z of a point on the surface. */
const worldX = (u: number, v: number) => centre.x + right.x * u + forward.x * v;
const worldZ = (u: number, v: number) => centre.z + right.z * u + forward.z * v;

/** Whether (x, z) lies in a plane's polygon, both in the plane's own axes (even-odd rule). */
function inside(polygon: readonly DOMPointReadOnly[], x: number, z: number): boolean {
  let odd = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) odd = !odd;
  }
  return odd;
}

/**
 * Sets the bed frame from the head and picks the surface under the bed centre: a plane labelled table or desk,
 * else (once `giveUp`) another horizontal plane at table height, else floating. Null: no answer yet.
 */
function findSurface(frame: XRFrame, space: XRReferenceSpace, giveUp: boolean): Surface | null {
  const head = frame.getViewerPose(space)?.transform;
  if (!head) return null;
  quaternion.copy(head.orientation);
  forward.set(0, 0, -1).applyQuaternion(quaternion).setY(0);
  // Looking straight down, the view direction has no horizontal part: the top of the head points ahead.
  if (forward.lengthSq() < 0.1) forward.set(0, 1, 0).applyQuaternion(quaternion).setY(0);
  forward.normalize();
  right.set(-forward.z, 0, forward.x);
  centre.set(head.position.x, 0, head.position.z).addScaledVector(forward, BED_CENTRE_AHEAD_M);

  const on = (kind: Surface['kind'], label: string, heightM: number): Surface => {
    centre.y = heightM;
    return { kind, label, heightM: round(heightM, 3), headAboveM: round(head.position.y - heightM, 3) };
  };
  let plain: { label: string; heightM: number } | null = null;
  for (const plane of frame.detectedPlanes ?? []) {
    const pose = frame.getPose(plane.planeSpace, space)?.transform;
    if (!pose) continue;
    // Horizontal either way up (the emulator's table tops face down), from the pose, never from the label.
    quaternion.copy(pose.orientation);
    if (Math.abs(scratch.set(0, 1, 0).applyQuaternion(quaternion).y) < HORIZONTAL_MIN_UP) continue;
    // Within reach = the bed centre lies on it. The centre in the plane's own axes:
    scratch
      .set(centre.x - pose.position.x, 0, centre.z - pose.position.z)
      .applyQuaternion(quaternion.invert());
    if (!inside(plane.polygon, scratch.x, scratch.z)) continue;
    const label = plane.semanticLabel ?? '';
    const heightM = pose.position.y;
    if (label === 'table' || label === 'desk') return on('table', label, heightM);
    if (heightM >= SURFACE_MIN_HEIGHT_M && heightM <= SURFACE_MAX_HEIGHT_M) plain ??= { label, heightM };
  }
  if (!giveUp) return null;
  return plain
    ? on('plane', plain.label, plain.heightM)
    : on('floating', '', head.position.y - FLOATING_BELOW_HEAD_M);
}

/** One hand's thumb and index tips for this frame. Returns true on the frame a pinch begins. */
function readHand(
  hand: Hand,
  source: XRInputSource | null,
  frame: XRFrame,
  space: XRReferenceSpace,
  dtMs: number,
  nowMs: number,
): boolean {
  const thumbSpace = source?.hand?.get('thumb-tip');
  const indexSpace = source?.hand?.get('index-finger-tip');
  const thumb = thumbSpace && frame.getJointPose?.(thumbSpace, space)?.transform.position;
  const index = indexSpace && frame.getJointPose?.(indexSpace, space)?.transform.position;
  if (!thumb || !index) {
    if (hand.tracked) hand.machine.lost();
    hand.tracked = false;
    return false;
  }
  if (!hand.tracked) {
    // FR-HND-03: a hand that was lost starts from where it is now, not from where it was.
    hand.u.reset();
    hand.v.reset();
  }
  hand.tracked = true;
  // The pinch point is midway between the two tips; here in bed coordinates.
  const x = (thumb.x + index.x) / 2 - centre.x;
  const z = (thumb.z + index.z) / 2 - centre.z;
  const sample = hand.sample;
  sample.rawU = x * right.x + z * right.z;
  sample.rawV = x * forward.x + z * forward.z;
  sample.u = hand.u.filter(sample.rawU, dtMs / 1000);
  sample.v = hand.v.filter(sample.rawV, dtMs / 1000);
  sample.heightM = (thumb.y + index.y) / 2 - centre.y; // unfiltered: it is a reading of the plane, not judged
  const gapM = Math.hypot(thumb.x - index.x, thumb.y - index.y, thumb.z - index.z);
  return hand.machine.update(gapM, nowMs) === 'start';
}

function place(i: number, u: number, v: number, scale: number, tint: Color): void {
  dots.setMatrixAt(i, matrix.makeScale(scale, 1, scale).setPosition(worldX(u, v), centre.y, worldZ(u, v)));
  dots.setColorAt(i, tint);
}

/** Draws the block on show: called when the run's state changes, not every frame. */
function redraw(shown: Run): void {
  const block = shown.block;
  const state = shown.state;
  if (!block || state === 'done') return;
  const count = block.points.length;
  for (let i = 0; i < count; i++) {
    const point = block.points[i]!;
    place(i, point[0], point[1], 1, i === shown.target ? colour[state] : colour.idle);
  }
  place(count, -FINISH_LEFT_M, 0, FINISH_SCALE, colour.finish);
  dots.count = count + 1;
  dots.instanceMatrix.needsUpdate = true;
  dots.instanceColor!.needsUpdate = true;
}

/** Plays a short synthesized tone now and returns the audio-clock time it starts at. */
function playTone(context: AudioContext, tone: { hz: number; seconds: number }): number {
  const at = context.currentTime;
  const oscillator = new OscillatorNode(context, { frequency: tone.hz });
  const gain = new GainNode(context, { gain: TONE_GAIN });
  gain.gain.setValueAtTime(TONE_GAIN, at).exponentialRampToValueAtTime(0.001, at + tone.seconds);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(at);
  oscillator.stop(at + tone.seconds);
  return at;
}

function showResults(result: {
  ended: keyof typeof TEXT.ended;
  surface: Surface | null;
  fov: ReturnType<typeof bedFov> | null;
  summary: ReturnType<typeof summarize>;
  trials: unknown[];
}): void {
  const table = byId<HTMLTableElement>('summary');
  table.replaceChildren();
  const addRow = (cells: readonly (string | number)[], tag: 'th' | 'td') => {
    const row = table.insertRow();
    for (const cell of cells) {
      const element = row.appendChild(document.createElement(tag));
      element.textContent = String(cell);
      if (tag === 'th') element.scope = 'col';
    }
  };
  addRow(TEXT.columns, 'th');
  for (const row of result.summary) {
    addRow(
      [
        row.group,
        row.trials,
        row.firstTry,
        `${round(row.rate * 100)}%`,
        row.rawFirstTry,
        row.medianMs,
        row.maxMs,
        row.meanMissM === null ? '-' : round(row.meanMissM * 100),
        row.soundMedianMs ?? 'n/a',
        row.soundMaxMs ?? 'n/a',
      ],
      'td',
    );
  }
  const { surface, fov } = result;
  byId('notes').textContent =
    surface && fov
      ? `${result.trials.length} trials; ${TEXT.ended[result.ended]}. ` +
        `Surface: ${surface.kind}${surface.label && ` (${surface.label})`} at ${surface.heightM} m, ` +
        `${surface.headAboveM} m below the head. Bed outer edge from the head at the start, looking at the ` +
        `centre: ${fov.horizontalDeg} degrees to each side, ${fov.upDeg} up, ${fov.downDeg} down; guideline ` +
        `${FOV_HALF_HORIZONTAL_DEG} by ${FOV_HALF_VERTICAL_DEG}: ${fov.fits ? 'fits' : 'does not fit'}.`
      : TEXT.noSurface;
  jsonBlock.textContent = JSON.stringify(result, null, 2);
  resultsSection.hidden = false;
  statusLine.textContent = '';
  startButton.disabled = false;
}

function runSession(session: XRSession, renderer: WebGLRenderer, context: AudioContext): void {
  const space = renderer.xr.getReferenceSpace();
  if (!space) throw new Error('no reference space');
  // ?seed= repeats the target order; ?beta= is the 1-euro beta to try on device (LLD 5.7).
  const seed = urlNumber('seed', 0xffffffff, Math.random() * 2 ** 32) >>> 0;
  const beta = urlNumber('beta', ONE_EURO_BETA_MAX, ONE_EURO_BETA);
  const makeHand = (name: 'left' | 'right'): Hand => ({
    sample: { hand: name, u: 0, v: 0, rawU: 0, rawV: 0, heightM: 0 },
    tracked: false,
    machine: new PinchMachine(),
    u: new OneEuroFilter(ONE_EURO_MIN_CUTOFF_HZ, beta, ONE_EURO_D_CUTOFF_HZ),
    v: new OneEuroFilter(ONE_EURO_MIN_CUTOFF_HZ, beta, ONE_EURO_D_CUTOFF_HZ),
  });
  const leftHand = makeHand('left');
  const rightHand = makeHand('right');
  const startedAt = performance.now();
  let last = startedAt;
  let surface: Surface | null = null;
  let ended: 'complete' | 'finish' | null = null;
  let live: Run | null = null;
  run = null;
  dots.count = 0;

  const end = (why: 'complete' | 'finish') => {
    ended = why;
    void session.end();
  };

  /** A pinch began at `sample`: the finish target, or the trial's one judged pinch with its tone. */
  const onPinch = (trials: Run, sample: PinchSample, nowMs: number): boolean => {
    // Not while idle (before the first target): the pinch that pressed Start may still be closing.
    if (trials.state !== 'idle' && Math.hypot(sample.u + FINISH_LEFT_M, sample.v) <= HIT_RADIUS_M) {
      end('finish');
      return false;
    }
    const trial = trials.pinch(sample);
    if (!trial) return false;
    const at = playTone(context, trial.hit ? HIT_TONE : MISS_TONE);
    // Pinch-to-sound: when the tick leaves the speaker, on the page's clock, minus the pinch frame's time.
    const out = context.getOutputTimestamp();
    if (out.performanceTime && out.contextTime !== undefined) {
      trial.soundMs = round(out.performanceTime + (at - out.contextTime) * 1000 - nowMs);
    }
    return true;
  };

  session.addEventListener('end', () => {
    renderer.setAnimationLoop(null);
    const result = {
      test: 'T-105 pinch accuracy (TC-DEV-00)',
      ended: ended ?? ('exit' as const),
      seed,
      beta,
      config: {
        pinchEnterM: PINCH_ENTER_M,
        pinchReleaseM: PINCH_RELEASE_M,
        debounceFrames: PINCH_DEBOUNCE_FRAMES,
        lockoutMs: PINCH_LOCKOUT_MS,
        hitRadiusM: HIT_RADIUS_M,
      },
      surface,
      fov: surface && bedFov(BED_CENTRE_AHEAD_M, surface.headAboveM),
      audio: {
        sampleRate: context.sampleRate,
        baseLatencyMs: round(context.baseLatency * 1000),
        outputLatencyMs: round(context.outputLatency * 1000),
      },
      userAgent: navigator.userAgent,
      summary: summarize(live?.trials ?? []),
      trials: live?.trials ?? [],
    };
    showResults(result); // the page reads some of it; the JSON block carries all of it
  });

  renderer.setAnimationLoop((_time, frame) => {
    if (!frame || ended) return;
    const nowMs = performance.now(); // one clock for trials, lockout and pinch-to-sound
    const dtMs = nowMs - last;
    last = nowMs;
    if (!live) {
      surface = findSurface(frame, space, nowMs - startedAt >= SURFACE_WAIT_MS);
      if (!surface) return;
      live = run = new Run(plan(seed));
      redraw(live);
    }

    let leftSource: XRInputSource | null = null;
    let rightSource: XRInputSource | null = null;
    const sources = session.inputSources;
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i]!;
      if (!source.hand) continue; // hands only
      if (source.handedness === 'left') leftSource = source;
      else if (source.handedness === 'right') rightSource = source;
    }
    const leftPinched = readHand(leftHand, leftSource, frame, space, dtMs, nowMs);
    const rightPinched = readHand(rightHand, rightSource, frame, space, dtMs, nowMs);

    let changed = live.frame(dtMs, leftHand.tracked || rightHand.tracked);
    if (leftPinched) changed = onPinch(live, leftHand.sample, nowMs) || changed;
    if (rightPinched) changed = onPinch(live, rightHand.sample, nowMs) || changed;
    if (live.state === 'done') end('complete');
    else if (changed) redraw(live);
    renderer.render(scene, camera);
  });
  statusLine.textContent = TEXT.running;
}

async function start(): Promise<void> {
  startButton.disabled = true;
  resultsSection.hidden = true;
  statusLine.textContent = TEXT.starting;
  let session: XRSession | undefined;
  try {
    audio ??= new AudioContext({ latencyHint: 'interactive' }); // inside the click (NFR-PERF-10)
    void audio.resume();
    if (!navigator.xr) throw new Error(TEXT.noXr);
    session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor', 'hand-tracking'],
      optionalFeatures: ['plane-detection'],
    });
    if (!renderer) {
      renderer = new WebGLRenderer({ alpha: true, antialias: true });
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType('local-floor');
    }
    await renderer.xr.setSession(session);
    runSession(session, renderer, audio);
  } catch (error) {
    void session?.end().catch(() => undefined); // never leave the user in a session that draws nothing
    statusLine.textContent = `${TEXT.failed} ${error instanceof Error ? error.message : String(error)}`;
    startButton.disabled = false;
  }
}

startButton.addEventListener('click', () => void start());
byId('copy').addEventListener('click', () => {
  void (async () => {
    try {
      await navigator.clipboard.writeText(jsonBlock.textContent ?? '');
      statusLine.textContent = TEXT.copied;
    } catch {
      statusLine.textContent = TEXT.copyFailed;
    }
  })();
});

// Read-only handle for tests/e2e/03-pinch.spec.ts: world positions of the lit and the finish target, and the trials.
const worldPoint = (u: number, v: number) => [worldX(u, v), centre.y, worldZ(u, v)];
Object.defineProperty(window, '__pinchTest', {
  value: Object.freeze({
    lit: () => {
      const point = run?.state === 'lit' ? run.block?.points[run.target ?? -1] : undefined;
      return point ? worldPoint(point[0], point[1]) : null;
    },
    finish: () => (run ? worldPoint(-FINISH_LEFT_M, 0) : null),
    trials: () => run?.trials ?? [],
  }),
});
