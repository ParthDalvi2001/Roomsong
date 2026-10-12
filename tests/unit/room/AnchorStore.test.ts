/// <reference types="webxr" />
// AnchorStore on a fake headset (FR-ROOM-07, API_SPEC §1.3). The fake answers as the installed packages say a
// platform does (@types/webxr 0.5.24, IWER 2.5.0): an anchor arrives with the frame after it was asked for, a
// frame can be used only inside its own callback, a handle the device does not know is refused, and the device
// keeps its persistent anchors from one session to the next. Unlike IWER it leaves a pending call pending when
// the session ends, which is the harder case. Synthetic: nothing here shows what a Quest does;
// tests/e2e/13-anchor-store.spec.ts runs the same class on the emulator.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flags, log } from '../../../src/core/index.js';
import { AnchorStore } from '../../../src/room/AnchorStore.js';
import { ANCHOR_CALL_TIMEOUT_MS, ANCHOR_RESTORE_TIMEOUT_MS } from '../../../src/room/config.js';

import { poseOf, yaw } from './fixtures.js';

import type { Mat4 } from '../../../src/core/index.js';

type Call = 'createAnchor' | 'requestPersistentHandle' | 'restorePersistentAnchor' | 'deletePersistentAnchor';
/** What the device keeps between sessions: handle → the anchor's pose in the room. */
type Kept = Map<string, Mat4>;
interface Point {
  x: number;
  y: number;
  z: number;
  w: number;
}

let handleCount = 0;

/** One fake session on a device. `frame(store)` is one XR frame. */
class FakeXR {
  readonly space = {} as XRReferenceSpace;
  /** Every anchor call the platform received, in order. */
  readonly calls: string[] = [];
  /** A call named here is refused with this error. */
  fail: Partial<Record<Call, Error>> = {};
  /** The device keeps no more persistent anchors than this (the Quest Browser: 8 per site). */
  limit = Infinity;
  /** False: anchors last one session only, and have no `requestPersistentHandle`. */
  hasHandles = true;
  /** `null`: no anchor has a pose this frame (not tracked). A matrix: every anchor reports that instead. */
  pose: Mat4 | null | undefined = undefined;
  /** Set to make the pose read throw. */
  poseError: Error | null = null;
  /** Set to make `anchor.delete()` throw. */
  deleteError: Error | null = null;
  /** False: the session does not list its persistent anchors. */
  hasList = true;
  poseReads = 0;
  private readonly held = new Map<Call, ((error?: Error) => void)[]>();
  private due: (() => void)[] = [];
  private isInFrame = false;
  private readonly listeners = new Map<string, Set<() => void>>();
  readonly session: Record<string, unknown>;
  readonly xrFrame: Record<string, unknown>;

  constructor(
    readonly kept: Kept = new Map(),
    features: string[] = ['anchors'],
  ) {
    this.session = {
      enabledFeatures: features,
      visibilityState: 'visible',
      addEventListener: (type: string, listener: () => void) => this.listenersFor(type).add(listener),
      removeEventListener: (type: string, listener: () => void) => this.listenersFor(type).delete(listener),
      restorePersistentAnchor: (handle: string) =>
        this.answer('restorePersistentAnchor', handle, () => this.anchorAt(this.known(handle)), true),
      deletePersistentAnchor: (handle: string) =>
        this.answer('deletePersistentAnchor', handle, () => {
          this.known(handle);
          this.kept.delete(handle);
        }),
    };
    Object.defineProperty(this.session, 'persistentAnchors', {
      get: () => (this.hasList ? Array.from(this.kept.keys()) : undefined),
    });
    this.xrFrame = {
      session: this.session,
      createAnchor: (transform: { matrix: Mat4 }, space: unknown) => {
        if (!this.isInFrame || space !== this.space) {
          this.calls.push('createAnchor outside its frame');
          return Promise.reject(new Error('InvalidStateError'));
        }
        const pose = Array.from(transform.matrix);
        return this.answer('createAnchor', '', () => this.anchorAt(pose), true);
      },
      getPose: (from: { pose: Mat4; owner: FakeXR }, to: unknown) => {
        this.poseReads++;
        if (!this.isInFrame) throw new Error('InvalidStateError: frame read outside its callback');
        if (from.owner !== this) throw new Error('InvalidStateError: the space is of another session');
        if (this.poseError) throw this.poseError;
        const pose = this.pose === undefined ? from.pose : this.pose;
        return pose !== null && to === this.space
          ? { transform: { matrix: Float32Array.from(pose) } }
          : undefined;
      },
    };
  }

  /** One XR frame: what was due arrives first, as the platform updates its anchors before the callbacks. */
  frame(store: AnchorStore): void {
    for (const arrive of this.due.splice(0)) arrive();
    this.isInFrame = true;
    store.setFrame(this.xrFrame as unknown as XRFrame, this.space);
    this.isInFrame = false;
  }

  /** From now on `call` gets no answer, until `release(call)`. */
  hold(call: Call): void {
    this.held.set(call, []);
  }

  /** Answers the held calls, or with `error` refuses them. */
  release(call: Call, error?: Error): void {
    for (const settle of this.held.get(call) ?? []) settle(error);
    this.held.delete(call);
  }

  end(): void {
    this.emit('end');
  }

  /** The headset is lifted ('hidden': no frames come) or put on again. */
  show(state: 'visible' | 'hidden'): void {
    this.session.visibilityState = state;
    this.emit('visibilitychange');
  }

  /** How many listeners the session has for `type`. */
  listening(type: string): number {
    return this.listenersFor(type).size;
  }

  private listenersFor(type: string): Set<() => void> {
    let set = this.listeners.get(type);
    if (set === undefined) this.listeners.set(type, (set = new Set()));
    return set;
  }

  private emit(type: string): void {
    for (const listener of Array.from(this.listenersFor(type))) listener();
  }

  private known(handle: string): Mat4 {
    const pose = this.kept.get(handle);
    if (pose === undefined) throw new Error(`InvalidStateError: no persistent anchor ${handle}`);
    return pose;
  }

  private anchorAt(pose: Mat4): XRAnchor {
    let isDeleted = false;
    const space = { pose, owner: this };
    return {
      get anchorSpace() {
        if (isDeleted) throw new Error('InvalidStateError: the anchor was deleted');
        return space;
      },
      requestPersistentHandle: !this.hasHandles
        ? undefined
        : () =>
            this.answer('requestPersistentHandle', '', () => {
              if (this.kept.size >= this.limit) throw new Error('the site holds its limit of anchors');
              const handle = `uuid-${++handleCount}`;
              this.kept.set(handle, pose);
              return handle;
            }),
      delete: () => {
        this.calls.push('anchor.delete');
        if (this.deleteError) throw this.deleteError;
        isDeleted = true;
      },
    } as unknown as XRAnchor;
  }

  /**
   * The platform's side of one call. It acts at once (a refusal is immediate, as in IWER); its answer comes at
   * once too, or with the next frame, or on `release` when the call is held.
   */
  private answer<T>(call: Call, arg: string, act: () => T, withNextFrame = false): Promise<T> {
    this.calls.push(arg === '' ? call : `${call} ${arg}`);
    return new Promise((resolve, reject) => {
      const error = this.fail[call];
      if (error) throw error; // a throw in here refuses the call
      const value = act();
      const settle = (refusal?: Error): void => (refusal ? reject(refusal) : resolve(value));
      const held = this.held.get(call);
      if (held) held.push(settle);
      else if (withNextFrame) this.due.push(settle);
      else settle();
    });
  }
}

/** The platform's XRRigidTransform, as far as the store uses it: a position and an orientation, kept as a matrix. */
class FakeRigidTransform {
  readonly matrix: number[];
  constructor(position: Point, orientation: Point) {
    const numbers = [position.x, position.y, position.z, orientation.x, orientation.y, orientation.z];
    if (![...numbers, orientation.w].every(Number.isFinite)) throw new TypeError('not finite');
    this.matrix = poseOf(
      [position.x, position.y, position.z],
      [orientation.x, orientation.y, orientation.z, orientation.w],
    );
  }
}

const PENDING = Symbol('pending');
/** Lets the promises the store started run to their end. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}
/** What the promise has resolved to by now, or PENDING. */
async function now<T>(promise: Promise<T>): Promise<T | typeof PENDING> {
  await settle();
  return Promise.race([promise, Promise.resolve(PENDING)]);
}
async function frames(xr: FakeXR, store: AnchorStore, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    xr.frame(store);
    await settle();
  }
}

/** A store in a session that has had its first frame. */
function enter(kept: Kept = new Map(), features?: string[]): { xr: FakeXR; store: AnchorStore } {
  const xr = new FakeXR(kept, features);
  const store = new AnchorStore();
  xr.frame(store);
  return { xr, store };
}

/** `create(pose)` with the two frames it needs: the anchor is asked for in one and arrives with the next. */
async function createIn(xr: FakeXR, store: AnchorStore, pose: Mat4 = BED): Promise<string | null> {
  const made = store.create(pose);
  await frames(xr, store, 2);
  const handle = await now(made);
  // Fails here and now: awaiting a create() that never answers would only show as a test that timed out
  if (handle === PENDING) throw new Error('create() has not answered after two frames');
  return handle;
}

/** Equal as far as the platform's 32-bit numbers carry. */
function expectPose(actual: Mat4 | null | undefined, expected: Mat4): void {
  expect(actual?.length).toBe(16);
  for (let i = 0; i < 16; i++) expect(actual![i], `[${i}]`).toBeCloseTo(expected[i]!, 6);
}

/** The pose a restore() has given by now. One that still waits fails here, not by a test that timed out. */
async function expectRestored(restored: Promise<Mat4 | null>, expected: Mat4): Promise<void> {
  const pose = await now(restored);
  expectPose(pose === PENDING ? undefined : pose, expected);
}

/** A bed on the table: level, turned 30 degrees. */
const BED = poseOf([0.1, 0.74, -0.45], yaw(30));
const ELSEWHERE = poseOf([-0.2, 0.9, -0.4], yaw(-70));

beforeEach(() => {
  handleCount = 0;
  vi.useFakeTimers();
  vi.stubGlobal('XRRigidTransform', FakeRigidTransform);
  vi.spyOn(log, 'warn').mockImplementation(() => {});
  vi.spyOn(log, 'info').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AnchorStore.supported', () => {
  it('is false before the first frame, true in a session with persistent anchors, false once it has ended', () => {
    const xr = new FakeXR();
    const store = new AnchorStore();
    expect(store.supported()).toBe(false);
    xr.frame(store);
    expect(store.supported()).toBe(true);
    xr.end();
    expect(store.supported()).toBe(false);

    const next = new FakeXR();
    next.frame(store);
    xr.end(); // the old session says once more that it is over: the new one is not touched
    expect(store.supported()).toBe(true);
  });

  it('never throws on a frame it cannot use, and says so once', () => {
    const error = new Error('InvalidStateError');
    const unusable = {
      get session(): never {
        throw error;
      },
    } as unknown as XRFrame;
    const store = new AnchorStore();
    expect(() => store.setFrame(unusable, {} as XRReferenceSpace)).not.toThrow();
    expect(() => store.setFrame(unusable, {} as XRReferenceSpace)).not.toThrow();
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'anchor frame failed', error);
    expect(store.supported()).toBe(false);
  });

  it('is false when the session was not granted anchors, or has no persistent ones', () => {
    for (const features of [['plane-detection', 'hit-test'], []]) {
      expect(enter(new Map(), features).store.supported(), features.join()).toBe(false);
    }
    const store = new AnchorStore();
    const unlisted = new FakeXR();
    unlisted.session.enabledFeatures = undefined; // a browser that does not say what it granted
    unlisted.frame(store);
    expect(store.supported()).toBe(false);
    const xr = new FakeXR();
    xr.session.restorePersistentAnchor = undefined; // anchors that last one session only
    xr.frame(store);
    expect(store.supported()).toBe(false);
  });

  it('gives "no anchor" from every call when unsupported, and asks the platform for nothing', async () => {
    const { xr, store } = enter(new Map([['uuid-9', BED]]), ['hit-test']);
    expect(await store.restore('uuid-9', ANCHOR_RESTORE_TIMEOUT_MS)).toBeNull();
    expect(await createIn(xr, store)).toBeNull();
    await expect(store.clear()).resolves.toBeUndefined();
    expect(xr.calls).toEqual([]);
    expect(log.warn).not.toHaveBeenCalled();

    const early = new AnchorStore(); // before any frame
    expect(await early.restore('uuid-9', ANCHOR_RESTORE_TIMEOUT_MS)).toBeNull();
    expect(await early.create(BED)).toBeNull();
    await expect(early.clear()).resolves.toBeUndefined();
  });

  it('with noAnchors is unsupported and never touches the frame, the session or the space', async () => {
    const touched: PropertyKey[] = [];
    const trap = new Proxy(
      {},
      {
        get: (_, key) => {
          touched.push(key);
          throw new Error(`read ${String(key)}`);
        },
      },
    );
    const store = new AnchorStore({ ...flags, noAnchors: true });
    store.setFrame(trap as XRFrame, trap as XRReferenceSpace);
    expect(store.supported()).toBe(false);
    expect(await store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS)).toBeNull();
    expect(await store.create(BED)).toBeNull();
    await expect(store.clear()).resolves.toBeUndefined();
    store.setFrame(trap as XRFrame, trap as XRReferenceSpace);
    expect(touched).toEqual([]);

    // The same store on a working session: still nothing
    const xr = new FakeXR(new Map([['uuid-1', BED]]));
    xr.frame(store);
    expect(store.supported()).toBe(false);
    expect(await store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS)).toBeNull();
    expect(await createIn(xr, store)).toBeNull();
    expect(xr.calls).toEqual([]);
  });
});

describe('AnchorStore.create', () => {
  it('makes the anchor inside the next frame, asks for its persistent handle and resolves with it', async () => {
    const { xr, store } = enter();
    const made = store.create(BED); // called outside a frame: the platform call waits for one
    expect(xr.calls).toEqual([]);
    xr.frame(store);
    expect(xr.calls).toEqual(['createAnchor']);
    expect(await now(made)).toBe(PENDING); // the anchor arrives with the next frame
    xr.frame(store);
    expect(await now(made)).toBe('uuid-1');
    expect(xr.calls).toEqual(['createAnchor', 'requestPersistentHandle']);
    expectPose(xr.kept.get('uuid-1'), BED);
    vi.advanceTimersByTime(ANCHOR_CALL_TIMEOUT_MS); // its time-out went with the answer
    await settle();
    expect(vi.getTimerCount()).toBe(0);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('keeps the anchor it made: a restore() of its handle in the same session asks the device nothing', async () => {
    const { xr, store } = enter();
    const handle = await createIn(xr, store);
    xr.calls.length = 0;
    const restored = store.restore(handle!, ANCHOR_RESTORE_TIMEOUT_MS);
    await frames(xr, store, 1);
    await expectRestored(restored, BED);
    expect(xr.calls).toEqual([]);
  });

  it('sweeps the site once it has its handle: every other persistent anchor goes, its own stays', async () => {
    const { xr, store } = enter(
      new Map([
        ['stray-1', ELSEWHERE],
        ['stray-2', ELSEWHERE],
      ]),
    );
    const handle = await createIn(xr, store);
    await settle();
    expect(xr.calls).toEqual([
      'createAnchor',
      'requestPersistentHandle',
      'deletePersistentAnchor stray-1',
      'deletePersistentAnchor stray-2',
    ]);
    expect(Array.from(xr.kept.keys())).toEqual([handle]);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('sweeps nothing on a session that does not list its anchors', async () => {
    const { xr, store } = enter(new Map([['stray-1', ELSEWHERE]]));
    xr.hasList = false;
    expect(await createIn(xr, store)).toBe('uuid-1');
    await settle();
    expect(xr.calls).toEqual(['createAnchor', 'requestPersistentHandle']);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('still gives its handle when a stray cannot be deleted', async () => {
    const { xr, store } = enter(new Map([['stray-1', ELSEWHERE]]));
    xr.fail.deletePersistentAnchor = new Error('InvalidStateError');
    expect(await createIn(xr, store)).toBe('uuid-1');
    await settle();
    expect(log.info).toHaveBeenCalledWith('room', 'anchor delete failed', xr.fail.deletePersistentAnchor);
    expect(log.warn).not.toHaveBeenCalled();
    xr.fail = {};
    await store.clear(); // and the store still knows which anchor is its own
    expect(Array.from(xr.kept.keys())).toEqual(['stray-1']);
  });

  it('keeps the pose whichever way the bed is turned', async () => {
    const half = Math.SQRT1_2;
    const small = Math.sqrt(1 - 0.64 - 0.04 - 0.09); // the fourth part of a unit quaternion with 0.8, 0.2 and 0.3
    const turns = [
      [0, 0, 0, 1],
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0.5, 0.5, 0.5, 0.5],
      [half, 0, 0, half],
      [0, half, half, 0],
      [0.1, -0.7, 0.3, Math.sqrt(1 - 0.01 - 0.49 - 0.09)],
      // More than a half turn, mostly about x, about y, about z: the three other ways the quaternion is found
      [0.8, 0.2, -0.3, small],
      [0.2, 0.8, -0.3, small],
      [-0.3, 0.2, 0.8, small],
    ] as const;
    for (const turn of turns) {
      const { xr, store } = enter();
      const pose = poseOf([0.3, 0.8, -0.4], turn);
      const handle = await createIn(xr, store, pose);
      expectPose(xr.kept.get(handle!), pose);
    }
  });

  it('gives null for a pose that is not a rigid pose of 16 finite numbers, and asks the platform for nothing', async () => {
    const stretched = Array.from(BED);
    stretched[0] = 2;
    const notFinite = Array.from(BED);
    notFinite[13] = Number.NaN;
    // Unit axes, square to each other, and a mirror image: no rotation makes it
    const mirrored = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0.1, 0.74, -0.45, 1];
    for (const pose of [stretched, notFinite, mirrored, [1, 0, 0, 0], []]) {
      const { xr, store } = enter();
      expect(await createIn(xr, store, pose)).toBeNull();
      expect(xr.calls).toEqual([]);
      expect(log.warn).toHaveBeenLastCalledWith('room', 'anchor create failed', expect.anything());
    }
  });

  it('gives null when the anchor cannot be made: the call is refused, missing, or the transform throws', async () => {
    const refused = enter();
    refused.xr.fail.createAnchor = new Error('NotSupportedError');
    expect(await createIn(refused.xr, refused.store)).toBeNull();
    expect(log.warn).toHaveBeenLastCalledWith('room', 'anchor create failed', refused.xr.fail.createAnchor);

    const missing = enter();
    missing.xr.xrFrame.createAnchor = undefined;
    expect(await createIn(missing.xr, missing.store)).toBeNull();
    expect(log.warn).toHaveBeenCalledTimes(2);

    vi.stubGlobal('XRRigidTransform', undefined);
    const noTransform = enter();
    expect(await createIn(noTransform.xr, noTransform.store)).toBeNull();
    expect(log.warn).toHaveBeenCalledTimes(3);
    expect(noTransform.xr.calls).toEqual([]);
  });

  it('gives null when the device will keep no more anchors, and deletes the anchor it had just made', async () => {
    const full: Kept = new Map();
    for (let i = 0; i < 8; i++) full.set(`other-${i}`, ELSEWHERE);
    const { xr, store } = enter(full);
    xr.limit = 8;
    expect(await createIn(xr, store)).toBeNull();
    expect(xr.calls).toEqual(['createAnchor', 'requestPersistentHandle', 'anchor.delete']);
    expect(full.size).toBe(8);
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'anchor create failed', expect.any(Error));

    // An anchor that cannot be made persistent at all (the platform has no such call): the same
    const session = enter();
    session.xr.hasHandles = false;
    expect(await createIn(session.xr, session.store)).toBeNull();
    expect(session.xr.calls).toEqual(['createAnchor', 'anchor.delete']);
    expect(log.warn).toHaveBeenCalledTimes(2);

    // And an anchor that then refuses to be deleted (a session on its way out): still null, and at once
    const stuck = enter();
    stuck.xr.fail.requestPersistentHandle = new Error('InvalidStateError');
    stuck.xr.deleteError = new Error('InvalidStateError');
    expect(await createIn(stuck.xr, stuck.store)).toBeNull();
    expect(log.warn).toHaveBeenCalledTimes(3);
  });

  it('gives null after ANCHOR_CALL_TIMEOUT_MS when the platform does not answer, and deletes what comes late', async () => {
    const { xr, store } = enter();
    xr.hold('requestPersistentHandle');
    const made = store.create(BED);
    await frames(xr, store, 2);
    vi.advanceTimersByTime(ANCHOR_CALL_TIMEOUT_MS - 1);
    expect(await now(made)).toBe(PENDING);
    vi.advanceTimersByTime(1);
    expect(await now(made)).toBeNull();
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'anchor create failed', expect.anything());

    xr.release('requestPersistentHandle'); // the handle arrives after all: it must not stay on the device
    await settle();
    expect(xr.calls).toEqual(['createAnchor', 'requestPersistentHandle', 'deletePersistentAnchor uuid-1']);
    expect(xr.kept.size).toBe(0);

    // No frame ever comes (the session is hidden): the same time-out, and nothing was asked of the platform
    const hidden = enter();
    const waiting = hidden.store.create(BED);
    vi.advanceTimersByTime(ANCHOR_CALL_TIMEOUT_MS);
    expect(await now(waiting)).toBeNull();
    await frames(hidden.xr, hidden.store, 2);
    expect(hidden.xr.calls).toEqual([]);
  });

  it('deletes an anchor that arrives after its create() was given up', async () => {
    const { xr, store } = enter();
    xr.hold('createAnchor');
    const made = store.create(BED);
    xr.frame(store);
    vi.advanceTimersByTime(ANCHOR_CALL_TIMEOUT_MS);
    expect(await now(made)).toBeNull();
    xr.release('createAnchor');
    await settle();
    expect(xr.calls).toEqual(['createAnchor', 'anchor.delete']);
  });

  it('keeps one anchor only: a second create() has the old handle deleted first, then makes the new one', async () => {
    const { xr, store } = enter();
    expect(await createIn(xr, store, BED)).toBe('uuid-1');
    xr.calls.length = 0;
    expect(await createIn(xr, store, ELSEWHERE)).toBe('uuid-2');
    expect(xr.calls).toEqual(['deletePersistentAnchor uuid-1', 'createAnchor', 'requestPersistentHandle']);
    expect(Array.from(xr.kept.keys())).toEqual(['uuid-2']);
    expectPose(xr.kept.get('uuid-2'), ELSEWHERE);
  });

  it('ends a restore() that still waits for the anchor it is about to delete, and lets none begin meanwhile', async () => {
    const { xr, store } = enter(new Map([['uuid-9', BED]]));
    xr.hold('restorePersistentAnchor');
    const restored = store.restore('uuid-9', ANCHOR_RESTORE_TIMEOUT_MS);
    const made = store.create(ELSEWHERE);
    expect(await now(restored)).toBeNull();
    // While the new anchor is on its way there is no saved one to come back to
    expect(await now(store.restore('uuid-9', ANCHOR_RESTORE_TIMEOUT_MS))).toBeNull();
    expect(xr.calls).toEqual(['restorePersistentAnchor uuid-9', 'deletePersistentAnchor uuid-9']);
    await frames(xr, store, 2);
    expect(await made).toBe('uuid-1');
    expect(Array.from(xr.kept.keys())).toEqual(['uuid-1']);
    await store.clear(); // and the store still knows which anchor is its own
    expect(xr.kept.size).toBe(0);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('goes on to make the new anchor when the old one cannot be deleted, or the delete is never answered', async () => {
    const refused = enter();
    await createIn(refused.xr, refused.store);
    refused.xr.fail.deletePersistentAnchor = new Error('InvalidStateError');
    expect(await createIn(refused.xr, refused.store, ELSEWHERE)).toBe('uuid-2');
    expect(log.info).toHaveBeenCalledWith(
      'room',
      'anchor delete failed',
      refused.xr.fail.deletePersistentAnchor,
    );
    expect(log.warn).not.toHaveBeenCalled();

    const silent = enter();
    await createIn(silent.xr, silent.store);
    silent.xr.hold('deletePersistentAnchor');
    expect(await createIn(silent.xr, silent.store, ELSEWHERE)).toBe('uuid-4');
  });

  it('a second create() while the first is on its way: the first gives null and leaves nothing on the device', async () => {
    const { xr, store } = enter();
    xr.hold('requestPersistentHandle');
    const first = store.create(BED);
    await frames(xr, store, 2); // the first has its anchor and waits for the handle
    const second = store.create(ELSEWHERE);
    expect(await now(first)).toBeNull();
    xr.release('requestPersistentHandle'); // the first's handle arrives late
    await frames(xr, store, 2);
    const handle = await second;
    expect(handle).not.toBeNull();
    expect(Array.from(xr.kept.keys())).toEqual([handle]);
    expectPose(xr.kept.get(handle!), ELSEWHERE);
    expect(log.warn).not.toHaveBeenCalled();

    // Before the first even had its frame: one anchor is made, not two
    const early = enter();
    const dropped = early.store.create(BED);
    const kept = early.store.create(ELSEWHERE);
    await frames(early.xr, early.store, 2);
    expect(await dropped).toBeNull();
    expect(await kept).not.toBeNull();
    expect(early.xr.calls).toEqual(['createAnchor', 'requestPersistentHandle']);

    // The first fails after the second has begun: the failure is the first's alone
    const failing = enter();
    failing.xr.fail.createAnchor = new Error('NotSupportedError');
    const failed = failing.store.create(BED);
    failing.xr.frame(failing.store); // refused; the store hears of it after this turn
    failing.xr.fail = {};
    const good = failing.store.create(ELSEWHERE);
    await frames(failing.xr, failing.store, 2);
    expect(await failed).toBeNull();
    expect(await good).not.toBeNull();
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('gives null at once when the session ends first, and when another session begins', async () => {
    const { xr, store } = enter();
    xr.hold('createAnchor');
    const made = store.create(BED);
    xr.frame(store);
    xr.end();
    expect(await now(made)).toBeNull();
    expect(log.warn).not.toHaveBeenCalled();

    const first = enter();
    const pending = first.store.create(BED);
    const second = new FakeXR();
    second.frame(first.store); // a frame of another session: the first one is over
    expect(await now(pending)).toBeNull();
    expect(second.calls).toEqual([]); // the old session's request is not carried into the new one
  });

  it('remembers its handle from one session of the page to the next, and deletes it there', async () => {
    const { xr, store } = enter();
    await createIn(xr, store);
    xr.end();
    const again = new FakeXR(xr.kept);
    again.frame(store);
    expect(await createIn(again, store, ELSEWHERE)).toBe('uuid-2');
    expect(again.calls).toEqual(['deletePersistentAnchor uuid-1', 'createAnchor', 'requestPersistentHandle']);
    expect(Array.from(again.kept.keys())).toEqual(['uuid-2']);
  });
});

describe('AnchorStore.restore', () => {
  /** A device that kept `BED` under 'uuid-1' on an earlier visit, and a new page on it. */
  const visitAgain = (): { xr: FakeXR; store: AnchorStore } => enter(new Map([['uuid-1', BED]]));

  it('gives the pose of the anchor a create() made on an earlier visit, read inside a frame', async () => {
    const before = enter();
    const handle = await createIn(before.xr, before.store);
    before.xr.end();

    const { xr, store } = enter(before.xr.kept); // the next visit: a new page, a new session, the same device
    const restored = store.restore(handle!, ANCHOR_RESTORE_TIMEOUT_MS); // called outside a frame
    expect(xr.calls).toEqual(['restorePersistentAnchor uuid-1']);
    expect(await now(restored)).toBe(PENDING);
    xr.frame(store); // the anchor arrives with this frame; the store learns of it after the frame
    expect(await now(restored)).toBe(PENDING);
    expect(xr.poseReads).toBe(0); // and reads no frame from there
    xr.frame(store); // its pose is read inside the next one
    const pose = await now(restored);
    expectPose(pose as Mat4, BED);
    expect(Array.isArray(pose)).toBe(true); // a copy, not the platform's own array
    expect(xr.poseReads).toBe(1);
    expect(vi.getTimerCount()).toBe(0); // its time-out went with the answer
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('drops the anchor of a session that has ended: the next session is asked for its own', async () => {
    const { xr, store } = visitAgain();
    const first = store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS);
    await frames(xr, store, 2);
    await expectRestored(first, BED);
    xr.end();
    const next = new FakeXR(xr.kept);
    next.frame(store);
    const second = store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS);
    await frames(next, store, 2);
    await expectRestored(second, BED);
    expect(next.calls).toEqual(['restorePersistentAnchor uuid-1']);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('stops its time-out while the session is hidden, and gives the full time again once it is seen', async () => {
    const { xr, store } = visitAgain();
    const restored = store.restore('uuid-1', 4000);
    await frames(xr, store, 1); // the device answers
    xr.show('hidden'); // the headset is lifted: no frame comes, so no pose can
    vi.advanceTimersByTime(5000);
    expect(await now(restored)).toBe(PENDING);
    xr.show('visible');
    vi.advanceTimersByTime(3999);
    expect(await now(restored)).toBe(PENDING);
    await frames(xr, store, 1);
    await expectRestored(restored, BED);
    expect(xr.listening('visibilitychange')).toBe(0); // the wait is over: it listens no more
    expect(vi.getTimerCount()).toBe(0);

    // Seen again and still no pose: null after the full time, counted from then
    const lost = visitAgain();
    lost.xr.pose = null;
    const never = lost.store.restore('uuid-1', 4000);
    await frames(lost.xr, lost.store, 2);
    lost.xr.show('hidden');
    vi.advanceTimersByTime(60_000);
    lost.xr.show('visible');
    vi.advanceTimersByTime(3999);
    expect(await now(never)).toBe(PENDING);
    vi.advanceTimersByTime(1);
    expect(await now(never)).toBeNull();
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'E_ANCHOR_RESTORE', expect.anything());

    // Asked for while hidden: the time starts when the session is seen
    const dark = visitAgain();
    dark.xr.show('hidden');
    dark.xr.pose = null;
    const late = dark.store.restore('uuid-1', 4000);
    vi.advanceTimersByTime(60_000);
    expect(await now(late)).toBe(PENDING);
    // The session ends while it is hidden: null, and nothing listens on
    dark.xr.end();
    expect(await now(late)).toBeNull();
    expect(dark.xr.listening('visibilitychange')).toBe(0);
  });

  it('reads the pose once: the bed does not follow the anchor afterwards', async () => {
    const { xr, store } = visitAgain();
    const restored = store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS);
    await frames(xr, store, 2);
    const pose = await restored;
    xr.pose = ELSEWHERE; // the device now reports the anchor elsewhere
    await frames(xr, store, 5);
    expect(xr.poseReads).toBe(1);
    expectPose(pose, BED);
  });

  it('gives null for a handle the device does not know (storage cleared, another room), and logs the code', async () => {
    const { xr, store } = visitAgain();
    expect(await now(store.restore('uuid-404', ANCHOR_RESTORE_TIMEOUT_MS))).toBeNull();
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'E_ANCHOR_RESTORE', expect.any(Error));
    await frames(xr, store, 2);
    expect(xr.poseReads).toBe(0);
    // Asked again, the device is asked again, and the answer comes as fast
    expect(await now(store.restore('uuid-404', ANCHOR_RESTORE_TIMEOUT_MS))).toBeNull();
    expect(xr.calls).toEqual(['restorePersistentAnchor uuid-404', 'restorePersistentAnchor uuid-404']);
  });

  it('gives null after timeoutMs, not before, when the platform never answers', async () => {
    const { xr, store } = visitAgain();
    xr.hold('restorePersistentAnchor');
    const restored = store.restore('uuid-1', 4000);
    await frames(xr, store, 3);
    vi.advanceTimersByTime(3999);
    expect(await now(restored)).toBe(PENDING);
    vi.advanceTimersByTime(1);
    expect(await now(restored)).toBeNull();
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'E_ANCHOR_RESTORE', expect.anything());

    xr.release('restorePersistentAnchor'); // the anchor arrives after all: nobody waits for it
    await frames(xr, store, 2);
    expect(xr.poseReads).toBe(0);
    expect(xr.calls).toEqual(['restorePersistentAnchor uuid-1']); // and a restored anchor is never deleted
  });

  it('waits while the anchor has no pose (not tracked), and takes the first usable one', async () => {
    const { xr, store } = visitAgain();
    const restored = store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS);
    xr.pose = null;
    await frames(xr, store, 3);
    expect(await now(restored)).toBe(PENDING);
    const notFinite = Array.from(BED);
    notFinite[12] = Number.NaN;
    xr.pose = notFinite;
    await frames(xr, store, 1);
    expect(await now(restored)).toBe(PENDING);
    xr.pose = [1, 0, 0, 0];
    await frames(xr, store, 1);
    expect(await now(restored)).toBe(PENDING);
    xr.pose = undefined; // tracked again
    await frames(xr, store, 1);
    await expectRestored(restored, BED);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('gives null when the anchor never gets a pose within timeoutMs', async () => {
    const { xr, store } = visitAgain();
    xr.pose = null;
    const restored = store.restore('uuid-1', 4000);
    await frames(xr, store, 3);
    vi.advanceTimersByTime(4000);
    expect(await now(restored)).toBeNull();
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'E_ANCHOR_RESTORE', expect.anything());
  });

  it('never throws into the frame when the pose read throws: null, and one log line', async () => {
    const { xr, store } = visitAgain();
    xr.poseError = new Error('InvalidStateError');
    const restored = store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS);
    await frames(xr, store, 1); // the anchor arrives
    expect(() => xr.frame(store)).not.toThrow();
    expect(await now(restored)).toBeNull();
    expect(() => xr.frame(store)).not.toThrow();
    expect(log.warn).toHaveBeenCalledExactlyOnceWith('room', 'E_ANCHOR_RESTORE', xr.poseError);
  });

  it('gives null at once when the session ends first, and when another session begins', async () => {
    const { xr, store } = visitAgain();
    xr.hold('restorePersistentAnchor');
    const restored = store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS);
    xr.end();
    expect(await now(restored)).toBeNull();
    expect(log.warn).not.toHaveBeenCalled();

    const second = new FakeXR(xr.kept);
    second.frame(store);
    const again = store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS); // the same page, entering again
    xr.release('restorePersistentAnchor'); // the old session's anchor arrives now: it is of no use here
    await settle();
    await frames(second, store, 2);
    await expectRestored(again, BED);
    expect(second.calls).toEqual(['restorePersistentAnchor uuid-1']); // asked anew: an anchor belongs to its session
    expect(log.warn).not.toHaveBeenCalled();

    // Another session begins while one waits, and the old session refuses its request only then
    const old = visitAgain();
    old.xr.hold('restorePersistentAnchor');
    const lost = old.store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS);
    const next = new FakeXR(old.xr.kept);
    next.frame(old.store);
    expect(await now(lost)).toBeNull();
    const found = old.store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS);
    old.xr.release('restorePersistentAnchor', new Error('InvalidStateError: the session has ended'));
    await frames(next, old.store, 2);
    await expectRestored(found, BED);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('asked again for the same handle while it waits: the same wait with a new time-out, one platform call', async () => {
    const { xr, store } = visitAgain();
    xr.hold('restorePersistentAnchor');
    const first = store.restore('uuid-1', 4000);
    vi.advanceTimersByTime(3000);
    const second = store.restore('uuid-1', 4000); // for example after a pause
    expect(second).toBe(first);
    vi.advanceTimersByTime(3999);
    expect(await now(first)).toBe(PENDING);
    xr.release('restorePersistentAnchor');
    await frames(xr, store, 2);
    await expectRestored(first, BED);
    expect(xr.calls).toEqual(['restorePersistentAnchor uuid-1']);

    // Asked once more in the same session: the anchor is already here, so only its pose is read again
    const third = store.restore('uuid-1', 4000);
    await frames(xr, store, 1);
    await expectRestored(third, BED);
    expect(xr.calls).toEqual(['restorePersistentAnchor uuid-1']);
  });

  it('asked for another handle while it waits: the first wait ends with null', async () => {
    const { xr, store } = enter(
      new Map([
        ['uuid-1', BED],
        ['uuid-2', ELSEWHERE],
      ]),
    );
    const first = store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS);
    xr.hold('restorePersistentAnchor');
    const second = store.restore('uuid-2', ANCHOR_RESTORE_TIMEOUT_MS);
    expect(await now(first)).toBeNull();
    await frames(xr, store, 2); // the first anchor arrives: it is not the one that is waited for
    expect(await now(second)).toBe(PENDING);
    xr.release('restorePersistentAnchor');
    await frames(xr, store, 2);
    await expectRestored(second, ELSEWHERE);

    // The first is refused after the second was asked for: the refusal is the first's alone
    const refused = store.restore('uuid-404', ANCHOR_RESTORE_TIMEOUT_MS);
    const third = store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS);
    expect(await now(refused)).toBeNull();
    await frames(xr, store, 2);
    await expectRestored(third, BED);
    expect(log.warn).not.toHaveBeenCalled();
  });
});

describe('AnchorStore.clear', () => {
  it('deletes the anchor a restore() named, once, and a later restore() of it gives null', async () => {
    const { xr, store } = enter(new Map([['uuid-1', BED]]));
    const restored = store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS);
    await frames(xr, store, 2);
    await expectRestored(restored, BED);
    xr.calls.length = 0;
    await store.clear();
    await store.clear();
    expect(xr.calls).toEqual(['deletePersistentAnchor uuid-1']);
    expect(xr.kept.size).toBe(0);
    expect(await now(store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS))).toBeNull();
  });

  it('deletes the anchor a create() made, and the handle of a restore() that failed', async () => {
    const made = enter();
    await createIn(made.xr, made.store);
    await made.store.clear();
    expect(made.xr.kept.size).toBe(0);

    const failed = enter(new Map([['uuid-7', BED]]));
    failed.xr.pose = null; // known to the device, never tracked
    const restored = failed.store.restore('uuid-7', 1000);
    vi.advanceTimersByTime(1000);
    expect(await now(restored)).toBeNull();
    await failed.store.clear();
    expect(failed.xr.calls).toEqual(['restorePersistentAnchor uuid-7', 'deletePersistentAnchor uuid-7']);
  });

  it('never rejects: a refused delete resolves, and one that is never answered resolves after the time-out', async () => {
    const refused = enter();
    await createIn(refused.xr, refused.store);
    refused.xr.fail.deletePersistentAnchor = new Error('InvalidStateError');
    await expect(refused.store.clear()).resolves.toBeUndefined();
    expect(log.info).toHaveBeenCalledWith('room', 'anchor delete failed', expect.any(Error));

    const silent = enter();
    await createIn(silent.xr, silent.store);
    silent.xr.hold('deletePersistentAnchor');
    const cleared = silent.store.clear();
    vi.advanceTimersByTime(ANCHOR_CALL_TIMEOUT_MS - 1);
    expect(await now(cleared)).toBe(PENDING);
    vi.advanceTimersByTime(1);
    expect(await now(cleared)).toBeUndefined();

    const missing = enter();
    await createIn(missing.xr, missing.store);
    missing.xr.session.deletePersistentAnchor = undefined;
    await expect(missing.store.clear()).resolves.toBeUndefined();
  });

  it('ends a create() and a restore() that are on their way: both give null', async () => {
    const { xr, store } = enter(new Map([['uuid-1', BED]]));
    xr.hold('restorePersistentAnchor');
    const restored = store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS);
    await store.clear();
    expect(await now(restored)).toBeNull();
    expect(xr.calls).toEqual(['restorePersistentAnchor uuid-1', 'deletePersistentAnchor uuid-1']);

    const other = enter();
    const made = other.store.create(BED);
    await other.store.clear();
    expect(await now(made)).toBeNull();
    await frames(other.xr, other.store, 2);
    expect(other.xr.calls).toEqual([]); // the anchor it had not yet asked for is never made
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('deletes a handle it was told of before it could act on it', async () => {
    const xr = new FakeXR(new Map([['uuid-1', BED]]));
    const store = new AnchorStore();
    expect(await store.restore('uuid-1', ANCHOR_RESTORE_TIMEOUT_MS)).toBeNull(); // before the first frame
    xr.frame(store);
    await store.clear();
    expect(xr.calls).toEqual(['deletePersistentAnchor uuid-1']);
    expect(xr.kept.size).toBe(0);
  });

  it('keeps a handle it cannot delete yet (no session) and deletes it in the next one', async () => {
    const { xr, store } = enter();
    await createIn(xr, store);
    xr.end();
    await store.clear(); // no session: nothing can be deleted
    expect(xr.kept.size).toBe(1);
    const again = new FakeXR(xr.kept);
    again.frame(store);
    await store.clear();
    expect(again.kept.size).toBe(0);
  });
});

describe('AnchorStore, the whole way round', () => {
  it('places, comes back, is placed again, and comes back to the new place: one anchor on the device throughout', async () => {
    const day1 = enter();
    const handle1 = await createIn(day1.xr, day1.store, BED);
    day1.xr.end();

    const day2 = enter(day1.xr.kept);
    const restored = day2.store.restore(handle1!, ANCHOR_RESTORE_TIMEOUT_MS);
    await frames(day2.xr, day2.store, 2);
    await expectRestored(restored, BED);
    await day2.store.clear(); // Re-place: clear(), then create()
    const handle2 = await createIn(day2.xr, day2.store, ELSEWHERE);
    expect(Array.from(day2.xr.kept.keys())).toEqual([handle2]);
    // Asked for in the session that made it: the new anchor's place, not the old anchor's
    const sameDay = day2.store.restore(handle2!, ANCHOR_RESTORE_TIMEOUT_MS);
    await frames(day2.xr, day2.store, 2);
    await expectRestored(sameDay, ELSEWHERE);
    day2.xr.end();

    const day3 = enter(day2.xr.kept);
    const stale = day3.store.restore(handle1!, ANCHOR_RESTORE_TIMEOUT_MS);
    expect(await now(stale)).toBeNull();
    const fresh = day3.store.restore(handle2!, ANCHOR_RESTORE_TIMEOUT_MS);
    await frames(day3.xr, day3.store, 2);
    await expectRestored(fresh, ELSEWHERE);
  });
});
