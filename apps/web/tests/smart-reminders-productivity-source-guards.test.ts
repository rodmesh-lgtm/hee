import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const page = readFileSync(resolve(process.cwd(), "app/dashboard/reminders/page.tsx"), "utf8");

test("smart reminders surface useful operational states without raw technical UX", () => {
  assert.match(page, /"overdue"/);
  assert.match(page, /"paused"/);
  assert.match(page, /"attention"/);
  assert.match(page, /المتأخرة/);
  assert.match(page, /تحتاج مراجعة/);
  assert.match(page, /لوحة متابعة التنفيذ تحتاج انتباهك/);
  assert.match(page, /delivery_unknown/);
  assert.match(page, /failed/);
  assert.doesNotMatch(page, /NEXT ACTION/);
  assert.match(page, /ORDER BY "channel","occurrenceAt" DESC,"updatedAt" DESC,"createdAt" DESC/);
  assert.match(page, /تم الإرسال/);
  assert.match(page, /لم يكتمل الإرسال/);
});

test("reminder cards preserve tenant-safe linked business note navigation", () => {
  assert.match(page, /r\."businessNoteId"/);
  assert.match(page, /n\."businessId"\s*=\s*r\."businessId"/);
  assert.match(page, /businessNoteTitle/);
  assert.match(page, /\/dashboard\/notes\?q=/);
  assert.match(page, /encodeURIComponent\(reminder\.businessNoteTitle/);
});

test("customer UX identifies the dedicated central WhatsApp reminder sender", () => {
  assert.match(page, /INFRO REMINDER/);
  assert.match(page, /واتساب · INFRO REMINDER/);
  assert.match(page, /whatsappSenderMode==="platform"/);
  assert.match(page, /البريد وإشعار INFRO يعملان بشكل مستقل/);
});
