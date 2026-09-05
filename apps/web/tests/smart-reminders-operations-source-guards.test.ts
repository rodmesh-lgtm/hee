import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const operations = readFileSync("app/lib/reminders/operations.ts", "utf8");
const audit = readFileSync("app/lib/whatsapp/audit.ts", "utf8");

test("reminder creation revalidates tenant connection and approved Meta template", () => {
  assert.match(operations, /businessId: input\.businessId/);
  assert.match(operations, /provider: "meta"/);
  assert.match(operations, /status: "approved"/);
  assert.match(operations, /connection: \{ businessId: input\.businessId, provider: "meta", status: "connected" \}/);
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
  assert.match(operations, /WHERE "id" = \$\{input\.reminderId\} AND "businessId" = \$\{input\.businessId\}/);
  assert.match(operations, /WHERE "reminderId" = \$\{input\.reminderId\} AND "businessId" = \$\{input\.businessId\}/);
});

test("reminder audit metadata inherits WhatsApp secret and message redaction", () => {
  assert.match(operations, /writeWhatsAppAuditLog/);
  assert.match(audit, /token\|secret\|credential\|authorization\|code\|state\|message\|body\|phone/i);
  assert.doesNotMatch(operations, /metadata: \{[^}]*body/);
  assert.doesNotMatch(operations, /metadata: \{[^}]*recipientPhone/);
});

test("recurrence is schema-ready but not silently enabled before timezone-safe scheduling exists", () => {
  assert.match(operations, /REMINDER_RECURRENCE_NOT_ENABLED_YET/);
});
