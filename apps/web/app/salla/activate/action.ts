"use server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { db } from "../../lib/db";
import { getCurrentUserForApiWrite, hashPassword } from "../../lib/auth";
import { consumePublicWriteLimit } from "../../lib/rate-limit";
import { TERMS_VERSION, PRIVACY_VERSION } from "../../lib/legal";
import { sallaClaimHash } from "../../lib/commerce/salla-easy-install";

export type ActivationState = { error?: string; success?: boolean };
export async function activateSallaAccount(_previous: ActivationState, form: FormData): Promise<ActivationState> {
  if (process.env.SALLA_EASY_MODE_ENABLED !== "true") return { error: "التفعيل التلقائي غير متاح بعد. تواصل مع دعم INFRO." };
  const token = String(form.get("token") ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) return { error: "رابط التفعيل غير صالح أو غير مكتمل." };
  if (form.get("agreed") !== "on") return { error: "راجع الشروط وسياسة الخصوصية ثم وافق عليهما لإكمال التفعيل." };
  const claimHash = sallaClaimHash(token);
  const h = await headers(), address = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  try {
    const limits = await Promise.all([
      consumePublicWriteLimit({ scope: "salla-activation-ip", businessId: "auth", identity: address, limit: 20, windowSeconds: 900 }),
      consumePublicWriteLimit({ scope: "salla-activation-token", businessId: "auth", identity: claimHash, limit: 8, windowSeconds: 900 }),
    ]);
    if (limits.some(l => !l.allowed)) return { error: "تمت محاولات كثيرة. حاول لاحقًا." };
  } catch { return { error: "تعذر التحقق الآن. حاول لاحقًا." }; }
  const sessionUser = await getCurrentUserForApiWrite();
  const password = String(form.get("password") ?? "");
  if (password && (password.length > 200 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)
    || password !== String(form.get("confirmPassword") ?? ""))) return { error: "استخدم كلمة مرور متطابقة من 8 أحرف على الأقل، بحرف كبير وصغير ورقم ورمز." };
  const passwordHash = password ? await hashPassword(password) : null;
  try {
    const result = await db.$transaction(async tx => {
      const rows = await tx.$queryRaw<Array<{ merchantId: string }>>`
        SELECT "merchantId" FROM "SallaEasyInstallation" WHERE "claimHash" = ${claimHash} FOR UPDATE
      `;
      if (!rows[0]) return "invalid";
      const item = await tx.sallaEasyInstallation.findUniqueOrThrow({ where: { merchantId: rows[0].merchantId },
        include: { user: { include: { _count: { select: { authIdentities: true } } } }, business: true, integration: true } });
      const now = new Date();
      if (item.claimedAt || !item.claimExpiresAt || item.claimExpiresAt <= now || item.user.deletedAt || item.user.deactivatedAt
        || item.business.deletedAt || item.business.ownerId !== item.userId || item.integration.status !== "active") return "invalid";
      // Never reset an existing password or OAuth identity through an installation link.
      const canSetInitialPassword = item.provisionedUser && !item.user.passwordHash && item.user._count.authIdentities === 0;
      if (!canSetInitialPassword && sessionUser?.id !== item.userId) return "login";
      if (canSetInitialPassword && !passwordHash) return "password";
      if (canSetInitialPassword) {
        // Lock the user too: another claim or password setup must not be overwritten.
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${item.userId} FOR UPDATE`;
        const current = await tx.user.findUniqueOrThrow({ where: { id: item.userId }, include: { _count: { select: { authIdentities: true } } } });
        if (current.passwordHash || current._count.authIdentities || current.deletedAt || current.deactivatedAt) return "login";
        await tx.user.update({ where: { id: item.userId }, data: { passwordHash, emailVerifiedAt: now } });
      }
      await tx.$executeRaw`INSERT INTO "LegalConsent" ("id", "userId", "termsVersion", "privacyVersion", "source", "acceptedAt")
        VALUES (${randomUUID()}, ${item.userId}, ${TERMS_VERSION}, ${PRIVACY_VERSION}, 'salla_activation', ${now})`;
      await tx.sallaEasyInstallation.update({ where: { merchantId: item.merchantId }, data: {
        claimedAt: now, claimHash: null, claimEnvelope: Prisma.DbNull, welcomeStatus: "completed", welcomeLeaseUntil: null,
      } });
      return "activated";
    });
    if (result === "activated") return { success: true };
    if (result === "login") return { error: "هذا الحساب موجود مسبقًا. سجّل الدخول إلى حسابك ثم افتح رابط البريد مرة أخرى وأكمل التفعيل." };
    if (result === "password") return { error: "عيّن كلمة مرور لحسابك الجديد وأكدها." };
    return { error: "الرابط منتهي أو مستخدم أو الربط غير متاح. تواصل مع دعم INFRO لإعادة التفعيل." };
  } catch { return { error: "تعذر إكمال التفعيل الآن. حاول لاحقًا أو تواصل مع الدعم." }; }
}
