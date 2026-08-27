import assert from "node:assert/strict";
import test from "node:test";
import {
  isWhatsAppMarketingEligible,
  normalizeContactLabel,
  normalizeE164,
} from "../app/lib/whatsapp/contact-domain";

test("normalizes explicit international and Saudi local numbers to E.164", () => {
  assert.equal(normalizeE164("+966 50 123 4567"), "+966501234567");
  assert.equal(normalizeE164("00966-50-123-4567"), "+966501234567");
  assert.equal(normalizeE164("0501234567", "966"), "+966501234567");
});

test("phone normalization fails closed without a country context or on malformed input", () => {
  assert.equal(normalizeE164("0501234567"), null);
  assert.equal(normalizeE164("+012345678"), null);
  assert.equal(normalizeE164("966-hello"), null);
  assert.equal(normalizeE164("123", "966"), null);
});

test("contact labels normalize deterministically for tag and segment deduplication", () => {
  assert.equal(normalizeContactLabel("  عملاء   VIP  "), "عملاء vip");
  assert.equal(normalizeContactLabel(""), null);
  assert.equal(normalizeContactLabel("x".repeat(81)), null);
});

test("marketing eligibility requires same-tenant explicit active consent and no opt-out", () => {
  const contact = { businessId: "business-a", phoneE164: "+966501234567", optedOutAt: null };
  const consent = {
    businessId: "business-a",
    phoneE164: "+966501234567",
    consentedAt: new Date("2026-01-01T00:00:00.000Z"),
    revokedAt: null,
  };
  assert.equal(isWhatsAppMarketingEligible(contact, consent), true);
  assert.equal(isWhatsAppMarketingEligible({ ...contact, optedOutAt: new Date() }, consent), false);
  assert.equal(isWhatsAppMarketingEligible(contact, { ...consent, revokedAt: new Date() }), false);
  assert.equal(isWhatsAppMarketingEligible(contact, { ...consent, businessId: "business-b" }), false);
  assert.equal(isWhatsAppMarketingEligible(contact, null), false);
});
