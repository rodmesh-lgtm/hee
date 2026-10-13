export type BookingSignal = { id: string; createdAt: string };
/** First snapshot is silent. Status changes and repeated polls never create alerts. */
export function createBookingAlertTracker() {
  let initialized = false;
  let floor = 0;
  const seen = new Set<string>();
  return (rows: BookingSignal[]) => {
    const valid = rows.filter(row => typeof row.id === "string" && Number.isFinite(Date.parse(row.createdAt)));
    if (!initialized) {
      initialized = true;
      floor = valid.length ? Math.min(...valid.map(row => Date.parse(row.createdAt))) : 0;
      valid.forEach(row => seen.add(row.id));
      return 0;
    }
    let count = 0;
    for (const row of valid) {
      if (!seen.has(row.id) && Date.parse(row.createdAt) >= floor) count++;
      seen.add(row.id);
    }
    // Retain more than the poll window so deletion/backfill cannot replay old alerts.
    if (seen.size > 2000) {
      const oldest = Math.min(...valid.map(row => Date.parse(row.createdAt)));
      floor = Math.max(floor, oldest);
      seen.clear(); valid.forEach(row => seen.add(row.id));
    }
    return count;
  };
}
