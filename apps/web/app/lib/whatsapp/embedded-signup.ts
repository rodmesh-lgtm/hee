import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { decryptWhatsAppCredential, encryptWhatsAppCredential, type WhatsAppCredentialEnvelope } from "./credential-envelope";
import { getMetaWhatsAppConfig, metaWhatsAppGraphUrl } from "./meta-config";

const SESSION_TTL_MS = 10 * 60 * 1000;
const GRAPH_TIMEOUT_MS = 12_000;
const ASSET_ID = /^\d{1,32}$/;

type GraphObject = Record<string, unknown>;

function digestState(state: string) {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

function object(value: unknown): GraphObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as GraphObject : null;
}

function envelope(value: Prisma.JsonValue | null): WhatsAppCredentialEnvelope | null {
  const item = object(value);
  if (!item || item.v !== 1 || item.alg !== "aes-256-gcm" || typeof item.keyVersion !== "string" || typeof item.iv !== "string" || typeof item.ciphertext !== "string" || typeof item.tag !== "string") return null;
  return item as WhatsAppCredentialEnvelope;
}

async function graphRequest(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS) });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`META_GRAPH_HTTP_${response.status}`);
  const result = object(payload);
  if (!result) throw new Error("META_GRAPH_RESPONSE_INVALID");
  return result;
}

async function exchangeAuthorizationCode(code: string) {
  const config = getMetaWhatsAppConfig();
  const body = new URLSearchParams({
    client_id: config.META_APP_ID,
    client_secret: config.META_APP_SECRET,
    code,
  });
  const result = await graphRequest(metaWhatsAppGraphUrl(config, "oauth/access_token"), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const token = typeof result.access_token === "string" ? result.access_token : "";
  if (token.length < 20) throw new Error("META_ACCESS_TOKEN_MISSING");
  return token;
}

async function verifiedPhoneAsset(accessToken: string, wabaId: string, phoneNumberId: string) {
  const config = getMetaWhatsAppConfig();
  const result = await graphRequest(`${metaWhatsAppGraphUrl(config, `${wabaId}/phone_numbers`)}?fields=id,display_phone_number,verified_name`, {
    method: "GET",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const rows = Array.isArray(result.data) ? result.data : [];
  const phone = rows.map(object).find((item) => item?.id === phoneNumberId);
  if (!phone) throw new Error("META_PHONE_NOT_OWNED_BY_WABA");
  return {
    displayPhoneNumber: typeof phone.display_phone_number === "string" ? phone.display_phone_number.slice(0, 64) : null,
    verifiedName: typeof phone.verified_name === "string" ? phone.verified_name.slice(0, 255) : null,
  };
}

async function subscribeApp(accessToken: string, wabaId: string) {
  const config = getMetaWhatsAppConfig();
  await graphRequest(metaWhatsAppGraphUrl(config, `${wabaId}/subscribed_apps`), {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

export async function createEmbeddedSignupSession(input: { businessId: string; userId: string }) {
  const state = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const session = await db.$transaction(async (tx) => {
    await tx.whatsAppEmbeddedSignupSession.updateMany({
      where: { businessId: input.businessId, initiatedByUserId: input.userId, status: { in: ["created", "exchanging", "token_exchanged"] } },
      data: { status: "cancelled", consumedAt: now, lastErrorCode: "superseded" },
    });
    return tx.whatsAppEmbeddedSignupSession.create({
      data: { businessId: input.businessId, initiatedByUserId: input.userId, stateDigest: digestState(state), expiresAt },
      select: { id: true, expiresAt: true },
    });
  });
  return { ...session, state };
}

export async function completeEmbeddedSignup(input: {
  businessId: string;
  userId: string;
  state: string;
  authorizationCode: string;
  wabaId: string;
  phoneNumberId: string;
}) {
  if (!ASSET_ID.test(input.wabaId) || !ASSET_ID.test(input.phoneNumberId) || input.state.length < 32 || input.state.length > 128 || input.authorizationCode.length < 8 || input.authorizationCode.length > 4096) {
    throw new Error("WHATSAPP_SIGNUP_INPUT_INVALID");
  }
  const config = getMetaWhatsAppConfig();
  const stateDigest = digestState(input.state);
  let session = await db.whatsAppEmbeddedSignupSession.findFirst({
    where: { stateDigest, businessId: input.businessId, initiatedByUserId: input.userId },
  });
  if (!session || session.expiresAt <= new Date() || ["connected", "cancelled", "expired"].includes(session.status)) throw new Error("WHATSAPP_SIGNUP_SESSION_INVALID");

  let storedEnvelope = envelope(session.credentialEnvelope);
  let accessToken: string;
  if (storedEnvelope) {
    accessToken = decryptWhatsAppCredential({ envelope: storedEnvelope, encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY, businessId: input.businessId });
  } else {
    await db.whatsAppEmbeddedSignupSession.update({ where: { id: session.id }, data: { status: "exchanging", wabaId: input.wabaId, phoneNumberId: input.phoneNumberId, lastErrorCode: null } });
    try {
      accessToken = await exchangeAuthorizationCode(input.authorizationCode);
      storedEnvelope = encryptWhatsAppCredential({ plaintext: accessToken, encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY, keyVersion: config.META_WHATSAPP_CREDENTIAL_KEY_VERSION, businessId: input.businessId });
      session = await db.whatsAppEmbeddedSignupSession.update({ where: { id: session.id }, data: { status: "token_exchanged", credentialEnvelope: storedEnvelope as unknown as Prisma.InputJsonValue } });
    } catch (error) {
      const code = error instanceof Error && /^META_[A-Z0-9_]+$/.test(error.message) ? error.message : "META_CODE_EXCHANGE_FAILED";
      await db.whatsAppEmbeddedSignupSession.update({ where: { id: session.id }, data: { status: "created", lastErrorCode: code } }).catch(() => undefined);
      throw new Error(code);
    }
  }

  if (session.wabaId && session.wabaId !== input.wabaId || session.phoneNumberId && session.phoneNumberId !== input.phoneNumberId) throw new Error("WHATSAPP_SIGNUP_ASSET_MISMATCH");
  try {
    const phone = await verifiedPhoneAsset(accessToken, input.wabaId, input.phoneNumberId);
    await subscribeApp(accessToken, input.wabaId);
    await db.$transaction(async (tx) => {
      const collision = await tx.whatsAppConnection.findFirst({
        where: { provider: "meta", OR: [{ wabaId: input.wabaId }, { phoneNumberId: input.phoneNumberId }], businessId: { not: input.businessId } },
        select: { id: true },
      });
      if (collision) throw new Error("WHATSAPP_ASSET_ALREADY_ASSIGNED");
      await tx.whatsAppConnection.upsert({
        where: { businessId_provider: { businessId: input.businessId, provider: "meta" } },
        create: { businessId: input.businessId, provider: "meta", status: "connected", wabaId: input.wabaId, phoneNumberId: input.phoneNumberId, displayPhoneNumber: phone.displayPhoneNumber, verifiedName: phone.verifiedName, credentialEnvelope: storedEnvelope as unknown as Prisma.InputJsonValue, connectedAt: new Date() },
        update: { status: "connected", wabaId: input.wabaId, phoneNumberId: input.phoneNumberId, displayPhoneNumber: phone.displayPhoneNumber, verifiedName: phone.verifiedName, credentialEnvelope: storedEnvelope as unknown as Prisma.InputJsonValue, connectedAt: new Date(), disabledAt: null, lastErrorCode: null },
      });
      await tx.whatsAppEmbeddedSignupSession.update({ where: { id: session.id }, data: { status: "connected", consumedAt: new Date(), lastErrorCode: null, credentialEnvelope: Prisma.JsonNull } });
    });
  } catch (error) {
    const code = error instanceof Error && /^(META_|WHATSAPP_)[A-Z0-9_]+$/.test(error.message) ? error.message : "META_ASSET_VERIFICATION_FAILED";
    await db.whatsAppEmbeddedSignupSession.update({ where: { id: session.id }, data: { status: "token_exchanged", lastErrorCode: code } }).catch(() => undefined);
    throw new Error(code);
  }
  return { status: "connected" as const };
}
