import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("WhatsApp dashboard reports real section readiness instead of static availability", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/page.tsx", import.meta.url), "utf8");
  assert.match(page, /status:\s*connected\s*\?\s*"متصل رسميًا"\s*:\s*"يتطلب ربط Meta"/);
  assert.match(page, /"متطلبات ناقصة"/);
  assert.match(page, /"تحتاج مزامنة"/);
  assert.match(page, /سلة وزد تبقيان مغلقتين/);
  assert.match(page, /getWhatsAppCampaignLaunchReadiness/);
  assert.match(page, /worker_release_mismatch/);
  assert.match(page, /launchReadiness\.ready/);
});

test("WhatsApp command center gives one explicit next action from four launch gates", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/page.tsx", import.meta.url), "utf8");
  assert.match(page, /WHATSAPP COMMAND CENTER/);
  assert.match(page, /خط جاهزية الإرسال/);
  assert.match(page, /ربط الرقم الرسمي/);
  assert.match(page, /قالب معتمد/);
  assert.match(page, /جمهور مؤهل/);
  assert.match(page, /جاهزية التشغيل/);
  assert.match(page, /const nextStep = launchSteps\.find\(\(step\) => !step\.ready\)/);
  assert.match(page, /الإجراء التالي/);
});
