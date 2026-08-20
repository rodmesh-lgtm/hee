const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export type WorkingHoursWindow = {
  opensAt: string;
  closesAt: string;
  secondOpensAt?: string;
  secondClosesAt?: string;
};

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function normalizedInterval(start: string, end: string) {
  const from = minutes(start);
  let to = minutes(end);
  if (to < from) to += 1440;
  return { from, to };
}

function overlaps(a: { from: number; to: number }, b: { from: number; to: number }) {
  return a.from < b.to && b.from < a.to;
}

export function isValidWorkingTime(value: string) {
  return TIME_PATTERN.test(value);
}

export function validateWorkingHoursWindow(window: WorkingHoursWindow) {
  const { opensAt, closesAt, secondOpensAt = "", secondClosesAt = "" } = window;
  if (!isValidWorkingTime(opensAt) || !isValidWorkingTime(closesAt)) return false;
  if (opensAt === closesAt) return false;

  const hasSecondStart = Boolean(secondOpensAt);
  const hasSecondEnd = Boolean(secondClosesAt);
  if (hasSecondStart !== hasSecondEnd) return false;
  if (!hasSecondStart) return true;
  if (!isValidWorkingTime(secondOpensAt) || !isValidWorkingTime(secondClosesAt)) return false;
  if (secondOpensAt === secondClosesAt) return false;

  const first = normalizedInterval(opensAt, closesAt);
  const second = normalizedInterval(secondOpensAt, secondClosesAt);
  const shiftedForward = { from: second.from + 1440, to: second.to + 1440 };
  const shiftedBackward = { from: second.from - 1440, to: second.to - 1440 };

  return !overlaps(first, second) && !overlaps(first, shiftedForward) && !overlaps(first, shiftedBackward);
}
