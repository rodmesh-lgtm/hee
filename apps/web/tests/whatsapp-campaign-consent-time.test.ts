import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("campaign creation UI counts only consent already effective by database time", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/campaigns/page.tsx", import.meta.url), "utf8");
  assert.match(page, /FROM "WhatsAppContact" contact/);
  assert.match(page, /INNER JOIN "WhatsAppConsent" consent/);
  assert.match(page, /consent\."businessId" = contact\."businessId"/);
  assert.match(page, /consent\."phoneE164" = contact\."phoneE164"/);
  assert.match(page, /contact\."optedOutAt" IS NULL/);
  assert.match(page, /consent\."revokedAt" IS NULL/);
  assert.match(page, /consent\."consentedAt" <= CURRENT_TIMESTAMP/);
  assert.match(page, /disabledAt: null/);
});
