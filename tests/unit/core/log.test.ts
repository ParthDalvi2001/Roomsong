import { describe, expect, it, vi } from 'vitest';

import { LOG_RING_SIZE } from '../../../src/core/config.js';
import { createLogger } from '../../../src/core/log.js';

function fakeSink() {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('core/log', () => {
  it('in dev every level reaches the sink and the ring, with scope, message and data', () => {
    const sink = fakeSink();
    const log = createLogger(true, sink);
    const cause = new Error('x');
    log.debug('a', 'one');
    log.info('b', 'two');
    log.warn('c', 'three');
    log.error('room', 'E_PLACEMENT_TIMEOUT', cause);

    expect(sink.debug).toHaveBeenCalledWith('[a] one');
    expect(sink.info).toHaveBeenCalledWith('[b] two');
    expect(sink.warn).toHaveBeenCalledWith('[c] three');
    expect(sink.error).toHaveBeenCalledWith('[room] E_PLACEMENT_TIMEOUT', cause);
    expect(log.recent().map((e) => e.level)).toEqual(['debug', 'info', 'warn', 'error']);
    expect(log.recent()[3]).toEqual({
      level: 'error',
      scope: 'room',
      msg: 'E_PLACEMENT_TIMEOUT',
      data: cause,
    });
  });

  it('is quiet in production: debug and info go nowhere, warn and error still pass', () => {
    const sink = fakeSink();
    const log = createLogger(false, sink);
    log.debug('a', 'one');
    log.info('a', 'two');
    log.warn('a', 'three');
    log.error('a', 'four');

    expect(sink.debug).not.toHaveBeenCalled();
    expect(sink.info).not.toHaveBeenCalled();
    expect(sink.warn).toHaveBeenCalledTimes(1);
    expect(sink.error).toHaveBeenCalledTimes(1);
    expect(log.recent().map((e) => e.msg)).toEqual(['three', 'four']);
  });

  it('keeps only the last LOG_RING_SIZE entries, oldest first', () => {
    const log = createLogger(true, fakeSink());
    const total = LOG_RING_SIZE + 7;
    for (let i = 0; i < total; i++) log.info('n', String(i));

    const recent = log.recent();
    expect(recent).toHaveLength(LOG_RING_SIZE);
    expect(recent[0]?.msg).toBe('7');
    expect(recent[LOG_RING_SIZE - 1]?.msg).toBe(String(total - 1));
  });
});
