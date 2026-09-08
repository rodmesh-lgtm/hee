import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const readiness = readFileSync(join(root, "app/lib/reminders/schema-readiness.ts"), "utf8");
const customerPage = readFileSync(join(root, "app/dashboard/reminders/page.tsx"), "utf8");
const adminPage = readFileSync(join(root, "app/admin/whatsapp/reminders/page.tsx"), "utf8");
const actions = readFileSync(join(root, "app/actions/smart-reminders.ts"), "utf8");
const vercelRunner = readFileSync(join(root, "app/lib/whatsapp/vercel-operations-runner.ts"), "utf8");

test("reminder schema readiness probes all multi-channel boundaries without throwing", () => {
  assert.match(readiness, /to_regclass\('public\."SmartReminder"'\)/);
  assert.match(readiness, /to_regclass\('public\."SmartReminderDelivery"'\)/);
  assert.match(readiness, /column_name='deliveryChannels'/);
  assert.match(readiness, /column_name='channel'/);
  assert.match(readiness, /to_regclass\('public\."SmartReminderNotification"'\)/);
});

test("customer and admin reminder pages fail closed before querying missing tables", () => {
  assert.match(customerPage, /isSmartRemindersSchemaReady/);
  assert.match(customerPage, /data-reminder-schema="pending"/);
  assert.match(adminPage, /isSmartRemindersSchemaReady/);
  assert.match(adminPage, /data-admin-reminder-schema="pending"/);
});

test("reminder writes and Vercel operations do not touch absent reminder tables", () => {
  assert.match(actions, /if\s*\(\s*!await\s+isSmartRemindersSchemaReady\(\)\s*\)\s*redirect\("\/dashboard\/reminders\?schema=pending"\)/);
  assert.match(vercelRunner, /async function runReminderSchedules[\s\S]*?if\s*\(\s*!await\s+isSmartRemindersSchemaReady\(\)\s*\)\s*return;/);
  assert.match(vercelRunner, /async function runReminderDeliveries[\s\S]*?if\s*\(\s*!await\s+isSmartRemindersSchemaReady\(\)\s*\)\s*return;/);
});
