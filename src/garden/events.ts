// The events garden/ emits, merged into core's EventMap (API_SPEC §2). Declarations only: no runtime code.
// GardenSystem emits them; a consumer names a payload as EventMap['garden:removed'], EventMap from core/.
import type { GardenState, GrowthDelta, RoomSignature, Seed, UndoToken } from './model.js';

declare module '../core/index.js' {
  interface EventMap {
    /** The state after a reducer changed it. `diff` holds plant ids; `changed` = moved or reshaped. */
    'garden:changed': {
      state: GardenState;
      diff: { added: readonly string[]; removed: readonly string[]; changed: readonly string[] };
    };
    /** A plant was dragged off the bed (FR-HND-11). The undo is good until `expiresAt` (FR-MUS-12). */
    'garden:removed': { plantId: string; undoToken: UndoToken; expiresAt: number };
    'garden:grown': { deltas: readonly GrowthDelta[] };
    'garden:seedArrived': { seed: Seed };
    /** FR-ROOM-11/13. `starterSeeds`: this session issued the starter seeds (a new garden). */
    'room:signature': { signature: RoomSignature; starterSeeds: boolean };
    'listen:enter': Record<string, never>;
    'listen:exit': Record<string, never>;
  }
}
