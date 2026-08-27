import assert from "node:assert/strict";
import test from "node:test";
import { boundedTemplateParameters, parseCampaignAudience } from "../app/lib/whatsapp/campaign-domain";

test("campaign audience deduplicates explicit contacts and rejects ambiguous input", () => {
  assert.deepEqual(parseCampaignAudience({ kind: "contacts", contactIds: ["a", "b"] }), {
    kind: "contacts", contactIds: ["a", "b"],
  });
  assert.equal(parseCampaignAudience({ kind: "contacts", contactIds: ["a", "a"] }), null);
  assert.equal(parseCampaignAudience({ kind: "contacts", contactIds: [] }), null);
});

test("campaign audience accepts only an explicit static segment reference", () => {
  assert.deepEqual(parseCampaignAudience({ kind: "static_segment", segmentId: "segment-a" }), {
    kind: "static_segment", segmentId: "segment-a",
  });
  assert.equal(parseCampaignAudience({ kind: "dynamic_segment", segmentId: "segment-a" }), null);
});

test("template parameters are JSON-only and bounded", () => {
  assert.deepEqual(boundedTemplateParameters({ body: ["Raed"] }), { body: ["Raed"] });
  assert.equal(boundedTemplateParameters("not-json-container"), null);
  assert.equal(boundedTemplateParameters({ value: "x".repeat(17 * 1024) }), null);
});
