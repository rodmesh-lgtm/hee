import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";

import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";
import { encryptCommerceCredential } from "../whatsapp/commerce-credential-envelope";
import { getSallaConfig, sallaOAuthCallbackUrl } from "./salla-config";

const OAUTH_TTL_MS = 10 * 60_000;
const FETCH_TIMEOUT_MS = 12_000;

type TokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  scope?: unknown;
};

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /^SALLA_[A-Z0-9_]+$/.test(message) ? message : "SALLA_ACTIVATION_FAILED";
}

export async function createSallaAuthorization(input: { businessId: string; userId: string; integrationId: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(input.integrationId)) throw new Error("SALLA_INTEGRATION_INVALID");
  const config = getSallaConfig();
  const state = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.$transaction(async (tx) => {
    const integration = await tx.whatsAppCommerceIntegration.findFirst({
      where: { id: input.integrationId, businessId: input.businessId, provider: "salla", status: { in: ["draft", "disconnected"] } },
      select: { id: true },
    });
    if (!integration) throw new Error("SALLA_INTEGRATION_UNAVAILABLE");
    await tx.whatsAppCommerceOAuthSession.updateMany({
      where: { businessId: input.businessId, integrationId: integration.id, initiatedByUserId: input.userId, status: { in: ["created", "exchanging"] } },
      data: { status: "cancelled", consumedAt: now, lastErrorCode: "superseded" },
    });
    await tx.whatsAppCommerceOAuthSession.create({
      data: {
        businessId: input.businessId,
        integrationId: integration.id,
        initiatedByUserId: input.userId,
        stateDigest: digest(state),
        expiresAt: new Date(now.getTime() + OAUTH_TTL_MS),
      },
    });
    await writeWhatsAppAuditLog({
      businessId: input.businessId,
      actorUserId: input.userId,
      action: "commerce.salla.oauth.start",
      targetType: "commerce_integration",
      targetId: integration.id,
      outcome: "success",
      database: tx,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.SALLA_CLIENT_ID,
    redirect_uri: sallaOAuthCallbackUrl(),
    scope: config.SALLA_OAUTH_SCOPES,
    state,
  });
  return `https://accounts.salla.sa/oauth2/auth?${params.toString()}`;
}

async function exchangeCode(code: string) {
  const config = getSallaConfig();
  const response = await fetch("https://accounts.salla.sa/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.SALLA_CLIENT_ID,
      client_secret: config.SALLA_CLIENT_SECRET,
      redirect_uri: sallaOAuthCallbackUrl(),
      code,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null) as TokenResponse | null;
  if (!response.ok || !payload) throw new Error(`SALLA_TOKEN_HTTP_${response.status}`);
  const accessToken = typeof payload.access_token === "string" ? payload.access_token : "";
  if (accessToken.length < 16) throw new Error("SALLA_TOKEN_MISSING");
  return {
    accessToken,
    refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : null,
    tokenType: typeof payload.token_type === "string" ? payload.token_type : "Bearer",
    expiresIn: typeof payload.expires_in === "number" && payload.expires_in > 0 ? payload.expires_in : null,
    scope: typeof payload.scope === "string" ? payload.scope : null,
  };
}

async function verifyStore(accessToken: string) {
  const response = await fetch("https://api.salla.dev/admin/v2/store/info", {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null) as { data?: { id?: unknown; name?: unknown } } | null;
  if (!response.ok || !payload?.data) throw new Error(`SALLA_STORE_HTTP_${response.status}`);
  const merchantId = typeof payload.data.id === "number" || typeof payload.data.id === "string" ? String(payload.data.id).trim() : "";
  if (!/^\d{1,32}$/.test(merchantId)) throw new Error("SALLA_STORE_ID_INVALID");
  return { merchantId, name: typeof payload.data.name === "string" ? payload.data.name.trim().slice(0, 120) : null };
}

export async function completeSallaAuthorization(input: { businessId: string; userId: string; state: string; code: string; now?: Date }) {
  if (input.state.length < 32 || input.state.length > 128 || input.code.length < 8 || input.code.length > 4096) throw new Error("SALLA_CALLBACK_INVALID");
  const now = input.now ?? new Date();
  let sessionId = "";
  let integrationId = "";
  try {
    const claimed = await db.$transaction(async (tx) => {
      const sessions = await tx.$queryRaw<Array<{ id: string; integrationId: string; expiresAt: Date; status: string }>>(Prisma.sql`
        SELECT "id", "integrationId", "expiresAt", "status" FROM "WhatsAppCommerceOAuthSession"
        WHERE "stateDigest" = ${digest(input.state)}
          AND "businessId" = ${input.businessId}
          AND "initiatedByUserId" = ${input.userId}
        FOR UPDATE
      `);
      const session = sessions[0];
      if (!session || session.status !== "created" || session.expiresAt <= now) throw new Error("SALLA_OAUTH_SESSION_INVALID");
      const integration = await tx.whatsAppCommerceIntegration.findFirst({
        where: { id: session.integrationId, businessId: input.businessId, provider: "salla", status: { in: ["draft", "disconnected"] } },
        select: { id: true, externalStoreId: true },
      });
      if (!integration) throw new Error("SALLA_INTEGRATION_MISMATCH");
      await tx.whatsAppCommerceOAuthSession.update({ where: { id: session.id }, data: { status: "exchanging", lastErrorCode: null } });
      return { sessionId: session.id, integrationId: integration.id, expectedMerchantId: integration.externalStoreId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    sessionId = claimed.sessionId;
    integrationId = claimed.integrationId;

    const token = await exchangeCode(input.code);
    const store = await verifyStore(token.accessToken);
    if (store.merchantId !== claimed.expectedMerchantId) throw new Error("SALLA_STORE_OWNERSHIP_MISMATCH");
    const config = getSallaConfig();
    const credentialEnvelope = encryptCommerceCredential({
      plaintext: JSON.stringify({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        tokenType: token.tokenType,
        scope: token.scope,
        accessTokenExpiresAt: token.expiresIn ? new Date(now.getTime() + token.expiresIn * 1000).toISOString() : null,
      }),
      encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY,
      keyVersion: config.WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION,
      businessId: input.businessId,
      integrationId,
      provider: "salla",
    });

    await db.$transaction(async (tx) => {
      const session = await tx.whatsAppCommerceOAuthSession.findFirst({ where: { id: sessionId, businessId: input.businessId, status: "exchanging" }, select: { id: true } });
      if (!session) throw new Error("SALLA_OAUTH_SESSION_INVALID");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`salla-store:${store.merchantId}`}))`;
      const collision = await tx.whatsAppCommerceIntegration.findFirst({
        where: { provider: "salla", externalStoreId: store.merchantId, status: "active", id: { not: integrationId } },
        select: { id: true },
      });
      if (collision) throw new Error("SALLA_STORE_ALREADY_ASSIGNED");
      const updated = await tx.whatsAppCommerceIntegration.updateMany({
        where: { id: integrationId, businessId: input.businessId, provider: "salla", externalStoreId: store.merchantId, status: { in: ["draft", "disconnected"] } },
        data: {
          status: "active",
          credentialEnvelope: credentialEnvelope as unknown as Prisma.InputJsonValue,
          displayName: store.name,
          connectedAt: now,
          disconnectedAt: null,
          lastErrorCode: null,
        },
      });
      if (updated.count !== 1) throw new Error("SALLA_INTEGRATION_MISMATCH");
      await tx.whatsAppCommerceOAuthSession.update({ where: { id: sessionId }, data: { status: "connected", consumedAt: now, lastErrorCode: null } });
      await writeWhatsAppAuditLog({
        businessId: input.businessId,
        actorUserId: input.userId,
        action: "commerce.salla.oauth.complete",
        targetType: "commerce_integration",
        targetId: integrationId,
        outcome: "success",
        metadata: { provider: "salla", merchantId: store.merchantId },
        database: tx,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { status: "connected" as const, integrationId };
  } catch (error) {
    const code = safeFailure(error);
    if (sessionId) await db.$transaction(async (tx) => {
      await tx.whatsAppCommerceOAuthSession.updateMany({ where: { id: sessionId, businessId: input.businessId, status: "exchanging" }, data: { status: "failed", consumedAt: now, lastErrorCode: code } });
      if (integrationId) await tx.whatsAppCommerceIntegration.updateMany({ where: { id: integrationId, businessId: input.businessId }, data: { lastErrorCode: code } });
      await writeWhatsAppAuditLog({
        businessId: input.businessId,
        actorUserId: input.userId,
        action: "commerce.salla.oauth.complete",
        targetType: "commerce_integration",
        targetId: integrationId || undefined,
        outcome: "failed",
        metadata: { reason: code },
        database: tx,
      });
    }).catch(() => undefined);
    throw new Error(code);
  }
}
