/**
 * Tiny in-memory TTL cache (no external infra).
 * Suitable for documentation retrieval / frequent stats.
 */
export class TtlCache<V> {
  private readonly store = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly defaultTtlMs: number,
    private readonly maxEntries = 200,
  ) {}

  get(key: string): V | undefined {
    const row = this.store.get(key);
    if (!row) return undefined;
    if (Date.now() > row.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return row.value;
  }

  set(key: string, value: V, ttlMs = this.defaultTtlMs): void {
    if (this.store.size >= this.maxEntries) {
      const first = this.store.keys().next().value;
      if (first !== undefined) this.store.delete(first);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  /** Invalidate keys matching a predicate. */
  invalidateWhere(predicate: (key: string) => boolean): void {
    for (const key of [...this.store.keys()]) {
      if (predicate(key)) this.store.delete(key);
    }
  }
}
