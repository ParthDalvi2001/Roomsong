// Voice cap with oldest-quietest stealing (FR-MUS-07, NFR-PERF-10): when full, the note with the lowest level at that
// moment is stolen; equally quiet notes go oldest first. Pure bookkeeping over a fixed array (no allocation after
// construction). Notes register with their audio start/end time; the owning voice implements the fade-and-stop.

export interface PoolNote {
  readonly startTime: number;
  endTime: number;
  /** Envelope level (linear amplitude) this note has at audio time `t`. */
  levelAt(t: number): number;
  /** Fade out quickly and stop at audio time `at`. */
  steal(at: number): void;
}

export class VoicePool {
  private readonly notes: (PoolNote | null)[];
  private count = 0;

  constructor(readonly cap: number) {
    this.notes = new Array<PoolNote | null>(cap).fill(null);
  }

  get active(): number {
    return this.count;
  }

  /** Register a new note at audio time `now`; frees finished notes first, then steals one if still full. */
  admit(note: PoolNote, now: number): void {
    this.freeFinished(now);
    if (this.count >= this.cap) this.stealQuietest(now);
    this.notes[this.count] = note;
    this.count++;
  }

  /** Drop finished notes so `active` reflects what is sounding (called from the engine tick). */
  prune(now: number): void {
    this.freeFinished(now);
  }

  /** Steal everything still sounding (stop / dispose). */
  clear(at: number): void {
    for (let i = 0; i < this.count; i++) {
      (this.notes[i] as PoolNote).steal(at);
      this.notes[i] = null;
    }
    this.count = 0;
  }

  private freeFinished(now: number): void {
    for (let i = this.count - 1; i >= 0; i--) {
      if ((this.notes[i] as PoolNote).endTime <= now) this.removeAt(i);
    }
  }

  private stealQuietest(at: number): void {
    let pick = 0;
    let pickLevel = (this.notes[0] as PoolNote).levelAt(at);
    for (let i = 1; i < this.count; i++) {
      const n = this.notes[i] as PoolNote;
      const level = n.levelAt(at);
      if (
        level < pickLevel ||
        (level === pickLevel && n.startTime < (this.notes[pick] as PoolNote).startTime)
      ) {
        pick = i;
        pickLevel = level;
      }
    }
    (this.notes[pick] as PoolNote).steal(at);
    this.removeAt(pick);
  }

  private removeAt(i: number): void {
    const last = this.count - 1;
    this.notes[i] = this.notes[last] ?? null;
    this.notes[last] = null;
    this.count = last;
  }
}
