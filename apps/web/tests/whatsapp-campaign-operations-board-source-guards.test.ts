import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/whatsapp/campaigns/page.tsx", import.meta.url), "utf8");

test("campaign operations board derives audience readiness from effective same-tenant consent", () => {
  assert.match(page, /FROM "WhatsAppContact" contact/);
  assert.match(page, /INNER JOIN "WhatsAppConsent" consent/);
  assert.match(page, /consent\."businessId" = contact\."businessId"/);
  assert.match(page, /consent\."phoneE164" = contact\."phoneE164"/);
  assert.match(page, /contact\."businessId" = \$\{context\.businessId\}/);
  assert.match(page, /contact\."optedOutAt" IS NULL/);
  assert.match(page, /consent\."revokedAt" IS NULL/);
  assert.match(page, /consent\."consentedAt" <= CURRENT_TIMESTAMP/);
  assert.doesNotMatch(page, /whatsAppConsent\.count\(\{ where: \{ businessId: context\.businessId/);
});

test("campaign operations board exposes aggregate performance without weakening tenant isolation", () => {
  assert.match(page, /whatsAppCampaignRecipient\.groupBy/);
  assert.match(page, /businessId: context\.businessId/);
  assert.match(page, /aggregateCount\("sent"\) \+ aggregateCount\("delivered"\) \+ aggregateCount\("read"\)/);
  assert.match(page, /aggregateCount\("delivered"\) \+ aggregateCount\("read"\)/);
  assert.match(page, /معدل التسليم/);
  assert.match(page, /معدل القراءة/);
});

test("campaign controls support bounded search and whitelisted status filters", () => {
  assert.match(page, /trim\(\)\.slice\(0, 80\)/);
  assert.match(page, /campaignStatusFilters\.includes\(requestedStatus\)/);
  assert.match(page, /name="q"/);
  assert.match(page, /name="status"/);
  assert.match(page, /filteredCampaigns/);
  assert.match(page, /النتائج:/);
});

test("campaign operations board preserves launch safety boundary", () => {
  assert.match(page, /getWhatsAppCampaignLaunchReadiness/);
  assert.match(page, /disabled=\{!launchReady\}/);
  assert.match(page, /بحد أقصى 5 مستلمين/);
  assert.match(page, /ConfirmSubmitButton/);
});
