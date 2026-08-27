import assert from "node:assert/strict";
import test from "node:test";
import { isTemplateSendEligible, parseMetaTemplate } from "../app/lib/whatsapp/template-domain";

test("parses approved Meta template components without flattening media or buttons", () => {
  const template = parseMetaTemplate({
    id: "123456789",
    name: "order_update",
    language: "ar",
    status: "APPROVED",
    category: "UTILITY",
    parameter_format: "POSITIONAL",
    quality_score: { score: "GREEN" },
    components: [
      { type: "HEADER", format: "IMAGE", example: { header_handle: ["handle"] } },
      { type: "BODY", text: "مرحبًا {{1}}" },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "عرض الطلب", url: "https://example.com/{{1}}" }] },
    ],
  });
  assert.ok(template);
  assert.equal(template.status, "approved");
  assert.equal(template.category, "utility");
  assert.equal(template.components.length, 3);
  assert.equal(isTemplateSendEligible(template), true);
});

test("unknown provider states and categories fail closed for sending", () => {
  const template = parseMetaTemplate({
    id: "new-state", name: "future_template", language: "en_US",
    status: "FUTURE_REVIEW_STATE", category: "FUTURE_CATEGORY", components: [],
  });
  assert.ok(template);
  assert.equal(template.status, "unknown");
  assert.equal(template.category, "unknown");
  assert.equal(isTemplateSendEligible(template), false);
});

test("malformed or oversized template payloads are rejected", () => {
  assert.equal(parseMetaTemplate({ name: "missing_id", language: "ar", status: "APPROVED" }), null);
  assert.equal(parseMetaTemplate({
    id: "oversized", name: "oversized", language: "ar", status: "APPROVED",
    components: Array.from({ length: 21 }, () => ({ type: "BODY" })),
  }), null);
});
