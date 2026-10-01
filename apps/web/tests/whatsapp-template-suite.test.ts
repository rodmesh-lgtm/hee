import assert from "node:assert/strict";
import test from "node:test";
import { buildTemplateSubmission } from "../app/lib/whatsapp/template-editor-domain";
import { TEMPLATE_STARTERS } from "../app/lib/whatsapp/template-starters";

const base = { name: "infro_verification", language: "ar", category: "AUTHENTICATION", body: "", footer: "", header: "NONE", examples: "", buttonText: "", buttonUrl: "", codeExpirationMinutes: 10 };
test("authentication uses Meta fixed copy and copy-code button without free-form message", () => {
  const result = buildTemplateSubmission(base);
  assert.deepEqual(result.components, [
    { type: "BODY", add_security_recommendation: true },
    { type: "FOOTER", code_expiration_minutes: 10 },
    { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "نسخ الرمز" }] },
  ]);
  assert.equal(JSON.stringify(buildTemplateSubmission({ ...base, language: "en_US" })).includes("Copy code"), true);
});
test("OTP rejects marketing text, media, URLs and invalid expiration instead of silently discarding them", () => {
  for (const input of [{ body: "buy now" }, { footer: "discount" }, { header: "IMAGE" }, { buttonUrl: "https://ir.sa" }, { buttonText: "offer" }, { examples: "123456" }, ...[0, 91, 1.5, NaN].map(codeExpirationMinutes => ({ codeExpirationMinutes }))]) {
    assert.throws(() => buildTemplateSubmission({ ...base, ...input }), /TEMPLATE_AUTHENTICATION_INVALID/);
  }
});
test("every starter produces a valid creation request with sequential examples", () => {
  const names = new Set();
  for (const starter of TEMPLATE_STARTERS) {
    assert.ok(!names.has(starter.name)); names.add(starter.name);
    const result = buildTemplateSubmission({ ...base, ...starter });
    assert.equal(result.category, starter.category);
    assert.ok(result.components.length);
  }
});
