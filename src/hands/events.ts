// The events hands/ emits (API_SPEC §2): declarations only. A consumer names a payload as
// EventMap['gesture:release'], with EventMap imported from core/.
import type { GesturePayload } from './GestureMachine.js';
import type { TargetRef } from './TargetPicker.js';
import type { Hand } from '../core/index.js';
import type { Cell } from '../garden/index.js';

declare module '../core/index.js' {
  interface EventMap {
    'gesture:palmUp': GesturePayload<'gesture:palmUp'>;
    'gesture:pinchStart': GesturePayload<'gesture:pinchStart'>;
    'gesture:pull': GesturePayload<'gesture:pull'>;
    'gesture:drag': GesturePayload<'gesture:drag'>;
    'gesture:release': GesturePayload<'gesture:release'>;
    'gesture:palmsOut': GesturePayload<'gesture:palmsOut'>;
    'gesture:wake': GesturePayload<'gesture:wake'>;
    'gesture:trackingLost': GesturePayload<'gesture:trackingLost'>;
    /**
     * Once per loss and once per return, at once, before the grace runs (FR-HND-15). `held`: what the hand holds
     * (a seed, a plant, a pressed target); null for an empty hand. Both objects are reused by their emitter.
     */
    'hands:lost': { hand: Hand; held: TargetRef | null };
    'hands:found': { hand: Hand };
    /** On change only (FR-HND-16). `cell` = the cell a release would commit. The object is reused by its emitter. */
    'target:hover': { hand: Hand; target: TargetRef | null; cell: Cell | null };
  }
}
