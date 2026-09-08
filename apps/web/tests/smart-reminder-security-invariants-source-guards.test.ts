import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const actionsFile=new URL("../app/actions/smart-reminders.ts",import.meta.url);
const operationsFile=new URL("../app/lib/reminders/operations.ts",import.meta.url);

test("smart reminder writes derive the tenant from authenticated active business context",async()=>{
  const s=await readFile(actionsFile,"utf8");
  assert.ok(s.includes("getCurrentUserForWrites()"));
  assert.ok(s.includes("getActiveBusinessForUser(user.id)"));
  assert.ok(s.includes("businessId:business.id"));
  for(const operation of ["updateSmartReminderContent","updateReminderExecutionContext","updateReminderWorkProgress","rescheduleSmartReminder","pauseSmartReminder","resumeSmartReminder","cancelSmartReminder","completeSmartReminder"]){
    assert.ok(s.includes(`${operation}({businessId:context.businessId`),operation);
  }
});

test("WhatsApp reminder creation requires explicit consent and a business-owned recipient",async()=>{
  const actions=await readFile(actionsFile,"utf8");
  const operations=await readFile(operationsFile,"utf8");
  assert.ok(actions.includes('wantsWhatsApp && !recipientConsentAccepted'));
  assert.ok(operations.includes('REMINDER_RECIPIENT_CONSENT_REQUIRED'));
  assert.ok(operations.includes('REMINDER_RECIPIENT_NOT_BUSINESS_OWNED'));
  assert.ok(operations.includes('input.requestedPhone'));
  assert.ok(operations.includes('uniqueAllowed.includes(requested)'));
});

test("reminder lifecycle locks and mutations remain tenant scoped and serialized",async()=>{
  const s=await readFile(operationsFile,"utf8");
  assert.ok(s.includes('WHERE "id" = ${reminderId} AND "businessId" = ${businessId}'));
  assert.ok(s.includes('WHERE "reminderId" = ${reminderId} AND "businessId" = ${businessId}'));
  assert.ok(s.includes('WHERE "id"=${input.reminderId} AND "businessId"=${input.businessId}'));
  assert.match(s,/Prisma\.TransactionIsolationLevel\.Serializable/g);
  assert.ok(s.includes('action: "reminder.create"'));
  assert.ok(s.includes('action: "reminder.cancel"'));
  assert.ok(s.includes('action: "reminder.complete"'));
});

test("a reminder linked from Business Memory cannot cross tenant boundaries",async()=>{
  const s=await readFile(operationsFile,"utf8");
  assert.ok(s.includes('WHERE "id"=${input.businessNoteId} AND "businessId"=${input.businessId}'));
  assert.ok(s.includes('REMINDER_NOTE_INVALID'));
});
