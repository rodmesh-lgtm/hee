export type SallaCredential = {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  tokenType: string;
  scope: string | null;
};

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const token = (value: unknown): value is string => typeof value === "string" && value.length >= 16 && value.length <= 8192 && !/[\r\n]/.test(value);

export function parseSallaCredential(value: unknown): SallaCredential {
  const item = record(value);
  if (!item || !token(item.accessToken)) throw new Error("SALLA_CREDENTIAL_INVALID");
  if (item.refreshToken != null && !token(item.refreshToken)) throw new Error("SALLA_CREDENTIAL_INVALID");
  const expiry = item.accessTokenExpiresAt;
  if (expiry != null && (typeof expiry !== "string" || !Number.isFinite(Date.parse(expiry)))) throw new Error("SALLA_CREDENTIAL_INVALID");
  return { accessToken: item.accessToken, refreshToken: item.refreshToken as string | null ?? null,
    accessTokenExpiresAt: expiry as string | null ?? null, tokenType: "Bearer",
    scope: typeof item.scope === "string" ? item.scope : null };
}

export function sallaTokenNeedsRefresh(credential: SallaCredential, now: Date, rejectedAccessToken?: string) {
  // Another worker may have already replaced the rejected token.
  if (rejectedAccessToken && credential.accessToken !== rejectedAccessToken) return false;
  return Boolean(rejectedAccessToken || credential.accessTokenExpiresAt && Date.parse(credential.accessTokenExpiresAt) <= now.getTime() + 60_000);
}

export function rotatedSallaCredential(value: unknown, previous: SallaCredential, now: Date): SallaCredential {
  const item = record(value);
  if (!item || !token(item.access_token) || item.refresh_token != null && !token(item.refresh_token)
    || item.token_type != null && String(item.token_type).toLowerCase() !== "bearer") throw new Error("SALLA_TOKEN_RESPONSE_INVALID");
  if (item.expires_in != null && typeof item.expires_in !== "number"
    && !(typeof item.expires_in === "string" && /^\d+$/.test(item.expires_in))) throw new Error("SALLA_TOKEN_RESPONSE_INVALID");
  const expires = item.expires_in == null ? null : Number(item.expires_in);
  if (expires !== null && (!Number.isSafeInteger(expires) || expires <= 0 || expires > 365 * 86400)) throw new Error("SALLA_TOKEN_RESPONSE_INVALID");
  return { accessToken: item.access_token, refreshToken: item.refresh_token as string | null ?? previous.refreshToken,
    accessTokenExpiresAt: expires === null ? null : new Date(now.getTime() + expires * 1000).toISOString(),
    tokenType: "Bearer", scope: typeof item.scope === "string" ? item.scope : previous.scope };
}
