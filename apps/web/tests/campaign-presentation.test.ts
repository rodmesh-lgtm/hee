import assert from "node:assert/strict";
import test from "node:test";
import { campaignDeliverySummary, campaignOutcome, campaignFailureReason, formatCampaignTime } from "../app/lib/whatsapp/campaign-presentation";

const running = { status: "running", queued: 0, processing: 0, retrying: 0, unknown: 0, sent: 0, delivered: 0, snapshot: 0, ready: true };

test("queued recipients are never presented as sent or delivered", () => {
  const result = campaignDeliverySummary({ ...running, queued: 25000 });
  assert.equal(result.title, "الرسائل في طابور الإرسال");
  assert.match(result.detail, /لم تُحسب/);
  assert.equal(campaignDeliverySummary({ ...running, processing: 1 }).title, "تجري معالجة الرسائل");
});
test("Meta acceptance remains distinct from delivery", () => {
  assert.equal(campaignDeliverySummary({ ...running, sent: 5, delivered: 0 }).title, "بانتظار تأكيد التسليم");
  assert.match(campaignDeliverySummary({ ...running, status: "completed" }).detail, /لا يعني وصول جميع/);
});
test("paused, scheduled and cancelled campaigns do not suggest active sending", () => {
  for (const [status, title] of [["paused", "الإرسال متوقف مؤقتًا"], ["scheduled", "بانتظار الموعد المحدد"], ["cancelled", "الحملة ملغاة"]]) {
    assert.equal(campaignDeliverySummary({ ...running, status, queued: 10 }).title, title);
  }
});
test("uncertain outcomes warn against resending and retries remain explicit", () => {
  assert.match(campaignDeliverySummary({ ...running, unknown: 1, retrying: 3 }).detail, /لا تعِد إرسالها/);
  assert.equal(campaignDeliverySummary({ ...running, retrying: 1 }).title, "إعادة محاولة مجدولة");
  assert.equal(campaignDeliverySummary({ ...running, queued: 1, ready: false }).title, "بانتظار جاهزية خدمة الإرسال");
});
test("remaining snapshot is not described as queued", () => {
  assert.equal(campaignDeliverySummary({ ...running, snapshot: 24995 }).title, "بقية الجمهور لم تدخل الطابور");
});
test("campaign timestamps explicitly use Riyadh regardless of server timezone", () => {
  const date = new Date("2026-10-03T20:41:28Z");
  assert.equal(formatCampaignTime(date), date.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" }) + " · توقيت الرياض");
});


test("processing completion never implies delivery success", () => {
  assert.deepEqual(campaignOutcome({ status: "completed", failed: 1, delivered: 0, total: 1 }), { label: "لم تصل الرسائل", tone: "failed" });
  assert.equal(campaignOutcome({ status: "completed", failed: 1, delivered: 1, total: 2 }).tone, "warning");
  assert.equal(campaignOutcome({ status: "completed", failed: 0, delivered: 0, total: 1 }).tone, "neutral");
  assert.equal(campaignOutcome({ status: "completed", failed: 0, delivered: 1, total: 1 }).tone, "success");
  assert.match(campaignDeliverySummary({ ...running, status: "completed", failed: 1 }).title, /دون تسليم/);
});
test("Meta payment rejection has a reviewed explanation and unknown errors remain safe", () => {
  assert.match(campaignFailureReason("131042").title, /أهلية الدفع/);
  assert.match(campaignFailureReason("131042").detail, /حساب WhatsApp Business/);
  assert.match(campaignFailureReason("131042").action, /قبل أي محاولة/);
  assert.equal(campaignFailureReason("<private provider payload>").title, campaignFailureReason(null).title);
  assert.doesNotMatch(JSON.stringify(campaignFailureReason("<private provider payload>")), /private provider payload/);
});
