import assert from "node:assert/strict";
import test from "node:test";
import { buildTemplateSubmission, templateValidationError } from "../app/lib/whatsapp/template-editor-domain";
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

const marketing = { ...base, category: "MARKETING", body: "مرحبًا بك في صدى المراكب 🚗" };
test("plain Arabic copy and encoded store link need no variable examples", () => {
  const buttonUrl = "https://marakeb.sa/ar/" + encodeURIComponent("الباقات-المتجر الالكتروني");
  const result = buildTemplateSubmission({ ...marketing, footer: "عميلنا الغالي اذا ماتحتاجها خل المجال لغيرك يشترك", buttonText: "الباقات-المتجر الالكتروني", buttonUrl });
  assert.deepEqual(result.components[0], { type: "BODY", text: marketing.body });
  assert.equal(JSON.stringify(result).includes(buttonUrl), true);
});
test("validation identifies the actual field without blaming variables for unrelated failures", () => {
  const cases = [
    [{ name: "اسم عربي" }, "name", "TEMPLATE_NAME_INVALID"],
    [{ body: "x".repeat(1025) }, "body", "TEMPLATE_BODY_TOO_LONG"],
    [{ footer: "x".repeat(61) }, "footer", "TEMPLATE_FOOTER_TOO_LONG"],
    [{ buttonUrl: "https://ir.sa" }, "buttonText", "TEMPLATE_BUTTON_TEXT_REQUIRED"],
    [{ buttonText: "x".repeat(26), buttonUrl: "https://ir.sa" }, "buttonText", "TEMPLATE_BUTTON_TEXT_TOO_LONG"],
    [{ buttonText: "زيارة", buttonUrl: "http://ir.sa" }, "buttonUrl", "TEMPLATE_BUTTON_URL_INVALID"],
    [{ buttonText: "زيارة", buttonUrl: "https://ir.sa/{{2}}" }, "buttonUrl", "TEMPLATE_BUTTON_VARIABLE_INVALID"],
    [{ body: "أهلًا {{2}}", examples: "أحمد" }, "body", "TEMPLATE_VARIABLES_INVALID"],
    [{ body: "أهلًا {{1}}", examples: "" }, "examples", "TEMPLATE_EXAMPLES_REQUIRED"],
  ] as const;
  for (const [input, field, code] of cases) {
    assert.throws(() => buildTemplateSubmission({ ...marketing, ...input }), (error) => {
      const issue = templateValidationError(error);
      assert.equal(issue?.field, field); assert.equal(issue?.code, code); assert.ok(issue?.message);
      return true;
    });
  }
  assert.equal(templateValidationError(new Error("SECRET_PROVIDER_ERROR")), undefined);
  assert.equal(templateValidationError("__proto__"), undefined);
});
test("malformed variable delimiters fail before a provider request but repeated valid variables work", () => {
  for (const body of ["أهلًا {{}}", "أهلًا {{1}", "أهلًا {{name}}", "أهلًا {{01}}", "أهلًا {{1}} و {{3}}"])
    assert.throws(() => buildTemplateSubmission({ ...marketing, body, examples: "أحمد" }), /TEMPLATE_VARIABLES_INVALID/);
  assert.doesNotThrow(() => buildTemplateSubmission({ ...marketing, body: "أهلًا {{1}}، شكرًا {{1}}", examples: "أحمد" }));
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
