import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/whatsapp/contacts/page.tsx", import.meta.url), "utf8");

test("audience workspace keeps every contact and consent lookup tenant scoped", () => {
  assert.match(page, /contact\."businessId" = \$\{context\.businessId\}/g);
  assert.match(page, /consent\."businessId" = contact\."businessId"/g);
  assert.match(page, /consent\."phoneE164" = contact\."phoneE164"/g);
});

test("campaign eligibility uses effective consent on database time and opt-out exclusion", () => {
  assert.match(page, /contact\."optedOutAt" IS NULL/g);
  assert.match(page, /consent\."revokedAt" IS NULL/g);
  assert.match(page, /consent\."consentedAt" <= CURRENT_TIMESTAMP/g);
  assert.match(page, /AS "eligible"/);
  assert.match(page, /if\(contact\.eligible\)/);
  assert.doesNotMatch(page, /consentedAt<=new Date\(\)/);
  assert.match(page, /COUNT\(\*\) FILTER/);
});

test("audience search and status filtering are bounded and whitelisted", () => {
  assert.match(page, /\.trim\(\)\.slice\(0, 80\)/);
  assert.match(page, /audienceFilters\.includes\(requestedAudience\)/);
  assert.match(page, /LIMIT 100/);
  assert.match(page, /ILIKE \$\{searchPattern\}/g);
});

test("workspace preserves consent evidence and import safety UX", () => {
  assert.match(page, /explicitConsent/);
  assert.match(page, /consentEvidence/);
  assert.match(page, /10,000/);
  assert.match(page, /duplicateRows/);
  assert.match(page, /rejectedRows/);
  assert.match(page, /retryWhatsAppContactImportAction/);
  assert.match(page, /ImportProgressRefresh/);
});
