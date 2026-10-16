// NFR-PERF-08 for the T-164 layers: Layers.groove and Layers.step, the code the scheduler tick runs for every plant
// note and every step, create nothing with every layer of a style on (groove, echo, breathing filter, drone, kick
// and shaker). The pool here takes each note and builds nothing: a note's own nodes are the voice triggers the rule
// allows (CODING_GUIDELINES §5). The probe of the whole tick with a style is in engine.test.ts.
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
 * Measured 21 bytes a step (2026-10-16, Node 24): the step's time, which this loop computes and hands to `groove`
 * and `step`, boxed by V8 as a number handed to a call is (the engine hands on the scheduler's, boxed already). One
 * small object a step adds 16 or more: an object made for each step reads 37 and fails.
 */
const MOST_BYTES_A_STEP = 32;

describe('the layers per step (NFR-PERF-08, T-164)', () => {
  it('style A, 8 plants, every layer in: groove and step make no object, array or closure', () => {
    const ctx = new FakeAudioContext();
    let notes = 0;
    const pool = {
      ref: { note: null },
      play: (): boolean => {
        notes++;
        return true;
      },
    };
    const stepS = Scheduler.stepDurationFor(84);
    const compressor = ctx.createDynamicsCompressor();
    const layers = new Layers({
      ctx: ctx.audio,
      pool: pool as never,
      scheduler: { stepS } as never,
      recipe: { ...STYLES.A },
      bell: {} as never,
      choirPulse: {},
      bus: ctx.createGain() as never,
      master: ctx.createGain() as never,
      compressor: compressor as never,
      bed: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0.74, -0.45, 1],
      key: () => WANDERER,
    });
    layers.restyle(0);
    // The fake keeps each parameter event as an object: the breathing filter's glide, once a bar, is counted.
    const breath = (compressor.inputs[0] as FakeNode).frequency;
    let glides = 0;
    breath.setTargetAtTime = (): FakeParam => {
      glides++;
      return breath;
    };
    const voices: VoiceType[] = ['bell', 'pad', 'pluck', 'bass', 'choir', 'bell', 'pluck', 'pad'];
    const records: Grooved[] = voices.map((voice, i) => ({
      plant: { id: `p${i}`, voice, cell: { ring: i % 5, step: 2 * i }, height: 0.55, hue: 0.5, plantedAt: 0 },
      params: { hz: 220, gain: 0.3, release: 1, cutoffMul: 1, detune: 0 },
      seed: i * 7919,
    }));
    let k = 0;
    let sink = 0;
    const run = (): void => {
      for (let i = 0; i < STEPS_RUN; i++) {
        const abs = ++k;
        const step = abs % STEPS;
        const bar = (abs / STEPS) | 0;
        const time = abs * stepS;
        for (let r = 0; r < records.length; r++) {
          const rec = records[r] as Grooved;
          if (rec.plant.cell.step !== step) continue;
          layers.groove(rec, step, bar, time);
          sink += layers.noteTime + layers.note.gain;
        }
        layers.step(step, time, bar, records.length);
      }
    };
    const isClean = (cost: { gcs: number; grewBytes: number }): boolean =>
      cost.gcs === 0 && cost.grewBytes >= 0 && cost.grewBytes < PROBE_BYTES + MOST_BYTES_A_STEP * STEPS_RUN;

    run(); // warm up, and every layer is in
    const before = notes;
    const rounds: { gcs: number; grewBytes: number }[] = [];
    for (let i = 0; i < MOST_ROUNDS; i++) {
      const cost = heapCost(run);
      rounds.push(cost);
      if (isClean(cost)) break;
    }
    expect(
      isClean(rounds[rounds.length - 1] as { gcs: number; grewBytes: number }),
      JSON.stringify(rounds),
    ).toBe(true);
    // Drone, kick and shaker played: about 11 layer notes a bar.
    expect((notes - before) / ((rounds.length * STEPS_RUN) / STEPS)).toBeGreaterThan(10);
    expect(glides).toBeGreaterThan(STEPS_RUN / STEPS);
    expect(Number.isFinite(sink)).toBe(true);
  });
});
