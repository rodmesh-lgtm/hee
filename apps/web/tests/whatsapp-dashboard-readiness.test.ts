import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("WhatsApp dashboard reports real section readiness instead of static availability", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/page.tsx", import.meta.url), "utf8");
  assert.match(page, /status:connected\?"متصل رسميًا":"يتطلب ربط Meta"/);
  assert.match(page, /"متطلبات ناقصة"/);
  assert.match(page, /"تحتاج مزامنة"/);
  assert.match(page, /سلة وزد تبقيان مغلقتين/);
});
