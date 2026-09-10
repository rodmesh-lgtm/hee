import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const route = readFileSync(resolve(process.cwd(), "app/api/cron/smart-reminders/route.ts"), "utf8");

test("smart reminder cron retries only recognized transient database failures", () => {
  assert.match(route, /TRANSIENT_DATABASE_ERROR_PATTERNS/);
  assert.match(route, /connection terminated/);
  assert.match(route, /connection timeout/);
  assert.match(route, /econnreset/);
  assert.match(route, /if \(!isTransientDatabaseError\(error\) \|\| attempt >= delays\.length\) throw error/);
  assert.match(route, /const delays = \[250, 750\]/);
});

test("smart reminder cron protects schema readiness, scheduling and delivery with bounded retries", () => {
  assert.match(route, /withTransientDatabaseRetry\("schema-readiness", \(\) => isSmartRemindersSchemaReady\(\)\)/);
  assert.match(route, /withTransientDatabaseRetry\("scheduler", \(\) => runSmartReminderScheduler\(\{ limit: 250 \}\)\)/);
  assert.match(route, /withTransientDatabaseRetry\("delivery-worker", \(\) => runSmartReminderDeliveryWorker\(\{ limit: 250 \}\)\)/);
  assert.match(route, /idempotent and use row locks\/leases/);
});

test("smart reminder cron still fails closed for unauthorized and non-transient failures", () => {
  assert.match(route, /error: "UNAUTHORIZED".*status: 401/s);
  assert.match(route, /error: "SMART_REMINDER_SCHEMA_NOT_READY".*status: 503/s);
  assert.match(route, /error: "SMART_REMINDER_CRON_FAILED".*status: 500/s);
});
