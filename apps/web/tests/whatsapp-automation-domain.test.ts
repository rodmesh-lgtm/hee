import assert from "node:assert/strict";
import test from "node:test";
import {
  automationMatchesEvent,
  automationIdempotencyKey,
  automationRetryAt,
  buildAutomationTriggerConfig,
  normalizeAutomationTriggerType,
  readAutomationTriggerConfig,
  readTemplateActionConfig,
  templateHasVariables,
} from "../app/lib/whatsapp/automation-domain";

test("automation trigger validation is fail-closed", () => {
  assert.equal(normalizeAutomationTriggerType("welcome"), "welcome");
  assert.throws(() => normalizeAutomationTriggerType("arbitrary"), /TRIGGER_UNSUPPORTED/);
});

test("order update automations require an explicit finite status filter", () => {
  const config = buildAutomationTriggerConfig("order_update", "confirmed");
  assert.deepEqual(config, { version: 1, orderStatuses: ["confirmed"] });
  assert.equal(automationMatchesEvent({ triggerType: "order_update", triggerConfig: config, subjectType: "order.status.confirmed" }), true);
  assert.equal(automationMatchesEvent({ triggerType: "order_update", triggerConfig: config, subjectType: "order.status.cancelled" }), false);
  assert.throws(() => buildAutomationTriggerConfig("order_update"), /ORDER_STATUS_INVALID/);
  assert.throws(() => readAutomationTriggerConfig({ version: 1 }, "order_update"), /ORDER_STATUS_INVALID/);
  assert.throws(() => readAutomationTriggerConfig({ version: 1, orderStatuses: ["confirmed", "confirmed"] }, "order_update"), /ORDER_STATUS_INVALID/);
  assert.throws(() => readAutomationTriggerConfig({ version: 1, orderStatuses: ["refunded"] }, "order_update"), /ORDER_STATUS_INVALID/);
});

test("non-order triggers reject hidden trigger configuration", () => {
  assert.deepEqual(buildAutomationTriggerConfig("welcome"), { version: 1 });
  assert.throws(() => readAutomationTriggerConfig({ version: 1, orderStatuses: ["confirmed"] }, "welcome"), /TRIGGER_CONFIG_INVALID/);
});

test("automation UI accepts only well-formed templates without unresolved variables", () => {
  assert.equal(templateHasVariables([{ type: "BODY", text: "مرحبًا بك" }]), false);
  assert.equal(templateHasVariables([{ type: "BODY", text: "مرحبًا {{1}}" }]), true);
  assert.equal(templateHasVariables([{ type: "BODY", text: "مرحبًا {{customer_name}}" }]), true);
  assert.equal(templateHasVariables({ type: "BODY", text: "malformed" }), true);
  assert.equal(templateHasVariables(null), true);
});

test("automation idempotency includes tenant and event identity", () => {
  const base = { automationId: "automation", eventId: "event", contactId: "contact" };
  const first = automationIdempotencyKey({ businessId: "business-a", ...base });
  assert.equal(first, automationIdempotencyKey({ businessId: "business-a", ...base }));
  assert.notEqual(first, automationIdempotencyKey({ businessId: "business-b", ...base }));
});

test("automation retries are exponential and bounded", () => {
  const now = new Date("2026-08-28T00:00:00.000Z");
  assert.equal(automationRetryAt(1, now).getTime() - now.getTime(), 30_000);
  assert.equal(automationRetryAt(8, now).getTime() - now.getTime(), 3_840_000);
  assert.equal(automationRetryAt(99, now).getTime() - now.getTime(), 3_840_000);
});

test("template actions reject free-form or unexpected configuration", () => {
  const templateId = "123e4567-e89b-12d3-a456-426614174000";
  assert.deepEqual(readTemplateActionConfig({ templateId, parameters: ["name"] }), {
    templateId,
    parameters: ["name"],
  });
  assert.throws(() => readTemplateActionConfig({ templateId, body: "free form" }), /ACTION_INVALID/);
  assert.throws(() => readTemplateActionConfig({ templateId: "not-a-uuid" }), /TEMPLATE_INVALID/);
});
