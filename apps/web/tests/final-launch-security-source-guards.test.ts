import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source=(path:string)=>new URL(path,import.meta.url);
const normalize=(value:string)=>value.replace(/\s+/g," ");

const notes=source("../app/actions/business-notes.ts");
const reminders=source("../app/actions/smart-reminders.ts");
const notePage=source("../app/dashboard/notes/page.tsx");
const campaignLaunch=source("../app/actions/whatsapp-campaign-launch.ts");
const deliveryQueue=source("../app/lib/whatsapp/delivery-queue.ts");
const canary=source("../app/lib/whatsapp/campaign-canary-domain.ts");
const identity=source("../app/actions/digital-identity.ts");
const presence=source("../app/actions/digital-presence.ts");
const checkout=source("../app/dashboard/billing/checkout/page.tsx");
const receipt=source("../app/dashboard/billing/receipt/[billingId]/page.tsx");
const billingLedger=source("../app/lib/billing-ledger.ts");
const billingActions=source("../app/actions/billing.ts");

test("business memory mutations and reminder provenance remain tenant scoped",async()=>{
  const s=normalize(await readFile(notes,"utf8"));
  assert.match(s,/WHERE "id"=\$\{noteId\} AND "businessId"=\$\{businessId\}/);
  assert.match(s,/FROM "SmartReminder" WHERE "businessId"=\$\{businessId\} AND "businessNoteId"=\$\{noteId\}/);
  assert.match(s,/DELETE FROM "BusinessNote" WHERE "id"=\$\{noteId\} AND "businessId"=\$\{businessId\}/);
  assert.match(s,/isolationLevel:Prisma\.TransactionIsolationLevel\.Serializable/);
});

test("smart reminder actions always carry active business context and explicit WhatsApp consent",async()=>{
  const s=normalize(await readFile(reminders,"utf8"));
  assert.match(s,/return\{userId:user\.id,businessId:business\.id\}/);
  assert.match(s,/businessId:context\.businessId,actorUserId:context\.userId,reminderId/);
  assert.match(s,/WHERE "id"=\$\{reminderId\} AND "businessId"=\$\{context\.businessId\}/);
  assert.match(s,/wantsWhatsApp && !recipientConsentAccepted/);
  assert.match(s,/recipientConsentAccepted,deliveryChannels,whatsappSenderMode: "platform"/);
});

test("business memory AI organizer readiness is explicit rather than default-on",async()=>{
  const s=normalize(await readFile(notePage,"utf8"));
  assert.match(s,/import \{ businessMemoryAiReady \}/);
  assert.match(s,/const memoryAiAvailable=businessMemoryAiReady\(\)/);
  assert.match(s,/memoryAiAvailable=\{memoryAiAvailable\}/);
  assert.match(s,/FROM "BusinessNote" n WHERE n\."businessId"=\$\{business\.id\}/);
});

test("WhatsApp campaign launch preserves RBAC entitlement and same-tenant queueing",async()=>{
  const launch=normalize(await readFile(campaignLaunch,"utf8"));
  const queue=normalize(await readFile(deliveryQueue,"utf8"));
  assert.match(launch,/getWhatsAppWriteContext\("campaign\.manage"\)/);
  assert.match(launch,/hasActiveWhatsAppMarketingEntitlement\(\{ businessId: context\.businessId \}\)/);
  assert.match(launch,/enqueueWhatsAppCampaign\(\{ businessId: context\.businessId, campaignId \}\)/);
  assert.match(queue,/WHERE "id" = \$\{input\.campaignId\} AND "businessId" = \$\{input\.businessId\}/);
  assert.match(queue,/businessId: input\.businessId, connectionId: campaign\.connectionId/);
  assert.match(queue,/businessId: input\.businessId, campaignId: campaign\.id/);
  assert.match(queue,/optedOutAt: null/);
  assert.match(queue,/revokedAt: null, consentedAt: \{ lte: now \}/);
  assert.match(queue,/provider: "meta", status: "approved"/);
});

test("first real WhatsApp campaign canary remains capped at five until verified delivery",async()=>{
  const s=normalize(await readFile(canary,"utf8"));
  assert.match(s,/WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT = 5/);
  assert.match(s,/if \(input\.hasVerifiedDelivery\) return \{ state: "verified", queueLimit: null \}/);
  assert.match(s,/WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT - priorAttemptCount/);
  assert.match(s,/state: "awaiting_delivery", queueLimit: 0/);
});

test("digital identity writes prove active owner and business before mutation",async()=>{
  const profile=normalize(await readFile(identity,"utf8"));
  const digitalPresence=normalize(await readFile(presence,"utf8"));
  for(const s of [profile,digitalPresence]){
    assert.match(s,/getCurrentUserForWrites\(\)/);
    assert.match(s,/getActiveBusinessForUser\(user\.id\)/);
    assert.match(s,/where: \{ id: business\.id, ownerId: user\.id, deletedAt: null \}/);
    assert.match(s,/updateMany\(\{ where: \{ id: business\.id, ownerId: user\.id, deletedAt: null \}/);
  }
  assert.match(profile,/company-profile:\$\{business\.id\}/);
  assert.match(profile,/uploaded\.mimeType !== "application\/pdf"/);
  assert.match(digitalPresence,/consumePublicWriteLimit\(\{ scope: "digital-presence", businessId: business\.id, identity: user\.id/);
});

test("billing checkout and receipts are owner and active-business scoped while paid checkout remains gated",async()=>{
  const checkoutSource=normalize(await readFile(checkout,"utf8"));
  const receiptSource=normalize(await readFile(receipt,"utf8"));
  const ledger=normalize(await readFile(billingLedger,"utf8"));
  const actions=normalize(await readFile(billingActions,"utf8"));
  for(const s of [checkoutSource,receiptSource]){
    assert.match(s,/getActiveBusinessForUser\(user\.id\)/);
    assert.match(s,/getOwnedBillingPayment\(user\.id, billingId\)/);
    assert.match(s,/payment\.businessId !== business\.id|billing\.businessId !== business\.id/);
  }
  assert.match(checkoutSource,/id: billing\.businessId, ownerId: user\.id, deletedAt: null/);
  assert.match(ledger,/WHERE bp\."id"=\$\{billingId\} AND b\."ownerId"=\$\{userId\}/);
  assert.match(actions,/paidCheckoutEntryAllowed\(user\.email\)/);
  assert.match(actions,/paidBillingTaxReady\(\)/);
  assert.match(actions,/moyasarConfigured\(\)/);
  assert.match(actions,/createBillingIntent\(user\.id, business\.id, plan\)/);
});
