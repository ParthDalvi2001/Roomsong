// Levelled logger (CODING_GUIDELINES §7): the only place that touches `console`.
import { LOG_RING_SIZE } from './config.js';
import { flags } from './flags.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** API_SPEC §5. An expected failure is logged with its code as the message: `log.error('room', 'E_PLACEMENT_TIMEOUT', err)`. */
export type ErrorCode =
  | 'E_XR_UNSUPPORTED'
  | 'E_HANDS_UNAVAILABLE'
  | 'E_PLACEMENT_TIMEOUT'
  | 'E_ANCHOR_RESTORE'
  | 'E_SAVE_FAILED'
  | 'E_AUDIO_CONTEXT';

export interface LogEntry {
  level: LogLevel;
  scope: string;
  msg: string;
  data: unknown;
}

/** Where lines go. `console` satisfies it. */
export type LogSink = Record<LogLevel, (...args: unknown[]) => void>;

type LogFn = (scope: string, msg: string, data?: unknown) => void;
export interface Logger extends Record<LogLevel, LogFn> {
  /** The last LOG_RING_SIZE entries that were let through, oldest first. A new array: not for a hot path. */
  recent(): LogEntry[];
}

/** `dev` false (a production build without `dev=1`): debug and info are dropped before any work; warn and error pass. */
export function createLogger(dev: boolean, sink: LogSink = console): Logger {
  const ring: LogEntry[] = [];
  let next = 0; // the slot the next entry overwrites once the ring is full

  function write(level: LogLevel, scope: string, msg: string, data: unknown): void {
    ring[next] = { level, scope, msg, data };
    next = (next + 1) % LOG_RING_SIZE;
    if (data === undefined) sink[level](`[${scope}] ${msg}`);
    else sink[level](`[${scope}] ${msg}`, data);
  }
  const quiet: LogFn = () => {};

  return {
    debug: dev ? (scope, msg, data) => write('debug', scope, msg, data) : quiet,
    info: dev ? (scope, msg, data) => write('info', scope, msg, data) : quiet,
    warn: (scope, msg, data) => write('warn', scope, msg, data),
    error: (scope, msg, data) => write('error', scope, msg, data),
    recent: () =>
      ring.length < LOG_RING_SIZE ? ring.slice() : [...ring.slice(next), ...ring.slice(0, next)],
  };
}

export const log: Logger = createLogger(flags.dev);
