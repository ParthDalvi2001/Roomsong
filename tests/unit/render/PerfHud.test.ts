import { Group } from 'three';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { bus, flags } from '../../../src/core/index.js';
import { PERF_SAMPLE_MS } from '../../../src/render/config.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { createPerfHud, perfLines, PerfSampler } from '../../../src/render/PerfHud.js';

import type { EventMap } from '../../../src/core/index.js';

type PerfSample = EventMap['perf:sample'];
const FRAME_MS = 10; // whole milliseconds, so a second is exactly 100 frames

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  vi.unstubAllGlobals();
});

/** Every perf:sample emitted from now on, copied (the emitter reuses its object). */
function record(): PerfSample[] {
  const samples: PerfSample[] = [];
  stop = bus.on('perf:sample', (sample) => samples.push({ ...sample }));
  return samples;
}

describe('perf:sample (API_SPEC §2, NFR-PERF-03/04/05)', () => {
  it('has the six fields of the contract', () => {
    expectTypeOf<PerfSample>().toEqualTypeOf<{
      fps: number;
      draws: number;
      tris: number;
      jsMs: number;
      voices: number;
      maxFlashPerS: number;
    }>();
  });

  it('is emitted once per second with fps, mean script time, the last render and the flash peak', () => {
    const samples = record();
    const info = { render: { calls: 0, triangles: 0 } };
    const guard = new FlashGuard();
    const element = guard.claim(1);
    const sampler = new PerfSampler(info, guard);
    guard.request(element, 1, 0);
    guard.request(element, 0, 10); // a flash: two changes
    for (let frame = 0; frame <= 200; frame++) {
      info.render.calls = 14;
      info.render.triangles = 5000 + frame;
      sampler.frame(frame * FRAME_MS, frame % 2 ? 1 : 3, 7); // 1 ms and 3 ms in turn
    }
    expect(samples).toEqual([
      // fps and the mean of the 100 frames after the first; the triangles of the frame the sample was taken on
      { fps: 100, jsMs: 2, draws: 14, tris: 5100, voices: 7, maxFlashPerS: 2 },
      { fps: 100, jsMs: 2, draws: 14, tris: 5200, voices: 7, maxFlashPerS: 0 }, // no flash in the second second
    ]);
  });

  it('emits nothing before a full second has passed', () => {
    const samples = record();
    const sampler = new PerfSampler({ render: { calls: 1, triangles: 1 } }, new FlashGuard());
    for (let now = 5000; now < 5000 + PERF_SAMPLE_MS - 1; now += FRAME_MS) sampler.frame(now, 1);
    expect(samples).toEqual([]);
  });
});

describe('PerfHud (flag perfHud, API_SPEC §3)', () => {
  it('shows fps, script time, draw calls, triangles, voices and the flash peak against the cap', () => {
    const lines = perfLines({ fps: 71.6, draws: 14, tris: 5072, jsMs: 1.234, voices: 7, maxFlashPerS: 2 });
    expect(lines).toEqual(['72 fps  1.2 ms', 'draws 14  tris 5072', 'voices 7  flash 2/3']);
  });

  it('is not created without the flag', () => {
    const parent = new Group();
    expect(createPerfHud(parent, { ...flags, perfHud: false })).toBeNull();
    expect(parent.children).toEqual([]);
  });

  it('with the flag it writes each sample on its panel; dispose stops that and frees the panel', () => {
    // The unit tests have no page, so the canvas is a stand-in that records what is written on it.
    const written: string[] = [];
    const canvas = { width: 0, height: 0, getContext: (): object => context };
    const context = {
      canvas,
      fillStyle: '',
      font: '',
      textBaseline: '',
      fillRect: (): void => undefined,
      fillText: (line: string): number => written.push(line),
    };
    vi.stubGlobal('document', { createElement: () => canvas });
    const parent = new Group();
    const hud = createPerfHud(parent, { ...flags, perfHud: true })!;
    expect(parent.children).toEqual([hud.mesh]);
    expect(canvas.width).toBeCloseTo(256);
    expect(canvas.height).toBeCloseTo(128);

    const sample = { fps: 72, draws: 14, tris: 11724, jsMs: 0.2, voices: 0, maxFlashPerS: 2 };
    const texture = hud.mesh.material.map!;
    const uploads = texture.version;
    bus.emit('perf:sample', sample);
    expect(written).toEqual(perfLines(sample));
    expect(texture.version).toBe(uploads + 1);

    const freed: string[] = [];
    hud.mesh.geometry.addEventListener('dispose', () => freed.push('geometry'));
    hud.mesh.material.addEventListener('dispose', () => freed.push('material'));
    texture.addEventListener('dispose', () => freed.push('texture'));
    hud.dispose();
    expect(parent.children).toEqual([]);
    expect(freed.sort()).toEqual(['geometry', 'material', 'texture']);
    bus.emit('perf:sample', sample);
    expect(written).toHaveLength(3); // it no longer listens
  });
});
