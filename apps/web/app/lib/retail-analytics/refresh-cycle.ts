/** A cancellable, non-overlapping polling cycle; clock is injectable for deterministic tests. */
export function createRefreshCycle(read: (signal: AbortSignal) => Promise<boolean>, interval: number, now = Date.now) {
  const controller = new AbortController();
  let running = false, next = now();
  return {
    remaining: () => Math.max(0, Math.ceil((next - now()) / 1000)),
    dispose: () => controller.abort(),
    async tick(available: boolean) {
      if (!available || controller.signal.aborted || running || now() < next) return;
      running = true;
      try { const ok = await read(controller.signal); next = now() + (ok ? interval : Math.max(60000, interval * 4)); }
      catch { next = now() + Math.max(60000, interval * 4); }
      finally { running = false; }
    },
  };
}
