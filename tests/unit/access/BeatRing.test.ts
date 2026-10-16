// The beat ring (T-160; FR-UI-07, US-17, UX §8): BeatRingSystem on a fake world, with the real guard. Where its
// ticks are, what lights them, when it shows, the flash cap and its cost per frame.
import { Group, Vector3 } from '@iwsdk/core';
import { afterEach, describe, expect, it } from 'vitest';

import { BEAT_TICK_RADIUS_M, BEAT_TICK_REST } from '../../../src/access/config.js';
import { BeatRingSystem } from '../../../src/access/index.js';
import { bus, DEFAULT_SETTINGS, settings } from '../../../src/core/index.js';
import { FlashGuard } from '../../../src/render/index.js';
import { garden, plant } from '../garden/fixtures.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

class FakeQuery {
  readonly entities = new Set<object>();
  private readonly told = { qualify: new Set<() => void>(), disqualify: new Set<() => void>() };
  subscribe(event: 'qualify' | 'disqualify', callback: () => void, replay = false): () => void {
    this.told[event].add(callback);
    if (replay) this.entities.forEach(callback);
    return () => this.told[event].delete(callback);
  }
  place(): void {
    this.entities.add(this);
    this.told.qualify.forEach((callback) => callback());
  }
}

let live: BeatRingSystem | null = null;
afterEach(() => {
  live?.destroy();
  live = null;
  settings.set({ ...DEFAULT_SETTINGS });
});

/** BeatRingSystem as `register(world, BeatRingSystem, 26, { guard, engine, bed })` makes it. */
function rig() {
  const bed = new Group();
  const audio = { now: 0, phase: 0 as unknown };
  const engine = { clock: { now: () => audio.now, barPhase: () => audio.phase as number } };
  const guard = new FlashGuard();
  const beds = new FakeQuery();
  const system = new BeatRingSystem({} as never, {} as never, 26);
  system.queries = { beds } as never;
  system.config.guard.value = guard;
  system.config.engine.value = engine;
  system.config.bed.value = bed;
  system.init();
  live = system;
  let timeS = 100;
  const frames = (count = 1) => {
    for (let i = 0; i < count; i++) system.update(1 / 72, (timeS += 1 / 72));
  };
  /** The garden plays: the session has its signature and the audio clock runs, the tide at `phase`. */
  const play = (phase: number) => {
    bus.emit('room:signature', {} as never);
    audio.now = 1;
    audio.phase = phase;
  };
  return { system, bed, beds, audio, guard, frames, play };
}

describe('BeatRingSystem (T-160, priority 26)', () => {
  it("16 ticks on the bed, one per step, just past its edge in the step's own direction: one draw call", () => {
    const { system, bed } = rig();
    expect(bed.children).toEqual([system.mesh]);
    expect(system.mesh.count).toBe(16);
    const at = new Vector3();
    const matrices = system.mesh.instanceMatrix.array;
    for (const step of [0, 4, 9]) {
      at.set(matrices[16 * step + 12]!, 0, matrices[16 * step + 14]!);
      expect(at.length()).toBeCloseTo(BEAT_TICK_RADIUS_M, 6);
      expect(Math.atan2(at.z, at.x)).toBeCloseTo(
        (((step * Math.PI) / 8 + Math.PI) % (2 * Math.PI)) - Math.PI,
        5,
      );
    }
  });

  it('nothing before the bed is placed; at rest before the garden plays (rule 11)', () => {
    const { system, beds, frames } = rig();
    frames(5);
    expect(system.mesh.visible).toBe(false);
    beds.place();
    frames(5);
    expect(system.mesh.visible).toBe(true);
    expect([...system.brightness]).toEqual(Array(16).fill(BEAT_TICK_REST));
  });

  it('under the crest a planted step flashes and an empty one lifts a little; far from it both rest', () => {
    const { system, beds, frames, play } = rig();
    beds.place();
    bus.emit('garden:changed', {
      state: garden([plant('a', 2, 4)]),
      diff: { added: ['a'], removed: [], changed: [] },
    });
    play(4 / 16 + 0.001); // the crest on step 4
    frames(2);
    expect(system.brightness[4]).toBeGreaterThan(0.95);
    bus.emit('garden:changed', {
      state: garden([plant('a', 2, 5)]),
      diff: { added: [], removed: [], changed: ['a'] },
    });
    frames(80); // the guard lets the swing down through in its own time
    expect(system.brightness[4]).toBeCloseTo(0.5, 1);
    expect(system.brightness[12]).toBeCloseTo(BEAT_TICK_REST, 5);
  });

  it('beat ring off: hidden, except in Listen, where it is always on (FR-UI-07)', () => {
    const { system, beds, frames } = rig();
    settings.set({ beatRing: false });
    beds.place();
    frames(5);
    expect(system.mesh.visible).toBe(false);
    bus.emit('listen:enter', {});
    frames(5);
    expect(system.mesh.visible).toBe(true);
    bus.emit('listen:exit', { timedOut: false });
    frames(80);
    expect(system.mesh.visible).toBe(false);
  });

  it('a full bed at 120 BPM: no tick changes brightness more than 3 times a second (FR-UI-11)', () => {
    const { beds, frames, play, audio, guard } = rig();
    beds.place();
    const plants = Array.from({ length: 16 }, (_, step) => plant(`p${step}`, 0, step));
    bus.emit('garden:changed', {
      state: garden(plants),
      diff: { added: [], removed: [], changed: [] },
    });
    play(0);
    guard.takePeak();
    for (let i = 0; i < 72 * 8; i++) {
      audio.phase = (i / 144) % 1; // a bar of 2 s at 72 frames a second
      frames(1);
    }
    expect(guard.takePeak()).toBeLessThanOrEqual(3);
  });

  it('creates nothing per frame (CODING_GUIDELINES §5)', () => {
    const { system, beds, audio, play } = rig();
    beds.place();
    bus.emit('garden:changed', {
      state: garden([plant('a', 1, 3)]),
      diff: { added: [], removed: [], changed: [] },
    });
    play(0);
    const FRAMES = 20_000;
    // Real-size times and phases that exist before the loop: a fraction made inside it would be boxed by the test.
    const TIMES: unknown[] = [null];
    const PHASES: unknown[] = [null];
    for (let i = 1; i <= 12 * FRAMES; i++) {
      TIMES.push((12_345_678 + i * 13.889) / 1000);
      PHASES.push((i % 206) / 206 + 0.0001);
    }
    let frame = 0;
    const round = () => {
      for (let i = 0; i < FRAMES; i++) {
        audio.phase = PHASES[++frame];
        system.update(0.014, TIMES[frame] as number);
      }
    };
    round();
    const costs: { gcs: number; grewBytes: number }[] = [];
    while (costs.length < 10 && !costs.some((cost) => cost.gcs === 0 && cost.grewBytes < PROBE_BYTES)) {
      costs.push(heapCost(round));
    }
    expect(
      costs.some((cost) => cost.gcs === 0 && cost.grewBytes < PROBE_BYTES),
      JSON.stringify(costs),
    ).toBe(true);
  });
});
