// Plain shared types (API_SPEC §1.0). No methods, no imports.

export type Hand = 'left' | 'right';

// A Three.js Vector2 / Vector3 satisfies Vec2 / Vec3 structurally, so callers pass their own vectors with no copy.
export interface Vec2 {
  x: number;
  y: number;
}
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 16 numbers, column-major: the layout of THREE.Matrix4.elements. A callee only reads it. */
export type Mat4 = ArrayLike<number>;
