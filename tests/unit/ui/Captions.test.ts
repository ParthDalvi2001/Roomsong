// FR-UI-01, LLD §5.8: one caption at a time, each on screen at least CAPTION_MIN_MS, in the order raised.
// The clock is a fake: `t` is moved by hand and read through core's createClock.
import { Matrix4, Vector3 } from '@iwsdk/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CAPTION_MIN_MS, createClock, log, STRINGS } from '../../../src/core/index.js';
import { captionDropM, CaptionQueue } from '../../../src/ui/Captions.js';
import {
  CAPTION_DISTANCE_M,
  CAPTION_HEIGHT_M,
  CAPTION_MAX_WORDS,
  FOV_HALF_V_DEG,
} from '../../../src/ui/config.js';
import { clampToFov, fovBoundsDeg } from '../../../src/ui/FovGuard.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

let t = 0;
const clock = createClock(() => t);
/** Moves the fake clock to `ms` and returns the caption on screen then. */
function at<T>(queue: CaptionQueue<T>, ms: number) {
  t = ms;
  return queue.current(clock.now());
}
function setUp() {
  const done: string[] = [];
  return { done, queue: new CaptionQueue<string>((owner) => done.push(owner)) };
}

afterEach(() => vi.restoreAllMocks());

describe('CaptionQueue', () => {
  it('shows nothing when nothing was raised', () => {
    expect(at(setUp().queue, 0)).toBeNull();
  });

  it('keeps a caption on screen for the minimum time even when it expires sooner', () => {
    const { queue, done } = setUp();
    expect(CAPTION_MIN_MS).toBe(1200);
    queue.raise('a', 'rippleWalls', 1100); // would leave after 100 ms
    expect(at(queue, 1000)).toBe('rippleWalls');
    expect(at(queue, 1000 + CAPTION_MIN_MS - 1)).toBe('rippleWalls');
    expect(done).toEqual([]);
    expect(at(queue, 1000 + CAPTION_MIN_MS)).toBeNull();
    expect(done).toEqual(['a']);
  });

  it('keeps a caption until it expires when that is later than the minimum', () => {
    const { queue } = setUp();
    queue.raise('a', 'E_SAVE_FAILED', 5000);
    expect(at(queue, 0)).toBe('E_SAVE_FAILED');
    expect(at(queue, 4999)).toBe('E_SAVE_FAILED');
    expect(at(queue, 5000)).toBeNull();
  });

  it('shows one at a time, in the order raised: the second waits and then gets its own minimum', () => {
    const { queue, done } = setUp();
    queue.raise('a', 'rippleTableSeeds', 2000);
    expect(at(queue, 0)).toBe('rippleTableSeeds');
    queue.raise('b', 'rippleWalls', 500); // expired long before its turn comes
    queue.raise('c', 'rippleCeiling', 9000);
    expect(at(queue, 1999)).toBe('rippleTableSeeds');
    expect(at(queue, 2000)).toBe('rippleWalls');
    expect(done).toEqual(['a']);
    expect(at(queue, 2000 + CAPTION_MIN_MS - 1)).toBe('rippleWalls');
    expect(at(queue, 2000 + CAPTION_MIN_MS)).toBe('rippleCeiling');
    expect(at(queue, 8999)).toBe('rippleCeiling');
    expect(at(queue, 9000)).toBeNull();
    expect(done).toEqual(['a', 'b', 'c']);
  });

  it('plays the tuning ripple of LLD §5.8 back to back: 1.2 / 1.2 / 1.3 s, no gap and no overlap', () => {
    const { queue } = setUp();
    const seen: (string | null)[] = [];
    for (let ms = 0; ms <= 4100; ms += 100) {
      // TuningRipple raises each caption at the start of its sweep, to last until the next sweep starts
      if (ms === 300) queue.raise('table', 'rippleTableNote', 1500);
      if (ms === 1500) queue.raise('wall', 'rippleWalls', 2700);
      if (ms === 2700) queue.raise('ceiling', 'rippleCeiling', 4000);
      seen.push(at(queue, ms));
    }
    const shownFor = (key: string) => seen.filter((k) => k === key).length * 100;
    expect(shownFor('rippleTableNote')).toBe(1200);
    expect(shownFor('rippleWalls')).toBe(1200);
    expect(shownFor('rippleCeiling')).toBe(1300);
    expect(seen.slice(0, 3)).toEqual([null, null, null]);
    expect(seen.slice(40)).toEqual([null, null]);
  });

  it('never shows a waiting caption that its raiser took back', () => {
    const { queue, done } = setUp();
    queue.raise('a', 'rippleWalls', 0);
    queue.raise('b', 'rippleCeiling', 0);
    expect(at(queue, 0)).toBe('rippleWalls');
    queue.withdraw('b');
    queue.withdraw('never raised');
    expect(at(queue, CAPTION_MIN_MS)).toBeNull();
    expect(done).toEqual(['a']); // 'b' is its raiser's to clean up
  });

  it('keeps a caption that is taken back while on screen until its minimum time, and no longer', () => {
    const { queue, done } = setUp();
    queue.raise('a', 'rippleWalls', 60_000);
    expect(at(queue, 0)).toBe('rippleWalls');
    queue.withdraw('a');
    expect(at(queue, CAPTION_MIN_MS - 1)).toBe('rippleWalls');
    expect(at(queue, CAPTION_MIN_MS)).toBeNull();
    expect(done).toEqual([]);
  });

  it('takes back the waiting caption of an owner whose earlier one is still on screen', () => {
    // An entity is reused: its caption is taken back while on screen, it raises another, and takes that back too.
    const { queue, done } = setUp();
    queue.raise('a', 'rippleWalls', 60_000);
    expect(at(queue, 0)).toBe('rippleWalls');
    queue.withdraw('a');
    queue.raise('a', 'rippleCeiling', 60_000);
    queue.withdraw('a');
    expect(at(queue, CAPTION_MIN_MS - 1)).toBe('rippleWalls');
    expect(at(queue, CAPTION_MIN_MS)).toBeNull(); // the second one is gone, not next in line
    expect(at(queue, 10 * CAPTION_MIN_MS)).toBeNull();
    expect(done).toEqual([]);

    // The same reuse without the second take-back: the new caption is shown, and handed back when it has run.
    queue.raise('b', 'rippleWalls', 0);
    expect(at(queue, 20_000)).toBe('rippleWalls');
    queue.withdraw('b');
    queue.raise('b', 'rippleCeiling', 0);
    expect(at(queue, 20_000 + CAPTION_MIN_MS)).toBe('rippleCeiling');
    expect(at(queue, 20_000 + 2 * CAPTION_MIN_MS)).toBeNull();
    expect(done).toEqual(['b']);
  });

  it('refuses a key that is not in STRINGS, and says so', () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const { queue } = setUp();
    expect(queue.raise('a', 'noSuchCaption', 0)).toBe(false);
    expect(queue.raise('b', 'toString', 0)).toBe(false); // on every object, but not a caption
    expect(warn).toHaveBeenCalledTimes(2);
    expect(at(queue, 0)).toBeNull();
    expect(queue.raise('c', 'rippleWalls', 0)).toBe(true);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('gives a caption whose expiry is not a number the minimum time', () => {
    const { queue } = setUp();
    queue.raise('a', 'rippleWalls', Number.NaN);
    expect(at(queue, 0)).toBe('rippleWalls');
    expect(at(queue, CAPTION_MIN_MS)).toBeNull();
  });
});

describe('what a caption costs per frame (CODING_GUIDELINES §5)', () => {
  it('the queue, the FoV guard and its report create nothing on the heap', () => {
    const ROUNDS = 20_000;
    // What CaptionSystem passes: a camera matrix and Three.js vectors. Their number fields take a number in
    // place; V8 may box each number written to a plain { x, y, z } (measured: 16 bytes per field, 2026-10-11).
    const head = new Matrix4().makeTranslation(0, 1.2, 0).elements;
    const caption = { distanceM: 0.6, halfWidthM: 0.2, halfHeightM: 0.025 };
    const wanted = new Vector3(0, 1.1, -0.6);
    const placed = new Vector3();
    const edges = { leftDeg: 0, rightDeg: 0, downDeg: 0, upDeg: 0 };
    const queue = new CaptionQueue<string>(() => {});
    queue.raise('a', 'rippleWalls', Number.POSITIVE_INFINITY);
    let shown = 0;
    const frames = (): void => {
      for (let i = 0; i < ROUNDS; i++) {
        if (queue.current(i) !== null) shown++;
        wanted.x = (i % 9) - 4; // inside the box and far outside it, both sides
        clampToFov(head, wanted, caption, placed);
        fovBoundsDeg(head, placed, caption, edges);
      }
    };
    const keeper: { kept: object | null } = { kept: null };
    const allocate = (): void => {
      for (let i = 0; i < ROUNDS; i++) keeper.kept = { i };
    };
    frames(); // warm up: the JIT's own allocations happen here
    frames();
    allocate();

    const control = heapCost(allocate);
    expect(control.gcs > 0 || control.grewBytes > ROUNDS * 8).toBe(true); // the probe sees that leak
    // The best of three rounds: the JIT may still finish a compile during one of them.
    const costs = [heapCost(frames), heapCost(frames), heapCost(frames)];
    const clean = costs.filter((cost) => cost.gcs === 0 && cost.grewBytes < PROBE_BYTES);
    expect(clean.length, JSON.stringify(costs)).toBeGreaterThan(0);
    expect(shown).toBe(5 * ROUNDS); // the caption was on screen in every frame
    expect(edges.rightDeg).toBeLessThanOrEqual(25 + 1e-9);
    expect(keeper.kept).not.toBeNull();
  });
});

describe('where a caption appears (UX §3.3; FR-SYS-07 in the garden window)', () => {
  it('sits 8 degrees below the gaze in a session and lower in the window, both inside the view box', () => {
    const degreesDown = (dropM: number) => (Math.atan(dropM / CAPTION_DISTANCE_M) * 180) / Math.PI;
    expect(degreesDown(captionDropM(true))).toBeCloseTo(8, 6);
    expect(captionDropM(false)).toBeGreaterThan(captionDropM(true));
    // The quad's lower edge, in the window: no further down than the box's edge, so the guard never holds it.
    expect(degreesDown(captionDropM(false) + CAPTION_HEIGHT_M / 2)).toBeLessThanOrEqual(FOV_HALF_V_DEG);
  });
});

describe('caption length (FR-UI-01)', () => {
  // The whole check: STRINGS is the caption table (API_SPEC §1.0), so nothing counts words at run time.
  it('every string a caption can be raised with has at most six words', () => {
    expect(CAPTION_MAX_WORDS).toBe(6);
    const entries = Object.entries(STRINGS);
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, text] of entries) {
      expect(text.trim().split(/\s+/).length, key).toBeLessThanOrEqual(CAPTION_MAX_WORDS);
    }
  });
});
