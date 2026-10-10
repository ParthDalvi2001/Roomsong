// The event bus (API_SPEC §2): typed, synchronous, and allocation-free on emit.
import { flags, type Flags } from './flags.js';
import { log } from './log.js';

import type { Settings } from './settings.js';

/**
 * The events declared in core/ (the `xr:*` ones are emitted by `src/index.ts`). Every other module adds the
 * events it emits by declaration merging in its own `events.ts`, a file like this one:
 *
 *     import type { Hand } from '../core/index.js'; // an import, or `export {}`, makes the file a module;
 *                                                    // without one the block does not compile
 *     declare module '../core/index.js' {
 *       interface EventMap {
 *         'hands:lost': { hand: Hand };
 *         'listen:enter': Record<string, never>; // an empty payload; emit it with `{}`
 *       }
 *     }
 */
export interface EventMap {
  'xr:sessionStart': { visible: boolean };
  'xr:sessionEnd': { visible: boolean };
  'xr:visibility': { visible: boolean };
  'settings:changed': { settings: Readonly<Settings> };
}

export type EventName = keyof EventMap;
export type EventHandler<K extends EventName> = (payload: EventMap[K]) => void;

/** `on`, `once` and `off` allocate (a closure, array growth, a splice): call them at set-up, never per frame. */
export interface EventBus {
  /**
   * Subscribes and returns the unsubscribe. One function is one subscription per event, as with
   * addEventListener: subscribing it again (by `on` or `once`) changes nothing, and one `off` removes it.
   */
  on<K extends EventName>(type: K, handler: EventHandler<K>): () => void;
  /** Like `on`, but the handler is removed just before its first call. */
  once<K extends EventName>(type: K, handler: EventHandler<K>): () => void;
  off<K extends EventName>(type: K, handler: EventHandler<K>): void;
  /**
   * Calls every handler in subscription order, synchronously. During an emit:
   * a handler removed before its turn is not called; a handler added is first called by the next emit;
   * a handler that throws is logged and the rest still run. Emitting from inside a handler is allowed.
   * Allocates nothing: the payload is the caller's own object, handed through (events.test.ts counts the GCs).
   * With the `eventLog` flag every emit is logged at debug level, and that does allocate.
   */
  emit<K extends EventName>(type: K, payload: EventMap[K]): void;
}

type Stored = (payload: unknown) => void;
interface Listeners {
  fns: (Stored | null)[]; // null = removed while an emit was running; swept when the outermost emit ends
  once: boolean[];
  emitting: number; // depth of running emits
  holes: boolean;
}

function sweep(l: Listeners): void {
  let kept = 0;
  for (let i = 0; i < l.fns.length; i++) {
    const fn = l.fns[i];
    if (fn == null) continue;
    l.fns[kept] = fn;
    l.once[kept] = l.once[i] === true;
    kept++;
  }
  l.fns.length = kept;
  l.once.length = kept;
  l.holes = false;
}

export function createEventBus(busFlags: Flags = flags): EventBus {
  const all = new Map<EventName, Listeners>();

  function remove(type: EventName, fn: Stored): void {
    const l = all.get(type);
    const i = l === undefined ? -1 : l.fns.indexOf(fn);
    if (l === undefined || i < 0) return;
    if (l.emitting > 0) {
      l.fns[i] = null; // the running loop keeps its indices
      l.holes = true;
      return;
    }
    l.fns.splice(i, 1);
    l.once.splice(i, 1);
  }

  function add(type: EventName, fn: Stored, once: boolean): () => void {
    let l = all.get(type);
    if (l === undefined) {
      l = { fns: [], once: [], emitting: 0, holes: false };
      all.set(type, l);
    }
    if (!l.fns.includes(fn)) {
      l.fns.push(fn);
      l.once.push(once);
    }
    return () => remove(type, fn);
  }

  return {
    on: (type, handler) => add(type, handler as Stored, false),
    once: (type, handler) => add(type, handler as Stored, true),
    off: (type, handler) => remove(type, handler as Stored),
    emit(type, payload) {
      if (busFlags.eventLog) log.debug('events', type, payload);
      const l = all.get(type);
      if (l === undefined) return;
      const count = l.fns.length; // handlers added from here on wait for the next emit
      l.emitting++;
      for (let i = 0; i < count; i++) {
        const fn = l.fns[i];
        if (fn == null) continue;
        if (l.once[i] === true) {
          l.fns[i] = null;
          l.holes = true;
        }
        try {
          fn(payload);
        } catch (error) {
          log.error('events', `a handler of ${type} threw`, error);
        }
      }
      l.emitting--;
      if (l.emitting === 0 && l.holes) sweep(l);
    },
  };
}

/** The one bus of the app. */
export const bus: EventBus = createEventBus();
