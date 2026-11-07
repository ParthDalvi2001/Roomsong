// Room tour only (room-tour.spec.ts loads this into the dev page): the fixture's planes drawn into the scene, because
// IWER keeps them for the app to sense but draws none. These are the planes the game reads and nothing more: a dark warm
// floor, each wall its own light tone, the ceiling as an outline, and a table or counter as a slab at its height on four
// legs to the floor. Each plane faces into its room (the fixture's `facing`) and is drawn from that side only, so from
// outside the room the near walls drop away and the room shows like a doll's house. Never in the app.
import {
  BoxGeometry,
  EdgesGeometry,
  FrontSide,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type BufferGeometry,
} from 'three';

import type { Room } from '../fixtures/rooms/capture';

const FLOOR = 0x5a4334;
const WALLS = [0xe2dccf, 0xcfdcd8, 0xdcd2e2, 0xd8e0c8, 0xe6d2c4];
const SLAB = 0x9a6a44;
const LEG = 0x6e4a30;
const EDGE = 0x1e1a18;
const SLAB_M = 0.04;
const LEG_M = 0.05;
/** Turns a plane's +z normal to the fixture's `facing`, the side its room is on. */
const TURN: Record<string, (g: BufferGeometry) => void> = {
  '+z': () => undefined,
  '-z': (g) => g.rotateY(Math.PI),
  '+x': (g) => g.rotateY(Math.PI / 2),
  '-x': (g) => g.rotateY(-Math.PI / 2),
  '+y': (g) => g.rotateX(-Math.PI / 2),
  '-y': (g) => g.rotateX(Math.PI / 2),
};

function add(geometry: BufferGeometry, colour: number, x: number, y: number, z: number, solid = true): void {
  const scene = window.__roomsong!.world.scene;
  const outline = new LineSegments(new EdgesGeometry(geometry), new LineBasicMaterial({ color: EDGE }));
  const object = solid
    ? new Mesh(geometry, new MeshBasicMaterial({ color: colour, side: FrontSide }))
    : outline;
  if (solid) object.add(outline);
  object.position.set(x, y, z);
  scene.add(object);
}

export function drawRoom(room: Room): void {
  const floorY = room.planes.find((p) => p.label === 'floor')?.center[1] ?? 0;
  let wall = 0;
  for (const { label, facing, center, size } of room.planes) {
    const [x, y, z] = center;
    if (label === 'table' || label === 'other') {
      // A slab whose top is the plane, a little under it so the bed on it keeps its own depth, on four legs.
      const top = y - 0.004;
      add(new BoxGeometry(size[0], SLAB_M, size[1]), SLAB, x, top - SLAB_M / 2, z);
      const legH = top - SLAB_M - floorY;
      if (legH <= 0) continue;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const lx = x + sx * (size[0] / 2 - LEG_M);
          const lz = z + sz * (size[1] / 2 - LEG_M);
          add(new BoxGeometry(LEG_M, legH, LEG_M), LEG, lx, floorY + legH / 2, lz);
        }
      }
      continue;
    }
    const geometry = new PlaneGeometry(size[0], size[1]);
    TURN[facing]?.(geometry);
    if (label === 'ceiling') add(geometry, 0, x, y, z, false);
    else if (label === 'floor') add(geometry, FLOOR, x, y, z);
    else add(geometry, WALLS[wall++ % WALLS.length]!, x, y, z);
  }
}
