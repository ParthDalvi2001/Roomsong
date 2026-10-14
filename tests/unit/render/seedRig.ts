// SeedSystem on fake entities and queries (T-127), for SeedSystem.test.ts and SeedSystem.heap.test.ts: two hands, a
// placed bed and the page's kind of guard, as much of the ECS as the system uses. The real bus and renderer.
import { Group, Matrix4 } from 'three';

import { Interactable } from '../../../src/core/components.js';
import { HandState } from '../../../src/hands/HandState.js';
import { FlashGuard } from '../../../src/render/FlashGuard.js';
import { SeedSystem } from '../../../src/render/RenderSystems.js';

import type { Hand, Vec3 } from '../../../src/core/index.js';
import type { InstancedMesh } from 'three';

/** As much of an ECS entity as SeedSystem uses. */
export class FakeEntity {
  readonly data = new Map<unknown, Record<string, unknown>>();
  /** Every addComponent, in order, with the values it was given. */
  readonly added: [unknown, Record<string, unknown>][] = [];
  private readonly views = new Map<unknown, Map<string, Float32Array>>();
  object3D: { matrixWorld: Matrix4 } | undefined;

  addComponent(component: unknown, values: Record<string, unknown> = {}): this {
    this.data.set(component, { ...values });
    this.added.push([component, { ...values }]);
    this.views.delete(component); // elics starts a component that is added again from its defaults
    return this;
  }
  removeComponent(component: unknown): this {
    this.data.delete(component);
    return this;
  }
  hasComponent(component: unknown): boolean {
    return this.data.has(component);
  }
  getValue(component: unknown, key: string): unknown {
    return this.data.get(component)?.[key] ?? null;
  }
  getVectorView(component: unknown, key: string): Float32Array {
    let views = this.views.get(component);
    if (views === undefined) this.views.set(component, (views = new Map<string, Float32Array>()));
    let view = views.get(key);
    if (view === undefined) views.set(key, (view = new Float32Array(3)));
    return view;
  }
}

/** As much of an ECS query as SeedSystem uses. */
export class FakeQuery {
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

export const BED_AT: Vec3 = { x: 0, y: 0.74, z: -0.45 };
export const LEFT_PALM: Vec3 = { x: -0.22, y: 0.95, z: -0.3 };
export const RIGHT_PINCH: Vec3 = { x: 0.15, y: 0.9, z: -0.32 };
export const FRAME_S = 0.014;
const T0_S = 12_345.678; // a frame time of real size, in seconds

/** The system on fake entities: two hands, a placed bed, the page's kind of guard. */
export function rig() {
  const created: FakeEntity[] = [];
  const world = {
    scene: new Group(),
    createEntity: () => {
      const entity = new FakeEntity();
      created.push(entity);
      return entity;
    },
  };
  const hands = new FakeQuery();
  const handOf = { left: new FakeEntity(), right: new FakeEntity() };
  for (const hand of ['left', 'right'] as const) hands.add(handOf[hand].addComponent(HandState, { hand }));
  const put = (hand: Hand, field: 'palmPos' | 'pinchPos', at: Vec3): void =>
    void handOf[hand].getVectorView(HandState, field).set([at.x, at.y, at.z]);
  put('left', 'palmPos', LEFT_PALM);
  put('right', 'pinchPos', RIGHT_PINCH);
  const beds = new FakeQuery();
  const bed = new FakeEntity();
  bed.object3D = { matrixWorld: new Matrix4().makeTranslation(BED_AT.x, BED_AT.y, BED_AT.z) };
  beds.add(bed);

  const system = new SeedSystem(world as never, {} as never, 49);
  system.config.guard.value = new FlashGuard();
  system.queries = { hands, beds } as never;
  system.init();
  const [target, caption] = created as [FakeEntity, FakeEntity];
  const mesh = world.scene.children[0] as InstancedMesh;
  let timeS = T0_S;
  const frame = (seconds = FRAME_S): void => {
    timeS += seconds;
    system.update(seconds, timeS);
  };
  /** Where the seed's target is, while it has one. */
  const targetAt = (): Vec3 | null => {
    if (!target.hasComponent(Interactable)) return null;
    const [x, y, z] = target.getVectorView(Interactable, 'worldPos');
    return { x: x!, y: y!, z: z! };
  };
  /** How many seeds are drawn. */
  const drawn = (): number => {
    const m = mesh.instanceMatrix.array;
    let count = 0;
    for (let i = 0; i < mesh.count; i++) if (m[i * 16] !== 0) count++;
    return mesh.visible ? count : 0;
  };
  return { system, world, hands, handOf, put, beds, bed, target, caption, mesh, frame, targetAt, drawn };
}
