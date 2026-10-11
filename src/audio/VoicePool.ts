// The voice cap (FR-MUS-07, NFR-PERF-10, LLD §7.1): every sound takes one of the 24 voice channels, so no more
// than 24 notes exist at once. A request that finds no free channel steals the oldest-quietest note. One note
// record per channel, made once: playing a note allocates nothing here.
import { STEAL_FADE_S, VOICE_CAP } from './config.js';
import { Note, type NoteRef, type Voice, type VoiceParams } from './voices/note.js';

import type { Spatializer } from './Spatializer.js';

export class VoicePool {
  private readonly notes: Note[] = [];
  private readonly owners: (object | null)[] = [];
  /** The voices write each note through this: `play` points it at the record of the channel it picked. */
  readonly ref: NoteRef;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly space: Spatializer,
  ) {
    for (let i = 0; i < VOICE_CAP; i++) {
      this.notes.push(new Note());
      this.owners.push(null);
    }
    this.ref = { note: this.notes[0] as Note };
  }

  /**
   * Play one note of `voice` at audio time `time`, at a world position. `owner` names who plays it, for `release`.
   * A full pool steals a note; false = every channel holds a note of this same instant, and the note is not played.
   */
  play(
    voice: Voice,
    time: number,
    p: VoiceParams,
    x: number,
    y: number,
    z: number,
    owner: object | null,
  ): boolean {
    const now = this.ctx.currentTime;
    const at = time > now ? time : now; // a late note sounds now
    let start = time;
    let channel = this.freeAt(at);
    if (channel < 0) {
      channel = this.quietestAt(at, time);
      if (channel < 0) return false;
      // The fade ends when the new note starts, so the channel and its panner are silent when they are reused:
      // on time for a scheduler note (it is about 0.1 s ahead), 20 ms late for an immediate sound.
      start = Math.max(time, now + STEAL_FADE_S);
      (this.notes[channel] as Note).steal(start - STEAL_FADE_S);
    }
    this.space.place(channel, x, y, z, start);
    this.ref.note = this.notes[channel] as Note;
    this.owners[channel] = owner;
    voice.trigger(start, p, this.space.inputs[channel] as GainNode);
    return true;
  }

  /** Fade out whatever `owner` is playing or has scheduled (a removed plant). */
  release(owner: object, at: number): void {
    for (let i = 0; i < VOICE_CAP; i++) {
      if (this.owners[i] === owner) (this.notes[i] as Note).steal(at);
    }
  }

  releaseAll(at: number): void {
    for (let i = 0; i < VOICE_CAP; i++) (this.notes[i] as Note).steal(at);
  }

  /** Notes sounding or scheduled at audio time `now`: never above VOICE_CAP. */
  active(now: number): number {
    let n = 0;
    for (let i = 0; i < VOICE_CAP; i++) if ((this.notes[i] as Note).endTime > now) n++;
    return n;
  }

  /** A channel that is silent at `at`, or −1. */
  private freeAt(at: number): number {
    for (let i = 0; i < VOICE_CAP; i++) if ((this.notes[i] as Note).endTime <= at) return i;
    return -1;
  }

  /**
   * Oldest-quietest: the lowest envelope level at `at`, the earliest start on a tie. A note that starts at or after
   * `time` (the other notes of the same step) is never a candidate; −1 when every channel holds one.
   */
  private quietestAt(at: number, time: number): number {
    let pick = -1;
    let pickLevel = 0;
    let pickStart = 0;
    for (let i = 0; i < VOICE_CAP; i++) {
      const n = this.notes[i] as Note;
      if (n.startTime >= time) continue;
      const level = n.levelAt(at);
      if (pick < 0 || level < pickLevel || (level === pickLevel && n.startTime < pickStart)) {
        pick = i;
        pickLevel = level;
        pickStart = n.startTime;
      }
    }
    return pick;
  }
}
