import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const notesPath=new URL("../app/actions/business-notes.ts",import.meta.url);
const remindersPath=new URL("../app/actions/smart-reminders.ts",import.meta.url);
const marketingPath=new URL("../app/actions/whatsapp-marketing.ts",import.meta.url);
const canaryPath=new URL("../app/lib/whatsapp/campaign-canary-domain.ts",import.meta.url);

test("business memory writes remain scoped to the active business and linked reminders block hard delete",async()=>{
  const s=await readFile(notesPath,"utf8");
  assert.match(s,/getActiveBusinessForUser\(user\.id\)/);
  assert.match(s,/WHERE "id"=\$\{noteId\} AND "businessId"=\$\{businessId\}/);
  assert.match(s,/FROM "SmartReminder" WHERE "businessId"=\$\{businessId\} AND "businessNoteId"=\$\{noteId\}/);
  assert.match(s,/Prisma\.TransactionIsolationLevel\.Serializable/);
});

test("smart reminder mutations keep tenant context, consent gating and tenant-scoped snooze lookup",async()=>{
  const s=await readFile(remindersPath,"utf8");
  assert.match(s,/getActiveBusinessForUser\(user\.id\)/);
  assert.match(s,/wantsWhatsApp && !recipientConsentAccepted/);
  assert.match(s,/businessId:context\.businessId/);
  assert.match(s,/WHERE "id"=\$\{reminderId\} AND "businessId"=\$\{context\.businessId\}/);
});

test("WhatsApp campaign writes preserve RBAC, entitlement, tenant-bound Meta resources and consent",async()=>{
  const s=await readFile(marketingPath,"utf8");
  assert.match(s,/getWhatsAppWriteContext\("campaign\.manage"\)/);
  assert.match(s,/hasActiveWhatsAppMarketingEntitlement\(\{ businessId: context\.businessId \}\)/);
  assert.match(s,/businessId: context\.businessId, connectionId, provider: "meta", status: "approved"/);
  assert.match(s,/businessId: context\.businessId, provider: "meta", status: "connected", disabledAt: null/);
  assert.match(s,/revokedAt: null, consentedAt: \{ lte: now \}/);
});

test("first real WhatsApp campaign remains protected by the five-recipient canary",async()=>{
  const s=await readFile(canaryPath,"utf8");
  assert.match(s,/WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT = 5/);
  assert.match(s,/remainingSlots = Math\.max\(0, WHATSAPP_FIRST_CAMPAIGN_CANARY_LIMIT - priorAttemptCount\)/);
  assert.match(s,/state: "awaiting_delivery", queueLimit: 0/);
});
