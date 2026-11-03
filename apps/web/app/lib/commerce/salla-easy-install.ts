import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { encryptCommerceCredential } from "../whatsapp/commerce-credential-envelope";
import { getSallaConfig } from "./salla-config";
import { parseSallaAuthorization, parseSallaInstaller, sallaAuthorizationIsStale } from "./salla-authorization-domain";

export const sallaClaimHash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Called only after raw-body HMAC verification. No secrets enter the event inbox. */
export async function installSallaEasy(payload: unknown, eventDigest: string) {
  const now = new Date(), config = getSallaConfig();
  const auth = parseSallaAuthorization(payload, now, config.SALLA_LEGACY_WEBHOOK_UTC_OFFSET);
  // Avoid contacting Salla with an already-rotated token on an identical retry.
  const previous = await db.sallaEasyInstallation.findUnique({ where: { merchantId: auth.merchantId } });
  if (previous && (previous.eventDigest === eventDigest || auth.authorizedAt <= previous.authorizedAt)) return { duplicate: true };
  const response = await fetch("https://accounts.salla.sa/oauth2/user/info", {
    headers: { authorization: `Bearer ${auth.credential.accessToken}`, accept: "application/json" },
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("SALLA_INSTALLER_VERIFICATION_FAILED");
  const installer = parseSallaInstaller(await response.json(), auth.merchantId);
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`salla-store:${auth.merchantId}`}))`;
    const stored = await tx.sallaEasyInstallation.findUnique({ where: { merchantId: auth.merchantId } });
    if (stored && (stored.eventDigest === eventDigest || auth.authorizedAt <= stored.authorizedAt)) return { duplicate: true };
    const matches = await tx.whatsAppCommerceIntegration.findMany({
      where: { provider: "salla", externalStoreId: auth.merchantId },
      include: { business: { include: { owner: true } } },
    });
    // Do not choose an arbitrary tenant when historical mappings conflict.
    if (matches.length > 1 || stored && !matches.some(i => i.id === stored.integrationId && i.businessId === stored.businessId)) {
      throw new Error("SALLA_INSTALLATION_TENANT_CONFLICT");
    }
    const existing = matches[0];
    if (existing) {
      await tx.$queryRaw`SELECT "id" FROM "WhatsAppCommerceIntegration" WHERE "id" = ${existing.id} FOR UPDATE`;
      const current = await tx.whatsAppCommerceIntegration.findUniqueOrThrow({ where: { id: existing.id } });
      if (sallaAuthorizationIsStale(auth.authorizedAt, stored?.authorizedAt ?? current.connectedAt, current.disconnectedAt)) return { duplicate: true };
      if (existing.business.deletedAt || existing.business.owner.deletedAt || existing.business.owner.deactivatedAt) throw new Error("SALLA_INSTALLATION_ACCOUNT_UNAVAILABLE");
    }
    let user = existing?.business.owner ?? await tx.user.findUnique({ where: { email: installer.email } });
    let provisionedUser = stored?.provisionedUser ?? false;
    if (user?.deletedAt || user?.deactivatedAt) throw new Error("SALLA_INSTALLATION_ACCOUNT_UNAVAILABLE");
    if (!user) {
      // Provisional only: no session, password, verified email or fabricated consent.
      user = await tx.user.create({ data: { email: installer.email, name: installer.name } });
      provisionedUser = true;
    }
    const business = existing?.business ?? await tx.business.create({ data: {
      ownerId: user.id, name: installer.storeName, slug: `salla-${randomUUID().replaceAll("-", "")}`,
      businessType: "متجر إلكتروني", email: user.email, isPublished: false,
      onboardingCompleted: false, onboardingStep: "salla_account_activation",
    } });
    const integrationId = existing?.id ?? randomUUID();
    const encrypt = (plaintext: string, provider: string) => encryptCommerceCredential({ plaintext, provider,
      businessId: business.id, integrationId, encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY,
      keyVersion: config.WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION }) as unknown as Prisma.InputJsonValue;
    const credentialEnvelope = encrypt(JSON.stringify(auth.credential), "salla");
    if (existing) await tx.whatsAppCommerceIntegration.update({ where: { id: integrationId }, data: {
      credentialEnvelope, status: "active", connectedAt: auth.authorizedAt, disconnectedAt: null, lastErrorCode: null,
    } });
    else await tx.whatsAppCommerceIntegration.create({ data: { id: integrationId, businessId: business.id,
      provider: "salla", externalStoreId: auth.merchantId, displayName: installer.storeName,
      credentialEnvelope, status: "active", connectedAt: auth.authorizedAt } });
    const claimToken = randomBytes(32).toString("hex");
    const activation = stored?.claimedAt ? {} : {
      claimHash: sallaClaimHash(claimToken), claimExpiresAt: new Date(now.getTime() + 24 * 3600_000),
      claimEnvelope: encrypt(claimToken, "salla-activation"), welcomeStatus: "pending", welcomeAttempts: 0,
      welcomeNextAt: now, welcomeLeaseUntil: null,
    };
    await tx.sallaEasyInstallation.upsert({ where: { merchantId: auth.merchantId },
      create: { merchantId: auth.merchantId, businessId: business.id, integrationId, userId: user.id,
        provisionedUser, authorizedAt: auth.authorizedAt, eventDigest, ...activation },
      update: { authorizedAt: auth.authorizedAt, eventDigest, ...activation },
    });
    return { duplicate: false };
  }, { timeout: 15_000 });
}
