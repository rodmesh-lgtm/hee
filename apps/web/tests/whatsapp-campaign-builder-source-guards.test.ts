import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const page = fs.readFileSync(path.join(process.cwd(), "app/dashboard/whatsapp/campaigns/page.tsx"), "utf8");
const wizard = fs.readFileSync(path.join(process.cwd(), "app/dashboard/whatsapp/campaigns/campaign-wizard.tsx"), "utf8");
const actions = fs.readFileSync(path.join(process.cwd(), "app/actions/whatsapp-marketing.ts"), "utf8");

test("campaign creation is a guided review flow without automatic sending", () => {
  for (const label of ["التفاصيل", "الجمهور", "القالب", "المراجعة", "إنشاء وتثبيت الجمهور"]) {
    assert.match(wizard, new RegExp(label));
  }
  assert.match(wizard, /لن يتم الإرسال الآن/);
  assert.match(wizard, /name="audienceKind"/);
  assert.match(wizard, /name="segmentId"/);
  assert.match(wizard, /templates\.filter\(\(template\) => template\.connectionId === connectionId\)/);
  assert.doesNotMatch(wizard, /launchWhatsAppCampaignAction|enqueueWhatsAppCampaign/);
});

test("campaign action validates tenant-bound static segments and freezes eligible recipients", () => {
  assert.match(actions, /audienceKind === "static_segment"/);
  assert.match(actions, /businessId: context\.businessId, kind: "static"/);
  assert.match(actions, /audienceDefinition = \{ kind: "static_segment", segmentId: segment\.id \}/);
  assert.match(actions, /provider: "meta", status: "connected", disabledAt: null/);
  assert.match(actions, /provider: "meta", status: "approved"/);
  assert.match(actions, /snapshotWhatsAppCampaign\(\{ businessId: context\.businessId, campaignId: campaign\.id, now \}\)/);
});

test("guided builder preserves launch readiness and five-recipient canary controls", () => {
  assert.match(page, /getWhatsAppCampaignLaunchReadiness/);
  assert.match(page, /مرحلة إرسال تجريبية آمنة/);
  assert.match(page, /بحد أقصى 5 مستلمين/);
  assert.match(page, /launchWhatsAppCampaignAction/);
  assert.match(page, /disabled=\{!launchReady\}/);
});
