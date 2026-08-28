import { createHash } from "node:crypto";

export const WHATSAPP_DELIVERY_MAX_ATTEMPTS = 6;

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
