import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("campaign page gives actionable customer-safe remediation for connection, template and audience failures", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/campaigns/page.tsx", import.meta.url), "utf8");
  assert.match(page, /رقم WhatsApp الرسمي لم يعد متصلًا/);
  assert.match(page, /القالب لم يعد معتمدًا لدى Meta/);
  assert.match(page, /لا توجد جهات اتصال مؤهلة في هذه الحملة/);
  assert.match(page, /\/dashboard\/whatsapp\/setup/);
  assert.match(page, /\/dashboard\/whatsapp\/templates/);
  assert.match(page, /\/dashboard\/whatsapp\/contacts/);
  assert.doesNotMatch(page, /قالب Meta لم يعد في حالة Approved|Snapshot الحملة/);
});
