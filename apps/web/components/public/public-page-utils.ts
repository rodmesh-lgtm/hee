import type { PublicWorkingHour } from "./types";

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

function toArabicTime(value: string | null | undefined) {
  if (!value) return null;

  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat("ar-SA", { hour: "numeric", minute: "2-digit", hour12: true }).format(date);
}

export function getPublicOpenStatus(openingHours: PublicWorkingHour[]): PublicOpenStatus {
  if (!openingHours?.length) {
    return { label: null, detail: null };
  }

  const hasSchedule = openingHours.some((entry) => Boolean(entry.opensAt || entry.closesAt || entry.secondOpensAt || entry.secondClosesAt || entry.isClosed));
  if (!hasSchedule) {
    return { label: null, detail: null };
  }

  const dayIndex = (new Date().getDay() + 6) % 7;
  const todayHours = openingHours.find((entry) => entry.dayOfWeek === dayIndex);

  const findNextOpen = () => {
    for (let offset = 1; offset <= 7; offset += 1) {
      const nextDay = (dayIndex + offset) % 7;
      const schedule = openingHours.find((entry) => entry.dayOfWeek === nextDay);
      if (!schedule || schedule.isClosed || !schedule.opensAt) continue;
      return schedule.opensAt;
    }
    return null;
  };

  if (!todayHours) {
    return { label: null, detail: null };
  }

  if (todayHours.isClosed) {
    const nextOpen = findNextOpen();
    return {
      label: "مغلق الآن",
      detail: nextOpen ? `يفتح الساعة ${toArabicTime(nextOpen)}` : null,
    };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMinute] = (todayHours.opensAt ?? "00:00").split(":").map(Number);
  const [closeHour, closeMinute] = (todayHours.closesAt ?? "23:59").split(":").map(Number);
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  const inFirstShift = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;

  if (inFirstShift) {
    return {
      label: "مفتوح الآن",
      detail: todayHours.closesAt ? `يغلق الساعة ${toArabicTime(todayHours.closesAt)}` : null,
    };
  }

  if (todayHours.secondOpensAt && todayHours.secondClosesAt) {
    const [secondOpenHour, secondOpenMinute] = todayHours.secondOpensAt.split(":").map(Number);
    const [secondCloseHour, secondCloseMinute] = todayHours.secondClosesAt.split(":").map(Number);
    const secondOpen = secondOpenHour * 60 + secondOpenMinute;
    const secondClose = secondCloseHour * 60 + secondCloseMinute;

    if (currentMinutes < secondOpen) {
      return {
        label: "مغلق الآن",
        detail: `يفتح الساعة ${toArabicTime(todayHours.secondOpensAt)}`,
      };
    }

    if (currentMinutes >= secondOpen && currentMinutes <= secondClose) {
      return {
        label: "مفتوح الآن",
        detail: `يغلق الساعة ${toArabicTime(todayHours.secondClosesAt)}`,
      };
    }
  }

  if (todayHours.opensAt && currentMinutes < openMinutes) {
    return {
      label: "مغلق الآن",
      detail: `يفتح الساعة ${toArabicTime(todayHours.opensAt)}`,
    };
  }

  const nextOpen = findNextOpen();
  return {
    label: "مغلق الآن",
    detail: nextOpen ? `يفتح الساعة ${toArabicTime(nextOpen)}` : null,
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
