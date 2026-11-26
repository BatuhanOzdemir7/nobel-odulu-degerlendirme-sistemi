export class SceneAbortedError extends Error {
  constructor() { super('Sahne iptal edildi'); this.name = 'SceneAbortedError'; }
}

export class Timeline {
  private aborted = false;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly rejecters = new Set<(error: Error) => void>();

  constructor(private readonly scale: () => number = () => 1) {}

  duration(ms: number): number { return Math.max(0, ms * this.scale()); }

  /** scaled=false: zaman ölçeğinden bağımsız (örn. DOM'un yeni durumu çizmesini beklemek). */
  wait(ms: number, scaled = true): Promise<void> {
    if (this.aborted) return Promise.reject(new SceneAbortedError());
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        this.rejecters.delete(reject);
        resolve();
      }, scaled ? this.duration(ms) : Math.max(0, ms));
      this.timers.add(timer);
      this.rejecters.add(reject);
    });
  }

  abort(): void {
    this.aborted = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    const error = new SceneAbortedError();
    for (const reject of this.rejecters) reject(error);
    this.rejecters.clear();
  }
}

/** Sahneleri sırayla çalıştırır; bekleyen sayısı sınırlıdır (fazlası eskiden atılır). */
export class SceneQueue<T> {
  private readonly pending: T[] = [];
  private running = false;
  private disposed = false;

  constructor(
    private readonly run: (item: T, fast: boolean) => Promise<void>,
    private readonly maxPending = 4,
  ) {}

  push(item: T): void {
    if (this.disposed) return;
    this.pending.push(item);
    while (this.pending.length > this.maxPending) this.pending.shift();
    void this.drain();
  }

  dispose(): void {
    this.disposed = true;
    this.pending.length = 0;
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (!this.disposed && this.pending.length > 0) {
        const item = this.pending.shift() as T;
        try {
          await this.run(item, this.pending.length >= 2);
        } catch (error) {
          if (!(error instanceof SceneAbortedError)) console.error('[nobel-stage]', error);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
