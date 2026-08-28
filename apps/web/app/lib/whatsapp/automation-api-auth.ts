import "server-only";

import { timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { consumePublicWriteLimit, requestClientAddress } from "../rate-limit";
import { hashWhatsAppAutomationApiKey } from "./automation-api-keys";
import { hasActiveWhatsAppMarketingEntitlement } from "./feature-entitlement";

const PREFIX = /^irwa_live_[0-9a-f]{16}$/;
const SECRET = /^[A-Za-z0-9_-]{43}$/;
type FailureCode = "unauthorized" | "feature_not_entitled" | "rate_limited" | "rate_limit_unavailable";

export type WhatsAppAutomationApiAuthResult =
  | { ok: true; key: { id: string; businessId: string } }
  | { ok: false; error: FailureCode; status: 401 | 403 | 429 | 503; retryAfter?: number };

export async function authenticateWhatsAppAutomationApiRequest(input: { request: Request; scope: string }): Promise<WhatsAppAutomationApiAuthResult> {
  const address = requestClientAddress(input.request);
  try {
    const preAuthRate = await consumePublicWriteLimit({ scope: "whatsapp-automation-api-auth", businessId: "api-auth", identity: address, limit: 100, windowSeconds: 30 });
    if (!preAuthRate.allowed) return { ok: false, error: "rate_limited", status: 429, retryAfter: Math.max(1, preAuthRate.retryAfterSeconds) };
  } catch {
    return { ok: false, error: "rate_limit_unavailable", status: 503, retryAfter: 30 };
  }

  const authorization = input.request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ") || authorization.includes(",")) return { ok: false, error: "unauthorized", status: 401 };
  const plaintext = authorization.slice(7);
  const splitAt = plaintext.indexOf(".");
  if (splitAt < 1 || plaintext.indexOf(".", splitAt + 1) !== -1) return { ok: false, error: "unauthorized", status: 401 };
  const prefix = plaintext.slice(0, splitAt), secret = plaintext.slice(splitAt + 1);
  if (!PREFIX.test(prefix) || !SECRET.test(secret)) return { ok: false, error: "unauthorized", status: 401 };
  const key = await db.whatsAppAutomationApiKey.findUnique({ where: { keyPrefix: prefix }, select: { id: true, businessId: true, keyHash: true, status: true } });
  if (!key || key.status !== "active") return { ok: false, error: "unauthorized", status: 401 };
  const calculated = Buffer.from(hashWhatsAppAutomationApiKey(plaintext), "hex"), expected = Buffer.from(key.keyHash, "hex");
  if (calculated.length !== expected.length || !timingSafeEqual(calculated, expected)) return { ok: false, error: "unauthorized", status: 401 };
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: key.businessId })) return { ok: false, error: "feature_not_entitled", status: 403 };
  try {
    const keyRate = await consumePublicWriteLimit({ scope: `whatsapp-automation-api-${input.scope}`, businessId: key.businessId, identity: key.id, limit: 100, windowSeconds: 30 });
    if (!keyRate.allowed) return { ok: false, error: "rate_limited", status: 429, retryAfter: Math.max(1, keyRate.retryAfterSeconds) };
  } catch {
    return { ok: false, error: "rate_limit_unavailable", status: 503, retryAfter: 30 };
  }
  return { ok: true, key: { id: key.id, businessId: key.businessId } };
}
