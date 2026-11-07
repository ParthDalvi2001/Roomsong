// Dev server only, with ?rec=1&ghost=1 (vite.config.ts, plugin roomsong-headset-recorder): the shaky-hands scenes
// (tests/e2e/support/shaky-scenarios.ts) played on a real headset by pretend hands, drawn as dots and lines with the
// app's own HandCue, around wherever the bed landed, so a tester can watch them in the room. The real hands are not
// read meanwhile. Nothing it does is saved: it tells the page another tab has the garden (the app's own BroadcastChannel
// rule), so saving stops ("Saving unavailable"); a reload brings the saved garden and settings back. Scene 10 (the start
// page) and scene 11 (the tutorial, which starts only on an empty bed at a session's start) are not played here.
// Allocates per frame by design: never in a build. Untested on a headset: written and run in the emulator only.
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3 } from 'three';

import { settings } from '../../src/core/index.js';
import { HandSystem } from '../../src/hands/HandSystem.js';
import { HandCue, JOINTS } from '../../src/render/HandCue.js';
import { jointOf, type Driver, type Hand } from '../e2e/support/shaky-rig.js';
import { play, prepare } from '../e2e/support/shaky-scenarios.js';
import { SHAKY_SCENARIOS } from '../e2e/support/shaky-table.js';

/** HandSampler's JOINTS, as indices into WebXR's 25: thumb tip, index tip, wrist, index and pinky knuckles. */
const SAMPLED = [4, 9, 0, 6, 21];
const SEED = 20261107;
/** The garden's private parts this tool resets between scenes (dev only; GardenSystem.ts). */
interface GardenInside {
  state: { plants: { id: string }[] } | null;
  newGarden(): void;
  appFlags: object;
  autoplanted(state: object): { plants: { id: string }[] };
  commit(state: object, added: string[]): void;
}
interface SamplerInside {
  detach(): void;
  attach(session: XRSession): void;
  jointsOf?: (hand: Hand) => unknown;
  fill?: (joints: { hand: Hand }, track: { poses: Float32Array }) => boolean;
}

/** Each pretend hand's 25 joints as 4 x 4 matrices (a place each), and whether it is tracked now. */
const ghosts = {
  left: { poses: new Float32Array(16 * 25), tracked: false },
  right: { poses: new Float32Array(16 * 25), tracked: false },
};
const fakeHand = (hand: Hand) => ({
  hand,
  get: (joint: XRHandJoint) => ({ hand, index: JOINTS.indexOf(joint) }),
});
const hands = { left: fakeHand('left'), right: fakeHand('right') };
const joint = new Vector3();

let session: XRSession | null = null;
const driver: Driver = {
  hand(hand, at, turn: Quaternion, curl, tracked) {
    const ghost = ghosts[hand];
    ghost.tracked = tracked;
    for (let j = 0; j < 25; j++) {
      jointOf(hand, j, curl, joint).applyQuaternion(turn).add(at);
      ghost.poses.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, joint.x, joint.y, joint.z, 1], 16 * j);
    }
  },
  select() {}, // no platform select: HandSampler takes the joints' pinch for it, as it does in any such session
  head() {}, // the head is the player's own
  frame(callback) {
    session?.requestAnimationFrame(() => callback());
  },
};
const rig = prepare(SEED, driver); // now, to hear the room tune

/** A label over the bed: the scene and its beat, turned to the head each frame. */
function label() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const texture = new CanvasTexture(canvas);
  const mesh = new Mesh(
    new PlaneGeometry(0.5, 0.078),
    new MeshBasicMaterial({ map: texture, transparent: true, depthTest: false }),
  );
  mesh.renderOrder = 1000;
  const draw = (title: string, beat: string) => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '600 34px system-ui, sans-serif';
    ctx.fillText(title, 20, 52, 984);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(beat, 20, 110, 984);
    texture.needsUpdate = true;
  };
  return { mesh, draw };
}

async function main(): Promise<void> {
  const dev = () => window.__roomsong;
  await until(
    () =>
      dev() !== undefined && dev()!.world.renderer.xr.getSession() !== null && rig.count('room:tuned') > 0,
  );
  const { world } = dev()!;
  const garden = dev()!.garden as unknown as GardenInside;
  session = world.renderer.xr.getSession()!;
  new BroadcastChannel('roomsong').postMessage('opened'); // the app's rule: this page saves no more
  const settingsBefore = settings.get();

  // The pretend hands in place of the real ones: HandSampler reads them, HandCue draws them.
  const sampler = world.getSystem(HandSystem)!.sampler as unknown as SamplerInside;
  sampler.detach();
  sampler.jointsOf = (hand) => (ghosts[hand].tracked ? hands[hand] : null);
  sampler.fill = (joints, track) => {
    const from = ghosts[joints.hand].poses;
    SAMPLED.forEach((j, k) => track.poses.set(from.subarray(16 * j, 16 * j + 16), 16 * k));
    return true;
  };
  const cue = new HandCue(world.scene);
  const fakeFrame = {
    fillPoses(spaces: { hand: Hand; index: number }[], _space: unknown, out: Float32Array) {
      spaces.forEach(({ hand, index }, i) =>
        out.set(ghosts[hand].poses.subarray(16 * index, 16 * index + 16), 16 * i),
      );
      return true;
    },
  } as unknown as XRFrame;
  const board = label();
  world.scene.add(board.mesh);
  let title = '';
  rig.onBeat = (beat) => board.draw(title, beat);
  const space = world.renderer.xr.getReferenceSpace();
  const drawFrame = () => {
    if (session === null) return;
    const sources = (['left', 'right'] as const)
      .filter((hand) => ghosts[hand].tracked)
      .map((hand) => ({ handedness: hand, hand: hands[hand] }) as unknown as XRInputSource);
    cue.update(fakeFrame, space, sources);
    const head = world.player.head;
    board.mesh.position.copy(rig.fromBed(0, 0.3, -0.05));
    board.mesh.quaternion.copy(head.getWorldQuaternion(new Quaternion()));
    session.requestAnimationFrame(drawFrame);
  };
  drawFrame();

  const results: string[] = [];
  rig.start();
  for (const s of SHAKY_SCENARIOS) {
    if (s.pageOnly === true || s.tutorial === true) continue;
    title = `Ghost ${s.n}: ${s.title}`;
    board.draw(title, 'Starting');
    // Each scene from the garden its browser test starts with: three starter seeds, or the three plants of PLANTS.
    garden.newGarden();
    if (s.flags.includes('autoplant')) {
      const real = garden.appFlags;
      garden.appFlags = { ...real, autoplant: 3, seed: 36 };
      const planted = garden.autoplanted(garden.state!);
      garden.appFlags = real;
      garden.commit(
        planted,
        planted.plants.map((p) => p.id),
      );
    }
    await rig.wait(1500);
    try {
      await play(s.n);
      results.push(`${s.n} passed`);
      board.draw(title, s.newBug === undefined ? 'Passed' : `Passed: ${s.newBug.split(':')[0]} looks fixed`);
    } catch (error) {
      results.push(`${s.n} failed`);
      board.draw(title, `Failed: ${String(error).slice(7, 90)}`);
      console.warn(`ghost ${s.n}: ${String(error)}`); // the recorder (rec=1) logs it
    }
    // Hands down at once, the result on the label meanwhile: a pose left up would ask for a seed or for Listen.
    await Promise.all([rig.open('left'), rig.open('right')]);
    rig.dropMode('left', 'none');
    rig.dropMode('right', 'none');
    await Promise.all([rig.rest('left', 400), rig.rest('right', 400)]);
    await rig.wait(2500);
  }

  // The real hands again. The garden on screen is the ghost's: a reload brings the saved one back.
  rig.stop();
  delete sampler.jointsOf;
  delete sampler.fill;
  sampler.attach(session);
  settings.set(settingsBefore);
  ghosts.left.tracked = ghosts.right.tracked = false;
  title = `Ghost done: ${results.join(', ')}`;
  board.draw(title, 'Reload the page for your own garden (nothing was saved)');
  console.warn(`ghost: ${results.join(', ')}`);
}

function until(isDone: () => boolean): Promise<void> {
  return new Promise((done) => {
    const look = () => (isDone() ? done() : setTimeout(look, 250));
    look();
  });
}

void main();
