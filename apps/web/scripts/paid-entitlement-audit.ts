import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../app/lib/db";
import { closePrismaForWorker } from "../lib/prisma";
import { createBillingIntent, activateVerifiedMoyasarPayment, handleRefundedMoyasarPayment } from "../app/lib/billing-ledger";
import { getEffectiveSubscription, hasActiveBusinessSubscription } from "../app/lib/subscription-entitlement";
import { getPlanEntitlements } from "../app/lib/plan-entitlements";
import { hasActiveWhatsAppMarketingEntitlement } from "../app/lib/whatsapp/feature-entitlement";

// This proof never calls a payment provider or sends a WhatsApp message.
const databaseUrl = new URL(process.env.DATABASE_URL || "postgresql://invalid");
if (process.env.APP_ENV !== "test" || process.env.ALLOW_PAID_ENTITLEMENT_AUDIT !== "true"
  || !["localhost", "127.0.0.1"].includes(databaseUrl.hostname) || databaseUrl.pathname !== "/hee_ci"
  || process.env.VERCEL_ENV === "production") throw new Error("ISOLATED_TEST_DATABASE_REQUIRED");

async function main() {
  const suffix = randomUUID();
  const free = await db.businessPlan.upsert({ where: { code: "FREE" }, update: {}, create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3 } });
  const paid = await db.businessPlan.upsert({ where: { code: "BUSINESS" }, update: {}, create: { code: "BUSINESS", name: "Business", monthlyPrice: 199, productLimit: 10 } });
  const owner = await db.user.create({ data: { name: "Payment proof", email: `paid-proof-${suffix}@example.test`, emailVerifiedAt: new Date() } });
  const business = await db.business.create({ data: { ownerId: owner.id, planId: free.id, name: "Payment proof", slug: `paid-proof-${suffix}`, businessType: "test" } });
  try {
    assert.equal(await getEffectiveSubscription({ businessId: business.id }), null);
    const internal = await db.subscription.create({ data: { businessId: business.id, planId: free.id, status: "active", provider: "internal", startsAt: new Date(Date.now() - 1000), endsAt: new Date(Date.now() + 60_000), autoRenew: false } });
    assert.equal(await hasActiveBusinessSubscription({ businessId: business.id }), true);
    assert.equal(await getEffectiveSubscription({ businessId: business.id }), null);
    await db.subscription.delete({ where: { id: internal.id } });
    const intent = await createBillingIntent(owner.id, business.id, "BUSINESS");
    const payment = { id: randomUUID(), status: "paid", amount: intent.payment.amount, currency: "SAR", metadata: { hee_billing_id: intent.payment.id, hee_business_id: business.id } };
    assert.equal(await activateVerifiedMoyasarPayment(intent.payment.id, { ...payment, status: "authorized" }), "mismatch");
    assert.equal(await activateVerifiedMoyasarPayment(intent.payment.id, { ...payment, amount: 100 }), "mismatch");
    assert.equal(await activateVerifiedMoyasarPayment(intent.payment.id, { ...payment, metadata: { ...payment.metadata, hee_business_id: "another-tenant" } }), "mismatch");
    assert.equal(await getEffectiveSubscription({ businessId: business.id }), null);
    assert.equal(await activateVerifiedMoyasarPayment(intent.payment.id, payment), "activated");
    assert.equal(await activateVerifiedMoyasarPayment(intent.payment.id, payment), "already-paid");
    assert.equal(await db.subscription.count({ where: { businessId: business.id, status: "active" } }), 1);
    const active = await getEffectiveSubscription({ businessId: business.id });
    assert.ok(active);
    assert.equal(getPlanEntitlements(active.plan.code).branchLimit, 5);
    assert.equal(getPlanEntitlements(active.plan.code).contactLimit, 8);
    assert.equal(await hasActiveWhatsAppMarketingEntitlement({ businessId: business.id }), true);
    // A stale cached plan must not remove a confirmed paid entitlement.
    await db.business.update({ where: { id: business.id }, data: { planId: free.id } });
    assert.equal((await getEffectiveSubscription({ businessId: business.id }))?.plan.code, "BUSINESS");
    await assert.rejects(createBillingIntent(owner.id, business.id, "BUSINESS"), /PLAN_NOT_AN_UPGRADE/);
    // Future terms do not unlock features early.
    await db.subscription.update({ where: { id: active.id }, data: { startsAt: new Date(Date.now() + 60_000) } });
    assert.equal(await getEffectiveSubscription({ businessId: business.id }), null);
    assert.equal(await hasActiveWhatsAppMarketingEntitlement({ businessId: business.id }), false);
    await db.subscription.update({ where: { id: active.id }, data: { startsAt: new Date(Date.now() - 86_400_000), endsAt: new Date(Date.now() - 1000) } });
    await db.business.update({ where: { id: business.id }, data: { planId: paid.id } });
    assert.equal(await getEffectiveSubscription({ businessId: business.id }), null);
    const repurchase = await createBillingIntent(owner.id, business.id, "BUSINESS");
    assert.equal(repurchase.payment.kind, "initial");
    assert.equal(repurchase.payment.amount, paid.monthlyPrice * 100);
    const secondPayment = { ...payment, id: randomUUID(), amount: repurchase.payment.amount, metadata: { ...payment.metadata, hee_billing_id: repurchase.payment.id } };
    assert.equal(await activateVerifiedMoyasarPayment(repurchase.payment.id, secondPayment), "activated");
    assert.equal(await handleRefundedMoyasarPayment(repurchase.payment.id, { ...secondPayment, status: "refunded" }), "refunded");
    assert.equal(await getEffectiveSubscription({ businessId: business.id }), null);
    // Redemption expiry does not revoke an issued administrative grant.
    const code = await db.subscriptionAccessCode.create({ data: { codeHash: suffix, label: "Proof", planId: paid.id, createdByUserId: owner.id, expiresAt: new Date(Date.now() - 1000) } });
    const grantSubscription = await db.subscription.create({ data: { businessId: business.id, planId: paid.id, status: "active", provider: "access_code", providerReference: code.id, autoRenew: false } });
    await db.subscriptionAccessGrant.create({ data: { codeId: code.id, businessId: business.id, planId: paid.id, subscriptionId: grantSubscription.id, redeemedByUserId: owner.id } });
    assert.equal((await getEffectiveSubscription({ businessId: business.id }))?.id, grantSubscription.id);
    await assert.rejects(createBillingIntent(owner.id, business.id, "PRO"), /ACCESS_GRANT_ACTIVE|PLAN_UNAVAILABLE/);
    await db.subscriptionAccessCode.update({ where: { id: code.id }, data: { isActive: false, revokedAt: new Date() } });
    assert.equal(await getEffectiveSubscription({ businessId: business.id }), null);
    console.log("paid-entitlement-audit: PASS (verified settlement, replay, limits, stale pointer, future term, expiry, repurchase, refund, grant expiry/revocation)");
  } finally {
    await db.subscriptionAccessGrant.deleteMany({ where: { businessId: business.id } });
    await db.subscriptionAccessCode.deleteMany({ where: { createdByUserId: owner.id } });
    await db.billingPayment.deleteMany({ where: { businessId: business.id } });
    await db.subscription.deleteMany({ where: { businessId: business.id } });
    await db.business.delete({ where: { id: business.id } });
    await db.user.delete({ where: { id: owner.id } });
  }
}

main().finally(closePrismaForWorker).catch((error) => { console.error(error); process.exitCode = 1; });
