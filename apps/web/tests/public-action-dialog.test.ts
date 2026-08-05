import test from "node:test";
import assert from "node:assert/strict";

import { buildInquiryWhatsAppUrl, buildRequestWhatsAppUrl, normalizeWhatsAppNumber } from "../components/public/public-action-dialog";

test("builds request WhatsApp URL with normalized number and message", () => {
  const url = buildRequestWhatsAppUrl({
    businessName: "مطعم النخلة",
    whatsapp: "0500000000",
    values: {
      name: "سارة",
      phone: "0555555555",
      service: "حجز طاولة",
      notes: "مقربة من النافذة",
    },
  });

  assert.match(url ?? "", /^https:\/\/wa\.me\/966500000000\?text=/);
  assert.match(decodeURIComponent(url ?? ""), /مطعم النخلة/);
  assert.match(decodeURIComponent(url ?? ""), /حجز طاولة/);
  assert.match(decodeURIComponent(url ?? ""), /مقربة من النافذة/);
});

test("builds inquiry WhatsApp URL with normalized number and message", () => {
  const url = buildInquiryWhatsAppUrl({
    businessName: "سوبر ماركت",
    whatsapp: "+966500000001",
    values: {
      name: "أمير",
      message: "هل يوجد تسليم خلال 30 دقيقة؟",
    },
  });

  assert.match(url ?? "", /^https:\/\/wa\.me\/966500000001\?text=/);
  assert.match(decodeURIComponent(url ?? ""), /سوبر ماركت/);
  assert.match(decodeURIComponent(url ?? ""), /هل يوجد تسليم خلال 30 دقيقة/);
});

test("normalizes Saudi phone numbers", () => {
  assert.equal(normalizeWhatsAppNumber("0500000000"), "966500000000");
  assert.equal(normalizeWhatsAppNumber("+966500000000"), "966500000000");
  assert.equal(normalizeWhatsAppNumber("966500000000"), "966500000000");
});
