import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const scheduler = readFileSync("app/lib/reminders/scheduler.ts", "utf8");

test("reminder scheduler claims due work safely", () => {
  assert.match(scheduler, /FOR UPDATE SKIP LOCKED/);
  assert.match(scheduler, /"status" = 'scheduled'/);
  assert.match(scheduler, /"nextOccurrenceAt" <= \$\{now\}/);
  assert.match(scheduler, /ORDER BY "nextOccurrenceAt", "createdAt"/);
});

test("reminder scheduler preserves tenant fields in delivery job", () => {
  assert.match(scheduler, /"businessId", "reminderId", "connectionId", "templateId"/);
  assert.match(scheduler, /\$\{reminder\.businessId\}/);
  assert.match(scheduler, /\$\{reminder\.connectionId\}/);
  assert.match(scheduler, /\$\{reminder\.templateId\}/);
  assert.match(scheduler, /reminderDeliveryIdempotencyKey/);
  assert.match(scheduler, /ON CONFLICT \("idempotencyKey"\) DO NOTHING/);
});

test("scheduler does not pretend recurring delivery is ready", () => {
  assert.match(scheduler, /REMINDER_RECURRENCE_NOT_ENABLED_YET/);
});
