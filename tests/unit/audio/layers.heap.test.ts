// NFR-PERF-08 for the T-164 layers: Layers.rests (P-009), Layers.groove and Layers.step, the code the scheduler tick
// runs for every plant note and every step, create nothing with every layer of a style on (groove, echo, breathing filter, drone, kick,
// shaker, counter-line and variations); and Layers.listen, the Listen sweep (§6), in and out across the bars, creates nothing either. The pool
// here takes each note and builds nothing: a note's own nodes are the voice triggers the rule allows
// (CODING_GUIDELINES §5). The probe of the whole tick with a style is in engine.test.ts.
import { describe, expect, it } from 'vitest';

import { Layers } from '../../../src/audio/Layers.js';
import { Scheduler } from '../../../src/audio/Scheduler.js';
import { STYLES } from '../../../src/audio/styles.js';
import { STEPS, WANDERER } from '../../../src/garden/index.js';
import { heapCost, PROBE_BYTES } from '../hands/heapCost.js';

import { FakeAudioContext, type FakeNode, type FakeParam } from './fakeAudio.js';

import type { Grooved } from '../../../src/audio/Layers.js';
import type { VoiceType } from '../../../src/garden/index.js';

/** 250 bars. */
const STEPS_RUN = 4000;
const MOST_ROUNDS = 20;
/**
 * Measured 21 bytes a step (2026-10-16, Node 24) while this loop computed each step's time and handed it to `groove`
 * and `step`, boxed by V8 as a number handed to a call is (the engine hands on the scheduler's, boxed already); 14 a
 * step (2026-10-25) with the times made before the loop, Listen on or off: the layers' own small fractions on their
 * way back from calls. One small object a step adds 16 or more: an object made for each step reads 37 and fails.
 */
const MOST_BYTES_A_STEP = 32;
/** The Listen sweep goes in and out every this many bars in the second case. */
const LISTEN_BARS = 2;

type Cost = { gcs: number; grewBytes: number };
const isClean = (cost: Cost): boolean =>
  cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < PROBE_BYTES + MOST_BYTES_A_STEP * STEPS_RUN;

/** Style A on the fake context, every layer in; the breath's and the dim's parameter events counted, not kept. */
function make() {
  const ctx = new FakeAudioContext();
  let notes = 0;
  // The counter-line's notes (style A: on the Pluck, §1.7) and the variations' echoes and ghosts (owned by their
  // plant, §1.8): this loop plays no plant note itself, so an owned note is a variation's.
  let counterNotes = 0;
  let variationNotes = 0;
  const pluck = {};
  const pool = {
    ref: { note: null },
    play: (
      voice: object,
      _t: number,
      _p: object,
      _x: number,
      _y: number,
      _z: number,
      owner: object | null,
    ): boolean => {
      notes++;
      if (voice === pluck) counterNotes++;
      if (owner !== null) variationNotes++;
      return true;
    },
  };
  const stepS = Scheduler.stepDurationFor(84);
  const compressor = ctx.createDynamicsCompressor();
  const steps: Grooved[][] = Array.from({ length: STEPS }, () => []);
  const layers = new Layers({
    ctx: ctx.audio,
    pool: pool as never,
    scheduler: { stepS } as never,
    recipe: { ...STYLES.A },
    bell: {} as never,
    pluck: pluck as never,
    choirPulse: {},
    bus: ctx.createGain() as never,
    master: ctx.createGain() as never,
    compressor: compressor as never,
    bed: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1],
    key: () => WANDERER,
    steps,
    seed: 164,
  });
  layers.restyle(0);
  // The fake keeps each parameter event as an object: the breathing filter's glide, once a bar and at each Listen
  // change, and the Listen dim's, are counted instead. The chain is master → breath → dim → compressor.
  const dim = compressor.inputs[0] as FakeNode;
  const breath = (dim.inputs[0] as FakeNode).frequency;
  let breathGlides = 0;
  let dimGlides = 0;
  breath.setTargetAtTime = (): FakeParam => {
    breathGlides++;
    return breath;
  };
  dim.gain.setTargetAtTime = (): FakeParam => {
    dimGlides++;
    return dim.gain;
  };
  const voices: VoiceType[] = ['bell', 'pad', 'pluck', 'bass', 'choir', 'bell', 'pluck', 'pad'];
  const records: Grooved[] = voices.map((voice, i) => ({
    plant: {
      id: `p${i}`,
      voice,
      cell: { ring: i % 5, step: 2 * i },
      height: 0.55,
      hue: 0.5,
      plantedAt: 0,
    },
    params: { hz: 220, gain: 0.3, release: 1, cutoffMul: 1, detune: 0 },
    seed: i * 7919,
    voice: {} as never,
    x: 0,
    y: 0.74,
    z: -0.45,
  }));
  for (const r of records) steps[r.plant.cell.step]!.push(r); // the engine's lists: the counter-line and the variations draw from them
  // The step times exist before the loop, as numbers already on the heap (the array starts with a non-number, so
  // it keeps them boxed): a fraction worked out in the loop and handed to a call would be boxed by the test. The
  // sink is a typed array for the same reason (a fraction written to a closure's variable is boxed).
  const TIMES: unknown[] = [null];
  for (let i = 1; i <= STEPS_RUN * (MOST_ROUNDS + 2); i++) TIMES.push(i * stepS);
  const sink = new Float64Array(1);
  let k = 0;
  /** STEPS_RUN steps as the engine's tick runs them; `onBar` at each bar's first step, with the bar and its time. */
  const run = (onBar: ((bar: number, time: number) => void) | null = null): void => {
    for (let i = 0; i < STEPS_RUN; i++) {
      const abs = ++k;
      const step = abs % STEPS;
      const bar = (abs / STEPS) | 0;
      const time = TIMES[abs] as number;
      if (onBar !== null && step === 0) onBar(bar, time);
      for (let r = 0; r < records.length; r++) {
        const rec = records[r] as Grooved;
        if (rec.plant.cell.step !== step || layers.rests(rec, bar)) continue; // P-009, as the engine's tick
        layers.groove(rec, step, bar, time);
        sink[0] = sink[0]! + layers.noteTime + layers.note.gain;
      }
      layers.step(step, time, bar, records.length);
    }
  };
  return {
    layers,
    run,
    notes: () => notes,
    counterNotes: () => counterNotes,
    variationNotes: () => variationNotes,
    sink: () => sink[0]!,
    breathGlides: () => breathGlides,
    dimGlides: () => dimGlides,
  };
}

/** Rounds until one is clean, up to MOST_ROUNDS; the last is the one judged. */
function measure(run: () => void): Cost[] {
  const rounds: Cost[] = [];
  for (let i = 0; i < MOST_ROUNDS; i++) {
    const cost = heapCost(run);
    rounds.push(cost);
    if (isClean(cost)) break;
  }
  return rounds;
}

describe('the layers per step (NFR-PERF-08, T-164)', () => {
  // Coverage turns off V8's optimizing tier, so every number in the step is boxed (about 200 KB a round): this probe
  // only means something in `npm run verify`, which runs it without coverage.
  it.skipIf(process.env.npm_lifecycle_event === 'test:coverage')(
    'style A, 8 plants, every layer in: groove and step make no object, array or closure',
    () => {
      const m = make();
      m.run(); // warm up, and every layer is in
      const before = m.notes();
      // The counts as the judged round (the last) began: small integers, which a closure keeps off the heap.
      let counterAt = 0;
      let variationAt = 0;
      const rounds = measure(() => {
        counterAt = m.counterNotes();
        variationAt = m.variationNotes();
        m.run();
      });
      expect(isClean(rounds[rounds.length - 1]!), JSON.stringify(rounds)).toBe(true);
      // Drone, kick and shaker played: about 11 layer notes a bar.
      expect((m.notes() - before) / ((rounds.length * STEPS_RUN) / STEPS)).toBeGreaterThan(10);
      // The counter-line (§1.7) and the variations' echoes and ghosts (§1.8) played in the judged round too.
      expect(m.counterNotes() - counterAt).toBeGreaterThan(0);
      expect(m.variationNotes() - variationAt).toBeGreaterThan(0);
      expect(m.breathGlides()).toBeGreaterThan(STEPS_RUN / STEPS);
      expect(Number.isFinite(m.sink())).toBe(true);
    },
  );

  it.skipIf(process.env.npm_lifecycle_event === 'test:coverage')(
    'the Listen sweep in and out every two bars, under the same steps, makes nothing: two glides a change',
    () => {
      const m = make();
      let changes = 0;
      const sweep = (bar: number, time: number): void => {
        if (bar % LISTEN_BARS !== 0) return;
        m.layers.listen((bar / LISTEN_BARS) % 2 === 0, time);
        changes++;
      };
      m.run(sweep); // warm up
      const dimBefore = m.dimGlides();
      const changesBefore = changes;
      const rounds = measure(() => m.run(sweep));
      expect(isClean(rounds[rounds.length - 1]!), JSON.stringify(rounds)).toBe(true);
      // It did the work: a change every LISTEN_BARS bars, each one glide of the dim (and one of the breath).
      const made = changes - changesBefore;
      expect(made).toBe((rounds.length * STEPS_RUN) / STEPS / LISTEN_BARS);
      expect(m.dimGlides() - dimBefore).toBe(made);
      expect(m.breathGlides()).toBeGreaterThan(made);
      console.log(
        `T-164 §6 Layers.listen, ${made} changes: heap ${JSON.stringify(rounds[rounds.length - 1])} per ` +
          `${STEPS_RUN} steps, after ${rounds.length} rounds (Node)`,
      );
    },
  );
});
