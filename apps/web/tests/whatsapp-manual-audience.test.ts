import assert from "node:assert/strict";
import test from "node:test";
import { parseManualAudience, summarizeManualAudience } from "../app/lib/whatsapp/manual-audience";

test("manual audience normalizes local, international and Arabic numbers before deduplication", () => {
  assert.deepEqual(parseManualAudience("0500000761، +966 50 000 0761\n٠٥٠٠٠٠٠٧٦٢;00966500000762\n966500000763\nbad-number"), {
    phones: ["+966500000761", "+966500000762", "+966500000763"], submitted: 6, invalid: 1, duplicates: 2,
  });
  assert.equal(parseManualAudience(" \n\t").phones.length, 0);
});
test("manual audience never creates contacts or grants consent and excludes unavailable and opted-out contacts", () => {
  const parsed = parseManualAudience("0500000761\n0500000762\n0500000763\n0500000764");
  const result = summarizeManualAudience(parsed, [
    { id: "eligible", phoneE164: parsed.phones[0], optedOutAt: null },
    { id: "revoked", phoneE164: parsed.phones[1], optedOutAt: new Date() },
    { id: "booking-only", phoneE164: parsed.phones[2], optedOutAt: null },
  ], new Set(parsed.phones.slice(0, 2)));
  assert.deepEqual(result.contactIds, ["eligible"]);
  assert.deepEqual(result.summary, { submitted: 4, invalid: 0, duplicates: 0, eligible: 1, unavailable: 1, optedOut: 1, noConsent: 1 });
});
test("manual input retains existing campaign size and payload protections", () => {
  assert.throws(() => parseManualAudience("x".repeat(300_001)), /AUDIENCE_TOO_LARGE/);
  assert.throws(() => parseManualAudience(Array.from({ length: 10_001 }, (_, i) => `+1555${String(i).padStart(7, "0")}`).join("\n")), /AUDIENCE_TOO_LARGE/);
});
