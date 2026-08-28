import { createHash } from "node:crypto";

export const WHATSAPP_AUTOMATION_TRIGGER_TYPES = [
  "welcome", "appointment_reminder", "follow_up", "order_update",
  "inactive_customer", "abandoned_cart", "api_event",
] as const;

export type WhatsAppAutomationTriggerType = typeof WHATSAPP_AUTOMATION_TRIGGER_TYPES[number];
export const WHATSAPP_CONFIGURABLE_TRIGGER_TYPES = [
  "welcome", "appointment_reminder", "follow_up", "order_update", "inactive_customer", "abandoned_cart", "api_event",
] as const satisfies readonly WhatsAppAutomationTriggerType[];

export const WHATSAPP_ORDER_EVENT_STATUSES = ["pending", "confirmed", "processing", "completed", "cancelled"] as const;
export type WhatsAppOrderEventStatus = typeof WHATSAPP_ORDER_EVENT_STATUSES[number];
export const WHATSAPP_APPOINTMENT_LEAD_MINUTES = [30, 60, 180, 1440, 2880, 10080] as const;
export const WHATSAPP_INACTIVE_CUSTOMER_DAYS = [30, 60, 90, 180, 365] as const;
export const WHATSAPP_ABANDONED_CART_DELAY_MINUTES = [15, 30, 60, 180, 360, 1440] as const;

export function normalizeAutomationTriggerType(value: string): WhatsAppAutomationTriggerType {
  if (!(WHATSAPP_AUTOMATION_TRIGGER_TYPES as readonly string[]).includes(value)) {
    throw new Error("WHATSAPP_AUTOMATION_TRIGGER_UNSUPPORTED");
  }
  return value as WhatsAppAutomationTriggerType;
}

export function automationIdempotencyKey(parts: {
  businessId: string; automationId: string; eventId: string; contactId: string;
}) {
  return createHash("sha256").update(
    ["wa-automation-v1", parts.businessId, parts.automationId, parts.eventId, parts.contactId].join(":"),
  ).digest("hex");
}

export function automationRetryAt(attempt: number, now = new Date()) {
  const bounded = Math.max(1, Math.min(attempt, 8));
  return new Date(now.getTime() + Math.min(6 * 60 * 60_000, 30_000 * 2 ** (bounded - 1)));
}

export function readTemplateActionConfig(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("WHATSAPP_AUTOMATION_ACTION_INVALID");
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => !["templateId", "parameters"].includes(key))) throw new Error("WHATSAPP_AUTOMATION_ACTION_INVALID");
  if (typeof record.templateId !== "string" || !/^[0-9a-f-]{36}$/i.test(record.templateId)) throw new Error("WHATSAPP_AUTOMATION_TEMPLATE_INVALID");
  if (record.parameters !== undefined && (!Array.isArray(record.parameters) || record.parameters.length > 32)) {
    throw new Error("WHATSAPP_AUTOMATION_PARAMETERS_INVALID");
  }
  return { templateId: record.templateId, parameters: record.parameters as unknown[] | undefined };
}

export function templateHasVariables(value: unknown) {
  if (!Array.isArray(value)) return true;
  try {
    return /\{\{[^{}]+\}\}/.test(JSON.stringify(value));
  } catch {
    return true;
  }
}

export function normalizeAutomationApiEventName(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_.:-]{0,63}$/.test(normalized)) throw new Error("WHATSAPP_AUTOMATION_API_EVENT_NAME_INVALID");
  return normalized;
}

export function buildAutomationTriggerConfig(triggerTypeValue: string, orderStatus?: string, reminderLeadMinutes?: number, inactiveDays?: number, apiEventName?: string, cartDelayMinutes?: number) {
  const triggerType = normalizeAutomationTriggerType(triggerTypeValue);
  if (triggerType === "appointment_reminder") {
    if (!Number.isSafeInteger(reminderLeadMinutes) || reminderLeadMinutes! < 15 || reminderLeadMinutes! > 10_080) {
      throw new Error("WHATSAPP_AUTOMATION_REMINDER_LEAD_INVALID");
    }
    return { version: 1, leadMinutes: reminderLeadMinutes! } as const;
  }
  if (triggerType === "inactive_customer") {
    if (!Number.isSafeInteger(inactiveDays) || inactiveDays! < 7 || inactiveDays! > 730) {
      throw new Error("WHATSAPP_AUTOMATION_INACTIVE_DAYS_INVALID");
    }
    return { version: 1, inactiveDays: inactiveDays! } as const;
  }
  if (triggerType === "abandoned_cart") {
    if (!Number.isSafeInteger(cartDelayMinutes) || cartDelayMinutes! < 15 || cartDelayMinutes! > 10_080) {
      throw new Error("WHATSAPP_AUTOMATION_CART_DELAY_INVALID");
    }
    return { version: 1, delayMinutes: cartDelayMinutes! } as const;
  }
  if (triggerType === "api_event") return { version: 1, eventName: normalizeAutomationApiEventName(apiEventName ?? "") } as const;
  if (triggerType !== "order_update") return { version: 1 } as const;
  if (!(WHATSAPP_ORDER_EVENT_STATUSES as readonly string[]).includes(orderStatus ?? "")) {
    throw new Error("WHATSAPP_AUTOMATION_ORDER_STATUS_INVALID");
  }
  return { version: 1, orderStatuses: [orderStatus as WhatsAppOrderEventStatus] } as const;
}

export function readAutomationTriggerConfig(value: unknown, triggerTypeValue: string) {
  const triggerType = normalizeAutomationTriggerType(triggerTypeValue);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("WHATSAPP_AUTOMATION_TRIGGER_CONFIG_INVALID");
  const record = value as Record<string, unknown>;
  const allowedKeys = triggerType === "order_update" ? ["version", "orderStatuses"]
    : triggerType === "appointment_reminder" ? ["version", "leadMinutes"]
      : triggerType === "inactive_customer" ? ["version", "inactiveDays"]
        : triggerType === "abandoned_cart" ? ["version", "delayMinutes"]
          : triggerType === "api_event" ? ["version", "eventName"] : ["version"];
  if (Object.keys(record).some((key) => !allowedKeys.includes(key)) || record.version !== 1) {
    throw new Error("WHATSAPP_AUTOMATION_TRIGGER_CONFIG_INVALID");
  }
  if (triggerType === "appointment_reminder") {
    if (!Number.isSafeInteger(record.leadMinutes) || Number(record.leadMinutes) < 15 || Number(record.leadMinutes) > 10_080) {
      throw new Error("WHATSAPP_AUTOMATION_REMINDER_LEAD_INVALID");
    }
    return { version: 1, leadMinutes: Number(record.leadMinutes) } as const;
  }
  if (triggerType === "inactive_customer") {
    if (!Number.isSafeInteger(record.inactiveDays) || Number(record.inactiveDays) < 7 || Number(record.inactiveDays) > 730) {
      throw new Error("WHATSAPP_AUTOMATION_INACTIVE_DAYS_INVALID");
    }
    return { version: 1, inactiveDays: Number(record.inactiveDays) } as const;
  }
  if (triggerType === "abandoned_cart") {
    if (!Number.isSafeInteger(record.delayMinutes) || Number(record.delayMinutes) < 15 || Number(record.delayMinutes) > 10_080) {
      throw new Error("WHATSAPP_AUTOMATION_CART_DELAY_INVALID");
    }
    return { version: 1, delayMinutes: Number(record.delayMinutes) } as const;
  }
  if (triggerType === "api_event") return { version: 1, eventName: normalizeAutomationApiEventName(String(record.eventName ?? "")) } as const;
  if (triggerType !== "order_update") return { version: 1 } as const;
  if (!Array.isArray(record.orderStatuses) || record.orderStatuses.length < 1 || record.orderStatuses.length > WHATSAPP_ORDER_EVENT_STATUSES.length) {
    throw new Error("WHATSAPP_AUTOMATION_ORDER_STATUS_INVALID");
  }
  const statuses = [...new Set(record.orderStatuses)];
  if (statuses.length !== record.orderStatuses.length || statuses.some((status) => typeof status !== "string" || !(WHATSAPP_ORDER_EVENT_STATUSES as readonly string[]).includes(status))) {
    throw new Error("WHATSAPP_AUTOMATION_ORDER_STATUS_INVALID");
  }
  return { version: 1, orderStatuses: statuses as WhatsAppOrderEventStatus[] } as const;
}

export function automationMatchesEvent(input: { triggerType: string; triggerConfig: unknown; subjectType: string }) {
  const config = readAutomationTriggerConfig(input.triggerConfig, input.triggerType);
  if (input.triggerType === "welcome") return input.subjectType === "contact.consent_granted";
  if (input.triggerType === "appointment_reminder") return input.subjectType === "booking.reminder";
  if (input.triggerType === "follow_up") return input.subjectType === "order.completed" || input.subjectType === "booking.completed";
  if (input.triggerType === "inactive_customer") return input.subjectType === "customer.inactive";
  if (input.triggerType === "abandoned_cart") return input.subjectType === "cart.abandoned";
  if (input.triggerType === "api_event") return "eventName" in config && input.subjectType === `api.event.${config.eventName}`;
  if (input.triggerType !== "order_update") return false;
  const prefix = "order.status.";
  if (!input.subjectType.startsWith(prefix)) return false;
  return "orderStatuses" in config && Array.isArray(config.orderStatuses)
    && config.orderStatuses.includes(input.subjectType.slice(prefix.length) as WhatsAppOrderEventStatus);
}

export function appointmentAtRiyadh(bookingDate: string, bookingTime: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bookingDate);
  if (!match || !/^([01]\d|2[0-3]):[0-5]\d$/.test(bookingTime)) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) return null;
  const value = new Date(`${bookingDate}T${bookingTime}:00+03:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}
