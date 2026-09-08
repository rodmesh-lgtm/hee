import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const operations = readFileSync("app/lib/reminders/operations.ts", "utf8");
const audit = readFileSync("app/lib/whatsapp/audit.ts", "utf8");

test("reminder creation revalidates tenant connection and approved Meta template", () => {
  assert.match(operations, /businessId:\s*input\.businessId/);
  assert.match(operations, /provider:\s*"meta"/);
  assert.match(operations, /status:\s*"approved"/);
  assert.match(operations, /connection:\s*\{\s*businessId:\s*input\.businessId,\s*provider:\s*"meta",\s*status:\s*"connected"\s*\}/);
  assert.match(operations, /reminderTemplateSupportsBodyParameter/);
});

test("self reminders cannot be used as arbitrary outbound messaging", () => {
  assert.match(operations, /resolveSelfReminderRecipient/);
  assert.match(operations, /business\.whatsapp/);
  assert.match(operations, /business\.phone/);
  assert.match(operations, /REMINDER_RECIPIENT_NOT_BUSINESS_OWNED/);
  assert.doesNotMatch(operations, /WhatsAppContact.*findMany/);
});

test("reminder mutations always scope by reminder id and business id", () => {
  assert.match(operations, /lockReminder\(tx,\s*input\.businessId,\s*input\.reminderId\)/);
  assert.match(operations, /WHERE\s+"id"\s*=\s*\$\{input\.reminderId\}\s+AND\s+"businessId"\s*=\s*\$\{input\.businessId\}/);
  assert.match(operations, /WHERE\s+"businessId"\s*=\s*\$\{businessId\}\s+AND\s+"reminderId"\s*=\s*\$\{reminderId\}/);
  assert.match(operations, /WHERE\s+"reminderId"\s*=\s*\$\{reminderId\}\s+AND\s+"businessId"\s*=\s*\$\{businessId\}/);
});

test("reminder audit metadata inherits WhatsApp secret and message redaction", () => {
  assert.match(operations, /writeWhatsAppAuditLog/);
  assert.match(audit, /token\|secret\|credential\|authorization\|code\|state\|message\|body\|phone/i);
  assert.doesNotMatch(operations, /metadata:\s*\{[^}]*body/);
  assert.doesNotMatch(operations, /metadata:\s*\{[^}]*recipientPhone/);
});

test("supported recurrence is normalized at creation and persisted explicitly", () => {
  assert.match(operations, /normalizeReminderRecurrence/);
  assert.match(operations, /input\.recurrenceType\s*\?\?\s*"once"/);
  assert.match(operations, /\$\{recurrenceType\}/);
  assert.doesNotMatch(operations, /REMINDER_RECURRENCE_NOT_ENABLED_YET/);
});
