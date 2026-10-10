// Generic object pool (CODING_GUIDELINES §5). Everything is created up front; acquire and release allocate nothing.

export class Pool<T extends object> {
  private created = 0;
  private createdLate = 0;
  private readonly free: T[] = [];
  private readonly isFree = new Map<T, boolean>(); // every object this pool created → is it in `free`

  constructor(
    private readonly factory: () => T,
    initialSize: number,
  ) {
    for (let i = 0; i < initialSize; i++) this.free.push(this.create());
  }

  /** Objects created so far: the initial size plus `grown`. */
  get size(): number {
    return this.created;
  }
  /** Objects created after construction. A warmed-up pool keeps this at 0; a perf test can assert it. */
  get grown(): number {
    return this.createdLate;
  }
  /** Objects handed out and not yet released. */
  get inUse(): number {
    return this.created - this.free.length;
  }

  /** Growth rule: an empty pool creates exactly one more object and counts it in `grown`. It never refuses. */
  acquire(): T {
    let item = this.free.pop();
    if (item === undefined) {
      item = this.create();
      this.createdLate++;
    }
    this.isFree.set(item, false);
    return item;
  }

  /** Returns false, and changes nothing, for an object that is not out on loan: a second release or a foreign object. */
  release(item: T): boolean {
    if (this.isFree.get(item) !== false) return false;
    this.isFree.set(item, true);
    this.free.push(item);
    return true;
  }

  private create(): T {
    const item = this.factory();
    this.isFree.set(item, true);
    this.created++;
    return item;
  }
}
