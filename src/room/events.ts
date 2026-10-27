// The events room/ emits, merged into core's EventMap (API_SPEC §2). Declarations only: no runtime code.
// A consumer names a payload as EventMap['room:bedPlaced'], with EventMap imported from core/.
import type { BedPlacement, RoomSurfaces } from './types.js';
import type { PlacementLevel, RoomFeatures } from '../garden/index.js';

declare module '../core/index.js' {
  interface EventMap {
    /** Each level the placement chain tries, in order; the last one of a run is the level of its bed. */
    'room:placementLevel': { level: PlacementLevel };
    /** `restored`: the pose came back from the saved anchor and the chain did not run (API_SPEC §1.3). `inWindow`:
     *  true when placed in the garden window (no XR session; absent otherwise): no anchor there, and the saved
     *  pair is the headset's, which stays (bug bash 27 Oct). */
    'room:bedPlaced': { placement: BedPlacement; restored: boolean; inWindow?: true };
    /** A new persistent anchor exists (FR-ROOM-07). Never in a restored session. */
    'room:anchored': { handle: string; level: PlacementLevel };
    'room:features': { features: RoomFeatures; surfaces: RoomSurfaces };
  }
}
