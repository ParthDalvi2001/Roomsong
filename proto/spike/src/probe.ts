/// <reference types="webxr" />
// T-104 device capability spike (TC-DEV-0A): what this browser's WebXR and Web Audio really give, as one results
// object. One tap starts it and it ends the session by itself. A value the browser does not give is null and
// `reasons` says why under the field's path: nothing is guessed, and nothing is sent anywhere.
// Nothing can hold the page: every browser promise and every wait for a frame is raced against a timer, one timer
// ends the session whatever happens, and the results so far are handed to the page after every step.
import {
  AFTER_RELEASE_MS,
  ANCHOR_AHEAD_M,
  ANCHOR_KEY,
  CLICK_GAIN,
  CLICK_HZ,
  CLICK_S,
  FEATURES,
  FPS_WINDOW_MS,
  HIT_RAY,
  HIT_WAIT_MS,
  PENTATONIC,
  PINCH_TINT,
  PINCH_WINDOW_MS,
  RUN_LIMIT_MS,
  SESSION_REQUEST_TIMEOUT_MS,
  SETTLE_MS,
  STEP_TIMEOUT_MS,
  TRACKED_FRAMES,
  VOICE,
  VOICE_BASE_HZ,
  VOICE_CUTOFF_HZ,
  VOICE_STEP_MS,
  VOICE_STEPS,
  VOICES_PEAK,
} from './config';

/** How a frame answers for a set: 'missing' (undefined), 'empty', 'populated', 'throws <error>' or 'not read'. */
type SetState = string;
type PlaneSample = {
  label: string;
  orientation: string | null;
  plusY: number[] | null;
  position: number[] | null;
  size: number[];
};

export interface Results {
  page: 'roomsong-capability-spike';
  startedAt: string;
  durationMs: number;
  /** False while the run is going, and when there was no session or it ended before the probe did. */
  completed: boolean;
  /** Name and version of the WebXR emulator when the page runs in one; null in a browser without one. */
  emulator: string | null;
  basics: { userAgent: string; xr: boolean; immersiveAr: boolean | null; immersiveVr: boolean | null };
  features: {
    requested: string[];
    granted: string[] | null;
    /** 'ok' or the error of requestReferenceSpace. */
    referenceSpaces: Record<string, string>;
    /** The reference space every position below is given in. */
    posesIn: string | null;
    environmentBlendMode: string;
    webGLBinding: boolean;
  } | null;
  frameRate: {
    supported: number[] | null;
    current: number | null;
    updateTargetFrameRate: boolean;
    fixedFoveation: number | null;
    /** True when a written value that differs from the current one reads back changed. */
    fixedFoveationSettable: boolean | null;
    /** The bare loop (one clear per frame) over 5 s. */
    measuredFps: number | null;
    longestFrameMs: number;
  } | null;
  planes: {
    /** About 7 s into the session, and at its end. */
    count: number | null;
    countAtEnd: number | null;
    /** From the read that saw more planes: the labels, and one plane of each label with its +Y axis and centre. */
    labels: string[];
    desk: boolean;
    samples: PlaneSample[];
  } | null;
  meshes: { count: number | null; countAtEnd: number | null; labels: string[] } | null;
  /** What the session reports when a feature was declined: compare the allow run with the decline run. */
  permission: {
    granted: string[] | null;
    notGranted: string[] | null;
    detectedPlanes: SetState;
    detectedPlanesAtEnd: SetState;
    detectedMeshes: SetState;
    detectedMeshesAtEnd: SetState;
  } | null;
  hitTest: { ray: string; hits: number; height: number | null } | null;
  anchors: {
    created: boolean;
    tracked: boolean | null;
    persistentHandle: boolean;
    /** The handle of the visit before this one: did it survive the reload or restart? */
    restore: { storedAt: string; restored: boolean; tracked: boolean | null; error: string | null } | null;
  } | null;
  hands: {
    sources: {
      handedness: string;
      targetRayMode: string;
      profiles: string[];
      gamepad: boolean;
      joints: number | null;
      jointsWithPose: number | null;
    }[];
    /** In arrival order; atMs counts from the start of the pinch window. */
    pinchEvents: { type: string; handedness: string; atMs: number }[] | null;
  } | null;
  audio: {
    sampleRate: number;
    /** The context's state when the run ended: anything but 'running' means no sound was played. */
    state: string;
    baseLatency: number | null;
    outputLatency: number | null;
    /**
     * Software path only, measured with getOutputTimestamp: input event to handler, then handler to the click
     * leaving the audio device. Null when the browser gives no output time: it is never inferred.
     */
    pinchToSound: { eventToHandlerMs: number; handlerToOutputMs: number; totalMs: number } | null;
    voice: string;
    /** Audio clock progress against wall time per step; the underrun figures are the browser's own count. */
    polyphony:
      | {
          voices: number;
          wallMs: number;
          audioMs: number;
          underrunMs: number | null;
          underrunEvents: number | null;
        }[]
      | null;
  };
  /** Filled in by the person on the results page. */
  human: { run: string | null; crackleFromVoices: number | null; spacePermission: string | null };
  reasons: Record<string, string>;
}

/**
 * AudioContext.playbackStats (Web Audio API, AudioPlaybackStats): not in TypeScript's DOM types. Present in
 * Chromium 156 (checked 2026-10-10); a browser may refresh it only about once a second, so an underrun can be
 * counted one step late.
 */
interface PlaybackStats {
  underrunDuration: number;
  underrunEvents: number;
}

const NO_FRAME = `no XR frame for ${STEP_TIMEOUT_MS / 1000} s`;
const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));
const round = (value: number, digits = 3) => Number(value.toFixed(digits));
// The probe's own errors read as their message; a browser's keep their name ("NotSupportedError: ...").
const text = (reason: unknown) =>
  reason instanceof Error && reason.name === 'Error' ? reason.message : String(reason);

let reasons: Record<string, string> = {};
const missing = (path: string, reason: unknown): null => {
  reasons[path] = text(reason);
  return null;
};
/** The value, or null with the reason noted when the browser throws or gives nothing. */
async function attempt<T>(path: string, read: () => T | Promise<T>) {
  try {
    return (await read()) ?? missing(path, 'undefined in this browser');
  } catch (error) {
    return missing(path, error);
  }
}
/** A browser promise raced against a timer: one that never settles fails with "timed out" as its reason. */
function within<T>(promise: PromiseLike<T> | undefined, what: string, ms = STEP_TIMEOUT_MS) {
  if (!promise) return Promise.reject(new Error(`${what} is undefined in this browser`));
  const late = sleep(ms).then(() => {
    throw new Error(`${what} timed out after ${ms / 1000} s`);
  });
  return Promise.race([promise, late]);
}
function must<T>(value: T | null | undefined, why: string): T {
  if (value == null) throw new Error(why);
  return value;
}

function readSet<T>(get: () => ReadonlySet<T> | undefined): { state: SetState; items: T[] } {
  try {
    const set = get();
    const state = set === undefined ? 'missing' : set.size === 0 ? 'empty' : 'populated';
    return { state, items: [...(set ?? [])] };
  } catch (error) {
    return { state: `throws ${String(error)}`, items: [] };
  }
}

interface SceneSet {
  state: SetState;
  /** Null when the frame did not give the set. */
  count: number | null;
  labels: string[];
  samples: PlaneSample[];
}
type Scene = Record<'planes' | 'meshes', SceneSet>;
const NOT_READ: SceneSet = { state: 'not read', count: null, labels: [], samples: [] };

/** One frame's planes and meshes: how each set answers, how many, which labels, and one plane of each label. */
function readScene(frame: XRFrame, world: XRReferenceSpace | null): Scene {
  const planes = readSet(() => frame.detectedPlanes);
  const meshes = readSet(() => frame.detectedMeshes);
  const count = (set: { state: SetState; items: unknown[] }) =>
    set.state === 'empty' || set.state === 'populated' ? set.items.length : null;
  const byLabel = new Map(planes.items.map((plane) => [plane.semanticLabel ?? 'none', plane]));
  const samples = [...byLabel].map(([label, plane]) => {
    const matrix = world && frame.getPose(plane.planeSpace, world)?.transform.matrix;
    const column = (c: number) => (matrix ? [0, 1, 2].map((row) => round(matrix[c * 4 + row] ?? NaN)) : null);
    const span = (axis: 'x' | 'z') => {
      const values = plane.polygon.map((point) => point[axis]);
      return round(Math.max(...values) - Math.min(...values));
    };
    return {
      label,
      orientation: plane.orientation ?? null,
      plusY: column(1),
      position: column(3),
      size: [span('x'), span('z')],
    };
  });
  const meshLabels = new Set(meshes.items.map((mesh) => mesh.semanticLabel ?? 'none'));
  return {
    planes: { state: planes.state, count: count(planes), labels: [...byLabel.keys()].sort(), samples },
    meshes: { state: meshes.state, count: count(meshes), labels: [...meshLabels].sort(), samples: [] },
  };
}

/** The room fields from the read about 7 s in and, once it exists, the read at the end of the session. */
function setScene(results: Results, first: Scene | null, last: Scene | null) {
  for (const path of Object.keys(reasons)) if (/^(planes|meshes)/.test(path)) delete reasons[path];
  const pick = (key: 'planes' | 'meshes') => {
    const [early, end] = [first?.[key] ?? NOT_READ, last?.[key] ?? NOT_READ];
    const best = (end.count ?? -1) > (early.count ?? -1) ? end : early;
    if (best.count === null) {
      const set = key === 'planes' ? 'detectedPlanes' : 'detectedMeshes';
      missing(key, `frame.${set}: ${early.state}; at the end: ${end.state}`);
      return { early, end, best: null };
    }
    const counts = {
      count: early.count ?? missing(`${key}.count`, `the set was ${early.state}`),
      countAtEnd: end.count ?? missing(`${key}.countAtEnd`, `the set was ${end.state}`),
    };
    return { early, end, best: { ...counts, labels: best.labels, samples: best.samples } };
  };
  const [planes, meshes] = [pick('planes'), pick('meshes')];
  const granted = results.features?.granted ?? null;
  results.planes = planes.best && { ...planes.best, desk: planes.best.labels.includes('desk') };
  results.meshes = meshes.best && {
    count: meshes.best.count,
    countAtEnd: meshes.best.countAtEnd,
    labels: meshes.best.labels,
  };
  results.permission = {
    granted,
    notGranted: granted && FEATURES.filter((feature) => !granted.includes(feature)),
    detectedPlanes: planes.early.state,
    detectedPlanesAtEnd: planes.end.state,
    detectedMeshes: meshes.early.state,
    detectedMeshesAtEnd: meshes.end.state,
  };
}

/** The bare loop: clear to transparent every frame, count the frames, hand each frame to whoever waits for one. */
function startLoop(session: XRSession) {
  const loop = {
    layer: null as XRWebGLLayer | null,
    frames: 0,
    time: 0,
    longestMs: 0,
    tint: 0,
    /** Why the session is over for the probe (it ended, or the run limit): every later step is skipped. */
    stopped: '',
    /** Why there are no frames at all (no WebGL layer): frame reads fail, the sound sweep still runs. */
    blind: '',
  };
  const readers: ((frame: XRFrame | null) => void)[] = [];
  let release: () => void = () => undefined;
  const over = new Promise<void>((resolve) => {
    release = resolve;
  });
  const stop = (why: string) => {
    if (loop.stopped) return;
    loop.stopped = why;
    for (const reader of readers.splice(0)) reader(null);
    release();
  };
  session.addEventListener('end', () => stop('the session ended before the probe did'));

  try {
    const gl = document.createElement('canvas').getContext('webgl2', { xrCompatible: true, alpha: true });
    if (!gl) throw new Error('no WebGL2 context');
    const layer = (loop.layer = new XRWebGLLayer(session, gl));
    void session.updateRenderState({ baseLayer: layer });
    const tick = (time: number, frame: XRFrame) => {
      session.requestAnimationFrame(tick);
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
      gl.clearColor(0, loop.tint, 0, loop.tint);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (loop.frames > 0) loop.longestMs = Math.max(loop.longestMs, time - loop.time);
      loop.frames += 1;
      loop.time = time;
      for (const reader of readers.splice(0)) reader(frame);
    };
    session.requestAnimationFrame(tick);
  } catch (error) {
    loop.blind = `no XR frames: ${text(error)}`;
    missing('frames', loop.blind);
  }

  /** An XRFrame is only valid inside its callback, so every reading goes through here. */
  const onFrame = <T>(read: (frame: XRFrame) => T) =>
    new Promise<T>((resolve, reject) => {
      const reader = (frame: XRFrame | null) => {
        clearTimeout(timer);
        try {
          if (!frame) throw new Error(loop.stopped || loop.blind || NO_FRAME);
          resolve(read(frame));
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };
      // A frame loop that stalls (headset taken off, system menu) must not hold the step either.
      const timer = setTimeout(() => {
        readers.splice(readers.indexOf(reader), 1);
        reader(null);
      }, STEP_TIMEOUT_MS);
      if (loop.stopped || loop.blind) reader(null);
      else readers.push(reader);
    });
  const alive = () => {
    if (loop.stopped) throw new Error(loop.stopped);
  };
  /** A pause that ends at once when the session is over. */
  const wait = async (ms: number) => {
    await Promise.race([sleep(ms), over]);
    alive();
  };
  return { loop, onFrame, alive, wait, stop };
}

/** A short synthesized click at the earliest time the context can play it, and when that leaves the device. */
function click(audio: AudioContext, eventTime: number, now: number) {
  // A context that is not running plays nothing, so there is nothing to time.
  if (audio.state !== 'running') throw new Error(`the audio context is ${audio.state}: no click played`);
  const at = audio.currentTime;
  const oscillator = new OscillatorNode(audio, { frequency: CLICK_HZ });
  const gain = new GainNode(audio, { gain: CLICK_GAIN });
  gain.gain.setValueAtTime(CLICK_GAIN, at).exponentialRampToValueAtTime(0.001, at + CLICK_S);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(at);
  oscillator.stop(at + CLICK_S);
  // getOutputTimestamp pairs a context time with the performance.now() time at which the device plays it.
  const { contextTime = 0, performanceTime = 0 } = audio.getOutputTimestamp?.() ?? {};
  if (!(performanceTime > 0)) throw new Error('audio.getOutputTimestamp gives no output time: not measured');
  const handlerToOutputMs = performanceTime + (at - contextTime) * 1000 - now;
  return {
    eventToHandlerMs: round(now - eventTime, 1),
    handlerToOutputMs: round(handlerToOutputMs, 1),
    totalMs: round(now - eventTime + handlerToOutputMs, 1),
  };
}

/** Steps of simple voices. Each voice is at VOICES_PEAK / voices, so the sum cannot clip: crackle is underrun. */
async function sweep(
  audio: AudioContext,
  wait: (ms: number) => Promise<void>,
  say: (status: string) => void,
) {
  const stats = (audio as AudioContext & { playbackStats?: PlaybackStats }).playbackStats;
  if (!stats) {
    for (const field of ['underrunMs', 'underrunEvents']) {
      missing(`audio.polyphony.${field}`, 'AudioContext.playbackStats is undefined'); // in every step
    }
  }
  const steps: NonNullable<Results['audio']['polyphony']> = [];
  for (const voices of VOICE_STEPS) {
    say(`Sound: ${voices} voices. Remember the step at which it starts to crackle.`);
    const bus = new GainNode(audio, { gain: VOICES_PEAK / voices });
    bus.connect(audio.destination);
    const oscillators = Array.from({ length: voices }, (_, i) => {
      const semitones = 12 * (Math.floor(i / PENTATONIC.length) % 4) + PENTATONIC[i % PENTATONIC.length]!;
      const oscillator = new OscillatorNode(audio, {
        type: 'sawtooth',
        frequency: VOICE_BASE_HZ * 2 ** (semitones / 12),
      });
      const filter = new BiquadFilterNode(audio, { type: 'lowpass', frequency: VOICE_CUTOFF_HZ });
      const panner = new PannerNode(audio, {
        panningModel: 'equalpower',
        positionX: Math.sin(i),
        positionZ: Math.cos(i),
      });
      oscillator.connect(filter).connect(panner).connect(bus);
      oscillator.start();
      return oscillator;
    });
    const [wall, clock] = [performance.now(), audio.currentTime];
    const [underrun, events] = [stats?.underrunDuration ?? 0, stats?.underrunEvents ?? 0];
    try {
      await wait(VOICE_STEP_MS);
      steps.push({
        voices,
        wallMs: round(performance.now() - wall, 1),
        audioMs: round((audio.currentTime - clock) * 1000, 1),
        underrunMs: stats ? round((stats.underrunDuration - underrun) * 1000, 1) : null,
        underrunEvents: stats ? stats.underrunEvents - events : null,
      });
    } finally {
      oscillators.forEach((oscillator) => oscillator.stop());
      bus.disconnect();
    }
  }
  return steps;
}

async function probeSession(
  session: XRSession,
  audio: AudioContext,
  results: Results,
  say: (status: string) => void,
  progress: () => void,
) {
  const { loop, onFrame, alive, wait, stop } = startLoop(session);
  // The one timer that ends the session whatever the probe is doing.
  const limit = setTimeout(() => {
    stop(`the probe hit its ${RUN_LIMIT_MS / 1000} s limit`);
    void session.end().catch(() => undefined);
  }, RUN_LIMIT_MS);
  /**
   * One step. The results so far are saved first, so a step that stalls costs nothing measured before it. The step
   * is skipped once the session is over, and is null with its reason when it fails.
   */
  const section = async <T>(path: string, run: () => T | Promise<T>) => {
    progress();
    return loop.stopped ? missing(path, loop.stopped) : attempt(path, run);
  };

  try {
    // 2. Features: what was granted first, so that it is known whatever fails later; then the reference spaces.
    const granted = await attempt(
      'features.granted',
      () => session.enabledFeatures && [...session.enabledFeatures].sort(),
    );
    const features: NonNullable<Results['features']> = {
      requested: FEATURES,
      granted,
      referenceSpaces: {},
      posesIn: null,
      environmentBlendMode: session.environmentBlendMode,
      webGLBinding: typeof XRWebGLBinding !== 'undefined',
    };
    results.features = features;
    const spaces: { viewer: XRReferenceSpace | null; world: XRReferenceSpace | null } = {
      viewer: null,
      world: null,
    };
    for (const type of ['viewer', 'local', 'local-floor', 'bounded-floor'] as const) {
      try {
        const space = await within(session.requestReferenceSpace(type), `requestReferenceSpace('${type}')`);
        features.referenceSpaces[type] = 'ok';
        if (type === 'viewer') spaces.viewer = space;
        else if (type !== 'bounded-floor') [spaces.world, features.posesIn] = [space, type];
      } catch (error) {
        features.referenceSpaces[type] = text(error);
      }
    }
    const { viewer, world } = spaces;
    const NO_WORLD = 'no local or local-floor reference space';
    if (!world) missing('features.posesIn', `${NO_WORLD}: positions are null`);

    // 7. Frame rate: what the session offers, then 5 s of the bare loop.
    say('Measuring the frame rate (5 seconds).');
    results.frameRate = await section('frameRate', async () => {
      const layer = must(loop.layer, loop.blind);
      const foveation = layer.fixedFoveation ?? missing('frameRate.fixedFoveation', 'undefined on the layer');
      // Write a value that differs from the current one: a layer that ignores writes reads back unchanged.
      const writes = (initial: number) => {
        layer.fixedFoveation = initial < 0.5 ? 1 : 0;
        const changed = layer.fixedFoveation !== initial;
        layer.fixedFoveation = initial;
        return changed;
      };
      const fixedFoveationSettable =
        foveation === null
          ? missing('frameRate.fixedFoveationSettable', 'no fixedFoveation on the layer')
          : writes(foveation);
      await wait(SETTLE_MS);
      await onFrame(() => undefined);
      const [firstFrame, firstTime] = [loop.frames, loop.time];
      loop.longestMs = 0;
      await wait(FPS_WINDOW_MS);
      const counted = loop.frames - firstFrame;
      return {
        supported: await attempt(
          'frameRate.supported',
          () => session.supportedFrameRates && [...session.supportedFrameRates],
        ),
        current: await attempt('frameRate.current', () => session.frameRate),
        updateTargetFrameRate: typeof session.updateTargetFrameRate === 'function',
        fixedFoveation: foveation,
        fixedFoveationSettable,
        measuredFps:
          counted > 0
            ? round((counted / (loop.time - firstTime)) * 1000, 1)
            : missing('frameRate.measuredFps', 'no frame in 5 s'),
        longestFrameMs: round(loop.longestMs, 1),
      };
    });

    // 4 and 8. Planes, meshes, and how the frame answers for each set (the permission-decline evidence). Read
    // here and again at the end of the session: a room that arrives late must not read as an empty one.
    say('Reading the room.');
    const scene = { first: null as Scene | null };
    await section('planes', async () => {
      scene.first = await onFrame((frame) => readScene(frame, world));
      setScene(results, scene.first, null);
      return true;
    });
    if (!scene.first) for (const path of ['meshes', 'permission']) missing(path, reasons.planes);

    // 5. Hit-test: a ray from the head, 60 degrees below straight ahead (a seated user's table).
    results.hitTest = await section('hitTest', async () => {
      const [from, to] = [must(viewer, 'no viewer reference space'), must(world, NO_WORLD)];
      const source = await within(
        session.requestHitTestSource?.({ space: from, offsetRay: new XRRay({ x: 0, y: 0, z: 0 }, HIT_RAY) }),
        'session.requestHitTestSource',
      );
      const until = performance.now() + HIT_WAIT_MS; // results exist from the frame after the request
      let hit = { hits: 0, height: null as number | null };
      while (hit.hits === 0 && performance.now() < until) {
        hit = await onFrame((frame) => {
          const found = frame.getHitTestResults(source);
          return { hits: found.length, height: found[0]?.getPose(to)?.transform.position.y ?? null };
        });
      }
      source.cancel();
      return {
        ray: 'from the head, 60 degrees below straight ahead',
        hits: hit.hits,
        height:
          hit.height === null ? missing('hitTest.height', 'the ray hit nothing in 1 s') : round(hit.height),
      };
    });

    // 6. Anchors: restore the handle of the visit before this one, then create and store a new one.
    results.anchors = await section('anchors', async () => {
      /** An anchor can take a few frames to show in trackedAnchors. */
      const tracked = async (anchor: XRAnchor) => {
        for (let frames = 0; frames < TRACKED_FRAMES; frames += 1) {
          const has = await onFrame((frame) => frame.trackedAnchors?.has(anchor));
          if (has === undefined) throw new Error('frame.trackedAnchors is undefined');
          if (has) return true;
        }
        return false;
      };
      const restore = await attempt('anchors.restore', async () => {
        const stored = localStorage.getItem(ANCHOR_KEY);
        if (!stored) throw new Error('no handle from an earlier visit: run the page a second time');
        // A handle is tried once: a restore that stalls must not stall every later run as well.
        localStorage.removeItem(ANCHOR_KEY);
        const { handle, storedAt } = JSON.parse(stored) as { handle: string; storedAt: string };
        const anchor = await within(
          session.restorePersistentAnchor?.(handle),
          'session.restorePersistentAnchor',
        ).catch((error: unknown) => text(error));
        // Restoring and seeing the anchor tracked are two facts: a failed second one leaves the first true.
        const result =
          typeof anchor === 'string'
            ? {
                storedAt,
                restored: false,
                tracked: missing('anchors.restore.tracked', 'not restored'),
                error: anchor,
              }
            : {
                storedAt,
                restored: true,
                tracked: await attempt('anchors.restore.tracked', () => tracked(anchor)),
                error: null,
              };
        // One stored anchor at a time: Meta's "WebXR Mixed Reality" page allows a site 8 persistent anchors.
        await within(session.deletePersistentAnchor?.(handle), 'deletePersistentAnchor').catch(
          () => undefined,
        );
        return result;
      });
      const anchor = await attempt('anchors.created', async () => {
        const pose = new XRRigidTransform({ x: 0, y: 0, z: -ANCHOR_AHEAD_M });
        // Wrapped in an object so that the frame wait does not also wait for the anchor's promise.
        const made = await onFrame((frame) => ({
          anchor: frame.createAnchor?.(pose, must(viewer, 'no viewer reference space')),
        }));
        return within(made.anchor, 'frame.createAnchor');
      });
      const handle =
        anchor &&
        (await attempt('anchors.persistentHandle', () =>
          within(anchor.requestPersistentHandle?.(), 'anchor.requestPersistentHandle'),
        ));
      if (handle) {
        localStorage.setItem(ANCHOR_KEY, JSON.stringify({ handle, storedAt: new Date().toISOString() }));
      }
      return {
        created: anchor !== null,
        tracked: anchor
          ? await attempt('anchors.tracked', () => tracked(anchor))
          : missing('anchors.tracked', 'no anchor was created'),
        persistentHandle: Boolean(handle),
        restore,
      };
    });

    // 3 and 9. Hands and one pinch: the joints per hand, the select events in arrival order, pinch-to-sound.
    say('Pinch once now: thumb and index finger, in front of you.');
    results.hands = await section('hands', async () => {
      const opened = performance.now();
      const pinch = {
        events: [] as NonNullable<NonNullable<Results['hands']>['pinchEvents']>,
        released: Infinity,
        clicked: false,
      };
      const onSelect = (event: XRInputSourceEvent) => {
        const now = performance.now();
        pinch.events.push({
          type: event.type,
          handedness: event.inputSource.handedness,
          atMs: round(event.timeStamp - opened, 1),
        });
        if (event.type === 'selectstart' && !pinch.clicked) {
          pinch.clicked = true;
          try {
            results.audio.pinchToSound = click(audio, event.timeStamp, now);
          } catch (error) {
            missing('audio.pinchToSound', error);
          }
        }
        if (event.type === 'selectend') pinch.released = Math.min(pinch.released, now);
      };
      const types = ['selectstart', 'select', 'selectend'] as const;
      types.forEach((type) => session.addEventListener(type, onSelect));
      loop.tint = PINCH_TINT;
      let sources: NonNullable<Results['hands']>['sources'] = [];
      const joints = (list: typeof sources) =>
        list.reduce((sum, source) => sum + (source.jointsWithPose ?? 0), 0);
      try {
        while (performance.now() < Math.min(opened + PINCH_WINDOW_MS, pinch.released + AFTER_RELEASE_MS)) {
          const seen = await onFrame((frame) =>
            [...session.inputSources].map((source) => ({
              handedness: source.handedness,
              targetRayMode: source.targetRayMode,
              profiles: [...source.profiles],
              gamepad: source.gamepad != null,
              joints: source.hand?.size ?? null,
              jointsWithPose:
                source.hand && world
                  ? [...source.hand.values()].filter((joint) => frame.getJointPose?.(joint, world)).length
                  : null,
            })),
          );
          if (joints(seen) >= joints(sources)) sources = seen; // keep the frame that tracked the most joints
        }
      } finally {
        types.forEach((type) => session.removeEventListener(type, onSelect));
        loop.tint = 0;
      }
      sources.forEach((source, i) => {
        if (source.joints === null) missing(`hands.sources.${i}.joints`, 'this input source has no hand');
        if (source.jointsWithPose === null) {
          missing(`hands.sources.${i}.jointsWithPose`, source.joints === null ? 'no hand' : NO_WORLD);
        }
      });
      const none = `no pinch in the ${PINCH_WINDOW_MS / 1000} s window`;
      if (!pinch.clicked) missing('audio.pinchToSound', none);
      return {
        sources,
        pinchEvents: pinch.events.length > 0 ? pinch.events : missing('hands.pinchEvents', none),
      };
    });

    // 9. Audio: the polyphony sweep. It needs no frame, so it runs even when there is no frame loop.
    results.audio.polyphony = await section('audio.polyphony', () => sweep(audio, wait, say));

    // 4 again: the room at the end of the session.
    await section('planes.countAtEnd', async () => {
      setScene(results, scene.first, await onFrame((frame) => readScene(frame, world)));
      return true;
    });
    alive();
  } finally {
    clearTimeout(limit);
  }
}

/**
 * Call from the tap itself: the session request and the audio context both need the user's gesture. `save` gets
 * the results so far after every step, so a run that is cut short is not lost.
 */
export async function runProbe(
  say: (status: string) => void,
  save: (results: Results) => void,
): Promise<Results> {
  const started = performance.now();
  reasons = {};
  const xr = navigator.xr;
  const audio = new AudioContext({ latencyHint: 'interactive' });
  void audio.resume().catch(() => undefined); // in the tap: a context that starts suspended needs the gesture
  // 1 and 2. Everything optional: the session then starts whatever is declined, and reports what it granted.
  const asked = xr?.requestSession('immersive-ar', { optionalFeatures: FEATURES });
  const emulator = (window as unknown as { IWER_DEVICE?: { version: string } }).IWER_DEVICE;

  const results: Results = {
    page: 'roomsong-capability-spike',
    startedAt: new Date().toISOString(),
    durationMs: 0,
    completed: false,
    emulator: emulator ? `IWER ${emulator.version}` : null,
    basics: { userAgent: navigator.userAgent, xr: xr !== undefined, immersiveAr: null, immersiveVr: null },
    features: null,
    frameRate: null,
    planes: null,
    meshes: null,
    permission: null,
    hitTest: null,
    anchors: null,
    hands: null,
    audio: {
      sampleRate: audio.sampleRate,
      state: audio.state,
      baseLatency: null,
      outputLatency: null,
      pinchToSound: null,
      voice: VOICE,
      polyphony: null,
    },
    human: { run: null, crackleFromVoices: null, spacePermission: null },
    reasons,
  };
  const progress = () => {
    results.durationMs = Math.round(performance.now() - started);
    results.audio.state = audio.state;
    save(results);
  };
  // What a saved run says for as long as it has not ended: replaced below when it does.
  missing('session', 'the run did not finish: the page was closed or reloaded');
  progress();

  const supported = (field: string, mode: XRSessionMode) =>
    attempt(`basics.${field}`, () => within(xr?.isSessionSupported(mode), 'navigator.xr.isSessionSupported'));
  results.basics.immersiveAr = await supported('immersiveAr', 'immersive-ar');
  results.basics.immersiveVr = await supported('immersiveVr', 'immersive-vr');

  // The request waits for the person's answers to the headset's prompts, so it gets a longer limit.
  const session = await within(asked, 'navigator.xr.requestSession', SESSION_REQUEST_TIMEOUT_MS).catch(
    (error: unknown) => text(error),
  );
  if (typeof session === 'string') {
    void asked?.then((late) => late.end()).catch(() => undefined); // granted after the limit: not left open
    missing('session', `no immersive-ar session: ${session}`);
  } else {
    try {
      await probeSession(session, audio, results, say, progress);
      results.completed = true;
      delete reasons.session;
    } catch (error) {
      missing('session', error);
    }
    await within(session.end(), 'session.end').catch(() => undefined); // already ended when the person left
  }
  // Read last: after the sweep the context has been playing, which is when outputLatency means something.
  results.audio.baseLatency = await attempt('audio.baseLatency', () => audio.baseLatency);
  results.audio.outputLatency = await attempt('audio.outputLatency', () => audio.outputLatency);
  progress(); // before the close, so that `state` is the state the sound was played in
  await within(audio.close(), 'audio.close').catch(() => undefined); // a failed close must not cost the run
  return results;
}
