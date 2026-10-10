import { GCProfiler } from 'node:v8';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createEventBus } from '../../../src/core/events.js';
import { DEFAULT_FLAGS } from '../../../src/core/flags.js';
import { log } from '../../../src/core/log.js';

import type { EventMap } from '../../../src/core/index.js';

// Test-only events, added the way every other module adds its own (API_SPEC §2): by merging into core's EventMap
// through core's index. `tsc --noEmit` (npm run typecheck) compiles this file under the repo's strict options.
declare module '../../../src/core/index.js' {
  interface EventMap {
    'test:merged': { n: number };
    'test:empty': Record<string, never>;
  }
}

const VISIBLE = { visible: true };

/** Garbage collections V8 ran while `run` did. Synchronous and exact: no timer, no `--expose-gc`. */
function gcsDuring(run: () => void): number {
  const profiler = new GCProfiler();
  profiler.start();
  run();
  return profiler.stop()?.statistics.length ?? Number.NaN;
}

afterEach(() => vi.restoreAllMocks());

describe('core/events', () => {
  it('emit with zero handlers does nothing', () => {
    const bus = createEventBus();
    expect(() => bus.emit('xr:visibility', VISIBLE)).not.toThrow();
    bus.on('xr:sessionStart', () => {})();
    expect(() => bus.emit('xr:sessionStart', VISIBLE)).not.toThrow();
  });

  it('emit with one handler passes the caller’s payload object through, synchronously', () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.on('xr:visibility', handler);
    bus.emit('xr:visibility', VISIBLE);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0]).toBe(VISIBLE);
  });

  it('emit with many handlers calls them in subscription order, and only those of that event', () => {
    const bus = createEventBus();
    const calls: string[] = [];
    bus.on('xr:visibility', () => calls.push('a'));
    bus.on('xr:visibility', () => calls.push('b'));
    bus.on('xr:sessionEnd', () => calls.push('other'));
    bus.on('xr:visibility', () => calls.push('c'));
    bus.emit('xr:visibility', VISIBLE);
    expect(calls).toEqual(['a', 'b', 'c']);
  });

  it('off and the returned unsubscribe both remove a handler; removing twice is harmless', () => {
    const bus = createEventBus();
    const a = vi.fn();
    const b = vi.fn();
    const offA = bus.on('xr:visibility', a);
    bus.on('xr:visibility', b);
    offA();
    offA();
    bus.off('xr:visibility', b);
    bus.off('xr:visibility', b);
    bus.emit('xr:visibility', VISIBLE);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('registers a handler at most once per event', () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.on('xr:visibility', handler);
    bus.on('xr:visibility', handler);
    bus.emit('xr:visibility', VISIBLE);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('once fires one time, even when the handler emits the same event again', () => {
    const bus = createEventBus();
    const handler = vi.fn(() => bus.emit('xr:visibility', VISIBLE));
    const cancelled = vi.fn();
    bus.once('xr:visibility', handler);
    bus.once('xr:visibility', cancelled)();
    bus.emit('xr:visibility', VISIBLE);
    bus.emit('xr:visibility', VISIBLE);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(cancelled).not.toHaveBeenCalled();
  });

  it('unsubscribe during emit: itself, a later handler (skipped) and an earlier one (gone next time)', () => {
    const bus = createEventBus();
    const calls: string[] = [];
    const first = (): number => calls.push('first');
    const later = (): number => calls.push('later');
    bus.on('xr:visibility', first);
    const offSelf = bus.on('xr:visibility', () => {
      calls.push('self');
      offSelf();
      bus.off('xr:visibility', later);
      bus.off('xr:visibility', first);
    });
    bus.on('xr:visibility', later);
    bus.on('xr:visibility', () => calls.push('last'));

    bus.emit('xr:visibility', VISIBLE);
    expect(calls).toEqual(['first', 'self', 'last']);
    bus.emit('xr:visibility', VISIBLE);
    expect(calls).toEqual(['first', 'self', 'last', 'last']);
  });

  it('a handler subscribed during an emit is first called by the next emit', () => {
    const bus = createEventBus();
    const added = vi.fn();
    bus.once('xr:visibility', () => bus.on('xr:visibility', added));
    bus.emit('xr:visibility', VISIBLE);
    expect(added).not.toHaveBeenCalled();
    bus.emit('xr:visibility', VISIBLE);
    expect(added).toHaveBeenCalledTimes(1);
  });

  it('a handler that throws is logged and does not stop the others', () => {
    const error = vi.spyOn(log, 'error').mockImplementation(() => {});
    const bus = createEventBus();
    const boom = new Error('boom');
    const after = vi.fn();
    bus.on('xr:visibility', () => {
      throw boom;
    });
    bus.on('xr:visibility', after);
    expect(() => bus.emit('xr:visibility', VISIBLE)).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('events', expect.stringContaining('xr:visibility'), boom);
    // The bus is still usable: the throw did not leave it "emitting".
    bus.off('xr:visibility', after);
    bus.emit('xr:visibility', VISIBLE);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('emit does not allocate: a million emits to 8 handlers trigger no garbage collection', () => {
    const ROUNDS = 1_000_000;
    const bus = createEventBus();
    let calls = 0;
    for (let i = 0; i < 8; i++) {
      bus.on('xr:visibility', (payload) => {
        if (payload.visible) calls++;
      });
    }
    const emitAll = (): void => {
      for (let i = 0; i < ROUNDS; i++) bus.emit('xr:visibility', VISIBLE);
    };
    let kept: unknown = null;
    const allocateAll = (): void => {
      for (let i = 0; i < ROUNDS; i++) kept = { i };
    };
    emitAll(); // warm up: the JIT's own allocations happen here

    // The control shows the probe works: one small object per round is already several collections
    // (7 or 8 when this was written; emit: 0 in every round).
    expect(gcsDuring(allocateAll)).toBeGreaterThanOrEqual(3);
    // The least of three rounds: a collection that was already due when a round began can hit one of them only.
    expect(Math.min(gcsDuring(emitAll), gcsDuring(emitAll), gcsDuring(emitAll))).toBe(0);
    expect(calls).toBe(4 * 8 * ROUNDS);
    expect(kept).toEqual({ i: ROUNDS - 1 });
  });

  it('with the eventLog flag every emit is logged at debug level; without it, none is', () => {
    const debug = vi.spyOn(log, 'debug').mockImplementation(() => {});
    createEventBus(DEFAULT_FLAGS).emit('xr:visibility', VISIBLE);
    expect(debug).not.toHaveBeenCalled();
    createEventBus({ ...DEFAULT_FLAGS, eventLog: true }).emit('xr:visibility', VISIBLE);
    expect(debug).toHaveBeenCalledWith('events', 'xr:visibility', VISIBLE);
  });

  it('carries an event another module merged into EventMap, fully typed', () => {
    const bus = createEventBus();
    let seen = 0;
    bus.on('test:merged', (payload) => {
      seen = payload.n; // payload is { n: number }, not unknown: this line would not compile otherwise
    });
    const payload: EventMap['test:merged'] = { n: 7 };
    bus.emit('test:merged', payload);
    bus.emit('test:empty', {});
    expect(seen).toBe(7);

    const neverRun = (): void => {
      // @ts-expect-error a wrong payload shape does not compile
      bus.emit('test:merged', { n: 'seven' });
      // @ts-expect-error an event nobody declared does not compile
      bus.emit('test:unknown', {});
      bus.on('xr:visibility', (p) => {
        // @ts-expect-error a handler cannot read a field the payload does not have
        void p.missing;
      });
    };
    expect(neverRun).toBeTypeOf('function');
  });
});
