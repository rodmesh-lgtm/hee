import { metaTimestampToDate, type WhatsAppMessageStatus } from "./message-domain";

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord | null => value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
const text = (value: unknown) => typeof value === "string" && value.length > 0 ? value : null;

export type ParsedInboundMessage = {
  providerMessageId: string;
  customerPhoneE164: string;
  customerDisplayName: string | null;
  messageType: string;
  textBody: string | null;
  providerTimestamp: Date | null;
  payload: JsonRecord;
};

export type ParsedStatusReceipt = {
  providerMessageId: string;
  status: Exclude<WhatsAppMessageStatus, "received" | "queued">;
  providerTimestamp: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export function parseInboundMessages(value: unknown): ParsedInboundMessage[] {
  const root = record(value);
  const messages = Array.isArray(root?.messages) ? root.messages : [];
  const contacts = Array.isArray(root?.contacts) ? root.contacts : [];
  const names = new Map<string, string>();
  for (const item of contacts) {
    const contact = record(item);
    const waId = text(contact?.wa_id);
    const profile = record(contact?.profile);
    const name = text(profile?.name);
    if (waId && name) names.set(waId, name);
  }
  return messages.flatMap((item) => {
    const message = record(item);
    const id = text(message?.id);
    const from = text(message?.from);
    if (!message || !id || !from) return [];
    const type = text(message.type) ?? "unknown";
    const body = type === "text" ? text(record(message.text)?.body) : null;
    return [{ providerMessageId: id, customerPhoneE164: from, customerDisplayName: names.get(from) ?? null, messageType: type, textBody: body, providerTimestamp: metaTimestampToDate(message.timestamp), payload: message }];
  });
}

export function parseStatusReceipts(value: unknown): ParsedStatusReceipt[] {
  const root = record(value);
  const statuses = Array.isArray(root?.statuses) ? root.statuses : [];
  return statuses.flatMap((item) => {
    const status = record(item);
    const id = text(status?.id);
    const state = text(status?.status);
    if (!id || !state || !["sent", "delivered", "read", "failed"].includes(state)) return [];
    const errors = Array.isArray(status?.errors) ? status.errors : [];
    const firstError = record(errors[0]);
    return [{ providerMessageId: id, status: state as ParsedStatusReceipt["status"], providerTimestamp: metaTimestampToDate(status.timestamp), errorCode: firstError?.code == null ? null : String(firstError.code), errorMessage: text(firstError?.title) ?? text(firstError?.message) }];
  });
}
