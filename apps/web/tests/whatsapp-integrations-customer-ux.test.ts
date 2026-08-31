import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/dashboard/whatsapp/integrations/page.tsx", "utf8");

test("WhatsApp commerce integrations explain provider readiness in customer language", () => {
  assert.match(source, /Shopify متاح للربط الرسمي الآن/);
  assert.match(source, /سلة وزد يبقيان في مرحلة الإعداد/);
  assert.match(source, /بحاجة إلى إكمال الربط/);
  assert.match(source, /أحداث المتجر جاهزة/);
  assert.match(source, /إعادة تجهيز أحداث المتجر/);
  assert.match(source, /إضافة أول متجر/);
  assert.match(source, /href="#store-integration-create"/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /tenant-scoped|envelope مشفر|عامل مستقل|GraphQL الرسمية|durable|HMAC غير موثق|Webhooks:/);
  assert.doesNotMatch(source, /href="\/dashboard\/whatsapp"/);
});
