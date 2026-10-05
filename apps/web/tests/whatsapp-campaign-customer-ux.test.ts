import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const page = fs.readFileSync(path.join(process.cwd(), "app/dashboard/whatsapp/campaigns/page.tsx"), "utf8");

test("campaign UI uses customer-facing Arabic instead of implementation jargon", () => {
  for (const phrase of ["Snapshot ثابت", "Queue وWorkers", "Rate Limiting", "إنشاء وأخذ Snapshot", "اختبار الإطلاق الحقيقي", ">Sent<", ">Delivered<", ">Read<", ">Failed<", ">Opt-out<"]) {
    assert.doesNotMatch(page, new RegExp(phrase));
  }
  assert.match(page, /أُضيفت الدفعة التجريبية إلى طابور الإرسال/);
  assert.match(page, /إلغاء الاشتراك/);
  assert.match(page, /قبلتها Meta للإرسال/);
  assert.match(page, /وصلت بالفعل/);
  assert.match(page, /تمت قراءتها/);
  assert.match(page, /لم تصل/);
});

test("campaign statuses are translated for customers", () => {
  for (const label of ["مسودة", "جاهزة", "مجدولة", "قيد الإرسال", "متوقفة مؤقتًا", "انتهت المعالجة", "ملغاة", "تعذر إكمالها"]) {
    assert.match(page, new RegExp(label));
  }
  assert.match(page, /outcome.label \?\? campaignStatusLabel\(campaign\.status\)/);
});

test("campaign zero state explains the next steps", () => {
  assert.match(page, /لا توجد حملات بعد/);
  assert.match(page, /href="\/dashboard\/whatsapp\/setup"/);
  assert.match(page, /href="\/dashboard\/whatsapp\/contacts"/);
  assert.match(page, /href="\/dashboard\/whatsapp\/templates"/);
  assert.match(page, /aria-live="polite"/);
});
