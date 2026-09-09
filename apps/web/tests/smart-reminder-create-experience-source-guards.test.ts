import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const form = readFileSync(resolve(process.cwd(), "components/dashboard/smart-reminder-create-form.tsx"), "utf8");

test("smart reminder creation keeps explicit human scheduling with quick local-time presets", () => {
  assert.match(form, /بعد ساعة/);
  assert.match(form, /غدًا في نفس الوقت/);
  assert.match(form, /بعد 3 أيام/);
  assert.match(form, /بعد أسبوع/);
  assert.match(form, /schedulePreset/);
  assert.match(form, /Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone/);
  assert.match(form, /name="scheduledLocal"/);
  assert.doesNotMatch(form, /setTimeout\([^)]*submit/);
});

test("smart reminder creation fails visibly when channels or WhatsApp consent are missing", () => {
  assert.match(form, /input\[name="deliveryChannels"\]:checked/);
  assert.match(form, /اختر قناة تنبيه واحدة على الأقل/);
  assert.match(form, /recipientConsentAccepted/);
  assert.match(form, /لتفعيل واتساب، وافق أولًا/);
  assert.match(form, /role="alert"/);
});

test("note-linked reminders explain provenance and retain tenant-safe server validation contract", () => {
  assert.match(form, /ذاكرة الأعمال ← تذكير ذكي/);
  assert.match(form, /name="businessNoteId"/);
  assert.match(form, /المذكرة والتذكير يخصان المنشأة نفسها/);
  assert.match(form, /لن يُرسل شيء الآن/);
});
