export type WhatsAppMessageStatus = "received" | "queued" | "sent" | "delivered" | "read" | "failed";

const DELIVERY_RANK: Partial<Record<WhatsAppMessageStatus, number>> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

export function nextWhatsAppMessageStatus(
  current: WhatsAppMessageStatus,
  incoming: WhatsAppMessageStatus,
): WhatsAppMessageStatus {
  if (current === "received") return current;
  if (current === "failed") return current;
  if (incoming === "failed") return "failed";
  if (incoming === "received") return current;

  const currentRank = DELIVERY_RANK[current];
  const incomingRank = DELIVERY_RANK[incoming];
  if (currentRank === undefined || incomingRank === undefined) return current;
  return incomingRank > currentRank ? incoming : current;
}

export function metaTimestampToDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{1,13}$/.test(value)) return null;
  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}
