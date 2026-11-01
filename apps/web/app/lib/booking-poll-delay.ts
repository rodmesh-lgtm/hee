/** Bounded backoff; successful reads always return to the normal cadence. */
export function bookingPollDelay(failures: number, retryAfter: string | null = null): number {
  if (failures <= 0) return 10_000;
  const backoff = Math.min(120_000, 10_000 * 2 ** Math.min(failures, 4));
  const seconds = retryAfter !== null && /^\d+$/.test(retryAfter) ? Number(retryAfter) : 0;
  return Math.min(300_000, Math.max(backoff, Number.isFinite(seconds) ? seconds * 1000 : 0));
}
