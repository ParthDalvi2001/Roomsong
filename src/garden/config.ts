// Named constants of garden/ (CODING_GUIDELINES §4). Each cites the requirement it comes from.

/** FR-MUS-01: the bed is an annulus; radii in metres. core/config.ts repeats both (BedAnchor). */
export const BED_INNER = 0.12;
export const BED_OUTER = 0.3;
/** FR-MUS-01: 5 pitch rings (0 = inner) of 16 steps = 80 cells. */
export const RINGS = 5;
export const STEPS = 16;

/** FR-HND-10: a point nearer the centre than BED_INNER minus this is in the inner hole (zone 'inner'). */
export const ZONE_INNER_MARGIN_M = 0.03;
/** FR-HND-11: a point farther out than BED_OUTER plus this is off the bed (zone 'outer'). */
export const ZONE_OUTER_MARGIN_M = 0.05;

/** FR-HND-08: the vertical hand travel, in metres, that takes a plant's height from 0 to 1. */
export const PULL_RANGE_M = 0.25;
/** API_SPEC §1.1 (plantSeed): the height a new plant starts at; the sound prototype's value. */
export const NEW_PLANT_HEIGHT = 0.55;
