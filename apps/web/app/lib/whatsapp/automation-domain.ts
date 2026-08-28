import { createHash } from "node:crypto";

export const WHATSAPP_AUTOMATION_TRIGGER_TYPES = [
  "welcome", "appointment_reminder", "follow_up", "order_update",
  "inactive_customer", "abandoned_cart", "api_event",
] as const;

export type WhatsAppAutomationTriggerType = typeof WHATSAPP_AUTOMATION_TRIGGER_TYPES[number];

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
