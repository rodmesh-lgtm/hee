import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "./audit";
import { encryptCommerceCredential } from "./commerce-credential-envelope";
import { getShopifyConfig, SHOPIFY_REQUIRED_SCOPES, shopifyOAuthCallbackUrl } from "./shopify-config";
import { hasRequiredShopifyScopes, normalizeShopifyDomain } from "./shopify-domain";

const OAUTH_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12_000;

type TokenResponse = {
  access_token?: unknown;
  scope?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  refresh_token_expires_in?: unknown;
};

function stateDigest(state: string) {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

function safeFailureCode(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /^SHOPIFY_[A-Z0-9_]+$/.test(message) ? message : "SHOPIFY_ACTIVATION_FAILED";
}

export async function createShopifyAuthorization(input: { businessId: string; userId: string; integrationId: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(input.integrationId)) throw new Error("SHOPIFY_INTEGRATION_INVALID");
  const config = getShopifyConfig();
  const state = randomBytes(32).toString("base64url");
  const now = new Date();
  const integration = await db.$transaction(async (tx) => {
    const record = await tx.whatsAppCommerceIntegration.findFirst({
      where: { id: input.integrationId, businessId: input.businessId, provider: "shopify", status: { in: ["draft", "disconnected"] } },
      select: { id: true, externalStoreId: true },
    });
    if (!record) throw new Error("SHOPIFY_INTEGRATION_UNAVAILABLE");
    await tx.whatsAppCommerceOAuthSession.updateMany({
      where: { businessId: input.businessId, integrationId: record.id, initiatedByUserId: input.userId, status: { in: ["created", "exchanging"] } },
      data: { status: "cancelled", consumedAt: now, lastErrorCode: "superseded" },
    });
    await tx.whatsAppCommerceOAuthSession.create({
      data: {
        businessId: input.businessId, integrationId: record.id, initiatedByUserId: input.userId,
        stateDigest: stateDigest(state), expiresAt: new Date(now.getTime() + OAUTH_TTL_MS),
      },
    });
    await writeWhatsAppAuditLog({
      businessId: input.businessId, actorUserId: input.userId, action: "commerce.shopify.oauth.start",
      targetType: "commerce_integration", targetId: record.id, outcome: "success", database: tx,
    });
    return record;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const params = new URLSearchParams({
    client_id: config.SHOPIFY_CLIENT_ID,
    scope: SHOPIFY_REQUIRED_SCOPES.join(","),
    redirect_uri: shopifyOAuthCallbackUrl(),
    state,
  });
  return `https://${integration.externalStoreId}/admin/oauth/authorize?${params.toString()}`;
}

async function exchangeShopifyCode(shop: string, code: string) {
  const config = getShopifyConfig();
  const body = new URLSearchParams({ client_id: config.SHOPIFY_CLIENT_ID, client_secret: config.SHOPIFY_CLIENT_SECRET, code });
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null) as TokenResponse | null;
  if (!response.ok || !payload) throw new Error(`SHOPIFY_TOKEN_HTTP_${response.status}`);
  const accessToken = typeof payload.access_token === "string" ? payload.access_token : "";
  const scopes = typeof payload.scope === "string" ? payload.scope : "";
  if (accessToken.length < 16) throw new Error("SHOPIFY_TOKEN_MISSING");
  if (!hasRequiredShopifyScopes(scopes, SHOPIFY_REQUIRED_SCOPES)) throw new Error("SHOPIFY_SCOPES_MISSING");
  return {
    accessToken,
    scopes,
    expiresIn: typeof payload.expires_in === "number" && payload.expires_in > 0 ? payload.expires_in : null,
    refreshToken: typeof payload.refresh_token === "string" && payload.refresh_token ? payload.refresh_token : null,
    refreshTokenExpiresIn: typeof payload.refresh_token_expires_in === "number" && payload.refresh_token_expires_in > 0 ? payload.refresh_token_expires_in : null,
  };
}

async function verifiedShopDomain(shop: string, accessToken: string) {
  const config = getShopifyConfig();
  const response = await fetch(`https://${shop}/admin/api/${config.SHOPIFY_ADMIN_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", "x-shopify-access-token": accessToken },
    body: JSON.stringify({ query: "query IRVerifyShop { shop { myshopifyDomain name } }" }),
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null) as { data?: { shop?: { myshopifyDomain?: unknown; name?: unknown } }; errors?: unknown[] } | null;
  if (!response.ok || !payload || payload.errors?.length) throw new Error(`SHOPIFY_GRAPHQL_HTTP_${response.status}`);
  const domain = normalizeShopifyDomain(String(payload.data?.shop?.myshopifyDomain ?? ""));
  if (domain !== shop) throw new Error("SHOPIFY_SHOP_OWNERSHIP_MISMATCH");
  return { domain, name: typeof payload.data?.shop?.name === "string" ? payload.data.shop.name.slice(0, 120) : null };
}

export async function completeShopifyAuthorization(input: {
  businessId: string; userId: string; state: string; code: string; shop: string; now?: Date;
}) {
  if (input.state.length < 32 || input.state.length > 128 || input.code.length < 8 || input.code.length > 4096) throw new Error("SHOPIFY_CALLBACK_INVALID");
  const shop = normalizeShopifyDomain(input.shop);
  const now = input.now ?? new Date();
  let sessionId = "";
  let integrationId = "";
  try {
    const claimed = await db.$transaction(async (tx) => {
      const sessions = await tx.$queryRaw<Array<{ id: string; integrationId: string; expiresAt: Date; status: string }>>(Prisma.sql`
        SELECT "id", "integrationId", "expiresAt", "status" FROM "WhatsAppCommerceOAuthSession"
        WHERE "stateDigest" = ${stateDigest(input.state)} AND "businessId" = ${input.businessId}
          AND "initiatedByUserId" = ${input.userId}
        FOR UPDATE
      `);
      const session = sessions[0];
      if (!session || session.status !== "created" || session.expiresAt <= now) throw new Error("SHOPIFY_OAUTH_SESSION_INVALID");
      const integration = await tx.whatsAppCommerceIntegration.findFirst({
        where: { id: session.integrationId, businessId: input.businessId, provider: "shopify", externalStoreId: shop, status: { in: ["draft", "disconnected"] } },
        select: { id: true },
      });
      if (!integration) throw new Error("SHOPIFY_INTEGRATION_MISMATCH");
      await tx.whatsAppCommerceOAuthSession.update({ where: { id: session.id }, data: { status: "exchanging", lastErrorCode: null } });
      return { sessionId: session.id, integrationId: integration.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    sessionId = claimed.sessionId;
    integrationId = claimed.integrationId;

    const token = await exchangeShopifyCode(shop, input.code);
    const verified = await verifiedShopDomain(shop, token.accessToken);
    const config = getShopifyConfig();
    const credential = JSON.stringify({
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      scopes: token.scopes.split(",").map((item) => item.trim()).filter(Boolean).sort(),
      accessTokenExpiresAt: token.expiresIn ? new Date(now.getTime() + token.expiresIn * 1000).toISOString() : null,
      refreshTokenExpiresAt: token.refreshTokenExpiresIn ? new Date(now.getTime() + token.refreshTokenExpiresIn * 1000).toISOString() : null,
    });
    const credentialEnvelope = encryptCommerceCredential({
      plaintext: credential,
      encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY,
      keyVersion: config.WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION,
      businessId: input.businessId,
      integrationId,
      provider: "shopify",
    });

    await db.$transaction(async (tx) => {
      const session = await tx.whatsAppCommerceOAuthSession.findFirst({ where: { id: sessionId, businessId: input.businessId, status: "exchanging" }, select: { id: true } });
      if (!session) throw new Error("SHOPIFY_OAUTH_SESSION_INVALID");
      const collision = await tx.whatsAppCommerceIntegration.findFirst({
        where: { provider: "shopify", externalStoreId: verified.domain, status: "active", id: { not: integrationId } }, select: { id: true },
      });
      if (collision) throw new Error("SHOPIFY_SHOP_ALREADY_ASSIGNED");
      const updated = await tx.whatsAppCommerceIntegration.updateMany({
        where: { id: integrationId, businessId: input.businessId, provider: "shopify", externalStoreId: verified.domain, status: { in: ["draft", "disconnected"] } },
        data: {
          status: "active", credentialEnvelope: credentialEnvelope as unknown as Prisma.InputJsonValue,
          displayName: verified.name, connectedAt: now, disconnectedAt: null, lastErrorCode: null,
        },
      });
      if (updated.count !== 1) throw new Error("SHOPIFY_INTEGRATION_MISMATCH");
      await tx.whatsAppCommerceOAuthSession.update({ where: { id: sessionId }, data: { status: "connected", consumedAt: now, lastErrorCode: null } });
      await writeWhatsAppAuditLog({
        businessId: input.businessId, actorUserId: input.userId, action: "commerce.shopify.oauth.complete",
        targetType: "commerce_integration", targetId: integrationId, outcome: "success", metadata: { provider: "shopify", scopes: SHOPIFY_REQUIRED_SCOPES.join(",") }, database: tx,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { status: "connected" as const, integrationId };
  } catch (error) {
    const code = safeFailureCode(error);
    if (sessionId) await db.$transaction(async (tx) => {
      await tx.whatsAppCommerceOAuthSession.updateMany({ where: { id: sessionId, businessId: input.businessId, status: "exchanging" }, data: { status: "failed", consumedAt: now, lastErrorCode: code } });
      if (integrationId) await tx.whatsAppCommerceIntegration.updateMany({ where: { id: integrationId, businessId: input.businessId }, data: { lastErrorCode: code } });
      await writeWhatsAppAuditLog({
        businessId: input.businessId, actorUserId: input.userId, action: "commerce.shopify.oauth.complete",
        targetType: "commerce_integration", targetId: integrationId || undefined, outcome: "failed", metadata: { reason: code }, database: tx,
      });
    }).catch(() => undefined);
    throw new Error(code);
  }
}
