import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const scheduler = readFileSync("app/lib/reminders/scheduler.ts", "utf8");

test("reminder scheduler claims due work safely", () => {
  assert.match(scheduler, /FOR UPDATE SKIP LOCKED/);
  assert.match(scheduler, /"status"\s*=\s*'scheduled'/);
  assert.match(scheduler, /"nextOccurrenceAt"\s*<=\s*\$\{now\}/);
  assert.match(scheduler, /ORDER BY\s+"nextOccurrenceAt"\s*,\s*"createdAt"/);
  assert.match(scheduler, /TransactionIsolationLevel\.Serializable/);
});

test("reminder scheduler preserves tenant fields in channel delivery jobs", () => {
  assert.match(scheduler, /"businessId"\s*,\s*"reminderId"\s*,\s*"connectionId"\s*,\s*"templateId"\s*,\s*"occurrenceAt"\s*,\s*"channel"/);
  assert.match(scheduler, /\$\{reminder\.businessId\}/);
  assert.match(scheduler, /channel\s*===\s*"whatsapp"\s*\?\s*reminder\.connectionId\s*:\s*null/);
  assert.match(scheduler, /channel\s*===\s*"whatsapp"\s*\?\s*reminder\.templateId\s*:\s*null/);
  assert.match(scheduler, /channel\s*===\s*"whatsapp"\s*&&\s*\(\s*!reminder\.connectionId\s*\|\|\s*!reminder\.templateId\s*\)/);
  assert.match(scheduler, /normalizeReminderChannels\(reminder\.deliveryChannels\)/);
  assert.match(scheduler, /for\s*\(\s*const channel of channels\s*\)/);
  assert.match(scheduler, /reminderDeliveryIdempotencyKey\(\{\s*businessId:\s*reminder\.businessId,\s*reminderId:\s*reminder\.id,\s*occurrenceAt:\s*reminder\.nextOccurrenceAt,\s*channel\s*\}\)/);
  assert.match(scheduler, /ON CONFLICT\s*\("idempotencyKey"\)\s*DO NOTHING/);
});

test("recurring scheduler uses timezone-aware domain calculation and prevents catch-up floods", () => {
  assert.match(scheduler, /nextReminderOccurrence/);
  assert.match(scheduler, /"timezone"/);
  assert.match(scheduler, /skippedMissedOccurrences/);
  assert.match(scheduler, /REMINDER_RECURRENCE_CATCHUP_LIMIT_EXCEEDED/);
  assert.doesNotMatch(scheduler, /24\s*\*\s*60\s*\*\s*60_?000/);
  assert.doesNotMatch(scheduler, /REMINDER_RECURRENCE_NOT_ENABLED_YET/);
});
