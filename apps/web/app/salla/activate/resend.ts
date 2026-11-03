"use server";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { db } from "../../lib/db";
import { consumePublicWriteLimit } from "../../lib/rate-limit";
import { sallaClaimHash } from "../../lib/commerce/salla-easy-install";
import { getSallaConfig } from "../../lib/commerce/salla-config";
import { encryptCommerceCredential } from "../../lib/whatsapp/commerce-credential-envelope";
import { sendNextSallaWelcome } from "../../lib/commerce/salla-welcome";

export async function resendSallaActivation(_previous: { message?: string }, form: FormData): Promise<{ message: string }> {
  const generic = { message: "إذا كان البريد مرتبطًا بتثبيت ينتظر التفعيل فستصلك رسالة جديدة. تحقق من مجلد الرسائل غير المرغوب فيها أيضًا." };
  if (process.env.SALLA_EASY_MODE_ENABLED !== "true") return generic;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return generic;
  try {
    const h = await headers(), address = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limits = await Promise.all([
      consumePublicWriteLimit({ scope: "salla-resend-ip", businessId: "auth", identity: address, limit: 10, windowSeconds: 900 }),
      consumePublicWriteLimit({ scope: "salla-resend-email", businessId: "auth", identity: email, limit: 2, windowSeconds: 900 }),
    ]);
    if (limits.some(l => !l.allowed)) return generic;
    const candidate = await db.sallaEasyInstallation.findFirst({ where: { claimedAt: null,
      user: { email, deletedAt: null, deactivatedAt: null }, business: { deletedAt: null }, integration: { status: "active" } },
      orderBy: { authorizedAt: "desc" }, select: { merchantId: true } });
    if (!candidate) return generic;
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "merchantId" FROM "SallaEasyInstallation" WHERE "merchantId" = ${candidate.merchantId} FOR UPDATE`;
      const item = await tx.sallaEasyInstallation.findUniqueOrThrow({ where: candidate,
        include: { user: true, business: true, integration: true } });
      const now = new Date();
      if (item.claimedAt || item.user.email !== email || item.user.deletedAt || item.user.deactivatedAt
        || item.business.deletedAt || item.business.ownerId !== item.userId || item.integration.status !== "active"
        || item.welcomeLeaseUntil && item.welcomeLeaseUntil > now) return;
      const config = getSallaConfig(), token = randomBytes(32).toString("hex");
      const encrypted = encryptCommerceCredential({ plaintext: token, provider: "salla-activation",
        businessId: item.businessId, integrationId: item.integrationId,
        encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY, keyVersion: config.WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION });
      await tx.sallaEasyInstallation.update({ where: candidate, data: {
        claimHash: sallaClaimHash(token), claimExpiresAt: new Date(now.getTime() + 24 * 3600_000),
        claimEnvelope: encrypted as unknown as Prisma.InputJsonValue, welcomeStatus: "pending", welcomeAttempts: 0,
        welcomeNextAt: now, welcomeLeaseUntil: null,
      } });
    });
    await sendNextSallaWelcome();
  } catch { /* No account existence, credentials or provider response is returned. */ }
  return generic;
}
