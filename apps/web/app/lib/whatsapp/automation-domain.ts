import { createHash } from "node:crypto";

export const WHATSAPP_AUTOMATION_TRIGGER_TYPES = [
  "welcome", "appointment_reminder", "follow_up", "order_update",
  "inactive_customer", "abandoned_cart", "api_event",
] as const;

export type WhatsAppAutomationTriggerType = typeof WHATSAPP_AUTOMATION_TRIGGER_TYPES[number];

export const WHATSAPP_ORDER_EVENT_STATUSES = ["pending", "confirmed", "processing", "completed", "cancelled"] as const;
export type WhatsAppOrderEventStatus = typeof WHATSAPP_ORDER_EVENT_STATUSES[number];

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

export function buildAutomationTriggerConfig(triggerTypeValue: string, orderStatus?: string) {
  const triggerType = normalizeAutomationTriggerType(triggerTypeValue);
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
  const allowedKeys = triggerType === "order_update" ? ["version", "orderStatuses"] : ["version"];
  if (Object.keys(record).some((key) => !allowedKeys.includes(key)) || record.version !== 1) {
    throw new Error("WHATSAPP_AUTOMATION_TRIGGER_CONFIG_INVALID");
  }
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
  if (input.triggerType !== "order_update") return true;
  const prefix = "order.status.";
  if (!input.subjectType.startsWith(prefix)) return false;
  return "orderStatuses" in config && Array.isArray(config.orderStatuses)
    && config.orderStatuses.includes(input.subjectType.slice(prefix.length) as WhatsAppOrderEventStatus);
}
