// The gaze reticle (UX §8, §9.8; FR-HND-12): one cream dot on the head's forward line, at the distance of the
// gaze target it is on, and a ring round it that fills over the dwell. Two meshes, two draw calls, drawn over
// everything. Over a panel control its ring stays empty: the panel's own ring shows that dwell. Both brightnesses
// go through the FlashGuard (FR-UI-11): the dot is a level and the ring grows, so neither can blink.
import {
  DataTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  type Object3D,
} from '@iwsdk/core';

import { CAPTION_TEXT_COLOUR, CUE_FILL_COLOUR, PANEL_INK } from '../ui/index.js';

import {
  RETICLE_DOT_M,
  RETICLE_OUTLINE_M,
  RETICLE_RENDER_ORDER,
  RETICLE_RING_INNER_M,
  RETICLE_RING_OUTER_M,
  RETICLE_RING_SEGMENTS,
  RETICLE_TEXTURE_PX,
} from './config.js';

import type { Mat4 } from '../core/index.js';
import type { FlashGuard } from '../render/index.js';

const INDICES_PER_SEGMENT = 6; // a RingGeometry with one ring of quads: two triangles a segment
const QUAD_M = RETICLE_DOT_M + 2 * RETICLE_OUTLINE_M;

/** '#RRGGBB' as three bytes. */
function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const CREAM = rgb(CAPTION_TEXT_COLOUR);
const INK = rgb(PANEL_INK);

/**
 * The dot's texture into `data` (RGBA, `size` square): a cream disc of RETICLE_DOT_M over the quad, with a charcoal
 * ring of RETICLE_OUTLINE_M round it when `outlined` (high contrast, UX §8), clear outside. Edges are a pixel soft.
 */
export function drawDot(data: Uint8Array, size: number, outlined: boolean): void {
  const pxPerM = size / QUAD_M;
  const dotPx = (RETICLE_DOT_M / 2) * pxPerM;
  const outerPx = outlined ? dotPx + RETICLE_OUTLINE_M * pxPerM : dotPx;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.sqrt((x + 0.5 - size / 2) ** 2 + (y + 0.5 - size / 2) ** 2);
      const colour = r <= dotPx ? CREAM : INK;
      const i = 4 * (y * size + x);
      data[i] = colour[0];
      data[i + 1] = colour[1];
      data[i + 2] = colour[2];
      data[i + 3] = Math.round(255 * Math.min(1, Math.max(0, outerPx + 0.5 - r)));
    }
  }
}

const overlay = (): MeshBasicMaterial =>
  new MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false });

export class Reticle {
  readonly dot: Mesh<PlaneGeometry, MeshBasicMaterial>;
  readonly ring: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly texture: DataTexture;
  private readonly firstElement: number;
  private isOutlined = false;

  constructor(
    private readonly parent: Object3D,
    private readonly guard: FlashGuard,
  ) {
    const size = RETICLE_TEXTURE_PX;
    this.texture = new DataTexture(new Uint8Array(4 * size * size), size, size);
    this.texture.colorSpace = SRGBColorSpace;
    drawDot(this.texture.image.data as Uint8Array, size, false);
    this.texture.needsUpdate = true;
    const dotMaterial = overlay();
    dotMaterial.map = this.texture;
    this.dot = new Mesh(new PlaneGeometry(QUAD_M, QUAD_M), dotMaterial);
    const ringMaterial = overlay();
    ringMaterial.color.set(CUE_FILL_COLOUR);
    this.ring = new Mesh(
      new RingGeometry(RETICLE_RING_INNER_M, RETICLE_RING_OUTER_M, RETICLE_RING_SEGMENTS, 1, Math.PI / 2),
      ringMaterial,
    );
    this.dot.name = 'gaze-reticle';
    this.ring.name = 'gaze-ring';
    [this.dot, this.ring].forEach((mesh, i) => {
      mesh.visible = false;
      mesh.renderOrder = RETICLE_RENDER_ORDER + i;
      mesh.matrixAutoUpdate = false; // written below, with no Three.js setter: those cost heap numbers per frame
      mesh.frustumCulled = false;
      parent.add(mesh);
    });
    this.firstElement = guard.claim(2, 0);
  }

  /** High contrast (UX §8): the dot gets its outline. Redrawn on a change only. */
  setOutlined(outlined: boolean): void {
    if (outlined === this.isOutlined) return;
    this.isOutlined = outlined;
    drawDot(this.texture.image.data as Uint8Array, RETICLE_TEXTURE_PX, outlined);
    this.texture.needsUpdate = true;
  }

  /**
   * One frame. `isOn`: gaze mode in a session. The dot is `distanceM[0]` along the head's forward line and faces
   * the head; `fill[0]` (0..1) is how much of the ring is drawn. Arrays, not numbers: a fraction handed to a call
   * that is not inlined is boxed. Creates nothing.
   */
  update(head: Mat4, isOn: boolean, distanceM: Float64Array, fill: Float64Array, nowMs: number): void {
    const steps = Math.round((fill[0] as number) * RETICLE_RING_SEGMENTS);
    const dotLevel = this.guard.request(this.firstElement, isOn ? 1 : 0, nowMs);
    const ringLevel = this.guard.request(this.firstElement + 1, isOn && steps > 0 ? 1 : 0, nowMs);
    this.dot.material.opacity = dotLevel;
    this.ring.material.opacity = ringLevel;
    this.dot.visible = dotLevel > 0;
    this.ring.visible = ringLevel > 0;
    if (!this.dot.visible) return;
    // Every frame: a fade-out the guard refuses keeps the ring on show, and it must then draw nothing.
    this.ring.geometry.setDrawRange(0, steps * INDICES_PER_SEGMENT);
    for (let k = 0; k < 2; k++) {
      const mesh = k === 0 ? this.dot : this.ring;
      const m = mesh.matrix.elements;
      for (let i = 0; i < 12; i++) m[i] = head[i] as number; // the head's own turn: it faces the head
      for (let axis = 0; axis < 3; axis++) {
        // a head looks down its -z
        m[12 + axis] = (head[12 + axis] as number) - (head[8 + axis] as number) * (distanceM[0] as number);
      }
      mesh.matrixWorldNeedsUpdate = true;
    }
  }

  dispose(): void {
    for (const mesh of [this.dot, this.ring]) {
      this.parent.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.texture.dispose();
  }
}
