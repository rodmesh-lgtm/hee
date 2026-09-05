import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = readFileSync(join(root, "prisma/migrations/20260905133000_add_smart_reminders_foundation/migration.sql"), "utf8");

test("smart reminders are tenant scoped at the database boundary", () => {
  assert.match(migration, /CREATE TABLE "SmartReminder"/);
  assert.match(migration, /CREATE TABLE "SmartReminderDelivery"/);
  assert.match(migration, /"businessId" TEXT NOT NULL/);
  assert.match(migration, /SmartReminder_connection_tenant_fkey/);
  assert.match(migration, /FOREIGN KEY \("connectionId", "businessId"\) REFERENCES "WhatsAppConnection"\("id", "businessId"\)/);
  assert.match(migration, /SmartReminder_template_tenant_connection_fkey/);
  assert.match(migration, /FOREIGN KEY \("templateId", "businessId", "connectionId"\) REFERENCES "WhatsAppTemplate"\("id", "businessId", "connectionId"\)/);
  assert.match(migration, /SmartReminderDelivery_reminder_tenant_connection_fkey/);
});

test("smart reminder delivery is idempotent and lease-ready", () => {
  assert.match(migration, /SmartReminderDelivery_idempotency_unique/);
  assert.match(migration, /SmartReminderDelivery_occurrence_unique/);
  assert.match(migration, /"leaseOwner" TEXT/);
  assert.match(migration, /"leaseExpiresAt" TIMESTAMP\(3\)/);
  assert.match(migration, /SmartReminderDelivery_ready_idx/);
  assert.match(migration, /SmartReminderDelivery_lease_idx/);
});

test("smart reminder storage validates recipient, status and recurrence", () => {
  assert.match(migration, /SmartReminder_recipient_check/);
  assert.match(migration, /SmartReminder_recurrence_check/);
  assert.match(migration, /SmartReminder_status_check/);
  assert.match(migration, /SmartReminderDelivery_status_check/);
});
