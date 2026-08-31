import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const navigation = source("components/dashboard/dashboard-nav.ts");
const hub = source("app/dashboard/whatsapp/page.tsx");
const contacts = source("app/dashboard/whatsapp/contacts/page.tsx");
const templates = source("app/dashboard/whatsapp/templates/page.tsx");
const campaigns = source("app/dashboard/whatsapp/campaigns/page.tsx");
const automations = source("app/dashboard/whatsapp/automations/page.tsx");
const actions = source("app/actions/whatsapp-marketing.ts");
const launchActions = source("app/actions/whatsapp-campaign-launch.ts");
const automationOperations = source("app/lib/whatsapp/automation-operations.ts");
const admin = source("app/admin/whatsapp/page.tsx");

test("WhatsApp Marketing is a first-class customer dashboard section", () => {
  assert.match(navigation, /href: "\/dashboard\/whatsapp"/);
  for (const route of ["contacts", "templates", "campaigns", "automations", "inbox", "setup", "audit"]) {
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

test("automation management is explicit, tenant scoped and connected to durable delivery", () => {
  assert.match(automations, /getWhatsAppReadContext\("automation\.manage"\)/);
  assert.match(automations, /createWhatsAppAutomationAction/);
  assert.match(automations, /operateWhatsAppAutomationAction/);
  assert.match(automations, /الموافقة الصريحة/);
  assert.match(automations, /ConfirmSubmitButton/);
  assert.match(actions, /getWhatsAppWriteContext\("automation\.manage"\)/);
  assert.match(automationOperations, /businessId: input\.businessId/g);
  assert.match(automationOperations, /FOR UPDATE/);
  assert.match(automationOperations, /TransactionIsolationLevel\.Serializable/g);
  assert.match(automationOperations, /status: "approved"/);
  assert.match(automationOperations, /status: "connected"/);
  assert.match(automationOperations, /writeWhatsAppAuditLog/g);
  assert.doesNotMatch(automationOperations, /graph\.facebook\.com|fetch\(/);
});

test("campaign mutations are entitlement, RBAC and tenant scoped", () => {
  assert.match(actions, /getWhatsAppWriteContext\("campaign\.manage"\)/);
  assert.match(actions, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(actions, /businessId: context\.businessId/);
  assert.match(actions, /status: "approved"/);
  assert.match(actions, /status: "connected"/);
  assert.match(actions, /snapshotWhatsAppCampaign/);
  assert.doesNotMatch(actions, /enqueueWhatsAppCampaign/);
  assert.match(launchActions, /getWhatsAppWriteContext\("campaign\.manage"\)/);
  assert.match(launchActions, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(launchActions, /getWhatsAppCampaignLaunchReadiness/);
  assert.match(launchActions, /enqueueWhatsAppCampaign/);
  assert.match(launchActions, /businessId: context\.businessId/);
  assert.doesNotMatch(actions, /graph\.facebook\.com/);
  assert.doesNotMatch(launchActions, /graph\.facebook\.com/);
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
  assert.match(admin, /whatsAppOperationsHeartbeat/);
  assert.match(admin, /عامل WhatsApp/);
  assert.doesNotMatch(admin, /credentialEnvelope|accessToken|textBody|rawPayload/);
});
