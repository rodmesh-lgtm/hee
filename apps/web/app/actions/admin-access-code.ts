"use server";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { requireAdmin } from "../lib/admin";
import { db } from "../lib/db";
import { accessCodeHash } from "../lib/subscription-access-code";

export async function createSubscriptionAccessCodeAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const planCode = String(formData.get("plan") ?? "").trim().toUpperCase();
  const label = String(formData.get("label") ?? "").trim().slice(0, 120) || null;
  const maxRaw = String(formData.get("maxRedemptions") ?? "").trim();
  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();
  const maxRedemptions = maxRaw ? Number.parseInt(maxRaw, 10) : null;
  if (maxRedemptions !== null && (!Number.isSafeInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 100000)) {
    redirect("/admin/access-codes?access=invalid-limit");
  }
  const expiresAt = expiresRaw ? new Date(expiresRaw) : null;
  if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) {
    redirect("/admin/access-codes?access=invalid-expiry");
  }
  const plan = await db.businessPlan.findFirst({ where: { code: planCode, isActive: true }, select: { id: true, code: true } });
  if (!plan || plan.code === "FREE") redirect("/admin/access-codes?access=invalid-plan");
  const plaintext = `HEE-${randomBytes(12).toString("hex").toUpperCase()}`;
  await db.subscriptionAccessCode.create({
    data: { codeHash: accessCodeHash(plaintext), label, planId: plan.id, createdByUserId: admin.id, maxRedemptions, expiresAt },
  });
  redirect(`/admin/access-codes?access=created&newCode=${encodeURIComponent(plaintext)}`);
}

export async function revokeSubscriptionAccessCodeAdminAction(formData: FormData) {
  await requireAdmin();
  const codeId = String(formData.get("codeId") ?? "").trim();
  if (!codeId) redirect("/admin/access-codes?access=invalid-code");
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`subscription-access-admin:${codeId}`}))`;
    const code = await tx.subscriptionAccessCode.findUnique({ where: { id: codeId }, include: { grants: { where: { revokedAt: null } } } });
    if (!code || !code.isActive) return;
    const now = new Date();
    await tx.subscriptionAccessCode.update({ where: { id: code.id }, data: { isActive: false, revokedAt: now } });
    for (const grant of code.grants) {
      await tx.subscriptionAccessGrant.update({ where: { id: grant.id }, data: { revokedAt: now } });
      await tx.subscription.updateMany({ where: { id: grant.subscriptionId, status: "active", provider: "access_code", providerReference: code.id }, data: { status: "canceled", autoRenew: false, endsAt: now } });
      const fallback = await tx.subscription.findFirst({ where: { businessId: grant.businessId, status: "active", id: { not: grant.subscriptionId }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, orderBy: { startsAt: "desc" }, select: { planId: true } });
      const free = await tx.businessPlan.findUnique({ where: { code: "FREE" }, select: { id: true } });
      if (fallback?.planId || free?.id) await tx.business.update({ where: { id: grant.businessId }, data: { planId: fallback?.planId ?? free!.id } });
      await tx.analyticsEvent.create({ data: { businessId: grant.businessId, eventType: "subscription_access_code_revoked", metadata: { codeId: code.id, subscriptionId: grant.subscriptionId } } });
    }
  });
  redirect("/admin/access-codes?access=revoked");
}
