// The ECS components more than one module needs (LLD §3, API_SPEC §1). Data only: no systems, DOM or renderer here.
// API checked against @iwsdk/core 1.0.1 / elics 3.4.2: node_modules/elics/lib/types.d.ts (SchemaField, no matrix
// type) and node_modules/@iwsdk/core/dist/ecs/entity.d.ts (Entity.object3D).
import { createComponent, Types } from '@iwsdk/core';

import { BED_ANCHOR_INNER_M, BED_ANCHOR_OUTER_M } from './config.js';

/**
 * The bed. Its pose is the entity's own transform, not a field: a reader takes
 * `entity.object3D.matrixWorld.elements`, which is a Mat4. room/ writes and calls `updateMatrixWorld()` when it
 * moves the bed, so a reader in the same frame sees the new pose. hands, render and audio read.
 */
export const BedAnchor = createComponent('BedAnchor', {
  // Float64: a Float32 would read 0.12 back as 0.11999999731779099
  inner: { type: Types.Float64, default: BED_ANCHOR_INNER_M },
  outer: { type: Types.Float64, default: BED_ANCHOR_OUTER_M },
  heightOffset: { type: Types.Float32, default: 0 }, // metres, ±0.10 (FR-UI-10)
  source: {
    type: Types.Enum,
    enum: { table: 'table', surface: 'surface', hittest: 'hittest', floating: 'floating' },
    default: 'floating',
  },
});

/** A pinch or gaze target. render and ui attach it; hands (TargetPicker) and access read it. */
export const Interactable = createComponent('Interactable', {
  kind: {
    type: Types.Enum,
    enum: { plant: 'plant', seed: 'seed', orb: 'orb', undo: 'undo', panel: 'panel' },
    default: 'plant',
  },
  id: { type: Types.String, default: '' },
  // hands reads the radius once, when the component is added: to change it, remove the component and add it again
  radius: { type: Types.Float32, default: 0 }, // metres; the attacher sets it (hands/config.ts HIT_RADIUS_M)
  worldPos: { type: Types.Vec3, default: [0, 0, 0] }, // read and write through entity.getVectorView
});

/** One caption on screen. Any module raises one by creating an entity with it; ui/Captions.ts is the only reader. */
export const Caption = createComponent('Caption', {
  key: { type: Types.String, default: '' }, // a StringKey of core/strings.ts
  expiresAt: { type: Types.Float64, default: 0 }, // ms on core's clock
});
