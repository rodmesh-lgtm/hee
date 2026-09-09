import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const canaryFile=new URL("../app/lib/whatsapp/campaign-canary-domain.ts",import.meta.url);
const queueFile=new URL("../app/lib/whatsapp/delivery-queue.ts",import.meta.url);
const launchFile=new URL("../app/actions/whatsapp-campaign-launch.ts",import.meta.url);

test("first real WhatsApp campaign remains capped at five recipients until verified delivery",async()=>{
  const s=await readFile(canaryFile,"utf8");
  assert.match(s,/WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT\s*=\s*5/);
  assert.match(s,/remainingSlots\s*=\s*Math\.max\(0,\s*WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT\s*-\s*priorAttemptCount\)/);
  assert.match(s,/awaiting_delivery/);
});

test("campaign launch requires RBAC entitlement readiness and audit logging",async()=>{
  const s=await readFile(launchFile,"utf8");
  assert.ok(s.includes('getWhatsAppWriteContext("campaign.manage")'));
  assert.ok(s.includes("hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })"));
  assert.ok(s.includes("getWhatsAppCampaignLaunchReadiness()"));
  assert.ok(s.includes('action: "campaign.launch.blocked"'));
  assert.ok(s.includes('action: "campaign.launch.queue"'));
  assert.ok(s.includes("enqueueWhatsAppCampaign({ businessId: context.businessId, campaignId })"));
});

test("delivery queue keeps provider template recipient consent and campaign writes tenant scoped",async()=>{
  const s=await readFile(queueFile,"utf8");
  assert.ok(s.includes('WHERE "id" = ${input.campaignId} AND "businessId" = ${input.businessId}'));
  assert.ok(s.includes('provider: "meta"'));
  assert.ok(s.includes('status: "approved"'));
  assert.ok(s.includes("optedOutAt: null"));
  assert.ok(s.includes("revokedAt: null"));
  assert.ok(s.includes("consentedAt: { lte: now }"));
  assert.ok(s.includes("where: { id: campaign.id, businessId: input.businessId }"));
  assert.ok(s.includes("isolationLevel: Prisma.TransactionIsolationLevel.Serializable"));
});
