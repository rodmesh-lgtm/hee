import { createHash } from "node:crypto";

export const WHATSAPP_DELIVERY_MAX_ATTEMPTS = 6;

export function shouldRetryCampaignReceipt(input: {
  errorCode: string | null; attemptCount: number; createdAt: Date; now: Date;
  campaignStatus: string; recipientStatus: string;
}) {
  // Only explicit temporary service failures, never marketing suppression,
  // invalid recipients, template/account errors, or an uncertain network outcome.
  return ["131000", "131016"].includes(input.errorCode ?? "")
    && input.attemptCount < WHATSAPP_DELIVERY_MAX_ATTEMPTS
    && input.attemptCount > 0
    && input.now.getTime() >= input.createdAt.getTime()
    && input.now.getTime() - input.createdAt.getTime() < 24 * 60 * 60 * 1_000
    && ["running", "paused", "completed"].includes(input.campaignStatus)
    && ["sent", "failed"].includes(input.recipientStatus);
}

// Missing headers must not become Number(null) === 0 and defeat backoff.
export function parseRetryAfter(value: string | null, now: Date): number | null {
  if (!value?.trim()) return null;
  const text = value.trim();
  if (/^\d+$/.test(text)) {
    const seconds = Number(text);
    return Number.isFinite(seconds) ? seconds : null;
  }
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) && timestamp > now.getTime()
    ? Math.ceil((timestamp - now.getTime()) / 1_000) : null;
}

export function deliveryIdempotencyKey(businessId: string, campaignId: string, recipientId: string) {
  return createHash("sha256").update(`ir:whatsapp:${businessId}:${campaignId}:${recipientId}`).digest("hex");
}

export function retryDelayMs(attemptCount: number, retryAfterSeconds?: number | null) {
  if (retryAfterSeconds != null && Number.isFinite(retryAfterSeconds)) {
    return Math.min(3_600, Math.max(30, Math.trunc(retryAfterSeconds))) * 1_000;
  }
  const safeAttempt = Math.min(WHATSAPP_DELIVERY_MAX_ATTEMPTS, Math.max(1, Math.trunc(attemptCount)));
  return Math.min(3_600_000, 30_000 * (2 ** (safeAttempt - 1)));
}

export function isRetryableMetaStatus(status: number) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export function outboundRateLimit(env: NodeJS.ProcessEnv = process.env) {
  const raw = env.WHATSAPP_SEND_MAX_PER_MINUTE;
  if (raw == null || raw.trim() === "") return 20;
  if (!/^\d+$/.test(raw)) throw new Error("WHATSAPP_SEND_RATE_LIMIT_INVALID");
  const value = Number(raw);
  if (value < 1 || value > 1_000) throw new Error("WHATSAPP_SEND_RATE_LIMIT_INVALID");
  return value;
}

export function assertOutboundEnabled(env: NodeJS.ProcessEnv = process.env) {
  if (env.WHATSAPP_OUTBOUND_ENABLED !== "true") throw new Error("WHATSAPP_OUTBOUND_DISABLED");
}
