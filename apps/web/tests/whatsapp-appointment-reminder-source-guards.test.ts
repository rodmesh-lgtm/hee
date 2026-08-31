import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { appointmentAtRiyadh } from "../app/lib/whatsapp/automation-domain";

const transactions = readFileSync("app/actions/transactions.ts", "utf8");
const producer = readFileSync("app/lib/whatsapp/automation-event-producer.ts", "utf8");
const processor = readFileSync("app/lib/whatsapp/automation-processor.ts", "utf8");
const delivery = readFileSync("app/lib/whatsapp/automation-delivery-worker.ts", "utf8");
const page = readFileSync("app/dashboard/whatsapp/automations/page.tsx", "utf8");

test("Riyadh appointment timestamps are exact and malformed dates fail closed", () => {
  assert.equal(appointmentAtRiyadh("2026-08-29", "14:30")?.toISOString(), "2026-08-29T11:30:00.000Z");
  assert.equal(appointmentAtRiyadh("2026-02-31", "14:30"), null);
  assert.equal(appointmentAtRiyadh("2026-08-29", "25:00"), null);
});

test("booking confirmation and reminder scheduling share one tenant transaction", () => {
  assert.match(transactions, /FROM "Booking" WHERE "id" = \$\{id\} AND "businessId" = \$\{business\.id\} FOR UPDATE/);
  assert.match(transactions, /TransactionIsolationLevel\.Serializable/g);
  assert.match(transactions, /updated\.count !== 1/);
  assert.match(transactions, /nextStatus === "confirmed"/);
  assert.match(transactions, /scheduleWhatsAppAppointmentReminders/);
  assert.match(transactions, /cancelWhatsAppAppointmentReminders/);
});

test("reminders are future durable events scoped to automation, contact and tenant", () => {
  assert.match(producer, /status: "active", triggerType: "appointment_reminder"/);
  assert.match(producer, /businessId: input\.businessId, phoneE164/);
  assert.match(producer, /processAt <= now/);
  assert.match(producer, /automationId: automation\.id/);
  assert.match(producer, /source: "ir\.booking\.reminder"/);
  assert.match(producer, /processAt,/);
  assert.match(processor, /nextAttemptAt: processAt/);
  assert.doesNotMatch(producer, /whatsApp(Contact|Consent)\.(create|upsert|update)/);
});

test("closing a booking cancels unsent reminders and delivery rechecks status", () => {
  assert.match(producer, /status: \{ in: \["pending", "retry_scheduled"\] \}/);
  assert.match(producer, /status: \{ in: \["queued", "retry_scheduled"\] \}/);
  assert.match(producer, /BOOKING_NO_LONGER_CONFIRMED/g);
  assert.match(delivery, /triggerType === "appointment_reminder"/);
  assert.match(delivery, /businessId: job\.businessId, status: "confirmed"/);
  assert.match(delivery, /releaseAs\(database, job, "cancelled", now, "BOOKING_NO_LONGER_CONFIRMED"\)/);
});

test("automation UI exposes lead time without implying stale reminder replay", () => {
  assert.match(page, /WHATSAPP_APPOINTMENT_LEAD_MINUTES/);
  assert.match(page, /name="reminderLeadMinutes"/);
  assert.match(page, /للأحداث الجديدة فقط/);
  assert.match(page, /رسائل بانتظار موعدها/);
  assert.match(page, /nextAttemptAt/);
});
