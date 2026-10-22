// The garden's state holder (API_SPEC §1.10, LLD §3.2): the one owner of GardenState. A plain class, not an
// ECS system: it has no per-frame work, and garden/ still loads no SDK code. It turns bus events and three
// calls into calls of the pure reducers, and every change into one garden:changed.
import { bus, clock, flags, log, settings } from '../core/index.js';

import {
  AUTOPLANT_CELL_STRIDE,
  DAILY_VOICES,
  LISTEN_MAX_MS,
  MS_PER_DAY,
  RINGS,
  STEPS,
  TIME_LAPSE_DAY_MS,
  UNDO_LIFE_MS,
} from './config.js';
import { applyVisit, newGarden } from './growth.js';
import {
  heightAfterPull,
  movePlant,
  plantSeed,
  removePlant,
  setAnchor,
  setBedHeightOffset,
  setHeight,
  undoRemove,
} from './rules.js';
import { roomSignature, WANDERER } from './signature.js';

import type { GardenState, RoomFeatures, RoomSignature, Seed, UndoToken } from './model.js';
import type { Clock, EventMap, Flags, Hand } from '../core/index.js';

type Release = EventMap['gesture:release'];
const NONE: readonly string[] = Object.freeze([]);
const LISTEN: EventMap['listen:enter'] = Object.freeze({});
const WOKEN: EventMap['listen:exit'] = Object.freeze({ timedOut: false });
const TIMED_OUT: EventMap['listen:exit'] = Object.freeze({ timedOut: true });

/** The ids of `from`'s plants that `other` does not have. */
const plantsNotIn = (from: GardenState, other: GardenState): string[] =>
  from.plants.filter((p) => !other.plants.some((q) => q.id === p.id)).map((p) => p.id);

/**
 * The time a new plant gets (T-161): garden time never runs backwards, so never before the last visit. A clock
 * that is not finite gives the last visit itself: a NaN would make the save's validator refuse the garden.
 */
function plantTime(clockNow: number, s: GardenState): number {
  return Number.isFinite(clockNow) ? Math.max(clockNow, s.lastVisitAt) : s.lastVisitAt;
}

export class GardenSystem {
  private current: GardenState | null = null;
  /** This session's signature; null outside a session and before its first room:features. */
  private signature: RoomSignature | null = null;
  /** This session's visit has been applied: no seed is handed out before (API_SPEC §1.10 rule 8). */
  private isVisited = false;
  /** The one seed that is out, and the hand that pinched it off the palm, if any has. */
  private out: { seedId: string; carrier: Hand | null } | null = null;
  /** The removed plants that can still come back, by plant id (FR-MUS-12). */
  private readonly undos = new Map<string, { token: UndoToken; expiresAt: number }>();
  /** newGarden() calls so far, and the count at each hand's latest gesture:pinchStart (BUG-006). */
  private generation = 0;
  private readonly pinchedIn = new Map<Hand, number>();
  /** How many of its own garden:changed emits are running. */
  private emitting = 0;
  /** Listen mode's 10-minute end, while Listen runs; null outside it (FR-HND-06/07, UX §3.5). */
  private listenEnd: ReturnType<typeof setTimeout> | null = null;
  /** The hand whose pinch ended Listen: that pinch is the wake, so its press on the orb does not enter again. */
  private wokeBy: Hand | null = null;
  /** T-174: the real garden, set aside while the time-lapse demo runs on a copy; null when it is off. */
  private real: GardenState | null = null;
  /** The demo's simulated days so far, in ms, and its timer; 0 and null when it is off. */
  private lapsedMs = 0;
  private lapse: ReturnType<typeof setInterval> | null = null;
  /** The session is hidden (xr:visibility): the demo passes no day meanwhile. */
  private isHidden = false;

  /** Subscribes to the bus, for the life of the page: made before any system, so its handlers run first. */
  constructor(
    private readonly appClock: Clock = clock,
    private readonly appFlags: Flags = flags,
  ) {
    // choice: the contract is silent on events before load(): there is no garden yet, so nothing happens
    const on = <K extends keyof EventMap>(
      type: K,
      handle: (s: GardenState, e: EventMap[K]) => void,
    ): void => {
      bus.on(type, (e) => {
        if (this.current !== null) handle(this.current, e);
      });
    };
    on('room:features', (s, e) => this.tune(s, e.features));
    on('xr:visibility', (_s, e) => {
      this.isHidden = !e.visible;
      // choice: a pause ends Listen; the return from it is to the garden, not to Listen
      if (e.visible) this.visit();
      else this.stopListen(WOKEN);
    });
    on('xr:sessionEnd', () => {
      this.stopListen(WOKEN);
      this.signature = null;
      this.isVisited = false;
      this.isHidden = false;
      this.takeBack('reset');
    });
    on('room:bedPlaced', (_s, e) => {
      if (!e.restored) this.changeBed((s) => setAnchor(s, null)); // a saved pair is stale
    });
    on('room:anchored', (_s, e) => this.changeBed((s) => setAnchor(s, { handle: e.handle, level: e.level })));
    on('gesture:palmUp', (s, e) => this.handOut(s, e.hand));
    // choice: LLD §3.2 lists no pinchStart for the garden, but without it "the seed that hand carried" (its
    // trackingLost row) cannot be told from a hand that held a plant; rule 8 names this event as the start
    on('gesture:pinchStart', (_s, e) => {
      if (this.listenEnd !== null) {
        this.wokeBy = e.hand; // FR-HND-07: any pinch wakes
        this.stopListen(WOKEN);
      }
      this.pinchedIn.set(e.hand, this.generation);
      if (this.out !== null && e.target?.kind === 'seed' && e.target.id === this.out.seedId) {
        this.out.carrier = e.hand; // the hand of the latest pinch on it
      }
    });
    on('gesture:release', (s, e) => this.release(s, e));
    on('gesture:trackingLost', (_s, e) => {
      if (this.out?.carrier === e.hand) this.takeBack('lost');
      if (this.wokeBy === e.hand) this.wokeBy = null; // that pinch ended with no release
    });
    on('gesture:palmsOut', () => this.startListen());
    on('gesture:wake', () => this.stopListen(WOKEN));
  }

  /** The garden; null before load(). A module follows garden:changed, this is for a late reader. */
  get state(): GardenState | null {
    return this.current;
  }

  /** The garden to save: `state`, or while the time-lapse demo runs the real garden it set aside (T-174). */
  get saved(): GardenState | null {
    return this.real ?? this.current;
  }

  /** The time-lapse demo runs (T-174). */
  get timeLapse(): boolean {
    return this.real !== null;
  }

  /**
   * T-174, D-057: the time-lapse demo. On: the garden is set aside and the session goes on with a copy, on which
   * a simulated day passes every TIME_LAPSE_DAY_MS through the visit real days use (garden:changed, garden:grown,
   * the daily seed). `saved` stays the real garden meanwhile. Off: the real garden is back as it was when the
   * demo started, and anything done in the demo is gone with it. Not a setting: off at every page load.
   */
  setTimeLapse(on: boolean): void {
    const s = this.current;
    if (s === null || on === this.timeLapse) return;
    if (on) {
      this.real = s; // a state is never mutated (API_SPEC §1.1): the reference is the copy
      this.lapse = setInterval(() => {
        if (!this.isVisited || this.isHidden) return; // no day before the session's visit, or while it is hidden
        this.lapsedMs += MS_PER_DAY;
        this.visit();
      }, TIME_LAPSE_DAY_MS);
      return;
    }
    const real = this.real ?? s;
    if (this.lapse !== null) clearInterval(this.lapse);
    this.lapse = this.real = null;
    this.lapsedMs = 0;
    this.undos.clear(); // a token of the demo's
    this.takeBack('reset'); // the seed out may be one the demo brought
    this.commit(real, plantsNotIn(real, s), plantsNotIn(s, real));
  }

  /** Once per page: the saved garden or a new one. Emits garden:changed, every plant id in `diff.added`. */
  load(state: GardenState): void {
    if (this.current !== null) {
      // choice: the contract says once per page and no more; the smaller answer to a second call is no
      log.warn('garden', 'load() was called twice: the second state is dropped');
      return;
    }
    const loaded = this.autoplanted(state);
    this.commit(
      loaded,
      loaded.plants.map((p) => p.id),
    );
    if (this.appFlags.timeLapse) this.setTimeLapse(true);
  }

  /**
   * FR-PER-03: a new garden in place of this one; the caller has done the two-step confirm. Its starter seeds
   * come at once when the session has its signature, else with that session's visit.
   */
  newGarden(): void {
    const old = this.current;
    if (old === null) return;
    this.generation++;
    this.undos.clear(); // no petal may bring a plant of the old garden into the new one
    this.takeBack('reset');
    // choice: LLD §3.2 carries over the anchor pair only, but API_SPEC §1.10 says "the bed and its anchor
    // pair stay" and LLD §3.3 K "the bed stays where it is": the bed's height offset is carried over too
    let made = setBedHeightOffset(newGarden(this.appClock.now(), settings.get()), old.bedHeightOffset);
    if (old.anchorHandle !== undefined && old.anchorLevel !== undefined) {
      made = setAnchor(made, { handle: old.anchorHandle, level: old.anchorLevel });
    }
    this.commit(
      made,
      NONE,
      old.plants.map((p) => p.id),
    );
    this.visit();
  }

  /** FR-UI-10: raises or lowers the bed, in metres, clamped by the reducer. */
  setBedHeightOffset(metres: number): void {
    this.changeBed((s) => setBedHeightOffset(s, metres));
  }

  /**
   * A change to the bed (its anchor pair, its height): while the time-lapse demo runs it reaches the real garden
   * too, so that it is saved and the next launch finds the bed where it is (T-174).
   */
  private changeBed(reduce: (s: GardenState) => GardenState): void {
    if (this.real !== null) this.real = reduce(this.real);
    if (this.current !== null) this.commit(reduce(this.current));
  }

  /** Replaces the state, then says so. A reducer that changed nothing returned the same state: no event. */
  private commit(next: GardenState, added = NONE, removed = NONE, changed = NONE): void {
    if (next === this.current) return;
    // Known limit, no queue: a change made by a garden:changed handler is applied, but the handlers after
    // that one get this event before the one that is still being told (API_SPEC §1.10 rule 6).
    if (this.emitting > 0) log.error('garden', 'the garden was changed from inside a garden:changed handler');
    this.current = next;
    this.emitting++;
    bus.emit('garden:changed', { state: next, diff: { added, removed, changed } });
    this.emitting--;
  }

  /** FR-ROOM-11: a signature per room:features; the visit only at a session's first one, not at Re-place. */
  private tune(s: GardenState, features: RoomFeatures): void {
    const isFirst = this.signature === null;
    const signature = this.appFlags.forceSignature === null ? roomSignature(features) : WANDERER;
    this.signature = signature;
    bus.emit('room:signature', { signature, starterSeeds: s.visits === 0 });
    if (isFirst) this.visit();
  }

  /** One visit with the session's signature (FR-MUS-08, FR-MUS-09). Nothing before the session has one. */
  private visit(): void {
    const s = this.current;
    if (s === null || this.signature === null) return;
    const now = this.appClock.now() + this.lapsedMs;
    const { state, grown, newSeeds } = applyVisit(s, now, this.signature, new Date(now).getTimezoneOffset());
    if (state === s) {
      // choice: "applied" (the palm-up row) is read strictly, so a refused visit hands out no seed either
      log.warn('garden', 'the visit was refused: no seeds until one is applied', { now });
      return;
    }
    this.isVisited = true;
    this.commit(state);
    if (grown.length > 0) bus.emit('garden:grown', { deltas: grown });
    for (const seed of newSeeds) bus.emit('garden:seedArrived', { seed });
  }

  /** FR-HND-05: the first seed of the supply rests on that hand, and stays in the supply until planted. */
  private handOut(s: GardenState, hand: Hand): void {
    const seed = s.seeds[0];
    if (this.listenEnd !== null) return; // PRD §3.4: in Listen nothing but the wake is taken
    if (!this.isVisited || this.out !== null || seed === undefined) return;
    this.out = { seedId: seed.id, carrier: null };
    // BUG-006's check reads the hand's latest pinchStart; a seed planted with none (the gaze, T-160) must not meet
    // a pinch from before a New garden.
    this.pinchedIn.delete(hand);
    bus.emit('garden:seedOut', { seed, hand });
  }

  /** The seed that is out is in the supply again: it never left `state.seeds`, so only the hand lets go. */
  private takeBack(reason: EventMap['garden:seedBack']['reason']): void {
    const out = this.out;
    if (out === null) return;
    this.out = null;
    bus.emit('garden:seedBack', { seedId: out.seedId, reason });
  }

  /** The one event that commits (FR-HND-16), by its `gesture`: the table of API_SPEC §1.4. */
  private release(s: GardenState, e: Release): void {
    const isWake = this.wokeBy === e.hand;
    if (isWake) this.wokeBy = null;
    const target = e.target;
    if (target === null) return; // a cancelled press, or a pinch on nothing
    // PRD §3.4: the pinch that woke Listen is the wake and nothing else. choice: a carried seed is still let go
    // as usual, so it never stays on a hand that nothing will release it from.
    if (isWake && e.gesture !== 'carry') return;
    if (e.gesture === 'carry') this.plant(s, target.id, e);
    else if (e.gesture === 'drag') this.drop(s, target.id, e);
    else if (e.gesture === 'pull') this.pull(s, target.id, e.dy);
    else if (e.gesture === 'press') this.press(s, target);
  }

  /** A press let go over what it pressed: the undo petal undoes, the Listen orb listens (API_SPEC §1.4). */
  private press(s: GardenState, target: NonNullable<Release['target']>): void {
    if (target.kind === 'undo') this.undo(s, target.id);
    else if (target.kind === 'orb') this.startListen();
  }

  /**
   * FR-HND-06, the orb's press (API_SPEC §1.4): Listen starts, and ends by itself after LISTEN_MAX_MS. Not
   * before the session's visit: there is no garden to listen to while the room is still being found.
   */
  private startListen(): void {
    if (this.listenEnd !== null || !this.isVisited) return;
    this.listenEnd = setTimeout(() => this.stopListen(TIMED_OUT), LISTEN_MAX_MS);
    bus.emit('listen:enter', LISTEN);
  }

  /** FR-HND-07 and the 10-minute end: Listen stops, once. */
  private stopListen(how: EventMap['listen:exit']): void {
    if (this.listenEnd === null) return;
    clearTimeout(this.listenEnd);
    this.listenEnd = null;
    bus.emit('listen:exit', how);
  }

  private plant(s: GardenState, seedId: string, e: Release): void {
    // choice: the carry row does not say what a seed that is not out does; here only the one out is planted
    // or sent back. A pinch begun before New garden plants nothing (BUG-006): the new starters have the old ids
    const pinchedIn = this.pinchedIn.get(e.hand) ?? this.generation;
    if (this.out?.seedId !== seedId || pinchedIn !== this.generation) return;
    const now = plantTime(this.appClock.now(), s);
    const planted = e.cell === null ? null : plantSeed(s, seedId, e.cell, now);
    if (!planted?.ok) {
      this.takeBack(e.zone === 'bed' ? 'full' : 'offBed');
      return;
    }
    this.out = null;
    this.commit(planted.value, [seedId]);
  }

  /** A dragged plant: moved on the bed, removed beyond it; in the inner zone render puts it back. */
  private drop(s: GardenState, plantId: string, e: Release): void {
    if (e.zone === 'outer') {
      this.remove(s, plantId);
    } else if (e.zone === 'bed' && e.cell !== null) {
      const moved = movePlant(s, plantId, e.cell);
      if (moved.ok) this.commit(moved.value, NONE, NONE, [plantId]);
    }
  }

  /** FR-HND-11, FR-MUS-12: the plant goes, and its token is kept for UNDO_LIFE_MS. */
  private remove(s: GardenState, plantId: string): void {
    const removed = removePlant(s, plantId);
    if (!removed.ok) return;
    const now = this.appClock.now();
    // No timer: a token that ran out is swept here, at the next removal.
    for (const [id, kept] of this.undos) if (now > kept.expiresAt) this.undos.delete(id);
    const undoToken = removed.value.undo;
    // With a clock that is not finite the life counts from the last visit: a NaN here would never run out.
    const expiresAt = (Number.isFinite(now) ? now : s.lastVisitAt) + UNDO_LIFE_MS;
    this.undos.set(plantId, { token: undoToken, expiresAt });
    this.commit(removed.value.state, NONE, [plantId]);
    bus.emit('garden:removed', { plantId, undoToken, expiresAt });
  }

  private pull(s: GardenState, plantId: string, dy: number | null): void {
    const plant = s.plants.find((p) => p.id === plantId);
    if (plant === undefined || dy === null) return;
    this.commit(setHeight(s, plantId, heightAfterPull(plant.height, dy)), NONE, NONE, [plantId]);
  }

  /** A press on the undo petal: the token's life is checked now, and the token is dropped either way. */
  private undo(s: GardenState, plantId: string): void {
    const kept = this.undos.get(plantId);
    this.undos.delete(plantId);
    if (kept === undefined || this.appClock.now() > kept.expiresAt) return;
    this.commit(undoRemove(s, kept.token), [plantId]);
  }

  /**
   * The autoplant flag (API_SPEC §3): N plants of its own, only into a garden with none, so that a reload
   * adds no more. Plant n: id `auto-<n>`, the Must voices in turn, hue n / N, cell (flags.seed + 7n) mod 80.
   */
  private autoplanted(state: GardenState): GardenState {
    const count = this.appFlags.autoplant;
    if (count <= 0 || state.plants.length > 0) return state;
    // choice: the contract gives the autoplanted plants no time; they get the one a carried seed gets
    const now = plantTime(this.appClock.now(), state);
    let s = state;
    for (let n = 0; n < count; n++) {
      const voice = DAILY_VOICES[n % DAILY_VOICES.length] ?? DAILY_VOICES[0];
      const seed: Seed = { id: `auto-${n}`, voice, hue: n / count, receivedAt: now };
      const index = ((this.appFlags.seed ?? 0) + AUTOPLANT_CELL_STRIDE * n) % (RINGS * STEPS);
      const cell = { ring: Math.floor(index / STEPS), step: index % STEPS };
      const planted = plantSeed({ ...s, seeds: [...s.seeds, seed] }, seed.id, cell, now);
      if (planted.ok) s = planted.value;
    }
    return s;
  }
}
