/// <reference types="webxr" />
// WebXR persistent anchors → the bed's place on the real table, kept from one visit to the next (FR-ROOM-07,
// LLD §5.5). Anchors are an optional session feature: `supported()` is false without them and the caller places
// the bed by the chain. Nothing here throws and no promise rejects: "no anchor" is null.
// Frames: a frame can be used only inside its own callback, and a promise continuation runs after it. So every
// frame read and `frame.createAnchor` happen inside `setFrame`; `restore`, `create` and `clear` may be called
// from anywhere.
// One anchor per site, this store's. `create()` has the old one deleted first and, once it has its handle,
// sweeps: every other persistent anchor the session lists is a stray and is deleted (the Quest Browser keeps 8
// per site). The sweep is safe only while IWSDK's scene-understanding system is off (`features.sceneUnderstanding:
// false` in iwsdk.config.json, D-040): that system keeps a persistent anchor of its own and reads its space in
// every frame, which throws once the anchor is deleted (read in the IWSDK 1.0.1 and IWER 2.5.0 sources, not run).
// shortcut: strays are found in `session.persistentAnchors`; a browser without that list keeps them.
// Not seen on a headset: whether and how fast an anchor comes back, its drift and the limit are unverified
// (TC-DEV-05). The emulator restores every handle it knows, in the frame after it is asked.
import { flags as pageFlags, log } from '../core/index.js';

import { ANCHOR_CALL_TIMEOUT_MS } from './config.js';
import { isRigid } from './RoomFeatures.js';

import type { Flags, Mat4 } from '../core/index.js';

type Timer = ReturnType<typeof setTimeout>;

/** A restore() that waits for its anchor's pose. */
interface Wait {
  promise: Promise<Mat4 | null>;
  settle: (pose: Mat4 | null) => void;
  /** As the caller last gave it: the time-out starts anew, in full, when a hidden session is seen again. */
  timeoutMs: number;
  timer: Timer | undefined;
  /** Stops following the session's visibility. */
  unlisten: () => void;
}

/** The pose as the platform takes it: a position and a unit quaternion. Throws for a pose that is not rigid. */
function transformOf(m: Mat4): XRRigidTransform {
  if (!isRigid(m)) throw new Error('the pose is not rigid');
  // Column-major: the pose's x axis, its y axis and its z axis
  const [m0, m1, m2] = [m[0]!, m[1]!, m[2]!];
  const [m4, m5, m6] = [m[4]!, m[5]!, m[6]!];
  const [m8, m9, m10] = [m[8]!, m[9]!, m[10]!];
  // x cross y, dot z. A mirror image has unit, square axes too (isRigid lets it pass), and no rotation makes one
  const handedness = (m1 * m6 - m2 * m5) * m8 + (m2 * m4 - m0 * m6) * m9 + (m0 * m5 - m1 * m4) * m10;
  if (!(handedness > 0)) throw new Error('the pose is mirrored');
  let [x, y, z, w] = [0, 0, 0, 1];
  // The largest of the four comes from a square root, so no branch divides by a number near zero
  if (m0 + m5 + m10 > 0) {
    const s = 2 * Math.sqrt(1 + m0 + m5 + m10);
    [x, y, z, w] = [(m6 - m9) / s, (m8 - m2) / s, (m1 - m4) / s, s / 4];
  } else if (m0 > m5 && m0 > m10) {
    const s = 2 * Math.sqrt(1 + m0 - m5 - m10);
    [x, y, z, w] = [s / 4, (m1 + m4) / s, (m8 + m2) / s, (m6 - m9) / s];
  } else if (m5 > m10) {
    const s = 2 * Math.sqrt(1 + m5 - m0 - m10);
    [x, y, z, w] = [(m1 + m4) / s, s / 4, (m6 + m9) / s, (m8 - m2) / s];
  } else {
    const s = 2 * Math.sqrt(1 + m10 - m0 - m5);
    [x, y, z, w] = [(m8 + m2) / s, (m6 + m9) / s, s / 4, (m1 - m4) / s];
  }
  return new XRRigidTransform({ x: m[12]!, y: m[13]!, z: m[14]!, w: 1 }, { x, y, z, w });
}

/** Deletes an anchor of this session only. */
function discard(anchor: XRAnchor): void {
  try {
    anchor.delete();
  } catch {
    // The anchor of a session that has ended may refuse; it went with its session
  }
}

export class AnchorStore {
  private session: XRSession | null = null;
  /** Our persistent anchor, as restore() was given it or create() made it: the only one this store deletes. */
  private handle: string | null = null;
  /** `handle`'s anchor in this session, once the platform has given it. */
  private anchor: XRAnchor | null = null;
  /** The platform has been asked for `handle`'s anchor in this session. */
  private isAsked = false;
  private wait: Wait | null = null;
  /** Counts what ends a create(): one that finds a newer count has been replaced, cleared, timed out or outlived. */
  private turn = 0;
  /** Answers the create() that is on its way. */
  private made: ((handle: string | null) => void) | null = null;
  /** What create() left for the next frame: `frame.createAnchor` is refused outside a frame's own callback. */
  private inFrame: ((frame: XRFrame, space: XRReferenceSpace) => void) | null = null;
  private hasLoggedFrameFailure = false;

  constructor(private readonly flags: Flags = pageFlags) {}

  /**
   * In every XR frame, before any other call of that frame. All frame work is done in here: the anchor call a
   * create() left, and the read of a restored anchor's pose. Never throws.
   */
  setFrame(frame: XRFrame, space: XRReferenceSpace): void {
    if (this.flags.noAnchors) return; // nothing of the frame or its session is touched
    try {
      if (frame.session !== this.session) this.begin(frame.session);
      const job = this.inFrame;
      this.inFrame = null;
      job?.(frame, space);
      if (this.wait === null || this.anchor === null) return;
      const matrix = frame.getPose(this.anchor.anchorSpace, space)?.transform.matrix;
      // No pose this frame (the anchor is not tracked), or no usable one: the wait goes on until its time-out
      if (matrix !== undefined && isRigid(matrix)) this.endRestore(Array.from(matrix));
    } catch (error) {
      // A deleted anchor's space throws, and so does a frame read outside its own callback (WebXR)
      if (this.wait !== null) return this.endRestore(null, error);
      // No restore waits, so nothing was read: the frame or its session is not what it should be. Said once
      if (!this.hasLoggedFrameFailure) log.warn('room', 'anchor frame failed', error);
      this.hasLoggedFrameFailure = true;
    }
  }

  /**
   * False before a session's first `setFrame`, after its end, with the `noAnchors` flag, and in a session that
   * was not granted anchors or has no persistent ones.
   */
  supported(): boolean {
    const session = this.session;
    return (
      session !== null &&
      session.enabledFeatures?.includes('anchors') === true &&
      typeof session.restorePersistentAnchor === 'function'
    );
  }

  /**
   * The saved anchor's pose in the reference space of `setFrame` (FR-ROOM-07), read once, in the first frame in
   * which the anchor has a usable pose; a copy. null when unsupported, when the device refuses the handle, when
   * no pose has come after `timeoutMs`, when the session ends first, and when clear() or create() is called or
   * a create() is on its way. Never rejects. The time-out stands still while the session is hidden and starts
   * anew, in full, when it is seen again. Asking again for the same handle while it waits gives the same promise
   * and starts the time-out anew. The handle of the anchor a create() made in this session is read again with no
   * call to the device.
   */
  restore(handle: string, timeoutMs: number): Promise<Mat4 | null> {
    // Before anything else: a handle the store was told of is its own, and a later create() or clear() deletes it
    if (handle !== this.handle) {
      this.endRestore(null); // a wait for another anchor is over
      this.handle = handle;
      this.anchor = null;
      this.isAsked = false;
    }
    // While a create() is on its way the old anchor is being deleted: there is none to come back to
    if (!this.supported() || this.made !== null) return Promise.resolve(null);
    const session = this.session!;
    if (!this.isAsked) void this.ask(session, handle);
    const wait = (this.wait ??= this.startWait(session));
    wait.timeoutMs = timeoutMs;
    this.arm(session, wait);
    return wait.promise;
  }

  /**
   * Makes the one persistent anchor at `pose` (in the reference space of `setFrame`) and gives its handle
   * (FR-ROOM-07). The old anchor's delete is asked for first and not waited for; the new anchor is made inside
   * the next frame; with its handle in hand, every other persistent anchor of the site is deleted. null when
   * unsupported, when the pose is not rigid or is mirrored, when any step fails or the device keeps no more
   * anchors, after ANCHOR_CALL_TIMEOUT_MS, when the session ends first, and for a create() that a later create()
   * or clear() replaced. Never rejects.
   */
  create(pose: Mat4): Promise<string | null> {
    this.drop();
    if (!this.supported()) return Promise.resolve(null);
    const session = this.session!;
    const turn = this.turn;
    return new Promise((resolve) => {
      const timer = setTimeout(() => this.failCreate(turn, 'no answer in time'), ANCHOR_CALL_TIMEOUT_MS);
      this.made = (handle) => {
        clearTimeout(timer);
        resolve(handle);
      };
      void this.make(session, pose, turn);
    });
  }

  /**
   * Has the device delete our anchor, and ends a create() and a restore() that are on their way (both give
   * null). Resolves when the device has answered, at the latest after ANCHOR_CALL_TIMEOUT_MS. Never rejects.
   */
  clear(): Promise<void> {
    this.drop();
    return this.forget();
  }

  private begin(session: XRSession): void {
    this.end();
    this.session = session;
    session.addEventListener('end', () => {
      if (session === this.session) this.end();
    });
  }

  /** What was pending gives null. The handle is kept: the anchor is still ours on the device. */
  private end(): void {
    this.session = null;
    this.anchor = null;
    this.isAsked = false;
    this.endRestore(null);
    this.drop();
  }

  /** Asks the platform for the saved anchor. Its pose is read in a later frame, by `setFrame`. */
  private async ask(session: XRSession, handle: string): Promise<void> {
    this.isAsked = true;
    try {
      const anchor = await session.restorePersistentAnchor!(handle);
      // A restored anchor that nobody waits for any more is left alone: deleting it would end its tracking
      if (session === this.session && handle === this.handle) this.anchor = anchor;
    } catch (error) {
      if (session !== this.session || handle !== this.handle) return;
      this.isAsked = false;
      this.endRestore(null, error);
    }
  }

  /** A new wait. It follows the session's visibility until it ends: see `arm`. */
  private startWait(session: XRSession): Wait {
    let settle!: Wait['settle'];
    const promise = new Promise<Mat4 | null>((resolve) => (settle = resolve));
    const onVisibility = (): void => this.arm(session, wait);
    const unlisten = (): void => session.removeEventListener('visibilitychange', onVisibility);
    const wait: Wait = { promise, settle, timeoutMs: 0, timer: undefined, unlisten };
    session.addEventListener('visibilitychange', onVisibility);
    return wait;
  }

  /**
   * Starts the wait's time-out anew, in full. In a hidden session (the headset is off the head) it only stops
   * it: no frame comes then, so no pose can, and the saved place must not be given up for that.
   */
  private arm(session: XRSession, wait: Wait): void {
    clearTimeout(wait.timer);
    if (session.visibilityState === 'hidden') return;
    wait.timer = setTimeout(() => this.endRestore(null, 'no pose in time'), wait.timeoutMs);
  }

  /** `failure`: why no pose came, for the log. Without it the wait just ends (replaced, cleared, session over). */
  private endRestore(pose: Mat4 | null, failure?: unknown): void {
    const wait = this.wait;
    if (wait === null) return;
    this.wait = null;
    clearTimeout(wait.timer);
    wait.unlisten();
    if (failure !== undefined) log.warn('room', 'E_ANCHOR_RESTORE', failure);
    wait.settle(pose);
  }

  /** The steps of one create(). After each wait it may have been given up: then what arrived is deleted. */
  private async make(session: XRSession, pose: Mat4, turn: number): Promise<void> {
    let anchor: XRAnchor | undefined;
    try {
      const transform = transformOf(pose);
      // The old anchor first: its place among the site's anchors is asked free before the new handle is asked for
      void this.forget();
      anchor = await new Promise<XRAnchor>((resolve) => {
        // The call sits in an executor of its own: when it throws (no such method), that rejects here instead
        // of throwing into setFrame
        this.inFrame = (frame, space) =>
          resolve(new Promise((asked) => asked(frame.createAnchor!(transform, space))));
      });
      if (turn !== this.turn) return discard(anchor);
      const handle = await anchor.requestPersistentHandle!();
      // Given up meanwhile. If this delete is refused (the session has ended), the next create() sweeps it away
      if (turn !== this.turn) return void this.remove(session, handle);
      this.handle = handle;
      // The anchor is kept: a restore() of this handle later in the session reads its pose with no device call
      this.anchor = anchor;
      this.isAsked = true;
      this.answer(handle);
      this.sweep(session, handle);
    } catch (error) {
      if (anchor !== undefined) discard(anchor);
      this.failCreate(turn, error);
    }
  }

  private failCreate(turn: number, reason: unknown): void {
    if (turn !== this.turn) return;
    log.warn('room', 'anchor create failed', reason);
    this.drop();
  }

  /** Ends the create() on its way, if there is one: its caller gets null. */
  private drop(): void {
    this.turn++;
    this.inFrame = null;
    this.answer(null);
  }

  private answer(handle: string | null): void {
    const made = this.made;
    this.made = null;
    made?.(handle);
  }

  /**
   * Has the device delete our anchor, when a handle is known and the session has persistent anchors; a
   * restore() of it is over. Without such a session the handle is kept, for the next one that has them.
   */
  private forget(): Promise<void> {
    const handle = this.handle;
    if (handle === null || !this.supported()) return Promise.resolve();
    const session = this.session!;
    this.endRestore(null);
    this.handle = null;
    this.anchor = null;
    this.isAsked = false;
    return this.remove(session, handle);
  }

  /**
   * One anchor per site: every other persistent anchor of the site is a stray and is deleted (a handle lost
   * with the save, a delete the device refused, a handle that came after its session had ended, an anchor of
   * another page of the site). A browser that does not list its anchors keeps its strays.
   */
  private sweep(session: XRSession, own: string): void {
    const handles = session.persistentAnchors;
    if (!Array.isArray(handles)) return;
    for (const stray of handles) if (stray !== own) void this.remove(session, stray);
  }

  /** Never rejects. A handle the device does not know is the usual refusal: the restore failed for that reason. */
  private async remove(session: XRSession, handle: string): Promise<void> {
    let timer: Timer | undefined;
    try {
      await Promise.race([
        session.deletePersistentAnchor!(handle),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('no answer in time')), ANCHOR_CALL_TIMEOUT_MS);
        }),
      ]);
    } catch (error) {
      log.info('room', 'anchor delete failed', error);
    } finally {
      clearTimeout(timer);
    }
  }
}
