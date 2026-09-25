import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mapSallaOrderWebhook } from "../app/lib/commerce/salla-domain";
import { automationMatchesEvent, buildAutomationTriggerConfig } from "../app/lib/whatsapp/automation-domain";
import { SALLA_ORDER_SCENARIOS, SALLA_ORDER_DELAY_MINUTES, readSallaOrderStatusConfig, sallaOrderScenarioStatus, sallaStatusEventMatches } from "../app/lib/whatsapp/salla-order-journey-domain";

test("each order scenario matches only its own event at every supported delay", () => {
  for (const { status } of SALLA_ORDER_SCENARIOS) for (const delay of SALLA_ORDER_DELAY_MINUTES) {
    const config = buildAutomationTriggerConfig("salla_order_status", status, undefined, undefined, undefined, undefined, delay);
    assert.deepEqual(readSallaOrderStatusConfig(config), { version: 1, orderStatus: status, delayMinutes: delay });
    for (const other of SALLA_ORDER_SCENARIOS) {
      assert.equal(automationMatchesEvent({ triggerType: "salla_order_status", triggerConfig: config, subjectType: `salla.order.status.${other.status}` }), status === other.status);
    }
  }
});

test("invalid status, delay or injected config cannot create an order scenario", () => {
  for (const value of [null, [], {}, { version: 2, orderStatus: "shipped", delayMinutes: 0 },
    { version: 1, orderStatus: "custom_status", delayMinutes: 0 },
    { version: 1, orderStatus: "shipped", delayMinutes: "0" },
    { version: 1, orderStatus: "shipped", delayMinutes: -1 },
    { version: 1, orderStatus: "shipped", delayMinutes: 1.5 },
    { version: 1, orderStatus: "shipped", delayMinutes: 10080 },
    { version: 1, orderStatus: "shipped", delayMinutes: 0, businessId: "another-tenant" }]) {
    assert.throws(() => readSallaOrderStatusConfig(value), /SALLA_ORDER_SCENARIO_INVALID/);
  }
});

test("delivery recheck recognizes provider aliases and suppresses stale or unknown states", () => {
  assert.equal(sallaOrderScenarioStatus("awaiting_payment"), "pending_payment");
  assert.equal(sallaOrderScenarioStatus("payment_pending"), "pending_payment");
  assert.equal(sallaStatusEventMatches("salla.order.status.in_progress", "processing"), true);
  assert.equal(sallaStatusEventMatches("salla.order.status.cancelled", "canceled"), true);
  assert.equal(sallaStatusEventMatches("salla.order.status.pending_payment", "completed"), false);
  assert.equal(sallaStatusEventMatches("salla.order.status.shipped", "delivered"), false);
  assert.equal(sallaStatusEventMatches("salla.order.status.custom", "custom"), false);
  assert.equal(sallaStatusEventMatches("salla.order.status.shipped", null), false);
});

test("official nested status webhook uses order ID rather than status history ID", () => {
  const mapped = mapSallaOrderWebhook({ event: "order.status.updated", merchant: 10,
    created_at: "2026-09-25T12:00:01Z", data: { id: 999, status: "تم التنفيذ",
      created_at: { date: "2026-09-25 15:00:00.000000", timezone: "Asia/Riyadh" },
      order: { id: 123, status: { slug: "completed" }, payment_method: "cod", is_pending_payment: false,
        customer: { mobile: 501234567, mobile_code: "+966" } } } });
  assert.equal(mapped.kind, "order");
  if (mapped.kind !== "order") return;
  assert.equal(mapped.order.externalOrderId, "123");
  assert.equal(mapped.order.orderStatus, "completed");
  assert.equal(mapped.order.phoneE164, "+966501234567");
  assert.equal(mapped.order.providerUpdatedAt?.toISOString(), "2026-09-25T12:00:00.000Z");
  assert.equal(mapped.order.eligible, false, "COD completion does not prove payment");
});

test("refund events revoke eligibility and override the previous shipped status", () => {
  const mapped = mapSallaOrderWebhook({ event: "order.refunded", data: { id: 123, payment_status: "paid", status: { slug: "shipped" }, customer: { mobile: "966501234567" } } });
  assert.equal(mapped.kind, "order");
  if (mapped.kind !== "order") return;
  assert.equal(mapped.order.orderStatus, "refunded");
  assert.equal(mapped.order.eligible, false);
  assert.equal(mapped.order.phoneE164, "+966501234567");
});

test("unknown date zones fall back to the dated webhook envelope", () => {
  const mapped = mapSallaOrderWebhook({ event: "order.updated", created_at: "2026-09-25T12:00:00Z",
    data: { id: 123, updated_at: { date: "2026-09-25 15:00:00", timezone: "Unknown/Zone" }, customer: { mobile: "501234567", mobile_code: "+971" } } });
  assert.equal(mapped.kind, "order");
  if (mapped.kind !== "order") return;
  assert.equal(mapped.order.providerUpdatedAt?.toISOString(), "2026-09-25T12:00:00.000Z");
  assert.equal(mapped.order.phoneE164, "+971501234567");
});

test("live ingress keeps consent, single route ownership and order-wide idempotency", () => {
  const source = readFileSync(new URL("../app/lib/commerce/salla-order-journeys.ts", import.meta.url), "utf8");
  assert.match(source, /revokedAt: null, consentedAt: \{ lte: input\.receivedAt \}/);
  assert.match(source, /if \(contact\.optedOutAt\) return/);
  assert.match(source, /status === sallaOrderScenarioStatus\(input\.previousStatus\)/);
  assert.match(source, /whatsAppAutomation\.findFirst/);
  assert.match(source, /activatedAt: \{ lte: input\.receivedAt \}/);
  assert.match(source, /path: \["orderStatus"\], equals: status/);
  assert.match(source, /externalEventId: `\$\{input\.eligibilityId\}:\$\{status\}`/);
  for (const file of ["automation-processor.ts", "automation-delivery-worker.ts"]) {
    const worker = readFileSync(new URL(`../app/lib/whatsapp/${file}`, import.meta.url), "utf8");
    assert.match(worker, /sallaStatusEventMatches/);
    assert.match(worker, /source === "salla.order-status"/);
    assert.match(worker, /integration: \{ businessId: (?:event|job)\.businessId, provider: "salla", status: "active" \}/);
  }
});
