// One hand as it was last sampled (LLD §3). HandSystem writes it every XR frame; access, render and onboarding
// read it. Data only, and in a file of its own: src/components.ts lists it and must stay free of systems.
import { createComponent, Types } from '@iwsdk/core';

/** The fields of `HandFrame` (API_SPEC §1.4). The vectors are read and written through `entity.getVectorView`. */
export const HandState = createComponent('HandState', {
  hand: { type: Types.Enum, enum: { left: 'left', right: 'right' }, default: 'left' },
  tracked: { type: Types.Boolean, default: false },
  pinch: { type: Types.Boolean, default: false },
  select: { type: Types.Boolean, default: false },
  pinchPos: { type: Types.Vec3, default: [0, 0, 0] },
  palmPos: { type: Types.Vec3, default: [0, 0, 0] },
  palmNormal: { type: Types.Vec3, default: [0, 0, 0] },
  velocity: { type: Types.Vec3, default: [0, 0, 0] },
});
