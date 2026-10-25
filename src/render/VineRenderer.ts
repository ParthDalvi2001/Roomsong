// The vine (FR-ROOM-04, Could C4, D-021; T-149): decoration only, no target. One InstancedMesh of short tubes up
// the nearest wall from the bed's height, as long as the garden is full (0 plants: nothing; 80: 1.2 m), each
// piece in a plant's colour. One draw call per view while any piece shows; hidden at count 0, and its program is
// linked by the session's one renderer.compile with the other hidden ones (API_SPEC §1.10 rule 15). It reads no
// clock: the system passes the frame's time. The halo is the Listen visual; a room with no wall near draws nothing.
import {
  Color,
  CylinderGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshBasicMaterial,
  type Object3D,
} from 'three';

import {
  PLANT_CAPACITY,
  PLANT_LIGHTNESS,
  PLANT_REST_BRIGHTNESS,
  VINE_FADE_MS,
  VINE_GROW_MS,
  VINE_RADIUS_M,
  VINE_SEGMENT_M,
  VINE_SEGMENTS,
  VINE_SWAY_M,
  VINE_WALL_MAX_M,
} from './config.js';
import { newPalette, plantColour, setPalette } from './palette.js';

import type { FlashGuard } from './FlashGuard.js';
import type { Mat4 } from '../core/index.js';
import type { Plant } from '../garden/index.js';
import type { SurfaceRef } from '../room/index.js';

/** The pieces overlap by this share of their length, so a bend shows no gap. */
const OVERLAP = 1.3;
/** Radians of the sideways sway per piece: two turns over the whole vine. */
const SWAY_RAD = (4 * Math.PI) / VINE_SEGMENTS;
const SLOPE = (VINE_SWAY_M * SWAY_RAD) / VINE_SEGMENT_M;
const colour = new Color();

export class VineRenderer {
  readonly mesh: InstancedMesh<CylinderGeometry, MeshBasicMaterial>;
  private readonly element: number;
  /** The share of the vine the garden has earned, 0..1; what is drawn eases toward it (under reduced motion it
   *  is the fade instead, FR-UI-06); the pieces drawn. */
  private share = 0;
  private level = 0;
  /** The room's palette the pieces are drawn in (render/palette.ts, D-060), one waiting for the vine to be gone
   *  (`isStale`), and the plants the pieces were last coloured from. */
  private readonly palette = newPalette();
  private readonly next = newPalette();
  private isStale = false;
  private plants: readonly Plant[] = [];
  private pieces = 0;
  private hasWall = false;
  private isReducedMotion = false;
  private lastMs = Number.NaN;

  constructor(
    parent: Object3D,
    private readonly guard: FlashGuard,
  ) {
    this.element = guard.claim(1);
    const geometry = new CylinderGeometry(VINE_RADIUS_M, VINE_RADIUS_M, VINE_SEGMENT_M * OVERLAP, 6, 1, true);
    const material = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    this.mesh = new InstancedMesh(geometry, material, VINE_SEGMENTS);
    this.mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(VINE_SEGMENTS * 3), 3);
    this.mesh.count = 0;
    this.mesh.visible = false; // rule 15: hidden at count 0; the session's compile links its program
    this.mesh.name = 'vine';
    this.mesh.frustumCulled = false; // its bounds are one piece's
    this.mesh.renderOrder = 2; // after the bed's glass and its markers, as the tide and the ripple
    parent.add(this.mesh);
  }

  /**
   * Lays the vine's path on `wall` (a world pose, room/types.ts): up from the bed's height at the point of the
   * wall nearest the bed. No wall, or one farther than VINE_WALL_MAX_M from the bed's centre: the vine goes.
   * Set-up only.
   */
  setWall(wall: SurfaceRef | undefined, bedPose: Mat4): void {
    this.hasWall = false;
    if (wall === undefined) return;
    const { pose: m, extents } = wall;
    // The bed from the wall's centre, in the wall's own axes: x, its normal (y), z.
    const dx = bedPose[12]! - m[12]!;
    const dy = bedPose[13]! - m[13]!;
    const dz = bedPose[14]! - m[14]!;
    const ownX = dx * m[0]! + dy * m[1]! + dz * m[2]!;
    const off = dx * m[4]! + dy * m[5]! + dz * m[6]!;
    const ownZ = dx * m[8]! + dy * m[9]! + dz * m[10]!;
    // Up the wall is the share of its own x and z that points up in the world (TuningRipple.aimWall); along it
    // is the other direction in the plane. The rectangle reaches half of its extents along each.
    const norm = Math.hypot(m[1]!, m[9]!) || 1;
    const upX = m[1]! / norm;
    const upZ = m[9]! / norm;
    const halfHeight = (Math.abs(upX) * extents.x + Math.abs(upZ) * extents.y) / 2;
    const halfWidth = (Math.abs(upZ) * extents.x + Math.abs(upX) * extents.y) / 2;
    const along = ownX * -upZ + ownZ * upX;
    const pastEnd = Math.max(0, Math.abs(along) - halfWidth);
    if (Math.hypot(off, pastEnd) > VINE_WALL_MAX_M) return;
    const length = VINE_SEGMENTS * VINE_SEGMENT_M;
    const foot = Math.max(-halfHeight, Math.min(halfHeight - length, ownX * upX + ownZ * upZ));
    const side = Math.max(-halfWidth + VINE_SWAY_M, Math.min(halfWidth - VINE_SWAY_M, along));
    // Lifted off the wall toward the bed by one radius, whichever way the plane's normal points.
    const lift = (off < 0 ? -1 : 1) * VINE_RADIUS_M;
    const matrices = this.mesh.instanceMatrix.array;
    for (let i = 0; i < VINE_SEGMENTS; i++) {
      // The piece's centre and its direction in the wall's plane: the sway turns it a little each piece.
      const sway = VINE_SWAY_M * Math.sin(i * SWAY_RAD);
      const slope = SLOPE * Math.cos(i * SWAY_RAD);
      const u = foot + (i + 0.5) * VINE_SEGMENT_M;
      const cX = (side + sway) * -upZ + u * upX;
      const cZ = (side + sway) * upX + u * upZ;
      const tNorm = Math.hypot(1, slope);
      const tX = (slope * -upZ + upX) / tNorm;
      const tZ = (slope * upX + upZ) / tNorm;
      // Columns: across (the path × the normal), the tube's own y along the path, the wall's normal; world axes.
      const k = i * 16;
      for (let a = 0; a < 3; a++) {
        matrices[k + 4 + a] = tX * m[a]! + tZ * m[8 + a]!;
        matrices[k + 8 + a] = m[4 + a]!;
        matrices[k + 12 + a] = m[12 + a]! + cX * m[a]! + cZ * m[8 + a]! + lift * m[4 + a]!;
      }
      const ty = matrices[k + 4]!;
      const tu = matrices[k + 5]!;
      const tv = matrices[k + 6]!;
      matrices[k] = tu * m[6]! - tv * m[5]!;
      matrices[k + 1] = tv * m[4]! - ty * m[6]!;
      matrices[k + 2] = ty * m[5]! - tu * m[4]!;
      matrices[k + 3] = matrices[k + 7] = matrices[k + 11] = 0;
      matrices[k + 15] = 1;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.hasWall = true;
  }

  /** The garden: its plant count sets the vine's length, and its plants' hues colour the pieces in turn. */
  setPlants(plants: readonly Plant[]): void {
    this.share = Math.min(1, plants.length / PLANT_CAPACITY);
    this.plants = plants;
    if (plants.length === 0) return;
    const colours = this.mesh.instanceColor!;
    for (let i = 0; i < VINE_SEGMENTS; i++) {
      plantColour(colour, plants[i % plants.length]!.hue, PLANT_LIGHTNESS, this.palette);
      colours.setXYZ(i, colour.r, colour.g, colour.b);
    }
    colours.needsUpdate = true;
  }

  /**
   * On `room:signature`: the plants' palette (D-060). It waits until no piece is drawn: a Re-place lets the vine
   * shrink away, and the next placement's signature may come while it still shows. Set-up.
   */
  setPalette(paletteSeed: number): void {
    setPalette(this.next, paletteSeed);
    this.isStale = true;
    if (this.mesh.count === 0) this.takePalette();
  }

  /** The waiting palette, and the pieces coloured in it. */
  private takePalette(): void {
    this.isStale = false;
    this.palette.shiftDeg = this.next.shiftDeg;
    this.palette.saturation = this.next.saturation;
    this.setPlants(this.plants);
  }

  setReducedMotion(isReduced: boolean): void {
    this.isReducedMotion = isReduced;
  }

  /** Per frame, creates nothing. `nowMs` is the frame's time; one that is not finite changes nothing. */
  update(nowMs: number): void {
    if (!Number.isFinite(nowMs)) return;
    const dtMs = nowMs - this.lastMs; // NaN on the first frame: no step
    this.lastMs = nowMs;
    const share = this.hasWall ? this.share : 0;
    const isFade = this.isReducedMotion;
    // The level eases toward the share, the growing length; under reduced motion it is the fade (FR-UI-06).
    const goal = isFade ? (share > 0 ? 1 : 0) : share;
    const step = (dtMs || 0) / (isFade ? VINE_FADE_MS : VINE_GROW_MS);
    this.level = this.level < goal ? Math.min(goal, this.level + step) : Math.max(goal, this.level - step);
    if (!isFade) this.pieces = Math.ceil(this.level * VINE_SEGMENTS);
    else if (share > 0) this.pieces = Math.ceil(share * VINE_SEGMENTS);
    else if (this.level === 0) this.pieces = 0; // the pieces stay while they fade out
    const target = PLANT_REST_BRIGHTNESS * (isFade ? this.level : Math.min(1, this.level * VINE_SEGMENTS));
    const granted = this.guard.request(this.element, target, nowMs);
    const { material } = this.mesh;
    if (material.opacity !== granted) material.opacity = granted;
    const count = granted > 0 ? this.pieces : 0;
    if (this.mesh.count !== count) {
      this.mesh.count = count;
      this.mesh.visible = count > 0;
    }
    // shortcut: a vine that grows back before it is gone keeps the last room's colours until it next is; recolour
    // it inside a guarded fade if a headset shows the two palettes side by side.
    if (this.isStale && count === 0) this.takePalette();
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}
