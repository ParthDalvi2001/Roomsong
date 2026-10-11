// The heap probe of the hands tests (CODING_GUIDELINES §5: hot paths create nothing).
import { GCProfiler, getHeapStatistics } from 'node:v8';

/** What the probe itself costs (about 0.7 kB on Node 24.14), with room. Growth below this is "nothing". */
export const PROBE_BYTES = 4096;

/**
 * What `run` cost the heap: the collections V8 ran (as in tests/unit/core/events.test.ts) and the bytes the heap
 * grew by. With no collection the growth is exact, so one small object per round shows in one number or the other.
 */
export function heapCost(run: () => void): { gcs: number; grewBytes: number } {
  const profiler = new GCProfiler();
  profiler.start();
  const before = getHeapStatistics().used_heap_size;
  run();
  const grewBytes = getHeapStatistics().used_heap_size - before;
  return { gcs: profiler.stop()?.statistics.length ?? Number.NaN, grewBytes };
}
