// The one audio file that loads core/ and the SDK at run time: it makes the engine and wires it to the events
// core declares (API_SPEC §2) and to Listen mode (T-148), and GardenAudioSystem (T-128d) wires it to the garden,
// the room, the bed and the frame, and plays the UI sounds of the garden's events (T-164 §6). garden:grown has
// no sound yet.
import { createSystem, Types, type Entity } from '@iwsdk/core';

import { BedAnchor } from '../core/components.js';
import { bus, clock, flags, log, MS_PER_DAY, settings } from '../core/index.js';

import { Engine, type AudioEngine } from './AudioEngine.js';
import { MS_PER_MINUTE } from './config.js';
import { APP_STYLE } from './styles.js';

import type { EventMap, Settings } from '../core/index.js';
import type { Plant } from '../garden/index.js';

const NO_PLANTS: readonly Plant[] = Object.freeze([]);

/** The app's audio engine, following the user's settings and the session. Call it once; `init()` it in the Enter gesture. */
export function createAudioEngine(): AudioEngine {
  // The counter-line's and the variations' draws (T-164 §1.7, §1.8, FR-MUS-11): the local day's number, so each day
  // plays its own and a day plays the same in every session (fakeDay moves it through the clock); `seed` (API_SPEC
  // §3, dev only) fixes them for a test.
  const now = clock.now();
  const day = Math.floor((now - new Date(now).getTimezoneOffset() * MS_PER_MINUTE) / MS_PER_DAY); // as garden's localDay
  const engine = new Engine(flags.seed ?? day);
  engine.setStyle(APP_STYLE); // before init(): the graph is built in it (D-060 (5))

  const applySettings = (s: Readonly<Settings>): void => {
    engine.setTempo(s.tempo);
    engine.setVolume(s.volume);
    engine.setReverb(s.reverb);
    engine.setMono(s.mono);
  };
  applySettings(settings.get());
  bus.on('settings:changed', (payload) => applySettings(payload.settings));

  // Session start, session end, and the session or the page becoming visible or hidden: all three carry `visible`.
  // Resumed when seen (NFR-PERF-10), faded out and suspended when not (FR-SYS-05).
  const onVisibility = ({ visible }: EventMap['xr:visibility']): void => {
    (visible ? engine.resume() : engine.suspend()).catch((err: unknown) =>
      log.error('audio', 'E_AUDIO_CONTEXT', err),
    );
  };
  bus.on('xr:sessionStart', onVisibility);
  bus.on('xr:sessionEnd', onVisibility);
  bus.on('xr:visibility', onVisibility);

  // Listen mode (T-148): the nearest plants forward while it lasts, and the ending chord when it ran its time.
  bus.on('listen:enter', () => engine.enterListen());
  bus.on('listen:exit', ({ timedOut }) => {
    engine.exitListen();
    if (timedOut) engine.ui('goodnight');
  });
  // P-016 (T-173): a still head facing the bed opens the garden; the gazed plant comes forward.
  bus.on('stillness:changed', ({ isOpen, plantId }) => engine.setStillness(isOpen, plantId));

  return engine;
}

/**
 * The engine in the frame and on the garden's events (LLD §3.2, priority 40; API_SPEC §1.10 rules 4 and 11).
 * configData `engine`. Not named AudioSystem: IWSDK registers a system of that name. Nothing is synced before
 * the session's `room:signature`: the engine's own tuning is C major pentatonic, and a restored garden must not
 * be heard in it first. From the signature on, the plants follow every `garden:changed` and `room:bedPlaced`
 * (the engine diffs); a bed moved with no event (an anchor re-read after a recentre or a pause) is synced when
 * its `matrixWorld` differs from the pose of the last sync. Each frame the listener is the head. A seed planted
 * sounds at once (P-012): the sync, then `ui('placed', id)`.
 */
export class GardenAudioSystem extends createSystem(
  { beds: { required: [BedAnchor] } },
  { engine: { type: Types.Object, default: null } },
) {
  private engine!: AudioEngine;
  private plants: readonly Plant[] = NO_PLANTS;
  /** The bed: the entity that carries BedAnchor, while one does (rule 5). */
  private bed: Entity | null = null;
  /** The bed's pose at the last sync. Kept: at xr:sessionEnd BedAnchor has already gone. */
  private readonly syncedPose = new Float64Array(16);
  /** This session has its signature. */
  private isTuned = false;
  /**
   * §6: a bed landed and its chord waits for the `room:signature` that follows a placement in the same chain
   * (RoomSystem.settle → features → GardenSystem.tune): the re-tune releases every note, so a chord played at
   * `room:bedPlaced` would be dropped whenever the key changes (every first placement outside the Wanderer).
   */
  private chordDue = false;
  /** The id of the seed on a hand (garden:seedOut), until it is planted or goes back; null for none. */
  private outSeed: string | null = null;
  /** Plants removed this session and not undone: one of them added again is an undo (§6 `undoFwd`). */
  private readonly removed = new Set<string>();
  /** Per hand (left 0, right 2) the ring and step a carried seed or dragged plant would land in; −1 = none. */
  private readonly hoverCell = new Int16Array(4).fill(-1);

  override init(): void {
    this.engine = this.config.engine.value as AudioEngine;
    const { beds } = this.queries;
    this.cleanupFuncs.push(
      // `true`: a bed placed before this system was registered counts too
      beds.subscribe('qualify', (entity) => void (this.bed = entity), true),
      beds.subscribe('disqualify', (entity) => {
        if (this.bed === entity) this.bed = null; // Re-place: the garden sounds from its old place meanwhile
      }),
      bus.on('room:signature', ({ signature }) => {
        this.engine.setSignature(signature); // tuned first, then the plants: none is heard in the old key
        this.isTuned = true;
        this.sync();
        if (this.chordDue) {
          this.chordDue = false;
          this.engine.ui('confirm'); // the bed landed (§6): its chord, in the new key, after the re-tune
        }
      }),
      bus.on('garden:seedOut', ({ seed }) => void (this.outSeed = seed.id)),
      bus.on('garden:changed', ({ state, diff }) => {
        this.plants = state.plants;
        // P-012: the seed on the hand became a plant (it keeps the seed's id, D-031). A load and an undo add
        // plants too, with no seed out.
        const planted = this.outSeed !== null && diff.added.includes(this.outSeed) ? this.outSeed : null;
        if (planted !== null) this.outSeed = null;
        if (!this.isTuned) return;
        this.sync();
        if (planted !== null) this.engine.ui('placed', planted);
        else if (this.removed.size > 0) {
          // §6: a removed plant back by its undo petal
          for (let i = 0; i < diff.added.length; i++)
            if (this.removed.delete(diff.added[i] as string)) this.engine.ui('undoFwd');
        }
      }),
      bus.on('garden:removed', ({ plantId }) => {
        this.removed.add(plantId);
        this.engine.ui('removeRev');
      }),
      // §6: a carried seed or a dragged plant (target null) ticks at each new cell it would land in. Not with the
      // gaze mode on (FR-HND-12): the gaze crosses a cell at every head sweep, and its dwell ring is the cue there.
      bus.on('target:hover', ({ hand, target, cell }) => {
        const i = hand === 'left' ? 0 : 2;
        const kept = this.hoverCell;
        const ring = cell === null || target !== null ? -1 : cell.ring;
        const step = cell === null || target !== null ? -1 : cell.step;
        if (ring !== -1 && (ring !== kept[i] || step !== kept[i + 1]) && !settings.get().gazeDwell)
          this.engine.ui('tick');
        kept[i] = ring;
        kept[i + 1] = step;
      }),
      // §6: the bed landed (a restore too): its chord, from the bed, once the signature that follows has tuned the
      // engine (chordDue). Before the signature the engine gets the bed with no plant, so the chord is at the bed
      // and no restored plant is heard in the engine's default key.
      bus.on('room:bedPlaced', () => {
        this.sync();
        this.chordDue = true;
      }),
      // The next session must not start with this one's plants at this one's place.
      bus.on('xr:sessionEnd', () => {
        this.isTuned = false;
        this.chordDue = false;
        this.removed.clear();
        this.engine.syncPlants(NO_PLANTS, this.syncedPose);
      }),
      bus.on('garden:seedBack', ({ reason }) => {
        this.outSeed = null;
        // UX §7, §6: a seed let go off the bed or over a full bed, or whose hand was lost; a reset is no sound
        if (reason !== 'reset') this.engine.ui('bump');
      }),
    );
  }

  override update(): void {
    // The head, as every system takes it (LLD §3.2): the camera gets the pose only when the frame is rendered.
    const head = this.xrManager.isPresenting ? this.player.head : this.camera;
    this.engine.setListenerPose(head.matrixWorld.elements);
    const pose = this.bed?.object3D?.matrixWorld.elements;
    if (this.isTuned && pose !== undefined && !isSamePose(pose, this.syncedPose)) this.sync();
  }

  /** The plants to the engine at the bed's pose: on a change only. Before the signature: the pose, no plant. */
  private sync(): void {
    const pose = this.bed?.object3D?.matrixWorld.elements;
    if (pose !== undefined) this.syncedPose.set(pose);
    this.engine.syncPlants(this.isTuned ? this.plants : NO_PLANTS, this.syncedPose);
  }
}

/** The 16 numbers of a pose against a kept copy: no allocation. */
function isSamePose(now: ArrayLike<number>, kept: Float64Array): boolean {
  for (let i = 0; i < 16; i++) if (now[i] !== kept[i]) return false;
  return true;
}
