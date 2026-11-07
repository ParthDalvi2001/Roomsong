// The shaky-hands scenarios, in their order: the browser spec, the videos and the headset's ghost mode read this one
// table. Plain data, with no import, so it loads in Node and in the page alike.

export interface ShakyScenario {
  n: number;
  title: string;
  /** For the video's README: what a watcher should look at. */
  watch: string;
  bug: string;
  /** Flags the page opens with. */
  flags: string;
  /** Keeps the tutorial on. Every other scene skips it. */
  tutorial?: boolean;
  /** It has no XR session to play in, so the headset's ghost mode leaves it out. */
  pageOnly?: boolean;
  /** A bug this scene found and nobody has fixed: the test is expected to fail (test.fail) until it is. */
  newBug?: string;
}

/** Three plants: the middle ring nearest the player, (2,11) across the bed, and (3,2) on the side. API_SPEC §3. */
const PLANTS = 'autoplant=3,seed=36';

export const SHAKY_SCENARIOS: readonly ShakyScenario[] = [
  {
    n: 1,
    title: 'Palm up through tracking drops: a seed arrives',
    watch: 'The left hand flickers in and out, palm up; a seed still glides to it.',
    bug: 'BUG-021',
    flags: '',
  },
  {
    n: 2,
    title: 'The hand holding the seed pinches it off its own palm, carries it, plants it',
    watch:
      'One hand does it all: seed on the palm, its own pinch, the carry down, a plant on the glowing ring.',
    bug: 'BUG-023',
    flags: '',
  },
  {
    n: 3,
    title: 'The other palm goes up: the seed crosses; the first hand pinches it',
    watch:
      'The seed leaves the left palm for the right one once the left is down; the left hand then takes it.',
    bug: 'BUG-024',
    flags: '',
  },
  {
    n: 4,
    title: 'Pinch a plant by its head, fingers off in depth',
    watch:
      'The fingers stop 13 cm short of the plant, on the line from the eyes, and the pinches still take it.',
    bug: 'BUG-025, BUG-030',
    flags: PLANTS,
  },
  {
    n: 5,
    title: "A small pull that commits, the hand staying in the headset's view",
    watch: 'A 3.5 cm lift with one tracking drop; the plant grows with the fingers, its head stays at them.',
    bug: 'BUG-026',
    flags: PLANTS,
  },
  {
    n: 6,
    title: 'Slide a plant sideways along the ring: a move',
    watch: 'The plant follows the fingers one step along its ring and stays on that ring.',
    bug: 'none: regression',
    flags: PLANTS,
  },
  {
    n: 7,
    title: 'Drag a plant off the ring, a petal appears, pinch it: undo',
    watch:
      'The plant is dropped past the rim, a petal stands where it was, a pinch on it brings the plant back.',
    bug: 'none: never yet confirmed on a device',
    flags: PLANTS,
  },
  {
    n: 8,
    title: 'Listen: both palms out, shaky; wake by palm, and by pinch',
    watch:
      'Both palms out and wobbling, the left one flickering; the room dims; a palm to the face wakes it; again by a pinch.',
    bug: 'BUG-021 (the Listen hold)',
    flags: PLANTS,
  },
  {
    n: 9,
    title: 'Settings: the orb opens at the pinch; a button pressed with fingers 25 cm from the head; close',
    watch:
      'The panel opens as the fingers close on the orb; fingers far short of the panel still press Volume + and Close.',
    bug: 'BUG-027, BUG-029',
    flags: PLANTS,
  },
  {
    n: 10,
    title: 'Start page: a stray tap near Enter switches nothing on; the Accessibility section is closed',
    watch:
      'Dots mark taps over the whole page under Enter: no switch shows or changes; then Enter still works.',
    bug: 'BUG-028',
    flags: '',
    pageOnly: true,
  },
  {
    n: 11,
    title: 'With nothing planted, the tutorial keeps the palm hint past 60 s',
    watch: 'The clock jumps 61 s and the palm hint stays; a palm up then still brings a seed.',
    bug: 'BUG-022',
    flags: '',
    tutorial: true,
  },
  {
    n: 12,
    title: 'Undo by sight: the petal pinched with the fingers 13 cm short of it',
    watch:
      'As scene 7, but the fingers stop short of the petal on the line from the eyes, as they do for a plant.',
    bug: 'BUG-032 (new)',
    flags: PLANTS,
  },
  {
    n: 13,
    title: 'Move by sight: a plant pinched with the fingers 13 cm short, slid one step along its ring',
    watch: 'As scene 6, but the fingers stay 13 cm short of the head on the line from the eyes all the way.',
    bug: 'BUG-033 (new)',
    flags: PLANTS,
  },
];
