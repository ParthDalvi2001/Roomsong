// NFR-PERF-08 for T-150: OnboardingSystem.update and HintSystem.update create nothing per frame. Measured through
// every step Hints draws (the palm, the ghost pinch or click looping over the glowing cell, the hint ring with pull
// and drag, Listen), in a headset and in the garden window, with the remove arrow up, a hand hint held in the FoV
// box and the head moving every frame. Fake world and entities (render/seedRig.ts), not the ECS.
import { Group, Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { bus } from '../../../src/core/index.js';
import { HandState } from '../../../src/hands/index.js';
import { OnboardingSystem } from '../../../src/onboarding/OnboardingSystem.js';
import { HintSystem } from '../../../src/ui/Hints.js';
import { garden, plant } from '../garden/fixtures.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';
import { FakeEntity, FakeQuery } from '../render/seedRig.js';

import type { EventMap } from '../../../src/core/index.js';

const FRAMES = 2_000; // about 28 s at 72 Hz: the ghost loops 14 times
const MOST_ROUNDS = 20;

describe('OnboardingSystem and HintSystem per frame (NFR-PERF-08)', () => {
  it('the plant step, the ghost, the remove arrow and a hand hint, the head moving: nothing allocated', () => {
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => null }) });
    vi.spyOn(console, 'error').mockImplementation(() => {}); // "no 2D canvas": node has none
    // The head turns from side to side: poses made before the run, so the run itself computes no fraction.
    const head = new Matrix4();
    const axis = new Vector3(0, 1, 0);
    const HEADS = Array.from({ length: 64 }, (_, i) =>
      new Matrix4().compose(
        new Vector3(0, 1.2, 0),
        new Quaternion().setFromAxisAngle(axis, Math.sin(i * 0.1) * 0.4),
        new Vector3(1, 1, 1),
      ),
    );
    const bed = new Group();
    bed.position.set(0.02, 0.74, -0.45);
    bed.rotation.y = 0.3;
    bed.updateMatrixWorld(true);
    const world = {
      scene: new Group(),
      player: { head: { matrixWorld: head } },
      camera: { matrixWorld: head },
      renderer: { xr: { isPresenting: true } },
      createEntity: () => new FakeEntity(),
    };
    const onboarding = new OnboardingSystem(world as never, {} as never, 35);
    onboarding.init();
    const hints = new HintSystem(world as never, {} as never, 61);
    const hands = new FakeQuery();
    for (const hand of ['left', 'right'] as const) {
      const entity = hands.add(new FakeEntity().addComponent(HandState, { hand }));
      entity.getVectorView(HandState, 'palmPos').set([hand === 'left' ? -0.9 : 0.2, 1.05, -0.31]);
    }
    hints.queries = { hands } as never;
    hints.config.bed.value = bed;
    hints.init();

    // A new garden, tuned, a seed out: the plant step. A drag on the way and a lost hand that held a seed.
    bus.emit('garden:changed', { state: garden([]), diff: { added: [], removed: [], changed: [] } });
    bus.emit('room:signature', { signature: {} as never, starterSeeds: true });
    bus.emit('room:tuned', {});
    bus.emit('garden:seedOut', { seed: { id: 's' } as never, hand: 'left' });
    expect(onboarding.step).toBe('plant');
    // Three plants, so the hint ring has a newest plant to stand round.
    const three = [plant('a', 1, 2), plant('b', 3, 6), plant('c', 2, 10)];
    bus.emit('garden:changed', {
      state: garden(three),
      diff: { added: ['a', 'b', 'c'], removed: [], changed: [] },
    });
    bus.emit('gesture:drag', { hand: 'right' } as EventMap['gesture:drag']);
    // Every step Hints draws, in turn, a headset's and the window's: each payload made once, so the test's own
    // emits create nothing. The hand hint is re-armed every 300 frames (4 s), inside HAND_HINT_MAX_MS (5 s).
    const STEPS = (['palm', 'plant', 'grow', 'move', 'listen'] as const).map((step) => ({ step }));
    const LOST: EventMap['hands:lost'] = { hand: 'left', held: { kind: 'seed', id: 's' } };
    const lose = () => bus.emit('hands:lost', LOST);
    const xr = world.renderer.xr;
    /** Which atlas frames the icon showed: a typed array, so marking one creates nothing. */
    const seen = new Uint8Array(16);

    const total = (MOST_ROUNDS + 3) * FRAMES + 1;
    const TIMES: unknown[] = [null];
    for (let i = 1; i <= total; i++) TIMES.push((12_345_678 + i * 13.889) / 1000);
    // Called as elics calls it, from one loop over systems of many classes (BedRenderSystem.heap.test.ts).
    const others = [class A {}, class B {}, class C {}, class D {}].map((Kind) =>
      Object.assign(new Kind(), { update: (): void => {} }),
    );
    const systems: { update(delta: number, time: number): void }[] = [...others, onboarding, hints];
    let frames = 0;
    const run = (): void => {
      for (let i = 0; i < FRAMES; i++) {
        const k = ++frames;
        if (k % 300 === 0) lose();
        if (k % 100 === 0) bus.emit('onboarding:step', STEPS[(k / 100) % STEPS.length]!);
        if (k % 500 === 0) xr.isPresenting = !xr.isPresenting;
        head.copy(HEADS[k % HEADS.length]!);
        for (let s = 0; s < systems.length; s++) systems[s]!.update(0.0139, TIMES[k] as number);
        if (hints.shows.icon >= 0) seen[hints.shows.icon] = 1;
      }
    };
    const isClean = (cost: { gcs: number; grewBytes: number }): boolean =>
      cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < PROBE_BYTES;

    lose();
    for (let i = 0; i < 3; i++) run(); // warm up: the JIT's own allocations happen here
    // What was measured: every icon (the ghost open and closed, the pointer and its click, the palm, the palms, pull,
    // drag), the ring, the remove arrow and the hand hint.
    expect([...seen.slice(0, 8)]).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect([hints.shows.arrow, hints.shows.hands[0]]).toEqual([8, 9]);
    const rounds: { gcs: number; grewBytes: number }[] = [];
    const startedMs = performance.now();
    for (let i = 0; i < MOST_ROUNDS; i++) {
      const cost = heapCost(run);
      rounds.push(cost);
      if (isClean(cost)) break;
    }
    const msPerFrame = (performance.now() - startedMs) / (rounds.length * FRAMES);
    console.log(
      `T-150 OnboardingSystem + HintSystem update, every step: ${(msPerFrame * 1000).toFixed(1)} µs a frame, heap ` +
        `${JSON.stringify(rounds[rounds.length - 1])} per ${FRAMES} frames, after ${rounds.length} rounds (Node)`,
    );
    expect(isClean(rounds[rounds.length - 1]!), JSON.stringify(rounds)).toBe(true);
    expect(msPerFrame).toBeLessThan(1); // NFR-PERF-05 gives a frame's JavaScript 6 ms
    hints.destroy();
    onboarding.destroy();
    bus.emit('xr:sessionEnd', { visible: false });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }, 120_000);
});
