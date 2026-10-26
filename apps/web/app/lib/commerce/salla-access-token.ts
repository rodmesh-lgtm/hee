import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { decryptCommerceCredential, encryptCommerceCredential, type CommerceCredentialEnvelope } from "../whatsapp/commerce-credential-envelope";
import { getSallaConfig } from "./salla-config";
import { parseSallaCredential, rotatedSallaCredential, sallaTokenNeedsRefresh } from "./salla-token-domain";

export async function getSallaAccessToken(input: {
  businessId: string; integrationId: string; rejectedAccessToken?: string;
  database?: Pick<PrismaClient, "whatsAppCommerceIntegration" | "$transaction">;
  fetcher?: typeof fetch; now?: Date;
}) {
  const database = input.database ?? db;
  const config = getSallaConfig();
  const now = input.now ?? new Date();
  const read = (value: Prisma.JsonValue | null) => {
    const item = value as Partial<CommerceCredentialEnvelope> | null;
    if (!item || item.v !== 1 || item.alg !== "aes-256-gcm" || typeof item.keyVersion !== "string"
      || typeof item.iv !== "string" || typeof item.ciphertext !== "string" || typeof item.tag !== "string") throw new Error("SALLA_CREDENTIAL_INVALID");
    try {
      return parseSallaCredential(JSON.parse(decryptCommerceCredential({ envelope: item as CommerceCredentialEnvelope,
        encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY,
        businessId: input.businessId, integrationId: input.integrationId, provider: "salla" })));
    } catch { throw new Error("SALLA_CREDENTIAL_INVALID"); }
  };
  const where = { id: input.integrationId, businessId: input.businessId, provider: "salla", status: "active" };
  const integration = await database.whatsAppCommerceIntegration.findFirst({ where, select: { credentialEnvelope: true } });
  if (!integration) throw new Error("SALLA_INTEGRATION_UNAVAILABLE");
  const initial = read(integration.credentialEnvelope);
  if (!sallaTokenNeedsRefresh(initial, now, input.rejectedAccessToken)) return initial.accessToken;

  // Serialize refresh-token rotation across workers and with disconnect. Read the
  // encrypted credential again after the lock; never overwrite a newer rotation.
  return database.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ credentialEnvelope: Prisma.JsonValue | null }>>(Prisma.sql`
      SELECT "credentialEnvelope" FROM "WhatsAppCommerceIntegration"
      WHERE "id" = ${input.integrationId} AND "businessId" = ${input.businessId}
        AND "provider" = 'salla' AND "status" = 'active' FOR UPDATE
    `);
    if (!rows[0]) throw new Error("SALLA_INTEGRATION_UNAVAILABLE");
    const current = read(rows[0].credentialEnvelope);
    const refreshAt = input.now ?? new Date();
    if (!sallaTokenNeedsRefresh(current, refreshAt, input.rejectedAccessToken)) return current.accessToken;
    if (!current.refreshToken) throw new Error("SALLA_RECONNECT_REQUIRED");
    let response: Response;
    try {
      response = await (input.fetcher ?? fetch)("https://accounts.salla.sa/oauth2/token", {
        method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: new URLSearchParams({ grant_type: "refresh_token", client_id: config.SALLA_CLIENT_ID,
          client_secret: config.SALLA_CLIENT_SECRET, refresh_token: current.refreshToken }),
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
      });
    } catch { throw new Error("SALLA_TOKEN_REFRESH_UNAVAILABLE"); }
    if (!response.ok) throw new Error([400, 401].includes(response.status) ? "SALLA_RECONNECT_REQUIRED" : "SALLA_TOKEN_REFRESH_UNAVAILABLE");
    const next = rotatedSallaCredential(await response.json().catch(() => null), current, refreshAt);
    const credentialEnvelope = encryptCommerceCredential({ plaintext: JSON.stringify(next),
      encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY,
      keyVersion: config.WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION,
      businessId: input.businessId, integrationId: input.integrationId, provider: "salla" });
    const updated = await tx.whatsAppCommerceIntegration.updateMany({ where,
      data: { credentialEnvelope: credentialEnvelope as unknown as Prisma.InputJsonValue } });
    if (updated.count !== 1) throw new Error("SALLA_INTEGRATION_UNAVAILABLE");
    return next.accessToken;
  }, { timeout: 20_000, maxWait: 5_000 });
}
