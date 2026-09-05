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
const automationProcessor = source("app/lib/whatsapp/automation-processor.ts");
const automationScheduler = source("app/lib/whatsapp/automation-scheduler.ts");
const automationApi = source("app/api/whatsapp/automations/events/route.ts");
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
  assert.match(campaigns, /أنشئ حملاتك من جهات الاتصال ذات الموافقة الفعالة/);
  assert.match(campaigns, /مرحلة إرسال تجريبية آمنة/);
  assert.doesNotMatch(campaigns, /Queue وWorkers وRate Limiting/);
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

test("automation workers keep every related record inside the event tenant", () => {
  assert.match(automationProcessor, /where: \{ id: event\.contactId, businessId: event\.businessId \}/);
  assert.match(automationProcessor, /businessId_phoneE164: \{ businessId: event\.businessId/);
  assert.match(automationProcessor, /connection: \{ businessId: event\.businessId, provider: "meta", status: "connected" \}/g);
  assert.match(automationProcessor, /businessId: event\.businessId, automationId: automation\.id, contactId: contact\.id/);
  assert.match(automationProcessor, /WHATSAPP_AUTOMATION_TENANT_MISMATCH/);
  assert.match(automationProcessor, /where: \{ id: event\.id, businessId: event\.businessId \}/g);
  assert.match(automationProcessor, /SELECT "id", "businessId"/);
  assert.match(automationProcessor, /WHATSAPP_AUTOMATION_EVENT_CLAIM_CONFLICT/);
  assert.match(automationApi, /businessId: key\.businessId/g);
  assert.match(automationApi, /businessId_phoneE164: \{ businessId: key\.businessId/);
  assert.match(automationApi, /businessId_source_externalEventId: \{ businessId: key\.businessId/);
});

test("inactive automation scheduler rejects cross-business connection corruption", () => {
  assert.match(automationScheduler, /connection: \{ select: \{ businessId: true, provider: true, status: true \} \}/);
  assert.match(automationScheduler, /automation\.connection\.businessId !== automation\.businessId/);
  assert.match(automationScheduler, /contact\."businessId" = \$\{automation\.businessId\}/);
  assert.match(automationScheduler, /consent\."businessId" = \$\{automation\.businessId\}/);
  assert.match(automationScheduler, /event\."businessId" = \$\{automation\.businessId\}/);
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
  assert.match(contacts, /وجود علاقة عميل سابقة وحده لا يكفي/);
  assert.match(actions, /consentConfirmed && !evidence/);
  assert.match(actions, /consentEvidence: consentConfirmed \? evidence : null/);
  assert.match(actions, /enqueueContactImport/);
  assert.doesNotMatch(actions, /whatsAppConsent\.(create|upsert|update)/);
});

test("central admin gets a read-only credential-safe WhatsApp overview", () => {
  assert.match(admin, /requireAdmin\(\)/);
  assert.match(admin, /مراقبة تشغيلية آمنة/);
  assert.match(admin, /whatsAppOperationsHeartbeat/);
  assert.match(admin, /عامل WhatsApp/);
  assert.doesNotMatch(admin, /credentialEnvelope|accessToken|textBody|rawPayload/);
});
