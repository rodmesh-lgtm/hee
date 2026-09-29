import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../app/lib/db";
import { processSallaCartTransition } from "../app/lib/commerce/salla-cart-processor";
import { sallaCartIdentity } from "../app/lib/commerce/salla-cart-domain";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || !/^\/hee_ci(?:_|$)/.test(url.pathname) || process.env.CI !== "true") throw new Error("CI_DATABASE_REQUIRED");
  const rollback = new Error("ROLLBACK_SUCCESSFUL_AUDIT");
  try {
    await db.$transaction(async tx => {
      const nonce = randomUUID(), now = new Date(), before = new Date(now.getTime() - 60_000);
      const user = await tx.user.create({ data: { name: "Cart audit", email: `salla-${nonce}@example.test` } });
      const business = await tx.business.create({ data: { ownerId: user.id, name: "Cart audit", slug: `cart-${nonce}`, businessType: "test" } });
      const foreign = await tx.business.create({ data: { ownerId: user.id, name: "Foreign", slug: `foreign-${nonce}`, businessType: "test" } });
      const integration = await tx.whatsAppCommerceIntegration.create({ data: { businessId: business.id, provider: "salla", externalStoreId: `audit-${nonce}`, status: "active", connectedAt: now, credentialEnvelope: { testOnly: true } } });
      const second = await tx.whatsAppCommerceIntegration.create({ data: { businessId: business.id, provider: "salla", externalStoreId: `audit-second-${nonce}`, status: "active", connectedAt: now, credentialEnvelope: { testOnly: true } } });
      const connection = await tx.whatsAppConnection.create({ data: { businessId: business.id, status: "connected", wabaId: nonce, phoneNumberId: nonce, credentialEnvelope: { testOnly: true } } });
      await tx.whatsAppAutomation.create({ data: { businessId: business.id, connectionId: connection.id, createdByUserId: user.id,
        name: "Cart audit", status: "active", triggerType: "abandoned_cart", triggerConfig: { version: 1, delayMinutes: 15 }, actionConfig: {} } });
      const input = { businessId: business.id, integrationId: integration.id, now, eventId: `audit-${nonce}`,
        transition: { externalCartId: "123", state: "abandoned" as const, occurredAt: now, phoneE164: "+966500000001", name: "Test" } };
      await assert.rejects(processSallaCartTransition(tx, { ...input, businessId: foreign.id }), /SALLA_INTEGRATION_INACTIVE/);
      assert.equal((await processSallaCartTransition(tx, input)).scheduled, 0);
      assert.equal(await tx.whatsAppConsent.count({ where: { businessId: business.id } }), 0);
      assert.equal(await tx.whatsAppAutomationCart.count({ where: { businessId: business.id } }), 1);
      await tx.whatsAppConsent.create({ data: { businessId: business.id, phoneE164: input.transition.phoneE164, source: "manual", evidence: "CI-only explicit marketing consent", consentedAt: before } });
      const eligible = { ...input, eventId: `eligible-${nonce}`, transition: { ...input.transition, externalCartId: "124" } };
      assert.equal((await processSallaCartTransition(tx, eligible)).scheduled, 1);
      assert.equal((await processSallaCartTransition(tx, { ...eligible, eventId: `duplicate-${nonce}`, transition: { ...eligible.transition, occurredAt: new Date(now.getTime() + 1000) } })).scheduled, 0);
      const queued = await tx.whatsAppAutomationEvent.findFirstOrThrow({ where: { businessId: business.id } });
      assert.equal(queued.nextAttemptAt.getTime(), now.getTime() + 15 * 60_000);
      assert.equal(await tx.whatsAppAutomationEvent.count({ where: { businessId: business.id } }), 1);
      await processSallaCartTransition(tx, { ...eligible, eventId: `purchase-${nonce}`, transition: { ...eligible.transition, state: "recovered", phoneE164: null } });
      assert.equal((await tx.whatsAppAutomationEvent.findUniqueOrThrow({ where: { id: queued.id } })).status, "failed");
      await processSallaCartTransition(tx, { ...eligible, eventId: `late-${nonce}`, transition: { ...eligible.transition, occurredAt: new Date(now.getTime() + 2000) } });
      assert.equal((await tx.whatsAppAutomationCart.findUniqueOrThrow({ where: { businessId_cartId: { businessId: business.id, cartId: sallaCartIdentity(integration.id, "124") } } })).state, "recovered");
      // Purchase arrives before any customer-bearing event.
      await processSallaCartTransition(tx, { ...input, eventId: `early-purchase-${nonce}`, transition: { ...input.transition, externalCartId: "125", state: "recovered", phoneE164: null } });
      assert.equal((await processSallaCartTransition(tx, { ...input, eventId: `late-abandon-${nonce}`, transition: { ...input.transition, externalCartId: "125" } })).scheduled, 0);
      assert.equal((await tx.whatsAppAutomationCart.findUniqueOrThrow({ where: { businessId_cartId: { businessId: business.id, cartId: sallaCartIdentity(integration.id, "125") } } })).state, "recovered");
      await tx.whatsAppContact.updateMany({ where: { businessId: business.id }, data: { optedOutAt: now } });
      assert.equal((await processSallaCartTransition(tx, { ...input, integrationId: second.id, eventId: `other-store-${nonce}` })).scheduled, 0);
      assert.equal(await tx.whatsAppAutomationCart.count({ where: { businessId: business.id } }), 4);
      assert.equal(await tx.whatsAppAutomationEvent.count({ where: { businessId: business.id } }), 1);
      assert.equal(await tx.whatsAppAutomationJob.count({ where: { businessId: business.id } }), 0);
      throw rollback;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
  } catch (error) { if (error !== rollback) throw error; }
  console.log("salla-cart-lifecycle-audit: PASS (tenant isolation, consent, duplicates, recovery, ordering, store namespace; no messages sent)");
}
main().finally(() => db.$disconnect()).catch(error => { console.error(error); process.exitCode = 1; });
