import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/dashboard/whatsapp/page.tsx", "utf8");

test("command center exposes performance insights without weakening tenant scope", () => {
  assert.match(source, /\/dashboard\/whatsapp\/insights/);
  assert.match(source, /الأداء والتقارير/);
  assert.match(source, /معدل التسليم/);
  assert.match(source, /معدل القراءة/);
  assert.match(source, /whatsAppCampaignRecipient\.groupBy/);
  assert.match(source, /where: \{ businessId: context\.businessId \}/);
});

test("performance pulse is derived from durable recipient lifecycle states", () => {
  assert.match(source, /recipientCount\(\["sent", "delivered", "read"\]\)/);
  assert.match(source, /recipientCount\(\["delivered", "read"\]\)/);
  assert.match(source, /recipientCount\(\["read"\]\)/);
  assert.match(source, /sentRecipients \? deliveredRecipients \/ sentRecipients : 0/);
  assert.match(source, /deliveredRecipients \? readRecipients \/ deliveredRecipients : 0/);
});

test("command center keeps launch safety and effective audience truth intact", () => {
  assert.match(source, /contact\."optedOutAt" IS NULL/);
  assert.match(source, /consent\."revokedAt" IS NULL/);
  assert.match(source, /consent\."consentedAt" <= CURRENT_TIMESTAMP/);
  assert.match(source, /getWhatsAppCampaignLaunchReadiness\(\)/);
  assert.match(source, /launchReadiness\.ready/);
});
