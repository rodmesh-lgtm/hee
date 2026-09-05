import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/dashboard/whatsapp/templates/page.tsx", import.meta.url), "utf8");

test("template operations remains tenant, Meta and entitlement scoped", () => {
  assert.match(page, /getWhatsAppReadContext\("campaign\.manage"\)/);
  assert.match(page, /hasActiveWhatsAppMarketingEntitlement/);
  assert.match(page, /businessId: context\.businessId/g);
  assert.match(page, /provider: "meta"/g);
});

test("campaign-ready templates require approved status and current active connection", () => {
  assert.match(page, /connectionReady && connection/);
  assert.match(page, /template\.connectionId === connection\.id/);
  assert.match(page, /template\.status === "approved"/);
  assert.match(page, /template\.category !== "unknown"/);
});

test("template search and filters are bounded and whitelisted", () => {
  assert.match(page, /\.trim\(\)\.slice\(0, 80\)/);
  assert.match(page, /statusFilters\.includes\(requestedStatus\)/);
  assert.match(page, /categoryFilters\.includes\(requestedCategory\)/);
  assert.match(page, /languageFilters\.includes\(requestedLanguage\)/);
  assert.match(page, /take: 200/);
});

test("template operations exposes safe components preview but never raw payload or credentials", () => {
  assert.match(page, /components: true/);
  assert.match(page, /templatePreview\(template\.components\)/);
  assert.match(page, /slice\(0, 4096\)/);
  assert.doesNotMatch(page, /rawPayload: true/);
  assert.doesNotMatch(page, /credentialEnvelope/);
  assert.doesNotMatch(page, /accessToken/);
});

test("template UX keeps Meta approval authoritative", () => {
  assert.match(page, /قرار الاعتماد/);
  assert.match(page, /أنشئ أو عدّل القالب في أدوات Meta الرسمية/);
  assert.match(page, /syncWhatsAppTemplatesAction/);
  assert.doesNotMatch(page, /approveWhatsAppTemplateAction|اعتماد القالب الآن/);
});
