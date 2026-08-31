import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("campaign page gives actionable remediation for connection, template and audience failures", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/campaigns/page.tsx", import.meta.url), "utf8");
  assert.match(page, /رقم WhatsApp الرسمي لم يعد متصلًا/);
  assert.match(page, /قالب Meta لم يعد في حالة Approved/);
  assert.match(page, /Snapshot الحملة/);
});
