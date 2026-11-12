// Stillness opens the garden (P-016, T-173, D-057): StillnessSystem on a fake world. A still head facing the bed
// for STILL_OPEN_MS opens it once; the gazed plant rides along; a turn, a pinch, the bed leaving or the bed out of
// the FoV box closes it at once and starts the count again; nothing outside a session; nothing created per frame.
import { Group, Matrix4, Vector3 } from '@iwsdk/core';
import { afterEach, describe, expect, it } from 'vitest';

import { STILL_OPEN_MS } from '../../../src/access/config.js';
import { StillnessSystem } from '../../../src/access/index.js';
import { BedAnchor, Interactable } from '../../../src/core/components.js';
import { bus, type EventMap } from '../../../src/core/index.js';
import { cellCentre, type Cell } from '../../../src/garden/index.js';
import { HandState } from '../../../src/hands/index.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

/** As much of an ECS entity as the system reads. */
class FakeEntity {
  readonly data = new Map<unknown, Record<string, unknown>>();
  private readonly views = new Map<string, Float32Array>();
  addComponent(component: unknown, values: Record<string, unknown> = {}): this {
    this.data.set(component, { ...values });
    return this;
  }
  getValue(component: unknown, key: string): unknown {
    return this.data.get(component)?.[key];
  }
  getVectorView(_component: unknown, key: string): Float32Array {
    let view = this.views.get(key);
    if (view === undefined) this.views.set(key, (view = new Float32Array(3)));
    return view;
  }
}
class FakeQuery {
  readonly entities = new Set<FakeEntity>();
  private readonly told = {
    qualify: new Set<(e: FakeEntity) => void>(),
    disqualify: new Set<(e: FakeEntity) => void>(),
  };
  subscribe(event: 'qualify' | 'disqualify', callback: (e: FakeEntity) => void, replay = false): () => void {
    this.told[event].add(callback);
    if (replay) this.entities.forEach(callback);
    return () => this.told[event].delete(callback);
  }
  add(entity: FakeEntity): FakeEntity {
    this.entities.add(entity);
    this.told.qualify.forEach((callback) => callback(entity));
    return entity;
  }
  remove(entity: FakeEntity): void {
    this.entities.delete(entity);
    this.told.disqualify.forEach((callback) => callback(entity));
  }
}

const EYE = new Vector3(0, 1.15, 0);
const BED_AT = new Vector3(0, 0.74, -0.45); // flat, 0.45 m ahead on a 0.74 m desk: 42° below the level gaze
const UP = new Vector3(0, 1, 0);
const off: (() => void)[] = [];
let live: StillnessSystem | null = null;
afterEach(() => {
  while (off.length > 0) off.pop()?.();
  live?.destroy();
  live = null;
});

function cellAt(cell: Cell): Vector3 {
  const c = cellCentre(cell, { x: 0, y: 0 });
  return new Vector3(BED_AT.x + c.x, BED_AT.y, BED_AT.z + c.y);
}

/** StillnessSystem as `register(world, StillnessSystem, 27, { bed })` makes it, in a session, looking at the bed. */
function rig() {
  const head = new Matrix4().lookAt(EYE, BED_AT, UP).setPosition(EYE);
  const xr = { isPresenting: true };
  const world = { player: { head: { matrixWorld: head } }, camera: { matrixWorld: new Matrix4() }, renderer: { xr } };
  const bedObject = new Group();
  bedObject.position.copy(BED_AT);
  bedObject.updateMatrixWorld(true);
  const beds = new FakeQuery();
  const targets = new FakeQuery();
  const hands = new FakeQuery();
  const system = new StillnessSystem(world as never, {} as never, 27);
  system.queries = { beds, targets, hands } as never;
  system.config.bed.value = bedObject;
  system.init();
  live = system;
  const bed = beds.add(new FakeEntity().addComponent(BedAnchor));
  let timeS = 100;
  /** `ms` of 14 ms frames. */
  const frames = (ms: number) => {
    for (let t = 0; t < ms; t += 14) system.update(0.014, (timeS += 0.014));
  };
  const lookAt = (at: Vector3) => void head.lookAt(EYE, at, UP).setPosition(EYE);
  /** Turns the head `deg` a frame for `n` frames: faster than 8°/s. */
  const turn = (deg: number, n = 3) => {
    for (let i = 0; i < n; i++) {
      head.multiply(new Matrix4().makeRotationY((deg * Math.PI) / 180));
      system.update(0.014, (timeS += 0.014));
    }
  };
  const plant = (id: string, cell: Cell) => {
    const entity = new FakeEntity().addComponent(Interactable, { kind: 'plant', id, radius: 0.04 });
    entity.getVectorView(Interactable, 'worldPos').set(cellAt(cell).toArray());
    return targets.add(entity);
  };
  const hand = (pinch: boolean) => hands.add(new FakeEntity().addComponent(HandState, { hand: 'right', pinch }));
  const heard: EventMap['stillness:changed'][] = [];
  off.push(bus.on('stillness:changed', (payload) => heard.push({ ...payload })));
  return { system, head, xr, bed, beds, hand, hands, frames, lookAt, turn, plant, heard };
}

describe('StillnessSystem (P-016, priority 27)', () => {
  it('opens once after STILL_OPEN_MS still and facing the bed, not a frame sooner; a turn closes it at once and restarts the count', () => {
    const r = rig();
    r.frames(STILL_OPEN_MS - 14);
    expect(r.heard).toEqual([]);
    r.frames(28);
    expect(r.heard).toEqual([{ isOpen: true, plantId: '' }]);
    r.frames(5000);
    expect(r.heard).toHaveLength(1);
    r.turn(1);
    expect(r.heard[1]).toEqual({ isOpen: false, plantId: '' });
    expect(r.system.stillMs[0]).toBe(0);
    r.frames(1000); // the smoothed speed settles back under 8°/s inside this
    r.frames(STILL_OPEN_MS);
    expect(r.heard).toHaveLength(3);
    expect(r.heard[2]!.isOpen).toBe(true);
  });

  it('a pinch, the bed leaving, or the bed outside the FoV box ends it; the count starts again from nothing', () => {
    const r = rig();
    const right = r.hand(false);
    r.frames(STILL_OPEN_MS + 28);
    expect(r.heard).toHaveLength(1);
    right.data.get(HandState)!.pinch = true;
    r.frames(14);
    expect(r.heard[1]).toEqual({ isOpen: false, plantId: '' });
    right.data.get(HandState)!.pinch = false;
    r.frames(STILL_OPEN_MS / 2);
    r.beds.remove(r.bed);
    r.frames(STILL_OPEN_MS);
    expect(r.heard).toHaveLength(2); // no bed: nothing counts
    r.beds.add(r.bed);
    r.frames(STILL_OPEN_MS + 28);
    expect(r.heard).toHaveLength(3);
    r.lookAt(new Vector3(0, 1.15, -1)); // level: the bed is 42° below, outside the ±20° box
    r.frames(STILL_OPEN_MS + 1000);
    expect(r.heard).toHaveLength(4);
    expect(r.heard[3]!.isOpen).toBe(false);
  });

  it('while open, the plant the gaze line rests on rides along, and changes only on a change; closed, none', () => {
    const r = rig();
    const cell = { ring: 3, step: 6 };
    r.plant('p1', cell);
    r.lookAt(cellAt(cell));
    r.frames(STILL_OPEN_MS + 28);
    expect(r.heard).toEqual([{ isOpen: true, plantId: 'p1' }]);
    r.frames(2000);
    expect(r.heard).toHaveLength(1);
    r.turn(1);
    expect(r.heard[1]).toEqual({ isOpen: false, plantId: '' });
  });

  it('does nothing outside a session, and nothing on destroy that was not open', () => {
    const r = rig();
    r.xr.isPresenting = false;
    r.frames(2 * STILL_OPEN_MS);
    expect(r.heard).toEqual([]);
    r.system.destroy();
    live = null;
    expect(r.heard).toEqual([]);
  });

  it('creates nothing per frame, still on a plant and through the open and the close (CODING_GUIDELINES §5)', () => {
    const r = rig();
    r.hand(false);
    const cell = { ring: 3, step: 6 };
    r.plant('p1', cell);
    r.plant('p2', { ring: 1, step: 12 });
    const heads = [cellAt(cell), new Vector3(0, 1.15, -1)].map((at) =>
      new Matrix4().lookAt(EYE, at, UP).setPosition(EYE),
    );
    // Real-size frame times that exist before the loop (a fraction made inside it would be boxed by the test).
    const FRAMES = 20_000;
    const TIMES: unknown[] = [null];
    for (let i = 1; i <= 12 * FRAMES; i++) TIMES.push((12_345_678 + i * 13.889) / 1000);
    let frame = 0;
    const round = () => {
      for (let i = 0; i < FRAMES; i++) {
        // 700 frames (9.7 s) on the plant: it opens; 700 level: it closes.
        r.head.copy(heads[Math.floor(frame / 700) % 2]!);
        r.system.update(0.014, TIMES[++frame] as number);
      }
    };
    round(); // warm up: V8 settles its hidden classes and code
    const costs: { gcs: number; grewBytes: number }[] = [];
    while (costs.length < 10 && !costs.some((cost) => cost.gcs === 0 && cost.grewBytes < PROBE_BYTES)) {
      costs.push(heapCost(round));
    }
    expect(
      costs.some((cost) => cost.gcs === 0 && cost.grewBytes < PROBE_BYTES),
      JSON.stringify(costs),
    ).toBe(true);
    expect(r.heard.length).toBeGreaterThan(4); // it did open and close, round after round
  });
});
