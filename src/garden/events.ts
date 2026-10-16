// The events garden/ emits, merged into core's EventMap (API_SPEC §2). Declarations only: no runtime code.
// GardenSystem emits them; a consumer names a payload as EventMap['garden:removed'], EventMap from core/.
import type { GardenState, GrowthDelta, RoomSignature, Seed, UndoToken } from './model.js';
import type { Hand } from '../core/index.js';

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
    /** A seed joined the supply: one event per new seed of a visit. Not a seed reaching a hand. */
    'garden:seedArrived': { seed: Seed };
    /** The next seed of the supply rests on that hand (FR-HND-05). At most one is out; it stays in `seeds`. */
    'garden:seedOut': { seed: Seed; hand: Hand };
    /**
     * The seed that was out is in the supply again: released off the bed, released over a full bed, the
     * carrying hand lost past its grace, or the session ended or New garden ran (API_SPEC §1.10 rule 8).
     */
    'garden:seedBack': { seedId: string; reason: 'offBed' | 'full' | 'lost' | 'reset' };
    /** FR-ROOM-11/13. `starterSeeds`: this session issued the starter seeds (a new garden). */
    'room:signature': { signature: RoomSignature; starterSeeds: boolean };
    'listen:enter': Record<string, never>;
    /** `timedOut`: Listen ran its whole 10 minutes (UX §3.5: the ending chord and "Goodnight"); false for a wake. */
    'listen:exit': { timedOut: boolean };
  }
}
