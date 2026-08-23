import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manage = readFileSync(new URL("../app/dashboard/billing/manage/page.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../app/actions/billing.ts", import.meta.url), "utf8");

test("customer can stop future renewal while subscription is past due", () => {
  assert.match(manage, /renewalCancellationAvailable/);
  assert.match(manage, /\["active", "past_due"\]\.includes\(subscription\.status\)/);
  assert.match(manage, /subscription\?\.status === "past_due"/);
  assert.match(manage, /يمكنك إيقاف أي محاولات تجديد مستقبلية حتى أثناء تعثر الدفع/);
});

test("cancellation action handles both active and past-due subscriptions and revokes future payment use", () => {
  assert.match(actions, /status: \{ in: \["active", "past_due"\] \}, autoRenew: true/);
  assert.match(actions, /data: \{ autoRenew: false \}/);
  assert.match(actions, /data: \{ status: "revoked" \}/);
  assert.match(actions, /status: \{ in: \["created", "failed"\] \}/);
  assert.match(actions, /data: \{ status: "canceled", nextRetryAt: null \}/);
});
