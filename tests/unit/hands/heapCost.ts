// The heap probe of the hands tests (CODING_GUIDELINES §5: hot paths create nothing).
import { GCProfiler, getHeapStatistics, setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

/** What the probe itself costs (about 0.7 kB on Node 24.14), with room. Growth below this is "nothing". */
export const PROBE_BYTES = 4096;

// A collection on demand, without `node --expose-gc`: the flag can be set at run time, and a fresh context made
// after it has `gc`. Vitest's workers run with no flags of their own. A minor one (the young generation only): a
// full one frees what V8 then makes again on the next run, about 40 kB, and the round would be charged with it.
setFlagsFromString('--expose-gc');
const gc = runInNewContext('gc') as (options: { type: 'minor' }) => void;
const collect = (): void => gc({ type: 'minor' });

/**
 * What `run` cost the heap: the collections V8 ran (as in tests/unit/core/events.test.ts) and the bytes the heap
 * grew by. With no collection the growth is exact, so one small object per round shows in one number or the other.
 * The young generation is emptied first, so the set-up's garbage does not fill it and tip a scavenge inside `run`:
 * a collection inside `run` is then `run`'s own. On a loaded host a long round can still meet a collection V8
 * schedules by time (the busier the host, the longer the round); a reading with one says nothing about `run`,
 * and is taken again, once.
 */
export function heapCost(run: () => void): { gcs: number; grewBytes: number } {
  let cost = measure(run);
  if (cost.gcs > 0) cost = measure(run);
  return cost;
}

function measure(run: () => void): { gcs: number; grewBytes: number } {
  collect();
  const profiler = new GCProfiler();
  profiler.start();
  const before = getHeapStatistics().used_heap_size;
  run();
  const grewBytes = getHeapStatistics().used_heap_size - before;
  return { gcs: profiler.stop()?.statistics.length ?? Number.NaN, grewBytes };
}
