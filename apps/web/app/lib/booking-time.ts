export type BookingSchedule = {
  opensAt: string | null;
  closesAt: string | null;
  secondOpensAt: string | null;
  secondClosesAt: string | null;
  isClosed: boolean;
};

export function bookingMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

/** Anchor each window to the merchant's exact start, including overnight carry. */
export function bookingCandidateMinutes(duration: number, current: BookingSchedule | null, previous: BookingSchedule | null) {
  if (!Number.isInteger(duration) || duration < 15 || duration > 480) return [];
  const candidates = new Set<number>();
  for (const [schedule, offset] of [[current, 0], [previous, -1440]] as const) {
    if (!schedule || schedule.isClosed) continue;
    for (const [open, close] of [[schedule.opensAt, schedule.closesAt], [schedule.secondOpensAt, schedule.secondClosesAt]]) {
      if (!open || !close || open === close) continue;
      const start = bookingMinutes(open) + offset;
      let end = bookingMinutes(close) + offset;
      if (end < start) end += 1440;
      for (let minute = start; minute + duration <= end; minute += duration) {
        if (minute >= 0 && minute < 1440) candidates.add(minute);
      }
    }
  }
  return [...candidates].sort((a, b) => a - b);
}

export function normalizedBookingDuration(value: number | null) {
  if (!Number.isInteger(value) || !value || value < 5 || value > 1440) return 30;
  return value;
}

function intervalInsideSameDay(startMinute: number, durationMinutes: number, open: string | null, close: string | null) {
  if (!open || !close) return false;
  const windowStart = bookingMinutes(open);
  const rawEnd = bookingMinutes(close);
  if (rawEnd === windowStart) return false;

  const targetEnd = startMinute + durationMinutes;
  if (rawEnd > windowStart) {
    return startMinute >= windowStart && targetEnd <= rawEnd;
  }

  // Overnight windows belong to the calendar day on which they start. A time
  // after midnight must therefore be validated against the previous day's
  // overnight window, not today's future overnight shift.
  return startMinute >= windowStart && targetEnd <= rawEnd + 1440;
}

function intervalInsidePreviousOvernight(startMinute: number, durationMinutes: number, open: string | null, close: string | null) {
  if (!open || !close) return false;
  const windowStart = bookingMinutes(open);
  const windowEnd = bookingMinutes(close);
  if (windowEnd >= windowStart) return false;

  const targetStart = startMinute + 1440;
  const targetEnd = targetStart + durationMinutes;
  return targetStart >= windowStart && targetEnd <= windowEnd + 1440;
}

export function bookingWithinWorkingHours(time: string, durationMinutes: number, schedule: BookingSchedule | null) {
  if (!schedule || schedule.isClosed) return false;
  const start = bookingMinutes(time);
  return intervalInsideSameDay(start, durationMinutes, schedule.opensAt, schedule.closesAt) || intervalInsideSameDay(start, durationMinutes, schedule.secondOpensAt, schedule.secondClosesAt);
}

export function bookingWithinPreviousOvernightWorkingHours(time: string, durationMinutes: number, schedule: BookingSchedule | null) {
  if (!schedule || schedule.isClosed) return false;
  const start = bookingMinutes(time);
  return intervalInsidePreviousOvernight(start, durationMinutes, schedule.opensAt, schedule.closesAt) || intervalInsidePreviousOvernight(start, durationMinutes, schedule.secondOpensAt, schedule.secondClosesAt);
}

export function bookingIntervalsOverlap(startA: number, durationA: number, startB: number, durationB: number) {
  return startA < startB + durationB && startB < startA + durationA;
}
