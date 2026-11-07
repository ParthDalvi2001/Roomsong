// Room tour only (room-tour.spec.ts loads this into the dev page): the fixture's planes drawn into the scene for the
// still from further back. IWER keeps the fixture's planes and meshes for the app to sense but draws no wall, so without
// this the room around the garden is not on screen. Floor and walls see-through, furniture solid-ish, ceiling left out
// (from above it would hide the room). Never in the app.
import {
  DoubleSide,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';

import type { Room } from '../fixtures/rooms/capture';

const COLOURS: Partial<Record<string, number>> = { floor: 0x4a5160, wall: 0x8a90a0 };
const FURNITURE = 0xd8d0c0;

export function drawRoom(room: Room): void {
  const scene = window.__roomsong!.world.scene;
  for (const plane of room.planes) {
    if (plane.label === 'ceiling') continue;
    const geometry = new PlaneGeometry(plane.size[0], plane.size[1]);
    if (plane.facing.endsWith('y')) geometry.rotateX(-Math.PI / 2);
    if (plane.facing.endsWith('x')) geometry.rotateY(Math.PI / 2);
    const colour = COLOURS[plane.label];
    const material = new MeshBasicMaterial({
      color: colour ?? FURNITURE,
      side: DoubleSide,
      transparent: true,
      opacity: colour === undefined ? 0.7 : 0.3,
      depthWrite: false,
    });
    const mesh = new Mesh(geometry, material);
    // A table top just under the bed that stands on it, so the two do not fight for the same depth.
    mesh.position.set(plane.center[0], plane.center[1] - (colour === undefined ? 0.005 : 0), plane.center[2]);
    mesh.add(new LineSegments(new EdgesGeometry(geometry), new LineBasicMaterial({ color: 0xffffff })));
    scene.add(mesh);
  }
}
