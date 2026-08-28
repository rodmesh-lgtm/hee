import assert from "node:assert/strict";
import test from "node:test";
import {
  automationIdempotencyKey,
  automationRetryAt,
  normalizeAutomationTriggerType,
  readTemplateActionConfig,
} from "../app/lib/whatsapp/automation-domain";

test("automation trigger validation is fail-closed", () => {
  assert.equal(normalizeAutomationTriggerType("welcome"), "welcome");
  assert.throws(() => normalizeAutomationTriggerType("arbitrary"), /TRIGGER_UNSUPPORTED/);
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
