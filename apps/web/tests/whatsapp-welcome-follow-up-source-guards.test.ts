import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const importer = readFileSync("app/lib/whatsapp/contact-import-processor.ts", "utf8");
const producer = readFileSync("app/lib/whatsapp/automation-event-producer.ts", "utf8");
const transactions = readFileSync("app/actions/transactions.ts", "utf8");
const delivery = readFileSync("app/lib/whatsapp/automation-delivery-worker.ts", "utf8");
const page = readFileSync("app/dashboard/whatsapp/automations/page.tsx", "utf8");

test("welcome events require a newly persisted explicit import consent", () => {
  assert.match(importer, /consentConfirmed && batch\.contactImport\.consentEvidence/);
  assert.match(importer, /whatsAppConsent\.findMany/);
  assert.match(importer, /newConsentRows = rows\.filter/);
  assert.match(importer, /if \(consented\.count > 0\)/);
  assert.match(importer, /emitWhatsAppWelcomeEventsForConsentImport/);
  assert.match(producer, /source: "ir\.contacts\.consent-import"/);
  assert.match(producer, /subjectType: "contact\.consent_granted"/);
  assert.match(producer, /contactId: contact\.id/);
  assert.match(producer, /ingestWhatsAppAutomationEvents/);
  assert.match(producer, /events: input\.contacts\.map/);
  assert.doesNotMatch(producer, /whatsAppConsent\.(create|upsert|update)/);
});

test("follow-up events commit with the terminal tenant-owned transition", () => {
  assert.match(transactions, /nextStatus === "completed"/g);
  assert.match(transactions, /source: "ir\.order\.follow-up"/);
  assert.match(transactions, /subjectType: "order\.completed"/);
  assert.match(transactions, /source: "ir\.booking\.follow-up"/);
  assert.match(transactions, /subjectType: "booking\.completed"/);
  assert.match(transactions, /TransactionIsolationLevel\.Serializable/g);
});

test("delivery rechecks the same-tenant subject before calling Meta", () => {
  const guardAt = delivery.indexOf('triggerType === "follow_up"');
  const metaAt = delivery.indexOf("metaWhatsAppGraphUrl", guardAt);
  assert.ok(guardAt >= 0 && metaAt > guardAt);
  assert.match(delivery, /businessId: job\.businessId, status: "completed"/g);
  assert.match(delivery, /FOLLOW_UP_SUBJECT_NOT_COMPLETED/);
  assert.match(delivery, /releaseAs\(database, job, "cancelled"/);
});

test("automation UI states the exact live event sources and consent boundary", () => {
  assert.match(page, /الترحيب يعمل عند تسجيل موافقة صريحة جديدة/);
  assert.match(page, /المتابعة تعمل بعد اكتمال طلب أو حجز/);
  assert.match(page, /وجود Customer أو Order أو Booking لا يُعد موافقة تسويقية/);
});
