// FR-UI-05 (high contrast: outlines on all targets), BUG-008: the cream shell T-163 drew round the plants, for the
// seed and the Listen orb. A second draw of the target's own geometry and instances, every point pushed
// PLANT_OUTLINE_M away from the eye along its normal, so the shell lies behind the target and shows only past its
// silhouette. Cream at one strength: an outline that never changes cannot flash. Kept visible and switched by its
// count (0 = no draw call), so its program compiles with its target's, not on the first switch.
import { Color, DoubleSide, InstancedMesh, ShaderMaterial } from 'three';

import { CREAM, PLANT_OUTLINE_M } from './config.js';

import type { BufferGeometry, Mesh } from 'three';

export const glsl = (value: number): string => value.toFixed(5);
/** Linear: `colorspace_fragment` writes it out as the canvas wants it. */
export const CREAM_RGB = new Color(CREAM).toArray();

const VERTEX = /* glsl */ `
void main() {
  vec4 view = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 n = normalMatrix * (mat3(instanceMatrix) * normal);
  float size = length(n); // 0 for an instance with no size: it stays a point, not a cream dot
  if (size > 0.0) view.xyz += (dot(n, view.xyz) < 0.0 ? -n : n) * (${glsl(PLANT_OUTLINE_M)} / size);
  gl_Position = projectionMatrix * view;
}`;
const FRAGMENT = /* glsl */ `
void main() {
  gl_FragColor = vec4(${CREAM_RGB.map(glsl).join(', ')}, 1.0);
  #include <colorspace_fragment>
}`;

/**
 * A shell for `target`, added as its child, so it is hidden with it: it shares the geometry and, for an
 * InstancedMesh, the instance matrices (else it is one instance where the target is). Its count starts at 0; the
 * target's renderer sets it each frame. Dispose its material only.
 */
export function outlineShell(target: Mesh): InstancedMesh<BufferGeometry, ShaderMaterial> {
  const shell = new InstancedMesh(
    target.geometry,
    // Both sides: the half pushed out is the far half, which faces away from the eye (seen culled in BUG-008).
    new ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, side: DoubleSide }),
    1,
  );
  // The target's own places: written once, drawn twice.
  if (target instanceof InstancedMesh) shell.instanceMatrix = target.instanceMatrix;
  shell.count = 0;
  shell.frustumCulled = false; // its bounds would be computed once, from the instances of that moment
  shell.matrixAutoUpdate = false;
  target.add(shell);
  return shell;
}
