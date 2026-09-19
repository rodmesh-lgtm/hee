import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/dashboard/whatsapp/integrations/page.tsx", "utf8");

test("WhatsApp commerce integrations explain provider readiness in customer language", () => {
  assert.match(source, /Shopify متاح هنا للتسويق/);
  assert.match(source, /ربط سلة للتحقق من أهلية الحجوزات متاح/);
  assert.match(source, /يبقى زد مغلقًا حتى يكتمل ربطه الرسمي/);
  assert.match(source, /حوّل الطلبات والسلال إلى أحداث موثوقة/);
  assert.match(source, /إعادة تجهيز الأحداث/);
  assert.match(source, /إضافة أول متجر/);
  assert.match(source, /href="#store-integration-create"/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /tenant-scoped|envelope مشفر|عامل مستقل|GraphQL الرسمية|durable|HMAC غير موثق|Webhooks:/);
  assert.doesNotMatch(source, /href="\/dashboard\/whatsapp"/);
});
