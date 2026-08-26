import type { PublicWorkingHour } from "./types";

const RIYADH_TIMEZONE = "Asia/Riyadh";
const ARABIC_DAY_NAMES = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"] as const;

export type PublicOpenStatus = {
  label: string | null;
  detail: string | null;
};

export type PublicAppearance = {
  themeMode: "light" | "dark" | "auto";
  buttonStyle: "filled" | "soft" | "outline";
  cardStyle: "flat" | "bordered" | "shadow";
  cornerRadius: "sm" | "md" | "lg";
};

const DEFAULT_APPEARANCE: PublicAppearance = {
  themeMode: "light",
  buttonStyle: "filled",
  cardStyle: "bordered",
  cornerRadius: "md",
};

function isThemeMode(value: string): value is PublicAppearance["themeMode"] {
  return value === "light" || value === "dark" || value === "auto";
}

function isCardStyle(value: string): value is PublicAppearance["cardStyle"] {
  return value === "flat" || value === "bordered" || value === "shadow";
}

function isCornerRadius(value: string): value is PublicAppearance["cornerRadius"] {
  return value === "sm" || value === "md" || value === "lg";
}

function isButtonStyle(value: string): value is PublicAppearance["buttonStyle"] {
  return value === "filled" || value === "soft" || value === "outline";
}

export function resolvePublicAppearance(cardStyleRaw?: string | null, buttonStyleRaw?: string | null): PublicAppearance {
  const cardStyleParts = String(cardStyleRaw ?? "").split("|").map((part) => part.trim()).filter(Boolean);

  let themeMode: PublicAppearance["themeMode"] = DEFAULT_APPEARANCE.themeMode;
  let cardStyle: PublicAppearance["cardStyle"] = DEFAULT_APPEARANCE.cardStyle;
  let cornerRadius: PublicAppearance["cornerRadius"] = DEFAULT_APPEARANCE.cornerRadius;

  for (const part of cardStyleParts) {
    if (isThemeMode(part)) themeMode = part;
    if (isCardStyle(part)) cardStyle = part;
    if (isCornerRadius(part)) cornerRadius = part;
  }

  let buttonStyle: PublicAppearance["buttonStyle"] = DEFAULT_APPEARANCE.buttonStyle;
  if (buttonStyleRaw && isButtonStyle(buttonStyleRaw)) {
    buttonStyle = buttonStyleRaw;
  }

  return {
    themeMode,
    cardStyle,
    cornerRadius,
    buttonStyle,
  };
}

function getNowInRiyadh(at = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(at);
  const map = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  return {
    date,
    dayOfWeek: date.getUTCDay(),
    hour,
    minute,
    second,
  };
}

function toArabicTime(value: string | null | undefined) {
  if (!value) return null;

  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const date = new Date(Date.UTC(2024, 0, 1, hour, minute, 0));
  return new Intl.DateTimeFormat("ar-SA", { timeZone: "UTC", hour: "numeric", minute: "2-digit", hour12: true }).format(date);
}

function toMinutes(value: string | null | undefined) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

type Shift = { opensAt: string; closesAt: string; start: number; end: number; overnight: boolean };

function getShifts(schedule: PublicWorkingHour | undefined): Shift[] {
  if (!schedule || schedule.isClosed) return [];
  const pairs = [
    [schedule.opensAt, schedule.closesAt],
    [schedule.secondOpensAt, schedule.secondClosesAt],
  ] as const;

  return pairs.flatMap(([opensAt, closesAt]) => {
    const start = toMinutes(opensAt);
    const end = toMinutes(closesAt);
    if (opensAt == null || closesAt == null || start == null || end == null || start === end) return [];
    return [{ opensAt, closesAt, start, end, overnight: start > end }];
  }).sort((a, b) => a.start - b.start);
}

function nextOpeningDetail(openingHours: PublicWorkingHour[], dayIndex: number) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const nextDay = (dayIndex + offset) % 7;
    const shifts = getShifts(openingHours.find((entry) => entry.dayOfWeek === nextDay));
    if (!shifts.length) continue;
    const opensAt = shifts[0].opensAt;
    const formatted = toArabicTime(opensAt);
    if (!formatted) return null;
    if (offset === 1) return `يفتح غدًا الساعة ${formatted}`;
    return `يفتح ${ARABIC_DAY_NAMES[nextDay]} الساعة ${formatted}`;
  }
  return null;
}

export function getPublicOpenStatus(openingHours: PublicWorkingHour[], at = new Date()): PublicOpenStatus {
  if (!openingHours?.length) {
    return { label: null, detail: null };
  }

  const hasSchedule = openingHours.some((entry) => getShifts(entry).length > 0 || entry.isClosed);
  if (!hasSchedule) {
    return { label: null, detail: null };
  }

  const nowInRiyadh = getNowInRiyadh(at);
  if (!nowInRiyadh) {
    return { label: "مغلق الآن", detail: null };
  }

  const dayIndex = (nowInRiyadh.dayOfWeek + 6) % 7;
  const previousDayIndex = (dayIndex + 6) % 7;
  const currentMinutes = nowInRiyadh.hour * 60 + nowInRiyadh.minute;

  // An overnight shift belongs to the day it starts. Shortly after midnight,
  // the current opening may therefore come from yesterday's schedule.
  const previousOvernight = getShifts(openingHours.find((entry) => entry.dayOfWeek === previousDayIndex))
    .find((shift) => shift.overnight && currentMinutes < shift.end);
  if (previousOvernight) {
    return {
      label: "مفتوح الآن",
      detail: `يغلق الساعة ${toArabicTime(previousOvernight.closesAt)}`,
    };
  }

  const todayShifts = getShifts(openingHours.find((entry) => entry.dayOfWeek === dayIndex));
  for (const shift of todayShifts) {
    const isOpen = shift.overnight
      ? currentMinutes >= shift.start
      : currentMinutes >= shift.start && currentMinutes < shift.end;
    if (isOpen) {
      return {
        label: "مفتوح الآن",
        detail: `يغلق الساعة ${toArabicTime(shift.closesAt)}`,
      };
    }
  }

  const nextToday = todayShifts.find((shift) => currentMinutes < shift.start);
  if (nextToday) {
    return {
      label: "مغلق الآن",
      detail: `يفتح الساعة ${toArabicTime(nextToday.opensAt)}`,
    };
  }

  return {
    label: "مغلق الآن",
    detail: nextOpeningDetail(openingHours, dayIndex),
  };
}

export function getPublicMobileNavItems(options: {
  hasServices: boolean;
  hasProducts: boolean;
  hasContact: boolean;
  hasLocation: boolean;
}) {
  const items = [
    { key: "home", label: "الرئيسية", href: "#top" },
    options.hasServices ? { key: "services", label: "الخدمات", href: "#services-section" } : null,
    options.hasProducts ? { key: "products", label: "المنتجات", href: "#products-section" } : null,
    options.hasContact ? { key: "contact", label: "تواصل", href: "#contact-section" } : null,
    options.hasLocation ? { key: "location", label: "الموقع", href: "#location-section" } : null,
  ].filter((item): item is { key: string; label: string; href: string } => Boolean(item));

  return items.slice(0, 5);
}
