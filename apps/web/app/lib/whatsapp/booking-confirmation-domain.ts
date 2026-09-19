const BOOKING_CONFIRMATION_PARAMETER_COUNT = 7;

type BookingConfirmationDetails = {
  businessName: string;
  serviceName: string;
  branchName: string | null;
  bookingDate: string;
  bookingTime: string;
  slotEndTime: string | null;
  bookingId: string;
};

function compactText(value: string | null, fallback: string, limit = 1024) {
  const normalized = (value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

function validBookingDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00+03:00`).getTime());
}

function displayDate(value: string) {
  if (!validBookingDate(value)) throw new Error("WHATSAPP_BOOKING_CONFIRMATION_DATE_INVALID");
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(new Date(`${value}T12:00:00+03:00`));
}

function displayTime(value: string | null) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error("WHATSAPP_BOOKING_CONFIRMATION_TIME_INVALID");
  }
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Riyadh",
  }).format(new Date(`2020-01-01T${value}:00+03:00`));
}

export function bookingConfirmationTemplateSupportsParameters(components: unknown, parameterFormat?: string | null) {
  if (!Array.isArray(components)) return false;
  if (parameterFormat && parameterFormat.toUpperCase() !== "POSITIONAL") return false;
  let serialized: string;
  try {
    serialized = JSON.stringify(components);
  } catch {
    return false;
  }
  const variableMatches = serialized.match(/\{\{[^{}]+\}\}/g);
  const variables: string[] = variableMatches ? Array.from(variableMatches) : [];
  const expected: string[] = Array.from({ length: BOOKING_CONFIRMATION_PARAMETER_COUNT }, (_, index) => `{{${index + 1}}}`);
  if (variables.length !== expected.length || expected.some((variable) => !variables.includes(variable))) return false;
  return components.some((component) => {
    if (!component || typeof component !== "object" || Array.isArray(component)) return false;
    const record = component as Record<string, unknown>;
    if (String(record.type ?? "").toUpperCase() !== "BODY" || typeof record.text !== "string") return false;
    const bodyMatches = record.text.match(/\{\{[^{}]+\}\}/g);
    const bodyVariables: string[] = bodyMatches ? Array.from(bodyMatches) : [];
    return bodyVariables.length === expected.length && expected.every((variable) => bodyVariables.includes(variable));
  });
}

export function buildBookingConfirmationTemplateParameters(details: BookingConfirmationDetails) {
  const reference = details.bookingId.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
  if (!reference) throw new Error("WHATSAPP_BOOKING_CONFIRMATION_REFERENCE_INVALID");
  const values = [
    compactText(details.businessName, "المنشأة"),
    compactText(details.serviceName, "الخدمة المحجوزة"),
    compactText(details.branchName, "الفرع الرئيسي"),
    displayDate(details.bookingDate),
    displayTime(details.bookingTime),
    displayTime(details.slotEndTime),
    reference,
  ];
  return [{
    type: "body",
    parameters: values.map((text) => ({ type: "text", text })),
  }];
}

export const BOOKING_CONFIRMATION_TEMPLATE_EXAMPLE = [
  "تم تسجيل موعدك لدى {{1}}.",
  "الخدمة: {{2}}",
  "الفرع: {{3}}",
  "اليوم: {{4}}",
  "الوقت: من {{5}} إلى {{6}}",
  "رقم الحجز: {{7}}",
].join("\n");
