import assert from "node:assert/strict";
import test from "node:test";
import { cartReportFilters } from "../app/lib/whatsapp/cart-report-domain";
import { TEMPLATE_STARTERS } from "../app/lib/whatsapp/template-starters";
import { buildTemplateSubmission } from "../app/lib/whatsapp/template-editor-domain";
import { sallaOrderTemplateSupported } from "../app/lib/whatsapp/salla-order-confirmation-domain";
import { bookingConfirmationTemplateSupportsParameters } from "../app/lib/whatsapp/booking-confirmation-domain";

test("cart filters reject inherited keys, duplicate query parameters and unbounded offsets", () => {
  for (const state of ["__proto__", "constructor", "toString", ["abandoned"]]) assert.equal(cartReportFilters({ state }).state, "all");
  assert.deepEqual(cartReportFilters({ state: "abandoned", days: "7", page: "2", q: " أحمد " }), { state: "abandoned", days: 7, page: 2, query: "أحمد" });
  assert.equal(cartReportFilters({ page: "-5", days: "999999" }).page, 1);
  assert.equal(cartReportFilters({ page: "1.2" }).page, 1);
  assert.equal(cartReportFilters({ page: "999999" }).page, 10000);
  assert.equal(cartReportFilters({ days: "999999" }).days, 30);
  assert.equal(cartReportFilters({ q: "a".repeat(200) }).query.length, 80);
});

test("starter templates produce valid submissions and match existing automation parameter contracts", () => {
  for (const starter of TEMPLATE_STARTERS) {
    const submission = buildTemplateSubmission({ ...starter, language: "ar", footer: "", header: "NONE", buttonText: "", buttonUrl: "", codeExpirationMinutes: 10 });
    if (["order_confirmation", "order_shipped"].includes(starter.key)) assert.equal(sallaOrderTemplateSupported(submission.components, "POSITIONAL"), true);
    if (starter.key === "booking") assert.equal(bookingConfirmationTemplateSupportsParameters(submission.components, "POSITIONAL"), true);
    if (starter.key === "cart") { assert.equal(starter.category, "MARKETING"); assert.equal(starter.body.includes("{{"), false); }
  }
});
