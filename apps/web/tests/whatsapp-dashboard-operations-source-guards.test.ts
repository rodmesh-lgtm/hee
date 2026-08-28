import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const navigation = source("components/dashboard/dashboard-nav.ts");
const hub = source("app/dashboard/whatsapp/page.tsx");
const contacts = source("app/dashboard/whatsapp/contacts/page.tsx");
const templates = source("app/dashboard/whatsapp/templates/page.tsx");
const campaigns = source("app/dashboard/whatsapp/campaigns/page.tsx");
const actions = source("app/actions/whatsapp-marketing.ts");
const admin = source("app/admin/whatsapp/page.tsx");

test("WhatsApp Marketing is a first-class customer dashboard section", () => {
  assert.match(navigation, /href: "\/dashboard\/whatsapp"/);
  for (const route of ["contacts", "templates", "campaigns", "inbox", "setup", "audit"]) {
    assert.ok(hub.includes(`/dashboard/whatsapp/${route}`), `${route} missing from WhatsApp hub`);
  }
  assert.match(contacts, /accept="\.csv,\.xlsx/);
  assert.match(contacts, /10,000/);
  assert.match(contacts, /ImportProgressRefresh/);
  assert.match(contacts, /بانتظار المعالجة/);
  assert.match(contacts, /retryWhatsAppContactImportAction/);
  assert.match(templates, /syncWhatsAppTemplatesAction/);
  assert.match(campaigns, /Queue وWorkers وRate Limiting/);
});

test("campaign mutations are entitlement, RBAC and tenant scoped", () => {
  assert.match(actions, /getWhatsAppWriteContext\("campaign\.manage"\)/);
  assert.match(actions, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(actions, /businessId: context\.businessId/);
  assert.match(actions, /status: "approved"/);
  assert.match(actions, /status: "connected"/);
  assert.match(actions, /snapshotWhatsAppCampaign/);
  assert.match(actions, /enqueueWhatsAppCampaign/);
  assert.doesNotMatch(actions, /graph\.facebook\.com/);
});

test("contact import never infers consent and preserves revoked evidence", () => {
  assert.match(contacts, /explicitConsent/);
  assert.match(contacts, /لا تحدد هذا الخيار لمجرد أن الأرقام لعملاء أو أصحاب طلبات/);
  assert.match(actions, /consentConfirmed && !evidence/);
  assert.match(actions, /consentEvidence: consentConfirmed \? evidence : null/);
  assert.match(actions, /enqueueContactImport/);
  assert.doesNotMatch(actions, /whatsAppConsent\.(create|upsert|update)/);
});

test("central admin gets a read-only credential-safe WhatsApp overview", () => {
  assert.match(admin, /requireAdmin\(\)/);
  assert.match(admin, /مراقبة قراءة فقط/);
  assert.doesNotMatch(admin, /credentialEnvelope|accessToken|textBody|rawPayload/);
});
