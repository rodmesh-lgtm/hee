import { sallaLifecycleDate } from "./salla-lifecycle-domain";
import type { SallaCredential } from "./salla-token-domain";

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const token = (value: unknown): value is string =>
  typeof value === "string" && value.length >= 16 && value.length <= 8192 && !/\s/.test(value);

/** Parse only AFTER webhook authentication. This does not authorize tenant access.
 * Easy Mode uses an absolute `expires` epoch, unlike refresh `expires_in`.
 * Never log this result or persist it in the ordinary webhook inbox.
 */
export function parseSallaAuthorization(payload: unknown, now: Date, legacyOffsetMinutes = 180): {
  merchantId: string; authorizedAt: Date; credential: SallaCredential;
} {
  const root = record(payload), data = record(root?.data);
  const rawMerchant = root?.merchant;
  const merchantId = typeof rawMerchant === "string" ? rawMerchant
    : typeof rawMerchant === "number" && Number.isSafeInteger(rawMerchant) ? String(rawMerchant) : "";
  if (root?.event !== "app.store.authorize" || !/^[1-9]\d{0,31}$/.test(merchantId)) {
    throw new Error("SALLA_AUTHORIZATION_INVALID");
  }
  const authorizedAt = sallaLifecycleDate(root.created_at, legacyOffsetMinutes);
  if (!Number.isFinite(now.getTime()) || !authorizedAt || authorizedAt.getTime() > now.getTime() + 300_000) {
    throw new Error("SALLA_AUTHORIZATION_DATE_INVALID");
  }
  if (!data || !token(data.access_token) || !token(data.refresh_token)
    || typeof data.token_type !== "string" || data.token_type.toLowerCase() !== "bearer") {
    throw new Error("SALLA_AUTHORIZATION_CREDENTIAL_INVALID");
  }
  // Do not coerce null, booleans, floats, scientific notation, or milliseconds.
  const rawExpiry = data.expires;
  const expires = typeof rawExpiry === "number" ? rawExpiry
    : typeof rawExpiry === "string" && /^\d{1,11}$/.test(rawExpiry) ? Number(rawExpiry) : NaN;
  const expiryMs = expires * 1000;
  if (!Number.isSafeInteger(expires) || expiryMs <= now.getTime()
    || expiryMs > now.getTime() + 366 * 86400_000 || expiryMs <= authorizedAt.getTime()) {
    throw new Error("SALLA_AUTHORIZATION_EXPIRY_INVALID");
  }
  if (typeof data.scope !== "string" || data.scope.length > 8192
    || !data.scope.split(/\s+/).includes("offline_access")) {
    throw new Error("SALLA_AUTHORIZATION_SCOPE_INVALID");
  }
  return { merchantId, authorizedAt, credential: {
    accessToken: data.access_token, refreshToken: data.refresh_token,
    accessTokenExpiresAt: new Date(expiryMs).toISOString(), tokenType: "Bearer", scope: data.scope,
  } };
}

/** A duplicate install must never overwrite a rotated token or an uninstall.
 * Call under the same merchant lock used for install/uninstall persistence.
 */
export function sallaAuthorizationIsStale(authorizedAt: Date, lastAuthorizedAt: Date | null, disconnectedAt: Date | null) {
  return Boolean(lastAuthorizedAt && authorizedAt <= lastAuthorizedAt
    || disconnectedAt && authorizedAt <= disconnectedAt);
}
