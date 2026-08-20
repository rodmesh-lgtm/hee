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

export function normalizedBookingDuration(value: number | null) {
  if (!Number.isInteger(value) || !value || value < 5 || value > 1440) return 30;
  return value;
}

function intervalInside(startMinute: number, durationMinutes: number, open: string | null, close: string | null) {
  if (!open || !close) return false;
  const windowStart = bookingMinutes(open);
  let windowEnd = bookingMinutes(close);
  let targetStart = startMinute;
  let targetEnd = targetStart + durationMinutes;
  if (windowEnd <= windowStart) windowEnd += 1440;
  if (targetStart < windowStart && windowEnd > 1440) {
    targetStart += 1440;
    targetEnd += 1440;
  }
  return targetStart >= windowStart && targetEnd <= windowEnd;
}

export function bookingWithinWorkingHours(time: string, durationMinutes: number, schedule: BookingSchedule | null) {
  if (!schedule || schedule.isClosed) return false;
  const start = bookingMinutes(time);
  return intervalInside(start, durationMinutes, schedule.opensAt, schedule.closesAt) || intervalInside(start, durationMinutes, schedule.secondOpensAt, schedule.secondClosesAt);
}

export function bookingIntervalsOverlap(startA: number, durationA: number, startB: number, durationB: number) {
  return startA < startB + durationB && startB < startA + durationA;
}
