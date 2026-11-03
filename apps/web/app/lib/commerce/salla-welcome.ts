import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { decryptCommerceCredential, type CommerceCredentialEnvelope } from "../whatsapp/commerce-credential-envelope";
import { getSallaConfig, sallaAppOrigin } from "./salla-config";

/** Durable lease + provider idempotency keep retries independent of installation. */
export async function sendNextSallaWelcome() {
  const key = process.env.RESEND_API_KEY?.trim(), from = process.env.HEE_FROM_EMAIL?.trim();
  if (!key || !from) return { processed: false };
  const now = new Date();
  const item = await db.$transaction(async tx => {
    const rows = await tx.$queryRaw<Array<{ merchantId: string }>>(Prisma.sql`
      SELECT "merchantId" FROM "SallaEasyInstallation"
      WHERE "welcomeStatus" = 'pending' AND "welcomeNextAt" <= ${now}
        AND ("welcomeLeaseUntil" IS NULL OR "welcomeLeaseUntil" < ${now})
      ORDER BY "welcomeNextAt" LIMIT 1 FOR UPDATE SKIP LOCKED
    `);
    if (!rows[0]) return null;
    return tx.sallaEasyInstallation.update({ where: { merchantId: rows[0].merchantId },
      data: { welcomeLeaseUntil: new Date(now.getTime() + 60_000), welcomeAttempts: { increment: 1 } },
      include: { user: true, business: true, integration: true } });
  });
  if (!item) return { processed: false };
  const where = { merchantId: item.merchantId, claimHash: item.claimHash, welcomeLeaseUntil: item.welcomeLeaseUntil };
  if (item.user.deletedAt || item.user.deactivatedAt || item.business.deletedAt || item.business.ownerId !== item.userId
    || item.integration.status !== "active" || !item.claimEnvelope || !item.claimExpiresAt || item.claimExpiresAt <= now) {
    await db.sallaEasyInstallation.updateMany({ where, data: { welcomeStatus: "blocked", welcomeLeaseUntil: null } });
    return { processed: true, sent: false };
  }
  let sent = false;
  try {
    const config = getSallaConfig();
    const token = decryptCommerceCredential({ envelope: item.claimEnvelope as unknown as CommerceCredentialEnvelope,
      encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY,
      businessId: item.businessId, integrationId: item.integrationId, provider: "salla-activation" });
    // Fragment is not sent to access logs or third-party referrers.
    const url = `${sallaAppOrigin()}/salla/activate#token=${encodeURIComponent(token)}`;
    const response = await fetch("https://api.resend.com/emails", { method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json",
        "Idempotency-Key": `salla-welcome-${item.claimHash}` },
      body: JSON.stringify({ from, to: [item.user.email], subject: "مرحبًا بك في انفرو واتساب — أكمل تفعيل متجرك",
        text: `مرحبًا بك في INFRO. تم تجهيز مساحة متجرك بعد تثبيت تطبيق انفرو واتساب في سلة.\n\nأكمل تفعيل حسابك عبر الرابط التالي خلال 24 ساعة:\n${url}\n\nإذا كان لديك حساب سابق، سجّل الدخول إليه قبل تأكيد التفعيل. بعد التفعيل يمكنك إعداد واتساب والحملات والتذكيرات والمواعيد. اشتراك الخدمة ورسوم رسائل Meta منفصلان. تثبيت التطبيق لا يعني تفعيل باقة مدفوعة.\n\nللمساعدة: info@ir.sa\nإذا لم تثبت التطبيق، لا تستخدم الرابط وتواصل مع الدعم.` }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000) });
    sent = response.ok;
  } catch { /* Never log credentials, provider response bodies or activation URLs. */ }
  await db.sallaEasyInstallation.updateMany({ where, data: sent
    ? { welcomeStatus: "sent", welcomeSentAt: new Date(), welcomeLeaseUntil: null, claimEnvelope: Prisma.DbNull }
    : { welcomeStatus: item.welcomeAttempts >= 8 ? "failed" : "pending", welcomeLeaseUntil: null,
        welcomeNextAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** item.welcomeAttempts) * 1000) } });
  return { processed: true, sent };
}
